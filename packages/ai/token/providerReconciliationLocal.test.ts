import { describe, expect, it } from "bun:test";

import { MemoryDB } from "database-engine/MemoryDB";
import { createProviderCallCompletedEvent } from "./providerCall";
import { buildProviderCallKey } from "./providerCall";
import { buildRatingResultKey, type RatingResult } from "./ratingResult";
import { aggregateLocalProviderBillingBucket } from "./providerReconciliationLocal";

describe("aggregateLocalProviderBillingBucket", () => {
  it("aggregates completed provider calls and rating results for one provider/model window", async () => {
    const store = new MemoryDB();
    await store.put(
      buildProviderCallKey("call_1", "completed"),
      createProviderCallCompletedEvent({
        providerCallId: "call_1",
        eventId: "completed",
        userId: "user-1",
        provider: "deepinfra",
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        endpoint: "chat.completions",
        startedAt: "2026-05-21T00:00:10.000Z",
        completedAt: "2026-05-21T00:00:11.000Z",
        inputTokens: 1_219,
        outputTokens: 2,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        rawProviderCost: 0.00002444,
        rawProviderCurrency: "USD",
        platformCredits: 0.00019552,
        pricingVersion: "test",
        billingStatus: "charged",
      })
    );
    await store.put(
      buildRatingResultKey("rating_1"),
      {
        id: "rating_1",
        billableEventId: "event_1",
        provider: "deepinfra",
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        platformCredits: 0.00019552,
        createdAt: "2026-05-21T00:00:12.000Z",
        snapshot: {
          provider: "deepinfra",
          model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
          providerCurrency: "USD",
          settlementCurrency: "CREDITS",
          commercialMultiplier: 8,
          providerUnitPrices: { input: 0.02, output: 0.03 },
          settlementUnitPrices: { input: 0.16, output: 0.24 },
          pricingVersion: "test",
          formulaVersion: "token-rating-v1",
          roundingPolicy: "credits_6dp",
        },
      } satisfies RatingResult
    );

    const bucket = await aggregateLocalProviderBillingBucket({
      store: store as any,
      provider: "deepinfra",
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      bucketStart: "2026-05-21T00:00:00.000Z",
      bucketEnd: "2026-05-22T00:00:00.000Z",
    });

    expect(bucket).toEqual({
      requestCount: 1,
      inputTokens: 1_219,
      outputTokens: 2,
      rawProviderCostUsd: 0.00002444,
      platformCredits: 0.00019552,
    });
  });

  it("ignores records outside the provider/model/window", async () => {
    const store = new MemoryDB();
    await store.put(
      buildProviderCallKey("call_other", "completed"),
      createProviderCallCompletedEvent({
        providerCallId: "call_other",
        eventId: "completed",
        userId: "user-1",
        provider: "openai",
        model: "gpt-5.4",
        startedAt: "2026-05-20T23:59:59.000Z",
        completedAt: "2026-05-20T23:59:59.500Z",
        inputTokens: 10_000,
        outputTokens: 1_000,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        rawProviderCost: 0.1,
        rawProviderCurrency: "USD",
        platformCredits: 0.8,
        pricingVersion: "test",
        billingStatus: "charged",
      })
    );

    const bucket = await aggregateLocalProviderBillingBucket({
      store: store as any,
      provider: "deepinfra",
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      bucketStart: "2026-05-21T00:00:00.000Z",
      bucketEnd: "2026-05-22T00:00:00.000Z",
    });

    expect(bucket).toEqual({
      requestCount: 0,
      inputTokens: 0,
      outputTokens: 0,
      rawProviderCostUsd: 0,
      platformCredits: 0,
    });
  });
});
