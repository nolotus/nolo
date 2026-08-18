import { describe, expect, test } from "bun:test";
import {
  NOISE_FLOOR_TOKENS,
  calculateCacheMiss,
  type ModelPriceSource,
} from "./cacheStats";

describe("cacheStats", () => {
  const mockPrice: ModelPriceSource = {
    inputPerMillion: 3.0,
    outputPerMillion: 15.0,
  };

  test("returns cause 'none' when prefix is unchanged and model/idle unchanged", () => {
    const report = calculateCacheMiss({
      prevPrefixHash: "hash-a",
      currentPrefixHash: "hash-a",
      prevPrefixEstimatedTokens: 4096,
      idleMs: 1000,
      modelChanged: false,
      priceSource: mockPrice,
    });

    expect(report.cause).toBe("none");
    expect(report.missedTokens).toBe(0);
    expect(report.missedCost).toBe(0);
  });

  test("identifies cause 'prefix_change' even when tokens < NOISE_FLOOR_TOKENS (1024)", () => {
    const report = calculateCacheMiss({
      prevPrefixHash: "hash-a",
      currentPrefixHash: "hash-b",
      prevPrefixEstimatedTokens: 500, // < 1024
      idleMs: 1000,
      modelChanged: false,
      priceSource: mockPrice,
    });

    expect(report.cause).toBe("prefix_change");
    expect(report.missedTokens).toBe(500);
    expect(report.missedCost).toBeCloseTo((500 / 1e6) * 3.0);
  });

  test("identifies cause 'model_change' when modelChanged is true and tokens >= 1024", () => {
    const report = calculateCacheMiss({
      prevPrefixHash: "hash-a",
      currentPrefixHash: "hash-a",
      prevPrefixEstimatedTokens: 2000,
      idleMs: 1000,
      modelChanged: true,
      priceSource: mockPrice,
    });

    expect(report.cause).toBe("model_change");
    expect(report.missedTokens).toBe(2000);
    expect(report.missedCost).toBeCloseTo((2000 / 1e6) * 3.0);
  });

  test("filters noise to cause 'none' when cause is 'model_change' but tokens < NOISE_FLOOR_TOKENS (1024)", () => {
    const report = calculateCacheMiss({
      prevPrefixHash: "hash-a",
      currentPrefixHash: "hash-a",
      prevPrefixEstimatedTokens: NOISE_FLOOR_TOKENS - 1, // 1023 < 1024
      idleMs: 1000,
      modelChanged: true,
      priceSource: mockPrice,
    });

    expect(report.cause).toBe("none");
    expect(report.missedTokens).toBe(0);
    expect(report.missedCost).toBe(0);
  });

  test("identifies cause 'idle' when idleMs >= threshold and tokens >= 1024", () => {
    const report = calculateCacheMiss({
      prevPrefixHash: "hash-a",
      currentPrefixHash: "hash-a",
      prevPrefixEstimatedTokens: 4096,
      idleMs: 300_000, // 5 min
      modelChanged: false,
      priceSource: mockPrice,
    });

    expect(report.cause).toBe("idle");
    expect(report.missedTokens).toBe(4096);
    expect(report.missedCost).toBeCloseTo((4096 / 1e6) * 3.0);
  });

  test("filters noise to cause 'none' when cause is 'idle' but tokens < 1024", () => {
    const report = calculateCacheMiss({
      prevPrefixHash: "hash-a",
      currentPrefixHash: "hash-a",
      prevPrefixEstimatedTokens: 800,
      idleMs: 400_000,
      modelChanged: false,
      priceSource: mockPrice,
    });

    expect(report.cause).toBe("none");
    expect(report.missedTokens).toBe(0);
    expect(report.missedCost).toBe(0);
  });

  test("prioritizes model_change over prefix_change and idle", () => {
    const report = calculateCacheMiss({
      prevPrefixHash: "hash-a",
      currentPrefixHash: "hash-b",
      prevPrefixEstimatedTokens: 2048,
      idleMs: 500_000,
      modelChanged: true,
      priceSource: mockPrice,
    });

    expect(report.cause).toBe("model_change");
  });

  test("handles missing priceSource safely without throwing", () => {
    const report = calculateCacheMiss({
      prevPrefixHash: "hash-a",
      currentPrefixHash: "hash-b",
      prevPrefixEstimatedTokens: 2000,
    });

    expect(report.cause).toBe("prefix_change");
    expect(report.missedTokens).toBe(2000);
    expect(report.missedCost).toBe(0);
  });

  test("clamps negative prevPrefixEstimatedTokens to zero", () => {
    const report = calculateCacheMiss({
      prevPrefixHash: "hash-a",
      currentPrefixHash: "hash-b",
      prevPrefixEstimatedTokens: -500,
      idleMs: 1000,
      modelChanged: false,
      priceSource: mockPrice,
    });

    expect(report.missedTokens).toBe(0);
    expect(report.missedCost).toBe(0);
  });
});
