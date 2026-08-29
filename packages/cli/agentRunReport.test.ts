import { describe, expect, it } from "bun:test";
import type { RunRecord, FsLike } from "./agentRunControl";
import {
  generateRunReport,
  renderRunReportMarkdown,
  executeDoDCommand,
  collectGitSummary,
  extractChildAgentOutput,
  type AgentRunReportDeps,
} from "./agentRunReport";

const buildMemFs = (initialFiles: Record<string, string> = {}) => {
  const files = new Map<string, string>(Object.entries(initialFiles));
  const fs = {
    mkdirSync: () => {},
    writeFileSync: (path: string, content: string) => {
      files.set(path, content);
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
    existsSync: (path: string) => files.has(path),
    openSync: () => 1,
    unlinkSync: (path: string) => {
      files.delete(path);
    },
  } as unknown as FsLike;
  return { files, fs };
};

describe("agentRunReport", () => {
  const baseRecord: RunRecord = {
    runId: "run-2026-08-28-abc123",
    agentKey: "agent-pub-1",
    agentName: "CoderAgent",
    status: "done",
    exitCode: 0,
    startedAt: "2026-08-28T10:00:00.000Z",
    endedAt: "2026-08-28T10:00:45.000Z",
    logPath: "/home/test/.nolo/runs/run-2026-08-28-abc123.log",
    dialogId: "dialog-user1-12345",
    cwd: "/work/project",
    activity: {
      lastEventAt: "2026-08-28T10:00:40.000Z",
      inFlight: null,
      counters: { fileEdits: 3, toolCalls: 8, llmCalls: 4 },
      updatedAt: "2026-08-28T10:00:45.000Z",
    },
  };

  it("renders a full report with DoD table, git summary, sub-agent output, and guidance section", async () => {
    const record: RunRecord = {
      ...baseRecord,
      dodCommands: ["bun test", "git diff --check"],
      spawnHead: "1111111111111111111111111111111111111111",
    };

    const logContent = [
      "[nolo] start turn",
      "CoderAgent > \x1b[32mAll tasks completed successfully!\x1b[0m",
      "Here is the final summary of changes.",
      "",
      "[nolo] dialog dialog-user1-12345",
    ].join("\n");

    const mem = buildMemFs({
      "/home/test/.nolo/runs/run-2026-08-28-abc123.log": logContent,
      "/home/test/.nolo/runs/run-2026-08-28-abc123.msg.md": "Please refactor the report module.",
    });

    const deps: AgentRunReportDeps = {
      env: {},
      homedir: () => "/home/test",
      fs: mem.fs,
      now: () => new Date("2026-08-28T10:01:00.000Z"),
      spawnSync: ((cmd: string) => {
        if (cmd === "bun test") {
          return {
            status: 0,
            stdout: "bun test v1.3\n10 pass\n0 fail",
            stderr: "",
          };
        }
        return {
          status: 0,
          stdout: "",
          stderr: "",
        };
      }) as any,
      execFileSync: ((file: string, args: string[]) => {
        if (args[0] === "rev-parse") return "true\n";
        if (args[0] === "status") return " M src/index.ts\n?? new-file.txt\n";
        if (args[0] === "log") return "2222222 feat: add report feature\n3333333 chore: update deps\n";
        return "";
      }) as any,
    };

    const { markdown: md, report } = await generateRunReport(record, deps);

    // 概要表
    expect(md).toContain("# Run 验收报告: run-2026-08-28-abc123");
    expect(md).toContain("| runId | run-2026-08-28-abc123 |");
    expect(md).toContain("| agent | CoderAgent (agent-pub-1) |");
    expect(md).toContain("| status | done |");
    expect(md).toContain("| exitCode | 0 |");
    expect(md).toContain("| 耗时 | 45s |");
    expect(md).toContain("| activity | 3 edits, 8 tools |");
    expect(md).toContain("| dialogId | dialog-user1-12345 |");

    // 子 Agent 产出
    expect(md).toContain("## 子 Agent 产出");
    expect(md).toContain("All tasks completed successfully!\nHere is the final summary of changes.");
    expect(md).not.toContain("\x1b[32m");
    expect(report.childOutputTail).toContain("All tasks completed successfully!");

    // 结果去哪取
    expect(md).toContain("## 结果去哪取");
    expect(md).toContain("- 对话记录: dialog-user1-12345（可用 controlAgentRun(action:\"status\", runId:\"run-2026-08-28-abc123\") 查看，或终端运行 nolo dialog read dialog-user1-12345）");
    expect(md).toContain("- 完整日志: /home/test/.nolo/runs/run-2026-08-28-abc123.log");
    expect(md).toContain("- 任务输入: /home/test/.nolo/runs/run-2026-08-28-abc123.msg.md");
    expect(md).toContain("- 验收报告 (Markdown): /home/test/.nolo/runs/run-2026-08-28-abc123.report.md");
    expect(md).toContain("- 验收报告 (JSON): /home/test/.nolo/runs/run-2026-08-28-abc123.report.json");

    // DoD 表
    expect(md).toContain("## DoD 验收结果");
    expect(md).toContain("| `bun test` | 0 | <pre>bun test v1.3<br>10 pass<br>0 fail</pre> | - |");
    expect(md).toContain("| `git diff --check` | 0 | - | - |");

    // Git 摘要 (有新 commit)
    expect(md).toContain("## Git 摘要");
    expect(md).not.toContain("变更统计");
    expect(md).toContain("- 新增 Commit (1111111111111111111111111111111111111111..HEAD):");
    expect(md).toContain("  - 2222222 feat: add report feature");
    expect(md).toContain("  - 3333333 chore: update deps");

    // 结尾时间戳
    expect(md).toContain("_生成时间: 2026-08-28T10:01:00.000Z_");
  });

  it("omits ## Git 摘要 section when spawnHead is missing or no new commits exist (无新增 commit 无 Git 节)", async () => {
    const recordWithoutSpawnHead: RunRecord = {
      ...baseRecord,
      spawnHead: undefined,
    };

    const deps: AgentRunReportDeps = {
      env: {},
      homedir: () => "/home/test",
      now: () => new Date("2026-08-28T10:01:00.000Z"),
      execFileSync: ((file: string, args: string[]) => {
        if (args[0] === "rev-parse") return "true\n";
        if (args[0] === "status") return " M dirty.ts\n";
        return "";
      }) as any,
    };

    const md1 = await renderRunReportMarkdown(recordWithoutSpawnHead, deps);
    expect(md1).not.toContain("## Git 摘要");
    expect(md1).not.toContain("变更统计");

    const recordWithSpawnHeadNoCommits: RunRecord = {
      ...baseRecord,
      spawnHead: "1111111111111111111111111111111111111111",
    };

    const depsNoCommits: AgentRunReportDeps = {
      env: {},
      homedir: () => "/home/test",
      now: () => new Date("2026-08-28T10:01:00.000Z"),
      execFileSync: ((file: string, args: string[]) => {
        if (args[0] === "rev-parse") return "true\n";
        if (args[0] === "status") return " M dirty.ts\n";
        if (args[0] === "log") return "";
        return "";
      }) as any,
    };

    const md2 = await renderRunReportMarkdown(recordWithSpawnHeadNoCommits, depsNoCommits);
    expect(md2).not.toContain("## Git 摘要");
    expect(md2).not.toContain("变更统计");
  });

  it("extracts sub-agent output with ANSI cleaning (CSI + OSC), multiline support, and safe truncation", () => {
    const logPath = "/home/test/.nolo/runs/test.log";

    // 1. Multiline, ANSI CSI + OSC cleaning, and ignores diff/redirection lines
    const mem1 = buildMemFs({
      [logPath]: [
        "preamble...",
        "turn 1",
        "agent-pub-1 > \x1b[1mFirst turn\x1b[0m",
        "turn 2",
        "agent-pub-1 > \x1b]0;Set Title\x07\x1b[34mFinal output line 1\x1b[0m",
        "Final output line 2 with code: if (a > b) return;",
        "+ diff line > should not be parsed as agent header",
        "[nolo] dialog dialog-test",
      ].join("\n"),
    });

    const out1 = extractChildAgentOutput(logPath, { fs: mem1.fs });
    expect(out1).toBe(
      "Final output line 1\nFinal output line 2 with code: if (a > b) return;\n+ diff line > should not be parsed as agent header"
    );

    // 2. Truncation when over 2000 chars with multibyte characters
    const longText = "✨".repeat(2500);
    const mem2 = buildMemFs({
      [logPath]: `agent-pub-1 > ${longText}\n[nolo] dialog dialog-test`,
    });
    const out2 = extractChildAgentOutput(logPath, { fs: mem2.fs });
    expect(out2).toContain("...(截断，完整日志请查看 log)...");
    expect(out2?.startsWith("✨".repeat(2000))).toBe(true);
  });

  it("handles missing or unparseable log with clear fallback in report", async () => {
    const mem = buildMemFs(); // no log file
    const deps: AgentRunReportDeps = {
      env: {},
      homedir: () => "/home/test",
      fs: mem.fs,
      now: () => new Date("2026-08-28T10:01:00.000Z"),
    };

    const md = await renderRunReportMarkdown(baseRecord, deps);
    expect(md).toContain("## 子 Agent 产出");
    expect(md).toContain("（无法从 log 提取最终答复，完整日志：/home/test/.nolo/runs/run-2026-08-28-abc123.log）");
  });

  it("handles DoD command timeout gracefully (timeout 降级)", async () => {
    const record: RunRecord = {
      ...baseRecord,
      dodCommands: ["long-running-command"],
    };

    const deps: AgentRunReportDeps = {
      now: () => new Date("2026-08-28T10:01:00.000Z"),
      spawnSync: (() => {
        const err = new Error("timed out");
        (err as any).code = "ETIMEDOUT";
        return {
          status: null,
          signal: "SIGTERM",
          error: err,
          stdout: "still calculating...\nline 20",
          stderr: "timed out after 120s",
        };
      }) as any,
      execFileSync: (() => "false") as any,
    };

    const md = await renderRunReportMarkdown(record, deps);
    expect(md).toContain("## DoD 验收结果");
    expect(md).toContain("| `long-running-command` | timeout |");
    expect(md).toContain("<pre>still calculating...<br>line 20</pre>");
  });

  it("handles non-git directory gracefully by omitting Git section", async () => {
    const record: RunRecord = {
      ...baseRecord,
      cwd: "/tmp/non-git-dir",
      spawnHead: "1111111111111111111111111111111111111111",
    };

    const deps: AgentRunReportDeps = {
      now: () => new Date("2026-08-28T10:01:00.000Z"),
      execFileSync: (() => {
        throw new Error("fatal: not a git repository");
      }) as any,
    };

    const md = await renderRunReportMarkdown(record, deps);
    expect(md).not.toContain("## Git 摘要");
  });

  it("generateRunReport defaults to not writing files to disk", async () => {
    const mem = buildMemFs({
      "/home/test/.nolo/runs/run-2026-08-28-abc123.log": "agent > work done\n[nolo] dialog dialog-user1-12345",
    });
    const deps: AgentRunReportDeps = {
      env: {},
      homedir: () => "/home/test",
      fs: mem.fs,
      now: () => new Date("2026-08-28T10:01:00.000Z"),
      execFileSync: (() => "false") as any,
    };

    const result = await generateRunReport(baseRecord, deps);
    expect(result.reportPath).toBe("/home/test/.nolo/runs/run-2026-08-28-abc123.report.md");
    expect(result.reportJsonPath).toBe("/home/test/.nolo/runs/run-2026-08-28-abc123.report.json");
    expect(mem.files.has("/home/test/.nolo/runs/run-2026-08-28-abc123.report.md")).toBe(false);
    expect(mem.files.has("/home/test/.nolo/runs/run-2026-08-28-abc123.report.json")).toBe(false);
    expect(result.markdown).toContain("# Run 验收报告: run-2026-08-28-abc123");
    expect(result.report.runId).toBe("run-2026-08-28-abc123");
  });

  it("generateRunReport writes files when NOLO_RUN_REPORT=1", async () => {
    const mem = buildMemFs({
      "/home/test/.nolo/runs/run-2026-08-28-abc123.log": "agent > work done\n[nolo] dialog dialog-user1-12345",
    });
    const deps: AgentRunReportDeps = {
      env: { NOLO_RUN_REPORT: "1" },
      homedir: () => "/home/test",
      fs: mem.fs,
      now: () => new Date("2026-08-28T10:01:00.000Z"),
      execFileSync: (() => "false") as any,
    };

    const result = await generateRunReport(baseRecord, deps);
    expect(mem.files.has("/home/test/.nolo/runs/run-2026-08-28-abc123.report.md")).toBe(true);
    expect(mem.files.has("/home/test/.nolo/runs/run-2026-08-28-abc123.report.json")).toBe(true);
    const content = mem.files.get("/home/test/.nolo/runs/run-2026-08-28-abc123.report.md")!;
    expect(content).toContain("# Run 验收报告: run-2026-08-28-abc123");
    const json = JSON.parse(mem.files.get("/home/test/.nolo/runs/run-2026-08-28-abc123.report.json")!);
    expect(json.runId).toBe("run-2026-08-28-abc123");
    expect(json.status).toBe("done");
    expect(json.childOutputTail).toBe("work done");
  });

  it("generateRunReport writes files when forceReport=true", async () => {
    const mem = buildMemFs({
      "/home/test/.nolo/runs/run-2026-08-28-abc123.log": "agent > work done\n[nolo] dialog dialog-user1-12345",
    });
    const deps: AgentRunReportDeps = {
      env: {},
      forceReport: true,
      homedir: () => "/home/test",
      fs: mem.fs,
      now: () => new Date("2026-08-28T10:01:00.000Z"),
      execFileSync: (() => "false") as any,
    };

    const result = await generateRunReport(baseRecord, deps);
    expect(mem.files.has("/home/test/.nolo/runs/run-2026-08-28-abc123.report.md")).toBe(true);
    expect(mem.files.has("/home/test/.nolo/runs/run-2026-08-28-abc123.report.json")).toBe(true);
  });
});
