import { describe, expect, test } from "bun:test";
import {
  isOpenAiResponsesModel,
  DEEPSEEK_RESPONSES_ENDPOINT,
  OPENAI_RESPONSES_ENDPOINT,
  PLATFORM_CHAT_COMPLETIONS_ENDPOINTS,
  resolvePlatformChatCompletionsEndpoint,
  resolvePlatformHostedCredentialProvider,
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
    // nolo + kimi-k2.6 路由到 OpenRouter；glm-5.3/5.2 已切 crof（legacy 5.2 remap 5.3）
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "kimi-k2.6"),
    ).toBe("https://openrouter.ai/api/v1/chat/completions");
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "glm-5.2"),
    ).toBe("https://crof.ai/v1/chat/completions");
    // 平台托管 Kimi K3：实际上游 crof
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "kimi-k3"),
    ).toBe("https://crof.ai/v1/chat/completions");
    // 平台托管 Gemini 3.7 Flash：实际上游 Google
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "gemini-3.7-flash"),
    ).toBe("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions");
    // 平台托管 DeepSeek V4 Flash 走 Responses 端点，chat.completions 返回 undefined
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "deepseek-v4-flash"),
    ).toBeUndefined();
    // 平台托管 DeepSeek V4 Pro 独立走 RunInfra chat.completions
    expect(
      resolvePlatformChatCompletionsEndpoint("nolo", "deepseek-v4-pro"),
    ).toBe("https://api.runinfra.ai/v1/chat/completions");
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
      isOpenAiResponsesModel({ provider: "deepseek", model: "deepseek-v4-flash-vision-exp" }),
    ).toBe(true);
    expect(
      isOpenAiResponsesModel({ provider: "nolo", model: "deepseek-v4-flash" }),
    ).toBe(true);
    expect(
      isOpenAiResponsesModel({ provider: "nolo", model: "deepseek-v4-pro" }),
    ).toBe(false);
  });

  test("OPENAI_RESPONSES_ENDPOINT is the canonical responses URL", () => {
    expect(OPENAI_RESPONSES_ENDPOINT).toBe(
      "https://api.openai.com/v1/responses",
    );
  });

  test("resolves the provider-specific Responses endpoint", () => {
    expect(resolvePlatformResponsesEndpoint("openai")).toBe(OPENAI_RESPONSES_ENDPOINT);
    expect(resolvePlatformResponsesEndpoint("nolo", "deepseek-v4-flash")).toBe(DEEPSEEK_RESPONSES_ENDPOINT);
    expect(resolvePlatformResponsesEndpoint("nolo", "deepseek-v4-pro")).toBeUndefined();
    expect(resolvePlatformResponsesEndpoint("deepseek", "deepseek-v4-flash")).toBe(DEEPSEEK_RESPONSES_ENDPOINT);
    expect(resolvePlatformResponsesEndpoint("moonshot")).toBeUndefined();
  });
});

describe("resolvePlatformHostedCredentialProvider", () => {
  test("maps every platform-hosted model family to its real upstream id", () => {
    // 与 resolvePlatformChatCompletionsEndpoint 逐条对应：端点解析到谁家，
    // key / usage 白名单就用谁家。本映射同时被本地 runtime 的 usage 白名单
    // 查询和 server 侧 getApiKey 复用，改这里两处同步生效。
    expect(resolvePlatformHostedCredentialProvider("nolo", "kimi-k3")).toBe("crof");
    expect(resolvePlatformHostedCredentialProvider("nolo", "kimi-k2.6")).toBe("openrouter");
    expect(resolvePlatformHostedCredentialProvider("nolo", "deepseek-v4-pro")).toBe("runinfra");
    expect(resolvePlatformHostedCredentialProvider("nolo", "glm-5.3")).toBe("crof");
    expect(resolvePlatformHostedCredentialProvider("nolo", "glm-5.2")).toBe("crof");
    expect(resolvePlatformHostedCredentialProvider("nolo", "glm-5-3-flash")).toBe("runinfra");
    expect(resolvePlatformHostedCredentialProvider("nolo", "gemini-3.7-flash")).toBe("google");
    // Gemini 出图模型同上游 Google
    expect(
      resolvePlatformHostedCredentialProvider("nolo", "gemini-3.1-flash-image-preview"),
    ).toBe("google");
    expect(resolvePlatformHostedCredentialProvider("nolo", "gpt-image-2")).toBe("openai");
    expect(resolvePlatformHostedCredentialProvider("nolo", "anthropic/claude-opus-5")).toBe("deepinfra");
    expect(resolvePlatformHostedCredentialProvider("nolo", "grok-4.6")).toBe("xai");
    // legacy 记录别名同样命中
    expect(resolvePlatformHostedCredentialProvider("ollama-cloud", "kimi-k3")).toBe("crof");
  });

  test("returns undefined for non-hosted providers and unrouted models", () => {
    expect(resolvePlatformHostedCredentialProvider("openai", "gpt-5.5")).toBeUndefined();
    expect(resolvePlatformHostedCredentialProvider("moonshot", "kimi-k3")).toBeUndefined();
    expect(resolvePlatformHostedCredentialProvider("nolo", "unsupported-model")).toBeUndefined();
    expect(resolvePlatformHostedCredentialProvider("nolo")).toBeUndefined();
  });
});
