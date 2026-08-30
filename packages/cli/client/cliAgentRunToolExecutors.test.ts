import { describe, expect, it } from "bun:test";
import type { FsLike, SpawnLike } from "../agentRunControl";
import { agentRunCardLabels } from "../tui/i18n";
import {
  createCliControlAgentRunExecutor,
  createCliStartAgentRunExecutor,
  type CliAgentRunToolExecutorDeps,
} from "./cliAgentRunToolExecutors";

const buildMemFs = () => {
  const files = new Map<string, string>();
  const dirs = new Set<string>();
  const mtimes = new Map<string, number>();
  const fs = {
    mkdirSync: (path: string, options?: { recursive?: boolean }) => {
      if (options?.recursive) {
        dirs.add(path);
        return;
      }
      if (dirs.has(path) || files.has(path)) {
        const err = new Error(`EEXIST: file already exists, mkdir '${path}'`) as Error & { code: string };
        err.code = "EEXIST";
        throw err;
      }
      dirs.add(path);
    },
    rmdirSync: (path: string) => {
      if (!dirs.has(path)) {
        const err = new Error(`ENOENT: no such file or directory, rmdir '${path}'`) as Error & { code: string };
        err.code = "ENOENT";
        throw err;
      }
      dirs.delete(path);
    },
    writeFileSync: (path: string, content: string) => {
      files.set(path, content);
      mtimes.set(path, Date.now());
    },
    appendFileSync: (path: string, content: string) => {
      const existing = files.get(path) ?? "";
      files.set(path, existing + content);
      mtimes.set(path, Date.now());
    },
    readFileSync: (path: string) => {
      const value = files.get(path);
      if (value === undefined) throw new Error("ENOENT");
      return value;
    },
    readdirSync: (path: string) =>
      [...files.keys()]
        .filter((key) => key.startsWith(`${path}/`))
        .map((key) => key.slice(path.length + 1)),
    existsSync: (path: string) => files.has(path) || dirs.has(path),
    statSync: (path: string) => {
      if (!files.has(path) && !dirs.has(path)) {
        const err = new Error("ENOENT") as Error & { code: string };
        err.code = "ENOENT";
        throw err;
      }
      return { mtimeMs: mtimes.get(path) ?? Date.now() };
    },
    openSync: () => 1,
    unlinkSync: (path: string) => {
      files.delete(path);
      mtimes.delete(path);
    },
  } as unknown as FsLike;
  return { files, dirs, mtimes, fs };
};

const buildDeps = (overrides: Partial<CliAgentRunToolExecutorDeps> = {}) => {
  const mem = buildMemFs();
  const spawnCalls: Array<{ cmd: string; args: string[] }> = [];
  const killCalls: Array<{ pid: number; signal: string | number }> = [];
  const deps: CliAgentRunToolExecutorDeps & { mem: typeof mem; spawnCalls: typeof spawnCalls; killCalls: typeof killCalls } = {
    env: {},
    cliEntrypoint: "/cli/entrypoint",
    cwd: "/work",
    homedir: () => "/home/test",
    generateRunId: () => "run-1",
    now: () => new Date("2026-07-31T00:00:00.000Z"),
    spawn: ((cmd: string, args: string[], _opts: any) => {
      spawnCalls.push({ cmd, args });
      return { pid: 123, unref: () => {} };
    }) as SpawnLike,
    kill: (pid: number, signal: string | number) => {
      killCalls.push({ pid, signal });
    },
    fs: mem.fs,
    mem,
    spawnCalls,
    killCalls,
    ...overrides,
  };
  return deps;
};

describe("cli startAgentRun executor", () => {
  it("spawns a local --bg run and returns runId/status", async () => {
    const deps = buildDeps();
    const executor = createCliStartAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ agentKey: "agent-pub-x", task: "帮我查一下资料" }),
    });

    expect(JSON.parse(result.content)).toMatchObject({
      runId: "run-1",
      status: "running",
      taskPreview: "帮我查一下资料",
    });
    // batchId is always present (auto-generated when not supplied).
    expect(typeof JSON.parse(result.content).batchId).toBe("string");
    // 卡片标题现在按 CLI locale 本地化（默认 zh）；断言用同一套 label 源，
    // 避免把「英文字面量」当成契约再次写死。
    expect(result.metadata?.displayData).toContain(agentRunCardLabels().runStarted);
    // runId 以 `#run-1` 后缀出现（并行 run 的唯一区分依据），而不是 `runId  ` 行。
    expect(result.metadata?.displayData).toContain("#run-1");
    expect(result.metadata?.displayData).not.toContain("runId");
    // task 上卡：两个并行 run 才能一眼分清各自在做什么。
    expect(result.metadata?.displayData).toContain("task    帮我查一下资料");

    // 注册表记录已写入
    const record = JSON.parse(deps.mem.files.get("/home/test/.nolo/runs/run-1.json")!);
    expect(record.agentKey).toBe("agent-pub-x");
    expect(record.status).toBe("running");
    expect(record.pid).toBe(123);

    // 任务内容已快照到 runs 目录
    expect(deps.mem.files.get("/home/test/.nolo/runs/run-1.msg.md")).toBe("帮我查一下资料");

    // 子进程命令：entrypoint + agent run + --agent + --msg-file(快照)
    const spawnCall = deps.spawnCalls[0];
    expect(spawnCall.args).toContain("agent");
    expect(spawnCall.args).toContain("run");
    expect(spawnCall.args).toContain("--agent");
    expect(spawnCall.args).toContain("agent-pub-x");
    expect(spawnCall.args).toContain("--msg-file");
    // --bg 必须被剥离（子进程不能再次进入 --bg 分支）
    expect(spawnCall.args).not.toContain("--bg");
    // 默认（非 ephemeral）不透传 --ephemeral
    expect(spawnCall.args).not.toContain("--ephemeral");
  });

  it("passes --ephemeral to the child run when ephemeral is true", async () => {
    const deps = buildDeps();
    const executor = createCliStartAgentRunExecutor(deps);
    await executor({
      arguments: JSON.stringify({ agentKey: "agent-pub-x", task: "review", ephemeral: true }),
    });

    const spawnCall = deps.spawnCalls[0];
    expect(spawnCall.args).toContain("--ephemeral");
  });

  it("does not pass --ephemeral when ephemeral is false", async () => {
    const deps = buildDeps();
    const executor = createCliStartAgentRunExecutor(deps);
    await executor({
      arguments: JSON.stringify({ agentKey: "agent-pub-x", task: "task", ephemeral: false }),
    });

    const spawnCall = deps.spawnCalls[0];
    expect(spawnCall.args).not.toContain("--ephemeral");
  });

  it("uses the provided agentName in the run card and registry", async () => {
    const deps = buildDeps();
    const executor = createCliStartAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({
        agentKey: "agent-pub-x",
        agentName: "页面生成助手",
        task: "做一个页面",
      }),
    });

    expect(JSON.parse(result.content)).toMatchObject({
      runId: "run-1",
      status: "running",
      agentName: "页面生成助手",
      taskPreview: "做一个页面",
    });
    expect(typeof JSON.parse(result.content).batchId).toBe("string");
    expect(result.metadata?.displayData).toContain("页面生成助手");
    const record = JSON.parse(deps.mem.files.get("/home/test/.nolo/runs/run-1.json")!);
    expect(record.agentName).toBe("页面生成助手");
  });

  it("attaches structured input as an extra section in the task snapshot", async () => {
    const deps = buildDeps();
    const executor = createCliStartAgentRunExecutor(deps);
    await executor({
      arguments: JSON.stringify({
        agentKey: "agent-pub-x",
        task: "总结",
        input: { raw: "data", n: 1 },
      }),
    });
    const snapshot = deps.mem.files.get("/home/test/.nolo/runs/run-1.msg.md")!;
    expect(snapshot).toContain("总结");
    expect(snapshot).toContain("--- 附加输入 ---");
    expect(snapshot).toContain('"raw":"data"');
  });

  it("forwards dodCommands into spawn and persists to registry", async () => {
    const deps = buildDeps();
    const executor = createCliStartAgentRunExecutor(deps);
    await executor({
      arguments: JSON.stringify({
        agentKey: "agent-pub-x",
        task: "实现功能",
        dodCommands: ["bun test", "npm run lint"],
      }),
    });

    const record = JSON.parse(deps.mem.files.get("/home/test/.nolo/runs/run-1.json")!);
    expect(record.dodCommands).toEqual(["bun test", "npm run lint"]);
  });

  it("throws when agentKey/task missing", async () => {
    const deps = buildDeps();
    const executor = createCliStartAgentRunExecutor(deps);
    await expect(
      executor({ arguments: JSON.stringify({ agentKey: "" }) }),
    ).rejects.toThrow("agentKey");
    await expect(
      executor({ arguments: JSON.stringify({ task: "x" }) }),
    ).rejects.toThrow("agentKey");
    await expect(
      executor({ arguments: JSON.stringify({ agentKey: "a", task: "" }) }),
    ).rejects.toThrow("task");
  });
});

describe("cli controlAgentRun executor", () => {
  const seedRun = (deps: ReturnType<typeof buildDeps>, runId: string, extra: Record<string, unknown> = {}) => {
    const logPath = `/home/test/.nolo/runs/${runId}.log`;
    deps.mem.files.set(
      `/home/test/.nolo/runs/${runId}.json`,
      JSON.stringify({
        runId,
        agentKey: "agent-pub-x",
        status: "running",
        pid: 123,
        startedAt: "2026-07-31T00:00:00.000Z",
        logPath,
        ...extra,
      }),
    );
    deps.mem.files.set(logPath, "line1\nline2\nline3\n");
  };

  it("status returns run summary + optional log tail", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1");
    const executor = createCliControlAgentRunExecutor(deps);

    const result = await executor({
      arguments: JSON.stringify({ action: "status", runId: "run-1", tailLines: 2 }),
    });
    const data = JSON.parse(result.content);
    expect(data.found).toBe(true);
    expect(data.runId).toBe("run-1");
    expect(data.status).toBe("running");
    expect(data.agentKey).toBe("agent-pub-x");
    expect(data.logTail).toBe("line2\nline3");
    expect(result.metadata?.displayData).toContain("⏳ running");
  });

  it("status without tailLines omits log tail", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1");
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "status", runId: "run-1" }),
    });
    const data = JSON.parse(result.content);
    expect(data.found).toBe(true);
    expect(data.logTail).toBeUndefined();
  });

  it("status payload for an ephemeral run omits dialogId and flags ephemeral", async () => {
    // Ephemeral runs never persist a dialog; their `eph-<ts>-<rand>` id is
    // synthetic. The status payload must not leak it — otherwise the caller
    // will readDialog a dialog that can never exist.
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-eph", {
      status: "done",
      dialogId: "eph-1755000000-abcd",
      ephemeral: true,
      exitCode: 0,
    });
    const executor = createCliControlAgentRunExecutor(deps);

    const result = await executor({
      arguments: JSON.stringify({ action: "status", runId: "run-eph" }),
    });
    const data = JSON.parse(result.content);
    expect(data.status).toBe("done");
    expect(data).not.toHaveProperty("dialogId");
    expect(data.ephemeral).toBe(true);
    // 结果获取路径的指引写进 payload（而非假 dialogId）。
    expect(data.dialogNote).toContain("未持久化 dialog");
  });

  it("status exposes dialogId for a completed run so the caller can read the agent output", async () => {
    // Regression: a "done" run with an empty logTail was indistinguishable
    // from a hung run because the LLM output lives in the dialog, not the
    // log. status must surface dialogId so the caller can `nolo dialog read`.
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1", { status: "done", dialogId: "dialog-abc", exitCode: 0 });
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "status", runId: "run-1" }),
    });
    const data = JSON.parse(result.content);
    expect(data.found).toBe(true);
    expect(data.status).toBe("done");
    expect(data.dialogId).toBe("dialog-abc");
  });

  it("status attaches reportPath in metadata and content when report exists", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1", { status: "done" });
    deps.mem.files.set("/home/test/.nolo/runs/run-1.report.md", "# Report");
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "status", runId: "run-1" }),
    });
    const data = JSON.parse(result.content);
    expect(data.reportPath).toBe("/home/test/.nolo/runs/run-1.report.md");
    expect(result.metadata?.reportPath).toBe("/home/test/.nolo/runs/run-1.report.md");
  });

  it("status omits reportPath when report file does not exist", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1", { status: "done" });
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "status", runId: "run-1" }),
    });
    const data = JSON.parse(result.content);
    expect(data.reportPath).toBeUndefined();
    expect(result.metadata?.reportPath).toBeUndefined();
  });

  it("status omits dialogId when the run has no dialog yet", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1", { status: "running" });
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "status", runId: "run-1" }),
    });
    const data = JSON.parse(result.content);
    expect(data.found).toBe(true);
    expect(data.dialogId).toBeUndefined();
  });

  // Without progress, a tailLines:0 poll answers "running, pid 123" — which
  // cannot distinguish a working run from a wedged one, so the only diagnosis
  // left was pulling log lines, exactly what the orchestration prompt tells the
  // model not to do. The registry has recorded this all along.
  it("status reports progress so a cheap poll can tell working from wedged", async () => {
    const nowMs = Date.parse("2026-07-31T00:05:00.000Z");
    const deps = buildDeps({ kill: () => {}, nowMs: () => nowMs });
    seedRun(deps, "run-1", {
      activity: {
        lastEventAt: "2026-07-31T00:04:30.000Z",
        inFlight: { kind: "tool", name: "editFile", sinceMs: 30_000 },
        counters: { llmCalls: 4, toolCalls: 12, fileEdits: 3 },
        updatedAt: "2026-07-31T00:04:30.000Z",
      },
    });
    const executor = createCliControlAgentRunExecutor(deps);

    const result = await executor({
      arguments: JSON.stringify({ action: "status", runId: "run-1" }),
    });
    const data = JSON.parse(result.content);
    expect(data.progress).toEqual({
      toolCalls: 12,
      llmCalls: 4,
      fileEdits: 3,
      // Silence is measured from the last real event, not the last disk write.
      idleMs: 30_000,
      inFlight: "tool:editFile",
      inFlightMs: 30_000,
    });
  });

  it("status omits progress for a finished run", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1", {
      status: "done",
      activity: {
        lastEventAt: "2026-07-31T00:04:30.000Z",
        inFlight: null,
        counters: { llmCalls: 4, toolCalls: 12, fileEdits: 3 },
        updatedAt: "2026-07-31T00:04:30.000Z",
      },
    });
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "status", runId: "run-1" }),
    });
    // A finished run has no progress — status and exitCode are the answer.
    expect(JSON.parse(result.content).progress).toBeUndefined();
  });

  it("status reports progress for a run that has not recorded activity yet", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1");
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "status", runId: "run-1" }),
    });
    // No activity section at all (old record / just spawned): say nothing
    // rather than report a fabricated zero.
    expect(JSON.parse(result.content).progress).toBeUndefined();
  });

  it("status for unknown run returns found:false", async () => {
    const deps = buildDeps();
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "status", runId: "run-missing" }),
    });
    expect(JSON.parse(result.content)).toEqual({ runId: "run-missing", found: false });
  });

  it("list returns all registered runs", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1");
    seedRun(deps, "run-2", { agentKey: "agent-pub-y" });
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({ arguments: JSON.stringify({ action: "list" }) });
    const data = JSON.parse(result.content);
    expect(data.count).toBe(2);
    expect(data.runs.map((r: any) => r.runId)).toEqual(["run-1", "run-2"]);
  });

  it("stop kills the process group and finalizes the run as killed", async () => {
    const kills: { pid: number; signal: string | number }[] = [];
    let alive = true;
    const deps = buildDeps({
      kill: (pid: number, signal: string | number) => {
        kills.push({ pid, signal });
        if (signal === 0) {
          if (!alive) {
            const error = new Error("ESRCH") as Error & { code: string };
            error.code = "ESRCH";
            throw error;
          }
          return;
        }
        if (signal === "SIGTERM") alive = false;
      },
      sleep: async () => {},
    });
    seedRun(deps, "run-1");
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "stop", runId: "run-1" }),
    });
    expect(JSON.parse(result.content)).toEqual({ runId: "run-1", found: true, status: "killed" });
    // 杀整个进程组（负 pid），而非单进程。
    expect(kills.some((k) => k.pid === -123 && k.signal === "SIGTERM")).toBe(true);
    const record = JSON.parse(deps.mem.files.get("/home/test/.nolo/runs/run-1.json")!);
    expect(record.status).toBe("killed");
    expect(record.endedAt).toBeDefined();
  });

  it("stop for unknown run returns found:false and does not crash", async () => {
    const deps = buildDeps();
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "stop", runId: "run-missing" }),
    });
    expect(JSON.parse(result.content)).toEqual({ runId: "run-missing", found: false });
  });

  it("throws on unknown action", async () => {
    const deps = buildDeps();
    const executor = createCliControlAgentRunExecutor(deps);
    await expect(
      executor({ arguments: JSON.stringify({ action: "nope" }) }),
    ).rejects.toThrow("未知 action");
  });

  // ── W 接线：action="wait" 轮询直到终态 / 超时 ──────────────────────
  it("wait returns immediately for an already-terminal run", async () => {
    let sleepCalls = 0;
    const deps = buildDeps({ sleep: async () => { sleepCalls += 1; } });
    seedRun(deps, "run-1", {
      status: "done",
      exitCode: 0,
      dialogId: "dialog-9",
      endedAt: "2026-07-31T00:01:00.000Z",
    });
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "wait", runId: "run-1" }),
    });
    const data = JSON.parse(result.content);
    expect(data.found).toBe(true);
    expect(data.status).toBe("done");
    expect(data.exitCode).toBe(0);
    // 终态 run 暴露 dialogId，调用方可 `nolo dialog read` 读实际输出。
    expect(data.dialogId).toBe("dialog-9");
    // 已终态立即返回，不应触发任何轮询等待。
    expect(sleepCalls).toBe(0);
  });

  it("wait polls until the run reaches a terminal state", async () => {
    let polls = 0;
    let deps!: ReturnType<typeof buildDeps>;
    deps = buildDeps({
      sleep: async () => {
        polls += 1;
        if (polls >= 2) {
          // 模拟子进程在第 2 次轮询前写好终态（done + exitCode + dialogId）。
          const rec = JSON.parse(
            deps.mem.files.get("/home/test/.nolo/runs/run-1.json")!,
          );
          rec.status = "done";
          rec.exitCode = 0;
          rec.dialogId = "dialog-9";
          rec.endedAt = "2026-07-31T00:01:00.000Z";
          deps.mem.files.set("/home/test/.nolo/runs/run-1.json", JSON.stringify(rec));
        }
      },
    });
    seedRun(deps, "run-1"); // running
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "wait", runId: "run-1" }),
    });
    const data = JSON.parse(result.content);
    expect(data.found).toBe(true);
    expect(data.status).toBe("done");
    expect(data.dialogId).toBe("dialog-9");
    // 首轮 running → sleep → 第二轮读到 done：至少轮询了 2 次。
    expect(polls).toBeGreaterThanOrEqual(1);
  });

  it("wait attaches reportPath in metadata and content when report exists", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1", { status: "done", exitCode: 0 });
    deps.mem.files.set("/home/test/.nolo/runs/run-1.report.md", "# Report");
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "wait", runId: "run-1" }),
    });
    const data = JSON.parse(result.content);
    expect(data.reportPath).toBe("/home/test/.nolo/runs/run-1.report.md");
    expect(result.metadata?.reportPath).toBe("/home/test/.nolo/runs/run-1.report.md");
  });

  it("wait returns status=timeout when the run stays non-terminal past timeoutMs", async () => {
    // 注入可控时钟：每次 sleep 推进 60s，使第一次轮询后即越过 timeoutMs=1000。
    let clock = 0;
    const deps = buildDeps({
      nowMs: () => clock,
      sleep: async () => { clock += 60000; },
    });
    seedRun(deps, "run-1"); // running，且一直 running
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "wait", runId: "run-1", timeoutMs: 1000 }),
    });
    const data = JSON.parse(result.content);
    expect(data.found).toBe(true);
    // 超时是 wait 动作的标记（不是失败），run 记录不被改写。
    expect(data.status).toBe("timeout");
    expect(data.runStatus).toBe("running");
    expect(data.timeoutMs).toBe(1000);
    expect(typeof data.waitedMs).toBe("number");
    // run 记录仍是 running，wait 超时不应触碰它。
    const record = JSON.parse(deps.mem.files.get("/home/test/.nolo/runs/run-1.json")!);
    expect(record.status).toBe("running");
  });

  it("wait for unknown run returns found:false", async () => {
    const deps = buildDeps();
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "wait", runId: "run-missing" }),
    });
    expect(JSON.parse(result.content)).toEqual({ runId: "run-missing", found: false });
  });

  // ── D1 接线：list + batchId 附加 batchSummary ──────────────────────
  it("list with batchId attaches batchSummary when the batch converged", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1", { batchId: "batch-a", status: "done" });
    seedRun(deps, "run-2", { batchId: "batch-a", status: "done" });
    seedRun(deps, "run-3", { batchId: "batch-a", status: "done" });
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({
      arguments: JSON.stringify({ action: "list", batchId: "batch-a" }),
    });
    const data = JSON.parse(result.content);
    expect(data.count).toBe(3);
    // 收敛时必须带 batchSummary（D1 接线核心断言）
    expect(typeof data.batchSummary, "收敛批次应附加 batchSummary").toBe("string");
    expect(data.batchSummary.length).toBeGreaterThan(0);
  });

  it("list without batchId does not attach batchSummary", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1", { status: "done" });
    const executor = createCliControlAgentRunExecutor(deps);
    const result = await executor({ arguments: JSON.stringify({ action: "list" }) });
    const data = JSON.parse(result.content);
    expect(data.batchSummary).toBeUndefined();
  });

  // ── T 接线：startAgentRun + batchId 写 todo；action=todo 读 ─────────
  it("startAgentRun with batchId writes a todo; action=todo lists it", async () => {
    const { createInMemoryTodoStore } = await import("./__testHelpers");
    const todoStore = createInMemoryTodoStore();
    const deps = buildDeps({ todoStore } as any);
    const startExec = createCliStartAgentRunExecutor(deps);
    const controlExec = createCliControlAgentRunExecutor(deps);

    await startExec({
      arguments: JSON.stringify({ agentKey: "agent-pub-x", task: "接线测试任务", batchId: "batch-t1" }),
    });

    // todo 应已写入
    const todo = await todoStore.getTodo("todo-batch-t1");
    expect(todo, "startAgentRun+batchId 应写入 todo").toBeDefined();
    expect(todo!.runIds).toEqual(["run-1"]);

    // action=todo 应列出，状态由关联 run 推导（run-1 是 running → todo running）
    const res = await controlExec({ arguments: JSON.stringify({ action: "todo" }) });
    const data = JSON.parse(res.content);
    expect(data.count).toBe(1);
    expect(data.todos[0].id).toBe("todo-batch-t1");
    expect(data.todos[0].status).toBe("running");

    // action=todo 支持 status 过滤（匹配 running，排除 done）
    const resRunning = await controlExec({ arguments: JSON.stringify({ action: "todo", status: "running" }) });
    const dataRunning = JSON.parse(resRunning.content);
    expect(dataRunning.count).toBe(1);

    const resDone = await controlExec({ arguments: JSON.stringify({ action: "todo", status: "done" }) });
    const dataDone = JSON.parse(resDone.content);
    expect(dataDone.count).toBe(0);
  });

  // ── append：向终态任务追加新指令续跑 ──────────────────────────────
  it("append to a terminal run spawns a continuation run with --continue and dialogId", async () => {
    let nextRunId = "run-2";
    const deps = buildDeps({
      generateRunId: () => nextRunId,
      kill: () => {},
    });
    seedRun(deps, "run-1", {
      status: "done",
      dialogId: "dialog-user-123",
      agentKey: "agent-pub-x",
      agentName: "测试助手",
      batchId: "batch-1",
      parentDialogId: "parent-dialog-456",
    });
    const executor = createCliControlAgentRunExecutor(deps);

    const result = await executor({
      arguments: JSON.stringify({
        action: "append",
        runId: "run-1",
        userInput: "继续执行第二阶段任务",
      }),
    });

    const parsed = JSON.parse(result.content);
    expect(parsed).toMatchObject({
      runId: "run-1",
      newRunId: "run-2",
      dialogId: "dialog-user-123",
      mode: "continue",
      status: "running",
      agentName: "测试助手",
      batchId: "batch-1",
      taskPreview: "继续执行第二阶段任务",
    });

    // 格式化卡片
    expect(result.metadata?.displayData).toContain("测试助手");
    expect(result.metadata?.displayData).toContain("#run-2");
    expect(result.metadata?.displayData).toContain("task    继续执行第二阶段任务");

    // 检查 spawn 调用
    expect(deps.spawnCalls.length).toBe(1);
    const spawnCall = deps.spawnCalls[0];
    expect(spawnCall.args).toContain("agent");
    expect(spawnCall.args).toContain("run");
    expect(spawnCall.args).toContain("--agent");
    expect(spawnCall.args).toContain("agent-pub-x");
    expect(spawnCall.args).toContain("--continue");
    expect(spawnCall.args).toContain("dialog-user-123");
    expect(spawnCall.args).toContain("--msg-file");
    expect(spawnCall.args).not.toContain("--bg");

    // 任务内容已快照到 runs 目录
    expect(deps.mem.files.get("/home/test/.nolo/runs/run-2.msg.md")).toBe("继续执行第二阶段任务");

    // 注册表已记录新 run
    const newRecord = JSON.parse(deps.mem.files.get("/home/test/.nolo/runs/run-2.json")!);
    expect(newRecord.runId).toBe("run-2");
    expect(newRecord.status).toBe("running");
    expect(newRecord.batchId).toBe("batch-1");
    expect(newRecord.parentDialogId).toBe("parent-dialog-456");
  });

  it("append to an ephemeral terminal run spawns a new ephemeral run without --continue or the synthetic dialogId", async () => {
    // ephemeral run 的 dialogId 是合成的（不落盘）：续跑绝不能把它塞进子进程
    // --continue（子进程读不到必然全链路 404），改为开一个新的 ephemeral run。
    let nextRunId = "run-2";
    const deps = buildDeps({
      generateRunId: () => nextRunId,
      kill: () => {},
    });
    seedRun(deps, "run-1", {
      status: "done",
      dialogId: "eph-1755000000-abcd",
      ephemeral: true,
      agentKey: "agent-pub-x",
      agentName: "测试助手",
    });
    const executor = createCliControlAgentRunExecutor(deps);

    const result = await executor({
      arguments: JSON.stringify({
        action: "append",
        runId: "run-1",
        userInput: "继续执行第二阶段任务",
      }),
    });

    const parsed = JSON.parse(result.content);
    expect(parsed).toMatchObject({
      runId: "run-1",
      newRunId: "run-2",
      mode: "continue",
      status: "running",
      agentName: "测试助手",
    });
    // 返回值不外泄合成 dialogId，改以 ephemeral 标记。
    expect(parsed).not.toHaveProperty("dialogId");
    expect(parsed.ephemeral).toBe(true);

    // spawn 参数：不含假 eph-* id、不含 --continue，但含 --ephemeral。
    expect(deps.spawnCalls.length).toBe(1);
    const spawnCall = deps.spawnCalls[0];
    const flatArgs = spawnCall.args.join("\u0000");
    expect(flatArgs).not.toContain("eph-1755000000-abcd");
    expect(spawnCall.args).not.toContain("--continue");
    expect(spawnCall.args).toContain("--ephemeral");

    // 新 run 记录沿用 ephemeral 语义。
    const newRecord = JSON.parse(deps.mem.files.get("/home/test/.nolo/runs/run-2.json")!);
    expect(newRecord.ephemeral).toBe(true);
  });

  it("append to a running run without queuePath rejects with unsupported error", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1", {
      status: "running",
      dialogId: "dialog-user-123",
    });
    const executor = createCliControlAgentRunExecutor(deps);

    await expect(
      executor({
        arguments: JSON.stringify({
          action: "append",
          runId: "run-1",
          userInput: "新指令",
        }),
      }),
    ).rejects.toThrow("该 run 启动时不支持运行中入队（无队列通道），请等终态后再 append");
  });

  it("append to a running run with queuePath enqueues message and returns mode:enqueue without spawning", async () => {
    const deps = buildDeps({ kill: () => {} });
    const queuePath = "/home/test/.nolo/runs/run-1.queue.jsonl";
    seedRun(deps, "run-1", {
      status: "running",
      dialogId: "dialog-user-123",
      agentKey: "agent-pub-x",
      agentName: "测试助手",
      queuePath,
    });
    const executor = createCliControlAgentRunExecutor(deps);

    const result = await executor({
      arguments: JSON.stringify({
        action: "append",
        runId: "run-1",
        userInput: "运行中入队的第一条指令",
      }),
    });

    const parsed = JSON.parse(result.content);
    expect(parsed).toMatchObject({
      runId: "run-1",
      dialogId: "dialog-user-123",
      mode: "enqueue",
      queued: 1,
      status: "running",
      agentName: "测试助手",
      taskPreview: "运行中入队的第一条指令",
    });

    // 格式化卡片
    expect(result.metadata?.displayData).toContain("测试助手");
    expect(result.metadata?.displayData).toContain("running");
    expect(result.metadata?.displayData).toContain("[enqueued 1] 运行中入队的第一条指令");

    // 不应 spawn 新进程
    expect(deps.spawnCalls.length).toBe(0);

    // 检查队列文件内容
    const queueContent = deps.mem.files.get(queuePath);
    expect(queueContent).toBeDefined();
    const entry = JSON.parse(queueContent!.trim());
    expect(entry.text).toBe("运行中入队的第一条指令");
    expect(typeof entry.ts).toBe("number");

    // 第二次追加，queued 计数递增为 2
    const result2 = await executor({
      arguments: JSON.stringify({
        action: "append",
        runId: "run-1",
        userInput: "运行中入队的第二条指令",
      }),
    });
    const parsed2 = JSON.parse(result2.content);
    expect(parsed2.queued).toBe(2);
    expect(parsed2.mode).toBe("enqueue");
    expect(deps.spawnCalls.length).toBe(0);
  });

  it("append to an ephemeral running run via queue channel returns ephemeral:true instead of the synthetic dialogId", async () => {
    // ephemeral run 走 enqueue 分支时同样不得外泄合成的 eph-* dialogId。
    const deps = buildDeps({ kill: () => {} });
    const queuePath = "/home/test/.nolo/runs/run-eph.queue.jsonl";
    seedRun(deps, "run-eph", {
      status: "running",
      dialogId: "eph-1755000000-abcd",
      ephemeral: true,
      agentKey: "agent-pub-x",
      agentName: "测试助手",
      queuePath,
    });
    const executor = createCliControlAgentRunExecutor(deps);

    const result = await executor({
      arguments: JSON.stringify({
        action: "append",
        runId: "run-eph",
        userInput: "运行中入队的指令",
      }),
    });

    const parsed = JSON.parse(result.content);
    expect(parsed).toMatchObject({
      runId: "run-eph",
      mode: "enqueue",
      queued: 1,
      status: "running",
      agentName: "测试助手",
      taskPreview: "运行中入队的指令",
    });
    expect(parsed).not.toHaveProperty("dialogId");
    expect(parsed.ephemeral).toBe(true);

    // 消息确实写入队列、未 spawn 新进程
    expect(deps.spawnCalls.length).toBe(0);
    const entry = JSON.parse(deps.mem.files.get(queuePath)!.trim());
    expect(entry.text).toBe("运行中入队的指令");
  });

  it("append race degradation: entryId unconsumed when child becomes terminal falls back to continue spawn with merged message", async () => {
    let nextRunId = "run-2";
    const queuePath = "/home/test/.nolo/runs/run-1.queue.jsonl";
    let probeCount = 0;
    const deps = buildDeps({
      generateRunId: () => nextRunId,
      kill: (pid, signal) => {
        // 第一阶段（find/初始 checkStaleRun）返回存活 (signal===0 不抛错)；
        // 第二阶段（写入队列后的 afterCheck）模拟进程退出 (抛 ESRCH)，checkStaleRun 判定为 orphaned/terminal
        probeCount++;
        if (probeCount > 1 && signal === 0) {
          const err = new Error("ESRCH") as Error & { code: string };
          err.code = "ESRCH";
          throw err;
        }
      },
    });

    seedRun(deps, "run-1", {
      status: "running",
      dialogId: "dialog-user-123",
      agentKey: "agent-pub-x",
      agentName: "测试助手",
      batchId: "batch-1",
      queuePath,
    });
    const executor = createCliControlAgentRunExecutor(deps);

    const result = await executor({
      arguments: JSON.stringify({
        action: "append",
        runId: "run-1",
        userInput: "竞态追加指令",
      }),
    });

    const parsed = JSON.parse(result.content);
    expect(parsed).toMatchObject({
      runId: "run-1",
      newRunId: "run-2",
      dialogId: "dialog-user-123",
      mode: "continue",
      status: "running",
      agentName: "测试助手",
      taskPreview: "竞态追加指令",
    });

    // 应已降级走 continue spawn
    expect(deps.spawnCalls.length).toBe(1);
    expect(deps.mem.files.get("/home/test/.nolo/runs/run-2.msg.md")).toBe("竞态追加指令");
  });

  it("append race degradation: entryId already consumed by child before terminal does NOT spawn duplicate continuation", async () => {
    const queuePath = "/home/test/.nolo/runs/run-1.queue.jsonl";
    let probeCount = 0;
    const deps = buildDeps({
      kill: (pid, signal) => {
        probeCount++;
        if (probeCount > 1 && signal === 0) {
          // 模拟子进程在退出前消费并清空了队列
          deps.mem.files.delete(queuePath);
          const err = new Error("ESRCH") as Error & { code: string };
          err.code = "ESRCH";
          throw err;
        }
      },
    });

    seedRun(deps, "run-1", {
      status: "running",
      dialogId: "dialog-user-123",
      agentKey: "agent-pub-x",
      agentName: "测试助手",
      batchId: "batch-1",
      queuePath,
    });
    const executor = createCliControlAgentRunExecutor(deps);

    const result = await executor({
      arguments: JSON.stringify({
        action: "append",
        runId: "run-1",
        userInput: "已被子进程抢先消费的指令",
      }),
    });

    const parsed = JSON.parse(result.content);
    expect(parsed).toMatchObject({
      runId: "run-1",
      dialogId: "dialog-user-123",
      mode: "enqueue",
      consumed: true,
      status: "orphaned",
      agentName: "测试助手",
      taskPreview: "已被子进程抢先消费的指令",
    });

    // 绝对不应重复 spawn 新进程
    expect(deps.spawnCalls.length).toBe(0);
  });

  it("append to a run without dialogId rejects with error", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1", {
      status: "done",
      dialogId: undefined,
    });
    const executor = createCliControlAgentRunExecutor(deps);

    await expect(
      executor({
        arguments: JSON.stringify({
          action: "append",
          runId: "run-1",
          userInput: "新指令",
        }),
      }),
    ).rejects.toThrow("该 run 无关联 dialog，无法续跑");
  });

  it("append for unknown run returns found:false", async () => {
    const deps = buildDeps();
    const executor = createCliControlAgentRunExecutor(deps);

    const result = await executor({
      arguments: JSON.stringify({
        action: "append",
        runId: "run-missing",
        userInput: "新指令",
      }),
    });

    expect(JSON.parse(result.content)).toEqual({ runId: "run-missing", found: false });
    expect(result.metadata?.displayData).toBeDefined();
  });

  it("append rejects when userInput is missing or empty", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1", {
      status: "done",
      dialogId: "dialog-user-123",
    });
    const executor = createCliControlAgentRunExecutor(deps);

    await expect(
      executor({
        arguments: JSON.stringify({
          action: "append",
          runId: "run-1",
        }),
      }),
    ).rejects.toThrow("userInput");

    await expect(
      executor({
        arguments: JSON.stringify({
          action: "append",
          runId: "run-1",
          userInput: "   ",
        }),
      }),
    ).rejects.toThrow("userInput");
  });

  it("append rejects when runId is missing", async () => {
    const deps = buildDeps();
    const executor = createCliControlAgentRunExecutor(deps);

    await expect(
      executor({
        arguments: JSON.stringify({
          action: "append",
          userInput: "新指令",
        }),
      }),
    ).rejects.toThrow("runId");
  });

  it("append treats serverBase fields as inert (no such discriminator is ever written)", async () => {
    const deps = buildDeps({ kill: () => {} });
    seedRun(deps, "run-1", {
      status: "done",
      dialogId: "dialog-user-123",
      // RunRecord 从不写入 serverBase——即使外部手工塞了该字段也不应触发甄别，
      // 避免维护者误信存在 server run 甄别（server 侧 append 待 Phase 2）。
      serverBase: "https://example.com",
    });
    const executor = createCliControlAgentRunExecutor(deps);

    const result = await executor({
      arguments: JSON.stringify({
        action: "append",
        runId: "run-1",
        userInput: "新指令",
      }),
    });
    const payload = JSON.parse(result.content);
    expect(payload.mode).toBe("continue");
    expect(payload.newRunId).toBeTruthy();
  });
});
