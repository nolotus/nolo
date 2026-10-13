// packages/cli/tui/transcribePreflight.ts
//
// TUI 转写**前**检查（方案 §2 T5）：探到「尾部 ≥3 分钟基本无人声」时，
// 提示用户「建议截到 hh:mm:ss，可省 N 分钟」，并让用户选「全部 / 按建议」；
// 选择结果决定上传与预处理的范围（走 transcribeMediaFile 的 fromSec/toSec）。
//
// 分层：纯检测算法在 ai/transcription/silenceTrim.ts（不 import server 代码）；
// 本文件只做「何时问、怎么问、问完怎么改范围」的编排，因此可以脱离 TTY 单测
// （probe / detect / requestChoice 都可注入）。
//
// 无法交互时（非 TTY、没有 DialogHost，例如排队消息的 drain 阶段）**不擅自裁**：
// 只打印提示行，范围保持全片 —— 宁可多花一次钱，也不替用户丢掉可能的人声。

import type { TrimSuggestion } from "ai/lecture/types";
import {
  detectTrailingSilenceSuggestion,
  formatHms,
  suggestionSavedMinutes,
} from "../../ai/transcription/silenceTrim";
import { probeMedia } from "../../ai/transcription/mediaPreprocess";
import { renderDialogTitle } from "./dialogFrame";
import type { DialogHost } from "./dialogHost";
import { t } from "./i18n";
import { runSelectDialog, type SelectDialogItem } from "./selectDialog";

/** 用户对尾部静音建议的选择。 */
export type TrimChoice = "all" | "trim";

export type TrimPromptItem = SelectDialogItem & { value: TrimChoice };

export function buildTrimChoiceItems(
  suggestion: TrimSuggestion,
  durationSec: number,
): TrimPromptItem[] {
  return [
    // 「全部」在前且为默认（Enter 直选）：默认永不丢内容。
    { label: t("mediaSilenceTrimOptionAll"), value: "all" },
    {
      label: t("mediaSilenceTrimOptionTrim", formatHms(suggestion.fromSec), String(suggestionSavedMinutes(suggestion, durationSec))),
      value: "trim",
    },
  ];
}

export function buildTrimChoiceTitleLines(
  suggestion: TrimSuggestion,
  durationSec: number,
): string[] {
  return [
    renderDialogTitle(t("mediaSilenceTrimTitle")),
    renderDialogTitle(
      t("mediaSilenceTrimDetail", formatHms(suggestion.fromSec), String(suggestionSavedMinutes(suggestion, durationSec))),
    ),
  ];
}

/**
 * 输入流能否接对话框按键。等价于 tuiTurnRunner.isInteractiveInput——这里
 * 本地实现是为了避免 tuiTurnRunner ↔ transcribePreflight 的循环 import
 * （tuiTurnRunner 的排队 drain 分支要用本模块）。
 */
function canPromptInput(input: NodeJS.ReadableStream): boolean {
  const candidate = input as NodeJS.ReadableStream & {
    isTTY?: boolean;
    setRawMode?: unknown;
  };
  return Boolean(candidate.isTTY) && typeof candidate.setRawMode === "function";
}

/**
 * 造一个「问用户」的回调；当前上下文不能交互时返回 null（调用方只提示、不裁剪）。
 * 键盘交给 DialogHost 托管（modal 期间 composer pause、锚定在 composer 上方、
 * 结束恢复），与 /pick-dialog 的选择器同一套接线。
 */
export function createTrimRequester(args: {
  dialogHost: DialogHost | null;
  input: NodeJS.ReadableStream;
  output: NodeJS.WritableStream;
}): ((suggestion: TrimSuggestion, durationSec: number) => Promise<TrimChoice | null>) | null {
  const { dialogHost, input, output } = args;
  if (!dialogHost || !canPromptInput(input)) return null;
  return async (suggestion, durationSec) => {
    const result = await dialogHost.run((anchor) =>
      runSelectDialog<TrimPromptItem>({
        items: buildTrimChoiceItems(suggestion, durationSec),
        initialIndex: 0,
        titleLines: buildTrimChoiceTitleLines(suggestion, durationSec),
        input: input as NodeJS.ReadStream,
        output: output as NodeJS.WritableStream,
        ...anchor,
      }),
    );
    // Esc / 流关闭 = 不裁剪（保守方向），与「全部」同义。
    if (result.kind === "cancelled") return "all";
    return result.item.value;
  };
}

export type TranscribeTrimResolution = {
  /** 传给 transcribeMediaFile 的起点（未裁剪时原样透传调用方入参）。 */
  fromSec?: number;
  /** 传给 transcribeMediaFile 的终点。 */
  toSec?: number;
  /** true = 已按用户选择裁到 suggestion.fromSec。 */
  trimmed: boolean;
  /** 检出的尾部静音建议（有没有采纳都返回，供调用方记录/展示）。 */
  suggestion: TrimSuggestion | null;
};

/**
 * 转写范围决策：显式 --from/--to > 尾部静音建议 > 全片。
 *
 * 任何一步失败（探测失败、ffmpeg 失败、用户取消）都退回「全片」，绝不阻断转写。
 */
export async function resolveTranscribeTrim(args: {
  path: string;
  fromSec?: number;
  toSec?: number;
  onNotice: (text: string) => void;
  /**
   * 即将开始探测/扫静音（只在真的要扫时调用一次）：silencedetect 是一次
   * 全片解码，TUI 里得先给用户一行进展，否则像是卡住了。
   */
  onScanStart?: (path: string) => void;
  /** null/undefined = 当前上下文不能交互 → 只提示建议，不裁剪。 */
  requestChoice?:
    | ((suggestion: TrimSuggestion, durationSec: number) => Promise<TrimChoice | null>)
    | null;
  probe?: (path: string) => Promise<number>;
  detect?: (path: string, durationSec: number) => Promise<TrimSuggestion | null>;
}): Promise<TranscribeTrimResolution> {
  const passthrough = (suggestion: TrimSuggestion | null = null): TranscribeTrimResolution => ({
    ...(args.fromSec !== undefined ? { fromSec: args.fromSec } : {}),
    ...(args.toSec !== undefined ? { toSec: args.toSec } : {}),
    trimmed: false,
    suggestion,
  });
  // 用户已经显式指定范围：不再打扰（他的范围和静音建议可能冲突，尊重显式输入）。
  if (args.fromSec !== undefined || args.toSec !== undefined) return passthrough();

  let durationSec = 0;
  args.onScanStart?.(args.path);
  try {
    durationSec = args.probe
      ? await args.probe(args.path)
      : (await probeMedia(args.path)).durationSec;
  } catch {
    return passthrough();
  }
  if (!Number.isFinite(durationSec) || durationSec <= 0) return passthrough();

  let suggestion: TrimSuggestion | null = null;
  try {
    suggestion = args.detect
      ? await args.detect(args.path, durationSec)
      : await detectTrailingSilenceSuggestion(args.path, durationSec);
  } catch {
    return passthrough();
  }
  if (!suggestion) return passthrough();

  const base = args.path.split(/[/\\]/).pop() ?? args.path;
  args.onNotice(
    t(
      "mediaSilenceTrimNotice",
      base,
      String(Math.round((durationSec - suggestion.fromSec) / 60)),
      formatHms(suggestion.fromSec),
    ),
  );

  if (!args.requestChoice) {
    args.onNotice(t("mediaSilenceTrimHintOnly", formatHms(suggestion.fromSec)));
    return passthrough(suggestion);
  }

  let choice: TrimChoice | null = null;
  try {
    choice = await args.requestChoice(suggestion, durationSec);
  } catch {
    choice = "all"; // 对话框异常不得让转写失败
  }
  if (choice !== "trim") return passthrough(suggestion);

  const toSec = suggestion.fromSec;
  args.onNotice(t("mediaSilenceTrimApplied", formatHms(toSec)));
  return { toSec, trimmed: true, suggestion };
}
