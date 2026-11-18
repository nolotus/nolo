import { StringDecoder } from "node:string_decoder";
import {
  renderDialogHeaderLine,
  renderDialogRow,
  renderDialogRule,
  renderOverflowAbove,
  renderOverflowBelow,
} from "./dialogFrame";
import { createStandaloneDialogSession, type DialogSession } from "./dialogHost";
import { t } from "./i18n";
import { themeText } from "./theme";
import { consumeSgrMouseSequence, parseScrollAction } from "./tuiScrollbar";

const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function dropLastGrapheme(text: string): string {
  if (!text) return "";
  let lastStart = 0;
  for (const { index } of graphemeSegmenter.segment(text)) {
    lastStart = index;
  }
  return text.slice(0, lastStart);
}

export function matchSelectFilter(item: SelectDialogItem, query: string): boolean {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return true;
  const tokens = trimmed.split(/\s+/);
  const haystack = `${item.label}\n${item.detail ?? ""}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

function resolveSelectKeyHint(): string {
  return t("dialogSelectHint").replace(/^[（(]|[)）]$/g, "");
}

export type SelectDialogItem = {
  label: string;
  detail?: string;
};

export type SelectDialogResult<T extends SelectDialogItem> =
  | { kind: "selected"; index: number; item: T }
  | { kind: "cancelled" };

/**
 * Sentinel returned by a KeyReader when the input stream has closed (EOF).
 * Distinct from a plain key string so callers can tell "stream closed" apart
 * from "a key/sequence was read". Crucially, unparseable/garbage bytes are
 * dropped inside the reader and never surface here — they must not be
 * mistaken for a closed stream (the root cause of wheel-cancel).
 */
export const STREAM_CLOSED = Symbol("keyreader-stream-closed");

export type KeyReader = (() => Promise<string | typeof STREAM_CLOSED>) & {
  /** Detach any stream listeners the reader installed. */
  dispose?: () => void;
};

/**
 * 滚轮批量报告合批节流。一次滚轮/触控板手势会在同一 burst 里送几十条
 * SGR wheel 报告；若每条都移动光标，光标会瞬间飞掉。这里在一个短时间窗内
 * 累计位移，超过上限后吸收后续 wheel 事件（不移动），直到窗口过期重置。
 * 与 readlineWorkspace 的 wheel 节流同理：只把同一次手势的位移收敛到合理
 * 范围，而不是逐条无限累加。
 */
export function createWheelThrottle(limit = 3, windowMs = 80) {
  let cumulative = 0;
  let windowStart = 0;
  return {
    /**
     * 返回应应用的位移步长（±1），0 表示该 wheel 事件被吸收（不动）。
     * @param direction 期望方向：1 = down，-1 = up。
     */
    step(direction: 1 | -1): number {
      const now = Date.now();
      if (windowStart === 0 || now - windowStart > windowMs) {
        cumulative = 0;
        windowStart = now;
      }
      if (Math.abs(cumulative + direction) > limit) return 0;
      cumulative += direction;
      return direction;
    },
    reset() {
      cumulative = 0;
      windowStart = 0;
    },
  };
}

const KEY_ARROW_UP = "\x1b[A";
const KEY_ARROW_DOWN = "\x1b[B";
const KEY_ARROW_UP_APP = "\x1bOA";
const KEY_ARROW_DOWN_APP = "\x1bOB";
const DEFAULT_MAX_VISIBLE = 8;

export function computeVisibleWindow(args: {
  selectedIndex: number;
  total: number;
  maxVisible?: number;
}) {
  const maxVisible = Math.max(1, args.maxVisible ?? DEFAULT_MAX_VISIBLE);
  if (args.total <= maxVisible) {
    return { start: 0, end: args.total, maxVisible };
  }
  let start = Math.max(0, args.selectedIndex - Math.floor(maxVisible / 2));
  if (start + maxVisible > args.total) {
    start = args.total - maxVisible;
  }
  return { start, end: start + maxVisible, maxVisible };
}

export function renderSelectDialog<T extends SelectDialogItem>(args: {
  items: T[];
  selectedIndex: number;
  title?: string;
  /**
   * Pre-rendered title lines (already styled via dialogFrame primitives).
   * When provided, they replace the single `title` line verbatim — used by
   * confirmDialog to embed a separately-colored command line that
   * `renderDialogTitle` (which wraps the whole string in one color) cannot
   * produce. Plain when color is disabled, so non-TTY/NO_COLOR output stays
   * ANSI-free.
   */
  titleLines?: string[];
  /**
   * Extra line(s) rendered under the list inside the same frame (e.g. the
   * /switch catalog's "some favorites unavailable" notice). Counted like any
   * other row by the frame painter, so the anchored frame just grows by one
   * row. Omitted/empty → output identical to before this option existed.
   */
  footerLines?: string[];
  maxVisible?: number;
  /** Terminal column width for top/bottom rules and right-aligned key hint. */
  width?: number;
  /** True when docked immediately above the composer; skips the bottom rule. */
  bottomAnchored?: boolean;
  /** Active filter query shown inline in the header when non-empty. */
  filterQuery?: string;
  /** Show `1/N` item counter after a custom `title` when not filtering. */
  showCount?: boolean;
}) {
  const total = args.items.length;
  const window = computeVisibleWindow({
    selectedIndex: args.selectedIndex,
    total,
    maxVisible: args.maxVisible,
  });
  const filterQuery = args.filterQuery ?? "";
  const hasFilter = filterQuery.length > 0;
  const filterSuffix = hasFilter
    ? ` · ${t("dialogFilterLabel")}: ${filterQuery}▌`
    : "";
  const baseTitle =
    args.title !== undefined
      ? args.showCount && !hasFilter && total > 0
        ? `${args.title}  ${args.selectedIndex + 1}/${total}`
        : args.title
      : hasFilter
        ? t("dialogSelectLabel")
        : `${t("dialogSelectLabel")}  ${args.selectedIndex + 1}/${total}`;
  const titleText = `${baseTitle}${filterSuffix}`;
  const titleAlreadyHasHint =
    args.title !== undefined &&
    (args.title.includes("Esc") || args.title.includes("↑↓"));
  const titleLines =
    args.titleLines ??
    [
      renderDialogHeaderLine({
        title: titleText,
        ...(titleAlreadyHasHint ? {} : { hint: resolveSelectKeyHint() }),
        width: args.width,
      }),
    ];
  // Top rule separates the modal cleanly from transcript text above; blank line
  // between the title block and the list gives the frame breathing room.
  const lines = [renderDialogRule(args.width), ...titleLines, ""];

  if (total === 0) {
    lines.push(themeText(`  ${t("dialogFilterNoMatches")}`, "muted"));
  } else {
    if (window.start > 0) {
      lines.push(renderOverflowAbove(window.start));
    }

    for (let index = window.start; index < window.end; index += 1) {
      const item = args.items[index];
      lines.push(
        renderDialogRow({
          label: item.label,
          ...(item.detail ? { detail: item.detail } : {}),
          focused: index === args.selectedIndex,
        }),
      );
    }

    if (window.end < total) {
      lines.push("", renderOverflowBelow(total - window.end));
    }
  }

  if (args.footerLines && args.footerLines.length > 0) {
    lines.push(...args.footerLines);
  }

  if (!args.bottomAnchored) {
    lines.push(renderDialogRule(args.width));
  }

  return lines.join("\n");
}

export function outputIsTty(output: NodeJS.WritableStream): boolean {
  return (
    typeof output === "object" &&
    output !== null &&
    "isTTY" in output &&
    Boolean(output.isTTY)
  );
}

export function clearRenderedLines(output: NodeJS.WritableStream, lineCount: number) {
  if (!outputIsTty(output) || lineCount <= 0) return;
  for (let index = 0; index < lineCount; index += 1) {
    output.write("\x1b[1A\x1b[2K");
  }
}
export function clearAnchoredLines(
  output: NodeJS.WritableStream,
  bottomRow: number,
  lineCount: number
) {
  if (!outputIsTty(output) || lineCount <= 0) return;
  for (let index = 0; index < lineCount; index += 1) {
    const row = bottomRow - index;
    if (row < 1) break;
    output.write(`\x1b[${row};1H\x1b[2K`);
  }
}

export type DialogFrameRenderResult =
  | string
  | {
      text: string;
      cursor?: { lineIndex: number; col: number } | null;
    };

/**
 * Shared frame painter for framed dialogs (select, multiSelect, askChoice, confirm).
 * Owns the three paint regimes in one place:
 *   - bottom-anchored + positionable output: report reservation to host,
 *     clear where the frame WAS (tracked `lastBottomRow`), repaint at the row
 *     the composer occupies NOW — this is what makes the frame follow a terminal resize
 *     and support modal growth/shrink without physical scrolling;
 *   - positionable output: clear the previously rendered lines, write below;
 *   - anything else (pipe / capture streams): plain writes.
 * `clear()` removes the last painted frame using the same regime and resets reservation to 0,
 * so a dialog's cleanup never erases rows it did not paint.
 */
export function createDialogFramePainter(args: {
  output: NodeJS.WritableStream;
  /** Build the frame text (or text + cursor) for the current state. */
  render: () => DialogFrameRenderResult;
  bottomAnchored: boolean;
  /** Lazily resolved 1-indexed row the frame's last line sits on. */
  resolveBottomRow: () => number;
  session?: DialogSession;
}) {
  let renderedLineCount = 0;
  let lastBottomRow = 0;
  let unanchoredCursorLift = 0;

  const restoreUnanchoredCursor = () => {
    if (unanchoredCursorLift <= 0) return;
    if (typeof args.output.write === "function") {
      args.output.write(`\x1b[${unanchoredCursorLift}B`);
    }
    unanchoredCursorLift = 0;
  };

  const reportReservation = (rows: number) => {
    args.session?.setReservedRows?.(rows);
  };

  const paint = () => {
    const rawFrame = args.render();
    const frameText = typeof rawFrame === "string" ? rawFrame : rawFrame.text;
    const cursor =
      typeof rawFrame === "object" && rawFrame !== null ? rawFrame.cursor : null;
    const lines = frameText.split("\n");
    const lineCount = lines.length;
    const canPosition =
      outputIsTty(args.output) && typeof args.output.write === "function";

    if (args.bottomAnchored && canPosition) {
      reportReservation(lineCount);
      const anchorRow = args.resolveBottomRow();
      clearAnchoredLines(
        args.output,
        lastBottomRow > 0 ? lastBottomRow : anchorRow,
        renderedLineCount,
      );
      for (let i = 0; i < lines.length; i += 1) {
        const row = anchorRow - (lines.length - 1 - i);
        if (row < 1) break;
        args.output.write(`\x1b[${row};1H\x1b[2K${lines[i]}`);
      }
      lastBottomRow = anchorRow;
      renderedLineCount = lineCount;

      if (cursor) {
        const cursorLineOffset = lineCount - 1 - cursor.lineIndex;
        const cursorRow = anchorRow - cursorLineOffset;
        if (cursorRow >= 1) {
          args.output.write(`\x1b[${cursorRow};${cursor.col + 1}H`);
        }
      }
      return;
    }

    if (canPosition) {
      restoreUnanchoredCursor();
      clearRenderedLines(args.output, renderedLineCount);
      if (renderedLineCount > 0 && lineCount > renderedLineCount) {
        const delta = lineCount - renderedLineCount;
        args.output.write("\n".repeat(delta));
        args.output.write(`\x1b[${delta}A`);
      }
      if (typeof args.output.write === "function") {
        args.output.write(`${frameText}\n`);
      }
      renderedLineCount = lineCount;
      if (cursor) {
        const linesFromBottom = lineCount - cursor.lineIndex;
        args.output.write(`\x1b[${linesFromBottom}A`);
        args.output.write(`\x1b[${cursor.col + 1}G`);
        unanchoredCursorLift = linesFromBottom;
      }
      return;
    }

    if (typeof args.output.write === "function") {
      args.output.write(`${frameText}\n`);
    }
    renderedLineCount = lineCount;
    unanchoredCursorLift = 0;
  };
  return {
    paint,
    clear() {
      reportReservation(0);
      if (args.bottomAnchored) {
        clearAnchoredLines(
          args.output,
          lastBottomRow > 0 ? lastBottomRow : args.resolveBottomRow(),
          renderedLineCount,
        );
      } else {
        restoreUnanchoredCursor();
        clearRenderedLines(args.output, renderedLineCount);
      }
      renderedLineCount = 0;
      unanchoredCursorLift = 0;
    },
    getRenderedLineCount: () => renderedLineCount,
  };
}


export function isArrowUp(sequence: string) {
  return sequence === KEY_ARROW_UP || sequence === KEY_ARROW_UP_APP;
}

export function isArrowDown(sequence: string) {
  return sequence === KEY_ARROW_DOWN || sequence === KEY_ARROW_DOWN_APP;
}

export function isSubmit(sequence: string) {
  return sequence === "\r" || sequence === "\n";
}

export function isCancel(sequence: string) {
  return sequence === "\u0003" || sequence === "\u001b";
}

export function createRawKeyReader(
  input: NodeJS.ReadStream,
  options?: { preserveBracketedPaste?: boolean },
): KeyReader {
  let buffer = "";
  const utf8 = new StringDecoder("utf8");
  let closed = false;

  // Parse one token from the front of the buffer.
  // Returns:
  //   - a string  → a complete deliverable key/sequence (consumed from buffer)
  //   - undefined → nothing deliverable yet (need more bytes / pending timer)
  //   - null      → the leading byte is unparseable garbage (drop it, keep going)
  const tryParseSequence = (): string | null | undefined => {
    if (!buffer) return undefined;
    if (options?.preserveBracketedPaste) {
      const marker = "\x1b[200~";
      const start = buffer.indexOf(marker);
      if (start < 0) {
        // Emit only ordinary prefix text; a suffix may become the paste-start
        // marker on the next data event. Never pass that suffix to the dialog
        // before this reader can establish the protected payload boundary.
        for (let length = Math.min(marker.length - 1, buffer.length); length > 0; length--) {
          if (!buffer.endsWith(marker.slice(0, length))) continue;
          if (buffer.length === length) return undefined;
          const prefix = buffer.slice(0, -length);
          buffer = buffer.slice(-length);
          return prefix;
        }
      }
      if (start > 0) {
        const prefix = buffer.slice(0, start);
        buffer = buffer.slice(start);
        return prefix;
      }
      if (start === 0) {
        // Paste payload is data, not terminal commands. Keep every byte until
        // the complete terminator, including unknown ESC and split markers.
        const end = buffer.indexOf("\x1b[201~", 6);
        if (end < 0) return undefined;
        const paste = buffer.slice(0, end + 6);
        buffer = buffer.slice(end + 6);
        return paste;
      }
    }
    if (isSubmit(buffer)) {
      const sequence = buffer;
      buffer = "";
      return sequence;
    }
    if (buffer.startsWith("\x1b")) {
      // SGR mouse reports (ESC [ < button ; col ; row M/m) arrive as a
      // multi-byte burst — a single wheel/trackpad gesture can deliver dozens
      // of reports in one chunk. consumeSgrMouseSequence returns only the
      // first complete report and leaves the rest in `buffer`, so each report
      // is delivered as its own sequence across successive readKey() calls.
      // This is what stops a burst from being mistaken for a closed stream
      // (the root cause of the wheel-cancel bug). Plain clicks are swallowed
      // (→ keep waiting) so they never cancel.
      const mouse = consumeSgrMouseSequence(buffer);
      if (mouse !== undefined && mouse !== null) {
        buffer = buffer.slice(mouse.length);
        return mouse;
      }
      if (mouse === undefined) return undefined; // incomplete report, wait
      // Complete CSI sequences (arrows, PageUp/PageDown, Home/End, Shift+Tab,
      // etc.) and SS3 sequences (application-mode arrows/Home/End). Recognizing
      // the full CSI/SS3 grammar prevents PageUp/PageDown/Shift+Tab from
      // having their leading ESC dropped as "garbage" and leaking "[5~"/"[Z"
      // into Other free-text input.
      const csi = /^\x1b\[[0-9;?]*[A-Za-z~]/.exec(buffer);
      if (csi) {
        buffer = buffer.slice(csi[0].length);
        return csi[0];
      }
      const ss3 = /^\x1bO[A-Za-z]/.exec(buffer);
      if (ss3) {
        buffer = buffer.slice(ss3[0].length);
        return ss3[0];
      }
      // Incomplete CSI / SS3 prefix (split across data chunks, e.g. "\x1b[5" + "~"
      // or "\x1bO" + "A") — wait for the trailing bytes just like incomplete SGR
      // mouse reports; drainClosed() discards incomplete tails at EOF.
      if (/^\x1b\[[0-9;?]*$/.test(buffer) || buffer === "\x1bO") {
        return undefined;
      }
      // Bare ESC — wait for bounded timer to disambiguate from ESC-prefixed
      // sequences that may arrive split across chunks.
      if (buffer === "\x1b") return undefined;
      // 2-byte ESC+printable (Meta/Alt+key, e.g. "\x1by"): keep it intact as
      // an ESC-prefixed sequence instead of stripping ESC and leaking "y".
      if (
        buffer.length >= 2 &&
        /^[\x20-\x7e]$/.test(buffer[1]!) &&
        buffer[1] !== "[" &&
        buffer[1] !== "O"
      ) {
        const alt = buffer.slice(0, 2);
        buffer = buffer.slice(2);
        return alt;
      }
      // Determinately-not-mouse and not-arrow ESC garbage: drop the leading
      // byte and keep parsing. It must never surface as a closed stream.
      return null;
    }
    const sequence = buffer;
    buffer = "";
    return sequence;
  };

  // Deliver keys via 'data' events. The TUI workspace drives stdin in flowing
  // mode with 'data' listeners; mixing in 'readable'/read() here left the
  // dialog deaf to every keypress under Bun (the 'readable' event never fires
  // once the stream has been flowing), so /agent showed a picker that ignored
  // arrows and Enter. A persistent 'data' listener uses the same delivery
  // path as the rest of the TUI and never drops bytes between reads.
  let waiter: ((sequence: string | typeof STREAM_CLOSED) => void) | null = null;
  let escTimer: ReturnType<typeof setTimeout> | null = null;

  const clearEscTimer = () => {
    if (escTimer) {
      clearTimeout(escTimer);
      escTimer = null;
    }
  };

  const resolveWaiter = (value: string | typeof STREAM_CLOSED) => {
    if (!waiter) return;
    const resolve = waiter;
    waiter = null;
    resolve(value);
  };

  const tryDeliver = () => {
    if (!waiter) return;
    while (buffer) {
      const parsed = tryParseSequence();
      if (parsed === undefined) {
        // Pending: a lone ESC (awaiting continuation via the bounded timer) or
        // an incomplete SGR report. Start the ESC timer only for a lone ESC.
        if (buffer === "\x1b" && !escTimer) {
          escTimer = setTimeout(() => {
            escTimer = null;
            if (waiter && buffer === "\x1b") {
              buffer = "";
              resolveWaiter("\x1b");
            }
          }, 30);
        }
        return;
      }
      if (parsed === null) {
        // Unparseable garbage byte — drop it and continue parsing. It never
        // bubbles up to the caller, so it can never be read as a closed
        // stream / cancel.
        buffer = buffer.slice(1);
        continue;
      }
      clearEscTimer();
      resolveWaiter(parsed);
      return;
    }
  };

  const onData = (chunk: Buffer | string) => {
    if (closed) return;
    buffer += typeof chunk === "string" ? chunk : utf8.write(Buffer.from(chunk));
    clearEscTimer();
    tryDeliver();
  };

  // Closed-mode drain: the stream can no longer produce bytes, so drain
  // whatever is already buffered synchronously. Complete sequences are
  // delivered one at a time across successive readKey() calls — a single
  // chunk like `\x1b[B\r` right before EOF must yield ArrowDown then Enter,
  // NOT a premature STREAM_CLOSED (the same class of bug as wheel-cancel:
  // treating unread input as a closed stream). Anything that cannot resolve
  // now — a lone ESC or an incomplete SGR report — is dropped so we never
  // hang waiting for bytes EOF will never deliver.
  const drainClosed = (): string | typeof STREAM_CLOSED => {
    while (buffer) {
      const parsed = tryParseSequence();
      if (parsed === undefined) {
        // Incomplete/trailing bytes that can never complete after EOF.
        buffer = "";
        return STREAM_CLOSED;
      }
      if (parsed === null) {
        buffer = buffer.slice(1);
        continue;
      }
      return parsed;
    }
    return STREAM_CLOSED;
  };

  const onClose = () => {
    if (closed) return;
    buffer += utf8.end();
    closed = true;
    clearEscTimer();
    // Only drain into a pending read; if no waiter is waiting right now, leave
    // the buffered keys intact so the next readKey() call (which runs through
    // the `closed` branch) still delivers them. Consuming into a void here
    // would drop a trailing Enter right before EOF (the wheel-cancel class of
    // bug again).
    if (waiter) resolveWaiter(drainClosed());
  };

  input.on("data", onData);
  input.on("close", onClose);
  input.on("end", onClose);
  input.resume?.();

  const reader: KeyReader = () =>
    new Promise((resolve) => {
      if (closed) {
        resolve(drainClosed());
        return;
      }
      waiter = resolve;
      tryDeliver();
    });
  reader.dispose = () => {
    clearEscTimer();
    waiter = null;
    input.off("data", onData);
    input.off("close", onClose);
    input.off("end", onClose);
  };
  return reader;
}

export function drainInputBuffer(input: NodeJS.ReadStream) {
  if (typeof input.read !== "function") return;
  while (input.read() !== null) {
    // drain stale escape sequences after raw-mode picker
  }
}

export async function runSelectDialog<T extends SelectDialogItem>(args: {
  items: T[];
  initialIndex?: number;
  title?: string;
  /** See renderSelectDialog.titleLines. */
  titleLines?: string[];
  /** See renderSelectDialog.footerLines. */
  footerLines?: string[];
  maxVisible?: number;
  input?: NodeJS.ReadStream;
  output?: NodeJS.WritableStream;
  signal?: AbortSignal;
  readKey?: KeyReader;
  inputPolicy?: import("./dialogHost").DialogInputPolicy;
  onTranscriptScroll?: (action: string) => void;
  mouseEnabled?: boolean;
  registerForegroundRepaint?: (repaint: () => void) => void;
  /**
   * Host-owned terminal lifecycle. Provided by dialogHost's anchor; dialogs
   * running outside the workspace fall back to a standalone session that
   * owns SGR mouse reporting and raw mode itself.
   */
  session?: DialogSession;
  /**
   * Dock the list above the composer instead of letting it scroll to the top
   * of the terminal. When true, `bottomRow` (1-indexed absolute cursor row)
   * is the row the last line of the frame sits on; the rest stack upward.
   * Pass a function to resolve the row lazily on every paint — the TUI uses
   * this so the dialog re-anchors itself above the composer after a terminal
   * resize instead of staying frozen at the rows captured when it opened.
   */
  bottomAnchored?: boolean;
  bottomRow?: number | (() => number);
  /** Enable real-time type-to-filter over item.label and item.detail. */
  filterable?: boolean;
  /**
   * Optional single-character hotkey -> item index map for immediate selection.
   * Mutually exclusive with `filterable`: ignored when `filterable` is true.
   */
  hotkeys?: Readonly<Record<string, number>>;
  /** See renderSelectDialog.showCount. */
  showCount?: boolean;
}): Promise<SelectDialogResult<T>> {
  const items = args.items;
  if (items.length === 0) {
    return { kind: "cancelled" };
  }

  const filterable = args.filterable ?? false;
  const hotkeys = !filterable && args.hotkeys ? args.hotkeys : undefined;
  let filterQuery = "";
  const indexedItems = items.map((item, index) => ({ item, index }));
  let filteredEntries = indexedItems;
  let selectedIndex = Math.min(
    Math.max(args.initialIndex ?? 0, 0),
    filteredEntries.length - 1
  );
  const output = args.output ?? process.stdout;
  const input = args.input ?? process.stdin;
  const readKey =
    args.readKey ??
    createRawKeyReader(input, hotkeys ? { preserveBracketedPaste: true } : undefined);
  let cancelRead!: () => void;
  const cancelled = new Promise<typeof STREAM_CLOSED>((resolve) => { cancelRead = () => resolve(STREAM_CLOSED); });
  args.signal?.addEventListener("abort", cancelRead, { once: true });
  if (args.signal?.aborted) cancelRead();
  const session = args.session ?? createStandaloneDialogSession({ input, output });

  const wheelThrottle = createWheelThrottle();
  let rawAcquired = false;
  const bottomAnchored = Boolean(args.bottomAnchored && args.bottomRow);
  const resolveBottomRow = () =>
    Math.max(
      1,
      typeof args.bottomRow === "function" ? args.bottomRow() : args.bottomRow ?? 0
    );

  const resolveFrameWidth = () => {
    const cols = (output as { columns?: number }).columns;
    return typeof cols === "number" && cols > 0 ? cols : 80;
  };

  const painter = createDialogFramePainter({
    output,
    render: () =>
      renderSelectDialog({
        items: filteredEntries.map((entry) => entry.item),
        selectedIndex,
        title: args.title,
        ...(args.titleLines ? { titleLines: args.titleLines } : {}),
        ...(args.footerLines ? { footerLines: args.footerLines } : {}),
        ...(args.showCount ? { showCount: true } : {}),
        ...(filterable && filterQuery ? { filterQuery } : {}),
        maxVisible: args.maxVisible,
        width: resolveFrameWidth(),
        bottomAnchored,
      }),
    bottomAnchored,
    resolveBottomRow,
    session,
  });
  const paint = painter.paint;
  const applyFilter = (nextQuery: string) => {
    if (nextQuery === filterQuery) return;
    const focusedOriginalIndex = filteredEntries[selectedIndex]?.index;
    filterQuery = nextQuery;
    filteredEntries = filterQuery
      ? indexedItems.filter(({ item }) => matchSelectFilter(item, filterQuery))
      : indexedItems;
    if (filteredEntries.length === 0) {
      selectedIndex = 0;
    } else {
      const keptIndex =
        focusedOriginalIndex === undefined
          ? -1
          : filteredEntries.findIndex((entry) => entry.index === focusedOriginalIndex);
      selectedIndex = keptIndex >= 0 ? keptIndex : 0;
    }
    paint();
  };

  // While anchored, the dialog owns its rows — re-paint on terminal resize so
  // the frame follows the composer to its new position. The workspace's own
  // resize handler routes through dialogHost.repaint() while a dialog is up,
  // so this listener is only for standalone runs: hosted dialogs register as
  // the host's foreground repaint instead and never attach a second listener.
  const resizeTarget = output as NodeJS.WritableStream & {
    on?: (event: string, listener: () => void) => void;
    off?: (event: string, listener: () => void) => void;
  };
  const onOutputResize = () => paint();
  args.registerForegroundRepaint?.(paint);

  try {
    // Mouse reporting for the dialog window is session-owned: the hosted
    // session re-enables what the composer paused; the standalone session
    // writes its canonical enable pair. The matching disable happens in the
    // finally, also through the session.
    if (args.mouseEnabled !== false) session.setMouseReporting(true);
    // Do not pause the stream here: the key reader listens via 'data' events,
    // which an explicit pause() would silence.
    if (input.isTTY) rawAcquired = session.acquireRaw();
    if (bottomAnchored && outputIsTty(output) && !args.registerForegroundRepaint) {
      resizeTarget.on?.("resize", onOutputResize);
    }
    paint();

    let inBracketedPaste = false;
    while (true) {
      const sequence = await Promise.race([readKey(), cancelled]);
      if (args.signal?.aborted) return { kind: "cancelled" };
      if (sequence === STREAM_CLOSED) {
        return { kind: "cancelled" };
      }

      if (!filterable) {
        if (inBracketedPaste) {
          if (sequence.includes("\x1b[201~")) {
            inBracketedPaste = false;
          }
          continue;
        }
        if (sequence.startsWith("\x1b[200~")) {
          if (!sequence.endsWith("\x1b[201~")) {
            inBracketedPaste = true;
          }
          continue;
        }
      }

      // Wheel semantics live entirely in the input policy: "transcript"
      // routes the event to the workspace history, "ignore" swallows it
      // (a two-choice gate must never move under the wheel), and "modal"
      // (the default for standalone list pickers) moves the selection,
      // batch-throttled so one gesture's dozens of reports don't send the
      // highlight flying.
      const scrollAction = parseScrollAction(sequence);
      if ((scrollAction === "wheel-up" || scrollAction === "wheel-down") && (args.inputPolicy?.wheel ?? "modal") === "transcript") {
        args.onTranscriptScroll?.(scrollAction);
        continue;
      }
      if (scrollAction && scrollAction !== "wheel-up" && scrollAction !== "wheel-down" && args.inputPolicy?.pageKeys === "transcript") {
        args.onTranscriptScroll?.(scrollAction);
        continue;
      }
      if (scrollAction === "wheel-up" || scrollAction === "wheel-down") {
        if ((args.inputPolicy?.wheel ?? "modal") === "ignore") {
          continue;
        }
        if (filteredEntries.length === 0) continue;
        const direction: 1 | -1 = scrollAction === "wheel-up" ? -1 : 1;
        if (wheelThrottle.step(direction) === 0) continue;
        selectedIndex = Math.min(
          Math.max(
            selectedIndex + direction,
            0,
          ),
          filteredEntries.length - 1,
        );
        paint();
        continue;
      }

      if (isCancel(sequence)) {
        return { kind: "cancelled" };
      }
      if (isSubmit(sequence)) {
        const picked = filteredEntries[selectedIndex];
        if (!picked) continue;
        return { kind: "selected", index: picked.index, item: picked.item };
      }
      if (isArrowUp(sequence)) {
        if (filteredEntries.length === 0) continue;
        selectedIndex = selectedIndex <= 0 ? filteredEntries.length - 1 : selectedIndex - 1;
        paint();
        continue;
      }
      if (isArrowDown(sequence)) {
        if (filteredEntries.length === 0) continue;
        selectedIndex = selectedIndex >= filteredEntries.length - 1 ? 0 : selectedIndex + 1;
        paint();
        continue;
      }
      if (
        hotkeys &&
        !sequence.startsWith("\x1b") &&
        sequence.length === 1 &&
        Object.hasOwn(hotkeys, sequence)
      ) {
        const targetIndex = hotkeys[sequence];
        const picked = targetIndex !== undefined ? indexedItems[targetIndex] : undefined;
        if (picked) {
          return { kind: "selected", index: picked.index, item: picked.item };
        }
      }
      if (filterable) {
        if (sequence === "\x7f" || sequence === "\b") {
          if (filterQuery.length > 0) {
            applyFilter(dropLastGrapheme(filterQuery));
          }
          continue;
        }
        if (sequence === "\x15") {
          if (filterQuery.length > 0) {
            applyFilter("");
          }
          continue;
        }
        if (!sequence.startsWith("\x1b")) {
          const printable = sequence.replace(/[\x00-\x1f\x7f-\x9f]/g, "");
          if (printable.length > 0) {
            applyFilter(filterQuery + printable);
          }
        }
      }
    }
  } finally {
    args.signal?.removeEventListener("abort", cancelRead);
    session.setMouseReporting(false);
    resizeTarget.off?.("resize", onOutputResize);
    readKey.dispose?.();
    painter.clear();
    if (input.isTTY) {
      drainInputBuffer(input);
      session.releaseRaw(rawAcquired);
    }
  }
}