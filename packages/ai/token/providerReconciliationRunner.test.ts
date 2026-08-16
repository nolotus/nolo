import { describe, expect, it } from "bun:test";

import { MemoryDB } from "database-engine/MemoryDB";
import { runProviderReconciliation } from "./providerReconciliationRunner";
import { buildProviderReconciliationBucketKey } from "./providerReconciliation";

describe("runProviderReconciliation", () => {
  it("writes reconciliation buckets and anomalies for official/local diffs", async () => {
    const store = new MemoryDB();

    const result = await runProviderReconciliation({
      store: store as any,
      officialBuckets: [
        {
          provider: "openai",
          model: "gpt-5.4-pro-2026-03-05",
          bucketStart: "2026-05-21T00:00:00.000Z",
          bucketEnd: "2026-05-22T00:00:00.000Z",
          official: {
            requestCount: 1,
            inputTokens: 113_906,
            outputTokens: 5_378,
            rawProviderCostUsd: 4.38429,
          },
          evidence: { source: "test" },
        },
      ],
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    expect(result).toEqual({
      bucketsProcessed: 1,
      bucketsWritten: 1,
      anomaliesWritten: 1,
      bucketsProposed: 1,
      anomaliesProposed: 1,
      riskPlatformCreditsProposed: 35.07432,
      alreadyExisted: 0,
      dryRun: false,
    });

    const bucket = await store.get(
      buildProviderReconciliationBucketKey(
        "recon_openai_gpt-5.4-pro-2026-03-05_2026-05-21T00-00-00.000Z_2026-05-22T00-00-00.000Z"
      )
    );
    expect((bucket as any).status).toBe("missing_local");

    const anomaly = Object.values(store.dump()).find(
      (value: any) => value?.kind === "provider_reconciliation_diff"
    ) as any;
    expect(anomaly).toMatchObject({
      severity: "critical",
      stage: "reconciliation",
      provider: "openai",
      model: "gpt-5.4-pro-2026-03-05",
      riskPlatformCredits: 35.07432,
    });
  });

  it("supports dry-run previews without writing buckets or anomalies", async () => {
    const store = new MemoryDB();

    const result = await runProviderReconciliation({
      store: store as any,
      officialBuckets: [
        {
          provider: "openai",
          model: "gpt-5.4-pro-2026-03-05",
          bucketStart: "2026-05-21T00:00:00.000Z",
          bucketEnd: "2026-05-22T00:00:00.000Z",
          official: {
            requestCount: 1,
            inputTokens: 113_906,
            outputTokens: 5_378,
            rawProviderCostUsd: 4.38429,
          },
          evidence: { source: "dry-run-test" },
        },
      ],
      createdAt: "2026-05-26T00:00:00.000Z",
      dryRun: true,
    });

    expect(result).toMatchObject({
      dryRun: true,
      bucketsProcessed: 1,
      bucketsWritten: 0,
      anomaliesWritten: 0,
      bucketsProposed: 1,
      anomaliesProposed: 1,
      riskPlatformCreditsProposed: 35.07432,
    });
    expect(Object.keys(store.dump())).toEqual([]);
  });
});
