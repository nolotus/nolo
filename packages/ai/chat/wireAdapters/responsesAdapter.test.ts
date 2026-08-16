import { describe, expect, test } from "bun:test";
import { responsesAdapter } from "./responsesAdapter";

describe("responsesAdapter", () => {
  test("wire is responses", () => {
    expect(responsesAdapter.wire).toBe("responses");
  });

  test("buildRequest handles empty messages array", () => {
    const req = responsesAdapter.buildRequest({
      messages: [],
      agent: { model: "deepseek-v4-flash" },
    });
    expect(req).toEqual({
      model: "deepseek-v4-flash",
      input: [],
      stream: true,
    });
  });

  test("buildRequest builds input array correctly", () => {
    const req = responsesAdapter.buildRequest({
      messages: [{ role: "user", content: "Hello" }],
      agent: { model: "deepseek-v4-flash" },
      options: { stream: false },
    });
    expect(req.stream).toBe(false);
    expect(req.input).toEqual([
      {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text: "Hello" }],
      },
    ]);
  });

  test("normalizeUsage maps input_tokens and output_tokens to prompt_tokens and completion_tokens", () => {
    const rawUsage = { input_tokens: 15, output_tokens: 25 };
    const normalized = responsesAdapter.normalizeUsage(rawUsage);
    expect(normalized).toEqual(
      expect.objectContaining({
        prompt_tokens: 15,
        completion_tokens: 25,
      }),
    );
  });
});
