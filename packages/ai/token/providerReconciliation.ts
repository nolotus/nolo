export type ProviderReconciliationStatus =
  | "matched"
  | "missing_local"
  | "extra_local"
  | "mismatched_usage"
  | "mismatched_cost"
  | "waiting_provider";

export type ProviderReconciliationBucketTotals = {
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  rawProviderCostUsd: number;
};

export type LocalProviderReconciliationBucketTotals =
  ProviderReconciliationBucketTotals & {
    platformCredits: number;
  };

export type ProviderReconciliationBucketDiff = {
  requestCount: number;
  inputTokens: number;
  outputTokens: number;
  rawProviderCostUsd: number;
  platformCredits: number;
  absoluteRawProviderCostUsd: number;
};

export type ProviderReconciliationBucket = {
  id: string;
  provider: string;
  model?: string;
  endpoint?: string;
  serviceTier?: string;
  officialEvidence?: Record<string, unknown>;
  bucketStart: string;
  bucketEnd: string;
  status: ProviderReconciliationStatus;
  official: ProviderReconciliationBucketTotals;
  local: LocalProviderReconciliationBucketTotals;
  diff: ProviderReconciliationBucketDiff;
  needsAnomaly: boolean;
  createdAt: string;
};

export type CreateProviderReconciliationBucketInput = {
  bucketId: string;
  provider: string;
  model?: string;
  endpoint?: string;
  serviceTier?: string;
  officialEvidence?: Record<string, unknown>;
  bucketStart: string;
  bucketEnd: string;
  official: ProviderReconciliationBucketTotals;
  local: LocalProviderReconciliationBucketTotals;
  createdAt: string;
  rawProviderCostToleranceUsd?: number;
};

export const buildProviderReconciliationBucketKey = (bucketId: string) =>
  `provider-reconciliation-bucket-${bucketId}`;

const hasOfficialEvidence = (totals: ProviderReconciliationBucketTotals) =>
  totals.requestCount > 0 ||
  totals.inputTokens > 0 ||
  totals.outputTokens > 0 ||
  totals.rawProviderCostUsd > 0;

const hasLocalEvidence = (totals: LocalProviderReconciliationBucketTotals) =>
  totals.requestCount > 0 ||
  totals.inputTokens > 0 ||
  totals.outputTokens > 0 ||
  totals.rawProviderCostUsd > 0 ||
  totals.platformCredits > 0;

const roundMoney = (value: number) => Number(value.toFixed(12));

const classifyBucket = ({
  official,
  local,
  diff,
  costTolerance,
}: {
  official: ProviderReconciliationBucketTotals;
  local: LocalProviderReconciliationBucketTotals;
  diff: ProviderReconciliationBucketDiff;
  costTolerance: number;
}): ProviderReconciliationStatus => {
  const officialExists = hasOfficialEvidence(official);
  const localExists = hasLocalEvidence(local);
  if (officialExists && !localExists) return "missing_local";
  if (!officialExists && localExists) return "extra_local";
  if (!officialExists && !localExists) return "waiting_provider";
  if (
    diff.requestCount !== 0 ||
    diff.inputTokens !== 0 ||
    diff.outputTokens !== 0
  ) {
    return "mismatched_usage";
  }
  if (diff.absoluteRawProviderCostUsd > costTolerance) {
    return "mismatched_cost";
  }
  return "matched";
};

export const createProviderReconciliationBucket = (
  input: CreateProviderReconciliationBucketInput
): ProviderReconciliationBucket => {
  const diff: ProviderReconciliationBucketDiff = {
    requestCount: input.official.requestCount - input.local.requestCount,
    inputTokens: input.official.inputTokens - input.local.inputTokens,
    outputTokens: input.official.outputTokens - input.local.outputTokens,
    rawProviderCostUsd: roundMoney(
      input.official.rawProviderCostUsd - input.local.rawProviderCostUsd
    ),
    platformCredits: input.local.platformCredits,
    absoluteRawProviderCostUsd: roundMoney(
      Math.abs(input.official.rawProviderCostUsd - input.local.rawProviderCostUsd)
    ),
  };
  const status = classifyBucket({
    official: input.official,
    local: input.local,
    diff,
    costTolerance: input.rawProviderCostToleranceUsd ?? 0.000001,
  });

  return {
    id: input.bucketId,
    provider: input.provider,
    model: input.model,
    endpoint: input.endpoint,
    serviceTier: input.serviceTier,
    officialEvidence: input.officialEvidence
      ? { ...input.officialEvidence }
      : undefined,
    bucketStart: input.bucketStart,
    bucketEnd: input.bucketEnd,
    status,
    official: { ...input.official },
    local: { ...input.local },
    diff,
    needsAnomaly: status !== "matched" && status !== "waiting_provider",
    createdAt: input.createdAt,
  };
};
