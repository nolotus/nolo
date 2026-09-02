import { describe, expect, test } from "bun:test";
import { spawnSync, spawn } from "node:child_process";
import { join } from "node:path";
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import type { ChildProcess } from "node:child_process";
import type {
  AgentRunControlDeps,
  FsLike,
  RunRecord,
} from "./agentRunControl";
import {
  backfillRunRecordParentDialog,
  checkStaleRun,
  createRunActivityTracker,
  defaultGenerateBatchId,
  defaultGenerateRunId,
  findRunRecord,
  findRunRecordByPid,
  finalizeRunRecord,
  gcRunRecords,
  isPidGone,
  isRunTerminalStatus,
  listRunRecords,
  queryRunRecords,
  readRunRecord,
  resolveNoloHome,
  resolveRunLogPath,
  resolveRunQueuePath,
  resolveRunRecordPath,
  resolveRunReportPath,
  resolveRunsDir,
  appendRunQueue,
  countQueueMessages,
  readQueueMessages,
  popQueueMessages,
  popSingleQueueMessage,
  popAllQueueEntries,
  withQueueLock,
  runAgentKillCommand,
  runAgentLogsCommand,
  runAgentPsCommand,
  runAgentStatusCommand,
  runAgentStopCommand,
  terminateRunProcess,
  spawnLocalBackgroundRun,
  stripBackgroundFlag,
  absolutizeSkillArgs,
  buildAgentRunChildCommand,
  rewriteMsgFileArg,
  writeRunRecord,
  type LocalAgentLoopEvent,
} from "./agentRunControl";

function createInMemoryFs(initial: Record<string, string> = {}): FsLike & {
  writeCalls: Array<{ path: string; data: string }>;
  setMtime: (path: string, mtimeMs: number) => void;
} {
  const files: Record<string, string> = { ...initial };
  const mtimes: Record<string, number> = {};
  const dirs = new Set<string>();
  const writeCalls: Array<{ path: string; data: string }> = [];
  // Cast: in-memory stub only implements the subset of fs used by agent run control.
  return {
    mkdirSync(path: string, options?: { recursive?: boolean }) {
      if (options?.recursive) {
        let current = path;
        // Stop at filesystem root — join("/", "..") stays "/" and would loop forever.
        while (current && current !== "." && current !== "/") {
          dirs.add(current);
          const parent = join(current, "..");
          if (parent === current) break;
          current = parent;
        }
        if (current === "/") dirs.add("/");
        dirs.add(path);
        return;
      }
      if (dirs.has(path) || path in files) {
        const error = new Error(`EEXIST: file already exists, mkdir '${path}'`) as Error & { code: string };
        error.code = "EEXIST";
        throw error;
      }
      dirs.add(path);
    },
    rmdirSync(path: string) {
      if (!dirs.has(path)) {
        const error = new Error(`ENOENT: no such file or directory, rmdir '${path}'`) as Error & { code: string };
        error.code = "ENOENT";
        throw error;
      }
      dirs.delete(path);
    },
    writeFileSync(path: string, data: string) {
      writeCalls.push({ path, data });
      files[path] = data;
      dirs.add(join(path, ".."));
    },
    readFileSync(path: string, encoding?: string) {
      if (!(path in files)) {
        const error = new Error(`ENOENT: ${path}`) as Error & { code: string };
        error.code = "ENOENT";
        throw error;
      }
      return files[path];
    },
    // Files written by this stub are "just now" unless a test overrides mtime,
    // which is what lets the tmp sweep distinguish abandoned from in-flight.
    statSync(path: string) {
      if (!(path in files) && !dirs.has(path)) {
        const error = new Error(`ENOENT: ${path}`) as Error & { code: string };
        error.code = "ENOENT";
        throw error;
      }
      return { mtimeMs: mtimes[path] ?? Date.now() } as unknown as ReturnType<
        NonNullable<FsLike["statSync"]>
      >;
    },
    setMtime(path: string, mtimeMs: number) {
      mtimes[path] = mtimeMs;
    },
    readdirSync(path: string) {
      const prefix = path.endsWith("/") ? path : `${path}/`;
      const entries: string[] = [];
      for (const file of Object.keys(files)) {
        if (!file.startsWith(prefix)) continue;
        const rest = file.slice(prefix.length);
        if (rest && !rest.includes("/")) entries.push(rest);
      }
      return entries;
    },
    existsSync(path: string) {
      return path in files || dirs.has(path);
    },
    openSync(path: string, _flags: string) {
      return 42;
    },
    unlinkSync(path: string) {
      delete files[path];
    },
    appendFileSync(path: string, data: string) {
      files[path] = (files[path] ?? "") + data;
      dirs.add(join(path, ".."));
    },
    renameSync(oldPath: string, newPath: string) {
      if (!(oldPath in files)) {
        const error = new Error(`ENOENT: ${oldPath}`) as Error & { code: string };
        error.code = "ENOENT";
        throw error;
      }
      files[newPath] = files[oldPath];
      delete files[oldPath];
    },
    writeCalls,
  } as unknown as FsLike & { writeCalls: Array<{ path: string; data: string }> };
}

function createMockSpawn() {
  const calls: {
    command: string;
    args: readonly string[];
    options: { cwd?: string; env?: Record<string, string | undefined>; detached?: boolean };
  }[] = [];
  const proc = {
    pid: 12345,
    unref() {},
    on() {},
    once() {},
    off() {},
  } as unknown as ChildProcess;
  const spawn = ((
    command: string,
    args: readonly string[],
    options: { cwd?: string; env?: Record<string, string | undefined>; detached?: boolean }
  ) => {
    calls.push({ command, args, options });
    return proc;
  }) as AgentRunControlDeps["spawn"];
  return { spawn, calls, proc };
}

function createMockOutput() {
  const lines: string[] = [];
  const output: { write(chunk: string): unknown } = {
    write(chunk: string) {
      lines.push(chunk);
    },
  };
  return { output, lines };
}

function createDeps(overrides: Partial<AgentRunControlDeps> = {}): AgentRunControlDeps {
  return {
    env: { NOLO_HOME: "/home/test/.nolo" },
    homedir: () => "/home/test",
    fs: createInMemoryFs({ "/repo/packages/cli/index.ts": "" }),
    now: () => new Date("2025-01-01T00:00:00.000Z"),
    generateRunId: () => "run-2025-01-01T00-00-00-000Z-abc123",
    ...overrides,
  };
}

/**
 * 构造一个「发终止信号即死亡」的 kill mock，供 stop/kill 测试复用。
 * - signal 0（存活探测）：alive 时静默返回，dead 时抛 ESRCH
 * - SIGTERM/SIGKILL：默认设 alive=false（可配置「忽略」以测升级/失败路径）
 * - now/sleep 联动推进虚拟时钟，避免真实轮询超时
 */
function makeTerminatingKillMock(opts: { ignoreSigterm?: boolean; ignoreSigkill?: boolean } = {}) {
  const kills: { pid: number; signal: string | number }[] = [];
  let alive = true;
  let t = 0;
  const kill = (pid: number, signal: string | number) => {
    kills.push({ pid, signal });
    if (signal === 0) {
      if (!alive) {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      }
      return;
    }
    if (signal === "SIGTERM" && !opts.ignoreSigterm) alive = false;
    if (signal === "SIGKILL" && !opts.ignoreSigkill) alive = false;
  };
  return {
    kills,
    kill,
    now: () => new Date(1000 + t),
    sleep: async () => {
      t += 250;
    },
  };
}

describe("agent run control plane", () => {
  test("resolveNoloHome respects NOLO_HOME", () => {
    expect(resolveNoloHome({ NOLO_HOME: "/custom/nolo" }, () => "/home")).toBe("/custom/nolo");
    expect(resolveNoloHome({}, () => "/home")).toBe("/home/.nolo");
  });

  test("resolveRunsDir and paths are derived from nolo home", () => {
    expect(resolveRunsDir({ NOLO_HOME: "/custom/nolo" })).toBe("/custom/nolo/runs");
    expect(resolveRunRecordPath("run-1", { NOLO_HOME: "/custom/nolo" })).toBe(
      "/custom/nolo/runs/run-1.json"
    );
    expect(resolveRunLogPath("run-1", { NOLO_HOME: "/custom/nolo" })).toBe(
      "/custom/nolo/runs/run-1.log"
    );
    expect(resolveRunReportPath("run-1", { NOLO_HOME: "/custom/nolo" })).toBe(
      "/custom/nolo/runs/run-1.report.md"
    );
    expect(resolveRunQueuePath("run-1", { NOLO_HOME: "/custom/nolo" })).toBe(
      "/custom/nolo/runs/run-1.queue.jsonl"
    );
  });

  test("appendRunQueue, countQueueMessages, popSingleQueueMessage, and popAllQueueEntries manage FIFO queue", async () => {
    const fs = createInMemoryFs();
    const queuePath = "/home/test/.nolo/runs/run-q1.queue.jsonl";

    expect(await countQueueMessages(queuePath, fs)).toBe(0);
    expect(await popSingleQueueMessage(queuePath, fs)).toBeNull();

    const res1 = await appendRunQueue(queuePath, "msg 1", { fs, now: () => new Date("2026-07-31T00:00:00.000Z") });
    expect(res1.queuedCount).toBe(1);
    expect(typeof res1.entryId).toBe("string");
    expect(await countQueueMessages(queuePath, fs)).toBe(1);

    const res2 = await appendRunQueue(queuePath, "msg 2", { fs, now: () => new Date("2026-07-31T00:01:00.000Z") });
    expect(res2.queuedCount).toBe(2);
    expect(typeof res2.entryId).toBe("string");
    expect(await countQueueMessages(queuePath, fs)).toBe(2);

    expect(await readQueueMessages(queuePath, fs)).toEqual(["msg 1", "msg 2"]);

    // popSingleQueueMessage claims 1 item and keeps remaining intact in queue
    const single = await popSingleQueueMessage(queuePath, fs);
    expect(single?.text).toBe("msg 1");
    expect(single?.id).toBe(res1.entryId);
    expect(await countQueueMessages(queuePath, fs)).toBe(1);
    expect(await readQueueMessages(queuePath, fs)).toEqual(["msg 2"]);

    // Append msg 3
    const res3 = await appendRunQueue(queuePath, "msg 3", { fs });
    expect(res3.queuedCount).toBe(2);

    // popAllQueueEntries takes all remaining items
    const all = await popAllQueueEntries(queuePath, fs);
    expect(all.map((e) => e.text)).toEqual(["msg 2", "msg 3"]);
    expect(await countQueueMessages(queuePath, fs)).toBe(0);
  });

  test("withQueueLock mutual exclusion: busy lock throws error when timeout expires", async () => {
    const fs = createInMemoryFs();
    const queuePath = "/home/test/.nolo/runs/run-lock1.queue.jsonl";
    fs.mkdirSync(`${queuePath}.lock`);

    await expect(
      withQueueLock(
        queuePath,
        { fs },
        () => "ok",
        { retries: 2, retryIntervalMs: 1 }
      )
    ).rejects.toThrow("queue busy");
  });

  test("withQueueLock stale lock takeover: broken after staleLockMs and acquired with owner token", async () => {
    const fs = createInMemoryFs();
    const queuePath = "/home/test/.nolo/runs/run-lock2.queue.jsonl";
    const lockPath = `${queuePath}.lock`;
    fs.mkdirSync(lockPath);
    fs.setMtime(lockPath, 1000); // very old mtime

    const result = await withQueueLock(
      queuePath,
      { fs, now: () => new Date(1000 + 70_000) },
      () => "acquired after stale",
      { staleLockMs: 60_000 }
    );

    expect(result).toBe("acquired after stale");
    // Lock released in finally
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("withQueueLock owner token: mismatch on release does not delete another process lock", async () => {
    const fs = createInMemoryFs();
    const queuePath = "/home/test/.nolo/runs/run-lock-mismatch.queue.jsonl";
    const lockPath = `${queuePath}.lock`;
    const tokenPath = `${lockPath}/owner.json`;

    const errors: string[] = [];
    const origError = console.error;
    console.error = (...args: any[]) => { errors.push(args.join(" ")); };

    try {
      await withQueueLock(
        queuePath,
        { fs },
        () => {
          // 模拟在临界区内锁被第三方篡改/接管（ownerId 变成别人）
          fs.writeFileSync(tokenPath, JSON.stringify({ ownerId: "someone-else-token", pid: 99999 }));
        }
      );

      // 释放时发现 token 不匹配，拒绝删除别人的锁目录并打印警告
      expect(fs.existsSync(lockPath)).toBe(true);
      expect(errors.some((e) => e.includes("owner mismatch"))).toBe(true);
    } finally {
      console.error = origError;
    }
  });

  test("withQueueLock concurrency: concurrent callers serialize cleanly", async () => {
    const fs = createInMemoryFs();
    const queuePath = "/home/test/.nolo/runs/run-lock-concurrent.queue.jsonl";
    const order: string[] = [];

    const task1 = withQueueLock(queuePath, { fs }, async () => {
      order.push("t1-start");
      await new Promise((r) => setTimeout(r, 20));
      order.push("t1-end");
    }, { retries: 10, retryIntervalMs: 5 });

    const task2 = withQueueLock(queuePath, { fs }, async () => {
      order.push("t2-start");
      order.push("t2-end");
    }, { retries: 10, retryIntervalMs: 5 });

    await Promise.all([task1, task2]);

    expect(order).toEqual(["t1-start", "t1-end", "t2-start", "t2-end"]);
  });

  test("popAllQueueEntries and popSingleQueueMessage throw when readFileSync fails, leaving queue intact", async () => {
    const fs = createInMemoryFs();
    const queuePath = "/home/test/.nolo/runs/run-failread.queue.jsonl";
    await appendRunQueue(queuePath, "important message", { fs });

    const brokenFs: FsLike = {
      ...fs,
      readFileSync: (path) => {
        if (String(path).endsWith(".queue.jsonl")) {
          throw new Error("EIO: disk read failed");
        }
        return fs.readFileSync(path);
      },
    };

    await expect(popAllQueueEntries(queuePath, { fs: brokenFs })).rejects.toThrow("EIO: disk read failed");
    await expect(popSingleQueueMessage(queuePath, { fs: brokenFs })).rejects.toThrow("EIO: disk read failed");

    // Original file must still exist and be readable with normal fs
    expect(await countQueueMessages(queuePath, fs)).toBe(1);
    expect(await readQueueMessages(queuePath, fs)).toEqual(["important message"]);
  });

  test("withQueueLock token write failure: unlinks newly created lock directory and throws error, leaving no ghost lock", async () => {
    const fs = createInMemoryFs();
    const queuePath = "/home/test/.nolo/runs/run-token-fail.queue.jsonl";
    const lockPath = `${queuePath}.lock`;

    const brokenFs: FsLike = {
      ...fs,
      writeFileSync: (path, data) => {
        if (String(path).endsWith("owner.json")) {
          throw new Error("ENOSPC: disk full during token write");
        }
        return fs.writeFileSync(path, data);
      },
    };

    await expect(
      withQueueLock(queuePath, { fs: brokenFs }, () => "ok", { retries: 0 })
    ).rejects.toThrow("ENOSPC");

    // Lock directory must be cleaned up and not left as a ghost directory
    expect(fs.existsSync(lockPath)).toBe(false);
  });

  test("withQueueLock real OS process mutual exclusion: two child processes contending on same queue lock execute serially without overlap", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-queue-lock-test-"));
    const queuePath = join(tempDir, "real.queue.jsonl");
    const logPath = join(tempDir, "timeline.jsonl");

    const helperScript = `
      import { withQueueLock } from "${join(__dirname, "agentRunControl.ts")}";
      import { appendFileSync } from "node:fs";

      const [queuePath, logPath] = process.argv.slice(1);

      await withQueueLock(queuePath, async () => {
        const start = Date.now();
        await new Promise((r) => setTimeout(r, 60));
        const end = Date.now();
        appendFileSync(logPath, JSON.stringify({ pid: process.pid, start, end }) + "\\n");
      }, { retries: 30, retryIntervalMs: 20 });
    `;

    try {
      const p1 = spawn(process.execPath, ["-e", helperScript, queuePath, logPath], { stdio: "ignore" });
      const p2 = spawn(process.execPath, ["-e", helperScript, queuePath, logPath], { stdio: "ignore" });

      const waitProc = (proc: ChildProcess) =>
        new Promise<number>((resolve) => {
          const timer = setTimeout(() => {
            proc.kill("SIGKILL");
            resolve(-1);
          }, 6000);
          proc.on("exit", (code) => {
            clearTimeout(timer);
            resolve(code ?? 0);
          });
        });

      const [code1, code2] = await Promise.all([waitProc(p1), waitProc(p2)]);

      expect(code1).toBe(0);
      expect(code2).toBe(0);

      expect(existsSync(logPath)).toBe(true);
      const lines = readFileSync(logPath, "utf8").trim().split("\n").map((l) => JSON.parse(l));
      expect(lines).toHaveLength(2);

      const [t1, t2] = lines;
      // 互斥断言：第一个进程结束时刻 <= 第二个进程开始时刻（允许因毫秒时钟粒度的 0-1ms 容差）
      const noOverlap = t1.end <= t2.start + 1 || t2.end <= t1.start + 1;
      expect(noOverlap).toBe(true);
    } finally {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
  });

  test("withQueueLock real OS process: releasing lock allows waiting competitor to acquire", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-queue-lock-comp-"));
    const queuePath = join(tempDir, "comp.queue.jsonl");
    const markerPath = join(tempDir, "acquired.txt");

    const helperScript = `
      import { withQueueLock } from "${join(__dirname, "agentRunControl.ts")}";
      import { writeFileSync } from "node:fs";

      const [queuePath, markerPath] = process.argv.slice(1);

      await withQueueLock(queuePath, async () => {
        await new Promise((r) => setTimeout(r, 40));
        writeFileSync(markerPath, "acquired-by-" + process.pid);
      }, { retries: 25, retryIntervalMs: 15 });
    `;

    try {
      // 先让父进程持锁
      let releaseParentLock!: () => void;
      const parentLockPromise = withQueueLock(queuePath, async () => {
        await new Promise<void>((r) => { releaseParentLock = r; });
      });

      // 等待父进程确已建立锁目录
      const lockDir = `${queuePath}.lock`;
      let checks = 0;
      while (!existsSync(lockDir) && checks < 50) {
        await new Promise((r) => setTimeout(r, 10));
        checks++;
      }
      expect(existsSync(lockDir)).toBe(true);

      // 启动子进程（此时子进程会等待）
      const child = spawn(process.execPath, ["-e", helperScript, queuePath, markerPath], { stdio: "ignore" });

      // 50ms 后父进程释放锁
      setTimeout(() => {
        releaseParentLock();
      }, 50);

      await parentLockPromise;

      const childExit = await new Promise<number>((resolve) => {
        const timer = setTimeout(() => { child.kill("SIGKILL"); resolve(-1); }, 5000);
        child.on("exit", (code) => { clearTimeout(timer); resolve(code ?? 0); });
      });

      expect(childExit).toBe(0);
      expect(existsSync(markerPath)).toBe(true);
    } finally {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
  });

  test("GC and appendRunQueue under lock: GC deletion and append serialize cleanly on real fs", async () => {
    const tempDir = mkdtempSync(join(tmpdir(), "nolo-gc-race-"));
    const noloHome = join(tempDir, ".nolo");
    const runsDir = join(noloHome, "runs");
    const queuePath = join(runsDir, "run-race.queue.jsonl");
    const logPath = join(runsDir, "run-race.log");
    const recordPath = join(runsDir, "run-race.json");

    const env = { NOLO_HOME: noloHome };
    const deps = { env, homedir: () => tempDir };

    try {
      await appendRunQueue(queuePath, "msg before gc", deps);
      expect(existsSync(queuePath)).toBe(true);

      writeRunRecord(
        {
          runId: "run-race",
          agentKey: "a",
          startedAt: "2025-01-01T00:00:00.000Z",
          status: "done",
          endedAt: "2025-01-01T00:00:00.000Z",
          logPath,
          queuePath,
        },
        deps
      );
      writeFileSync(logPath, "log content");

      // 并发执行 GC 清理与向新队列追加消息
      const gcPromise = gcRunRecords(deps, { retentionMs: 0 });
      const appendPromise = (async () => {
        await new Promise((r) => setTimeout(r, 10));
        return appendRunQueue(queuePath, "msg during/after gc", deps);
      })();

      const [gcResult, appendResult] = await Promise.all([gcPromise, appendPromise]);

      expect(gcResult.swept).toBe(1);
      expect(appendResult.queuedCount).toBeGreaterThanOrEqual(1);
      expect(existsSync(queuePath)).toBe(true);
      const remainingMsgs = await readQueueMessages(queuePath, deps);
      expect(remainingMsgs).toContain("msg during/after gc");
    } finally {
      try { rmSync(tempDir, { recursive: true, force: true }); } catch {}
    }
  });

  test("gcRunRecords deletes queue file strictly inside withQueueLock and respects lock when held", async () => {
    const fs = createInMemoryFs();
    const queuePath = "/home/test/.nolo/runs/run-gc-lock.queue.jsonl";
    const logPath = "/home/test/.nolo/runs/run-gc-lock.log";
    const lockPath = `${queuePath}.lock`;

    let unlinkedInsideLock = false;
    const baseUnlink = fs.unlinkSync.bind(fs);
    fs.unlinkSync = (path: string) => {
      if (path === queuePath) {
        // 断言：删除 queuePath 的那一刻，锁目录必须存在（处于持锁状态）
        unlinkedInsideLock = fs.existsSync(lockPath);
      }
      baseUnlink(path);
    };

    fs.writeFileSync(queuePath, "msg in queue");
    fs.writeFileSync(logPath, "log text");

    const deps = createDeps({ fs, now: () => new Date("2025-01-11T00:00:00.000Z") });
    writeRunRecord(
      {
        runId: "run-gc-lock",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "done",
        endedAt: "2025-01-01T00:00:00.000Z",
        logPath,
        queuePath,
      },
      deps
    );

    // 1. 结构断言：删除发生在 withQueueLock 临界区内
    const sweepResult = await gcRunRecords(deps, { retentionMs: 0 });
    expect(sweepResult.swept).toBe(1);
    expect(unlinkedInsideLock).toBe(true);
    expect(fs.existsSync(queuePath)).toBe(false);
    expect(fs.existsSync(lockPath)).toBe(false);

    // 2. 互斥断言：当他人持有队列锁时，GC 绝不越锁删除，而是保留文件并标记 failed
    fs.writeFileSync(queuePath, "msg in queue 2");
    fs.writeFileSync(logPath, "log text 2");
    writeRunRecord(
      {
        runId: "run-gc-held",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "done",
        endedAt: "2025-01-01T00:00:00.000Z",
        logPath,
        queuePath,
      },
      deps
    );

    // 手动持锁（新鲜锁，未超时）
    fs.mkdirSync(lockPath);

    const heldSweepResult = await gcRunRecords(deps, { retentionMs: 0 });
    expect(heldSweepResult.swept).toBe(0);
    expect(heldSweepResult.failedIds).toContain("run-gc-held");
    // 队列文件和 json 索引完整保留，未被越权删除
    expect(fs.existsSync(queuePath)).toBe(true);
    expect(fs.existsSync("/home/test/.nolo/runs/run-gc-held.json")).toBe(true);

    // 释放锁后，下一轮 GC 正常扫除
    fs.rmdirSync(lockPath);
    const retrySweepResult = await gcRunRecords(deps, { retentionMs: 0 });
    expect(retrySweepResult.swept).toBe(1);
    expect(retrySweepResult.sweptIds).toContain("run-gc-held");
    expect(fs.existsSync(queuePath)).toBe(false);
  });

  test("defaultGenerateRunId returns run prefix", () => {
    const id = defaultGenerateRunId();
    expect(id.startsWith("run-")).toBe(true);
    expect(id.length).toBeGreaterThan("run-".length + 6);
  });

  test("writeRunRecord and readRunRecord round trip", () => {
    const deps = createDeps();
    const record: RunRecord = {
      runId: "run-1",
      pid: 100,
      agentKey: "local-codex",
      cwd: "/repo",
      startedAt: "2025-01-01T00:00:00.000Z",
      status: "running",
      logPath: "/home/test/.nolo/runs/run-1.log",
    };
    writeRunRecord(record, deps);
    expect(readRunRecord("run-1", deps)).toEqual(record);
  });

  test("backfillRunRecordParentDialog stamps a record missing parentDialogId", () => {
    const deps = createDeps();
    writeRunRecord(
      {
        runId: "run-bf-1",
        pid: 100,
        agentKey: "agent-x",
        cwd: "/repo",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-bf-1.log",
      },
      deps,
    );
    expect(backfillRunRecordParentDialog("run-bf-1", "dialog-1", deps)).toBe(true);
    const record = readRunRecord("run-bf-1", deps);
    expect(record?.parentDialogId).toBe("dialog-1");
    // 其余字段原样保留（心跳是读-改-写，回填不得丢 activity 等字段）。
    expect(record?.status).toBe("running");
    expect(record?.agentKey).toBe("agent-x");
  });

  test("backfillRunRecordParentDialog never overwrites an existing parentDialogId", () => {
    const deps = createDeps();
    writeRunRecord(
      {
        runId: "run-bf-2",
        agentKey: "agent-x",
        cwd: "/repo",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-bf-2.log",
        parentDialogId: "dialog-original",
      },
      deps,
    );
    expect(backfillRunRecordParentDialog("run-bf-2", "dialog-other", deps)).toBe(false);
    expect(readRunRecord("run-bf-2", deps)?.parentDialogId).toBe("dialog-original");
  });

  test("backfillRunRecordParentDialog returns false for unknown runId or empty dialogId", () => {
    const deps = createDeps();
    expect(backfillRunRecordParentDialog("run-missing", "dialog-1", deps)).toBe(false);
    writeRunRecord(
      {
        runId: "run-bf-3",
        agentKey: "agent-x",
        cwd: "/repo",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-bf-3.log",
      },
      deps,
    );
    expect(backfillRunRecordParentDialog("run-bf-3", "", deps)).toBe(false);
    expect(readRunRecord("run-bf-3", deps)?.parentDialogId).toBeUndefined();
  });

  test("backfillRunRecordParentDialog resolves the record via the caller-provided env (NOLO_HOME)", () => {
    // 调用约定：resolveNoloHome 只认传入 env 的 NOLO_HOME。记录写在自定义
    // NOLO_HOME 下时，不传 env 的回填会去默认 ~/.nolo 找（找不到 → false），
    // 传入同源 env 才能命中——tuiTurnRunner 的回填点必须显式传 env。
    const customDeps = createDeps({
      env: { NOLO_HOME: "/custom/nolo-home" },
    });
    writeRunRecord(
      {
        runId: "run-bf-env",
        agentKey: "agent-x",
        cwd: "/repo",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/custom/nolo-home/runs/run-bf-env.log",
      },
      customDeps,
    );
    // 默认 deps（createDeps 的 NOLO_HOME=/home/test/.nolo）找不到该记录。
    expect(backfillRunRecordParentDialog("run-bf-env", "dialog-1", createDeps())).toBe(false);
    expect(backfillRunRecordParentDialog("run-bf-env", "dialog-1", customDeps)).toBe(true);
    expect(readRunRecord("run-bf-env", customDeps)?.parentDialogId).toBe("dialog-1");
  });

  test("listRunRecords sorts by startedAt descending", () => {
    const deps = createDeps();
    writeRunRecord(
      {
        runId: "run-1",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "done",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    writeRunRecord(
      {
        runId: "run-2",
        agentKey: "b",
        startedAt: "2025-01-02T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-2.log",
      },
      deps
    );
    const records = listRunRecords(deps);
    expect(records.map((r) => r.runId)).toEqual(["run-2", "run-1"]);
  });

  test("findRunRecord by runId and by pid", () => {
    const deps = createDeps();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 999,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    expect(findRunRecord("run-1", deps)?.runId).toBe("run-1");
    expect(findRunRecord("999", deps)?.runId).toBe("run-1");
    expect(findRunRecord("missing", deps)).toBeUndefined();
  });

  test("stripBackgroundFlag removes --bg variants", () => {
    expect(stripBackgroundFlag(["a", "--bg", "b"])).toEqual(["a", "b"]);
    expect(stripBackgroundFlag(["a", "--bg=true", "b"])).toEqual(["a", "b"]);
    expect(stripBackgroundFlag(["a", "b"])).toEqual(["a", "b"]);
  });

  test("absolutizeSkillArgs rewrites relative --skill md paths, keeps dbKeys", () => {
    expect(
      absolutizeSkillArgs(
        ["--skill", "docs/skill.md", "--skill", "page-tenant-01X", "--cwd", "/run"],
        "/caller"
      )
    ).toEqual([
      "--skill",
      "/caller/docs/skill.md",
      "--skill",
      "page-tenant-01X",
      "--cwd",
      "/run",
    ]);
    expect(absolutizeSkillArgs(["--skill=skills/ui.md"], "/caller")).toEqual([
      "--skill=/caller/skills/ui.md",
    ]);
    expect(
      absolutizeSkillArgs(["--skill", "/abs/skill.md"], "/caller")
    ).toEqual(["--skill", "/abs/skill.md"]);
  });

  test("rewriteMsgFileArg points --msg-file at the runs-dir snapshot", () => {
    const snapshot = "/home/u/.nolo/runs/run-1.msg.md";
    expect(
      rewriteMsgFileArg(["--msg-file", "tmp/spec.md", "--local"], snapshot)
    ).toEqual(["--msg-file", snapshot, "--local"]);
    expect(rewriteMsgFileArg(["--msg-file=tmp/a.md"], snapshot)).toEqual([
      `--msg-file=${snapshot}`,
    ]);
    expect(rewriteMsgFileArg(["--msg", "hi"], snapshot)).toEqual([
      "--msg",
      "hi",
    ]);
  });

  test("spawnLocalBackgroundRun snapshots message into runs dir and rewrites child --msg-file", async () => {
    const { spawn, calls } = createMockSpawn();
    const fs = createInMemoryFs();
    const deps = createDeps({ spawn, fs });
    const { output } = createMockOutput();

    const result = await spawnLocalBackgroundRun(
      {
        rawArgs: [
          "agent-1",
          "--msg-file",
          "tmp/agent-tasks/spec.md",
          "--local",
          "--bg",
        ],
        commandPath: ["agent", "run"],
        cliEntrypointPath: "/repo/packages/cli/index.ts",
        agentKey: "agent-1",
        cwd: "/repo/.worktrees/feature",
        msgFile: "tmp/agent-tasks/spec.md",
        message: "# spec content\n\n做这件事。",
        output,
      },
      deps
    );

    // 快照写进 nolo runs 目录，record 指向快照而非调用者本地文件
    const snapshotWrite = fs.writeCalls.find((c) =>
      c.path.endsWith(`${result.runId}.msg.md`)
    );
    expect(snapshotWrite?.data).toBe("# spec content\n\n做这件事。");
    const record = readRunRecord(result.runId, deps);
    expect(record?.msgFile).toBe(snapshotWrite?.path);

    // 子进程参数里的 --msg-file 是快照绝对路径，与调用者 cwd / run cwd 都无关
    expect(calls).toHaveLength(1);
    const msgFileIndex = calls[0].args.indexOf("--msg-file");
    expect(msgFileIndex).toBeGreaterThan(-1);
    expect(calls[0].args[msgFileIndex + 1]).toBe(snapshotWrite!.path);
    expect(calls[0].options?.cwd).toBe("/repo/.worktrees/feature");
  });

  test("spawnLocalBackgroundRun writes registry and spawns detached child without --bg", async () => {
    const { spawn, calls } = createMockSpawn();
    const deps = createDeps({
      spawn,
      getProcessStartTime: () => new Date("2025-01-01T00:00:00.250Z"),
    });
    const { output, lines } = createMockOutput();

    const result = await spawnLocalBackgroundRun(
      {
        rawArgs: ["local-codex", "--msg", "hello", "--bg", "--local"],
        commandPath: ["agent", "run"],
        cliEntrypointPath: "/repo/packages/cli/index.ts",
        agentKey: "local-codex",
        cwd: "/repo",
        timeoutMs: 120000,
        output,
      },
      deps
    );

    expect(result.runId).toBe("run-2025-01-01T00-00-00-000Z-abc123");
    expect(result.pid).toBe(12345);

    const record = readRunRecord(result.runId, deps);
    expect(record).toMatchObject({
      runId: result.runId,
      pid: 12345,
      agentKey: "local-codex",
      cwd: "/repo",
      timeoutMs: 120000,
      status: "running",
      processStartedAt: "2025-01-01T00:00:00.250Z",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].command).toBe(process.execPath);
    expect(calls[0].args).toEqual([
      "/repo/packages/cli/index.ts",
      "agent",
      "run",
      "local-codex",
      "--msg",
      "hello",
      "--local",
      "--queue-file",
      "/home/test/.nolo/runs/run-2025-01-01T00-00-00-000Z-abc123.queue.jsonl",
    ]);
    expect(calls[0].options.cwd).toBe("/repo");
    expect(calls[0].options.detached).toBe(true);
    expect(calls[0].options.env?.NOLO_AGENT_RUN_CHILD).toBe("1");
    expect(calls[0].options.env?.NOLO_AGENT_RUN_ID).toBe(result.runId);
    // Parent UX lines are printed by agentRunCommand after spawn returns.
    expect(lines).toEqual([]);
  });

  test("spawnLocalBackgroundRun uses execPath directly for compiled binary", async () => {
    const { spawn, calls } = createMockSpawn();
    const deps = createDeps({ spawn });
    const { output } = createMockOutput();

    await spawnLocalBackgroundRun(
      {
        rawArgs: ["local-codex", "--msg", "hello", "--bg"],
        commandPath: ["run"],
        cliEntrypointPath: process.execPath,
        agentKey: "local-codex",
        output,
      },
      deps
    );

    expect(calls[0].args).toEqual([
      "run",
      "local-codex",
      "--msg",
      "hello",
      "--queue-file",
      "/home/test/.nolo/runs/run-2025-01-01T00-00-00-000Z-abc123.queue.jsonl",
    ]);
  });

  test("buildAgentRunChildCommand falls back to valid entrypoint when cliEntrypointPath does not exist", () => {
    const memFs = createInMemoryFs({});
    const cmd = buildAgentRunChildCommand(
      {
        rawArgs: ["local-codex", "--msg", "hello"],
        commandPath: ["agent", "run"],
        cliEntrypointPath: "/nonexistent/packages/index.ts",
      },
      { fs: memFs }
    );
    // Should NOT use the invalid /nonexistent/packages/index.ts
    expect(cmd.childArgs[0]).not.toBe("/nonexistent/packages/index.ts");
    expect(cmd.childArgs).toContain("agent");
    expect(cmd.childArgs).toContain("run");
  });

  test("buildAgentRunChildCommand uses cliEntrypointPath when it exists", () => {
    const memFs = createInMemoryFs({ "/valid/custom/entry.ts": "" });
    const cmd = buildAgentRunChildCommand(
      {
        rawArgs: ["local-codex", "--msg", "hello"],
        commandPath: ["agent", "run"],
        cliEntrypointPath: "/valid/custom/entry.ts",
      },
      { fs: memFs }
    );
    expect(cmd.childArgs[0]).toBe("/valid/custom/entry.ts");
  });

  test("spawnLocalBackgroundRun records dodCommands and spawnHead", async () => {
    const { spawn } = createMockSpawn();
    const deps = createDeps({
      spawn,
      execFileSync: ((file: string, args: string[]) => {
        if (args[0] === "rev-parse" && args[1] === "HEAD") {
          return "abcdef1234567890abcdef1234567890abcdef12\n";
        }
        return "";
      }) as any,
    });
    const { output } = createMockOutput();

    const result = await spawnLocalBackgroundRun(
      {
        rawArgs: ["local-codex", "--msg", "hello", "--bg", "--dod", "bun test", "--dod", "npm run lint"],
        commandPath: ["agent", "run"],
        cliEntrypointPath: "/repo/packages/cli/index.ts",
        agentKey: "local-codex",
        cwd: "/repo",
        output,
      },
      deps
    );

    const record = readRunRecord(result.runId, deps);
    expect(record?.dodCommands).toEqual(["bun test", "npm run lint"]);
    expect(record?.spawnHead).toBe("abcdef1234567890abcdef1234567890abcdef12");
  });

  test("finalizeRunRecord updates status, exitCode, dialogId and endedAt", () => {
    const deps = createDeps();
    writeRunRecord(
      {
        runId: "run-1",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    finalizeRunRecord("run-1", { status: "done", exitCode: 0, dialogId: "dialog-1" }, deps);
    const record = readRunRecord("run-1", deps)!;
    expect(record.status).toBe("done");
    expect(record.exitCode).toBe(0);
    expect(record.dialogId).toBe("dialog-1");
    expect(record.endedAt).toBe("2025-01-01T00:00:00.000Z");
  });

  test("finalizeRunRecord 落盘 run 自报的平台积分 credits", () => {
    const deps = createDeps();
    writeRunRecord(
      {
        runId: "run-credits",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-credits.log",
      },
      deps
    );
    finalizeRunRecord(
      "run-credits",
      { status: "done", exitCode: 0, credits: 0.0521 },
      deps
    );
    expect(readRunRecord("run-credits", deps)?.credits).toBe(0.0521);
    // 无计费（自有 API）不写字段；非有限值忽略。
    finalizeRunRecord("run-credits", { status: "done", exitCode: 0 }, deps);
    expect(readRunRecord("run-credits", deps)?.credits).toBe(0.0521);
    finalizeRunRecord("run-credits", { status: "done", exitCode: 0, credits: NaN }, deps);
    expect(readRunRecord("run-credits", deps)?.credits).toBe(0.0521);
  });

  test("runAgentPsCommand lists runs", async () => {
    const deps = createDeps();
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "local-codex",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentPsCommand([], { ...deps, output });
    expect(code).toBe(0);
    expect(lines.some((l) => l.includes("run-1"))).toBe(true);
    expect(lines.some((l) => l.includes("local-codex"))).toBe(true);
  });

  test("runAgentPsCommand reports empty state", async () => {
    const deps = createDeps();
    const { output, lines } = createMockOutput();
    const code = await runAgentPsCommand([], { ...deps, output });
    expect(code).toBe(0);
    expect(lines.join("")).toContain("No local runs found");
  });

  test("runAgentStatusCommand shows usage without target", async () => {
    const deps = createDeps();
    const { output, lines } = createMockOutput();
    const code = await runAgentStatusCommand([], { ...deps, output });
    expect(code).toBe(1);
    expect(lines.join("")).toContain("Usage:");
  });

  test("runAgentStatusCommand shows record details and last log lines", async () => {
    const fs = createInMemoryFs({
      "/home/test/.nolo/runs/run-1.log": "line1\nline2\n",
    });
    const deps = createDeps({ fs });
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "local-codex",
        cwd: "/repo",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentStatusCommand(["run-1"], { ...deps, output });
    expect(code).toBe(0);
    const text = lines.join("");
    expect(text).toContain("runId:    run-1");
    expect(text).toContain("agent:    local-codex");
    expect(text).toContain("cwd:      /repo");
    expect(text).toContain("line2");
  });

  test("runAgentLogsCommand prints log and supports --tail", async () => {
    const fs = createInMemoryFs({
      "/home/test/.nolo/runs/run-1.log": "a\nb\nc\n",
    });
    const deps = createDeps({ fs });
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "done",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentLogsCommand(["run-1", "--tail", "2"], { ...deps, output });
    expect(code).toBe(0);
    expect(lines.join("")).toBe("b\nc\n");
  });

  test("runAgentLogsCommand returns usage without runId", async () => {
    const deps = createDeps();
    const { output, lines } = createMockOutput();
    const code = await runAgentLogsCommand([], { ...deps, output });
    expect(code).toBe(1);
    expect(lines.join("")).toContain("Usage:");
  });

  test("runAgentStopCommand signals the process group and marks killed", async () => {
    const mock = makeTerminatingKillMock();
    const deps = createDeps({ kill: mock.kill, now: mock.now, sleep: mock.sleep });
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentStopCommand(["run-1"], { ...deps, output });
    expect(code).toBe(0);
    // 杀整个进程组（负 pid），而非单进程。
    expect(mock.kills.some((k) => k.pid === -100 && k.signal === "SIGTERM")).toBe(true);
    expect(readRunRecord("run-1", deps)?.status).toBe("killed");
    expect(lines.join("")).toContain("confirmed gone");
  });

  test("runAgentKillCommand signals the process group with SIGKILL and marks killed", async () => {
    const mock = makeTerminatingKillMock();
    const deps = createDeps({ kill: mock.kill, now: mock.now, sleep: mock.sleep });
    const { output } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentKillCommand(["run-1"], { ...deps, output });
    expect(code).toBe(0);
    expect(mock.kills.some((k) => k.pid === -100 && k.signal === "SIGKILL")).toBe(true);
    expect(readRunRecord("run-1", deps)?.status).toBe("killed");
  });

  test("signal commands handle missing runId", async () => {
    const deps = createDeps();
    const { output, lines } = createMockOutput();
    expect(await runAgentStopCommand([], { ...deps, output })).toBe(1);
    expect(lines.join("")).toContain("Usage:");
  });

  test("signal commands handle missing pid", async () => {
    const deps = createDeps();
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentStopCommand(["run-1"], { ...deps, output });
    expect(code).toBe(1);
    expect(lines.join("")).toContain("no pid");
  });

  test("signal commands handle already exited process", async () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentStopCommand(["run-1"], { ...deps, output });
    expect(code).toBe(0);
    expect(readRunRecord("run-1", deps)?.status).toBe("killed");
    expect(lines.join("")).toContain("confirmed gone");
  });

  test("terminateRunProcess escalates to SIGKILL when SIGTERM is ignored", async () => {
    const mock = makeTerminatingKillMock({ ignoreSigterm: true });
    const confirmed = await terminateRunProcess(
      { pid: 100 },
      "SIGTERM",
      { kill: mock.kill, now: mock.now, sleep: mock.sleep }
    );
    expect(confirmed).toBe(true);
    expect(mock.kills.some((k) => k.pid === -100 && k.signal === "SIGTERM")).toBe(true);
    expect(mock.kills.some((k) => k.pid === -100 && k.signal === "SIGKILL")).toBe(true);
  });

  test("terminateRunProcess returns false when the process survives SIGKILL", async () => {
    const mock = makeTerminatingKillMock({ ignoreSigterm: true, ignoreSigkill: true });
    const confirmed = await terminateRunProcess(
      { pid: 100 },
      "SIGTERM",
      { kill: mock.kill, now: mock.now, sleep: mock.sleep }
    );
    expect(confirmed).toBe(false);
  });

  test("runAgentStopCommand does not mark killed when the process survives SIGKILL", async () => {
    const mock = makeTerminatingKillMock({ ignoreSigterm: true, ignoreSigkill: true });
    const deps = createDeps({ kill: mock.kill, now: mock.now, sleep: mock.sleep });
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentStopCommand(["run-1"], { ...deps, output });
    expect(code).toBe(1);
    expect(readRunRecord("run-1", deps)?.status).toBe("running");
    expect(lines.join("")).toContain("still alive after SIGKILL");
  });

  test("isPidGone returns false when kill(pid,0) succeeds", () => {
    const kills: { pid: number; signal: string | number }[] = [];
    const deps = createDeps({
      kill: (pid, signal) => kills.push({ pid, signal }),
    });
    expect(isPidGone(100, deps)).toBe(false);
    // Signal 0 is passed numerically: `process.kill(pid, "0")` throws
    // ERR_UNKNOWN_SIGNAL instead of probing the process.
    expect(kills).toEqual([{ pid: 100, signal: 0 }]);
  });

  test("isPidGone returns true on ESRCH", () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    expect(isPidGone(100, deps)).toBe(true);
  });

  test("isPidGone returns false on non-ESRCH errors (e.g. EPERM)", () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("EPERM") as Error & { code: string };
        error.code = "EPERM";
        throw error;
      },
    });
    expect(isPidGone(100, deps)).toBe(false);
  });

  test("checkStaleRun marks running record orphaned when pid is gone", () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const record = checkStaleRun("run-1", deps);
    expect(record?.status).toBe("orphaned");
    expect(record?.note).toContain("orphaned");
    expect(record?.endedAt).toBe("2025-01-01T00:00:00.000Z");
    expect(record?.reconciledAt).toBe("2025-01-01T00:00:00.000Z");
    // pid is cleared so a recycled pid can't revive a dead record.
    expect(record?.pid).toBeUndefined();
  });

  test("checkStaleRun leaves running record when pid still alive", () => {
    const kills: { pid: number; signal: string | number }[] = [];
    const deps = createDeps({
      kill: (pid, signal) => kills.push({ pid, signal }),
    });
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const record = checkStaleRun("run-1", deps);
    expect(record?.status).toBe("running");
    expect(record?.note).toBeUndefined();
    expect(kills).toEqual([{ pid: 100, signal: 0 }]);
  });

  // Root cause regression: signal 0 must be the *number* 0. Node resolves a
  // string signal by name, and "0" is not a signal name, so
  // `process.kill(pid, "0")` threw ERR_UNKNOWN_SIGNAL before probing anything.
  // That is not ESRCH, so isPidGone answered "not gone" for every pid and
  // liveness detection was effectively dead code. These use the real
  // process.kill (no injected kill) to lock the actual runtime behaviour.
  test("isPidGone reports a genuinely dead pid as gone (real process.kill)", () => {
    // A pid that cannot exist: reaped child pids are racy, but pid 0 and
    // negative pids address process groups, so use a spawned-then-exited pid.
    const dead = spawnSync(process.execPath, ["-e", "1"]);
    expect(dead.status).toBe(0);
    // Its pid has exited by the time spawnSync returns.
    const deadPid = dead.pid!;
    expect(isPidGone(deadPid)).toBe(true);
  });

  test("isPidGone reports the current live process as alive (real process.kill)", () => {
    expect(isPidGone(process.pid)).toBe(false);
  });

  // tmp+rename makes a single publish atomic but does not arbitrate between
  // two writers. This locks the arbitration itself: a terminal status written
  // concurrently must survive, and must not keep a stale orphan verdict.
  test("a self-reported terminal status clears a prior orphan verdict", () => {
    const deps = createDeps();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2024-12-31T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
        note: "orphaned: process gone without writing terminal status",
      },
      deps
    );

    finalizeRunRecord("run-1", { status: "done", exitCode: 0 }, deps);

    const record = readRunRecord("run-1", deps);
    expect(record?.status).toBe("done");
    expect(record?.exitCode).toBe(0);
    // A record must never claim both a clean exit and an orphan verdict.
    expect(record?.note).toBeUndefined();
  });

  // Regression: live runs were being marked `orphaned` while they kept working
  // for minutes (records ended up with `status:orphaned` alongside `exitCode:0`
  // and an activity heartbeat newer than `reconciledAt`). A dead-pid inference
  // must never outrank direct proof of life.
  test("a fresh activity heartbeat outranks a dead-pid inference", () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
        activity: {
          // createDeps pins now() to 2025-01-01T00:00:00Z, so this heartbeat is
          // "1s ago" — well inside the grace window.
          lastEventAt: "2024-12-31T23:59:59.000Z",
          inFlight: { kind: "llm", name: "llm", sinceMs: 1000 },
          counters: { llmCalls: 63, toolCalls: 63, fileEdits: 0 },
          updatedAt: "2024-12-31T23:59:59.000Z",
        },
      },
      deps
    );

    const record = checkStaleRun("run-1", deps);
    expect(record?.status).toBe("running");
    expect(record?.note).toBeUndefined();
    // The record on disk must be untouched, not just the returned copy.
    expect(readRunRecord("run-1", deps)?.status).toBe("running");
  });

  test("a stale heartbeat still lets a dead pid be reclaimed", () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2024-12-31T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
        activity: {
          lastEventAt: "2024-12-31T23:00:00.000Z",
          inFlight: null,
          counters: { llmCalls: 1, toolCalls: 1, fileEdits: 0 },
          // An hour of silence: the process really is gone.
          updatedAt: "2024-12-31T23:00:00.000Z",
        },
      },
      deps
    );

    expect(checkStaleRun("run-1", deps)?.status).toBe("orphaned");
  });

  // The child finalizes itself concurrently with a reconciler pass. Writing a
  // stale in-memory copy would resurrect the run as `orphaned` and clobber the
  // real terminal status.
  test("a concurrent terminal status is not clobbered by reconciliation", () => {
    let killCalls = 0;
    const deps = createDeps({
      kill: () => {
        killCalls += 1;
        // The record is finalized by its own process after we read it but
        // before the destructive write.
        const current = readRunRecord("run-1", deps)!;
        writeRunRecord({ ...current, status: "done", exitCode: 0 }, deps);
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2024-12-31T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );

    const record = checkStaleRun("run-1", deps);
    expect(killCalls).toBe(1);
    expect(record?.status).toBe("done");
    expect(record?.exitCode).toBe(0);
    const onDisk = readRunRecord("run-1", deps);
    expect(onDisk?.status).toBe("done");
    expect(onDisk?.note).toBeUndefined();
  });

  test("checkStaleRun is a no-op for non-running records", () => {
    const kills: { pid: number; signal: string | number }[] = [];
    const deps = createDeps({
      kill: (pid, signal) => kills.push({ pid, signal }),
    });
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "done",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const record = checkStaleRun("run-1", deps);
    expect(record?.status).toBe("done");
    expect(kills).toEqual([]);
  });

  test("checkStaleRun is a no-op for running records without a pid", () => {
    const kills: { pid: number; signal: string | number }[] = [];
    const deps = createDeps({
      kill: (pid, signal) => kills.push({ pid, signal }),
    });
    writeRunRecord(
      {
        runId: "run-1",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const record = checkStaleRun("run-1", deps);
    expect(record?.status).toBe("running");
    expect(kills).toEqual([]);
  });

  test("checkStaleRun returns null for missing run", () => {
    const deps = createDeps();
    expect(checkStaleRun("missing", deps)).toBeNull();
  });

  test("runAgentPsCommand --json emits a JSON array", async () => {
    const deps = createDeps({
      kill: (pid, signal) => {
        expect(signal).toBe("0");
        // pid alive, no throw
      },
    });
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "local-codex",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentPsCommand(["--json"], { ...deps, output });
    expect(code).toBe(0);
    const parsed = JSON.parse(lines.join(""));
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ runId: "run-1", agentKey: "local-codex", status: "running" });
  });

  test("runAgentPsCommand --json emits empty array when no runs", async () => {
    const deps = createDeps();
    const { output, lines } = createMockOutput();
    const code = await runAgentPsCommand(["--json"], { ...deps, output });
    expect(code).toBe(0);
    expect(JSON.parse(lines.join(""))).toEqual([]);
  });

  test("runAgentPsCommand reconciles stale pid before listing", async () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentPsCommand([], { ...deps, output });
    expect(code).toBe(0);
    expect(readRunRecord("run-1", deps)?.status).toBe("orphaned");
    const text = lines.join("");
    // Stale record still listed but now shows orphaned.
    expect(text).toContain("run-1");
    expect(text).toContain("orphaned");
  });

  test("runAgentStatusCommand --json emits a single JSON object", async () => {
    const deps = createDeps({
      kill: () => {
        // alive
      },
    });
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "local-codex",
        cwd: "/repo",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentStatusCommand(["run-1", "--json"], { ...deps, output });
    expect(code).toBe(0);
    const parsed = JSON.parse(lines.join(""));
    expect(parsed).toMatchObject({ runId: "run-1", agentKey: "local-codex", status: "running" });
  });

  test("runAgentStatusCommand --json reconciles stale pid", async () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentStatusCommand(["run-1", "--json"], { ...deps, output });
    expect(code).toBe(0);
    const parsed = JSON.parse(lines.join(""));
    expect(parsed.status).toBe("orphaned");
    expect(parsed.note).toContain("orphaned");
  });

  test("runAgentStatusCommand --json returns 1 for missing run", async () => {
    const deps = createDeps();
    const { output, lines } = createMockOutput();
    const code = await runAgentStatusCommand(["missing", "--json"], { ...deps, output });
    expect(code).toBe(1);
    expect(lines.join("")).toContain("Run not found");
  });

  test("runAgentStatusCommand --watch prints ticks until not running", async () => {
    let callCount = 0;
    const deps = createDeps({
      kill: () => {
        // first tick: alive, then gone on subsequent checks
        callCount += 1;
        if (callCount >= 2) {
          const error = new Error("ESRCH") as Error & { code: string };
          error.code = "ESRCH";
          throw error;
        }
      },
      sleep: async () => {
        // instant sleep
      },
    });
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentStatusCommand(["run-1", "--watch", "--interval-ms", "10"], {
      ...deps,
      output,
    });
    expect(code).toBe(0);
    const text = lines.join("");
    // Initial tick + at least one more tick before stale detected.
    const tickCount = text.split("\n").filter((l) => l.includes("status=")).length;
    expect(tickCount).toBeGreaterThanOrEqual(2);
    expect(text).toContain("status=orphaned");
    expect(readRunRecord("run-1", deps)?.status).toBe("orphaned");
  });

  test("runAgentStatusCommand --watch stops on SIGINT cleanly", async () => {
    const deps = createDeps({
      kill: () => {
        // alive throughout
      },
      sleep: async () => {
        // instant
      },
    });
    let signalHandler: (() => void) | null = null;
    const depsWithSignals: AgentRunControlDeps = {
      ...deps,
      setSignalHandler: (handler: () => void) => {
        signalHandler = handler;
      },
      clearSignalHandler: () => {
        signalHandler = null;
      },
    };
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      depsWithSignals
    );

    // Trigger the SIGINT handler after the first sleep resolves. We patch sleep
    // to fire the registered handler before resolving.
    const originalSleep = depsWithSignals.sleep!;
    depsWithSignals.sleep = async (ms: number) => {
      await originalSleep(ms);
      if (signalHandler) signalHandler();
    };

    const code = await runAgentStatusCommand(["run-1", "--watch", "--interval-ms", "10"], {
      ...depsWithSignals,
      output,
    });
    expect(code).toBe(0);
    const text = lines.join("");
    expect(text).toContain("watch stopped by signal");
    // Record still running because we interrupted before stale detection.
    expect(readRunRecord("run-1", depsWithSignals)?.status).toBe("running");
    // Signal handler cleared after watch ends.
    expect(signalHandler).toBeNull();
  });

  test("runAgentStatusCommand --watch returns 1 for missing run", async () => {
    const deps = createDeps({
      sleep: async () => {},
    });
    const { output, lines } = createMockOutput();
    const code = await runAgentStatusCommand(["missing", "--watch"], { ...deps, output });
    expect(code).toBe(1);
    expect(lines.join("")).toContain("Run not found");
  });

  test("runAgentStatusCommand --watch exits immediately when run already done", async () => {
    const sleepCalls: number[] = [];
    const deps = createDeps({
      sleep: async (ms: number) => {
        sleepCalls.push(ms);
      },
    });
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "done",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const code = await runAgentStatusCommand(["run-1", "--watch"], { ...deps, output });
    expect(code).toBe(0);
    // Only the initial tick; no sleep iterations because status is not running.
    expect(sleepCalls).toEqual([]);
    expect(lines.join("")).toContain("status=done");
  });

  test("runAgentStatusCommand shows updated usage message without target", async () => {
    const deps = createDeps();
    const { output, lines } = createMockOutput();
    const code = await runAgentStatusCommand([], { ...deps, output });
    expect(code).toBe(1);
    expect(lines.join("")).toContain("--watch");
    expect(lines.join("")).toContain("--json");
  });

  test("runAgentStatusCommand human format includes activity summary", async () => {
    const deps = createDeps();
    const { output, lines } = createMockOutput();
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
        activity: {
          lastEventAt: "2025-01-01T00:00:05.000Z",
          inFlight: { kind: "tool", name: "execShell", sinceMs: 3000 },
          counters: { llmCalls: 2, toolCalls: 5, fileEdits: 1 },
          updatedAt: "2025-01-01T00:00:08.000Z",
        },
      },
      deps
    );
    const code = await runAgentStatusCommand(["run-1"], { ...deps, output });
    expect(code).toBe(0);
    const text = lines.join("");
    expect(text).toContain("activity: 1 edits, 5 tools");
    expect(text).toContain("in-flight tool execShell");
  });

  test("runAgentStatusCommand --json includes activity field", async () => {
    const deps = createDeps();
    const { output, lines } = createMockOutput();
    const activity = {
      lastEventAt: "2025-01-01T00:00:05.000Z",
      inFlight: null as null,
      counters: { llmCalls: 2, toolCalls: 5, fileEdits: 1 },
      updatedAt: "2025-01-01T00:00:08.000Z",
    };
    writeRunRecord(
      {
        runId: "run-1",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
        activity,
      },
      deps
    );
    const code = await runAgentStatusCommand(["run-1", "--json"], { ...deps, output });
    expect(code).toBe(0);
    const parsed = JSON.parse(lines.join(""));
    expect(parsed.activity).toEqual(activity);
  });
});

describe("run activity tracker", () => {
  test("tracks inFlight and counters from loop events", () => {
    const deps = createDeps();
    writeRunRecord(
      {
        runId: "run-1",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      deps
    );
    const tracker = createRunActivityTracker("run-1", deps);

    tracker.onLoopEvent({ kind: "llm-start", round: 0, atMs: Date.now() });
    expect(tracker.getActivity().inFlight?.kind).toBe("llm");

    tracker.onLoopEvent({ kind: "llm-end", round: 0, atMs: Date.now(), ok: true });
    expect(tracker.getActivity().inFlight).toBeNull();
    expect(tracker.getActivity().counters.llmCalls).toBe(1);

    tracker.onLoopEvent({
      kind: "tool-start",
      round: 0,
      toolCallId: "tc-1",
      toolName: "execShell",
      atMs: Date.now(),
    });
    expect(tracker.getActivity().inFlight?.kind).toBe("tool");

    tracker.onLoopEvent({
      kind: "tool-end",
      round: 0,
      toolCallId: "tc-1",
      toolName: "execShell",
      atMs: Date.now(),
      ok: true,
    });
    expect(tracker.getActivity().inFlight).toBeNull();
    expect(tracker.getActivity().counters.toolCalls).toBe(1);

    tracker.onLoopEvent({
      kind: "tool-end",
      round: 0,
      toolCallId: "tc-2",
      toolName: "writeFile",
      atMs: Date.now(),
      ok: true,
    });
    expect(tracker.getActivity().counters.fileEdits).toBe(1);

    tracker.dispose();
  });

  test("throttles registry writes", async () => {
    const deps = createDeps();
    const fs = createInMemoryFs();
    writeRunRecord(
      {
        runId: "run-1",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-1.log",
      },
      { ...deps, fs }
    );
    const tracker = createRunActivityTracker("run-1", { ...deps, fs }, { minWriteIntervalMs: 50 });

    // 心跳的读-改-写现在持有记录锁（withRunRecordLock），每次落盘伴随一次
    // .lock 文件写——计数只算记录数据写（tmp 文件），排除锁文件，避免把
    // 测试耦合到内部写文件的次数上。
    const recordWrites = () =>
      fs.writeCalls.filter((c) => c.path.includes("/run-1.json") && !c.path.endsWith(".lock"));

    tracker.onLoopEvent({ kind: "llm-start", round: 0, atMs: Date.now() });
    // Event schedules a write but does not execute immediately.
    expect(recordWrites().length).toBe(1); // only the setup write

    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(recordWrites().length).toBe(2);
    const firstActivity = JSON.parse(recordWrites()[1].data).activity;
    expect(firstActivity.inFlight?.kind).toBe("llm");

    tracker.onLoopEvent({ kind: "llm-end", round: 0, atMs: Date.now(), ok: true });
    tracker.onLoopEvent({
      kind: "tool-start",
      round: 0,
      toolCallId: "tc-1",
      toolName: "execShell",
      atMs: Date.now(),
    });
    await new Promise((resolve) => setTimeout(resolve, 80));
    expect(recordWrites().length).toBe(3);

    tracker.dispose();
  });
});

// ── run-truth-batch: 状态真值对账 + 批次聚合 + GC ────────────────────────────

describe("run-truth-batch: stale reconciliation (orphaned)", () => {
  test("isRunTerminalStatus recognizes orphaned as terminal", () => {
    expect(isRunTerminalStatus("orphaned")).toBe(true);
    expect(isRunTerminalStatus("done")).toBe(true);
    expect(isRunTerminalStatus("running")).toBe(false);
    expect(isRunTerminalStatus(undefined)).toBe(false);
  });

  test("defaultGenerateBatchId returns batch prefix", () => {
    const id = defaultGenerateBatchId();
    expect(id.startsWith("batch-")).toBe(true);
  });

  test("checkStaleRun writes orphaned and clears pid (persisted)", () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    writeRunRecord(
      {
        runId: "run-x",
        pid: 999,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-x.log",
      },
      deps
    );
    checkStaleRun("run-x", deps);
    // Re-read: persistence is what stops repeated probes.
    const reread = readRunRecord("run-x", deps);
    expect(reread?.status).toBe("orphaned");
    expect(reread?.pid).toBeUndefined();
    expect(reread?.reconciledAt).toBe("2025-01-01T00:00:00.000Z");
  });

  test("checkStaleRun keeps running when pid alive (EPERM treated as alive)", () => {
    const deps = createDeps({
      kill: () => {
        // EPERM: process exists but we lack permission — must NOT be dead.
        const error = new Error("EPERM") as Error & { code: string };
        error.code = "EPERM";
        throw error;
      },
    });
    writeRunRecord(
      {
        runId: "run-ep",
        pid: 4242,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-ep.log",
      },
      deps
    );
    const record = checkStaleRun("run-ep", deps);
    expect(record?.status).toBe("running");
    expect(record?.pid).toBe(4242);
  });

  test("already-terminal records are not touched by reconcile", () => {
    const kills: { pid: number; signal: string | number }[] = [];
    const deps = createDeps({
      kill: (pid, signal) => kills.push({ pid, signal }),
    });
    writeRunRecord(
      {
        runId: "run-done",
        pid: 100,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "done",
        logPath: "/home/test/.nolo/runs/run-done.log",
      },
      deps
    );
    const record = checkStaleRun("run-done", deps);
    expect(record?.status).toBe("done");
    // No probe issued on a terminal record.
    expect(kills).toEqual([]);
  });

  test("reconciled orphaned record is not re-probed on second read", () => {
    let probeCount = 0;
    const deps = createDeps({
      kill: () => {
        probeCount += 1;
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    writeRunRecord(
      {
        runId: "run-once",
        pid: 777,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-once.log",
      },
      deps
    );
    checkStaleRun("run-once", deps);
    expect(probeCount).toBe(1);
    // Second reconcile: record is now orphaned (no pid) → no probe.
    checkStaleRun("run-once", deps);
    expect(probeCount).toBe(1);
  });

  test("checkStaleRun keeps a live process running when ps lstart rounds to the next second (macOS second precision)", () => {
    // macOS `ps -o lstart` only reports whole seconds (no milliseconds). A
    // process spawned at 00:00:02.9xx is reported as 00:00:03, which is 1s
    // away from the persisted processStartedAt 00:00:02.000. With the old 1s
    // tolerance this was misjudged as pid-reused → orphaned (live process
    // killed). The 2s tolerance must keep it running.
    const deps = createDeps({
      kill: () => {},
      getProcessStartTime: () => new Date("2025-01-01T00:00:03.000Z"),
    });
    writeRunRecord(
      {
        runId: "run-lstart-rounding",
        pid: 777,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        processStartedAt: "2025-01-01T00:00:02.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-lstart-rounding.log",
      },
      deps
    );
    const record = checkStaleRun("run-lstart-rounding", deps);
    expect(record?.status).toBe("running");
    expect(record?.pid).toBe(777);
  });

  test("checkStaleRun still flags a genuinely reused pid beyond the 2s tolerance", () => {
    // A pid reused by an unrelated process started >2s after the recorded
    // process start time must still be flagged orphaned (the tolerance only
    // covers ps second-rounding, not real pid reuse).
    const deps = createDeps({
      kill: () => {},
      getProcessStartTime: () => new Date("2025-01-01T00:00:05.000Z"),
    });
    writeRunRecord(
      {
        runId: "run-reused-2s",
        pid: 777,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        processStartedAt: "2025-01-01T00:00:02.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-reused-2s.log",
      },
      deps
    );
    const record = checkStaleRun("run-reused-2s", deps);
    expect(record?.status).toBe("orphaned");
    expect(record?.note).toContain("pid reused");
  });
});

describe("run-truth-batch: list filter + paginate", () => {
  function seedBatch(deps: AgentRunControlDeps) {
    // 5 runs: 2 running (alive), 1 orphaned, 1 done, 1 failed
    const base = "2025-01-01T00:00:00.000Z";
    const alive = () => {};
    writeRunRecord({ runId: "r1", pid: 11, agentKey: "a", batchId: "b1", startedAt: base, status: "running", logPath: "/home/test/.nolo/runs/r1.log" }, deps);
    writeRunRecord({ runId: "r2", pid: 12, agentKey: "a", batchId: "b1", startedAt: base, status: "running", logPath: "/home/test/.nolo/runs/r2.log" }, deps);
    writeRunRecord({ runId: "r3", pid: 13, agentKey: "a", batchId: "b2", startedAt: base, status: "done", logPath: "/home/test/.nolo/runs/r3.log" }, deps);
    writeRunRecord({ runId: "r4", pid: 14, agentKey: "a", batchId: "b2", startedAt: base, status: "failed", logPath: "/home/test/.nolo/runs/r4.log" }, deps);
    // r5: claims running but pid dead → should reconcile to orphaned during list.
    writeRunRecord({ runId: "r5", pid: 15, agentKey: "a", batchId: "b1", startedAt: base, status: "running", logPath: "/home/test/.nolo/runs/r5.log" }, deps);
    return { alive };
  }

  test("list with no args is bounded by default limit (no full dump)", () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    seedBatch(deps);
    const { runs, total, hasMore } = queryRunRecords({}, deps);
    // default limit is 20 but only 5 records exist → all 5 returned, no truncation.
    expect(runs).toHaveLength(5);
    expect(total).toBe(5);
    expect(hasMore).toBe(false);
  });

  test("list default limit truncates when records exceed it", () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    // Seed 25 done records to exceed the default limit of 20.
    for (let i = 0; i < 25; i++) {
      writeRunRecord(
        { runId: `rd${i}`, agentKey: "a", startedAt: "2025-01-01T00:00:00.000Z", status: "done", logPath: `/home/test/.nolo/runs/rd${i}.log` },
        deps
      );
    }
    const { runs, total, hasMore } = queryRunRecords({}, deps);
    expect(runs).toHaveLength(20);
    expect(total).toBe(25);
    expect(hasMore).toBe(true);
  });

  test("list filters by batchId", () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    seedBatch(deps);
    const { runs, total } = queryRunRecords({ batchId: "b1" }, deps);
    // b1 = r1, r2, r5; r5 reconciles to orphaned but still belongs to b1.
    expect(runs.map((r) => r.runId).sort()).toEqual(["r1", "r2", "r5"]);
    expect(total).toBe(3);
  });

  test("list filters by status (single) and reconciles orphaned", () => {
    const killOnlyR5Dead = (pid: number, _signal: string) => {
      if (pid === 15) {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      }
    };
    const deps = createDeps({ kill: killOnlyR5Dead });
    seedBatch(deps);
    const { runs, total } = queryRunRecords({ status: "orphaned" }, deps);
    // Only r5 reconciles to orphaned.
    expect(runs.map((r) => r.runId)).toEqual(["r5"]);
    expect(total).toBe(1);
  });

  test("list filters by status (multi-value comma-separated)", () => {
    const deps = createDeps({
      kill: () => {
        const error = new Error("ESRCH") as Error & { code: string };
        error.code = "ESRCH";
        throw error;
      },
    });
    seedBatch(deps);
    const { runs, total } = queryRunRecords({ status: "done,failed" }, deps);
    expect(runs.map((r) => r.runId).sort()).toEqual(["r3", "r4"]);
    expect(total).toBe(2);
  });

  test("list filters by parentDialogId", () => {
    const deps = createDeps({ kill: () => {} });
    const base = "2025-01-01T00:00:00.000Z";
    writeRunRecord({ runId: "p1", pid: 21, agentKey: "a", parentDialogId: "dlg-111", startedAt: base, status: "running", logPath: "/home/test/.nolo/runs/p1.log" }, deps);
    writeRunRecord({ runId: "p2", pid: 22, agentKey: "a", parentDialogId: "dlg-111", startedAt: base, status: "done", logPath: "/home/test/.nolo/runs/p2.log" }, deps);
    writeRunRecord({ runId: "p3", pid: 23, agentKey: "a", parentDialogId: "dlg-222", startedAt: base, status: "failed", logPath: "/home/test/.nolo/runs/p3.log" }, deps);
    writeRunRecord({ runId: "p4", pid: 24, agentKey: "a", startedAt: base, status: "running", logPath: "/home/test/.nolo/runs/p4.log" }, deps);

    const { runs, total } = queryRunRecords({ parentDialogId: "dlg-111" }, deps);
    expect(runs.map((r) => r.runId).sort()).toEqual(["p1", "p2"]);
    expect(total).toBe(2);
  });

  test("spawnLocalBackgroundRun persists parentDialogId on the record", async () => {
    const { spawn } = createMockSpawn();
    const deps = createDeps({
      spawn,
      getProcessStartTime: () => new Date("2025-01-01T00:00:00.250Z"),
    });
    const { output } = createMockOutput();
    const result = await spawnLocalBackgroundRun(
      {
        rawArgs: ["agent-1", "--bg"],
        commandPath: ["agent", "run"],
        cliEntrypointPath: "/repo/packages/cli/index.ts",
        agentKey: "agent-1",
        cwd: "/repo",
        parentDialogId: "dlg-parent-123",
        output,
      },
      deps
    );
    const record = readRunRecord(result.runId, deps);
    expect(record?.parentDialogId).toBe("dlg-parent-123");
  });

  test("spawnLocalBackgroundRun records ephemeral:true when specified, omits field when not specified", async () => {
    const { spawn } = createMockSpawn();
    const deps = createDeps({
      spawn,
      getProcessStartTime: () => new Date("2025-01-01T00:00:00.250Z"),
    });
    const { output } = createMockOutput();

    // 传 ephemeral: true → 落盘记录含 ephemeral:true
    const resultWithEph = await spawnLocalBackgroundRun(
      {
        rawArgs: ["agent-1", "--bg", "--ephemeral"],
        commandPath: ["agent", "run"],
        cliEntrypointPath: "/repo/packages/cli/index.ts",
        agentKey: "agent-1",
        cwd: "/repo",
        ephemeral: true,
        output,
      },
      deps
    );
    const recordWithEph = readRunRecord(resultWithEph.runId, deps);
    expect(recordWithEph?.ephemeral).toBe(true);

    // 不传 ephemeral → 记录中不出现该字段
    const resultWithoutEph = await spawnLocalBackgroundRun(
      {
        rawArgs: ["agent-1", "--bg"],
        commandPath: ["agent", "run"],
        cliEntrypointPath: "/repo/packages/cli/index.ts",
        agentKey: "agent-1",
        cwd: "/repo",
        output,
      },
      deps
    );
    const recordWithoutEph = readRunRecord(resultWithoutEph.runId, deps);
    expect(recordWithoutEph).not.toHaveProperty("ephemeral");
  });

  test("list paginate with offset", () => {
    const deps = createDeps();
    for (let i = 0; i < 10; i++) {
      const day = String(i + 1).padStart(2, "0");
      writeRunRecord(
        { runId: `p${i}`, agentKey: "a", startedAt: `2025-01-${day}T00:00:00.000Z`, status: "done", logPath: `/home/test/.nolo/runs/p${i}.log` },
        deps
      );
    }
    // listRunRecords sorts by startedAt desc → p9..p0.
    const page1 = queryRunRecords({ limit: 3, offset: 0 }, deps);
    const page2 = queryRunRecords({ limit: 3, offset: 3 }, deps);
    expect(page1.runs.map((r) => r.runId)).toEqual(["p9", "p8", "p7"]);
    expect(page1.hasMore).toBe(true);
    expect(page2.runs.map((r) => r.runId)).toEqual(["p6", "p5", "p4"]);
    expect(page2.total).toBe(10);
  });

  test("list limit is clamped to max 200", () => {
    const deps = createDeps();
    writeRunRecord(
      { runId: "r", agentKey: "a", startedAt: "2025-01-01T00:00:00.000Z", status: "done", logPath: "/home/test/.nolo/runs/r.log" },
      deps
    );
    // Asking for 1000 must not blow up — clamped to 200, returns the 1 record.
    const { runs } = queryRunRecords({ limit: 1000 }, deps);
    expect(runs).toHaveLength(1);
  });
});

describe("run-truth-batch: GC", () => {
  function seedForGc(deps: AgentRunControlDeps) {
    // Terminal + old (ended 10 days ago) → sweepable.
    writeRunRecord(
      { runId: "old-done", agentKey: "a", startedAt: "2025-01-01T00:00:00.000Z", status: "done", endedAt: "2025-01-01T00:00:00.000Z", logPath: "/home/test/.nolo/runs/old-done.log", msgFile: "/home/test/.nolo/runs/old-done.msg.md" },
      deps
    );
    // Orphaned + old (reconciled 10 days ago) → sweepable.
    writeRunRecord(
      { runId: "old-orphan", agentKey: "a", startedAt: "2025-01-01T00:00:00.000Z", status: "orphaned", reconciledAt: "2025-01-01T00:00:00.000Z", logPath: "/home/test/.nolo/runs/old-orphan.log" },
      deps
    );
    // Terminal + recent (ended now) → keep.
    writeRunRecord(
      { runId: "new-done", agentKey: "a", startedAt: "2025-01-11T00:00:00.000Z", status: "done", endedAt: "2025-01-11T00:00:00.000Z", logPath: "/home/test/.nolo/runs/new-done.log" },
      deps
    );
    // Non-terminal (running) → NEVER swept, even if old.
    writeRunRecord(
      { runId: "old-running", pid: 1, agentKey: "a", startedAt: "2025-01-01T00:00:00.000Z", status: "running", logPath: "/home/test/.nolo/runs/old-running.log" },
      deps
    );
  }

  test("GC sweeps only terminal records past retention", async () => {
    // now = 2025-01-11, retention 7 days → anything ended/reconciled before 2025-01-04 goes.
    const deps = createDeps({ now: () => new Date("2025-01-11T00:00:00.000Z") });
    // Pre-create the .log/.msg.md files the in-memory fs only has .json from writeRunRecord.
    const fs = deps.fs!;
    fs.writeFileSync("/home/test/.nolo/runs/old-done.log", "log");
    fs.writeFileSync("/home/test/.nolo/runs/old-done.msg.md", "msg");
    fs.writeFileSync("/home/test/.nolo/runs/old-orphan.log", "log");
    fs.writeFileSync("/home/test/.nolo/runs/new-done.log", "log");
    fs.writeFileSync("/home/test/.nolo/runs/old-running.log", "log");
    seedForGc(deps);

    const result = await gcRunRecords(deps);
    expect(result.swept).toBe(2);
    expect(result.sweptIds.sort()).toEqual(["old-done", "old-orphan"]);

    // Sweepable triplet removed.
    expect(fs.existsSync("/home/test/.nolo/runs/old-done.json")).toBe(false);
    expect(fs.existsSync("/home/test/.nolo/runs/old-done.log")).toBe(false);
    expect(fs.existsSync("/home/test/.nolo/runs/old-done.msg.md")).toBe(false);
    expect(fs.existsSync("/home/test/.nolo/runs/old-orphan.json")).toBe(false);
    expect(fs.existsSync("/home/test/.nolo/runs/old-orphan.log")).toBe(false);
    // Recent terminal + running kept.
    expect(fs.existsSync("/home/test/.nolo/runs/new-done.json")).toBe(true);
    expect(fs.existsSync("/home/test/.nolo/runs/old-running.json")).toBe(true);
  });

  // A crash between writeFileSync(tmp) and renameSync strands a `.tmp` that
  // nothing else removes, so the runs dir would grow without bound.
  test("GC sweeps abandoned publish temporaries but spares in-flight ones", async () => {
    const nowMs = new Date("2025-01-11T00:00:00.000Z").getTime();
    const deps = createDeps({ now: () => new Date(nowMs) });
    const fs = deps.fs as ReturnType<typeof createInMemoryFs>;

    fs.writeFileSync("/home/test/.nolo/runs/run-x.json.123.abc.tmp", "{}");
    fs.setMtime("/home/test/.nolo/runs/run-x.json.123.abc.tmp", nowMs - 120_000);
    fs.writeFileSync("/home/test/.nolo/runs/run-y.json.456.def.tmp", "{}");
    fs.setMtime("/home/test/.nolo/runs/run-y.json.456.def.tmp", nowMs - 1_000);

    await gcRunRecords(deps);

    expect(fs.existsSync("/home/test/.nolo/runs/run-x.json.123.abc.tmp")).toBe(false);
    // Young enough to be someone's in-flight publish — must survive.
    expect(fs.existsSync("/home/test/.nolo/runs/run-y.json.456.def.tmp")).toBe(true);
  });

  test("GC never sweeps non-terminal records regardless of age", async () => {
    const deps = createDeps({ now: () => new Date("2025-12-31T00:00:00.000Z") });
    const fs = deps.fs!;
    fs.writeFileSync("/home/test/.nolo/runs/old-running.log", "log");
    writeRunRecord(
      { runId: "old-running", pid: 1, agentKey: "a", startedAt: "2024-01-01T00:00:00.000Z", status: "running", logPath: "/home/test/.nolo/runs/old-running.log" },
      deps
    );
    const result = await gcRunRecords(deps);
    expect(result.swept).toBe(0);
    expect(fs.existsSync("/home/test/.nolo/runs/old-running.json")).toBe(true);
  });

  test("GC retention is injectable (deterministic for tests)", async () => {
    // With retention=0, all terminal records sweep immediately.
    const deps = createDeps({ now: () => new Date("2025-01-11T00:00:00.000Z") });
    const fs = deps.fs!;
    fs.writeFileSync("/home/test/.nolo/runs/t.log", "log");
    writeRunRecord(
      { runId: "t", agentKey: "a", startedAt: "2025-01-11T00:00:00.000Z", status: "done", endedAt: "2025-01-11T00:00:00.000Z", logPath: "/home/test/.nolo/runs/t.log" },
      deps
    );
    const result = await gcRunRecords(deps, { retentionMs: 0 });
    expect(result.swept).toBe(1);
    expect(fs.existsSync("/home/test/.nolo/runs/t.json")).toBe(false);
  });

  test("checkStaleRun detects PID reuse when process start time does not match startedAt", () => {
    const deps = createDeps({
      kill: () => {},
      getProcessStartTime: () => new Date("2025-01-01T00:00:06.000Z"),
    });
    writeRunRecord(
      {
        runId: "run-reused",
        pid: 777,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        processStartedAt: "2025-01-01T00:00:03.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-reused.log",
      },
      deps
    );
    const record = checkStaleRun("run-reused", deps);
    expect(record?.status).toBe("orphaned");
    expect(record?.note).toContain("pid reused");
    expect(record?.pid).toBeUndefined();
  });

  test("checkStaleRun keeps running when PID is alive and process start time matches startedAt", () => {
    const deps = createDeps({
      kill: () => {},
      getProcessStartTime: () => new Date("2025-01-01T00:00:02.000Z"),
    });
    writeRunRecord(
      {
        runId: "run-matched",
        pid: 777,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        processStartedAt: "2025-01-01T00:00:02.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-matched.log",
      },
      deps
    );
    const record = checkStaleRun("run-matched", deps);
    expect(record?.status).toBe("running");
    expect(record?.pid).toBe(777);
  });

  test("checkStaleRun keeps running when getProcessStartTime returns null (fallback degradation)", () => {
    const deps = createDeps({
      kill: () => {},
      getProcessStartTime: () => null,
    });
    writeRunRecord(
      {
        runId: "run-fallback",
        pid: 777,
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "running",
        logPath: "/home/test/.nolo/runs/run-fallback.log",
      },
      deps
    );
    const record = checkStaleRun("run-fallback", deps);
    expect(record?.status).toBe("running");
    expect(record?.pid).toBe(777);
  });

  test("GC retains JSON and skips swept count when auxiliary file deletion fails", async () => {
    const deps = createDeps({ now: () => new Date("2025-01-11T00:00:00.000Z") });
    const baseFs = deps.fs!;
    baseFs.writeFileSync("/home/test/.nolo/runs/bad-log.log", "log");
    writeRunRecord(
      {
        runId: "bad-log",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "done",
        endedAt: "2025-01-01T00:00:00.000Z",
        logPath: "/home/test/.nolo/runs/bad-log.log",
      },
      deps
    );

    const customFs: FsLike = {
      ...baseFs,
      unlinkSync(path) {
        if (String(path).endsWith("bad-log.log")) {
          const err = new Error("EPERM: operation not permitted") as Error & { code: string };
          err.code = "EPERM";
          throw err;
        }
        return baseFs.unlinkSync(path);
      },
    };

    const failedResult = await gcRunRecords({ ...deps, fs: customFs });
    expect(failedResult.swept).toBe(0);
    expect(failedResult.sweptIds).toEqual([]);
    expect(failedResult.failedIds).toEqual(["bad-log"]);
    expect(baseFs.existsSync("/home/test/.nolo/runs/bad-log.json")).toBe(true);

    const retryResult = await gcRunRecords(deps);
    expect(retryResult).toEqual({ swept: 1, sweptIds: ["bad-log"], failedIds: [] });
    expect(baseFs.existsSync("/home/test/.nolo/runs/bad-log.json")).toBe(false);
  });

  test("GC treats ENOENT on auxiliary file as success and successfully sweeps JSON", async () => {
    const deps = createDeps({ now: () => new Date("2025-01-11T00:00:00.000Z") });
    const fs = deps.fs!;
    writeRunRecord(
      {
        runId: "missing-log",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "done",
        endedAt: "2025-01-01T00:00:00.000Z",
        logPath: "/home/test/.nolo/runs/missing-log.log",
      },
      deps
    );

    const result = await gcRunRecords(deps);
    expect(result.swept).toBe(1);
    expect(result.sweptIds).toEqual(["missing-log"]);
    expect(result.failedIds).toEqual([]);
    expect(fs.existsSync("/home/test/.nolo/runs/missing-log.json")).toBe(false);
  });

  test("GC sweeps queue file along with log and msg files under lock", async () => {
    const deps = createDeps({ now: () => new Date("2025-01-11T00:00:00.000Z") });
    const fs = deps.fs!;
    const queuePath = "/home/test/.nolo/runs/run-with-q.queue.jsonl";
    const logPath = "/home/test/.nolo/runs/run-with-q.log";
    fs.writeFileSync(queuePath, "queue content");
    fs.writeFileSync(logPath, "log content");

    writeRunRecord(
      {
        runId: "run-with-q",
        agentKey: "a",
        startedAt: "2025-01-01T00:00:00.000Z",
        status: "done",
        endedAt: "2025-01-01T00:00:00.000Z",
        logPath,
        queuePath,
      },
      deps
    );

    const result = await gcRunRecords(deps);
    expect(result.swept).toBe(1);
    expect(result.sweptIds).toEqual(["run-with-q"]);
    expect(fs.existsSync(queuePath)).toBe(false);
    expect(fs.existsSync(logPath)).toBe(false);
    expect(fs.existsSync("/home/test/.nolo/runs/run-with-q.json")).toBe(false);
  });
});
