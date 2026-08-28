import { describe, expect, it } from "bun:test";

import { createProviderBillableEvent } from "./providerBillableEvent";
import { createProviderCallCompletedEvent } from "./providerCall";
import { createProviderReconciliationBucket } from "./providerReconciliation";
import { createRatingResult } from "./ratingResult";
import { buildProviderBillingDrilldown } from "./providerBillingDrilldown";

describe("buildProviderBillingDrilldown", () => {
  it("links a reconciliation bucket to provider calls, billable events, ratings, token records, and ledger tx candidates", async () => {
    const store = createMemoryStore();
    const bucket = createProviderReconciliationBucket({
      bucketId: "recon_openai_gpt_2026_05_21",
      provider: "openai",
      model: "gpt-5.4-pro",
      bucketStart: "2026-05-21T00:00:00.000Z",
      bucketEnd: "2026-05-22T00:00:00.000Z",
      official: {
        requestCount: 2,
        inputTokens: 200,
        outputTokens: 20,
        rawProviderCostUsd: 1,
      },
      local: {
        requestCount: 1,
        inputTokens: 100,
        outputTokens: 10,
        rawProviderCostUsd: 0.5,
        platformCredits: 4,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });
    store.set(`provider-reconciliation-bucket-${bucket.id}`, bucket);
    const completed = createProviderCallCompletedEvent({
      providerCallId: "call_01",
      eventId: "evt_completed",
      userId: "user-1",
      dialogId: "dialog-1",
      agentId: "agent-1",
      provider: "openai",
      model: "gpt-5.4-pro",
      endpoint: "agentRun",
      startedAt: "2026-05-21T00:00:09.000Z",
      completedAt: "2026-05-21T00:00:10.000Z",
      inputTokens: 100,
      outputTokens: 10,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      rawProviderCost: 0.5,
      rawProviderCurrency: "USD",
      platformCredits: 4,
      pricingVersion: "model-registry-current",
      billingStatus: "charged",
    });
    store.set("provider-call-call_01-event-evt_completed", completed);
    store.set(
      "provider-call-call_old-event-evt_completed",
      createProviderCallCompletedEvent({
        ...completed,
        providerCallId: "call_old",
        completedAt: "2026-05-20T23:59:59.999Z",
      } as any)
    );
    store.set(
      "provider-billable-event-billable_01",
      createProviderBillableEvent({
        eventId: "billable_01",
        operationId: "dialog-1",
        sourceProviderCallIds: ["call_01"],
        userId: "user-1",
        dialogId: "dialog-1",
        agentId: "agent-1",
        provider: "openai",
        model: "gpt-5.4-pro",
        endpoint: "agentRun",
        kind: "llm_tokens",
        usage: {
          inputTokens: 100,
          outputTokens: 10,
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
        },
        createdAt: "2026-05-21T00:00:11.000Z",
      })
    );
    store.set(
      "rating-result-rating_01",
      createRatingResult({
        ratingId: "rating_01",
        billableEventId: "billable_01",
        provider: "openai",
        model: "gpt-5.4-pro",
        usage: {
          input_tokens: 100,
          output_tokens: 10,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
        createdAt: "2026-05-21T00:00:12.000Z",
      })
    );
    store.set("token-user-1-1779321610000", {
      type: "token",
      userId: "user-1",
      dialogId: "dialog-1",
      agentId: "agent-canonical",
      cybotId: "agent-1",
      provider: "openai",
      model: "gpt-5.4-pro",
      input_tokens: 100,
      output_tokens: 10,
      cost: 4,
      timestamp: Date.parse("2026-05-21T00:00:10.000Z"),
      provider_request_ids: ["req_01"],
    });
    store.set("ledger-tx-local-token-token-user-1-1779321610000", {
      txId: "token-token-user-1-1779321610000",
      idempotencyKey: "provider-call:call_01:charge:v1",
      type: "usage_charge",
      metadata: {
        tokenKey: "token-user-1-1779321610000",
        provider: "openai",
        model: "gpt-5.4-pro",
      },
      entries: [{ delta: -4 }],
      createdAt: Date.parse("2026-05-21T00:00:13.000Z"),
    });

    const drilldown = await buildProviderBillingDrilldown({
      store,
      bucketId: bucket.id,
      limit: 10,
    });

    expect(drilldown.bucket.id).toBe(bucket.id);
    expect(drilldown.providerCalls.map((call) => call.providerCallId)).toEqual([
      "call_01",
    ]);
    expect(drilldown.billableEvents.map((event) => event.id)).toEqual([
      "billable_01",
    ]);
    expect(drilldown.ratingResults.map((rating) => rating.id)).toEqual([
      "rating_01",
    ]);
    expect(drilldown.tokenRecords.map((record) => record.key)).toEqual([
      "token-user-1-1779321610000",
    ]);
    expect(drilldown.tokenRecords[0]?.agentId).toBe("agent-canonical");
    expect(drilldown.ledgerTransactions.map((record) => record.key)).toEqual([
      "ledger-tx-local-token-token-user-1-1779321610000",
    ]);
    expect(drilldown.summary).toEqual({
      providerCallCount: 1,
      billableEventCount: 1,
      ratingResultCount: 1,
      tokenRecordCount: 1,
      ledgerTransactionCount: 1,
    });
  });

  it("uses official request ids to narrow drilldown evidence to exact local records", async () => {
    const store = createMemoryStore();
    const bucket = createProviderReconciliationBucket({
      bucketId: "recon_deepinfra_request_ids",
      provider: "deepinfra",
      model: "moonshotai/Kimi-K2.6",
      bucketStart: "2026-05-21T00:00:00.000Z",
      bucketEnd: "2026-05-22T00:00:00.000Z",
      official: {
        requestCount: 2,
        inputTokens: 0,
        outputTokens: 0,
        rawProviderCostUsd: 0.1,
      },
      local: {
        requestCount: 2,
        inputTokens: 300,
        outputTokens: 30,
        rawProviderCostUsd: 0.1,
        platformCredits: 0.8,
      },
      officialEvidence: {
        source: "deepinfra_request_costs",
        requestIds: ["req_exact", "req_missing"],
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });
    store.set(`provider-reconciliation-bucket-${bucket.id}`, bucket);

    const exactCall = createProviderCallCompletedEvent({
      providerCallId: "call_exact",
      eventId: "evt_completed",
      userId: "user-1",
      dialogId: "dialog-1",
      agentId: "agent-1",
      provider: "deepinfra",
      model: "moonshotai/Kimi-K2.6",
      startedAt: "2026-05-21T00:00:09.000Z",
      completedAt: "2026-05-21T00:00:10.000Z",
      inputTokens: 0,
      outputTokens: 0,
      cacheCreationInputTokens: 0,
      cacheReadInputTokens: 0,
      billingStatus: "unpriced",
    });
    const noisyCall = createProviderCallCompletedEvent({
      ...exactCall,
      providerCallId: "call_noise",
      dialogId: "dialog-noise",
      completedAt: "2026-05-21T00:10:00.000Z",
    } as any);
    store.set("provider-call-call_exact-event-evt_completed", exactCall);
    store.set("provider-call-call_noise-event-evt_completed", noisyCall);
    store.set("token-user-1-1779321610000", {
      type: "token",
      userId: "user-1",
      dialogId: "dialog-1",
      cybotId: "agent-1",
      provider: "deepinfra",
      model: "moonshotai/Kimi-K2.6",
      input_tokens: 300,
      output_tokens: 30,
      cost: 0.8,
      timestamp: Date.parse("2026-05-21T00:00:10.000Z"),
      provider_request_ids: ["req_exact"],
    });
    store.set("token-user-2-1779322200000", {
      type: "token",
      userId: "user-2",
      dialogId: "dialog-noise",
      cybotId: "agent-1",
      provider: "deepinfra",
      model: "moonshotai/Kimi-K2.6",
      input_tokens: 999,
      output_tokens: 99,
      cost: 2,
      timestamp: Date.parse("2026-05-21T00:10:00.000Z"),
      provider_request_ids: ["req_noise"],
    });
    store.set("ledger-tx-exact", {
      txId: "tx-exact",
      idempotencyKey: "provider-call:call_exact:charge:v1",
      type: "usage_charge",
      metadata: { tokenKey: "token-user-1-1779321610000" },
      createdAt: Date.parse("2026-05-21T00:00:13.000Z"),
    });
    store.set("ledger-tx-noise", {
      txId: "tx-noise",
      idempotencyKey: "provider-call:call_noise:charge:v1",
      type: "usage_charge",
      metadata: { tokenKey: "token-user-2-1779322200000" },
      createdAt: Date.parse("2026-05-21T00:10:13.000Z"),
    });

    const drilldown = await buildProviderBillingDrilldown({
      store,
      bucketId: bucket.id,
      limit: 10,
    });

    expect(drilldown.matchMode).toBe("official_request_id");
    expect(drilldown.officialEvidence).toEqual(bucket.officialEvidence);
    expect(drilldown.officialRequestIds).toEqual(["req_exact", "req_missing"]);
    expect(drilldown.unmatchedOfficialRequestIds).toEqual(["req_missing"]);
    expect(drilldown.tokenRecords.map((record) => record.key)).toEqual([
      "token-user-1-1779321610000",
    ]);
    expect(drilldown.ledgerTransactions.map((record) => record.key)).toEqual([
      "ledger-tx-exact",
    ]);
    expect(drilldown.providerCalls.map((call) => call.providerCallId)).toEqual([
      "call_exact",
    ]);
  });
});

function createMemoryStore() {
  const data = new Map<string, unknown>();
  return {
    set: (key: string, value: unknown) => data.set(key, value),
    get: async (key: string) => {
      if (!data.has(key)) throw new Error("not found");
      return data.get(key);
    },
    iterator: async function* (options: { gte?: string; lte?: string }) {
      for (const key of [...data.keys()].sort()) {
        if (options.gte && key < options.gte) continue;
        if (options.lte && key > options.lte) continue;
        yield [key, data.get(key)] as [string, unknown];
      }
    },
  };
}
