import {
  type ProviderCallEvent,
  type ProviderCallPendingEvent,
} from "./providerCall";
import type { ProviderDispatchIntent } from "./providerDispatchIntent";
import { createBillingAnomaly } from "./billingAnomaly";
import {
  writeBillingAnomaly,
  type BillingAnomalyStore,
} from "./billingAnomalyWriter";
import { isDuplicateBillingAnomalyError } from "./isDuplicateBillingAnomalyError";

export const STALE_PROVIDER_CALL_DEFAULT_TIMEOUT_MS = 10 * 60_000;

type ProviderCallSweeperStore = BillingAnomalyStore & {
  iterator(options: { gte?: string; lte?: string }): AsyncIterable<[string, unknown]>;
};

export type SweepStaleProviderCallsResult = {
  scannedProviderCalls: number;
  stalePendingCalls: number;
  anomaliesWritten: number;
  anomaliesAlreadyExisted: number;
};

type ProviderCallState = {
  pending?: ProviderCallPendingEvent;
  dispatchIntent?: ProviderDispatchIntent;
  hasTerminal: boolean;
};

const PROVIDER_CALL_PREFIX = "provider-call-";
const PROVIDER_CALL_RANGE_END = `${PROVIDER_CALL_PREFIX}\uffff`;
const PROVIDER_DISPATCH_INTENT_PREFIX = "provider-dispatch-intent-";
const PROVIDER_DISPATCH_INTENT_RANGE_END = `${PROVIDER_DISPATCH_INTENT_PREFIX}\uffff`;

const isProviderCallEvent = (value: unknown): value is ProviderCallEvent =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { providerCallId?: unknown }).providerCallId === "string" &&
      typeof (value as { eventId?: unknown }).eventId === "string" &&
      typeof (value as { status?: unknown }).status === "string"
  );

const isProviderDispatchIntent = (value: unknown): value is ProviderDispatchIntent =>
  Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as { providerCallId?: unknown }).providerCallId === "string" &&
      typeof (value as { intentId?: unknown }).intentId === "string" &&
      (value as { status?: unknown }).status === "dispatching"
  );

const pendingTimeoutAnomalyId = (providerCallId: string) =>
  `anom_provider_call_pending_timeout_${providerCallId}`;

const sentUnknownAnomalyId = (providerCallId: string) =>
  `anom_provider_call_sent_unknown_${providerCallId}`;

export async function sweepStaleProviderCalls({
  store,
  nowMs = Date.now(),
  timeoutMs = STALE_PROVIDER_CALL_DEFAULT_TIMEOUT_MS,
}: {
  store: ProviderCallSweeperStore;
  nowMs?: number;
  timeoutMs?: number;
}): Promise<SweepStaleProviderCallsResult> {
  const states = new Map<string, ProviderCallState>();

  for await (const [, value] of store.iterator({
    gte: PROVIDER_CALL_PREFIX,
    lte: PROVIDER_CALL_RANGE_END,
  })) {
    if (!isProviderCallEvent(value)) continue;
    const existing = states.get(value.providerCallId) ?? { hasTerminal: false };
    if (value.status === "pending") {
      existing.pending = value;
    }
    if (value.status === "completed" || value.status === "failed") {
      existing.hasTerminal = true;
    }
    states.set(value.providerCallId, existing);
  }
  for await (const [, value] of store.iterator({
    gte: PROVIDER_DISPATCH_INTENT_PREFIX,
    lte: PROVIDER_DISPATCH_INTENT_RANGE_END,
  })) {
    if (!isProviderDispatchIntent(value)) continue;
    const existing = states.get(value.providerCallId) ?? { hasTerminal: false };
    existing.dispatchIntent = value;
    states.set(value.providerCallId, existing);
  }

  const result: SweepStaleProviderCallsResult = {
    scannedProviderCalls: states.size,
    stalePendingCalls: 0,
    anomaliesWritten: 0,
    anomaliesAlreadyExisted: 0,
  };

  for (const [providerCallId, state] of states) {
    if (!state.pending || state.hasTerminal) continue;
    const startedAtMs = Date.parse(state.pending.startedAt);
    if (!Number.isFinite(startedAtMs)) continue;
    const pendingAgeMs = nowMs - startedAtMs;
    if (pendingAgeMs < timeoutMs) continue;

    result.stalePendingCalls += 1;
    const isSentUnknown = Boolean(state.dispatchIntent);
    const anomalyId = isSentUnknown
      ? sentUnknownAnomalyId(providerCallId)
      : pendingTimeoutAnomalyId(providerCallId);
    const kind = isSentUnknown
      ? "provider_call_sent_unknown"
      : "provider_call_pending_timeout";
    const message = isSentUnknown
      ? "Provider call was dispatched but no terminal billing evidence was recorded"
      : "Provider call stayed pending past the billing SLA";
    try {
      await writeBillingAnomaly({
        store,
        anomaly: createBillingAnomaly({
          anomalyId,
          kind,
          severity: "critical",
          stage: "reconciliation",
          userId: state.pending.userId,
          dialogId: state.pending.dialogId,
          agentId: state.pending.agentId,
          provider: state.pending.provider,
          model: state.pending.model,
          providerCallId,
          message,
          evidence: {
            pendingEventId: state.pending.eventId,
            endpoint: state.pending.endpoint,
            serviceTier: state.pending.serviceTier,
            startedAt: state.pending.startedAt,
            pendingAgeMs,
            timeoutMs,
            ...(state.dispatchIntent
              ? {
                  dispatchIntentId: state.dispatchIntent.intentId,
                  dispatchCreatedAt: state.dispatchIntent.createdAt,
                  request: state.dispatchIntent.request,
                }
              : {}),
          },
          createdAt: new Date(nowMs).toISOString(),
        }),
      });
      result.anomaliesWritten += 1;
    } catch (error) {
      if (isDuplicateBillingAnomalyError(error)) {
        result.anomaliesAlreadyExisted += 1;
        continue;
      }
      throw error;
    }
  }

  return result;
}
