import { describe, expect, it } from "bun:test";

import {
  buildCacheHitReport,
  estimateMissAttributedCost,
  recordMissTokens,
  type TokenRecordLike,
} from "./cacheHitReport";

const rec = (
  overrides: Partial<TokenRecordLike> & {
    input_tokens: number;
    cache_read_input_tokens?: number;
  },
): TokenRecordLike => ({
  cache_read_input_tokens: 0,
  cost: 0,
  ...overrides,
});

describe("cacheHitReport", () => {
  it("matches hand-calculated hitRatio for known hit/miss totals", () => {
    // Record A: input 1000, hit 800 → miss 200
    // Record B: input 500, hit 100 → miss 400
    // totals: hit 900, miss 600 → hitRatio = 900/1500 = 0.6
    const report = buildCacheHitReport([
      rec({
        model: "deepseek-v4-flash",
        input_tokens: 1_000,
        cache_read_input_tokens: 800,
        cost: 10,
        inputPrice: 1,
        outputPrice: 0,
      }),
      rec({
        model: "deepseek-v4-flash",
        input_tokens: 500,
        cache_read_input_tokens: 100,
        cost: 20,
        inputPrice: 1,
        outputPrice: 0,
      }),
    ]);

    expect(report.total.hitTokens).toBe(900);
    expect(report.total.missTokens).toBe(600);
    expect(report.total.hitRatio).toBe(0.6);
    expect(report.total.calls).toBe(2);

    // miss cost with input-only prices: all cost attributed to miss
    // A: missWeight=200, hitWeight=0 → missCost=10
    // B: missWeight=400 → missCost=20
    // missCostShare = 30/30 = 1
    expect(report.total.missCostShare).toBe(1);
    expect(recordMissTokens({ input_tokens: 1_000, cache_read_input_tokens: 800 })).toBe(
      200,
    );
  });

  it("buckets by model / agent / entry_path and totals equal the parts", () => {
    const records: TokenRecordLike[] = [
      rec({
        model: "model-a",
        agentId: "agent-1",
        entry_path: "web-chat",
        input_tokens: 100,
        cache_read_input_tokens: 40,
        cost: 1,
      }),
      rec({
        model: "model-b",
        cybotId: "agent-2",
        entry_path: "agent-run",
        input_tokens: 200,
        cache_read_input_tokens: 50,
        cost: 2,
      }),
      rec({
        // missing grouping keys → "unknown"
        input_tokens: 50,
        cache_read_input_tokens: 10,
        cost: 0.5,
      }),
    ];

    const report = buildCacheHitReport(records);

    expect(report.byModel["model-a"]?.calls).toBe(1);
    expect(report.byModel["model-b"]?.calls).toBe(1);
    expect(report.byModel.unknown?.calls).toBe(1);

    expect(report.byAgent["agent-1"]?.missTokens).toBe(60);
    expect(report.byAgent["agent-2"]?.missTokens).toBe(150);
    expect(report.byAgent.unknown?.missTokens).toBe(40);

    expect(report.byEntryPath["web-chat"]?.hitTokens).toBe(40);
    expect(report.byEntryPath["agent-run"]?.hitTokens).toBe(50);
    expect(report.byEntryPath.unknown?.hitTokens).toBe(10);

    const sumHit = Object.values(report.byModel).reduce((n, b) => n + b.hitTokens, 0);
    const sumMiss = Object.values(report.byModel).reduce((n, b) => n + b.missTokens, 0);
    const sumCalls = Object.values(report.byModel).reduce((n, b) => n + b.calls, 0);
    expect(sumHit).toBe(report.total.hitTokens);
    expect(sumMiss).toBe(report.total.missTokens);
    expect(sumCalls).toBe(report.total.calls);

    const agentHit = Object.values(report.byAgent).reduce((n, b) => n + b.hitTokens, 0);
    const pathMiss = Object.values(report.byEntryPath).reduce(
      (n, b) => n + b.missTokens,
      0,
    );
    expect(agentHit).toBe(report.total.hitTokens);
    expect(pathMiss).toBe(report.total.missTokens);
  });

  it("detects prefix churn and points firstChangeAt at the changing record", () => {
    const report = buildCacheHitReport([
      rec({
        dialogId: "dlg-churn",
        stable_prefix_hash: "hash-a",
        timestamp: 1_000,
        input_tokens: 100,
        cache_read_input_tokens: 90,
      }),
      rec({
        dialogId: "dlg-churn",
        stable_prefix_hash: "hash-a",
        timestamp: 2_000,
        input_tokens: 120,
        cache_read_input_tokens: 100,
      }),
      rec({
        dialogId: "dlg-churn",
        stable_prefix_hash: "hash-b",
        timestamp: 3_000,
        input_tokens: 200,
        cache_read_input_tokens: 20,
      }),
      rec({
        dialogId: "dlg-churn",
        stable_prefix_hash: "hash-b",
        timestamp: 4_000,
        input_tokens: 150,
        cache_read_input_tokens: 10,
      }),
      // stable dialog must not appear in churn
      rec({
        dialogId: "dlg-stable",
        stable_prefix_hash: "same",
        timestamp: 1_500,
        input_tokens: 80,
        cache_read_input_tokens: 70,
      }),
      rec({
        dialogId: "dlg-stable",
        stable_prefix_hash: "same",
        timestamp: 2_500,
        input_tokens: 90,
        cache_read_input_tokens: 80,
      }),
    ]);

    expect(report.prefixChurn).toHaveLength(1);
    const churn = report.prefixChurn[0]!;
    expect(churn.dialogId).toBe("dlg-churn");
    expect(churn.distinctPrefixHashes).toBe(2);
    expect(churn.firstChangeAt).toBe(3_000);
    expect(churn.hashes).toEqual(["hash-a", "hash-b"]);
    // miss after change: (200-20) + (150-10) = 180 + 140 = 320
    expect(churn.missTokensAfterFirstChange).toBe(320);
  });

  it("does not report churn when all hashes in a dialog are identical", () => {
    const report = buildCacheHitReport([
      rec({
        dialogId: "dlg-same",
        stable_prefix_hash: "abc",
        timestamp: 10,
        input_tokens: 50,
        cache_read_input_tokens: 40,
      }),
      rec({
        dialogId: "dlg-same",
        stable_prefix_hash: "abc",
        timestamp: 20,
        input_tokens: 60,
        cache_read_input_tokens: 50,
      }),
    ]);

    expect(report.prefixChurn).toEqual([]);
  });

  it("tolerates legacy records without stable_prefix_hash and still computes hit rate", () => {
    const report = buildCacheHitReport([
      rec({
        dialogId: "dlg-legacy",
        timestamp: 1,
        input_tokens: 1_000,
        cache_read_input_tokens: 250,
        cost: 4,
      }),
      rec({
        dialogId: "dlg-legacy",
        timestamp: 2,
        input_tokens: 1_000,
        cache_read_input_tokens: 750,
        cost: 6,
      }),
    ]);

    expect(report.prefixChurn).toEqual([]);
    expect(report.total.hitTokens).toBe(1_000);
    expect(report.total.missTokens).toBe(1_000);
    expect(report.total.hitRatio).toBe(0.5);
    expect(report.total.calls).toBe(2);
  });

  it("buckets by dialogId and totals equal the parts", () => {
    const records: TokenRecordLike[] = [
      rec({
        dialogId: "dlg-a",
        input_tokens: 100,
        cache_read_input_tokens: 40,
        cost: 1,
      }),
      rec({
        dialogId: "dlg-a",
        input_tokens: 200,
        cache_read_input_tokens: 50,
        cost: 2,
      }),
      rec({
        dialogId: "dlg-b",
        input_tokens: 50,
        cache_read_input_tokens: 10,
        cost: 0.5,
      }),
      rec({
        // missing dialogId → "unknown"
        input_tokens: 30,
        cache_read_input_tokens: 0,
        cost: 0.3,
      }),
    ];

    const report = buildCacheHitReport(records);

    expect(report.byDialog["dlg-a"]?.calls).toBe(2);
    expect(report.byDialog["dlg-a"]?.hitTokens).toBe(90);
    expect(report.byDialog["dlg-a"]?.missTokens).toBe(210);
    expect(report.byDialog["dlg-a"]?.hitRatio).toBe(90 / 300);

    expect(report.byDialog["dlg-b"]?.calls).toBe(1);
    expect(report.byDialog["dlg-b"]?.hitRatio).toBe(10 / 50);

    expect(report.byDialog.unknown?.calls).toBe(1);
    expect(report.byDialog.unknown?.hitRatio).toBe(0);

    // byDialog parts sum to total
    const sumHit = Object.values(report.byDialog).reduce((n, b) => n + b.hitTokens, 0);
    const sumMiss = Object.values(report.byDialog).reduce((n, b) => n + b.missTokens, 0);
    expect(sumHit).toBe(report.total.hitTokens);
    expect(sumMiss).toBe(report.total.missTokens);
  });

  it("estimates miss-attributed cost with price weights when provided", () => {
    // miss 100 @1, hit 900 @0.02, output 0 → miss share of weights = 100/118
    const missCost = estimateMissAttributedCost({
      input_tokens: 1_000,
      cache_read_input_tokens: 900,
      output_tokens: 0,
      cost: 1.18,
      inputPrice: 1,
      inputCacheHitPrice: 0.02,
      outputPrice: 0,
    });
    expect(Number(missCost.toFixed(6))).toBe(1);
  });
});
