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
//   true — remote history was written locally and coverage verified.
//   false — a fallback failed or could not be verified; strict continuation
//           refuses local messages carrying this state.
//   absent — strict continuation accepts local messages without a network read.
// `remote-damaged` always blocks strict continuation, even if coverage holds.
// Non-strict callers still require verified coverage before skipping recovery.
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
  | "remote-unavailable";

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
