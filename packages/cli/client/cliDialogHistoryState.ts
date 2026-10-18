// packages/cli/client/cliDialogHistoryState.ts
//
// Per-dialog "is the *local* history complete?" marker for the CLI runtime.
//
// Why this exists (Finding 1 of the resume-history review): `readDialogMessages`
// only proves that *some* messages exist locally. A dialog resumed from another
// machine starts with an empty local store; the remote fallback fetches the
// history, but unless that fact is remembered, the next turn sees "local is
// non-empty" and short-circuits, so the model silently loses every message
// written before the resume. The completeness verdict therefore has to be its
// own persisted state, not an inference from `messages.length > 0`.
//
// Semantics of `complete`:
//   true  — the local store is known to cover the remote prefix (the messages
//           the server has). Only two writers may set it:
//             * the loader, after the full remote history was written locally
//               AND read back (verified coverage; `reason: "remote-verified"`,
//               `coversRemoteUpTo` = newest covered remote message id);
//             * the local writer, when the write *creates* the dialog record
//               (`reason: "local-origin"`) — a dialog born on this machine has
//               no earlier remote prefix.
//   false — the local history is known/assumed incomplete: a remote fallback
//           failed, was unauthenticated/404'd, or the write-back could not be
//           verified by reading the store back. The next resume must keep trying
//           the remote fallback instead of trusting whatever messages the failed
//           turn happened to save.
//           Note that a *damaged* source history (see `reason: "remote-damaged"`)
//           still counts as covered: everything the server has was written
//           locally, so re-fetching cannot repair it — the damage is reported on
//           the load result (`source: "partial"`) instead.
//   absent — nothing was ever recorded: treated as "not verified complete" so
//           pre-existing dialogs get one verifying fallback pass, and never as
//           evidence of completeness.
//
// The record is written with the local-only keyspace below and never synced to
// a server (it describes *this* machine's store). It deliberately does not use
// the `dialog-{dialogId}-msg-{id}` prefix, so it can never be mistaken for a
// message or widen the message range scan.

import type { HybridRecordStore } from "./hybridRecordStore";

/**
 * How the state was last decided. `remote-verified` / `remote-damaged` both mean
 * «the local store covers the remote prefix» — the difference is whether the
 * source history was itself clean or already damaged/truncated when restored
 * (reported to the caller as `source: "partial"`).
 */
export type CliDialogHistoryStateReason =
  | "remote-verified"
  | "remote-damaged"
  | "remote-unavailable"
  | "local-origin";

export type CliDialogHistoryState = {
  /**
   * true only when the local store is known to cover the remote prefix.
   * Anything else (false, malformed, absent record) means "unverified".
   */
  complete: boolean;
  reason: CliDialogHistoryStateReason;
  /** Newest remote message id the local store was verified to cover. */
  coversRemoteUpTo?: string;
  /** Local message count at decision time (diagnostics). */
  messageCount?: number;
  /** Damage/truncation findings of the last restore (diagnostics). */
  issueCount?: number;
  updatedAt: number;
};

const STATE_KEY_PREFIX = "cli-dialog-history-state";

/**
 * Local-only key of a dialog's completeness state.
 *
 * Out of the `dialog-…` keyspace on purpose: `isDialogRecordKey` / dialog range
 * scans parse `dialog-{userId}-{dialogId}`, and the message range is
 * `dialog-{dialogId}-msg-`, so any key under those prefixes would be picked up
 * by unrelated readers.
 */
export function cliDialogHistoryStateKey(dialogId: string): string {
  return `${STATE_KEY_PREFIX}-${dialogId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

/**
 * Read the persisted state, local-only (`remote: false`) so a marker lookup can
 * never author a network request or pull a stale server copy of this key.
 *
 * A malformed record is reported as `null` (= unverified), never as complete.
 */
export async function readCliDialogHistoryState(args: {
  store: HybridRecordStore;
  dialogId: string;
}): Promise<CliDialogHistoryState | null> {
  let raw: unknown = null;
  try {
    raw = await args.store.read(cliDialogHistoryStateKey(args.dialogId), {
      remote: false,
    });
  } catch {
    return null;
  }
  if (!isRecord(raw)) return null;
  if (typeof raw.complete !== "boolean") return null;
  const reason = typeof raw.reason === "string" ? raw.reason : "remote-unavailable";
  return {
    complete: raw.complete,
    reason: reason as CliDialogHistoryStateReason,
    ...(typeof raw.coversRemoteUpTo === "string" && raw.coversRemoteUpTo
      ? { coversRemoteUpTo: raw.coversRemoteUpTo }
      : {}),
    ...(typeof raw.messageCount === "number" && Number.isFinite(raw.messageCount)
      ? { messageCount: raw.messageCount }
      : {}),
    ...(typeof raw.issueCount === "number" && Number.isFinite(raw.issueCount)
      ? { issueCount: raw.issueCount }
      : {}),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : 0,
  };
}

/**
 * Persist the state. Best-effort by design: a marker write failure must never
 * fail the turn (the worst case is one more remote verification pass next turn),
 * so it reports the outcome instead of throwing.
 */
export async function writeCliDialogHistoryState(args: {
  store: HybridRecordStore;
  dialogId: string;
  state: CliDialogHistoryState;
}): Promise<boolean> {
  const key = cliDialogHistoryStateKey(args.dialogId);
  try {
    await args.store.write(key, {
      dbKey: key,
      dialogId: args.dialogId,
      ...args.state,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Mark a dialog *created by this write* as locally complete.
 *
 * Refuses to touch an existing state: once a state exists, this dialog went
 * through the remote-restore path and the loader owns the verdict (in
 * particular a `complete: false` left by a failed fallback must not be upgraded
 * by the fact that the turn afterwards saved its own messages).
 */
export async function markLocalDialogHistoryOriginComplete(args: {
  store: HybridRecordStore;
  dialogId: string;
  messageCount?: number;
}): Promise<boolean> {
  const existing = await readCliDialogHistoryState({
    store: args.store,
    dialogId: args.dialogId,
  });
  if (existing) return false;
  return await writeCliDialogHistoryState({
    store: args.store,
    dialogId: args.dialogId,
    state: {
      complete: true,
      reason: "local-origin",
      ...(typeof args.messageCount === "number"
        ? { messageCount: args.messageCount }
        : {}),
      updatedAt: Date.now(),
    },
  });
}
