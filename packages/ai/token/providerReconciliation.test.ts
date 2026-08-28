import { describe, expect, it } from "bun:test";

import {
  buildProviderReconciliationBucketKey,
  createProviderReconciliationBucket,
} from "./providerReconciliation";

const window = {
  bucketStart: "2026-05-21T00:00:00.000Z",
  bucketEnd: "2026-05-22T00:00:00.000Z",
};

describe("provider reconciliation bucket contract", () => {
  it("builds stable append-only keys", () => {
    expect(
      buildProviderReconciliationBucketKey("recon_deepinfra_2026_05_21")
    ).toBe("provider-reconciliation-bucket-recon_deepinfra_2026_05_21");
  });

  it("marks matching official and local buckets as matched", () => {
    const bucket = createProviderReconciliationBucket({
      bucketId: "recon_match",
      provider: "deepinfra",
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      ...window,
      official: {
        requestCount: 2,
        inputTokens: 1_219,
        outputTokens: 2,
        rawProviderCostUsd: 0.00002444,
      },
      local: {
        requestCount: 2,
        inputTokens: 1_219,
        outputTokens: 2,
        rawProviderCostUsd: 0.00002444,
        platformCredits: 0.00019552,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    expect(bucket.status).toBe("matched");
    expect(bucket.diff).toEqual({
      requestCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      rawProviderCostUsd: 0,
      platformCredits: 0.00019552,
      absoluteRawProviderCostUsd: 0,
    });
    expect(bucket.needsAnomaly).toBe(false);
  });

  it("detects official spend that has no local evidence", () => {
    const bucket = createProviderReconciliationBucket({
      bucketId: "recon_missing_local",
      provider: "openai",
      model: "gpt-5.4-pro-2026-03-05",
      ...window,
      official: {
        requestCount: 1,
        inputTokens: 113_906,
        outputTokens: 5_378,
        rawProviderCostUsd: 4.38429,
      },
      local: {
        requestCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        rawProviderCostUsd: 0,
        platformCredits: 0,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    expect(bucket.status).toBe("missing_local");
    expect(bucket.diff.inputTokens).toBe(113_906);
    expect(bucket.diff.outputTokens).toBe(5_378);
    expect(bucket.diff.rawProviderCostUsd).toBe(4.38429);
    expect(bucket.needsAnomaly).toBe(true);
  });

  it("does not let opposite-signed request deltas hide absolute risk", () => {
    const bucket = createProviderReconciliationBucket({
      bucketId: "recon_mismatch",
      provider: "deepinfra",
      model: "moonshotai/Kimi-K2.6",
      ...window,
      official: {
        requestCount: 10,
        inputTokens: 10_000,
        outputTokens: 500,
        rawProviderCostUsd: 0.2,
      },
      local: {
        requestCount: 11,
        inputTokens: 9_000,
        outputTokens: 500,
        rawProviderCostUsd: 0.22,
        platformCredits: 1.76,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    expect(bucket.status).toBe("mismatched_usage");
    expect(bucket.diff.requestCount).toBe(-1);
    expect(bucket.diff.inputTokens).toBe(1_000);
    expect(bucket.diff.rawProviderCostUsd).toBeCloseTo(-0.02, 10);
    expect(bucket.diff.absoluteRawProviderCostUsd).toBeCloseTo(0.02, 10);
    expect(bucket.needsAnomaly).toBe(true);
  });
});
