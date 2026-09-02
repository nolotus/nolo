import { describe, expect, it } from "bun:test";
import {
  PLATFORM_HOSTED_ROUTING_TABLE,
  resolvePlatformHostedRouting,
  PLATFORM_HOSTED_KIMI_K26_OPENROUTER_MODEL_ID,
  PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION,
  PLATFORM_HOSTED_GLM_53_FLASH_MIN_CLIENT_VERSION,
  isRuninfraRouting,
} from "./platformHostedRoutingTable";
import {
  PLATFORM_HOSTED_KIMI_K26_MODEL,
  PLATFORM_HOSTED_KIMI_K3_MODEL,
} from "./kimi";

describe("PLATFORM_HOSTED_ROUTING_TABLE & resolvePlatformHostedRouting", () => {
  it("enforces mandatory non-empty endpoint, usageProvider, keyName, and wire for every entry", () => {
    const entries = Object.entries(PLATFORM_HOSTED_ROUTING_TABLE);
    expect(entries.length).toBeGreaterThanOrEqual(15);

    for (const [modelKey, entry] of entries) {
      expect(entry.endpoint).toBeDefined();
      expect(typeof entry.endpoint).toBe("string");
      expect(entry.endpoint.length).toBeGreaterThan(0);

      expect(entry.usageProvider).toBeDefined();
      expect(typeof entry.usageProvider).toBe("string");
      expect(entry.usageProvider.length).toBeGreaterThan(0);

      expect(entry.keyName).toBeDefined();
      expect(typeof entry.keyName).toBe("string");
      expect(entry.keyName.length).toBeGreaterThan(0);

      expect(entry.wire).toBeDefined();
      expect(["chat.completions", "responses"]).toContain(entry.wire);
    }
  });

  it("resolves exact four-tuples for all canonical platform-hosted models", () => {
    // 1. Kimi K2.6
    const k26 = resolvePlatformHostedRouting(PLATFORM_HOSTED_KIMI_K26_MODEL);
    expect(k26).toEqual({
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      usageProvider: "openrouter",
      keyName: "openrouter",
      upstreamModelId: PLATFORM_HOSTED_KIMI_K26_OPENROUTER_MODEL_ID,
      wire: "chat.completions",
      agentRunHosted: true,
    });

    // 2. GLM 5.3 & 5.2
    const glm53 = resolvePlatformHostedRouting("glm-5.3");
    expect(glm53).toEqual({
      endpoint: "https://crof.ai/v1/chat/completions",
      usageProvider: "crof",
      keyName: "crof",
      wire: "chat.completions",
      agentRunHosted: true,
    });
    const glm52 = resolvePlatformHostedRouting("glm-5.2");
    expect(glm52).toEqual({
      endpoint: "https://crof.ai/v1/chat/completions",
      usageProvider: "crof",
      keyName: "crof",
      // legacy 5.2 显式 remap 到 crof 的 glm-5.3
      upstreamModelId: "glm-5.3",
      wire: "chat.completions",
      agentRunHosted: true,
    });

    // 3. GLM 5.3 Flash
    const glmFlash = resolvePlatformHostedRouting("glm-5-3-flash");
    expect(glmFlash).toEqual({
      endpoint: "https://api.runinfra.ai/v1/chat/completions",
      usageProvider: "runinfra",
      keyName: "runinfra",
      wire: "chat.completions",
      agentRunHosted: true,
      minClientVersion: PLATFORM_HOSTED_GLM_53_FLASH_MIN_CLIENT_VERSION,
    });
    const glmFlashAlias = resolvePlatformHostedRouting("glm-5.3-flash");
    expect(glmFlashAlias?.usageProvider).toBe("runinfra");
    expect(glmFlashAlias?.minClientVersion).toBe(
      PLATFORM_HOSTED_GLM_53_FLASH_MIN_CLIENT_VERSION,
    );

    // 4. Kimi K3
    const k3 = resolvePlatformHostedRouting(PLATFORM_HOSTED_KIMI_K3_MODEL);
    expect(k3).toEqual({
      endpoint: "https://crof.ai/v1/chat/completions",
      usageProvider: "crof",
      keyName: "crof",
      wire: "chat.completions",
      agentRunHosted: true,
      minClientVersion: PLATFORM_HOSTED_KIMI_K3_MIN_CLIENT_VERSION,
    });

    // 5. Gemini 3.7 Flash
    const gemini = resolvePlatformHostedRouting("gemini-3.7-flash");
    expect(gemini).toEqual({
      endpoint:
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      usageProvider: "google",
      keyName: "google",
      wire: "chat.completions",
      agentRunHosted: true,
    });

    // 6. Gemini Image models
    const geminiImage = resolvePlatformHostedRouting(
      "gemini-3.1-flash-image-preview",
    );
    expect(geminiImage).toEqual({
      endpoint:
        "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      usageProvider: "google",
      keyName: "google",
      wire: "chat.completions",
      agentRunHosted: true,
    });

    // 7. Claude models（已下架，兼容重映射到 RunInfra glm-5-3-flash）
    const claude = resolvePlatformHostedRouting("anthropic/claude-sonnet-5");
    expect(claude).toEqual({
      endpoint: "https://api.runinfra.ai/v1/chat/completions",
      usageProvider: "runinfra",
      keyName: "runinfra",
      // 下架兼容：旧 claude 模型名显式 remap 到 glm-5-3-flash
      upstreamModelId: "glm-5-3-flash",
      wire: "chat.completions",
      agentRunHosted: true,
    });

    // 8. Grok (agentRunHosted: false)
    const grok = resolvePlatformHostedRouting("grok-4.6");
    expect(grok).toEqual({
      endpoint: "https://api.x.ai/v1/chat/completions",
      usageProvider: "xai",
      keyName: "xai",
      wire: "chat.completions",
      agentRunHosted: false,
    });

    // 9. OpenAI Image
    const openaiImage = resolvePlatformHostedRouting("gpt-image-2");
    expect(openaiImage).toEqual({
      endpoint: "https://api.openai.com/v1/responses",
      usageProvider: "openai",
      keyName: "openai",
      wire: "responses",
      agentRunHosted: true,
    });

    // 10. DeepSeek models (agentRunHosted: false, responses flow)
    const deepseekFlash = resolvePlatformHostedRouting("deepseek-v4-flash");
    expect(deepseekFlash).toEqual({
      endpoint: "https://api.deepseek.com/responses",
      usageProvider: "deepseek",
      keyName: "deepseek",
      wire: "responses",
      agentRunHosted: false,
    });
  });

  it("returns undefined for unknown models or non-string inputs", () => {
    expect(resolvePlatformHostedRouting("unknown-model-xyz")).toBeUndefined();
    expect(resolvePlatformHostedRouting("")).toBeUndefined();
    expect(resolvePlatformHostedRouting(null)).toBeUndefined();
    expect(resolvePlatformHostedRouting(undefined)).toBeUndefined();
  });
});

describe("isRuninfraRouting isolation", () => {
  it("matches runinfra by provider, endpoint, or routed model", () => {
    expect(isRuninfraRouting(null, null, "runinfra")).toBe(true);
    expect(
      isRuninfraRouting(null, "https://api.runinfra.ai/v1/chat/completions", null),
    ).toBe(true);
    expect(isRuninfraRouting("glm-5-3-flash", null, "nolo")).toBe(true);
  });

  it("does not misfire for other platform-hosted providers", () => {
    // crof / google / openai / deepseek / xai 必须完全不受 RunInfra 逻辑影响。
    expect(isRuninfraRouting("glm-5.3", null, "nolo")).toBe(false);
    expect(isRuninfraRouting("kimi-k3", null, "nolo")).toBe(false);
    expect(isRuninfraRouting("gemini-3.7-flash", null, "nolo")).toBe(false);
    expect(isRuninfraRouting(null, "https://crof.ai/v1/chat/completions", "crof")).toBe(
      false,
    );
    expect(isRuninfraRouting(null, "https://api.openai.com/v1/responses", "openai")).toBe(
      false,
    );
  });

  it("returns false for unknown or empty input rather than throwing", () => {
    expect(isRuninfraRouting(null, null, null)).toBe(false);
    expect(isRuninfraRouting("", "", "")).toBe(false);
    expect(isRuninfraRouting("no-such-model", null, "nolo")).toBe(false);
  });
});
