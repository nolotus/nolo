/**
 * The TUI's in-conversation approval card.
 *
 * A connector action that needs consent used to force the user into a browser popup. This module
 * keeps the question where the work is happening: the card is written into the transcript stream
 * (not a separate window, not a full-screen modal), and the host submits the answer straight to the
 * connector through `submit_approval_decision` — the model is never asked, and cannot answer.
 *
 * Deliberate non-goals:
 *  - inline presentation uses the same DialogHost keyboard owner as ask/secret;
 *    legacy standalone callers may still omit the host;
 *  - it does NOT remember anything: one card = one action, no "always allow";
 *  - styling stays minimal on purpose: one frame, no colour. Long values (and the script itself) wrap
 *    at the terminal width instead of being clipped, because the only copy of the code the user can
 *    inspect is this card when `hostApproval` is set.
 */
import type {
  HostApprovalCard,
  HostApprovalRenderer,
  HostApprovalResult,
  HostApprovalContext,
} from "../client/hostApprovalFlow";
import {
  createHostApprovalCardQueue,
  formatApprovalRemaining,
  HOST_APPROVAL_SUMMARY_LIMIT,
} from "../client/hostApprovalFlow";
import type { DialogHost } from "./dialogHost";
import { displayWidth } from "./tuiAnsi";
import { safeApprovalMultilineText, safeApprovalSingleLineText } from "./askTextSanitize";
import { renderDialogRule } from "./dialogFrame";
import { describeBrowserApproval } from "../client/browserApprovalCopy";

const SELECT_ALLOW = new Set(["\x1b[C", "\x1bOC"]);
const SELECT_CANCEL = new Set(["\x1b[D", "\x1bOD"]);
const ENTER = new Set(["\r", "\n"]);
/** The workspace decoder emits a lone ESC as "\x1b"; a fast double press arrives as "\x1b\x1b". */
const ESCAPE_KEYS = new Set(["\x1b", "\x1b\x1b", "\x1b[27~"]);

const FALLBACK_COLUMNS = 80;
/** Columns a field label occupies in the card: " action    ", " detail    ". */
const LABEL_COLUMN = 9;
/** Indent: one space + the label column. */
const CONTENT_INDENT = LABEL_COLUMN + 1;
/** Terminal rows the script block may occupy (head + omission note + tail). */
const DETAIL_MAX_ROWS = 15;
/** Share of those rows that goes to the head, where the length + sha256 identity line sits. */
const DETAIL_HEAD_SHARE = 0.4;
/**
 * 单元格宽度一律走共享的 `tuiAnsi.displayWidth`：本模块曾自带一份宽度模型
 * （`WIDE_CHAR` 正则只认 CJK/韩文/全角），与共享实现形成第二份真值——
 * emoji（`😀`）在那份模型里算 1 列、实际 2 列，裁剪后的行会超出预算、
 * 顶破卡片右边界并在终端折行；wide 约定（EA=A 占 2 列）下更是整卡错位。
 *
 * 按**字素簇**遍历（不是按码点）：`👨‍👩‍👧`、`👍🏽`、`⚠️` 这类组合序列必须整体计量，
 * 逐码点切分会把 ZWJ 序列拆成两半、宽度算错。
 */
const graphemeSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** 按字素簇逐段回调，供裁剪/折行共用（宽度用共享 displayWidth 量）。 */
function eachGrapheme(text: string, visit: (segment: string, cells: number) => boolean | void): void {
  for (const { segment } of graphemeSegmenter.segment(text)) {
    if (visit(segment, displayWidth(segment)) === false) return;
  }
}

/** 裁剪时改用省略号收尾；它的宽度随约定变化（`…` 是 EA=A，wide 下 2 列），必须实测预留。 */
const CLIP_ELLIPSIS = "…";

/** Clip one frame row to `columns` columns so the border cannot wrap into a wall. */
export function clipCardLine(text: string, columns: number): string {
  const budget = Math.max(8, columns - 1);
  if (displayWidth(text) <= budget) return text;
  // 预留量按省略号的真实格数算：写死 1 列会在 wide 约定下（`…` 占 2 列）
  // 让结果正好顶到 `columns`，突破本函数「不超过 columns - 1」的不变量。
  const reserve = displayWidth(CLIP_ELLIPSIS);
  let kept = "";
  let width = 0;
  eachGrapheme(text, (segment, cells) => {
    if (width + cells > budget - reserve) return false;
    kept += segment;
    width += cells;
  });
  return `${kept}${CLIP_ELLIPSIS}`;
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
  eachGrapheme(text, (segment, cells) => {
    if (row && rowWidth + cells > budget) {
      rows.push(row);
      row = "";
      rowWidth = 0;
    }
    row += segment;
    rowWidth += cells;
  });
  rows.push(row);
  return rows;
}

/**
 * Word-aware wrapping for prose lines (title, impact, hints) so English words
 * don't split mid-word ("E" / "xact"), while long unbroken tokens still fall
 * back cleanly to grapheme-exact wrapping via `wrapCardLine`.
 */
function wrapProseLine(text: string, width: number): string[] {
  const budget = Math.max(8, width);
  if (displayWidth(text) <= budget) return [text];
  const tokens = text.split(/(\s+)/);
  const rows: string[] = [];
  let row = "";
  let rowWidth = 0;

  const pushRow = () => {
    if (row) {
      rows.push(row.trimEnd());
      row = "";
      rowWidth = 0;
    }
  };

  for (const token of tokens) {
    if (!token) continue;
    if (/^\s+$/.test(token)) {
      if (!row) continue;
      const spaceWidth = displayWidth(token);
      if (rowWidth + spaceWidth <= budget) {
        row += token;
        rowWidth += spaceWidth;
      } else {
        pushRow();
      }
      continue;
    }
    const tokenWidth = displayWidth(token);
    if (row && rowWidth + tokenWidth > budget) {
      pushRow();
    }
    if (tokenWidth <= budget) {
      row += token;
      rowWidth += tokenWidth;
    } else {
      const broken = wrapCardLine(token, budget);
      for (let i = 0; i < broken.length - 1; i++) {
        rows.push(broken[i]);
      }
      row = broken[broken.length - 1];
      rowWidth = displayWidth(row);
    }
  }
  pushRow();
  return rows.length ? rows : [""];
}

/** One connector-supplied field: the label sits on the first row, wrapped rows stay aligned. */
function fieldRows(
  label: string,
  text: string,
  contentWidth: number,
): string[] {
  const first = ` ${label.padEnd(LABEL_COLUMN, " ")}`;
  const rest = " ".repeat(CONTENT_INDENT);
  return wrapCardLine(text, contentWidth).map(
    (row, index) => `${index === 0 ? first : rest}${row}`,
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
function detailRows(
  summary: string,
  contentWidth: number,
): string[] {
  const text = summary && summary.trim() ? summary : "(no summary)";
  const rows = text.split("\n").flatMap((line) => wrapCardLine(line, contentWidth));
  const first = ` ${"detail".padEnd(LABEL_COLUMN, " ")}`;
  const rest = " ".repeat(CONTENT_INDENT);
  const withPrefix = (row: string, index: number) =>
    `${index === 0 ? first : rest}${row}`;
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

/** Render connector data only after stripping terminal controls and bidi overrides. */
export function renderHostApprovalCardLines(
  card: HostApprovalCard,
  opts: { now: number; columns?: number },
): string[] {
  const columns = Math.max(20, opts.columns ?? FALLBACK_COLUMNS);
  const contentWidth = Math.max(1, columns - CONTENT_INDENT - 2);
  const expired = card.expiresAt <= opts.now;
  const isMcp = card.actionLabel === "callMcpTool";
  // Classify the original action, not a normalized approximation of an unknown action.
  const copy = describeBrowserApproval(card.actionLabel, safeApprovalSingleLineText(card.target));
  const detail = safeApprovalMultilineText(card.summary);
  const heading = isMcp ? "Call a read tool (callMcpTool)" : copy.action;
  const impact = isMcp ? "A connected service will receive the shown arguments." : copy.impact;
  const browserParts = !isMcp
    ? [
        safeApprovalSingleLineText(card.browser),
        safeApprovalSingleLineText(card.tabId) ? `tab ${safeApprovalSingleLineText(card.tabId)}` : "",
      ].filter(Boolean)
    : [];
  const actionBar = " ❯ Cancel (Enter)     Allow once (→ then Enter)";
  const actionRows = displayWidth(actionBar) <= columns - 1
    ? [actionBar]
    : [
        ...wrapProseLine("❯ Cancel (Enter)", columns - 2).map((line) => ` ${line}`),
        ...wrapProseLine("Allow once (→ then Enter)", columns - 4).map((line) => `   ${line}`),
      ];
  const lines = [
    renderDialogRule(columns, false),
    ...wrapProseLine(heading, columns - 2).map((line) => ` ${line}`),
    "",
    ...fieldRows("target", isMcp ? safeApprovalSingleLineText(card.target) || "Unknown tool" : copy.target, contentWidth),
    ...fieldRows(isMcp ? "scope" : "site", safeApprovalSingleLineText(card.origin) || (isMcp ? "Unknown scope" : "Unknown site"), contentWidth),
    ...(browserParts.length ? fieldRows("browser", browserParts.join(" · "), contentWidth) : []),
    ...wrapProseLine(impact, contentWidth).map((row, index) => `${index === 0 ? ` ${"impact".padEnd(LABEL_COLUMN, " ")}` : " ".repeat(CONTENT_INDENT)}${row}`),
    ...(detail ? ["", ...detailRows(detail, contentWidth)] : []),
    "",
    ...(expired ? [
      ...fieldRows("expired", "This action was not run and will not be retried.", contentWidth),
      ...fieldRows("keys", "disabled", contentWidth),
    ] : [
      ...fieldRows("expires", `${formatApprovalRemaining(card.expiresAt, opts.now)} left`, contentWidth),
      ...wrapProseLine("With an empty input line:", columns - 2).map((line) => ` ${line}`),
      ...actionRows,
    ]),
    renderDialogRule(columns, false),
  ];
  return lines.map((line) => clipCardLine(line, columns));
}

/** One card on screen at a time; Allow requires explicit selection then Enter. */
type ActiveCard = {
  card: HostApprovalCard;
  allowSelected: boolean;
  finish(decision: HostApprovalResult): void;
};

export type InlineHostApprovalPrompt = {
  /** The renderer handed to `registerHostApprovalRenderer()`. */
  awaitHostApproval: HostApprovalRenderer;
  /**
   * Called before the composer sees the key. Returns true when the key belonged to the card and must
   * not reach the draft buffer / submit path.
   *
   * `draftEmpty` keeps selection and confirmation out of a non-empty composer.
   * `busy` keeps Esc meaning "stop the running turn" — a pending card must not shadow that.
   */
  handleKey(sequence: string, context: { draftEmpty: boolean; busy: boolean }): boolean;
  /** Whether this prompt currently owns input (not merely queued behind another dialog). */
  isActive(): boolean;
  /** Cancel pending cards so no tool call can hang on shutdown. */
  dispose(): void;
  /** Cards queued or currently displayed (tests). */
  pendingCount(): number;
};

export function createInlineHostApprovalPrompt(args: {
  write(text: string): void;
  dialogHost?: DialogHost;
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

  const queue = createHostApprovalCardQueue({ now, setTimeoutImpl, clearTimeoutImpl });
  const shutdown = new AbortController();
  let active: ActiveCard | null = null;
  let disposed = false;

  /**
   * Settle the active card exactly once.
   *
   * `finish` lives in `finally` on purpose: `write` reaches a real terminal/pTY and can throw
   * (closed stdout, dead writer). The old order (clear state → write → resolve) meant such a throw
   * left the promise pending forever, `dispose()` could no longer see the card, and the queue behind
   * it never advanced — one broken write wedged every later approval.
   */
  const settle = (decision: HostApprovalResult, note: string) => {
    if (!active) return;
    const finishing = active;
    active = null;
    try {
      args.write(`${note}\n`);
    } catch {
      // Losing the label is acceptable; losing the settlement is not.
    } finally {
      finishing.finish(decision);
    }
  };

  const presentOne = (card: HostApprovalCard, context: HostApprovalContext = {}): Promise<HostApprovalResult> =>
    new Promise<HostApprovalResult>((resolve) => {
      if (disposed || context.signal?.aborted) {
        resolve(disposed ? "deny" : "cancelled");
        return;
      }
      const abort = () => settle(context.signal?.reason === "expired" ? "expired" : "cancelled", "✖ approval ended — the action was not run");
      active = { card, allowSelected: false, finish: result => {
        context.signal?.removeEventListener("abort", abort);
        resolve(result);
      } };
      context.signal?.addEventListener("abort", abort, { once: true });
      try {
        const lines = renderHostApprovalCardLines(card, { now: now(), columns: columns() });
        args.write(`${lines.join("\n")}\n`);
      } catch {
        // The user was never shown the action, so nothing may be approved: deny and let the queue
        // present the next card instead of waiting for an answer to a card that does not exist.
        settle("deny", "⌛ approval could not be shown — the action was not run");
        return;
      }

    });

  return {
    awaitHostApproval: (card, context = {}) => {
      const signal = context.signal ? AbortSignal.any([context.signal, shutdown.signal]) : shutdown.signal;
      return queue.present(card, (next, lifetime = {}) => args.dialogHost
        ? args.dialogHost.withKeyboard(() => presentOne(next, lifetime), {
            signal: lifetime.signal!, cancelled: () => "cancelled" as HostApprovalResult,
          })
        : presentOne(next, lifetime), { ...context, signal });
    },
    isActive: () => active !== null,
    handleKey(sequence, context) {
      if (!active || disposed) return false;
      const isConfirm = ENTER.has(sequence);
      const selectAllow = SELECT_ALLOW.has(sequence);
      const selectCancel = SELECT_CANCEL.has(sequence);
      const isEscape = ESCAPE_KEYS.has(sequence);
      if (!context.draftEmpty || !(isConfirm || selectAllow || selectCancel || isEscape)) {
        // Any intervening input disarms Allow, even if the user later clears their draft.
        if (active.allowSelected) {
          active.allowSelected = false;
          try { args.write("  Cancel selected (default).\n"); } catch { /* Allow is already disarmed. */ }
        }
        return false;
      }
      if (isEscape && context.busy) {
        active.allowSelected = false;
        return false;
      }
      if (active.card.expiresAt <= now()) {
        settle("expired", "⌛ approval expired — the action was not run");
        return true;
      }
      if (selectAllow || selectCancel) {
        if (active.allowSelected !== selectAllow) {
          active.allowSelected = false;
          try {
            args.write(selectAllow
              ? "  Allow once selected · Enter confirms · ← selects Cancel\n"
              : "  Cancel selected · Enter cancels\n");
            active.allowSelected = selectAllow;
          } catch {
            settle("deny", "✖ selection could not be shown — the action was not run");
          }
        }
        return true;
      }
      const isAllow = isConfirm && active.allowSelected;
      settle(
        isAllow ? "allow_once" : "deny",
        isAllow ? "✔ allowed once (this action only)" : "✖ denied",
      );
      return true;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      shutdown.abort();
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
