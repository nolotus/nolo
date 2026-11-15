// packages/cli/tui/queuedUserAttachments.ts
//
// 排队用户消息的附件「延迟解析」职责：图片在 drain 时才读成 dataURL，音视频在
// drain 时才转写并把 transcript 块并入消息正文。原样从 tuiTurnRunner 迁出
// （语义不变，仅职责搬移）：它只依赖 attachment/media/preflight 三个既有模块，
// 与 turn 执行机器无关，因此不引入对 tuiTurnRunner 的依赖。上下文用最小结构
// 类型声明（不从 tuiTurnRunner 反向 import 类型，避免模块环）。

import { resolvePlatformAuthToken } from "../../agent-runtime/providerResolution";
import type { TurnRequest } from "core/chat/internalTurnEvent";
import { t } from "./i18n";
import { resolveAttachmentImageUrls } from "./pasteImage";
import { transcribeMediaFile, formatTranscriptForModel, describeMediaError } from "./mediaAttachment";
import { createTrimRequester, resolveTranscribeTrim } from "./transcribePreflight";
import type { DialogHost } from "./dialogHost";

/**
 * prepareQueuedUserRequest 需要的宿主上下文（最小集）。
 *
 * AgentTurnContext 结构性满足本类型，因此调用方无需改动；这里刻意不 import
 * AgentTurnContext，避免 helper ↔ tuiTurnRunner 的模块环。
 */
export type QueuedUserAttachmentContext = {
  onUserImagesPrepared?: (images: readonly import("./pasteImage").AttachedImage[]) => void;
  /** 直接写终端（图片读取失败的 `image skipped:` 行走这里）。 */
  readonly output: NodeJS.WritableStream;
  /** 静音裁剪选择框需要按原生键盘输入。 */
  readonly input: NodeJS.ReadableStream;
  /** null（非交互宿主）= 只能提示建议、不裁剪。 */
  readonly dialogHost: DialogHost | null;
  /** 转写/裁剪的进展与失败行。 */
  emitCommandOutput(text: string, command?: string): void;
  readonly effectiveEnv: Record<string, string | undefined>;
  readonly state: {
    readonly serverUrl: string;
    readonly dialogId?: string;
  };
  readonly options: {
    readonly fetchImpl?: typeof fetch;
  };
};

/**
 * drain 一条排队请求：若携带 imagePaths，在**此刻**才读成 dataURL（入队时不读：
 * 排队期间文件可能变，且不让大 base64 挂在队列里）。读不到的路径只打一行
 * `image skipped:`（与 direct 路径同语义）并继续执行该轮，绝不抛错。
 */
export async function prepareQueuedUserRequest(
  ctx: QueuedUserAttachmentContext,
  req: TurnRequest,
): Promise<{ request: TurnRequest; imageUrls: string[] }> {
  let imageUrls: string[] = [];
  if (req.imagePaths && req.imagePaths.length > 0) {
    try {
      ({ imageUrls } = await resolveAttachmentImageUrls({
        actionImagePaths: req.imagePaths,
        onResolved: ctx.onUserImagesPrepared,
        attachedImages: [],
        onFailure: (_path, err) =>
          ctx.output.write(`[nolo] image skipped: ${err.message}\n`),
      }));
    } catch (err) {
      ctx.output.write(
        `[nolo] image skipped: ${err instanceof Error ? err.message : String(err)}\n`,
      );
      imageUrls = [];
    }
  }
  // 排队消息携带的音视频路径：drain 时才跑转写（与图片延迟读同思路，
  // 排队期间文件可能变 + 转写产物不应常驻队列）。transcript 块并入
  // req.text 发给模型；失败输出错误行，消息本体照发（模型拿不到内容
  // 但有失败说明，路径文本已被剥离）。
  const mediaPaths = req.mediaPaths ?? [];
  if (mediaPaths.length > 0) {
    const authToken = resolvePlatformAuthToken(ctx.effectiveEnv);
    const blocks: string[] = [];
    for (const mediaPath of mediaPaths) {
      const base = mediaPath.split(/[/\\]/).pop() ?? mediaPath;
      try {
        // T5：排队消息 drain 时同样先检查尾部静音。ctx.dialogHost 为空
        // （非交互/无宿主）时 requestChoice 为 null → 只提示不裁剪。
        const trim = await resolveTranscribeTrim({
          path: mediaPath,
          onNotice: ctx.emitCommandOutput,
          onScanStart: (p) =>
            ctx.emitCommandOutput(t("mediaSilenceTrimScanning", p.split(/[/\\]/).pop() ?? p)),
          requestChoice: createTrimRequester({
            dialogHost: ctx.dialogHost,
            input: ctx.input,
            output: ctx.output,
          }),
        });
        ctx.emitCommandOutput(t("mediaPreprocessStart", base));
        const transcript = await transcribeMediaFile({
          path: mediaPath,
          serverUrl: ctx.state.serverUrl,
          authToken,
          dialogId: ctx.state.dialogId,
          fromSec: trim.fromSec,
          toSec: trim.toSec,
          fetchImpl: ctx.options.fetchImpl,
          onProgress: (info) => {
            const label = info.message ?? info.stage ?? "";
            if (label) ctx.emitCommandOutput(t("mediaTranscribeProgress", base, label));
          },
        });
        ctx.emitCommandOutput(t("mediaTranscribeDone", base, transcript.txtPath));
        blocks.push(formatTranscriptForModel(transcript, mediaPath));
      } catch (err) {
        const msg = describeMediaError(err).message;
        ctx.emitCommandOutput(
          `[nolo] ${t("mediaTranscribeFailed", base, msg)}`,
        );
        blocks.push(`[media transcription failed for ${mediaPath}: ${msg}]`);
      }
    }
    if (blocks.length > 0) {
      const mergedText = req.text
        ? `${blocks.join("\n\n")}\n\n${req.text}`
        : blocks.join("\n\n");
      req = { ...req, text: mergedText, event: { kind: "user", text: mergedText } };
    }
  }
  return { request: req, imageUrls };
}
