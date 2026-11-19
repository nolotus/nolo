/**
 * In-conversation approval for connector actions (host-side half of the gate).
 *
 * The connector never grants anything by itself: an action that needs consent answers
 * `USER_APPROVAL_PENDING` + an `approvalId`, and that id is a *lookup key*, not a credential.
 * Until now the only way to turn the key was a browser popup (`approve.html`). This module lets the
 * host (the TUI) ask the user *in the conversation* and submit the decision straight to the
 * connector over `submit_approval_decision` — the model never sees, produces or relays a decision.
 *
 * Everything the card shows comes from the connector (`list_pending_approvals`); nothing here
 * composes a description of the action, so a model cannot make a destructive action look harmless by
 * wording its own tool arguments.
 *
 * The module is deliberately transport-free and pure enough to unit test: `runConnectorToolWithHostApproval`
 * takes an `execute` function and a small `HostApprovalConnector` port, so a fake connector can pin
 * "allowed retries exactly once", "deny never retries", "expired never retries" and "no host approval
 * injected ⇒ behaviour unchanged".
 */
import type {
  AgentRuntimeToolCallInput,
  AgentRuntimeToolResult,
} from "../../agent-runtime";
import type { ChromeConnectorClient } from "../../desktop-chrome-connector/chromeConnector";

/** The only two answers a host may produce. No "always allow" — one approval covers one action. */
export type HostApprovalDecision = "allow_once" | "deny";
/** Presentation outcomes are not permissions; only allow_once may reach the authority. */
export type HostApprovalResult = HostApprovalDecision | "cancelled" | "expired" | "unavailable";
/** In-process port. IPC must transmit only these owner IDs/deadline, never the signal or secrets.
 * The transport must bind requestId to its own AbortController and revoke it on disconnect.
 * A terminal request cannot be resumed: callers must create a new confirmation after expiry.
 */
export type HostApprovalContext = {
  requestId?: string;
  dialogId?: string;
  turnId?: string;
  runId?: string;
  signal?: AbortSignal;
  expiresAt?: number;
};

/** Hard cap on the summary the card shows (multi-line, see clipApprovalSummary). */
export const HOST_APPROVAL_SUMMARY_LIMIT = 2_500;

/**
 * Upper-bound guard on the connector-supplied summary — *not* a second preview.
 *
 * The connector already builds the preview (2,000-char budget, identity line first, head + stated
 * omission + tail) and that text is passed through untouched; this limit only exists so a connector
 * that sends something absurd cannot fill the transcript. It is deliberately above the connector's
 * own budget, so in practice it never fires.
 *
 * The rules it has to keep, both learned the hard way:
 *  - line breaks are kept. Collapsing `// 注释\nfetch(...)` to one line turned a script whose second
 *    statement was a `fetch` into what read as a lone comment — the card showed text that was never
 *    the text being approved;
 *  - a cut is stated *and* the tail survives. The old version ended at 160 characters with a bare
 *    `…`, so the payload at the end of a long script simply did not exist as far as the reader was
 *    concerned.
 */
export function clipApprovalSummary(
  text: string,
  limit = HOST_APPROVAL_SUMMARY_LIMIT,
): string {
  const value = String(text ?? "").replace(/\r\n?/g, "\n").trim();
  if (value.length <= limit) return value;
  const tailChars = Math.max(1, Math.round(limit * 0.3));
  const headChars = Math.max(1, limit - tailChars);
  const head = value.slice(0, headChars);
  const tail = value.slice(value.length - tailChars);
  const omitted = value.length - head.length - tail.length;
  return `${head}\n…（中间 ${omitted} 字符未显示，以下是结尾；全文 ${value.length} 字符）…\n${tail}`;
}

/**
 * What the host renders. Every field is connector-supplied:
 * `approvalId`/`action`/`tabId`/`origin`/`summary`/`expiresAt` from `list_pending_approvals`.
 */
export type HostApprovalCard = {
  approvalId: string;
  /** Connector action name (`click`, `type`, `eval_script`, …) — shown verbatim. */
  actionLabel: string;
  /** Connector-sanitized control name; never the typed input value. */
  target?: string;
  /** Tab origin the action targets. Empty string when the connector could not resolve one. */
  origin: string;
  /** Browser channel when known from the bound connector/bridge (`chrome` | `firefox`). */
  browser?: "chrome" | "firefox";
  /** Bound tab identifier when supplied by the connector. */
  tabId?: string;
  /** Connector-provided summary/script, passed through as-is (see clipApprovalSummary). */
  summary: string;
  /** Epoch ms. The host refuses and auto-denies once this is in the past. */
  expiresAt: number;
};

export type PendingHostApproval = HostApprovalCard;

/** What `submit_approval_decision` answered. `failed` = the approval was gone/expired/unknown. */
export type SubmitApprovalDecisionOutcome =
  | { status: "allowed" | "denied" }
  | { failed: string };

/**
 * The connector ops the flow needs. Kept as a port (not a `ChromeConnectorClient`) so tests never
 * touch 127.0.0.1 and so the flow cannot accidentally invent a third op.
 */
export type HostApprovalConnector = {
  listPendingApprovals(): Promise<PendingHostApproval[]>;
  submitApprovalDecision(
    approvalId: string,
    decision: HostApprovalDecision,
  ): Promise<SubmitApprovalDecisionOutcome>;
};

/* clipApprovalSummary is defined next to HOST_APPROVAL_SUMMARY_LIMIT above: it keeps line breaks
 * and states any cut, instead of folding a script into one sentence. */

/**
 * `expiresAt` may arrive as epoch ms, epoch seconds or an ISO string depending on the connector
 * build; normalise to epoch ms and return undefined for anything unusable.
 */
export function toEpochMs(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    // < 1e11 is ~1973 in ms, so a value that small can only be seconds.
    return value < 1e11 ? Math.round(value * 1000) : Math.round(value);
  }
  if (typeof value === "string" && value.trim()) {
    const asNumber = Number(value);
    if (Number.isFinite(asNumber)) return toEpochMs(asNumber);
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

/** Remaining window in ms (never negative). */
export function remainingApprovalMs(expiresAt: number, now: number): number {
  return Math.max(0, expiresAt - now);
}

/** Compact "42s" / "3m10s" remaining-time label for the card. */
export function formatApprovalRemaining(expiresAt: number, now: number): string {
  const totalSeconds = Math.ceil(remainingApprovalMs(expiresAt, now) / 1000);
  if (totalSeconds <= 0) return "0s";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m${seconds}s` : `${seconds}s`;
}

function isRecordLike(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalises one `list_pending_approvals` entry. Entries without an id or a resolvable expiry are
 * dropped: presenting a card whose window we cannot honour would be worse than not presenting it.
 */
function normalizePendingApproval(raw: unknown): PendingHostApproval | null {
  if (!isRecordLike(raw)) return null;
  const approvalId = asTrimmedString(raw.approvalId);
  const expiresAt = toEpochMs(raw.expiresAt ?? raw.expiresAtMs);
  if (!approvalId || expiresAt === undefined) return null;
  const tabId = asTrimmedString(raw.tabId);
  return {
    approvalId,
    actionLabel: asTrimmedString(raw.action) || "unknown",
    ...(asTrimmedString(raw.target) ? { target: asTrimmedString(raw.target) } : {}),
    origin: asTrimmedString(raw.origin),
    // Passed through verbatim (the connector's preview already has the identity line, the head and
    // the stated tail); only an upper-bound guard may touch it, see clipApprovalSummary.
    summary: clipApprovalSummary(asTrimmedString(raw.summary)),
    expiresAt,
    ...(tabId ? { tabId } : {}),
  };
}

/**
 * Reads the two shapes a pending verdict can reach the host in:
 *  - a domain verdict inside a successful call: `{"ok":true,"result":{"ok":false,"code":"USER_APPROVAL_PENDING",…}}`
 *  - a connector error: `{"ok":false,"error":{"code":"USER_APPROVAL_PENDING","details":{…}}}`
 */
export function parsePendingApprovalResult(
  result: AgentRuntimeToolResult,
): { approvalId: string; action: string; expiresAt?: number; message?: string } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.content);
  } catch {
    return null;
  }
  if (!isRecordLike(parsed)) return null;
  const errorBlock = isRecordLike(parsed.error) ? parsed.error : undefined;
  const details = isRecordLike(errorBlock?.details) ? errorBlock.details : undefined;
  const verdict = isRecordLike(parsed.result) ? parsed.result : undefined;
  const candidates = [verdict, errorBlock, details].filter(isRecordLike);
  // The pending code can sit on the verdict or on the error envelope while the fields the card needs
  // (`approvalId`, `action`, expiry) sit in `details` — so read each field from the first place that
  // actually carries it instead of assuming one block is complete.
  const pending = candidates.find((entry) => entry.code === "USER_APPROVAL_PENDING");
  if (!pending) return null;
  const ordered = [pending, details, verdict].filter(isRecordLike);
  const readField = (key: string): string => {
    for (const entry of ordered) {
      const value = asTrimmedString(entry[key]);
      if (value) return value;
    }
    return "";
  };
  const approvalId = readField("approvalId");
  if (!approvalId) return null;
  let expiresAt: number | undefined;
  for (const entry of ordered) {
    const candidate = toEpochMs(entry.expiresAt ?? entry.expiresAtMs);
    if (candidate !== undefined) {
      expiresAt = candidate;
      break;
    }
  }
  const message = readField("message");
  return {
    approvalId,
    action: readField("action"),
    ...(expiresAt !== undefined ? { expiresAt } : {}),
    ...(message ? { message } : {}),
  };
}

/**
 * Rebuilds the original call with the approval lookup key attached. Only the outer JSON object is
 * rewritten; every other argument (target, selector, expression, timeoutMs) must reach the connector
 * byte-for-byte, or the retry would be approved for one action and execute another.
 */
export function withApprovalId(
  call: AgentRuntimeToolCallInput,
  approvalId: string,
): AgentRuntimeToolCallInput {
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(call.arguments || "{}");
    payload = isRecordLike(parsed) ? { ...parsed } : {};
  } catch {
    // Unparseable arguments: leave them alone so the retry fails the same way the first call did.
    return call;
  }
  payload.approvalId = approvalId;
  return { ...call, arguments: JSON.stringify(payload) };
}

/**
 * Ask the connector to keep the approval in the host instead of opening a browser window.
 *
 * The extension reads `hostApproval: true` on an `eval_script`/click/type request and, instead of
 * opening `approve.html`, only creates the pending record — the host then answers it in the
 * conversation. Keep it set even without a renderer: with no renderer there is nobody
 * to ask, so the request stays pending until expiry without any browser fallback.
 */
export function withHostApprovalRequest(
  call: AgentRuntimeToolCallInput,
): AgentRuntimeToolCallInput {
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(call.arguments || "{}");
    payload = isRecordLike(parsed) ? { ...parsed } : {};
  } catch {
    // Unparseable arguments: leave them alone so the request fails the same way it would anyway.
    return call;
  }
  payload.hostApproval = true;
  return { ...call, arguments: JSON.stringify(payload) };
}

/**
 * Wraps the two connector ops behind the `HostApprovalConnector` port.
 *
 * `getClient` is lazy: a call that never needs approval must not create (or hand-shake) a client.
 * Both ops read the connector's own answer verbatim; no local state, no cache, no auto-allow.
 */
export function createConnectorApprovalPort(
  getClient: () => ChromeConnectorClient,
): HostApprovalConnector {
  return {
    async listPendingApprovals() {
      const raw = await getClient().request("list_pending_approvals", {});
      const list = isRecordLike(raw) && Array.isArray(raw.approvals) ? raw.approvals : [];
      return list
        .map(normalizePendingApproval)
        .filter((entry): entry is PendingHostApproval => entry !== null);
    },
    async submitApprovalDecision(approvalId, decision) {
      try {
        const raw = await getClient().request("submit_approval_decision", {
          approvalId,
          decision,
        });
        if (isRecordLike(raw) && raw.ok === false) {
          return { failed: asTrimmedString(raw.code) || "USER_APPROVAL_REJECTED" };
        }
        const status = isRecordLike(raw) && raw.status === "denied" ? "denied" : "allowed";
        return { status };
      } catch (error) {
        const code = asTrimmedString((error as { code?: unknown })?.code);
        return { failed: code || "CHROME_CONNECTOR_ERROR" };
      }
    },
  };
}

function approvalFailure(
  code: string,
  message: string,
  action: string,
  extra?: Record<string, unknown>,
): AgentRuntimeToolResult {
  return {
    content: JSON.stringify({ ok: false, error: { code, message } }),
    metadata: { chromeConnector: true, error: true, code, action, ...(extra ?? {}) },
  };
}

/**
 * The whole "pending → host decision → submit → retry once" flow.
 *
 * Contract pins that the tests lock down:
 *  - no `awaitHostApproval` injected (non-TTY, old host) ⇒ the original `USER_APPROVAL_PENDING`
 *    result is returned untouched, without executing or opening any browser fallback;
 *  - `allow_once` ⇒ submit, then re-run the *same* call with `approvalId` exactly once. A second
 *    pending verdict is returned as-is — no loop, no escalation;
 *  - `deny` ⇒ submit the denial and answer `USER_APPROVAL_DENIED`; the action is never retried;
 *  - expired (host clock past `expiresAt`, or the connector answers
 *    `USER_APPROVAL_EXPIRED`/`USER_APPROVAL_REJECTED` on submit) ⇒ no retry at all;
 *  - the approval is not in the pending list ⇒ treated as expired (nothing to present, nothing
 *    granted).
 */
export async function runConnectorToolWithHostApproval(args: {
  call: AgentRuntimeToolCallInput;
  execute(call: AgentRuntimeToolCallInput): Promise<AgentRuntimeToolResult>;
  connector: HostApprovalConnector;
  awaitHostApproval?: HostApprovalRenderer;
  signal?: AbortSignal;
  context?: HostApprovalContext;
  now?: () => number;
}): Promise<AgentRuntimeToolResult> {
  // With a host renderer installed the answer is taken in the conversation, so the connector must
  // not also open a browser window: `hostApproval: true` makes it create the pending record only.
  // No renderer ⇒ pending only. The flag also suppresses popups on older connectors.
  const first = await args.execute(
    withHostApprovalRequest(args.call),
  );
  const pending = parsePendingApprovalResult(first);
  if (!pending || !args.awaitHostApproval) return first;
  const now = args.now ?? Date.now;

  let listed: PendingHostApproval[];
  try {
    listed = await args.connector.listPendingApprovals();
  } catch {
    // Cannot build a card from connector data ⇒ do not invent one. Hand the pending verdict back
    // unchanged so the host falls back to its previous behaviour instead of guessing.
    return first;
  }
  const card = listed.find((entry) => entry.approvalId === pending.approvalId);
  if (!card) {
    return approvalFailure(
      "USER_APPROVAL_EXPIRED",
      "审批已过期或不再待批，动作未执行。",
      args.call.name,
    );
  }
  if (card.expiresAt <= now()) {
    return approvalFailure("USER_APPROVAL_EXPIRED", "审批已过期，动作未执行。", args.call.name);
  }

  const signal = args.signal ?? args.context?.signal;
  if (signal?.aborted) return approvalFailure("USER_APPROVAL_CANCELLED", "审批已取消，动作未执行。", args.call.name);
  const decision = await args.awaitHostApproval(card, { ...args.context, requestId: card.approvalId, signal, expiresAt: card.expiresAt });
  const ended = () => signal?.aborted ? "USER_APPROVAL_CANCELLED"
    : card.expiresAt <= now() ? "USER_APPROVAL_EXPIRED" : undefined;
  const failure = ended() ?? (decision === "cancelled" ? "USER_APPROVAL_CANCELLED"
    : decision === "expired" ? "USER_APPROVAL_EXPIRED"
    : decision === "unavailable" ? "USER_APPROVAL_UNAVAILABLE" : undefined);
  // Revoke this exact pending record for negative or stale answers, including
  // a late allow racing abort/expiry. Never leave a live popup able to grant it.
  if (failure || decision !== "allow_once") {
    await args.connector.submitApprovalDecision(card.approvalId, "deny");
  }
  if (failure) return approvalFailure(failure, "审批已结束，动作未执行。", args.call.name);

  if (decision !== "allow_once") {
    return approvalFailure("USER_APPROVAL_DENIED", "用户已拒绝", args.call.name, {
      approvalId: card.approvalId,
    });
  }

  const submitted = await args.connector.submitApprovalDecision(card.approvalId, "allow_once");
  if ("failed" in submitted) {
    return approvalFailure(
      submitted.failed,
      submitted.failed === "USER_APPROVAL_EXPIRED"
        ? "审批已过期，动作未执行。"
        : "审批决定未被连接器接受，动作未执行。",
      args.call.name,
      { approvalId: card.approvalId },
    );
  }
  if (submitted.status === "denied") {
    return approvalFailure("USER_APPROVAL_DENIED", "用户已拒绝", args.call.name, {
      approvalId: card.approvalId,
    });
  }
  const lateEnd = ended();
  if (lateEnd) return approvalFailure(lateEnd, "审批已结束，动作未执行。", args.call.name);
  // Exactly one retry: `execute` here is the raw executor, so a second pending verdict is returned
  // to the model instead of triggering another approval round.
  return args.execute(withApprovalId(args.call, card.approvalId));
}

/**
 * Host-side presentation queue: cards are shown one at a time in `expiresAt` ascending order, so
 * parallel tool calls that each hit the gate cannot stack into one unreadable blob, and the card
 * closest to expiring is the one the user answers first.
 */
export function createHostApprovalCardQueue(options: {
  now?: () => number;
  setTimeoutImpl?: (fn: () => void, ms: number) => unknown;
  clearTimeoutImpl?: (handle: unknown) => void;
} = {}) {
  const now = options.now ?? Date.now;
  const schedule = options.setTimeoutImpl ?? ((fn, ms) => setTimeout(fn, ms));
  const clear = options.clearTimeoutImpl ?? (handle => clearTimeout(handle as ReturnType<typeof setTimeout>));
  type Entry = { card: HostApprovalCard; present: HostApprovalRenderer; context: HostApprovalContext;
    resolve(result: HostApprovalResult): void; cleanup(): void; ended?: HostApprovalResult };
  const waiting: Entry[] = [];
  let active: Entry | undefined;
  const drain = async () => {
    if (active) return;
    while (waiting.length) {
      waiting.sort((a, b) => a.card.expiresAt - b.card.expiresAt);
      const entry = waiting.shift()!;
      active = entry;
      let result: HostApprovalResult = "unavailable";
      try { result = await entry.present(entry.card, entry.context); } catch { /* fail closed */ }
      entry.cleanup();
      active = undefined;
      entry.resolve(entry.ended ?? result);
    }
  };
  return {
    present(card: HostApprovalCard, present: HostApprovalRenderer, context: HostApprovalContext = {}): Promise<HostApprovalResult> {
      return new Promise(resolve => {
        const lifetime = new AbortController();
        let timer: unknown;
        const finish = (result: HostApprovalResult) => {
          if (entry.ended) return;
          entry.ended = result;
          lifetime.abort(result);
          const index = waiting.indexOf(entry);
          if (index >= 0) { waiting.splice(index, 1); entry.cleanup(); resolve(result); }
        };
        const abort = () => finish("cancelled");
        const entry: Entry = { card, present, resolve, context: { ...context, signal: lifetime.signal },
          cleanup() { context.signal?.removeEventListener("abort", abort); if (timer !== undefined) clear(timer); } };
        waiting.push(entry);
        context.signal?.addEventListener("abort", abort, { once: true });
        const remaining = Math.min(card.expiresAt, context.expiresAt ?? Infinity) - now();
        if (context.signal?.aborted) finish("cancelled");
        else if (remaining <= 0) finish("expired");
        else timer = schedule(() => finish("expired"), remaining);
        void Promise.resolve().then(drain);
      });
    },
    size: () => waiting.length + (active ? 1 : 0),
  };
}

/**
 * Late-bound host renderer.
 *
 * The chrome tool table is built deep inside the local runtime, long before (and far away from) the
 * TUI's composer/output plumbing, so the TUI registers its renderer here once per session and the
 * executor reads it *per call*. No renderer registered ⇒ `undefined` ⇒ the executor behaves exactly
 * safely (pending verdict returned, no browser fallback).
 */
export type HostApprovalRenderer = (
  card: HostApprovalCard,
  context?: HostApprovalContext,
) => Promise<HostApprovalResult>;

let registeredRenderer: HostApprovalRenderer | null = null;

/** Install (or clear, with `null`) the process-wide host renderer. Returns an uninstall function. */
export function registerHostApprovalRenderer(
  renderer: HostApprovalRenderer | null,
): () => void {
  registeredRenderer = renderer;
  return () => {
    if (registeredRenderer === renderer) registeredRenderer = null;
  };
}

export function getHostApprovalRenderer(): HostApprovalRenderer | undefined {
  return registeredRenderer ?? undefined;
}
