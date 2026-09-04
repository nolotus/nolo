import { describe, expect, it } from "bun:test";
import {
  buildToolCallContext,
  buildToolCallMeta,
  buildToolCallPresentation,
  buildToolCallTarget,
  formatToolCallDuration,
  formatToolDurationMs,
  formatToolGroupStatusSummary,
  isToolCallFailed,
  readToolCallActivity,
  readToolCallArgs,
  resolveToolCallMode,
  resolveToolCallStatus,
  summarizeToolCallStatuses,
} from "./toolCallPresentation";

const zhTranslator = (key: string, fallback: string) => {
  // Simulate an i18n store that only overrides one key; everything else misses.
  if (key === "toolGroup.totalCalls") return "{{count}} calls";
  return fallback;
};

describe("resolveToolCallStatus", () => {
  it("keeps explicit payload statuses without inventing motion", () => {
    expect(resolveToolCallStatus({ toolPayload: { status: "failed" } })).toBe("failed");
    expect(resolveToolCallStatus({ toolPayload: { status: "cancelled" } })).toBe("cancelled");
    expect(resolveToolCallStatus({ toolPayload: { status: "pending" } })).toBe("pending");
    expect(resolveToolCallStatus({ toolPayload: { status: "success" } })).toBe("success");
  });

  it("keeps legacy repairing as a compat extension", () => {
    expect(resolveToolCallStatus({ toolPayload: { status: "repairing" } })).toBe("repairing");
  });

  it("treats streaming rows as running and settled rows as success", () => {
    expect(resolveToolCallStatus({ isStreaming: true, content: "{}" })).toBe("running");
    expect(resolveToolCallStatus({ content: "{\"ok\":true}" })).toBe("success");
  });

  it("derives failure from payload / content error signals", () => {
    expect(resolveToolCallStatus({ toolPayload: { error: "boom" } })).toBe("failed");
    expect(resolveToolCallStatus({ content: "{\"error\":\"boom\"}" })).toBe("failed");
    expect(isToolCallFailed({ content: "{\"error\":\"boom\"}" })).toBe(true);
    expect(isToolCallFailed({ content: "{\"ok\":true}" })).toBe(false);
  });
});

describe("readToolCallArgs / readToolCallActivity", () => {
  it("prefers toolPayload.input, then metadata projections, then content JSON", () => {
    expect(readToolCallArgs({ toolPayload: { input: { path: "a.ts" } } })).toEqual({ path: "a.ts" });
    expect(readToolCallArgs({ metadata: { command: "git status" } })).toEqual({ command: "git status" });
    expect(readToolCallArgs({ content: "{\"query\":\"hooks\"}" })).toEqual({ query: "hooks" });
    expect(readToolCallArgs({ content: "plain text" })).toBeUndefined();
  });

  it("uses explicit activity titles before fallback mapping", () => {
    const explicit = readToolCallActivity({
      toolName: "readFile",
      metadata: { activity: { action: { title: "读取配置" } } },
    });
    expect(explicit?.title).toBe("读取配置");

    const fallback = readToolCallActivity({
      toolName: "execShell",
      toolPayload: { input: { cmd: "git status -sb" } },
    });
    expect(fallback?.title).toBe("检查改动");
    expect(fallback?.detail).toBe("git status -sb");

    expect(readToolCallActivity({ toolName: "unknownTool" })).toBeUndefined();
  });

  it("shortens legacy version-control activity titles", () => {
    const legacy = readToolCallActivity({
      metadata: { activity: { action: { title: "用版本管理检查改动" } } },
    });
    expect(legacy?.title).toBe("检查改动");
  });
});

describe("buildToolCallTarget", () => {
  it("maps common tools to their operand", () => {
    expect(buildToolCallTarget("readFile", { path: "README.md" })).toBe("README.md");
    expect(buildToolCallTarget("codeSearch", { query: "useEffect" })).toBe("useEffect");
    expect(buildToolCallTarget("fetchWebpage", { url: "https://example.com" })).toBe(
      "https://example.com"
    );
    expect(buildToolCallTarget("globFiles", { pattern: "**/*.ts" })).toBe("**/*.ts");
    expect(buildToolCallTarget("loadSkill", { name: "nolo-plan" })).toBe("nolo-plan");
  });

  it("truncates long commands and returns undefined for unknown tools", () => {
    const longCmd = "bun test " + "x".repeat(120);
    const target = buildToolCallTarget("execShell", { cmd: longCmd });
    expect(target!.length).toBeLessThanOrEqual(80);
    expect(target!.endsWith("…")).toBe(true);
    expect(buildToolCallTarget("mysteryTool", { foo: 1 })).toBeUndefined();
    expect(buildToolCallTarget("readFile", undefined)).toBeUndefined();
  });
});

describe("buildToolCallContext — only real renderer fields, never guessed", () => {
  it("reads execShell cwd from the projected output / args", () => {
    expect(
      buildToolCallContext("execShell", { cmd: "ls" }, { command: "ls", cwd: "/repo" })
    ).toBe("/repo");
    expect(buildToolCallContext("execShell", { cmd: "ls", cwd: "/args" }, {})).toBe("/args");
    expect(buildToolCallContext("execShell", { cmd: "ls" }, {})).toBeUndefined();
  });

  it("reads readFile line ranges from startLine/endLine response fields", () => {
    expect(
      buildToolCallContext("readFile", { path: "a.ts" }, { startLine: 5, endLine: 9 })
    ).toBe("L5–L9");
    expect(
      buildToolCallContext("readFile", { path: "a.ts" }, { response: { startLine: 2, endLine: 4 } })
    ).toBe("L2–L4");
    // Incomplete / nonsensical ranges stay undefined.
    expect(buildToolCallContext("readFile", { path: "a.ts" }, { startLine: 5 })).toBeUndefined();
    expect(
      buildToolCallContext("readFile", { path: "a.ts" }, { startLine: 9, endLine: 2 })
    ).toBeUndefined();
  });

  it("returns undefined for tools without a grounded context field", () => {
    expect(buildToolCallContext("codeSearch", { query: "x" }, { anything: 1 })).toBeUndefined();
    expect(buildToolCallContext("globFiles", { pattern: "*" }, {})).toBeUndefined();
  });
});

describe("buildToolCallMeta — diff only when real added/removed exist", () => {
  it("accepts top-level or summary-nested non-negative numbers", () => {
    expect(buildToolCallMeta({ added: 3, removed: 1 })).toEqual({ diff: { added: 3, removed: 1 } });
    expect(buildToolCallMeta({ summary: { added: 0, removed: 0 } })).toEqual({
      diff: { added: 0, removed: 0 },
    });
  });

  it("stays undefined unless BOTH fields really exist", () => {
    expect(buildToolCallMeta({ added: 3 })).toBeUndefined();
    expect(buildToolCallMeta({ removed: 2 })).toBeUndefined();
    expect(buildToolCallMeta({ added: -1, removed: 1 })).toBeUndefined();
    expect(buildToolCallMeta({ added: "3", removed: 1 })).toBeUndefined();
    expect(buildToolCallMeta(undefined)).toBeUndefined();
  });
});

describe("formatToolDurationMs / formatToolCallDuration", () => {
  it("formats real spans only — never invents timing data", () => {
    expect(formatToolDurationMs(850)).toBe("850ms");
    expect(formatToolDurationMs(1200)).toBe("1.2s");
    expect(formatToolCallDuration(1000, 1850)).toBe("850ms");
    expect(formatToolCallDuration(undefined, 2000)).toBeNull();
    expect(formatToolCallDuration(2000, 1000)).toBeNull();
    expect(formatToolCallDuration(1000, 1000)).toBeNull();
  });
});

describe("resolveToolCallMode", () => {
  it("classifies interactive / handoff / artifact / row", () => {
    expect(resolveToolCallMode("ask_user")).toBe("interactive");
    expect(resolveToolCallMode("runStreamingAgent")).toBe("handoff");
    expect(resolveToolCallMode("applyDiff")).toBe("artifact");
    expect(resolveToolCallMode("setTodoList")).toBe("artifact");
    expect(resolveToolCallMode("readFile")).toBe("row");
    expect(resolveToolCallMode("execShell")).toBe("row");
    expect(resolveToolCallMode("mysteryTool")).toBe("row");
  });
});

describe("buildToolCallPresentation — contract fields", () => {
  it("maps a settled file read onto verb/target/durationMs/row", () => {
    const presentation = buildToolCallPresentation({
      id: "m1",
      role: "tool",
      toolName: "readFile",
      toolPayload: {
        input: { path: "packages/chat/README.md" },
        startedAt: 1000,
        finishedAt: 1500,
      },
      content: "{\"ok\":true}",
    });
    expect(presentation.key).toBe("m1");
    expect(presentation.verb).toBe("读取");
    expect(presentation.target).toBe("packages/chat/README.md");
    expect(presentation.context).toBeUndefined();
    expect(presentation.status).toBe("success");
    expect(presentation.durationMs).toBe(500);
    expect(presentation.meta).toBeUndefined();
    expect(presentation.mode).toBe("row");
    expect(presentation.expandable).toBe(true);
    // Compat aliases stay filled.
    expect(presentation.label).toBe("查看相关文件");
    expect(presentation.detail).toBe("packages/chat/README.md");
    expect(presentation.duration).toBe("500ms");
    expect(presentation.errorMessage).toBeUndefined();
  });

  it("surfaces grounded context for shell cwd and readFile ranges", () => {
    const shell = buildToolCallPresentation({
      id: "m-shell",
      toolName: "execShell",
      toolPayload: { input: { cmd: "bun test" } },
      content: JSON.stringify({ command: "bun test", cwd: "/repo", stdout: "ok" }),
    });
    expect(shell.verb).toBe("命令");
    expect(shell.target).toBe("bun test");
    expect(shell.context).toBe("/repo");

    const reader = buildToolCallPresentation({
      id: "m-read",
      toolName: "readFile",
      toolPayload: { input: { path: "a.ts" } },
      content: JSON.stringify({ startLine: 3, endLine: 7 }),
    });
    expect(reader.context).toBe("L3–L7");
  });

  it("maps common verbs: 修改 / 命令 / 搜索 / 网页搜索 / 查找文件 / 加载技能", () => {
    expect(
      buildToolCallPresentation({ toolName: "editFile", toolPayload: { input: { path: "a.ts" } } }).verb
    ).toBe("修改");
    expect(
      buildToolCallPresentation({ toolName: "codeSearch", toolPayload: { input: { query: "x" } } }).verb
    ).toBe("搜索");
    expect(
      buildToolCallPresentation({ toolName: "exa_search", toolPayload: { input: { query: "x" } } }).verb
    ).toBe("网页搜索");
    expect(
      buildToolCallPresentation({ toolName: "globFiles", toolPayload: { input: { pattern: "*" } } }).verb
    ).toBe("查找文件");
    expect(
      buildToolCallPresentation({ toolName: "loadSkill", toolPayload: { input: { name: "s" } } }).verb
    ).toBe("加载技能");
    expect(
      buildToolCallPresentation({ toolName: "fetchWebpage", toolPayload: { input: { url: "https://x" } } })
        .target
    ).toBe("https://x");
  });

  it("keeps modes for tools that never enter ordinary groups", () => {
    const interactive = buildToolCallPresentation({ id: "m-ask", toolName: "ask_user", content: "{}" });
    expect(interactive.mode).toBe("interactive");
    expect(interactive.expandable).toBe(false);
    expect(interactive.verb).toBe("提问");

    const handoff = buildToolCallPresentation({
      id: "m-handoff",
      toolName: "runStreamingAgent",
      content: "{}",
    });
    expect(handoff.mode).toBe("handoff");
    expect(handoff.expandable).toBe(false);
    expect(handoff.verb).toBe("转交");

    const artifact = buildToolCallPresentation({ id: "m-card", toolName: "appDeploy", content: "{}" });
    expect(artifact.mode).toBe("artifact");
    expect(artifact.expandable).toBe(false);
  });

  it("omits durationMs/meta without real data and reports cancelled rows", () => {
    const cancelled = buildToolCallPresentation({
      id: "m-cancel",
      toolName: "execShell",
      toolPayload: { input: { cmd: "sleep 30" }, status: "cancelled" },
      content: "{}",
    });
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.durationMs).toBeUndefined();
    expect(cancelled.duration).toBeNull();
    expect(cancelled.meta).toBeUndefined();

    const faked = buildToolCallPresentation({
      id: "m-fake",
      toolName: "readFile",
      toolPayload: { input: { path: "a.ts" }, startedAt: 2000, finishedAt: 1000 },
      content: "{\"ok\":true}",
    });
    expect(faked.durationMs).toBeUndefined();
    expect(faked.duration).toBeNull();

    const diffed = buildToolCallPresentation({
      id: "m-diff",
      toolName: "replaceWorkspaceText",
      toolPayload: { input: { path: "a.ts" } },
      content: JSON.stringify({ added: 4, removed: 2 }),
    });
    expect(diffed.verb).toBe("修改");
    expect(diffed.meta?.diff).toEqual({ added: 4, removed: 2 });
  });

  it("falls back to the translated tool name as verb when no verb mapping applies", () => {
    const presentation = buildToolCallPresentation(
      { id: "m2", toolName: "listAgents", content: "[]" },
      (key, fallback) => (key === "toolNames.listAgents" ? "列出助手" : fallback)
    );
    expect(presentation.verb).toBe("列出助手");
    expect(presentation.target).toBeUndefined();
    expect(presentation.durationMs).toBeUndefined();
  });

  it("never leaves the key undefined even for id-less legacy rows", () => {
    expect(buildToolCallPresentation({ tool_call_id: "call-9" }).key).toBe("call-9");
    expect(buildToolCallPresentation({}).key).toBe("tool-call");
  });
});

describe("summarizeToolCallStatuses / formatToolGroupStatusSummary", () => {
  it("counts total / running / failed from raw messages", () => {
    const counts = summarizeToolCallStatuses([
      { toolName: "readFile", content: "{}" },
      { toolName: "execShell", isStreaming: true, content: "{}" },
      { toolName: "writeFile", toolPayload: { status: "failed" }, content: "{}" },
    ]);
    expect(counts).toEqual({ total: 3, running: 1, failed: 1 });
  });

  it("renders the compact summary with running/failed segments only when non-zero", () => {
    expect(
      formatToolGroupStatusSummary({ total: 3, running: 0, failed: 0 })
    ).toBe("3 个调用");
    expect(
      formatToolGroupStatusSummary({ total: 3, running: 1, failed: 1 })
    ).toBe("3 个调用 · 1 个运行中 · 1 个失败");
  });

  it("routes through the translator so locales can override segments", () => {
    expect(
      formatToolGroupStatusSummary({ total: 2, running: 0, failed: 0 }, zhTranslator)
    ).toBe("2 calls");
    expect(
      formatToolGroupStatusSummary({ total: 2, running: 1, failed: 0 }, zhTranslator)
    ).toBe("2 calls · 1 个运行中");
  });
});
