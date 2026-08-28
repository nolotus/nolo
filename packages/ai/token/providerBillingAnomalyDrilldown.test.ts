import { describe, expect, it } from "bun:test";

import { createBillingAnomaly } from "./billingAnomaly";
import { createProviderBillableEvent } from "./providerBillableEvent";
import { createProviderCallCompletedEvent } from "./providerCall";
import { createProviderReconciliationBucket } from "./providerReconciliation";
import { createRatingResult } from "./ratingResult";
import { buildProviderBillingAnomalyDrilldown } from "./providerBillingAnomalyDrilldown";

describe("buildProviderBillingAnomalyDrilldown", () => {
  it("links an anomaly to bucket evidence and produces a read-only repair dry-run", async () => {
    const store = createMemoryStore();
    const bucket = createProviderReconciliationBucket({
      bucketId: "recon_openai_2026_05_21",
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
    store.set(
      "billing-anomaly-anom_recon",
      createBillingAnomaly({
        anomalyId: "anom_recon",
        kind: "provider_reconciliation_diff",
        severity: "critical",
        stage: "reconciliation",
        userId: "provider-reconciliation",
        provider: "openai",
        model: "gpt-5.4-pro",
        riskPlatformCredits: 4,
        message: "bucket differs",
        evidence: { bucketId: bucket.id },
        createdAt: "2026-05-26T00:01:00.000Z",
      })
    );
    store.set(
      "provider-call-call_01-event-completed",
      createProviderCallCompletedEvent({
        providerCallId: "call_01",
        eventId: "completed",
        userId: "user-1",
        dialogId: "dialog-1",
        agentId: "agent-1",
        provider: "openai",
        model: "gpt-5.4-pro",
        startedAt: "2026-05-21T00:00:00.000Z",
        completedAt: "2026-05-21T00:00:01.000Z",
        inputTokens: 100,
        outputTokens: 10,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        rawProviderCost: 0.5,
        rawProviderCurrency: "USD",
        platformCredits: 4,
        billingStatus: "charged",
      })
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
        kind: "llm_tokens",
        usage: {
          inputTokens: 100,
          outputTokens: 10,
          cacheCreationInputTokens: 0,
          cacheReadInputTokens: 0,
        },
        createdAt: "2026-05-21T00:00:02.000Z",
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
        createdAt: "2026-05-21T00:00:03.000Z",
      })
    );

    const drilldown = await buildProviderBillingAnomalyDrilldown({
      store,
      anomalyId: "anom_recon",
      limit: 10,
    });

    expect(drilldown.anomaly.id).toBe("anom_recon");
    expect(drilldown.evidenceChain.bucketDrilldown?.bucket.id).toBe(bucket.id);
    expect(drilldown.evidenceChain.bucketDrilldown?.summary).toMatchObject({
      providerCallCount: 1,
      billableEventCount: 1,
      ratingResultCount: 1,
    });
    expect(drilldown.repairDryRun).toMatchObject({
      mode: "dry-run",
      executable: false,
      recommendedAction: "manual_reconciliation_review",
      affectedUserCount: 1,
      providerCallCount: 1,
      estimatedPlatformCredits: 4,
      wouldIncreaseNegativeBalance: false,
    });
    expect(drilldown.repairDryRun.inputSetHash).toMatch(/^sha256:/);
  });

  it("maps revoked provider credentials to a platform absorb review dry-run", async () => {
    const store = createMemoryStore();
    store.set(
      "billing-anomaly-anom_revoked",
      createBillingAnomaly({
        anomalyId: "anom_revoked",
        kind: "provider_credential_revoked",
        severity: "high",
        stage: "provider_call",
        userId: "user-1",
        dialogId: "dialog-1",
        provider: "openai",
        model: "gpt-5.4",
        providerCallId: "call_revoked",
        riskPlatformCredits: 1.25,
        message: "credential revoked before dispatch",
        evidence: { reason: "revoked" },
        createdAt: "2026-05-26T00:01:00.000Z",
      })
    );

    const drilldown = await buildProviderBillingAnomalyDrilldown({
      store,
      anomalyId: "anom_revoked",
    });

    expect(drilldown.repairDryRun).toMatchObject({
      executable: false,
      recommendedAction: "platform_absorb_review",
      affectedUserCount: 1,
      providerCallCount: 1,
      estimatedPlatformCredits: 1.25,
      maxSingleUserImpact: 1.25,
    });
  });
});

function createMemoryStore() {
  const rows = new Map<string, unknown>();
  return {
    rows,
    set: (key: string, value: unknown) => rows.set(key, value),
    get: async (key: string) => {
      if (!rows.has(key)) throw new Error("not found");
      return rows.get(key);
    },
    iterator: async function* (options: { gte?: string; lte?: string }) {
      for (const key of [...rows.keys()].sort()) {
        if (options.gte && key < options.gte) continue;
        if (options.lte && key > options.lte) continue;
        yield [key, rows.get(key)] as [string, unknown];
      }
    },
  };
}
