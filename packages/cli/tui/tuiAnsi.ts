/**
 * TUI 显示层纯函数：ANSI 处理、显示宽度、截断与换行。
 *
 * 从 readlineWorkspace.ts 抽出，全部为无副作用字符串工具，唯一外部依赖是
 * i18n 的 locale（displayWidth 对 CJK 全角引号按 locale 判宽度）。
 */
import { getCliLocale } from "./i18n";
import { detectWindowsTerminalAmbiguousWidth } from "./wtAmbiguousWidth";
import ansiRegex from "ansi-regex";
import stringWidth from "string-width";

export const ANSI_ESCAPE_REGEX =
  /\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g;
/**
 * OSC 8 hyperlink wrappers: `ESC ] 8 ; ; <url> ESC \` (open) and
 * `ESC ] 8 ; ; ESC \` (close). Matched including the ST terminator so both the
 * open — url and all — and the close collapse away, leaving the visible label.
 */
// eslint-disable-next-line no-control-regex
const OSC8_HYPERLINK_REGEX = /\x1b\]8;;[^\x1b]*\x1b\\/g;
const ALL_ANSI_ESCAPE_REGEX = ansiRegex();
const FIRST_ANSI_ESCAPE_REGEX = ansiRegex({ onlyFirst: true });

/**
 * Drop OSC 8 hyperlink wrappers, keeping the visible label.
 *
 * Defence in depth: our own producers emit hyperlinks only on fixed lines that
 * never reach truncateAnsi/countPhysicalLines (see terminalStyles), so this is
 * not on the hot path. If a wrap ever leaks into a transcript, these two width
 * functions would otherwise count the 200-char url hidden inside the sequence
 * and mis-truncate the line — strip it instead. A full OSC 8-aware truncator
 * (pairing sequences across a cut) is deliberately not worth it.
 */
function stripOsc8Hyperlinks(text: string): string {
  return text.replace(OSC8_HYPERLINK_REGEX, "");
}

export function stripAnsi(text: string): string {
  // Keep our broad ECMA-48 CSI matcher first: ansi-regex intentionally treats
  // a few private-mode replies (for example ESC [ > 0 c) more narrowly.
  return text
    .replace(ANSI_ESCAPE_REGEX, "")
    .replace(ALL_ANSI_ESCAPE_REGEX, "");
}

/** SGR (color/style) sequences only: ESC [ params m. */
// eslint-disable-next-line no-control-regex
const SGR_SEQUENCE_REGEX = /^\x1b\[[0-9;]*m/;
// eslint-disable-next-line no-control-regex
const TRAILING_SGR_REGEX = /(?:\x1b\[[0-9;]*m)+$/;

/**
 * Apply a terminal-style output chunk onto a transcript buffer.
 *
 * Spinner / progress writers use `\\r` to redraw one status line in place.
 * The history stream used to append those frames as plain text, which produced
 * a wall of "working locally (Ns)" lines and left raw `\\r` artifacts that
 * broke later rows. Interpret the common control semantics instead:
 * - keep SGR color/style sequences (the transcript renderer is ANSI-aware);
 *   strip every other escape sequence (cursor moves, erase, private modes)
 * - `\\r` rewinds to the start of the current line (after the last `\\n`)
 * - `\\b` deletes one character on the current line
 * - other C0 controls (except tab/newline) are dropped
 */
export function applyTerminalOutputToText(existing: string, chunk: string): string {
  if (!chunk) return existing;

  let text = existing;
  let index = 0;
  while (index < chunk.length) {
    if (chunk[index] === "\x1b") {
      const sgr = SGR_SEQUENCE_REGEX.exec(chunk.slice(index));
      if (sgr) {
        text += sgr[0];
        index += sgr[0].length;
        continue;
      }
      // OSC 8 hyperlinks: strip entirely (not a visible style for transcript).
      const osc = chunk.slice(index).match(/^\x1b\]8;;[^\x07\x1b]*(?:\x07|\x1b\\)/);
      if (osc) {
        index += osc[0].length;
        continue;
      }
      const csi = chunk.slice(index).match(/^\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/);
      if (csi) {
        index += csi[0].length;
        continue;
      }
      index += 1;
      continue;
    }
    const ch = chunk[index];
    if (ch === "\r") {
      const lastNl = text.lastIndexOf("\n");
      text = lastNl === -1 ? "" : text.slice(0, lastNl + 1);
      index += 1;
      continue;
    }
    if (ch === "\n") {
      text += "\n";
      index += 1;
      continue;
    }
    if (ch === "\b") {
      // Delete the last visible character, keeping any trailing SGR codes.
      const trailing = TRAILING_SGR_REGEX.exec(text);
      const sgrTail = trailing ? trailing[0] : "";
      const head = sgrTail ? text.slice(0, -sgrTail.length) : text;
      if (head.length > 0 && head[head.length - 1] !== "\n") {
        text = head.slice(0, -1) + sgrTail;
      }
      index += 1;
      continue;
    }
    const code = ch.charCodeAt(0);
    if ((code < 0x20 && ch !== "\t") || code === 0x7f) {
      index += 1;
      continue;
    }
    text += ch;
    index += 1;
  }
  return text;
}

/**
 * East Asian Ambiguous（EA=A）宽度约定。
 * - narrow（默认）：EA=A 一律按 1 列（纯 stringWidth 结果），适合 VSCode(unicode11)/iTerm2/
 *   Windows Terminal（compatibility.ambiguousWidth 默认 narrow）等现代默认终端；
 * - wide：EA=A 按完整 Unicode EA 表计 2 列（框线、几何符号、×、→、… 均含），
 *   并额外把 CJK 字体渲染成全宽的杂项符号（★ ☑ 等）按 2 列，适合 CJK 字体终端或
 *   ambiguous=double 设置。
 */
export type TuiAmbiguousWidth = "narrow" | "wide";

/**
 * 解析 EA=A 宽度约定：
 * 显式参数 > env NOLO_TUI_AMBIGUOUS_WIDTH > Windows 上读 Windows Terminal
 * 的 `compatibility.ambiguousWidth`（方案见 wtAmbiguousWidth.ts）> 默认 "narrow"。
 * 大小写不敏感，非法值跳过该层继续往下判定。
 *
 * WT 一侧的策略只影响终端自己的渲染与 conhost 记账，不会告诉我们，
 * 所以用户在 WT 里设了 wide 而我们不读配置的话，每个 EA=A 字符都会少算 1 列，
 * 表格竖线逐列漂移。
 */
export function resolveAmbiguousWidth(
  explicit?: TuiAmbiguousWidth,
  env: Record<string, string | undefined> = process.env,
): TuiAmbiguousWidth {
  if (explicit === "wide" || explicit === "narrow") return explicit;
  const raw = env.NOLO_TUI_AMBIGUOUS_WIDTH;
  if (typeof raw === "string") {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed === "wide") return "wide";
    if (trimmed === "narrow") return "narrow";
  }
  return detectedWindowsTerminalAmbiguousWidth() ?? "narrow";
}

/** 进程内只探测一次：displayWidth 是热路径，不能每次去读 settings.json。 */
let wtAmbiguousWidthCache: TuiAmbiguousWidth | null | undefined;

function detectedWindowsTerminalAmbiguousWidth(): TuiAmbiguousWidth | null {
  if (wtAmbiguousWidthCache === undefined) {
    wtAmbiguousWidthCache = detectWindowsTerminalAmbiguousWidth();
  }
  return wtAmbiguousWidthCache;
}

/** 测试专用：清空 WT 策略探测缓存（非 Windows 上恒为 null）。 */
export function __resetWtAmbiguousWidthCacheForTest(): void {
  wtAmbiguousWidthCache = undefined;
}

/**
 * CJK 字体额外按全宽渲染的「杂项符号」区间：这些码点在 Unicode EA 表里是
 * Neutral（不是 Ambiguous），wcwidth 与 string-width 都按 1 列算，但 CJK
 * 字体（宋体、MS Gothic、更纱黑体等）常把它们画成全宽。wide 约定下额外 +1 补齐。
 *
 * 排除 0x2768-0x2775（❨❩❪❫ 类括号）：CJK 字体对它们仍按窄渲染。
 *
 * EA=A 的主体不在这里——那部分交给 string-width 的 ambiguousIsNarrow:false
 * 用完整 EA 表处理（见 displayWidth 的决策记录）。手写区间表曾漏掉整块框线
 * （U+2500-257F）、几何符号（U+25A0-25FF）与 U+2026，wide 约定下永远修不好。
 */
function isCjkFontWideSymbolCode(code: number): boolean {
  return (
    (code >= 0x2600 && code <= 0x27bf && !(code >= 0x2768 && code <= 0x2775)) ||
    (code >= 0x2b00 && code <= 0x2bff) ||
    (code >= 0x1f300 && code <= 0x1faff) ||
    (code >= 0x231a && code <= 0x231b) || // ⌚ ⌛
    (code >= 0x23e9 && code <= 0x23fa) // ⏱⏸⏹ 等杂项技术符号（⏳⏰ 本身已是 EA=Wide，靠下面的复核去重）
  );
}

/** CJK 全角引号（zh locale 下强制加宽）。 */
function isCjkQuoteCode(code: number): boolean {
  return code === 0x201c || code === 0x201d || code === 0x2018 || code === 0x2019;
}

/**
 * 框线字符集。unicode 用制表符（好看），ascii 用 `+ - |`。
 *
 * 为什么需要 ascii：制表符（U+2500-257F）是 EA=A，wide 约定下每个占 2 列，
 * 而框线行的补格是用 `str.repeat(n)` 按**字符数**补的——`"─".repeat(5)` 是
 * 10 格，表格内容行却按 displayWidth 补到 5 格，两张宽度体系对不上，表格必炸。
 * ASCII 的 `+ - |` 在任何等宽字体下都是 1 格，是唯一能保证列对齐的框线。
 * 故 wide 约定下自动切 ascii；`NOLO_TUI_BOX` 可显式覆盖。
 */
export type TuiBoxCharset = "ascii" | "unicode";

export interface TuiBoxGlyphs {
  h: string;
  v: string;
  tl: string;
  tm: string;
  tr: string;
  ml: string;
  mm: string;
  mr: string;
  bl: string;
  bm: string;
  br: string;
}

const UNICODE_BOX_GLYPHS: TuiBoxGlyphs = {
  h: "─",
  v: "│",
  tl: "┌",
  tm: "┬",
  tr: "┐",
  ml: "├",
  mm: "┼",
  mr: "┤",
  bl: "└",
  bm: "┴",
  br: "┘",
};

const ASCII_BOX_GLYPHS: TuiBoxGlyphs = {
  h: "-",
  v: "|",
  tl: "+",
  tm: "+",
  tr: "+",
  ml: "+",
  mm: "+",
  mr: "+",
  bl: "+",
  bm: "+",
  br: "+",
};

/**
 * 解析框线字符集：显式参数 > env NOLO_TUI_BOX（ascii|unicode）> 宽度约定推导。
 * wide 约定下推导为 ascii（理由见 TuiBoxCharset 注释），narrow 下保持 unicode。
 */
export function resolveBoxCharset(
  ambiguousWidth: TuiAmbiguousWidth = resolveAmbiguousWidth(),
  env: Record<string, string | undefined> = process.env,
): TuiBoxCharset {
  const raw = env.NOLO_TUI_BOX;
  if (typeof raw === "string") {
    const trimmed = raw.trim().toLowerCase();
    if (trimmed === "ascii") return "ascii";
    if (trimmed === "unicode") return "unicode";
  }
  return ambiguousWidth === "wide" ? "ascii" : "unicode";
}

export function boxGlyphs(charset: TuiBoxCharset): TuiBoxGlyphs {
  return charset === "ascii" ? ASCII_BOX_GLYPHS : UNICODE_BOX_GLYPHS;
}

/**
 * 单次遍历判定一行是否需要慢路径与是否命中加宽区间。
 *
 *  - hasNonAscii：是否存在非 ASCII 码点。
 *  - hasCandidate：是否存在只有慢路径才能补宽的码点。
 *    EA=A 不在此列（string-width 的 ambiguousIsNarrow:false 一次搞定，无需逐 cluster 复核）；
 *    只有 CJK 字体加宽的杂项符号（wide 下）与 zh 全角引号需要逐 cluster +1。
 *
 * 【决策记录 · EA=A 宽度约定】
 * 默认 narrow 的依据：string-width、VSCode(unicode11)、iTerm2、Windows Terminal
 * （`compatibility.ambiguousWidth` 默认 narrow，实测见 microsoft/terminal#19864）
 * 等主流终端默认均按窄（1 列）渲染；若强制按 2 列计宽会导致 padCell 过 pad
 * （终端实际渲染窄于计宽），进而导致表格竖线向左移位、逐列累加错位。
 * 故宽度约定必须与终端一致，默认采用 narrow，并支持通过 NOLO_TUI_AMBIGUOUS_WIDTH=wide
 * 在 CJK 字体终端或 ambiguous=double 设置下开启宽渲染。
 *
 * wide 的 EA=A 判定委托给 string-width（`ambiguousIsNarrow: false` → 内部用
 * get-east-asian-width 的完整 EA 表），不再手写码点区间：手写表会持续落后于
 * Unicode，且曾漏掉框线/几何符号/省略号——那正是「开了 wide 竖线仍漂移」的成因。
 * zh locale 下的 CJK 全角引号（“”‘’）加宽行为独立于 EA=A 约定保持不变。
 */
function scanWidthNeeds(
  plain: string,
  locale: "zh" | "en",
  ambiguousWidth: TuiAmbiguousWidth,
): { hasNonAscii: boolean; hasCandidate: boolean } {
  let hasNonAscii = false;
  const isWideMode = ambiguousWidth === "wide";

  for (let i = 0; i < plain.length; i++) {
    const cc = plain.charCodeAt(i);
    if (cc < 0x2000) {
      if (cc >= 0x80) hasNonAscii = true;
      continue;
    }
    hasNonAscii = true;
    let code = cc;
    if (cc >= 0xd800 && cc <= 0xdbff && i + 1 < plain.length) {
      const lo = plain.charCodeAt(i + 1);
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        code = (cc - 0xd800) * 0x400 + (lo - 0xdc00) + 0x10000;
        i += 1;
      }
    }
    const isSymbolCandidate = isWideMode && isCjkFontWideSymbolCode(code);
    const isQuoteCandidate = locale === "zh" && isCjkQuoteCode(code);
    if (isSymbolCandidate || isQuoteCandidate) {
      return { hasNonAscii: true, hasCandidate: true };
    }
  }
  return { hasNonAscii, hasCandidate: false };
}

// 按行 memo：key = locale + \0 + ambiguousWidth + \0 + plain。
// 上限限制避免长会话内存无界增长（FIFO 淘汰）。
const displayWidthCache = new Map<string, number>();
const DISPLAY_WIDTH_CACHE_MAX = 4096;

/**
 * 测试专用：观察缓存占用。
 *
 * 用于断言「纯 ASCII 行不写缓存」这一路径契约。该契约无法用等价性测试覆盖
 * （走不走缓存结果都对），若靠计时断言又会在 CI 上抖动误报，因此直接暴露
 * 状态做确定性断言。不供生产代码调用。
 */
export function __getDisplayWidthCacheSizeForTest(): number {
  return displayWidthCache.size;
}

/** 测试专用：清空缓存，隔离用例间的相互影响。 */
export function __clearDisplayWidthCacheForTest(): void {
  displayWidthCache.clear();
}

export function displayWidth(
  str: string,
  ambiguousWidth: TuiAmbiguousWidth = resolveAmbiguousWidth(),
): number {
  const plain = stripAnsi(str);
  const locale = getCliLocale();
  // EA=A 的宽度约定交给 string-width 的完整 EA 表：wide 时 ambiguousIsNarrow
  // 关闭 → 框线(U+2500-257F)、几何符号(U+25A0-25FF)、×、→、…、圈数字等全部按 2 列。
  const widthOptions = { ambiguousIsNarrow: ambiguousWidth !== "wide" };

  // 单次廉价扫描：判定是否需要缓存（含非 ASCII）以及是否命中慢路径区间。
  const needs = scanWidthNeeds(plain, locale, ambiguousWidth);

  // 快路径：纯 ASCII 行绝无命中区间码点，直接返回，不缓存。
  if (!needs.hasNonAscii) {
    return stringWidth(plain, widthOptions);
  }

  // 非 ASCII 行：绝大多数调用方是重复渲染同一行内容（反复重绘同一可视窗口），
  // 命中缓存可跳过 stringWidth(plain) 与 Segmenter，是最大的收益来源。
  // key 含 locale 与 ambiguousWidth，避免运行期 locale/约定变化导致缓存失配。
  const key = locale + "\u0000" + ambiguousWidth + "\u0000" + plain;
  const cached = displayWidthCache.get(key);
  if (cached !== undefined) return cached;

  const remember = (width: number): number => {
    if (displayWidthCache.size >= DISPLAY_WIDTH_CACHE_MAX) {
      const eldest = displayWidthCache.keys().next().value as string | undefined;
      if (eldest !== undefined) displayWidthCache.delete(eldest);
    }
    displayWidthCache.set(key, width);
    return width;
  };

  const base = stringWidth(plain, widthOptions);

  // 含非 ASCII 但不含慢路径码点的行（中文/日文等）：与逐 cluster 扫描结果一致，直接返回并缓存。
  if (!needs.hasCandidate) {
    return remember(base);
  }

  // 慢路径：只有 CJK 字体加宽的杂项符号（wide）与 zh 全角引号需要逐 cluster +1。
  // 复核宽度时用同一个 options，避免与 EA=A 的加宽重复叠加（★ 已是 2 列，不再 +1）。
  let width = base;
  const isWideMode = ambiguousWidth === "wide";
  for (const { segment } of graphemeSegmenter.segment(plain)) {
    const code = segment.codePointAt(0) ?? 0;
    const isSymbol = isWideMode && isCjkFontWideSymbolCode(code);
    const isQuote = locale === "zh" && isCjkQuoteCode(code);
    if (isSymbol || isQuote) {
      if (stringWidth(segment, widthOptions) === 1) width += 1;
    }
  }
  return remember(width);
}

/** Visible columns after stripping ANSI (status lines, borders, chips). */
export function visibleWidth(str: string): number {
  return displayWidth(stripAnsi(str));
}

/**
 * Truncate a possibly-ANSI string to `maxWidth` visible columns.
 * Preserves CSI sequences so colors don't bleed; always ends with reset when truncated.
 */
export function truncateAnsi(text: string, maxWidth: number): string {
  if (maxWidth <= 0) return "";
  // OSC 8 wrappers are invisible; drop them before measuring so a hidden url
  // cannot shift the cut. Labels survive, hyperlinks do not (fixed lines only).
  text = stripOsc8Hyperlinks(text);
  if (visibleWidth(text) <= maxWidth) return text;
  let width = 0;
  let out = "";
  let i = 0;
  let sawAnsi = false;
  while (i < text.length) {
    if (text[i] === "\x1b" && text[i + 1] === "[") {
      sawAnsi = true;
      let j = i + 2;
      while (j < text.length) {
        const code = text.charCodeAt(j);
        j += 1;
        if (code >= 0x40 && code <= 0x7e) break;
      }
      out += text.slice(i, j);
      i = j;
      continue;
    }
    const codePoint = text.codePointAt(i) ?? 0;
    const char = String.fromCodePoint(codePoint);
    const charWidth = displayWidth(char);
    if (width + charWidth > maxWidth) break;
    out += char;
    width += charWidth;
    i += char.length;
  }
  // Only force a reset when ANSI was present — plain text should stay plain.
  return sawAnsi ? `${out}\x1b[0m` : out;
}

export function fitAnsiLine(text: string, width: number, ellipsis = "…"): string {
  if (width <= 0) return "";
  if (visibleWidth(text) <= width) return text;
  const ellipsisWidth = displayWidth(ellipsis);
  // Double-width ellipsis (e.g. "⋯") that cannot fit: fall back to a single-width cut.
  if (width < ellipsisWidth) return truncateAnsi(text, width);
  if (width === ellipsisWidth) return truncateAnsi(ellipsis, width) || truncateAnsi(text, width);
  return `${truncateAnsi(text, width - ellipsisWidth)}${ellipsis}`;
}

export function countPhysicalLines(text: string, columns: number): number {
  const lines = text.split("\n");
  let total = 0;
  for (const line of lines) {
    // Same defence as truncateAnsi: measure the visible label, not the hidden url.
    const width = visibleWidth(stripOsc8Hyperlinks(line));
    total += Math.max(1, Math.ceil(width / columns));
  }
  return Math.max(total, 1);
}

export function takeDisplayWidth(
  text: string,
  width: number,
): { prefix: string; rest: string } {
  let used = 0;
  let index = 0;
  for (const char of text) {
    const charWidth = displayWidth(char);
    if (used + charWidth > width && used > 0) break;
    used += charWidth;
    index += char.length;
  }
  return { prefix: text.slice(0, index), rest: text.slice(index) };
}

export function padOrTruncateToWidth(text: string, width: number): string {
  const textWidth = visibleWidth(text);
  if (textWidth > width) {
    return truncateAnsi(text, width);
  }
  return `${text}${" ".repeat(width - textWidth)}`;
}

const SGR_RESET_REGEX = /^\x1b\[0?m$/;
export type WrapToken = {
  kind: "sgr" | "char";
  value: string;
  width: number;
  charIndex: number;
};

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function tokenizeAnsiLine(line: string): WrapToken[] {
  const tokens: WrapToken[] = [];
  let index = 0;
  while (index < line.length) {
    if (line[index] === "\x1b") {
      // OSC 8 hyperlinks (ESC ]8;;...ST) are zero-width style tokens.
      const osc = line.slice(index).match(/^\x1b\]8;;[^\x07\x1b]*(?:\x07|\x1b\\)/);
      if (osc) {
        tokens.push({ kind: "sgr", value: osc[0], width: 0, charIndex: index });
        index += osc[0].length;
        continue;
      }
      const sgr = SGR_SEQUENCE_REGEX.exec(line.slice(index));
      if (sgr) {
        tokens.push({ kind: "sgr", value: sgr[0], width: 0, charIndex: index });
        index += sgr[0].length;
        continue;
      }
      const csi = line.slice(index).match(/^\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/);
      if (csi) {
        index += csi[0].length;
        continue;
      }
      // Consume every other recognized terminal escape without replaying it.
      // Besides avoiding cursor/title injection from transcript text, this
      // guarantees progress for OSC and non-SGR CSI sequences.
      const escape = FIRST_ANSI_ESCAPE_REGEX.exec(line.slice(index));
      if (escape?.index === 0) {
        index += escape[0].length;
        continue;
      }
      // An isolated or vendor-specific ESC must never pin the tokenizer on
      // the same byte forever. Drop it and continue with the visible suffix.
      index += 1;
      continue;
    }
    let nextEsc = line.indexOf("\x1b", index);
    if (nextEsc === -1) nextEsc = line.length;
    const chunk = line.slice(index, nextEsc);
    for (const item of graphemeSegmenter.segment(chunk)) {
      tokens.push({
        kind: "char",
        value: item.segment,
        width: displayWidth(item.segment),
        charIndex: index + item.index,
      });
    }
    index = nextEsc;
  }
  return tokens;
}

/**
 * Build a character-offset mapping from stripped styled line back to raw source line.
 * Handles Markdown formatting ([link](url), `code`, **bold**, *italic*, ~~strike~~, # headings).
 */
export function buildSourceMapping(rawLine: string, styledLine: string, prefixCharCount: number): number[] {
  let contentStart = 0;
  const headingMatch = rawLine.match(/^(#{1,3})\s+(.+)$/);
  let lineToParse = rawLine;
  if (headingMatch) {
    contentStart = headingMatch[1]!.length + 1;
    while (contentStart < rawLine.length && rawLine[contentStart] === " ") contentStart++;
    lineToParse = rawLine.slice(contentStart);
  }

  const INLINE_RE = /(\[([^\]]+)\]\(([^)\s]+)\)|`([^`]+)`|\*\*(.+?)\*\*|(?<!\*)\*([^*]+?)\*(?!\*)|~~([^~]+?)~~)/g;
  const mapping: number[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_RE.exec(lineToParse)) !== null) {
    const plainBefore = lineToParse.slice(lastIdx, match.index);
    for (let c = 0; c < plainBefore.length; c++) {
      mapping.push(contentStart + lastIdx + c);
    }

    const fullMatch = match[0];
    if (match[2] !== undefined && match[3] !== undefined) {
      // Link [text](url) -> visible "text (url)"
      const linkText = match[2];
      const linkUrl = match[3];
      const textOffset = contentStart + match.index + 1;
      for (let c = 0; c < linkText.length; c++) {
        mapping.push(textOffset + c);
      }
      const parenOffset = textOffset + linkText.length;
      mapping.push(parenOffset);
      mapping.push(parenOffset + 1);
      const urlOffset = parenOffset + 2;
      for (let c = 0; c < linkUrl.length; c++) {
        mapping.push(urlOffset + c);
      }
      mapping.push(urlOffset + linkUrl.length);
    } else if (match[4] !== undefined) {
      // `code` -> visible "code"
      const codeText = match[4];
      const codeOffset = contentStart + match.index + 1;
      for (let c = 0; c < codeText.length; c++) {
        mapping.push(codeOffset + c);
      }
    } else if (match[5] !== undefined) {
      // **bold** -> visible "bold"
      const boldText = match[5];
      const boldOffset = contentStart + match.index + 2;
      for (let c = 0; c < boldText.length; c++) {
        mapping.push(boldOffset + c);
      }
    } else if (match[6] !== undefined) {
      // *italic* -> visible "italic"
      const italicText = match[6];
      const italicOffset = contentStart + match.index + 1;
      for (let c = 0; c < italicText.length; c++) {
        mapping.push(italicOffset + c);
      }
    } else if (match[7] !== undefined) {
      // ~~strikethrough~~ -> visible "strikethrough"
      const strikeText = match[7];
      const strikeOffset = contentStart + match.index + 2;
      for (let c = 0; c < strikeText.length; c++) {
        mapping.push(strikeOffset + c);
      }
    }
    lastIdx = match.index + fullMatch.length;
  }

  const plainRest = lineToParse.slice(lastIdx);
  for (let c = 0; c < plainRest.length; c++) {
    mapping.push(contentStart + lastIdx + c);
  }

  return mapping;
}

export type WrappedTranscriptRow = {
  rendered: string;
  sourceStart: number;
  sourceEnd: number;
  prefixWidth: number;
  sourceMapping?: number[];
  /** True when the next physical row continues the same logical source line. */
  softWrapped?: boolean;
  /** Whitespace consumed at the wrap boundary and absent from rendered rows. */
  softWrapJoiner?: string;
};

/**
 * Wrap one transcript line to `columns` visible cells, tracking source start/end offsets.
 */
export function wrapTranscriptLineWithLayout(
  line: string,
  columns: number,
  hangingIndent = "",
  lineSourceStart = 0,
  prefixWidth = 0,
  prefixCharCount = 0,
  sourceMapping?: number[],
  rawLineLength?: number,
): WrappedTranscriptRow[] {
  if (line === "") {
    const rawLen = rawLineLength ?? 0;
    return [
      {
        rendered: "",
        sourceStart: lineSourceStart,
        sourceEnd: lineSourceStart + rawLen,
        prefixWidth,
      },
    ];
  }
  const tokens = tokenizeAnsiLine(line);
  const rows: WrappedTranscriptRow[] = [];

  let activeStyles: string[] = [];
  const applyStyleToken = (value: string) => {
    if (SGR_RESET_REGEX.test(value)) {
      activeStyles = [];
    } else {
      activeStyles.push(value);
    }
  };

  // 行首守卫用的「最后一个非样式 token 下标」：提前算一次（O(T)），避免每行
  // tokens.slice(start) 复制剩余 token 数组 —— 那会让长单行退化成 O(rows·T)。
  let lastContentTokenIndex = -1;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (tokens[i]!.kind !== "sgr") {
      lastContentTokenIndex = i;
      break;
    }
  }

  const CJK_CLOSING_OR_SEP_REGEX = /^[，。！？；：、）》】」』]$/;
  // Protect leading list markers (e.g. `• `, `1. `, `◈ • `) from becoming an
  // orphan line 1 when the body starts with a long unbroken token or CJK+path
  // phrase that overflows later on the line.
  let listMarkerEndToken = 0;
  {
    let plainPrefix = "";
    let probe = 0;
    while (probe < tokens.length && plainPrefix.length < 24) {
      const tok = tokens[probe]!;
      if (tok.kind === "char") {
        plainPrefix += tok.value;
        if (plainPrefix.length >= 2 && !/^(?:◈ ?)?\s*(?:\d*[.)]?|[•*+-])?\s*$/.test(plainPrefix)) {
          break;
        }
        if (/^(?:◈\s+)?\s*(?:\d+[.)]|[•*+-])\s+$/.test(plainPrefix)) {
          listMarkerEndToken = probe + 1;
        }
      }
      probe += 1;
    }
  }

  let plainCharIndexAtStart = 0;
  let start = 0;
  while (start < tokens.length) {
    // Only zero-width style tokens left: fold them into the previous line
    // instead of emitting a visually blank row.
    if (start > lastContentTokenIndex && rows.length > 0) break;
    const openingStyles = [...activeStyles];
    const isContinuation = rows.length > 0;
    const currentPrefixWidth = isContinuation ? visibleWidth(hangingIndent) : prefixWidth;
    const indentWidth = isContinuation ? visibleWidth(hangingIndent) : 0;
    const maxSegmentWidth = Math.max(1, columns - indentWidth);

    const nextContent = (from: number) => {
      while (from < tokens.length && tokens[from]!.kind === "sgr") from += 1;
      return tokens[from];
    };

    let width = 0;
    let end = start;
    let lastBreak = -1; // index just after a breakable char
    while (end < tokens.length) {
      const token = tokens[end]!;
      if (token.kind === "sgr") {
        end += 1;
        continue;
      }
      if (width + token.width > maxSegmentWidth && width > 0) break;
      width += token.width;
      end += 1;
      if (token.charIndex >= prefixCharCount && (isContinuation || end > listMarkerEndToken)) {
        if (
          token.value === " " ||
          token.value === "\t" ||
          CJK_CLOSING_OR_SEP_REGEX.test(token.value) ||
          token.value === "/"
        ) {
          lastBreak = end;
        }
      }
    }

    let segmentEnd = end;
    if (end < tokens.length && lastBreak > start) {
      // Mid-word overflow (or closing CJK punctuation after a Latin/digit word)
      // with a break opportunity earlier in the segment: break there unless the
      // break itself is directly followed by closing CJK punctuation.
      const overflowToken = tokens[end]!;
      if (
        overflowToken.kind === "char" &&
        overflowToken.value !== " " &&
        (overflowToken.width === 1 || CJK_CLOSING_OR_SEP_REGEX.test(overflowToken.value)) &&
        nextContent(lastBreak) !== overflowToken
      ) {
        segmentEnd = lastBreak;
      }
    }
    // CJK closing punctuation belongs to the preceding non-whitespace character
    // (Han, Latin, digits, or ASCII closing paren) so `）。` never starts a
    // continuation line alone, without stranding a leading list marker.
    const next = nextContent(segmentEnd);
    if (next?.kind === "char" && CJK_CLOSING_OR_SEP_REGEX.test(next.value)) {
      const minBacktrack = isContinuation ? start : Math.max(start, listMarkerEndToken);
      let previous = segmentEnd - 1;
      while (previous > minBacktrack) {
        const tok = tokens[previous]!;
        if (tok.kind === "sgr") {
          previous -= 1;
          continue;
        }
        if (CJK_CLOSING_OR_SEP_REGEX.test(tok.value)) {
          previous -= 1;
          continue;
        }
        break;
      }
      const preceding = tokens[previous];
      if (
        previous > minBacktrack &&
        preceding?.kind === "char" &&
        preceding.value !== " " &&
        preceding.value !== "\t"
      ) {
        segmentEnd = previous;
      }
    }
    if (segmentEnd === start) segmentEnd = start + 1;

    let segment = "";
    let sawStyle = openingStyles.length > 0;
    for (let i = start; i < segmentEnd; i += 1) {
      const token = tokens[i]!;
      segment += token.value;
      if (token.kind === "sgr") {
        sawStyle = true;
        applyStyleToken(token.value);
      }
    }
    const prefix = openingStyles.join("");
    const needsReset =
      (sawStyle || activeStyles.length > 0) && !segment.endsWith("\x1b[0m");
    const lineContent = `${prefix}${segment}${needsReset ? "\x1b[0m" : ""}`;
    const rowRendered = isContinuation && hangingIndent.length > 0 ? `${hangingIndent}${lineContent}` : lineContent;

    let segSourceStart = lineSourceStart;
    let segSourceEnd = lineSourceStart;
    let foundFirst = false;
    const rowMapping: number[] = [];

    // 行内纯文本游标继承上一次迭代的累积值：原先每行重扫 tokens[0..start) 累计
    // plainCharIndex，是 O(rows·T) 二次成本（长单行的主要卡顿来源）。
    let plainCharIndex = plainCharIndexAtStart;

    for (let i = start; i < segmentEnd; i++) {
      const tok = tokens[i]!;
      if (tok.kind === "char" && tok.charIndex >= prefixCharCount) {
        const mappedOffset = sourceMapping && sourceMapping[plainCharIndex] !== undefined
          ? sourceMapping[plainCharIndex]!
          : plainCharIndex;
        if (!foundFirst) {
          segSourceStart = lineSourceStart + mappedOffset;
          foundFirst = true;
        }
        for (let c = 0; c < tok.value.length; c++) {
          const idx = plainCharIndex + c;
          const mapped = sourceMapping && sourceMapping[idx] !== undefined ? sourceMapping[idx]! : idx;
          rowMapping.push(lineSourceStart + mapped);
        }
        const lastCharIdx = plainCharIndex + tok.value.length - 1;
        const mappedEndOffset = sourceMapping && sourceMapping[lastCharIdx] !== undefined
          ? sourceMapping[lastCharIdx]! + 1
          : plainCharIndex + tok.value.length;
        segSourceEnd = lineSourceStart + mappedEndOffset;
        plainCharIndex += tok.value.length;
      }
    }

    start = segmentEnd;
    let softWrapJoiner = "";
    // Continuation rows never start with the space we just wrapped at.
    while (start < tokens.length) {
      const token = tokens[start]!;
      if (token.kind === "char" && token.value === " " && token.charIndex >= prefixCharCount) {
        softWrapJoiner += token.value;
        const mappedOffset = sourceMapping && sourceMapping[plainCharIndex] !== undefined
          ? sourceMapping[plainCharIndex]! + 1
          : plainCharIndex + 1;
        segSourceEnd = lineSourceStart + mappedOffset;
        plainCharIndex += token.value.length;
        start += 1;
        continue;
      }
      break;
    }

    if (start >= tokens.length && rawLineLength !== undefined) {
      segSourceEnd = lineSourceStart + rawLineLength;
    }

    // 下一次迭代的行首游标（含本轮 joiner 扫描消费掉的空格）。
    plainCharIndexAtStart = plainCharIndex;

    rows.push({
      rendered: rowRendered,
      sourceStart: segSourceStart,
      sourceEnd: segSourceEnd,
      prefixWidth: currentPrefixWidth,
      sourceMapping: rowMapping.length > 0 ? rowMapping : undefined,
      softWrapped: start < tokens.length,
      softWrapJoiner,
    });
  }

  return rows.length > 0
    ? rows
    : [
        {
          rendered: "",
          sourceStart: lineSourceStart,
          sourceEnd: lineSourceStart + (rawLineLength ?? 0),
          prefixWidth,
        },
      ];
}

/**
 * Wrap one transcript line to `columns` visible cells.
 *
 * Unlike `wrapTextToLines` (composer draft; must stay byte-per-cell simple so
 * cursor math holds), this wrapper:
 * - treats SGR color sequences as zero-width and re-opens the active style on
 * the continuation line, closing every styled line with a reset so colors
 * never bleed into the scrollbar column or the next row;
 * - prefers breaking after the last space/tab so latin words survive wrapping
 * (CJK breaks anywhere, which is correct for those scripts).
 */
export function wrapTranscriptLine(
  line: string,
  columns: number,
  hangingIndent = ""
): string[] {
  return wrapTranscriptLineWithLayout(line, columns, hangingIndent).map((r) => r.rendered);
}

/**
 * Build terminal window/tab title OSC escape sequences.
 * Strips ANSI codes, converts newlines to spaces, truncates to 80 display columns,
 * and emits both OSC 0 and OSC 2 using BEL (\x07) as string terminator.
 */
export function buildWindowTitle(title: string): string {
  // Strip ANSI first, then replace all C0/C1 control chars (including BEL \x07
  // and ESC \x1b) with spaces so they can't prematurely terminate the OSC 0/2
  // sequence or leak raw escapes into the terminal.
  const plain = stripAnsi(title).replace(/[\x00-\x1f\x7f-\x9f]+/g, " ");
  let truncated = "";
  let width = 0;
  const maxCols = 80;
  for (const char of plain) {
    const charWidth = displayWidth(char);
    if (width + charWidth > maxCols) break;
    truncated += char;
    width += charWidth;
  }
  return `\x1b]0;${truncated}\x07\x1b]2;${truncated}\x07`;
}

export function wrapTextToLines(text: string, columns: number): string[] {
  const result: string[] = [];
  for (const logicalLine of text.split("\n")) {
    if (logicalLine === "") {
      result.push("");
      continue;
    }
    let remaining = logicalLine;
    while (remaining.length > 0) {
      const { prefix, rest } = takeDisplayWidth(remaining, columns);
      result.push(prefix);
      remaining = rest;
    }
  }
  return result;
}
