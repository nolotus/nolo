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
    // 平台 nolo 无默认上游（原 ollama.com 兜底已移除）：无模型 → undefined
    expect(resolvePlatformChatCompletionsEndpoint("nolo")).toBeUndefined();
    // legacy ollama-cloud 记录同样无默认上游
    expect(resolvePlatformChatCompletionsEndpoint("ollama-cloud")).toBeUndefined();
    // 平台托管 Claude：provider=nolo + anthropic/claude-* 路由到 deepinfra
    expect(
      resolvePlatformChatCompletionsEndpoint(
        "nolo",
        "anthropic/claude-opus-5",
      ),
    ).toBe("https://api.deepinfra.com/v1/openai/chat/completions");
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "anthropic/claude-sonnet-5"),
    ).toBe("https://api.deepinfra.com/v1/openai/chat/completions");
    // 平台托管 Grok：provider=nolo + grok-4.6 路由到 xAI 官方 API
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "grok-4.6"),
    ).toBe("https://api.x.ai/v1/chat/completions");
    // nolo + kimi-k2.6 & glm-5.2 路由到 OpenRouter
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "kimi-k2.6"),
    ).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "glm-5.2"),
    ).toBe("https://openrouter.ai/api/v1/chat/completions");
    // 平台托管 Kimi K3：实际上游 crof
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "kimi-k3"),
    ).toBe("https://crof.ai/v1/chat/completions");
    // 平台托管 Gemini 3.7 Flash：实际上游 Google
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "gemini-3.7-flash"),
    ).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    // 平台托管 DeepSeek V4 走 Responses 端点，chat.completions 返回 undefined
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "deepseek-v4-flash"),
    ).toBeUndefined();
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "deepseek-v4-pro"),
    ).toBeUndefined();
    expect(resolvePlatformResponsesEndpoint("nolo", "deepseek-v4-flash")).toBe(
      DEEPSEEK_RESPONSES_ENDPOINT,
    );
    expect(resolvePlatformChatCompletionsEndpoint("nolo-hosted")).toBeUndefined();
    expect(resolvePlatformChatCompletionsEndpoint(" OpenRouter ")).toBe(
      PLATFORM_CHAT_COMPLETIONS_ENDPOINTS.openrouter,
    );
  });

  test("resolvePlatformChatCompletionsEndpoint returns undefined for unknown", () => {
    expect(resolvePlatformChatCompletionsEndpoint("not-a-provider")).toBeUndefined();
    expect(resolvePlatformChatCompletionsEndpoint("")).toBeUndefined();
    expect(resolvePlatformChatCompletionsEndpoint("   ")).toBeUndefined();
    // 平台托管未识别模型：无 ollama.com 兜底，返回 undefined 让上层报错
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "future-model-x"),
    ).toBeUndefined();
  });

  test("isOpenAiResponsesModel recognizes OpenAI Responses models", () => {
    expect(
      isOpenAiResponsesModel({ provider: "openai", endpointKey: "responses" }),
    ).toBe(true);
    expect(
      isOpenAiResponsesModel({ provider: "openai", model: "gpt-4.1-mini" }),
    ).toBe(false);
    expect(
      isOpenAiResponsesModel({ provider: "deepseek", model: "deepseek-v4-flash" }),
    ).toBe(true);
    expect(
      isOpenAiResponsesModel({ provider: "deepseek", model: "deepseek-v4-pro" }),
    ).toBe(true);
    expect(
      isOpenAiResponsesModel({ provider: "nolo", model: "deepseek-v4-flash" }),
    ).toBe(true);
  });

  test("OPENAI_RESPONSES_ENDPOINT is the canonical responses URL", () => {
    expect(OPENAI_RESPONSES_ENDPOINT).toBe(
      "https://api.openai.com/v1/responses",
    );
  });

  test("resolves the provider-specific Responses endpoint", () => {
    expect(resolvePlatformResponsesEndpoint("openai")).toBe(OPENAI_RESPONSES_ENDPOINT);
    expect(resolvePlatformResponsesEndpoint("nolo", "deepseek-v4-flash")).toBe(DEEPSEEK_RESPONSES_ENDPOINT);
    expect(resolvePlatformResponsesEndpoint("nolo", "deepseek-v4-pro")).toBe(DEEPSEEK_RESPONSES_ENDPOINT);
    expect(resolvePlatformResponsesEndpoint("deepseek", "deepseek-v4-flash")).toBe(DEEPSEEK_RESPONSES_ENDPOINT);
    expect(resolvePlatformResponsesEndpoint("moonshot")).toBeUndefined();
  });
});
