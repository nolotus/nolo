import { describe, expect, it } from "bun:test";

import {
  filterAndCleanMessages,
  stripHandoffToolMessages,
} from "../filterAndCleanMessages";

describe("filterAndCleanMessages tool summaries", () => {
  it("bridges persisted foreground thinkContent into reasoning_content", () => {
    const messages = filterAndCleanMessages([
      {
        role: "assistant",
        content: "",
        thinkContent: "Need to call the tool.",
        tool_calls: [
          {
            id: "call-reasoning",
            type: "function",
            function: { name: "read", arguments: "{}" },
          },
        ],
      },
      {
        role: "tool",
        content: "ok",
        tool_call_id: "call-reasoning",
      },
    ]);

    expect(messages[0]).toMatchObject({
      role: "assistant",
      reasoning_content: "Need to call the tool.",
    });
  });

  it("prefers llmContext over summary for tool outputs that need reusable structured references", () => {
    const messages = filterAndCleanMessages([
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-ctx",
            type: "function",
            function: { name: "geminiFlashImage", arguments: "{}" },
          },
        ],
      },
      {
        role: "tool",
        content: JSON.stringify({ files: [{ fileId: "01ABC" }] }),
        toolCallId: "call-ctx",
        toolName: "geminiFlashImage",
        toolPayload: {
          toolName: "geminiFlashImage",
          summary: "✅ geminiFlashImage 执行完成",
          llmContext:
            "The image generation tool produced reusable images.\n- fileId: 01ABC\n- url: https://nolo.chat/api/v1/db/file/content/file-user-1-01ABC",
        },
      },
    ]);

    expect(messages).toHaveLength(2);
    expect(messages[1].role).toBe("tool");
    expect(messages[1].content).toBe(
      "The image generation tool produced reusable images.\n- fileId: 01ABC\n- url: https://nolo.chat/api/v1/db/file/content/file-user-1-01ABC"
    );
  });

  it("prefers toolPayload summary over raw tool content", () => {
    const messages = filterAndCleanMessages([
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "codeSearch", arguments: "{}" },
          },
        ],
      },
      {
        role: "tool",
        content: JSON.stringify({ huge: "x".repeat(6000) }),
        toolCallId: "call-1",
        toolName: "codeSearch",
        toolPayload: {
          toolName: "codeSearch",
          summary: "🔍 搜索 \"createDoc\": 找到 2 个匹配项\n1. packages/a.ts:1\n2. packages/b.ts:2",
        },
      },
    ]);

    expect(messages).toHaveLength(2);
    expect(messages[1].role).toBe("tool");
    expect(messages[1].content).toBe("🔍 搜索 \"createDoc\": 找到 2 个匹配项\n1. packages/a.ts:1\n2. packages/b.ts:2");
  });

  it("truncates oversized tool summaries before sending to the model", () => {
    const longSummary = `summary:${"x".repeat(5000)}`;
    const messages = filterAndCleanMessages([
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-2",
            type: "function",
            function: { name: "read", arguments: "{}" },
          },
        ],
      },
      {
        role: "tool",
        content: "{}",
        toolCallId: "call-2",
        toolName: "read",
        toolPayload: {
          toolName: "read",
          summary: longSummary,
        },
      },
    ]);

    const toolContent = messages[1].content as string;
    expect(toolContent.length).toBeLessThan(longSummary.length);
    expect(toolContent).toContain("[... truncated");
  });

  it("strips handoff tool messages without mutating the input event list", () => {
    const rawMessages = [
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call-handoff",
            type: "function",
            function: { name: "runStreamingAgent", arguments: "{}" },
          },
        ],
      },
      {
        role: "tool",
        content: "{}",
        toolCallId: "call-handoff",
        toolName: "runStreamingAgent",
      },
      {
        role: "user",
        content: "继续",
      },
    ];

    const stripped = stripHandoffToolMessages(rawMessages);

    expect(stripped).toEqual([
      {
        role: "assistant",
        content: "",
        tool_calls: undefined,
        toolCalls: undefined,
      },
      {
        role: "user",
        content: "继续",
      },
    ]);
    expect(rawMessages[0].tool_calls).toHaveLength(1);
    expect(rawMessages[1].role).toBe("tool");
  });

  it("drops personalization choice tool rows that have no assistant tool call parent", () => {
    const messages = filterAndCleanMessages([
      {
        role: "tool",
        toolName: "ask_user",
        content: JSON.stringify({
          question: "你想怎么开始？",
          answer: "先看看你能做什么",
        }),
      },
      {
        role: "user",
        content: "先用很短的话告诉我 nolo 在这里还能帮我做什么，然后继续带我完成个性化设置。",
      },
    ]);

    expect(messages).toEqual([
      {
        role: "user",
        content: "先用很短的话告诉我 nolo 在这里还能帮我做什么，然后继续带我完成个性化设置。",
      },
    ]);
  });

  it("drops tool rows whose tool_call_id is not attached to the previous assistant message", () => {
    const messages = filterAndCleanMessages([
      {
        role: "assistant",
        content: "上一轮已结束",
      },
      {
        role: "tool",
        toolCallId: "call-orphan",
        toolName: "ask_user",
        content: "orphan result",
      },
      {
        role: "user",
        content: "继续",
      },
    ]);

    expect(messages).toEqual([
      {
        role: "assistant",
        content: "上一轮已结束",
      },
      {
        role: "user",
        content: "继续",
      },
    ]);
  });
});
