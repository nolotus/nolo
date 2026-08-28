import { describe, expect, test } from "bun:test";
import { anthropicAdapter } from "./anthropicAdapter";

describe("anthropicAdapter", () => {
  test("wire is anthropic", () => {
    expect(anthropicAdapter.wire).toBe("anthropic");
  });

  test("buildRequest formats Anthropic structure with system and messages", () => {
    const req = anthropicAdapter.buildRequest({
      messages: [{ role: "user", content: "Hello Anthropic" }],
      agent: { provider: "anthropic", model: "claude-3-5-sonnet-20241022", prompt: "Be concise" },
    });
    expect(req.model).toBe("claude-3-5-sonnet-20241022");
    expect(Array.isArray(req.system)).toBe(true);
    expect(Array.isArray(req.messages)).toBe(true);
    expect((req.messages as any[])[0].role).toBe("user");
    expect((req.messages as any[])[0].content[0].text).toBe("Hello Anthropic");
  });

  test("normalizeUsage maps Anthropic usage object (input_tokens/output_tokens)", () => {
    const rawAnthropicUsage = { usage: { input_tokens: 42, output_tokens: 84 } };
    const normalized = anthropicAdapter.normalizeUsage(rawAnthropicUsage);
    expect(normalized).toEqual(
      expect.objectContaining({
        prompt_tokens: 42,
        completion_tokens: 84,
      }),
    );
  });
});
