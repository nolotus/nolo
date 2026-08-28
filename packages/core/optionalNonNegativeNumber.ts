/**
 * Shared pure optional non-negative finite-number normalizer.
 *
 * Product billing split cost gates, creator split platform-cost validation,
 * and similar credit-amount readers coerce unknown field values the same way:
 * keep finite numbers greater than or equal to zero, drop everything else as
 * `undefined` (including negatives, NaN / ±Infinity, and non-numbers).
 *
 * Distinct from `asOptionalPositiveFiniteNumber` (strictly > 0) and
 * `asOptionalFiniteNumber` (allows negatives). Keep one definition so zero /
 * non-finite handling cannot drift across auth billing modules.
 *
 * Dependency-free so pure unit tests do not pull auth/server modules.
 */
export function asOptionalNonNegativeFiniteNumber(
  value: unknown,
): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : undefined;
}
