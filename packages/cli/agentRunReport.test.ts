import { describe, expect, it } from "bun:test";
import type { RunRecord, FsLike } from "./agentRunControl";
import {
  generateRunReport,
  renderRunReportMarkdown,
  executeDoDCommand,
  collectGitSummary,
  type AgentRunReportDeps,
} from "./agentRunReport";

const buildMemFs = () => {
  const files = new Map<string, string>();
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

  it("renders a full report with DoD table, git summary and overview table", async () => {
    const record: RunRecord = {
      ...baseRecord,
      dodCommands: ["bun test", "git diff --check"],
      spawnHead: "1111111111111111111111111111111111111111",
    };

    const deps: AgentRunReportDeps = {
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

    const md = await renderRunReportMarkdown(record, deps);

    // 概要表
    expect(md).toContain("# Run 验收报告: run-2026-08-28-abc123");
    expect(md).toContain("| runId | run-2026-08-28-abc123 |");
    expect(md).toContain("| agent | CoderAgent (agent-pub-1) |");
    expect(md).toContain("| status | done |");
    expect(md).toContain("| exitCode | 0 |");
    expect(md).toContain("| 耗时 | 45s |");
    expect(md).toContain("| activity | 3 edits, 8 tools |");
    expect(md).toContain("| dialogId | dialog-user1-12345 |");

    // DoD 表
    expect(md).toContain("## DoD 验收结果");
    expect(md).toContain("| `bun test` | 0 | <pre>bun test v1.3<br>10 pass<br>0 fail</pre> | - |");
    expect(md).toContain("| `git diff --check` | 0 | - | - |");

    // Git 摘要
    expect(md).toContain("## Git 摘要");
    expect(md).toContain("- 变更统计: 1 modified / 1 untracked");
    expect(md).toContain("- 新增 Commit (1111111111111111111111111111111111111111..HEAD):");
    expect(md).toContain("  - 2222222 feat: add report feature");
    expect(md).toContain("  - 3333333 chore: update deps");

    // 结尾时间戳
    expect(md).toContain("_生成时间: 2026-08-28T10:01:00.000Z_");
  });

  it("renders base report when no dodCommands provided (无 DoD 也有账)", async () => {
    const record: RunRecord = {
      ...baseRecord,
      dodCommands: undefined,
    };

    const deps: AgentRunReportDeps = {
      now: () => new Date("2026-08-28T10:01:00.000Z"),
      execFileSync: ((file: string, args: string[]) => {
        if (args[0] === "rev-parse") return "true\n";
        if (args[0] === "status") return "";
        return "";
      }) as any,
    };

    const md = await renderRunReportMarkdown(record, deps);

    expect(md).toContain("# Run 验收报告");
    expect(md).toContain("## 概要");
    expect(md).not.toContain("## DoD 验收结果");
    expect(md).toContain("## Git 摘要");
    expect(md).toContain("- 变更统计: 0 modified / 0 untracked");
    expect(md).toContain("- 新增 Commit: 未记录 spawnHead");
    expect(md).toContain("_生成时间: 2026-08-28T10:01:00.000Z_");
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

  it("handles non-git directory gracefully (非 Git 目录降级)", async () => {
    const record: RunRecord = {
      ...baseRecord,
      cwd: "/tmp/non-git-dir",
    };

    const deps: AgentRunReportDeps = {
      now: () => new Date("2026-08-28T10:01:00.000Z"),
      execFileSync: (() => {
        throw new Error("fatal: not a git repository");
      }) as any,
    };

    const md = await renderRunReportMarkdown(record, deps);
    expect(md).toContain("## Git 摘要");
    expect(md).toContain("非 Git 仓库或 Git 不可用");
  });

  it("generateRunReport writes markdown and json files to ~/.nolo/runs/", async () => {
    const mem = buildMemFs();
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
    expect(mem.files.has("/home/test/.nolo/runs/run-2026-08-28-abc123.report.md")).toBe(true);
    expect(mem.files.has("/home/test/.nolo/runs/run-2026-08-28-abc123.report.json")).toBe(true);
    const content = mem.files.get("/home/test/.nolo/runs/run-2026-08-28-abc123.report.md")!;
    expect(content).toContain("# Run 验收报告: run-2026-08-28-abc123");
    const json = JSON.parse(mem.files.get("/home/test/.nolo/runs/run-2026-08-28-abc123.report.json")!);
    expect(json.runId).toBe("run-2026-08-28-abc123");
    expect(json.status).toBe("done");
  });
});
