import { describe, expect, test } from "bun:test";

import { dialogMessageRecordToAgentRuntimeMessage } from "./dialogMessageRecord";

describe("dialog message record conversion", () => {
  test("converts persisted dialog message records into runtime messages", () => {
    expect(dialogMessageRecordToAgentRuntimeMessage({
      role: "assistant",
      content: "previous answer",
      tool_calls: [
        {
          id: "call-1",
          type: "function",
          function: { name: "read_file", arguments: "{\"path\":\"/tmp/a.txt\"}" },
        },
      ],
    })).toEqual({
      role: "assistant",
      content: "previous answer",
      tool_calls: [
        {
          id: "call-1",
          type: "function",
          function: { name: "read_file", arguments: "{\"path\":\"/tmp/a.txt\"}" },
        },
      ],
    });

    expect(dialogMessageRecordToAgentRuntimeMessage({
      role: "tool",
      content: "file contents",
      toolCallId: "call-1",
    })).toEqual({
      role: "tool",
      content: "file contents",
      tool_call_id: "call-1",
    });

    expect(dialogMessageRecordToAgentRuntimeMessage({ role: "system", content: "skip" })).toBeNull();
    expect(dialogMessageRecordToAgentRuntimeMessage({ role: "unknown", content: "skip" })).toBeNull();
  });

  test("normalizes null content to empty string so provider API schemas do not throw on null assistant text", () => {
    expect(
      dialogMessageRecordToAgentRuntimeMessage({
        role: "assistant",
        content: null,
        tool_calls: [{ id: "call-1", type: "function", function: { name: "globFiles", arguments: "{}" } }],
      })
    ).toEqual({
      role: "assistant",
      content: "",
      tool_calls: [{ id: "call-1", type: "function", function: { name: "globFiles", arguments: "{}" } }],
    });
  });

  test("round-trips reasoning_content on assistant messages", () => {
    expect(
      dialogMessageRecordToAgentRuntimeMessage({
        role: "assistant",
        content: "总结正文",
        reasoning_content: "我先把问题拆开……",
      })
    ).toEqual({
      role: "assistant",
      content: "总结正文",
      reasoning_content: "我先把问题拆开……",
    });
  });

  test("restores a provider-only context reference without replacing durable content", () => {
    expect(
      dialogMessageRecordToAgentRuntimeMessage({
        role: "user",
        content: "full pasted body",
        contextReference: "[paste #1 · 200 lines; full content available via readPastedText(pasteId=1)]",
      }),
    ).toEqual({
      role: "user",
      content: "full pasted body",
      context_reference: "[paste #1 · 200 lines; full content available via readPastedText(pasteId=1)]",
    });
  });
});
