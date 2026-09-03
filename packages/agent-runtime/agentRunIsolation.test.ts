import { describe, expect, it } from "bun:test";

import {
  ORCHESTRATION_TOOL_NAMES,
  SUBTASK_REMOVED_TOOL_NAMES,
  INTERACTION_REQUIRED_TOOL_NAMES,
  filterToolNamesForRunKind,
  isSubtaskRun,
  subtaskBlockedToolNames,
  hasRunWakeChannel,
  RUN_WAKE_CHANNEL_ENV,
} from "./agentRunIsolation";

describe("isSubtaskRun", () => {
  it("returns false when env is undefined", () => {
    expect(isSubtaskRun(undefined)).toBe(false);
  });

  it("returns false when NOLO_AGENT_RUN_CHILD is absent", () => {
    expect(isSubtaskRun({})).toBe(false);
    expect(isSubtaskRun({ OTHER_VAR: "1" })).toBe(false);
  });

  it("returns false for empty string or '0'", () => {
    expect(isSubtaskRun({ NOLO_AGENT_RUN_CHILD: "" })).toBe(false);
    expect(isSubtaskRun({ NOLO_AGENT_RUN_CHILD: "0" })).toBe(false);
  });

  it("returns true when NOLO_AGENT_RUN_CHILD is '1' (CLI child dispatch signal)", () => {
    expect(isSubtaskRun({ NOLO_AGENT_RUN_CHILD: "1" })).toBe(true);
  });

  it("returns true for any non-empty non-'0' value (defensive)", () => {
    expect(isSubtaskRun({ NOLO_AGENT_RUN_CHILD: "true" })).toBe(true);
    expect(isSubtaskRun({ NOLO_AGENT_RUN_CHILD: "background" })).toBe(true);
  });
});

describe("filterToolNamesForRunKind", () => {
  const fullToolSurface = [
    // 干活工具（必须保留）
    "readFile",
    "writeFile",
    "editFile",
    "globFiles",
    "execShell",
    // 编排工具（subtask 移除）
    "startAgentRun",
    "controlAgentRun",
    "listAgents",
    "readAgent",
    "runStreamingAgent",
    // 交互工具（subtask 移除）
    "ask_user",
  ];

  it("returns the list unchanged for interactive runs (zero behavior change)", () => {
    const result = filterToolNamesForRunKind(fullToolSurface, false);
    expect(result).toEqual(fullToolSurface);
  });

  it("removes orchestration + interaction tools for subtask runs", () => {
    const result = filterToolNamesForRunKind(fullToolSurface, true);
    // 干活工具保留
    expect(result).toContain("readFile");
    expect(result).toContain("writeFile");
    expect(result).toContain("editFile");
    expect(result).toContain("globFiles");
    expect(result).toContain("execShell");
    // 编排工具移除
    expect(result).not.toContain("startAgentRun");
    expect(result).not.toContain("controlAgentRun");
    expect(result).not.toContain("listAgents");
    expect(result).not.toContain("readAgent");
    expect(result).not.toContain("runStreamingAgent");
    // 交互工具移除（子任务无用户交互通道）
    expect(result).not.toContain("ask_user");
  });

  it("returns empty array for empty input regardless of run kind", () => {
    expect(filterToolNamesForRunKind([], false)).toEqual([]);
    expect(filterToolNamesForRunKind([], true)).toEqual([]);
  });

  it("preserves tool order for interactive runs", () => {
    const result = filterToolNamesForRunKind(fullToolSurface, false);
    expect(result).toEqual(fullToolSurface);
  });

  it("preserves relative order of kept tools for subtask runs", () => {
    const result = filterToolNamesForRunKind(fullToolSurface, true);
    const expectedKept = [
      "readFile",
      "writeFile",
      "editFile",
      "globFiles",
      "execShell",
    ];
    expect(result).toEqual(expectedKept);
  });
});

describe("subtaskBlockedToolNames", () => {
  it("returns the full subtask removal set as a mutable array", () => {
    const blocked = subtaskBlockedToolNames();
    expect(blocked).toEqual([...SUBTASK_REMOVED_TOOL_NAMES]);
    // Every orchestration + interaction name is present
    for (const name of ORCHESTRATION_TOOL_NAMES) {
      expect(blocked).toContain(name);
    }
    for (const name of INTERACTION_REQUIRED_TOOL_NAMES) {
      expect(blocked).toContain(name);
    }
  });
});

describe("tool name sets", () => {
  it("orchestration set covers all dispatch/introspect tools", () => {
    expect(ORCHESTRATION_TOOL_NAMES.has("startAgentRun")).toBe(true);
    expect(ORCHESTRATION_TOOL_NAMES.has("controlAgentRun")).toBe(true);
    expect(ORCHESTRATION_TOOL_NAMES.has("listAgents")).toBe(true);
    expect(ORCHESTRATION_TOOL_NAMES.has("readAgent")).toBe(true);
    expect(ORCHESTRATION_TOOL_NAMES.has("runStreamingAgent")).toBe(true);
  });
});

describe("hasRunWakeChannel", () => {
  it("只认赋值点写下的显式标记", () => {
    expect(hasRunWakeChannel({ [RUN_WAKE_CHANNEL_ENV]: "1" })).toBe(true);
    expect(hasRunWakeChannel({ [RUN_WAKE_CHANNEL_ENV]: "yes" })).toBe(true);
  });

  it("缺失 / 空串 / \"0\" 都算没有唤醒通道", () => {
    // 非交互模式（管道 / print）走同一份 TUI 代码但从不写这个标记——
    // 它必须默认为「没有」，否则那些宿主会连 wait 一起失去。
    expect(hasRunWakeChannel(undefined)).toBe(false);
    expect(hasRunWakeChannel({})).toBe(false);
    expect(hasRunWakeChannel({ [RUN_WAKE_CHANNEL_ENV]: "" })).toBe(false);
    expect(hasRunWakeChannel({ [RUN_WAKE_CHANNEL_ENV]: "0" })).toBe(false);
  });
});
