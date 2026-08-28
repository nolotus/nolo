import { describe, expect, it } from "bun:test";
import { buildChatCompletionsRequestBody } from "./chatCompletionsRequestBody";
import {
  convertMessagesToResponsesInput,
  convertResponsesInputToMessages,
  convertResponsesToolsToChatCompletions,
} from "./responsesHelpers";

describe("buildChatCompletionsRequestBody", () => {
  it("passes through a body that already has messages", () => {
    const body = { messages: [{ role: "user", content: "hi" }], stream: false };
    expect(buildChatCompletionsRequestBody(body, "m")).toEqual({
      messages: [{ role: "user", content: "hi" }],
      stream: false,
      model: "m",
    });
  });

  it("converts a Responses-wire input body (the HTTP 422 repro)", () => {
    const body = {
      input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] }],
      stream: false,
    };
    const out = buildChatCompletionsRequestBody(body, "deepseek-v4-flash");
    expect(out.messages).toEqual([{ role: "user", content: "hi" }]);
    expect(out.input).toBeUndefined();
    expect(out.model).toBe("deepseek-v4-flash");
  });

  it("prefers existing messages over input when both are present", () => {
    const out = buildChatCompletionsRequestBody(
      {
        messages: [{ role: "user", content: "from-messages" }],
        input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "from-input" }] }],
      },
      "m",
    );
    expect(out.messages).toEqual([{ role: "user", content: "from-messages" }]);
  });

  it("maps max_output_tokens back to max_tokens", () => {
    const out = buildChatCompletionsRequestBody(
      { input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] }], max_output_tokens: 256 },
      "m",
    );
    expect(out.max_tokens).toBe(256);
    expect(out.max_output_tokens).toBeUndefined();
  });

  it("leaves an empty body alone", () => {
    expect(buildChatCompletionsRequestBody({ input: [] }, "m")).toEqual({ input: [], model: "m" });
  });
});

describe("convertResponsesInputToMessages", () => {
  it("maps tool calls and tool results", () => {
    const msgs = convertResponsesInputToMessages([
      { type: "function_call", call_id: "c1", name: "search", arguments: '{"q":"x"}' },
      { type: "function_call_output", call_id: "c1", output: "result" },
    ]);
    expect(msgs[0]).toEqual({
      role: "assistant",
      content: null,
      tool_calls: [{ id: "c1", type: "function", function: { name: "search", arguments: '{"q":"x"}' } }],
    });
    expect(msgs[1]).toEqual({ role: "tool", tool_call_id: "c1", content: "result" });
  });

  it("coalesces consecutive function calls onto one assistant message", () => {
    const msgs = convertResponsesInputToMessages([
      { type: "function_call", call_id: "c1", name: "a", arguments: "{}" },
      { type: "function_call", call_id: "c2", name: "b", arguments: "{}" },
    ]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].tool_calls).toHaveLength(2);
  });

  it("keeps image parts and drops reasoning", () => {
    const msgs = convertResponsesInputToMessages([
      { type: "reasoning", content: [{ type: "reasoning_text", text: "think" }] },
      {
        type: "message",
        role: "user",
        content: [
          { type: "input_text", text: "look" },
          { type: "input_image", image_url: "https://x/y.png" },
        ],
      },
    ]);
    expect(msgs).toHaveLength(1);
    expect(msgs[0].content).toEqual([
      { type: "text", text: "look" },
      { type: "image_url", image_url: { url: "https://x/y.png" } },
    ]);
  });

  it("round-trips messages → input → messages", () => {
    const original = [
      { role: "system", content: "be nice" },
      { role: "user", content: "hi" },
      { role: "assistant", content: null, tool_calls: [{ id: "c1", type: "function", function: { name: "t", arguments: "{}" } }] },
      { role: "tool", tool_call_id: "c1", content: "ok" },
    ];
    const back = convertResponsesInputToMessages(convertMessagesToResponsesInput(original as any));
    expect(back).toEqual(original as any);
  });
});

describe("convertResponsesInputToMessages — image_url tolerance", () => {
  it("accepts the nested { image_url: { url } } shape from a mismatched client", () => {
    const msgs = convertResponsesInputToMessages([
      {
        type: "message",
        role: "user",
        content: [{ type: "input_image", image_url: { url: "https://x/y.png" } }],
      },
    ]);
    expect(msgs[0].content).toEqual([
      { type: "image_url", image_url: { url: "https://x/y.png" } },
    ]);
  });
});

describe("tool shape normalization", () => {
  const flat = { type: "function", name: "readFile", description: "read a file", parameters: { type: "object", properties: {} } };
  const nested = { type: "function", function: { name: "readFile", description: "read a file", parameters: { type: "object", properties: {} } } };

  it("renests Responses-wire tools for the completions wire", () => {
    expect(convertResponsesToolsToChatCompletions([flat])).toEqual([nested]);
  });

  it("leaves already-nested tools untouched", () => {
    expect(convertResponsesToolsToChatCompletions([nested])).toEqual([nested]);
  });

  it("drops built-in Responses tools that have no completions equivalent", () => {
    expect(convertResponsesToolsToChatCompletions([{ type: "web_search" }])).toEqual([]);
  });

  it("normalizes tools even when the body already has messages (the TUI case)", () => {
    // The TUI sends plain `messages` but Responses-shaped `tools`; keying the
    // conversion off `input` alone would let the flat tools reach the upstream
    // and trigger HTTP 422.
    const out = buildChatCompletionsRequestBody(
      { messages: [{ role: "user", content: "hi" }], tools: [flat] },
      "m",
    );
    expect(out.tools).toEqual([nested]);
    expect(out.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("normalizes tools alongside an input body", () => {
    const out = buildChatCompletionsRequestBody(
      { input: [{ type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] }], tools: [flat] },
      "m",
    );
    expect(out.tools).toEqual([nested]);
    expect(out.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("leaves a body without tools alone", () => {
    const out = buildChatCompletionsRequestBody({ messages: [{ role: "user", content: "hi" }] }, "m");
    expect(out.tools).toBeUndefined();
  });
});
