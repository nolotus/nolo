/**
 * Shared pure host normalizer for request Host headers and stored hostnames.
 *
 * Platform-host allowlists, app custom-domain binds, and realtime preview
 * routing all need the same hostname shape: lowercased, path/port stripped,
 * IPv6 brackets unwrapped. Keep one definition so Host-header parsing and
 * domain-record keys cannot drift across server request handlers.
 *
 * Dependency-free so pure unit tests do not pull server modules.
 */
export function normalizeHost(value?: string | null): string {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "";
  if (raw.startsWith("[") && raw.includes("]")) {
    return raw.slice(1, raw.indexOf("]"));
  }
  return raw.split("/")[0].split(":")[0];
}
