// Wave17 — UI-turn understanding memory capture (Redux-free helpers).
// Callers pass `messages` so this module does not import messageSlice (cycle).

import { fetchWithTransientRetry } from "core/fetchWithTransientRetry";
import { waitForWriteAck } from "database/actions/writeAck";
import type { DialogConfig } from "app/types";
import { selectById as selectDbRecordById } from "database/dbSlice";
import { dialogMessageKey } from "database/dialogKey";
import { selectIdentityToken } from "identity/selectors";
import { serializeMessageContent } from "./messageContent";
import type { Message } from "./types";

export function getLatestUserInputFromMessages(
  messages: Message[]
): string | null {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || message.role !== "user") continue;
    const serialized = serializeMessageContent(message.content, "[图片]")?.trim();
    if (serialized) return serialized;
  }
  return null;
}

export function getDialogSpaceIdFromState(
  state: any,
  dialogKey?: string
): string | undefined {
  if (!dialogKey) return undefined;
  const dialog = selectDbRecordById(state, dialogKey) as DialogConfig | undefined;
  return typeof dialog?.spaceId === "string" ? dialog.spaceId : undefined;
}

/**
 * Same base-url resolution memory recall uses (`fetchMemoryOverlayContext`), so
 * capture and recall cannot end up pointed at different servers.
 */
function resolveMemoryCaptureBaseUrl(state: any): string {
  const currentServer =
    typeof state?.settings?.currentServer === "string"
      ? state.settings.currentServer
      : null;
  const _window = (globalThis as any).window;
  if (!_window) return (currentServer || "").replace(/\/+$/, "");
  if (!currentServer) return _window.location.origin;
  return currentServer.replace(/\/+$/, "");
}

export type CaptureUnderstandingInput = {
  state: any;
  signal?: AbortSignal;
  /** Whole capture deadline, including replication, backoff and response body. */
  timeoutMs?: number;
  agentKey?: string | null;
  dialogId: string;
  dialogKey?: string;
  spaceId?: string;
  assistantText: string;
  toolCalls?: unknown[] | null;
  messages: Message[];
};

export type CaptureUnderstandingResult =
  | { status: "skipped"; reason: "incomplete_turn" | "missing_persisted_user" | "unavailable" }
  | { status: "native"; capture: "captured" | "skipped" | "failed"; formation: "applied" | "no_op" | "deferred" | "failed" }
  // A legacy acknowledgement says nothing about native State formation.
  | { status: "legacy_acknowledged" }
  | { status: "failed"; reason: "http" | "invalid_response" | "network" | "cancelled" | "timeout" | "replication_failed" | "replication_timeout"; httpStatus?: number };

/**
 * Best-effort shared Web/RN capture. Only the latest user row may be the source;
 * do not fall back to an older saved turn when the latest row is an unsaved draft.
 * dbSlice.write.fulfilled populates the DB cache after persistence succeeds,
 * whereas messageSlice.addUserMessage is optimistic and cannot prove a save.
 * The authenticated server resolves owner and re-reads the authoritative source.
 */
export async function captureUnderstandingFromCompletedUiTurn(
  input: CaptureUnderstandingInput
): Promise<CaptureUnderstandingResult> {
  if (!input.assistantText.trim() || input.toolCalls?.length || !input.agentKey) {
    return { status: "skipped", reason: "incomplete_turn" };
  }
  const source = input.messages.findLast(message => message?.role === "user");
  if (!source || !/^[A-Za-z0-9_-]{1,128}$/.test(source.id ?? "") ||
      source.dbKey !== dialogMessageKey(input.dialogId, source.id)) {
    return { status: "skipped", reason: "missing_persisted_user" };
  }
  const state = input.state;
  const persisted = state?.db
    ? selectDbRecordById(state, source.dbKey) as Message | undefined
    : undefined;
  if (!persisted || persisted.id !== source.id || persisted.dbKey !== source.dbKey ||
      persisted.role !== "user" || persisted.metadata?.queueState === "pending" ||
      (persisted as any).deleted || (persisted as any).isDeleted ||
      typeof persisted.content !== "string" || !persisted.content.trim() ||
      persisted.content !== source.content) {
    return { status: "skipped", reason: "missing_persisted_user" };
  }
  const token = selectIdentityToken(state) ?? null;
  const baseUrl = resolveMemoryCaptureBaseUrl(state);
  if (!token || !baseUrl) return { status: "skipped", reason: "unavailable" };

  // Snapshot once: retries must never pick a newer user message or recreate IDs/time.
  const body = JSON.stringify({
    agentKey: input.agentKey, dialogId: input.dialogId, userMessageId: persisted.id,
    userInput: persisted.content, assistantText: input.assistantText,
    spaceId: input.spaceId ?? getDialogSpaceIdFromState(state, input.dialogKey),
  });
  const key = JSON.stringify([baseUrl, token, body]);
  const existing = inFlight.get(key);
  if (existing && existing.signal === input.signal) return existing.promise;
  const promise = runCapture(input, persisted.dbKey, baseUrl, token, body);
  const entry = { signal: input.signal, promise };
  inFlight.set(key, entry);
  try { return await promise; }
  finally { if (inFlight.get(key) === entry) inFlight.delete(key); }
}

// Only concurrent completions are coalesced; failures remain retryable by a later
// explicit completion. No durable queue, rerender hook, or synthetic event.
const inFlight = new Map<string, { signal?: AbortSignal; promise: Promise<CaptureUnderstandingResult> }>();

async function runCapture(
  input: CaptureUnderstandingInput, sourceKey: string, baseUrl: string, token: string, body: string,
): Promise<CaptureUnderstandingResult> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  input.signal?.addEventListener("abort", cancel, { once: true });
  if (input.signal?.aborted) cancel();
  const requestedTimeout = input.timeoutMs ?? 8000;
  const timeoutMs = Number.isFinite(requestedTimeout) ? Math.max(1, Math.min(8000, requestedTimeout)) : 8000;
  const timer = setTimeout(cancel, timeoutMs);
  const signal = controller.signal;
  // Race even injected/older transports that do not honour AbortSignal.
  const bounded = <T>(operation: Promise<T>): Promise<T> => new Promise((resolve, reject) => {
    const abort = () => reject(new Error("capture aborted"));
    if (signal.aborted) { reject(new Error("capture aborted")); return; }
    signal.addEventListener("abort", abort, { once: true });
    operation.then(resolve, reject).finally(() => signal.removeEventListener("abort", abort));
  });
  try {
    if (signal.aborted) return { status: "failed", reason: "cancelled" };
    // Reuse the exact write already in flight; never re-publish the message.
    // Unknown means no retained ACK (e.g. an older saved source), not success.
    const ack = await bounded(waitForWriteAck(sourceKey, { targetServer: baseUrl, timeoutMs }));
    if (ack.timedOut) return { status: "failed", reason: "replication_timeout" };
    if (!["acked", "unknown"].includes(ack.outcome.status) || ack.waitTarget === "primary-fallback") {
      return { status: "failed", reason: "replication_failed" };
    }
    const response = await bounded(fetchWithTransientRetry(
      async (url, init) => {
        if (signal.aborted) throw new Error("capture aborted");
        return bounded(fetch(url, init));
      }, `${baseUrl}/api/memory/capture-turn`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body,
      signal,
    }, {
      maxAttempts: 3, coreDrainingMaxAttempts: 3,
      // Never replay an ambiguous application-level 422 or permanent 401/403.
      retryableStatuses: new Set([429, 502, 503, 504]),
      sleep: ms => bounded(new Promise(resolve => {
        const timer = setTimeout(done, Math.min(ms, 2000));
        function done() { clearTimeout(timer); signal.removeEventListener("abort", done); resolve(); }
        signal.addEventListener("abort", done, { once: true });
      })),
    }));
    if (!response.ok) return { status: "failed", reason: "http", httpStatus: response.status };
    let responseBody: any;
    try { responseBody = await bounded(response.json()); }
    catch { if (signal.aborted) throw new Error("capture aborted"); return { status: "failed", reason: "invalid_response" }; }
    const native = responseBody?.nativeCapture;
    if (native && ["captured", "skipped", "failed"].includes(native.capture) &&
        ["applied", "no_op", "deferred", "failed"].includes(native.formation)) {
      return { status: "native", capture: native.capture, formation: native.formation };
    }
    if (!native && responseBody?.success === true) return { status: "legacy_acknowledged" };
    return { status: "failed", reason: "invalid_response" };
  } catch {
    return { status: "failed", reason: signal.aborted ? (input.signal?.aborted ? "cancelled" : "timeout") : "network" };
  } finally {
    clearTimeout(timer);
    input.signal?.removeEventListener("abort", cancel);
  }
}
