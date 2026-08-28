import { describe, expect, it } from "bun:test";

import { assembleFinalAssistantMessage } from "./messageStreamEndAssemble";
import type { Message } from "./types";

const baseInput = (overrides: Partial<Parameters<typeof assembleFinalAssistantMessage>[0]> = {}) => ({
  messageId: "msg-1",
  msgKey: "dialog-key-msg-1",
  finalVisibleContent: "final text",
  thinkContent: "thought",
  agentConfig: { dbKey: "agent-a", name: "Agent A" },
  finalUsageData: { completion_tokens: 10 },
  toolCalls: undefined,
  otherPersistedMessageMetadata: {},
  finalMetadata: undefined,
  agentName: "Agent A",
  userId: "local",
  ...overrides,
});

describe("assembleFinalAssistantMessage", () => {
  it("produces a terminal assistant message with isStreaming false and the resolved owner", () => {
    const message = assembleFinalAssistantMessage(baseInput());

    expect(message.id).toBe("msg-1");
    expect(message.role).toBe("assistant");
    expect(message.isStreaming).toBe(false);
    expect(message.userId).toBe("local");
    expect(message.content).toBe("final text");
    expect(message.thinkContent).toBe("thought");
    expect(message.agentKey).toBe("agent-a");
    expect(message.cybotKey).toBe("agent-a");
    expect(message.usage).toEqual({ completion_tokens: 10 });
    expect(message.agentName).toBe("Agent A");
    expect(message.tool_calls).toBeUndefined();
  });

  it("writes userId last so persisted metadata cannot overwrite the owner", () => {
    const message = assembleFinalAssistantMessage(
      baseInput({
        userId: "owner-1",
        otherPersistedMessageMetadata: {
          // A buggy caller / persisted field tries to force a different owner.
          userId: "intruder",
          metadata: { anything: true },
        },
      }),
    );

    expect(message.userId).toBe("owner-1");
  });

  it("only attaches tool_calls when the array is non-empty", () => {
    const toolCalls = [
      {
        id: "call-1",
        type: "function" as const,
        function: { name: "search", arguments: "{}" },
      },
    ];

    const withTools = assembleFinalAssistantMessage(baseInput({ toolCalls }));
    expect(withTools.tool_calls).toEqual(toolCalls);

    const emptyTools = assembleFinalAssistantMessage(baseInput({ toolCalls: [] }));
    expect(emptyTools.tool_calls).toBeUndefined();

    const noTools = assembleFinalAssistantMessage(baseInput());
    expect(noTools.tool_calls).toBeUndefined();
  });

  it("does not attach metadata when finalMetadata is undefined", () => {
    const message = assembleFinalAssistantMessage(
      baseInput({ finalMetadata: undefined }),
    );
    expect(message.metadata).toBeUndefined();
  });

  it("merges finalMetadata when provided and keeps it from overwriting owner", () => {
    const message = assembleFinalAssistantMessage(
      baseInput({
        userId: "owner-2",
        finalMetadata: { activity: "completed" },
      }),
    );
    expect(message.metadata).toEqual({ activity: "completed" });
    expect(message.userId).toBe("owner-2");
  });

  it("never resurrects isStreaming even if persisted metadata sets it true", () => {
    const message = assembleFinalAssistantMessage(
      baseInput({
        otherPersistedMessageMetadata: { isStreaming: true },
      }),
    );
    expect(message.isStreaming).toBe(false);
  });

  it("writes finishReason to the message when it is 'length'", () => {
    const message = assembleFinalAssistantMessage(
      baseInput({ finishReason: "length" }),
    );
    expect(message.finishReason).toBe("length");
  });

  it("writes finishReason to the message when it is 'content_filter'", () => {
    const message = assembleFinalAssistantMessage(
      baseInput({ finishReason: "content_filter" }),
    );
    expect(message.finishReason).toBe("content_filter");
  });

  it("writes finishReason to the message when it is 'tool_calls'", () => {
    const message = assembleFinalAssistantMessage(
      baseInput({ finishReason: "tool_calls" }),
    );
    expect(message.finishReason).toBe("tool_calls");
  });

  it("does NOT write finishReason when it is 'stop' (normal end)", () => {
    const message = assembleFinalAssistantMessage(
      baseInput({ finishReason: "stop" }),
    );
    expect(message.finishReason).toBeUndefined();
  });

  it("does NOT write finishReason when it is null", () => {
    const message = assembleFinalAssistantMessage(
      baseInput({ finishReason: null }),
    );
    expect(message.finishReason).toBeUndefined();
  });

  it("does NOT write finishReason when it is undefined", () => {
    const message = assembleFinalAssistantMessage(baseInput());
    expect(message.finishReason).toBeUndefined();
  });
});