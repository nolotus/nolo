import { createHash } from "node:crypto";

/**
 * Account-scoped credential protocol — slice 1 (protocol + pure store).
 *
 * Implements the fixed rules from
 * `docs/plans/2026-09-26-oauth-credential-account-scoping.md`:
 * credential ownership is scoped to a Nolo account (canonical serverOrigin +
 * userId), never to the provider or to an agent. Three-state resolution, no
 * silent downgrade.
 *
 * Nothing in this file performs I/O or reads environment variables; the
 * identity resolver is a pure function so slice 2 can wire it to CLI env /
 * profile / desktop session without changing semantics here.
 */

// ---------------------------------------------------------------------------
// Scope types
// ---------------------------------------------------------------------------

export type NoloAccountScope = {
  kind: "nolo-account";
  /** canonicalizeOrigin(serverOrigin), e.g. "https://nolo.chat" or "https://selfhost.example/nolo" */
  canonicalOrigin: string;
  /** opaque account id; trimmed but never case-normalised */
  userId: string;
  scopeKey: string;
};

export type UnboundScope = {
  kind: "local-unbound";
  scopeKey: typeof UNBOUND_SCOPE_KEY;
};

export type AccountScope = NoloAccountScope | UnboundScope;

export type AccountScopeResolution =
  | { status: "account"; scope: NoloAccountScope }
  | { status: "intentionally-unbound"; scope: UnboundScope }
  | { status: "identity-error"; reason: string };

// ---------------------------------------------------------------------------
// Scope key protocol
// ---------------------------------------------------------------------------

const SCOPE_KEY_VERSION_PREFIX = "v1-";
const SCOPE_KEY_DOMAIN = "nolo-oauth-account-scope";
export const UNBOUND_SCOPE_KEY = "v1-unbound";

function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
}

/**
 * `scopeKey = "v1-" + base64url(SHA-256("nolo-oauth-account-scope\0" + canonicalOrigin + "\0" + userId))`
 *
 * The domain separator and embedded NULs are part of the fixed protocol so a
 * scope key can never collide with a hash of a different field shape.
 */
export function computeAccountScopeKey(canonicalOrigin: string, userId: string): string {
  const hash = createHash("sha256")
    .update(`${SCOPE_KEY_DOMAIN}\0${canonicalOrigin}\0${userId}`, "utf8")
    .digest();
  return SCOPE_KEY_VERSION_PREFIX + base64url(hash);
}

export function makeNoloAccountScope(canonicalOrigin: string, userId: string): NoloAccountScope {
  return {
    kind: "nolo-account",
    canonicalOrigin,
    userId,
    scopeKey: computeAccountScopeKey(canonicalOrigin, userId),
  };
}

export function makeUnboundScope(): UnboundScope {
  return { kind: "local-unbound", scopeKey: UNBOUND_SCOPE_KEY };
}

// ---------------------------------------------------------------------------
// canonicalizeOrigin — strict, own implementation (do NOT reuse
// core/noloServerUrl.ts's canonicalizeNoloServerUrl; its semantics are too
// permissive: it returns trimmed input on parse failure and doesn't serialise
// most https URLs).
// ---------------------------------------------------------------------------

export type CanonicalizeOriginResult =
  | { ok: true; canonicalOrigin: string }
  | { ok: false; reason: string };

/**
 * Strict server-origin canonicalisation per the design rule table:
 * - scheme: only `http` / `https` (case-insensitive on input, lowercased on output)
 * - hostname: lowercased, IDNA/punycode via URL parser; IPv6 literals keep brackets
 * - port: explicit default ports (:80 http / :443 https) stripped; non-default kept
 * - path: base path preserved, trailing slashes stripped, "/" normalises to ""
 * - query / fragment / userinfo: rejected
 * - relative / empty / unparseable: rejected — never participate in the hash
 * - localhost / LAN / self-hosted: same rules, no special-casing
 */
export function canonicalizeOrigin(serverOrigin: string): CanonicalizeOriginResult {
  if (typeof serverOrigin !== "string") {
    return { ok: false, reason: "server origin is not a string" };
  }
  const trimmed = serverOrigin.trim();
  if (!trimmed) {
    return { ok: false, reason: "server origin is empty" };
  }
  // Reject query/fragment markers on the *raw* trimmed input. WHATWG URL
  // normalises `https://x/p?` and `https://x/p#` to empty search/hash, so
  // checking url.search/url.hash would let the bare markers slip through —
  // but a bare `?`/`#` is still junk input that must never reach the hash.
  if (trimmed.includes("?")) {
    return { ok: false, reason: "query string is not allowed in a server origin" };
  }
  if (trimmed.includes("#")) {
    return { ok: false, reason: "fragment is not allowed in a server origin" };
  }
  // Reject userinfo early — URL keeps it, but credentials in an origin are an
  // identity violation and also change the semantics of the hash.
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { ok: false, reason: `server origin is not an absolute URL: ${JSON.stringify(trimmed)}` };
  }
  const scheme = url.protocol.replace(/:$/, "").toLowerCase();
  if (scheme !== "http" && scheme !== "https") {
    return { ok: false, reason: `unsupported scheme ${JSON.stringify(url.protocol)} (only http/https)` };
  }
  if (url.username || url.password) {
    return { ok: false, reason: "userinfo is not allowed in a server origin" };
  }
  if (url.search) {
    return { ok: false, reason: "query string is not allowed in a server origin" };
  }
  if (url.hash) {
    return { ok: false, reason: "fragment is not allowed in a server origin" };
  }
  if (!url.hostname) {
    return { ok: false, reason: "URL has no hostname" };
  }

  // URL already lowercases hostname and applies IDNA/punycode. IPv6 literals
  // come back bracketed on Bun and unbracketed on Node — normalise to the
  // bracketed form the design mandates.
  const hostname = url.hostname.includes(":")
    ? url.hostname.startsWith("[")
      ? url.hostname
      : `[${url.hostname}]`
    : url.hostname;

  // Port: URL.port is already "" when the port equals the scheme default, so
  // explicit default ports are normalised away for free; non-default kept.
  const port = url.port ? `:${url.port}` : "";

  // Path: preserve base path (self-hosted /nolo prefix), strip trailing
  // slashes, "/" → "". Keep interior slashes verbatim.
  let path = url.pathname.replace(/\/+$/, "");
  if (path === "/") path = "";

  return { ok: true, canonicalOrigin: `${scheme}://${hostname}${port}${path}` };
}

// ---------------------------------------------------------------------------
// resolveAccountScope — pure three-state identity resolver.
//
// Inputs are deliberately data (no env / fs / network): the caller passes the
// token-parse result, whether the operation requires an account identity, and
// whether the operation allows running offline-unbound. Slice 2 maps CLI env /
// profile state / desktop sessions onto this shape.
// ---------------------------------------------------------------------------

export type ProfileTokenParseResult =
  | { kind: "no-token" }
  | {
      kind: "token";
      /** decoded userId claim; "" means missing/undecodable */
      userId: string;
      /** token's server origin claim, if the token carries one */
      serverOrigin?: string;
      /** seconds-since-epoch expiry; undefined = no exp claim */
      expiresAt?: number;
      /** token failed format/parse validation entirely */
      malformed?: boolean;
    };

export type ResolveAccountScopeInput = {
  /** result of parsing the profile token written by Nolo itself */
  token: ProfileTokenParseResult;
  /** profile's configured server origin (what the token was issued against) */
  configuredServerOrigin?: string;
  /** true for sync / scoped delete / desktop account requests */
  requiresAccount: boolean;
  /** true for `nolo auth <provider>` and local agent runs */
  allowOfflineUnbound: boolean;
  /** clock injection for expiry checks */
  now?: number;
};

function isExpired(expiresAt: number | undefined, now: number): boolean {
  return typeof expiresAt === "number" && expiresAt * 1000 <= now;
}

export function resolveAccountScope(input: ResolveAccountScopeInput): AccountScopeResolution {
  const now = input.now ?? Date.now();

  if (input.token.kind === "no-token") {
    if (input.requiresAccount) {
      return {
        status: "identity-error",
        reason: "operation requires an account identity but no platform token is configured",
      };
    }
    if (input.allowOfflineUnbound) {
      return { status: "intentionally-unbound", scope: makeUnboundScope() };
    }
    return {
      status: "identity-error",
      reason: "no platform token configured and this operation does not allow offline-unbound use",
    };
  }

  const token = input.token;
  if (token.malformed) {
    return { status: "identity-error", reason: "platform token is malformed" };
  }
  if (!token.userId || !token.userId.trim()) {
    return { status: "identity-error", reason: "platform token has no userId claim" };
  }
  if (isExpired(token.expiresAt, now)) {
    return { status: "identity-error", reason: "platform token is expired" };
  }

  const serverOrigin = token.serverOrigin ?? input.configuredServerOrigin;
  if (!serverOrigin) {
    return { status: "identity-error", reason: "no server origin available to scope the token" };
  }
  const canonical = canonicalizeOrigin(serverOrigin);
  if (!canonical.ok) {
    return { status: "identity-error", reason: `server origin is invalid: ${canonical.reason}` };
  }
  // Token-origin vs configured-origin mismatch is an identity error, not a
  // fallback: it means the token was issued for a different server.
  if (token.serverOrigin && input.configuredServerOrigin) {
    const configured = canonicalizeOrigin(input.configuredServerOrigin);
    if (configured.ok && configured.canonicalOrigin !== canonical.canonicalOrigin) {
      return {
        status: "identity-error",
        reason: `token server origin ${canonical.canonicalOrigin} does not match configured ${configured.canonicalOrigin}`,
      };
    }
  }

  return {
    status: "account",
    scope: makeNoloAccountScope(canonical.canonicalOrigin, token.userId.trim()),
  };
}
