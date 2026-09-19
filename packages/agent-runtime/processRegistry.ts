// packages/agent-runtime/processRegistry.ts
//
// In-memory Execution Envelope registry for the ProcessTask layer (Phase 0).
// Each spawned command is pre-registered at spawn time (stable taskId, see
// docs/archive/handoff/2026-08-27-async-task-agents-research-handoff.md 3.2；
// 原始会商论证见 docs/archive/handoff/2026-08-27-async-task-agents-archive.md §12.1 item 2)
// and emits append-only lifecycle events into a ProcessTaskEventLog, so later
// wait / log-cursor / task-card / recovery-audit consumers read one stream.
//
// Status values come from ./processTask (single source of truth for this
// layer). Do not hand-write status literal unions.
//
// Layer boundary (§12.7): this registry's statuses and the agent-run file
// statuses (AGENT_RUN_TERMINAL_STATUSES) are different carriers with no
// cross-layer pathway — see the comment at the top of ./processTask for why
// they are deliberately NOT merged.

import {
  ProcessTaskEventLog,
  type ProcessTaskEvent,
  type ProcessTaskEventLogOptions,
  type ProcessTaskStatus,
} from "./processTask";
import type { ProcessTaskResultCapsule } from "./processTaskResult";
import type { ProcessOwner } from "./processOwnership";

export type RegisteredProcess = {
  /** Stable handle across grace-GC / timeout-detach promotion. */
  taskId: string;
  pid: number;
  pgid: number;
  command: string;
  label: string;
  startedAt: number;
  status: ProcessTaskStatus;
  exitCode?: number;
  persist: boolean;
  /** True once the envelope has been promoted to a background task (detach). */
  promoted: boolean;
  /**
   * User-visible background-task marker. True ONLY while the envelope merely
   * tracks the grace period of a foreground command (pre-registered by
   * workspaceShell at spawn, not yet detached). Such an entry is NOT a
   * background task from the user's perspective: it must not show up in the
   * status line, /procs, or be targetable by /stop — those surfaces keep their
   * pre-Phase-0 semantics via listBackground(). Flipped to false by promote()
   * (timeout detach); launchProcess registrations are real background tasks
   * from birth and never set this. Audit/internal paths use list() (full
   * truth) and can still see transient envelopes.
   */
  transient: boolean;
  /**
   * Ownership captured at launch / detach time (see processOwnership.ts):
   * which dialog (and which turn) asked for this task. `null` means the
   * envelope has no parent conversation — its terminal notice may only be
   * surfaced as a summary, never used to wake a conversation.
   *
   * Invariant: written once at registration and read as-is afterwards. The
   * terminal path must NOT re-derive ownership from "the dialog that happens
   * to be open right now" (the task may outlive the turn that launched it).
   */
  owner: ProcessOwner | null;
  /**
   * Bounded stdout/stderr capsule of the terminal transition. Set only for
   * promoted execShell tasks whose detach path drained the pipes before
   * markExited (see workspaceShell); launchProcess (ambient) tasks have none,
   * and the lifecycle event log stays started/promoted/exited/killed only —
   * the capsule lives here, not in the event stream.
   */
  resultCapsule?: ProcessTaskResultCapsule;
};

/**
 * Wire view of an envelope for the `listProcesses` tool surface. Deliberately
 * an explicit projection instead of a record spread: the full record carries
 * `resultCapsule` (bounded stdout/stderr per finished task), and letting it
 * ride into every list call would re-send output the terminal wake already
 * delivered and spend the tool-output budget on it. The capsule stays the
 * *delivery* payload; this view exposes only the retrievable ref plus the
 * timing facts.
 *
 * `tasks` (processTaskTools.runTasks) keeps its own narrower projection
 * (taskId/pid/label/status/startedAt/persist) and does not use this view; both
 * are payload-free, and neither is the source of truth for the other.
 */
export type ProcessTaskView = {
  taskId: string;
  pid: number;
  pgid: number;
  command: string;
  label: string;
  startedAt: number;
  status: ProcessTaskStatus;
  exitCode?: number;
  persist: boolean;
  promoted: boolean;
  transient: boolean;
  /** Wall time of the terminal transition; present only with a capsule. */
  durationMs?: number;
  /** Ref to the full output when the capsule's inline tails were lossy. */
  outputRef?: string;
};

export function toProcessTaskView(record: RegisteredProcess): ProcessTaskView {
  const capsule = record.resultCapsule;
  return {
    taskId: record.taskId,
    pid: record.pid,
    pgid: record.pgid,
    command: record.command,
    label: record.label,
    startedAt: record.startedAt,
    status: record.status,
    ...(record.exitCode !== undefined ? { exitCode: record.exitCode } : {}),
    persist: record.persist,
    promoted: record.promoted,
    transient: record.transient,
    ...(capsule?.durationMs !== undefined ? { durationMs: capsule.durationMs } : {}),
    ...(capsule?.spill ? { outputRef: capsule.spill.displayPath } : {}),
  };
}

export type RegisteredProcessInput = {
  pid: number;
  pgid: number;
  command: string;
  label: string;
  persist?: boolean;
  /** True once the envelope has been promoted to a background task (execShell detach). */
  promoted?: boolean;
  /**
   * Mark the envelope as a transient foreground grace-period tracker. Only the
   * workspaceShell pre-registration sets this; omit it (false) for real
   * background tasks (launchProcess) and post-detach records.
   */
  transient?: boolean;
  /** Pre-generated taskId; a fresh one is minted when omitted. */
  taskId?: string;
  /**
   * Parent dialog/turn captured at launch or detach time. Omit (or null) for
   * tasks that belong to no conversation; see processOwnership.readProcessOwner.
   */
  owner?: ProcessOwner | null;
};

let taskIdCounter = 0;

/** Stable, process-unique envelope id (pid is reused by the OS; this is not). */
function mintTaskId(pid: number): string {
  taskIdCounter += 1;
  return `ptask-${pid}-${Date.now().toString(36)}-${taskIdCounter.toString(36)}`;
}

/** A terminal-state notification pushed to TUI consumers (see onProcessTerminal). */
export type ProcessTerminalNotice = {
  taskId: string;
  pid: number;
  label: string;
  command: string;
  /** Registry status axis value at the terminal transition. */
  status: "stopped" | "exited" | "failed";
  exitCode?: number;
  /**
   * True once the envelope has been promoted to a background task (execShell detach).
   * Ambient processes (launchProcess) have promoted === false and are notice-only.
   */
  promoted?: boolean;
  /**
   * Bounded stdout/stderr result captured at the terminal transition. Present
   * only for promoted execShell detach exits (the close path builds it before
   * markExited fires); absent for ambient launchProcess tasks and user kills.
   */
  resultCapsule?: ProcessTaskResultCapsule;
};

export type ProcessTerminalListener = (notice: ProcessTerminalNotice) => void;

export class ProcessRegistry {
  private processes = new Map<number, RegisteredProcess>();
  private byTaskId = new Map<string, number>();
  private eventLog: ProcessTaskEventLog;
  private terminalListeners = new Set<ProcessTerminalListener>();

  constructor(eventLogOptions?: ProcessTaskEventLogOptions) {
    this.eventLog = new ProcessTaskEventLog(eventLogOptions);
  }

  /**
   * Subscribe to terminal transitions (markExited / kill). Fired synchronously
   * at the same instant the terminal event is appended to the task event log,
   * so consumers (TUI pending-notice buffer) observe the same ordering as the
   * audit stream. Each task fires at most once: markExited is gated on the
   * "running" status, kill()/stopAll() on the same guard, and late close
   * events after a user stop are already suppressed by the status check.
   *
   * Returns an unsubscribe function. Registration does NOT replay terminal
   * states for tasks that already terminated before subscription (no
   * backfill): the event log keeps the audit trail, and replaying would
   * double-notify tasks the previous session already surfaced.
   */
  onProcessTerminal(listener: ProcessTerminalListener): () => void {
    this.terminalListeners.add(listener);
    return () => {
      this.terminalListeners.delete(listener);
    };
  }

  /** Emit a terminal notice synchronously; listener errors must not break registry callers. */
  private emitTerminal(notice: ProcessTerminalNotice): void {
    for (const listener of [...this.terminalListeners]) {
      try {
        listener(notice);
      } catch {
        // A broken consumer (e.g. a torn-down TUI) must not break the spawn/exit path.
      }
    }
  }

  /**
   * Pre-register an envelope right after a successful spawn and emit the
   * `started` event. Returns the stored record (with its stable taskId).
   */
  add(proc: RegisteredProcessInput): RegisteredProcess {
    const record: RegisteredProcess = {
      taskId: proc.taskId ?? mintTaskId(proc.pid),
      pid: proc.pid,
      pgid: proc.pgid,
      command: proc.command,
      label: proc.label,
      startedAt: Date.now(),
      status: "running",
      persist: proc.persist ?? false,
      promoted: proc.promoted ?? false,
      transient: proc.transient ?? false,
      owner: proc.owner ?? null,
    };
    this.processes.set(proc.pid, record);
    this.byTaskId.set(record.taskId, proc.pid);
    this.eventLog.append({ taskId: record.taskId, pid: proc.pid, type: "started" });
    return { ...record };
  }

  list(): RegisteredProcess[] {
    return Array.from(this.processes.values()).map((proc) => ({ ...proc }));
  }

  /**
   * User-visible view: only real background tasks — entries registered by
   * launchProcess (background from birth) plus envelopes promoted to
   * background by timeout detach. Transient foreground grace-period envelopes
   * (workspaceShell pre-registration, not yet promoted) are excluded so the
   * status line, /procs and /stop keep behaving exactly as before Phase 0.
   * Audit/internal consumers that need the full truth use list() instead.
   */
  listBackground(): RegisteredProcess[] {
    return Array.from(this.processes.values())
      .filter((proc) => !proc.transient)
      .map((proc) => ({ ...proc }));
  }

  get(pid: number): RegisteredProcess | undefined {
    const item = this.processes.get(pid);
    return item ? { ...item } : undefined;
  }

  getTaskId(pid: number): string | undefined {
    return this.processes.get(pid)?.taskId;
  }

  getByTaskId(taskId: string): RegisteredProcess | undefined {
    const pid = this.byTaskId.get(taskId);
    return pid === undefined ? undefined : this.get(pid);
  }

  /** Append-only lifecycle events of a task with `seq > cursor` (ascending). */
  getTaskEvents(taskId: string, cursor = 0): ProcessTaskEvent[] {
    return this.eventLog.read(taskId, cursor);
  }

  latestTaskSeq(taskId: string): number {
    return this.eventLog.latestSeq(taskId);
  }

  /**
   * Whether the task's event trail is still retained. Cursor consumers MUST
   * pair this with getTaskEvents(): an empty read means either "no new events"
   * or "the whole trail was evicted" (§1.1), and only this call tells them
   * apart — without it a wait loop hangs forever on an evicted task.
   */
  hasTaskEvents(taskId: string): boolean {
    return this.eventLog.hasTask(taskId);
  }

  /**
   * Timeout-detach promotion: mark the pre-registered envelope as a background
   * task. Same record, same taskId, no re-execution, no second registration.
   */
  promote(pid: number): RegisteredProcess | undefined {
    const item = this.processes.get(pid);
    if (!item) return undefined;
    if (!item.promoted) {
      item.promoted = true;
      // Detached to background: from now on the user sees (and can stop) this
      // envelope as a background task, so drop the transient marker.
      item.transient = false;
      this.eventLog.append({ taskId: item.taskId, pid, type: "promoted" });
    }
    return { ...item };
  }

  /**
   * Terminate a background process group and update its status to "stopped".
   *
   * Invariant (§1.3): Transient foreground envelopes (workspaceShell grace
   * period before timeout detach) are NOT stoppable through this entry point;
   * their lifecycle belongs to the foreground runner (abort/timeout). Calling
   * kill() on a transient entry does not signal the process, does not emit a
   * "killed" event, and returns false.
   */
  kill(pid: number, signal: "SIGTERM" | "SIGKILL" = "SIGTERM"): boolean {
    const item = this.processes.get(pid);
    if (!item) return false;
    if (item.transient) return false;

    if (item.status === "running") {
      try {
        if (process.platform === "win32") {
          process.kill(item.pid, signal);
        } else {
          process.kill(-item.pgid, signal);
        }
      } catch {
        try {
          process.kill(item.pid, signal);
        } catch {
          // ESRCH or unkillable - process might already be dead
        }
      }
      item.status = "stopped";
      this.eventLog.append({ taskId: item.taskId, pid, type: "killed" });
      // User-initiated terminal transition — notify on the same instant (once:
      // guarded by the "running" check, further kill() calls see "stopped").
      this.emitTerminal({
        taskId: item.taskId,
        pid,
        label: item.label,
        command: item.command,
        status: "stopped",
        promoted: item.promoted,
      });
      return true;
    }
    return false;
  }

  stopAll(
    signal: "SIGTERM" | "SIGKILL" = "SIGTERM",
    opts?: { includePersist?: boolean; backgroundOnly?: boolean },
  ): void {
    for (const item of this.processes.values()) {
      // backgroundOnly scopes the bulk stop to what the user perceives as
      // background tasks (user-initiated /stop all, desktop stop-all): a
      // transient foreground envelope stays owned by its foreground runner
      // (abort/timeout). The process-exit fallback calls stopAll() without
      // options — at exit everything must be killed, transient included.
      if (opts?.backgroundOnly && item.transient) continue;
      if (item.status === "running" && (opts?.includePersist || !item.persist)) {
        try {
          if (process.platform === "win32") {
            process.kill(item.pid, signal);
          } else {
            process.kill(-item.pgid, signal);
          }
        } catch {
          try {
            process.kill(item.pid, signal);
          } catch {
            // ESRCH guard
          }
        }
        item.status = "stopped";
        this.eventLog.append({ taskId: item.taskId, pid: item.pid, type: "killed" });
        this.emitTerminal({
          taskId: item.taskId,
          pid: item.pid,
          label: item.label,
          command: item.command,
          status: "stopped",
          promoted: item.promoted,
        });
      }
    }
  }

  markExited(pid: number, exitCode: number, resultCapsule?: ProcessTaskResultCapsule): void {
    const item = this.processes.get(pid);
    if (item && item.status === "running") {
      // Only record natural exit while still running. If the user already
      // killed the process (status "stopped"), a late close event must not
      // overwrite that — "stopped" means "user-initiated", which is distinct
      // from a natural "exited"/"failed" and /procs relies on the difference.
      item.exitCode = exitCode;
      if (resultCapsule) item.resultCapsule = resultCapsule;
      item.status = exitCode === 0 ? "exited" : "failed";
      this.eventLog.append({
        taskId: item.taskId,
        pid,
        type: "exited",
        exitCode,
      });
      // Same-instant terminal emission as the event-log append (see
      // onProcessTerminal). Guarded by the "running" check above, so each
      // task notifies at most once. The capsule (when provided) rides on the
      // notice so the wake carries the result directly.
      this.emitTerminal({
        taskId: item.taskId,
        pid,
        label: item.label,
        command: item.command,
        status: item.status,
        exitCode,
        promoted: item.promoted,
        ...(item.resultCapsule ? { resultCapsule: item.resultCapsule } : {}),
      });
    }
  }

  /**
   * Grace-period completion: the command ended before detach promotion, so the
   * envelope is transient by design — record the final event, then drop the
   * envelope entirely ("不留痕是结果"). The event stream keeps the audit trail.
   * No-op for already-promoted envelopes (their lifecycle is owned by
   * markExited after detach).
   */
  completeTransient(pid: number, exitCode: number): void {
    const item = this.processes.get(pid);
    if (!item || item.promoted) return;
    this.eventLog.append({ taskId: item.taskId, pid, type: "exited", exitCode });
    this.processes.delete(pid);
    this.byTaskId.delete(item.taskId);
  }

  /** Drop an envelope without emitting events (spawn/registration failure paths). */
  remove(pid: number): boolean {
    const item = this.processes.get(pid);
    if (!item) return false;
    this.processes.delete(pid);
    this.byTaskId.delete(item.taskId);
    return true;
  }

  clear(): void {
    this.processes.clear();
    this.byTaskId.clear();
    this.eventLog.clear();
    // Registry teardown (tests / workspace reuse in-process) must not leave
    // listeners subscribed to a different lifecycle's envelopes.
    this.terminalListeners.clear();
  }
}

let registry: ProcessRegistry | null = null;

export function getProcessRegistry(): ProcessRegistry {
  if (!registry) {
    registry = new ProcessRegistry();
  }
  return registry;
}
