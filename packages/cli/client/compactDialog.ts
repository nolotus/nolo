import { createSummaryBudget, classifySummaryError } from "../../ai/context/summaryRouting";
import { isAbortError } from "../../core/abortError";
// packages/cli/client/compactDialog.ts
// HTTP-only compact helper for CLI TUI (no Redux store available).
// Summarize the source, then persist a self-contained fork context. Source
// cursors never apply to the new dialog; failures leave the caller on the source.

import { extractCustomId } from "core/prefix";
import { ulid } from "ulid";
import { parseUserIdFromAuthToken } from "../cliEnvHelpers";
import type { CliFetchImpl } from "../cliFetch";
import type { Message } from "../../chat/messages/types";
import { planCompression } from "../../ai/context/planCompression";
import { getModelContextWindow, findModelContextWindow, DEFAULT_CONTEXT_WINDOW } from "../../ai/llm/getModelContextWindow";
import { BUILTIN_DIALOG_LLM_FALLBACK_MODEL, BUILTIN_SUMMARY_LLM_CONFIG } from "../../chat/dialog/actions/builtinDialogLlm";
import { extractReferenceKeysFromMessage } from "../../chat/dialog/actions/extractReferenceKeys";
import {
  computeSummarySourceMetadata,
  buildHistoricalCompactionRequest,
  buildCompactionMetricsFromPlan,
  formatCompactionMetricsLog,
  type SummarySourceMessageInput,
} from "../../ai/context/compactionShared";

import { createManualCompactionSummaryCaller } from "./manualCompactionSummary";
import { getActiveDialogAgentId } from "../../chat/dialog/dialogAgents";
import {
  findSummaryAnchorIndex,
  validateStoredSummary,
  type LocalCompactionSummaryFallbackOptions,
} from "../../agent-runtime/localAutoCompaction";
import { dialogMessageRecordToAgentRuntimeMessage } from "../../agent-runtime/dialogMessageRecord";
import { orderDialogHistory } from "../../agent-runtime/dialogHistoryOrder";
import { readDialogMessageRecords } from "./cliLocalAgentRecordReader";
import { createCliHybridRecordStore, type HybridRecordStore } from "./hybridRecordStore";
import { getDefaultCliLocalRuntimeDb } from "../localRuntimeDb";

const DB_PATH = "/api/v1/db";

/**
 * Extract userId from an auth token (supporting 3-part JWT and 2-part profile tokens).
 * @internal - exported for testing only
 */
export function parseTokenUserId(token: string): string | null {
  const userId = parseUserIdFromAuthToken(token);
  return userId || null;
}

async function readDialogRecord(
  fetchImpl: CliFetchImpl,
  serverUrl: string,
  authToken: string,
  dialogKey: string
): Promise<Record<string, unknown>> {
  const res = await fetchImpl(`${serverUrl}${DB_PATH}/read/${dialogKey}`, {
    headers: { Authorization: `Bearer ${authToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to read dialog "${dialogKey}": HTTP ${res.status}`);
  }
  const data = await res.json();
  return data as Record<string, unknown>;
}

async function readDialogMessages(
  fetchImpl: CliFetchImpl,
  serverUrl: string,
  authToken: string,
  dialogId: string
): Promise<Message[]> {
  const res = await fetchImpl(`${serverUrl}/api/dialog-read`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ dialogId, limit: 0 }),
  });
  if (!res.ok) {
    throw new Error(`[nolo] compact: dialog-read failed: HTTP ${res.status}`);
  }
  const data = await res.json();
  if (!Array.isArray(data?.msgs)) throw new Error("[nolo] compact: invalid dialog history response");
  // dialog-read bridge delegates to fetchMessages (newest first). Planning
  // and source anchors require chronological order. Do not mutate the payload.
  return data.msgs.slice().reverse();
}

async function patchDialog(
  fetchImpl: CliFetchImpl,
  serverUrl: string,
  authToken: string,
  dialogKey: string,
  changes: Record<string, unknown>
): Promise<void> {
  // Server route (/api/v1/db/patch/:key) uses deepMerge(exist, body).
  // Send top-level changes directly (not nested under { data: changes })
  // matching canonical usage in scripts/verify/verifyDialogCrudAcrossServers.ts,
  // so fields like summary, summarizedBeforeId, and referenceKeys merge at root.
  const res = await fetchImpl(`${serverUrl}${DB_PATH}/patch/${dialogKey}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(changes),
  });
  if (!res.ok) {
    throw new Error(`Failed to patch dialog "${dialogKey}": HTTP ${res.status}`);
  }
}

/**
 * Fields carried forward from the source dialog into the fork.
 * Conversation references (referenceKeys) and configuration are preserved,
 * while dialog-local transcript cursors and compression metadata start clean.
 * Summary and pending history are explicitly assigned after compression.
 */
const FORKED_CARRY_FIELDS = [
  "cybots",
  "type",
  "title",
  "spaceId",
  "category",
  "referenceKeys",
  "triggerType",
  "schedule",
  "taskPrompt",
  "executionMode",
] as const;

function buildForkedDialogRecord(
  current: Record<string, unknown>,
  userId: string
): Record<string, unknown> & { dbKey: string; id: string } {
  const newId = ulid();
  const dbKey = `dialog-${userId}-${newId}`;
  const now = new Date().toISOString();

  // Explicitly pick only the allowed fields — never spread `current` wholesale.
  const carried: Record<string, unknown> = {};
  for (const field of FORKED_CARRY_FIELDS) {
    if (current[field] !== undefined) {
      carried[field] = current[field];
    }
  }

  return {
    ...carried,
    id: newId,
    dbKey,
    inheritedFromDialogKey: current.dbKey,
    inheritedFromDialogTitle: current.title,
    createdAt: now,
    updatedAt: now,
    // reset per-dialog stats
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
  };
}

async function writeDialogRecord(
  fetchImpl: CliFetchImpl,
  serverUrl: string,
  authToken: string,
  record: Record<string, unknown> & { dbKey: string }
): Promise<void> {
  const res = await fetchImpl(`${serverUrl}${DB_PATH}/write/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ data: record, customKey: record.dbKey }),
  });
  if (!res.ok) {
    throw new Error(
      `Failed to write forked dialog "${record.dbKey}": HTTP ${res.status}`
    );
  }
}

/**
 * Best-effort: register the forked dialog in the space sidebar.
 * Failure here is non-fatal since the dialog is already stored.
 */
async function addDialogToSpaceIfNeeded(
  fetchImpl: CliFetchImpl,
  serverUrl: string,
  authToken: string,
  record: Record<string, unknown> & { dbKey: string }
): Promise<void> {
  const rawSpaceId = record.spaceId;
  if (!rawSpaceId || typeof rawSpaceId !== "string") return;

  const normalizedSpaceId = rawSpaceId.startsWith("space-")
    ? rawSpaceId.slice("space-".length)
    : rawSpaceId;
  const spaceKey = `space-${normalizedSpaceId}`;
  const now = Date.now();

  const contentEntry = {
    title: typeof record.title === "string" ? record.title : record.id,
    type: "dialog",
    contentKey: record.dbKey,
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const res = await fetchImpl(`${serverUrl}${DB_PATH}/patch/${spaceKey}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ contents: { [record.dbKey]: contentEntry } }),
    });
    if (!res.ok) {
      console.warn(
        `[nolo] compact: addDialogToSpace failed for ${spaceKey}: HTTP ${res.status}`
      );
    }
  } catch (error) {
    console.warn(`[nolo] compact: addDialogToSpace error: ${error}`);
  }
}

export type CompactDialogResult = {
  dialogId: string;
  dialogKey: string;
  spaceId?: string;
  /** Whether a summary was generated and written back to the old dialog. */
  summaryGenerated: boolean;
  /** Number of messages folded into the summary (0 when no compression ran). */
  compactedMessageCount: number;
  /** The generated summary content when compression succeeded. */
  summary?: string;
};

/**
 * Summary LLM caller — injected so tests can mock and production wires in the
 * platform chat proxy. Mirrors the dependency-injection pattern from
 * `generateLocalDialogTitle`.
 */
export type SummaryLlmCaller = (content: string, options?: LocalCompactionSummaryFallbackOptions) => Promise<string | null>;

// Unknown summary model windows use a conservative boundary, not the dialog model window.
const SUMMARY_CONTEXT_WINDOW = Math.min(
  32_768,
  findModelContextWindow(BUILTIN_SUMMARY_LLM_CONFIG.model) ?? 32_768,
  findModelContextWindow(BUILTIN_DIALOG_LLM_FALLBACK_MODEL) ?? 32_768,
);

/**
 * Resolve the agent's context window from the dialog's cybots[0] agent record.
 * Falls back to DEFAULT_CONTEXT_WINDOW if the agent or model is unknown.
 */
async function resolveContextWindow(
  fetchImpl: CliFetchImpl,
  serverUrl: string,
  authToken: string,
  agentKey: string | undefined,
  localStore?: HybridRecordStore | null,
): Promise<number> {
  if (!agentKey) return DEFAULT_CONTEXT_WINDOW;
  try {
    const res = await fetchImpl(`${serverUrl}${DB_PATH}/read/${agentKey}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (res.ok) {
      const agent = await res.json();
      if (agent?.model) {
        return getModelContextWindow(agent.model) || DEFAULT_CONTEXT_WINDOW;
      }
    }
  } catch {
    // Best-effort — fall through to local store / default.
  }
  if (localStore) {
    try {
      const localAgent = await localStore.read(agentKey, { remote: false });
      if (localAgent?.model) {
        return getModelContextWindow(localAgent.model) || DEFAULT_CONTEXT_WINDOW;
      }
    } catch {
      // Best-effort — fall back to default.
    }
  }
  return DEFAULT_CONTEXT_WINDOW;
}

function parseRecordUpdatedAtMs(record: Record<string, unknown> | null | undefined): number {
  const raw = record?.updatedAt;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function isUsableDialogRecord(record: unknown): record is Record<string, unknown> {
  if (!record || typeof record !== "object") return false;
  const rec = record as Record<string, unknown>;
  return (
    typeof rec.id === "string" ||
    typeof rec.dbKey === "string" ||
    rec.type === "dialog" ||
    typeof rec.summary === "string" ||
    Array.isArray(rec.manualCompactHistory)
  );
}

function sortMessagesChronologically(messages: Message[]): Message[] {
  const ordered = orderDialogHistory(
    messages.map((raw, index) => {
      const parsed = dialogMessageRecordToAgentRuntimeMessage(raw);
      return {
        role: parsed?.role ?? ("user" as const),
        content: "",
        ...(parsed?.cliHistoryOrder !== undefined ? { cliHistoryOrder: parsed.cliHistoryOrder } : {}),
        ...(parsed?.createdAt !== undefined ? { createdAt: parsed.createdAt } : {}),
        id: typeof raw.id === "string" ? raw.id : parsed?.id,
        __index: index,
      };
    }),
  );
  return ordered.map((item) => messages[item.__index]!);
}

async function resolveCompactLocalStore(
  options: CompactDialogOptions,
  fetchImpl: CliFetchImpl,
): Promise<HybridRecordStore | null> {
  if (options.store) return options.store;
  if (!options.env || options.fetchImpl) return null;
  try {
    const db = await getDefaultCliLocalRuntimeDb({ env: options.env });
    return createCliHybridRecordStore({ db, env: options.env, fetchImpl });
  } catch {
    return null;
  }
}

export type CompactPhase = "reading" | "summarizing" | "forking";

export interface CompactDialogOptions {
  serverUrl: string;
  authToken: string;
  dialogId: string;
  userId?: string;
  fetchImpl?: CliFetchImpl;
  signal?: AbortSignal;
  env?: Record<string, string | undefined>;
  /** Optional local store override (used in CLI/tests without touching disk DB). */
  store?: HybridRecordStore;
  /** Injected LLM caller for summary generation. Production wires the platform chat proxy. */
  summaryLlmCaller?: SummaryLlmCaller;
  /** Progress phase callback (called at start of reading -> summarizing -> forking). */
  onProgress?: (phase: CompactPhase) => void;
}

/**
 * Summarize only the authorized current dialog, then publish a self-contained
 * fork with the summary and unsummarized suffix. Never inherit source cursors.
 * A failed read, summary or write rejects before the caller switches dialogs.
 */
export async function compactDialog(
  options: CompactDialogOptions
): Promise<CompactDialogResult> {
  const fetchImpl = options.fetchImpl ?? fetch;

  const userId = options.userId || parseTokenUserId(options.authToken);
  if (!userId) {
    throw new Error(
      "[nolo] compact: cannot compact — invalid or missing auth token"
    );
  }

  if (options.signal?.aborted) throw new DOMException("summary aborted", "AbortError");
  options.onProgress?.("reading");

  const localStore = await resolveCompactLocalStore(options, fetchImpl);
  const dialogKey = `dialog-${userId}-${options.dialogId}`;
  let remoteCurrent: Record<string, unknown> | null = null;
  let remoteReadError: unknown = null;
  try {
    remoteCurrent = await readDialogRecord(
      fetchImpl,
      options.serverUrl,
      options.authToken,
      dialogKey
    );
  } catch (error) {
    remoteReadError = error;
  }
  const localCurrent = localStore
    ? await localStore.read(dialogKey, { remote: false }).catch(() => null)
    : null;
  const hasUsableLocal = isUsableDialogRecord(localCurrent);
  const hasUsableRemote = isUsableDialogRecord(remoteCurrent);

  let current: Record<string, unknown>;
  let usedLocalRecord = false;
  if (remoteReadError) {
    if (!hasUsableLocal) throw remoteReadError;
    current = localCurrent as Record<string, unknown>;
    usedLocalRecord = true;
  } else if (hasUsableLocal) {
    const localUpdatedMs = parseRecordUpdatedAtMs(localCurrent as Record<string, unknown>);
    const remoteUpdatedMs = parseRecordUpdatedAtMs(remoteCurrent);
    if (!hasUsableRemote || localUpdatedMs > remoteUpdatedMs) {
      current = { ...(remoteCurrent ?? {}), ...(localCurrent as Record<string, unknown>) };
      usedLocalRecord = true;
    } else {
      current = remoteCurrent!;
    }
  } else {
    current = remoteCurrent!;
  }

  // --- Compression phase ---
  let summaryGenerated = false;
  let compactedMessageCount = 0;
  let generatedSummary: string | undefined = undefined;

  const summaryLlmCaller = options.summaryLlmCaller ?? (options.env ? createManualCompactionSummaryCaller({
    env: { ...(options.env ?? {}), AUTH_TOKEN: options.authToken, NOLO_SERVER: options.serverUrl },
    fetchImpl,
    agentRef: getActiveDialogAgentId(current as any) ?? undefined,
    loadAdapter: async () => {
      const { createCliLocalRuntimeAdapter } = await import("./localRuntimeAdapter");
      return createCliLocalRuntimeAdapter({ env: { ...(options.env ?? {}), AUTH_TOKEN: options.authToken, NOLO_SERVER: options.serverUrl }, fetchImpl });
    },
  }) : undefined);
  let pendingHistory: Message[] = [];
  if (!summaryLlmCaller) throw new Error("[nolo] compact: summary provider unavailable");
  {
    let ownMsgs: Message[] = [];
    let remoteMsgsError: unknown = null;
    try {
      ownMsgs = await readDialogMessages(
        fetchImpl,
        options.serverUrl,
        options.authToken,
        options.dialogId
      );
    } catch (error) {
      remoteMsgsError = error;
    }

    if (localStore) {
      let localEntries: Awaited<ReturnType<typeof readDialogMessageRecords>> = [];
      let localMsgsError: unknown = null;
      try {
        localEntries = await readDialogMessageRecords({
          store: localStore,
          dialogId: options.dialogId,
        });
      } catch (error) {
        localMsgsError = error;
      }

      if (localMsgsError) {
        if (remoteMsgsError || usedLocalRecord) {
          throw localMsgsError;
        }
        console.warn(`[nolo] compact: failed to read local messages for ${options.dialogId}; using remote history:`, localMsgsError);
      } else {
        const localMsgs: Message[] = sortMessagesChronologically(
          localEntries
            .filter((entry) => (entry.record.metadata as any)?.queueState !== "pending" && entry.record.deleted !== true)
            .filter((entry) => dialogMessageRecordToAgentRuntimeMessage(entry.record) !== null)
            .map((entry) => ({
              ...entry.record,
              id: typeof entry.record.id === "string" && entry.record.id ? entry.record.id : entry.messageId,
            }) as Message),
        );
        if (remoteMsgsError) {
          if (!hasUsableLocal && localMsgs.length === 0) {
            throw remoteMsgsError;
          }
          ownMsgs = localMsgs;
        } else if (localMsgs.length > 0) {
          const seenIds = new Set(ownMsgs.map((m) => m.id).filter(Boolean));
          const missingLocal = localMsgs.filter((m) => !m.id || !seenIds.has(m.id));
          if (missingLocal.length > 0) {
            ownMsgs = sortMessagesChronologically([...ownMsgs, ...missingLocal]);
          }
        }
      }
    } else if (remoteMsgsError) {
      throw remoteMsgsError;
    }

    const allMsgs = [...(Array.isArray(current.manualCompactHistory) ? current.manualCompactHistory as Message[] : []), ...ownMsgs];
    const history = allMsgs.map(message => {
      const parsed = dialogMessageRecordToAgentRuntimeMessage(message);
      if (!parsed) throw new Error("[nolo] compact: invalid current history message");
      return parsed;
    });
    const storedSummaryValid = validateStoredSummary({ history, stored: {
      summarizedBeforeId: current.summarizedBeforeId as string | undefined,
      sourceHash: current.sourceHash as string | undefined,
      sourceCount: current.sourceCount as number | undefined,
      schemaVersion: current.schemaVersion,
    } });
    let activeSummary = typeof current.summary === "string" ? current.summary.trim() : "";
    let activeSummarizedBeforeId: string | undefined;
    pendingHistory = allMsgs;
    if (storedSummaryValid === false) {
      // Stored summary failed integrity/schema validation: discard it and recompute from full allMsgs.
      activeSummary = "";
      activeSummarizedBeforeId = undefined;
      generatedSummary = undefined;
    } else if (typeof current.summarizedBeforeId === "string" && current.summarizedBeforeId) {
      const anchor = findSummaryAnchorIndex(allMsgs, current.summarizedBeforeId);
      if (anchor < 0) {
        // Anchor cannot be located (including legacy local-N): discard stale summary and recompute from full allMsgs.
        activeSummary = "";
        activeSummarizedBeforeId = undefined;
        generatedSummary = undefined;
      } else {
        activeSummarizedBeforeId = allMsgs[anchor]?.id ?? current.summarizedBeforeId;
        generatedSummary = activeSummary || undefined;
        pendingHistory = allMsgs.slice(anchor + 1);
      }
    } else {
      generatedSummary = activeSummary || undefined;
    }
    if (allMsgs.length > 0) {
      const agentKey =
        Array.isArray(current.cybots) && current.cybots.length > 0
          ? (current.cybots[0] as string)
          : undefined;
      const contextWindow = await resolveContextWindow(
        fetchImpl,
        options.serverUrl,
        options.authToken,
        agentKey,
        localStore,
      );

      const plan = planCompression({
        allMsgs,
        summarizedBeforeId: activeSummarizedBeforeId,
        summary: activeSummary,
        contextWindow,
        force: true,
        reason: "manual",
      });

      if (plan.shouldCompress && plan.msgsToCompress.length > 0) {
        const previousSummary = activeSummary;
        const request = buildHistoricalCompactionRequest({
          // Planning/persistence retain stored records (toolCallId); the bounded
          // request validates runtime messages (tool_call_id). Reuse the canonical
          // projection already validated above, without changing source coverage.
          msgsToCompress: plan.msgsToCompress.map(message => ({
            ...dialogMessageRecordToAgentRuntimeMessage(message)!,
            id: message.id,
          })),
          previousSummary,
          contextWindow: SUMMARY_CONTEXT_WINDOW,
        });

        if (request.status === "blocked") {
          throw new Error(`[nolo] compact: summary blocked: ${request.reason}`);
        } else {
          options.onProgress?.("summarizing");
          const summaryBudget = createSummaryBudget({ mode: "manual", signal: options.signal });
          try {
            const newSummary = await summaryBudget.run(({ signal, deadlineMs }) => summaryLlmCaller(request.promptContent, {
              signal, deadlineMs,
              maxOutputTokens: request.outputTokenBudget,
            }));

            if (!newSummary?.trim()) throw new Error("[nolo] compact: empty summary");
            if (newSummary.trim()) {
              const compressionCount =
                (current.compressionCount as number) || 0;

              // Extract reference keys: start with existing keys, then collect
              // new keys from the messages being compressed into the summary.
              // This prevents page/dialog/table keys from being permanently lost
              // when their source messages are folded into the summary.
              const extractedKeys = new Set(
                Array.isArray(current.referenceKeys)
                  ? (current.referenceKeys as string[])
                  : []
              );
              // Coverage is a prefix of the plan. Read references from stored
              // records, preserving the reference extractor's Message contract.
              for (const msg of plan.msgsToCompress.slice(0, request.coveredMessages.length)) {
                for (const key of extractReferenceKeysFromMessage(msg)) {
                  extractedKeys.add(key);
                }
              }

              // Message 无 index signature，不能直接赋给 SummarySourceMessageInput；
              // computeSummarySourceMetadata 只消费 id / role / content / tool_calls，
              // 显式投影出这四个字段（值与原 message 完全一致）。
              const summarySourceMsgs: SummarySourceMessageInput[] = allMsgs.map((m) => ({
                id: m.id,
                role: m.role,
                content: m.content,
                ...(m.tool_calls !== undefined ? { tool_calls: m.tool_calls } : {}),
              }));
              const sourceMeta = await computeSummarySourceMetadata(
                summarySourceMsgs,
                request.summarizedBeforeId,
              );

              if (options.signal?.aborted) throw new DOMException("summary aborted", "AbortError");
              if (summaryBudget.remainingMs() <= 0) throw new DOMException("Summary deadline exceeded", "TimeoutError");
              // referenceKeys participate in the fork carry (FORKED_CARRY_FIELDS);
              // source cursor and hash remain local to the source record.
              const patchChanges: Record<string, unknown> = {
                summary: newSummary.trim(),
                summarizedBeforeId: request.summarizedBeforeId,
                compressionCount: compressionCount + 1,
                referenceKeys: Array.from(extractedKeys),
                ...(sourceMeta ? {
                  sourceHash: sourceMeta.sourceHash,
                  sourceCount: sourceMeta.sourceCount,
                  schemaVersion: sourceMeta.schemaVersion,
                } : {}),
              };
              let remotePatchError: unknown = null;
              try {
                await patchDialog(fetchImpl, options.serverUrl, options.authToken, dialogKey, patchChanges);
              } catch (error) {
                remotePatchError = error;
              }
              if (localStore) {
                await localStore.write(dialogKey, {
                  ...current,
                  ...patchChanges,
                  dbKey: dialogKey,
                  updatedAt: new Date().toISOString(),
                });
                if (remotePatchError) {
                  console.warn(`[nolo] compact: remote patch failed for ${dialogKey}, persisted locally:`, remotePatchError);
                }
              } else if (remotePatchError) {
                throw remotePatchError;
              }

              current.referenceKeys = Array.from(extractedKeys);

              summaryGenerated = true;
              generatedSummary = newSummary.trim();
              pendingHistory = allMsgs.slice(allMsgs.findIndex(msg => msg.id === request.summarizedBeforeId) + 1);
              compactedMessageCount = request.coveredMessages.length;
              // P1-8 压缩埋点
              const metrics = buildCompactionMetricsFromPlan({
                reason: "manual",
                previousSummary,
                plan: {
                  msgsToCompress: request.coveredMessages,
                  msgsToKeep: [...plan.msgsToCompress.slice(request.coveredMessages.length), ...plan.msgsToKeep],
                },
                newSummary: newSummary.trim(),
                summaryInput: {
                  inputTokens: request.inputTokens,
                  capTokens: request.capTokens,
                  expandedMessages: request.expandedMessages,
                  omittedMessages: request.omittedMessages,
                },
                planCounts: {
                  pendingMessageCount: plan.diagnostics?.pendingMsgCount,
                  plannedCompressCount: plan.diagnostics?.compressCount,
                },
              });
              console.log(formatCompactionMetricsLog(metrics));
            }
          } catch (error) {
            if (options.signal?.aborted || isAbortError(error)) throw new DOMException("summary aborted", "AbortError");
            throw new Error(`[nolo] compact: summary failed (${classifySummaryError(error).category ?? "unknown"})`, { cause: error });
          } finally { summaryBudget.dispose(); }
        }
      }
    }
  }

  // --- Fork phase ---
  if (options.signal?.aborted) throw new DOMException("summary aborted", "AbortError");
  options.onProgress?.("forking");
  const next = buildForkedDialogRecord(current, userId);
  // Durable seed belongs to this new record, not a lineage lookup. Runtime
  // prepends it to this dialog's own transcript on every resume. Keep all
  // unsummarized fields (including tool pairing and structured content).
  if (generatedSummary) next.summary = generatedSummary;
  next.manualCompactHistory = pendingHistory;
  let remoteWriteError: unknown = null;
  try {
    await writeDialogRecord(fetchImpl, options.serverUrl, options.authToken, next);
  } catch (error) {
    remoteWriteError = error;
  }
  if (localStore) {
    await localStore.write(next.dbKey, next);
    if (remoteWriteError) {
      console.warn(`[nolo] compact: remote fork write failed for ${next.dbKey}, persisted locally:`, remoteWriteError);
    }
  } else if (remoteWriteError) {
    throw remoteWriteError;
  }
  await addDialogToSpaceIfNeeded(
    fetchImpl,
    options.serverUrl,
    options.authToken,
    next
  );

  return {
    dialogId: extractCustomId(next.dbKey),
    dialogKey: next.dbKey,
    spaceId: typeof next.spaceId === "string" ? next.spaceId : undefined,
    summaryGenerated,
    compactedMessageCount,
    summary: generatedSummary,
  };
}