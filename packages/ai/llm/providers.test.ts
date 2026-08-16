import { describe, expect, it } from "bun:test";

import {
  PLATFORM_HOSTED_KIMI_K26_MODEL,
  OLLAMA_CLOUD_KIMI_K3_MODEL,
  OLLAMA_CLOUD_KIMI_K26_MODEL,
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
  it("uses Ollama Cloud Kimi K2.6 as the default create-agent model", () => {
    expect(DEFAULT_MODEL).toEqual({
      provider: "nolo",
      name: PLATFORM_HOSTED_KIMI_K26_MODEL,
    });
  });

  it("lists Kimi, hosted DeepSeek V4, GLM 5.2, Gemini 3.7 Flash, Claude, and Grok under nolo provider", () => {
    const models = getModelsByProvider("nolo");
    expect(models.map((m) => m.name).sort()).toEqual(
      [
        OLLAMA_CLOUD_KIMI_K3_MODEL,
        OLLAMA_CLOUD_KIMI_K26_MODEL,
        "deepseek-v4-flash",
        "deepseek-v4-pro",
        "glm-5.2",
        "gemini-3.7-flash",
        "anthropic/claude-sonnet-5",
        "anthropic/claude-opus-4-8",
        "grok-4.6",
        "qwen3.7-flash",
      ].sort(),
    );
    expect(models.some((m) => m.name === "deepseek-v4-pro")).toBe(true);
    expect(models.some((m) => m.name === "deepseek-v4-flash")).toBe(true);
    expect(models.some((m) => m.name === "glm-5.2")).toBe(true);
    expect(models.some((m) => m.name === "gemini-3.7-flash")).toBe(true);
    // Claude Haiku 4.5 已下架（无使用量），nolo 目录不再提供
    expect(models.some((m) => m.name === "anthropic/claude-haiku-4-5")).toBe(false);
    expect(
      models
        .filter((m) => m.name.startsWith("kimi"))
        .every((m) => m.displayName?.startsWith("Kimi")),
    ).toBe(true);
  });

  it("resolves nolo-hosted Kimi K3 as the flagship catalog entry", () => {
    expect(getModelConfig("nolo", OLLAMA_CLOUD_KIMI_K3_MODEL)).toMatchObject({
      name: OLLAMA_CLOUD_KIMI_K3_MODEL,
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
    expect(getModelConfig("nolo", OLLAMA_CLOUD_KIMI_K26_MODEL)).toMatchObject({
      name: OLLAMA_CLOUD_KIMI_K26_MODEL,
      displayName: "Kimi K2.6",
      hasVision: true,
      supportsTool: true,
      price: { input: 3.36, output: 13.44 },
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
    ).toBe("https://ollama.com/v1/chat/completions");
  });

  it("does not expose the retired official DeepSeek provider", () => {
    expect((getModelsByProvider as any)("deepseek")).toEqual([]);
    expect(() => getModelConfig("deepseek" as any, "deepseek-v4-pro")).toThrow(
      /not found|unknown/i,
    );
    expect(() =>
      getApiEndpoint({ provider: "deepseek", model: "deepseek-v4-pro" } as any),
    ).toThrow(/Unsupported provider/);
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

  it("provides GLM 5.2 through the nolo catalog", () => {
    expect(getModelConfig("nolo", "glm-5.2")).toMatchObject({
      name: "glm-5.2",
      displayName: "GLM 5.2",
      supportsTool: true,
    });
    expect(getProviderByModelName("glm-5.2")).toBeDefined();
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
      // 官方促销价（through 2026-12-31）：$0.75/$3.75/$0.075 × 8折 × 7 credits
      price: {
        input: 4.2,
        output: 21,
        cachingWrite: 0.42,
        cachingRead: 0.42,
      },
    });
  });

  it("keeps platform DeepSeek V4 Flash at the official RMB price", () => {
    expect(getModelConfig("nolo", "deepseek-v4-flash")).toMatchObject({
      name: "deepseek-v4-flash",
      price: { input: 1, inputCacheHit: 0.02, output: 2 },
    });
  });

  it("keeps Google live audio model in the google catalog", () => {
    expect(
      googleModels.some((m) => m.name === DEFAULT_GOOGLE_LIVE_AUDIO_MODEL),
    ).toBe(true);
  });
});
