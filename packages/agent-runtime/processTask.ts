// packages/agent-runtime/processTask.ts
//
// Single source of truth for the ProcessTask layer's status enums and
// append-only lifecycle event model (Phase 0, see
// docs/handoff/2026-08-27-async-task-agents-research-handoff.md 第 3 节；
// 原始会商论证见 docs/handoff/2026-08-27-async-task-agents-archive.md §12.1/§12.3).
//
// Layer boundary (§12.7 — "分层，不是漂移"):
// - PROCESS_TASK_STATUSES below is the in-memory process registry's axis
//   (pid-keyed, lives only for the current CLI/desktop process).
// - AGENT_RUN_TERMINAL_STATUSES (packages/ai/tools/agent/agentRunDisplayHelpers.ts)
//   is the ~/.nolo/runs/<runId>.json file carrier's axis (runId-keyed,
//   survives process restarts). It gains timeout/killed because those files
//   describe long-lived supervised runs, not this registry.
// - There is NO cross-layer pathway today: agentRunControl kills runs via an
//   injected `process.kill(pid, signal)` and never imports processRegistry;
//   the registry writes nothing to ~/.nolo/runs. Since no value ever crosses
//   the boundary, there is no drift surface — so the two enums deliberately
//   stay separate (merge only if a real pathway appears).

/**
 * Status axis of the in-memory process registry. Values are frozen: TUI
 * `/procs`, desktop stop controls and `listProcesses` consumers all pin on
 * them. "stopped" specifically means "user/runtime-initiated kill", distinct
 * from natural "exited"/"failed" — do not fold them together.
 */
export const PROCESS_TASK_STATUSES = [
  "running",
  "stopped",
  "exited",
  "failed",
] as const;

export type ProcessTaskStatus = (typeof PROCESS_TASK_STATUSES)[number];

/**
 * Registry-side terminal statuses. Note: "stopped" (killed on request) is
 * terminal for the registry record, while "running" is the only active state.
 * This is the registry axis only — do NOT confuse with the agent-run file
 * axis (`isAgentRunTerminalStatus`), whose value domain intentionally differs
 * (see layer boundary comment at the top of this file).
 */
export const PROCESS_TASK_TERMINAL_STATUSES = [
  "stopped",
  "exited",
  "failed",
] as const;

/** Sole terminal-check entry point for registry-side statuses. */
export function isProcessTaskTerminalStatus(
  status: string | undefined,
): status is ProcessTaskStatus {
  return (
    typeof status === "string"
    && (PROCESS_TASK_TERMINAL_STATUSES as readonly string[]).includes(status)
  );
}

/**
 * Lifecycle event types of the append-only task event stream. One envelope
 * emits at least `started`; `promoted` marks the timeout-detach moment (same
 * process, same taskId); `exited` is a natural/forced end; `killed` is a
 * user/runtime stop request hitting a running process (registry status stays
 * "stopped" — the event axis carries the extra intent).
 */
export const PROCESS_TASK_EVENT_TYPES = [
  "started",
  "promoted",
  "exited",
  "killed",
] as const;

export type ProcessTaskEventType = (typeof PROCESS_TASK_EVENT_TYPES)[number];

/** One immutable lifecycle event. `seq` is monotonic per taskId, starting at 1. */
export type ProcessTaskEvent = {
  taskId: string;
  seq: number;
  type: ProcessTaskEventType;
  pid: number;
  createdAt: number;
  exitCode?: number;
};

/**
 * In-memory append-only event table (Phase 0 scope). Read path is
 * cursor-based (`read(taskId, cursor)` returns events with `seq > cursor`,
 * ascending) so Phase 1+ consumers (taskWait / log cursor / task cards /
 * recovery audit) can consume incrementally from the same stream. The store
 * never hands out its internal arrays; every read returns fresh copies.
 */
export class ProcessTaskEventLog {
  private events = new Map<string, ProcessTaskEvent[]>();

  /** Append one event; assigns the next monotonic seq for the task. */
  append(input: {
    taskId: string;
    pid: number;
    type: ProcessTaskEventType;
    exitCode?: number;
  }): ProcessTaskEvent {
    const list = this.events.get(input.taskId) ?? [];
    const lastSeq = list.length > 0 ? list[list.length - 1]!.seq : 0;
    const event: ProcessTaskEvent = Object.freeze({
      taskId: input.taskId,
      seq: lastSeq + 1,
      type: input.type,
      pid: input.pid,
      createdAt: Date.now(),
      ...(input.exitCode !== undefined ? { exitCode: input.exitCode } : {}),
    });
    list.push(event);
    this.events.set(input.taskId, list);
    return { ...event };
  }

  /** All events of the task with `seq > cursor` (default 0 = from the start). */
  read(taskId: string, cursor = 0): ProcessTaskEvent[] {
    return (this.events.get(taskId) ?? [])
      .filter((event) => event.seq > cursor)
      .map((event) => ({ ...event }));
  }

  latestSeq(taskId: string): number {
    const list = this.events.get(taskId);
    return list && list.length > 0 ? list[list.length - 1]!.seq : 0;
  }

  clear(): void {
    this.events.clear();
  }
}
