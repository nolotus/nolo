import { describe, expect, it } from "bun:test";

import { trimMessagesWithSummary } from "./streamAgentChatTurnUtils";

describe("trimMessagesWithSummary", () => {
  it("keeps the assistant tool call when the retention cut lands on its result", () => {
    const messages = [
      { role: "user", content: "old context" },
      {
        role: "assistant",
        content: null,
        tool_calls: [
          {
            id: "call-1",
            type: "function",
            function: { name: "readFile", arguments: "x".repeat(8_000) },
          },
        ],
      },
      { role: "tool", tool_call_id: "call-1", content: "result".repeat(120) },
      { role: "user", content: "continue" },
    ] as any;

    const retained = trimMessagesWithSummary(messages, 1_000, 0);

    expect(retained[0]?.role).toBe("assistant");
    expect(retained[0]?.tool_calls?.[0]?.id).toBe("call-1");
    expect(retained[1]?.role).toBe("tool");
    expect(retained[1]?.tool_call_id).toBe("call-1");
  });
});
