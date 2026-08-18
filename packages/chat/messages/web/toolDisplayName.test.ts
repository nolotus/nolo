import { describe, expect, it } from "bun:test";

import {
  formatToolInvocationSummary,
  formatToolGroupHeaderSummary,
  resolveToolDisplayName,
  buildFallbackActivity,
  buildActivityTimeline,
  extractToolCallArgs,
  formatToolRowHeaderSummary,
  shortenActivityTitle,
} from "./toolDisplayName";

const labels: Record<string, string> = {
  "toolNames.exa_search": "搜索",
  "toolNames.read_file": "读取文件",
  "toolNames.readFile": "读取文件",
  "toolNames.listFiles": "浏览目录",
  "toolNames.execShell": "运行命令",
  "toolNames.releasePreview": "释放预览",
  "toolNames.loadSkill": "加载技能",
  "toolNames.tool": "工具",
};

const t = (key: string, fallback: string) => labels[key] ?? fallback;

describe("tool display names", () => {
  it("uses translated tool labels when available", () => {
    expect(resolveToolDisplayName("exa_search", t)).toBe("搜索");
    expect(resolveToolDisplayName("listFiles", t)).toBe("浏览目录");
  });

  it("falls back to raw tool names when no translation exists", () => {
    expect(resolveToolDisplayName("customTool", t)).toBe("customTool");
  });

  it("uses Chinese defaults for common workspace tools when i18n misses keys", () => {
    const passthrough = (_key: string, fallback: string) => fallback;
    expect(resolveToolDisplayName("listFiles", passthrough)).toBe("浏览目录");
    expect(resolveToolDisplayName("searchFiles", passthrough)).toBe("搜索代码");
    expect(resolveToolDisplayName("globFiles", passthrough)).toBe("查找文件");
    expect(resolveToolDisplayName("execShell", passthrough)).toBe("运行命令");
  });

  it("never leaks raw API names when i18n returns the key path or API name", () => {
    const broken = (key: string, _fallback: string) => key; // simulates missing key
    expect(resolveToolDisplayName("listFiles", broken)).toBe("浏览目录");
    expect(resolveToolDisplayName("searchFiles", broken)).toBe("搜索代码");
    expect(resolveToolDisplayName("globFiles", broken)).toBe("查找文件");
    expect(resolveToolDisplayName("execShell", broken)).toBe("运行命令");
    // Old zh label upgraded
    const oldZh = (key: string, fallback: string) =>
      key === "toolNames.execShell" ? "命令行" : fallback;
    expect(resolveToolDisplayName("execShell", oldZh)).toBe("运行命令");
  });

  it("normalizes functions. prefix and snake_case tool names", () => {
    expect(resolveToolDisplayName("functions.listFiles")).toBe("浏览目录");
    expect(resolveToolDisplayName("list_files")).toBe("浏览目录");
    expect(resolveToolDisplayName("search_files")).toBe("搜索代码");
  });

  it("resolves fetchWebpage display name from defaults", () => {
    const passthrough = (_key: string, fallback: string) => fallback;
    expect(resolveToolDisplayName("fetchWebpage", passthrough)).toBe("抓取网页");
    expect(resolveToolDisplayName("fetch_webpage", passthrough)).toBe("抓取网页");
  });

  it("formats grouped tool invocation counts with translated names", () => {
    expect(
      formatToolInvocationSummary(
        [
          { toolName: "exa_search" },
          { toolName: "read_file" },
          { toolName: "exa_search" },
          { toolName: "releasePreview" },
        ],
        t
      )
    ).toBe("搜索 × 2、读取文件 × 1、释放预览 × 1");
  });

  it("prefers human activity titles over API tool names in group headers", () => {
    expect(
      formatToolGroupHeaderSummary(
        [
          {
            toolName: "listFiles",
            toolPayload: { input: { path: "packages" } },
          },
          {
            toolName: "listFiles",
            toolPayload: { input: { path: "docs" } },
          },
          {
            toolName: "readFile",
            toolPayload: { input: { path: "README.md" } },
          },
          {
            toolName: "execShell",
            toolPayload: { input: { cmd: "git status -sb" } },
          },
        ],
        t
      )
    ).toBe("浏览目录 × 2、查看相关文件 × 1、检查改动 × 1");
  });

  it("shortens legacy version activity titles in group headers", () => {
    expect(shortenActivityTitle("用版本管理同步改动")).toBe("推送");
    expect(
      formatToolGroupHeaderSummary(
        [
          {
            toolName: "execShell",
            metadata: { activity: { title: "用版本管理同步改动" } },
          },
        ],
        t
      )
    ).toBe("推送 × 1");
  });
});

describe("formatToolRowHeaderSummary", () => {
  it("keeps meaningful existing summary when it is more specific than bare tool name", () => {
    expect(
      formatToolRowHeaderSummary({
        toolName: "readFile",
        existingSummary: "查看 package.json",
      })
    ).toBe("查看 package.json");
  });

  it("builds path summary for readFile from tool args", () => {
    expect(
      formatToolRowHeaderSummary({
        toolName: "readFile",
        existingSummary: "readFile",
        toolArgs: { path: ".git/HEAD" },
        translate: t,
      })
    ).toBe("读取文件 · .git/HEAD");
  });

  it("omits trailing placeholder dot when path is absent (clean label while streaming)", () => {
    expect(
      formatToolRowHeaderSummary({
        toolName: "listFiles",
        toolArgs: {},
        translate: t,
      })
    ).toBe("浏览目录");
    expect(
      formatToolRowHeaderSummary({
        toolName: "readFile",
        toolArgs: {},
        translate: t,
      })
    ).toBe("读取文件");
  });

  it("builds command summary for execShell", () => {
    expect(
      formatToolRowHeaderSummary({
        toolName: "execShell",
        toolArgs: { cmd: "bun test packages/chat/messages/web" },
        translate: t,
      })
    ).toBe("运行命令 · bun test packages/chat/messages/web");
  });

  it("builds query summary for searchFiles", () => {
    expect(
      formatToolRowHeaderSummary({
        toolName: "searchFiles",
        toolArgs: { query: "groupConsecutiveToolEntries" },
        translate: t,
      })
    ).toBe("搜索代码 · groupConsecutiveToolEntries");
  });

  it("builds loadSkill summary from input name", () => {
    expect(
      formatToolRowHeaderSummary({
        toolName: "loadSkill",
        toolArgs: { name: "search-first" },
        translate: t,
      })
    ).toBe("加载技能 · search-first");
    expect(
      formatToolRowHeaderSummary({
        toolName: "loadSkill",
        toolArgs: {},
        translate: t,
      })
    ).toBe("加载技能");
  });

  it("extracts tool args from raw tool call json", () => {
    expect(
      extractToolCallArgs({
        rawToolCall: {
          function: {
            arguments: '{"path":"packages/chat/messages/web/MessageList.tsx"}',
          },
        },
      })
    ).toEqual({ path: "packages/chat/messages/web/MessageList.tsx" });
  });
});

describe("buildFallbackActivity", () => {
  it("returns fallback for readFile with path", () => {
    expect(buildFallbackActivity("readFile", { path: "src/app.ts" })).toEqual({
      title: "查看相关文件",
      refs: [{ type: "file", path: "src/app.ts" }],
    });
  });

  it("returns fallback for writeFile with path", () => {
    expect(buildFallbackActivity("writeFile", { path: "config.json" })).toEqual({
      title: "写入文件",
      refs: [{ type: "file", path: "config.json" }],
    });
  });

  it("returns fallback for editFile with path", () => {
    expect(buildFallbackActivity("editFile", { path: "app.ts" })).toEqual({
      title: "修改文件",
      refs: [{ type: "file", path: "app.ts" }],
    });
  });

  it("returns fallback for searchFiles with query", () => {
    expect(buildFallbackActivity("searchFiles", { query: "TODO" })).toEqual({
      title: "在代码里找线索",
      detail: "TODO",
    });
  });

  it("returns fallback for globFiles with pattern", () => {
    expect(buildFallbackActivity("globFiles", { pattern: "**/*.ts" })).toEqual({
      title: "查找相关文件",
      detail: "**/*.ts",
    });
  });

  it("returns fallback for listFiles with path", () => {
    expect(buildFallbackActivity("listFiles", { path: "packages/chat" })).toEqual({
      title: "浏览目录",
      detail: "packages/chat",
      refs: [{ type: "file", path: "packages/chat" }],
    });
  });

  it("returns fallback for listFiles defaulting to workspace root", () => {
    expect(buildFallbackActivity("listFiles", {})).toEqual({
      title: "浏览目录",
      detail: ".",
      refs: [{ type: "file", path: "." }],
    });
  });

  it("returns fallback for globFiles using glob alias", () => {
    expect(buildFallbackActivity("globFiles", { glob: "**/*.md" })).toEqual({
      title: "查找相关文件",
      detail: "**/*.md",
    });
  });

  it("classifies git status commands", () => {
    const result = buildFallbackActivity("execShell", { cmd: "git status" });
    expect(result?.title).toBe("检查改动");
    expect(result?.detail).toBe("git status");
  });

  it("classifies git commit commands", () => {
    const result = buildFallbackActivity("execShell", { cmd: 'git commit -m "init"' });
    expect(result?.title).toBe("提交");
  });

  it("classifies git push as short 推送", () => {
    const result = buildFallbackActivity("execShell", { cmd: "git push origin alpha" });
    expect(result?.title).toBe("推送");
  });

  it("classifies test commands", () => {
    const result = buildFallbackActivity("execShell", { cmd: "bun test src/" });
    expect(result?.title).toBe("运行测试");
  });

  it("classifies rg/grep commands", () => {
    const result = buildFallbackActivity("execShell", { cmd: "rg -n 'useState' src/" });
    expect(result?.title).toContain("搜索");
  });

  it("classifies build commands", () => {
    const result = buildFallbackActivity("execShell", { cmd: "npm run build" });
    expect(result?.title).toBe("构建项目");
  });

  it("classifies install commands", () => {
    const result = buildFallbackActivity("execShell", { cmd: "bun install" });
    expect(result?.title).toBe("安装依赖");
  });

  it("falls back to generic for unknown commands", () => {
    const result = buildFallbackActivity("execShell", { cmd: "ls -la" });
    expect(result?.title).toBe("运行命令");
  });

  it("truncates long command detail", () => {
    const longCmd = "echo " + "a".repeat(200);
    const result = buildFallbackActivity("execShell", { cmd: longCmd });
    expect(result?.detail?.length).toBeLessThanOrEqual(120);
    expect(result?.detail).toContain("...");
  });

  it("returns undefined for unknown tool names", () => {
    expect(buildFallbackActivity("unknownTool", { foo: "bar" })).toBeUndefined();
  });

  it("returns undefined when path is missing", () => {
    expect(buildFallbackActivity("readFile", {})).toBeUndefined();
  });

  it("returns undefined for empty args", () => {
    expect(buildFallbackActivity("readFile", undefined)).toBeUndefined();
  });

  it("builds loadSkill fallback activity from input name", () => {
    expect(buildFallbackActivity("loadSkill", { name: "search-first" })).toEqual({
      title: "加载技能",
      detail: "search-first",
    });
    expect(buildFallbackActivity("loadSkill", {})).toBeUndefined();
  });
});

describe("buildActivityTimeline", () => {
  it("merges declared activity plan phases with observed tool actions", () => {
    const timeline = buildActivityTimeline(
      [
        {
          id: "tool-1",
          toolName: "searchFiles",
          metadata: {
            activity: {
              phase: { id: "find-api", title: "查找 API 文档与接口" },
              action: { title: "查找 API 文档入口", detail: "World Bank DataBank API" },
            },
          },
        },
        {
          id: "tool-2",
          toolName: "execShell",
          metadata: {
            activity: {
              phase: { id: "fetch-data", title: "调用 API 获取数据" },
              action: { title: "执行数据分析脚本", detail: "python wb_data_analysis.py" },
            },
          },
        },
      ],
      {
        title: "任务进度",
        phases: [
          { id: "find-api", title: "查找 API 文档与接口" },
          { id: "fetch-data", title: "调用 API 获取数据" },
          { id: "analyze", title: "分析数据并比较增长率" },
          { id: "report", title: "汇总结果并回复用户" },
        ],
      }
    );

    expect(timeline.totalPhases).toBe(4);
    expect(timeline.completedPhases).toBe(2);
    expect(timeline.phases.map((phase) => [phase.id, phase.title, phase.status])).toEqual([
      ["find-api", "查找 API 文档与接口", "success"],
      ["fetch-data", "调用 API 获取数据", "success"],
      ["analyze", "分析数据并比较增长率", "pending"],
      ["report", "汇总结果并回复用户", "pending"],
    ]);
    expect(timeline.phases[0].actions.map((action) => action.label)).toEqual([
      "查找 API 文档入口 · World Bank DataBank API",
    ]);
    expect(timeline.phases[2].actions).toEqual([]);
  });

  it("reads activity plan from tool metadata even when that message has no action", () => {
    const timeline = buildActivityTimeline([
      {
        id: "tool-plan",
        toolName: "readFile",
        metadata: {
          activity: {
            plan: {
              phases: [
                { id: "inspect", title: "检查输入" },
                { id: "execute", title: "执行处理" },
                { id: "report", title: "汇报结果" },
              ],
            },
          },
        },
      },
      {
        id: "tool-action",
        toolName: "execShell",
        metadata: {
          activity: {
            phase: { id: "execute", title: "执行处理" },
            action: { title: "运行脚本", detail: "python main.py" },
          },
        },
      },
    ]);

    expect(timeline.totalPhases).toBe(3);
    expect(timeline.phases.map((phase) => [phase.id, phase.status])).toEqual([
      ["inspect", "pending"],
      ["execute", "success"],
      ["report", "pending"],
    ]);
  });

  it("groups explicit tool activity actions under stable phases", () => {
    const messages = [
      {
        id: "tool-1",
        toolName: "searchFiles",
        metadata: {
          activity: {
            phase: {
              id: "inspect-api",
              title: "查找 World Bank DataBank API 文档与接口",
              index: 1,
              total: 4,
            },
            action: {
              title: "查找 API 文档入口",
              kind: "search",
              detail: "World Bank DataBank API",
            },
          },
        },
      },
      {
        id: "tool-2",
        toolName: "execShell",
        metadata: {
          activity: {
            phase: {
              id: "fetch-data",
              title: "调用 API 获取互联网用户数据",
              index: 2,
              total: 4,
            },
            action: {
              title: "执行数据分析脚本",
              kind: "terminal",
              detail: "python wb_data_analysis.py",
            },
          },
        },
      },
      {
        id: "tool-3",
        toolName: "writeFile",
        metadata: {
          activity: {
            phase: {
              id: "fetch-data",
              title: "调用 API 获取互联网用户数据",
              index: 2,
              total: 4,
            },
            action: {
              title: "编写 Python 脚本获取数据",
              kind: "write",
              refs: [{ type: "file", path: "wb_data_analysis.py" }],
            },
          },
        },
      },
    ];

    const timeline = buildActivityTimeline(messages);

    expect(timeline.totalPhases).toBe(4);
    expect(timeline.completedPhases).toBe(2);
    expect(timeline.phases).toHaveLength(2);
    expect(timeline.phases[0]).toMatchObject({
      id: "inspect-api",
      title: "查找 World Bank DataBank API 文档与接口",
      index: 1,
      total: 4,
      status: "success",
    });
    expect(timeline.phases[0].actions.map((action) => action.label)).toEqual([
      "查找 API 文档入口 · World Bank DataBank API",
    ]);
    expect(timeline.phases[1]).toMatchObject({
      id: "fetch-data",
      title: "调用 API 获取互联网用户数据",
      index: 2,
      total: 4,
      status: "success",
    });
    expect(timeline.phases[1].actions.map((action) => action.label)).toEqual([
      "执行数据分析脚本 · python wb_data_analysis.py",
      "编写 Python 脚本获取数据 · wb_data_analysis.py",
    ]);
  });

  it("falls back to one implicit phase when activity has no phase", () => {
    const timeline = buildActivityTimeline([
      {
        id: "tool-1",
        toolName: "readFile",
        toolPayload: { input: { path: "src/Home.tsx" } },
      },
      {
        id: "tool-2",
        toolName: "execShell",
        toolPayload: { input: { cmd: "git status --short" } },
      },
    ]);

    expect(timeline.totalPhases).toBe(1);
    expect(timeline.completedPhases).toBe(1);
    expect(timeline.phases).toHaveLength(1);
    expect(timeline.phases[0].title).toBe("执行工具步骤");
    expect(timeline.phases[0].actions.map((action) => action.label)).toEqual([
      "查看相关文件 · src/Home.tsx",
      "检查改动 · git status --short",
    ]);
  });

  it("aggregates running and failed status from tool messages", () => {
    const timeline = buildActivityTimeline([
      {
        id: "running-tool",
        toolName: "execShell",
        isStreaming: true,
        metadata: {
          activity: {
            phase: { id: "verify", title: "验证结果" },
            action: { title: "运行测试", detail: "bun test" },
          },
        },
      },
      {
        id: "failed-tool",
        toolName: "execShell",
        toolPayload: { status: "failed", error: { message: "boom" } },
        metadata: {
          activity: {
            phase: { id: "verify", title: "验证结果" },
            action: { title: "检查失败日志" },
          },
        },
      },
    ]);

    expect(timeline.phases[0].status).toBe("running");
    expect(timeline.phases[0].actions.map((action) => action.status)).toEqual([
      "running",
      "failed",
    ]);
  });

  it("counts assistant phase completion signals without requiring a tool action", () => {
    const plan = {
      phases: [
        { id: "inspect", title: "查找 API 文档" },
        { id: "fetch", title: "获取数据" },
        { id: "analyze", title: "分析数据" },
        { id: "report", title: "汇报结果" },
      ],
    };
    const timeline = buildActivityTimeline([
      {
        id: "tool-plan",
        role: "tool",
        toolName: "fetchWebpage",
        metadata: {
          activity: {
            plan,
            phase: { id: "inspect", title: "查找 API 文档" },
            action: { title: "查找文档入口" },
          },
        },
      },
      {
        id: "tool-fetch",
        role: "tool",
        toolName: "execShell",
        metadata: {
          activity: {
            phase: { id: "fetch", title: "获取数据" },
            action: { title: "运行数据脚本" },
          },
        },
      },
      {
        id: "assistant-analysis",
        role: "assistant",
        content: "增长最快的国家已经计算出来。",
        metadata: {
          activity: {
            phase: { id: "analyze", title: "分析数据", status: "success" },
          },
        },
      },
      {
        id: "assistant-final",
        role: "assistant",
        content: "已汇报最终结果。",
        metadata: {
          activity: {
            phase: { id: "report", title: "汇报结果", status: "success" },
          },
        },
      },
    ] as any[]);

    expect(timeline.completedPhases).toBe(4);
    expect(timeline.phases.map((phase) => [phase.id, phase.status, phase.actions.length])).toEqual([
      ["inspect", "success", 1],
      ["fetch", "success", 1],
      ["analyze", "success", 0],
      ["report", "success", 0],
    ]);
  });
});
