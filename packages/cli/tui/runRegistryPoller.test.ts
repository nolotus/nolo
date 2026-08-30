import { describe, expect, test } from "bun:test";

import type { AgentRunSnapshot } from "../client/agentRunSnapshot";
import type { RunRecord } from "../agentRunControl";
import {
  RUN_RECONCILE_SILENCE_MS,
  RUNNING_AGENT_COUNT_CACHE_TTL_MS,
  createRunRegistryPoller,
  getCachedRunningAgentCount,
  resetRunningAgentCountCacheForTest,
  snapshotFromRunRecord,
} from "./runRegistryPoller";
import { formatUnassignedFact } from "./runSnapshotDisplay";

const T0 = 1_700_000_000_000;

function record(over: Partial<RunRecord> & { runId: string }): RunRecord {
  return {
    agentKey: "worker",
    startedAt: new Date(T0).toISOString(),
    status: "running",
    logPath: `/tmp/${over.runId}.log`,
    ...over,
  } as RunRecord;
}

/**
 * 轮询器只认两件事：面板上现在挂着谁，以及磁盘上读到什么。两者都注入，
 * 所以测试不碰真实文件系统也不碰真实 timer。
 */
function setup(opts: { docked?: AgentRunSnapshot[]; discovered?: RunRecord[]; dialogId?: string } = {}) {
  let nowMs = T0;
  let tickCb: (() => void) | null = null;
  const docked = new Map<string, AgentRunSnapshot>();
  for (const run of opts.docked ?? []) docked.set(run.runId, run);
  const records = new Map<string, RunRecord>();
  let discovered = opts.discovered ?? [];
  for (const run of discovered) records.set(run.runId, run);
  const updates: AgentRunSnapshot[] = [];
  const reads: string[] = [];
  const reconciles: string[] = [];
  const polledBatches: RunRecord[][] = [];
  const throwOn = new Set<string>();
  let observerThrows = false;

  const poller = createRunRegistryPoller({
    getDockedRuns: () => [...docked.values()],
    update: (snapshot) => {
      updates.push(snapshot);
      // 真实接线里 dock 会把快照收下，面板下一轮就按新状态走。
      docked.set(snapshot.runId, { ...docked.get(snapshot.runId), ...snapshot });
    },
    discoverRuns: () => discovered,
    getCurrentDialogId: () => opts.dialogId,
    readRecord: (runId) => {
      reads.push(runId);
      if (throwOn.has(runId)) throw new Error("boom");
      return records.get(runId) ?? null;
    },
    reconcile: (runId) => {
      reconciles.push(runId);
      return records.get(runId) ?? null;
    },
    onRecordsPolled: (batch) => {
      if (observerThrows) throw new Error("observer boom");
      polledBatches.push(batch);
    },
    now: () => nowMs,
    setIntervalFn: (cb) => {
      tickCb = cb;
      return {};
    },
    clearIntervalFn: () => {
      tickCb = null;
    },
  });

  return {
    poller,
    updates,
    reads,
    reconciles,
    polledBatches,
    records,
    throwOn,
    set observerThrows(v: boolean) {
      observerThrows = v;
    },
    docked,
    setDiscovered(runs: RunRecord[]) {
      discovered = runs;
      for (const run of runs) records.set(run.runId, run);
    },
    dock(run: AgentRunSnapshot) {
      docked.set(run.runId, run);
    },
    advance(ms: number) {
      nowMs += ms;
    },
    tick() {
      tickCb?.();
    },
    get timerActive() {
      return tickCb !== null;
    },
    now: () => nowMs,
  };
}

function docked(over: Partial<AgentRunSnapshot> & { runId: string }): AgentRunSnapshot {
  return { status: "running", logKey: "", ...over };
}

describe("snapshotFromRunRecord", () => {
  test("carries the in-flight action the model's own status call never sees", () => {
    const snapshot = snapshotFromRunRecord(
      record({
        runId: "run-a",
        agentName: "Flash",
        activity: {
          lastEventAt: new Date(T0 + 9_000).toISOString(),
          inFlight: { kind: "tool", name: "Edit", sinceMs: 3_000 },
          counters: { llmCalls: 4, toolCalls: 24, fileEdits: 2 },
          updatedAt: new Date(T0 + 9_000).toISOString(),
        },
      }),
      T0 + 10_000
    );

    expect(snapshot.toolCallCount).toBe(24);
    expect(snapshot.inFlight?.kind).toBe("tool");
    expect(snapshot.inFlight?.name).toBe("Edit");
    // sinceMs 是采样值；换算成绝对起点后面板才能自己把秒数走下去。
    expect(snapshot.inFlight?.startedAt).toBe(T0 + 6_000);
  });

  test("an idle run reports inFlight as an explicit null, not a missing key", () => {
    const snapshot = snapshotFromRunRecord(
      record({
        runId: "run-a",
        activity: {
          lastEventAt: new Date(T0).toISOString(),
          inFlight: null,
          counters: { llmCalls: 1, toolCalls: 2, fileEdits: 0 },
          updatedAt: new Date(T0).toISOString(),
        },
      }),
      T0
    );
    // null = 我刚看过，它空着；undefined = 这个来源不知道。dock 靠这个区分。
    expect(snapshot.inFlight).toBeNull();
    expect("inFlight" in snapshot).toBe(true);
  });

  test("a terminal run reports its end time and drops any in-flight action", () => {
    const snapshot = snapshotFromRunRecord(
      record({
        runId: "run-a",
        status: "orphaned",
        endedAt: new Date(T0 + 60_000).toISOString(),
        note: "orphaned: process gone without writing terminal status",
        activity: {
          lastEventAt: new Date(T0).toISOString(),
          inFlight: { kind: "tool", name: "Edit", sinceMs: 1_000 },
          counters: { llmCalls: 1, toolCalls: 1, fileEdits: 0 },
          updatedAt: new Date(T0).toISOString(),
        },
      }),
      T0 + 90_000
    );

    expect(snapshot.finishedAt).toBe(T0 + 60_000);
    expect(snapshot.inFlight).toBeNull();
    // 终态的 note 就是死因。
    expect(snapshot.errorMessage).toContain("orphaned");
  });

  test("a bogus sinceMs cannot push the action's start before the epoch", () => {
    const snapshot = snapshotFromRunRecord(
      record({
        runId: "run-a",
        activity: {
          lastEventAt: new Date(T0).toISOString(),
          // 坏掉的 sinceMs（或采样期间时钟被回拨）会算出负数起点，面板会把它
          // 当成 1970 年，渲染成「已进行 19900 天」。
          inFlight: { kind: "tool", name: "Edit", sinceMs: T0 * 2 },
          counters: { llmCalls: 0, toolCalls: 0, fileEdits: 0 },
          updatedAt: new Date(T0).toISOString(),
        },
      }),
      T0
    );
    expect(snapshot.inFlight?.startedAt).toBe(T0);
  });

  test("an action cannot start in the future", () => {
    const snapshot = snapshotFromRunRecord(
      record({
        runId: "run-a",
        activity: {
          lastEventAt: new Date(T0 + 60_000).toISOString(),
          inFlight: { kind: "llm", name: "llm", sinceMs: 0 },
          // 记录是别的进程写的，它的钟可能比我们快。
          updatedAt: new Date(T0 + 60_000).toISOString(),
          counters: { llmCalls: 0, toolCalls: 0, fileEdits: 0 },
        },
      }),
      T0
    );
    expect(snapshot.inFlight?.startedAt).toBe(T0);
  });

  test("a running run's note is not mistaken for an error", () => {
    const snapshot = snapshotFromRunRecord(record({ runId: "run-a", note: "just a note" }), T0);
    expect(snapshot.errorMessage).toBeUndefined();
  });

  test("marks unassigned when record has no parentDialogId", () => {
    const unassignedSnapshot = snapshotFromRunRecord(
      record({ runId: "run-no-parent", parentDialogId: undefined }),
      T0
    );
    expect((unassignedSnapshot as any).unassigned).toBe(true);

    const assignedSnapshot = snapshotFromRunRecord(
      record({ runId: "run-with-parent", parentDialogId: "dialog-a" }),
      T0
    );
    expect((assignedSnapshot as any).unassigned).toBeUndefined();
  });

  test("formatUnassignedFact returns parent: ? when parentDialogId is missing", () => {
    const snapshot = snapshotFromRunRecord(
      record({ runId: "run-unassigned", parentDialogId: undefined }),
      T0
    );
    expect(formatUnassignedFact(snapshot as any)).toBe("parent: ?");

    const assigned = snapshotFromRunRecord(
      record({ runId: "run-assigned", parentDialogId: "dialog-a" }),
      T0
    );
    expect(formatUnassignedFact(assigned as any)).toBeNull();
  });
});

describe("run registry poller", () => {
  test("feeds the dock without anyone calling the model", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    h.records.set(
      "run-a",
      record({
        runId: "run-a",
        agentName: "Flash",
        activity: {
          lastEventAt: new Date(T0).toISOString(),
          inFlight: { kind: "tool", name: "Edit", sinceMs: 0 },
          counters: { llmCalls: 1, toolCalls: 5, fileEdits: 0 },
          updatedAt: new Date(T0).toISOString(),
        },
      })
    );

    h.poller.poll();
    expect(h.updates).toHaveLength(1);
    expect(h.updates[0]).toMatchObject({ runId: "run-a", toolCallCount: 5 });
  });

  test("unchanged records do not trigger a repaint every second", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    h.records.set("run-a", record({ runId: "run-a", agentName: "Flash" }));

    h.poller.poll();
    expect(h.updates).toHaveLength(1);
    // 年龄由 dock 自己的 tick 走，不该靠轮询器每秒推一次快照。
    h.advance(1000);
    h.poller.poll();
    h.advance(1000);
    h.poller.poll();
    expect(h.updates).toHaveLength(1);
  });

  test("a new tool call does push an update", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    h.records.set("run-a", record({ runId: "run-a" }));
    h.poller.poll();

    h.advance(1000);
    h.records.set(
      "run-a",
      record({
        runId: "run-a",
        activity: {
          lastEventAt: new Date(h.now()).toISOString(),
          inFlight: { kind: "tool", name: "Read", sinceMs: 0 },
          counters: { llmCalls: 1, toolCalls: 1, fileEdits: 0 },
          updatedAt: new Date(h.now()).toISOString(),
        },
      })
    );
    h.poller.poll();

    expect(h.updates).toHaveLength(2);
    expect(h.updates[1]?.inFlight?.name).toBe("Read");
  });

  test("runs that are not in the local registry are left to the model's path", () => {
    const h = setup({ docked: [docked({ runId: "server-run" })] });
    // 服务端跑的 run 本地没有记录文件——不代表它没了，不该动面板。
    h.poller.poll();
    expect(h.updates).toEqual([]);
  });

  test("terminal runs are not re-read", () => {
    const h = setup({
      docked: [docked({ runId: "run-a", status: "done" }), docked({ runId: "run-b" })],
    });
    h.records.set("run-a", record({ runId: "run-a", status: "done" }));
    h.records.set("run-b", record({ runId: "run-b" }));

    h.poller.poll();
    h.advance(1000);
    h.poller.poll();
    expect(h.reads).toEqual(["run-b", "run-b"]);
    expect(h.reconciles).toEqual([]);
  });

  test("a healthy run never pays for the orphan check", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    const fresh = () =>
      record({
        runId: "run-a",
        activity: {
          lastEventAt: new Date(h.now()).toISOString(),
          inFlight: null,
          counters: { llmCalls: 1, toolCalls: 1, fileEdits: 0 },
          updatedAt: new Date(h.now()).toISOString(),
        },
      });
    h.records.set("run-a", fresh());

    // 活着的 run 每 2 秒写一次 activity，所以永远不该 fork ps —— 那一步是
    // 同步的，跑在 TUI 主循环上就是一次卡顿。
    for (let i = 0; i < 30; i++) {
      h.poller.poll();
      h.advance(1000);
      h.records.set("run-a", fresh());
    }
    expect(h.reconciles).toEqual([]);
    expect(h.reads.length).toBe(30);
  });

  test("a run that goes silent gets its pid checked", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    h.records.set(
      "run-a",
      record({
        runId: "run-a",
        activity: {
          lastEventAt: new Date(h.now()).toISOString(),
          inFlight: { kind: "tool", name: "Edit", sinceMs: 0 },
          counters: { llmCalls: 1, toolCalls: 0, fileEdits: 0 },
          updatedAt: new Date(h.now()).toISOString(),
        },
      })
    );

    h.poller.poll();
    expect(h.reconciles).toEqual([]);

    // 记录不动了：可能是进程被 OOM 掉、崩了、没写终态就没了。这才是该问
    // 「pid 还在吗」的时刻。
    h.advance(RUN_RECONCILE_SILENCE_MS + 1);
    h.poller.poll();
    expect(h.reconciles).toEqual(["run-a"]);

    // 问过一次就别每秒重问。
    h.advance(1000);
    h.poller.poll();
    expect(h.reconciles).toEqual(["run-a"]);
  });

  test("a record with no activity yet falls back to the run start time", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    // 记录里还没有 activity 段（run 刚起、或是个老记录）：拿 startedAt 当
    // 新鲜度，否则一条陈年记录会被当成「刚刚有动静」而永远不被对账。
    h.records.set("run-a", record({ runId: "run-a" }));
    h.advance(RUN_RECONCILE_SILENCE_MS + 1);
    h.poller.poll();
    expect(h.reconciles).toEqual(["run-a"]);
  });

  test("a throwing reader skips that run instead of taking down the TUI", () => {
    const h = setup({ docked: [docked({ runId: "run-a" }), docked({ runId: "run-b" })] });
    h.records.set("run-b", record({ runId: "run-b" }));
    h.throwOn.add("run-a");

    expect(() => h.poller.poll()).not.toThrow();
    // 一条 run 读挂了不该连累另一条。
    expect(h.updates.map((u) => u.runId)).toEqual(["run-b"]);
  });

  test("a turn hold survives an empty tick and discovers a run dispatched mid-turn", () => {
    const h = setup({ dialogId: "dialog-a" });
    h.poller.beginHold();
    h.tick();
    expect(h.timerActive).toBe(true);

    h.setDiscovered([record({ runId: "run-a", parentDialogId: "dialog-a" })]);
    // Discovery is throttled to every fifth tick, but the poller remains alive
    // without another ensureRunning call from the host-tool path.
    h.tick();
    h.tick();
    h.tick();
    h.tick();
    h.tick();
    expect(h.updates.map((u) => u.runId)).toEqual(["run-a"]);

    h.poller.endHold();
    h.docked.set("run-a", docked({ runId: "run-a", status: "done" }));
    h.tick();
    expect(h.timerActive).toBe(false);
  });

  test("a stopped empty poller rediscovers a run on the next started tick", () => {
    const h = setup({ dialogId: "dialog-a" });
    h.poller.ensureRunning();
    h.tick();
    expect(h.timerActive).toBe(false);

    h.setDiscovered([record({ runId: "run-a", parentDialogId: "dialog-a" })]);
    h.poller.ensureRunning();
    h.tick();
    expect(h.updates.map((u) => u.runId)).toEqual(["run-a"]);
  });

  test("a terminal run first discovered within the linger window is shown once", () => {
    const terminal = record({
      runId: "run-a",
      parentDialogId: "dialog-a",
      status: "done",
      endedAt: new Date(T0).toISOString(),
    });
    const h = setup({ dialogId: "dialog-a", discovered: [terminal] });
    h.poller.ensureRunning();
    h.tick();
    expect(h.updates.map((u) => `${u.runId}:${u.status}`)).toEqual(["run-a:done"]);

    h.poller.poll();
    expect(h.updates).toHaveLength(1);
  });

  test("a terminal run first discovered outside the linger window is tombstoned", () => {
    const terminal = record({
      runId: "run-a",
      parentDialogId: "dialog-a",
      status: "done",
      endedAt: new Date(T0 - 60_001).toISOString(),
    });
    const h = setup({ dialogId: "dialog-a", discovered: [terminal] });
    h.poller.ensureRunning();
    h.tick();
    expect(h.updates).toEqual([]);
  });

  test("discovers an active run belonging to the current dialog", () => {
    const h = setup({
      dialogId: "dialog-a",
      discovered: [record({ runId: "run-a", parentDialogId: "dialog-a" })],
    });
    h.poller.ensureRunning();
    h.tick();
    expect(h.updates.map((u) => u.runId)).toEqual(["run-a"]);
  });

  test("does not discover a run belonging to another dialog", () => {
    const h = setup({
      dialogId: "dialog-a",
      discovered: [record({ runId: "run-b", parentDialogId: "dialog-b" })],
    });
    h.poller.ensureRunning();
    h.tick();
    expect(h.updates).toEqual([]);
  });

  test("discovers an active run missing parentDialogId (degradation fallback)", () => {
    const h = setup({
      dialogId: "dialog-a",
      discovered: [record({ runId: "run-unassigned", parentDialogId: undefined })],
    });
    h.poller.ensureRunning();
    h.tick();
    expect(h.updates.map((u) => u.runId)).toEqual(["run-unassigned"]);
    expect((h.updates[0] as any)?.unassigned).toBe(true);
  });

  test("repeated discovery is idempotent", () => {
    const h = setup({
      dialogId: "dialog-a",
      discovered: [record({ runId: "run-a", parentDialogId: "dialog-a" })],
    });
    h.poller.ensureRunning();
    h.tick();
    h.tick();
    expect(h.updates.map((u) => u.runId)).toEqual(["run-a"]);
  });

  test("a retired terminal run is not resurrected by discovery", () => {
    const terminal = record({ runId: "run-a", parentDialogId: "dialog-a", status: "done" });
    const h = setup({ dialogId: "dialog-a", discovered: [terminal] });
    h.poller.ensureRunning();
    h.tick();
    expect(h.updates).toEqual([]);
    h.setDiscovered([record({ runId: "run-a", parentDialogId: "dialog-a" })]);
    h.poller.ensureRunning();
    h.tick();
    expect(h.updates).toEqual([]);
  });

  test("the timer stops once no docked run is still active", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    h.records.set("run-a", record({ runId: "run-a" }));
    h.poller.ensureRunning();
    expect(h.timerActive).toBe(true);

    h.tick();
    expect(h.timerActive).toBe(true);

    // run 跑完了：面板还挂着它（linger 中），但已经没什么可读的了。
    h.docked.set("run-a", docked({ runId: "run-a", status: "done" }));
    h.tick();
    expect(h.timerActive).toBe(false);
  });

  test("ensureRunning is idempotent", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    h.poller.ensureRunning();
    h.poller.ensureRunning();
    h.poller.stop();
    // 第二次 ensureRunning 若真开了第二个表，stop 只会清掉其中一个。
    expect(h.timerActive).toBe(false);
  });

  test("a late update after dispose cannot restart the timer", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    h.poller.ensureRunning();
    h.poller.dispose();
    expect(h.timerActive).toBe(false);

    // 会话已退出，但上一轮 turn 的 tool-result 迟到了，接线处会调 ensureRunning。
    // stop() 是可逆的（没活跃 run 时自停），dispose() 不是。
    h.poller.ensureRunning();
    expect(h.timerActive).toBe(false);
  });

  test("a restarted poller re-emits state for a run it already reported", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    h.records.set("run-a", record({ runId: "run-a" }));
    h.poller.poll();
    expect(h.updates).toHaveLength(1);

    // stop 会忘掉去重指纹，否则重启后面板会一直空着等一个「变化」。
    h.poller.stop();
    h.poller.poll();
    expect(h.updates).toHaveLength(2);
  });
});

describe("onRecordsPolled", () => {
  test("每 tick 把成功读到的记录交出去，含刚变成终态的那条", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    h.records.set("run-a", record({ runId: "run-a" }));
    h.poller.poll();
    expect(h.polledBatches.length).toBe(1);
    expect(h.polledBatches[0]!.map((r) => `${r.runId}:${r.status}`)).toEqual(["run-a:running"]);

    // run 跑完了：这条终态记录必须出现在广播里，终态唤醒才有输入。
    h.records.set("run-a", record({ runId: "run-a", status: "done" }));
    h.poller.poll();
    expect(h.polledBatches.length).toBe(2);
    expect(h.polledBatches[1]!.map((r) => `${r.runId}:${r.status}`)).toEqual(["run-a:done"]);
  });

  test("fingerprint 去重跳过 update 时，读到的记录仍然广播", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    h.records.set("run-a", record({ runId: "run-a" }));
    h.poller.poll();
    h.poller.poll();
    // 面板只收到一次（指纹没变），观察者两 tick 都收到——它的转变检测
    // 依赖持续观测「还是 running」。
    expect(h.updates).toHaveLength(1);
    expect(h.polledBatches.length).toBe(2);
  });

  test("读不到记录的 run 不在广播里；一条读不到不牵连另一条", () => {
    const h = setup({ docked: [docked({ runId: "run-a" }), docked({ runId: "run-server" })] });
    h.records.set("run-a", record({ runId: "run-a" }));
    // run-server 本地没有记录（跑在服务端）。
    h.poller.poll();
    expect(h.polledBatches.length).toBe(1);
    expect(h.polledBatches[0]!.map((r) => r.runId)).toEqual(["run-a"]);
  });

  test("观察者抛异常不影响轮询器本身", () => {
    const h = setup({ docked: [docked({ runId: "run-a" })] });
    h.records.set("run-a", record({ runId: "run-a" }));
    h.observerThrows = true;
    expect(() => h.poller.poll()).not.toThrow();
    // 面板照常更新。
    expect(h.updates).toHaveLength(1);
  });
});

describe("sessionRender getCachedRunningAgentCount throttling & memoization", () => {
  test("memoizes active agent count within 1s TTL and does not re-scan IO on same tick", () => {
    resetRunningAgentCountCacheForTest();
    let scanCount = 0;
    // 模拟 registry 中有 1200+ 条记录（1000 条 done/failed，200 条 running）
    const mockRecords: Array<{ status: string }> = [];
    for (let i = 0; i < 1000; i++) {
      mockRecords.push({ status: i % 2 === 0 ? "done" : "failed" });
    }
    for (let i = 0; i < 200; i++) {
      mockRecords.push({ status: "running" });
    }

    const mockReader = () => {
      scanCount += 1;
      return mockRecords;
    };

    const t0 = 10_000;
    // 模拟 TUI 渲染热路径（1000 次击键或 150ms 活跃重绘在同一个 1s 窗口内）
    for (let i = 0; i < 1000; i++) {
      const count = getCachedRunningAgentCount({
        now: t0 + (i % 500),
        reader: mockReader,
      });
      expect(count).toBe(200);
    }
    // 同一 1s 窗口内 1000 次连续读取只触发了 1 次 reader 全量扫描
    expect(scanCount).toBe(1);

    // 超过 TTL (1000ms) 后，下一次调用才会重新扫描
    const countAfterTtl = getCachedRunningAgentCount({
      now: t0 + RUNNING_AGENT_COUNT_CACHE_TTL_MS + 10,
      reader: mockReader,
    });
    expect(countAfterTtl).toBe(200);
    expect(scanCount).toBe(2);
  });

  test("returns cached count gracefully when reader throws", () => {
    resetRunningAgentCountCacheForTest();
    const t0 = 10_000;
    // 第一次读取成功
    const count1 = getCachedRunningAgentCount({
      now: t0,
      reader: () => [{ status: "running" }, { status: "done" }],
    });
    expect(count1).toBe(1);

    // 过了 TTL 但 reader 抛错，优雅回退到之前的缓存值
    const count2 = getCachedRunningAgentCount({
      now: t0 + 2000,
      reader: () => {
        throw new Error("disk IO error");
      },
    });
    expect(count2).toBe(1);
  });
});
