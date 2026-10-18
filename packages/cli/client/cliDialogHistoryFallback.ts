// packages/cli/client/cliDialogHistoryFallback.ts
//
// Continue-dialog history loading with a remote fallback.
//
// `readDialogMessages` only sees this machine's LevelDB. Resuming a dialog that
// was created on another machine therefore yields [] and the model starts from
// zero — even though the TUI shows the history, because that path reads the
// server (`loadDialogHistoryForDisplay` → `readDialogSnapshot`).
//
// This loader keeps the local-first behaviour (a *verified complete* local
// history never hits the network) and otherwise fetches the full message list
// from the current server.
//
// - Auth / base URL reuse the existing CLI helpers (`cliEnvHelpers`) — no new
//   configuration.
// - Messages are mapped with the shared `dialogMessageRecordToAgentRuntimeMessage`
//   so tool calls / tool results / reasoning survive the round trip (a
//   role+content-only projection would drop them and break tool-call replay).
// - A successful remote load is written back into the local store idempotently
//   (every message keeps its own stable id, so re-running the load overwrites
//   the same keys instead of appending duplicates) and the coverage verdict is
//   persisted in `cliDialogHistoryState`. Without that, turn 2 would see a
//   non-empty local store and silently drop everything written before the
//   resume.
// - The completeness marker is bound to «the local store covers the remote
//   prefix» (verified by reading the store back), never to «local has messages».
//   A remote restore that could not run/verify leaves the dialog explicitly
//   incomplete, so later turns keep retrying instead of treating the messages
//   saved by the failed turn as a complete history.
// - Records are classified before they are trusted: records that are expected to
//   be skipped (system rows, tombstones) are dropped silently, while
//   damaged/truncated chat records — including orphan tool results and tool
//   calls without their result, the signature of a paginated or half-written
//   history — are reported on the result (`source: "partial"`) and in the
//   completeness state, never as a successful restore.
// - A failed fallback (network / unauthenticated / 404) never throws: it returns
//   empty history with `source: "none"` (or the local history with
//   `source: "partial"`) so the caller sees an explicit "history not complete"
//   signal instead of a silent new dialog.

import { toErrorMessage } from "core/errorMessage";
import { isRecord } from "core/isRecord";
import type {
  AgentRuntimeChatMessage,
  AgentRuntimeDialogHistoryLoadResult,
} from "../../agent-runtime";
import { dialogMessageRecordToAgentRuntimeMessage } from "../../agent-runtime";
import { findAgentStatePairingIssues } from "../../agent-runtime/openAiCompatibleMessages";
import { dialogMessageKey } from "../../database/keys";
import { isTombstoneRecord } from "../../database/tombstones";
import type { CliFetchImpl } from "../cliFetch";
import { resolveAuthToken, resolveServerUrl } from "../cliEnvHelpers";
import {
  readDialogMessageRecords,
  readDialogMessages,
  type LocalDialogMessageRecordEntry,
} from "./cliLocalAgentRecordReader";
import {
  readCliDialogHistoryState,
  writeCliDialogHistoryState,
  type CliDialogHistoryState,
} from "./cliDialogHistoryState";
import type { HybridRecordStore } from "./hybridRecordStore";
import { remoteDialogSyncTimeout } from "./localRuntimeHelpers";
import { fetchWithTransientRetry } from "./localRuntimeFetchRetry";

type EnvLike = Record<string, string | undefined>;

/** Runtime message roles that are part of the chat history. */
const CHAT_ROLES = new Set(["user", "assistant", "tool"]);

/** Record that is expected to be skipped, as opposed to a damaged one. */
export type RemoteHistoryIgnoredRecord = {
  /**
   * `deleted-message` = tombstone (both the server read and the local read skip
   * tombstones by design); `system-message` = system rows (never persisted by
   * the local write plan, dropped by both converters).
   */
  code: "deleted-message" | "system-message";
  detail?: string;
};

/**
 * Something wrong with the history itself: a damaged record, or a recognisable
 * truncation (orphan tool result / tool call whose counterpart is missing).
 * Any issue means the restore must not be reported as a clean one.
 */
export type RemoteHistoryIssue = {
  code:
    | "malformed-record"
    | "unknown-role"
    | "malformed-content"
    | "malformed-tool-calls"
    | "missing-message-id"
    | "missing-created-at"
    | "unconvertible-record"
    | "duplicate-message-id"
    | "tool-pairing";
  detail?: string;
};

/** One history entry: store key, stable message id and the raw record. */
export type RemoteHistoryEntry = {
  key: string;
  messageId: string;
  record: Record<string, unknown>;
};

export type RemoteHistoryWriteEntry = RemoteHistoryEntry & {
  message: AgentRuntimeChatMessage;
};

export type RemoteDialogHistoryAnalysis = {
  /** Chronological, de-duplicated, ready-to-write entries. */
  entries: RemoteHistoryWriteEntry[];
  messages: AgentRuntimeChatMessage[];
  ignored: RemoteHistoryIgnoredRecord[];
  issues: RemoteHistoryIssue[];
  /** true only when nothing was damaged, dropped or truncated. */
  complete: boolean;
};

function isChatRole(value: unknown): boolean {
  return typeof value === "string" && CHAT_ROLES.has(value);
}

/**
 * Load a dialog's history, local-first with a remote fallback.
 *
 * Returns the messages plus the source so the caller can distinguish a real
 * local/remote load from a degraded one:
 *   `local`   — local history known to cover the remote prefix (no network).
 *   `remote`  — full remote history fetched, written locally and verified, with
 *               no damage found in the source records.
 *   `partial` — history returned but not a clean full restore (damaged or
 *               truncated remote records, or a fallback that could not run).
 *   `none`    — no history available at all.
 */
export async function loadCliDialogHistoryWithSource(args: {
  store: HybridRecordStore;
  dialogId: string;
  env: EnvLike;
  fetchImpl?: CliFetchImpl;
  /** Diagnostic sink (best-effort; never affects the result). */
  log?: (message: string) => void;
}): Promise<AgentRuntimeDialogHistoryLoadResult> {
  const { store, dialogId } = args;
  const localMessages = await readDialogMessages({ store, dialogId });
  const localState = await readCliDialogHistoryState({ store, dialogId });

  // Local-first: only a local history *known* to cover the remote prefix keeps
  // working offline without a network round trip. "Local has messages" is
  // explicitly not enough — that is exactly the state a resumed-on-another-
  // machine dialog is left in after a failed fallback (see
  // `cliDialogHistoryState` for the marker semantics).
  if (localMessages.length > 0 && localState?.complete === true) {
    if (localState.reason === "remote-damaged") {
      // Coverage holds, but the restored source history was already damaged /
      // truncated. Re-fetching cannot repair it, so keep working from the local
      // copy — while still surfacing that the history is not pristine.
      args.log?.(
        `[cli] dialog history for ${dialogId} was restored damaged ` +
          `(${localState.issueCount ?? 0} finding(s)); using the local history (source: local)`,
      );
    }
    return { messages: localMessages, source: "local" };
  }

  // `fetchRemoteDialogMessageRecords` needs both; without them nothing can be
  // restored. Do not record the local history as incomplete either — that would
  // re-probe a server this machine cannot talk to on every single turn.
  const authToken = resolveAuthToken(args.env);
  const base = resolveServerUrl(args.env);
  if (!authToken || !base) {
    if (localMessages.length > 0) {
      return {
        messages: localMessages,
        // An already-failed restore stays incomplete; an unconfigured machine
        // simply has nothing to verify the local history against.
        source: localState?.complete === false ? "partial" : "local",
      };
    }
    await persistIncompleteState({ store, dialogId, log: args.log });
    args.log?.(
      `[cli] dialog history unavailable for ${dialogId} (no auth token / server url; source: none)`,
    );
    return { messages: [], source: "none" };
  }

  let analysis: RemoteDialogHistoryAnalysis | null = null;
  try {
    const records = await fetchRemoteDialogMessageRecords({
      base,
      dialogId,
      authToken,
      fetchImpl: args.fetchImpl ?? fetch,
    });
    analysis = analyzeRemoteDialogRecords({ records, dialogId });
  } catch (error) {
    // Falling back is best-effort: a network error, a missing permission or a
    // 404 means "no history available here", not "abort the turn".
    args.log?.(
      `[cli] dialog history remote fallback failed for ${dialogId}: ${toErrorMessage(error)}`,
    );
  }

  if (!analysis || analysis.messages.length === 0) {
    if (analysis && analysis.issues.length > 0) {
      args.log?.(
        `[cli] dialog history incomplete for ${dialogId}: no usable remote message ` +
          `(${describeIssues(analysis.issues)})`,
      );
    }
    // A failed (or empty) fallback must leave a durable "incomplete" verdict:
    // this turn is about to save its own messages locally, and without the
    // marker the next turn would mistake that for a complete history.
    await persistIncompleteState({ store, dialogId, log: args.log });
    if (localMessages.length > 0) {
      args.log?.(
        `[cli] dialog history incomplete for ${dialogId}: remote fallback unavailable, ` +
          `keeping ${localMessages.length} local message(s) (source: partial)`,
      );
      return { messages: localMessages, source: "partial" };
    }
    args.log?.(`[cli] dialog history unavailable for ${dialogId} (source: none)`);
    return { messages: [], source: "none" };
  }

  return await restoreRemoteHistory({
    store,
    dialogId,
    analysis,
    log: args.log,
  });
}

/**
 * Write the fetched remote history locally (idempotently) and bind the
 * completeness marker to the verified coverage of the remote prefix.
 */
async function restoreRemoteHistory(args: {
  store: HybridRecordStore;
  dialogId: string;
  analysis: RemoteDialogHistoryAnalysis;
  log?: (message: string) => void;
}): Promise<AgentRuntimeDialogHistoryLoadResult> {
  const { store, dialogId, analysis } = args;

  // Local view *before* the write: it may hold messages the server does not have
  // yet (a turn saved while the push failed). They are never overwritten and
  // must stay in the history handed to the model.
  const localBefore = await readLocalEntries(store, dialogId);

  // 1) Idempotent write-back: a stable message id per record means re-running
  //    the same load overwrites the same keys instead of appending duplicates.
  let writeError: unknown = null;
  try {
    if (analysis.entries.length > 0) {
      await store.batch(
        analysis.entries.map((entry) => ({
          type: "put" as const,
          key: entry.key,
          value: entry.record,
        })),
      );
    }
  } catch (error) {
    writeError = error;
  }

  // 2) Coverage check: read the store back and require every remote message id
  //    to be present. Only that proves «local covers the remote prefix» — the
  //    marker below is bound to this, not to "the store has messages".
  const localAfter = await readLocalEntries(store, dialogId);
  const storedIds = new Set(localAfter.map((entry) => entry.messageId));
  const missing = analysis.entries.filter((entry) => !storedIds.has(entry.messageId));
  const covered = missing.length === 0;
  const cleanRestore = covered && analysis.complete;

  // 3) Completeness marker. `complete` = coverage (the local store now holds the
  //    remote prefix, so later turns must not re-fetch); `reason` records how it
  //    went, including «the source history itself was damaged».
  const newestRemoteId = analysis.entries[analysis.entries.length - 1]?.messageId;
  const state: CliDialogHistoryState = {
    complete: covered,
    reason: !covered
      ? "remote-unavailable"
      : analysis.complete
        ? "remote-verified"
        : "remote-damaged",
    ...(newestRemoteId ? { coversRemoteUpTo: newestRemoteId } : {}),
    messageCount: localAfter.length,
    ...(analysis.issues.length > 0 ? { issueCount: analysis.issues.length } : {}),
    updatedAt: Date.now(),
  };
  if (!(await writeCliDialogHistoryState({ store, dialogId, state }))) {
    args.log?.(
      `[cli] dialog history completeness state not persisted for ${dialogId}; ` +
        "the next resume will verify against the server again",
    );
  }

  if (writeError) {
    args.log?.(
      `[cli] dialog history write-back failed for ${dialogId}: ${toErrorMessage(writeError)}`,
    );
  }
  if (analysis.issues.length > 0) {
    args.log?.(
      `[cli] dialog history incomplete for ${dialogId} (source: partial): ` +
        describeIssues(analysis.issues),
    );
  } else if (!covered) {
    args.log?.(
      `[cli] dialog history not verified locally for ${dialogId}: ` +
        `${missing.length} remote message(s) missing after write-back (source: partial)`,
    );
  }

  // 4) History handed to the model: the union of what the server returned and
  //    what this machine already had, in the store's own key order so the next
  //    turn's local read returns the very same sequence.
  const merged = mergeHistoryEntries({
    local: localBefore,
    remote: analysis.entries,
  });
  return {
    messages: entriesToMessages(merged),
    source: cleanRestore ? "remote" : "partial",
  };
}

async function readLocalEntries(
  store: HybridRecordStore,
  dialogId: string,
): Promise<RemoteHistoryEntry[]> {
  let entries: LocalDialogMessageRecordEntry[] = [];
  try {
    entries = await readDialogMessageRecords({ store, dialogId });
  } catch {
    return [];
  }
  return entries.map((entry) => ({
    key: entry.key,
    messageId: entry.messageId,
    record: entry.record,
  }));
}

/**
 * Union of local and remote messages keyed by store key, in key order.
 *
 * The remote record wins on collision (it is the server's current copy of the
 * same message id); local-only messages (saved here but not pushed yet) are
 * kept so a resumed turn cannot lose the previous turn's context.
 *
 * Exported for tests.
 */
export function mergeHistoryEntries(args: {
  local: readonly RemoteHistoryEntry[];
  remote: readonly RemoteHistoryEntry[];
}): RemoteHistoryEntry[] {
  const byKey = new Map<string, RemoteHistoryEntry>();
  for (const entry of args.local) byKey.set(entry.key, entry);
  for (const entry of args.remote) byKey.set(entry.key, entry);
  return [...byKey.values()].sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
}

function entriesToMessages(
  entries: readonly RemoteHistoryEntry[],
): AgentRuntimeChatMessage[] {
  const messages: AgentRuntimeChatMessage[] = [];
  for (const entry of entries) {
    const message = dialogMessageRecordToAgentRuntimeMessage(entry.record);
    if (message) messages.push(message);
  }
  return messages;
}

async function persistIncompleteState(args: {
  store: HybridRecordStore;
  dialogId: string;
  log?: (message: string) => void;
}): Promise<void> {
  const persisted = await writeCliDialogHistoryState({
    store: args.store,
    dialogId: args.dialogId,
    state: {
      complete: false,
      reason: "remote-unavailable",
      updatedAt: Date.now(),
    },
  });
  if (!persisted) {
    args.log?.(
      `[cli] dialog history completeness state not persisted for ${args.dialogId}`,
    );
  }
}

function describeIssues(issues: readonly RemoteHistoryIssue[]): string {
  const rendered = issues.map((issue) =>
    issue.detail ? `${issue.code}(${issue.detail})` : issue.code,
  );
  return rendered.length > 4
    ? `${rendered.slice(0, 4).join(", ")} (+${rendered.length - 4} more)`
    : rendered.join(", ");
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function resolveCreatedAtMs(record: Record<string, unknown>): number | null {
  const raw = record.createdAt;
  const ms =
    typeof raw === "number"
      ? raw
      : typeof raw === "string"
        ? Date.parse(raw)
        : Number.NaN;
  return Number.isFinite(ms) ? ms : null;
}

/** `content` must be text, parts or absent — anything else cannot be replayed. */
function isChatContentShaped(content: unknown): boolean {
  return (
    content === undefined ||
    content === null ||
    typeof content === "string" ||
    Array.isArray(content)
  );
}

/**
 * Classify the server's records into writable history + skipped records +
 * damaged/truncated findings.
 *
 * The distinction the caller needs is «expected to be skipped» vs «the history
 * itself is wrong»: dropping the former is normal (both the server read and the
 * local read drop system rows / tombstones), while the latter must be reported
 * instead of being silently converted into a "successful restore".
 *
 * Exported for tests.
 */
export function analyzeRemoteDialogRecords(args: {
  records: readonly unknown[];
  dialogId: string;
}): RemoteDialogHistoryAnalysis {
  const entries: RemoteHistoryWriteEntry[] = [];
  const ignored: RemoteHistoryIgnoredRecord[] = [];
  const issues: RemoteHistoryIssue[] = [];
  const seenIds = new Set<string>();
  // Chronological ordinal (the input is newest-first), used only to derive a
  // stable fallback id for a record that lost its own id. Counting from the
  // oldest message keeps it stable when newer messages are appended.
  let ordinal = 0;

  for (let index = args.records.length - 1; index >= 0; index -= 1) {
    const raw = args.records[index];
    if (!isRecord(raw)) {
      issues.push({ code: "malformed-record", detail: `index ${index}` });
      continue;
    }
    if (isTombstoneRecord(raw)) {
      ignored.push({
        code: "deleted-message",
        detail: asNonEmptyString(raw.id) ?? `index ${index}`,
      });
      continue;
    }
    const role = raw.role;
    if (role === "system") {
      ignored.push({ code: "system-message" });
      continue;
    }
    if (!isChatRole(role)) {
      issues.push({
        code: "unknown-role",
        detail: typeof role === "string" ? `role ${role}` : `index ${index}`,
      });
      continue;
    }
    ordinal += 1;

    if (!isChatContentShaped(raw.content)) {
      // Damaged payload: keep the record (the projection degrades to "") but report it.
      issues.push({ code: "malformed-content", detail: `${role} index ${index}` });
    }
    if (
      "tool_calls" in raw &&
      raw.tool_calls !== undefined &&
      !Array.isArray(raw.tool_calls)
    ) {
      issues.push({ code: "malformed-tool-calls", detail: `${role} index ${index}` });
    }

    const ownId = asNonEmptyString(raw.id);
    const createdAtMs = resolveCreatedAtMs(raw);
    if (!ownId) {
      issues.push({ code: "missing-message-id", detail: `${role} index ${index}` });
    }
    if (createdAtMs === null) {
      issues.push({ code: "missing-created-at", detail: `${role} index ${index}` });
    }
    // Stable id: the server's own id when present, otherwise derived from the
    // timestamp + chronological position so repeated loads overwrite the same
    // key (a random id would duplicate messages on every resume).
    const messageId =
      ownId ?? `${createdAtMs ?? 0}-${String(ordinal).padStart(3, "0")}`;

    if (seenIds.has(messageId)) {
      issues.push({ code: "duplicate-message-id", detail: messageId });
      continue;
    }
    seenIds.add(messageId);

    const key = dialogMessageKey(args.dialogId, messageId);
    const record: Record<string, unknown> = {
      ...raw,
      id: messageId,
      dbKey: key,
      ...(asNonEmptyString(raw.dialogId) ? {} : { dialogId: args.dialogId }),
    };
    const message = dialogMessageRecordToAgentRuntimeMessage(record);
    if (!message) {
      issues.push({ code: "unconvertible-record", detail: `${role} index ${index}` });
      continue;
    }
    entries.push({ key, messageId, record, message });
  }

  const messages = entries.map((entry) => entry.message);
  // Tool call / result pairing: a truncated head shows up as an orphan tool
  // result, a truncated (or interrupted) tail as a tool call without its
  // result. Reuses the outbound-replay validator so the pairing rules have a
  // single source of truth instead of a second copy here.
  for (const detail of findAgentStatePairingIssues(messages)) {
    issues.push({ code: "tool-pairing", detail });
  }

  return { entries, messages, ignored, issues, complete: issues.length === 0 };
}

/**
 * Fetch the raw message records for a dialog from the current server.
 *
 * Uses `/rpc/getConvMsgs` (the same messages-only read the TUI display path
 * uses) and falls back to the `/api/dialog-read` bridge on 401/403, which some
 * machines authorize differently (machine token vs. bearer JWT).
 *
 * `limit: 0` = unbounded, matching the local full-history read.
 */
async function fetchRemoteDialogMessageRecords(args: {
  base: string;
  dialogId: string;
  authToken: string;
  fetchImpl: CliFetchImpl;
}): Promise<unknown[]> {
  const headers = {
    Authorization: `Bearer ${args.authToken}`,
    "Content-Type": "application/json",
  };
  // Bound the whole fallback (retries included) so a hung server cannot stall
  // the turn; retries stay bounded by the shared transient-retry budget.
  const signal = AbortSignal.timeout(remoteDialogSyncTimeout());
  const res = await fetchWithTransientRetry(
    args.fetchImpl,
    `${args.base}/rpc/getConvMsgs`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ dialogId: args.dialogId, limit: 0 }),
      signal,
    },
  );
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      return await fetchRemoteDialogMessageRecordsViaBridge({
        ...args,
        headers,
        signal,
      });
    }
    throw Object.assign(new Error(`getConvMsgs failed: HTTP ${res.status}`), {
      status: res.status,
    });
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchRemoteDialogMessageRecordsViaBridge(args: {
  base: string;
  dialogId: string;
  fetchImpl: CliFetchImpl;
  headers: Record<string, string>;
  signal: AbortSignal;
}): Promise<unknown[]> {
  const res = await fetchWithTransientRetry(
    args.fetchImpl,
    `${args.base}/api/dialog-read`,
    {
      method: "POST",
      headers: args.headers,
      body: JSON.stringify({ dialogId: args.dialogId, limit: 0 }),
      signal: args.signal,
    },
  );
  if (!res.ok) {
    throw Object.assign(new Error(`dialog-read failed: HTTP ${res.status}`), {
      status: res.status,
    });
  }
  const payload = await res.json();
  if (!isRecord(payload) || payload.ok !== true) {
    throw new Error(
      `dialog-read failed: ${String((payload as { error?: unknown })?.error ?? "unknown error")}`,
    );
  }
  return Array.isArray(payload.msgs) ? payload.msgs : [];
}

/**
 * Convert raw dialog message records into runtime messages.
 *
 * The server returns newest-first (`fetchMessages` uses `reverse: true`), while
 * the local store iterator is oldest-first, so iterate backwards to keep the
 * model's history chronological.
 *
 * Exported for tests.
 */
export function convertRemoteDialogRecordsToMessages(
  records: readonly unknown[],
  dialogId = "",
): AgentRuntimeChatMessage[] {
  return analyzeRemoteDialogRecords({ records, dialogId }).messages;
}
