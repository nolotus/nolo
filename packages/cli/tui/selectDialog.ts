import {
  renderDialogRow,
  renderDialogTitle,
  renderOverflowAbove,
  renderOverflowBelow,
} from "./dialogFrame";
import { t } from "./i18n";
import { consumeSgrMouseSequence, parseScrollAction } from "./tuiScrollbar";

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

const CSI_ARROW_UP = "\x1b[A";
const CSI_ARROW_DOWN = "\x1b[B";
const CSI_ARROW_UP_APP = "\x1bOA";
const CSI_ARROW_DOWN_APP = "\x1bOB";
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
  maxVisible?: number;
}) {
  const total = args.items.length;
  const window = computeVisibleWindow({
    selectedIndex: args.selectedIndex,
    total,
    maxVisible: args.maxVisible,
  });
  const titleLines =
    args.titleLines ??
    [
      renderDialogTitle(
        args.title ??
          `${t("dialogSelectLabel")}  ${t("dialogSelectHint")}  ${args.selectedIndex + 1}/${total}`,
      ),
    ];
  // Blank line between the title block and the list gives the frame some
  // breathing room; it counts as an anchored row like any other.
  const lines = [...titleLines, ""];

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

export function isArrowUp(sequence: string) {
  return sequence === CSI_ARROW_UP || sequence === CSI_ARROW_UP_APP;
}

export function isArrowDown(sequence: string) {
  return sequence === CSI_ARROW_DOWN || sequence === CSI_ARROW_DOWN_APP;
}

export function isSubmit(sequence: string) {
  return sequence === "\r" || sequence === "\n";
}

export function isCancel(sequence: string) {
  return sequence === "\u0003" || sequence === "\u001b";
}

export function createRawKeyReader(input: NodeJS.ReadStream): KeyReader {
  let buffer = "";
  let closed = false;

  // Parse one token from the front of the buffer.
  // Returns:
  //   - a string  → a complete deliverable key/sequence (consumed from buffer)
  //   - undefined → nothing deliverable yet (need more bytes / pending timer)
  //   - null      → the leading byte is unparseable garbage (drop it, keep going)
  const tryParseSequence = (): string | null | undefined => {
    if (!buffer) return undefined;
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
      for (const candidate of [
        CSI_ARROW_UP,
        CSI_ARROW_DOWN,
        CSI_ARROW_UP_APP,
        CSI_ARROW_DOWN_APP,
      ]) {
        if (buffer.startsWith(candidate)) {
          buffer = buffer.slice(candidate.length);
          return candidate;
        }
      }
      // Bare ESC — wait for bounded timer to disambiguate from ESC-prefixed
      // sequences that may arrive split across chunks.
      if (buffer === "\x1b") return undefined;
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
    buffer += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
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
  maxVisible?: number;
  input?: NodeJS.ReadStream;
  output?: NodeJS.WritableStream;
  readKey?: KeyReader;
  wheelPolicy?: "move" | "ignore";
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
}): Promise<SelectDialogResult<T>> {
  const items = args.items;
  if (items.length === 0) {
    return { kind: "cancelled" };
  }

  let selectedIndex = Math.min(
    Math.max(args.initialIndex ?? 0, 0),
    items.length - 1
  );
  const output = args.output ?? process.stdout;
  const input = args.input ?? process.stdin;
  const readKey = args.readKey ?? createRawKeyReader(input);

  const wheelThrottle = createWheelThrottle();
  const wasRaw = Boolean(input.isTTY && input.isRaw);
  let renderedLineCount = 0;
  const bottomAnchored = Boolean(args.bottomAnchored && args.bottomRow);
  const resolveBottomRow = () =>
    Math.max(
      1,
      typeof args.bottomRow === "function" ? args.bottomRow() : args.bottomRow ?? 0
    );
  // Anchor of the last actual paint, tracked separately from resolveBottomRow()
  // so a resize moves the frame: clear where it WAS, repaint where it IS.
  let lastBottomRow = 0;

  const paint = () => {
    const frame = renderSelectDialog({
      items,
      selectedIndex,
      title: args.title,
      ...(args.titleLines ? { titleLines: args.titleLines } : {}),
      maxVisible: args.maxVisible,
    });
    const lines = frame.split("\n");
    const lineCount = lines.length;
    const canPosition = outputIsTty(output) && typeof output.write === "function";

    if (bottomAnchored && canPosition) {
      const anchorRow = resolveBottomRow();
      clearAnchoredLines(
        output,
        lastBottomRow > 0 ? lastBottomRow : anchorRow,
        renderedLineCount
      );
      for (let i = 0; i < lines.length; i += 1) {
        const row = anchorRow - (lines.length - 1 - i);
        if (row < 1) break;
        output.write(`\x1b[${row};1H\x1b[2K${lines[i]}`);
      }
      lastBottomRow = anchorRow;
      renderedLineCount = lineCount;
      return;
    }

    if (canPosition) {
      clearRenderedLines(output, renderedLineCount);
      output.write(`${frame}\n`);
      renderedLineCount = lineCount;
      return;
    }

    if (typeof output.write === "function") {
      output.write(`${frame}\n`);
    }
    renderedLineCount = lineCount;
  };

  // While anchored, the dialog owns its rows — re-paint on terminal resize so
  // the frame follows the composer to its new position. The workspace's own
  // resize handler skips repainting while a dialog is up (composer paused), so
  // this listener is the only thing keeping the frame docked during a drag.
  const resizeTarget = output as NodeJS.WritableStream & {
    on?: (event: string, listener: () => void) => void;
    off?: (event: string, listener: () => void) => void;
  };
  const onOutputResize = () => paint();

  try {
    // Re-enable mouse tracking for wheel scroll inside the dialog.
    output.write("\x1b[?1006h\x1b[?1000h");
    // Do not pause the stream here: the key reader listens via 'data' events,
    // which an explicit pause() would silence.
    if (input.isTTY && !wasRaw) {
      input.setRawMode?.(true);
    }
    if (bottomAnchored && outputIsTty(output)) {
      resizeTarget.on?.("resize", onOutputResize);
    }
    paint();

    while (true) {
      const sequence = await readKey();
      if (sequence === STREAM_CLOSED) {
        return { kind: "cancelled" };
      }

      // Mouse wheel scrolls the list (batch-throttled so a single gesture's
      // dozens of reports don't send the highlight flying).
      const scrollAction = parseScrollAction(sequence);
      if (scrollAction === "wheel-up" || scrollAction === "wheel-down") {
        if (args.wheelPolicy === "ignore") {
          continue; // non-list modals (confirm) silently swallow wheel
        }
        const direction: 1 | -1 = scrollAction === "wheel-up" ? -1 : 1;
        if (wheelThrottle.step(direction) === 0) continue;
        selectedIndex = Math.min(
          Math.max(
            selectedIndex + direction,
            0,
          ),
          items.length - 1,
        );
        paint();
        continue;
      }

      if (isCancel(sequence)) {
        return { kind: "cancelled" };
      }
      if (isSubmit(sequence)) {
        return { kind: "selected", index: selectedIndex, item: items[selectedIndex] };
      }
      if (isArrowUp(sequence)) {
        selectedIndex = selectedIndex <= 0 ? items.length - 1 : selectedIndex - 1;
        paint();
        continue;
      }
      if (isArrowDown(sequence)) {
        selectedIndex = selectedIndex >= items.length - 1 ? 0 : selectedIndex + 1;
        paint();
        continue;
      }
    }
  } finally {
    output.write("\x1b[?1000l\x1b[?1006l");
    resizeTarget.off?.("resize", onOutputResize);
    readKey.dispose?.();
    if (input.isTTY) {
      drainInputBuffer(input);
      if (!wasRaw) input.setRawMode?.(false);
      if (bottomAnchored) {
        clearAnchoredLines(
          output,
          lastBottomRow > 0 ? lastBottomRow : resolveBottomRow(),
          renderedLineCount
        );
      } else {
        clearRenderedLines(output, renderedLineCount);
      }
      renderedLineCount = 0;
    }
  }
}