/**
 * The TUI's in-conversation approval card.
 *
 * A connector action that needs consent used to force the user into a browser popup. This module
 * keeps the question where the work is happening: the card is written into the transcript stream
 * (not a separate window, not a full-screen modal), and the host submits the answer straight to the
 * connector through `submit_approval_decision` — the model is never asked, and cannot answer.
 *
 * Deliberate non-goals:
 *  - it does NOT take over the keyboard (no `dialogHost` claim, no composer pause): the user can keep
 *    typing while a card waits, which is why `y`/`n` are only consumed when the composer draft is
 *    empty;
 *  - it does NOT remember anything: one card = one action, no "always allow";
 *  - styling stays minimal on purpose: one frame, no colour. Long values (and the script itself) wrap
 *    at the terminal width instead of being clipped, because the only copy of the code the user can
 *    inspect is this card when `hostApproval` is set.
 */
import type {
  HostApprovalCard,
  HostApprovalDecision,
  HostApprovalRenderer,
} from "../client/hostApprovalFlow";
import {
  createHostApprovalCardQueue,
  formatApprovalRemaining,
  HOST_APPROVAL_SUMMARY_LIMIT,
} from "../client/hostApprovalFlow";

const ALLOW_KEYS = new Set(["y", "Y"]);
const DENY_KEYS = new Set(["n", "N"]);
/** The workspace decoder emits a lone ESC as "\x1b"; a fast double press arrives as "\x1b\x1b". */
const ESCAPE_KEYS = new Set(["\x1b", "\x1b\x1b", "\x1b[27~"]);

const FALLBACK_COLUMNS = 80;
/** Columns a field label occupies after "│": " action    ", " detail    ". */
const LABEL_COLUMN = 9;
/** Everything after "│": one space + the label column. */
const CONTENT_INDENT = LABEL_COLUMN + 1;
/** Terminal rows the script block may occupy (head + omission note + tail). */
const DETAIL_MAX_ROWS = 15;
/** Share of those rows that goes to the head, where the length + sha256 identity line sits. */
const DETAIL_HEAD_SHARE = 0.4;
/** Wide (CJK) code points occupy two terminal columns; measuring by `.length` would wrap the frame. */
const WIDE_CHAR = /[\u1100-\u115F\u2E80-\u303E\u3041-\u33FF\u3400-\u4DBF\u4E00-\u9FFF\uA000-\uA4CF\uAC00-\uD7A3\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFF60\uFFE0-\uFFE6]/;

function charWidth(char: string): number {
  return WIDE_CHAR.test(char) ? 2 : 1;
}

function displayWidth(text: string): number {
  let width = 0;
  for (const char of text) width += charWidth(char);
  return width;
}

/** Clip one frame row to `columns` columns so the border cannot wrap into a wall. */
export function clipCardLine(text: string, columns: number): string {
  const budget = Math.max(8, columns - 1);
  if (displayWidth(text) <= budget) return text;
  let kept = "";
  let width = 0;
  for (const char of text) {
    const charWidth = WIDE_CHAR.test(char) ? 2 : 1;
    if (width + charWidth > budget - 1) break;
    kept += char;
    width += charWidth;
  }
  return `${kept}…`;
}

/**
 * Break one card row into terminal-width rows instead of dropping its tail.
 *
 * Clipping a row is how the statement at the end of a long line — the part that actually does
 * something — used to disappear from the only screen the user is shown.
 */
export function wrapCardLine(text: string, width: number): string[] {
  const budget = Math.max(8, width);
  if (displayWidth(text) <= budget) return [text];
  const rows: string[] = [];
  let row = "";
  let rowWidth = 0;
  for (const char of text) {
    const charCols = charWidth(char);
    if (row && rowWidth + charCols > budget) {
      rows.push(row);
      row = "";
      rowWidth = 0;
    }
    row += char;
    rowWidth += charCols;
  }
  rows.push(row);
  return rows;
}

/** One connector-supplied field: the label sits on the first row, wrapped rows stay aligned. */
function fieldRows(label: string, text: string, contentWidth: number): string[] {
  const first = ` ${label.padEnd(LABEL_COLUMN, " ")}`;
  const rest = " ".repeat(CONTENT_INDENT);
  return wrapCardLine(text, contentWidth).map(
    (row, index) => `│${index === 0 ? first : rest}${row}`,
  );
}

/**
 * The script block: wrapped rows, head kept, tail *always* kept.
 *
 * A script's payload is normally its last statement, so a card that only shortens from the bottom
 * shows a harmless comment and hides the `fetch`. Beyond the row budget the block is split into head
 * (identity line + start) and tail with a stated omission in between — the shape the connector's own
 * preview already uses, preserved here instead of being flattened into "first N lines".
 */
function detailRows(summary: string, contentWidth: number): string[] {
  const text = summary && summary.trim() ? summary : "(no summary)";
  const rows = text.split("\n").flatMap((line) => wrapCardLine(line, contentWidth));
  const first = ` ${"detail".padEnd(LABEL_COLUMN, " ")}`;
  const rest = " ".repeat(CONTENT_INDENT);
  const withPrefix = (row: string, index: number) =>
    `│${index === 0 ? first : rest}${row}`;
  if (rows.length <= DETAIL_MAX_ROWS) return rows.map(withPrefix);

  const omission = (hidden: number) => `…（中间 ${hidden} 行未显示，以下是脚本结尾）`;
  // The note itself costs rows, so reserve them before splitting what is left.
  const reserved = wrapCardLine(omission(rows.length), contentWidth).length;
  const budget = Math.max(4, DETAIL_MAX_ROWS - reserved);
  const headCount = Math.max(2, Math.floor(budget * DETAIL_HEAD_SHARE));
  const tailCount = Math.max(2, budget - headCount);
  const hidden = rows.length - headCount - tailCount;
  return [
    ...rows.slice(0, headCount),
    ...wrapCardLine(omission(hidden), contentWidth),
    ...rows.slice(rows.length - tailCount),
  ].map(withPrefix);
}

/**
 * The card itself. Every value is connector-supplied (`actionLabel`, `origin`, `summary`,
 * `expiresAt`); this function only lays them out. `summary` arrives already clipped to
 * `HOST_APPROVAL_SUMMARY_LIMIT` by the flow, and is wrapped — never clipped — to the terminal width,
 * so approving the card never means approving text that was cut off the screen.
 */
export function renderHostApprovalCardLines(
  card: HostApprovalCard,
  opts: { now: number; columns?: number },
): string[] {
  const columns = Math.max(20, opts.columns ?? FALLBACK_COLUMNS);
  // Two columns stay free on the right: the frame row is clipped at `columns - 1`, and a wrapped row
  // must never reach that clip or the wrapping would reintroduce the truncation it exists to remove.
  const contentWidth = Math.max(16, columns - CONTENT_INDENT - 2);
  const expired = card.expiresAt <= opts.now;
  const expiryLabel = expired
    ? "expired — this action was not run and will not be retried"
    : `${formatApprovalRemaining(card.expiresAt, opts.now)} left`;
  const lines = [
    "┌─ Browser action needs your approval ─────────────",
    ...fieldRows("action", card.actionLabel, contentWidth),
    ...fieldRows("site", card.origin || "(origin unknown)", contentWidth),
    ...detailRows(card.summary, contentWidth),
    ...fieldRows("expires", expiryLabel, contentWidth),
    // The precondition comes first so it reads before the options: with text in the composer, y/n
    // are ordinary letters and the card cannot be answered.
    ...fieldRows(
      "keys",
      expired
        ? "disabled (expired)"
        : "empty the input line first, then: y = allow once · n / Esc = deny",
      contentWidth,
    ),
    "└──────────────────────────────────────────────────",
  ];
  return lines.map((line) => clipCardLine(line, columns));
}

/** One card on screen at a time; `handleKey` routes y/n/Esc to it. */
type ActiveCard = {
  card: HostApprovalCard;
  finish(decision: HostApprovalDecision): void;
};

export type InlineHostApprovalPrompt = {
  /** The renderer handed to `registerHostApprovalRenderer()`. */
  awaitHostApproval: HostApprovalRenderer;
  /**
   * Called before the composer sees the key. Returns true when the key belonged to the card and must
   * not reach the draft buffer / submit path.
   *
   * `draftEmpty` keeps normal typing intact: with text in the composer, `y`/`n` are just letters.
   * `busy` keeps Esc meaning "stop the running turn" — a pending card must not shadow that.
   */
  handleKey(sequence: string, context: { draftEmpty: boolean; busy: boolean }): boolean;
  /** Drop everything: pending cards resolve to `deny` so no tool call can hang on shutdown. */
  dispose(): void;
  /** Cards queued or currently displayed (tests). */
  pendingCount(): number;
};

export function createInlineHostApprovalPrompt(args: {
  write(text: string): void;
  now?: () => number;
  columns?: () => number;
  /** Injectable timers so a test can drive expiry without waiting. */
  setTimeoutImpl?: (fn: () => void, ms: number) => unknown;
  clearTimeoutImpl?: (handle: unknown) => void;
}): InlineHostApprovalPrompt {
  const now = args.now ?? Date.now;
  const columns = args.columns ?? (() => FALLBACK_COLUMNS);
  const setTimeoutImpl =
    args.setTimeoutImpl ?? ((fn: () => void, ms: number) => setTimeout(fn, ms));
  const clearTimeoutImpl =
    args.clearTimeoutImpl ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  const queue = createHostApprovalCardQueue();
  let active: ActiveCard | null = null;
  let expiryTimer: unknown = null;
  let disposed = false;

  const clearExpiryTimer = () => {
    if (expiryTimer !== null) {
      clearTimeoutImpl(expiryTimer);
      expiryTimer = null;
    }
  };

  /**
   * Settle the active card exactly once.
   *
   * `finish` lives in `finally` on purpose: `write` reaches a real terminal/pTY and can throw
   * (closed stdout, dead writer). The old order (clear state → write → resolve) meant such a throw
   * left the promise pending forever, `dispose()` could no longer see the card, and the queue behind
   * it never advanced — one broken write wedged every later approval.
   */
  const settle = (decision: HostApprovalDecision, note: string) => {
    if (!active) return;
    const finishing = active;
    active = null;
    clearExpiryTimer();
    try {
      args.write(`${note}\n`);
    } catch {
      // Losing the label is acceptable; losing the settlement is not.
    } finally {
      finishing.finish(decision);
    }
  };

  const presentOne = (card: HostApprovalCard): Promise<HostApprovalDecision> =>
    new Promise<HostApprovalDecision>((resolve) => {
      if (disposed) {
        resolve("deny");
        return;
      }
      active = { card, finish: resolve };
      try {
        const lines = renderHostApprovalCardLines(card, { now: now(), columns: columns() });
        args.write(`${lines.join("\n")}\n`);
      } catch {
        // The user was never shown the action, so nothing may be approved: deny and let the queue
        // present the next card instead of waiting for an answer to a card that does not exist.
        settle("deny", "⌛ approval could not be shown — the action was not run");
        return;
      }
      const remaining = card.expiresAt - now();
      if (remaining <= 0) {
        // Already past its window: say so and let the flow report USER_APPROVAL_EXPIRED (it will not
        // retry, because the submitted decision comes back rejected/expired).
        settle("deny", "⌛ approval expired — the action was not run");
        return;
      }
      expiryTimer = setTimeoutImpl(() => {
        expiryTimer = null;
        settle("deny", "⌛ approval expired — the action was not run");
      }, remaining);
    });

  return {
    awaitHostApproval: (card) => queue.present(card, presentOne),
    handleKey(sequence, context) {
      if (!active || disposed) return false;
      const keys = sequence;
      const isAllow = ALLOW_KEYS.has(keys);
      const isDeny = DENY_KEYS.has(keys);
      const isEscape = ESCAPE_KEYS.has(keys);
      if (!isAllow && !isDeny && !isEscape) return false;
      // Never steal a letter the user is typing into the composer.
      if (!context.draftEmpty) return false;
      // Esc during a running turn keeps its "stop the turn" meaning.
      if (isEscape && context.busy) return false;
      if (active.card.expiresAt <= now()) {
        settle("deny", "⌛ approval expired — the action was not run");
        return true;
      }
      settle(
        isAllow ? "allow_once" : "deny",
        isAllow ? "✔ allowed once (this action only)" : "✖ denied",
      );
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearExpiryTimer();
      if (active) {
        const finishing = active;
        active = null;
        finishing.finish("deny");
      }
    },
    pendingCount: () => queue.size(),
  };
}

export { HOST_APPROVAL_SUMMARY_LIMIT };
