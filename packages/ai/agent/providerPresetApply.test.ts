import { describe, expect, it } from "bun:test";
import {
  MANUAL_PROVIDER_PRESET_ID,
  applyProviderPresetFields,
  listMeteredApiPresetOptions,
  listSubscriptionPresetOptions,
  findApiKeyTemplatePresetIdByProviderAndUrl,
  findOAuthProviderPresetIdByApiKeyRef,
  resolveProviderPresetFields,
} from "./providerPresetApply";

describe("providerPresetApply", () => {
  it("resolves manual preset with empty custom fields", () => {
    const fields = resolveProviderPresetFields(MANUAL_PROVIDER_PRESET_ID);
    expect(fields.kind).toBe("manual");
    expect(fields.provider).toBe("custom");
    expect(fields.customProviderUrl).toBe("");
    expect(fields.requiresDesktopOAuth).toBe(false);
  });

  it("resolves Token Plan as key template without desktop oauth", () => {
    const fields = resolveProviderPresetFields("token-plan");
    expect(fields.kind).toBe("api_key_template");
    expect(fields.customProviderUrl).toContain("token-plan");
    expect(fields.model).toBeTruthy();
    expect(fields.requiresDesktopOAuth).toBe(false);
    expect(fields.lockCustomProviderUrl).toBe(true);
  });

  it("resolves ChatGPT OAuth as desktop-bound oauth", () => {
    const fields = resolveProviderPresetFields("chatgpt");
    expect(fields.kind).toBe("oauth");
    expect(fields.apiKeyRef).toBe("chatgpt");
    expect(fields.clearApiKey).toBe(true);
    expect(fields.requiresDesktopOAuth).toBe(true);
    expect(fields.model).toBe("gpt-5.6-sol");
    expect(fields.modelOptions[0]).toMatchObject({
      id: "gpt-5.6-sol",
      recommended: true,
      hasVision: true,
    });
  });

  it("resolves Claude OAuth to the canonical credential ref", () => {
    expect(resolveProviderPresetFields("claude-oauth")).toMatchObject({
      kind: "oauth",
      provider: "anthropic",
      model: "claude-sonnet-5",
      apiKeyRef: "claude",
      customProviderUrl: "",
      clearApiKey: true,
    });
  });

  it("restores the OAuth preset from the canonical credential ref", () => {
    expect(findOAuthProviderPresetIdByApiKeyRef("claude")).toBe("claude-oauth");
    expect(findOAuthProviderPresetIdByApiKeyRef("xai")).toBe("xai-oauth");
    expect(findOAuthProviderPresetIdByApiKeyRef("")).toBeUndefined();
  });

  it("applies fields through setValue callback", () => {
    const bag: Record<string, string> = {};
    applyProviderPresetFields(resolveProviderPresetFields("openai-api"), (k, v) => {
      bag[k] = v;
    });
    expect(bag.provider).toBe("openai");
    expect(bag.customProviderUrl).toContain("openai.com");
    expect(bag.model).toBeTruthy();
  });

  it("lists metered presets without oauth brands", () => {
    const ids = listMeteredApiPresetOptions().map((o) => o.id);
    expect(ids).toContain("openai-api");
    expect(ids).toContain(MANUAL_PROVIDER_PRESET_ID);
    expect(ids).not.toContain("chatgpt");
  });

  it("lists subscription presets with token plan first and oauth desktop flags", () => {
    const opts = listSubscriptionPresetOptions();
    expect(opts.some((o) => o.id === "token-plan" && !o.requiresDesktopOAuth)).toBe(
      true
    );
    expect(opts.some((o) => o.id === "ollama-cloud" && !o.requiresDesktopOAuth)).toBe(true);
    expect(opts.some((o) => o.id === "chatgpt" && o.requiresDesktopOAuth)).toBe(true);
    expect(resolveProviderPresetFields("ollama-cloud")).toMatchObject({
      provider: "ollama-cloud",
      customProviderUrl: "https://ollama.com/v1",
      model: "deepseek-v4-flash:cloud",
      modelOptions: [
        { id: "glm-5.2:cloud" },
        { id: "deepseek-v4-flash:cloud", recommended: true },
        { id: "deepseek-v4-pro:cloud" },
        { id: "kimi-k3:cloud" },
      ],
      requiresDesktopOAuth: false,
    });
  });

  it("resolves Z.AI / BigModel coding plan subscriptions as token plans", () => {
    const zai = resolveProviderPresetFields("zai-coding-plan");
    expect(zai).toMatchObject({
      kind: "api_key_template",
      provider: "zai",
      customProviderUrl: "https://api.z.ai/api/coding/paas/v4",
      model: "glm-5.3-flash",
      requiresDesktopOAuth: false,
      lockCustomProviderUrl: true,
    });
    expect(zai.modelOptions[0]).toMatchObject({ id: "glm-5.3-flash", recommended: true });

    const bigmodel = resolveProviderPresetFields("bigmodel-coding-plan");
    expect(bigmodel).toMatchObject({
      provider: "bigmodel",
      customProviderUrl: "https://open.bigmodel.cn/api/coding/paas/v4",
      model: "glm-5.3",
      requiresDesktopOAuth: false,
    });

    const subIds = listSubscriptionPresetOptions().map((o) => o.id);
    expect(subIds).toContain("zai-coding-plan");
    expect(subIds).toContain("bigmodel-coding-plan");

    // 编辑反查：只存 provider + baseUrl 的存量 agent 能还原 preset
    expect(
      findApiKeyTemplatePresetIdByProviderAndUrl("zai", "https://api.z.ai/api/coding/paas/v4")
    ).toBe("zai-coding-plan");
    expect(
      findApiKeyTemplatePresetIdByProviderAndUrl("bigmodel", "https://open.bigmodel.cn/api/coding/paas/v4")
    ).toBe("bigmodel-coding-plan");
    // 尾斜杠容错
    expect(
      findApiKeyTemplatePresetIdByProviderAndUrl("zai", "https://api.z.ai/api/coding/paas/v4/")
    ).toBe("zai-coding-plan");
  });

  it("threads model vision capability into preset modelOptions", () => {
    // 千问 Token Plan：qwen3.8-max 支持视觉理解
    const qwen = resolveProviderPresetFields("qwen-token-plan");
    expect(qwen.modelOptions[0]).toMatchObject({
      id: "qwen3.8-max",
      hasVision: true,
    });

    // Moonshot 开放平台：kimi-k3 支持视觉
    const moonshot = resolveProviderPresetFields("kimi-api");
    expect(moonshot.modelOptions.find((m) => m.id === "kimi-k3")?.hasVision).toBe(
      true
    );
  });
});
