import type { ProviderCallCompletedEvent, ProviderCallEvent } from "./providerCall";
import type { RatingResult } from "./ratingResult";
import type { LocalProviderReconciliationBucketTotals } from "./providerReconciliation";

export type ProviderReconciliationLocalStore = {
  iterator(options: { gte?: string; lte?: string }): AsyncIterable<[string, unknown]>;
};

const PROVIDER_CALL_PREFIX = "provider-call-";
const PROVIDER_CALL_RANGE_END = `${PROVIDER_CALL_PREFIX}\uffff`;
const RATING_RESULT_PREFIX = "rating-result-";
const RATING_RESULT_RANGE_END = `${RATING_RESULT_PREFIX}\uffff`;

const isProviderCallCompletedEvent = (
  value: unknown
): value is ProviderCallCompletedEvent =>
  Boolean(
    value &&
      typeof value === "object" &&
      (value as ProviderCallEvent).status === "completed" &&
      typeof (value as { provider?: unknown }).provider === "string" &&
      typeof (value as { model?: unknown }).model === "string" &&
      typeof (value as { completedAt?: unknown }).completedAt === "string"
  );

const isRatingResult = (value: unknown): value is RatingResult =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { id?: unknown }).id === "string" &&
      typeof (value as { provider?: unknown }).provider === "string" &&
      typeof (value as { model?: unknown }).model === "string" &&
      typeof (value as { platformCredits?: unknown }).platformCredits === "number" &&
      typeof (value as { createdAt?: unknown }).createdAt === "string"
  );

const isWithinWindow = (iso: string, bucketStartMs: number, bucketEndMs: number) => {
  const time = Date.parse(iso);
  return Number.isFinite(time) && time >= bucketStartMs && time < bucketEndMs;
};

const roundMoney = (value: number) => Number(value.toFixed(12));

export async function aggregateLocalProviderBillingBucket({
  store,
  provider,
  model,
  bucketStart,
  bucketEnd,
}: {
  store: ProviderReconciliationLocalStore;
  provider: string;
  model?: string;
  bucketStart: string;
  bucketEnd: string;
}): Promise<LocalProviderReconciliationBucketTotals> {
  const bucketStartMs = Date.parse(bucketStart);
  const bucketEndMs = Date.parse(bucketEnd);
  const totals: LocalProviderReconciliationBucketTotals = {
    requestCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    rawProviderCostUsd: 0,
    platformCredits: 0,
  };

  for await (const [, value] of store.iterator({
    gte: PROVIDER_CALL_PREFIX,
    lte: PROVIDER_CALL_RANGE_END,
  })) {
    if (!isProviderCallCompletedEvent(value)) continue;
    if (value.provider !== provider) continue;
    if (model && value.model !== model) continue;
    if (!isWithinWindow(value.completedAt, bucketStartMs, bucketEndMs)) continue;
    totals.requestCount += 1;
    totals.inputTokens += value.usage.inputTokens;
    totals.outputTokens += value.usage.outputTokens;
    if (value.cost.rawProviderCurrency === "USD") {
      totals.rawProviderCostUsd += value.cost.rawProviderCost ?? 0;
    }
  }

  for await (const [, value] of store.iterator({
    gte: RATING_RESULT_PREFIX,
    lte: RATING_RESULT_RANGE_END,
  })) {
    if (!isRatingResult(value)) continue;
    if (value.provider !== provider) continue;
    if (model && value.model !== model) continue;
    if (!isWithinWindow(value.createdAt, bucketStartMs, bucketEndMs)) continue;
    totals.platformCredits += value.platformCredits;
  }

  totals.rawProviderCostUsd = roundMoney(totals.rawProviderCostUsd);
  totals.platformCredits = roundMoney(totals.platformCredits);
  return totals;
}
