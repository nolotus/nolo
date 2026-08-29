import { describe, test, expect } from "bun:test";
import {
  PROCESS_TASK_STATUSES,
  PROCESS_TASK_TERMINAL_STATUSES,
  PROCESS_TASK_EVENT_TYPES,
  isProcessTaskTerminalStatus,
  ProcessTaskEventLog,
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

describe("ProcessTaskEventLog", () => {
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
});
