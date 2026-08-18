import { describe, expect, it } from "bun:test";

import {
  parseToolCallArguments,
  isArgumentsInvalid,
  toValidArgumentsString,
  buildInvalidToolCallSelfHealResult,
  sanitizeOutboundMessages,
  sanitizeOutboundResponsesInput,
  INVALID_TOOL_ARGS_REPLACEMENT,
  INVALID_TOOL_ARGS_OUTBOUND_REPLACEMENT,
  INVALID_TOOL_RESULT_HINT,
  ORPHAN_TOOL_RESULT_PLACEHOLDER,
} from "./toolCallArgumentGuard";

describe("parseToolCallArguments", () => {
  it("accepts a valid JSON object string", () => {
    const r = parseToolCallArguments('{"name":"x","files":[]}');
    expect(r.valid).toBe(true);
    expect(r.parsed).toEqual({ name: "x", files: [] });
  });

  it("rejects a truncated JSON string", () => {
    const r = parseToolCallArguments('{"name":"x","files":[{"na');
    expect(r.valid).toBe(false);
    expect(r.parsed).toBeUndefined();
  });

  it("accepts an already-parsed object", () => {
    const obj = { a: 1 };
    const r = parseToolCallArguments(obj);
    expect(r.valid).toBe(true);
    expect(r.parsed).toBe(obj);
  });

  it("rejects arrays, primitives, null and empty strings", () => {
    expect(parseToolCallArguments([1, 2]).valid).toBe(false);
    expect(parseToolCallArguments("123").valid).toBe(false);
    expect(parseToolCallArguments("true").valid).toBe(false);
    expect(parseToolCallArguments(null).valid).toBe(false);
    expect(parseToolCallArguments(undefined).valid).toBe(false);
    expect(parseToolCallArguments("").valid).toBe(false);
    expect(parseToolCallArguments("   ").valid).toBe(false);
  });

  it("is consistent with isArgumentsInvalid", () => {
    expect(isArgumentsInvalid('{"a":1}')).toBe(false);
    expect(isArgumentsInvalid('{"a":')).toBe(true);
  });
});

describe("toValidArgumentsString", () => {
  it("returns the original string when already valid", () => {
    expect(toValidArgumentsString('{"a":1}')).toBe('{"a":1}');
  });

  it("stringifies objects", () => {
    expect(toValidArgumentsString({ a: 1 })).toBe('{"a":1}');
  });

  it("replaces invalid arguments with the replacement marker", () => {
    expect(toValidArgumentsString('{"truncated":')).toBe(
      INVALID_TOOL_ARGS_REPLACEMENT
    );
  });
});

describe("buildInvalidToolCallSelfHealResult", () => {
  it("produces a JSON-string tool result with a self-heal hint", () => {
    const out = buildInvalidToolCallSelfHealResult("call_abc", "appDeploy");
    const parsed = JSON.parse(out);
    expect(parsed.error).toBe(true);
    expect(parsed.toolCallId).toBe("call_abc");
    expect(parsed.toolName).toBe("appDeploy");
    expect(parsed.message).toBe(INVALID_TOOL_RESULT_HINT);
    // hint mentions the mitigation strategy
    expect(parsed.message).toContain("appFileWrite");
    expect(parsed.message).toContain("appDeploy");
  });

  it("omits toolName when not provided", () => {
    const parsed = JSON.parse(buildInvalidToolCallSelfHealResult("call_x"));
    expect(parsed.toolName).toBeUndefined();
    expect(parsed.toolCallId).toBe("call_x");
  });
});

describe("sanitizeOutboundMessages (Guard B, chat-completions)", () => {
  it("replaces invalid tool_calls arguments with a valid JSON placeholder and keeps the message", () => {
    const messages = [
      { role: "user", content: "build it" },
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_bad",
            type: "function",
            function: {
              name: "appDeploy",
              arguments: '{"name":"x","files":[{"na',
            },
          },
        ],
      },
      { role: "tool", tool_call_id: "call_bad", content: '{"ok":true}' },
    ];

    const out = sanitizeOutboundMessages(messages);
    const assistant = out.find((m) => m.role === "assistant");
    expect(assistant).toBeDefined();
    expect(assistant.tool_calls).toHaveLength(1);
    const args = assistant.tool_calls[0].function.arguments;
    // B) 出站 body 中所有 tool_calls arguments 均可 JSON.parse
    expect(() => JSON.parse(args)).not.toThrow();
    expect(JSON.parse(args)).toEqual({ _invalid: true });
    // call_id 保留，配对 tool 消息仍在
    expect(assistant.tool_calls[0].id).toBe("call_bad");
    expect(out.some((m) => m.role === "tool" && m.tool_call_id === "call_bad")).toBe(true);
  });

  it("does not touch already-valid arguments", () => {
    const messages = [
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_ok",
            type: "function",
            function: { name: "readFile", arguments: '{"path":"/a"}' },
          },
        ],
      },
      { role: "tool", tool_call_id: "call_ok", content: "ok" },
    ];
    const out = sanitizeOutboundMessages(messages);
    expect(out[0].tool_calls[0].function.arguments).toBe('{"path":"/a"}');
  });

  it("adds a placeholder tool result for tool_calls without a matching tool message (orphan repair)", () => {
    const messages = [
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_orphan",
            type: "function",
            function: {
              name: "appDeploy",
              arguments: '{"truncated":',
            },
          },
        ],
      },
      // 没有 tool 消息配对 call_orphan
    ];
    const out = sanitizeOutboundMessages(messages);
    const placeholder = out.find(
      (m) => m.role === "tool" && m.tool_call_id === "call_orphan"
    );
    expect(placeholder).toBeDefined();
    expect(placeholder.content).toBe(ORPHAN_TOOL_RESULT_PLACEHOLDER);
    // arguments 也被替换为合法 JSON
    const assistant = out.find((m) => m.role === "assistant");
    expect(() =>
      JSON.parse(assistant.tool_calls[0].function.arguments)
    ).not.toThrow();
  });

  it("does not add a duplicate placeholder when a tool result already exists", () => {
    const messages = [
      {
        role: "assistant",
        content: "",
        tool_calls: [
          {
            id: "call_answered",
            type: "function",
            function: { name: "x", arguments: '{"a":' },
          },
        ],
      },
      { role: "tool", tool_call_id: "call_answered", content: '{"ok":true}' },
    ];
    const out = sanitizeOutboundMessages(messages);
    const toolMsgs = out.filter(
      (m) => m.role === "tool" && m.tool_call_id === "call_answered"
    );
    expect(toolMsgs).toHaveLength(1);
  });

  it("leaves non-assistant/tool messages untouched and does not mutate input", () => {
    const userMsg = { role: "user", content: "hi" };
    const messages = [userMsg];
    const out = sanitizeOutboundMessages(messages);
    expect(out[0]).toEqual(userMsg);
    // input not mutated
    expect(messages[0]).toBe(userMsg);
  });

  it("handles empty / non-array input gracefully", () => {
    expect(sanitizeOutboundMessages([])).toEqual([]);
    // null is coerced to an empty array (defensive)
    expect(sanitizeOutboundMessages(null as any)).toEqual([]);
  });
});

describe("sanitizeOutboundResponsesInput (Guard B, responses API)", () => {
  it("replaces invalid function_call arguments and keeps call_id", () => {
    const input = [
      { type: "message", role: "user", content: [{ type: "input_text", text: "go" }] },
      { type: "function_call", call_id: "fc_bad", name: "appDeploy", arguments: '{"name":"x","files":[{"na' },
      { type: "function_call_output", call_id: "fc_bad", output: '{"ok":true}' },
    ];
    const out = sanitizeOutboundResponsesInput(input);
    const fc = out.find((i) => i.type === "function_call" && i.call_id === "fc_bad");
    expect(fc).toBeDefined();
    expect(() => JSON.parse(fc.arguments)).not.toThrow();
    expect(JSON.parse(fc.arguments)).toEqual({ _invalid: true });
    // existing output preserved, no duplicate placeholder added
    const outs = out.filter(
      (i) => i.type === "function_call_output" && i.call_id === "fc_bad"
    );
    expect(outs).toHaveLength(1);
  });

  it("adds a placeholder function_call_output for orphan function_call", () => {
    const input = [
      { type: "function_call", call_id: "fc_orphan", name: "appDeploy", arguments: '{"truncated":' },
    ];
    const out = sanitizeOutboundResponsesInput(input);
    const placeholder = out.find(
      (i) => i.type === "function_call_output" && i.call_id === "fc_orphan"
    );
    expect(placeholder).toBeDefined();
    expect(placeholder.output).toBe(ORPHAN_TOOL_RESULT_PLACEHOLDER);
    // arguments sanitized
    const fc = out.find((i) => i.type === "function_call");
    expect(() => JSON.parse(fc.arguments)).not.toThrow();
  });

  it("does not mutate the input array", () => {
    const input = [
      { type: "function_call", call_id: "fc1", name: "x", arguments: '{"a":' },
    ];
    const snapshot = JSON.stringify(input);
    sanitizeOutboundResponsesInput(input);
    expect(JSON.stringify(input)).toBe(snapshot);
  });
});

describe("constants", () => {
  it("replacement markers are themselves valid JSON object strings", () => {
    expect(JSON.parse(INVALID_TOOL_ARGS_REPLACEMENT)).toEqual({
      _invalid: true,
      _reason: "arguments truncated or malformed",
    });
    expect(JSON.parse(INVALID_TOOL_ARGS_OUTBOUND_REPLACEMENT)).toEqual({
      _invalid: true,
    });
    expect(JSON.parse(ORPHAN_TOOL_RESULT_PLACEHOLDER)).toEqual({
      error: "tool call was interrupted",
    });
  });
});