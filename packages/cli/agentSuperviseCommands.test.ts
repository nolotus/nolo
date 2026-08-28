import { describe, expect, it } from "bun:test";
import type { FsLike, RunRecord, SpawnLike } from "./agentRunControl";
import {
  checkRunStall,
  evaluateRetryDecision,
  evaluateRunAcceptance,
  parseAgentSuperviseArgs,
  parseTaskQueueMarkdown,
  renderSuperviseSummaryMarkdown,
  resolveSuperviseSummaryPath,
  runAgentSuperviseCommand,
  type AgentSuperviseDeps,
  type SuperviseSummary,
  type SuperviseTask,
} from "./agentSuperviseCommands";
import type { RunReportJson } from "./agentRunReport";

const buildMemFs = (initialFiles: Record<string, string> = {}) => {
  const files = new Map<string, string>(Object.entries(initialFiles));
  const fs = {
    mkdirSync: () => {},
    writeFileSync: (path: string, content: string) => {
      files.set(path, content);
    },
    readFileSync: (path: string) => {
      const value = files.get(path);
      if (value === undefined) throw new Error(`ENOENT: no such file or directory, open '${path}'`);
      return value;
    },
    readdirSync: (path: string) =>
      [...files.keys()]
        .filter((key) => key.startsWith(`${path}/`))
        .map((key) => key.slice(path.length + 1)),
    existsSync: (path: string) => files.has(path),
    openSync: () => 1,
    unlinkSync: (path: string) => {
      files.delete(path);
    },
  } as unknown as FsLike;
  return { files, fs };
};

describe("agentSuperviseCommands", () => {
  describe("Queue Parsing (parseTaskQueueMarkdown)", () => {
    it("parses multiple task sections with briefs correctly", () => {
      const markdown = [
        "# Queue Preamble",
        "Some general instructions or overview.",
        "",
        "## task: Implement Login Form",
        "Create the login form in src/Login.tsx.",
        "Ensure validation tests pass.",
        "",
        "## Task 2: Polish Dashboard Styles",
        "Update dashboard margins and color scheme.",
        "Add responsive CSS rules.",
      ].join("\n");

      const tasks = parseTaskQueueMarkdown(markdown);
      expect(tasks.length).toBe(2);
      expect(tasks[0]).toEqual({
        id: "task-1",
        title: "task: Implement Login Form",
        brief: "Create the login form in src/Login.tsx.\nEnsure validation tests pass.",
      });
      expect(tasks[1]).toEqual({
        id: "task-2",
        title: "Task 2: Polish Dashboard Styles",
        brief: "Update dashboard margins and color scheme.\nAdd responsive CSS rules.",
      });
    });

    it("throws an error when queue content is empty or whitespace", () => {
      expect(() => parseTaskQueueMarkdown("")).toThrow("Task queue markdown content is empty or invalid.");
      expect(() => parseTaskQueueMarkdown("   \n\n  ")).toThrow("Task queue markdown content is empty or invalid.");
    });

    it("throws an error when no H2 task sections exist (format error)", () => {
      const markdown = "# Title Only\nJust some plain text without any H2 headings.";
      expect(() => parseTaskQueueMarkdown(markdown)).toThrow(
        "Invalid queue format: No task sections (## ...) found in queue file."
      );
    });

    it("throws an error when a task section has an empty brief", () => {
      const markdown = [
        "## task 1: Do something",
        "Valid brief.",
        "",
        "## task 2: Empty Task",
        "",
        "## task 3: Another task",
        "Another brief.",
      ].join("\n");

      expect(() => parseTaskQueueMarkdown(markdown)).toThrow(
        'Invalid queue format: Task "task 2: Empty Task" has an empty brief.'
      );
    });
  });

  describe("Acceptance Evaluation (evaluateRunAcceptance)", () => {
    const baseRecord: RunRecord = {
      runId: "run-100",
      agentKey: "agent-pub-test",
      startedAt: "2026-08-28T10:00:00.000Z",
      status: "done",
      exitCode: 0,
      logPath: "/logs/run-100.log",
    };

    it("accepts done run with no DoD commands specified", () => {
      const result = evaluateRunAcceptance(baseRecord);
      expect(result.passed).toBe(true);
      expect(result.reason).toContain("no DoD commands specified");
    });

    it("rejects run with non-done status", () => {
      const failedRecord: RunRecord = { ...baseRecord, status: "failed", exitCode: 1 };
      const result = evaluateRunAcceptance(failedRecord);
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('Run ended with status "failed"');
    });

    it("accepts done run when all DoD commands exit with 0 (from JSON report)", () => {
      const recordWithDoD: RunRecord = { ...baseRecord, dodCommands: ["bun test", "git diff --check"] };
      const reportJson: RunReportJson = {
        runId: "run-100",
        agentKey: "agent-pub-test",
        status: "done",
        startedAt: "2026-08-28T10:00:00.000Z",
        duration: "10s",
        generatedAt: "2026-08-28T10:00:10.000Z",
        dodResults: [
          { command: "bun test", exitCode: 0, stdoutTail: ["pass"], stderrTail: [] },
          { command: "git diff --check", exitCode: 0, stdoutTail: [], stderrTail: [] },
        ],
      };

      const result = evaluateRunAcceptance(recordWithDoD, { reportJson });
      expect(result.passed).toBe(true);
      expect(result.reason).toContain("All DoD commands passed successfully");
    });

    it("rejects done run when any DoD command fails (non-zero / timeout)", () => {
      const recordWithDoD: RunRecord = { ...baseRecord, dodCommands: ["bun test"] };
      const reportJson: RunReportJson = {
        runId: "run-100",
        agentKey: "agent-pub-test",
        status: "done",
        startedAt: "2026-08-28T10:00:00.000Z",
        duration: "10s",
        generatedAt: "2026-08-28T10:00:10.000Z",
        dodResults: [
          { command: "bun test", exitCode: 1, stdoutTail: ["fail"], stderrTail: ["1 failed"] },
        ],
      };

      const result = evaluateRunAcceptance(recordWithDoD, { reportJson });
      expect(result.passed).toBe(false);
      expect(result.reason).toContain('DoD verification failed: "bun test" (exitCode: 1)');
    });

    it("evaluates DoD results from markdown report fallback", () => {
      const recordWithDoD: RunRecord = { ...baseRecord, dodCommands: ["bun test"] };
      const reportMarkdown = [
        "# Run 验收报告: run-100",
        "## DoD 验收结果",
        "| 命令 | exit code | stdout | stderr |",
        "| --- | --- | --- | --- |",
        "| `bun test` | 0 | pass | - |",
      ].join("\n");

      const result = evaluateRunAcceptance(recordWithDoD, { reportMarkdown });
      expect(result.passed).toBe(true);
    });
  });

  describe("Retry Decision (evaluateRetryDecision)", () => {
    it("allows retry when attempts used is within maxRetries", () => {
      const decision1 = evaluateRetryDecision({
        currentAttemptCount: 1,
        maxRetries: 3,
        failureReason: "DoD failed",
      });
      expect(decision1.shouldRetry).toBe(true);
      expect(decision1.nextAttemptNumber).toBe(2);
      expect(decision1.reason).toContain("Retrying (retry 1/3)");

      const decision2 = evaluateRetryDecision({
        currentAttemptCount: 3,
        maxRetries: 3,
        failureReason: "Process killed",
      });
      expect(decision2.shouldRetry).toBe(true);
      expect(decision2.nextAttemptNumber).toBe(4);
      expect(decision2.reason).toContain("Retrying (retry 3/3)");
    });

    it("disallows retry when maxRetries is exceeded", () => {
      const decision = evaluateRetryDecision({
        currentAttemptCount: 4,
        maxRetries: 3,
        failureReason: "DoD failed again",
      });
      expect(decision.shouldRetry).toBe(false);
      expect(decision.reason).toContain("Max retries (3) exceeded after 4 attempts. Marking as failed-supervisor.");
    });
  });

  describe("Stall Detection (checkRunStall)", () => {
    it("returns isStalled: false when activity counters increase (edits, tools, llmCalls)", () => {
      const record: RunRecord = {
        runId: "run-100",
        agentKey: "agent-pub-test",
        startedAt: "2026-08-28T10:00:00.000Z",
        status: "running",
        logPath: "/logs/run-100.log",
        activity: {
          lastEventAt: "2026-08-28T10:10:00.000Z",
          inFlight: null,
          counters: { fileEdits: 0, toolCalls: 0, llmCalls: 3 },
          updatedAt: "2026-08-28T10:10:00.000Z",
        },
      };

      const stall = checkRunStall({
        record,
        lastActivityCount: 2,
        lastActivityChangedAt: new Date("2026-08-28T10:00:00.000Z").getTime(),
        nowMs: new Date("2026-08-28T10:30:00.000Z").getTime(),
        stallMinutes: 60,
      });

      expect(stall.isStalled).toBe(false);
      expect(stall.currentActivityCount).toBe(3);
      expect(stall.lastActivityChangedAt).toBe(new Date("2026-08-28T10:30:00.000Z").getTime());
    });

    it("exempts inFlight llm reasoning from stall detection", () => {
      const record: RunRecord = {
        runId: "run-100",
        agentKey: "agent-pub-test",
        startedAt: "2026-08-28T10:00:00.000Z",
        status: "running",
        logPath: "/logs/run-100.log",
        activity: {
          lastEventAt: "2026-08-28T10:00:00.000Z",
          inFlight: { kind: "llm", name: "reasoning-chain", sinceMs: 70 * 60 * 1000 },
          counters: { fileEdits: 0, toolCalls: 0, llmCalls: 0 },
          updatedAt: "2026-08-28T10:00:00.000Z",
        },
      };

      const stall = checkRunStall({
        record,
        lastActivityCount: 0,
        lastActivityChangedAt: new Date("2026-08-28T10:00:00.000Z").getTime(),
        nowMs: new Date("2026-08-28T11:15:00.000Z").getTime(), // 75 mins later
        stallMinutes: 60,
      });

      expect(stall.isStalled).toBe(false);
    });

    it("returns isStalled: true when no counter change and no inFlight llm after stallMinutes", () => {
      const record: RunRecord = {
        runId: "run-100",
        agentKey: "agent-pub-test",
        startedAt: "2026-08-28T10:00:00.000Z",
        status: "running",
        logPath: "/logs/run-100.log",
        activity: {
          lastEventAt: "2026-08-28T10:00:00.000Z",
          inFlight: null,
          counters: { fileEdits: 2, toolCalls: 2, llmCalls: 2 },
          updatedAt: "2026-08-28T10:00:00.000Z",
        },
      };

      const stall = checkRunStall({
        record,
        lastActivityCount: 6, // unchanged
        lastActivityChangedAt: new Date("2026-08-28T10:00:00.000Z").getTime(),
        nowMs: new Date("2026-08-28T11:05:00.000Z").getTime(), // 65 mins later
        stallMinutes: 60,
      });

      expect(stall.isStalled).toBe(true);
    });
  });

  describe("Summary Path (resolveSuperviseSummaryPath)", () => {
    it("generates unique paths across successive calls", () => {
      const path1 = resolveSuperviseSummaryPath({ NOLO_HOME: "/test/nolo" });
      const path2 = resolveSuperviseSummaryPath({ NOLO_HOME: "/test/nolo" });
      expect(path1).toMatch(/supervise-.*\.md$/);
      expect(path2).toMatch(/supervise-.*\.md$/);
      expect(path1).not.toBe(path2);
    });

    it("respects explicit timestamp and nonce when provided", () => {
      const path = resolveSuperviseSummaryPath(
        { NOLO_HOME: "/test/nolo" },
        undefined,
        { timestamp: "2026-08-28T12-00-00", nonce: "test12" }
      );
      expect(path).toBe("/test/nolo/runs/supervise-2026-08-28T12-00-00-test12.md");
    });
  });

  describe("Args and Help (parseAgentSuperviseArgs)", () => {
    it("handles --help", () => {
      expect(parseAgentSuperviseArgs(["--help"])).toEqual({ help: true });
      expect(parseAgentSuperviseArgs(["-h"])).toEqual({ help: true });
    });

    it("parses valid options with defaults", () => {
      const parsed = parseAgentSuperviseArgs([
        "--agent",
        "agent-pub-1",
        "--queue",
        "tasks.md",
        "--dod",
        "bun test",
        "--dod",
        "git status",
      ]);
      expect(parsed).toEqual({
        parsed: {
          agentKey: "agent-pub-1",
          queueFile: "tasks.md",
          cwd: undefined,
          maxRetries: 3,
          stallMinutes: 60,
          pollIntervalSec: 60,
          dodCommands: ["bun test", "git status"],
        },
      });
    });

    it("returns error on missing required args", () => {
      expect(parseAgentSuperviseArgs(["--queue", "tasks.md"])).toEqual({
        error: "Missing required option: --agent <agentId>",
      });
      expect(parseAgentSuperviseArgs(["--agent", "agent-pub-1"])).toEqual({
        error: "Missing required option: --queue <tasks.md>",
      });
    });
  });

  describe("Execution Loop Mock End-to-End (runAgentSuperviseCommand)", () => {
    it("executes all tasks successfully on first try and outputs summary report", async () => {
      const queueContent = [
        "## task 1: Implement feature A",
        "Please build feature A.",
        "",
        "## task 2: Implement feature B",
        "Please build feature B.",
      ].join("\n");

      const mem = buildMemFs({
        "/workspace/tasks.md": queueContent,
      });

      const outputBuffer: string[] = [];
      const output = { write: (s: string) => outputBuffer.push(s) };

      let runCounter = 0;
      const deps: AgentSuperviseDeps = {
        env: { NOLO_HOME: "/home/test/.nolo" },
        homedir: () => "/home/test",
        fs: mem.fs,
        output,
        now: () => new Date("2026-08-28T10:00:00.000Z"),
        sleep: async () => {},
        spawnLocalRun: async (input) => {
          runCounter += 1;
          const runId = `run-mock-${runCounter}`;
          const record: RunRecord = {
            runId,
            agentKey: input.agentKey,
            status: "running",
            startedAt: "2026-08-28T10:00:00.000Z",
            logPath: `/logs/${runId}.log`,
          };
          mem.files.set(`/home/test/.nolo/runs/${runId}.json`, JSON.stringify(record));
          return { runId, pid: 1000 + runCounter, logPath: `/logs/${runId}.log`, batchId: "b1" };
        },
        checkStale: (runId) => {
          const record: RunRecord = {
            runId,
            agentKey: "agent-pub-x",
            status: "done",
            exitCode: 0,
            startedAt: "2026-08-28T10:00:00.000Z",
            endedAt: "2026-08-28T10:00:05.000Z",
            logPath: `/logs/${runId}.log`,
          };
          mem.files.set(`/home/test/.nolo/runs/${runId}.json`, JSON.stringify(record));
          return record;
        },
      };

      const exitCode = await runAgentSuperviseCommand(
        ["--agent", "agent-pub-x", "--queue", "/workspace/tasks.md", "--poll-interval", "1"],
        deps
      );

      expect(exitCode).toBe(0);
      const out = outputBuffer.join("");
      expect(out).toContain("Starting agent supervise queue (2 tasks)");
      expect(out).toContain("PASSED (run run-mock-1)");
      expect(out).toContain("PASSED (run run-mock-2)");
      expect(out).toContain("# Nolo Agent Supervise 任务汇总报告");
      expect(out).toContain("| 完成任务数 | 2 |");
      expect(out).toContain("| 失败任务数 | 0 |");
    });

    it("retries upon DoD failure and succeeds on second attempt", async () => {
      const queueContent = [
        "## task 1: Fix bug",
        "Fix the bug and ensure tests pass.",
      ].join("\n");

      const mem = buildMemFs({
        "/workspace/tasks.md": queueContent,
      });

      const outputBuffer: string[] = [];
      const output = { write: (s: string) => outputBuffer.push(s) };

      let runCounter = 0;
      const deps: AgentSuperviseDeps = {
        env: { NOLO_HOME: "/home/test/.nolo" },
        homedir: () => "/home/test",
        fs: mem.fs,
        output,
        now: () => new Date("2026-08-28T10:00:00.000Z"),
        sleep: async () => {},
        spawnLocalRun: async (input) => {
          runCounter += 1;
          const runId = `run-dod-${runCounter}`;
          const record: RunRecord = {
            runId,
            agentKey: input.agentKey,
            status: "running",
            startedAt: "2026-08-28T10:00:00.000Z",
            dodCommands: ["bun test"],
            logPath: `/logs/${runId}.log`,
          };
          mem.files.set(`/home/test/.nolo/runs/${runId}.json`, JSON.stringify(record));
          return { runId, pid: 2000 + runCounter, logPath: `/logs/${runId}.log`, batchId: "b2" };
        },
        checkStale: (runId) => {
          const isFirstRun = runId === "run-dod-1";
          const record: RunRecord = {
            runId,
            agentKey: "agent-pub-x",
            status: "done",
            exitCode: 0,
            startedAt: "2026-08-28T10:00:00.000Z",
            endedAt: "2026-08-28T10:00:05.000Z",
            dodCommands: ["bun test"],
            logPath: `/logs/${runId}.log`,
          };
          mem.files.set(`/home/test/.nolo/runs/${runId}.json`, JSON.stringify(record));

          const reportJson: RunReportJson = {
            runId,
            agentKey: "agent-pub-x",
            status: "done",
            startedAt: "2026-08-28T10:00:00.000Z",
            duration: "5s",
            generatedAt: "2026-08-28T10:00:05.000Z",
            dodResults: [
              {
                command: "bun test",
                exitCode: isFirstRun ? 1 : 0,
                stdoutTail: isFirstRun ? ["1 fail"] : ["0 fail"],
                stderrTail: [],
              },
            ],
          };
          mem.files.set(`/home/test/.nolo/runs/${runId}.report.json`, JSON.stringify(reportJson));
          return record;
        },
      };

      const exitCode = await runAgentSuperviseCommand(
        ["--agent", "agent-pub-x", "--queue", "/workspace/tasks.md", "--dod", "bun test"],
        deps
      );

      expect(exitCode).toBe(0);
      const out = outputBuffer.join("");
      expect(out).toContain('REJECTED: DoD verification failed: "bun test" (exitCode: 1)');
      expect(out).toContain("Retrying (retry 1/3)");
      expect(out).toContain("PASSED (run run-dod-2)");
      expect(out).toContain("| 完成任务数 | 1 |");
    });

    it("isolates unexpected attempt errors, retries, and executes remaining tasks to summary", async () => {
      const queueContent = [
        "## task 1: Fragile task",
        "Throws during polling on first attempt, passes on retry.",
        "",
        "## task 2: Followup task",
        "Should run after task 1.",
      ].join("\n");

      const mem = buildMemFs({
        "/workspace/tasks.md": queueContent,
      });

      const outputBuffer: string[] = [];
      const output = { write: (s: string) => outputBuffer.push(s) };

      let runCounter = 0;
      const deps: AgentSuperviseDeps = {
        env: { NOLO_HOME: "/home/test/.nolo" },
        homedir: () => "/home/test",
        fs: mem.fs,
        output,
        now: () => new Date("2026-08-28T10:00:00.000Z"),
        sleep: async () => {},
        spawnLocalRun: async (input) => {
          runCounter += 1;
          const runId = `run-err-${runCounter}`;
          const record: RunRecord = {
            runId,
            agentKey: input.agentKey,
            status: "running",
            startedAt: "2026-08-28T10:00:00.000Z",
            logPath: `/logs/${runId}.log`,
          };
          mem.files.set(`/home/test/.nolo/runs/${runId}.json`, JSON.stringify(record));
          return { runId, pid: 5000 + runCounter, logPath: `/logs/${runId}.log`, batchId: "b5" };
        },
        checkStale: (runId) => {
          if (runId === "run-err-1") {
            throw new Error("Disk I/O error during polling");
          }
          const record: RunRecord = {
            runId,
            agentKey: "agent-pub-x",
            status: "done",
            exitCode: 0,
            startedAt: "2026-08-28T10:00:00.000Z",
            endedAt: "2026-08-28T10:00:05.000Z",
            logPath: `/logs/${runId}.log`,
          };
          mem.files.set(`/home/test/.nolo/runs/${runId}.json`, JSON.stringify(record));
          return record;
        },
      };

      const exitCode = await runAgentSuperviseCommand(
        ["--agent", "agent-pub-x", "--queue", "/workspace/tasks.md", "--max-retries", "3"],
        deps
      );

      expect(exitCode).toBe(0);
      const out = outputBuffer.join("");
      expect(out).toContain("Attempt error: Disk I/O error during polling");
      expect(out).toContain("Retrying (retry 1/3)");
      expect(out).toContain("PASSED (run run-err-2)");
      expect(out).toContain("PASSED (run run-err-3)");
      expect(out).toContain("| 完成任务数 | 2 |");
      expect(out).toContain("| 失败任务数 | 0 |");
    });

    it("abandons task after exceeding maxRetries", async () => {
      const queueContent = [
        "## task 1: Impossible task",
        "This task will always fail.",
      ].join("\n");

      const mem = buildMemFs({
        "/workspace/tasks.md": queueContent,
      });

      const outputBuffer: string[] = [];
      const output = { write: (s: string) => outputBuffer.push(s) };

      let runCounter = 0;
      const deps: AgentSuperviseDeps = {
        env: { NOLO_HOME: "/home/test/.nolo" },
        homedir: () => "/home/test",
        fs: mem.fs,
        output,
        now: () => new Date("2026-08-28T10:00:00.000Z"),
        sleep: async () => {},
        spawnLocalRun: async (input) => {
          runCounter += 1;
          const runId = `run-fail-${runCounter}`;
          const record: RunRecord = {
            runId,
            agentKey: input.agentKey,
            status: "failed",
            exitCode: 1,
            startedAt: "2026-08-28T10:00:00.000Z",
            logPath: `/logs/${runId}.log`,
          };
          mem.files.set(`/home/test/.nolo/runs/${runId}.json`, JSON.stringify(record));
          return { runId, pid: 3000 + runCounter, logPath: `/logs/${runId}.log`, batchId: "b3" };
        },
        checkStale: (runId) => {
          return {
            runId,
            agentKey: "agent-pub-x",
            status: "failed",
            exitCode: 1,
            startedAt: "2026-08-28T10:00:00.000Z",
            logPath: `/logs/${runId}.log`,
          };
        },
      };

      const exitCode = await runAgentSuperviseCommand(
        ["--agent", "agent-pub-x", "--queue", "/workspace/tasks.md", "--max-retries", "2"],
        deps
      );

      expect(exitCode).toBe(1);
      const out = outputBuffer.join("");
      expect(out).toContain("Max retries (2) exceeded after 3 attempts. Marking as failed-supervisor.");
      expect(out).toContain("| 失败任务数 | 1 |");
      expect(out).toContain("failed-supervisor");
    });

    it("detects stall, stops stalled run, and retries successfully", async () => {
      const queueContent = [
        "## task 1: Long running task",
        "Build something large.",
      ].join("\n");

      const mem = buildMemFs({
        "/workspace/tasks.md": queueContent,
      });

      const outputBuffer: string[] = [];
      const output = { write: (s: string) => outputBuffer.push(s) };

      let runCounter = 0;
      let terminatedPid: number | undefined;
      let simulatedTime = new Date("2026-08-28T10:00:00.000Z").getTime();

      const deps: AgentSuperviseDeps = {
        env: { NOLO_HOME: "/home/test/.nolo" },
        homedir: () => "/home/test",
        fs: mem.fs,
        output,
        now: () => new Date(simulatedTime),
        sleep: async () => {
          // Advance time by 70 minutes to trigger stall on first run
          if (runCounter === 1) {
            simulatedTime += 70 * 60 * 1000;
          }
        },
        spawnLocalRun: async (input) => {
          runCounter += 1;
          const runId = `run-stall-${runCounter}`;
          const record: RunRecord = {
            runId,
            pid: 4000 + runCounter,
            agentKey: input.agentKey,
            status: "running",
            startedAt: new Date(simulatedTime).toISOString(),
            logPath: `/logs/${runId}.log`,
            activity: {
              lastEventAt: new Date(simulatedTime).toISOString(),
              inFlight: null,
              counters: { fileEdits: 0, toolCalls: 0, llmCalls: 0 },
              updatedAt: new Date(simulatedTime).toISOString(),
            },
          };
          mem.files.set(`/home/test/.nolo/runs/${runId}.json`, JSON.stringify(record));
          return { runId, pid: 4000 + runCounter, logPath: `/logs/${runId}.log`, batchId: "b4" };
        },
        checkStale: (runId) => {
          if (runId === "run-stall-1") {
            // Still claims running, but stalled
            return JSON.parse(mem.files.get(`/home/test/.nolo/runs/${runId}.json`)!);
          }
          // Second run succeeds
          const record: RunRecord = {
            runId,
            agentKey: "agent-pub-x",
            status: "done",
            exitCode: 0,
            startedAt: new Date(simulatedTime).toISOString(),
            logPath: `/logs/${runId}.log`,
          };
          mem.files.set(`/home/test/.nolo/runs/${runId}.json`, JSON.stringify(record));
          return record;
        },
        terminateRun: async (rec) => {
          terminatedPid = rec.pid;
          return true;
        },
      };

      const exitCode = await runAgentSuperviseCommand(
        ["--agent", "agent-pub-x", "--queue", "/workspace/tasks.md", "--stall-minutes", "60"],
        deps
      );

      expect(exitCode).toBe(0);
      expect(terminatedPid).toBe(4001);
      const out = outputBuffer.join("");
      expect(out).toContain("stalled (no activity for 60m). Stopping run...");
      expect(out).toContain("PASSED (run run-stall-2)");
      expect(out).toContain("| 完成任务数 | 1 |");
    });
  });
});
