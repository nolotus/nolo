import {
  classifyDiffLine,
  renderDiffLine,
  resolveTuiBrightness,
  type TuiBrightness,
} from "../tui/theme";
import { renderMermaidBlock } from "./mermaid";
import {
  isTableRow,
  isTableSeparatorLine,
  parseMarkdownTableBlock,
  renderMarkdownTable,
  splitTableCells,
} from "./markdownTable";
import { renderMathBlock } from "./mathText";
import { colorSeq, STYLE, styleInlineMarkdown } from "./inlineMarkdown";

/** `| a | b |` shaped line (pipe-wrapped, at least two cells). */
function isPipeWrappedTableRow(line: string) {
  const trimmed = line.trim();
  return (
    trimmed.startsWith("|") &&
    trimmed.endsWith("|") &&
    isTableRow(line)
  );
}

function isCodeFenceLine(line: string) {
  return /^\s*```/.test(line);
}

// ─── Code-block syntax highlighting (line-local) ───────────────────────────
// The highlighter is deliberately LINE-LOCAL: it only ever looks at the single
// line passed to it. The streaming path emits one line at a time and a line
// can't be revised once written, so any cross-line state would desync under
// streaming. Consequences (intentional trade-offs, NOT bugs to fix):
//   - Multi-line `/* ... */` block comments: only the part after `/*` on the
//     OPENING line is treated as a comment; middle/end lines are NOT.
//   - Python `"""..."""` triple-quoted strings: same — only the opening line.
// The only cross-line state allowed is the pre-existing `inFence` flag plus
// the current fence's language, both maintained by the callers.

/** ```ts / ```bash / ``` → "ts" / "bash" / "" (closing fence → ""). */
function readFenceLanguage(line: string): string {
  const m = line.match(/^\s*```\s*([a-zA-Z0-9+#_-]*)/);
  return m ? (m[1] ?? "").toLowerCase() : "";
}

export type CodeLang = "js" | "py" | "sh" | "json" | "diff" | "unknown";

/** Normalize a fence language hint or file extension into one of the supported highlight langs. */
export function normalizeCodeLang(raw: string): CodeLang {
  switch (raw.toLowerCase()) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "mjs":
    case "cjs":
    case "javascript":
    case "typescript":
      return "js";
    case "py":
    case "python":
      return "py";
    case "sh":
    case "bash":
    case "zsh":
    case "shell":
    case "console":
      return "sh";
    case "json":
      return "json";
    case "diff":
      return "diff";
    default:
      return "unknown";
  }
}

const KEYWORDS: Record<Exclude<CodeLang, "unknown">, ReadonlySet<string>> = {
  js: new Set([
    "const", "let", "var", "function", "return", "if", "else", "for", "while",
    "class", "new", "await", "async", "import", "export", "from", "type",
    "interface", "extends", "implements", "null", "undefined", "true", "false",
  ]),
  py: new Set([
    "def", "class", "return", "if", "elif", "else", "for", "while", "import",
    "from", "as", "with", "try", "except", "finally", "lambda", "None", "True",
    "False", "self",
  ]),
  sh: new Set([
    "if", "then", "else", "fi", "for", "do", "done", "while", "case", "esac",
    "function", "export", "local", "return", "source", "echo", "cd",
  ]),
  json: new Set(["true", "false", "null"]),
  diff: new Set([]),
};

// A single "segment" is a maximal run of plain (non-string, non-comment) text
// between string/comment regions. We collect string+comment regions first, then
// scan the gaps for keywords/numbers. This ordering is what keeps `"def"` from
// being colored as a keyword — strings are carved out before keyword matching.
export type Region = { start: number; end: number; kind: "string" | "comment" };

/** Find string and comment regions in a line for the given language. */
export function scanStringCommentRegions(line: string, lang: CodeLang): Region[] {
  const regions: Region[] = [];
  const n = line.length;
  let i = 0;
  // sh and py use `#` for comments; js and json use `//`. We only recognize the
  // line-comment form (line-local: no block-comment state).
  const commentMarkers: string[] =
    lang === "py" || lang === "sh" ? ["#"] : ["//"];
  while (i < n) {
    const ch = line[i];
    // Strings: ', ", ` (js only for backtick). Pair on the same line; an
    // unclosed quote runs to end-of-line.
    if (ch === "'" || ch === '"' || (lang === "js" && ch === "`")) {
      const quote = ch;
      const start = i;
      i += 1;
      while (i < n) {
        if (line[i] === "\\") {
          i += 2; // skip escaped char
          continue;
        }
        if (line[i] === quote) {
          i += 1;
          break;
        }
        i += 1;
      }
      regions.push({ start, end: i, kind: "string" });
      continue;
    }
    // Comments: highest priority once we hit a marker outside a string.
    let matched = false;
    for (const marker of commentMarkers) {
      if (line.startsWith(marker, i)) {
        regions.push({ start: i, end: n, kind: "comment" });
        i = n;
        matched = true;
        break;
      }
    }
    if (matched) continue;
    i += 1;
  }
  // Regions are produced in increasing start order by construction.
  return regions;
}

export function detectCodeLangFromPath(filePath?: string): CodeLang {
  if (!filePath) return "unknown";
  const ext = filePath.split(".").pop() ?? "";
  return normalizeCodeLang(ext);
}

/**
 * Highlight a single code line with theme tokens. Line-local only.
 * `lang === "unknown"` returns the EXACT pre-change result (whole line in info),
 * so unannotated code blocks are byte-identical to before — zero regression.
 */
export function highlightCodeLine(line: string, lang: CodeLang, brightness: TuiBrightness): string {
  const info = colorSeq("info", brightness);
  if (lang === "unknown") {
    return `${info}${line}${STYLE.reset}`;
  }
  if (lang === "diff") {
    // Shared classification + renderer with renderDiffCodeBlock so streamed
    // lines and a full redraw paint identically. renderDiffLine resolves its
    // own env/brightness (same source as the `brightness` arg here) and resets
    // with \x1b[0m so the background tint never leaks to the next line.
    return renderDiffLine({ kind: classifyDiffLine(line), text: line, colorEnabled: true });
  }
  const regions = scanStringCommentRegions(line, lang);
  const keywords = KEYWORDS[lang];
  const accent = colorSeq("accent", brightness);
  const success = colorSeq("success", brightness);
  const warning = colorSeq("warning", brightness);
  const chrome = colorSeq("chrome", brightness);
  const dim = STYLE.dim;
  const reset = STYLE.reset;

  const out: string[] = [];
  let cursor = 0;
  for (const region of regions) {
    // Plain gap before this region: scan for keywords + numbers, default info.
    if (region.start > cursor) {
      out.push(emitPlainGap(line.slice(cursor, region.start), keywords, info, accent, warning, reset));
    }
    const text = line.slice(region.start, region.end);
    if (region.kind === "string") {
      out.push(`${success}${text}${reset}`);
    } else {
      out.push(`${chrome}${dim}${text}${reset}`);
    }
    cursor = region.end;
  }
  // Trailing plain gap after the last region.
  if (cursor < line.length) {
    out.push(emitPlainGap(line.slice(cursor), keywords, info, accent, warning, reset));
  }
  return out.join("");
}

/** Emit a plain (non-string, non-comment) gap: keywords→accent, numbers→warning, else→info. */
function emitPlainGap(
  text: string,
  keywords: ReadonlySet<string>,
  info: string,
  accent: string,
  warning: string,
  reset: string
): string {
  // Tokenize into word/number runs and everything else. Anything not matched
  // stays in the info base color so the block keeps a continuous background.
  const parts: string[] = [];
  const re = /([A-Za-z_]\w*)|(\d+(?:\.\d+)?)|([\s\S])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let started = false;
  while ((m = re.exec(text)) !== null) {
    if (!started) {
      // leading text before first token, if any (re always matches at 0 due to [\s\S])
      started = true;
    }
    if (m.index > last) {
      parts.push(`${info}${text.slice(last, m.index)}`);
    }
    if (m[1] !== undefined) {
      const word = m[1];
      if (keywords.has(word)) {
        parts.push(`${accent}${word}${reset}`);
      } else {
        parts.push(`${info}${word}`);
      }
    } else if (m[2] !== undefined) {
      parts.push(`${warning}${m[2]}${reset}`);
    } else {
      parts.push(`${info}${m[3]}`);
    }
    last = re.lastIndex;
  }
  if (last < text.length) {
    parts.push(`${info}${text.slice(last)}`);
  }
  return parts.join("");
}

// ─── List rendering ─────────────────────────────────────────────────────────
// Normalize markdown list markers so bullet style stays consistent and
// indentation is preserved across levels. We keep the original leading
// whitespace as the indentation (it's what AI models produce), and only
// swap the marker.
//   "- item"   / "* item"  / "+ item"  →  "• item"
//   "1. item" / "2. item"             →  "1. item"  (keep number)
//   "- [ ] item"                      →  "☐ item"
//   "- [x] item"                      →  "☑ item"
// Nested lists keep their leading spaces, so multi-level structure is visible.
const UNORDERED_LIST_RE = /^(\s*)([-*+])\s+(.+)$/;
const ORDERED_LIST_RE = /^(\s*)(\d+)\.\s+(.+)$/;
const TASK_LIST_RE = /^(\s*)([-*+])\s+\[([ xX])\]\s+(.+)$/;

function normalizeListLine(line: string): string {
  // Task list: "- [ ] item" / "- [x] item" → "☐ item" / "☑ item"
  const task = line.match(TASK_LIST_RE);
  if (task) {
    const checked = task[3] === "x" || task[3] === "X";
    return `${task[1]}${checked ? "☑" : "☐"} ${task[4]}`;
  }
  const unordered = line.match(UNORDERED_LIST_RE);
  if (unordered) {
    return `${unordered[1]}• ${unordered[3]}`;
  }
  // Ordered list: keep the number but ensure consistent ". " spacing.
  const ordered = line.match(ORDERED_LIST_RE);
  if (ordered) {
    return `${ordered[1]}${ordered[2]}. ${ordered[3]}`;
  }
  return line;
}

/**
 * polishAssistantStructure 的列表↔prose 呼吸空行判定（H1 splice 守卫用）。
 * 判定必须作用在 convertMarkdownTablesForTerminal 的行归一化之后
 * （"- item" 会先被改写成 "• item" 才参与 LIST_LIKE 匹配）。
 */
export function isPolishListLikeLine(line: string): boolean {
  return LIST_LIKE_RE_FOR_GUARD.test(normalizeListLine(line));
}

const LIST_LIKE_RE_FOR_GUARD = /^\s*(?:•|☐|☑|\d+\.)\s|^\s*[\u2460-\u2473]/;

/**
 * polish 呼吸规则：cur/next 相邻两行之间是否会插入空行。
 * 与 polishAssistantStructure 的逐对判定严格对齐（blank 两侧不插）。
 */
export function polishBreathInsertsBlankBetween(cur: string, next: string): boolean {
  if (cur === "" || next === "") return false;
  return isPolishListLikeLine(cur) !== isPolishListLikeLine(next);
}

export function convertMarkdownTablesForTerminal(text: string) {
  const lines = text.split("\n");
  const out: string[] = [];
  let inFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (isCodeFenceLine(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    const next = lines[index + 1] ?? "";
    if (isTableRow(line) && isTableSeparatorLine(next)) {
      // 收集完整表格块：header + 分隔行 + 连续 body 行。
      const block: string[] = [line, next];
      let cursor = index + 2;
      while (
        cursor < lines.length &&
        isTableRow(lines[cursor] ?? "") &&
        !isTableSeparatorLine(lines[cursor] ?? "")
      ) {
        block.push(lines[cursor] ?? "");
        cursor += 1;
      }
      index = cursor - 1; // 外层 for 会 += 1
      const table = parseMarkdownTableBlock(block);
      const hasBody = table !== null && table.rows.length > 0;
      if (table && hasBody) {
        // 真实框线表（超宽自动压缩列宽 + 软换行，极窄降级为记录卡片）。
        // 宽度/主题在此解析，/theme 切换后重绘自动跟随。
        out.push(renderMarkdownTable(table));
        if (out[out.length - 1] !== "") out.push("");
      } else {
        // 退化块（header-only / 无 body）：整块保持原样，避免空表格。
        for (const l of block) out.push(l);
      }
      continue;
    }
    // Orphan table fragments: streamed tables can leak a header-less row or a
    // separator on its own line, which used to render as raw `| … | … |`.
    // 无 header 的孤儿行没有字段语义：首格作记录名，其余格按位置编号。
    if (isPipeWrappedTableRow(line)) {
      if (!isTableSeparatorLine(line)) {
        const cells = splitTableCells(line);
        out.push(
          renderMarkdownTable({
            headers: ["record", ...cells.slice(1).map((_, i) => `col${i + 1}`)],
            aligns: ["left", ...cells.slice(1).map(() => "left" as const)],
            rows: [cells],
          }),
        );
        if (out[out.length - 1] !== "") out.push("");
      }
      continue;
    }
    out.push(normalizeListLine(line));
  }

  return out.join("\n");
}

export function polishAssistantStructure(
  text: string,
  options: { trimEdges?: boolean } = {}
) {
  // Drop NUL before masking. The fence mask below encodes interior lines as
  // \x00F<n>\x00, so text that already contained a literal \x00 could be
  // mistaken for a sentinel and restored as the wrong line. NUL is never
  // meaningful in markdown — the TUI transcript path strips it anyway — so
  // removing it here closes the collision instead of relying on callers.
  const converted = convertMarkdownTablesForTerminal(text)
    .replace(/\r\n/g, "\n")
    .replace(/\x00/g, "");
  const lines = converted.split("\n");

  // 遮罩：逐行扫描并标记围栏内部。
  // 围栏标记行（```）本身不属于围栏内部内容，保持参与围栏外逻辑；
  // 而开围栏与闭围栏之间的行被判定为围栏内部，替换为形如 \x00F<n>\x00 的非空哨兵串，
  // 避免匹配标题加空行正则，且防止围栏内连续空行被正则 3 压缩。
  let inFence = false;
  const maskedLines = lines.map((line, index) => {
    if (isCodeFenceLine(line)) {
      inFence = !inFence;
      return line;
    }
    if (inFence) {
      return `\x00F${index}\x00`;
    }
    return line;
  });

  const afterHeading = maskedLines
    .join("\n")
    // Blank line before a heading, and one after it. Only the "before" half
    // existed, so a heading sat flush against its own body text and sections
    // ran together — the breathing room is what makes the structure scannable
    // once the heading itself is just colored text with no "###" marker left.
    .replace(/([^\n])\n(#{1,3} )/g, "$1\n\n$2")
    .replace(/^(#{1,3} .+)\n(?!\n)/gm, "$1\n\n")
    .replace(/\n{4,}/g, "\n\n\n");

  // List ↔ prose breathing: insert a single blank line between a list-like
  // line and an adjacent non-list, non-empty line (both directions). Long
  // replies lean on `1.`/`•`/`☐`/`☑` lists, and without a gap the list block
  // runs into the next paragraph (or the prose into the list) so nothing is
  // scannable. Consecutive list items keep their tight grouping — no blank
  // between siblings. Fence interiors are already masked to `\x00F<n>\x00`
  // sentinels (not list-like), so code that happens to look like a list is
  // never touched.
  const LIST_LIKE = /^\s*(?:•|☐|☑|\d+\.)\s|^\s*[\u2460-\u2473]/;
  const headingLines = afterHeading.split("\n");
  const breathed: string[] = [];
  for (let i = 0; i < headingLines.length; i++) {
    breathed.push(headingLines[i]);
    const cur = headingLines[i];
    const next = headingLines[i + 1];
    if (cur === "" || next === undefined || next === "") continue;
    if (LIST_LIKE.test(cur) === LIST_LIKE.test(next)) continue;
    breathed.push("");
  }
  const polishedMasked = breathed.join("\n");

  // 还原：将哨兵串按行号还原为原始围栏行
  const polished = polishedMasked.replace(
    /\x00F(\d+)\x00/g,
    (_, id) => lines[Number(id)] ?? ""
  );

  // Streamed per-line blocks must keep their indentation (bullets, list items);
  // only whole-message formatting trims outer whitespace.
  return options.trimEdges === false ? polished : polished.trim();
}

function styleRichMarkdownLine(line: string, brightness: TuiBrightness) {
  const heading = line.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    const level = heading[1].length;
    const title = heading[2];
    // Three-tier heading hierarchy for scannable structure:
    //   H1 → accent + bold + underline (strongest visual anchor, section breaks)
    //   H2 → warning + bold (warm amber, subsection headers)
    //   H3 → info + bold (lighter, paragraph-level labels)
    // The old "all warning" approach made every heading look identical; the
    // even older "h3 = info, h1/h2 = bold-only" inverted hierarchy by giving
    // the deepest level the most color. This ordering is monotonically
    // decreasing in visual weight: accent > warning > info.
    if (level === 1) {
      return `${STYLE.bold}\x1b[4m${colorSeq("accent", brightness)}${title}${STYLE.reset}`;
    }
    if (level === 2) {
      return `${STYLE.bold}${colorSeq("warning", brightness)}${title}${STYLE.reset}`;
    }
    return `${STYLE.bold}${colorSeq("info", brightness)}${title}${STYLE.reset}`;
  }
  // 状态行弱化：repo 规范强制每条回复首句是"进入 nolo-plan…"，连续多条
  // 回复堆叠时视觉噪声大。把它降级成 chrome + dim 的弱化行，和正文拉开
  // 层级。必须与 highlightMarkdown（tui/theme.ts）对齐，否则同一条回复
  // 在流式与历史重绘间会出现颜色跳变。
  if (line.startsWith("进入 nolo-plan")) {
    return `${colorSeq("chrome", brightness)}${STYLE.dim}${line}${STYLE.reset}`;
  }
  // Blockquote: "> text" → chrome left border + dimmed content, visually
  // distinct from body text without competing with headings or code.
  const blockquote = line.match(/^>\s?(.*)$/);
  if (blockquote) {
    const border = colorSeq("chrome", brightness);
    const content = blockquote[1];
    return `${border}│${STYLE.reset} ${STYLE.dim}${content}${STYLE.reset}`;
  }
  // Horizontal rule: use chrome-colored line instead of barely-visible dim.
  if (/^---+$/.test(line.trim())) {
    return `${colorSeq("chrome", brightness)}${"─".repeat(Math.min(line.trim().length, 40))}${STYLE.reset}`;
  }
  // List bullets: color the marker for visual rhythm without coloring the
  // entire line (which would fight inline markdown highlighting).
  const bullet = line.match(/^(\s*)(•)\s(.+)$/);
  if (bullet) {
    const styled = styleInlineMarkdown(bullet[3], brightness);
    return `${bullet[1]}${colorSeq("accent", brightness)}•${STYLE.reset} ${styled}`;
  }
  // Ordered list markers (`1.`, `2.` …): chrome, not accent. The number is
  // structural chrome — accent made it compete with the body text it labels,
  // and a column of saturated blue digits read as noise in long numbered lists
  // (owner feedback 2026-08-02). Chrome keeps `1.` legible as a marker while
  // letting the content lead. Task markers below stay accent: ☐/☑ carry state,
  // not just position, so they earn the emphasis.
  const ordered = line.match(/^(\s*)(\d+\.)\s(.+)$/);
  if (ordered) {
    const styled = styleInlineMarkdown(ordered[3], brightness);
    return `${ordered[1]}${colorSeq("chrome", brightness)}${ordered[2]}${STYLE.reset} ${styled}`;
  }
  const task = line.match(/^(\s*)(☐|☑)\s(.+)$/);
  if (task) {
    const styled = styleInlineMarkdown(task[3], brightness);
    return `${task[1]}${colorSeq("accent", brightness)}${task[2]}${STYLE.reset} ${styled}`;
  }
  return styleInlineMarkdown(line, brightness);
}

/**
 * Render a complete ```mermaid ``` block (body lines only, no fences) as a
 * terminal diagram. Falls back to the raw body rendered as a normal code block
 * when the content isn't a parseable flowchart (so user content is preserved).
 */
function renderMermaidBody(
  bodyLines: string[],
  brightness: TuiBrightness
): string {
  const body = bodyLines.join("\n");
  const rendered = renderMermaidBlock(body, brightness, true);
  // Only use the diagram if it actually parsed into something; otherwise keep
  // the normal per-line code highlighting.
  if (rendered === body) {
    return bodyLines.map((l) => highlightCodeLine(l, "unknown", brightness)).join("\n");
  }
  return rendered;
}

export function formatAssistantDisplay(
  text: string,
  options: { trimEdges?: boolean } = {}
) {
  const brightness = resolveTuiBrightness();
  const polished = polishAssistantStructure(text, options);
  const lines = polished.split("\n");
  const out: string[] = [];
  let i = 0;
  let inFence = false;
  let fenceLang: CodeLang = "unknown";
  // True while we're inside a ```mermaid ``` block collecting its body.
  let inMermaid = false;
  // Accumulated body of the current mermaid block.
  let mermaidBody: string[] | null = null;

  const flushMermaid = (): void => {
    if (mermaidBody !== null) {
      out.push(renderMermaidBody(mermaidBody, brightness));
      mermaidBody = null;
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    if (isCodeFenceLine(line)) {
      const lang = readFenceLanguage(line);
      if (inMermaid) {
        // Closing mermaid fence: flush the diagram, then the fence marker.
        flushMermaid();
        inMermaid = false;
        inFence = false;
        out.push(`${STYLE.dim}${line}${STYLE.reset}`);
        i++;
        continue;
      }
      if (inFence) {
        fenceLang = "unknown";
        inFence = false;
        out.push(`${STYLE.dim}${line}${STYLE.reset}`);
        i++;
        continue;
      }
      // Opening fence.
      inFence = true;
      fenceLang = normalizeCodeLang(lang);
      if (/^mermaid$/i.test(lang)) {
        inMermaid = true;
        mermaidBody = [];
      }
      out.push(`${STYLE.dim}${line}${STYLE.reset}`);
      i++;
      continue;
    }
    if (inMermaid && mermaidBody !== null) {
      mermaidBody.push(line);
      i++;
      continue;
    }
    if (inFence) {
      out.push(highlightCodeLine(line, fenceLang, brightness));
      i++;
      continue;
    }

    // Math block detection: $$...$$ or \[...\]
    const trimmed = line.trim();
    if (trimmed.startsWith("$$") || trimmed.startsWith("\\[")) {
      const isBracket = trimmed.startsWith("\\[");
      const closeMarker = isBracket ? "\\]" : "$$";

      if (trimmed.length > 2 && trimmed.endsWith(closeMarker)) {
        const inner = trimmed.slice(2, trimmed.length - 2);
        out.push(renderMathBlock(inner));
        i++;
        continue;
      }

      // Multi-line block
      const blockLines: string[] = [];
      const firstInner = trimmed.slice(2).trim();
      if (firstInner) blockLines.push(firstInner);
      let j = i + 1;
      let closed = false;
      while (j < lines.length) {
        const curLine = lines[j] ?? "";
        const curTrim = curLine.trim();
        if (curTrim.endsWith(closeMarker) || curTrim === closeMarker) {
          const lastInner = curTrim.slice(0, curTrim.length - 2).trim();
          if (lastInner) blockLines.push(lastInner);
          closed = true;
          j++;
          break;
        }
        blockLines.push(curLine);
        j++;
      }

      if (closed) {
        out.push(renderMathBlock(blockLines.join("\n")));
        i = j;
        continue;
      }
    }

    out.push(styleRichMarkdownLine(line, brightness));
    i++;
  }
  // Trailing unclosed mermaid: flush whatever we collected.
  flushMermaid();
  return out.join("\n");
}

function emitFormattedAssistantBlock(
  write: (chunk: string) => void,
  text: string,
  trailingNewline = false
) {
  if (!text) return;
  write(formatAssistantDisplay(text, { trimEdges: false }));
  if (trailingNewline) write("\n");
}

/**
 * Stream-path line kind for list↔prose breathing. The whole-message polish
 * sees all lines at once; the stream writer emits one finished line at a time,
 * so it must remember the previous kind and inject the same blank line the
 * polish step would have inserted.
 */
type StreamLineKind = "list" | "prose" | "blank" | "other";

function classifyStreamLine(line: string): StreamLineKind {
  if (line === "") return "blank";
  // Raw markdown forms (stream input) plus already-normalized markers.
  if (
    TASK_LIST_RE.test(line) ||
    UNORDERED_LIST_RE.test(line) ||
    ORDERED_LIST_RE.test(line) ||
    /^\s*(?:•|☐|☑)\s/.test(line) ||
    /^\s*[\u2460-\u2473]/.test(line)
  ) {
    return "list";
  }
  return "prose";
}

function needsListProseBreath(
  prev: StreamLineKind | null,
  next: StreamLineKind
): boolean {
  if (prev === null || prev === "blank" || next === "blank") return false;
  const prevList = prev === "list";
  const nextList = next === "list";
  // prose↔list and other↔list both breathe; prose↔other does not.
  return prevList !== nextList;
}

export function createRenderAwareStreamWriter(args: {
  write: (chunk: string) => void;
}) {
  const brightness = resolveTuiBrightness();
  let buffer = "";
  let inFence = false;
  // Current fence language, recorded at the opening fence and cleared at the
  // closing fence. This is the only cross-line state the line-local highlighter
  // is allowed to consume (see highlightCodeLine).
  let fenceLang: CodeLang = "unknown";
  // True while inside a ```mermaid ``` block; body accumulates in mermaidBody
  // and is rendered once on the closing fence (needs the whole block).
  let inMermaid = false;
  let mermaidBody: string[] = [];
  // Last emitted line kind outside (and across) fences — drives stream-path
  // list↔prose breathing so live TUI matches whole-message polish.
  let lastKind: StreamLineKind | null = null;
  // Keep the live transcript moving even when a provider sends a long prose
  // line without a newline. Complete lines still take the structured path
  // below; this is only a safe, whitespace-boundary fallback for prose.
  const PARTIAL_FLUSH_THRESHOLD = 48;

  const emitBreathIfNeeded = (nextKind: StreamLineKind) => {
    if (needsListProseBreath(lastKind, nextKind)) args.write("\n");
  };

  const flushPartialProse = () => {
    if (inFence || buffer.length < PARTIAL_FLUSH_THRESHOLD) return;
    const firstLine = buffer.split("\n", 1)[0] ?? "";
    // Only flush lines that are definitely plain prose. Any Markdown marker
    // stays buffered so a later chunk can be rendered as one complete span;
    // otherwise a partial `**bold`/`code`/link could leak raw syntax or differ
    // from the whole-message renderer. Lists and headings also need their
    // structural line boundary for spacing decisions.
    if (isTableRow(firstLine) || classifyStreamLine(firstLine) !== "prose") return;
    // Use grapheme segments rather than String#slice so emoji and combining
    // marks cannot be split in the middle of a user-visible character.
    const Segmenter = Intl.Segmenter;
    const graphemes = typeof Segmenter === "function"
      ? Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(firstLine), (part) => part.segment)
      : Array.from(firstLine);
    if (graphemes.length < PARTIAL_FLUSH_THRESHOLD) return;
    let cut = PARTIAL_FLUSH_THRESHOLD;
    const whitespaceIndex = graphemes
      .slice(0, cut)
      .findLastIndex((part) => /\s/.test(part));
    if (whitespaceIndex > 0) cut = whitespaceIndex + 1;
    const prefix = graphemes.slice(0, cut).join("");
    // Only the emitted prefix needs to be structurally safe. Markdown that
    // starts later in the still-buffered suffix cannot affect this chunk.
    const hasUnsafeMarkdownPrefix =
      /[`*_~\[$]/.test(prefix) ||
      /^\s*[#>]/.test(prefix) ||
      /!\[/.test(prefix);
    if (hasUnsafeMarkdownPrefix) return;
    emitBreathIfNeeded("prose");
    emitFormattedAssistantBlock(args.write, prefix, false);
    lastKind = "prose";
    buffer = prefix.length === buffer.length
      ? ""
      : buffer.slice(prefix.length);
  };

  const flushCompleteBlocks = () => {
    while (buffer.includes("\n")) {
      const lines = buffer.split("\n");
      if (lines.length < 2) break;
      const firstLine = lines[0] ?? "";

      if (isCodeFenceLine(firstLine)) {
        if (inMermaid) {
          // Closing mermaid fence: render the accumulated body, then the fence.
          const diagram = renderMermaidBody(mermaidBody, brightness);
          args.write(diagram + "\n");
          mermaidBody = [];
          inMermaid = false;
          inFence = false;
          fenceLang = "unknown";
          emitBreathIfNeeded("other");
          args.write(`${STYLE.dim}${firstLine}${STYLE.reset}\n`);
          lastKind = "other";
          buffer = lines.slice(1).join("\n");
          continue;
        }
        if (inFence) {
          fenceLang = "unknown";
          inFence = false;
        } else {
          const lang = readFenceLanguage(firstLine);
          fenceLang = normalizeCodeLang(lang);
          if (/^mermaid$/i.test(lang)) {
            inMermaid = true;
            mermaidBody = [];
          }
          inFence = true;
        }
        // Fence markers count as non-list ("other") so a list run flush against
        // ``` still gets the same blank polishAssistantStructure would insert.
        emitBreathIfNeeded("other");
        args.write(`${STYLE.dim}${firstLine}${STYLE.reset}\n`);
        lastKind = "other";
        buffer = lines.slice(1).join("\n");
        continue;
      }
      if (inMermaid) {
        mermaidBody.push(firstLine);
        buffer = lines.slice(1).join("\n");
        continue;
      }
      if (inFence) {
        // Line-local highlighting, matching formatAssistantDisplay. No trim,
        // no table conversion inside fences. Interior never breathes as lists.
        args.write(`${highlightCodeLine(firstLine, fenceLang, brightness)}\n`);
        lastKind = "other";
        buffer = lines.slice(1).join("\n");
        continue;
      }

      // Math block detection in stream buffer
      const trimmedFirst = firstLine.trim();
      if (
        (trimmedFirst.startsWith("$$") || trimmedFirst.startsWith("\\[")) &&
        !inFence
      ) {
        const isBracket = trimmedFirst.startsWith("\\[");
        const closeMarker = isBracket ? "\\]" : "$$";

        // Same-line closed math block
        if (trimmedFirst.length > 2 && trimmedFirst.endsWith(closeMarker)) {
          emitBreathIfNeeded("other");
          const inner = trimmedFirst.slice(2, trimmedFirst.length - 2);
          args.write(renderMathBlock(inner) + "\n");
          lastKind = "other";
          buffer = lines.slice(1).join("\n");
          continue;
        }

        // Multi-line math block: scan for closing marker
        let closeIndex = -1;
        for (let j = 1; j < lines.length; j++) {
          const curTrim = lines[j]?.trim() ?? "";
          if (curTrim.endsWith(closeMarker) || curTrim === closeMarker) {
            closeIndex = j;
            break;
          }
        }

        if (closeIndex === -1) {
          // Incomplete math block: wait for more chunks to arrive
          break;
        }

        // Complete multi-line math block
        emitBreathIfNeeded("other");
        const blockLines = lines.slice(0, closeIndex + 1);
        const firstInner = blockLines[0].trim().slice(2).trim();
        const middleLines = blockLines.slice(1, -1);
        const lastTrim = blockLines[blockLines.length - 1].trim();
        const lastInner = lastTrim.slice(0, lastTrim.length - 2).trim();

        const innerParts: string[] = [];
        if (firstInner) innerParts.push(firstInner);
        innerParts.push(...middleLines);
        if (lastInner) innerParts.push(lastInner);

        args.write(renderMathBlock(innerParts.join("\n")) + "\n");
        lastKind = "other";
        buffer = lines.slice(closeIndex + 1).join("\n");
        continue;
      }

      if (isTableRow(firstLine)) {
        // The line after the first row decides between a real table (separator
        // next) and an orphan row. Wait until that line is complete instead of
        // leaking the header as raw `| … |` text.
        const nextLineComplete = lines.length > 2;
        if (!nextLineComplete) break;

        if (isTableSeparatorLine(lines[1] ?? "")) {
          let end = 2;
          while (
            end < lines.length &&
            isTableRow(lines[end] ?? "") &&
            !isTableSeparatorLine(lines[end] ?? "")
          ) {
            end += 1;
          }
          const tableComplete = end < lines.length - 1;
          if (!tableComplete) break;

          // Tables render as bullet lists — breathe like entering a list, then
          // leave lastKind as list so following prose also breathes.
          emitBreathIfNeeded("list");
          emitFormattedAssistantBlock(
            args.write,
            lines.slice(0, end).join("\n"),
            true
          );
          lastKind = "list";
          buffer = lines.slice(end).join("\n");
          continue;
        }
      }

      const kind = classifyStreamLine(firstLine);
      emitBreathIfNeeded(kind);
      emitFormattedAssistantBlock(args.write, firstLine, true);
      lastKind = kind;
      buffer = lines.slice(1).join("\n");
    }
  };

  return {
    push(chunk: string) {
      if (!chunk) return;
      buffer += chunk;
      flushCompleteBlocks();
      flushPartialProse();
    },
    flush() {
      // Handle an unclosed mermaid block first: buffer may already be empty
      // (lines were consumed into mermaidBody), but we must still render it.
      if (inMermaid) {
        if (buffer) mermaidBody.push(...buffer.split("\n"));
        args.write(renderMermaidBody(mermaidBody, brightness) + "\n");
        mermaidBody = [];
        inMermaid = false;
        buffer = "";
        return;
      }
      if (!buffer) return;
      if (inFence) {
        args.write(buffer);
      } else {
        emitFormattedAssistantBlock(args.write, buffer);
      }
      buffer = "";
    },
  };
}
/**
 * Clean assistant text for CLI display. Think tags are stripped because
 * thinking content arrives via separate "thinking" events (shown on the
 * spinner line), not inline in the content stream.
 */
export function formatAssistantTextForCli(text: string): string {
  return text
    .replace(/\u003cthink\u003e[\s\S]*?\u003c\/think\u003e\s*/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
