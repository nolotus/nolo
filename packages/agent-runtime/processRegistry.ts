// packages/agent-runtime/processRegistry.ts
//
// In-memory Execution Envelope registry for the ProcessTask layer (Phase 0).
// Each spawned command is pre-registered at spawn time (stable taskId, see
// docs/handoff/2026-08-27-async-task-agents-research-handoff.md 3.2；
// 原始会商论证见 docs/handoff/2026-08-27-async-task-agents-archive.md §12.1 item 2)
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
};

export type RegisteredProcessInput = {
  pid: number;
  pgid: number;
  command: string;
  label: string;
  persist?: boolean;
  /**
   * Mark the envelope as a transient foreground grace-period tracker. Only the
   * workspaceShell pre-registration sets this; omit it (false) for real
   * background tasks (launchProcess) and post-detach records.
   */
  transient?: boolean;
  /** Pre-generated taskId; a fresh one is minted when omitted. */
  taskId?: string;
};

let taskIdCounter = 0;

/** Stable, process-unique envelope id (pid is reused by the OS; this is not). */
function mintTaskId(pid: number): string {
  taskIdCounter += 1;
  return `ptask-${pid}-${Date.now().toString(36)}-${taskIdCounter.toString(36)}`;
}

export class ProcessRegistry {
  private processes = new Map<number, RegisteredProcess>();
  private byTaskId = new Map<string, number>();
  private eventLog: ProcessTaskEventLog;

  constructor(eventLogOptions?: ProcessTaskEventLogOptions) {
    this.eventLog = new ProcessTaskEventLog(eventLogOptions);
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
      promoted: false,
      transient: proc.transient ?? false,
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
        process.kill(-item.pgid, signal);
      } catch {
        // ESRCH or unkillable - process might already be dead
      }
      item.status = "stopped";
      this.eventLog.append({ taskId: item.taskId, pid, type: "killed" });
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
          process.kill(-item.pgid, signal);
        } catch {
          // ESRCH guard
        }
        item.status = "stopped";
        this.eventLog.append({ taskId: item.taskId, pid: item.pid, type: "killed" });
      }
    }
  }

  markExited(pid: number, exitCode: number): void {
    const item = this.processes.get(pid);
    if (item && item.status === "running") {
      // Only record natural exit while still running. If the user already
      // killed the process (status "stopped"), a late close event must not
      // overwrite that — "stopped" means "user-initiated", which is distinct
      // from a natural "exited"/"failed" and /procs relies on the difference.
      item.exitCode = exitCode;
      item.status = exitCode === 0 ? "exited" : "failed";
      this.eventLog.append({
        taskId: item.taskId,
        pid,
        type: "exited",
        exitCode,
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
  }
}

let registry: ProcessRegistry | null = null;

export function getProcessRegistry(): ProcessRegistry {
  if (!registry) {
    registry = new ProcessRegistry();
  }
  return registry;
}
