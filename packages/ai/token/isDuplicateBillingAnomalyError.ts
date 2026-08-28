/**
 * Pure "already exists" detectors for idempotent token/billing writers.
 *
 * Writers throw `Error("<kind> already exists: <key>")`. Pipelines that treat
 * duplicate writes as success share one definition so message prefixes cannot
 * drift across sweepers, credential anomalies, and reconciliation.
 *
 * Keep dependency-free so pure unit tests do not pull store or writer modules.
 */

/** Narrow: billing-anomaly writer duplicates only. */
export function isDuplicateBillingAnomalyError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message.startsWith("billing anomaly already exists:")
  );
}

/**
 * Broad: any writer that uses the shared `"already exists: <key>"` suffix
 * (billing anomaly, reconciliation bucket, etc.).
 */
export function isAlreadyExistsRecordError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("already exists:");
}
