import type { AgentRuntimeSaveTurnInput } from "../../agent-runtime";
import { isTombstoneRecord } from "database/tombstones";
import type { CliFetchImpl } from "../cliFetch";
import { fetchWithTransientRetry } from "./localRuntimeFetchRetry";
import { resolveRuntimeAuthToken, resolveRuntimeServerUrl, remoteDialogSyncTimeout, type EnvLike } from "./localRuntimeHelpers";

type SourceOp = { type: "put"; key: string; value: any };
export type CliMemoryCaptureResult = {
  status: "captured" | "skipped" | "deferred";
  reason: string;
  userMessageId?: string;
};

/** Only explicit receipt identities are sources. Never infer from text or history order. */
export async function readCliCaptureSources(args: {
  input: AgentRuntimeSaveTurnInput;
  dialogId: string;
  userId: string;
  read: (key: string) => Promise<any>;
  persistedUserMessageIds?: readonly string[];
}): Promise<SourceOp[]> {
  if (args.input.result.stopReason !== "done" || args.input.result.error) return [];
  const explicitIds = (args.input as AgentRuntimeSaveTurnInput & { cliCaptureUserMessageIds?: unknown }).cliCaptureUserMessageIds;
  const ids = [...new Set([
    ...args.input.messages.filter(message => message.role === "user")
      .map(message => (message as { cliMessageId?: string }).cliMessageId),
    ...(Array.isArray(explicitIds) ? explicitIds : []),
    ...(args.persistedUserMessageIds ?? []),
  ].filter((id): id is string => typeof id === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(id)))];
  const sources: SourceOp[] = [];
  for (const id of ids) {
    const key = `dialog-${args.dialogId}-msg-${id}`;
    const record = await args.read(key);
    if (record?.id !== id || record?.dialogId !== args.dialogId || record?.userId !== args.userId ||
      record?.role !== "user" || isTombstoneRecord(record) ||
      typeof record?.content !== "string" || !record.content.trim() ||
      typeof record?.createdAt !== "string" || !Number.isFinite(Date.parse(record.createdAt))) continue;
    sources.push({ type: "put", key, value: record });
  }
  return sources;
}

/** Runs only AFTER source upload. Native server reads original text/time and resolves auth owner.
 * Replays intentionally use the same source ID: the server's sourceRef dedup owns idempotency.
 * This module never selects a provider or performs formation locally.
 */
export async function captureCliCompletedTurn(args: {
  input: AgentRuntimeSaveTurnInput;
  dialogId: string;
  sources: SourceOp[];
  env: EnvLike;
  fetchImpl: CliFetchImpl;
}): Promise<CliMemoryCaptureResult[]> {
  if (args.input.result.stopReason !== "done" || args.input.result.error) {
    return [{ status: "skipped", reason: "turn_not_completed" }];
  }
  if (!args.sources.length) return [{ status: "deferred", reason: "missing_persisted_source" }];
  const serverUrl = resolveRuntimeServerUrl(args.env);
  if (!serverUrl) return [{ status: "deferred", reason: "server_not_configured" }];
  const authToken = resolveRuntimeAuthToken(args.env);
  if (!authToken) return [{ status: "deferred", reason: "not_authenticated" }];
  const results: CliMemoryCaptureResult[] = [];
  for (const source of args.sources) {
    const userMessageId = source.value.id as string;
    try {
      const response = await fetchWithTransientRetry(args.fetchImpl,
        `${serverUrl}/api/memory/capture-turn`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${authToken}` },
          // The transitional validator requires nonempty userInput; native capture ignores it.
          // A short inert marker also avoids legacy text extraction on older servers.
          body: JSON.stringify({ agentKey: args.input.agentKey, dialogId: args.dialogId,
            userMessageId, userInput: "native source" }),
          signal: AbortSignal.timeout(remoteDialogSyncTimeout()),
        }, { retryableStatuses: new Set([429, 502, 503]) });
      if (!response.ok) {
        results.push({ status: "deferred", reason: `http_${response.status}`, userMessageId });
        continue;
      }
      const body = await response.json() as any;
      const native = body?.protocol === "native" ? body.nativeCapture : null;
      if (!native || !["captured", "skipped"].includes(native.capture) ||
        !["applied", "no_op", "deferred", "failed"].includes(native.formation)) {
        results.push({ status: "deferred", reason: "native_capture_unconfirmed", userMessageId });
      } else {
        results.push({ status: native.capture, reason: `formation_${native.formation}`, userMessageId });
      }
    } catch {
      // No remote body/error text: it may contain user data or credentials.
      results.push({ status: "deferred", reason: "transport_or_response_error", userMessageId });
    }
  }
  return results;
}
