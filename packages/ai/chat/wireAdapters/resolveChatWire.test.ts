import { describe, expect, test } from "bun:test";
import { resolveChatWire } from "./resolveChatWire";

describe("resolveChatWire", () => {
  test("returns completions for empty/null input", () => {
    expect(resolveChatWire(null)).toBe("completions");
    expect(resolveChatWire(undefined)).toBe("completions");
    expect(resolveChatWire({})).toBe("completions");
  });

  test("Priority 1: cliProvider takes precedence", () => {
    expect(resolveChatWire({ cliProvider: "codex" })).toBe("codex");
    expect(resolveChatWire({ cliProvider: "claude" })).toBe("anthropic");
    // cliProvider codex overrides endpointKey or provider
    expect(
      resolveChatWire({ cliProvider: "codex", endpointKey: "responses", provider: "anthropic" }),
    ).toBe("codex");
    expect(
      resolveChatWire({ cliProvider: "claude", endpointKey: "responses" }),
    ).toBe("anthropic");
  });

  test("Priority 2: endpointKey or URL matches /responses/", () => {
    expect(resolveChatWire({ endpointKey: "responses" })).toBe("responses");
    expect(
      resolveChatWire({ endpoint: "https://api.openai.com/v1/responses" }),
    ).toBe("responses");
    expect(
      resolveChatWire({ customProviderUrl: "http://localhost:8080/v1/responses?foo=bar" }),
    ).toBe("responses");
    expect(
      resolveChatWire({ endpoint: "https://api.deepseek.com/responses#hash" }),
    ).toBe("responses");
  });

  test("Priority 3: provider (lowercase) in {anthropic, claude}", () => {
    expect(resolveChatWire({ provider: "anthropic" })).toBe("anthropic");
    expect(resolveChatWire({ provider: "Anthropic" })).toBe("anthropic");
    expect(resolveChatWire({ provider: "claude" })).toBe("anthropic");
    expect(resolveChatWire({ provider: "CLAUDE" })).toBe("anthropic");
  });

  test("Priority 4: isOpenAiResponsesModel (provider + model)", () => {
    expect(
      resolveChatWire({ provider: "nolo", model: "deepseek-v4-flash" }),
    ).toBe("responses");
    expect(
      resolveChatWire({ provider: "deepseek", model: "deepseek-v4-flash-vision-exp" }),
    ).toBe("responses");
  });

  test("Priority 5: default falls back to completions", () => {
    expect(resolveChatWire({ provider: "nolo", model: "deepseek-v4-pro" })).toBe("completions");
    expect(resolveChatWire({ provider: "openai", model: "gpt-4o" })).toBe("completions");
    expect(resolveChatWire({ provider: "openrouter", model: "meta-llama/llama-3-70b" })).toBe(
      "completions",
    );
    expect(resolveChatWire({ provider: "ollama", model: "llama3" })).toBe("completions");
    expect(
      resolveChatWire({ customProviderUrl: "http://localhost:11434/v1/chat/completions" }),
    ).toBe("completions");
  });
});
