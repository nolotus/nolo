import { asOptionalFiniteNumber } from "core/optionalNumber";

import type { NormalizedOfficialProviderBucket } from "./deepinfraReconciliation";

type OpenAICompletionsUsageResponse = {
  data?: Array<{
    start_time?: number;
    end_time?: number;
    results?: Array<{
      model?: string;
      num_model_requests?: number;
      input_tokens?: number;
      output_tokens?: number;
      input_cached_tokens?: number;
    }>;
  }>;
};

type OpenAICostsResponse = {
  data?: Array<{
    start_time?: number;
    end_time?: number;
    results?: Array<{
      amount?: {
        value?: number | string;
        currency?: string;
      };
      line_item?: string;
      project_id?: string;
      organization_id?: string;
    }>;
  }>;
};

const unixSecondsToIso = (value: unknown) => {
  const seconds = asOptionalFiniteNumber(value);
  if (seconds === undefined) return undefined;
  return new Date(seconds * 1000).toISOString();
};

const numberOrZero = (value: unknown) => asOptionalFiniteNumber(value) ?? 0;

const decimalNumberOrZero = (value: unknown) => {
  const asNumber = asOptionalFiniteNumber(value);
  if (asNumber !== undefined) return asNumber;
  if (typeof value !== "string") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeCostLineItemModel = (lineItem: string | undefined) =>
  lineItem?.replace(/,\s*(input|output)$/i, "");

export function normalizeOpenAICompletionsUsageResponse(
  response: OpenAICompletionsUsageResponse
): NormalizedOfficialProviderBucket[] {
  const buckets: NormalizedOfficialProviderBucket[] = [];
  for (const bucket of response.data ?? []) {
    const bucketStart = unixSecondsToIso(bucket.start_time);
    const bucketEnd = unixSecondsToIso(bucket.end_time);
    if (!bucketStart || !bucketEnd) continue;
    for (const result of bucket.results ?? []) {
      buckets.push({
        provider: "openai",
        model: result.model,
        bucketStart,
        bucketEnd,
        official: {
          requestCount: numberOrZero(result.num_model_requests),
          inputTokens: numberOrZero(result.input_tokens),
          outputTokens: numberOrZero(result.output_tokens),
          rawProviderCostUsd: 0,
        },
        evidence: {
          inputCachedTokens: numberOrZero(result.input_cached_tokens),
          source: "openai_completions_usage",
        },
      });
    }
  }
  return buckets;
}

export function normalizeOpenAICostsResponse(
  response: OpenAICostsResponse
): NormalizedOfficialProviderBucket[] {
  const buckets: NormalizedOfficialProviderBucket[] = [];
  for (const bucket of response.data ?? []) {
    const bucketStart = unixSecondsToIso(bucket.start_time);
    const bucketEnd = unixSecondsToIso(bucket.end_time);
    if (!bucketStart || !bucketEnd) continue;
    for (const result of bucket.results ?? []) {
      const currency = result.amount?.currency;
      buckets.push({
        provider: "openai",
        model: normalizeCostLineItemModel(result.line_item),
        bucketStart,
        bucketEnd,
        official: {
          requestCount: 0,
          inputTokens: 0,
          outputTokens: 0,
          rawProviderCostUsd:
            currency?.toLowerCase() === "usd"
              ? decimalNumberOrZero(result.amount?.value)
              : 0,
        },
        evidence: {
          source: "openai_costs",
          currency,
          lineItem: result.line_item,
        },
      });
    }
  }
  return buckets;
}

const mergeKey = (bucket: NormalizedOfficialProviderBucket) =>
  [bucket.provider, bucket.model ?? "", bucket.bucketStart, bucket.bucketEnd].join(
    "\u0000"
  );

export function mergeOpenAIUsageAndCostBuckets(
  usageBuckets: NormalizedOfficialProviderBucket[],
  costBuckets: NormalizedOfficialProviderBucket[]
): NormalizedOfficialProviderBucket[] {
  const costByKey = new Map<string, NormalizedOfficialProviderBucket>();
  for (const bucket of costBuckets) {
    const key = mergeKey(bucket);
    const existing = costByKey.get(key);
    if (!existing) {
      costByKey.set(key, bucket);
      continue;
    }
    costByKey.set(key, {
      ...existing,
      official: {
        ...existing.official,
        rawProviderCostUsd:
          existing.official.rawProviderCostUsd + bucket.official.rawProviderCostUsd,
      },
      evidence: {
        ...existing.evidence,
        costEvidenceItems: [
          ...(Array.isArray(existing.evidence.costEvidenceItems)
            ? existing.evidence.costEvidenceItems
            : [existing.evidence]),
          bucket.evidence,
        ],
      },
    });
  }
  const merged: NormalizedOfficialProviderBucket[] = [];
  const usedCostKeys = new Set<string>();

  for (const usageBucket of usageBuckets) {
    const key = mergeKey(usageBucket);
    const costBucket = costByKey.get(key);
    if (!costBucket) {
      merged.push(usageBucket);
      continue;
    }
    usedCostKeys.add(key);
    merged.push({
      ...usageBucket,
      official: {
        ...usageBucket.official,
        rawProviderCostUsd: costBucket.official.rawProviderCostUsd,
      },
      evidence: {
        ...usageBucket.evidence,
        source: `${usageBucket.evidence.source}+openai_costs`,
        costEvidence: costBucket.evidence,
      },
    });
  }

  for (const costBucket of costBuckets) {
    if (!usedCostKeys.has(mergeKey(costBucket))) {
      merged.push(costBucket);
    }
  }

  return merged;
}
