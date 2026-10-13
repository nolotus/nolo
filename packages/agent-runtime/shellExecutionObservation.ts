/**
 * Read-only projection of legacy shell tool results into a shared observation.
 * This never executes, authorizes or re-routes tools. Keep raw results intact.
 * Unknown metadata stays unknown; do not infer success from missing exitCode.
 */
export type ShellExecutionObservation = {
  state: "completed" | "detached" | "cancelled" | "timed-out" | "unknown";
  outcome: "success" | "failure" | "unknown";
  exitCode: number | null;
  taskId: string | null;
  tracked: boolean;
};

export function projectShellExecutionObservation(
  value: unknown,
): ShellExecutionObservation {
  let raw = value;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch {
      return { state: "unknown", outcome: "unknown", exitCode: null, taskId: null, tracked: false };
    }
  }
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { state: "unknown", outcome: "unknown", exitCode: null, taskId: null, tracked: false };
  }
  const record = raw as Record<string, unknown>;
  const metadata = record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
    ? record.metadata as Record<string, unknown>
    : record;
  const exitCode = typeof metadata.exitCode === "number" && Number.isInteger(metadata.exitCode)
    ? metadata.exitCode : null;
  const taskId = typeof metadata.taskId === "string" && metadata.taskId.trim()
    ? metadata.taskId : null;
  const detached = metadata.detached === true || metadata.executionState === "detached";
  const timedOut = metadata.timedOut === true;
  const cancelled = metadata.aborted === true;
  const state = cancelled ? "cancelled" as const
    : timedOut ? "timed-out" as const
    : detached ? "detached" as const
    : exitCode !== null || metadata.executionState === "synchronous-complete"
      ? "completed" as const : "unknown" as const;
  const outcome = state === "completed"
    ? exitCode === null ? "unknown" as const : exitCode === 0 ? "success" as const : "failure" as const
    : state === "cancelled" || state === "timed-out" ? "failure" as const : "unknown" as const;
  return { state, outcome, exitCode, taskId: state === "detached" ? taskId : null,
    tracked: state === "detached" && taskId !== null && metadata.trackedBackgroundTask === true };
}
