import { describe, expect, it } from "bun:test";

import { MemoryDB } from "database-engine/MemoryDB";
import { createProviderReconciliationBucket } from "./providerReconciliation";
import { writeProviderReconciliationBucket } from "./providerReconciliationWriter";

describe("writeProviderReconciliationBucket", () => {
  it("writes append-only reconciliation buckets under deterministic keys", async () => {
    const store = new MemoryDB();
    const bucket = createProviderReconciliationBucket({
      bucketId: "recon_test",
      provider: "deepinfra",
      bucketStart: "2026-05-21T00:00:00.000Z",
      bucketEnd: "2026-05-22T00:00:00.000Z",
      official: {
        requestCount: 1,
        inputTokens: 10,
        outputTokens: 2,
        rawProviderCostUsd: 0.01,
      },
      local: {
        requestCount: 1,
        inputTokens: 10,
        outputTokens: 2,
        rawProviderCostUsd: 0.01,
        platformCredits: 0.08,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });

    const result = await writeProviderReconciliationBucket({ store, bucket });

    expect(result.key).toBe("provider-reconciliation-bucket-recon_test");
    expect(await store.get(result.key)).toEqual(bucket);
  });

  it("refuses to overwrite an existing reconciliation bucket", async () => {
    const store = new MemoryDB();
    const bucket = createProviderReconciliationBucket({
      bucketId: "recon_duplicate",
      provider: "openai",
      bucketStart: "2026-05-21T00:00:00.000Z",
      bucketEnd: "2026-05-22T00:00:00.000Z",
      official: {
        requestCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        rawProviderCostUsd: 0,
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

    await writeProviderReconciliationBucket({ store, bucket });

    await expect(
      writeProviderReconciliationBucket({ store, bucket })
    ).rejects.toThrow("provider reconciliation bucket already exists");
  });
});
