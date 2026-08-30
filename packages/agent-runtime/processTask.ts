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
 * user/runtime stop request hitting a running process.
 *
 * Carrier & vocabulary ruling (§1.2):
 * - `killed` is strictly an event type on this stream, NOT a registry status.
 * - The registry status axis is `running | stopped | exited | failed`, where
 *   `stopped` carries "user/runtime-initiated kill" semantics.
 * - The disk carrier (`~/.nolo/runs/<runId>.json`) maintains an independent
 *   `killed` status value; the two carriers are deliberately NOT aligned.
 * - External tool reporting (such as Phase 1 `taskStop`) uniformly reports
 *   `stopped` as the terminal status via `reportedTaskStatus()`.
 */
export const PROCESS_TASK_EVENT_TYPES = [
  "started",
  "promoted",
  "exited",
  "killed",
] as const;

export type ProcessTaskEventType = (typeof PROCESS_TASK_EVENT_TYPES)[number];

/** Source signal (event type or existing status) convertible to external task status. */
export type ProcessTaskStatusSource = ProcessTaskEventType | ProcessTaskStatus;

/**
 * Maps an event-axis signal or registry status to the external ProcessTaskStatus vocabulary.
 * `killed` is strictly an internal event (kill request hit process) and maps to `stopped`
 * to prevent leaking into the external status vocabulary (§1.2 ruling).
 */
export function reportedTaskStatus(
  source: ProcessTaskStatusSource,
  exitCode?: number,
): ProcessTaskStatus {
  if (source === "killed") {
    return "stopped";
  }
  if (source === "exited") {
    return exitCode !== undefined && exitCode !== 0 ? "failed" : "exited";
  }
  if (source === "started" || source === "promoted") {
    return "running";
  }
  return source;
}

/** One immutable lifecycle event. `seq` is monotonic per taskId, starting at 1. */
export type ProcessTaskEvent = {
  taskId: string;
  seq: number;
  type: ProcessTaskEventType;
  pid: number;
  createdAt: number;
  exitCode?: number;
};

/** Default retention delay after terminal event (5 minutes). */
export const DEFAULT_TASK_EVENT_RETENTION_MS = 5 * 60 * 1000;

/** Default max number of task event streams to retain. */
export const DEFAULT_MAX_TASK_EVENTS_TASKS = 200;

export type ProcessTaskEventLogOptions = {
  /**
   * Delay window in milliseconds before evicting events of a completed task
   * (exited/killed). Defaults to 5 minutes (300_000 ms).
   */
  retentionMs?: number;
  /**
   * Maximum number of task streams to retain in memory. Defaults to 200.
   */
  maxTasks?: number;
  /**
   * Injected monotonic / wall clock supplier. Defaults to `Date.now`.
   */
  now?: () => number;
};

export type ProcessTaskEventLogStats = {
  taskCount: number;
  terminalTaskCount: number;
  activeTaskCount: number;
  evictedCount: number;
  activeOverflowCount: number;
};

/**
 * In-memory append-only event table (Phase 0 scope, with Phase 1 retention policy).
 * Read path is cursor-based (`read(taskId, cursor)` returns events with
 * `seq > cursor`, ascending) so Phase 1+ consumers (taskWait / log cursor /
 * task cards / recovery audit) can consume incrementally from the same stream.
 *
 * Retention policy (§1.1):
 * - Completed tasks (exited / killed) are lazily evicted after `retentionMs`
 *   (default 5 minutes).
 * - Total retained tasks are capped at `maxTasks` (default 200). When exceeded,
 *   oldest completed tasks are evicted first. Active tasks are NEVER evicted.
 * - Eviction is strictly all-or-nothing per taskId to prevent seq gaps.
 */
export class ProcessTaskEventLog {
  private events = new Map<string, ProcessTaskEvent[]>();
  private terminalTasks = new Map<string, number>();
  private retentionMs: number;
  private maxTasks: number;
  private now: () => number;
  private evictedCount = 0;
  private activeOverflowCount = 0;

  constructor(options?: ProcessTaskEventLogOptions) {
    this.retentionMs = options?.retentionMs ?? DEFAULT_TASK_EVENT_RETENTION_MS;
    this.maxTasks = options?.maxTasks ?? DEFAULT_MAX_TASK_EVENTS_TASKS;
    this.now = options?.now ?? Date.now;
  }

  /** Append one event; assigns the next monotonic seq for the task. */
  append(input: {
    taskId: string;
    pid: number;
    type: ProcessTaskEventType;
    exitCode?: number;
  }): ProcessTaskEvent {
    const currentTime = this.now();
    const list = this.events.get(input.taskId) ?? [];
    const lastSeq = list.length > 0 ? list[list.length - 1]!.seq : 0;
    const event: ProcessTaskEvent = Object.freeze({
      taskId: input.taskId,
      seq: lastSeq + 1,
      type: input.type,
      pid: input.pid,
      createdAt: currentTime,
      ...(input.exitCode !== undefined ? { exitCode: input.exitCode } : {}),
    });
    list.push(event);
    this.events.set(input.taskId, list);

    if (input.type === "exited" || input.type === "killed") {
      this.terminalTasks.set(input.taskId, currentTime);
    }

    this.evict(currentTime);

    return { ...event };
  }

  /**
   * All events of the task with `seq > cursor` (default 0 = from the start).
   *
   * NOTE for cursor consumers (Phase 1 taskWait/taskLogs): an empty array is
   * ambiguous — it means either "no new events yet" or "the whole task was
   * evicted" (retention is per-taskId, never partial, so a cursor can never
   * land in a hole). Do NOT treat empty as "still running and idle": pair the
   * read with `hasTask(taskId)` to tell the two apart, otherwise a wait loop
   * can hang forever on an evicted task. Eviction only ever happens after a
   * terminal event plus the retention delay, so a live task is always readable.
   */
  read(taskId: string, cursor = 0): ProcessTaskEvent[] {
    return (this.events.get(taskId) ?? [])
      .filter((event) => event.seq > cursor)
      .map((event) => ({ ...event }));
  }

  /**
   * Whether the task's event trail is still retained. Lets a cursor consumer
   * disambiguate the empty result of `read()` (see its note).
   */
  hasTask(taskId: string): boolean {
    return this.events.has(taskId);
  }

  latestSeq(taskId: string): number {
    const list = this.events.get(taskId);
    return list && list.length > 0 ? list[list.length - 1]!.seq : 0;
  }

  getStats(): ProcessTaskEventLogStats {
    return {
      taskCount: this.events.size,
      terminalTaskCount: this.terminalTasks.size,
      activeTaskCount: this.events.size - this.terminalTasks.size,
      evictedCount: this.evictedCount,
      activeOverflowCount: this.activeOverflowCount,
    };
  }

  clear(): void {
    this.events.clear();
    this.terminalTasks.clear();
    this.evictedCount = 0;
    this.activeOverflowCount = 0;
  }

  private evict(currentTime: number): void {
    // 1. Time-based eviction for terminal tasks past retentionMs
    for (const [taskId, terminalTime] of this.terminalTasks.entries()) {
      if (currentTime - terminalTime >= this.retentionMs) {
        this.events.delete(taskId);
        this.terminalTasks.delete(taskId);
        this.evictedCount += 1;
      }
    }

    // 2. Capacity-based fallback: drop oldest completed tasks first
    if (this.events.size > this.maxTasks) {
      const sortedTerminal = Array.from(this.terminalTasks.entries())
        .sort((a, b) => a[1] - b[1]);

      for (const [taskId] of sortedTerminal) {
        if (this.events.size <= this.maxTasks) {
          break;
        }
        this.events.delete(taskId);
        this.terminalTasks.delete(taskId);
        this.evictedCount += 1;
      }

      if (this.events.size > this.maxTasks) {
        this.activeOverflowCount += 1;
      }
    }
  }
}
