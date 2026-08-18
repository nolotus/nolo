import { describe, expect, test } from "bun:test";
import { codexAdapter } from "./codexAdapter";

describe("codexAdapter", () => {
  test("wire is codex", () => {
    expect(codexAdapter.wire).toBe("codex");
  });

  test("buildRequest produces Codex request body with input array", () => {
    const req = codexAdapter.buildRequest({
      messages: [{ role: "user", content: "Hello Codex" }],
      agent: { model: "gpt-5.5" },
    });
    expect(req.model).toBe("gpt-5.5");
    expect(req.stream).toBe(true);
    expect(Array.isArray(req.input)).toBe(true);
  });

  test("normalizeUsage normalizes usage tokens", () => {
    const rawUsage = { input_tokens: 30, output_tokens: 60 };
    const normalized = codexAdapter.normalizeUsage(rawUsage);
    expect(normalized).toEqual(
      expect.objectContaining({
        prompt_tokens: 30,
        completion_tokens: 60,
      }),
    );
  });
});
