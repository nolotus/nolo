/**
 * TUI 对话历史：turn 数据结构、样式化渲染、滚动条贴边、滚动动作应用。
 *
 * 从 readlineWorkspace.ts 抽出。依赖：
 * - ./tuiAnsi：wrapTranscriptLine / wrapTranscriptLineWithLayout / padOrTruncateToWidth / applyTerminalOutputToText
 * - ./tuiScrollbar：renderScrollbarRow / parseScrollAction / ScrollAction / WHEEL_SCROLL_LINES
 * - ./theme：themeColorSequence / themeText / resolveCliColorEnabled
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
  renderSurfaceLine,
  themeColorSequence,
  themeText,
  tuiRenderThemeFingerprint,
  userSurfaceBackgroundSequence,
} from "./theme";
import { formatAssistantDisplay, polishBreathInsertsBlankBetween } from "../client/assistantOutput";
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
 * and separators never change wrap counts (styles are zero-width and turn
 * separators live outside the cache). This is what lets renderHistory rebuild
 * its row-offset index without re-running markdown when /theme or the
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

/**
 * 工具行 run-length 折叠：对同一对象重复同一动作的连续成功行合并为一行 ×N。
 *
 * 判据：新 chunk 剥 ANSI 后是「单行、`  ✓` 结尾」，且当前文本尾行剥 ANSI
 * 并去掉已有 ×N 后与之全等（同 label + 同 gist）。中间夹了任何其他内容
 * （正文 / thought / 失败行 / 多行卡）尾行即不匹配，组自然断开，无需额外
 * 状态。失败（✗）与待确认（!）行结尾不是 ✓，永不折叠也永不入组。
 * 纯显示层：只改写 transcript 文本，不影响持久化消息与 formatter 输出。
 */
const TOOL_SUCCESS_LINE_RE = /^(▸ .*?)(?: ×(\d+))?(  ✓)$/;

function foldToolSuccessLine(text: string, chunk: string): string | null {
  const plain = stripAnsi(chunk).replace(/\n+$/, "");
  if (!plain || plain.includes("\n") || !TOOL_SUCCESS_LINE_RE.test(plain)) return null;
  const hadTrailingNewline = text.endsWith("\n");
  const body = hadTrailingNewline ? text.slice(0, -1) : text;
  const newlineAt = body.lastIndexOf("\n");
  const tail = newlineAt === -1 ? body : body.slice(newlineAt + 1);
  const match = TOOL_SUCCESS_LINE_RE.exec(stripAnsi(tail));
  if (!match || `${match[1]}${match[3]}` !== plain) return null;
  const count = (match[2] ? Number(match[2]) : 1) + 1;
  // ×N 插在状态符前的普通双空格之前（样式段之外），count 替换而非累加。
  const anchor = tail.lastIndexOf("  ");
  if (anchor < 0) return null;
  const head = tail.slice(0, anchor).replace(/\s×\d+$/, "");
  const merged = `${head} ×${count}${tail.slice(anchor)}`;
  const prefix = newlineAt === -1 ? "" : body.slice(0, newlineAt + 1);
  return `${prefix}${merged}${hadTrailingNewline ? "\n" : ""}`;
}

export function applyOutputChunkToCurrentTurn(
  history: TurnHistory,
  chunk: string,
  kind: TurnBlock["kind"] = "assistant",
): boolean {
  if (kind === "tool") {
    const foldedContent = foldToolSuccessLine(history.currentContent, chunk);
    if (foldedContent !== null) {
      history.currentContent = foldedContent;
      const lastBlock = history.currentBlocks.at(-1);
      // 不变量：fold 触发意味着 currentContent 尾行是工具行，而工具 chunk 只会
      // 并入（或新建）尾部的 tool block——因此走到这里 lastBlock 必为 tool
      // block，无需为非 tool 尾块做同步分支（blocks 当前无渲染消费方）。
      if (lastBlock?.kind === "tool") {
        const foldedBlock = foldToolSuccessLine(lastBlock.content, chunk);
        if (foldedBlock !== null) lastBlock.content = foldedBlock;
      }
      return true;
    }
  }
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
  themeFingerprint: string,
): TurnLayoutRow[] {
  const cached = getCachedTurnLine(turn);
  if (
    cached &&
    cached.width === contentWidth &&
    cached.color === colorEnabled &&
    cached.themeFingerprint === themeFingerprint
  ) {
    return cached.layoutRows;
  }
  const layoutRows = layoutTurnRows(turn.role, turn.content, contentWidth, colorEnabled, turn.command);
  const lines = layoutRows.map((r) => r.rendered);
  setCachedTurnLine(turn, {
    width: contentWidth,
    color: colorEnabled,
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

/**
 * 流式 turn 的增量渲染缓存（H1 优化：paint 成本与当前 turn 总行数解耦）。
 *
 * 结构：把当前 turn 源文本切成「已提交完整逻辑行」+「未完行 tail」两段。
 * 已提交段渲染一次后不再重排；每帧只重渲染 pendingTail（≈ 最近一个 tool block
 * 或当前未完行）。全量渲染仅在缓存失效（非纯追加/换宽换主题）或命中可疑
 * 内容守卫时发生，成本回退到旧实现（逐帧全量，正确性优先）。
 *
 * 安全模型（splice 等价性）：formatAssistantDisplay 的跨行状态只有
 * fence/mermaid（``` 奇偶）、多行数学块（$$ / \[ \]）、表格
 * （convertMarkdownTablesForTerminal + 逐行管道行）、polishAssistantStructure
 * 的标题呼吸 / 列表↔prose 空行 / \n{4,} 压缩。以上形态出现即放弃 splice
 * （该帧全量渲染并重新提交行缓存）；其余内容逐行渲染与整段渲染逐行一致
 * （assistantOutput 高亮器刻意 LINE-LOCAL）。首次 splice 另做一次与全量渲染的
 * 等价校验（失配 → 本 turn 永久关闭快路径）。NOLO_TUI_RENDER_VALIDATE=1 可强制
 * 每帧校验（等价性测试用）。
 */
type StreamingTurnCache = {
  role: TurnRole;
  contentWidth: number;
  colorEnabled: boolean;
  themeFingerprint: string;
  /** 本 turn 的完整源文本（含 pendingTail），startsWith 增量判定与守卫扫描的基准。 */
  fullContent: string;
  /** content[0..completeContentLength) 的已提交渲染行：全部是完整逻辑行。 */
  committedLines: string[];
  /** 已提交源文本长度（截到最后一个 \n；0 = 尚无完整逻辑行）。 */
  completeContentLength: number;
  /** 最后一个 \n 之后的未完行源文本（"" = 干净行边界）。 */
  pendingTail: string;
  /** 已提交源文本的 ``` 翻转次数（奇偶 = 围栏内外状态）。 */
  fenceFlips: number;
  /** 已提交区域最后一个逻辑行（边界 kind/表格守卫用）。 */
  committedLastLine: string;
  /** 本 turn 是否允许 append-splice（校验失配后关闭）。 */
  fastPathEnabled: boolean;
  /** 快路径与全量渲染的一次性等价校验是否已通过。 */
  spliceValidated: boolean;
  /** 上次返回的行数组（内容未变时直接复用，滚动/键击重绘零渲染成本）。 */
  lastResult: string[] | null;
};

let streamingTurnCache: StreamingTurnCache | null = null;

export function resetStreamingTurnCache(): void {
  streamingTurnCache = null;
}

/** 与 layoutTurnRows/fence 语义对齐：``` 开头的行（含缩进）翻转围栏状态。 */
function countFenceFlips(text: string): number {
  const matches = text.match(/^[ \t]*```/gm);
  return matches ? matches.length : 0;
}

const HEADING_LIKE_RE = /^#{1,3} /;

/** 管道表格行形态（trimmed 以 | 开头）→ 表格块跨行状态，走全量渲染。 */
function isPipeRowLike(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.length > 0 && trimmed.startsWith("|");
}

/**
 * 快路径可疑内容守卫：命中任一项 → 该帧全量渲染（成本回退旧行为，正确性不变）。
 * 扫描对象是合并后的 newTail（pendingTail + suffix），捕捉跨段拼接的形态
 * （如未完行以 "``" 结尾、suffix 续成 ```）。tool block（› / ├ / └ / 缩进行）
 * 不含以下形态，正常走 splice。
 */
function isSuspiciousAppend(newTail: string, fenceParityEven: boolean): boolean {
  if (!fenceParityEven) return true; // 已提交内容处于未闭合围栏内
  if (newTail.includes("\r")) return true; // 回车重写历史
  if (newTail.includes("```")) return true; // fence 开/闭（含 mermaid）
  if (newTail.includes("$$") || newTail.includes("\\[") || newTail.includes("\\]")) {
    return true; // 多行数学块开/闭
  }
  if (/\n{4,}/.test(newTail)) return true; // polish 的 \n{4,} 压缩
  if (newTail.includes("\x00")) return true; // polish 哨兵字符（convertMarkdownTables 遮罩冲突）
  return hasPipeRowLine(newTail);
}

/** 管道表格行形态：trimmed 以 | 开头（含分隔行 ---|---）。 */
function hasPipeRowLine(text: string): boolean {
  const lines = text.split("\n");
  return lines.some((line) => isPipeRowLike(line));
}

/**
 * 边界守卫：committed 最后一行与 tail 首行之间的 polish 行为
 * （标题呼吸空行 / 列表↔prose 呼吸空行 / 表格续行）。
 * 判定与 polishAssistantStructure 的逐对规则严格对齐。
 */
function isSuspiciousBoundary(committedLastLine: string, newTail: string): boolean {
  const newlineIdx = newTail.indexOf("\n");
  const firstLine = newlineIdx === -1 ? newTail : newTail.slice(0, newlineIdx);
  // 标题呼吸：非空行 ↔ 标题行相邻（两个方向都会被 polish 插入空行）。
  if (HEADING_LIKE_RE.test(firstLine) && committedLastLine !== "") return true;
  if (HEADING_LIKE_RE.test(committedLastLine) && firstLine !== "") return true;
  if (isPipeRowLike(firstLine) || isPipeRowLike(committedLastLine)) {
    return true; // 表格块跨行（列宽对齐依赖上下文）
  }
  return polishBreathInsertsBlankBetween(committedLastLine, firstLine);
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
  themeFingerprint: string,
): string[] {
  const forceValidate = process.env.NOLO_TUI_RENDER_VALIDATE === "1";
  let cache = streamingTurnCache;

  const geometryChanged =
    !cache ||
    cache.role !== role ||
    cache.contentWidth !== contentWidth ||
    cache.colorEnabled !== colorEnabled ||
    cache.themeFingerprint !== themeFingerprint;
  // 非纯追加（\r 重写、内容收缩）或几何/主题变化 → 缓存失效，全量重建。
  if (geometryChanged || !content.startsWith(cache.fullContent)) {
    return rebuildStreamingCache(content, role, contentWidth, colorEnabled, themeFingerprint);
  }

  // 内容未变（滚动 / 键击触发的重绘）→ 复用上次结果，零渲染成本。
  if (content === cache.fullContent && cache.lastResult) {
    return cache.lastResult;
  }

  const suffix = content.slice(cache.fullContent.length);
  if (suffix === "") {
    return cache.lastResult ?? cache.committedLines;
  }

  // 全量渲染回退（守卫命中 / 校验失配）：重建 committed/pendingTail 切分。
  // 注意：committed 渲染源一律剥掉段尾 \n（否则 split 产生幽灵空行，与
  // 「该行后面还有内容」的全量渲染错位——旧前缀缓存正是栽在这里）。
  const renderFull = (): string[] => {
    const lines = renderTurnBlock(role, content, contentWidth, colorEnabled);
    cache.fullContent = content;
    cache.fenceFlips = countFenceFlips(content);
    const lastNewline = content.lastIndexOf("\n");
    cache.completeContentLength = lastNewline + 1;
    cache.committedLines =
      lastNewline === -1
        ? []
        : renderTurnBlock(role, content.slice(0, lastNewline), contentWidth, colorEnabled);
    cache.pendingTail = content.slice(lastNewline + 1);
    cache.committedLastLine =
      lastNewline === -1 ? "" : lastLogicalLineOf(content.slice(0, lastNewline + 1));
    cache.lastResult = lines;
    return lines;
  };

  // ── 快路径守卫：命中可疑内容 → 该帧全量渲染（旧行为，正确性不变） ──────
  const newTail = cache.pendingTail + suffix;
  if (
    !cache.fastPathEnabled ||
    isSuspiciousAppend(newTail, cache.fenceFlips % 2 === 0) ||
    isSuspiciousBoundary(cache.committedLastLine, newTail)
  ) {
    return renderFull();
  }

  // ── 增量 splice：committed 不重排，只渲染未完 tail（O(tail)） ───────────
  // turn 首段（尚无完整行）用 anchor 渲染器；后续 tail 不带 ◈。
  const tailRenderer =
    cache.completeContentLength === 0 ? renderPrefixTurnBlock : renderTailTurnBlock;
  const tailLines = tailRenderer(role, newTail, contentWidth, colorEnabled);
  const composed =
    cache.completeContentLength === 0
      ? tailLines
      : [...cache.committedLines, ...tailLines];

  if (!cache.spliceValidated || forceValidate) {
    // 一次性（或强制）等价校验：splice 结果必须与全量渲染逐行一致。
    const full = renderTurnBlock(role, content, contentWidth, colorEnabled);
    cache.spliceValidated = true;
    if (
      composed.length === full.length &&
      composed.every((line, index) => line === full[index])
    ) {
      commitCompletedTail(cache, content, newTail, role, contentWidth, colorEnabled);
      cache.lastResult = composed;
      return composed;
    }
    // 失配 → 本 turn 关闭快路径，回退每帧全量（旧行为）。
    cache.fastPathEnabled = false;
    return renderFull();
  }

  commitCompletedTail(cache, content, newTail, role, contentWidth, colorEnabled);
  cache.lastResult = composed;
  return composed;
}

/** content 最后一个逻辑行（不含行尾换行）。 */
function lastLogicalLineOf(content: string): string {
  const trimmed = content.replace(/\n$/, "");
  const idx = trimmed.lastIndexOf("\n");
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

/** 缓存失效（几何/主题变化、非纯追加）时的全量重建。 */
function rebuildStreamingCache(
  content: string,
  role: TurnRole,
  contentWidth: number,
  colorEnabled: boolean,
  themeFingerprint: string,
): string[] {
  const lines = renderTurnBlock(role, content, contentWidth, colorEnabled);
  const lastNewline = content.lastIndexOf("\n");
  streamingTurnCache = {
    role,
    contentWidth,
    colorEnabled,
    themeFingerprint,
    fullContent: content,
    // committed 渲染源剥掉段尾 \n（幽灵空行修正，见 renderFull 注释）。
    committedLines:
      lastNewline === -1
        ? []
        : renderTurnBlock(role, content.slice(0, lastNewline), contentWidth, colorEnabled),
    completeContentLength: lastNewline + 1,
    pendingTail: content.slice(lastNewline + 1),
    fenceFlips: countFenceFlips(content),
    committedLastLine:
      lastNewline === -1 ? "" : lastLogicalLineOf(content.slice(0, lastNewline + 1)),
    fastPathEnabled: true,
    spliceValidated: false,
    lastResult: lines,
  };
  return lines;
}

/**
 * 把 tail 中已完成的行（到最后一个 \n）并入 committedLines：
 * turn 首段用 anchor 渲染器（renderPrefixTurnBlock），后续段不带 ◈。
 * 未完行留在 pendingTail；fence 翻转计数增量维护。
 */
function commitCompletedTail(
  cache: StreamingTurnCache,
  content: string,
  newTail: string,
  role: TurnRole,
  contentWidth: number,
  colorEnabled: boolean,
): void {
  const lastNewline = newTail.lastIndexOf("\n");
  if (lastNewline !== -1) {
    // 渲染源剥掉段尾 \n（幽灵空行修正）；\n 本身只作为行分隔符计数进
    // completeContentLength，使 committedLines 与全量渲染逐行对齐。
    const completePart = newTail.slice(0, lastNewline + 1);
    const renderSource = completePart.slice(0, -1);
    const renderer =
      cache.completeContentLength === 0 ? renderPrefixTurnBlock : renderTailTurnBlock;
    cache.committedLines.push(
      ...renderer(role, renderSource, contentWidth, colorEnabled),
    );
    cache.completeContentLength += completePart.length;
    cache.fenceFlips += countFenceFlips(completePart);
    cache.committedLastLine = lastLogicalLineOf(completePart);
    cache.pendingTail = newTail.slice(lastNewline + 1);
  }
  cache.fullContent = content;
}

export function getStreamingTurnLinesForTest(
  role: TurnRole,
  content: string,
  contentWidth: number,
  colorEnabled: boolean,
  themeFingerprint: string,
): string[] {
  return getStreamingTurnLines(role, content, contentWidth, colorEnabled, themeFingerprint);
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
  /** 1 when a blank row is inserted above this turn (user-first or after another turn). */
  separatorAbove: number;
};

export type TurnOffsets = {
  entries: TurnOffsetEntry[];
  totalLines: number;
};

/**
 * Scan TurnHistory → index of turn → start row. O(n) but reads only the line-count
 * cache — no markdown re-rendering; on a miss the count comes from the cheap
 * countTurnLines pass and is recorded for later frames. Turn separators
 * depend on position, so they are indexed here rather than cached.
 */
export function buildTurnOffsets(
  history: TurnHistory,
  contentWidth: number
): TurnOffsets {
  const entries: TurnOffsetEntry[] = [];
  let offset = 0;
  for (let i = 0; i < history.turns.length; i++) {
    const turn = history.turns[i]!;
    const separatorAbove = i > 0 && turn.role === "user" ? 1 : 0;
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
    const colorEnabled = resolveCliColorEnabled();
    const themeFingerprint = tuiRenderThemeFingerprint(colorEnabled);
    const streamingLines = getStreamingTurnLines(
      history.currentRole,
      history.currentContent,
      contentWidth,
      colorEnabled,
      themeFingerprint,
    );
    const sep = currentTurnSeparator(history);
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
function currentTurnSeparator(history: TurnHistory): number {
  return history.turns.length > 0 && history.currentRole === "user" ? 1 : 0;
}

export function buildHistoryLines(history: TurnHistory, contentWidth: number): string[] {
  const colorEnabled = resolveCliColorEnabled();
  const themeFingerprint = tuiRenderThemeFingerprint(colorEnabled);
  const wrapped: string[] = [];

  for (let i = 0; i < history.turns.length; i++) {
    const turn = history.turns[i]!;
    if (i > 0 && turn.role === "user") {
      wrapped.push("");
    }
    const layoutRows = getTurnLayoutRows(
      turn,
      contentWidth,
      colorEnabled,
      themeFingerprint,
    );
    wrapped.push(...layoutRows.map((r) => r.rendered));
  }

  // Streaming turn mutates per chunk — incremental prefix cache.
  if (history.currentRole !== null && history.currentContent) {
    const i = history.turns.length;
    if (i > 0 && history.currentRole === "user") {
      wrapped.push("");
    }
    const streamingLines = getStreamingTurnLines(
      history.currentRole,
      history.currentContent,
      contentWidth,
      colorEnabled,
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
    if (i > 0 && turn.role === "user") {
      rows.push(separatorRow());
    }
    rows.push(...getTurnLayoutRows(
      turn,
      contentWidth,
      colorEnabled,
      themeFingerprint,
    ));
  }

  if (history.currentRole !== null && history.currentContent) {
    const i = history.turns.length;
    if (i > 0 && history.currentRole === "user") {
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
      themeFingerprint,
    );
    const sep = currentTurnSeparator(history);
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
      cached.themeFingerprint === themeFingerprint
    ) {
      layoutRows = cached.layoutRows;
    } else {
      renderCacheMissCount += 1;
      layoutRows = getTurnLayoutRows(
        turn,
        contentWidth,
        colorEnabled,
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
    const separatorAbove = currentTurnSeparator(history);
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
      currentTurnSeparator(history) +
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
