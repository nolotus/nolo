/**
 * Shared pure public http(s) URL normalizer and path joiner.
 *
 * Invite-reward, automation, and scenario email templates coerce app base
 * URLs and account/settings deep links the same way: keep only valid http(s)
 * absolute URLs (else ""), then join relative paths with `new URL`. Keep one
 * definition so protocol filtering and join failure handling cannot drift
 * across auth email modules.
 *
 * Dependency-free so pure unit tests do not pull auth/email modules.
 */
export function normalizePublicUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
    return parsed.toString();
  } catch {
    return "";
  }
}

export function joinPublicUrl(baseUrl: string, path: string): string {
  if (!baseUrl) return "";
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return "";
  }
}
