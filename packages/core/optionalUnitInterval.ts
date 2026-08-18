/**
 * Shared pure optional unit-interval (0..1 inclusive) finite-number normalizer.
 *
 * Product billing creator-share ratio gates, creator split config validation,
 * and similar ratio readers coerce unknown field values the same way: keep
 * finite numbers in [0, 1], drop everything else as `undefined` (including
 * values outside the interval, NaN / ±Infinity, and non-numbers).
 *
 * Distinct from `asOptionalNonNegativeFiniteNumber` (no upper bound) and
 * `asOptionalPositiveFiniteNumber` (strictly > 0, no upper bound). Keep one
 * definition so open/closed endpoint handling cannot drift across auth
 * billing modules.
 *
 * Dependency-free so pure unit tests do not pull auth/server modules.
 */
export function asOptionalUnitInterval(
  value: unknown,
): number | undefined {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
    ? value
    : undefined;
}
