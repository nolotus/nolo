// ai/token/pricingSimulator.test.ts
import { describe, expect, it } from "bun:test";
import {
  pricingReplay,
  pricingReplayBatch,
  breakEvenHitRate,
  workloadFingerprint,
  missTokens,
  cacheHitRate,
  outputInputRatio,
  type Pricing,
  type Workload,
} from "./pricingSimulator";

// ---- 真实 workload fixture（来自之前讨论的案例）----
const REAL_WORKLOAD: Workload = {
  inputTokens: 11_230_307,
  cachedInputTokens: 10_595_712,
  outputTokens: 311_960,
};

const PRICING_A: Pricing = { inputPerMillion: 0.12, cachedInputPerMillion: 0.003, outputPerMillion: 0.21 };
const PRICING_B: Pricing = { inputPerMillion: 0.44, cachedInputPerMillion: 0.014, outputPerMillion: 1.32 };
const PRICING_C: Pricing = { inputPerMillion: 0.08, cachedInputPerMillion: 0.016, outputPerMillion: 0.18 };

describe("pricingSimulator - basic calculations", () => {
  it("miss tokens = input - cached", () => {
    expect(missTokens(REAL_WORKLOAD)).toBe(11_230_307 - 10_595_712);
    expect(missTokens(REAL_WORKLOAD)).toBe(634_595);
  });

  it("miss tokens = 0 when cached > input (defensive)", () => {
    expect(missTokens({ inputTokens: 100, cachedInputTokens: 200, outputTokens: 0 })).toBe(0);
  });

  it("cache hit rate = cached / input", () => {
    const rate = cacheHitRate(REAL_WORKLOAD);
    expect(rate).toBeCloseTo(0.9435, 3);
  });

  it("cache hit rate = 0 when input = 0", () => {
    expect(cacheHitRate({ inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 })).toBe(0);
  });

  it("output/input ratio", () => {
    const ratio = outputInputRatio(REAL_WORKLOAD);
    expect(ratio).toBeCloseTo(0.0278, 3);
  });
});

describe("pricingSimulator - workload fingerprint", () => {
  it("generates complete fingerprint from real workload", () => {
    const fp = workloadFingerprint(REAL_WORKLOAD, 1000);
    expect(fp.calls).toBe(1000);
    expect(fp.inputTokens).toBe(11_230_307);
    expect(fp.cachedInputTokens).toBe(10_595_712);
    expect(fp.missInputTokens).toBe(634_595);
    expect(fp.outputTokens).toBe(311_960);
    expect(fp.cacheHitRate).toBeCloseTo(0.9435, 3);
    expect(fp.outputInputRatio).toBeCloseTo(0.0278, 3);
  });
});

describe("pricingSimulator - pricing replay", () => {
  it("A < C << B (real workload)", () => {
    const costA = pricingReplay(REAL_WORKLOAD, PRICING_A);
    const costC = pricingReplay(REAL_WORKLOAD, PRICING_C);
    const costB = pricingReplay(REAL_WORKLOAD, PRICING_B);

    // A should be cheapest, then C, then B
    expect(costA).toBeLessThan(costC);
    expect(costC).toBeLessThan(costB);
  });

  it("batch replay sorts by cost ascending", () => {
    const results = pricingReplayBatch(
      REAL_WORKLOAD,
      [
        { name: "B", pricing: PRICING_B },
        { name: "A", pricing: PRICING_A },
        { name: "C", pricing: PRICING_C },
      ],
      1000,
    );

    expect(results[0].name).toBe("A");
    expect(results[1].name).toBe("C");
    expect(results[2].name).toBe("B");
    expect(results[0].cost).toBeLessThan(results[1].cost);
    expect(results[1].cost).toBeLessThan(results[2].cost);
  });

  it("cost calculation is correct (not double-charging cached tokens)", () => {
    // A: miss=634595, cached=10595712, output=311960
    // cost = 634595/1M * 0.12 + 10595712/1M * 0.003 + 311960/1M * 0.21
    const expectedCost =
      (634_595 / 1_000_000) * 0.12 +
      (10_595_712 / 1_000_000) * 0.003 +
      (311_960 / 1_000_000) * 0.21;
    const costA = pricingReplay(REAL_WORKLOAD, PRICING_A);
    expect(costA).toBeCloseTo(expectedCost, 4);
  });

  it("zero workload = zero cost", () => {
    const zeroWorkload: Workload = { inputTokens: 0, cachedInputTokens: 0, outputTokens: 0 };
    expect(pricingReplay(zeroWorkload, PRICING_A)).toBe(0);
  });
});

describe("pricingSimulator - break-even cache hit rate", () => {
  it("A vs C: A is cheaper at current 94.35% hit rate", () => {
    const result = breakEvenHitRate(REAL_WORKLOAD, PRICING_A, PRICING_C);
    expect(result.aIsCheaper).toBe(true);
    expect(result.currentHitRate).toBeCloseTo(0.9435, 3);
  });

  it("A vs C: break-even hit rate exists and is below current", () => {
    const result = breakEvenHitRate(REAL_WORKLOAD, PRICING_A, PRICING_C);
    expect(result.breakEvenHitRate).not.toBeNull();
    expect(result.breakEvenHitRate!).toBeLessThan(result.currentHitRate);
    expect(result.safetyMarginPp).toBeGreaterThan(0);
  });

  it("C vs A: when swapped, C (as A) is more expensive than A (as B)", () => {
    const result = breakEvenHitRate(REAL_WORKLOAD, PRICING_C, PRICING_A);
    expect(result.aIsCheaper).toBe(false);
    // C has expensive cache; at 94% hit it's already more expensive → negative margin
    expect(result.safetyMarginPp).toBeLessThan(0);
  });

  it("identical pricing = no break-even (null)", () => {
    const result = breakEvenHitRate(REAL_WORKLOAD, PRICING_A, PRICING_A);
    expect(result.breakEvenHitRate).toBeNull();
    expect(result.safetyMarginPp).toBeNull();
  });
});

describe("pricingSimulator - undefined usage handling", () => {
  it("handles zero cached tokens", () => {
    const noCache: Workload = { inputTokens: 100_000, cachedInputTokens: 0, outputTokens: 1000 };
    const fp = workloadFingerprint(noCache, 10);
    expect(fp.cacheHitRate).toBe(0);
    expect(fp.missInputTokens).toBe(100_000);
    const cost = pricingReplay(noCache, PRICING_A);
    expect(cost).toBeCloseTo(0.1 * 0.12 + 0 + 0.001 * 0.21, 6);
  });

  it("handles all-cached workload", () => {
    const allCache: Workload = { inputTokens: 100_000, cachedInputTokens: 100_000, outputTokens: 0 };
    const cost = pricingReplay(allCache, PRICING_A);
    // miss = 0, all cached
    expect(cost).toBeCloseTo(0.1 * 0.003, 6);
  });
});