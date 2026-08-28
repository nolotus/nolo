// Unattended serial task supervisor for Nolo agents.
// Spawns runs sequentially, monitors activity for stalls, verifies DoD upon completion,
// handles retries, and writes a summary report.

import { homedir as nodeHomedir } from "node:os";
import * as nodeFs from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import {
  checkStaleRun,
  finalizeRunRecord,
  isRunTerminalStatus,
  readRunRecord,
  resolveRunsDir,
  resolveRunReportPath,
  resolveRunReportJsonPath,
  spawnLocalBackgroundRun,
  terminateRunProcess,
  writeRunRecord,
  type AgentRunControlDeps,
  type FsLike,
  type RunRecord,
  type RunStatus,
} from "./agentRunControl";
import {
  generateRunReport,
  parseDoDResultsFromMarkdown,
  type DoDCommandResult,
  type RunReportJson,
} from "./agentRunReport";
import { readOption, resolveCliEntrypointPath } from "./cliEnvHelpers";
import { toErrorMessage } from "../core/errorMessage";

export type OutputLike = {
  write(chunk: string): unknown;
};

export type SuperviseTask = {
  id: string;
  title: string;
  brief: string;
};

export type SuperviseTaskAttempt = {
  runId: string;
  startedAt: string;
  endedAt?: string;
  status: RunStatus | "stalled" | "unknown";
  exitCode?: number;
  reportPath?: string;
  reportJsonPath?: string;
  dodPassed?: boolean;
  error?: string;
};

export type SuperviseTaskResult = {
  task: SuperviseTask;
  attempts: SuperviseTaskAttempt[];
  retries: number;
  finalStatus: "done" | "failed-supervisor" | "interrupted";
  finalRunId?: string;
};

export type SuperviseSummary = {
  agentKey: string;
  cwd: string;
  startedAt: string;
  endedAt: string;
  maxRetries: number;
  stallMinutes: number;
  pollIntervalSec: number;
  tasks: SuperviseTaskResult[];
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  interruptedTasks: number;
  summaryFilePath?: string;
};

export type ParsedSuperviseArgs = {
  agentKey: string;
  queueFile: string;
  cwd?: string;
  maxRetries: number;
  stallMinutes: number;
  pollIntervalSec: number;
  dodCommands?: string[];
  help?: boolean;
};

export type AgentSuperviseDeps = AgentRunControlDeps & {
  output?: OutputLike;
  cliEntrypointPath?: string;
  scriptDir?: string;
  now?: () => Date;
  sleep?: (ms: number) => Promise<void>;
  generateRunId?: () => string;
  spawnLocalRun?: typeof spawnLocalBackgroundRun;
  checkStale?: typeof checkStaleRun;
  terminateRun?: typeof terminateRunProcess;
  readRecord?: typeof readRunRecord;
  abortSignal?: AbortSignal;
};

export function parseTaskQueueMarkdown(
  content: string,
  options: { allowEmpty?: boolean } = {}
): SuperviseTask[] {
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    throw new Error("Task queue markdown content is empty or invalid.");
  }

  const lines = content.split(/\r?\n/);
  const tasks: SuperviseTask[] = [];

  let currentTitle: string | null = null;
  let currentLines: string[] = [];
  let taskIndex = 0;

  function flushCurrent() {
    if (currentTitle !== null) {
      const brief = currentLines.join("\n").trim();
      taskIndex += 1;
      tasks.push({
        id: `task-${taskIndex}`,
        title: currentTitle,
        brief,
      });
      currentLines = [];
      currentTitle = null;
    }
  }

  for (const line of lines) {
    const headerMatch = line.match(/^##\s+(.*)$/);
    if (headerMatch) {
      flushCurrent();
      currentTitle = headerMatch[1].trim();
    } else if (currentTitle !== null) {
      currentLines.push(line);
    }
  }
  flushCurrent();

  if (tasks.length === 0) {
    throw new Error(
      "Invalid queue format: No task sections (## ...) found in queue file."
    );
  }

  if (!options.allowEmpty) {
    const emptyTask = tasks.find((t) => !t.brief || t.brief.trim().length === 0);
    if (emptyTask) {
      throw new Error(
        `Invalid queue format: Task "${emptyTask.title}" has an empty brief.`
      );
    }
  }

  return tasks;
}

export function parseAgentSuperviseArgs(
  args: string[]
): { parsed?: ParsedSuperviseArgs; error?: string; help?: boolean } {
  if (args.includes("--help") || args.includes("-h")) {
    return { help: true };
  }

  const agentKey = readOption(args, "--agent") || readOption(args, "-a");
  const queueFile = readOption(args, "--queue") || readOption(args, "-q");
  const cwd = readOption(args, "--cwd");

  const maxRetriesStr = readOption(args, "--max-retries");
  const maxRetries = maxRetriesStr ? parseInt(maxRetriesStr, 10) : 3;
  if (isNaN(maxRetries) || maxRetries < 0) {
    return { error: `Invalid --max-retries: "${maxRetriesStr}". Must be a non-negative integer.` };
  }

  const stallMinutesStr = readOption(args, "--stall-minutes");
  const stallMinutes = stallMinutesStr ? parseFloat(stallMinutesStr) : 60;
  if (isNaN(stallMinutes) || stallMinutes <= 0) {
    return { error: `Invalid --stall-minutes: "${stallMinutesStr}". Must be a positive number.` };
  }

  const pollIntervalStr =
    readOption(args, "--poll-interval") || readOption(args, "--poll-interval-s");
  const pollIntervalSec = pollIntervalStr ? parseFloat(pollIntervalStr) : 60;
  if (isNaN(pollIntervalSec) || pollIntervalSec <= 0) {
    return { error: `Invalid --poll-interval: "${pollIntervalStr}". Must be a positive number.` };
  }

  const dodCommands: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dod" && typeof args[i + 1] === "string") {
      dodCommands.push(args[i + 1]);
      i += 1;
    }
  }

  if (!agentKey) {
    return { error: "Missing required option: --agent <agentId>" };
  }
  if (!queueFile) {
    return { error: "Missing required option: --queue <tasks.md>" };
  }

  return {
    parsed: {
      agentKey,
      queueFile,
      cwd,
      maxRetries,
      stallMinutes,
      pollIntervalSec,
      dodCommands: dodCommands.length > 0 ? dodCommands : undefined,
    },
  };
}

export type AcceptanceResult = {
  passed: boolean;
  reason?: string;
  dodResults?: DoDCommandResult[];
};

export function evaluateRunAcceptance(
  record: RunRecord,
  reportData?: { reportJson?: RunReportJson; reportMarkdown?: string }
): AcceptanceResult {
  if (record.status !== "done") {
    return {
      passed: false,
      reason: `Run ended with status "${record.status}" (exitCode: ${
        typeof record.exitCode === "number" ? record.exitCode : "-"
      })`,
    };
  }

  if (!record.dodCommands || record.dodCommands.length === 0) {
    return {
      passed: true,
      reason: "Run completed successfully (no DoD commands specified)",
    };
  }

  if (reportData?.reportJson?.dodResults && reportData.reportJson.dodResults.length > 0) {
    const dodResults = reportData.reportJson.dodResults;
    const failures = dodResults.filter((r) => r.exitCode !== 0);
    if (failures.length > 0) {
      const failedCmds = failures
        .map((f) => `"${f.command}" (exitCode: ${f.exitCode})`)
        .join(", ");
      return {
        passed: false,
        reason: `DoD verification failed: ${failedCmds}`,
        dodResults,
      };
    }
    return {
      passed: true,
      reason: "All DoD commands passed successfully",
      dodResults,
    };
  }

  if (reportData?.reportMarkdown) {
    const parsed = parseDoDResultsFromMarkdown(reportData.reportMarkdown);
    if (parsed.dodResults.length > 0) {
      const failures = parsed.dodResults.filter((r) => r.exitCode !== 0);
      if (failures.length > 0) {
        const failedCmds = failures
          .map((f) => `"${f.command}" (exitCode: ${f.exitCode})`)
          .join(", ");
        return {
          passed: false,
          reason: `DoD verification failed: ${failedCmds}`,
        };
      }
      return {
        passed: true,
        reason: "All DoD commands passed successfully (parsed from report.md)",
      };
    }
  }

  return {
    passed: false,
    reason: "DoD verification results not found in run report",
  };
}

export type RetryDecision = {
  shouldRetry: boolean;
  nextAttemptNumber: number;
  reason: string;
};

export function evaluateRetryDecision(input: {
  currentAttemptCount: number;
  maxRetries: number;
  failureReason: string;
}): RetryDecision {
  const retriesUsed = input.currentAttemptCount - 1;
  if (retriesUsed < input.maxRetries) {
    return {
      shouldRetry: true,
      nextAttemptNumber: input.currentAttemptCount + 1,
      reason: `Attempt ${input.currentAttemptCount} failed (${input.failureReason}). Retrying (retry ${
        retriesUsed + 1
      }/${input.maxRetries})...`,
    };
  }

  return {
    shouldRetry: false,
    nextAttemptNumber: input.currentAttemptCount + 1,
    reason: `Max retries (${input.maxRetries}) exceeded after ${input.currentAttemptCount} attempts. Marking as failed-supervisor. Reason: ${input.failureReason}`,
  };
}

export function checkRunStall(input: {
  record: RunRecord;
  lastActivityCount: number;
  lastActivityChangedAt: number;
  nowMs: number;
  stallMinutes: number;
}): { isStalled: boolean; currentActivityCount: number; lastActivityChangedAt: number } {
  const fileEdits = input.record.activity?.counters?.fileEdits ?? 0;
  const toolCalls = input.record.activity?.counters?.toolCalls ?? 0;
  const llmCalls = input.record.activity?.counters?.llmCalls ?? 0;
  const currentCount = fileEdits + toolCalls + llmCalls;

  let lastChangedAt = input.lastActivityChangedAt;
  if (currentCount > input.lastActivityCount) {
    lastChangedAt = input.nowMs;
  }

  // Active in-flight LLM reasoning/generation process is exempt from stall detection
  const isLlmInFlight = input.record.activity?.inFlight?.kind === "llm";
  if (isLlmInFlight) {
    lastChangedAt = input.nowMs;
  }

  const stallMs = input.stallMinutes * 60 * 1000;
  const idleMs = input.nowMs - lastChangedAt;
  const isStalled = input.record.status === "running" && !isLlmInFlight && idleMs >= stallMs;

  return {
    isStalled,
    currentActivityCount: currentCount,
    lastActivityChangedAt: lastChangedAt,
  };
}

export function resolveSuperviseSummaryPath(
  env?: Record<string, string | undefined>,
  homedir = nodeHomedir,
  options?: string | { timestamp?: string; nonce?: string }
): string {
  if (typeof options === "string") {
    return join(resolveRunsDir(env, homedir), `supervise-${options}.md`);
  }
  const ts = options?.timestamp || new Date().toISOString().replace(/[:.]/g, "-");
  const nonce = options?.nonce || Math.random().toString(36).slice(2, 8);
  return join(resolveRunsDir(env, homedir), `supervise-${ts}-${nonce}.md`);
}

export function renderSuperviseSummaryMarkdown(summary: SuperviseSummary): string {
  const lines: string[] = [];
  lines.push("# Nolo Agent Supervise 任务汇总报告");
  lines.push("");
  lines.push("## 执行概览");
  lines.push("");
  lines.push("| 配置 / 指标 | 值 |");
  lines.push("| --- | --- |");
  lines.push(`| Agent | ${summary.agentKey} |`);
  lines.push(`| 工作目录 | ${summary.cwd} |`);
  lines.push(`| 开始时间 | ${summary.startedAt} |`);
  lines.push(`| 结束时间 | ${summary.endedAt} |`);
  lines.push(`| 最大重试数 | ${summary.maxRetries} |`);
  lines.push(`| 停滞超时 (分) | ${summary.stallMinutes} |`);
  lines.push(`| 轮询间隔 (秒) | ${summary.pollIntervalSec} |`);
  lines.push(`| 总任务数 | ${summary.totalTasks} |`);
  lines.push(`| 完成任务数 | ${summary.completedTasks} |`);
  lines.push(`| 失败任务数 | ${summary.failedTasks} |`);
  if (summary.interruptedTasks > 0) {
    lines.push(`| 中断任务数 | ${summary.interruptedTasks} |`);
  }
  lines.push("");
  lines.push("## 任务明细");
  lines.push("");
  lines.push("| 序号 | 任务标题 | 尝试次数 | 最终状态 | 最终 Run ID | 验收报告 |");
  lines.push("| --- | --- | --- | --- | --- | --- |");

  for (let i = 0; i < summary.tasks.length; i++) {
    const t = summary.tasks[i];
    const taskNum = i + 1;
    const attemptsCount = t.attempts.length;
    const finalRunId = t.finalRunId || (t.attempts[t.attempts.length - 1]?.runId ?? "-");
    const lastAttempt = t.attempts[t.attempts.length - 1];
    const reportLink = lastAttempt?.reportPath ? `\`${lastAttempt.reportPath}\`` : "-";
    lines.push(
      `| ${taskNum} | ${t.task.title.replace(/\|/g, "\\|")} | ${attemptsCount} | ${
        t.finalStatus
      } | ${finalRunId} | ${reportLink} |`
    );
  }
  lines.push("");

  lines.push("## Run 尝试详情");
  lines.push("");
  for (const t of summary.tasks) {
    lines.push(`### ${t.task.title}`);
    lines.push(`- 最终状态: **${t.finalStatus}** (共尝试 ${t.attempts.length} 次)`);
    for (let i = 0; i < t.attempts.length; i++) {
      const att = t.attempts[i];
      const attemptNum = i + 1;
      const statusNote =
        att.dodPassed === false ? "DoD未通过" : att.status === "stalled" ? "停滞止损" : att.status;
      lines.push(
        `  - 尝试 #${attemptNum}: Run ID \`${att.runId}\` — 状态: ${statusNote}${
          att.reportPath ? ` — [报告: ${att.reportPath}]` : ""
        }${att.error ? ` (${att.error})` : ""}`
      );
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`_生成时间: ${summary.endedAt}_`);
  lines.push("");

  return lines.join("\n");
}

export function renderSuperviseHelpText(): string {
  return [
    "Usage: nolo agent supervise --agent <agentId> --queue <tasks.md> [options]",
    "",
    "Supervise serial execution of a task queue with watchdog monitoring and retries.",
    "",
    "Options:",
    "  --agent, -a <agentId>        Agent ID or key to run tasks with (required)",
    "  --queue, -q <tasks.md>       Path to markdown queue file with ## task sections (required)",
    "  --cwd <dir>                  Working directory for task execution (default: current working dir)",
    "  --max-retries <number>       Maximum retries per task upon failure or DoD rejection (default: 3)",
    "  --stall-minutes <number>     Stop and retry task if no edit/tool/LLM activity within N minutes (default: 60)",
    "  --poll-interval <seconds>    Polling interval in seconds (default: 60)",
    "  --dod <command>              Definition of Done command to verify upon task completion (repeatable)",
    "  --help, -h                   Show this help and exit",
    "",
    "Queue format:",
    "  tasks.md should contain task briefs separated by H2 headings:",
    "    ## task: Task 1 title",
    "    Complete brief instructions for task 1...",
    "",
    "    ## task: Task 2 title",
    "    Complete brief instructions for task 2...",
  ].join("\n");
}

export async function runAgentSuperviseCommand(
  args: string[],
  deps: AgentSuperviseDeps = {}
): Promise<number> {
  const output = deps.output ?? process.stdout;
  const fs = deps.fs ?? nodeFs;
  const env = deps.env ?? process.env;
  const homedir = deps.homedir ?? nodeHomedir;
  const now = deps.now ?? (() => new Date());
  const sleep = deps.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const spawnLocalRun = deps.spawnLocalRun ?? spawnLocalBackgroundRun;
  const checkStale = deps.checkStale ?? checkStaleRun;
  const terminateRun = deps.terminateRun ?? terminateRunProcess;
  const readRecord = deps.readRecord ?? readRunRecord;

  const parseResult = parseAgentSuperviseArgs(args);
  if (parseResult.help) {
    output.write(renderSuperviseHelpText() + "\n");
    return 0;
  }

  if (parseResult.error || !parseResult.parsed) {
    output.write(`[nolo] agent supervise error: ${parseResult.error || "invalid arguments"}\n`);
    output.write("Run `nolo agent supervise --help` for usage.\n");
    return 1;
  }

  const { agentKey, queueFile, cwd: targetCwd, maxRetries, stallMinutes, pollIntervalSec, dodCommands } =
    parseResult.parsed;

  const resolvedCwd = targetCwd ? (isAbsolute(targetCwd) ? targetCwd : resolve(process.cwd(), targetCwd)) : process.cwd();

  const queueFilePath = isAbsolute(queueFile) ? queueFile : resolve(process.cwd(), queueFile);
  let queueContent: string;
  try {
    queueContent = fs.readFileSync(queueFilePath, "utf8");
  } catch (err) {
    output.write(`[nolo] agent supervise error: Could not read queue file "${queueFilePath}": ${toErrorMessage(err)}\n`);
    return 1;
  }

  let tasks: SuperviseTask[];
  try {
    tasks = parseTaskQueueMarkdown(queueContent);
  } catch (err) {
    output.write(`[nolo] agent supervise error: ${toErrorMessage(err)}\n`);
    return 1;
  }

  const startTime = now();
  output.write(`[nolo] Starting agent supervise queue (${tasks.length} tasks) with agent "${agentKey}"\n`);
  output.write(`[nolo] CWD: ${resolvedCwd}, maxRetries: ${maxRetries}, stallMinutes: ${stallMinutes}, pollInterval: ${pollIntervalSec}s\n`);

  // SIGINT state handling:
  // When SIGINT is received, isInterrupted is set to true. Polling sleep and loop
  // quickly terminate, active child runs are stopped, and the summary is generated.
  let isInterrupted = false;

  const onSigint = () => {
    if (isInterrupted) return;
    isInterrupted = true;
    output.write("\n[nolo] Interrupted (SIGINT). Stopping active supervisor run...\n");
  };

  const hasNativeProcess = typeof process !== "undefined" && typeof process.on === "function";
  if (hasNativeProcess) {
    process.on("SIGINT", onSigint);
  }

  const taskResults: SuperviseTaskResult[] = [];

  try {
    for (let tIndex = 0; tIndex < tasks.length; tIndex++) {
      if (isInterrupted || deps.abortSignal?.aborted) {
        break;
      }

      const task = tasks[tIndex];
      output.write(`\n[nolo] >>> [${tIndex + 1}/${tasks.length}] Starting task: "${task.title}"\n`);

      let attemptCount = 0;
      const attempts: SuperviseTaskAttempt[] = [];
      let taskDone = false;
      let finalStatus: SuperviseTaskResult["finalStatus"] = "failed-supervisor";
      let finalRunId: string | undefined;

      while (!taskDone && !isInterrupted && !deps.abortSignal?.aborted) {
        attemptCount += 1;
        const attemptLabel = attemptCount === 1 ? "Initial run" : `Retry attempt #${attemptCount - 1}`;
        output.write(`[nolo] [${task.title}] ${attemptLabel} spawning...\n`);

        let runId: string | undefined;

        try {
          const rawArgs = [
            "--agent",
            agentKey,
            "--msg-file",
            "PLACEHOLDER",
            "--bg",
            ...(resolvedCwd ? ["--cwd", resolvedCwd] : []),
            ...(dodCommands ? dodCommands.flatMap((d) => ["--dod", d]) : []),
          ];

          const spawned = await spawnLocalRun(
            {
              rawArgs,
              commandPath: ["agent", "run"],
              cliEntrypointPath: deps.cliEntrypointPath,
              agentKey,
              cwd: resolvedCwd,
              message: task.brief,
              dodCommands,
              output,
            },
            deps
          );

          runId = spawned.runId;
          finalRunId = runId;

          output.write(`[nolo] [${task.title}] Run started: ${runId}${spawned.pid ? ` (pid: ${spawned.pid})` : ""}\n`);

          let record = readRecord(runId, deps);
          let lastActivityCount =
            (record?.activity?.counters?.fileEdits ?? 0) +
            (record?.activity?.counters?.toolCalls ?? 0) +
            (record?.activity?.counters?.llmCalls ?? 0);
          let lastActivityChangedAt = now().getTime();

          while (!isInterrupted && !deps.abortSignal?.aborted) {
            const pollMs = pollIntervalSec * 1000;
            await sleep(pollMs);

            if (isInterrupted || deps.abortSignal?.aborted) {
              break;
            }

            record = checkStale(runId, deps) ?? readRecord(runId, deps);
            if (!record) {
              output.write(`[nolo] [${task.title}] Run ${runId} record missing.\n`);
              break;
            }

            if (isRunTerminalStatus(record.status)) {
              break;
            }

            // Check stall
            const nowMs = now().getTime();
            const stallCheck = checkRunStall({
              record,
              lastActivityCount,
              lastActivityChangedAt,
              nowMs,
              stallMinutes,
            });
            lastActivityCount = stallCheck.currentActivityCount;
            lastActivityChangedAt = stallCheck.lastActivityChangedAt;

            if (stallCheck.isStalled) {
              output.write(
                `[nolo] [${task.title}] Run ${runId} stalled (no activity for ${stallMinutes}m). Stopping run...\n`
              );
              await terminateRun(record, "SIGTERM", deps);
              finalizeRunRecord(
                runId,
                { status: "killed", note: `stalled: no activity growth within ${stallMinutes}m` },
                deps
              );
              record = readRecord(runId, deps) ?? { ...record, status: "killed" };
              break;
            }
          }

          if (isInterrupted || deps.abortSignal?.aborted) {
            if (record && !isRunTerminalStatus(record.status)) {
              await terminateRun(record, "SIGTERM", deps);
              finalizeRunRecord(runId, { status: "killed", note: "interrupted by SIGINT" }, deps);
              record = readRecord(runId, deps) ?? { ...record, status: "killed" };
            }
            attempts.push({
              runId,
              startedAt: record?.startedAt ?? now().toISOString(),
              endedAt: record?.endedAt ?? now().toISOString(),
              status: "unknown",
              error: "Interrupted by user",
            });
            finalStatus = "interrupted";
            break;
          }

          const terminalRecord = record ?? {
            runId,
            agentKey,
            startedAt: now().toISOString(),
            status: "failed" as RunStatus,
            logPath: "",
          };

          // Locate report files
          const reportPath = resolveRunReportPath(runId, env, homedir);
          const reportJsonPath = resolveRunReportJsonPath(runId, env, homedir);
          let reportMarkdown: string | undefined;
          let reportJson: RunReportJson | undefined;

          try {
            if (fs.existsSync(reportJsonPath)) {
              reportJson = JSON.parse(fs.readFileSync(reportJsonPath, "utf8"));
            }
          } catch {
            // ignore parse error
          }

          try {
            if (fs.existsSync(reportPath)) {
              reportMarkdown = fs.readFileSync(reportPath, "utf8");
            }
          } catch {
            // ignore read error
          }

          // If neither report exists on disk yet, generate report synchronously
          if (!reportJson && !reportMarkdown) {
            try {
              const gen = await generateRunReport(terminalRecord, { env, homedir, fs, now });
              reportMarkdown = gen.markdown;
              reportJson = gen.report;
            } catch {
              // ignore
            }
          }

          const acceptance = evaluateRunAcceptance(terminalRecord, { reportJson, reportMarkdown });

          if (acceptance.passed) {
            taskDone = true;
            finalStatus = "done";
            attempts.push({
              runId,
              startedAt: terminalRecord.startedAt,
              endedAt: terminalRecord.endedAt ?? now().toISOString(),
              status: terminalRecord.status,
              exitCode: terminalRecord.exitCode,
              reportPath: fs.existsSync(reportPath) ? reportPath : undefined,
              reportJsonPath: fs.existsSync(reportJsonPath) ? reportJsonPath : undefined,
              dodPassed: true,
            });
            output.write(`[nolo] [${task.title}] PASSED (run ${runId})\n`);
          } else {
            const isStalled = terminalRecord.note?.includes("stalled");
            attempts.push({
              runId,
              startedAt: terminalRecord.startedAt,
              endedAt: terminalRecord.endedAt ?? now().toISOString(),
              status: isStalled ? "stalled" : terminalRecord.status,
              exitCode: terminalRecord.exitCode,
              reportPath: fs.existsSync(reportPath) ? reportPath : undefined,
              reportJsonPath: fs.existsSync(reportJsonPath) ? reportJsonPath : undefined,
              dodPassed: false,
              error: acceptance.reason,
            });

            output.write(`[nolo] [${task.title}] REJECTED: ${acceptance.reason}\n`);
            const decision = evaluateRetryDecision({
              currentAttemptCount: attemptCount,
              maxRetries,
              failureReason: acceptance.reason || "run failed",
            });

            if (decision.shouldRetry) {
              output.write(`[nolo] [${task.title}] ${decision.reason}\n`);
            } else {
              output.write(`[nolo] [${task.title}] ${decision.reason}\n`);
              finalStatus = "failed-supervisor";
              break;
            }
          }
        } catch (attemptErr) {
          const errorMsg = `Attempt error: ${toErrorMessage(attemptErr)}`;
          output.write(`[nolo] [${task.title}] ${errorMsg}\n`);
          attempts.push({
            runId: runId || "unknown",
            startedAt: now().toISOString(),
            endedAt: now().toISOString(),
            status: "failed",
            error: errorMsg,
          });
          const decision = evaluateRetryDecision({
            currentAttemptCount: attemptCount,
            maxRetries,
            failureReason: errorMsg,
          });
          if (decision.shouldRetry) {
            output.write(`[nolo] [${task.title}] ${decision.reason}\n`);
          } else {
            output.write(`[nolo] [${task.title}] ${decision.reason}\n`);
            finalStatus = "failed-supervisor";
            break;
          }
        }
      }

      taskResults.push({
        task,
        attempts,
        retries: Math.max(0, attempts.length - 1),
        finalStatus: isInterrupted ? "interrupted" : finalStatus,
        finalRunId,
      });
    }
  } finally {
    if (hasNativeProcess) {
      process.off("SIGINT", onSigint);
    }
  }

  const endTime = now();
  const completedTasks = taskResults.filter((t) => t.finalStatus === "done").length;
  const failedTasks = taskResults.filter((t) => t.finalStatus === "failed-supervisor").length;
  const interruptedTasks = taskResults.filter((t) => t.finalStatus === "interrupted").length;

  const summaryFilePath = resolveSuperviseSummaryPath(env, homedir, {
    timestamp: endTime.toISOString().replace(/[:.]/g, "-"),
  });

  const summary: SuperviseSummary = {
    agentKey,
    cwd: resolvedCwd,
    startedAt: startTime.toISOString(),
    endedAt: endTime.toISOString(),
    maxRetries,
    stallMinutes,
    pollIntervalSec,
    tasks: taskResults,
    totalTasks: tasks.length,
    completedTasks,
    failedTasks,
    interruptedTasks,
    summaryFilePath,
  };

  const summaryMarkdown = renderSuperviseSummaryMarkdown(summary);

  try {
    const runsDir = resolveRunsDir(env, homedir);
    fs.mkdirSync(runsDir, { recursive: true });
    fs.writeFileSync(summaryFilePath, summaryMarkdown, "utf8");
    output.write(`\n[nolo] Supervise summary written to: ${summaryFilePath}\n\n`);
  } catch (err) {
    output.write(`[nolo] Warning: Could not write summary file to ${summaryFilePath}: ${toErrorMessage(err)}\n\n`);
  }

  output.write(summaryMarkdown + "\n");

  if (isInterrupted) {
    return 130;
  }
  return completedTasks === tasks.length ? 0 : 1;
}
