import { describe, expect, it } from "bun:test";

import { planContextUsage } from "./retention";

const SAFE_BUFFER_RATIO = 0.95;

const safeWindow = (contextWindow: number) =>
  Math.floor(contextWindow * SAFE_BUFFER_RATIO);

describe("cache-first context retention", () => {
  describe("large window tier (>= 512k, e.g. 1M)", () => {
    it("keeps large-context history near the model limit by default (medium)", () => {
      const plan = planContextUsage({
        contextWindow: 1_000_000,
        summaryTokens: 1_000,
        recentLoad: "medium",
      });

      // baseHistoryRatio = 0.80 + 0.20 * 0.95 = 0.99
      expect(plan.historyBudget).toBeGreaterThanOrEqual(940_000);
      expect(plan.historyBudget).toBeLessThanOrEqual(950_000);
      expect(plan.historyBudget / safeWindow(1_000_000)).toBeLessThanOrEqual(1.0);
    });

    it("keeps heavy large-context turns close to the model limit (heavy)", () => {
      const plan = planContextUsage({
        contextWindow: 1_000_000,
        summaryTokens: 1_000,
        recentLoad: "heavy",
      });

      // 0.99 * 0.98 = 0.9702
      expect(plan.historyBudget).toBeGreaterThanOrEqual(920_000);
      expect(plan.historyBudget).toBeLessThanOrEqual(940_000);
    });

    it("lets light large-context touch the full safe limit (light)", () => {
      const plan = planContextUsage({
        contextWindow: 1_000_000,
        summaryTokens: 1_000,
        recentLoad: "light",
      });

      // clamp(0.99 * 1.05, 0.3, 1.0) = 1.0
      expect(plan.historyBudget).toBe(safeWindow(1_000_000));
    });

    it("uses minRawRatio = 0.2 for large tier", () => {
      const plan = planContextUsage({
        contextWindow: 1_000_000,
        summaryTokens: 800_000,
        recentLoad: "medium",
      });

      const expectedRaw = Math.floor(plan.historyBudget * 0.2);
      expect(plan.rawMessageBudget).toBe(expectedRaw);
    });
  });

  describe("medium window tier (64k ~ 512k, e.g. 256k default)", () => {
    it("keeps medium-context history within 0.85 ratio (medium)", () => {
      const plan = planContextUsage({
        contextWindow: 256_000,
        summaryTokens: 1_000,
        recentLoad: "medium",
      });

      // baseHistoryRatio = 0.55 + 0.30 * 0.95 = 0.835
      const ratio = plan.historyBudget / safeWindow(256_000);
      expect(ratio).toBeLessThanOrEqual(0.85);
      expect(ratio).toBeGreaterThan(0.8);
    });

    it("caps light medium-context at 0.85 ratio (light)", () => {
      const plan = planContextUsage({
        contextWindow: 256_000,
        summaryTokens: 1_000,
        recentLoad: "light",
      });

      // clamp(0.835 * 1.05, 0.3, 0.85) = 0.85
      const ratio = plan.historyBudget / safeWindow(256_000);
      expect(ratio).toBeLessThanOrEqual(0.85);
      expect(plan.historyBudget).toBe(Math.floor(safeWindow(256_000) * 0.85));
    });

    it("tightens heavy medium-context below 0.8 ratio (heavy)", () => {
      const plan = planContextUsage({
        contextWindow: 256_000,
        summaryTokens: 1_000,
        recentLoad: "heavy",
      });

      // clamp(0.835 * 0.9, 0.3, 0.8) = 0.7515
      const ratio = plan.historyBudget / safeWindow(256_000);
      expect(ratio).toBeLessThanOrEqual(0.8);
    });

    it("uses minRawRatio = 0.3 for medium tier", () => {
      const plan = planContextUsage({
        contextWindow: 256_000,
        summaryTokens: 200_000,
        recentLoad: "medium",
      });

      const expectedRaw = Math.floor(plan.historyBudget * 0.3);
      expect(plan.rawMessageBudget).toBe(expectedRaw);
    });
  });

  describe("small window tier (<= 64k, local models)", () => {
    it("does not make small-context models wait until 95 percent (32k medium)", () => {
      const plan = planContextUsage({
        contextWindow: 32_000,
        summaryTokens: 1_000,
        recentLoad: "medium",
      });

      expect(plan.historyBudget).toBeLessThan(26_000);
    });

    it("keeps 64k small-context history within 0.65 ratio (medium)", () => {
      const plan = planContextUsage({
        contextWindow: 64_000,
        summaryTokens: 1_000,
        recentLoad: "medium",
      });

      // baseHistoryRatio = 0.35 + 0.30 * 0.95 = 0.635
      const ratio = plan.historyBudget / safeWindow(64_000);
      expect(ratio).toBeLessThanOrEqual(0.65);
      expect(ratio).toBeGreaterThan(0.6);
    });

    it("caps light small-context at 0.75 ratio (light)", () => {
      const plan = planContextUsage({
        contextWindow: 64_000,
        summaryTokens: 1_000,
        recentLoad: "light",
      });

      // clamp(0.635 * 1.05, 0.3, 0.75) = 0.66675
      const ratio = plan.historyBudget / safeWindow(64_000);
      expect(ratio).toBeLessThanOrEqual(0.75);
    });

    it("tightens heavy small-context below 0.7 ratio (heavy)", () => {
      const plan = planContextUsage({
        contextWindow: 64_000,
        summaryTokens: 1_000,
        recentLoad: "heavy",
      });

      // clamp(0.635 * 0.9, 0.3, 0.7) = 0.5715
      const ratio = plan.historyBudget / safeWindow(64_000);
      expect(ratio).toBeLessThanOrEqual(0.7);
    });

    it("uses minRawRatio = 0.5 for small tier (more raw space)", () => {
      const plan = planContextUsage({
        contextWindow: 64_000,
        summaryTokens: 30_000,
        recentLoad: "medium",
      });

      const expectedRaw = Math.floor(plan.historyBudget * 0.5);
      expect(plan.rawMessageBudget).toBe(expectedRaw);
    });
  });
});