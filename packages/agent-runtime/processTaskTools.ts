// packages/agent-runtime/processTaskTools.ts
//
// Phase 1 tool layer for the ProcessTask stream: taskWait / taskLogs /
// taskStop / tasks (see
// docs/handoff/2026-08-27-async-task-agents-research-handoff.md §1.4).
//
// Scope discipline:
// - These four tools ONLY observe / stop tasks that were already spawned by
//   execShell (timeout-detach promotion) or launchProcess. There is
//   deliberately NO mode/async/background parameter on the spawning tools
//   (§3.1) — the model never chooses an execution mode, it only follows up on
//   handles it already holds.
// - Status reporting goes through `reportedTaskStatus()` exclusively (§1.2);
//   no local re-derivation of the event axis → status axis mapping.
// - `taskStop` reaches the OS only after `registry.kill()` authorized the
//   stop, so the transient guard that lives inside `kill()` (§1.3) can never
//   be bypassed here. `stopAll()` is intentionally NOT used.
// - Storage: no new persistence. Oversized taskLogs output reuses the existing
//   tool spill store (`toolSpillStore`), same threshold as execShell's
//   `truncateToolOutput`.

import type { RegisteredProcess } from "./processRegistry";
import {
  isProcessTaskTerminalStatus,
  reportedTaskStatus,
  type ProcessTaskEvent,
  type ProcessTaskStatus,
} from "./processTask";
import { truncateToolOutput } from "./workspaceShell";
import { formatToolOverflowMarker, spillToolOutput } from "./toolSpillStore";

/** Default wait budget for one taskWait call. */
export const TASK_WAIT_DEFAULT_TIMEOUT_MS = 60_000;
/**
 * Hard ceiling for `timeoutMs`. A model asking for "wait an hour" must not be
 * able to pin one agent turn open: the request is clamped and the caller gets
 * a `running` result plus a cursor so it can decide to wait again.
 */
export const TASK_WAIT_MAX_TIMEOUT_MS = 5 * 60_000;
/** Poll cadence of the wait loop (injectable; tests never sleep for real). */
export const TASK_WAIT_POLL_INTERVAL_MS = 250;
/** Grace window between SIGTERM and the SIGKILL fallback in taskStop. */
export const TASK_STOP_GRACE_MS = 2_000;

/** Structural view of ProcessRegistry used by the four tools (test seams). */
export type TaskToolsRegistry = {
  getByTaskId(taskId: string): RegisteredProcess | undefined;
  listBackground(): RegisteredProcess[];
  getTaskEvents(taskId: string, cursor?: number): ProcessTaskEvent[];
  latestTaskSeq(taskId: string): number;
  hasTaskEvents(taskId: string): boolean;
  kill(pid: number, signal?: "SIGTERM" | "SIGKILL"): boolean;
};

export type SignalSender = (pid: number, signal: NodeJS.Signals | 0) => void;

export type TaskWaitResult =
  | {
      outcome: "terminal";
      taskId: string;
      status: ProcessTaskStatus;
      exitCode?: number;
      cursor: number;
      events: ProcessTaskEvent[];
      waitedMs: number;
    }
  | {
      outcome: "timeout";
      taskId: string;
      status: "running";
      cursor: number;
      events: ProcessTaskEvent[];
      waitedMs: number;
      timeoutMs: number;
      timeoutClamped?: true;
    }
  | { outcome: "not-found"; taskId: string; detail: string }
  | {
      outcome: "evicted";
      taskId: string;
      cursor: 0;
      events: [];
      /** Last status still known to the registry, when the envelope survived. */
      status?: ProcessTaskStatus;
      detail: string;
    };

export type TaskLogsResult =
  | {
      outcome: "ok";
      taskId: string;
      cursor: number;
      events: ProcessTaskEvent[];
      status: ProcessTaskStatus;
      terminal: boolean;
    }
  | { outcome: "not-found"; taskId: string; detail: string }
  | {
      outcome: "evicted";
      taskId: string;
      cursor: 0;
      events: [];
      status?: ProcessTaskStatus;
      detail: string;
    };

export type TaskStopResult =
  | {
      outcome: "stopped";
      taskId: string;
      pid: number;
      status: ProcessTaskStatus;
      signal: "SIGTERM" | "SIGKILL";
      escalated: boolean;
    }
  | { outcome: "not-found"; taskId: string; detail: string }
  | {
      outcome: "not-stoppable";
      taskId: string;
      pid: number;
      status: ProcessTaskStatus;
      reason: "transient-foreground" | "already-terminal" | "kill-refused";
      detail: string;
    };

export type TaskSummary = {
  taskId: string;
  pid: number;
  label: string;
  status: ProcessTaskStatus;
  startedAt: number;
  persist: boolean;
};

export type TasksResult = { tasks: TaskSummary[]; count: number };

const TERMINAL_EVENT_TYPES = new Set(["exited", "killed"]);

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultSignalSender(pid: number, signal: NodeJS.Signals | 0): void {
  process.kill(pid, signal as NodeJS.Signals);
}

/** Status of an envelope on the reporting axis (§1.2 single mapping point). */
function statusOf(record: RegisteredProcess): ProcessTaskStatus {
  return reportedTaskStatus(record.status, record.exitCode);
}

/**
 * Presence of a taskId across both carriers. The event log and the envelope
 * map have independent lifetimes: an envelope can outlive its (evicted) event
 * trail, and an event trail can outlive its (grace-GC'd) envelope. "Known"
 * means at least one of them still answers for the taskId.
 */
function inspectTask(registry: TaskToolsRegistry, taskId: string) {
  const record = registry.getByTaskId(taskId);
  const hasEvents = registry.hasTaskEvents(taskId);
  return { record, hasEvents, known: hasEvents || record !== undefined };
}

function notFoundDetail(taskId: string): string {
  return `No task ${taskId} is known: it was never started, or both its envelope and its event trail have been dropped. Call tasks to list current handles.`;
}

function evictedDetail(taskId: string): string {
  return `Event trail of ${taskId} is gone (retention window elapsed). No further events will appear; do not wait again.`;
}

function lastTerminalEvent(events: ProcessTaskEvent[]): ProcessTaskEvent | undefined {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i]!;
    if (TERMINAL_EVENT_TYPES.has(event.type)) return event;
  }
  return undefined;
}

export function resolveTaskWaitTimeoutMs(raw: unknown): {
  timeoutMs: number;
  clamped: boolean;
} {
  const value = typeof raw === "number"
    ? raw
    : typeof raw === "string" && raw.trim() !== ""
      ? Number(raw)
      : Number.NaN;
  if (!Number.isFinite(value)) {
    return { timeoutMs: TASK_WAIT_DEFAULT_TIMEOUT_MS, clamped: false };
  }
  if (value <= 0) return { timeoutMs: 0, clamped: value < 0 };
  if (value > TASK_WAIT_MAX_TIMEOUT_MS) {
    return { timeoutMs: TASK_WAIT_MAX_TIMEOUT_MS, clamped: true };
  }
  return { timeoutMs: value, clamped: false };
}

/**
 * Block until the task reaches a terminal event (`exited` / `killed`) or the
 * (clamped) timeout elapses.
 *
 * Hang safety — three independent brakes, because this is the only tool that
 * can hold an agent turn open:
 * 1. `timeoutMs` is clamped to TASK_WAIT_MAX_TIMEOUT_MS.
 * 2. Every iteration pairs `getTaskEvents()` with `hasTaskEvents()`: an empty
 *    read is ambiguous (§1.1), so a vanished trail returns `evicted` instead
 *    of polling forever.
 * 3. A poll-count ceiling derived from timeout/interval bounds the loop even
 *    if an injected clock never advances.
 */
export async function runTaskWait(args: {
  taskId: string;
  timeoutMs?: unknown;
  registry: TaskToolsRegistry;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  pollIntervalMs?: number;
}): Promise<TaskWaitResult> {
  const { registry, taskId } = args;
  const now = args.now ?? Date.now;
  const sleep = args.sleep ?? defaultSleep;
  const pollIntervalMs = Math.max(1, args.pollIntervalMs ?? TASK_WAIT_POLL_INTERVAL_MS);
  const { timeoutMs, clamped } = resolveTaskWaitTimeoutMs(args.timeoutMs);

  const initial = inspectTask(registry, taskId);
  if (!initial.known) {
    return { outcome: "not-found", taskId, detail: notFoundDetail(taskId) };
  }

  const startedAt = now();
  const deadline = startedAt + timeoutMs;
  const maxPolls = Math.ceil(timeoutMs / pollIntervalMs) + 2;

  for (let poll = 0; poll < maxPolls; poll += 1) {
    const events = registry.getTaskEvents(taskId, 0);
    // Pairing is mandatory: [] means "nothing new" OR "trail evicted".
    if (!registry.hasTaskEvents(taskId)) {
      const record = registry.getByTaskId(taskId);
      return {
        outcome: "evicted",
        taskId,
        cursor: 0,
        events: [],
        ...(record ? { status: statusOf(record) } : {}),
        detail: evictedDetail(taskId),
      };
    }

    const terminal = lastTerminalEvent(events);
    if (terminal) {
      return {
        outcome: "terminal",
        taskId,
        status: reportedTaskStatus(terminal.type, terminal.exitCode),
        ...(terminal.exitCode !== undefined ? { exitCode: terminal.exitCode } : {}),
        cursor: registry.latestTaskSeq(taskId),
        events,
        waitedMs: Math.max(0, now() - startedAt),
      };
    }

    if (now() >= deadline) {
      return {
        outcome: "timeout",
        taskId,
        status: "running",
        cursor: registry.latestTaskSeq(taskId),
        events,
        waitedMs: Math.max(0, now() - startedAt),
        timeoutMs,
        ...(clamped ? { timeoutClamped: true as const } : {}),
      };
    }

    await sleep(Math.min(pollIntervalMs, Math.max(1, deadline - now())));
  }

  // Poll ceiling hit (only reachable with a frozen/rewound clock): report the
  // same shape as a timeout rather than looping.
  return {
    outcome: "timeout",
    taskId,
    status: "running",
    cursor: registry.latestTaskSeq(taskId),
    events: registry.getTaskEvents(taskId, 0),
    waitedMs: Math.max(0, now() - startedAt),
    timeoutMs,
    ...(clamped ? { timeoutClamped: true as const } : {}),
  };
}

/** Incremental cursor read of one task's event trail. Pure, never blocks. */
export function runTaskLogs(args: {
  taskId: string;
  cursor?: unknown;
  registry: TaskToolsRegistry;
}): TaskLogsResult {
  const { registry, taskId } = args;
  const cursorRaw = typeof args.cursor === "number"
    ? args.cursor
    : typeof args.cursor === "string" && args.cursor.trim() !== ""
      ? Number(args.cursor)
      : Number.NaN;
  const cursor = Number.isFinite(cursorRaw) && cursorRaw > 0 ? Math.floor(cursorRaw) : 0;

  const { record, hasEvents, known } = inspectTask(registry, taskId);
  if (!known) {
    return { outcome: "not-found", taskId, detail: notFoundDetail(taskId) };
  }
  if (!hasEvents) {
    return {
      outcome: "evicted",
      taskId,
      cursor: 0,
      events: [],
      ...(record ? { status: statusOf(record) } : {}),
      detail: evictedDetail(taskId),
    };
  }

  const events = registry.getTaskEvents(taskId, cursor);
  const allEvents = registry.getTaskEvents(taskId, 0);
  const terminal = lastTerminalEvent(allEvents);
  const status = terminal
    ? reportedTaskStatus(terminal.type, terminal.exitCode)
    : record
      ? statusOf(record)
      : "running";
  return {
    outcome: "ok",
    taskId,
    cursor: registry.latestTaskSeq(taskId),
    events,
    status,
    terminal: isProcessTaskTerminalStatus(status),
  };
}

/**
 * Render a taskLogs payload for the model. Small payloads go inline; oversized
 * ones spill through the SAME store execShell output uses (`toolSpillStore`)
 * and the returned envelope carries the `logRef` path. No second storage path.
 */
export function formatTaskLogsContent(
  result: TaskLogsResult,
  options?: { outputLimit?: number; workspaceRoot?: string },
): { content: string; logRef?: string } {
  const full = JSON.stringify(result);
  const limit = options?.outputLimit && options.outputLimit > 0
    ? options.outputLimit
    : undefined;
  const effectiveLimit = limit ?? 20_000;
  if (full.length <= effectiveLimit) return { content: full };

  try {
    const spill = spillToolOutput({
      content: full,
      toolName: "taskLogs",
      workspaceRoot: options?.workspaceRoot,
    });
    const omitted = result.outcome === "ok" ? result.events.length : 0;
    const head = JSON.stringify({
      ...result,
      events: [],
      eventsOmitted: omitted,
      logRef: spill.displayPath,
    });
    return {
      content: `${head}${formatToolOverflowMarker({
        spillRef: spill.displayPath,
        totalChars: spill.totalChars,
        totalLines: spill.totalLines,
        omittedChars: Math.max(0, full.length - head.length),
        toolName: "taskLogs",
      })}`.trimEnd(),
      logRef: spill.displayPath,
    };
  } catch {
    // Spill failures must not break the tool call: fall back to execShell's
    // truncation helper (identical threshold semantics).
    return { content: truncateToolOutput(full, effectiveLimit) };
  }
}

/**
 * Signal-0 liveness probe of a process group.
 *
 * Signal 0 MUST be the number 0 (`process.kill(pid, "0")` throws
 * ERR_UNKNOWN_SIGNAL before probing anything). EPERM means "alive but owned by
 * someone else"; ESRCH (and anything else) means gone.
 */
export function isProcessGroupAlive(pgid: number, kill: SignalSender = defaultSignalSender): boolean {
  try {
    kill(-pgid, 0);
    return true;
  } catch (error) {
    return (error as { code?: string }).code === "EPERM";
  }
}

/**
 * Stop one background task: registry-authorized SIGTERM, short grace window,
 * then SIGKILL to the process group if it is still alive.
 *
 * The escalation never bypasses the transient guard: the raw SIGKILL is only
 * reachable after `registry.kill()` returned true, and `kill()` refuses
 * transient envelopes outright (§1.3). `stopAll()` is never called.
 */
export async function runTaskStop(args: {
  taskId: string;
  registry: TaskToolsRegistry;
  graceMs?: number;
  sleep?: (ms: number) => Promise<void>;
  kill?: SignalSender;
}): Promise<TaskStopResult> {
  const { registry, taskId } = args;
  const sleep = args.sleep ?? defaultSleep;
  const kill = args.kill ?? defaultSignalSender;
  const graceMs = Math.max(0, args.graceMs ?? TASK_STOP_GRACE_MS);

  const record = registry.getByTaskId(taskId);
  if (!record) {
    return { outcome: "not-found", taskId, detail: notFoundDetail(taskId) };
  }

  const termed = registry.kill(record.pid, "SIGTERM");
  if (!termed) {
    const reason = record.transient
      ? "transient-foreground"
      : record.status !== "running"
        ? "already-terminal"
        : "kill-refused";
    const detail = reason === "transient-foreground"
      ? `${taskId} is a foreground command still inside its grace window, not a background task; its lifecycle belongs to the running execShell call.`
      : reason === "already-terminal"
        ? `${taskId} is already ${statusOf(record)}; nothing to stop.`
        : `Registry refused to stop ${taskId}.`;
    return {
      outcome: "not-stoppable",
      taskId,
      pid: record.pid,
      status: statusOf(record),
      reason,
      detail,
    };
  }

  if (graceMs > 0) await sleep(graceMs);

  if (!isProcessGroupAlive(record.pgid, kill)) {
    return {
      outcome: "stopped",
      taskId,
      pid: record.pid,
      status: reportedTaskStatus("killed"),
      signal: "SIGTERM",
      escalated: false,
    };
  }

  try {
    kill(-record.pgid, "SIGKILL");
  } catch {
    // Raced with exit between probe and signal; the status is terminal either way.
  }
  return {
    outcome: "stopped",
    taskId,
    pid: record.pid,
    status: reportedTaskStatus("killed"),
    signal: "SIGKILL",
    escalated: true,
  };
}

/** Handle recovery: the background tasks this agent can still act on. */
export function runTasks(args: { registry: TaskToolsRegistry }): TasksResult {
  const tasks = args.registry.listBackground().map((record) => ({
    taskId: record.taskId,
    pid: record.pid,
    label: record.label,
    status: statusOf(record),
    startedAt: record.startedAt,
    persist: record.persist,
  }));
  return { tasks, count: tasks.length };
}
