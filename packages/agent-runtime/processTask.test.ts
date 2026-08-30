import { describe, test, expect } from "bun:test";
import {
  PROCESS_TASK_STATUSES,
  PROCESS_TASK_TERMINAL_STATUSES,
  PROCESS_TASK_EVENT_TYPES,
  isProcessTaskTerminalStatus,
  reportedTaskStatus,
  ProcessTaskEventLog,
  DEFAULT_TASK_EVENT_RETENTION_MS,
  DEFAULT_MAX_TASK_EVENTS_TASKS,
} from "./processTask";

describe("PROCESS_TASK_STATUSES (single source of truth)", () => {
  test("exposes exactly the registry's status axis", () => {
    expect([...PROCESS_TASK_STATUSES]).toEqual(["running", "stopped", "exited", "failed"]);
  });

  test("terminal statuses are stopped/exited/failed, never running", () => {
    expect([...PROCESS_TASK_TERMINAL_STATUSES]).toEqual(["stopped", "exited", "failed"]);
    for (const status of PROCESS_TASK_TERMINAL_STATUSES) {
      expect(isProcessTaskTerminalStatus(status)).toBe(true);
    }
    expect(isProcessTaskTerminalStatus("running")).toBe(false);
  });

  test("rejects non-layer values (including agent-run axis values)", () => {
    // The agent-run file axis (~/.nolo/runs) uses values like "killed" /
    // "timeout" / "done"; they intentionally do NOT belong to the registry
    // axis and must not be accepted here (§12.7 layering).
    expect(isProcessTaskTerminalStatus("killed")).toBe(false);
    expect(isProcessTaskTerminalStatus("timeout")).toBe(false);
    expect(isProcessTaskTerminalStatus("done")).toBe(false);
    expect(isProcessTaskTerminalStatus(undefined)).toBe(false);
    expect(isProcessTaskTerminalStatus("")).toBe(false);
  });
});

describe("PROCESS_TASK_EVENT_TYPES", () => {
  test("exactly started/promoted/exited/killed", () => {
    expect([...PROCESS_TASK_EVENT_TYPES]).toEqual(["started", "promoted", "exited", "killed"]);
  });
});

describe("reportedTaskStatus (§1.2 ruling solidification)", () => {
  test("maps event-axis 'killed' signal to 'stopped' status", () => {
    // Solidifies §1.2: 'killed' is an event type, never a registry status;
    // external reporting (such as taskStop) must map it to 'stopped'.
    expect(reportedTaskStatus("killed")).toBe("stopped");
  });

  test("maps 'exited' event to 'exited' or 'failed' based on exitCode", () => {
    expect(reportedTaskStatus("exited")).toBe("exited");
    expect(reportedTaskStatus("exited", 0)).toBe("exited");
    expect(reportedTaskStatus("exited", 1)).toBe("failed");
    expect(reportedTaskStatus("exited", 137)).toBe("failed");
  });

  test("maps active lifecycle events ('started', 'promoted') to 'running'", () => {
    expect(reportedTaskStatus("started")).toBe("running");
    expect(reportedTaskStatus("promoted")).toBe("running");
  });

  test("passes through existing registry status axis values unchanged", () => {
    expect(reportedTaskStatus("running")).toBe("running");
    expect(reportedTaskStatus("stopped")).toBe("stopped");
    expect(reportedTaskStatus("exited")).toBe("exited");
    expect(reportedTaskStatus("failed")).toBe("failed");
  });
});

describe("ProcessTaskEventLog (monotonic & immutability)", () => {
  test("appends with per-task monotonic seq starting at 1", () => {
    const log = new ProcessTaskEventLog();
    const a1 = log.append({ taskId: "t-a", pid: 1, type: "started" });
    const a2 = log.append({ taskId: "t-a", pid: 1, type: "promoted" });
    const a3 = log.append({ taskId: "t-a", pid: 1, type: "exited", exitCode: 0 });

    expect(a1.seq).toBe(1);
    expect(a2.seq).toBe(a1.seq + 1);
    expect(a3.seq).toBe(a2.seq + 1);
    expect(log.latestSeq("t-a")).toBe(3);
    expect(a3.exitCode).toBe(0);
  });

  test("seq is independent across tasks", () => {
    const log = new ProcessTaskEventLog();
    log.append({ taskId: "t-a", pid: 1, type: "started" });
    const b1 = log.append({ taskId: "t-b", pid: 2, type: "started" });
    expect(b1.seq).toBe(1);
  });

  test("read(cursor) returns only events after the cursor, ascending", () => {
    const log = new ProcessTaskEventLog();
    for (const type of ["started", "promoted", "exited"] as const) {
      log.append({ taskId: "t", pid: 7, type });
    }

    expect(log.read("t").map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(log.read("t", 0).map((e) => e.type)).toEqual(["started", "promoted", "exited"]);
    expect(log.read("t", 1).map((e) => e.type)).toEqual(["promoted", "exited"]);
    expect(log.read("t", 3)).toEqual([]);
    expect(log.read("missing")).toEqual([]);
  });

  test("reads return copies; the store is not reachable via mutation", () => {
    const log = new ProcessTaskEventLog();
    const appended = log.append({ taskId: "t", pid: 1, type: "started" });
    appended.type = "killed";
    expect(log.read("t")[0]?.type).toBe("started");

    const snapshot = log.read("t");
    snapshot.push({ ...snapshot[0]!, seq: 99, type: "killed" });
    expect(log.read("t")).toHaveLength(1);
    expect(log.latestSeq("t")).toBe(1);
  });

  test("has expected default configuration constants", () => {
    expect(DEFAULT_TASK_EVENT_RETENTION_MS).toBe(5 * 60 * 1000);
    expect(DEFAULT_MAX_TASK_EVENTS_TASKS).toBe(200);
  });
});

describe("ProcessTaskEventLog retention policy (§1.1)", () => {
  test("(a) retains events before the retention delay window expires", () => {
    let nowTime = 10_000;
    const log = new ProcessTaskEventLog({
      retentionMs: 5_000,
      now: () => nowTime,
    });

    log.append({ taskId: "t-1", pid: 101, type: "started" });
    nowTime += 1_000;
    log.append({ taskId: "t-1", pid: 101, type: "promoted" });
    nowTime += 1_000;
    log.append({ taskId: "t-1", pid: 101, type: "exited", exitCode: 0 });

    // Advance 3s (retention window is 5s, so 3s < 5s)
    nowTime += 3_000;

    // Trigger lazy eviction by appending to another task
    log.append({ taskId: "t-2", pid: 102, type: "started" });

    // t-1 must still be fully intact and readable
    const events = log.read("t-1");
    expect(events).toHaveLength(3);
    expect(events.map((e) => e.type)).toEqual(["started", "promoted", "exited"]);
    expect(log.latestSeq("t-1")).toBe(3);
    expect(log.getStats().activeTaskCount).toBe(1);
    expect(log.getStats().terminalTaskCount).toBe(1);
  });

  test("(b) completely evicts completed task once retention window is exceeded", () => {
    let nowTime = 10_000;
    const log = new ProcessTaskEventLog({
      retentionMs: 5_000,
      now: () => nowTime,
    });

    log.append({ taskId: "t-1", pid: 101, type: "started" });
    nowTime += 1_000;
    log.append({ taskId: "t-1", pid: 101, type: "killed" });

    // Advance 5.001s (5001ms >= 5000ms retention window)
    nowTime += 5_001;

    // Trigger eviction via append on t-2
    log.append({ taskId: "t-2", pid: 102, type: "started" });

    // t-1 must be completely removed
    expect(log.read("t-1")).toEqual([]);
    expect(log.latestSeq("t-1")).toBe(0);

    const stats = log.getStats();
    expect(stats.evictedCount).toBe(1);
    expect(stats.taskCount).toBe(1);
    expect(stats.terminalTaskCount).toBe(0);
    expect(stats.activeTaskCount).toBe(1);
  });

  test("(c) capacity fallback prioritizes evicting oldest completed tasks", () => {
    let nowTime = 1_000;
    const log = new ProcessTaskEventLog({
      maxTasks: 3,
      retentionMs: 100_000, // Long window so time-based eviction won't fire
      now: () => nowTime,
    });

    // Task 1: finishes first at time 1100
    log.append({ taskId: "t-1", pid: 101, type: "started" });
    nowTime = 1_100;
    log.append({ taskId: "t-1", pid: 101, type: "exited", exitCode: 0 });

    // Task 2: finishes second at time 1300
    nowTime = 1_200;
    log.append({ taskId: "t-2", pid: 102, type: "started" });
    nowTime = 1_300;
    log.append({ taskId: "t-2", pid: 102, type: "killed" });

    // Task 3: remains active
    nowTime = 1_400;
    log.append({ taskId: "t-3", pid: 103, type: "started" });

    expect(log.getStats().taskCount).toBe(3);

    // Task 4 arrives: triggers maxTasks (3) overflow
    nowTime = 1_500;
    log.append({ taskId: "t-4", pid: 104, type: "started" });

    // t-1 (oldest completed at 1100) must be evicted first
    expect(log.read("t-1")).toEqual([]);
    // t-2 (completed later at 1300) must remain
    expect(log.read("t-2")).toHaveLength(2);
    // t-3 (active) and t-4 (active) must remain
    expect(log.read("t-3")).toHaveLength(1);
    expect(log.read("t-4")).toHaveLength(1);

    expect(log.getStats().taskCount).toBe(3);
    expect(log.getStats().evictedCount).toBe(1);
  });

  test("(d) never evicts active tasks even under extreme capacity overflow", () => {
    let nowTime = 1_000;
    const log = new ProcessTaskEventLog({
      maxTasks: 2,
      retentionMs: 100_000,
      now: () => nowTime,
    });

    // Append 4 active tasks (none have exited/killed events)
    log.append({ taskId: "t-1", pid: 101, type: "started" });
    log.append({ taskId: "t-2", pid: 102, type: "started" });
    log.append({ taskId: "t-3", pid: 103, type: "started" });
    log.append({ taskId: "t-4", pid: 104, type: "started" });

    // All active tasks must be preserved completely
    expect(log.read("t-1")).toHaveLength(1);
    expect(log.read("t-2")).toHaveLength(1);
    expect(log.read("t-3")).toHaveLength(1);
    expect(log.read("t-4")).toHaveLength(1);

    const stats = log.getStats();
    expect(stats.taskCount).toBe(4);
    expect(stats.activeTaskCount).toBe(4);
    expect(stats.terminalTaskCount).toBe(0);
    expect(stats.evictedCount).toBe(0);
    expect(stats.activeOverflowCount).toBe(2); // Overflows on 3rd and 4th additions
  });

  test("hasTask disambiguates the empty read of an evicted task from an idle one", () => {
    // The Phase 1 cursor consumers (taskWait/taskLogs) cannot tell "no new
    // events" from "task evicted" by read() alone — both yield []. hasTask is
    // the documented judge; without it a wait loop hangs forever on an evicted
    // task. Guard the pairing so the contract cannot silently regress.
    let nowTime = 1_000;
    const log = new ProcessTaskEventLog({ retentionMs: 2_000, now: () => nowTime });

    log.append({ taskId: "t-live", pid: 201, type: "started" });
    log.append({ taskId: "t-gone", pid: 202, type: "started" });
    log.append({ taskId: "t-gone", pid: 202, type: "exited", exitCode: 0 });

    // Caught up on a live task: empty read, but the trail is still there.
    expect(log.read("t-live", log.latestSeq("t-live"))).toEqual([]);
    expect(log.hasTask("t-live")).toBe(true);

    // Terminal but still inside the retention window: fully readable.
    expect(log.read("t-gone").map((e) => e.seq)).toEqual([1, 2]);
    expect(log.hasTask("t-gone")).toBe(true);

    // Past the window: the whole trail is gone, and hasTask says so.
    nowTime = 4_000;
    log.append({ taskId: "t-live", pid: 201, type: "promoted" });
    expect(log.read("t-gone")).toEqual([]);
    expect(log.hasTask("t-gone")).toBe(false);

    // A live task is never evicted, so it stays distinguishable.
    expect(log.hasTask("t-live")).toBe(true);
  });

  test("(e) eviction is strictly all-or-nothing and never produces seq gaps", () => {
    let nowTime = 1_000;
    const log = new ProcessTaskEventLog({
      retentionMs: 2_000,
      now: () => nowTime,
    });

    log.append({ taskId: "t-1", pid: 101, type: "started" });
    nowTime = 1_100;
    log.append({ taskId: "t-1", pid: 101, type: "promoted" });
    nowTime = 1_200;
    log.append({ taskId: "t-1", pid: 101, type: "exited", exitCode: 0 });

    // Before eviction: continuous seq from 1 to 3
    expect(log.read("t-1").map((e) => e.seq)).toEqual([1, 2, 3]);
    expect(log.read("t-1", 1).map((e) => e.seq)).toEqual([2, 3]);
    expect(log.read("t-1", 2).map((e) => e.seq)).toEqual([3]);

    // Fast-forward past retention window
    nowTime = 3_500;
    log.append({ taskId: "t-2", pid: 102, type: "started" });

    // After eviction: whole stream is gone, no partial hole/fragment
    expect(log.read("t-1", 0)).toEqual([]);
    expect(log.read("t-1", 1)).toEqual([]);
    expect(log.read("t-1", 2)).toEqual([]);
    expect(log.latestSeq("t-1")).toBe(0);
  });

  test("clear resets events, terminal map and stats", () => {
    const log = new ProcessTaskEventLog();
    log.append({ taskId: "t-1", pid: 101, type: "started" });
    log.append({ taskId: "t-1", pid: 101, type: "exited", exitCode: 0 });

    expect(log.getStats().taskCount).toBe(1);
    log.clear();

    expect(log.getStats().taskCount).toBe(0);
    expect(log.getStats().terminalTaskCount).toBe(0);
    expect(log.getStats().evictedCount).toBe(0);
    expect(log.read("t-1")).toEqual([]);
  });
});
