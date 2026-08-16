import { describe, expect, test } from "bun:test";
import {
  isOpenAiResponsesModel,
  DEEPSEEK_RESPONSES_ENDPOINT,
  OPENAI_RESPONSES_ENDPOINT,
  PLATFORM_CHAT_COMPLETIONS_ENDPOINTS,
  resolvePlatformChatCompletionsEndpoint,
  resolvePlatformResponsesEndpoint,
} from "./platformProviderEndpoints";

describe("platformProviderEndpoints", () => {
  test("resolvePlatformChatCompletionsEndpoint maps known providers", () => {
    expect(resolvePlatformChatCompletionsEndpoint("openai")).toBe(
      PLATFORM_CHAT_COMPLETIONS_ENDPOINTS.openai,
    );
    expect(resolvePlatformChatCompletionsEndpoint("nolo")).toBe(
      "https://ollama.com/v1/chat/completions",
    );
    // Legacy agent records still carry provider="ollama-cloud"; it is an alias
    // of "nolo" and must resolve to the same endpoint (not undefined).
    expect(resolvePlatformChatCompletionsEndpoint("ollama-cloud")).toBe(
      "https://ollama.com/v1/chat/completions",
    );
    // provider="deepseek" is retired (2026-08-13) and aliases to "nolo";
    // DeepSeek V4 models still route via the Responses endpoint instead.
    expect(resolvePlatformChatCompletionsEndpoint("deepseek")).toBe(
      "https://ollama.com/v1/chat/completions",
    );
    // 平台托管 Claude：provider=nolo + anthropic/claude-* 路由到 deepinfra
    //（记录侧统一 nolo，实际上游仍 deepinfra）。
    expect(
      resolvePlatformChatCompletionsEndpoint(
        "nolo",
        "anthropic/claude-opus-4-8",
      ),
    ).toBe("https://api.deepinfra.com/v1/openai/chat/completions");
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "anthropic/claude-sonnet-5"),
    ).toBe("https://api.deepinfra.com/v1/openai/chat/completions");
    // 平台托管 Grok：provider=nolo + grok-4.6 路由到 xAI 官方 API
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "grok-4.6"),
    ).toBe("https://api.x.ai/v1/chat/completions");
    // nolo + 非 claude 模型仍走 ollama.com
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "kimi-k2.6"),
    ).toBe("https://ollama.com/v1/chat/completions");
    expect(resolvePlatformChatCompletionsEndpoint(" DeepSeek ")).toBe(
      "https://ollama.com/v1/chat/completions",
    );
    expect(resolvePlatformResponsesEndpoint("nolo")).toBe(DEEPSEEK_RESPONSES_ENDPOINT);
    // "nolo-hosted" was a half-finished rename of "ollama-cloud" that never
    // reached getNoloKey, so it could never resolve a key. Retired in favour
    // of the canonical "nolo".
    expect(resolvePlatformChatCompletionsEndpoint("nolo-hosted")).toBeUndefined();
    expect(resolvePlatformChatCompletionsEndpoint(" OpenRouter ")).toBe(
      PLATFORM_CHAT_COMPLETIONS_ENDPOINTS.openrouter,
    );
  });

  test("resolvePlatformChatCompletionsEndpoint returns undefined for unknown", () => {
    expect(resolvePlatformChatCompletionsEndpoint("not-a-provider")).toBeUndefined();
    expect(resolvePlatformChatCompletionsEndpoint("")).toBeUndefined();
    expect(resolvePlatformChatCompletionsEndpoint("   ")).toBeUndefined();
  });

  test("isOpenAiResponsesModel recognizes OpenAI Responses models", () => {
    expect(
      isOpenAiResponsesModel({ provider: "openai", endpointKey: "responses" }),
    ).toBe(true);
    expect(
      isOpenAiResponsesModel({ provider: "openai", model: "gpt-4.1-mini" }),
    ).toBe(false);
    // Both hosted DeepSeek V4 models use the official Responses endpoint.
    expect(
      isOpenAiResponsesModel({ provider: "deepseek", model: "deepseek-v4-flash" }),
    ).toBe(true);
    expect(
      isOpenAiResponsesModel({ provider: "deepseek", model: "deepseek-v4-pro" }),
    ).toBe(true);
  });

  test("OPENAI_RESPONSES_ENDPOINT is the canonical responses URL", () => {
    expect(OPENAI_RESPONSES_ENDPOINT).toBe(
      "https://api.openai.com/v1/responses",
    );
  });

  test("resolves the provider-specific Responses endpoint", () => {
    expect(resolvePlatformResponsesEndpoint("openai")).toBe(OPENAI_RESPONSES_ENDPOINT);
    expect(isOpenAiResponsesModel({ provider: "nolo", model: "deepseek-v4-flash" })).toBe(true);
    expect(isOpenAiResponsesModel({ provider: "nolo", model: "deepseek-v4-pro" })).toBe(true);
    expect(isOpenAiResponsesModel({ provider: "nolo", model: " DeepSeek-V4-Pro " })).toBe(true);
    expect(resolvePlatformResponsesEndpoint("deepseek")).toBe(DEEPSEEK_RESPONSES_ENDPOINT);
    expect(resolvePlatformResponsesEndpoint("moonshot")).toBeUndefined();
  });
});
