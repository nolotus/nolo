import { describe, expect, it } from "bun:test";
import {
  isAssistantToolStub,
  isAwaitingVisibleAssistantReply,
  isIntermediateAssistantProgress,
  shouldAutoCollapseToolGroup,
} from "./assistantReplyPendingState";

describe("isAssistantToolStub pure seam", () => {
  it("detects empty assistant rows that only carry tool_calls", () => {
    expect(
      isAssistantToolStub({
        role: "assistant",
        content: "",
        tool_calls: [{ id: "tc1" }],
      })
    ).toBe(true);
    expect(
      isAssistantToolStub({
        role: "assistant",
        content: "   ",
        tool_calls: [{ id: "tc1" }],
      })
    ).toBe(true);
    expect(
      isAssistantToolStub({
        role: "assistant",
        content: null,
        tool_calls: [{ id: "tc1" }],
      })
    ).toBe(true);
    expect(
      isAssistantToolStub({
        role: "assistant",
        content: [],
        tool_calls: [{ id: "tc1" }],
      })
    ).toBe(true);
  });

  it("rejects visible assistant replies and non-assistant roles", () => {
    expect(
      isAssistantToolStub({
        role: "assistant",
        content: "done",
        tool_calls: [{ id: "tc1" }],
      })
    ).toBe(false);
    expect(
      isAssistantToolStub({
        role: "assistant",
        content: "",
        tool_calls: [],
      })
    ).toBe(false);
    expect(
      isAssistantToolStub({
        role: "user",
        content: "",
        tool_calls: [{ id: "tc1" }],
      })
    ).toBe(false);
    expect(isAssistantToolStub(null)).toBe(false);
  });
});

describe("isIntermediateAssistantProgress", () => {
  const toolGroup = { type: "tool-group" as const };
  const user = {
    type: "single" as const,
    message: { role: "user", content: "go" },
  };
  const finalReply = {
    type: "single" as const,
    message: { role: "assistant", content: "最终结果。" },
  };
  const progressWithTools = {
    type: "single" as const,
    message: {
      role: "assistant",
      content: "Commit 4 完成。",
      tool_calls: [{ id: "tc1" }],
    },
  };
  const progressBeforeTools = {
    type: "single" as const,
    message: { role: "assistant", content: "先提交，再继续。" },
  };

  it("treats assistant rows with tool_calls as intermediate progress", () => {
    expect(isIntermediateAssistantProgress([progressWithTools], 0)).toBe(true);
  });

  it("treats assistant narration immediately followed by a tool group as progress", () => {
    expect(
      isIntermediateAssistantProgress([progressBeforeTools, toolGroup, finalReply], 0)
    ).toBe(true);
  });

  it("does not flag the final answer after tools", () => {
    expect(
      isIntermediateAssistantProgress([toolGroup, finalReply], 1)
    ).toBe(false);
  });

  it("does not flag a normal reply that ends the turn", () => {
    expect(isIntermediateAssistantProgress([user, finalReply], 1)).toBe(false);
  });

  it("does not flag user or tool rows", () => {
    expect(isIntermediateAssistantProgress([user, toolGroup], 0)).toBe(false);
  });
});

describe("isAwaitingVisibleAssistantReply", () => {
  it("returns true when the loop is running and the last message is from the user", () => {
    expect(
      isAwaitingVisibleAssistantReply(
        [{ id: "u1", role: "user", content: "hello" }],
        true
      )
    ).toBe(true);
  });

  it("returns true when only a hidden assistant tool stub follows the user message", () => {
    expect(
      isAwaitingVisibleAssistantReply(
        [
          { id: "u1", role: "user", content: "hello" },
          {
            id: "a1",
            role: "assistant",
            content: "",
            tool_calls: [{ id: "tc1", type: "function", function: { name: "search" } }],
          },
        ],
        true
      )
    ).toBe(true);
  });

  it("returns false once a visible assistant message exists", () => {
    expect(
      isAwaitingVisibleAssistantReply(
        [
          { id: "u1", role: "user", content: "hello" },
          { id: "a1", role: "assistant", content: "hi there" },
        ],
        true
      )
    ).toBe(false);
  });

  it("returns false for an empty streaming assistant placeholder", () => {
    expect(
      isAwaitingVisibleAssistantReply(
        [
          { id: "u1", role: "user", content: "hello" },
          { id: "a1", role: "assistant", content: "", isStreaming: true },
        ],
        true
      )
    ).toBe(false);
  });

  it("returns false when the loop is not running", () => {
    expect(
      isAwaitingVisibleAssistantReply(
        [{ id: "u1", role: "user", content: "hello" }],
        false
      )
    ).toBe(false);
  });
});

describe("shouldAutoCollapseToolGroup", () => {
  const toolGroup = { type: "tool-group" as const };
  const finalReply = {
    type: "single" as const,
    message: { role: "assistant", content: "这是最终回复。", isStreaming: false },
  };
  const streamingReply = {
    type: "single" as const,
    message: { role: "assistant", content: "正在写…", isStreaming: true },
  };
  const nextUser = {
    type: "single" as const,
    message: { role: "user", content: "下一问" },
  };

  it("stays open while the dialog is still running and nothing ends the turn yet", () => {
    expect(
      shouldAutoCollapseToolGroup({
        entries: [toolGroup],
        groupIndex: 0,
        isRunning: true,
        hasStreamingMessage: false,
      })
    ).toBe(false);
  });

  it("stays open while the final reply is still streaming", () => {
    expect(
      shouldAutoCollapseToolGroup({
        entries: [toolGroup, streamingReply],
        groupIndex: 0,
        isRunning: false,
        hasStreamingMessage: false,
      })
    ).toBe(false);
  });

  it("collapses when idle even if no final reply followed the tools", () => {
    expect(
      shouldAutoCollapseToolGroup({
        entries: [toolGroup],
        groupIndex: 0,
        isRunning: false,
        hasStreamingMessage: false,
      })
    ).toBe(true);
  });

  it("stays open for an earlier group while a later batch is still the active turn", () => {
    expect(
      shouldAutoCollapseToolGroup({
        entries: [toolGroup, { type: "tool-group" }],
        groupIndex: 0,
        isRunning: true,
        hasStreamingMessage: false,
      })
    ).toBe(false);
  });

  it("collapses an earlier group once a later batch has a completed final reply", () => {
    expect(
      shouldAutoCollapseToolGroup({
        entries: [toolGroup, { type: "tool-group" }, finalReply],
        groupIndex: 0,
        isRunning: false,
        hasStreamingMessage: false,
      })
    ).toBe(true);
  });

  it("collapses after a completed final assistant reply", () => {
    expect(
      shouldAutoCollapseToolGroup({
        entries: [toolGroup, finalReply],
        groupIndex: 0,
        isRunning: false,
        hasStreamingMessage: false,
      })
    ).toBe(true);
  });

  it("collapses after a completed final reply even if a controller is briefly still marked running", () => {
    expect(
      shouldAutoCollapseToolGroup({
        entries: [toolGroup, finalReply],
        groupIndex: 0,
        isRunning: true,
        hasStreamingMessage: false,
      })
    ).toBe(true);
  });

  it("collapses when a new user turn starts after the group", () => {
    expect(
      shouldAutoCollapseToolGroup({
        entries: [toolGroup, nextUser],
        groupIndex: 0,
        isRunning: false,
        hasStreamingMessage: false,
      })
    ).toBe(true);
  });

  it("collapses historical groups when a later user turn starts even if that turn is still running", () => {
    expect(
      shouldAutoCollapseToolGroup({
        entries: [toolGroup, nextUser, { type: "tool-group" }],
        groupIndex: 0,
        isRunning: true,
        hasStreamingMessage: false,
      })
    ).toBe(true);
  });
});
