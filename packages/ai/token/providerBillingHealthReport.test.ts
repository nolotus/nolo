import { describe, expect, it } from "bun:test";

import { createBillingAnomaly } from "./billingAnomaly";
import { createBillingAnomalyLifecycleEvent } from "./billingAnomalyLifecycle";
import { createProviderCallCompletedEvent } from "./providerCall";
import { createProviderReconciliationBucket } from "./providerReconciliation";
import { buildProviderBillingHealthReport } from "./providerBillingHealthReport";

describe("buildProviderBillingHealthReport", () => {
  it("summarizes reconciliation buckets and open billing anomalies in a UTC window", async () => {
    const store = createMemoryStore();
    const openaiBucket = createProviderReconciliationBucket({
      bucketId: "recon_openai_2026_05_21",
      provider: "openai",
      model: "gpt-5.4-pro",
      bucketStart: "2026-05-21T00:00:00.000Z",
      bucketEnd: "2026-05-22T00:00:00.000Z",
      official: {
        requestCount: 15,
        inputTokens: 1_000,
        outputTokens: 100,
        rawProviderCostUsd: 73.68333,
      },
      local: {
        requestCount: 14,
        inputTokens: 900,
        outputTokens: 90,
        rawProviderCostUsd: 65.97666,
        platformCredits: 527.81328,
      },
      createdAt: "2026-05-26T00:00:00.000Z",
    });
    const deepinfraBucket = createProviderReconciliationBucket({
      bucketId: "recon_deepinfra_2026_05_21",
      provider: "deepinfra",
      model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
      bucketStart: "2026-05-21T00:00:00.000Z",
      bucketEnd: "2026-05-22T00:00:00.000Z",
      official: {
        requestCount: 1,
        inputTokens: 0,
        outputTokens: 0,
        rawProviderCostUsd: 0.00002444,
      },
      local: {
        requestCount: 1,
        inputTokens: 0,
        outputTokens: 0,
        rawProviderCostUsd: 0.00002444,
        platformCredits: 0.00019552,
      },
      createdAt: "2026-05-26T00:01:00.000Z",
    });
    const outsideBucket = createProviderReconciliationBucket({
      bucketId: "recon_openai_2026_05_20",
      provider: "openai",
      bucketStart: "2026-05-20T00:00:00.000Z",
      bucketEnd: "2026-05-21T00:00:00.000Z",
      official: {
        requestCount: 1,
        inputTokens: 1,
        outputTokens: 1,
        rawProviderCostUsd: 1,
      },
      local: {
        requestCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        rawProviderCostUsd: 0,
        platformCredits: 0,
      },
      createdAt: "2026-05-26T00:02:00.000Z",
    });

    store.set(`provider-reconciliation-bucket-${openaiBucket.id}`, openaiBucket);
    store.set(`provider-reconciliation-bucket-${deepinfraBucket.id}`, deepinfraBucket);
    store.set(`provider-reconciliation-bucket-${outsideBucket.id}`, outsideBucket);
    store.set(
      "billing-anomaly-anom_open",
      createBillingAnomaly({
        anomalyId: "anom_open",
        kind: "provider_reconciliation_diff",
        severity: "critical",
        stage: "reconciliation",
        userId: "provider-reconciliation",
        provider: "openai",
        model: "gpt-5.4-pro",
        riskPlatformCredits: 61.65336,
        message: "OpenAI bucket differs",
        evidence: { bucketId: openaiBucket.id },
        createdAt: "2026-05-21T12:00:00.000Z",
      })
    );
    store.set(
      "billing-anomaly-anom_outside",
      createBillingAnomaly({
        anomalyId: "anom_outside",
        kind: "ledger_failed",
        severity: "high",
        stage: "ledger",
        userId: "user-1",
        provider: "deepinfra",
        model: "test",
        riskPlatformCredits: 100,
        message: "Outside",
        evidence: {},
        createdAt: "2026-05-22T00:00:00.000Z",
      })
    );

    const report = await buildProviderBillingHealthReport({
      store,
      since: "2026-05-21T00:00:00.000Z",
      until: "2026-05-22T00:00:00.000Z",
      limit: 5,
    });

    expect(report.summary).toMatchObject({
      bucketCount: 2,
      openAnomalyCount: 1,
      totalOfficialRawProviderCostUsd: 73.68335444,
      totalLocalRawProviderCostUsd: 65.97668444,
      signedRawProviderCostDiffUsd: 7.70667,
      absoluteRawProviderCostDiffUsd: 7.70667,
      riskPlatformCredits: 61.65336,
    });
    expect(report.byProvider.openai).toMatchObject({
      bucketCount: 1,
      statusCounts: { mismatched_usage: 1 },
      absoluteRawProviderCostDiffUsd: 7.70667,
    });
    expect(report.statusCounts).toEqual({
      matched: 1,
      mismatched_usage: 1,
    });
    expect(report.severityCounts).toEqual({ critical: 1 });
    expect(report.anomalyStatusCounts).toEqual({ open: 1 });
    expect(report.topBuckets[0]).toMatchObject({
      id: "recon_openai_2026_05_21",
      provider: "openai",
      status: "mismatched_usage",
    });
    expect(report.openAnomalies[0]).toMatchObject({
      id: "anom_open",
      severity: "critical",
      riskPlatformCredits: 61.65336,
    });
  });

  it("summarizes local provider spend by credential account identity", async () => {
    const store = createMemoryStore();
    store.set(
      "provider-call-call_deepinfra_a-event-completed",
      createProviderCallCompletedEvent({
        providerCallId: "call_deepinfra_a",
        eventId: "completed",
        userId: "user-1",
        provider: "deepinfra",
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        startedAt: "2026-05-21T00:00:00.000Z",
        completedAt: "2026-05-21T00:00:01.000Z",
        inputTokens: 1_000,
        outputTokens: 10,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        rawProviderCost: 0.00002,
        rawProviderCurrency: "USD",
        platformCredits: 0.00016,
        billingStatus: "charged",
        credential: {
          credentialId: "cred_deepinfra_alpha",
          credentialFingerprint: "sha256:deepinfra",
          providerAccountKey: "provider-account-deepinfra-alpha-deepinfra-main",
          apiKeySource: "platform_env",
          providerAccountAlias: "DeepInfra 主账号",
          officialBillingAccountId: "invoice-main",
          environment: "alpha",
        },
      })
    );
    store.set(
      "provider-call-call_deepinfra_b-event-completed",
      createProviderCallCompletedEvent({
        providerCallId: "call_deepinfra_b",
        eventId: "completed",
        userId: "user-2",
        provider: "deepinfra",
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        startedAt: "2026-05-21T00:00:02.000Z",
        completedAt: "2026-05-21T00:00:03.000Z",
        inputTokens: 2_000,
        outputTokens: 20,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        rawProviderCost: 0.00004,
        rawProviderCurrency: "USD",
        platformCredits: 0.00032,
        billingStatus: "charged",
        credential: {
          credentialId: "cred_deepinfra_alpha",
          credentialFingerprint: "sha256:deepinfra",
          providerAccountKey: "provider-account-deepinfra-alpha-deepinfra-main",
          apiKeySource: "platform_env",
          providerAccountAlias: "DeepInfra 主账号",
          officialBillingAccountId: "invoice-main",
          environment: "alpha",
        },
      })
    );
    store.set(
      "provider-call-call_openai-event-completed",
      createProviderCallCompletedEvent({
        providerCallId: "call_openai",
        eventId: "completed",
        userId: "user-3",
        provider: "openai",
        model: "gpt-5.4",
        startedAt: "2026-05-21T00:00:04.000Z",
        completedAt: "2026-05-21T00:00:05.000Z",
        inputTokens: 100,
        outputTokens: 5,
        cacheCreationInputTokens: 0,
        cacheReadInputTokens: 0,
        rawProviderCost: 0.001,
        rawProviderCurrency: "USD",
        platformCredits: 0.008,
        billingStatus: "charged",
        credential: {
          credentialId: "cred_openai_alpha",
          credentialFingerprint: "sha256:openai",
          providerAccountKey: "provider-account-openai-alpha-openai-main",
          apiKeySource: "platform_env",
          officialBillingAccountId: "org-main",
          environment: "alpha",
        },
      })
    );

    const report = await buildProviderBillingHealthReport({
      store,
      since: "2026-05-21T00:00:00.000Z",
      until: "2026-05-22T00:00:00.000Z",
    });

    expect(report.byProviderAccount["deepinfra:provider-account-deepinfra-alpha-deepinfra-main"]).toMatchObject(
      {
        provider: "deepinfra",
        providerAccountKey: "provider-account-deepinfra-alpha-deepinfra-main",
        providerAccountAlias: "DeepInfra 主账号",
        officialBillingAccountId: "invoice-main",
        environment: "alpha",
        requestCount: 2,
        inputTokens: 3_000,
        outputTokens: 30,
        rawProviderCostUsd: 0.00006,
        platformCredits: 0.00048,
      }
    );
    expect(report.byProviderAccount["openai:provider-account-openai-alpha-openai-main"]).toMatchObject(
      {
        provider: "openai",
        providerAccountKey: "provider-account-openai-alpha-openai-main",
        officialBillingAccountId: "org-main",
        requestCount: 1,
      }
    );
    expect(JSON.stringify(report.byProviderAccount)).not.toContain(
      "sha256:deepinfra"
    );
  });

  it("applies the latest anomaly lifecycle status before counting open risk", async () => {
    const store = createMemoryStore();
    store.set(
      "billing-anomaly-anom_ack",
      createBillingAnomaly({
        anomalyId: "anom_ack",
        kind: "provider_reconciliation_diff",
        severity: "critical",
        stage: "reconciliation",
        userId: "provider-reconciliation",
        provider: "openai",
        model: "gpt-5.4",
        riskPlatformCredits: 88,
        message: "acknowledged later",
        evidence: {},
        createdAt: "2026-05-21T12:00:00.000Z",
      })
    );
    store.set(
      "billing-anomaly-lifecycle-anom_ack-event-evt_ack",
      createBillingAnomalyLifecycleEvent({
        anomalyId: "anom_ack",
        eventId: "evt_ack",
        status: "acknowledged",
        createdAt: "2026-05-21T12:10:00.000Z",
        actorId: "usage-manager",
        reason: "reviewing",
      })
    );

    const report = await buildProviderBillingHealthReport({
      store,
      since: "2026-05-21T00:00:00.000Z",
      until: "2026-05-22T00:00:00.000Z",
    });

    expect(report.summary.openAnomalyCount).toBe(0);
    expect(report.summary.riskPlatformCredits).toBe(0);
    expect(report.openAnomalies).toEqual([]);
    expect(report.anomalyStatusCounts).toEqual({ acknowledged: 1 });
  });
});

function createMemoryStore() {
  const data = new Map<string, unknown>();
  return {
    set: (key: string, value: unknown) => data.set(key, value),
    iterator: async function* (options: { gte?: string; lte?: string }) {
      for (const key of [...data.keys()].sort()) {
        if (options.gte && key < options.gte) continue;
        if (options.lte && key > options.lte) continue;
        yield [key, data.get(key)] as [string, unknown];
      }
    },
  };
}
