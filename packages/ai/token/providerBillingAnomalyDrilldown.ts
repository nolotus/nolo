import { createHash } from "node:crypto";

import { isRecord } from "core/isRecord";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { asOptionalTrimmedString } from "core/optionalString";

import {
  buildBillingAnomalyKey,
  type BillingAnomaly,
  type BillingAnomalyKind,
} from "./billingAnomaly";
import {
  buildProviderBillingDrilldown,
  type ProviderBillingDrilldown,
  type ProviderBillingDrilldownStore,
} from "./providerBillingDrilldown";

export type BillingAnomalyRepairDryRunAction =
  | "none"
  | "wait_provider_delay"
  | "repair_evidence"
  | "provider_call_debit_dry_run"
  | "manual_reconciliation_review"
  | "platform_absorb_review";

export type BillingAnomalyRepairDryRun = {
  mode: "dry-run";
  executable: false;
  recommendedAction: BillingAnomalyRepairDryRunAction;
  affectedUserCount: number;
  providerCallCount: number;
  estimatedPlatformCredits: number;
  maxSingleUserImpact: number;
  wouldIncreaseNegativeBalance: boolean;
  inputSetHash: string;
  notes: string[];
};

export type ProviderBillingAnomalyDrilldown = {
  anomaly: BillingAnomaly;
  evidenceChain: {
    bucketId?: string;
    providerCallIds: string[];
    billableEventIds: string[];
    ratingResultIds: string[];
    tokenRecordKeys: string[];
    ledgerTransactionKeys: string[];
    bucketDrilldown?: ProviderBillingDrilldown;
  };
  repairDryRun: BillingAnomalyRepairDryRun;
};

export type ProviderBillingAnomalyDrilldownStore =
  ProviderBillingDrilldownStore;

const isBillingAnomaly = (value: unknown): value is BillingAnomaly =>
  isRecord(value) &&
  typeof value.id === "string" &&
  typeof value.kind === "string" &&
  typeof value.status === "string" &&
  typeof value.createdAt === "string";

const numberOrZero = (value: unknown) => asOptionalFiniteNumber(value) ?? 0;

const stringFromEvidence = (
  evidence: Record<string, unknown>,
  key: string
) => asOptionalTrimmedString(evidence[key]);

const uniqueStrings = (values: Array<string | undefined>) => [
  ...new Set(values.filter((value): value is string => Boolean(value))),
];

const actionForKind = (
  kind: BillingAnomalyKind
): BillingAnomalyRepairDryRunAction => {
  if (kind === "ledger_failed") return "provider_call_debit_dry_run";
  if (
    kind === "billable_event_write_failed" ||
    kind === "rating_failed" ||
    kind === "pricing_missing" ||
    kind === "usage_missing"
  ) {
    return "repair_evidence";
  }
  if (
    kind === "provider_call_pending_timeout" ||
    kind === "provider_call_sent_unknown"
  ) {
    return "wait_provider_delay";
  }
  if (kind === "provider_reconciliation_diff") {
    return "manual_reconciliation_review";
  }
  if (
    kind === "provider_credential_revoked" ||
    kind === "provider_credential_revoked_blocked" ||
    kind === "provider_credential_revoked_used"
  ) {
    return "platform_absorb_review";
  }
  return "none";
};

const inputHash = (value: unknown) =>
  `sha256:${createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex")}`;

export async function buildProviderBillingAnomalyDrilldown({
  store,
  anomalyId,
  limit = 50,
}: {
  store: ProviderBillingAnomalyDrilldownStore;
  anomalyId: string;
  limit?: number;
}): Promise<ProviderBillingAnomalyDrilldown> {
  const anomalyValue = await store.get(buildBillingAnomalyKey(anomalyId));
  if (!isBillingAnomaly(anomalyValue)) {
    throw new Error(`billing anomaly not found: ${anomalyId}`);
  }
  const anomaly = anomalyValue;
  const bucketId = stringFromEvidence(anomaly.evidence, "bucketId");
  const bucketDrilldown = bucketId
    ? await buildProviderBillingDrilldown({ store, bucketId, limit })
    : undefined;

  const providerCallIds = uniqueStrings([
    anomaly.providerCallId,
    stringFromEvidence(anomaly.evidence, "providerCallId"),
    ...(bucketDrilldown?.providerCalls.map((call) => call.providerCallId) ?? []),
  ]);
  const billableEventIds = uniqueStrings([
    anomaly.billableEventId,
    stringFromEvidence(anomaly.evidence, "billableEventId"),
    ...(bucketDrilldown?.billableEvents.map((event) => event.id) ?? []),
  ]);
  const ratingResultIds = uniqueStrings([
    anomaly.ratingResultId,
    stringFromEvidence(anomaly.evidence, "ratingResultId"),
    ...(bucketDrilldown?.ratingResults.map((rating) => rating.id) ?? []),
  ]);
  const tokenRecordKeys = uniqueStrings(
    bucketDrilldown?.tokenRecords.map((record) => record.key) ?? []
  );
  const ledgerTransactionKeys = uniqueStrings(
    bucketDrilldown?.ledgerTransactions.map((tx) => tx.key) ?? []
  );
  const affectedUsers = new Set<string>();
  if (anomaly.userId && anomaly.userId !== "provider-reconciliation") {
    affectedUsers.add(anomaly.userId);
  }
  for (const call of bucketDrilldown?.providerCalls ?? []) {
    if (call.userId) affectedUsers.add(call.userId);
  }
  for (const record of bucketDrilldown?.tokenRecords ?? []) {
    if (record.userId) affectedUsers.add(record.userId);
  }

  const estimatedPlatformCredits = numberOrZero(anomaly.riskPlatformCredits);
  const recommendedAction = actionForKind(anomaly.kind);
  const notes = [
    "dry-run only; no ledger, balance, recharge, or anomaly lifecycle record is written",
    bucketId
      ? "linked through provider reconciliation bucket evidence"
      : "linked through anomaly direct evidence only",
  ];

  return {
    anomaly,
    evidenceChain: {
      bucketId,
      providerCallIds,
      billableEventIds,
      ratingResultIds,
      tokenRecordKeys,
      ledgerTransactionKeys,
      bucketDrilldown,
    },
    repairDryRun: {
      mode: "dry-run",
      executable: false,
      recommendedAction,
      affectedUserCount: affectedUsers.size,
      providerCallCount: providerCallIds.length,
      estimatedPlatformCredits,
      maxSingleUserImpact: estimatedPlatformCredits,
      wouldIncreaseNegativeBalance: false,
      inputSetHash: inputHash({
        anomalyId: anomaly.id,
        kind: anomaly.kind,
        bucketId,
        providerCallIds,
        billableEventIds,
        ratingResultIds,
        tokenRecordKeys,
        ledgerTransactionKeys,
        estimatedPlatformCredits,
      }),
      notes,
    },
  };
}
