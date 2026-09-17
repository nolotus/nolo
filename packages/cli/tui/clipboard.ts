/**
 * 剪贴板写入使用一条明确的传输腿：
 * - 本地会话写系统剪贴板（pbcopy / powershell / wl-copy / xclip / clipboardy）；
 * - SSH 交互会话只发 OSC 52，由终端写客户端剪贴板。
 *
 * 同一次复制不能先写系统剪贴板、再补发 OSC 52。终端消费输出是异步的，晚到的
 * OSC 52 会把用户随后在浏览器中复制的新内容覆盖成旧内容。
 */

export type ClipboardWriteTransport = "system" | "osc52" | "unavailable";

export type ClipboardTarget = {
  /** 系统剪贴板写入器（由调用方注入，默认 clipboardy）。 */
  systemWrite: (text: string) => Promise<void>;
  /** 终端输出流，用于发送 OSC 52 序列。 */
  output: { write: (chunk: string) => unknown };
  /** 本次复制唯一允许使用的传输腿。 */
  transport: ClipboardWriteTransport;
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
 * 统一的剪贴板写入入口。每次调用只走选定的一条腿，且失败向调用方报告；绝不在
 * 已完成的系统写入后排队补发同一份旧内容。
 */
export async function writeClipboard(
  text: string,
  target: ClipboardTarget,
): Promise<void> {
  if (target.transport === "system") {
    await target.systemWrite(text);
    return;
  }
  if (target.transport === "osc52") {
    osc52SetClipboard(text, target.output);
    return;
  }
  throw new Error(
    "Client clipboard is unavailable in a non-interactive remote session.",
  );
}
