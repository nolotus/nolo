import { describe, expect, it } from "bun:test";

import {
  PLATFORM_HOSTED_KIMI_K26_MODEL,
  PLATFORM_HOSTED_KIMI_K3_MODEL,
} from "./kimi";
import {
  DEFAULT_MODEL,
  getApiEndpoint,
  getModelConfig,
  getModelsByProvider,
  getProviderByModelName,
} from "./providers";
import { isModelSupportReasoningEffort } from "./reasoningModels";
import { DEFAULT_GOOGLE_LIVE_AUDIO_MODEL } from "ai/agent/liveAudioModel";
import { googleModels } from "integrations/google/models";

describe("Ollama Cloud Kimi catalog", () => {
  it("uses DeepSeek V4 Flash Vision Exp as the default create-agent model", () => {
    expect(DEFAULT_MODEL).toEqual({
      provider: "nolo",
      name: "deepseek-v4-flash-vision-exp",
    });
  });

  it("lists Kimi, hosted DeepSeek V4, GLM 5.3, Gemini 3.7 Flash, Grok, and image models under nolo provider", () => {
    const models = getModelsByProvider("nolo");
    expect(models.map((m) => m.name).sort()).toEqual(
      [
        PLATFORM_HOSTED_KIMI_K3_MODEL,
        PLATFORM_HOSTED_KIMI_K26_MODEL,
        "deepseek-v4-flash",
        "deepseek-v4-flash-vision-exp",
        "deepseek-v4-pro",
        "glm-5.3",
        "glm-5-3-flash",
        "nemotron-3-5-lightning-30b",
        "gemini-3.7-flash",
        "grok-4.6",
        // 出图模型收进 nolo 平台托管（上游 OpenAI / Google，模型名保持不变）
        "gpt-image-2",
        "gemini-3-pro-image-preview",
        "gemini-3.1-flash-image-preview",
        "gemini-3.1-flash-lite-image",
      ].sort(),
    );
    expect(models.some((m) => m.name === "deepseek-v4-pro")).toBe(true);
    expect(models.some((m) => m.name === "deepseek-v4-flash")).toBe(true);
    expect(models.find((m) => m.name === "deepseek-v4-flash-vision-exp")).toMatchObject({
      hasVision: true,
    });
    expect(models.some((m) => m.name === "glm-5.3")).toBe(true);
    expect(models.some((m) => m.name === "glm-5-3-flash")).toBe(true);
    expect(models.some((m) => m.name === "gemini-3.7-flash")).toBe(true);
    // Claude Haiku 4.5 已下架（无使用量），nolo 目录不再提供
    expect(models.some((m) => m.name === "anthropic/claude-haiku-4-5")).toBe(false);
    // Claude 系整体下架（2026-09-01）：路由表仅保留兼容重映射，目录不再上架
    expect(models.some((m) => m.name.startsWith("anthropic/claude"))).toBe(false);
    expect(
      models
        .filter((m) => m.name.startsWith("kimi"))
        .every((m) => m.displayName?.startsWith("Kimi")),
    ).toBe(true);
  });

  it("resolves nolo-hosted Kimi K3 as the flagship catalog entry", () => {
    expect(getModelConfig("nolo", PLATFORM_HOSTED_KIMI_K3_MODEL)).toMatchObject({
      name: PLATFORM_HOSTED_KIMI_K3_MODEL,
      displayName: "Kimi K3",
      hasVision: true,
      supportsTool: true,
      supportsReasoningEffort: true,
      contextWindow: 1_000_000,
      price: { input: 16, inputCacheHit: 2, output: 64 },
    });
    expect(isModelSupportReasoningEffort("kimi-k3")).toBe(true);
  });

  it("resolves nolo-hosted Kimi models with calibrated upper prices", () => {
    expect(getModelConfig("nolo", PLATFORM_HOSTED_KIMI_K26_MODEL)).toMatchObject({
      name: PLATFORM_HOSTED_KIMI_K26_MODEL,
      displayName: "Kimi K2.6",
      hasVision: true,
      supportsTool: true,
      price: { input: 3.2, output: 24 },
    });
    // legacy provider id still resolves model config
    expect(
      getModelConfig("ollama-cloud" as any, PLATFORM_HOSTED_KIMI_K26_MODEL),
    ).toMatchObject({
      name: PLATFORM_HOSTED_KIMI_K26_MODEL,
    });
  });

  it("points nolo-hosted Kimi agents at the private OpenAI-compatible endpoint", () => {
    expect(
      getApiEndpoint({
        provider: "nolo",
        model: PLATFORM_HOSTED_KIMI_K26_MODEL,
      } as any),
    ).toBe("");
  });

  it("resolves legacy deepseek provider alias to platform hosted models", () => {
    expect(
      getModelConfig("deepseek" as any, "deepseek-v4-pro")
    ).toMatchObject({
      name: "deepseek-v4-pro",
    });
    expect(
      getApiEndpoint({ provider: "deepseek", model: "deepseek-v4-pro" } as any)
    ).toBe("");
  });

  it("does not list Kimi under fireworks or deepinfra catalogs", () => {
    for (const provider of ["fireworks", "deepinfra"] as const) {
      const names = getModelsByProvider(provider).map((m) =>
        `${m.name} ${m.displayName ?? ""}`.toLowerCase(),
      );
      expect(names.some((n) => n.includes("kimi"))).toBe(false);
    }
  });

  it("does not register vultr as a selectable platform provider", () => {
    expect(() => getModelsByProvider("vultr" as any)).not.toThrow();
    // removed from MODEL_MAP — empty / missing
    const models = (getModelsByProvider as any)("vultr") ?? [];
    expect(Array.isArray(models) ? models : []).toEqual([]);
  });

  it("provides GLM 5.3 (and legacy glm-5.2 alias) through the nolo catalog", () => {
    expect(getModelConfig("nolo", "glm-5.3")).toMatchObject({
      name: "glm-5.3",
      displayName: "GLM 5.3",
      supportsTool: true,
    });
    expect(getModelConfig("nolo", "glm-5.2")).toMatchObject({
      name: "glm-5.3",
      displayName: "GLM 5.3",
      supportsTool: true,
    });
    expect(getProviderByModelName("glm-5.3")).toBeDefined();
    const mimoProvider = getProviderByModelName("mimo-v2.5-pro");
    expect(mimoProvider).toBe("opencode-go");
    expect(getModelsByProvider(mimoProvider!)).not.toHaveLength(0);
    expect(getModelConfig(mimoProvider!, "mimo-v2.5-pro")).toMatchObject({
      name: "mimo-v2.5-pro",
    });
  });

  it("provides Gemini 3.7 Flash through the nolo catalog", () => {
    expect(getModelConfig("nolo", "gemini-3.7-flash")).toMatchObject({
      name: "gemini-3.7-flash",
      displayName: "Gemini 3.7 Flash",
      supportsTool: true,
      // 官方促销价（through 2026-12-31）：$0.75/$3.75/$0.075 × 8 credits
      price: {
        input: 6,
        output: 30,
        cachingWrite: 0.6,
        cachingRead: 0.6,
      },
    });
  });

  it("keeps Gemini 3.8 out of the nolo platform catalog; Google native stays available", () => {
    // 平台托管/计费目录不收录 Gemini 3.8（官方定价未确认，避免未确认价格进入真实计费路径）
    expect(
      getModelsByProvider("nolo").some((m) => m.name === "gemini-3.8-flash")
    ).toBe(false);
    // 3.7 与现有默认模型保持不变
    expect(getModelConfig("nolo", "gemini-3.7-flash")).toBeDefined();
    expect(DEFAULT_MODEL).toEqual({
      provider: "nolo",
      name: "deepseek-v4-flash-vision-exp",
    });
    // Google 直连目录同步可用（provider=google 通道 / OAuth native）
    expect(googleModels.some((m) => m.name === "gemini-3.8-flash")).toBe(true);
  });

  it("keeps platform DeepSeek V4 Flash at the official peak/off-peak pricing", () => {
    expect(getModelConfig("nolo", "deepseek-v4-flash")).toMatchObject({
      name: "deepseek-v4-flash",
      // DeepSeek 人民币计价，经 CNY_UPSTREAM_MULTIPLIER(1.2) 加价后入账：
      // 峰 ¥3/¥0.1/¥9 → 3.6/0.12/10.8；谷 ¥1.5/¥0.05/¥4.5 → 1.8/0.06/5.4
      price: { input: 3.6, inputCacheHit: 0.12, output: 10.8 },
      peakPrice: { input: 3.6, inputCacheHit: 0.12, output: 10.8 },
      offPeakPrice: { input: 1.8, inputCacheHit: 0.06, output: 5.4 },
    });
  });

  it("keeps Google live audio model in the google catalog", () => {
    expect(
      googleModels.some((m) => m.name === DEFAULT_GOOGLE_LIVE_AUDIO_MODEL),
    ).toBe(true);
  });
});
