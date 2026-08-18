import { describe, expect, it } from "bun:test";

import { normalizeUsage } from "./normalizeUsage";

describe("normalizeUsage xAI cost_in_usd_ticks", () => {
  it("converts xAI ticks (1 tick = 1e-10 USD) to USD cost", () => {
    // 4_920_000 ticks * 1e-10 = 0.000492 USD (matches my live grok-4.5 ping).
    const result = normalizeUsage({
      prompt_tokens: 216,
      completion_tokens: 5,
      total_tokens: 258,
      cost_in_usd_ticks: 4_920_000,
    });
    expect(result.cost).toBeCloseTo(0.000492, 9);
  });

  it("preserves raw ticks on the normalized record", () => {
    const result = normalizeUsage({
      prompt_tokens: 100,
      completion_tokens: 10,
      total_tokens: 110,
      cost_in_usd_ticks: 1_000_000,
    });
    expect(result.cost_in_usd_ticks).toBe(1_000_000);
  });

  it("respects caller-supplied cost over xAI ticks when both present", () => {
    // The caller is the source of truth at this layer: they may have
    // already converted from a non-USD unit (e.g. credits). Silent
    // override would corrupt downstream cost math. The raw ticks are
    // still preserved on the result for downstream consumers that want
    // them.
    const result = normalizeUsage({
      input_tokens: 1000,
      output_tokens: 200,
      cost: 0.99, // caller-converted value
      cost_in_usd_ticks: 1_000_000, // would be 1e-4 USD if it won
    });
    expect(result.cost).toBe(0.99);
    expect(result.cost_in_usd_ticks).toBe(1_000_000);
  });

  it("falls back to caller-supplied cost when no ticks present", () => {
    const result = normalizeUsage({
      input_tokens: 100,
      output_tokens: 10,
      cost: 0.05,
    });
    expect(result.cost).toBe(0.05);
  });

  it("defaults to zero cost when neither ticks nor cost present", () => {
    const result = normalizeUsage({
      input_tokens: 100,
      output_tokens: 10,
    });
    expect(result.cost).toBe(0);
    expect(result.cost_in_usd_ticks).toBeUndefined();
  });
});
