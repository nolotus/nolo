import { describe, expect, it } from "bun:test";

import { DEEPSEEK_V4_PRICING_EFFECTIVE_AT_MS } from "ai/llm/platformHosted";
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

    expect(result.cost).toBe(6.65);
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

    // nolo catalog: K2.6 official $0.6/$2.4 → ×0.8×7 = 3.36 input + 13.44 output
    expect(result.cost).toBe(16.8);
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
      nowMs: Date.UTC(2026, 7, 17, 4), // 12:00 Beijing, off-peak
    });

    expect(result.cost).toBe(6);
  });

  it("prices hosted DeepSeek V4 at the Beijing off-peak rate after launch", () => {
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
      nowMs: DEEPSEEK_V4_PRICING_EFFECTIVE_AT_MS - 1,
    });

    // The legacy price remains active until the announced launch timestamp.
    expect(result.cost).toBe(3);
  });

  it("applies Math.max floor-price protection when agent snapshot carries stale lower prices", () => {
    // Agent snapshot may carry stale Ollama list prices (0.03/0.16) while the
    // catalog has risen to official DeepSeek 1/2. getEffectivePrices is Math.max
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
    });

    // max(0.03, 1) + max(0.16, 2) = 3, not the stale 0.19.
    expect(result.cost).toBe(3);
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

    expect(result.cost).toBe(32.662);
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

    expect(result.cost).toBe(132.3);
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

    expect(result.cost).toBe(130.788);
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

    expect(result.cost).toBe(72.66);
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

    expect(result.cost).toBe(36.337);
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
    // PLATFORM_HOSTED_GLM_PRICE:
    //   input: 1.4 * 0.8 * 7 = 7.84 credits / 1M
    //   inputCacheHit: 0.26 * 0.8 * 7 = 1.456 credits / 1M
    //   output: 4.4 * 0.8 * 7 = 24.64 credits / 1M
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

    // 1M fresh input (7.84) + 0.5M cached input (0.728) + 0.2M output (4.928) = 13.496
    expect(result.cost).toBeCloseTo(13.496, 4);
  });
});
