import { clampInteger } from "core/clampedInteger";
import { isRecord } from "core/isRecord";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { asNonEmptyStringArray } from "core/stringArray";

import type { ProviderBillableEvent } from "./providerBillableEvent";
import type {
  ProviderCallCompletedEvent,
  ProviderCallEvent,
} from "./providerCall";
import {
  buildProviderReconciliationBucketKey,
  type ProviderReconciliationBucket,
} from "./providerReconciliation";
import type { RatingResult } from "./ratingResult";

export type ProviderBillingDrilldownStore = {
  get(key: string): Promise<unknown>;
  iterator(options: { gte?: string; lte?: string }): AsyncIterable<[string, unknown]>;
};

export type ProviderBillingDrilldownTokenRecord = {
  key: string;
  userId?: string;
  dialogId?: string;
  agentId?: string;
  provider?: string;
  model?: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: number;
  providerRequestIds: string[];
  providerResponseIds: string[];
};

export type ProviderBillingDrilldownLedgerTransaction = {
  key: string;
  txId?: string;
  idempotencyKey?: string;
  type?: string;
  createdAt?: number;
  metadata?: Record<string, unknown>;
};

export type ProviderBillingDrilldown = {
  bucket: ProviderReconciliationBucket;
  matchMode: "bucket_window" | "official_request_id";
  officialEvidence?: Record<string, unknown>;
  officialRequestIds: string[];
  officialResponseIds: string[];
  unmatchedOfficialRequestIds: string[];
  summary: {
    providerCallCount: number;
    billableEventCount: number;
    ratingResultCount: number;
    tokenRecordCount: number;
    ledgerTransactionCount: number;
  };
  providerCalls: ProviderCallCompletedEvent[];
  billableEvents: ProviderBillableEvent[];
  ratingResults: RatingResult[];
  tokenRecords: ProviderBillingDrilldownTokenRecord[];
  ledgerTransactions: ProviderBillingDrilldownLedgerTransaction[];
};

const PROVIDER_CALL_PREFIX = "provider-call-";
const PROVIDER_CALL_RANGE_END = `${PROVIDER_CALL_PREFIX}\uffff`;
const BILLABLE_EVENT_PREFIX = "provider-billable-event-";
const BILLABLE_EVENT_RANGE_END = `${BILLABLE_EVENT_PREFIX}\uffff`;
const RATING_RESULT_PREFIX = "rating-result-";
const RATING_RESULT_RANGE_END = `${RATING_RESULT_PREFIX}\uffff`;
const TOKEN_PREFIX = "token-";
const TOKEN_RANGE_END = `${TOKEN_PREFIX}\uffff`;
const TOKEN_STATS_PREFIX = "token-stats-";
const LEDGER_TX_PREFIX = "ledger-tx-";
const LEDGER_TX_RANGE_END = `${LEDGER_TX_PREFIX}\uffff`;

const isCompletedProviderCall = (
  value: unknown
): value is ProviderCallCompletedEvent =>
  isRecord(value) &&
  (value as ProviderCallEvent).status === "completed" &&
  typeof value.providerCallId === "string" &&
  typeof value.provider === "string" &&
  typeof value.model === "string" &&
  typeof value.completedAt === "string" &&
  isRecord(value.usage);

const isProviderBillableEvent = (
  value: unknown
): value is ProviderBillableEvent =>
  isRecord(value) &&
  typeof value.id === "string" &&
  Array.isArray(value.sourceProviderCallIds) &&
  typeof value.provider === "string" &&
  typeof value.model === "string";

const isRatingResult = (value: unknown): value is RatingResult =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.billableEventId === "string" &&
  typeof value.provider === "string" &&
  typeof value.model === "string";

const isWithinWindow = (iso: string, startMs: number, endMs: number) => {
  const time = Date.parse(iso);
  return Number.isFinite(time) && time >= startMs && time < endMs;
};

const numberOrZero = (value: unknown) => asOptionalFiniteNumber(value) ?? 0;

const extractEvidenceIds = (
  evidence: Record<string, unknown> | undefined,
  keys: string[]
) => {
  const values: string[] = [];
  for (const key of keys) {
    values.push(...asNonEmptyStringArray(evidence?.[key]));
  }
  return [...new Set(values)];
};

const tokenTimestamp = (value: Record<string, unknown>) => {
  const timestamp = asOptionalFiniteNumber(value.timestamp);
  if (timestamp !== undefined) return timestamp;
  if (typeof value.createdAt === "string") {
    const parsed = Date.parse(value.createdAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const matchesBucket = (
  bucket: ProviderReconciliationBucket,
  value: { provider?: string; model?: string }
) => {
  if (value.provider !== bucket.provider) return false;
  if (bucket.model && value.model !== bucket.model) return false;
  return true;
};

const normalizeTokenRecord = (
  key: string,
  value: Record<string, unknown>
): ProviderBillingDrilldownTokenRecord | undefined => {
  const timestamp = tokenTimestamp(value);
  if (typeof timestamp !== "number") return undefined;
  return {
    key,
    userId: typeof value.userId === "string" ? value.userId : undefined,
    dialogId: typeof value.dialogId === "string" ? value.dialogId : undefined,
    agentId:
      typeof value.agentId === "string"
        ? value.agentId
        : typeof value.cybotId === "string"
          ? value.cybotId
          : undefined,
    provider: typeof value.provider === "string" ? value.provider : undefined,
    model: typeof value.model === "string" ? value.model : undefined,
    inputTokens: numberOrZero(value.input_tokens),
    outputTokens: numberOrZero(value.output_tokens),
    cost: numberOrZero(value.cost),
    timestamp,
    providerRequestIds: asNonEmptyStringArray(value.provider_request_ids),
    providerResponseIds: asNonEmptyStringArray(value.provider_response_ids),
  };
};

const normalizeLedgerTransaction = (
  key: string,
  value: Record<string, unknown>
): ProviderBillingDrilldownLedgerTransaction => ({
  key,
  txId: typeof value.txId === "string" ? value.txId : undefined,
  idempotencyKey:
    typeof value.idempotencyKey === "string" ? value.idempotencyKey : undefined,
  type: typeof value.type === "string" ? value.type : undefined,
  createdAt: typeof value.createdAt === "number" ? value.createdAt : undefined,
  metadata: isRecord(value.metadata) ? value.metadata : undefined,
});

const providerCallIdFromIdempotencyKey = (value: string | undefined) => {
  const match = value?.match(/^provider-call:(.+):charge:v1$/);
  return match?.[1];
};

const intersects = (left: string[], right: Set<string>) =>
  left.some((item) => right.has(item));

export async function buildProviderBillingDrilldown({
  store,
  bucketId,
  limit = 50,
}: {
  store: ProviderBillingDrilldownStore;
  bucketId: string;
  limit?: number;
}): Promise<ProviderBillingDrilldown> {
  const bucketValue = await store.get(buildProviderReconciliationBucketKey(bucketId));
  if (!isRecord(bucketValue) || typeof bucketValue.id !== "string") {
    throw new Error(`provider reconciliation bucket not found: ${bucketId}`);
  }
  const bucket = bucketValue as ProviderReconciliationBucket;
  const startMs = Date.parse(bucket.bucketStart);
  const endMs = Date.parse(bucket.bucketEnd);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) {
    throw new Error(`provider reconciliation bucket has invalid window: ${bucketId}`);
  }

  const maxRows = clampInteger(limit, 50, 1, 200);
  const officialEvidence = bucket.officialEvidence;
  const officialRequestIds = extractEvidenceIds(officialEvidence, [
    "requestIds",
    "providerRequestIds",
  ]);
  const officialResponseIds = extractEvidenceIds(officialEvidence, [
    "responseIds",
    "providerResponseIds",
  ]);
  const officialRequestIdSet = new Set(officialRequestIds);
  const officialResponseIdSet = new Set(officialResponseIds);
  const hasOfficialRequestEvidence =
    officialRequestIdSet.size > 0 || officialResponseIdSet.size > 0;

  const tokenRecords: ProviderBillingDrilldownTokenRecord[] = [];
  const tokenKeys = new Set<string>();
  const matchedOfficialRequestIds = new Set<string>();
  for await (const [key, value] of store.iterator({
    gte: TOKEN_PREFIX,
    lte: TOKEN_RANGE_END,
  })) {
    if (key.startsWith(TOKEN_STATS_PREFIX) || !isRecord(value)) continue;
    if (value.type !== "token") continue;
    const tokenRecord = normalizeTokenRecord(key, value);
    if (!tokenRecord) continue;
    if (!matchesBucket(bucket, tokenRecord)) continue;
    if (tokenRecord.timestamp < startMs || tokenRecord.timestamp >= endMs) continue;
    const requestMatch = intersects(tokenRecord.providerRequestIds, officialRequestIdSet);
    const responseMatch = intersects(
      tokenRecord.providerResponseIds,
      officialResponseIdSet
    );
    if (hasOfficialRequestEvidence && !requestMatch && !responseMatch) continue;
    if (requestMatch) {
      for (const requestId of tokenRecord.providerRequestIds) {
        if (officialRequestIdSet.has(requestId)) matchedOfficialRequestIds.add(requestId);
      }
    }
    tokenRecords.push(tokenRecord);
    tokenKeys.add(key);
  }

  const allLedgerTransactions: ProviderBillingDrilldownLedgerTransaction[] = [];
  for await (const [key, value] of store.iterator({
    gte: LEDGER_TX_PREFIX,
    lte: LEDGER_TX_RANGE_END,
  })) {
    if (!isRecord(value)) continue;
    allLedgerTransactions.push(normalizeLedgerTransaction(key, value));
  }

  const exactProviderCallIds = new Set<string>();
  for (const tx of allLedgerTransactions) {
    const tokenKey =
      typeof tx.metadata?.tokenKey === "string" ? tx.metadata.tokenKey : "";
    if (!tokenKeys.has(tokenKey)) continue;
    const providerCallId = providerCallIdFromIdempotencyKey(tx.idempotencyKey);
    if (providerCallId) exactProviderCallIds.add(providerCallId);
  }

  const providerCalls: ProviderCallCompletedEvent[] = [];
  const providerCallIds = new Set<string>();
  for await (const [, value] of store.iterator({
    gte: PROVIDER_CALL_PREFIX,
    lte: PROVIDER_CALL_RANGE_END,
  })) {
    if (!isCompletedProviderCall(value)) continue;
    if (!matchesBucket(bucket, value)) continue;
    if (!isWithinWindow(value.completedAt, startMs, endMs)) continue;
    if (
      hasOfficialRequestEvidence &&
      (exactProviderCallIds.size === 0 ||
        !exactProviderCallIds.has(value.providerCallId))
    ) {
      continue;
    }
    providerCalls.push(value);
    providerCallIds.add(value.providerCallId);
  }

  const billableEvents: ProviderBillableEvent[] = [];
  const billableEventIds = new Set<string>();
  for await (const [, value] of store.iterator({
    gte: BILLABLE_EVENT_PREFIX,
    lte: BILLABLE_EVENT_RANGE_END,
  })) {
    if (!isProviderBillableEvent(value)) continue;
    if (!matchesBucket(bucket, value)) continue;
    if (
      !value.sourceProviderCallIds.some((providerCallId) =>
        providerCallIds.has(providerCallId)
      )
    ) {
      continue;
    }
    billableEvents.push(value);
    billableEventIds.add(value.id);
  }

  const ratingResults: RatingResult[] = [];
  for await (const [, value] of store.iterator({
    gte: RATING_RESULT_PREFIX,
    lte: RATING_RESULT_RANGE_END,
  })) {
    if (!isRatingResult(value)) continue;
    if (!matchesBucket(bucket, value)) continue;
    if (!billableEventIds.has(value.billableEventId)) continue;
    ratingResults.push(value);
  }

  const ledgerTransactions: ProviderBillingDrilldownLedgerTransaction[] = [];
  for (const tx of allLedgerTransactions) {
    const tokenKey =
      typeof tx.metadata?.tokenKey === "string" ? tx.metadata.tokenKey : "";
    const providerCallId = providerCallIdFromIdempotencyKey(tx.idempotencyKey);
    const linkedToProviderCall = [...providerCallIds].some(
      (candidateProviderCallId) => providerCallId === candidateProviderCallId
    );
    if (!linkedToProviderCall && !tokenKeys.has(tokenKey)) continue;
    ledgerTransactions.push(tx);
  }

  return {
    bucket,
    matchMode: hasOfficialRequestEvidence ? "official_request_id" : "bucket_window",
    officialEvidence,
    officialRequestIds,
    officialResponseIds,
    unmatchedOfficialRequestIds: officialRequestIds.filter(
      (requestId) => !matchedOfficialRequestIds.has(requestId)
    ),
    summary: {
      providerCallCount: providerCalls.length,
      billableEventCount: billableEvents.length,
      ratingResultCount: ratingResults.length,
      tokenRecordCount: tokenRecords.length,
      ledgerTransactionCount: ledgerTransactions.length,
    },
    providerCalls: providerCalls.slice(0, maxRows),
    billableEvents: billableEvents.slice(0, maxRows),
    ratingResults: ratingResults.slice(0, maxRows),
    tokenRecords: tokenRecords.slice(0, maxRows),
    ledgerTransactions: ledgerTransactions.slice(0, maxRows),
  };
}
