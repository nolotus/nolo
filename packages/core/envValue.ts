/**
 * Shared pure env-string coercers.
 *
 * Email delivery, reengagement automation, and similar config readers coerce
 * process.env values the same way:
 * - booleans: empty/missing → fallback; "0"/"false"/"off"/"no" → false; else true
 * - numbers: non-finite → fallback; otherwise floor and clamp to min
 *
 * Keep one definition so env truthiness / integer floor handling cannot drift
 * across auth email modules.
 *
 * Dependency-free so pure unit tests do not pull server/auth modules.
 */

const ENV_FALSY = new Set(["0", "false", "off", "no"]);

export function parseEnvBoolean(
  value: string | undefined,
  fallback: boolean
): boolean {
  if (value == null || value === "") return fallback;
  return !ENV_FALSY.has(String(value).toLowerCase());
}

export function parseEnvNumber(
  value: string | undefined,
  fallback: number,
  min = 1
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.floor(parsed));
}
