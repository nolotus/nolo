/**
 * Shared pure optional query-timestamp parser for admin/report handlers.
 *
 * Provider-call recent lists, billing usage, revenue-share, and creator
 * settlement/earnings reports all coerce `?since` / `?until` the same way:
 * missing/blank → null; all-digit strings → Number (epoch ms); otherwise
 * Date.parse; unparseable non-empty → throw. Keep one definition so epoch-digit
 * vs ISO handling cannot drift across report handlers.
 *
 * Differs from `toTimestampMs` (unknown field coercer with `0` fallback, no
 * throw). Dependency-free so pure unit tests do not pull server/auth modules.
 */
export function parseOptionalTimestampMs(
  value: string | null | undefined,
): number | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) return Number(trimmed);
  const parsed = Date.parse(trimmed);
  if (!Number.isFinite(parsed)) {
    throw new Error(`invalid timestamp: ${value}`);
  }
  return parsed;
}
