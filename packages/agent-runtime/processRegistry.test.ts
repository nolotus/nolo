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
