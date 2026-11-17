import { Base64 } from "js-base64";
import { normalizeServerOrigin } from "./serverOrigin";

/** Routing restriction only, never token verification or an authorization grant. */
export function isGoogleAuthoritySession(token: unknown): boolean {
  if (typeof token !== "string") return false;
  try { return JSON.parse(Base64.decode(token.split(".")[0])).authKind === "google-session-v1"; }
  catch { return false; }
}

export function googleSessionServer(token: unknown, configuredServer?: string): string | undefined {
  if (!isGoogleAuthoritySession(token)) return undefined;
  // Web Google login is same-origin. Persisted server preferences and replicas
  // from password accounts must not choose where this bearer is sent.
  const origin = typeof window !== "undefined" ? window.location?.origin : undefined;
  if (typeof origin !== "string" || !/^https?:\/\//.test(origin)) return "";
  return normalizeServerOrigin(origin);
}

export function scopeGoogleSessionServers(token: unknown, configuredServer: string | undefined, servers: string[]): string[] {
  const server = googleSessionServer(token, configuredServer);
  return server === undefined ? servers : server ? [server] : [];
}

/** At the final network boundary, fail closed when there is no browser origin. */
export function googleSessionRequestToken(token: string | undefined, target: string, allowAnonymousPublic = false): string | undefined {
  if (!isGoogleAuthoritySession(token)) return token;
  const authority = googleSessionServer(token);
  let origin: string;
  try { origin = new URL(target).origin; } catch { throw new Error("google_session_origin_blocked"); }
  if (authority && origin === authority) return token;
  if (allowAnonymousPublic) return undefined;
  throw new Error("google_session_origin_blocked");
}
