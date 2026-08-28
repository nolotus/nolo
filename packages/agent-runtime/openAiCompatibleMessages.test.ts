import { describe, expect, test } from "bun:test";

import {
  findAgentStatePairingIssues,
  preserveAgentStateFields,
  toOpenAiCompatibleMessages,
  shouldStripReasoningContentForOutbound,
} from "./openAiCompatibleMessages";
import type { AgentRuntimeChatMessage } from "./types";

describe("toOpenAiCompatibleMessages pure seam", () => {
  test("maps role and content, defaulting nullish content to empty string", () => {
    const messages = [
      { role: "user", content: "hello" },
      { role: "assistant", content: undefined },
    ] as AgentRuntimeChatMessage[];

    expect(toOpenAiCompatibleMessages(messages)).toEqual([
      { role: "user", content: "hello" },
      { role: "assistant", content: "" },
    ]);
  });

  test("passes through tool_call_id, tool_calls, and reasoning_content only when present", () => {
    const toolCalls = [
      {
        id: "call-1",
        type: "function" as const,
        function: { name: "read", arguments: "{}" },
      },
    ];
    const messages: AgentRuntimeChatMessage[] = [
      {
        role: "assistant",
        content: "",
        tool_calls: toolCalls,
        reasoning_content: "think first",
      },
      {
        role: "tool",
        content: "ok",
        tool_call_id: "call-1",
      },
      {
        role: "user",
        content: "next",
      },
    ];

    expect(toOpenAiCompatibleMessages(messages)).toEqual([
      {
        role: "assistant",
        content: "",
        tool_calls: toolCalls,
        reasoning_content: "think first",
      },
      {
        role: "tool",
        content: "ok",
        tool_call_id: "call-1",
      },
      {
        role: "user",
        content: "next",
      },
    ]);
  });

  test("omits empty tool_calls arrays and blank optional fields", () => {
    const messages: AgentRuntimeChatMessage[] = [
      {
        role: "assistant",
        content: "hi",
        tool_calls: undefined,
        tool_call_id: undefined,
        reasoning_content: undefined,
      },
    ];

    expect(toOpenAiCompatibleMessages(messages)).toEqual([
      { role: "assistant", content: "hi" },
    ]);
  });

  test("preserves empty-string reasoning_content on assistant messages", () => {
    const toolCalls = [
      {
        id: "call-1",
        type: "function" as const,
        function: { name: "read", arguments: "{}" },
      },
    ];
    const messages: AgentRuntimeChatMessage[] = [
      {
        role: "assistant",
        content: "",
        tool_calls: toolCalls,
        reasoning_content: "",
      },
      {
        role: "tool",
        content: "ok",
        tool_call_id: "call-1",
      },
    ];

    expect(toOpenAiCompatibleMessages(messages)).toEqual([
      {
        role: "assistant",
        content: "",
        tool_calls: toolCalls,
        reasoning_content: "",
      },
      {
        role: "tool",
        content: "ok",
        tool_call_id: "call-1",
      },
    ]);
  });

  test("does not attach reasoning_content to non-assistant roles", () => {
    const messages = [
      { role: "user", content: "hi", reasoning_content: "stray" },
    ] as AgentRuntimeChatMessage[];

    expect(toOpenAiCompatibleMessages(messages)).toEqual([
      { role: "user", content: "hi" },
    ]);
  });

  test("detects missing, orphaned, and duplicate tool state without changing it", () => {
    expect(findAgentStatePairingIssues([
      {
        role: "assistant",
        content: "",
        tool_calls: [
          { id: "call-a", type: "function", function: { name: "a", arguments: "{}" } },
          { id: "call-a", type: "function", function: { name: "a", arguments: "{}" } },
          { id: "call-b", type: "function", function: { name: "b", arguments: "{}" } },
        ],
      },
      { role: "tool", content: "ok", tool_call_id: "call-a" },
      { role: "tool", content: "again", tool_call_id: "call-a" },
      { role: "tool", content: "orphan", tool_call_id: "call-z" },
    ])).toEqual([
      "duplicate assistant tool call id: call-a",
      "duplicate tool result id: call-a",
      "orphan tool result id: call-z",
      "missing tool result id: call-b",
    ]);
  });

  test("reports a tool result that has no tool_call_id field", () => {
    expect(findAgentStatePairingIssues([
      { role: "tool", content: "missing id" },
    ])).toEqual(["tool result is missing tool_call_id"]);
  });

  test("normalizes legacy camelCase tool call ids at the shared seam", () => {
    expect(
      preserveAgentStateFields(
        { role: "tool", content: "ok", toolCallId: "call-legacy" },
        { role: "tool", content: "ok" },
      ),
    ).toEqual({
      role: "tool",
      content: "ok",
      tool_call_id: "call-legacy",
    });
    expect(findAgentStatePairingIssues([
      {
        role: "assistant",
        tool_calls: [{ id: "call-legacy" }],
      },
      { role: "tool", toolCallId: "call-legacy" },
    ])).toEqual([]);
  });
});

describe("stripReasoningContent option", () => {
  test("preserveAgentStateFields strips reasoning_content when stripReasoningContent is true", () => {
    const result = preserveAgentStateFields(
      { role: "assistant", content: "hi", reasoning_content: "thinking..." },
      { role: "assistant", content: "hi" },
      { stripReasoningContent: true },
    );
    expect(result).toEqual({
      role: "assistant",
      content: "hi",
    });
    expect((result as any).reasoning_content).toBeUndefined();
  });

  test("preserveAgentStateFields keeps reasoning_content by default", () => {
    const result = preserveAgentStateFields(
      { role: "assistant", content: "hi", reasoning_content: "thinking..." },
      { role: "assistant", content: "hi" },
    );
    expect((result as any).reasoning_content).toBe("thinking...");
  });

  test("toOpenAiCompatibleMessages strips reasoning_content for all assistant messages when option is set", () => {
    const messages = [
      { role: "assistant", content: "answer", reasoning_content: "thoughts" },
      { role: "user", content: "next question" },
    ];
    const result = toOpenAiCompatibleMessages(messages as any, {
      stripReasoningContent: true,
    });
    expect((result[0] as any).reasoning_content).toBeUndefined();
    // Non-assistant messages are unaffected
    expect(result[1].role).toBe("user");
  });

  test("shouldStripReasoningContentForOutbound returns true for both hosted V4 models", () => {
    expect(shouldStripReasoningContentForOutbound("deepseek", "deepseek-v4-flash")).toBe(true);
    expect(shouldStripReasoningContentForOutbound("DeepSeek", "DeepSeek-V4-Flash")).toBe(true);
    expect(shouldStripReasoningContentForOutbound("nolo", "deepseek-v4-pro")).toBe(true);
  });

  test("shouldStripReasoningContentForOutbound returns false for other models", () => {
    expect(shouldStripReasoningContentForOutbound("deepseek", "deepseek-chat")).toBe(false);
    expect(shouldStripReasoningContentForOutbound("openai", "gpt-4")).toBe(false);
    expect(shouldStripReasoningContentForOutbound("qwen", "qwen3-max")).toBe(false);
    expect(shouldStripReasoningContentForOutbound(undefined, "some-model")).toBe(false);
    expect(shouldStripReasoningContentForOutbound("deepseek", undefined)).toBe(false);
  });
});
