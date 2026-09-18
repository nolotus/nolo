/**
 * 粘贴/剪贴板编排的**唯一入口**（thin shared flow）。
 *
 * 背景：TUI 里「拿到剪贴板内容」有两条语义不同的来源——
 * 1. **显式请求**：`/paste` 命令与 Ctrl+V（\x16）。用户明确要求「读剪贴板」。
 * 2. **空 bracketed paste 兼容**：终端只发了 `\x1b[200~\x1b[201~`（payload 为空）
 *    而没有文本。这是「粘贴图片」在某些终端上的上报形态，属于兼容信号，
 *    不是用户显式命令——两者在代码与文案上必须可区分。
 *
 * 两条来源**共用下面的读取流程**：先剪贴板图像，仅在允许时才回退系统剪贴板
 * 文本。任何读取失败都保留真实错误，绝不把「上一次复制过的文本」当作当前
 * 剪贴板内容返回——本模块不做任何缓存，每次调用都重新读。
 *
 * 另外提供异步结果的应用守卫：剪贴板读取是异步的，等它回来时用户可能已经
 * 提交了这一行、切了对话或退出了会话；那时把内容塞进草稿/附件就是污染。
 */
import type { AttachedImage } from "./pasteImage";

/** 剪贴板内容的来源。用于措辞与守卫，不改变读取流程。 */
export type ClipboardPasteSource = "slash" | "key" | "bracketed-empty";

export type ClipboardPasteOutcome =
  /** 剪贴板里是图片：走附件通道。 */
  | { kind: "image"; image: AttachedImage }
  /** 剪贴板里没有图片但有文本：进草稿（走 PASTE token，保留原文空白）。 */
  | { kind: "text"; text: string }
  /** 剪贴板里既没有图片也没有文本：message 是图像读取的原始提示。 */
  | { kind: "empty"; message: string }
  /** 真实读取错误（远程会话 / 图片过大 / 解析失败 / 文本读取失败）。 */
  | { kind: "error"; code: string; message: string };

export type ClipboardPasteDeps = {
  /** 剪贴板图像读取（默认 readClipboardImage）。 */
  readImage: () => Promise<AttachedImage>;
  /** 系统剪贴板文本读取（默认 clipboardy.read）。 */
  readText: () => Promise<string>;
};

/**
 * 只对「剪贴板无图片」或「读图能力不可用」做文本回退。
 * remote-session（SSH 下服务端剪贴板 ≠ 客户端剪贴板）、too-large、
 * read-failed 都是真实错误，绝不伪装成文本。
 */
export function isTextFallbackEligibleCode(code: string | undefined): boolean {
  return (
    code === "empty-clipboard" ||
    code === "binary-missing" ||
    code === "unsupported-platform"
  );
}

function errorCodeOf(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const code = (error as { code?: unknown }).code;
  return code === undefined || code === null ? undefined : String(code);
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 统一剪贴板读取：图像优先，仅在允许时降级读文本。
 *
 * 契约（DoD 覆盖）：
 * - 文本回退只在 empty-clipboard / binary-missing / unsupported-platform 触发；
 * - 文本读取本身抛错 → 返回 `error`（code `text-read-failed`），**不**返回空串
 *   或旧文本，且消息里带上图像侧的上下文；
 * - 文本读取成功但为空 → 返回 `empty`，message 用图像读取的原始提示（用户看到
 *   「没有图像数据 + 可执行下一步」而不是一片空白）；
 * - 无缓存：两次调用各自读一次，外部换过剪贴板内容后第二次拿到新值。
 */
export async function resolveClipboardPaste(
  deps: ClipboardPasteDeps,
): Promise<ClipboardPasteOutcome> {
  try {
    const image = await deps.readImage();
    return { kind: "image", image };
  } catch (imageError) {
    const code = errorCodeOf(imageError);
    if (!isTextFallbackEligibleCode(code)) {
      return {
        kind: "error",
        code: code ?? "read-failed",
        message: messageOf(imageError),
      };
    }
    let text: string;
    try {
      text = await deps.readText();
    } catch (textError) {
      return {
        kind: "error",
        code: "text-read-failed",
        message: `${messageOf(textError)} (${messageOf(imageError)})`,
      };
    }
    if (text.length > 0) {
      return { kind: "text", text };
    }
    return { kind: "empty", message: messageOf(imageError) };
  }
}

/**
 * 异步粘贴的应用快照：发起读取时的草稿世代 + 会话是否已结束。
 *
 * `epoch` 在每次「草稿被提交/清空」时自增（Enter 提交、/new、/clear、切对话、
 * 会话结束）。读取回来后只要世代变了或会话已结束，结果必须丢弃——否则迟到
 * 的粘贴会写进别人的草稿，或往一个已关闭的会话里附件/渲染。
 */
export type ClipboardPasteSnapshot = {
  epoch: number;
  sessionEnded: boolean;
};

/** 迟到结果是否可以应用。纯函数，便于单测。 */
export function shouldApplyPastedResult(
  snapshot: ClipboardPasteSnapshot,
  current: ClipboardPasteSnapshot,
): boolean {
  if (current.sessionEnded) return false;
  return snapshot.epoch === current.epoch;
}
