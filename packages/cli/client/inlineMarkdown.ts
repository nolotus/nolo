/**
 * 行内 Markdown → ANSI 样式（叶子模块，无循环依赖）。
 *
 * 从 assistantOutput.ts 抽出：styleInlineMarkdown + renderMarkdownLink +
 * MARKDOWN_LINK_RE 被 markdownTable.ts 与 assistantOutput.ts 共同使用。
 * 抽到独立叶子模块后，markdownTable.ts 与 assistantOutput.ts 都只单向
 * import 本模块，消除 markdownTable ⇄ assistantOutput 的循环依赖。
 *
 * 本模块只依赖 theme / mathText / tuiAnsi 等更底层的叶子模块，不反向依赖
 * 任何表格渲染或 assistant 输出逻辑。
 */
import {
  themeColorSequence,
  type TuiBrightness,
} from "../tui/theme";
import { maskMathInLine } from "./mathText";

// ANSI style codes that don't depend on color (bold, dim, reset).
export const STYLE = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

/**
 * Color SGR sequences resolved from the TUI theme. Used both inside the TUI
 * (where theme brightness is known) and in one-shot CLI output (where we fall
 * back to default brightness). The brightness is resolved once per call chain
 * so a single assistant reply stays internally consistent.
 */
export function colorSeq(
  token: "accent" | "chrome" | "info" | "muted" | "success" | "warning" | "danger",
  brightness: TuiBrightness,
) {
  // "success" is added for syntax-highlight string literals; themeColorSequence
  // already supports it (it's a TuiThemeToken), so theme.ts needs no change.
  return themeColorSequence(token, process.env, brightness);
}

/**
 * Render a markdown link `[text](url)` as a clickable OSC 8 hyperlink.
 * Terminals that support OSC 8 (iTerm2, Ghostty, WezTerm, Kitty, Windows
 * Terminal, etc.) let the user Ctrl/Cmd-Click to open the URL. Unsupported
 * terminals ignore the escape sequences and see plain "text (url)".
 *
 * We always emit the visible fallback "text (url)" inside the hyperlink so
 * the URL is readable even when OSC 8 is not available — the link layer is
 * purely additive.
 */
function renderMarkdownLink(match: string, text: string, url: string): string {
  const visible = `${text} (${url})`;
  // OSC 8: ESC ] 8 ; params URI ST  text  ESC ] 8 ; ; ST
  // ST (string terminator) is ESC \ — most terminals also accept BEL (\a).
  return `\x1b]8;;${url}\x1b\\${visible}\x1b]8;;\x1b\\`;
}

const MARKDOWN_LINK_RE = /\[([^\]]+)\]\(([^)\s]+)\)/g;

export function styleInlineMarkdown(line: string, brightness: TuiBrightness) {
  // Inline code is muted, matching highlightMarkdown (tui/theme.ts). Both
  // renderers must agree: this one styles the streamed reply, the other styles
  // the same text once it is repainted from history — a mismatch makes the
  // colors visibly shift under the user mid-scroll.
  const inlineCode = colorSeq("muted", brightness);
  const reset = STYLE.reset;
  const bold = STYLE.bold;
  const dim = STYLE.dim;
  // ZWSP 包裹的 code span：这是防御字面零宽字符（U+200B）粘贴的兜底——
  // 若用户/上游文本里出现成对的 U+200B 包裹内容，这里还原 muted 高亮。
  // 注意：它不再是表格管线的产物（protectCodeSpans 已删除，markdownTable
  // 现在在 renderMarkdownTable 内先消费反引号再 pad），仅对字面 ZWSP 生效。
  const zwsCode = "\u200b";

  // 先进行数学公式 mask 保护，防止行内规则破坏数学公式内容
  const mathMask = maskMathInLine(line, brightness);

  // Order matters: bold (**) runs before italic (*) so that "**a**" is
  // consumed first; after bold replacement the remaining single-* pairs are
  // genuine italics. Strikethrough (~~) is independent. Without this, the
  // markers would leak into terminal output as literal asterisks/tildes.
  const styled = mathMask.maskedText
    .replace(MARKDOWN_LINK_RE, (m, t, u) => renderMarkdownLink(m, t, u))
    .replace(/\u200b([^\u200b\n]+)\u200b/g, (_m, inner: string) =>
      `${zwsCode}${inlineCode}${inner}${reset}${zwsCode}`
    )
    .replace(/`([^`]+)`/g, `${inlineCode}$1${reset}`)
    .replace(/\*\*(.+?)\*\*/g, `${bold}$1${reset}`)
    // Italic: only `*x*`, not `_x_`. CommonMark gives `_` an intra-word
    // limitation (snake_case identifiers must not trigger italic), which
    // requires a word-boundary guard. Agent output contains snake_case
    // variables frequently; supporting `_italic_` would corrupt them.
    .replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, `${dim}$1${reset}`)
    .replace(/~~([^~]+?)~~/g, `${dim}\x1b[9m$1\x1b[29m${reset}`);

  return mathMask.restore(styled);
}
