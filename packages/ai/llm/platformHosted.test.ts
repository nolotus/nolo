import { describe, expect, it } from "bun:test";

import {
  DEEPSEEK_V4_PRICING_EFFECTIVE_AT_MS,
  getPlatformHostedDeepSeekV4Price,
  PLATFORM_HOSTED_DEEPSEEK_FLASH_OFF_PEAK_PRICE,
  PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE,
  PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL,
  PLATFORM_HOSTED_DEEPSEEK_PRO_OFF_PEAK_PRICE,
  PLATFORM_HOSTED_DEEPSEEK_PRO_PEAK_PRICE,
  PLATFORM_HOSTED_DEEPSEEK_PRO_PRICE,
  platformHostedModels,
  resolvePlatformDeepseekFlashRoute,
} from "./platformHosted";

const planRoute = (
  overrides: Partial<Parameters<typeof resolvePlatformDeepseekFlashRoute>[0]> = {},
) =>
  resolvePlatformDeepseekFlashRoute({
    provider: "nolo",
    model: "deepseek-v4-flash",
    endpoint: "https://ollama.com/v1/chat/completions",
    isCustomApi: false,
    hasExplicitCredential: false,
    hasDeepseekKey: true,
    ...overrides,
  });

describe("resolvePlatformDeepseekFlashRoute", () => {
  it("routes hosted Flash to the official API with nolo billing identity", () => {
    // The official DeepSeek API is the production hosted upstream.
    expect(planRoute()).toEqual({ kind: "hosted", primaryProvider: "nolo", credentialProvider: "deepseek", wire: "responses" });
  });

  it("routes legacy deepseek-provider records to the same hosted upstream", () => {
    // Stale agent records still store provider "deepseek"; they mean the same
    // model, which now lives on nolo.
    expect(planRoute({ provider: "deepseek" })).toEqual({
      kind: "hosted",
      primaryProvider: "nolo",
      credentialProvider: "deepseek",
      wire: "responses",
    });
  });

  it("reports missing hosted credentials without inventing a route", () => {
    expect(planRoute({ hasDeepseekKey: false })).toEqual({ kind: "missing_key" });
  });

  it("keeps an explicit Responses endpoint on its configured route", () => {
    expect(
      planRoute({ endpoint: "https://api.deepseek.com/v1/responses" }),
    ).toEqual({ kind: "configured" });
  });

  it("treats the platform default DeepSeek Responses endpoint as hosted (not explicit)", () => {
    // Clients resolve provider=nolo + hosted V4 to this exact URL via
    // resolvePlatformResponsesEndpoint("nolo") and pass it as the request url.
    // It must NOT be treated as a user-explicit Responses endpoint, or the
    // chat proxy falls back to the provider=nolo key (OLLAMA_API_KEY) against
    // api.deepseek.com and fails with 401.
    expect(
      planRoute({
        endpoint: "https://api.deepseek.com/responses",
      }),
    ).toEqual({
      kind: "hosted",
      primaryProvider: "nolo",
      credentialProvider: "deepseek",
      wire: "responses",
    });
  });

  it("keeps custom, explicitly credentialed, and non-Flash requests configured", () => {
    expect(planRoute({ isCustomApi: true })).toEqual({ kind: "configured" });
    expect(planRoute({ hasExplicitCredential: true })).toEqual({ kind: "configured" });
  });

  it("routes hosted Pro to the official Responses API", () => {
    expect(
      planRoute({ model: PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL }),
    ).toEqual({ kind: "hosted", primaryProvider: "nolo", credentialProvider: "deepseek", wire: "responses" });
  });

  it("keeps unknown DeepSeek models on their configured route", () => {
    expect(planRoute({ model: "deepseek-v3" })).toEqual({ kind: "configured" });
  });
});

describe("DeepSeek V4 peak/off-peak pricing", () => {
  it("keeps the old price before the effective timestamp", () => {
    expect(
      getPlatformHostedDeepSeekV4Price(
        "deepseek-v4-flash",
        DEEPSEEK_V4_PRICING_EFFECTIVE_AT_MS - 1,
      ),
    ).toEqual({ input: 1, inputCacheHit: 0.02, output: 2 });
  });

  it("uses Beijing peak windows after the effective timestamp", () => {
    const peak = Date.UTC(2026, 7, 17, 1); // 09:00 Beijing
    const offPeak = Date.UTC(2026, 7, 17, 4); // 12:00 Beijing
    expect(getPlatformHostedDeepSeekV4Price("deepseek-v4-flash", peak)).toEqual(
      PLATFORM_HOSTED_DEEPSEEK_FLASH_PEAK_PRICE,
    );
    expect(getPlatformHostedDeepSeekV4Price("deepseek-v4-pro", peak)).toEqual(
      PLATFORM_HOSTED_DEEPSEEK_PRO_PEAK_PRICE,
    );
    expect(getPlatformHostedDeepSeekV4Price("deepseek-v4-flash", offPeak)).toEqual(
      PLATFORM_HOSTED_DEEPSEEK_FLASH_OFF_PEAK_PRICE,
    );
    expect(getPlatformHostedDeepSeekV4Price("deepseek-v4-pro", offPeak)).toEqual(
      PLATFORM_HOSTED_DEEPSEEK_PRO_OFF_PEAK_PRICE,
    );
  });
});

describe("platform hosted DeepSeek V4 catalog", () => {
  it("keeps V4 Flash and adds V4 Pro to the nolo catalog", () => {
    expect(platformHostedModels.map((model) => model.name)).toContain(
      "deepseek-v4-flash",
    );
    expect(platformHostedModels.map((model) => model.name)).toContain(
      PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL,
    );
  });

  it("publishes V4 Pro capabilities and pricing", () => {
    expect(
      platformHostedModels.find(
        (model) => model.name === PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL,
      ),
    ).toMatchObject({
      name: PLATFORM_HOSTED_DEEPSEEK_PRO_MODEL,
      displayName: "DeepSeek V4 Pro",
      hasVision: false,
      contextWindow: 1_000_000,
      maxOutputTokens: 384_000,
      supportsTool: true,
      supportsReasoningEffort: true,
      price: PLATFORM_HOSTED_DEEPSEEK_PRO_PRICE,
    });
  });
});
