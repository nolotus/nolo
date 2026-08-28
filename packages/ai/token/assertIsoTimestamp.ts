/**
 * Shared pure ISO-timestamp field validator for token/billing writers.
 *
 * Billing anomaly lifecycle, admin audit events, provider credential registry
 * and lifecycle records all require named date fields to be Date.parse-able
 * the same way: non-finite → throw `"${name} must be an ISO timestamp"`. Keep
 * one definition so blank/garbage handling and error wording cannot drift.
 *
 * Dependency-free so pure unit tests do not pull store or writer modules.
 */
export function assertIsoTimestamp(name: string, value: string): void {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) {
    throw new Error(`${name} must be an ISO timestamp`);
  }
}
