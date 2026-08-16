import { describe, expect, it } from "bun:test";

import { normalizeDeepInfraUsageResponse } from "./deepinfraReconciliation";

describe("normalizeDeepInfraUsageResponse", () => {
  it("converts DeepInfra payment usage items into official reconciliation buckets", () => {
    const buckets = normalizeDeepInfraUsageResponse({
      months: [
        {
          period: "2026.05",
          interval: {
            fr: 1779321600,
            to: 1781913600,
          },
          items: [
            {
              model: {
                provider: "deepinfra",
                model_name: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
                task: "text-generation",
              },
              units: 1_221,
              rate: 0.02,
              cost: 0.00002444,
              pricing_type: "tokens",
              interval: {
                fr: 1779321600,
                to: 1779408000,
              },
            },
          ],
          total_cost: 0.00002444,
          invoice_id: "NOT_FINAL",
        },
      ],
      initial_month: "2026.05",
    });

    expect(buckets).toEqual([
      {
        provider: "deepinfra",
        model: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        endpoint: "text-generation",
        bucketStart: "2026-05-21T00:00:00.000Z",
        bucketEnd: "2026-05-22T00:00:00.000Z",
        official: {
          requestCount: 0,
          inputTokens: 0,
          outputTokens: 0,
          rawProviderCostUsd: 0.00002444,
        },
        evidence: {
          period: "2026.05",
          pricingType: "tokens",
          units: 1_221,
          rate: 0.02,
          invoiceId: "NOT_FINAL",
        },
      },
    ]);
  });
});
