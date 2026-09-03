// packages/agent-runtime/processTaskTools.test.ts
//
// Phase 1 tool layer tests. Two rules for this file:
// - No real sleeping. Clock and sleep are injected everywhere; a test that
//   waits on wall time would be both slow and unable to prove the hang bounds.
// - No real signals to live process groups. Fake pids follow the
//   processRegistry.test.ts precedent (high pids whose kill throws ESRCH), and
//   every escalation path uses an injected signal sender.

import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { ProcessRegistry, type RegisteredProcess } from "./processRegistry";
import type { ProcessTaskEvent } from "./processTask";
import {
  TASK_WAIT_DEFAULT_TIMEOUT_MS,
  TASK_WAIT_MAX_TIMEOUT_MS,
  formatTaskLogsContent,
  isProcessGroupAlive,
  resolveTaskWaitTimeoutMs,
  runTaskLogs,
  runTaskStop,
  runTaskWait,
  runTasks,
  type SignalSender,
  type TaskToolsRegistry,
} from "./processTaskTools";
import { buildWorkspaceToolDefinition } from "./localWorkspaceToolDefs";
import { createLocalWorkspaceToolExecutors } from "./localWorkspaceTools";
import { DEFAULT_LOCAL_TOOLS } from "./localToolPolicy";

function createClock(start = 1_000) {
  let current = start;
  return {
    now: () => current,
    advance: (ms: number) => {
      current += ms;
    },
  };
}

const failSleep = async () => {
  throw new Error("wait loop slept when it should have returned immediately");
};

function esrch(): NodeJS.ErrnoException {
  const error = new Error("no such process") as NodeJS.ErrnoException;
  error.code = "ESRCH";
  return error;
}

/** Signal sender double: records every call, decides liveness per test. */
function createSignalSpy(options: { aliveAfterTerm: boolean; probeError?: "ESRCH" | "EPERM" }) {
  const calls: Array<{ pid: number; signal: NodeJS.Signals | 0 }> = [];
  const kill: SignalSender = (pid, signal) => {
    calls.push({ pid, signal });
    if (signal === 0 && !options.aliveAfterTerm) throw esrch();
    if (signal === 0 && options.probeError === "EPERM") {
      const error = new Error("operation not permitted") as NodeJS.ErrnoException;
      error.code = "EPERM";
      throw error;
    }
  };
  return { calls, kill };
}

let fakePidSeed = 900_000;
function nextFakePid(): number {
  fakePidSeed += 1;
  return fakePidSeed;
}

function addTask(
  registry: ProcessRegistry,
  overrides?: Partial<{ label: string; command: string; persist: boolean; transient: boolean }>,
): RegisteredProcess & { pid: number } {
  const pid = nextFakePid();
  return registry.add({
    pid,
    pgid: pid,
    command: overrides?.command ?? "bun run dev",
    label: overrides?.label ?? "dev",
    ...(overrides?.persist !== undefined ? { persist: overrides.persist } : {}),
    ...(overrides?.transient !== undefined ? { transient: overrides.transient } : {}),
  }) as RegisteredProcess & { pid: number };
}

describe("taskWait", () => {
  test("returns the terminal status, exitCode and cursor for a finished task without sleeping", async () => {
    const registry = new ProcessRegistry();
    const task = addTask(registry, { label: "build" });
    registry.markExited(task.pid, 2);

    const result = await runTaskWait({
      taskId: task.taskId,
      registry,
      sleep: failSleep,
      now: createClock().now,
    });

    expect(result.outcome).toBe("terminal");
    if (result.outcome !== "terminal") throw new Error("unreachable");
    // exitCode 2 → "failed" comes from reportedTaskStatus, not a local branch.
    expect(result.status).toBe("failed");
    expect(result.exitCode).toBe(2);
    expect(result.cursor).toBe(registry.latestTaskSeq(task.taskId));
    expect(result.cursor).toBe(2);
    expect(result.events.map((event) => event.type)).toEqual(["started", "exited"]);
  });

  test("maps a killed task to stopped (event axis never leaks)", async () => {
    const registry = new ProcessRegistry();
    const task = addTask(registry);
    registry.kill(task.pid);

    const result = await runTaskWait({ taskId: task.taskId, registry, sleep: failSleep });

    expect(result.outcome).toBe("terminal");
    if (result.outcome !== "terminal") throw new Error("unreachable");
    expect(result.status).toBe("stopped");
    expect(result.events.map((event) => event.type)).toEqual(["started", "killed"]);
  });

  test("polls until the terminal event appears, then reports it", async () => {
    const registry = new ProcessRegistry();
    const task = addTask(registry);
    const clock = createClock();
    const sleeps: number[] = [];

    const result = await runTaskWait({
      taskId: task.taskId,
      registry,
      timeoutMs: 5_000,
      pollIntervalMs: 250,
      now: clock.now,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock.advance(ms);
        if (sleeps.length === 3) registry.markExited(task.pid, 0);
      },
    });

    expect(sleeps).toEqual([250, 250, 250]);
    expect(result.outcome).toBe("terminal");
    if (result.outcome !== "terminal") throw new Error("unreachable");
    expect(result.status).toBe("exited");
    expect(result.exitCode).toBe(0);
    expect(result.waitedMs).toBe(750);
  });

  test("returns status running with a cursor on timeout so the caller can wait again", async () => {
    const registry = new ProcessRegistry();
    const task = addTask(registry);
    const clock = createClock();
    const sleeps: number[] = [];

    const result = await runTaskWait({
      taskId: task.taskId,
      registry,
      timeoutMs: 1_000,
      pollIntervalMs: 250,
      now: clock.now,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock.advance(ms);
      },
    });

    expect(sleeps).toEqual([250, 250, 250, 250]);
    expect(result.outcome).toBe("timeout");
    if (result.outcome !== "timeout") throw new Error("unreachable");
    expect(result.status).toBe("running");
    expect(result.cursor).toBe(1);
    expect(result.waitedMs).toBe(1_000);
    expect(result.timeoutMs).toBe(1_000);
    expect(result.timeoutClamped).toBeUndefined();
    // The task is untouched: waiting never stops anything.
    expect(registry.getByTaskId(task.taskId)?.status).toBe("running");
  });

  // 默认预算 == 上限，是有意的，不是笔误。
  //
  // 差额只会变成钱：一次 tool 往返 = 一次完整模型请求（整个对话重发），所以
  // 60s 默认值下一个跑 4 分钟的构建要花 4 次全量重发，其中 3 次的内容是
  // 「还没好」。等待循环放在工具里免费，放在模型手上按轮计费。
  // 想快速探活仍然可以显式传小 timeoutMs——默认值只决定「没想过这件事的
  // 调用」落在哪边，而那一边应该是便宜的一边。
  test("默认等待预算等于上限：一次调用覆盖整个预算，不靠模型续等", () => {
    expect(TASK_WAIT_DEFAULT_TIMEOUT_MS).toBe(TASK_WAIT_MAX_TIMEOUT_MS);
    // 显式小预算仍然原样生效（快速探活没被这个默认值堵死）。
    expect(resolveTaskWaitTimeoutMs(1_000)).toEqual({ timeoutMs: 1_000, clamped: false });
  });

  test("timeoutMs is clamped to the hard ceiling and the clamp is reported", async () => {
    expect(resolveTaskWaitTimeoutMs(undefined)).toEqual({
      timeoutMs: TASK_WAIT_DEFAULT_TIMEOUT_MS,
      clamped: false,
    });
    expect(resolveTaskWaitTimeoutMs("abc")).toEqual({
      timeoutMs: TASK_WAIT_DEFAULT_TIMEOUT_MS,
      clamped: false,
    });
    expect(resolveTaskWaitTimeoutMs(1_500)).toEqual({ timeoutMs: 1_500, clamped: false });
    expect(resolveTaskWaitTimeoutMs(-5)).toEqual({ timeoutMs: 0, clamped: true });
    expect(resolveTaskWaitTimeoutMs(60 * 60_000)).toEqual({
      timeoutMs: TASK_WAIT_MAX_TIMEOUT_MS,
      clamped: true,
    });

    const registry = new ProcessRegistry();
    const task = addTask(registry);
    const clock = createClock();
    const sleeps: number[] = [];
    const result = await runTaskWait({
      taskId: task.taskId,
      registry,
      timeoutMs: 24 * 60 * 60_000,
      pollIntervalMs: 60_000,
      now: clock.now,
      sleep: async (ms) => {
        sleeps.push(ms);
        clock.advance(ms);
      },
    });

    expect(result.outcome).toBe("timeout");
    if (result.outcome !== "timeout") throw new Error("unreachable");
    expect(result.timeoutMs).toBe(TASK_WAIT_MAX_TIMEOUT_MS);
    expect(result.timeoutClamped).toBe(true);
    // 5min ceiling / 1min poll = 5 waits, never the requested 24h.
    expect(sleeps).toEqual([60_000, 60_000, 60_000, 60_000, 60_000]);
  });

  test("timeoutMs 0 probes once and returns without sleeping", async () => {
    const registry = new ProcessRegistry();
    const task = addTask(registry);
    const result = await runTaskWait({
      taskId: task.taskId,
      registry,
      timeoutMs: 0,
      sleep: failSleep,
    });
    expect(result.outcome).toBe("timeout");
  });

  test("returns not-found immediately for an unknown taskId", async () => {
    const registry = new ProcessRegistry();
    const result = await runTaskWait({
      taskId: "ptask-does-not-exist",
      registry,
      timeoutMs: 10_000,
      sleep: failSleep,
    });
    expect(result.outcome).toBe("not-found");
    if (result.outcome !== "not-found") throw new Error("unreachable");
    expect(result.detail).toContain("tasks");
  });

  test("returns evicted (with the last known status) when the event trail aged out", async () => {
    const clock = createClock();
    // retentionMs 0: the terminal append evicts the trail in the same call.
    const registry = new ProcessRegistry({ retentionMs: 0, now: clock.now });
    const task = addTask(registry);
    registry.markExited(task.pid, 0);
    expect(registry.hasTaskEvents(task.taskId)).toBe(false);

    const result = await runTaskWait({
      taskId: task.taskId,
      registry,
      timeoutMs: 10_000,
      sleep: failSleep,
      now: clock.now,
    });

    expect(result.outcome).toBe("evicted");
    if (result.outcome !== "evicted") throw new Error("unreachable");
    expect(result.status).toBe("exited");
    expect(result.events).toEqual([]);
    expect(result.detail).toContain("do not wait again");
  });

  test("stops waiting when the trail is evicted mid-wait instead of polling forever", async () => {
    const started: ProcessTaskEvent = {
      taskId: "ptask-evicted-mid-wait",
      seq: 1,
      type: "started",
      pid: 4242,
      createdAt: 1,
    };
    let hasEvents = true;
    const registry: TaskToolsRegistry = {
      // Envelope already grace-GC'd: only the trail answered for this taskId.
      getByTaskId: () => undefined,
      listBackground: () => [],
      getTaskEvents: () => (hasEvents ? [started] : []),
      latestTaskSeq: () => (hasEvents ? 1 : 0),
      hasTaskEvents: () => hasEvents,
      kill: () => false,
    };
    const clock = createClock();
    let sleepCount = 0;

    const result = await runTaskWait({
      taskId: started.taskId,
      registry,
      timeoutMs: TASK_WAIT_MAX_TIMEOUT_MS,
      pollIntervalMs: 250,
      now: clock.now,
      sleep: async (ms) => {
        sleepCount += 1;
        clock.advance(ms);
        hasEvents = false;
      },
    });

    expect(sleepCount).toBe(1);
    expect(result.outcome).toBe("evicted");
    if (result.outcome !== "evicted") throw new Error("unreachable");
    expect(result.status).toBeUndefined();
    expect(result.cursor).toBe(0);
  });

  test("a frozen clock cannot hang the loop: the poll ceiling ends it", async () => {
    const registry = new ProcessRegistry();
    const task = addTask(registry);
    let sleepCount = 0;

    const result = await runTaskWait({
      taskId: task.taskId,
      registry,
      timeoutMs: 1_000,
      pollIntervalMs: 250,
      now: () => 1_000, // never advances
      sleep: async () => {
        sleepCount += 1;
      },
    });

    // ceil(1000/250) + 2 = 6 polls, then a timeout-shaped result.
    expect(sleepCount).toBe(6);
    expect(result.outcome).toBe("timeout");
  });
});

describe("taskLogs", () => {
  test("pages by cursor and is idempotent for the same cursor", () => {
    const registry = new ProcessRegistry();
    const task = addTask(registry, { label: "server" });

    const first = runTaskLogs({ taskId: task.taskId, registry });
    expect(first.outcome).toBe("ok");
    if (first.outcome !== "ok") throw new Error("unreachable");
    expect(first.events.map((event) => event.type)).toEqual(["started"]);
    expect(first.cursor).toBe(1);
    expect(first.status).toBe("running");
    expect(first.terminal).toBe(false);

    registry.promote(task.pid);
    registry.markExited(task.pid, 1);

    const second = runTaskLogs({ taskId: task.taskId, cursor: first.cursor, registry });
    expect(second.outcome).toBe("ok");
    if (second.outcome !== "ok") throw new Error("unreachable");
    expect(second.events.map((event) => event.type)).toEqual(["promoted", "exited"]);
    expect(second.events.map((event) => event.seq)).toEqual([2, 3]);
    expect(second.cursor).toBe(3);
    expect(second.status).toBe("failed");
    expect(second.terminal).toBe(true);

    // Same cursor again → same page (no consumption side effects).
    expect(runTaskLogs({ taskId: task.taskId, cursor: first.cursor, registry })).toEqual(second);
    // Cursor at the head → empty page, cursor unchanged.
    const tail = runTaskLogs({ taskId: task.taskId, cursor: second.cursor, registry });
    expect(tail.outcome).toBe("ok");
    if (tail.outcome !== "ok") throw new Error("unreachable");
    expect(tail.events).toEqual([]);
    expect(tail.cursor).toBe(3);
    // A stringified cursor from the model is coerced, not ignored.
    const coerced = runTaskLogs({ taskId: task.taskId, cursor: "1", registry });
    expect(coerced).toEqual(second);
  });

  test("distinguishes not-found from evicted", () => {
    const clock = createClock();
    const registry = new ProcessRegistry({ retentionMs: 0, now: clock.now });
    expect(runTaskLogs({ taskId: "ptask-nope", registry }).outcome).toBe("not-found");

    const task = addTask(registry);
    registry.kill(task.pid);
    expect(registry.hasTaskEvents(task.taskId)).toBe(false);

    const evicted = runTaskLogs({ taskId: task.taskId, registry });
    expect(evicted.outcome).toBe("evicted");
    if (evicted.outcome !== "evicted") throw new Error("unreachable");
    expect(evicted.status).toBe("stopped");
    expect(evicted.events).toEqual([]);
  });

  test("small payloads stay inline; oversized ones spill through the shared store as logRef", () => {
    const registry = new ProcessRegistry();
    const task = addTask(registry);
    const result = runTaskLogs({ taskId: task.taskId, registry });

    const inline = formatTaskLogsContent(result);
    expect(inline.logRef).toBeUndefined();
    expect(JSON.parse(inline.content)).toEqual(JSON.parse(JSON.stringify(result)));

    const root = mkdtempSync(join(tmpdir(), "task-logs-spill-"));
    const spilled = formatTaskLogsContent(result, { outputLimit: 32, workspaceRoot: root });
    expect(spilled.logRef).toBeDefined();
    expect(spilled.content).toContain("TOOL-OVERFLOW");
    expect(spilled.content).toContain(spilled.logRef!);
    const head = JSON.parse(spilled.content.slice(0, spilled.content.indexOf("\n\n[TOOL-OVERFLOW")));
    expect(head.events).toEqual([]);
    expect(head.eventsOmitted).toBe(1);
    // The full payload is recoverable from the spill file via readFile.
    const spillOnDisk = readFileSync(join(root, spilled.logRef!), "utf-8");
    expect(JSON.parse(spillOnDisk)).toEqual(JSON.parse(JSON.stringify(result)));
  });
});

describe("taskStop", () => {
  test("SIGTERM alone is enough when the group dies inside the grace window", async () => {
    const registry = new ProcessRegistry();
    const task = addTask(registry, { label: "server" });
    const registryKills: Array<[number, string | undefined]> = [];
    const originalKill = registry.kill.bind(registry);
    registry.kill = ((pid: number, signal?: "SIGTERM" | "SIGKILL") => {
      registryKills.push([pid, signal]);
      return originalKill(pid, signal);
    }) as typeof registry.kill;
    const signals = createSignalSpy({ aliveAfterTerm: false });
    const sleeps: number[] = [];

    const result = await runTaskStop({
      taskId: task.taskId,
      registry,
      graceMs: 2_000,
      sleep: async (ms) => {
        sleeps.push(ms);
      },
      kill: signals.kill,
    });

    expect(result).toEqual({
      outcome: "stopped",
      taskId: task.taskId,
      pid: task.pid,
      status: "stopped",
      signal: "SIGTERM",
      escalated: false,
    });
    // TERM goes through the registry (transient guard + killed event), and the
    // only raw call is the liveness probe.
    expect(registryKills).toEqual([[task.pid, "SIGTERM"]]);
    expect(signals.calls).toEqual([{ pid: -task.pid, signal: 0 }]);
    expect(sleeps).toEqual([2_000]);
    expect(registry.getTaskEvents(task.taskId).map((event) => event.type)).toEqual([
      "started",
      "killed",
    ]);
  });

  test("escalates to SIGKILL on the process group when TERM is ignored", async () => {
    const registry = new ProcessRegistry();
    const task = addTask(registry, { label: "stubborn" });
    const registryKills: Array<[number, string | undefined]> = [];
    const originalKill = registry.kill.bind(registry);
    registry.kill = ((pid: number, signal?: "SIGTERM" | "SIGKILL") => {
      registryKills.push([pid, signal]);
      return originalKill(pid, signal);
    }) as typeof registry.kill;
    // Test double for "process never receives TERM": still alive at probe time.
    const signals = createSignalSpy({ aliveAfterTerm: true });

    const result = await runTaskStop({
      taskId: task.taskId,
      registry,
      graceMs: 2_000,
      sleep: async () => {},
      kill: signals.kill,
    });

    expect(result).toEqual({
      outcome: "stopped",
      taskId: task.taskId,
      pid: task.pid,
      status: "stopped",
      signal: "SIGKILL",
      escalated: true,
    });
    expect(signals.calls).toEqual([
      { pid: -task.pid, signal: 0 },
      { pid: -task.pid, signal: "SIGKILL" },
    ]);
    // Exactly one registry-level kill and one killed event: the escalation is a
    // raw group signal, not a second registry stop (which would no-op anyway).
    expect(registryKills).toEqual([[task.pid, "SIGTERM"]]);
    expect(
      registry.getTaskEvents(task.taskId).filter((event) => event.type === "killed"),
    ).toHaveLength(1);
  });

  test("refuses to stop a transient foreground envelope and signals nothing", async () => {
    const registry = new ProcessRegistry();
    const task = addTask(registry, { label: "grep", transient: true });
    const kill: SignalSender = () => {
      throw new Error("transient envelope must never be signalled");
    };

    const result = await runTaskStop({
      taskId: task.taskId,
      registry,
      graceMs: 2_000,
      sleep: failSleep,
      kill,
    });

    expect(result.outcome).toBe("not-stoppable");
    if (result.outcome !== "not-stoppable") throw new Error("unreachable");
    expect(result.reason).toBe("transient-foreground");
    expect(result.status).toBe("running");
    expect(result.detail).toContain("execShell");
    // No killed event, status untouched: the guard inside kill() held.
    expect(registry.getTaskEvents(task.taskId).map((event) => event.type)).toEqual(["started"]);
    expect(registry.getByTaskId(task.taskId)?.status).toBe("running");
  });

  test("reports already-terminal instead of faking success", async () => {
    const registry = new ProcessRegistry();
    const task = addTask(registry);
    registry.markExited(task.pid, 0);
    const kill: SignalSender = () => {
      throw new Error("finished task must not be signalled");
    };

    const result = await runTaskStop({ taskId: task.taskId, registry, sleep: failSleep, kill });

    expect(result.outcome).toBe("not-stoppable");
    if (result.outcome !== "not-stoppable") throw new Error("unreachable");
    expect(result.reason).toBe("already-terminal");
    expect(result.status).toBe("exited");
  });

  test("reports not-found for an unknown taskId", async () => {
    const registry = new ProcessRegistry();
    const result = await runTaskStop({
      taskId: "ptask-missing",
      registry,
      sleep: failSleep,
      kill: () => {
        throw new Error("nothing to signal");
      },
    });
    expect(result.outcome).toBe("not-found");
  });

  test("liveness probe uses numeric signal 0 and treats EPERM as alive", () => {
    const seen: Array<NodeJS.Signals | 0> = [];
    expect(
      isProcessGroupAlive(1234, (_pid, signal) => {
        seen.push(signal);
      }),
    ).toBe(true);
    expect(seen).toEqual([0]);
    expect(typeof seen[0]).toBe("number");

    expect(
      isProcessGroupAlive(1234, () => {
        throw esrch();
      }),
    ).toBe(false);

    expect(
      isProcessGroupAlive(1234, () => {
        const error = new Error("not permitted") as NodeJS.ErrnoException;
        error.code = "EPERM";
        throw error;
      }),
    ).toBe(true);
  });
});

describe("tasks", () => {
  test("lists background handles only, excluding transient foreground envelopes", () => {
    const registry = new ProcessRegistry();
    const foreground = addTask(registry, { label: "grep", transient: true });
    const background = addTask(registry, { label: "dev", persist: true });

    const listed = runTasks({ registry });
    expect(listed.count).toBe(1);
    expect(listed.tasks).toHaveLength(1);
    expect(listed.tasks[0]).toMatchObject({
      taskId: background.taskId,
      pid: background.pid,
      label: "dev",
      status: "running",
      persist: true,
    });
    expect(typeof listed.tasks[0]!.startedAt).toBe("number");
    // No leaked internals (command/pgid/promoted/transient are not part of the
    // tool contract).
    expect(Object.keys(listed.tasks[0]!).sort()).toEqual([
      "label",
      "persist",
      "pid",
      "startedAt",
      "status",
      "taskId",
    ]);

    // Promotion (timeout detach) turns a foreground envelope into a real handle.
    registry.promote(foreground.pid);
    expect(runTasks({ registry }).tasks.map((task) => task.taskId).sort()).toEqual(
      [background.taskId, foreground.taskId].sort(),
    );

    // Status uses the reporting axis: non-zero exit → failed.
    registry.markExited(background.pid, 1);
    expect(
      runTasks({ registry }).tasks.find((task) => task.pid === background.pid)?.status,
    ).toBe("failed");
  });
});

describe("ProcessTask tool wiring", () => {
  test("the four tools are declared with the documented parameters", () => {
    const schemaOf = (name: string) => {
      const def = buildWorkspaceToolDefinition(name) as any;
      expect(def?.function?.name).toBe(name);
      return def.function.parameters;
    };

    const wait = schemaOf("taskWait");
    expect(Object.keys(wait.properties)).toEqual(["taskId", "timeoutMs"]);
    expect(wait.required).toEqual(["taskId"]);

    const logs = schemaOf("taskLogs");
    expect(Object.keys(logs.properties)).toEqual(["taskId", "cursor"]);
    expect(logs.required).toEqual(["taskId"]);

    const stop = schemaOf("taskStop");
    expect(Object.keys(stop.properties)).toEqual(["taskId"]);
    expect(stop.required).toEqual(["taskId"]);

    const tasks = schemaOf("tasks");
    expect(Object.keys(tasks.properties)).toEqual([]);
    expect(tasks.required).toBeUndefined();
  });

  test("execShell and launchProcess gain no execution-mode parameter (§3.1)", () => {
    for (const name of ["execShell", "launchProcess"]) {
      const def = buildWorkspaceToolDefinition(name) as any;
      const keys = Object.keys(def.function.parameters.properties ?? {});
      for (const forbidden of ["async", "mode", "background"]) {
        expect(keys).not.toContain(forbidden);
      }
    }
  });

  test("executors expose the four tools and validate taskId", async () => {
    const root = mkdtempSync(join(tmpdir(), "task-tools-exec-"));
    const executors = createLocalWorkspaceToolExecutors({ workspaceRoot: root });
    for (const name of ["taskWait", "taskLogs", "taskStop", "tasks"] as const) {
      expect(typeof executors[name]).toBe("function");
      expect(DEFAULT_LOCAL_TOOLS.has(name)).toBe(true);
    }

    const listed = await executors.tasks({ id: "c1", name: "tasks", arguments: "{}" });
    const parsedList = JSON.parse(listed.content);
    expect(Array.isArray(parsedList.tasks)).toBe(true);
    expect(parsedList.count).toBe(parsedList.tasks.length);

    const missing = await executors.taskWait({ id: "c2", name: "taskWait", arguments: "{}" });
    expect(JSON.parse(missing.content).outcome).toBe("invalid-arguments");

    const unknown = await executors.taskLogs({
      id: "c3",
      name: "taskLogs",
      arguments: JSON.stringify({ taskId: "ptask-unknown-to-global-registry" }),
    });
    expect(JSON.parse(unknown.content).outcome).toBe("not-found");

    const unknownStop = await executors.taskStop({
      id: "c4",
      name: "taskStop",
      arguments: JSON.stringify({ taskId: "ptask-unknown-to-global-registry" }),
    });
    expect(JSON.parse(unknownStop.content).outcome).toBe("not-found");

    // taskWait on an unknown id must return, not block the turn.
    const unknownWait = await executors.taskWait({
      id: "c5",
      name: "taskWait",
      arguments: JSON.stringify({ taskId: "ptask-unknown-to-global-registry", timeoutMs: 60_000 }),
    });
    expect(JSON.parse(unknownWait.content).outcome).toBe("not-found");
  });
});
