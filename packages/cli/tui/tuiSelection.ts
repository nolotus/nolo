/**
 * TUI 鼠标文本选择与 Hit-test 映射。
 *
 * 采用标准终端 (xterm.js / tmux / Ghostty) 2D 网格选区模型：
 * 维护全局行/列选区状态 (SelectionPoint { globalRow, col })，在可视行上
 * 叠加字符级反色高亮，并从历史渲染行中按列范围提取纯文本到剪贴板。
 */
import {
  tokenizeAnsiLine,
} from "./tuiAnsi";
import {
  buildLayoutRowWindow,
  buildTurnOffsets,
  type TurnHistory,
} from "./tuiHistory";

export type SelectionPoint = {
  globalRow: number;
  col: number;
};

export type TuiSelectionState = {
  dragging: boolean;
  anchor: SelectionPoint | null;
  head: SelectionPoint | null;
};

export function createSelectionState(): TuiSelectionState {
  return {
    dragging: false,
    anchor: null,
    head: null,
  };
}

export function compareSelectionPoints(
  a: SelectionPoint,
  b: SelectionPoint,
): number {
  if (a.globalRow !== b.globalRow) {
    return a.globalRow - b.globalRow;
  }
  return a.col - b.col;
}

export function areSelectionPointsEqual(
  a: SelectionPoint | null,
  b: SelectionPoint | null,
): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return a.globalRow === b.globalRow && a.col === b.col;
}

/**
 * 将一行 ANSI 渲染文本中落在 [selStartCol, selEndCol] 列区间的字符叠加高亮 (\x1b[7m ... \x1b[27m)。
 * 行尾 padding 空格不进入高亮，遇到内部 reset (\x1b[0m) 时自动重新开启高亮，避免高亮中断或泄漏。
 */
export function highlightLineByColumns(
  line: string,
  selStartCol: number,
  selEndCol: number,
  prefixWidth = 0,
): string {
  const tokens = tokenizeAnsiLine(line);
  const range = resolveSelectableColumnRange(
    tokens,
    selStartCol,
    selEndCol,
    prefixWidth,
  );
  if (!range) return line;

  let out = "";
  let currentCol = 0;
  let isHighlightActive = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;
    if (token.kind === "sgr") {
      if (isHighlightActive) {
        if (/^\x1b\[0?m$/.test(token.value)) {
          out += `${token.value}\x1b[7m`;
        } else {
          out += token.value;
        }
      } else {
        out += token.value;
      }
      continue;
    }

    const charStartCol = currentCol;
    const charEndCol = currentCol + token.width;
    const isSelected = charStartCol >= range.start && charStartCol < range.end;

    if (isSelected && !isHighlightActive) {
      out += "\x1b[7m";
      isHighlightActive = true;
    } else if (!isSelected && isHighlightActive) {
      out += "\x1b[27m";
      isHighlightActive = false;
    }

    out += token.value;
    currentCol = charEndCol;
  }

  if (isHighlightActive) {
    out += "\x1b[27m";
  }

  return out;
}

function resolveSelectableColumnRange(
  tokens: ReturnType<typeof tokenizeAnsiLine>,
  requestedStart: number,
  requestedEnd: number,
  prefixWidth: number,
): { start: number; end: number } | null {
  if (requestedStart >= requestedEnd) return null;

  let col = 0;
  let lastNonSpaceCol = 0;
  for (const token of tokens) {
    if (token.kind !== "char") continue;
    if (token.value.trim().length > 0) {
      lastNonSpaceCol = col + token.width;
    }
    col += token.width;
  }

  const start = Math.max(prefixWidth, requestedStart);
  const end = Math.min(requestedEnd, lastNonSpaceCol);
  if (start >= end) return null;

  let snappedStart: number | null = null;
  let snappedEnd: number | null = null;
  col = 0;
  for (const token of tokens) {
    if (token.kind !== "char") continue;
    const tokenStart = col;
    const tokenEnd = col + token.width;
    if (tokenEnd > start && tokenStart < end) {
      snappedStart ??= tokenStart;
      snappedEnd = tokenEnd;
    }
    col = tokenEnd;
  }

  return snappedStart === null || snappedEnd === null
    ? null
    : { start: snappedStart, end: snappedEnd };
}

/**
 * 将屏幕行/列坐标转换为全局绝对坐标 SelectionPoint (globalRow + col)。
 * 若传入 visibleHeight，当 screenRow 超出 [0, visibleHeight - 1] 视口范围时（如落在 modal 预留区或 composer 输入区）返回 null。
 */
export function hitTestHistory(
  history: TurnHistory,
  screenRow: number,
  screenCol: number,
  _contentWidth: number,
  scrollTop: number,
  visibleHeight?: number,
): SelectionPoint | null {
  if (visibleHeight !== undefined && (screenRow < 0 || screenRow >= visibleHeight)) {
    return null;
  }
  const globalRow = Math.max(0, scrollTop + screenRow);
  const col = Math.max(0, screenCol);
  return { globalRow, col };
}

/**
 * 从一行纯文本中提取落在 [startCol, endCol] 列范围内的字符，自动去除 UI 前缀。
 */
export function extractTextSliceByColumns(
  line: string,
  startCol: number,
  endCol: number,
  prefixWidth = 0,
): string {
  const tokens = tokenizeAnsiLine(line);
  const range = resolveSelectableColumnRange(
    tokens,
    startCol,
    endCol,
    prefixWidth,
  );
  if (!range) return "";

  let col = 0;
  let text = "";
  for (const token of tokens) {
    if (token.kind !== "char") continue;
    if (col >= range.start && col < range.end) {
      text += token.value;
    }
    col += token.width;
  }
  return text;
}

type CodeBlockCharset = "unicode" | "ascii";

function extractPlainAfterPrefix(rendered: string, prefixWidth: number): string {
  const tokens = tokenizeAnsiLine(rendered);
  let col = 0;
  let out = "";
  for (const token of tokens) {
    if (token.kind !== "char") continue;
    if (col >= prefixWidth) {
      out += token.value;
    }
    col += token.width;
  }
  return out;
}

function matchCodeBlockTopBorder(
  plainAfterPrefix: string,
  softWrapped: boolean,
): CodeBlockCharset | null {
  if (softWrapped) {
    if (/^┌─{6,}$/.test(plainAfterPrefix) || /^┌─ [a-z0-9+#_-]+ ─*$/.test(plainAfterPrefix)) {
      return "unicode";
    }
    if (/^\+-{6,}$/.test(plainAfterPrefix) || /^\+- [a-z0-9+#_-]+ -*$/.test(plainAfterPrefix)) {
      return "ascii";
    }
    return null;
  }
  if (/^┌─{24}$/.test(plainAfterPrefix) || /^┌─ [a-z0-9+#_-]+ ─{4,}$/.test(plainAfterPrefix)) {
    return "unicode";
  }
  if (/^\+-{24}$/.test(plainAfterPrefix) || /^\+- [a-z0-9+#_-]+ -{4,}$/.test(plainAfterPrefix)) {
    return "ascii";
  }
  return null;
}

function isCodeBlockBottomBorder(
  plainAfterPrefix: string,
  charset: CodeBlockCharset,
  softWrapped: boolean,
): boolean {
  if (charset === "unicode") {
    return softWrapped ? /^└─{6,}$/.test(plainAfterPrefix) : /^└─{24}$/.test(plainAfterPrefix);
  }
  return softWrapped ? /^\+-{6,}$/.test(plainAfterPrefix) : /^\+-{24}$/.test(plainAfterPrefix);
}

function codeBlockGutterWidth(
  plainAfterPrefix: string,
  charset: CodeBlockCharset,
): number {
  const bar = charset === "ascii" ? "|" : "│";
  if (plainAfterPrefix.startsWith(`${bar} `)) return 2;
  if (plainAfterPrefix === bar) return 1;
  return 0;
}

/**
 * 提取选区范围内的纯文本。
 */
export function extractSelectedText(
  history: TurnHistory,
  anchor: SelectionPoint | null,
  head: SelectionPoint | null,
  contentWidth: number,
): string {
  if (!anchor || !head) return "";
  const cmp = compareSelectionPoints(anchor, head);
  if (cmp === 0) return "";

  const start = cmp < 0 ? anchor : head;
  const end = cmp < 0 ? head : anchor;

  // 只从包含 start.globalRow 的那一个 turn 首行开始扫描代码块状态，既能识别
  // 跨在代码块内部的选区，又不展开离屏的早先 turn。
  const { entries, totalLines } = buildTurnOffsets(history, contentWidth);
  let scanStartRow = start.globalRow;
  if (start.globalRow < totalLines) {
    const hitEntry = entries.find(
      (entry) => entry.startRow + entry.lineCount > start.globalRow,
    );
    if (hitEntry) {
      scanStartRow = Math.min(start.globalRow, hitEntry.startRow);
    }
  } else {
    scanStartRow = totalLines;
  }

  // 只物化选区（及其所属起止 turn 前缀）覆盖到的行：离屏 turn 一行都不渲染
  // （相交的单条超长消息仍整条物化，后续调用靠 turn 缓存复用）。
  const window = buildLayoutRowWindow(
    history,
    contentWidth,
    scanStartRow,
    end.globalRow + 1,
  );
  const collected: Array<{
    text: string;
    softWrapped: boolean;
    softWrapJoiner: string;
  }> = [];

  let entryCursor = 0;
  let inCodeBlock = false;
  let codeCharset: CodeBlockCharset | null = null;
  let prevSoftWrapped = false;
  let skippedWrapContinuation = false;

  for (let r = scanStartRow; r <= end.globalRow; r++) {
    while (
      entryCursor < entries.length &&
      entries[entryCursor]!.startRow + entries[entryCursor]!.lineCount <= r
    ) {
      entryCursor += 1;
    }

    let isAssistantRow = false;
    let isTurnBoundary = false;
    if (entryCursor < entries.length && r >= entries[entryCursor]!.startRow) {
      isAssistantRow = history.turns[entryCursor]?.role === "assistant";
      isTurnBoundary = r === entries[entryCursor]!.startRow;
    } else if (r >= totalLines) {
      isAssistantRow = history.currentRole === "assistant";
      isTurnBoundary = r === totalLines;
    } else {
      isTurnBoundary = true;
    }

    if (isTurnBoundary || !isAssistantRow) {
      inCodeBlock = false;
      codeCharset = null;
      skippedWrapContinuation = false;
    }

    const row = window.rows[r - window.baseRow];
    if (!row) {
      prevSoftWrapped = false;
      continue;
    }

    const isContinuation = prevSoftWrapped;
    prevSoftWrapped = row.softWrapped === true;

    let lineStartCol = 0;
    let lineEndCol = Infinity;

    if (r === start.globalRow) {
      lineStartCol = start.col;
    }
    if (r === end.globalRow) {
      lineEndCol = end.col;
    }

    if (isAssistantRow) {
      if (isContinuation && skippedWrapContinuation) {
        skippedWrapContinuation = row.softWrapped === true;
        continue;
      }
      skippedWrapContinuation = false;

      const plainAfterPrefix = extractPlainAfterPrefix(
        row.rendered,
        row.prefixWidth,
      );
      if (!isContinuation && !inCodeBlock) {
        const topCharset = matchCodeBlockTopBorder(
          plainAfterPrefix,
          row.softWrapped === true,
        );
        if (topCharset) {
          inCodeBlock = true;
          codeCharset = topCharset;
          skippedWrapContinuation = row.softWrapped === true;
          continue;
        }
      }

      if (inCodeBlock && codeCharset) {
        if (
          !isContinuation &&
          isCodeBlockBottomBorder(
            plainAfterPrefix,
            codeCharset,
            row.softWrapped === true,
          )
        ) {
          inCodeBlock = false;
          codeCharset = null;
          skippedWrapContinuation = row.softWrapped === true;
          continue;
        }

        if (r >= start.globalRow) {
          const gutterWidth = isContinuation
            ? 0
            : codeBlockGutterWidth(plainAfterPrefix, codeCharset);
          const text = extractTextSliceByColumns(
            row.rendered,
            lineStartCol,
            lineEndCol,
            row.prefixWidth + gutterWidth,
          );
          const trailingWrapSpaces =
            row.softWrapped &&
            r < end.globalRow &&
            (row.softWrapJoiner ?? "") === "" &&
            lineEndCol === Infinity &&
            text.length > 0
              ? (plainAfterPrefix.slice(gutterWidth).match(/ +$/)?.[0] ?? "")
              : "";
          collected.push({
            text,
            softWrapped: row.softWrapped === true,
            softWrapJoiner: (row.softWrapJoiner ?? "") || trailingWrapSpaces,
          });
        }
        continue;
      }
    }

    if (r >= start.globalRow) {
      collected.push({
        text: extractTextSliceByColumns(
          row.rendered,
          lineStartCol,
          lineEndCol,
          row.prefixWidth,
        ),
        softWrapped: row.softWrapped === true,
        softWrapJoiner: row.softWrapJoiner ?? "",
      });
    }
  }

  let out = "";
  for (let i = 0; i < collected.length; i++) {
    const item = collected[i]!;
    out += item.text;
    if (i < collected.length - 1) {
      out += item.softWrapped ? item.softWrapJoiner : "\n";
    }
  }
  return out;
}

/**
 * 将字符级反色高亮 (Reverse Video \x1b[7m ... \x1b[27m) 叠加到可见行。
 */
export function applySelectionOverlay(
  visibleLines: string[],
  history: TurnHistory,
  contentWidth: number,
  scrollTop: number,
  selection: TuiSelectionState,
): string[] {
  if (!selection.anchor || !selection.head) {
    return visibleLines;
  }
  const cmp = compareSelectionPoints(selection.anchor, selection.head);
  if (cmp === 0) return visibleLines;

  const start = cmp < 0 ? selection.anchor : selection.head;
  const end = cmp < 0 ? selection.head : selection.anchor;

  // 视口内的选区切片：只有这些屏幕行需要 layout 元数据（每行前缀宽度）。
  // 窗口内的 turn 由 buildLayoutRowWindow 按 turn 缓存复用，离屏 turn 不展开。
  const firstScreenRow = Math.max(0, start.globalRow - scrollTop);
  const lastScreenRow = Math.min(
    visibleLines.length - 1,
    end.globalRow - scrollTop,
  );
  const window =
    lastScreenRow < firstScreenRow
      ? null
      : buildLayoutRowWindow(
          history,
          contentWidth,
          scrollTop + firstScreenRow,
          scrollTop + lastScreenRow + 1,
        );

  const result = [...visibleLines];

  for (let screenRow = firstScreenRow; screenRow <= lastScreenRow; screenRow++) {
    const globalRow = scrollTop + screenRow;

    const currentLine = result[screenRow] ?? "";
    if (currentLine.length === 0) continue;
    const layoutRow = window?.rows[globalRow - window.baseRow];

    let selStartCol = 0;
    let selEndCol = Infinity;

    if (globalRow === start.globalRow) {
      selStartCol = start.col;
    }
    if (globalRow === end.globalRow) {
      selEndCol = end.col;
    }

    result[screenRow] = highlightLineByColumns(
      currentLine,
      selStartCol,
      selEndCol,
      layoutRow?.prefixWidth ?? 0,
    );
  }

  return result;
}
