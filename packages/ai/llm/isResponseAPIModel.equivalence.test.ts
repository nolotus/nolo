import { describe, expect, it } from "bun:test";
import { isResponseAPIModel } from "./isResponseAPIModel";

/**
 * Equivalence contract: isResponseAPIModel must agree with resolveChatWire
 * (single source of truth) for every agent shape that previously flowed
 * through the legacy mirror (provider/endpointKey/model heuristics).
 * Keeps providerRoutingContract.test.ts (client/proxy format agreement, F1)
 * honest without duplicating the wire logic.
 */
describe("isResponseAPIModel (delegates to resolveChatWire)", () => {
  it("nolo / deepseek V4 models use Responses", () => {
    expect(isResponseAPIModel({ provider: "nolo", model: "deepseek-v4-flash" })).toBe(true);
    expect(isResponseAPIModel({ provider: "nolo", model: "deepseek-v4-pro" })).toBe(true);
    expect(isResponseAPIModel({ provider: "deepseek", model: "deepseek-v4-flash" })).toBe(true);
  });

  it("openai + responses endpointKey uses Responses", () => {
    expect(
      isResponseAPIModel({ provider: "openai", model: "gpt-5.6", endpointKey: "responses" }),
    ).toBe(true);
  });

  it("non-responses providers use completions", () => {
    expect(isResponseAPIModel({ provider: "xai", model: "grok-4.6" })).toBe(false);
    expect(isResponseAPIModel({ provider: "google", model: "gemini-3.6" })).toBe(false);
    expect(isResponseAPIModel({ provider: "anthropic", model: "claude-opus-5" })).toBe(false);
    expect(isResponseAPIModel({ provider: "openai", model: "gpt-4.1-mini" })).toBe(false);
    expect(isResponseAPIModel({ provider: "custom", model: "llama-3.3" })).toBe(false);
  });

  it("CLI OAuth agents (codex/claude) are not Responses", () => {
    expect(
      isResponseAPIModel({ provider: "openai", model: "gpt-5.6", cliProvider: "codex" }),
    ).toBe(false);
    expect(
      isResponseAPIModel({ provider: "anthropic", model: "claude-opus-5", cliProvider: "claude" }),
    ).toBe(false);
  });

  it("custom provider pointing at a Responses endpoint is classified as Responses", () => {
    // Legacy mirror returned false for non-openai providers even when the
    // endpoint URL clearly speaks /responses; resolveChatWire fixes this
    // (client/proxy format agreement, F1).
    expect(
      isResponseAPIModel({
        provider: "custom",
        model: "deepseek-v4-flash",
        customProviderUrl: "https://api.deepseek.com/responses",
      }),
    ).toBe(true);
  });
});
