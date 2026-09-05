// Generates compatibility acceptance reports for the supervise workflow.
// The normal run path persists DoD results directly in ~/.nolo/runs/<runId>.json.

import { homedir as nodeHomedir } from "node:os";
import { join } from "node:path";
import * as nodeFs from "node:fs";
import {
  execFileSync as nodeExecFileSync,
  spawnSync as nodeSpawnSync,
} from "node:child_process";
import {
  resolveRunLogPath,
  resolveRunReportPath,
  resolveRunReportJsonPath,
  resolveRunsDir,
  type FsLike,
  type RunRecord,
} from "./agentRunControl";
import {
  executeDoDCommand,
  type DoDCommandResult,
} from "./agentRunDoD";

export type AgentRunReportDeps = {
  env?: Record<string, string | undefined>;
  homedir?: () => string;
  fs?: FsLike;
  now?: () => Date;
  spawnSync?: typeof nodeSpawnSync;
  execFileSync?: typeof nodeExecFileSync;
  forceReport?: boolean;
};

export type RunReportJson = {
  runId: string;
  agentKey: string;
  agentName?: string;
  status: string;
  exitCode?: number;
  startedAt: string;
  endedAt?: string;
  duration: string;
  activity?: { fileEdits: number; toolCalls: number; llmCalls: number };
  dialogId?: string;
  childOutputTail?: string;
  dodResults?: DoDCommandResult[];
  gitSummary?: GitSummaryResult;
  generatedAt: string;
};

export function formatDuration(startedAt: string, endedAt?: string, now?: Date): string {
  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : (now ?? new Date()).getTime();
  if (isNaN(start)) return "-";
  const elapsedMs = Math.max(0, (isNaN(end) ? Date.now() : end) - start);
  const seconds = Math.floor(elapsedMs / 1000) % 60;
  const minutes = Math.floor(elapsedMs / 60000) % 60;
  const hours = Math.floor(elapsedMs / 3600000);
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatCodeBlockCell(lines: string[]): string {
  if (lines.length === 0) return "-";
  const escaped = lines.map((line) => line.replace(/\|/g, "\\|")).join("<br>");
  return `<pre>${escaped}</pre>`;
}

export type GitSummaryResult = {
  isGitRepo: boolean;
  modifiedCount?: number;
  untrackedCount?: number;
  spawnHead?: string;
  commits?: string[];
  error?: string;
};

export function collectGitSummary(
  cwd: string | undefined,
  spawnHead?: string,
  deps: AgentRunReportDeps = {}
): GitSummaryResult {
  const targetCwd = cwd || process.cwd();
  const execFile = deps.execFileSync ?? nodeExecFileSync;
  try {
    const isRepo = execFile("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: targetCwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();

    if (isRepo !== "true") {
      return { isGitRepo: false };
    }

    let modifiedCount = 0;
    let untrackedCount = 0;
    try {
      const statusOut = execFile("git", ["status", "--porcelain"], {
        cwd: targetCwd,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 10000,
      });

      const statusLines = statusOut.split(/\r?\n/).filter((l) => l.trim().length > 0);
      for (const line of statusLines) {
        if (line.startsWith("??")) {
          untrackedCount += 1;
        } else {
          modifiedCount += 1;
        }
      }
    } catch (err) {
      return {
        isGitRepo: true,
        error: `git status 失败: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    let commits: string[] | undefined;
    if (spawnHead) {
      try {
        const logOut = execFile(
          "git",
          ["log", `${spawnHead}..HEAD`, "--oneline", "-n", "20"],
          {
            cwd: targetCwd,
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            timeout: 10000,
          }
        );
        commits = logOut.split(/\r?\n/).filter((l) => l.trim().length > 0).slice(0, 20);
      } catch (logErr) {
        commits = [`(git log 失败: ${logErr instanceof Error ? logErr.message : String(logErr)})`];
      }
    }

    return {
      isGitRepo: true,
      modifiedCount,
      untrackedCount,
      spawnHead,
      commits,
    };
  } catch (err) {
    return {
      isGitRepo: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function parseDoDResultsFromMarkdown(markdown: string): {
  passed: boolean;
  dodResults: Array<{ command: string; exitCode: number | "timeout" | "error" }>;
} {
  const dodResults: Array<{ command: string; exitCode: number | "timeout" | "error" }> = [];
  const lines = markdown.split(/\r?\n/);
  let inDoDSection = false;

  for (const line of lines) {
    if (line.startsWith("## DoD 验收结果")) {
      inDoDSection = true;
      continue;
    }
    if (inDoDSection && line.startsWith("## ")) {
      inDoDSection = false;
      break;
    }
    if (inDoDSection && line.startsWith("|")) {
      const cells = line.split("|").map((c) => c.trim()).filter((c) => c.length > 0);
      if (cells.length >= 2) {
        if (cells[0] === "命令" || cells[0].startsWith("---")) continue;
        const cmd = cells[0].replace(/^`|`$/g, "").trim();
        const codeRaw = cells[1].trim();
        let exitCode: number | "timeout" | "error";
        if (codeRaw === "timeout") exitCode = "timeout";
        else if (codeRaw === "error") exitCode = "error";
        else {
          const parsedNum = parseInt(codeRaw, 10);
          exitCode = isNaN(parsedNum) ? "error" : parsedNum;
        }
        dodResults.push({ command: cmd, exitCode });
      }
    }
  }

  const passed = dodResults.length > 0 && dodResults.every((r) => r.exitCode === 0);
  return { passed, dodResults };
}

export function extractChildAgentOutput(
  logPath: string | undefined,
  deps: AgentRunReportDeps = {}
): string | undefined {
  if (!logPath) return undefined;
  const fs = deps.fs ?? nodeFs;
  let raw: string;
  try {
    raw = fs.readFileSync(logPath, "utf8");
  } catch {
    return undefined;
  }

  // Remove ANSI escape sequences (OSC and CSI)
  const stripped = raw
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, "")
    .replace(/\x1b\[[\x30-\x3f]*[\x20-\x2f]*[\x40-\x7e]/g, "")
    .replace(/\x1b\[[0-9;]*[a-zA-Z]/g, "");

  const lines = stripped.split(/\r?\n/);

  // Find the last line matching an assistant turn header: "agent-xxx > ..." or "... > ..."
  let lastMarkerLineIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (/^(?:agent-[^\s>]+|[a-zA-Z0-9_@/.-]+)\s*>\s*/.test(line)) {
      lastMarkerLineIdx = i;
      break;
    }
  }

  if (lastMarkerLineIdx === -1) return undefined;

  const collectedLines: string[] = [];
  const firstLine = lines[lastMarkerLineIdx];
  const firstMarkerIdx = firstLine.indexOf(" > ");
  collectedLines.push(firstLine.slice(firstMarkerIdx + 3));

  for (let j = lastMarkerLineIdx + 1; j < lines.length; j++) {
    const line = lines[j];
    if (line.startsWith("[nolo] dialog") || line.startsWith("[nolo] background dialog")) {
      break;
    }
    collectedLines.push(line);
  }

  const joined = collectedLines.join("\n").trim();
  if (!joined) return undefined;

  const MAX_CHARS = 2000;
  const chars = Array.from(joined);
  if (chars.length > MAX_CHARS) {
    return `${chars.slice(0, MAX_CHARS).join("")}\n\n...(截断，完整日志请查看 log)...`;
  }
  return joined;
}

export async function buildRunReportData(
  record: RunRecord,
  deps: AgentRunReportDeps = {}
): Promise<{ markdown: string; report: RunReportJson }> {
  const now = (deps.now ?? (() => new Date()))();
  const duration = formatDuration(record.startedAt, record.endedAt, now);
  const edits = record.activity?.counters?.fileEdits ?? 0;
  const tools = record.activity?.counters?.toolCalls ?? 0;
  const llmCalls = record.activity?.counters?.llmCalls ?? 0;
  const activityStr = `${edits} edits, ${tools} tools`;
  const exitCodeStr = typeof record.exitCode === "number" ? String(record.exitCode) : "-";
  const agentDisplay = record.agentName ? `${record.agentName} (${record.agentKey})` : record.agentKey;
  const dialogIdStr = record.dialogId || "-";

  const resolvedLogPath = record.logPath || resolveRunLogPath(record.runId, deps.env, deps.homedir);
  const runsDir = resolveRunsDir(deps.env, deps.homedir);
  const reportPath = resolveRunReportPath(record.runId, deps.env, deps.homedir);
  const reportJsonPath = resolveRunReportJsonPath(record.runId, deps.env, deps.homedir);
  const msgPath = record.msgFile ?? join(runsDir, `${record.runId}.msg.md`);
  const fs = deps.fs ?? nodeFs;
  const msgPathExists = fs.existsSync(msgPath);

  const childOutput = extractChildAgentOutput(resolvedLogPath, deps);

  const lines: string[] = [];
  lines.push(`# Run 验收报告: ${record.runId}`);
  lines.push("");
  lines.push("## 概要");
  lines.push("");
  lines.push("| 字段 | 值 |");
  lines.push("| --- | --- |");
  lines.push(`| runId | ${record.runId} |`);
  lines.push(`| agent | ${agentDisplay} |`);
  lines.push(`| status | ${record.status} |`);
  lines.push(`| exitCode | ${exitCodeStr} |`);
  lines.push(`| 开始时间 | ${record.startedAt} |`);
  lines.push(`| 结束时间 | ${record.endedAt ?? "-"} |`);
  lines.push(`| 耗时 | ${duration} |`);
  lines.push(`| activity | ${activityStr} |`);
  lines.push(`| dialogId | ${dialogIdStr} |`);
  lines.push("");

  // ## 子 Agent 产出
  lines.push("## 子 Agent 产出");
  lines.push("");
  if (childOutput) {
    lines.push(childOutput);
  } else {
    lines.push(`（无法从 log 提取最终答复，完整日志：${resolvedLogPath}）`);
  }
  lines.push("");

  // ## 结果去哪取
  lines.push("## 结果去哪取");
  lines.push("");
  if (record.dialogId) {
    lines.push(
      `- 对话记录: ${record.dialogId}（可用 controlAgentRun(action:"status", runId:"${record.runId}") 查看，或终端运行 nolo dialog read ${record.dialogId}）`
    );
  } else {
    lines.push("- 对话记录: 无（未持久化或 ephemeral run）");
  }
  lines.push(`- 完整日志: ${resolvedLogPath}`);
  if (msgPathExists) {
    lines.push(`- 任务输入: ${msgPath}`);
  }
  lines.push(`- 验收报告 (Markdown): ${reportPath}`);
  lines.push(`- 验收报告 (JSON): ${reportJsonPath}`);
  lines.push("");

  // DoD Results
  let dodResults: DoDCommandResult[] | undefined;
  if (record.dodCommands && record.dodCommands.length > 0) {
    dodResults = [];
    lines.push("## DoD 验收结果");
    lines.push("");
    lines.push("| 命令 | exit code | stdout (尾部 20 行) | stderr (尾部 10 行) |");
    lines.push("| --- | --- | --- | --- |");

    for (const cmd of record.dodCommands) {
      const result = executeDoDCommand(cmd, record.cwd, deps);
      dodResults.push(result);
      const codeStr = typeof result.exitCode === "number" ? String(result.exitCode) : result.exitCode;
      const stdoutCell = formatCodeBlockCell(result.stdoutTail);
      const stderrCell = formatCodeBlockCell(result.stderrTail);
      const cmdCell = `\`${cmd.replace(/\|/g, "\\|")}\``;
      lines.push(`| ${cmdCell} | ${codeStr} | ${stdoutCell} | ${stderrCell} |`);
    }
    lines.push("");
  }

  // Git Summary: Only show if spawnHead is present and there are new commits
  // 限制说明：record.cwd 即子 agent 工作区，本地 run 恒成立；跨 worktree 场景待 ProcessTask 落地时统一解决。
  let gitSummary: GitSummaryResult | undefined;
  if (record.spawnHead) {
    const summary = collectGitSummary(record.cwd, record.spawnHead, deps);
    if (
      summary.isGitRepo &&
      summary.commits &&
      summary.commits.length > 0 &&
      !summary.error &&
      !summary.commits[0]?.startsWith("(")
    ) {
      gitSummary = summary;
      lines.push("## Git 摘要");
      lines.push("");
      lines.push(`- 新增 Commit (${record.spawnHead}..HEAD):`);
      for (const c of summary.commits) {
        lines.push(`  - ${c}`);
      }
      lines.push("");
    }
  }

  // Ending timestamp
  lines.push("---");
  lines.push(`_生成时间: ${now.toISOString()}_`);
  lines.push("");

  const markdown = lines.join("\n");
  const report: RunReportJson = {
    runId: record.runId,
    agentKey: record.agentKey,
    ...(record.agentName ? { agentName: record.agentName } : {}),
    status: record.status,
    ...(typeof record.exitCode === "number" ? { exitCode: record.exitCode } : {}),
    startedAt: record.startedAt,
    ...(record.endedAt ? { endedAt: record.endedAt } : {}),
    duration,
    activity: { fileEdits: edits, toolCalls: tools, llmCalls },
    ...(record.dialogId ? { dialogId: record.dialogId } : {}),
    ...(childOutput ? { childOutputTail: childOutput } : {}),
    ...(dodResults ? { dodResults } : {}),
    ...(gitSummary ? { gitSummary } : {}),
    generatedAt: now.toISOString(),
  };

  return { markdown, report };
}

export async function renderRunReportMarkdown(
  record: RunRecord,
  deps: AgentRunReportDeps = {}
): Promise<string> {
  const { markdown } = await buildRunReportData(record, deps);
  return markdown;
}

export async function generateRunReport(
  record: RunRecord,
  deps: AgentRunReportDeps = {}
): Promise<{ reportPath: string; reportJsonPath: string; markdown: string; report: RunReportJson }> {
  const fs = deps.fs ?? nodeFs;
  const env = deps.env ?? process.env;
  const homedir = deps.homedir ?? nodeHomedir;
  const runsDir = resolveRunsDir(env, homedir);
  const reportPath = resolveRunReportPath(record.runId, env, homedir);
  const reportJsonPath = resolveRunReportJsonPath(record.runId, env, homedir);

  const { markdown, report } = await buildRunReportData(record, deps);

  const shouldWrite = deps.forceReport === true || env.NOLO_RUN_REPORT === "1";
  if (shouldWrite) {
    try {
      fs.mkdirSync(runsDir, { recursive: true });
      fs.writeFileSync(reportPath, markdown, "utf8");
      fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), "utf8");
    } catch (err) {
      console.warn(`[nolo] failed to write run report file to ${reportPath}:`, err);
    }
  }

  return { reportPath, reportJsonPath, markdown, report };
}
