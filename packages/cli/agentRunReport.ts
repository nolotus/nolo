// Generates structured run acceptance reports when an agent run reaches a terminal state.
// Writes markdown to ~/.nolo/runs/<runId>.report.md and structured JSON to ~/.nolo/runs/<runId>.report.json.

import { homedir as nodeHomedir } from "node:os";
import * as nodeFs from "node:fs";
import {
  execFileSync as nodeExecFileSync,
  spawnSync as nodeSpawnSync,
} from "node:child_process";
import {
  resolveRunReportPath,
  resolveRunReportJsonPath,
  resolveRunsDir,
  type FsLike,
  type RunRecord,
} from "./agentRunControl";

export type AgentRunReportDeps = {
  env?: Record<string, string | undefined>;
  homedir?: () => string;
  fs?: FsLike;
  now?: () => Date;
  spawnSync?: typeof nodeSpawnSync;
  execFileSync?: typeof nodeExecFileSync;
};

export type DoDCommandResult = {
  command: string;
  exitCode: number | "timeout" | "error";
  stdoutTail: string[];
  stderrTail: string[];
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

export function extractTailLines(text: string | undefined | null, count: number): string[] {
  if (!text) return [];
  const lines = String(text).split(/\r?\n/);
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.slice(Math.max(0, lines.length - count));
}

function formatCodeBlockCell(lines: string[]): string {
  if (lines.length === 0) return "-";
  const escaped = lines.map((line) => line.replace(/\|/g, "\\|")).join("<br>");
  return `<pre>${escaped}</pre>`;
}

export function executeDoDCommand(
  cmd: string,
  cwd: string | undefined,
  deps: AgentRunReportDeps = {}
): DoDCommandResult {
  const spawnSync = deps.spawnSync ?? nodeSpawnSync;
  try {
    const res = spawnSync(cmd, {
      shell: true,
      cwd: cwd || process.cwd(),
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      encoding: "utf8",
    });

    if (res.error) {
      const errCode = (res.error as any).code;
      if (errCode === "ETIMEDOUT" || res.signal === "SIGTERM" || res.signal === "SIGKILL") {
        return {
          command: cmd,
          exitCode: "timeout",
          stdoutTail: extractTailLines(res.stdout, 20),
          stderrTail: extractTailLines(res.stderr || res.error.message, 10),
        };
      }
      return {
        command: cmd,
        exitCode: "error",
        stdoutTail: extractTailLines(res.stdout, 20),
        stderrTail: extractTailLines(res.stderr || res.error.message, 10),
      };
    }

    if (res.status === null && (res.signal === "SIGTERM" || res.signal === "SIGKILL")) {
      return {
        command: cmd,
        exitCode: "timeout",
        stdoutTail: extractTailLines(res.stdout, 20),
        stderrTail: extractTailLines(res.stderr, 10),
      };
    }

    const exitCode = typeof res.status === "number" ? res.status : "error";
    return {
      command: cmd,
      exitCode,
      stdoutTail: extractTailLines(res.stdout, 20),
      stderrTail: extractTailLines(res.stderr, 10),
    };
  } catch (err) {
    return {
      command: cmd,
      exitCode: "error",
      stdoutTail: [],
      stderrTail: extractTailLines(err instanceof Error ? err.message : String(err), 10),
    };
  }
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
  lines.push(`| 耗时 | ${duration} |`);
  lines.push(`| activity | ${activityStr} |`);
  lines.push(`| dialogId | ${dialogIdStr} |`);
  lines.push("");

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

  // Git Summary
  lines.push("## Git 摘要");
  lines.push("");
  const gitSummary = collectGitSummary(record.cwd, record.spawnHead, deps);
  if (!gitSummary.isGitRepo) {
    lines.push("非 Git 仓库或 Git 不可用");
  } else if (gitSummary.error) {
    lines.push(`Git 统计异常: ${gitSummary.error}`);
  } else {
    lines.push(`- 变更统计: ${gitSummary.modifiedCount ?? 0} modified / ${gitSummary.untrackedCount ?? 0} untracked`);
    if (record.spawnHead) {
      lines.push(`- 新增 Commit (${record.spawnHead}..HEAD):`);
      if (gitSummary.commits && gitSummary.commits.length > 0) {
        for (const c of gitSummary.commits) {
          lines.push(`  - ${c}`);
        }
      } else {
        lines.push("  - (无新 commit)");
      }
    } else {
      lines.push("- 新增 Commit: 未记录 spawnHead");
    }
  }
  lines.push("");

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
    ...(dodResults ? { dodResults } : {}),
    gitSummary,
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

  try {
    fs.mkdirSync(runsDir, { recursive: true });
    fs.writeFileSync(reportPath, markdown, "utf8");
    fs.writeFileSync(reportJsonPath, JSON.stringify(report, null, 2), "utf8");
  } catch (err) {
    console.warn(`[nolo] failed to write run report file to ${reportPath}:`, err);
  }

  return { reportPath, reportJsonPath, markdown, report };
}
