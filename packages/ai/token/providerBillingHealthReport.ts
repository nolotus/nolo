import { clampInteger } from "core/clampedInteger";
import { isRecord } from "core/isRecord";

import type {
  BillingAnomaly,
  BillingAnomalySeverity,
  BillingAnomalyStatus,
} from "./billingAnomaly";
import type { BillingAnomalyLifecycleEvent } from "./billingAnomalyLifecycle";
import type {
  ProviderCallCompletedEvent,
  ProviderCallEvent,
} from "./providerCall";
import type {
  ProviderReconciliationBucket,
  ProviderReconciliationStatus,
} from "./providerReconciliation";

export type ProviderBillingHealthStore = {
  iterator(options: { gte?: string; lte?: string }): AsyncIterable<[string, unknown]>;
};

export type ProviderBillingHealthTotals = {
  bucketCount: number;
  openAnomalyCount: number;
  totalOfficialRawProviderCostUsd: number;
  totalLocalRawProviderCostUsd: number;
  signedRawProviderCostDiffUsd: number;
  absoluteRawProviderCostDiffUsd: number;
  riskPlatformCredits: number;
};

export type ProviderBillingAccountTotals = {
  provider: string;
  providerAccountKey: string;
  providerAccountAlias?: string;
  officialBillingAccountId?: string;
  environment?: string;
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  rawProviderCostUsd: number;
  platformCredits: number;
};

export type ProviderBillingHealthReport = {
  since: string;
  until: string;
  summary: ProviderBillingHealthTotals;
  statusCounts: Partial<Record<ProviderReconciliationStatus, number>>;
  severityCounts: Partial<Record<BillingAnomalySeverity, number>>;
  anomalyStatusCounts: Partial<Record<BillingAnomalyStatus, number>>;
  byProvider: Record<
    string,
    ProviderBillingHealthTotals & {
      statusCounts: Partial<Record<ProviderReconciliationStatus, number>>;
    }
  >;
  byProviderAccount: Record<string, ProviderBillingAccountTotals>;
  topBuckets: ProviderReconciliationBucket[];
  openAnomalies: BillingAnomaly[];
};

const RECONCILIATION_PREFIX = "provider-reconciliation-bucket-";
const RECONCILIATION_RANGE_END = `${RECONCILIATION_PREFIX}\uffff`;
const ANOMALY_PREFIX = "billing-anomaly-";
const ANOMALY_RANGE_END = `${ANOMALY_PREFIX}\uffff`;
const ANOMALY_LIFECYCLE_PREFIX = "billing-anomaly-lifecycle-";
const ANOMALY_LIFECYCLE_RANGE_END = `${ANOMALY_LIFECYCLE_PREFIX}\uffff`;
const PROVIDER_CALL_PREFIX = "provider-call-";
const PROVIDER_CALL_RANGE_END = `${PROVIDER_CALL_PREFIX}\uffff`;

const roundMoney = (value: number) => Number(value.toFixed(12));

const emptyTotals = (): ProviderBillingHealthTotals => ({
  bucketCount: 0,
  openAnomalyCount: 0,
  totalOfficialRawProviderCostUsd: 0,
  totalLocalRawProviderCostUsd: 0,
  signedRawProviderCostDiffUsd: 0,
  absoluteRawProviderCostDiffUsd: 0,
  riskPlatformCredits: 0,
});

const isProviderReconciliationBucket = (
  value: unknown
): value is ProviderReconciliationBucket =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.provider === "string" &&
  typeof value.bucketStart === "string" &&
  typeof value.bucketEnd === "string" &&
  isRecord(value.official) &&
  isRecord(value.local) &&
  isRecord(value.diff);

const isBillingAnomaly = (value: unknown): value is BillingAnomaly =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.kind === "string" &&
  typeof value.severity === "string" &&
  typeof value.status === "string" &&
  typeof value.createdAt === "string";

const isBillingAnomalyLifecycleEvent = (
  value: unknown
): value is BillingAnomalyLifecycleEvent =>
  isRecord(value) &&
  value.recordType === "billing_anomaly_lifecycle_event" &&
  typeof value.anomalyId === "string" &&
  typeof value.eventId === "string" &&
  typeof value.status === "string" &&
  typeof value.createdAt === "string";

const isCompletedProviderCall = (
  value: unknown
): value is ProviderCallCompletedEvent =>
  isRecord(value) &&
  (value as ProviderCallEvent).status === "completed" &&
  typeof value.provider === "string" &&
  typeof value.model === "string" &&
  typeof value.completedAt === "string" &&
  isRecord(value.usage);

const overlapsWindow = ({
  start,
  end,
  sinceMs,
  untilMs,
}: {
  start: string;
  end: string;
  sinceMs: number;
  untilMs: number;
}) => {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return false;
  return startMs < untilMs && endMs > sinceMs;
};

const insideWindow = ({
  createdAt,
  sinceMs,
  untilMs,
}: {
  createdAt: string;
  sinceMs: number;
  untilMs: number;
}) => {
  const createdMs = Date.parse(createdAt);
  return Number.isFinite(createdMs) && createdMs >= sinceMs && createdMs < untilMs;
};

const increment = <K extends string>(
  target: Partial<Record<K, number>>,
  key: K
) => {
  target[key] = (target[key] ?? 0) + 1;
};

const addBucketToTotals = (
  totals: ProviderBillingHealthTotals,
  bucket: ProviderReconciliationBucket
) => {
  totals.bucketCount += 1;
  totals.totalOfficialRawProviderCostUsd = roundMoney(
    totals.totalOfficialRawProviderCostUsd + bucket.official.rawProviderCostUsd
  );
  totals.totalLocalRawProviderCostUsd = roundMoney(
    totals.totalLocalRawProviderCostUsd + bucket.local.rawProviderCostUsd
  );
  totals.signedRawProviderCostDiffUsd = roundMoney(
    totals.signedRawProviderCostDiffUsd + bucket.diff.rawProviderCostUsd
  );
  totals.absoluteRawProviderCostDiffUsd = roundMoney(
    totals.absoluteRawProviderCostDiffUsd + bucket.diff.absoluteRawProviderCostUsd
  );
};

const addAnomalyToTotals = (
  totals: ProviderBillingHealthTotals,
  anomaly: BillingAnomaly
) => {
  totals.openAnomalyCount += 1;
  totals.riskPlatformCredits = roundMoney(
    totals.riskPlatformCredits + (anomaly.riskPlatformCredits ?? 0)
  );
};

const addProviderCallToAccountTotals = (
  target: ProviderBillingAccountTotals,
  event: ProviderCallCompletedEvent
) => {
  target.requestCount += 1;
  target.inputTokens += event.usage.inputTokens;
  target.outputTokens += event.usage.outputTokens;
  if (event.cost.rawProviderCurrency === "USD") {
    target.rawProviderCostUsd = roundMoney(
      target.rawProviderCostUsd + (event.cost.rawProviderCost ?? 0)
    );
  }
  target.platformCredits = roundMoney(
    target.platformCredits + (event.cost.platformCredits ?? 0)
  );
};

export async function buildProviderBillingHealthReport({
  store,
  since,
  until,
  limit = 20,
}: {
  store: ProviderBillingHealthStore;
  since: string;
  until: string;
  limit?: number;
}): Promise<ProviderBillingHealthReport> {
  const sinceMs = Date.parse(since);
  const untilMs = Date.parse(until);
  if (!Number.isFinite(sinceMs) || !Number.isFinite(untilMs) || untilMs <= sinceMs) {
    throw new Error("since and until must be valid ISO timestamps");
  }

  const maxRows = clampInteger(limit, 20, 1, 200);
  const summary = emptyTotals();
  const statusCounts: Partial<Record<ProviderReconciliationStatus, number>> = {};
  const severityCounts: Partial<Record<BillingAnomalySeverity, number>> = {};
  const anomalyStatusCounts: Partial<Record<BillingAnomalyStatus, number>> = {};
  const byProvider: ProviderBillingHealthReport["byProvider"] = {};
  const byProviderAccount: ProviderBillingHealthReport["byProviderAccount"] = {};
  const buckets: ProviderReconciliationBucket[] = [];
  const openAnomalies: BillingAnomaly[] = [];
  const anomalyLifecycleById = new Map<string, BillingAnomalyLifecycleEvent>();

  for await (const [, value] of store.iterator({
    gte: ANOMALY_LIFECYCLE_PREFIX,
    lte: ANOMALY_LIFECYCLE_RANGE_END,
  })) {
    if (!isBillingAnomalyLifecycleEvent(value)) continue;
    const existing = anomalyLifecycleById.get(value.anomalyId);
    if (!existing || Date.parse(value.createdAt) >= Date.parse(existing.createdAt)) {
      anomalyLifecycleById.set(value.anomalyId, value);
    }
  }

  for await (const [, value] of store.iterator({
    gte: PROVIDER_CALL_PREFIX,
    lte: PROVIDER_CALL_RANGE_END,
  })) {
    if (!isCompletedProviderCall(value)) continue;
    if (
      !insideWindow({
        createdAt: value.completedAt,
        sinceMs,
        untilMs,
      })
    ) {
      continue;
    }
    const accountKey = value.credential?.providerAccountKey;
    if (!accountKey) continue;
    const key = `${value.provider}:${accountKey}`;
    const totals =
      byProviderAccount[key] ??
      ({
        provider: value.provider,
        providerAccountKey: accountKey,
        providerAccountAlias: value.credential?.providerAccountAlias,
        officialBillingAccountId: value.credential?.officialBillingAccountId,
        environment: value.credential?.environment,
        requestCount: 0,
        inputTokens: 0,
        outputTokens: 0,
        rawProviderCostUsd: 0,
        platformCredits: 0,
      } satisfies ProviderBillingAccountTotals);
    addProviderCallToAccountTotals(totals, value);
    byProviderAccount[key] = totals;
  }

  for await (const [, value] of store.iterator({
    gte: RECONCILIATION_PREFIX,
    lte: RECONCILIATION_RANGE_END,
  })) {
    if (!isProviderReconciliationBucket(value)) continue;
    if (
      !overlapsWindow({
        start: value.bucketStart,
        end: value.bucketEnd,
        sinceMs,
        untilMs,
      })
    ) {
      continue;
    }

    buckets.push(value);
    addBucketToTotals(summary, value);
    increment(statusCounts, value.status);

    const providerTotals =
      byProvider[value.provider] ??
      ({
        ...emptyTotals(),
        statusCounts: {},
      } satisfies ProviderBillingHealthReport["byProvider"][string]);
    addBucketToTotals(providerTotals, value);
    increment(providerTotals.statusCounts, value.status);
    byProvider[value.provider] = providerTotals;
  }

  for await (const [, value] of store.iterator({
    gte: ANOMALY_PREFIX,
    lte: ANOMALY_RANGE_END,
  })) {
    if (!isBillingAnomaly(value)) continue;
    if (!insideWindow({ createdAt: value.createdAt, sinceMs, untilMs })) continue;
    const lifecycle = anomalyLifecycleById.get(value.id);
    const effectiveStatus = lifecycle?.status ?? value.status;
    increment(anomalyStatusCounts, effectiveStatus);
    if (effectiveStatus !== "open") continue;
    openAnomalies.push({ ...value, status: effectiveStatus });
    addAnomalyToTotals(summary, value);
    increment(severityCounts, value.severity);

    const providerTotals =
      byProvider[value.provider] ??
      ({
        ...emptyTotals(),
        statusCounts: {},
      } satisfies ProviderBillingHealthReport["byProvider"][string]);
    addAnomalyToTotals(providerTotals, value);
    byProvider[value.provider] = providerTotals;
  }

  const topBuckets = buckets
    .sort(
      (left, right) =>
        right.diff.absoluteRawProviderCostUsd - left.diff.absoluteRawProviderCostUsd
    )
    .slice(0, maxRows);
  const severityRank: Record<BillingAnomalySeverity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
  };
  openAnomalies.sort((left, right) => {
    const severityDiff = severityRank[right.severity] - severityRank[left.severity];
    if (severityDiff !== 0) return severityDiff;
    return Date.parse(right.createdAt) - Date.parse(left.createdAt);
  });

  return {
    since,
    until,
    summary,
    statusCounts,
    severityCounts,
    anomalyStatusCounts,
    byProvider,
    byProviderAccount,
    topBuckets,
    openAnomalies: openAnomalies.slice(0, maxRows),
  };
}
