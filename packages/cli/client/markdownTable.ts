/**
 * Markdown 表格 → 真实终端表格渲染（纯函数，独立可测）。
 *
 * 取代旧的「降级成 bullet」路径：`| a | b |` 现在渲染为完整框线表格，
 * 三档自适应：
 *   - 完整框线表（`┌─┬─┐ / ├─┼─┤ / └─┴─┘`），表头 bold + 主题色；
 *   - 超宽时按比例压缩最宽列，单元格软换行成多行，框线保持完整；
 *   - 极窄（可用宽 < 40）或列数 > 6 时降级为记录卡片（每行一条记录，
 *     内部「字段: 值」分行）。
 *
 * 宽度一律走 tuiAnsi.displayWidth（stripAnsi + CJK 全角/emoji 感知），
 * 严禁 .length —— 中文表格用 .length 必然错位。
 *
 * 流水线位置：表格块在 convertMarkdownTablesForTerminal 的 plain 阶段被
 * 识别（单元格仍可能含 inline markdown，如 `code` / **bold**），因此
 * 所有宽度计算对已存在的 ANSI 先 strip（行内高亮先跑过的场景同样安全）。
 *
 * 缺陷 A 修复：单元格内的 inline markdown（**bold** / *italic* / ~~strike~~ /
 * [link](url)）在 renderMarkdownTable 内先经 styleInlineMarkdown 转成 ANSI
 * 样式。这样软换行（wrapCellToWidth）按 grapheme 切分时，定界符已随样式
 * 一起被消费，不再出现「** 被软换行从中间切开 → 下游按行配对失败 → 字面
 * 残留」的问题。渲染产物是纯文本框线 + 主题色表头 + 已样式化的单元格；
 * 下游 styleRichMarkdownLine 对已无字面标记的行是幂等的（ANSI 原样保留，
 * 宽度经 stripAnsi 后不变），不会重复叠加。
 */
import { displayWidth, tokenizeAnsiLine, type WrapToken } from "../tui/tuiAnsi";
import {
  resolveTuiBrightness,
  themeColorSequence,
  type TuiBrightness,
  type TuiThemeToken,
} from "../tui/theme";
import { styleInlineMarkdown } from "./inlineMarkdown";

export type TableCellAlign = "left" | "center" | "right";

export interface ParsedTable {
  headers: string[];
  aligns: TableCellAlign[];
  rows: string[][];
}

export interface TableRenderOptions {
  /** 终端可用宽度（显示列）。缺省走 resolveTableWidth。 */
  width?: number;
  /** 主题亮度。缺省从 env 解析（/theme 切换后自动跟随）。 */
  brightness?: TuiBrightness;
  /** 表头主题色 token（不要硬编码 ANSI）。 */
  headerToken?: TuiThemeToken;
}

// ─── 单元格解析 ─────────────────────────────────────────────────────────────
// 切分前必须先 mask 两类内容，否则会被 `|` 错误切分：
//   1. 转义竖线 `\|`（表格语法内表示字面 |）
//   2. code span `` `a|b` ``（行内代码里的 | 不是分隔符）
// mask 用 \x01<idx>\x02 单字节哨兵：不与 markdown 文本冲突，unmask 按
// idx 精确还原。流式路径在 tableComplete 之后才解析，未闭合 code span
// 不会到达这里。
const SENTINEL_OPEN = "\x01";
const SENTINEL_CLOSE = "\x02";

function maskCellInternals(cell: string): string {
  let out = "";
  let index = 0;
  while (index < cell.length) {
    const ch = cell[index];
    if (ch === "\\" && cell[index + 1] === "|") {
      out += `${SENTINEL_OPEN}0${SENTINEL_CLOSE}`;
      index += 2;
      continue;
    }
    if (ch === "`") {
      const end = cell.indexOf("`", index + 1);
      if (end > index) {
        // 哨兵包住 code span 的定界反引号本身，保留内部字面 |。
        out += cell.slice(index, end + 1).replace(/\|/g, `${SENTINEL_OPEN}1${SENTINEL_CLOSE}`);
        index = end + 1;
        continue;
      }
    }
    out += ch;
    index += 1;
  }
  return out;
}

function unmaskCell(cell: string): string {
  return cell
    .replace(/\x010\x02/g, "|")
    .replace(/\x011\x02/g, "|");
}

/**
 * 切分一行表格为单元格（列数精确，不丢弃空单元格）：
 * 处理转义竖线 `\|` 与 code span 内的 `|`。
 */
export function splitTableCells(line: string): string[] {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return [];
  const core = trimmed.replace(/^\|/, "").replace(/\|$/, "");
  const masked = maskCellInternals(core);
  return masked.split("|").map((cell) => unmaskCell(cell.trim()));
}

/** 对齐分隔行：`:---` 左 / `:---:` 居中 / `---:` 右 / `---` 左（缺省）。 */
export function parseTableAligns(sepLine: string): TableCellAlign[] {
  return splitTableCells(sepLine).map((cell) => {
    const left = cell.startsWith(":");
    const right = cell.length > 1 && cell.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "left";
  });
}

export function isTableSeparatorLine(line: string): boolean {
  const cells = splitTableCells(line);
  return (
    cells.length > 0 &&
    cells.every((cell) => /^:?-+:?$/.test(cell))
  );
}

/** 表格数据行/表头行：pipe 包裹且至少两格，其中一格非空。 */
export function isTableRow(line: string): boolean {
  const cells = splitTableCells(line);
  return cells.length >= 2 && cells.some((cell) => cell.length > 0);
}

/**
 * 把「header + 分隔行 + body 行」窗口解析成表格结构。
 * rows[0] 是 header，rows[1] 是分隔行，其余是 body。不合法返回 null。
 */
export function parseMarkdownTableBlock(rows: string[]): ParsedTable | null {
  if (rows.length < 2) return null;
  const headerLine = rows[0];
  const sepLine = rows[1] ?? "";
  if (!isTableSeparatorLine(sepLine)) return null;
  const headers = splitTableCells(headerLine ?? "");
  if (headers.length < 2) return null;
  const aligns = parseTableAligns(sepLine);
  while (aligns.length < headers.length) aligns.push("left");
  const tableRows: string[][] = [];
  for (let i = 2; i < rows.length; i++) {
    const cells = splitTableCells(rows[i] ?? "");
    if (cells.length === 0) continue;
    // markdown 允许 body 行短于 header：缺省补空串，列数对齐。
    const padded: string[] = [];
    for (let c = 0; c < headers.length; c += 1) padded.push(cells[c] ?? "");
    tableRows.push(padded);
  }
  return { headers, aligns, rows: tableRows };
}

// ─── 宽度与布局 ─────────────────────────────────────────────────────────────

/** 终端可用宽度：显式参数 > NOLO_TEST_TABLE_WIDTH > stdout.columns > 80。 */
export function resolveTableWidth(
  explicit?: number,
  env: Record<string, string | undefined> = process.env,
): number {
  if (typeof explicit === "number" && explicit > 0) return explicit;
  const override = parseInt(env.NOLO_TEST_TABLE_WIDTH, 10);
  if (!Number.isNaN(override) && override > 0) return override;
  const cols =
    typeof process !== "undefined" &&
    typeof process.stdout?.columns === "number"
      ? process.stdout.columns
      : 0;
  if (cols > 0) return cols;
  return 80;
}

/** 单元格显示宽度（displayWidth 内部先 stripAnsi，CJK/emoji 正确）。 */
export function cellDisplayWidth(cell: string): number {
  return displayWidth(cell);
}

/**
 * 软换行：把单元格折成若干段，每段显示宽度 <= max。
 *
 * ANSI 感知（缺陷 A 修复）：先用 tokenizeAnsiLine 把字符串 tokenize 成
 * [ANSI 序列 | 可见文本] 序列。ANSI token 宽度为 0 且禁止从中间切分，wrap
 * 只按可见字符累计宽度 —— 彻底避免「逐 grapheme 累加宽度时把 ESC 的后续
 * 字节（[、1、m）误计为可见宽度」导致的孤立 ESC 段 / 字面 [1m 泄漏 / bold
 * 丢失。
 *
 * 跨行样式状态（缺陷 B 处理）：切分后某段若处于 SGR open 状态（段内出现
 * 未闭合的样式开启序列），段末补 reset、续行开头补对应重开，避免样式泄漏
 * 到 pad 空格 / 框线竖线。
 *
 * 优先在空格处断行（不回切进单词内部），无空格则按显示宽度硬切。
 * 切分粒度为 grapheme cluster：ZWJ emoji / 组合字符不会被从中间截断。
 */
export function wrapCellToWidth(text: string, max: number): string[] {
  if (max <= 0 || displayWidth(text) <= max) return [text];
  const tokens = tokenizeAnsiLine(text);
  // 可见字符 token 的下标（sgr 宽度 0，不参与宽度累计）。
  const charTokenIdx: number[] = [];
  tokens.forEach((t, i) => {
    if (t.kind === "char") charTokenIdx.push(i);
  });
  const n = charTokenIdx.length;
  if (n === 0) return [text];
  const widths = charTokenIdx.map((i) => tokens[i].width);
  const prefix: number[] = [0];
  for (let i = 0; i < widths.length; i += 1) prefix.push(prefix[i] + widths[i]);
  const segWidth = (a: number, b: number) => prefix[b] - prefix[a]; // [a, b) 可见字符区间

  // 把可见字符区间 [a, b) 映射回 token 切片（含夹在其中的 sgr）。
  //
  // 切点两侧可见字符「之间」的 sgr/osc token（如 span 收尾 \x1b[0m、切点
  // 空格后紧邻的 \x1b[1m）既不属于本段也不属于下一段，若只取
  // [charTokenIdx[a], charTokenIdx[b-1]] 会把它们从所有段丢弃——导致样式
  // 丢失（bold 渗染/丢失）、OSC 8 closer 丢失（超链接无法闭合）。因此切片
  // 边界外扩：段尾延伸到 charTokenIdx[b]-1（b<n 时）、段首回扩到
  // charTokenIdx[a-1]+1（a>0 时），使切点 gap 为空。opening 前缀与段内已
  // 含的 sgr 重复重发幂等，无需去重。
  const sliceTokens = (a: number, b: number): WrapToken[] => {
    const startTok = a === 0 ? 0 : charTokenIdx[a - 1] + 1;
    // b == n 表示「到结尾」：末段必须延伸到 tokens 末尾，把尾随的零宽 token
    // （如 OSC 8 closer \x1b]8;;\x1b\\）一并纳入。旧实现用 charTokenIdx[n-1]
    // 会把 closer 裁掉 → 以链接结尾的 cell 超链接永不闭合，点击域渗入 pad、
    // 框线、其后所有表格行乃至表格之后的所有输出（OSC 8 状态跨行持续）。
    const endTok = b < n ? charTokenIdx[b] - 1 : tokens.length - 1;
    return tokens.slice(startTok, endTok + 1);
  };

  // 应用一段 token 切片后的 SGR/OSC 8 状态（open 序列列表）。
  //
  // OSC 8 纪律（缺陷 F2）：closer（\x1b]8;;\x1b\\）是 opener 的出栈，而非
  // 普通 push——否则 closer 被当作 open 序列压栈，段末误判「仍开启」、prefix
  // 重发错误。SGR reset 只清 SGR 状态、保留 OSC 8 opener（reset 不闭合超链接，
  // 若一并清掉会丢失「链接仍开启」的追踪，导致中间段不补 closer）。
  const applyStyles = (slice: WrapToken[], state: string[]): string[] => {
    const next = [...state];
    for (const t of slice) {
      if (t.kind !== "sgr") continue;
      if (OSC8_CLOSER_REGEX.test(t.value)) {
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (OSC8_OPENER_REGEX.test(next[i])) {
            next.splice(i, 1);
            break;
          }
        }
      } else if (OSC8_OPENER_REGEX.test(t.value)) {
        next.push(t.value);
      } else if (SGR_RESET_REGEX.test(t.value)) {
        for (let i = next.length - 1; i >= 0; i -= 1) {
          if (!OSC8_OPENER_REGEX.test(next[i]) && !OSC8_CLOSER_REGEX.test(next[i])) {
            next.splice(i, 1);
          }
        }
      } else {
        next.push(t.value);
      }
    }
    return next;
  };

  // 渲染一段：续行开头补重开样式；段末若 SGR 仍 open 补 reset、若 OSC 8
  // opener 仍开启补 closer（\x1b]8;;\x1b\\）。SGR reset 不闭合 OSC 8，若只
  // 补 reset，中间行的 pad 与 │ 框线会落在链接点击域内直到 closer 所在段
  // （自愈但渗出）——段末补 closer 使每一段自闭合，点击域不跨行。
  const renderSegment = (slice: WrapToken[], opening: string[]): string => {
    const raw = slice.map((t) => t.value).join("");
    const endState = applyStyles(slice, opening);
    const hasOpenOsc = endState.some((v) => OSC8_OPENER_REGEX.test(v));
    const hasOpenSgr = endState.some(
      (v) => !OSC8_OPENER_REGEX.test(v) && !OSC8_CLOSER_REGEX.test(v),
    );
    const prefix = opening.length > 0 ? opening.join("") : "";
    let suffix = "";
    if (hasOpenOsc) suffix += "\x1b]8;;\x1b\\";
    if (hasOpenSgr && !raw.endsWith("\x1b[0m")) suffix += "\x1b[0m";
    return `${prefix}${raw}${suffix}`;
  };

  const segments: string[] = [];
  let active: string[] = [];
  let start = 0;
  for (let i = 1; i < n; i += 1) {
    if (segWidth(start, i + 1) <= max) continue;
    // 超宽：回退到最近且「段宽达标」的空格（段 = [start, j)，剩余 [j+1, i+1)
    // 也必须 <= max，否则继续向更早的空格回退）。
    let cut = -1;
    for (let j = i - 1; j > start; j -= 1) {
      if (tokens[charTokenIdx[j]].value !== " ") continue;
      if (segWidth(start, j) <= max && segWidth(j + 1, i + 1) <= max) {
        cut = j;
        break;
      }
    }
    if (cut >= 0) {
      const slice = sliceTokens(start, cut);
      segments.push(renderSegment(slice, active));
      active = applyStyles(slice, active);
      start = cut + 1;
    } else {
      // 无合格空格：硬切到显示宽度 <= max 的边界（ANSI 序列随字符保留）。
      let hard = start;
      let w = 0;
      while (hard < i && widths[hard] > 0 && w + widths[hard] <= max) {
        w += widths[hard];
        hard += 1;
      }
      if (hard <= start) hard = start + 1; // 单字符超宽也先切一个
      const slice = sliceTokens(start, hard);
      segments.push(renderSegment(slice, active));
      active = applyStyles(slice, active);
      start = hard;
    }
    // 回退后剩余 [start, i) 可能仍超宽：外层循环继续以同一 i 迭代，自然再切。
  }
  if (start < n) {
    const slice = sliceTokens(start, n);
    segments.push(renderSegment(slice, active));
  }
  return segments.length > 0 ? segments : [text];
}

// SGR reset（\x1b[0m 或 \x1b[m）：用于判断一段是否处于 open 样式状态。
// eslint-disable-next-line no-control-regex
const SGR_RESET_REGEX = /^\x1b\[0?m$/;

// OSC 8 超链接 opener（\x1b]8;;<url>\x1b\\）与 closer（\x1b]8;;\x1b\\）。
// 用于段级 OSC 8 纪律：closer 是 opener 的出栈；段末若 opener 仍开启需补
// closer，避免点击域跨行渗入 pad/框线。opener 的 URL 至少 1 字符（+），
// 否则空串会误匹配 closer（\x1b]8;;\x1b\\）。
// eslint-disable-next-line no-control-regex
const OSC8_OPENER_REGEX = /^\x1b\]8;;[^\x07\x1b]+(?:\x07|\x1b\\)$/;
// eslint-disable-next-line no-control-regex
const OSC8_CLOSER_REGEX = /^\x1b\]8;;\x1b\\$/;

export function padCell(text: string, width: number, align: TableCellAlign): string {
  const pad = width - displayWidth(text);
  if (pad <= 0) return text;
  switch (align) {
    case "right":
      return " ".repeat(pad) + text;
    case "center": {
      const left = Math.floor(pad / 2);
      return " ".repeat(left) + text + " ".repeat(pad - left);
    }
    case "left":
    default:
      return text + " ".repeat(pad);
  }
}

/**
 * 列宽计算：natural 宽度（每列内容最大显示宽度）；超宽时循环压缩当前
 * 最宽列（步长随剩余溢出量增大），直到总宽达标或所有列到下限。
 */
export function computeColumnWidths(
  headers: string[],
  rows: string[][],
  available: number,
): number[] {
  const colCount = headers.length;
  const natural: number[] = headers.map((h, i) => {
    let max = displayWidth(h ?? "");
    for (const row of rows) {
      const w = displayWidth(row[i] ?? "");
      if (w > max) max = w;
    }
    return max;
  });
  const border = 2 * colCount + 1; // 每列两侧各一个 │
  const total = () => border + natural.reduce((a, b) => a + b, 0);
  if (total() <= available) return natural;
  const minPerCol = Math.max(2, Math.floor((available - border) / colCount));
  let guard = colCount * 64;
  while (total() > available && guard-- > 0) {
    let widest = 0;
    for (let i = 1; i < colCount; i += 1) {
      if (natural[i] > natural[widest]) widest = i;
    }
    if (natural[widest] <= minPerCol) break;
    const overflow = total() - available;
    const delta = Math.min(
      natural[widest] - minPerCol,
      Math.max(1, Math.ceil(overflow / 2)),
    );
    natural[widest] -= delta;
  }
  return natural;
}

// ─── 渲染 ───────────────────────────────────────────────────────────────────

interface TableStyle {
  header: (t: string) => string;
  label: (t: string) => string;
}

/** 表头 bold + 主题色（themeColorSequence 跟随 /theme 切换，不硬编码）。 */
function makeStyle(
  brightness: TuiBrightness,
  headerToken: TuiThemeToken,
): TableStyle {
  const color = themeColorSequence(headerToken, process.env, brightness);
  const boldOn = "\x1b[1m";
  const reset = "\x1b[0m";
  const paint = (t: string) => `${color}${boldOn}${t}${reset}`;
  return { header: paint, label: paint };
}

/** 框线行：┌─┬─┐ / ├─┼─┤ / └─┴─┘。 */
function boxLine(left: string, mid: string, right: string, widths: number[]): string {
  const seg = widths.map((w) => "─".repeat(w + 2));
  return `${left}${seg.join(mid)}${right}`;
}

/** 数据行：单元格先 pad（displayWidth 感知 ANSI 的真实宽度）再套样式。 */
function dataRow(
  cells: string[],
  aligns: TableCellAlign[],
  widths: number[],
  style: TableStyle,
  header: boolean,
): string {
  const parts = cells.map((cell, i) => {
    const width = widths[i] ?? 0;
    const align = aligns[i] ?? "left";
    // 单元格可能带 ANSI（行内高亮已处理过）：padCell 走 displayWidth，
    // 其内部先 stripAnsi 再量宽，ANSI 原样保留在填充结果内。
    // 反引号已在 renderMarkdownTable 内先于 pad 被消费（styleInlineMarkdown
    // 把 code span 定界反引号转成 muted 高亮），故此处不再有 ZWSP 占位。
    const padded = padCell(cell, width, align);
    const styled = header ? style.header(padded) : padded;
    return ` ${styled} │`;
  });
  return `│${parts.join("")}`;
}

/**
 * 完整框线表。超宽列在 computeColumnWidths 压缩后，单元格 wrapCellToWidth
 * 软换行成多行，框线保持完整（续行共享同一对侧框线，行间不加框线）。
 */
export function renderBoxTable(
  table: ParsedTable,
  width: number,
  style: TableStyle,
): string {
  const colCount = table.headers.length;
  const widths = computeColumnWidths(table.headers, table.rows, width);

  // 单元格已由 renderMarkdownTable 先经 styleInlineMarkdown 样式化（code
  // span 的定界反引号已被消费成 muted 高亮），wrapCellToWidth 按 ANSI 感知
  // 的 token 切分，宽度恒等、样式不泄漏。
  const headerGrid = table.headers.map((h, i) =>
    wrapCellToWidth(h, widths[i] ?? 0),
  );
  const bodyGrids = table.rows.map((row) =>
    row.map((cell, i) => wrapCellToWidth(cell, widths[i] ?? 0)),
  );
  const headerDisplayRows = Math.max(1, ...headerGrid.map((g) => g.length));
  // 每条 body 记录软换行后的显示行数（列间取最大，补空段对齐）。
  const bodyDisplayRows = bodyGrids.map((r) =>
    Math.max(1, ...r.map((g) => g.length)),
  );

  const lines: string[] = [];
  lines.push(boxLine("┌", "┬", "┐", widths));
  for (let r = 0; r < headerDisplayRows; r += 1) {
    lines.push(
      dataRow(
        Array.from({ length: colCount }, (_, c) => headerGrid[c]?.[r] ?? ""),
        table.aligns,
        widths,
        style,
        true,
      ),
    );
  }
  lines.push(boxLine("├", "┼", "┤", widths));
  bodyGrids.forEach((_, rec) => {
    for (let r = 0; r < bodyDisplayRows[rec]; r += 1) {
      lines.push(
        dataRow(
          Array.from(
            { length: colCount },
            (_, c) => bodyGrids[rec][c]?.[r] ?? "",
          ),
          table.aligns,
          widths,
          style,
          false,
        ),
      );
    }
  });
  lines.push(boxLine("└", "┴", "┘", widths));
  return lines.join("\n");
}

/** 记录卡片式降级：每行一条记录，内部「字段: 值」分行。 */
export function renderRecordCards(
  table: ParsedTable,
  width: number,
  style: TableStyle,
): string {
  const lines: string[] = [];
  table.rows.forEach((row, idx) => {
    if (idx > 0) lines.push("");
    const first = row[0] ?? "";
    // 记录名超宽时软换行（避免极窄终端破行）。
    for (const seg of wrapCellToWidth(first, Math.max(4, width))) {
      lines.push(style.label(seg));
    }
    for (let i = 1; i < table.headers.length; i += 1) {
      const label = table.headers[i] ?? `col${i}`;
      const value = row[i] ?? "";
      const labelLine = `${style.label(label)}: `;
      // 值按「label 前缀 + 值」折行：首段从 label 行起，续行缩进对齐值列。
      const indent = " ".repeat(displayWidth(label) + 2);
      const valueSegs = wrapCellToWidth(
        value,
        Math.max(4, width - displayWidth(label) - 2),
      );
      if (valueSegs.length === 0 || valueSegs[0] === "") {
        lines.push(labelLine);
      } else {
        lines.push(labelLine + valueSegs[0]);
        for (let k = 1; k < valueSegs.length; k += 1) {
          lines.push(indent + valueSegs[k]);
        }
      }
    }
  });
  return lines.join("\n");
}

/**
 * 三档自适应渲染入口：
 *   - 可用宽 < 40 或列数 > 6 → 记录卡片；
 *   - 其余 → 完整框线表（超宽自动压缩列宽 + 软换行，框线不破）。
 */
export function renderMarkdownTable(
  table: ParsedTable,
  options: TableRenderOptions = {},
): string {
  const brightness = options.brightness ?? resolveTuiBrightness();
  const width = resolveTableWidth(options.width);
  const style = makeStyle(brightness, options.headerToken ?? "chrome");
  // 缺陷 A：先把单元格内的 inline markdown 转成 ANSI 样式（bold/italic/
  // strike/link/code）。软换行按 ANSI 感知的 token 切分（wrapCellToWidth），
  // 定界符已随样式消费，不再出现「** 被软换行切开 → 下游按行配对失败 →
  // 字面残留」。ANSI 宽度为 0，displayWidth 先 stripAnsi，pad 恒等式不受
  // 影响；下游 styleRichMarkdownLine 对已无字面标记的行幂等，不会重复叠加。
  //
  // 【已知限制 · 跨 cell 孤立反引号】cell 级 styleInlineMarkdown 只消费
  // 同一 cell 内成对的反引号；若一个反引号跨 cell 孤立（如 `a` 的定界符
  // 被 `|` 分隔到相邻 cell），该孤立反引号会原样进入下游行级 styleRich
  // MarkdownLine 的按行配对逻辑被吞字。此边角在修复前即存在、非本次引入，
  // 修复成本高（需跨 cell 状态机），故记录为已知限制：表格单元格内请保持
  // code span 自闭合。
  const styledTable: ParsedTable = {
    headers: table.headers.map((h) => styleInlineMarkdown(h, brightness)),
    aligns: table.aligns,
    rows: table.rows.map((r) => r.map((c) => styleInlineMarkdown(c, brightness))),
  };
  if (width < 40 || table.headers.length > 6) {
    return renderRecordCards(styledTable, width, style);
  }
  return renderBoxTable(styledTable, width, style);
}

