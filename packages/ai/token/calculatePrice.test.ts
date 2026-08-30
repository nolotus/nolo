import { describe, expect, it } from "bun:test";

import { calculatePrice } from "./calculatePrice";

describe("calculatePrice", () => {
  it("converts OpenRouter usage.cost from account credits into platform credits", () => {
    const result = calculatePrice({
      provider: "openrouter",
      modelName: "openai/gpt-5.5",
      usage: {
        input_tokens: 100,
        output_tokens: 20,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cost: 0.95,
      },
    });

    expect(result.cost).toBe(7.6);
  });



  it("prices nolo-hosted Kimi K2.6 with calibrated Ollama Cloud rates", () => {
    const result = calculatePrice({
      provider: "nolo",
      modelName: "kimi-k2.6",
      usage: {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cost: 0,
      },
    });

    // nolo catalog: K2.6 (Qwen3.8 27B) $0.40/$3.00 × 8 = 3.2 input + 24.0 output = 27.2
    expect(result.cost).toBe(27.2);
  });

  it("prices DeepSeek V4 Flash in platform credits", () => {
    const result = calculatePrice({
      provider: "nolo",
      modelName: "deepseek-v4-flash",
      usage: {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cost: 0,
      },
      nowMs: Date.UTC(2026, 7, 16, 20), // 04:00 Beijing, off-peak
    });

    expect(result.cost).toBe(7.2);
  });

  it("prices DeepSeek V4 Pro using single RunInfra rate without peak/off-peak variation", () => {
    const usage = {
      input_tokens: 2_000_000,
      output_tokens: 1_000_000,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 1_000_000,
      cost: 0,
    };
    // uncached input (1M) 4.8 + output (1M) 15.2 + cache_read (1M) 0.24 = 20.24 credits
    const offPeakResult = calculatePrice({
      provider: "nolo",
      modelName: "deepseek-v4-pro",
      usage,
      nowMs: Date.UTC(2026, 7, 16, 20), // off-peak
    });
    const peakResult = calculatePrice({
      provider: "nolo",
      modelName: "deepseek-v4-pro",
      usage,
      nowMs: Date.UTC(2026, 7, 17, 2), // peak (10:00 Beijing)
    });

    expect(offPeakResult.cost).toBe(20.24);
    expect(peakResult.cost).toBe(20.24);
  });

  it("applies Math.max floor-price protection when agent snapshot carries stale lower prices", () => {
    // Agent snapshot may carry stale Ollama list prices (0.03/0.16) while the
    // catalog has risen to DeepSeek V4 peak (3/9). getEffectivePrices is Math.max
    // (floor-price protection), so the charge must use the higher catalog price,
    // never the stale snapshot price.
    const result = calculatePrice({
      provider: "nolo",
      modelName: "deepseek-v4-flash",
      externalPrice: { input: 0.03, output: 0.16 },
      usage: {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cost: 0,
      },
      nowMs: Date.UTC(2026, 7, 17, 1), // 09:00 Beijing, peak
    });

    // DeepSeek 人民币计价经 ×1.2 加价后峰价为 3.6 / 10.8：
    // max(0.03, 3.6) + max(0.16, 10.8) = 14.4, not the stale 0.19.
    expect(result.cost).toBe(14.4);
  });

  it("prices cached OpenAI input with cache-hit pricing instead of charging it twice", () => {
    const result = calculatePrice({
      provider: "openai",
      modelName: "gpt-5.5",
      usage: {
        input_tokens: 100_000,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 80_000,
        cost: 0,
      },
    });

    // gpt-5.5 registry price is already the final platform price:
    // 20k uncached input * 40 + 80k cached input * 4.
    expect(result.cost).toBe(1.12);
  });

  it("defaults OpenAI GPT-5.5 billing to standard pricing under the long-context boundary", () => {
    const result = calculatePrice({
      provider: "openai",
      modelName: "gpt-5.5",
      usage: {
        input_tokens: 100_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cost: 0,
      },
    });

    // 100k * 40 + 1M * 240 = 4 + 240
    expect(result.cost).toBe(244);
  });

  it("adds the built-in OpenAI image surcharge for GPT Image 2 outputs", () => {
    const result = calculatePrice({
      provider: "openai",
      modelName: "gpt-image-2",
      usage: {
        input_tokens: 0,
        output_tokens: 0,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        image_generation_count: 1,
        cost: 0,
      },
    });

    expect(result.cost).toBe(0.42384); // 1766 tokens * 30 * 8 / 1_000_000 = 0.42384
  });



  it("prices Gemini 3.6 Flash flex tier with cache discount", () => {
    const result = calculatePrice({
      provider: "google",
      modelName: "gemini-3.6-flash",
      billingServiceTier: "flex",
      usage: {
        input_tokens: 300_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 100_000,
        cache_read_input_tokens: 100_000,
        cost: 0,
      },
    });

    expect(result.cost).toBe(37.328);
  });

  it("prices Gemini 3.6 Flash priority tier at the official 1.8x input/output rate", () => {
    const result = calculatePrice({
      provider: "google",
      modelName: "gemini-3.6-flash",
      billingServiceTier: "priority",
      usage: {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
        cost: 0,
      },
    });

    expect(result.cost).toBe(151.2);
  });

  it("prices Gemini 3.6 Flash priority tier with the official cache multiplier", () => {
    const result = calculatePrice({
      provider: "google",
      modelName: "gemini-3.6-flash",
      billingServiceTier: "priority",
      usage: {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 100_000,
        cache_read_input_tokens: 100_000,
        cost: 0,
      },
    });

    expect(result.cost).toBe(149.472);
  });

  it("prices Gemini 3.6 Flash standard tier with official cache pricing", () => {
    const result = calculatePrice({
      provider: "google",
      modelName: "gemini-3.6-flash",
      usage: {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 100_000,
        cache_read_input_tokens: 100_000,
        cost: 0,
      },
    });

    expect(result.cost).toBe(83.04);
  });

  it("prices Gemini 3.6 Flash flex tier with the official cache discount (100k cache)", () => {
    const result = calculatePrice({
      provider: "google",
      modelName: "gemini-3.6-flash",
      billingServiceTier: "flex",
      usage: {
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
        cache_creation_input_tokens: 100_000,
        cache_read_input_tokens: 100_000,
        cost: 0,
      },
    });

    expect(result.cost).toBe(41.528);
  });

  it("tiers OpenAI GPT-5.6 input pricing around the 272_000-token boundary", () => {
    const cases: Array<{
      modelName: string;
      inputTokens: number;
      expectedInputPrice: number;
    }> = [
      { modelName: "gpt-5.6-sol", inputTokens: 272_000, expectedInputPrice: 40 },
      { modelName: "gpt-5.6-sol", inputTokens: 272_001, expectedInputPrice: 80 },
      {
        modelName: "gpt-5.6-terra",
        inputTokens: 272_000,
        expectedInputPrice: 16,
      },
      {
        modelName: "gpt-5.6-terra",
        inputTokens: 272_001,
        expectedInputPrice: 32,
      },
      { modelName: "gpt-5.6-luna", inputTokens: 272_000, expectedInputPrice: 1.6 },
      { modelName: "gpt-5.6-luna", inputTokens: 272_001, expectedInputPrice: 1.6 },
    ];

    for (const { modelName, inputTokens, expectedInputPrice } of cases) {
      const result = calculatePrice({
        provider: "openai",
        modelName,
        usage: {
          input_tokens: inputTokens,
          output_tokens: 0,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
          cost: 0,
        },
      });

      const expectedCost = (inputTokens * expectedInputPrice) / 1_000_000;
      expect(result.cost).toBeCloseTo(expectedCost, 6);
    }
  });

  it("prices platform-hosted GLM 5.2 with 8-fold discounted rates and cache-hit support", () => {
    // 1M uncached input, 500k cache-read input, 200k output
    // PLATFORM_HOSTED_GLM_PRICE (USD×8):
    //   input: 1.4 * 8 = 11.2 credits / 1M
    //   inputCacheHit: 0.06 * 8 = 0.48 credits / 1M (crof cache_prompt $0.06)
    //   output: 4.4 * 8 = 35.2 credits / 1M
    const result = calculatePrice({
      provider: "nolo",
      modelName: "glm-5.2",
      usage: {
        input_tokens: 1_500_000,
        output_tokens: 200_000,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 500_000,
        cost: 0,
      },
    });

    // 1M fresh input (11.2) + 0.5M cached input (0.24) + 0.2M output (7.04) = 18.48
    expect(result.cost).toBeCloseTo(18.48, 4);
  });

  it("prices platform-hosted GLM 5.3 Flash cache-hit input at the RunInfra cached rate", () => {
    // RunInfra official: input $0.10 / cached $0.01 / output $0.40 per 1M, ×8 credits.
    // cache_read 10000 + fresh input 1000 + output 500:
    //   (1000×0.8 + 10000×0.08 + 500×3.2) / 1e6 = (800 + 800 + 1600) / 1e6 = 0.0032
    const result = calculatePrice({
      provider: "nolo",
      modelName: "glm-5-3-flash",
      usage: {
        input_tokens: 11_000,
        output_tokens: 500,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 10_000,
        cost: 0,
      },
    });

    expect(result.cost).toBeCloseTo(0.0032, 6);
  });
});
