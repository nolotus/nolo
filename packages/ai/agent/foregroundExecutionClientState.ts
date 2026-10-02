// packages/ai/agent/foregroundExecutionClientState.ts
//
// Tiny client-side cache of the server-owned foreground execution identity.
// This is not execution truth: the server registry/event stream is authoritative.
// It only lets Stop target the exact execution the UI observed instead of
// sending an ambiguous dialog-only cancellation.

export type ForegroundExecutionClientState = {
  dialogId: string;
  executionId: string;
  status: "running";
};

const stateByDialogId = new Map<string, ForegroundExecutionClientState>();
const MAX_TRACKED_DIALOGS = 256;

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function trimCache(): void {
  while (stateByDialogId.size > MAX_TRACKED_DIALOGS) {
    const oldest = stateByDialogId.keys().next().value;
    if (!oldest) return;
    stateByDialogId.delete(oldest);
  }
}

export function setForegroundExecutionClientState(args: {
  dialogId: string;
  executionId: string;
}): void {
  const dialogId = trimmed(args.dialogId);
  const executionId = trimmed(args.executionId);
  if (!dialogId || !executionId) return;

  // Refresh insertion order so recently observed dialogs survive bounded
  // cleanup if a terminal event was missed while the UI was disconnected.
  stateByDialogId.delete(dialogId);
  stateByDialogId.set(dialogId, { dialogId, executionId, status: "running" });
  trimCache();
}

export function clearForegroundExecutionClientState(
  dialogId: string,
  expectedExecutionId?: string,
): void {
  const normalizedDialogId = trimmed(dialogId);
  if (!normalizedDialogId) return;

  if (expectedExecutionId) {
    const current = stateByDialogId.get(normalizedDialogId);
    if (current && current.executionId !== expectedExecutionId) return;
  }
  stateByDialogId.delete(normalizedDialogId);
}

export function getForegroundExecutionClientState(
  dialogId: string,
): ForegroundExecutionClientState | undefined {
  return stateByDialogId.get(trimmed(dialogId));
}

/**
 * Observe lifecycle-shaped payloads from either the live agent-run SSE or the
 * durable recovery event stream. Unknown payloads are intentionally ignored.
 */
export function observeForegroundExecutionPayload(payload: unknown): void {
  if (!payload || typeof payload !== "object") return;
  const event = payload as Record<string, unknown>;
  const type = trimmed(event.type);
  const dialogId = trimmed(event.dialogId);
  const executionId = trimmed(event.executionId);

  if (
    (type === "dialog" || type === "foreground_turn_status") &&
    event.status === "running" &&
    dialogId &&
    executionId
  ) {
    setForegroundExecutionClientState({ dialogId, executionId });
    return;
  }

  if (
    type === "foreground_turn_terminal" ||
    type === "done" ||
    type === "cancelled" ||
    type === "error" ||
    type === "failed"
  ) {
    // Terminal cleanup must be identity-scoped: an older execution's late
    // terminal must not erase the newer execution's cached identity, or the
    // next Stop would silently degrade to dialog-only and could kill it.
    // Events without an executionId leave the cache untouched; the bounded
    // Map is cleaned by capacity/eviction instead.
    if (dialogId && executionId) {
      clearForegroundExecutionClientState(dialogId, executionId);
    }
  }
}

export function _clearForegroundExecutionClientStateForTests(): void {
  stateByDialogId.clear();
}
