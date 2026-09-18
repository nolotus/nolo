/**
 * 剪贴板写入增强：
 * - 系统剪贴板（pbcopy / powershell / wl-copy / xclip / clipboardy）
 * - 加上 OSC 52 转义序列，让远程 SSH / 现代终端也能无缝上剪贴板。
 *
 * writeClipboard 先尝试系统剪贴板；无论系统剪贴板是否可用，都会通过
 * output.write 发送 OSC 52 序列（终端不支持时静默忽略，无害）。
 */

export type ClipboardTarget = {
  /** 系统剪贴板写入器（由调用方注入，默认 clipboardy）。 */
  systemWrite: (text: string) => Promise<void>;
  /** 终端输出流，用于发送 OSC 52 序列。 */
  output: { write: (chunk: string) => unknown };
  /** 是否应发送 OSC 52（非 TTY 或明确关闭时传 false）。 */
  sendOsc52?: boolean;
};

/**
 * 发送 OSC 52 剪贴板序列。base64 编码的文本会被写进终端剪贴板；
 * 远程 SSH、tmux、现代终端（iTerm2 / Kitty / Ghostty 等）都支持。
 */
export function osc52SetClipboard(text: string, output: { write: (chunk: string) => unknown }): void {
  const payload = Buffer.from(text, "utf8").toString("base64");
  // OSC 52, 剪贴板目标 c (clipboard), payload base64, BEL 结尾。
  output.write(`\x1b]52;c;${payload}\x07`);
}

/**
 * 统一的剪贴板写入入口：系统剪贴板 + OSC 52。
 * 系统剪贴板失败时不会抛出（降级为纯 OSC 52）；OSC 52 总是尽力发送。
 */
export async function writeClipboard(
  text: string,
  target: ClipboardTarget,
): Promise<void> {
  // 先尝试系统剪贴板，失败不致命（可能无 xclip/pbcopy）。
  try {
    await target.systemWrite(text);
  } catch {
    // 忽略：降级到 OSC 52。
  }
  // OSC 52 尽力发送；非 TTY 或调用方要求关闭时才跳过。
  if (target.sendOsc52 !== false) {
    try {
      osc52SetClipboard(text, target.output);
    } catch {
      // 忽略：终端不支持 OSC 52 时静默跳过。
    }
  }
}
