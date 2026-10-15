/**
 * 可见渲染行上的 http(s) URL 命中检测（Ctrl+左键打开用）。
 *
 * 坐标语义与 selection 完全一致：列是「当前可见渲染行」的 cell 列（含行前缀），
 * 全局行号 = scrollTop + screenRow，布局行来自 buildHistoryLayoutRows。
 *
 * 软换行 / 中文 / ANSI 的处理方式：
 * - 先把点击所在的**逻辑源行**的全部物理行拼回一行再找 URL
 *   （`softWrapped === true` 表示下一物理行是同一逻辑源行的续行，
 *    换行处被渲染吃掉的空白从 `softWrapJoiner` 还原），
 *   所以绝不会只打开半截换行 URL；
 * - 列宽按 tokenizeAnsiLine 的宽字符宽度累计，中文/emoji 占 2 列也不会错位；
 * - ANSI SGR/OSC 序列是零宽 token，不参与列累计也不进入 URL 文本。
 *
 * 只在「能可靠完整还原」时才返回命中：行链缺失（软换行续行不在布局里）、
 * 点击列没有对应可见字符、URL 非法或超长，一律返回 null（= 不打开）。
 */
import { tokenizeAnsiLine } from "./tuiAnsi";
import {
  buildHistoryLayoutRows,
  type TurnHistory,
  type TurnLayoutRow,
} from "./tuiHistory";
import { MAX_URL_LENGTH, normalizeHttpUrl, openExternalUrl } from "./tuiUrlOpener";

export type UrlHit = {
  /** 完整 URL（软换行已还原，绝不返回半截） */
  url: string;
  /** 命中的物理行（全局行号，与 SelectionPoint.globalRow 同坐标系） */
  globalRow: number;
  /** 命中行内 URL 覆盖的列区间 [colStart, colEnd)，cell 列、包含行前缀宽度 */
  colStart: number;
  colEnd: number;
  /** URL 所属逻辑行占用的物理行区间 [rowStart, rowEnd]（含端点） */
  rowStart: number;
  rowEnd: number;
};

type GroupChar = {
  value: string;
  width: number;
  globalRow: number;
  /** 可见字符的行内起始列；不可见（软换行空白）为 -1 */
  col: number;
  /** false = 被软换行吃掉的空白，不属于任何可见行 */
  visible: boolean;
};

type LogicalLineGroup = {
  text: string;
  chars: GroupChar[];
  rowStart: number;
  rowEnd: number;
};

const URL_PATTERN = /https?:\/\/[^\s<>"'`\\\u0000-\u001f\u007f]+/gi;
/**
 * 句末标点：ASCII 标点/引号与中文全角句末标点（。，、！？：；）无条件剥离。
 * 中文语境里 Agent 常输出「…/api。」，不剥离就会被当成路径的一部分
 * （百分号转义成 %E3%80%82）并打开 404。
 * 只剥**结尾**的标点：正文里的全角字符（…/中文字）不受影响。
 */
const URL_TRAILING_PUNCTUATION = /[.,;:!?'"”“’。，、！？：；]+$/;
/** 成对定界符：只有闭括号多于开括号时才认为是句末标点（含中文全角括号）。 */
const URL_CLOSERS: ReadonlyArray<readonly [string, string]> = [
  ["(", ")"],
  ["[", "]"],
  ["{", "}"],
  ["<", ">"],
  ["（", "）"],
  ["【", "】"],
  ["《", "》"],
];

function countOccurrences(text: string, char: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === char) count += 1;
  }
  return count;
}

/**
 * 去掉不属于 URL 的尾部标点：
 * - 句末 `.` `,` `;` `:` `!` `?` 与引号（含中文全角 。，、！？：；）无条件去掉；
 * - 闭括号只在多于配对的开括号时去掉（`.../Foo_(bar)` 这种合法 URL 保持完整，
 *   中文全角括号（）、【】、《》同规则）。
 */
export function trimTrailingUrlJunk(raw: string): string {
  let url = raw;
  for (;;) {
    const stripped = url.replace(URL_TRAILING_PUNCTUATION, "");
    if (stripped !== url) {
      url = stripped;
      continue;
    }
    let next = url;
    for (const [opener, closer] of URL_CLOSERS) {
      if (
        next.endsWith(closer) &&
        countOccurrences(next, closer) > countOccurrences(next, opener)
      ) {
        next = next.slice(0, -1);
        break;
      }
    }
    if (next === url) return url;
    url = next;
  }
}

/**
 * 把点击所在的逻辑源行拼回一行（含不可见字符的坐标记录）。
 * 行链不完整（软换行续行缺失）时返回 null：宁可拒绝，也不还原半截 URL。
 */
function buildLogicalLineGroup(
  rows: readonly TurnLayoutRow[],
  globalRow: number,
): LogicalLineGroup | null {
  if (globalRow < 0 || globalRow >= rows.length) return null;

  let rowStart = globalRow;
  while (rowStart > 0 && rows[rowStart - 1]?.softWrapped === true) {
    rowStart -= 1;
  }
  let rowEnd = globalRow;
  while (rows[rowEnd]?.softWrapped === true) {
    if (rowEnd + 1 >= rows.length) return null;
    rowEnd += 1;
  }

  const chars: GroupChar[] = [];
  let text = "";
  for (let r = rowStart; r <= rowEnd; r += 1) {
    const row = rows[r]!;
    let col = 0;
    for (const token of tokenizeAnsiLine(row.rendered)) {
      if (token.kind !== "char") continue;
      const charStartCol = col;
      col += token.width;
      // 与 selection 同一口径：行首 [0, prefixWidth) 是布局自带的 UI 前缀
      // （「┃  」/「◈ 」/悬挂缩进「  」），不属于源文本，必须排除——
      // 否则续行的悬挂缩进会被拼进 URL，把长 URL 截断成半截。
      if (charStartCol < row.prefixWidth) continue;
      chars.push({
        value: token.value,
        width: token.width,
        globalRow: r,
        col: charStartCol,
        visible: true,
      });
      text += token.value;
    }
    if (r < rowEnd) {
      for (const joinerChar of row.softWrapJoiner ?? "") {
        chars.push({
          value: joinerChar,
          width: 1,
          globalRow: r,
          col: -1,
          visible: false,
        });
        text += joinerChar;
      }
    }
  }

  return { text, chars, rowStart, rowEnd };
}

/**
 * 命中判定：屏幕行（全局行号）+ 行内 cell 列落在某个完整可见 http(s) URL 内时返回该 URL。
 * 任何不确定的情况（无字符、行链缺口、非法协议、超长）都返回 null。
 */
export function findUrlAtRowColumn(
  rows: readonly TurnLayoutRow[],
  globalRow: number,
  screenCol: number,
): UrlHit | null {
  if (screenCol < 0 || !Number.isFinite(screenCol)) return null;

  const group = buildLogicalLineGroup(rows, globalRow);
  if (!group) return null;

  // 点击列 → 该行可见字符索引（宽字符占 2 列，落在其中任一列都算命中）。
  let clickIndex = -1;
  for (let i = 0; i < group.chars.length; i += 1) {
    const char = group.chars[i]!;
    if (!char.visible || char.globalRow !== globalRow) continue;
    if (screenCol >= char.col && screenCol < char.col + char.width) {
      clickIndex = i;
      break;
    }
  }
  if (clickIndex < 0) return null;

  URL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  // eslint-disable-next-line no-cond-assign
  while ((match = URL_PATTERN.exec(group.text)) !== null) {
    if (match[0].length === 0) {
      URL_PATTERN.lastIndex += 1;
      continue;
    }
    const start = match.index;
    const candidate = trimTrailingUrlJunk(match[0]);
    if (candidate.length === 0 || candidate.length > MAX_URL_LENGTH) continue;
    const end = start + candidate.length;
    if (clickIndex < start || clickIndex >= end) continue;

    const url = normalizeHttpUrl(candidate);
    if (url === null) continue;

    let colStart = -1;
    let colEnd = -1;
    for (let i = start; i < end; i += 1) {
      const char = group.chars[i]!;
      if (!char.visible || char.globalRow !== globalRow) continue;
      colStart = colStart < 0 ? char.col : Math.min(colStart, char.col);
      colEnd = Math.max(colEnd, char.col + char.width);
    }
    if (colStart < 0) continue;

    return {
      url,
      globalRow,
      colStart,
      colEnd,
      rowStart: group.rowStart,
      rowEnd: group.rowEnd,
    };
  }

  return null;
}

/**
 * Ctrl+左键入口的粘合层：用 selection 同一套布局行判定命中，命中就用系统默认浏览器打开。
 * 返回是否命中（命中即消费这次点击）；未命中返回 false，普通选区逻辑照旧。
 * 坐标语义：screenRow/screenCol 是屏幕 cell 坐标，全局行号 = scrollTop + screenRow。
 *
 * `visibleHeight` 是当前视口能渲染的历史行数（与 selection 的 hitTestHistory 同一口径）。
 * 屏幕底部留给 Composer / reservedRows（确认弹窗、选择列表）的行不属于历史正文，
 * 因此 `screenRow >= visibleHeight` 一律拒绝：越界判定必须相对**视口**，
 * 而不是相对 scrollTop 偏移，否则会命中当前屏幕根本看不见的历史行 URL。
 */
export function openVisibleUrlAtScreen(
  history: TurnHistory,
  contentWidth: number,
  scrollTop: number,
  screenRow: number,
  screenCol: number,
  visibleHeight: number,
  openUrl: (url: string) => boolean = (url) => openExternalUrl(url),
): boolean {
  if (screenRow < 0 || screenCol < 0) return false;
  // fail-closed：视口高度非法（NaN/0/负数）时没有任何屏幕行可命中。
  if (!Number.isFinite(visibleHeight) || visibleHeight <= 0) return false;
  if (screenRow >= visibleHeight) return false;
  const rows = buildHistoryLayoutRows(history, contentWidth);
  const hit = findUrlAtRowColumn(rows, scrollTop + screenRow, screenCol);
  if (!hit) return false;
  openUrl(hit.url);
  return true;
}
