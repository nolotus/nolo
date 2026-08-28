import { describe, expect, it } from "bun:test";

let moduleVersion = 0;
let imagePricingVersion = 0;

const loadPricingModules = async () => {
  const pricingModule = await import(`../getPricing.ts`);
  const imagePricingModule = await import(
    `../imagePricing.ts?test=${imagePricingVersion++}`
  );
  return {
    ...pricingModule,
    ...imagePricingModule,
  };
};

describe("getAgentPriceHint", () => {
  it("estimates per-turn pricing for text agents", async () => {
    const { getAgentPriceHint } = await loadPricingModules();
    const hint = getAgentPriceHint({
      inputPrice: 2,
      outputPrice: 4,
      provider: "fireworks",
      model: "accounts/fireworks/models/kimi-k2p6",
      imageConfig: undefined,
    });

    expect(hint).toEqual({
      type: "per_turn",
      amount: 0.0022,
    });
  });

  it("returns null for image agents when the model catalog has no image pricing truth", async () => {
    const { getAgentPriceHint } = await loadPricingModules();
    const hint = getAgentPriceHint({
      inputPrice: 0,
      outputPrice: 0,
      provider: "openrouter",
      model: "bytedance-seed/seedream-4.5",
      imageConfig: { enabled: true },
    });

    expect(hint).toBeNull();
  });

  it("prices image agents from imageModel when present", async () => {
    const { getAgentPriceHint } = await loadPricingModules();
    const hint = getAgentPriceHint({
      inputPrice: 0,
      outputPrice: 0,
      provider: "openai",
      model: "gpt-5.6-terra",
      imageModel: "gpt-image-2",
      imageConfig: { enabled: true, imageSize: "2K" },
    } as any);

    expect(hint).toEqual({
      amount: 0.32784, // 1366 tokens * 30 * 8 / 1_000_000
      type: "per_image",
    });
  });

  it("derives Google image pricing from token truth and selected size", async () => {
    const { getAgentPriceHint } = await loadPricingModules();
    const hint = getAgentPriceHint({
      inputPrice: 0,
      outputPrice: 0,
      provider: "google",
      model: "gemini-3.1-flash-image-preview",
      imageConfig: { enabled: true, imageSize: "2K" },
    });

    expect(hint).toEqual({
      type: "per_image",
      amount: 0.8064,
    });
  });

  it("returns null when no pricing info is available", async () => {
    const { getAgentPriceHint } = await loadPricingModules();
    const hint = getAgentPriceHint({
      inputPrice: 0,
      outputPrice: 0,
      provider: "fireworks",
      model: "accounts/fireworks/models/kimi-k2p6",
      imageConfig: undefined,
    });

    expect(hint).toBeNull();
  });

  it("returns a default-profile image estimate for the generator agent", async () => {
    const { getAgentPriceHint } = await loadPricingModules();
    const hint = getAgentPriceHint({
      inputPrice: 0,
      outputPrice: 0,
      provider: "google",
      model: "gemini-3.1-flash-image-preview",
      imageWorkflow: "generate",
      imageConfig: { enabled: true, imageSize: "2K" },
    } as any);

    // Generator agent should use the default profile (1K) pricing, not the configured 2K pricing
    // 1K estimate: 480 * 1120 / 1_000_000 = 0.5376 (not 2K's 0.8064)
    expect(hint).toEqual({
      type: "per_image",
      amount: 0.5376,
      profileLabel: "medium · 1024x1024",
      labelKey: "defaultImageProfileEstimate",
    });
  });

  it("uses 1K default profile pricing for generator even when agent is configured for 2K", async () => {
    const { getAgentPriceHint } = await loadPricingModules();
    const hint = getAgentPriceHint({
      inputPrice: 0,
      outputPrice: 0,
      provider: "google",
      model: "gemini-3.1-flash-image-preview",
      imageWorkflow: "generate",
      imageConfig: { enabled: true, imageSize: "2K" },
    } as any);

    // Should use 1K pricing (1120 tokens * 480 per million / 1_000_000 = 0.5376)
    // NOT 2K pricing (1680 tokens * 480 per million / 1_000_000 = 0.8064)
    expect(hint).toEqual({
      type: "per_image",
      amount: 0.5376,
      labelKey: "defaultImageProfileEstimate",
      profileLabel: "medium · 1024x1024",
    });
  });

  it("uses 1K default profile pricing for generator even when agent is configured for 4K", async () => {
    const { getAgentPriceHint } = await loadPricingModules();
    const hint = getAgentPriceHint({
      inputPrice: 0,
      outputPrice: 0,
      provider: "google",
      model: "gemini-3.1-flash-image-preview",
      imageWorkflow: "generate",
      imageConfig: { enabled: true, imageSize: "4K" },
    } as any);

    // Should use 1K pricing (1120 tokens * 480 per million / 1_000_000 = 0.5376)
    // NOT 4K pricing (2520 tokens * 480 per million / 1_000_000 = 1.2096)
    expect(hint).toEqual({
      type: "per_image",
      amount: 0.5376,
      labelKey: "defaultImageProfileEstimate",
      profileLabel: "medium · 1024x1024",
    });
  });
});

describe("getModelPricingForModel", () => {
  it("returns standard pricing for gpt-5.5 by default", async () => {
    const { getModelPricingForModel } = await loadPricingModules();
    expect(
      getModelPricingForModel("openai", "gpt-5.5", {
        price: { input: 40, inputCacheHit: 4, output: 240 },
      })
    ).toEqual({
      inputPrice: 40,
      inputCacheHitPrice: 4,
      outputPrice: 240,
    });
  });

  it("returns DeepSeek V4 pricing", async () => {
    const { getModelPricingForModel } = await loadPricingModules();
    expect(
      getModelPricingForModel("deepseek", "deepseek-v4-flash", {
        price: { input: 0.14 * 8, inputCacheHit: 0.0028 * 8, output: 0.28 * 8 },
      })
    ).toEqual({
      inputPrice: 0.14 * 8,
      inputCacheHitPrice: 0.0028 * 8,
      outputPrice: 0.28 * 8,
    });
    expect(
      getModelPricingForModel("deepseek", "deepseek-v4-pro", {
        price: { input: 0.435 * 8, inputCacheHit: 0.003625 * 8, output: 0.87 * 8 },
      })
    ).toEqual({
      inputPrice: 0.435 * 8,
      inputCacheHitPrice: 0.003625 * 8,
      outputPrice: 0.87 * 8,
    });
  });

  it("returns agent-level price overrides when provided", async () => {
    const { getModelPricingForModel } = await loadPricingModules();
    expect(
      getModelPricingForModel("openai", "gpt-5.6-terra", {
        price: { input: 20, inputCacheHit: 2, output: 120 },
      })
    ).toEqual({
      inputPrice: 20,
      inputCacheHitPrice: 2,
      outputPrice: 120,
    });
  });

  it("normalizes missing cache-hit pricing to zero", async () => {
    const { getModelPricingForModel } = await loadPricingModules();
    expect(
      getModelPricingForModel("openrouter", "x-ai/grok-4.3", {
        price: { input: 24, output: 120 },
      })
    ).toEqual({
      inputPrice: 24,
      inputCacheHitPrice: 0,
      outputPrice: 120,
    });
  });
});

describe("formatPriceAmount", () => {
  it("formats small amounts without scientific notation", async () => {
    const { formatPriceAmount } = await loadPricingModules();
    expect(formatPriceAmount(0.32)).toBe("0.32");
    expect(formatPriceAmount(0.0022)).toBe("0.0022");
    expect(formatPriceAmount(0.000032)).toBe("0.000032");
  });
});

describe("formatCompactTurnPrice", () => {
  it("keeps per-turn display for larger amounts", async () => {
    const { formatCompactTurnPrice } = await loadPricingModules();
    expect(formatCompactTurnPrice(0.015)).toEqual({
      amountText: "0.015",
      unitCount: 1,
    });
  });

  it("switches to per-100 display for tiny amounts", async () => {
    const { formatCompactTurnPrice } = await loadPricingModules();
    expect(formatCompactTurnPrice(0.00015)).toEqual({
      amountText: "0.015",
      unitCount: 100,
    });
  });

  it("switches to per-1000 display for ultra-tiny amounts", async () => {
    const { formatCompactTurnPrice } = await loadPricingModules();
    expect(formatCompactTurnPrice(0.000005)).toEqual({
      amountText: "0.005",
      unitCount: 1000,
    });
  });
});

describe("getApproxPricePerImage", () => {
  it("uses exact token estimates for Google image models", async () => {
    const { getApproxPricePerImage } = await loadPricingModules();
    expect(
      getApproxPricePerImage(
        {
          imageTokenPricePerMillion: 60 * 8,
          imageOutputTokenEstimateBySize: {
            "1K": 1120,
            "2K": 1680,
            "4K": 2520,
          },
        },
        "4K"
      )
    ).toBe(1.2096);
  });

  it("falls back to 1K pricing when no size is specified", async () => {
    const { getApproxPricePerImage } = await loadPricingModules();
    expect(
      getApproxPricePerImage({
        imageTokenPricePerMillion: 30 * 8,
        imageOutputTokenEstimateBySize: {
          "1K": 1290,
        },
      })
    ).toBe(0.3096);
  });

  it("uses quality-specific token estimates when present", async () => {
    const { getApproxPricePerImage } = await loadPricingModules();
    expect(
      getApproxPricePerImage(
        {
          imageTokenPricePerMillion: 30 * 8,
          imageOutputTokenEstimateBySize: {
            "1K": { low: 200, medium: 1766, high: 7033 },
          },
        },
        "1K",
        "high"
      )
    ).toBe(1.68792);
  });
});
