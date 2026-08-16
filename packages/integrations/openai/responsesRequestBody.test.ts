import { describe, expect, test } from "bun:test";
import { buildResponsesRequestBody } from "./responsesRequestBody";

describe("buildResponsesRequestBody", () => {
  test("normalizes messages, tools, and max token options once", () => {
    const body = buildResponsesRequestBody(
      {
        messages: [{ role: "user", content: "hello" }],
        tools: [{ type: "function", function: {
          name: "readFile",
          parameters: { type: "object", properties: { path: { type: "string" } } },
        } }],
        max_tokens: 42,
        tool_choice: "auto",
      },
      "deepseek-v4-flash",
    );

    expect(body.input).toEqual([{
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: "hello" }],
    }]);
    expect(body.tools).toEqual([{
      type: "function",
      name: "readFile",
      parameters: { type: "object", properties: { path: { type: "string" } } },
    }]);
    expect(body.max_output_tokens).toBe(42);
    expect(body.messages).toBeUndefined();
    expect(body.max_tokens).toBeUndefined();
    expect(body.tool_choice).toBeUndefined();
  });

  test("preserves an existing Responses input and omits invalid tools", () => {
    const input = [{ type: "message", role: "user", content: [{ type: "input_text", text: "hi" }] }];
    const body = buildResponsesRequestBody(
      { input, tools: [{ type: "invalid" }] },
      "gpt-5.6",
    );
    expect(body.input).toBe(input);
    expect(body.tools).toBeUndefined();
  });
});
