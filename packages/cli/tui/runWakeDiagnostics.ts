import { getDiagnostics } from "../diagnostics";
import type { InternalTurnEvent } from "core/chat/internalTurnEvent";
import type { ChatQueueStatus } from "core/chat/chatQueueStatus";

/** Explicit allowlist: never pass event text, queue previews, errors or run payloads. */
export function queueWakeFields(status?: ChatQueueStatus): Record<string, unknown> {
  return status ? { queueLength: status.queueLength, queueRunning: status.isRunning,
    queuePaused: status.drainPaused, queueHasError: !!status.lastDrainError } : { queueBound: false };
}

export function traceChildRunWake(stage: string, event: InternalTurnEvent | string,
  currentDialogId: string | null, fields: Record<string, unknown> = {}): void {
  if (typeof event === "string" || event.kind !== "child-run-completed") return;
  for (const run of event.runs) traceRunWake(stage, {
    runId: run.runId, status: run.status, parentDialogId: run.parentDialogId ?? null,
    currentDialogId, ...fields,
  });
}

export function traceRunWake(stage: string, fields: Record<string, unknown>): void {
  try {
    getDiagnostics()?.logger.child({ component: "run-terminal-wake", fields }).debug(stage);
  } catch { /* Diagnostics must never change delivery. */ }
}
