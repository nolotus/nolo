// Ported/derived from open-source research: magpie/OpenCode WorkBuddy plugin (commit 6a3fe9b4, MIT License).
// WorkBuddy uses a private Tencent browser polling protocol (not standard OAuth2).

import { toErrorMessage } from "core/errorMessage";

import type { OAuthCredential, OAuthProvider, OAuthRefreshFn } from "./oauthTokenStore";

export type WorkBuddySite = "workbuddy" | "workbuddy-ai";

export type WorkBuddySiteConfig = {
  id: WorkBuddySite;
  name: string;
  endpoint: string;
  authId: string;
  platform: string;
  ai: boolean;
};

export const WORKBUDDY_APP_VERSION = "2.0.0";
export const WORKBUDDY_UA_VERSION = "5.5.6";
export const WORKBUDDY_POLL_INTERVAL_MS = 1000;
export const WORKBUDDY_SIGN_IN_TIMEOUT_MS = 5 * 60 * 1000;
export const WORKBUDDY_EARLY_REFRESH_SKEW_MS = 60 * 1000;
export const WORKBUDDY_KEEP_RENEWED_MS = 60 * 1000;
export const WORKBUDDY_REQUEST_TIMEOUT_MS = 30_000;

export const WORKBUDDY_SITES: Record<WorkBuddySite, WorkBuddySiteConfig> = {
  workbuddy: {
    id: "workbuddy",
    name: "WorkBuddy",
    endpoint: "https://copilot.tencent.com",
    authId: "workbuddy-desktop",
    platform: "workbuddy",
    ai: false,
  },
  "workbuddy-ai": {
    id: "workbuddy-ai",
    name: "WorkBuddy AI",
    endpoint: "https://www.workbuddy.ai",
    authId: "workbuddy-desktop-ai",
    platform: "workbuddy-ai",
    ai: true,
  },
};

export function getWorkBuddySite(site: WorkBuddySite | string): WorkBuddySiteConfig {
  if (site === "workbuddy" || site === "workbuddy-ai") {
    return WORKBUDDY_SITES[site];
  }
  throw new Error(`Unknown WorkBuddy site: "${String(site)}". Expected "workbuddy" or "workbuddy-ai".`);
}

export type WorkBuddyTokenPayload = {
  accessToken?: unknown;
  refreshToken?: unknown;
  expiresIn?: unknown;
  expiresAt?: unknown;
  refreshExpiresIn?: unknown;
  refreshExpiresAt?: unknown;
  domain?: unknown;
  tokenType?: unknown;
  uid?: unknown;
  nickname?: unknown;
  phoneNumber?: unknown;
  enterpriseId?: unknown;
  [key: string]: unknown;
};

export type RefreshWorkBuddyTokenDeps = {
  fetchImpl?: import("../cli/cliFetch").CliFetchImpl;
  now?: () => number;
};

/**
 * Sanitizes error messages by redacting tokens and secrets.
 */
export function sanitizeWorkBuddyError(message: string): string {
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [REDACTED]")
    .replace(/([?&]|\b)(state|token|accessToken|refreshToken)=[^&\s]+/gi, "$1$2=[REDACTED]")
    .replace(/(["']?(?:accessToken|refreshToken|state|token)["']?\s*:\s*["'])[^"']+["']/gi, '$1[REDACTED]"');
}

/**
 * Validates and sanitizes domain so arbitrary user URLs with protocols, paths,
 * or control characters are not accepted or forwarded upstream.
 */
export function sanitizeWorkBuddyDomain(rawDomain: unknown, defaultHost: string): string {
  if (typeof rawDomain !== "string" || !rawDomain.trim()) {
    return defaultHost;
  }
  let domain = rawDomain.trim();
  // Strip protocol if present
  if (domain.startsWith("https://") || domain.startsWith("http://")) {
    try {
      domain = new URL(domain).host;
    } catch {
      return defaultHost;
    }
  }
  // Strip path or search query if accidentally included
  const slashIdx = domain.indexOf("/");
  if (slashIdx !== -1) domain = domain.slice(0, slashIdx);
  const qIdx = domain.indexOf("?");
  if (qIdx !== -1) domain = domain.slice(0, qIdx);

  // Validate hostname pattern (alphanumeric, dot, hyphen, optional port)
  if (!/^[a-zA-Z0-9.-]+(?::[0-9]+)?$/.test(domain)) {
    return defaultHost;
  }
  return domain;
}

export type NormalizeWorkBuddyTokenArgs = {
  site: WorkBuddySite;
  payload: WorkBuddyTokenPayload;
  baseCredential?: OAuthCredential;
  now?: number;
};

/**
 * Normalizes WorkBuddy token response into standard OAuthCredential.
 * Supports positional args: (site, payload, baseCredential?, now?)
 * or object args: ({ site, payload, baseCredential?, now? }).
 */
export function normalizeWorkBuddyTokenPayload(
  siteOrArgs: WorkBuddySite | NormalizeWorkBuddyTokenArgs,
  payloadArg?: WorkBuddyTokenPayload,
  baseCredentialArg?: OAuthCredential,
  nowArg?: number
): OAuthCredential {
  let site: WorkBuddySite;
  let payload: WorkBuddyTokenPayload;
  let baseCredential: OAuthCredential | undefined;
  let now: number;

  if (typeof siteOrArgs === "object" && siteOrArgs !== null && "site" in siteOrArgs) {
    site = siteOrArgs.site;
    payload = siteOrArgs.payload ?? {};
    baseCredential = siteOrArgs.baseCredential;
    now = siteOrArgs.now ?? Date.now();
  } else {
    site = siteOrArgs as WorkBuddySite;
    payload = payloadArg ?? {};
    baseCredential = baseCredentialArg;
    now = nowArg ?? Date.now();
  }

  const siteConfig = getWorkBuddySite(site);

  if (typeof payload.accessToken !== "string" || !payload.accessToken.trim()) {
    throw new Error("WorkBuddy token response missing accessToken");
  }

  const accessToken = payload.accessToken.trim();

  // Expiration calculation
  let expiresAt: number;
  const rawExpiresAt = Number(payload.expiresAt);
  const rawExpiresIn = Number(payload.expiresIn);
  if (Number.isFinite(rawExpiresAt) && rawExpiresAt > 0) {
    expiresAt = rawExpiresAt;
  } else if (Number.isFinite(rawExpiresIn) && rawExpiresIn > 0) {
    expiresAt = now + rawExpiresIn * 1000;
  } else if (typeof baseCredential?.expiresAt === "number") {
    expiresAt = baseCredential.expiresAt;
  } else {
    // Default 1 hour fallback
    expiresAt = now + 3600 * 1000;
  }

  // Refresh token expiration
  let refreshExpiresAt: number | undefined;
  const rawRefExpAt = Number(payload.refreshExpiresAt);
  const rawRefExpIn = Number(payload.refreshExpiresIn);
  if (Number.isFinite(rawRefExpAt) && rawRefExpAt > 0) {
    refreshExpiresAt = rawRefExpAt;
  } else if (Number.isFinite(rawRefExpIn) && rawRefExpIn > 0) {
    refreshExpiresAt = now + rawRefExpIn * 1000;
  } else if (typeof baseCredential?.metadata?.refreshExpiresAt === "number") {
    refreshExpiresAt = baseCredential.metadata.refreshExpiresAt;
  }

  // Refresh token
  const refreshToken =
    typeof payload.refreshToken === "string" && payload.refreshToken.trim()
      ? payload.refreshToken.trim()
      : baseCredential?.refreshToken;

  // Uid & Identity
  const uid =
    typeof payload.uid === "string" && payload.uid.trim()
      ? payload.uid.trim()
      : typeof baseCredential?.metadata?.uid === "string" && baseCredential.metadata.uid.trim()
        ? baseCredential.metadata.uid.trim()
        : baseCredential?.accountId ?? "";

  const defaultHost = new URL(siteConfig.endpoint).host;
  const domain = sanitizeWorkBuddyDomain(
    payload.domain ?? baseCredential?.metadata?.domain,
    defaultHost
  );

  const rawEnterpriseId =
    typeof payload.enterpriseId === "string"
      ? payload.enterpriseId
      : typeof baseCredential?.metadata?.enterpriseId === "string"
        ? baseCredential.metadata.enterpriseId
        : "";
  const enterpriseId = rawEnterpriseId.trim();

  const nickname =
    typeof payload.nickname === "string" && payload.nickname.trim()
      ? payload.nickname.trim()
      : typeof payload.phoneNumber === "string" && payload.phoneNumber.trim()
        ? payload.phoneNumber.trim()
        : typeof baseCredential?.metadata?.nickname === "string"
          ? baseCredential.metadata.nickname
          : undefined;

  return {
    ...(baseCredential ?? {}),
    provider: site,
    accessToken,
    ...(refreshToken ? { refreshToken } : {}),
    expiresAt,
    obtainedAt: now,
    accountId: uid || nickname || siteConfig.name,
    metadata: {
      site,
      uid,
      domain,
      ...(enterpriseId ? { enterpriseId } : {}),
      ...(refreshExpiresAt ? { refreshExpiresAt } : {}),
      ...(nickname ? { nickname } : {}),
    },
  };
}

// Single-flight deduplication & short-lived refresh cache
const renewing = new Map<string, Promise<OAuthCredential>>();
const renewed = new Map<string, { credential: OAuthCredential; at: number }>();

export function getWorkBuddyRefreshKey(site: WorkBuddySite, credential: OAuthCredential): string {
  const accountOrUid = credential.accountId || (credential.metadata?.uid as string) || "";
  const token = credential.refreshToken || "";
  return `${site}\n${accountOrUid}\n${token}`;
}

export function _clearWorkBuddyRefreshState(): void {
  renewing.clear();
  renewed.clear();
}

/**
 * Refreshes WorkBuddy token with concurrency single-flight deduplication and 60s reuse cache.
 */
export async function refreshWorkBuddyToken(
  credential: OAuthCredential,
  deps: RefreshWorkBuddyTokenDeps = {}
): Promise<OAuthCredential> {
  if (!credential.refreshToken) {
    throw new Error("WorkBuddy credential has no refresh_token");
  }

  const now = deps.now?.() ?? Date.now();

  // Check if refresh token has expired
  const refreshExpiresAt = credential.metadata?.refreshExpiresAt;
  if (typeof refreshExpiresAt === "number" && now >= refreshExpiresAt) {
    throw new Error("this WorkBuddy account is signed out; sign in again");
  }

  const site: WorkBuddySite =
    credential.metadata?.site === "workbuddy-ai" || credential.provider === ("workbuddy-ai" as unknown)
      ? "workbuddy-ai"
      : "workbuddy";
  const siteConfig = getWorkBuddySite(site);

  const key = getWorkBuddyRefreshKey(site, credential);

  // Return cached result if within KEEP_RENEWED_MS
  const cached = renewed.get(key);
  if (cached && now - cached.at < WORKBUDDY_KEEP_RENEWED_MS) {
    return cached.credential;
  }

  // Join in-flight request if already running
  const inflight = renewing.get(key);
  if (inflight) {
    return inflight;
  }

  const fetchImpl = deps.fetchImpl ?? fetch;

  const refreshPromise = (async () => {
    const defaultHost = new URL(siteConfig.endpoint).host;
    const domain = sanitizeWorkBuddyDomain(credential.metadata?.domain, defaultHost);
    const enterpriseId =
      typeof credential.metadata?.enterpriseId === "string"
        ? credential.metadata.enterpriseId.trim()
        : "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": `WorkBuddy/${WORKBUDDY_UA_VERSION}`,
      "X-Refresh-Token": credential.refreshToken!,
      "X-Auth-Refresh-Source": "plugin",
      "X-Domain": domain,
      ...(enterpriseId ? { "X-Enterprise-Id": enterpriseId, "X-Tenant-Id": enterpriseId } : {}),
    };

    let response: Response;
    try {
      response = await fetchImpl(`${siteConfig.endpoint}/v2/plugin/auth/token/refresh`, {
        method: "POST",
        headers,
        body: "{}",
        signal: AbortSignal.timeout(WORKBUDDY_REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new Error(sanitizeWorkBuddyError(`WorkBuddy token refresh failed: ${toErrorMessage(error)}`));
    }

    let text = "";
    try {
      text = await response.text();
    } catch {
      // ignore text read failure
    }

    let env: { code?: unknown; msg?: unknown; message?: unknown; data?: unknown } = {};
    try {
      env = JSON.parse(text);
    } catch {
      // not valid JSON
    }

    const code = typeof env.code === "number" ? env.code : Number.parseInt(String(env.code ?? ""), 10) || 0;

    if (!response.ok) {
      const why = String(env.msg || env.message || text.slice(0, 200) || response.statusText);
      throw new Error(
        sanitizeWorkBuddyError(
          `${siteConfig.name} token refresh failed: ${why} (HTTP ${response.status}${code ? `, code ${code}` : ""})`
        )
      );
    }

    if (code !== 0) {
      const why = String(env.msg || env.message || "error");
      throw new Error(
        sanitizeWorkBuddyError(`${siteConfig.name} token refresh failed: ${why} (${code})`)
      );
    }

    const data = (env.data && typeof env.data === "object" ? env.data : env) as WorkBuddyTokenPayload;
    if (typeof data.accessToken !== "string" || !data.accessToken.trim()) {
      throw new Error("WorkBuddy gave no refreshed token");
    }

    const nextCredential = normalizeWorkBuddyTokenPayload(site, data, credential, now);
    renewed.set(key, { credential: nextCredential, at: now });
    return nextCredential;
  })().finally(() => {
    renewing.delete(key);
  });

  renewing.set(key, refreshPromise);
  return refreshPromise;
}

export const workbuddyRefresh: OAuthRefreshFn = refreshWorkBuddyToken;

/**
 * Returns controlled WorkBuddy HTTP headers for downstream chat completions requests.
 * Ensures strictly sanitized user ID, domain, and enterprise information without
 * accepting arbitrary upstream user URLs.
 */
export function getWorkBuddyHeaders(credential: OAuthCredential): Record<string, string> {
  const site: WorkBuddySite =
    credential.metadata?.site === "workbuddy-ai" || credential.provider === ("workbuddy-ai" as unknown)
      ? "workbuddy-ai"
      : "workbuddy";
  const siteConfig = getWorkBuddySite(site);

  const defaultHost = new URL(siteConfig.endpoint).host;
  const domain = sanitizeWorkBuddyDomain(credential.metadata?.domain, defaultHost);
  const uid =
    typeof credential.metadata?.uid === "string"
      ? credential.metadata.uid.trim()
      : credential.accountId ?? "";

  const rawEnterpriseId =
    typeof credential.metadata?.enterpriseId === "string"
      ? credential.metadata.enterpriseId.trim()
      : "";

  const headers: Record<string, string> = {
    Authorization: `Bearer ${credential.accessToken}`,
    "X-User-Id": uid,
    "X-Domain": domain,
    "X-Product": "SaaS",
    "X-IDE-Type": "WorkBuddy",
    "User-Agent": `WorkBuddy/${WORKBUDDY_UA_VERSION}`,
    "X-Requested-With": "XMLHttpRequest",
    "X-Agent-Intent": "craft",
    "X-Agent-Purpose": "conversation",
    "X-IDE-Name": "WorkBuddy",
    "X-IDE-Version": WORKBUDDY_UA_VERSION,
  };

  if (rawEnterpriseId) {
    // Sanitize enterpriseId against header injection
    const cleanEnterpriseId = rawEnterpriseId.replace(/[\r\n]/g, "");
    headers["X-Enterprise-Id"] = cleanEnterpriseId;
    headers["X-Tenant-Id"] = cleanEnterpriseId;
  }

  if (siteConfig.ai) {
    headers["X-Agent-Type"] = "main";
  }

  return headers;
}
