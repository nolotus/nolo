import { sanitizeImageLabel } from "./tuiImageLayout";

export type CopyImagePathResult = {
  readonly ok: boolean;
  readonly message: string;
};

/**
 * Pure clipboard copy helper for an image artifact/attachment path.
 * Never spawns any external viewer or performs any filesystem IO.
 */
export async function copyImagePath(
  sourcePath: string,
  writeClipboard: (text: string) => Promise<void>,
): Promise<CopyImagePathResult> {
  // eslint-disable-next-line no-control-regex
  if (!sourcePath || /[\u0000-\u001f\u007f]/.test(sourcePath)) {
    return { ok: false, message: "无有效路径可复制。" };
  }
  const safeDisplay = sanitizeImageLabel(sourcePath);
  try {
    await writeClipboard(sourcePath);
    return { ok: true, message: `已复制路径：${safeDisplay}` };
  } catch (error) {
    const detail = sanitizeImageLabel(error instanceof Error ? error.message : String(error)).slice(0, 120);
    return {
      ok: false,
      message: `无法写入剪贴板（${detail}），可直接选中路径文本：${safeDisplay}`,
    };
  }
}
