/**
 * TUI 对话历史：turn 数据结构、样式化渲染、滚动条贴边、滚动动作应用。
 *
 * 从 readlineWorkspace.ts 抽出。依赖：
 * - ./tuiAnsi：wrapTranscriptLine / wrapTranscriptLineWithLayout / padOrTruncateToWidth / applyTerminalOutputToText
 * - ./tuiScrollbar：renderScrollbarRow / parseScrollAction / ScrollAction / WHEEL_SCROLL_LINES
 * - ./theme：themeColorSequence / themeText / getActiveDensity / resolveCliColorEnabled
 * - ../client/assistantOutput：formatAssistantDisplay（assistant turn 的唯一渲染器，
 *   与流式输出共享同一份实现，避免历史重绘与流式样式漂移）
 */
import {
  applyTerminalOutputToText,
  buildSourceMapping,
  padOrTruncateToWidth,
  stripAnsi,
  truncateAnsi,
  visibleWidth,
  wrapTranscriptLine,
  wrapTranscriptLineWithLayout,
  type WrappedTranscriptRow,
} from "./tuiAnsi";
import {
  renderScrollbarRow,
  type ScrollAction,
  WHEEL_SCROLL_LINES,
} from "./tuiScrollbar";
import {
  getActiveDensity,
  renderSurfaceLine,
  themeColorSequence,
  themeText,
  tuiRenderThemeFingerprint,
  userSurfaceBackgroundSequence,
} from "./theme";
import { formatAssistantDisplay } from "../client/assistantOutput";
import { resolveCliColorEnabled } from "../client/terminalStyles";
import {
  applySelectionOverlay,
  type TuiSelectionState,
} from "./tuiSelection";

export type TurnRole = "user" | "assistant" | "local";

export type TurnBlock = {
  kind: "assistant" | "tool";
  content: string;
};

export type Turn = {
  role: TurnRole;
  content: string;
  /** TUI-only transcript structure; content remains the compatible projection. */
  blocks?: TurnBlock[];
  /**
   * 本地命令/事件回显专用（role === "local"）：触发它的命令原文，例如
   * "/switch 2"。为空字符串表示无对应命令的系统反馈（如 "Turn stopped"），
   * 渲染时省略 `› ` 前缀，只显示内容行。
   */
  command?: string;
};

export type TurnLayoutRow = {
  rendered: string;
  sourceStart: number;
  sourceEnd: number;
  prefixWidth: number;
  sourceMapping?: number[];
  softWrapped?: boolean;
  softWrapJoiner?: string;
};

export type TurnHistory = {
  turns: Turn[];
  currentRole: TurnRole | null;
  currentContent: string;
  currentBlocks: TurnBlock[];
  scrollTop: number;
  followBottom: boolean;
  hasMoreAbove?: boolean;
  hasMoreBelow?: boolean;
};

export const MAX_TUI_HISTORY_TURNS = 500;
export const MAX_TUI_HISTORY_BYTES = 4 * 1024 * 1024;
const MAX_COMPACT_HEAD_LINES = 200;
const MAX_COMPACT_TAIL_LINES = 100;
const COMPACT_MARKER = "⋯";

const utf8Bytes = (value: string) => new TextEncoder().encode(value).byteLength;

function compactTurnContent(content: string): string {
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  if (lines.length <= MAX_COMPACT_HEAD_LINES + MAX_COMPACT_TAIL_LINES) return content;
  const omitted = lines.length - MAX_COMPACT_HEAD_LINES - MAX_COMPACT_TAIL_LINES;
  return [
    ...lines.slice(0, MAX_COMPACT_HEAD_LINES),
    `${COMPACT_MARKER} ${omitted} lines elided`,
    ...lines.slice(-MAX_COMPACT_TAIL_LINES),
  ].join("\n");
}

function trimHistoryToBudget(history: TurnHistory): void {
  while (history.turns.length > MAX_TUI_HISTORY_TURNS) history.turns.shift();
  let bytes = history.turns.reduce((sum, turn) => sum + utf8Bytes(turn.content), 0);
  while (history.turns.length > 1 && bytes > MAX_TUI_HISTORY_BYTES) {
    const removed = history.turns.shift()!;
    bytes -= utf8Bytes(removed.content);
  }
}

type TurnLineCacheEntry = {
  width: number;
  color: boolean;
  density: string;
  /**
   * Theme fingerprint. `/theme` changes both the accent foreground and the
   * user-bubble wash; without this the cache would replay rows painted in the
   * previous theme's colors.
   */
  themeFingerprint: string;
  lines: string[];
  layoutRows: TurnLayoutRow[];
};

/** Finalized turns are immutable; cache entries GC when truncation drops them. */
// Scenario D calibration (fresh child process per capacity; 500 turns, 90
// overlapping back/forth 20-turn viewports). Hit rate / retained cache lines:
//   16 = 35.0% / 48 lines    32 = 51.7% / 96 lines
//   64 = 61.7% / 192 lines   128 = 75.0% / 384 lines
// Retained lines is the deterministic cost signal and scales linearly with
// capacity; heapUsed was NOT reproducible across runs even with per-capacity
// child processes and GC medians (16/32 repeatedly measured *higher* than 64),
// so it is deliberately not used as a decision input here.
// 64 is selected: 128 doubles cache volume to buy +13.3 points, and hit rate
// has clearly entered diminishing returns by then.
const TURN_LINE_CACHE_CAPACITY = 64;
const turnLineCache = new Map<Turn, TurnLineCacheEntry>();

export type TurnLineCacheStats = {
  size: number;
  capacity: number;
  hits: number;
  misses: number;
  evictions: number;
};

let turnLineCacheHits = 0;
let turnLineCacheMisses = 0;
let turnLineCacheEvictions = 0;


/** Test/benchmark-only snapshot; callers cannot mutate cache state through it. */
export function getTurnLineCacheStats(): TurnLineCacheStats {
  return { size: turnLineCache.size, capacity: TURN_LINE_CACHE_CAPACITY, hits: turnLineCacheHits, misses: turnLineCacheMisses, evictions: turnLineCacheEvictions };
}

/** Test/benchmark-only reset; production code does not call this. */
export function resetTurnLineCacheStats(): void {
  turnLineCache.clear();
  turnLineCacheHits = 0;
  turnLineCacheMisses = 0;
  turnLineCacheEvictions = 0;
}

function getCachedTurnLine(turn: Turn): TurnLineCacheEntry | undefined {
  const cached = turnLineCache.get(turn);
  if (cached) {
    turnLineCacheHits += 1;
    turnLineCache.delete(turn);
    turnLineCache.set(turn, cached);
  } else {
    turnLineCacheMisses += 1;
  }
  return cached;
}

function setCachedTurnLine(turn: Turn, entry: TurnLineCacheEntry): void {
  turnLineCache.delete(turn);
  turnLineCache.set(turn, entry);
  while (turnLineCache.size > TURN_LINE_CACHE_CAPACITY) {
    turnLineCache.delete(turnLineCache.keys().next().value!);
    turnLineCacheEvictions += 1;
  }
}

/**
 * Line-count cache: how many terminal rows a finalized turn occupies at a
 * given width. Deliberately keyed by width ONLY — ANSI styling, bubble surface
 * and density never change wrap counts (styles are zero-width and spacious
 * separators live outside the cache). This is what lets renderHistory rebuild
 * its row-offset index without re-running markdown when /theme, density or the
 * background auto-follow poller invalidate the render cache: counts survive,
 * so only the visible window needs repainting instead of all 400 turns.
 */
const turnLineCountCache = new WeakMap<Turn, Map<number, number>>();

type HistoryFrameBuffer = {
  rows: number;
  columns: number;
  inputLines: number;
  lines: string[];
};

const frameBufferByOutput = new WeakMap<object, HistoryFrameBuffer>();

/**
 * Invalidate the double-buffer diff cache for an output stream.
 * Call this when a non-history write (like status-line / spinner repaints)
 * has modified the terminal rows above the composer, so the next
 * renderHistory does not skip repainting rows it believes are unchanged.
 */
export function invalidateHistoryFrameBuffer(output: object): void {
  frameBufferByOutput.delete(output);
}

export function resetHistoryFrameDiffCache(output?: NodeJS.WritableStream): void {
  if (output && typeof output === "object") {
    frameBufferByOutput.delete(output);
  }
}

export function createTurnHistory(): TurnHistory {
  return {
    turns: [],
    currentRole: null,
    currentContent: "",
    currentBlocks: [],
    scrollTop: 0,
    followBottom: true,
  };
}

export function startTurn(history: TurnHistory, role: TurnRole) {
  if (history.currentRole !== null && history.currentContent) {
    finalizeCurrentTurn(history);
  }
  history.currentRole = role;
  history.currentContent = "";
  history.currentBlocks = [];
  resetStreamingTurnCache();
}

export function appendToCurrentTurn(history: TurnHistory, chunk: string) {
  history.currentContent += chunk;
  appendCurrentBlock(history, "assistant", chunk);
}

function appendCurrentBlock(
  history: TurnHistory,
  kind: TurnBlock["kind"],
  chunk: string,
) {
  if (!chunk) return;
  const last = history.currentBlocks.at(-1);
  if (last?.kind === kind) {
    last.content = applyTerminalOutputToText(last.content, chunk);
  } else {
    history.currentBlocks.push({
      kind,
      content: applyTerminalOutputToText("", chunk),
    });
  }
}

export function finalizeCurrentTurn(history: TurnHistory) {
  if (history.currentRole !== null) {
    history.turns.push({
      role: history.currentRole,
      content: compactTurnContent(history.currentContent),
      ...(history.currentRole === "assistant" && history.currentBlocks.length > 0
        ? {
            blocks: history.currentBlocks
              .map((block) => ({
                ...block,
                content: compactTurnContent(block.content),
              }))
              .filter((block) => block.content.length > 0),
          }
        : {}),
    });
    history.currentRole = null;
    history.currentContent = "";
    history.currentBlocks = [];
    resetStreamingTurnCache();
    trimHistoryToBudget(history);
  }
}

/**
 * 追加一条本地命令/事件回显 turn。用于 slash 命令回显（/switch、/context
 * 等）以及异步系统反馈（Turn stopped、Quota exhausted 等）——这些都不
 * 是真实对话，用 `local` 角色与 user/assistant 视觉区分。
 *
 * 先收尾任何进行中的 streaming turn，再追加 finalized 的 local turn。
 * `command` 为空字符串时表示无对应命令的系统反馈，渲染时省略 `› ` 前缀。
 */
export function appendLocalTurn(
  history: TurnHistory,
  command: string,
  output: string,
) {
  finalizeCurrentTurn(history);
  history.turns.push({
    role: "local",
    command,
    content: compactTurnContent(output),
  });
  trimHistoryToBudget(history);
  resetStreamingTurnCache();
}

export function applyOutputChunkToCurrentTurn(
  history: TurnHistory,
  chunk: string,
  kind: TurnBlock["kind"] = "assistant",
): boolean {
  const next = applyTerminalOutputToText(history.currentContent, chunk);
  if (next === history.currentContent) return false;
  history.currentContent = next;
  appendCurrentBlock(history, kind, chunk);
  return true;
}

function styleAssistantTurn(content: string, colorEnabled: boolean): string {
  const highlighted = colorEnabled
    ? formatAssistantDisplay(content, { trimEdges: false })
    : stripAnsi(formatAssistantDisplay(content, { trimEdges: false }));
  const rawLines = highlighted.split("\n");
  let anchored = false;
  const styledLines = rawLines.map((line) => {
    if (!anchored && line.trim().length > 0 && !line.startsWith("[nolo]")) {
      anchored = true;
      const anchorPrefix = colorEnabled
        ? `${themeColorSequence("chrome")}◈\x1b[39m `
        : "◈ ";
      return `${anchorPrefix}${line}`;
    }
    return line.startsWith("[nolo]") && colorEnabled
      ? themeText(line, "chrome", true)
      : line;
  });
  return styledLines.join("\n");
}

/**
 * Paint one already-wrapped user row as a full-width bubble row.
 *
 * The row is padded to exactly `contentWidth` *inside* the background so the
 * bubble's right edge is straight instead of ragged, then closed with a reset
 * so the tint never bleeds into the scrollbar column or the next row.
 *
 * Padding uses visibleWidth (ANSI-aware, CJK/emoji-aware), never `length`.
 * Any interior reset emitted by wrapTranscriptLine re-opens the background,
 * otherwise the tail of a styled row would drop back to the terminal base.
 */
function fillUserBubbleRow(row: string, surfaceSeq: string, contentWidth: number): string {
  const visible = visibleWidth(row);
  // Guard: if the row already exceeds contentWidth (e.g. a narrow terminal
  // where gutter+indent itself is wider than the viewport), truncate the
  // content so the bubble never spills into the scrollbar column.
  if (visible > contentWidth) {
    const truncated = truncateAnsi(row, contentWidth);
    const padAfter = Math.max(0, contentWidth - visibleWidth(truncated));
    return `${surfaceSeq}${truncated}${" ".repeat(padAfter)}\x1b[0m`;
  }
  return renderSurfaceLine({ text: row, surface: surfaceSeq, padTo: contentWidth });
}

/**
 * Layout one turn into rows with exact source metadata for hit-test and selection.
 */
export function layoutTurnRows(
  role: TurnRole,
  content: string,
  contentWidth: number,
  colorEnabled: boolean,
  command?: string,
): TurnLayoutRow[] {
  content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (role === "user") {
    const logicalLines = content.split("\n");
    const accentSeq = colorEnabled ? themeColorSequence("accent") : "";
    const firstPrefix = colorEnabled ? `${accentSeq}\x1b[1m┃  ` : "┃  ";
    const multilinePrefix = colorEnabled ? `${accentSeq}\x1b[1m┃  ` : "┃  ";
    const hangingIndent = colorEnabled ? `${accentSeq}\x1b[1m┃  ` : "┃  ";
    const surfaceSeq = colorEnabled ? userSurfaceBackgroundSequence() : "";
    const prefixWidth = 3;

    let lineSourceStart = 0;
    const rows: TurnLayoutRow[] = [];
    for (let i = 0; i < logicalLines.length; i++) {
      const line = logicalLines[i]!;
      const prefix = i === 0 ? firstPrefix : multilinePrefix;
      const styledLine = `${prefix}${line}`;
      const prefixCharCount = prefix.length;
      const wrappedRows = wrapTranscriptLineWithLayout(
        styledLine,
        contentWidth,
        hangingIndent,
        lineSourceStart,
        prefixWidth,
        prefixCharCount,
      );
      for (const r of wrappedRows) {
        const rendered = surfaceSeq ? fillUserBubbleRow(r.rendered, surfaceSeq, contentWidth) : r.rendered;
        rows.push({
          rendered,
          sourceStart: r.sourceStart,
          sourceEnd: r.sourceEnd,
          prefixWidth: r.prefixWidth,
          sourceMapping: r.sourceMapping,
          softWrapped: r.softWrapped,
          softWrapJoiner: r.softWrapJoiner,
        });
      }
      lineSourceStart += line.length + 1;
    }
    return rows.length > 0
      ? rows
      : [{ rendered: surfaceSeq ? fillUserBubbleRow(firstPrefix, surfaceSeq, contentWidth) : firstPrefix, sourceStart: 0, sourceEnd: 0, prefixWidth: 3 }];
  }

  if (role === "local") {
    const dimSeq = colorEnabled ? "\x1b[2m" : "";
    const resetSeq = colorEnabled ? "\x1b[0m" : "";
    const rows: TurnLayoutRow[] = [];
    if (command) {
      const cmdPrefix = `${dimSeq}› `;
      const cmdLine = `${cmdPrefix}${command}${resetSeq}`;
      const cmdRows = wrapTranscriptLineWithLayout(
        cmdLine,
        contentWidth,
        "",
        0,
        2,
        cmdPrefix.length,
      );
      for (const r of cmdRows) {
        rows.push({
          rendered: r.rendered,
          sourceStart: 0,
          sourceEnd: 0,
          prefixWidth: 2,
          sourceMapping: undefined,
          softWrapped: r.softWrapped,
          softWrapJoiner: r.softWrapJoiner,
        });
      }
    }
    let lineSourceStart = 0;
    if (content) {
      for (const line of content.split("\n")) {
        const prefix = `${dimSeq}  `;
        const styledLine = `${prefix}${line}${resetSeq}`;
        const prefixCharCount = prefix.length;
        const wrappedRows = wrapTranscriptLineWithLayout(
          styledLine,
          contentWidth,
          "  ",
          lineSourceStart,
          2,
          prefixCharCount,
        );
        rows.push(...wrappedRows);
        lineSourceStart += line.length + 1;
      }
    }
    return rows.length > 0
      ? rows
      : [{ rendered: "", sourceStart: 0, sourceEnd: 0, prefixWidth: 2 }];
  }

  // Assistant
  const styledEntry = styleAssistantTurn(content, colorEnabled);
  const styledLines = styledEntry.split("\n");
  const rawLines = content.split("\n");
  let rawIdx = 0;
  let rawOffset = 0;
  const rows: TurnLayoutRow[] = [];

  // styleAssistantTurn anchored the first non-empty non-[nolo] line; mirror
  // that choice here so the ◈ wrap bookkeeping (prefixWidth) lands on the
  // same row, and a leading blank/[nolo] line never owns the anchor column.
  let anchored = false;
  for (let i = 0; i < styledLines.length; i++) {
    const styledLine = styledLines[i]!;
    const isFirstLine =
      !anchored && styledLine.trim().length > 0 && !styledLine.startsWith("[nolo]");
    if (isFirstLine) anchored = true;
    const anchorPrefix = isFirstLine
      ? (colorEnabled ? `${themeColorSequence("chrome")}◈\x1b[39m ` : "◈ ")
      : "";
    const prefixWidth = isFirstLine ? 2 : 0;
    const prefixCharCount = anchorPrefix.length;

    // Check if this styled line is an inserted blank line (not in raw source)
    if (styledLine === "" && rawIdx < rawLines.length && rawLines[rawIdx] !== "") {
      rows.push({
        rendered: "",
        sourceStart: rawOffset,
        sourceEnd: rawOffset,
        prefixWidth: 0,
      });
      continue;
    }

    const rawLine = rawIdx < rawLines.length ? rawLines[rawIdx]! : "";
    const rawLineLen = rawLine.length;
    const sourceMapping = buildSourceMapping(rawLine, styledLine, prefixCharCount);
    const lineRows = wrapTranscriptLineWithLayout(
      styledLine,
      contentWidth,
      "",
      rawOffset,
      prefixWidth,
      prefixCharCount,
      sourceMapping,
      rawLineLen,
    );
    rows.push(...lineRows);
    rawIdx += 1;
    rawOffset += rawLineLen + 1;
  }
  return rows.length > 0
    ? rows
    : [{ rendered: "", sourceStart: 0, sourceEnd: 0, prefixWidth: 0 }];
}

export function getTurnLayoutRows(
  turn: Turn,
  contentWidth: number,
  colorEnabled: boolean,
  density: string,
  themeFingerprint: string,
): TurnLayoutRow[] {
  const cached = getCachedTurnLine(turn);
  if (
    cached &&
    cached.width === contentWidth &&
    cached.color === colorEnabled &&
    cached.density === density &&
    cached.themeFingerprint === themeFingerprint
  ) {
    return cached.layoutRows;
  }
  const layoutRows = layoutTurnRows(turn.role, turn.content, contentWidth, colorEnabled, turn.command);
  const lines = layoutRows.map((r) => r.rendered);
  setCachedTurnLine(turn, {
    width: contentWidth,
    color: colorEnabled,
    density,
    themeFingerprint,
    lines,
    layoutRows,
  });
  return layoutRows;
}

/** Decorate + wrap one turn; separators stay outside so position can vary. */
export function renderTurnBlock(
  role: TurnRole,
  content: string,
  contentWidth: number,
  colorEnabled: boolean,
  command?: string,
): string[] {
  return layoutTurnRows(role, content, contentWidth, colorEnabled, command).map((r) => r.rendered);
}

type StreamingTurnCache = {
  role: TurnRole;
  contentWidth: number;
  colorEnabled: boolean;
  density: string;
  themeFingerprint: string;
  fullContent: string;
  prefixLength: number;
  prefixLines: string[];
  lastValidatedCut: number;
};

let streamingTurnCache: StreamingTurnCache | null = null;

export function resetStreamingTurnCache(): void {
  streamingTurnCache = null;
}

function renderPrefixTurnBlock(
  role: TurnRole,
  content: string,
  contentWidth: number,
  colorEnabled: boolean,
): string[] {
  content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (role === "user") {
    return renderTurnBlock(role, content, contentWidth, colorEnabled);
  }
  // Delegate styling (including the ◈ anchor on the first non-empty
  // non-[nolo] line) to styleAssistantTurn so streaming and finalized turns
  // cannot drift into double identity markers or orphan anchors.
  const styledLines = styleAssistantTurn(content, colorEnabled).split("\n");
  const lines: string[] = [];
  for (const logicalLine of styledLines) {
    lines.push(...wrapTranscriptLine(logicalLine, contentWidth));
  }
  return lines;
}

function renderTailTurnBlock(
  role: TurnRole,
  content: string,
  contentWidth: number,
  colorEnabled: boolean,
): string[] {
  content = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (role === "user") {
    const surfaceSeq = colorEnabled ? userSurfaceBackgroundSequence() : "";
    const accentSeq = colorEnabled ? themeColorSequence("accent") : "";
    const multilinePrefix = colorEnabled ? `${accentSeq}\x1b[1m┃  ` : "┃  ";
    const hangingIndent = colorEnabled ? `${accentSeq}\x1b[1m┃  ` : "┃  ";
    const lines: string[] = [];
    for (const rawLine of content.split("\n")) {
      const styledLine = `${multilinePrefix}${rawLine}`;
      const rows = wrapTranscriptLine(styledLine, contentWidth, hangingIndent);
      lines.push(
        ...(surfaceSeq ? rows.map((row) => fillUserBubbleRow(row, surfaceSeq, contentWidth)) : rows),
      );
    }
    return lines;
  } else {
    const highlighted = colorEnabled
      ? formatAssistantDisplay(content, { trimEdges: false })
      : stripAnsi(formatAssistantDisplay(content, { trimEdges: false }));
    const rawLines = highlighted.split("\n");
    const styledLines = rawLines.map((line) => {
      return line.startsWith("[nolo]") && colorEnabled
        ? themeText(line, "chrome", true)
        : line;
    });
    const lines: string[] = [];
    for (const logicalLine of styledLines) {
      lines.push(...wrapTranscriptLine(logicalLine, contentWidth));
    }
    return lines;
  }
}

function getStreamingTurnLines(
  role: TurnRole,
  content: string,
  contentWidth: number,
  colorEnabled: boolean,
  density: string,
  themeFingerprint: string,
): string[] {
  if (
    streamingTurnCache &&
    (streamingTurnCache.role !== role ||
      streamingTurnCache.contentWidth !== contentWidth ||
      streamingTurnCache.colorEnabled !== colorEnabled ||
      streamingTurnCache.density !== density ||
      streamingTurnCache.themeFingerprint !== themeFingerprint ||
      !content.startsWith(streamingTurnCache.fullContent.slice(0, streamingTurnCache.prefixLength)))
  ) {
    streamingTurnCache = null;
  }

  if (!streamingTurnCache) {
    streamingTurnCache = {
      role,
      contentWidth,
      colorEnabled,
      density,
      themeFingerprint,
      fullContent: content,
      prefixLength: 0,
      prefixLines: [],
      lastValidatedCut: 0,
    };
  }

  if (content.length > streamingTurnCache.fullContent.length) {
    let searchPos = streamingTurnCache.prefixLength;
    let candidateCut = -1;

    while (true) {
      const idx = content.indexOf("\n\n", searchPos);
      if (idx === -1) break;
      const cut = idx + 1;
      searchPos = idx + 2;

      const prefixSub = content.slice(0, cut);
      const fenceCount = (prefixSub.match(/^```/gm) || []).length;
      if (fenceCount % 2 === 0) {
        candidateCut = cut;
        break;
      }
    }

    if (candidateCut > streamingTurnCache.prefixLength) {
      const candidatePrefix = content.slice(0, candidateCut);
      const candidateTail = content.slice(candidateCut);

      const candPrefixLines = renderPrefixTurnBlock(role, candidatePrefix, contentWidth, colorEnabled);
      const candTailLines = renderTailTurnBlock(role, candidateTail, contentWidth, colorEnabled);
      const candCombined = [...candPrefixLines, ...candTailLines];
      if (candidateCut !== streamingTurnCache.lastValidatedCut) {
        const fullCheckLines = renderTurnBlock(role, content, contentWidth, colorEnabled);
        const sameLines = candCombined.length === fullCheckLines.length &&
          candCombined.every((line, index) => line === fullCheckLines[index]);
        streamingTurnCache.lastValidatedCut = candidateCut;
        if (sameLines) {
          streamingTurnCache.prefixLength = candidateCut;
          streamingTurnCache.prefixLines = candPrefixLines;
        }
      }
      streamingTurnCache.fullContent = content;
    } else {
      streamingTurnCache.fullContent = content;
    }
  }

  if (streamingTurnCache.prefixLength === 0) {
    return renderTurnBlock(role, content, contentWidth, colorEnabled);
  }

  const tailContent = content.slice(streamingTurnCache.prefixLength);
  const tailLines = renderTailTurnBlock(role, tailContent, contentWidth, colorEnabled);
  return [...streamingTurnCache.prefixLines, ...tailLines];
}

export function countTurnLines(
  role: TurnRole,
  content: string,
  contentWidth: number,
  command?: string,
): number {
  return layoutTurnRows(role, content, contentWidth, false, command).length;
}

export type TurnOffsetEntry = {
  /** Row of this turn's first line (after any separator above it). */
  startRow: number;
  /** Rows this turn's content occupies (separator excluded). */
  lineCount: number;
  /** 1 when density=spacious inserts a blank row above this turn. */
  separatorAbove: number;
};

export type TurnOffsets = {
  entries: TurnOffsetEntry[];
  totalLines: number;
};

/**
 * Scan TurnHistory → index of turn → start row. O(n) but reads only the line-count
 * cache — no markdown re-rendering; on a miss the count comes from the cheap
 * countTurnLines pass and is recorded for later frames. Spacious separators
 * depend on position, so they are indexed here rather than cached.
 */
export function buildTurnOffsets(
  history: TurnHistory,
  contentWidth: number
): TurnOffsets {
  const density = getActiveDensity();
  const entries: TurnOffsetEntry[] = [];
  let offset = 0;
  for (let i = 0; i < history.turns.length; i++) {
    const turn = history.turns[i]!;
    const separatorAbove =
      density === "spacious" && (i > 0 || turn.role === "user") ? 1 : 0;
    offset += separatorAbove;
    const cacheMap = turnLineCountCache.get(turn);
    let lineCount: number;
    if (cacheMap && cacheMap.has(contentWidth)) {
      lineCount = cacheMap.get(contentWidth)!;
    } else {
      lineCount = countTurnLines(turn.role, turn.content, contentWidth, turn.command);
      if (!cacheMap) {
        const nextMap = new Map<number, number>();
        nextMap.set(contentWidth, lineCount);
        turnLineCountCache.set(turn, nextMap);
      } else {
        if (cacheMap.size >= 8) {
          const oldestKey = cacheMap.keys().next().value;
          if (oldestKey !== undefined) cacheMap.delete(oldestKey);
        }
        cacheMap.set(contentWidth, lineCount);
      }
    }
    entries.push({ startRow: offset, lineCount, separatorAbove });
    offset += lineCount;
  }
  return { entries, totalLines: offset };
}

export function getAllTurnEntries(
  history: TurnHistory,
  contentWidth: number,
): { entries: TurnOffsetEntry[]; totalLines: number; turns: Turn[] } {
  const { entries, totalLines: finalizedLines } = buildTurnOffsets(history, contentWidth);
  const turns = [...history.turns];

  if (history.currentRole !== null && history.currentContent) {
    const density = getActiveDensity();
    const colorEnabled = resolveCliColorEnabled();
    const themeFingerprint = tuiRenderThemeFingerprint(colorEnabled);
    const streamingLines = getStreamingTurnLines(
      history.currentRole,
      history.currentContent,
      contentWidth,
      colorEnabled,
      density,
      themeFingerprint,
    );
    const sep = currentTurnSeparator(history, density);
    const startRow = finalizedLines + sep;
    entries.push({
      startRow,
      lineCount: streamingLines.length,
      separatorAbove: sep,
    });
    turns.push({
      role: history.currentRole,
      content: history.currentContent,
    });
    return { entries, totalLines: startRow + streamingLines.length, turns };
  }

  return { entries, totalLines: finalizedLines, turns };
}

/** Row index of the blank separator above the current streaming turn, if any. */
function currentTurnSeparator(history: TurnHistory, density: string): number {
  return density === "spacious" &&
    (history.turns.length > 0 || history.currentRole === "user")
    ? 1
    : 0;
}

export function buildHistoryLines(history: TurnHistory, contentWidth: number): string[] {
  const colorEnabled = resolveCliColorEnabled();
  const density = getActiveDensity();
  const themeFingerprint = tuiRenderThemeFingerprint(colorEnabled);
  const wrapped: string[] = [];

  for (let i = 0; i < history.turns.length; i++) {
    const turn = history.turns[i]!;
    if (density === "spacious" && (i > 0 || turn.role === "user")) {
      wrapped.push("");
    }
    const layoutRows = getTurnLayoutRows(
      turn,
      contentWidth,
      colorEnabled,
      density,
      themeFingerprint,
    );
    wrapped.push(...layoutRows.map((r) => r.rendered));
  }

  // Streaming turn mutates per chunk — incremental prefix cache.
  if (history.currentRole !== null && history.currentContent) {
    const i = history.turns.length;
    if (density === "spacious" && (i > 0 || history.currentRole === "user")) {
      wrapped.push("");
    }
    const streamingLines = getStreamingTurnLines(
      history.currentRole,
      history.currentContent,
      contentWidth,
      colorEnabled,
      density,
      themeFingerprint,
    );
    wrapped.push(...streamingLines);
  }

  return wrapped;
}

/**
 * Build the same global row grid used by history rendering, retaining the
 * prefix and soft-wrap metadata needed by selection/copy. This is deliberately
 * separate from the streaming render cache: it only runs on mouse release or
 * while painting an active selection, never for ordinary transcript frames.
 */
export function buildHistoryLayoutRows(
  history: TurnHistory,
  contentWidth: number,
): TurnLayoutRow[] {
  const colorEnabled = resolveCliColorEnabled();
  const density = getActiveDensity();
  const themeFingerprint = tuiRenderThemeFingerprint(colorEnabled);
  const rows: TurnLayoutRow[] = [];
  const separatorRow = (): TurnLayoutRow => ({
    rendered: "",
    sourceStart: 0,
    sourceEnd: 0,
    prefixWidth: 0,
  });

  for (let i = 0; i < history.turns.length; i++) {
    const turn = history.turns[i]!;
    if (density === "spacious" && (i > 0 || turn.role === "user")) {
      rows.push(separatorRow());
    }
    rows.push(...getTurnLayoutRows(
      turn,
      contentWidth,
      colorEnabled,
      density,
      themeFingerprint,
    ));
  }

  if (history.currentRole !== null && history.currentContent) {
    const i = history.turns.length;
    if (density === "spacious" && (i > 0 || history.currentRole === "user")) {
      rows.push(separatorRow());
    }
    rows.push(
      ...layoutTurnRows(
        history.currentRole,
        history.currentContent,
        contentWidth,
        colorEnabled,
      ),
    );
  }

  return rows;
}

export let renderCacheMissCount = 0;
export function getRenderCacheMissCount(): number {
  return renderCacheMissCount;
}
export function resetRenderCacheMissCount(): void {
  renderCacheMissCount = 0;
}

export function renderHistory(
  output: NodeJS.WritableStream,
  history: TurnHistory,
  inputLines: number,
  selection?: TuiSelectionState
): void {
  const tty = output as { isTTY?: boolean; rows?: number; columns?: number };
  if (!tty.isTTY) return;
  const rows = tty.rows ?? 24;
  const columns = tty.columns ?? 80;
  const visibleHeight = Math.max(1, rows - inputLines);
  const contentWidth = Math.max(1, columns - 1);
  const colorEnabled = resolveCliColorEnabled();
  const density = getActiveDensity();
  const themeFingerprint = tuiRenderThemeFingerprint(colorEnabled);

  const { entries, totalLines: finalizedLines } = buildTurnOffsets(history, contentWidth);

  let currentLines: string[] = [];
  let currentStart = -1;
  if (history.currentRole !== null && history.currentContent) {
    currentLines = getStreamingTurnLines(
      history.currentRole,
      history.currentContent,
      contentWidth,
      colorEnabled,
      density,
      themeFingerprint,
    );
    const sep = currentTurnSeparator(history, density);
    currentStart = finalizedLines + sep;
  }
  const totalLines =
    currentStart >= 0 ? currentStart + currentLines.length : finalizedLines;

  if (history.followBottom) {
    history.scrollTop = Math.max(0, totalLines - visibleHeight);
  } else {
    const maxScroll = Math.max(0, totalLines - visibleHeight);
    if (history.scrollTop > maxScroll) {
      history.scrollTop = maxScroll;
    }
  }

  history.hasMoreAbove = history.scrollTop > 0;
  history.hasMoreBelow = history.scrollTop + visibleHeight < totalLines;

  const winStart = history.scrollTop;
  const winEnd = Math.min(totalLines, winStart + visibleHeight);
  let visibleLines: string[] = new Array(visibleHeight).fill("");

  // Paint ONLY the turns overlapping the visible window.
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]!;
    if (entry.separatorAbove > 0) {
      const sepRow = entry.startRow - 1;
      if (sepRow >= winStart && sepRow < winEnd) {
        visibleLines[sepRow - winStart] = "";
      }
    }
    const turnStart = entry.startRow;
    const turnEnd = turnStart + entry.lineCount;
    if (turnEnd <= winStart || turnStart >= winEnd) continue;

    const turn = history.turns[i]!;
    const cached = getCachedTurnLine(turn);
    let layoutRows: TurnLayoutRow[];
    if (
      cached &&
      cached.width === contentWidth &&
      cached.color === colorEnabled &&
      cached.density === density &&
      cached.themeFingerprint === themeFingerprint
    ) {
      layoutRows = cached.layoutRows;
    } else {
      renderCacheMissCount += 1;
      layoutRows = getTurnLayoutRows(
        turn,
        contentWidth,
        colorEnabled,
        density,
        themeFingerprint,
      );
    }
    const lines = layoutRows.map((r) => r.rendered);

    const interStart = Math.max(turnStart, winStart);
    const interEnd = Math.min(turnEnd, winEnd);
    for (let r = interStart; r < interEnd; r++) {
      visibleLines[r - winStart] = lines[r - turnStart] ?? "";
    }
  }
  if (currentStart >= 0) {
    const separatorAbove = currentTurnSeparator(history, density);
    if (separatorAbove > 0) {
      const sepRow = currentStart - 1;
      if (sepRow >= winStart && sepRow < winEnd) {
        visibleLines[sepRow - winStart] = "";
      }
    }
    const currentEnd = currentStart + currentLines.length;
    if (currentEnd > winStart && currentStart < winEnd) {
      const interStart = Math.max(currentStart, winStart);
      const interEnd = Math.min(currentEnd, winEnd);
      for (let r = interStart; r < interEnd; r++) {
        visibleLines[r - winStart] = currentLines[r - currentStart] ?? "";
      }
    }
  }

  if (selection && selection.anchor && selection.head) {
    visibleLines = applySelectionOverlay(
      visibleLines,
      history,
      contentWidth,
      winStart,
      selection,
    );
  }

  // Double-buffering / Line diffing:
  const prevBuffer =
    typeof output === "object" && output !== null
      ? frameBufferByOutput.get(output)
      : undefined;
  const isGeometryCompatible =
    prevBuffer !== undefined &&
    prevBuffer.rows === rows &&
    prevBuffer.columns === columns &&
    prevBuffer.inputLines === inputLines &&
    prevBuffer.lines.length === visibleHeight;
  const prevLines = isGeometryCompatible ? prevBuffer.lines : undefined;

  let frame = "";
  const nextLines: string[] = new Array(visibleHeight);

  for (let i = 0; i < visibleHeight; i++) {
    const content = visibleLines[i] ?? "";
    const padded = padOrTruncateToWidth(content, contentWidth);
    const thumb = renderScrollbarRow(i, visibleHeight, totalLines, history.scrollTop);
    const scrollbarPrefix = colorEnabled ? themeColorSequence("chrome") : "";
    const scrollbarSuffix = colorEnabled ? "\x1b[39m" : "";
    const rowContent = `${padded}\x1b[${columns}G${scrollbarPrefix}${thumb}${scrollbarSuffix}`;
    nextLines[i] = rowContent;

    if (!prevLines || prevLines[i] !== rowContent) {
      // Direct full-row overwrite without \x1b[2K clear-line.
      // `padded` is already padOrTruncateToWidth'd to full contentWidth, so
      // writing rowContent completely paints all columns, avoiding blank-flash
      // flicker on terminals that don't support synchronized output (DECSET 2026).
      frame += `\x1b[${i + 1};1H${rowContent}`;
    }
  }

  if (typeof output === "object" && output !== null) {
    frameBufferByOutput.set(output, {
      rows,
      columns,
      inputLines,
      lines: nextLines,
    });
  }

  if (frame.length > 0) {
    const mainBottom = Math.max(1, rows - inputLines);
    frame += `\x1b[${mainBottom};1H`;
    output.write(frame);
  }
}

export function createHistoryOutputStream(
  history: TurnHistory,
  onUpdate: () => void
): NodeJS.WritableStream {
  const stream = {
    isTTY: true,
    assistantLabelManaged: true,
    write(chunk: string | Buffer): boolean {
      const text = typeof chunk === "string" ? chunk : chunk.toString();
      if (applyOutputChunkToCurrentTurn(history, text)) {
        onUpdate();
      }
      return true;
    },
    writeToolBlock(chunk: string): void {
      if (applyOutputChunkToCurrentTurn(history, chunk, "tool")) {
        onUpdate();
      }
    },
  };
  return stream as unknown as NodeJS.WritableStream;
}

export function applyScrollAction(
  history: TurnHistory,
  action: ScrollAction,
  output: NodeJS.WritableStream,
  inputLines: number
): void {
  const tty = output as { rows?: number; columns?: number };
  const rows = tty.rows ?? 24;
  const columns = tty.columns ?? 80;
  const visibleHeight = Math.max(1, rows - inputLines);
  const contentWidth = Math.max(1, columns - 1);
  const { totalLines: finalizedLines } = buildTurnOffsets(history, contentWidth);
  let totalLines = finalizedLines;
  if (history.currentRole !== null && history.currentContent) {
    totalLines +=
      currentTurnSeparator(history, getActiveDensity()) +
      countTurnLines(history.currentRole, history.currentContent, contentWidth);
  }
  const maxScrollTop = Math.max(0, totalLines - visibleHeight);

  history.followBottom = false;

  switch (action) {
    case "page-up":
      history.scrollTop = Math.max(0, history.scrollTop - visibleHeight);
      break;
    case "page-down":
      history.scrollTop = Math.min(maxScrollTop, history.scrollTop + visibleHeight);
      break;
    case "half-page-up":
      history.scrollTop = Math.max(0, history.scrollTop - Math.floor(visibleHeight / 2));
      break;
    case "half-page-down":
      history.scrollTop = Math.min(
        maxScrollTop,
        history.scrollTop + Math.floor(visibleHeight / 2)
      );
      break;
    case "wheel-up":
      history.scrollTop = Math.max(0, history.scrollTop - WHEEL_SCROLL_LINES);
      break;
    case "wheel-down":
      history.scrollTop = Math.min(maxScrollTop, history.scrollTop + WHEEL_SCROLL_LINES);
      // Scrolling back to the bottom resumes live-tail, like the End key.
      if (history.scrollTop >= maxScrollTop) history.followBottom = true;
      break;
    case "top":
      history.scrollTop = 0;
      break;
    case "bottom":
      history.scrollTop = maxScrollTop;
      history.followBottom = true;
      break;
  }
}
