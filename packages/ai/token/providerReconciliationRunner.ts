import { createBillingAnomaly } from "./billingAnomaly";
import {
  writeBillingAnomaly,
  type BillingAnomalyStore,
} from "./billingAnomalyWriter";
import type { NormalizedOfficialProviderBucket } from "./deepinfraReconciliation";
import {
  aggregateLocalProviderBillingBucket,
  type ProviderReconciliationLocalStore,
} from "./providerReconciliationLocal";
import {
  createProviderReconciliationBucket,
  type ProviderReconciliationBucket,
} from "./providerReconciliation";
import {
  writeProviderReconciliationBucket,
  type ProviderReconciliationBucketStore,
} from "./providerReconciliationWriter";
import { isAlreadyExistsRecordError } from "./isDuplicateBillingAnomalyError";
import { API_REPORTED_COST_MULTIPLIER } from "./calculatePrice";

type ProviderReconciliationStore =
  ProviderReconciliationLocalStore &
    ProviderReconciliationBucketStore &
    BillingAnomalyStore;

export type RunProviderReconciliationResult = {
  bucketsProcessed: number;
  bucketsWritten: number;
  anomaliesWritten: number;
  bucketsProposed: number;
  anomaliesProposed: number;
  riskPlatformCreditsProposed: number;
  alreadyExisted: number;
  dryRun: boolean;
};

const sanitizeIdPart = (value: string) =>
  value.replace(/[^A-Za-z0-9_.-]+/g, "-");

const buildBucketId = (bucket: NormalizedOfficialProviderBucket) =>
  [
    "recon",
    bucket.provider,
    bucket.model ? sanitizeIdPart(bucket.model) : "all-models",
    sanitizeIdPart(bucket.bucketStart),
    sanitizeIdPart(bucket.bucketEnd),
  ].join("_");

const resolveCommercialMultiplier = (provider: string, model: string) => {
  if (provider === "openai") return 8;
  if (provider === "anthropic") return 9;
  if (provider === "deepinfra" && model.startsWith("anthropic/")) return 9;
  // API_REPORTED_COST_MULTIPLIER 共享同一汇率，消除 dual-rate seam。
  return API_REPORTED_COST_MULTIPLIER;
};

const estimateRiskPlatformCredits = (bucket: ProviderReconciliationBucket) => {
  const model = bucket.model ?? "";
  const multiplier = resolveCommercialMultiplier(bucket.provider, model);
  return Number((bucket.diff.absoluteRawProviderCostUsd * multiplier).toFixed(6));
};

export async function runProviderReconciliation({
  store,
  officialBuckets,
  createdAt,
  dryRun = false,
}: {
  store: ProviderReconciliationStore;
  officialBuckets: NormalizedOfficialProviderBucket[];
  createdAt: string;
  dryRun?: boolean;
}): Promise<RunProviderReconciliationResult> {
  const result: RunProviderReconciliationResult = {
    bucketsProcessed: 0,
    bucketsWritten: 0,
    anomaliesWritten: 0,
    bucketsProposed: 0,
    anomaliesProposed: 0,
    riskPlatformCreditsProposed: 0,
    alreadyExisted: 0,
    dryRun,
  };

  type BucketDelta = {
    bucketsProcessed: number;
    bucketsWritten: number;
    anomaliesWritten: number;
    bucketsProposed: number;
    anomaliesProposed: number;
    riskPlatformCreditsProposed: number;
    alreadyExisted: number;
  };

  const deltas = await Promise.all(
    officialBuckets.map(async (officialBucket): Promise<BucketDelta> => {
      const delta: BucketDelta = {
        bucketsProcessed: 1,
        bucketsWritten: 0,
        anomaliesWritten: 0,
        bucketsProposed: 1,
        anomaliesProposed: 0,
        riskPlatformCreditsProposed: 0,
        alreadyExisted: 0,
      };

      const local = await aggregateLocalProviderBillingBucket({
        store,
        provider: officialBucket.provider,
        model: officialBucket.model,
        bucketStart: officialBucket.bucketStart,
        bucketEnd: officialBucket.bucketEnd,
      });
      const bucket = createProviderReconciliationBucket({
        bucketId: buildBucketId(officialBucket),
        provider: officialBucket.provider,
        model: officialBucket.model,
        endpoint: officialBucket.endpoint,
        officialEvidence: officialBucket.evidence,
        bucketStart: officialBucket.bucketStart,
        bucketEnd: officialBucket.bucketEnd,
        official: officialBucket.official,
        local,
        createdAt,
      });

      if (!dryRun) {
        try {
          await writeProviderReconciliationBucket({ store, bucket });
          delta.bucketsWritten = 1;
        } catch (error) {
          if (isAlreadyExistsRecordError(error)) {
            delta.alreadyExisted += 1;
          } else {
            throw error;
          }
        }
      }

      if (!bucket.needsAnomaly) return delta;

      delta.anomaliesProposed = 1;
      delta.riskPlatformCreditsProposed = estimateRiskPlatformCredits(bucket);
      if (dryRun) return delta;

      try {
        await writeBillingAnomaly({
          store,
          anomaly: createBillingAnomaly({
            anomalyId: `anom_${bucket.id}`,
            kind: "provider_reconciliation_diff",
            severity:
              bucket.status === "missing_local" || bucket.status === "mismatched_cost"
                ? "critical"
                : "high",
            stage: "reconciliation",
            userId: "provider-reconciliation",
            provider: bucket.provider,
            model: bucket.model ?? "unknown",
            riskPlatformCredits: estimateRiskPlatformCredits(bucket),
            message: `Provider official bucket differs from local billing evidence: ${bucket.status}`,
            evidence: {
              bucketId: bucket.id,
              bucketStart: bucket.bucketStart,
              bucketEnd: bucket.bucketEnd,
              status: bucket.status,
              official: bucket.official,
              local: bucket.local,
              diff: bucket.diff,
              officialEvidence: officialBucket.evidence,
            },
            createdAt,
          }),
        });
        delta.anomaliesWritten = 1;
      } catch (error) {
        if (isAlreadyExistsRecordError(error)) {
          delta.alreadyExisted += 1;
        } else {
          throw error;
        }
      }

      return delta;
    })
  );

  for (const delta of deltas) {
    result.bucketsProcessed += delta.bucketsProcessed;
    result.bucketsWritten += delta.bucketsWritten;
    result.anomaliesWritten += delta.anomaliesWritten;
    result.bucketsProposed += delta.bucketsProposed;
    result.anomaliesProposed += delta.anomaliesProposed;
    result.alreadyExisted += delta.alreadyExisted;
    result.riskPlatformCreditsProposed = Number(
      (result.riskPlatformCreditsProposed + delta.riskPlatformCreditsProposed).toFixed(6)
    );
  }

  return result;
}
