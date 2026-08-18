export type BillingAnomalyKind =
  | "provider_call_write_failed"
  | "provider_credential_revoked_blocked"
  | "provider_credential_revoked_used"
  | "billable_event_write_failed"
  | "rating_failed"
  | "ledger_failed"
  | "provider_call_pending_timeout"
  | "provider_call_sent_unknown"
  | "provider_credential_revoked"
  | "provider_reconciliation_diff"
  | "usage_missing"
  | "pricing_missing";

export type BillingAnomalySeverity = "low" | "medium" | "high" | "critical";

export type BillingAnomalyStage =
  | "provider_call"
  | "billable_event"
  | "rating"
  | "ledger"
  | "usage"
  | "pricing"
  | "reconciliation";

export type BillingAnomalyStatus = "open" | "acknowledged" | "resolved" | "ignored";

export type BillingAnomaly = {
  id: string;
  kind: BillingAnomalyKind;
  severity: BillingAnomalySeverity;
  stage: BillingAnomalyStage;
  status: BillingAnomalyStatus;
  userId: string;
  dialogId?: string;
  agentId?: string;
  provider: string;
  model: string;
  providerCallId?: string;
  billableEventId?: string;
  ratingResultId?: string;
  riskPlatformCredits?: number;
  message: string;
  evidence: Record<string, unknown>;
  createdAt: string;
};

export type CreateBillingAnomalyInput = {
  anomalyId: string;
  kind: BillingAnomalyKind;
  severity: BillingAnomalySeverity;
  stage: BillingAnomalyStage;
  userId: string;
  dialogId?: string;
  agentId?: string;
  provider: string;
  model: string;
  providerCallId?: string;
  billableEventId?: string;
  ratingResultId?: string;
  riskPlatformCredits?: number;
  message: string;
  evidence: Record<string, unknown>;
  createdAt: string;
};

export const buildBillingAnomalyKey = (anomalyId: string) =>
  `billing-anomaly-${anomalyId}`;

export const createBillingAnomaly = (
  input: CreateBillingAnomalyInput
): BillingAnomaly => ({
  id: input.anomalyId,
  kind: input.kind,
  severity: input.severity,
  stage: input.stage,
  status: "open",
  userId: input.userId,
  dialogId: input.dialogId,
  agentId: input.agentId,
  provider: input.provider,
  model: input.model,
  providerCallId: input.providerCallId,
  billableEventId: input.billableEventId,
  ratingResultId: input.ratingResultId,
  riskPlatformCredits: input.riskPlatformCredits,
  message: input.message,
  evidence: { ...input.evidence },
  createdAt: input.createdAt,
});
