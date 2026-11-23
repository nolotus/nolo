/**
 * Browser and MCP approvals share this host-only dialog.
 *
 * One card = one action, and the answer goes straight back to the connector through the host
 * renderer — the model is never asked and cannot answer. Non-goals that must stay non-goals:
 *  - no "always allow": every card is a fresh decision, nothing is remembered;
 *  - the decision is only taken from a human key press that the composer did not consume
 *    (empty draft, and no approval during a turn the user did not start);
 *  - the card shows the real payload (target, scope, arguments/script) because it is the only
 *    copy of the code the user can inspect before allowing it.
 * MCP invocations reach this card only after `permitsMcpRead` admitted the call
 * (packages/agent-runtime/mcpExecutionBridge.ts), which is why the MCP copy talks about a read.
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
import type { DialogAnchor, DialogHost } from "./dialogHost";
import { displayWidth } from "./tuiAnsi";
import { safeApprovalMultilineText, safeApprovalSingleLineText } from "./askTextSanitize";
import { renderDialogRow, renderDialogRule } from "./dialogFrame";
import { describeBrowserApproval } from "../client/browserApprovalCopy";

import { t } from "./i18n";
import { getTopReservedRows } from "./tuiLayout";
import { createDialogFramePainter, isArrowDown, isArrowUp, isSubmit, outputIsTty } from "./selectDialog";

const SELECT_ALLOW = new Set(["\x1b[C", "\x1bOC"]);
const SELECT_CANCEL = new Set(["\x1b[D", "\x1bOD"]);
/** Includes the workspace decoder's lone and double Escape tokens. */
const ESCAPE_KEYS = new Set(["\x1b", "\x1b\x1b", "\x1b[27~"]);
const PAGE_UP = "\x1b[5~";
const PAGE_DOWN = "\x1b[6~";

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
  opts: { now: number; columns?: number; allowFocused?: boolean; colorEnabled?: boolean; rows?: number; scroll?: number; onScroll?: (start: number) => void },
): string[] {
  const columns = Math.max(20, opts.columns ?? FALLBACK_COLUMNS);
  const contentWidth = Math.max(1, columns - CONTENT_INDENT - 2);
  const expired = card.expiresAt <= opts.now;
  const isMcp = card.actionLabel === "callMcpTool";
  // Classify the original action, not a normalized approximation of an unknown action.
  const copy = describeBrowserApproval(card.actionLabel, safeApprovalSingleLineText(card.target));
  const detail = safeApprovalMultilineText(card.summary);
  const heading = isMcp ? t("hostApprovalMcpHeading") : copy.action;
  const impact = isMcp ? t("hostApprovalMcpImpact") : copy.impact;
  const browserParts = !isMcp
    ? [
        safeApprovalSingleLineText(card.browser),
        safeApprovalSingleLineText(card.tabId) ? `tab ${safeApprovalSingleLineText(card.tabId)}` : "",
      ].filter(Boolean)
    : [];
  const body = [
    ...wrapProseLine(heading, columns - 2).map((line) => ` ${line}`),
    "",
    ...fieldRows("target", isMcp ? safeApprovalSingleLineText(card.target) || t("hostApprovalUnknownTool") : copy.target, contentWidth),
    ...fieldRows(isMcp ? "scope" : "site", safeApprovalSingleLineText(card.origin) || (isMcp ? t("hostApprovalUnknownScope") : "Unknown site"), contentWidth),
    ...(browserParts.length ? fieldRows("browser", browserParts.join(" · "), contentWidth) : []),
    ...wrapProseLine(impact, contentWidth).map((row, index) => `${index === 0 ? ` ${"impact".padEnd(LABEL_COLUMN, " ")}` : " ".repeat(CONTENT_INDENT)}${row}`),
    ...(detail ? ["", ...detailRows(detail, contentWidth)] : []),
  ];
  const footer = expired ? [
    ...fieldRows("expired", "This action was not run and will not be retried.", contentWidth),
    ...fieldRows("keys", "disabled", contentWidth),
  ] : [
    ...fieldRows("expires", `${formatApprovalRemaining(card.expiresAt, opts.now)} left`, contentWidth),
    ...wrapProseLine(t("hostApprovalKeys"), columns - 2).map(line => ` ${line}`),
  ];
  const rule = renderDialogRule(columns, false);
  const bodyBudget = (opts.rows ?? Infinity) - footer.length - (expired ? 0 : 2) - 2;
  let visibleBody = body;
  if (body.length > bodyBudget) {
    const pageSize = bodyBudget - 1;
    if (pageSize < 1) throw new Error("approval frame does not fit");
    // Keep the choice rows visible while paging the wrapped preview, including its folded tail.
    const start = Math.min(opts.scroll ?? 0, body.length - pageSize);
    const end = start + pageSize;
    opts.onScroll?.(start);
    visibleBody = [
      ...body.slice(start, end),
      ` PgUp/PgDn ${start + 1}–${end}/${body.length}`,
    ];
  } else {
    opts.onScroll?.(0);
  }
  return [
    ...[rule, ...visibleBody].map(line => clipCardLine(line, columns)),
    ...(!expired ? [
      renderDialogRow({ label: `[1] ${t("hostApprovalCancel")}`, focused: !opts.allowFocused }, opts.colorEnabled ?? false),
      renderDialogRow({ label: `[2] ${t("hostApprovalAllowOnce")}`, focused: !!opts.allowFocused }, opts.colorEnabled ?? false),
    ] : []),
    ...[...footer, rule].map(line => clipCardLine(line, columns)),
  ];
}

/** One card on screen at a time. */
type ActiveCard = {
  allowSelected: boolean;
  expiresAt: number;
  /** False when there is no live frame to redraw (non-TTY): arrows cannot show their effect. */
  interactive: boolean;
  repaint(): void;
  page(delta: number): boolean;
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
   * `busy` keeps Esc meaning "stop the running turn". Only the workspace may
   * opt in to answering during its active, non-aborted agent turn.
   */
  handleKey(sequence: string, context: { draftEmpty: boolean; busy: boolean; canApproveDuringTurn?: boolean }): boolean;
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
  output?: NodeJS.WritableStream;
  colorEnabled?: boolean;
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

  const settle = (decision: HostApprovalResult, note: string) => {
    if (!active) return;
    const finishing = active;
    active = null;
    finishing.finish(decision);
    try { args.write(`${note}\n`); } catch { /* A failed echo cannot change the decision. */ }
  };

  const presentOne = (card: HostApprovalCard, context: HostApprovalContext, anchor?: DialogAnchor): Promise<HostApprovalResult> =>
    new Promise(resolve => {
      if (disposed || context.signal?.aborted) {
        resolve(disposed ? "deny" : "cancelled");
        return;
      }
      const expiresAt = Math.min(card.expiresAt, context.expiresAt ?? Infinity);
      if (expiresAt <= now()) { resolve("expired"); return; }
      const abort = () => settle(context.signal?.reason === "expired" ? "expired" : "cancelled", "✖ approval ended — the action was not run");
      let scroll = 0;
      const render = (rows?: number): string => {
        const lines = renderHostApprovalCardLines({ ...card, expiresAt }, {
          now: now(), columns: columns(), allowFocused: current.allowSelected,
          colorEnabled: rows !== undefined && args.colorEnabled, rows, scroll,
          onScroll: start => { scroll = start; },
        });
        return lines.join("\n");
      };
      const output = args.output;
      const availableRows = () => anchor!.bottomRow() - getTopReservedRows(output!);
      const painter = anchor && output && outputIsTty(output) ? createDialogFramePainter({
        output, render: () => render(availableRows()), bottomAnchored: anchor.bottomAnchored,
        resolveBottomRow: anchor.bottomRow, session: anchor.session,
      }) : undefined;
      const failPaint = () => settle("unavailable", "✖ approval could not be shown (terminal too short or repaint failed) — the action was not run");
      const repaint = () => {
        if (active !== current) return;
        if (expiresAt <= now()) { settle("expired", "⌛ approval expired — the action was not run"); return; }
        try { painter?.paint(); } catch { failPaint(); }
      };
      const current: ActiveCard = {
        expiresAt, allowSelected: false, repaint, interactive: Boolean(painter),
        page(delta) {
          if (!painter) return false;
          // Page by a fraction of the available frame so consecutive views overlap.
          scroll = Math.max(0, scroll + delta * Math.max(1, Math.floor(availableRows() / 3)));
          repaint();
          return true;
        },
        finish(result) {
          context.signal?.removeEventListener("abort", abort);
          try { painter?.clear(); } catch { /* Still release the DialogHost session. */ }
          finally { resolve(result); }
        },
      };
      active = current;
      context.signal?.addEventListener("abort", abort, { once: true });
      anchor?.registerForegroundRepaint?.(repaint);
      if (painter) repaint();
      else {
        // Non-terminal callers can observe the initial card but have no display to repaint.
        try { args.write(`${render()}\n`); } catch { failPaint(); }
      }
    });

  return {
    awaitHostApproval: (card, context = {}) => {
      const signal = context.signal ? AbortSignal.any([context.signal, shutdown.signal]) : shutdown.signal;
      return queue.present(card, (next, lifetime = {}) => args.dialogHost
        ? args.dialogHost.run(anchor => presentOne(next, lifetime, anchor), {
            signal: lifetime.signal!, cancelled: () => "cancelled" as HostApprovalResult,
          })
        : presentOne(next, lifetime), { ...context, signal });
    },
    isActive: () => active !== null,
    handleKey(sequence, context) {
      const current = active;
      if (!current || disposed) return false;
      const confirm = isSubmit(sequence);
      const allow = isArrowDown(sequence) || SELECT_ALLOW.has(sequence);
      const cancel = isArrowUp(sequence) || SELECT_CANCEL.has(sequence);
      const escape = ESCAPE_KEYS.has(sequence);
      const digit = sequence === "1" || sequence === "2";
      const page = sequence === PAGE_UP || sequence === PAGE_DOWN;
      const setFocus = (allowFocused: boolean) => {
        if (current.allowSelected === allowFocused) return;
        if (current.interactive) {
          current.allowSelected = allowFocused;
          current.repaint();
          return;
        }
        // 没有可重绘的帧时（非 TTY/旧宿主），把焦点变化回显出来，否则屏幕上仍显示旧的选项
        // 而决定已经变了。回显失败就不给出「批准」：用户没看到的那一票不能算数。
        // 反向不成立——失败不能把已经说明的批准留下来，因此失败一律退回取消。
        try {
          args.write(` ${allowFocused ? t("hostApprovalAllowOnce") : t("hostApprovalCancel")} · ${t("hostApprovalConfirmHint")}\n`);
          current.allowSelected = allowFocused;
        } catch {
          current.allowSelected = false;
        }
      };
      if (page && current.page(sequence === PAGE_UP ? -1 : 1)) return true;
      if (!context.draftEmpty || (escape && context.busy) || !(confirm || allow || cancel || escape || digit)) {
        // Unclaimed input remains the composer's and disarms Allow.
        setFocus(false);
        return false;
      }
      if (current.expiresAt <= now()) {
        settle("expired", "⌛ approval expired — the action was not run");
        return true;
      }
      const mayApprove = !context.busy || context.canApproveDuringTurn === true;
      if (allow || cancel) {
        setFocus(allow && mayApprove);
        return true;
      }
      if (!mayApprove && sequence === "2") { setFocus(false); return true; }
      const approved = mayApprove && (sequence === "2" || (confirm && current.allowSelected));
      settle(approved ? "allow_once" : "deny", approved ? "✔ allowed once (this action only)" : "✖ denied");
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
