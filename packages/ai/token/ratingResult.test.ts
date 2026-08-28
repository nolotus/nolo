import { describe, expect, it } from "bun:test";
import { createRatingResult, buildRatingResultKey } from "./ratingResult";

const baseUsage = {
  input_tokens: 0,
  output_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
};

describe("provider rating result snapshots", () => {
  it("builds stable append-only keys", () => {
    expect(buildRatingResultKey("rating_123")).toBe("rating-result-rating_123");
  });

  it("snapshots OpenAI GPT pricing with multiplier 8 exactly once", () => {
    const rating = createRatingResult({
      ratingId: "rating_openai",
      billableEventId: "billable_openai",
      provider: "openai",
      model: "gpt-5.5",
      usage: {
        ...baseUsage,
        input_tokens: 100_000,
        output_tokens: 1_000_000,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    expect(rating.platformCredits).toBe(244);
    expect(rating.snapshot.commercialMultiplier).toBe(8);
    expect(rating.snapshot.providerUnitPrices.input).toBe(5);
    expect(rating.snapshot.providerUnitPrices.output).toBe(30);
    expect(rating.snapshot.settlementUnitPrices.input).toBe(40);
    expect(rating.snapshot.settlementUnitPrices.output).toBe(240);
  });

  it("snapshots nolo-hosted Kimi pricing with multiplier 8", () => {
    const rating = createRatingResult({
      ratingId: "rating_nolo_kimi",
      billableEventId: "billable_nolo_kimi",
      provider: "nolo",
      model: "kimi-k2.6",
      usage: {
        ...baseUsage,
        input_tokens: 1_000_000,
        output_tokens: 1_000_000,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    // Kimi nolo catalog 已按 USD×8 = 8 credits/USD：input 3.2 + output 24.0 = 27.2。
    expect(rating.platformCredits).toBe(27.2);
    expect(rating.snapshot.commercialMultiplier).toBe(8);
    expect(rating.snapshot.providerUnitPrices.input).toBeCloseTo(3.2 / 8, 10); // 0.4 USD/1M
    expect(rating.snapshot.providerUnitPrices.output).toBeCloseTo(24 / 8, 10); // 3.0 USD/1M
    expect(rating.snapshot.settlementUnitPrices.input).toBe(3.2);
    expect(rating.snapshot.settlementUnitPrices.output).toBe(24);
  });
});
