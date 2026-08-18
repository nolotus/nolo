import { describe, expect, test } from "bun:test";
import { completionsAdapter } from "./completionsAdapter";

describe("completionsAdapter", () => {
  test("wire is completions", () => {
    expect(completionsAdapter.wire).toBe("completions");
  });

  test("buildRequest formats standard completion body and preserves reasoning_content for openai", () => {
    const req = completionsAdapter.buildRequest({
      messages: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello", reasoning_content: "thinking" },
      ],
      agent: { provider: "openai", model: "gpt-4o" },
    });
    expect(req.model).toBe("gpt-4o");
    expect(req.stream).toBe(true);
    expect(req.messages).toEqual([
      { role: "user", content: "Hi" },
      { role: "assistant", content: "Hello", reasoning_content: "thinking" },
    ]);
  });

  test("buildRequest strips reasoning_content for nolo/deepseek-v4-flash", () => {
    const req = completionsAdapter.buildRequest({
      messages: [
        { role: "user", content: "Hi" },
        { role: "assistant", content: "Hello", reasoning_content: "thinking" },
      ],
      agent: { provider: "nolo", model: "deepseek-v4-flash" },
    });
    expect((req.messages as any[])[1].reasoning_content).toBeUndefined();
  });

  test("normalizeUsage maps raw usage Chunk", () => {
    const rawUsage = { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 };
    const normalized = completionsAdapter.normalizeUsage(rawUsage);
    expect(normalized).toEqual(
      expect.objectContaining({
        prompt_tokens: 10,
        completion_tokens: 20,
      }),
    );
  });
});
