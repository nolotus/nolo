import { describe, expect, test } from "bun:test";
import { computeBillingBreakdown } from "./billingBreakdown";

const record = (overrides: Record<string, unknown> = {}) => ({
  input_tokens: 100000,
  output_tokens: 20000,
  cache_read_input_tokens: 60000,
  cache_creation_input_tokens: 10000,
  inputPrice: 0.12,
  outputPrice: 0.21,
  inputCacheHitPrice: 0.003,
  cacheWritePrice: 0.015,
  cost: 0.04,
  billable: true,
  ...overrides,
});

describe("computeBillingBreakdown", () => {
  test("splits input cost on the miss portion only (input includes cache hits)", () => {
    const b = computeBillingBreakdown(record());

    // miss = 100000 − 60000 = 40000
    expect(b.missInputTokens).toBe(40000);
    expect(b.inputCost).toBeCloseTo((40000 * 0.12) / 1e6, 6);
    expect(b.cacheReadCost).toBeCloseTo((60000 * 0.003) / 1e6, 6);
    expect(b.outputCost).toBeCloseTo((20000 * 0.21) / 1e6, 6);
    expect(b.cacheWriteCost).toBeCloseTo((10000 * 0.015) / 1e6, 6);

    const expected =
      (40000 * 0.12 + 60000 * 0.003 + 20000 * 0.21 + 10000 * 0.015) / 1e6;
    expect(b.estimatedTotal).toBeCloseTo(expected, 6);
  });

  test("treats missing cache price as free reads (cachingRead || 0)", () => {
    const b = computeBillingBreakdown(record({ inputCacheHitPrice: undefined }));

    expect(b.cacheReadCost).toBe(0);
    expect(b.cachePriceKnown).toBe(false);
  });

  test("handles records with no unit prices at all", () => {
    const b = computeBillingBreakdown(
      record({
        inputPrice: undefined,
        outputPrice: undefined,
        inputCacheHitPrice: undefined,
        cacheWritePrice: undefined,
      })
    );

    expect(b.hasPrices).toBe(false);
    expect(b.estimatedTotal).toBe(0);
  });

  test("clamps negative miss input to zero", () => {
    const b = computeBillingBreakdown(
      record({ cache_read_input_tokens: 120000 }) // > input
    );

    expect(b.missInputTokens).toBe(0);
    expect(b.inputCost).toBe(0);
  });

  test("reports the charged cost and billable flag", () => {
    const billed = computeBillingBreakdown(record({ cost: 0.0312 }));
    expect(billed.charged).toBe(0.0312);
    expect(billed.billable).toBe(true);

    const ownApi = computeBillingBreakdown(record({ billable: false }));
    expect(ownApi.billable).toBe(false);
  });
});
