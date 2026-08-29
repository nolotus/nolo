import { test, expect, beforeEach } from "bun:test";
import { getProcessRegistry } from "./processRegistry";
import { spawn } from "node:child_process";

beforeEach(() => {
  getProcessRegistry().clear();
});

test("add, list, get basic operations", () => {
  const reg = getProcessRegistry();
  expect(reg.list()).toEqual([]);

  reg.add({ pid: 1234, pgid: 1234, command: "sleep 100", label: "sleep" });
  const list = reg.list();
  expect(list.length).toBe(1);
  expect(list[0]).toMatchObject({
    pid: 1234,
    pgid: 1234,
    command: "sleep 100",
    label: "sleep",
    status: "running",
  });
  expect(list[0]?.startedAt).toBeGreaterThan(0);

  const item = reg.get(1234);
  expect(item).toBeDefined();
  expect(item?.pid).toBe(1234);

  expect(reg.get(9999)).toBeUndefined();
});

test("markExited: code 0 -> exited, non-0 -> failed", () => {
  const reg = getProcessRegistry();
  reg.add({ pid: 101, pgid: 101, command: "cmd1", label: "cmd1" });
  reg.add({ pid: 102, pgid: 102, command: "cmd2", label: "cmd2" });

  reg.markExited(101, 0);
  expect(reg.get(101)).toMatchObject({
    status: "exited",
    exitCode: 0,
  });

  reg.markExited(102, 1);
  expect(reg.get(102)).toMatchObject({
    status: "failed",
    exitCode: 1,
  });
});

test("markExited does not overwrite user-stopped status (late close after kill)", () => {
  // kill() sets status to "stopped" (user-initiated). A late proc "close" event
  // arriving after the kill must not flip it to "exited"/"failed" — /procs
  // relies on "stopped" meaning "the user asked to stop this".
  const reg = getProcessRegistry();
  reg.add({ pid: 200, pgid: 200, command: "dev-server", label: "dev" });
  reg.kill(200);
  expect(reg.get(200)?.status).toBe("stopped");
  reg.markExited(200, 0);
  expect(reg.get(200)?.status).toBe("stopped");
  reg.markExited(200, 1);
  expect(reg.get(200)?.status).toBe("stopped");
});

test("kill terminates process group and updates status to stopped", async () => {
  const reg = getProcessRegistry();
  const detached = process.platform !== "win32";
  const child = spawn("sleep", ["60"], { detached, stdio: "ignore" });
  expect(child.pid).toBeDefined();
  const pid = child.pid!;
  const pgid = detached ? pid : pid;

  reg.add({ pid, pgid, command: "sleep 60", label: "sleep" });

  const killed = reg.kill(pid);
  expect(killed).toBe(true);
  expect(reg.get(pid)?.status).toBe("stopped");

  // Cleanup check: process should indeed be terminated or exiting
  child.kill();
});

test("kill non-existent pid tolerates ESRCH without throwing", () => {
  const reg = getProcessRegistry();
  // PID in registry but process actually non-existent in OS
  reg.add({ pid: 999999, pgid: 999999, command: "fake", label: "fake" });

  expect(() => reg.kill(999999)).not.toThrow();
  expect(reg.get(999999)?.status).toBe("stopped");

  // PID completely not in registry
  expect(reg.kill(888888)).toBe(false);
});

test("stopAll kills all running processes", () => {
  const reg = getProcessRegistry();
  const detached = process.platform !== "win32";
  const child1 = spawn("sleep", ["60"], { detached, stdio: "ignore" });
  const child2 = spawn("sleep", ["60"], { detached, stdio: "ignore" });

  reg.add({ pid: child1.pid!, pgid: child1.pid!, command: "sleep 60", label: "sleep" });
  reg.add({ pid: child2.pid!, pgid: child2.pid!, command: "sleep 60", label: "sleep" });
  reg.add({ pid: 300, pgid: 300, command: "done", label: "done" });
  reg.markExited(300, 0);

  reg.stopAll();

  expect(reg.get(child1.pid!)?.status).toBe("stopped");
  expect(reg.get(child2.pid!)?.status).toBe("stopped");
  expect(reg.get(300)?.status).toBe("exited"); // remained exited

  child1.kill();
  child2.kill();
});

test("stopAll skips persistent processes by default, but includes them when includePersist is true; kill() still terminates persistent process", () => {
  const reg = getProcessRegistry();
  const detached = process.platform !== "win32";
  const normalChild = spawn("sleep", ["60"], { detached, stdio: "ignore" });
  const persistChild = spawn("sleep", ["60"], { detached, stdio: "ignore" });

  reg.add({
    pid: normalChild.pid!,
    pgid: normalChild.pid!,
    command: "sleep 60",
    label: "normal",
    persist: false,
  });
  reg.add({
    pid: persistChild.pid!,
    pgid: persistChild.pid!,
    command: "sleep 60",
    label: "persistent",
    persist: true,
  });

  reg.stopAll();

  // Normal process cleared by stopAll
  expect(reg.get(normalChild.pid!)?.status).toBe("stopped");
  // Persistent process remains running after default stopAll
  expect(reg.get(persistChild.pid!)?.status).toBe("running");
  expect(reg.get(persistChild.pid!)?.persist).toBe(true);

  // stopAll with includePersist: true stops persistent process
  reg.stopAll(undefined, { includePersist: true });
  expect(reg.get(persistChild.pid!)?.status).toBe("stopped");

  normalChild.kill();
  persistChild.kill();
});

// --- Phase 0: Execution Envelope (pre-registration + append-only events) ---

test("add pre-registers an envelope with a stable taskId and a started event", () => {
  const reg = getProcessRegistry();
  const envelope = reg.add({ pid: 500, pgid: 500, command: "sleep 30", label: "sleep" });

  expect(envelope.taskId).toMatch(/^ptask-/);
  expect(envelope.status).toBe("running");
  expect(envelope.promoted).toBe(false);
  expect(reg.get(500)?.taskId).toBe(envelope.taskId);
  expect(reg.getByTaskId(envelope.taskId)?.pid).toBe(500);
  expect(reg.getTaskId(500)).toBe(envelope.taskId);

  const events = reg.getTaskEvents(envelope.taskId);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ seq: 1, type: "started", pid: 500 });
});

test("taskIds are unique per envelope even across pid reuse", () => {
  const reg = getProcessRegistry();
  const first = reg.add({ pid: 600, pgid: 600, command: "a", label: "a" });
  reg.completeTransient(600, 0); // grace GC frees pid 600
  const second = reg.add({ pid: 600, pgid: 600, command: "b", label: "b" });
  expect(second.taskId).not.toBe(first.taskId);
  expect(reg.getByTaskId(first.taskId)).toBeUndefined();
  expect(reg.getByTaskId(second.taskId)?.command).toBe("b");
});

test("promote reuses the same record and taskId (no second registration)", () => {
  const reg = getProcessRegistry();
  const envelope = reg.add({ pid: 700, pgid: 700, command: "sleep 30", label: "sleep" });

  const promoted = reg.promote(700);
  expect(promoted?.taskId).toBe(envelope.taskId);
  expect(promoted?.promoted).toBe(true);
  expect(promoted?.status).toBe("running");
  expect(reg.list()).toHaveLength(1);

  // Promoting twice is idempotent: one promoted event, still one record.
  expect(reg.promote(700)?.promoted).toBe(true);
  expect(reg.getTaskEvents(envelope.taskId).map((e) => [e.seq, e.type])).toEqual([
    [1, "started"],
    [2, "promoted"],
  ]);
  expect(reg.promote(999)).toBeUndefined();
});

test("completeTransient drops the envelope but keeps the event audit trail", () => {
  const reg = getProcessRegistry();
  const envelope = reg.add({ pid: 800, pgid: 800, command: "echo hi", label: "echo" });

  reg.completeTransient(800, 0);
  expect(reg.get(800)).toBeUndefined();
  expect(reg.getByTaskId(envelope.taskId)).toBeUndefined();
  expect(reg.getTaskEvents(envelope.taskId).map((e) => [e.seq, e.type, e.exitCode])).toEqual([
    [1, "started", undefined],
    [2, "exited", 0],
  ]);
  // Idempotent: completing an already-completed pid is a no-op.
  expect(() => reg.completeTransient(800, 1)).not.toThrow();
});

test("completeTransient never touches a promoted (background) envelope", () => {
  const reg = getProcessRegistry();
  reg.add({ pid: 810, pgid: 810, command: "sleep 30", label: "sleep" });
  reg.promote(810);

  reg.completeTransient(810, 0);
  expect(reg.get(810)?.status).toBe("running");
  expect(reg.list()).toHaveLength(1);
});

test("kill and stopAll emit killed events; late markExited keeps stopped and emits nothing", () => {
  const reg = getProcessRegistry();
  const env1 = reg.add({ pid: 900, pgid: 900, command: "dev-server", label: "dev" });
  reg.add({ pid: 901, pgid: 901, command: "watcher", label: "watch" });

  expect(reg.kill(900)).toBe(true);
  reg.stopAll();
  expect(reg.get(901)?.status).toBe("stopped");

  const lateCount = reg.getTaskEvents(env1.taskId).length;
  reg.markExited(900, 0); // late close after kill
  expect(reg.get(900)?.status).toBe("stopped");
  expect(reg.getTaskEvents(env1.taskId)).toHaveLength(lateCount);

  const killedEvents = reg.getTaskEvents(env1.taskId).filter((e) => e.type === "killed");
  expect(killedEvents).toHaveLength(1);
  expect(killedEvents[0]?.seq).toBe(2);
});

test("markExited emits an exited event with the exit code", () => {
  const reg = getProcessRegistry();
  const envelope = reg.add({ pid: 950, pgid: 950, command: "failing-cmd", label: "cmd" });

  reg.markExited(950, 3);
  expect(reg.get(950)).toMatchObject({ status: "failed", exitCode: 3 });
  expect(reg.getTaskEvents(envelope.taskId).map((e) => [e.seq, e.type, e.exitCode])).toEqual([
    [1, "started", undefined],
    [2, "exited", 3],
  ]);
});

test("remove drops the envelope without emitting events (spawn-failure path)", () => {
  const reg = getProcessRegistry();
  const envelope = reg.add({ pid: 960, pgid: 960, command: "x", label: "x" });
  expect(reg.remove(960)).toBe(true);
  expect(reg.remove(960)).toBe(false);
  expect(reg.get(960)).toBeUndefined();
  expect(reg.getTaskEvents(envelope.taskId).map((e) => e.type)).toEqual(["started"]);
});

test("transient pre-registered foreground envelope is hidden from listBackground but kept in list()", () => {
  const reg = getProcessRegistry();
  reg.add({ pid: 1100, pgid: 1100, command: "sleep 2", label: "fg", transient: true });

  // User-visible view: nothing (pre-Phase-0 status-line //procs semantics).
  expect(reg.listBackground()).toEqual([]);
  // Audit/internal full truth: the envelope is still tracked.
  expect(reg.list()).toHaveLength(1);
  expect(reg.list()[0]).toMatchObject({ pid: 1100, label: "fg", transient: true, promoted: false });
});

test("promote() flips a transient envelope into a visible background task", () => {
  const reg = getProcessRegistry();
  const envelope = reg.add({ pid: 1200, pgid: 1200, command: "sleep 60", label: "later-bg", transient: true });
  expect(reg.listBackground()).toEqual([]);

  const promoted = reg.promote(1200);
  expect(promoted).toMatchObject({ taskId: envelope.taskId, promoted: true, transient: false });
  expect(reg.listBackground().map((p) => p.pid)).toEqual([1200]);
  expect(reg.listBackground()[0]).toMatchObject({ promoted: true, transient: false });
  // Same taskId survives promotion (no re-registration).
  expect(reg.getByTaskId(envelope.taskId)?.pid).toBe(1200);
});

test("launchProcess-style registration (no transient flag) is a background task from birth", () => {
  const reg = getProcessRegistry();
  reg.add({ pid: 1300, pgid: 1300, command: "bun run dev", label: "dev", persist: true });

  expect(reg.listBackground().map((p) => p.pid)).toEqual([1300]);
  expect(reg.listBackground()[0]).toMatchObject({ transient: false, promoted: false, persist: true });
});

test("stopAll(backgroundOnly) spares transient envelopes; plain stopAll (exit fallback) kills everything", () => {
  const reg = getProcessRegistry();
  const fg = reg.add({ pid: 1400, pgid: 1400, command: "sleep 5", label: "fg", transient: true });
  const bg = reg.add({ pid: 1401, pgid: 1401, command: "sleep 60", label: "bg" });

  // User-initiated bulk stop (/stop all, desktop stop-all): background only.
  reg.stopAll(undefined, { includePersist: true, backgroundOnly: true });
  expect(reg.get(1401)?.status).toBe("stopped");
  expect(reg.get(1400)?.status).toBe("running");

  // Process-exit fallback: everything must die, transient included. Promote
  // first to prove a promoted envelope is also killed by the fallback.
  reg.promote(1400);
  expect(reg.get(1400)?.promoted).toBe(true);
  reg.stopAll(undefined, { includePersist: true });
  expect(reg.get(1400)?.status).toBe("stopped");
  expect(reg.getTaskEvents(fg.taskId).map((e) => e.type)).toEqual(["started", "promoted", "killed"]);
  expect(reg.getTaskEvents(bg.taskId).map((e) => e.type)).toEqual(["started", "killed"]);
});
