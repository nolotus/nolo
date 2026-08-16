import { asOptionalFiniteNumber } from "core/optionalNumber";

import type { ProviderReconciliationBucketTotals } from "./providerReconciliation";

export type NormalizedOfficialProviderBucket = {
  provider: string;
  model?: string;
  endpoint?: string;
  bucketStart: string;
  bucketEnd: string;
  official: ProviderReconciliationBucketTotals;
  evidence: Record<string, unknown>;
};

type DeepInfraUsageResponse = {
  months?: Array<{
    period?: string;
    interval?: { fr?: number; to?: number };
    items?: Array<{
      model?: {
        provider?: string;
        model_name?: string;
        task?: string;
      };
      units?: number;
      rate?: number;
      cost?: number;
      pricing_type?: string;
      interval?: { fr?: number; to?: number };
    }>;
    total_cost?: number;
    invoice_id?: string;
  }>;
  initial_month?: string;
};

type DeepInfraRequestCostsResponse = {
  requests?: Array<{
    requestId?: string;
    model?: string;
    costNanoUsd?: number;
    createdAt?: string;
  }>;
};

const unixSecondsToIso = (value: unknown) => {
  const seconds = asOptionalFiniteNumber(value);
  if (seconds === undefined) return undefined;
  return new Date(seconds * 1000).toISOString();
};

export function normalizeDeepInfraUsageResponse(
  response: DeepInfraUsageResponse
): NormalizedOfficialProviderBucket[] {
  const buckets: NormalizedOfficialProviderBucket[] = [];
  for (const month of response.months ?? []) {
    for (const item of month.items ?? []) {
      const bucketStart = unixSecondsToIso(item.interval?.fr ?? month.interval?.fr);
      const bucketEnd = unixSecondsToIso(item.interval?.to ?? month.interval?.to);
      if (!bucketStart || !bucketEnd) continue;
      buckets.push({
        provider: "deepinfra",
        model: item.model?.model_name,
        endpoint: item.model?.task,
        bucketStart,
        bucketEnd,
        official: {
          requestCount: 0,
          inputTokens: 0,
          outputTokens: 0,
          rawProviderCostUsd: asOptionalFiniteNumber(item.cost) ?? 0,
        },
        evidence: {
          period: month.period,
          pricingType: item.pricing_type,
          units: item.units,
          rate: item.rate,
          invoiceId: month.invoice_id,
        },
      });
    }
  }
  return buckets;
}

const startOfUtcDay = (iso: string) => {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return undefined;
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
};

export function normalizeDeepInfraRequestCostsResponse(
  response: DeepInfraRequestCostsResponse
): NormalizedOfficialProviderBucket[] {
  const grouped = new Map<
    string,
    {
      provider: "deepinfra";
      model?: string;
      bucketStart: string;
      bucketEnd: string;
      requestCount: number;
      rawProviderCostUsd: number;
      requestIds: string[];
    }
  >();

  for (const request of response.requests ?? []) {
    if (!request.createdAt) continue;
    const start = startOfUtcDay(request.createdAt);
    if (!start) continue;
    const bucketStart = start.toISOString();
    const bucketEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const key = ["deepinfra", request.model ?? "", bucketStart, bucketEnd].join("\u0000");
    const existing =
      grouped.get(key) ??
      {
        provider: "deepinfra" as const,
        model: request.model,
        bucketStart,
        bucketEnd,
        requestCount: 0,
        rawProviderCostUsd: 0,
        requestIds: [],
      };
    existing.requestCount += 1;
    const costNanoUsd = asOptionalFiniteNumber(request.costNanoUsd);
    if (costNanoUsd !== undefined) {
      existing.rawProviderCostUsd += costNanoUsd / 1_000_000_000;
    }
    if (request.requestId) existing.requestIds.push(request.requestId);
    grouped.set(key, existing);
  }

  return [...grouped.values()].map((bucket) => ({
    provider: bucket.provider,
    model: bucket.model,
    bucketStart: bucket.bucketStart,
    bucketEnd: bucket.bucketEnd,
    official: {
      requestCount: bucket.requestCount,
      inputTokens: 0,
      outputTokens: 0,
      rawProviderCostUsd: Number(bucket.rawProviderCostUsd.toFixed(12)),
    },
    evidence: {
      source: "deepinfra_request_costs",
      requestIds: bucket.requestIds,
    },
  }));
}
