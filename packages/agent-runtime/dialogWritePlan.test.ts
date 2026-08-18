import { describe, expect, test } from "bun:test";

import { buildAgentRuntimeDialogWritePlan } from "./dialogWritePlan";

describe("agent runtime dialog write plan", () => {
  test("persists assistant reasoning_content on the message record", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        messages: [
          { role: "user", content: "写个总结" },
          {
            role: "assistant",
            content: "总结正文",
            reasoning_content: "我先把问题拆开……",
          },
        ],
        result: { content: "总结正文", model: "m" },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "01LOCAL",
      runtimeHost: "cli",
    });

    const assistantOp = plan.ops.find(
      (op) => op.value?.role === "assistant"
    );
    expect(assistantOp?.value?.content).toBe("总结正文");
    expect(assistantOp?.value?.reasoning_content).toBe("我先把问题拆开……");
  });

  test("exposes the resolved dialog title on the plan result", () => {
    // TUI displays plan.title instead of the raw dialogId; without this field
    // the dialog label falls back to a UUID even when an LLM title exists.
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        messages: [{ role: "user", content: "写个总结" }],
        result: { content: "总结正文", model: "m" },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "01LOCAL",
      runtimeHost: "cli",
    });
    expect(plan.dialogId).toBe("01LOCAL");
    expect(typeof plan.title).toBe("string");
    expect(plan.title.length).toBeGreaterThan(0);
  });

  test("persists the full user content and its compact context reference separately", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        messages: [{
          role: "user",
          content: "full pasted body",
          context_reference: "[paste #1 · 200 lines; full content available via readPastedText(pasteId=1)]",
        }],
        result: { content: "done", model: "m" },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "01REFERENCE",
      runtimeHost: "cli",
    });

    const userOp = plan.ops.find((op) => op.value?.role === "user");
    expect(userOp?.value?.content).toBe("full pasted body");
    expect(userOp?.value?.contextReference).toContain("readPastedText");
  });

  test("builds dialog metadata and message write ops for a local runtime turn", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        messages: [
          { role: "system", content: "System prompt" },
          { role: "user", content: "make it cleaner" },
          { role: "assistant", content: "done" },
        ],
        result: {
          content: "done",
          model: "custom-coder",
          provider: "custom",
          usage: { prompt_tokens: 4, completion_tokens: 3 },
          toolCallCount: 1,
        },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "01LOCAL",
      runtimeHost: "desktop",
      runtimeMetadata: { app: "desktop" },
    });

    expect(plan.dialogId).toBe("01LOCAL");
    expect(plan.ops.map((op) => op.key)).toEqual([
      "dialog-user-1-01LOCAL",
      "dialog-01LOCAL-msg-1710000000000-001",
      "dialog-01LOCAL-msg-1710000000000-002",
    ]);
    expect(plan.ops[0]?.value).toMatchObject({
      id: "01LOCAL",
      dbKey: "dialog-user-1-01LOCAL",
      type: "dialog",
      userId: "user-1",
      cybots: ["agent-user-1-frontend"],
      primaryAgentKey: "agent-user-1-frontend",
      title: "make it cleaner",
      status: "done",
      triggerType: "desktop-local",
      executionMode: "foreground",
      createdAt: "2024-03-09T16:00:00.000Z",
      updatedAt: "2024-03-09T16:00:00.000Z",
      finishedAt: 1710000000000,
      usage: { prompt_tokens: 4, completion_tokens: 3 },
      toolCallCount: 1,
      localRuntime: {
        host: "desktop",
        app: "desktop",
      },
    });
  });

  test("keeps an auto dialog unbound while recording the executing key on its assistant message", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
        messages: [
          { role: "user", content: "hello" },
          { role: "assistant", content: "hi" },
        ],
        result: { content: "hi", model: "deepseek-v4-flash", provider: "nolo" },
        runtimeContext: { dialogAgentMode: "auto" },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "01AUTO",
      runtimeHost: "cli",
    });

    expect(plan.ops[0]?.value).toMatchObject({
      agentMode: "auto",
      cybots: [],
    });
    expect(plan.ops[0]?.value?.primaryAgentKey).toBeUndefined();
    const assistantOp = plan.ops.find((op) => op.value?.role === "assistant");
    expect(assistantOp?.value).toMatchObject({
      agentKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
      cybotKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
    });
  });

  test("lets an explicit fixed turn replace an existing auto dialog policy", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-selected",
        messages: [{ role: "user", content: "use this agent" }],
        result: { content: "done", model: "custom", provider: "custom" },
        runtimeContext: { dialogAgentMode: "fixed" },
        continueDialogId: "01AUTO",
      },
      existingDialog: {
        id: "01AUTO",
        agentMode: "auto",
        cybots: [],
        title: "Existing auto",
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "unused",
      runtimeHost: "cli",
    });

    expect(plan.ops[0]?.value).toMatchObject({
      agentMode: "fixed",
      primaryAgentKey: "agent-user-1-selected",
      cybots: ["agent-user-1-selected"],
    });
  });

  test("persists explicit dialog routing metadata for a new local runtime turn", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        messages: [{ role: "user", content: "branch this dialog" }],
        result: { content: "done", model: "custom-coder", provider: "custom" },
        spaceId: "space-shared",
        category: "manual-checks",
        inheritedFromDialogKey: "dialog-user-1-parent",
        parentDialogId: "parent",
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "01LOCAL",
      runtimeHost: "desktop",
    });

    expect(plan.ops[0]?.value).toMatchObject({
      spaceId: "space-shared",
      category: "manual-checks",
      inheritedFromDialogKey: "dialog-user-1-parent",
      parentDialogId: "parent",
      rootDialogId: "parent",
    });
  });

  test("persists task subject refs from runtime context", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        messages: [{ role: "user", content: "continue this task" }],
        result: { content: "done", model: "custom-coder", provider: "custom" },
        runtimeContext: {
          subjectRefs: [
            { kind: "page", id: "page-brief", role: "brief" },
            { kind: "table-row", id: "row-user-board-task", role: "subject" },
            { kind: "", id: "ignored" },
          ],
        },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "01LOCAL",
      runtimeHost: "desktop",
    });

    expect(plan.ops[0]?.value.subjectRefs).toEqual([
      { kind: "page", id: "page-brief", role: "brief" },
      { kind: "table-row", id: "row-user-board-task", role: "subject" },
    ]);
  });

  test("preserves a pending background child execution mode when the turn completes", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-child",
        continueDialogId: "child-dialog",
        messages: [{ role: "user", content: "finish in background" }],
        result: { content: "done", model: "custom-coder", provider: "custom" },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "unused",
      runtimeHost: "desktop",
      existingDialog: {
        id: "child-dialog",
        executionMode: "background",
        status: "pending",
      },
    });

    expect(plan.ops[0]?.value).toMatchObject({
      id: "child-dialog",
      status: "done",
      executionMode: "background",
    });
  });

  test("persists failed status for a child runtime error", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-child",
        continueDialogId: "child-dialog",
        messages: [{ role: "user", content: "fail locally" }],
        result: {
          content: "",
          model: "custom-coder",
          provider: "custom",
          error: true,
          errorMessage: "local execution failed",
        },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "unused",
      runtimeHost: "desktop",
      existingDialog: {
        id: "child-dialog",
        executionMode: "background",
        status: "pending",
      },
    });

    expect(plan.ops[0]?.value).toMatchObject({
      id: "child-dialog",
      status: "failed",
      executionMode: "background",
    });
  });

  test("uses titleOverride when provided for a new dialog", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        messages: [{ role: "user", content: "make it cleaner" }],
        result: { content: "done", model: "custom-coder", provider: "custom" },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "01LOCAL",
      runtimeHost: "cli",
      titleOverride: "LLM生成的标题",
    });

    expect(plan.ops[0]?.value).toMatchObject({
      title: "LLM生成的标题",
    });
  });

  test("overrides existing dialog title when titleOverride is provided", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        continueDialogId: "existing-dialog",
        messages: [{ role: "user", content: "continue working" }],
        result: { content: "done", model: "custom-coder", provider: "custom" },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "unused",
      runtimeHost: "cli",
      existingDialog: {
        id: "existing-dialog",
        title: "Original title",
      },
      titleOverride: "Overridden title",
    });

    // titleOverride takes precedence over existingDialog.title
    expect(plan.ops[0]?.value).toMatchObject({
      title: "Overridden title",
    });
  });

  test("falls back to built-in resolveDialogTitle when titleOverride is empty", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        messages: [{ role: "user", content: "fallback title test" }],
        result: { content: "done", model: "custom-coder", provider: "custom" },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "01LOCAL",
      runtimeHost: "cli",
      titleOverride: "  ",
    });

    expect(plan.ops[0]?.value).toMatchObject({
      title: "fallback title test",
    });
  });

  test("MEDIUM-1: a manual existing title is never overwritten by a generated titleOverride", () => {
    // titleSource:"manual" protects a user-set title from LLM regeneration.
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        continueDialogId: "manual-dialog",
        messages: [{ role: "user", content: "continue after manual rename" }],
        result: { content: "done", model: "custom-coder", provider: "custom" },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "unused",
      runtimeHost: "cli",
      existingDialog: {
        id: "manual-dialog",
        title: "用户手动命名",
        titleSource: "manual",
      },
      titleOverride: "LLM 想覆盖的标题",
    });

    expect(plan.ops[0]?.value).toMatchObject({
      title: "用户手动命名",
      titleSource: "manual",
    });
  });

  test("MEDIUM-1: a generated titleOverride overwrites a non-manual existing title", () => {
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        continueDialogId: "gen-dialog",
        messages: [{ role: "user", content: "continue" }],
        result: { content: "done", model: "custom-coder", provider: "custom" },
      },
      userId: "user-1",
      now: 1710000000000,
      createId: () => "unused",
      runtimeHost: "cli",
      existingDialog: {
        id: "gen-dialog",
        title: "旧生成标题",
        titleSource: "generated",
      },
      titleOverride: "新生成标题",
    });

    expect(plan.ops[0]?.value).toMatchObject({
      title: "新生成标题",
      titleSource: "generated",
    });
  });

  test("MEDIUM-1: titleUpdatedAt is refreshed to now when a titleOverride is applied", () => {
    const now = 1710000000000;
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        continueDialogId: "t-dialog",
        messages: [{ role: "user", content: "continue" }],
        result: { content: "done", model: "custom-coder", provider: "custom" },
      },
      userId: "user-1",
      now,
      createId: () => "unused",
      runtimeHost: "cli",
      existingDialog: {
        id: "t-dialog",
        title: "旧标题",
        titleSource: "generated",
        titleUpdatedAt: new Date(now - 60 * 60 * 1000).toISOString(),
      },
      titleOverride: "新标题",
    });

    expect(plan.ops[0]?.value.titleUpdatedAt).toBe(new Date(now).toISOString());
  });

  test("MEDIUM-1: titleUpdatedAt is preserved (not bumped) when no titleOverride is applied", () => {
    const now = 1710000000000;
    const oldTitleUpdatedAt = new Date(now - 60 * 60 * 1000).toISOString();
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        continueDialogId: "t-dialog",
        messages: [{ role: "user", content: "continue" }],
        result: { content: "done", model: "custom-coder", provider: "custom" },
      },
      userId: "user-1",
      now,
      createId: () => "unused",
      runtimeHost: "cli",
      existingDialog: {
        id: "t-dialog",
        title: "保留旧标题",
        titleSource: "generated",
        titleUpdatedAt: oldTitleUpdatedAt,
      },
    });

    expect(plan.ops[0]?.value.titleUpdatedAt).toBe(oldTitleUpdatedAt);
  });

  test("MEDIUM-1: missing titleUpdatedAt falls back to createdAt when preserving", () => {
    const now = 1710000000000;
    const createdAt = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const plan = buildAgentRuntimeDialogWritePlan({
      input: {
        agentKey: "agent-user-1-frontend",
        continueDialogId: "t-dialog",
        messages: [{ role: "user", content: "continue" }],
        result: { content: "done", model: "custom-coder", provider: "custom" },
      },
      userId: "user-1",
      now,
      createId: () => "unused",
      runtimeHost: "cli",
      existingDialog: {
        id: "t-dialog",
        title: "旧标题无 titleUpdatedAt",
        titleSource: "generated",
        createdAt,
      },
    });

    expect(plan.ops[0]?.value.titleUpdatedAt).toBe(createdAt);
  });
});
