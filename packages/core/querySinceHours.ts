/**
 * Shared pure optional `?sinceHours` query parser for report handlers.
 *
 * Billing usage, revenue-share, and creator earnings/settlement report handlers
 * all coerce the lookback window the same way: missing/blank → fallback (24);
 * non-finite or non-positive → throw `"invalid sinceHours: ${value}"`. Keep one
 * definition so blank/garbage handling and error wording cannot drift.
 *
 * Differs from `clampInteger` (no throw, clamps into a range) and from
 * `parseOptionalTimestampMs` (epoch/ISO timestamps). Dependency-free so pure
 * unit tests do not pull server/auth modules.
 */
export function parseOptionalSinceHours(
  value: string | null | undefined,
  fallback = 24,
): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`invalid sinceHours: ${value}`);
  }
  return parsed;
}
