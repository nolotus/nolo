/**
 * TUI 显示层纯函数：ANSI 处理、显示宽度、截断与换行。
 *
 * 从 readlineWorkspace.ts 抽出，全部为无副作用字符串工具，唯一外部依赖是
 * i18n 的 locale（displayWidth 对 CJK 全角引号按 locale 判宽度）。
 */
import { getCliLocale } from "./i18n";
import ansiRegex from "ansi-regex";
import stringWidth from "string-width";

export const ANSI_ESCAPE_REGEX =
  /\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g;
const ALL_ANSI_ESCAPE_REGEX = ansiRegex();
const FIRST_ANSI_ESCAPE_REGEX = ansiRegex({ onlyFirst: true });

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
 * East Asian Ambiguous（EA=A）常见符号：stringWidth 按 1 列计，但 CJK 终端
 * （尤其 zh locale）实际按 2 列渲染 → 表格 pad 不足、框线错位。强制按 2 列计。
 * 逐个考证：箭头 ←↑→↓↔↕ / ⇐⇒⇔、数学 ×÷±、项目符号 •·。
 * 注意：×÷±· 位于 U+2000 之下，scanWidthNeeds 必须单独识别（见下）。
 */
function isAmbiguousWideSymbolCode(code: number): boolean {
  return (
    (code >= 0x2190 && code <= 0x2195) || // ←↑→↓↔↕
    code === 0x21d0 || code === 0x21d2 || code === 0x21d4 || // ⇐⇒⇔
    code === 0x00d7 || code === 0x00f7 || code === 0x00b1 || // ×÷±
    code === 0x2022 || code === 0x00b7 // • ·
  );
}

/**
 * 命中区间首码点判断：需要强制加宽的杂项符号 / emoji 区间（同原实现内联语义）。
 * 注意：这些区间并非全部位于 >= U+2000 —— ×÷±· 等 EA=A 符号位于 U+2000 之下，
 * 由 isAmbiguousWideSymbolCode 单独识别（见上）。isForceWideSymbolCode 是
 * isAmbiguousWideSymbolCode 的超集，二者共同构成 displayWidth 的加宽来源。
 */
function isForceWideSymbolCode(code: number): boolean {
  return (
    (code >= 0x2600 && code <= 0x27bf && !(code >= 0x2768 && code <= 0x2775)) ||
    (code >= 0x2b00 && code <= 0x2bff) ||
    (code >= 0x1f300 && code <= 0x1faff) ||
    isAmbiguousWideSymbolCode(code)
  );
}

/** CJK 全角引号（zh locale 下强制加宽）。 */
function isCjkQuoteCode(code: number): boolean {
  return code === 0x201c || code === 0x201d || code === 0x2018 || code === 0x2019;
}

/**
 * 单次遍历判定一行是否需要慢路径与是否命中加宽区间。
 *
 *  - hasNonAscii：是否存在非 ASCII 码点。注意：不仅 >= U+2000 的码点（任一
 *    代码单元 >= 0x2000，或任何代理对）算非 ASCII，位于 U+2000 之下的 EA=A
 *    符号（×÷±·）也会命中 isAmbiguousWideSymbolCode 而返回 hasNonAscii: true
 *    —— 因此「仅含 × 的行」也会走慢路径，这是有意为之（× 需按 2 列计宽）。
 *    纯 ASCII 行绝不可能命中任何加宽区间，直接用 stringWidth 快路径返回、不缓存。
 *  - hasCandidate：是否存在可能触发强制加宽的码点（命中区间 / zh 下 CJK 引号）。
 * 两者共享一次循环，只做整数比较，远快于每字素簇一次 stringWidth。
 *
 * 【决策记录 · EA=A 符号加宽】×÷±· 与箭头等 EA=A 符号按 2 列计宽是 locale
 * 无关的全局策略（不依赖 zh/en）。取舍：窄渲染终端（按 1 列渲染这些符号）会
 * 反向过 pad —— 欠 pad 导致框线错位，过 pad 导致早截断；我们接受「过 pad 导致
 * 早截断」这一侧（框线不错位优先于内容完整）。
 */
function scanWidthNeeds(plain: string, locale: "zh" | "en"): { hasNonAscii: boolean; hasCandidate: boolean } {
  let hasNonAscii = false;
  for (let i = 0; i < plain.length; i++) {
    const cc = plain.charCodeAt(i);
    // 部分 EA=A 符号（×÷±·）位于 U+2000 之下，需在 ASCII 快路径之外单独识别。
    if (isAmbiguousWideSymbolCode(cc)) {
      return { hasNonAscii: true, hasCandidate: true };
    }
    if (cc < 0x2000) continue;
    // 到这里 cc >= 0x2000，必属非 ASCII。必须记录下来再继续扫描：提前 return
    // 会让「未命中加宽区间」的分支无从得知本行含非 ASCII，纯 ASCII 快路径便成
    // 死代码，所有 ASCII 行都改走缓存写入 + FIFO 淘汰（实测慢 13x）。
    hasNonAscii = true;
    let code = cc;
    if (cc >= 0xd800 && cc <= 0xdbff && i + 1 < plain.length) {
      const lo = plain.charCodeAt(i + 1);
      if (lo >= 0xdc00 && lo <= 0xdfff) {
        code = (cc - 0xd800) * 0x400 + (lo - 0xdc00) + 0x10000;
        i += 1;
      }
    }
    if (isForceWideSymbolCode(code) || (locale === "zh" && isCjkQuoteCode(code))) {
      return { hasNonAscii: true, hasCandidate: true };
    }
  }
  return { hasNonAscii, hasCandidate: false };
}

// 按行 memo：key = plain + locale。key 含 locale 以避免运行期 locale 变化导致缓存失配。
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

export function displayWidth(str: string): number {
  const plain = stripAnsi(str);
  const locale = getCliLocale();

  // 单次廉价扫描：判定是否需要缓存（含非 ASCII）以及是否命中加宽区间。
  const needs = scanWidthNeeds(plain, locale);

  // 快路径：纯 ASCII 行绝无命中区间码点（区间全部 >= U+2000），直接返回，
  // 不缓存（纯 ASCII 计算快，缓存无收益，且避免占用有限缓存槽）。
  if (!needs.hasNonAscii) {
    return stringWidth(plain);
  }

  // 非 ASCII 行：绝大多数调用方是重复渲染同一行内容（反复重绘同一可视窗口），
  // 命中缓存可跳过 stringWidth(plain) 与 Segmenter，是最大的收益来源。
  // key 含 locale，避免运行期 locale 变化导致缓存失配。
  const key = locale + "\u0000" + plain;
  const cached = displayWidthCache.get(key);
  if (cached !== undefined) return cached;

  const base = stringWidth(plain);

  // 含非 ASCII 但不含命中区间码点的行（中文/日文等）：与原实现逐 cluster
  // 扫描结果必然一致（扫描不存在时循环体永不执行），直接返回并缓存。
  if (!needs.hasCandidate) {
    if (displayWidthCache.size >= DISPLAY_WIDTH_CACHE_MAX) {
      const eldest = displayWidthCache.keys().next().value as string | undefined;
      if (eldest !== undefined) displayWidthCache.delete(eldest);
    }
    displayWidthCache.set(key, base);
    return base;
  }

  // 慢路径：仅在码点落入命中区间时才调 stringWidth 校验
  // （替代原实现对每个 cluster 都做一次 stringWidth），其余 cluster 只做整数比较。
  let width = base;
  for (const { segment } of graphemeSegmenter.segment(plain)) {
    const code = segment.codePointAt(0) ?? 0;
    if (isForceWideSymbolCode(code) || (locale === "zh" && isCjkQuoteCode(code))) {
      if (stringWidth(segment) === 1) width += 1;
    }
  }

  if (displayWidthCache.size >= DISPLAY_WIDTH_CACHE_MAX) {
    const eldest = displayWidthCache.keys().next().value as string | undefined;
    if (eldest !== undefined) displayWidthCache.delete(eldest);
  }
  displayWidthCache.set(key, width);
  return width;
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
    const width = displayWidth(line);
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

  let start = 0;
  while (start < tokens.length) {
    // Only zero-width style tokens left: fold them into the previous line
    // instead of emitting a visually blank row.
    if (tokens.slice(start).every((token) => token.kind === "sgr")) {
      if (rows.length > 0) break;
    }
    const openingStyles = [...activeStyles];
    const isContinuation = rows.length > 0;
    const currentPrefixWidth = isContinuation ? visibleWidth(hangingIndent) : prefixWidth;
    const indentWidth = isContinuation ? visibleWidth(hangingIndent) : 0;
    const maxSegmentWidth = Math.max(1, columns - indentWidth);

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
      if ((token.value === " " || token.value === "\t") && token.charIndex >= prefixCharCount) {
        lastBreak = end;
      }
    }

    let segmentEnd = end;
    if (end < tokens.length && lastBreak > start) {
      // Mid-word overflow with a space earlier in the segment: break there.
      const overflowToken = tokens[end]!;
      if (overflowToken.kind === "char" && overflowToken.value !== " " && overflowToken.width === 1) {
        segmentEnd = lastBreak;
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

    // Calculate plainCharIndex up to segment start (excluding ANSI codes)
    let plainCharIndex = 0;
    for (let i = 0; i < start; i++) {
      const tok = tokens[i]!;
      if (tok.kind === "char" && tok.charIndex >= prefixCharCount) {
        plainCharIndex += tok.value.length;
      }
    }

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
  const plain = stripAnsi(title).replace(/[\x00-\x1f\x7f]+/g, " ");
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
