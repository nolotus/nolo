import { toErrorMessage } from "core/errorMessage";

import type { OAuthCredential, OAuthRefreshFn, OAuthProvider } from "./oauthTokenStore";
import {
  DEFAULT_REFRESH_SKEW_MS,
  isTokenExpired,
} from "./oauthTokenStore";
import { assertOAuthRefreshAllowed } from "./oauthRefreshRateLimit";

// --- OpenAI Codex (ChatGPT Plus/Pro/Team) refresh ---
import {
  OPENAI_CODEX_ACCESS_TOKEN_CLIENT_SKEW_MS,
  OPENAI_CODEX_AUTHORIZE_URL,
  OPENAI_CODEX_CALLBACK_PATH,
  OPENAI_CODEX_CALLBACK_PORT,
  OPENAI_CODEX_CALLBACK_URL,
  OPENAI_CODEX_CLIENT_ID,
  OPENAI_CODEX_DEVICE_AUTH_URL,
  OPENAI_CODEX_DEVICE_REDIRECT_URI,
  OPENAI_CODEX_DEVICE_TOKEN_URL,
  OPENAI_CODEX_DEVICE_VERIFICATION_URL,
  OPENAI_CODEX_ORIGINATOR,
  OPENAI_CODEX_SCOPES,
  OPENAI_CODEX_TOKEN_REQUEST_TIMEOUT_MS,
  OPENAI_CODEX_TOKEN_URL,
  decodeOpenAiIdToken,
  normalizeOpenAiCodexTokenPayload,
  normalizeOpenAiTokenPayload,
  openAiCodexRefresh,
  refreshOpenAiCodexToken,
  type DecodedIdToken,
  type OpenAiTokenPayload,
  type RefreshOpenAiCodexTokenDeps,
} from "./openaiCodexOAuth";

export {
  OPENAI_CODEX_ACCESS_TOKEN_CLIENT_SKEW_MS,
  OPENAI_CODEX_AUTHORIZE_URL,
  OPENAI_CODEX_CALLBACK_PATH,
  OPENAI_CODEX_CALLBACK_PORT,
  OPENAI_CODEX_CALLBACK_URL,
  OPENAI_CODEX_CLIENT_ID,
  OPENAI_CODEX_DEVICE_AUTH_URL,
  OPENAI_CODEX_DEVICE_REDIRECT_URI,
  OPENAI_CODEX_DEVICE_TOKEN_URL,
  OPENAI_CODEX_DEVICE_VERIFICATION_URL,
  OPENAI_CODEX_ORIGINATOR,
  OPENAI_CODEX_SCOPES,
  OPENAI_CODEX_TOKEN_REQUEST_TIMEOUT_MS,
  OPENAI_CODEX_TOKEN_URL,
  decodeOpenAiIdToken,
  normalizeOpenAiCodexTokenPayload,
  normalizeOpenAiTokenPayload,
  openAiCodexRefresh,
  refreshOpenAiCodexToken,
};
export type { DecodedIdToken, OpenAiTokenPayload, RefreshOpenAiCodexTokenDeps };

// --- xAI Grok (SuperGrok subscription) refresh ---
import {
  XAI_OAUTH_CLIENT_ID,
  XAI_OAUTH_DISCOVERY_URL,
  validateXAIEndpoint,
  xaiOAuthDiscovery,
  refreshXaiToken,
  xaiRefresh,
} from "./xaiOAuth";

export {
  XAI_OAUTH_CLIENT_ID,
  XAI_OAUTH_DISCOVERY_URL,
  validateXAIEndpoint,
  xaiOAuthDiscovery,
  refreshXaiToken,
  xaiRefresh,
};

// --- Antigravity (Cloud Code Assist) refresh ---
import {
  ANTIGRAVITY_ACCESS_TOKEN_CLIENT_SKEW_MS,
  ANTIGRAVITY_AUTH_URL,
  ANTIGRAVITY_CALLBACK_PATH,
  ANTIGRAVITY_CALLBACK_PORT,
  ANTIGRAVITY_CALLBACK_URL,
  ANTIGRAVITY_CLIENT_ID,
  ANTIGRAVITY_CLIENT_SECRET,
  ANTIGRAVITY_CLOUD_CODE_BASE_URL,
  ANTIGRAVITY_SCOPES,
  ANTIGRAVITY_TOKEN_REQUEST_TIMEOUT_MS,
  ANTIGRAVITY_TOKEN_URL,
  ANTIGRAVITY_USERINFO_URL,
  antigravityRefresh,
  getAntigravityUserAgent,
  isAntigravityOAuthAgent,
  normalizeAntigravityTokenPayload,
  readAntigravityProjectId,
  refreshAntigravityToken,
  resolveAntigravityCloudCodeBaseUrl,
  type AntigravityTokenPayload,
  type RefreshAntigravityTokenDeps,
} from "./antigravityOAuth";

export {
  ANTIGRAVITY_ACCESS_TOKEN_CLIENT_SKEW_MS,
  ANTIGRAVITY_AUTH_URL,
  ANTIGRAVITY_CALLBACK_PATH,
  ANTIGRAVITY_CALLBACK_PORT,
  ANTIGRAVITY_CALLBACK_URL,
  ANTIGRAVITY_CLIENT_ID,
  ANTIGRAVITY_CLIENT_SECRET,
  ANTIGRAVITY_CLOUD_CODE_BASE_URL,
  ANTIGRAVITY_SCOPES,
  ANTIGRAVITY_TOKEN_REQUEST_TIMEOUT_MS,
  ANTIGRAVITY_TOKEN_URL,
  ANTIGRAVITY_USERINFO_URL,
  antigravityRefresh,
  getAntigravityUserAgent,
  isAntigravityOAuthAgent,
  normalizeAntigravityTokenPayload,
  readAntigravityProjectId,
  refreshAntigravityToken,
  resolveAntigravityCloudCodeBaseUrl,
};
export type { AntigravityTokenPayload, RefreshAntigravityTokenDeps };

// --- Anthropic Claude Pro/Max refresh ---
import {
  ANTHROPIC_OAUTH_CLIENT_ID,
  ANTHROPIC_OAUTH_TOKEN_URL,
  anthropicRefresh,
} from "./anthropicOAuth";

export {
  ANTHROPIC_OAUTH_CLIENT_ID,
  ANTHROPIC_OAUTH_TOKEN_URL,
  anthropicRefresh,
};

// --- Cursor refresh ---
import {
  CURSOR_ACCESS_TOKEN_CLIENT_SKEW_MS,
  CURSOR_LOGIN_URL,
  CURSOR_POLL_URL,
  CURSOR_REFRESH_URL,
  cursorRefresh,
  decodeJwtExp,
  normalizeCursorTokenPayload,
  refreshCursorToken,
} from "./cursorOAuth";

export {
  CURSOR_ACCESS_TOKEN_CLIENT_SKEW_MS,
  CURSOR_LOGIN_URL,
  CURSOR_POLL_URL,
  CURSOR_REFRESH_URL,
  cursorRefresh,
  decodeJwtExp,
  normalizeCursorTokenPayload,
  refreshCursorToken,
};

export const OAUTH_PROVIDER_REFRESH: Record<
  string,
  OAuthRefreshFn | undefined
> = {
  chatgpt: openAiCodexRefresh,
  xai: xaiRefresh,
  antigravity: antigravityRefresh,
  claude: anthropicRefresh,
  cursor: cursorRefresh,
};

// ── Server-side apiKeyRef resolution ──────────────────────────────────────────

/** Async-compatible credential store (matches server-side store interface). */
export type AsyncOAuthCredentialStore = {
  read(
    userId: string,
    provider: string
  ): Promise<OAuthCredential | null>;
  write(
    userId: string,
    provider: string,
    credential: OAuthCredential
  ): Promise<void>;
  remove(userId: string, provider: string): Promise<void>;
};

/**
 * Resolve an `apiKeyRef` (e.g. "xai") into a fresh access token using the
 * server-side credential store. Handles token refresh if the credential is
 * near expiry.
 *
 * Concurrent refreshes for the same userId+provider are coalesced so parallel
 * agent-run / chat-proxy requests do not stampede the provider token endpoint.
 *
 * Returns `{accessToken, apiKeyHeader?, accountId?, metadata?}` or throws a descriptive error.
 */

/** In-flight refresh promises keyed by `${userId}:${provider}`. */
const inflightOAuthRefreshes = new Map<
  string,
  Promise<{
    accessToken: string;
    apiKeyHeader?: string;
    accountId?: string;
    metadata?: Record<string, unknown>;
  }>
>();

/** Test/ops helper: clear coalesced refresh state. */
export function resetOAuthRefreshInflightForTests(): void {
  inflightOAuthRefreshes.clear();
}

export async function resolveApiKeyRefFromStore(args: {
  userId: string;
  provider: string;
  store: AsyncOAuthCredentialStore;
  skewMs?: number;
  now?: () => number;
  /** Test/DI override; production uses OAUTH_PROVIDER_REFRESH[provider]. */
  refreshFn?: OAuthRefreshFn;
  /**
   * Force a refresh even when the stored token is not yet expired. Used by
   * the 401/403 retry path: the upstream rejected the token (revoked /
   * rotated server-side) while it was still inside the client skew window,
   * so a fresh token must be minted before retrying.
   */
  force?: boolean;
}): Promise<{
  accessToken: string;
  apiKeyHeader?: string;
  accountId?: string;
  metadata?: Record<string, unknown>;
}> {
  const { userId, provider, store, skewMs, now } = args;
  const refreshFn = args.refreshFn ?? OAUTH_PROVIDER_REFRESH[provider];
  const skew = skewMs ?? DEFAULT_REFRESH_SKEW_MS;
  const nowMs = now?.() ?? Date.now();

  const packResolved = (accessToken: string, cred: OAuthCredential) => ({
    accessToken,
    ...(cred.accountId ? { accountId: cred.accountId } : {}),
    ...(cred.metadata ? { metadata: cred.metadata } : {}),
  });

  const oauthProvider = parseOAuthProviderKey(provider);
  const credential = await store.read(userId, oauthProvider);
  if (!credential) {
    throw new Error(
      `OAuth credential for "${provider}" not found. Run \`nolo auth ${provider}\` (auto-syncs when server is configured) or \`nolo auth ${provider} --sync-to-server\`.`
    );
  }

  // Token is still fresh
  if (!args.force && !isTokenExpired(credential, skew, nowMs)) {
    return packResolved(credential.accessToken, credential);
  }

  // Token needs refresh
  if (!credential.refreshToken || !refreshFn) {
    // No refresh capability — return the expired token and let the upstream
    // API decide (it may still work for a short window).
    return packResolved(credential.accessToken, credential);
  }

  const inflightKey = `${userId}:${provider}`;
  const existing = inflightOAuthRefreshes.get(inflightKey);
  if (existing) {
    return existing;
  }

  const refreshPromise = (async () => {
    try {
      // Re-read under the coalesced lock: a peer may have already written a
      // fresher token while we were waiting to start.
      const latest = await store.read(userId, oauthProvider);
      if (
        latest &&
        !isTokenExpired(latest, skew, now?.() ?? Date.now()) &&
        // Non-force: fresh token is always good. Force (401/403 retry):
        // only take the fast path when a peer already rotated the token —
        // otherwise we must mint a new one even though the stored token is
        // still inside its expiry window.
        (!args.force || latest.accessToken !== credential.accessToken)
      ) {
        return packResolved(latest.accessToken, latest);
      }

      assertOAuthRefreshAllowed(inflightKey, provider);

      const refreshed = await refreshFn(latest ?? credential);
      await store.write(userId, oauthProvider, {
        ...refreshed,
        obtainedAt: refreshed.obtainedAt ?? Date.now(),
      });
      return packResolved(refreshed.accessToken, refreshed);
    } catch (err: unknown) {
      const message = toErrorMessage(err);
      console.warn(
        `[oauth] Token refresh failed for ${provider}: ${message}. Using existing token.`
      );
      const fallback = (await store.read(userId, oauthProvider)) ?? credential;
      return packResolved(fallback.accessToken, fallback);
    } finally {
      inflightOAuthRefreshes.delete(inflightKey);
    }
  })();

  inflightOAuthRefreshes.set(inflightKey, refreshPromise);
  return refreshPromise;
}

const OAUTH_PROVIDER_KEYS = new Set<string>([
  "chatgpt",
  "xai",
  "antigravity",
  "claude",
  "cursor",
]);

function parseOAuthProviderKey(provider: string): OAuthProvider {
  if (OAUTH_PROVIDER_KEYS.has(provider)) {
    return provider as OAuthProvider;
  }
  throw new Error(`Unsupported OAuth provider key "${provider}".`);
}
