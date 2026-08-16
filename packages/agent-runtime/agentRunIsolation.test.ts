import { describe, expect, it } from "bun:test";

import {
  ORCHESTRATION_TOOL_NAMES,
  SUBTASK_REMOVED_GIT_TOOL_NAMES,
  SUBTASK_REMOVED_TOOL_NAMES,
  filterToolNamesForRunKind,
  isSubtaskRun,
  subtaskBlockedToolNames,
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
    "searchFiles",
    "execShell",
    // 只读 git（subtask 保留）
    "gitStatus",
    "gitDiff",
    // 编排工具（subtask 移除）
    "startAgentRun",
    "controlAgentRun",
    "listAgents",
    "readAgent",
    "runStreamingAgent",
    "streamParallelAgents",
    "startAgentDialog",
    // git 写工具（subtask 移除）
    "gitAdd",
    "gitCommit",
    "gitCreateBranch",
    "commitWorkspace",
  ];

  it("returns the list unchanged for interactive runs (zero behavior change)", () => {
    const result = filterToolNamesForRunKind(fullToolSurface, false);
    expect(result).toEqual(fullToolSurface);
  });

  it("removes orchestration + git-write tools for subtask runs", () => {
    const result = filterToolNamesForRunKind(fullToolSurface, true);
    // 干活工具保留
    expect(result).toContain("readFile");
    expect(result).toContain("writeFile");
    expect(result).toContain("editFile");
    expect(result).toContain("globFiles");
    expect(result).toContain("searchFiles");
    expect(result).toContain("execShell");
    // 只读 git 保留
    expect(result).toContain("gitStatus");
    expect(result).toContain("gitDiff");
    // 编排工具移除
    expect(result).not.toContain("startAgentRun");
    expect(result).not.toContain("controlAgentRun");
    expect(result).not.toContain("listAgents");
    expect(result).not.toContain("readAgent");
    expect(result).not.toContain("startAgentRun");
    expect(result).not.toContain("runStreamingAgent");
    expect(result).not.toContain("streamParallelAgents");
    expect(result).not.toContain("startAgentDialog");
    // git 写工具移除
    expect(result).not.toContain("gitAdd");
    expect(result).not.toContain("gitCommit");
    expect(result).not.toContain("gitCreateBranch");
    expect(result).not.toContain("commitWorkspace");
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
      "searchFiles",
      "execShell",
      "gitStatus",
      "gitDiff",
    ];
    expect(result).toEqual(expectedKept);
  });
});

describe("subtaskBlockedToolNames", () => {
  it("returns the full subtask removal set as a mutable array", () => {
    const blocked = subtaskBlockedToolNames();
    expect(blocked).toEqual([...SUBTASK_REMOVED_TOOL_NAMES]);
    // Every orchestration + git-write name is present
    for (const name of ORCHESTRATION_TOOL_NAMES) {
      expect(blocked).toContain(name);
    }
    for (const name of SUBTASK_REMOVED_GIT_TOOL_NAMES) {
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
    expect(ORCHESTRATION_TOOL_NAMES.has("startAgentDialog")).toBe(true);
    expect(ORCHESTRATION_TOOL_NAMES.has("runStreamingAgent")).toBe(true);
    expect(ORCHESTRATION_TOOL_NAMES.has("streamParallelAgents")).toBe(true);
  });

  it("git-write set covers all mutating git tools", () => {
    expect(SUBTASK_REMOVED_GIT_TOOL_NAMES.has("gitAdd")).toBe(true);
    expect(SUBTASK_REMOVED_GIT_TOOL_NAMES.has("gitCommit")).toBe(true);
    expect(SUBTASK_REMOVED_GIT_TOOL_NAMES.has("gitCreateBranch")).toBe(true);
    expect(SUBTASK_REMOVED_GIT_TOOL_NAMES.has("commitWorkspace")).toBe(true);
  });

  it("read-only git is NOT in the removed set", () => {
    expect(SUBTASK_REMOVED_GIT_TOOL_NAMES.has("gitStatus")).toBe(false);
    expect(SUBTASK_REMOVED_GIT_TOOL_NAMES.has("gitDiff")).toBe(false);
  });
});