import { normalizeHost } from "./normalizeHost";

/**
 * Shared pure platform-host detector for custom-domain binds and Host routing.
 *
 * Request Host handling and app custom-domain allowlists treat the same hosts
 * as platform-owned: static apex/loopback hosts, optional deployment extra
 * host, and any `*.nolo.chat` subdomain. Keep one definition so the closed
 * allowlist and subdomain suffix rule cannot drift across server request
 * handlers.
 *
 * `platformHosts` is the closed allowlist (static + optional env extra). The
 * `*.nolo.chat` suffix check is always applied on top. Callers own env reads
 * via `createPlatformHostSet(process.env.PLATFORM_SERVER_HOST)`.
 *
 * Depends only on `normalizeHost` so pure unit tests do not pull server modules.
 */

/** Static apex + loopback hosts treated as platform-owned everywhere. */
export const STATIC_PLATFORM_HOSTS = [
  "nolo.chat",
  "us.nolo.chat",
  "localhost",
  "127.0.0.1",
  "::1",
] as const;

/** Closed allowlist from static hosts plus one optional deployment host. */
export function createPlatformHostSet(extraHost?: string | null): Set<string> {
  const hosts = new Set<string>(STATIC_PLATFORM_HOSTS);
  const extra = normalizeHost(extraHost);
  if (extra) hosts.add(extra);
  return hosts;
}

/** Default allowlist with no deployment extra (tests / pure callers). */
export const DEFAULT_PLATFORM_HOSTS = createPlatformHostSet();

export function isPlatformHost(
  value?: string | null,
  platformHosts: ReadonlySet<string> = DEFAULT_PLATFORM_HOSTS,
): boolean {
  const normalized = normalizeHost(value);
  if (!normalized) return false;
  if (platformHosts.has(normalized)) return true;
  return normalized.endsWith(".nolo.chat");
}
