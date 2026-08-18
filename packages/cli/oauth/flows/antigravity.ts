// Ported from oh-my-pi/packages/ai/src/registry/oauth/google-antigravity.ts.
//
// Antigravity is Google's Cloud Code Assist surface that fronts Gemini 3, Claude,
// and GPT-OSS models. In accordance with RFC 8252 (OAuth 2.0 for Native Apps),
// installed desktop / CLI applications cannot protect client secrets; the client ID
// and client secret below belong to Google's public Antigravity client distribution
// (extracted from the Antigravity internal CLI; MIT-licensed in oh-my-pi).
// They are public client credentials intended for native application OAuth loopback
// and refresh flows, NOT private server-side secrets.
//
// Loopback PKCE on 127.0.0.1:51121/oauth-callback. After token exchange the flow
// calls Cloud Code Assist's `loadCodeAssist` / `onboardUser` endpoints to
// discover (or provision) a `cloudaicompanionProject` id, which the runtime
// uses as the project header on subsequent calls.

import { toErrorMessage } from "core/errorMessage";
import {
  ANTIGRAVITY_ACCESS_TOKEN_CLIENT_SKEW_MS,
  ANTIGRAVITY_AUTH_URL,
  ANTIGRAVITY_CALLBACK_PATH,
  ANTIGRAVITY_CALLBACK_PORT,
  ANTIGRAVITY_CLIENT_ID,
  ANTIGRAVITY_CLIENT_SECRET,
  ANTIGRAVITY_CLOUD_CODE_BASE_URL,
  ANTIGRAVITY_SCOPES,
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
} from "../../../agent-runtime/antigravityOAuth";
import { startCallbackServer, type CallbackServerHandle } from "../callback-server";
import { createOAuthTokenStore } from "../token-store";
import type {
  OAuthCredential,
  OAuthFlowDeps,
  OAuthTokenResponse,
} from "../types";
import type { CliFetchImpl } from "../../cliFetch";

export {
  ANTIGRAVITY_ACCESS_TOKEN_CLIENT_SKEW_MS,
  ANTIGRAVITY_AUTH_URL,
  ANTIGRAVITY_CALLBACK_PATH,
  ANTIGRAVITY_CALLBACK_PORT,
  ANTIGRAVITY_CLIENT_ID,
  ANTIGRAVITY_CLIENT_SECRET,
  ANTIGRAVITY_CLOUD_CODE_BASE_URL,
  ANTIGRAVITY_SCOPES,
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

// Compatibility aliases for existing CLI consumers.
export const CLIENT_ID = ANTIGRAVITY_CLIENT_ID;
export const CLIENT_SECRET = ANTIGRAVITY_CLIENT_SECRET;
export const CALLBACK_PORT = ANTIGRAVITY_CALLBACK_PORT;
export const CALLBACK_PATH = ANTIGRAVITY_CALLBACK_PATH;
export const SCOPES = ANTIGRAVITY_SCOPES;
export const AUTH_URL = ANTIGRAVITY_AUTH_URL;
export const TOKEN_URL = ANTIGRAVITY_TOKEN_URL;
export const USERINFO_URL = ANTIGRAVITY_USERINFO_URL;
export const CLOUD_CODE_ENDPOINT = ANTIGRAVITY_CLOUD_CODE_BASE_URL;
export const ACCESS_TOKEN_CLIENT_SKEW_MS = ANTIGRAVITY_ACCESS_TOKEN_CLIENT_SKEW_MS;

const TIER_LEGACY = "legacy-tier";
const PROJECT_ONBOARD_MAX_ATTEMPTS = 5;
const PROJECT_ONBOARD_INTERVAL_MS = 2_000;

export type AntigravityAvailableModel = {
  displayName?: string;
  supportsThinking?: boolean;
  maxTokens?: number;
  maxOutputTokens?: number;
  model?: string;
  apiProvider?: string;
  modelProvider?: string;
};

export async function fetchAntigravityAvailableModels(
  fetchImpl: CliFetchImpl,
  accessToken: string,
): Promise<Record<string, AntigravityAvailableModel>> {
  const response = await fetchImpl(`${ANTIGRAVITY_CLOUD_CODE_BASE_URL}/v1internal:fetchAvailableModels`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": getAntigravityUserAgent(),
    },
    body: "{}",
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`fetchAvailableModels failed: ${response.status} ${response.statusText}: ${body}`);
  }
  const payload = (await response.json()) as { models?: unknown };
  return payload.models && typeof payload.models === "object" && !Array.isArray(payload.models)
    ? payload.models as Record<string, AntigravityAvailableModel>
    : {};
}

interface LoadCodeAssistPayload {
  cloudaicompanionProject?: string | { id?: string };
  currentTier?: { id?: string };
  allowedTiers?: Array<{ id?: string; isDefault?: boolean }>;
}

interface LongRunningOperationResponse {
  done?: boolean;
  response?: {
    cloudaicompanionProject?: string | { id?: string };
  };
}

export const ANTIGRAVITY_LOAD_CODE_ASSIST_METADATA = Object.freeze({
  ideType: "ANTIGRAVITY",
  platform: "PLATFORM_UNSPECIFIED",
  pluginType: "GEMINI",
});

function readProjectId(
  value: string | { id?: string } | undefined
): string | undefined {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  if (
    value &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    value.id.length > 0
  ) {
    return value.id;
  }
  return undefined;
}

function getDefaultTierId(
  allowedTiers?: Array<{ id?: string; isDefault?: boolean }>
): string {
  if (!allowedTiers || allowedTiers.length === 0) {
    return TIER_LEGACY;
  }
  const defaultTier = allowedTiers.find(
    tier => tier.isDefault && typeof tier.id === "string" && tier.id.length > 0
  );
  if (defaultTier?.id) {
    return defaultTier.id;
  }
  return TIER_LEGACY;
}

async function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

async function onboardProjectWithRetries(
  fetchImpl: CliFetchImpl,
  endpoint: string,
  headers: Record<string, string>,
  onboardBody: {
    tierId: string;
    metadata: typeof ANTIGRAVITY_LOAD_CODE_ASSIST_METADATA;
  },
  onProgress?: (message: string) => void
): Promise<string> {
  for (let attempt = 1; attempt <= PROJECT_ONBOARD_MAX_ATTEMPTS; attempt += 1) {
    if (attempt > 1) {
      onProgress?.(
        `Waiting for project provisioning (attempt ${attempt}/${PROJECT_ONBOARD_MAX_ATTEMPTS})...`
      );
      await sleep(PROJECT_ONBOARD_INTERVAL_MS);
    }

    const onboardResponse = await fetchImpl(
      `${endpoint}/v1internal:onboardUser`,
      {
        method: "POST",
        headers,
        body: JSON.stringify(onboardBody),
      }
    );

    if (!onboardResponse.ok) {
      const errorText = await onboardResponse.text();
      throw new Error(
        `onboardUser failed: ${onboardResponse.status} ${onboardResponse.statusText}: ${errorText}`
      );
    }

    const operation = (await onboardResponse.json()) as LongRunningOperationResponse;
    if (!operation.done) {
      continue;
    }

    const projectId = readProjectId(operation.response?.cloudaicompanionProject);
    if (projectId) {
      return projectId;
    }
  }

  throw new Error(
    `onboardUser did not return a provisioned project id after ${PROJECT_ONBOARD_MAX_ATTEMPTS} attempts`
  );
}

export async function discoverProject(
  fetchImpl: CliFetchImpl,
  accessToken: string,
  onProgress?: (message: string) => void
): Promise<string> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    // Google's Cloud Code Assist API validates the Antigravity client
    // User-Agent; requests without it are rejected even with a valid token.
    // (Matches oh-my-pi's google-antigravity.ts discoverProject.)
    "User-Agent": getAntigravityUserAgent(),
  };

  onProgress?.("Checking for existing project...");
  const endpoint = ANTIGRAVITY_CLOUD_CODE_BASE_URL;
  const loadResponse = await fetchImpl(`${endpoint}/v1internal:loadCodeAssist`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      metadata: ANTIGRAVITY_LOAD_CODE_ASSIST_METADATA,
    }),
  });

  if (!loadResponse.ok) {
    const errorText = await loadResponse.text();
    throw new Error(
      `loadCodeAssist failed: ${loadResponse.status} ${loadResponse.statusText}: ${errorText}`
    );
  }

  const loadPayload = (await loadResponse.json()) as LoadCodeAssistPayload;
  const existingProject = readProjectId(loadPayload.cloudaicompanionProject);
  if (existingProject) {
    return existingProject;
  }

  const tierId = getDefaultTierId(loadPayload.allowedTiers);
  onProgress?.("Provisioning project...");
  const onboardBody = {
    tierId,
    metadata: ANTIGRAVITY_LOAD_CODE_ASSIST_METADATA,
  };
  return onboardProjectWithRetries(
    fetchImpl,
    endpoint,
    headers,
    onboardBody,
    onProgress
  );
}

async function getUserEmail(
  fetchImpl: CliFetchImpl,
  accessToken: string
): Promise<string | undefined> {
  try {
    const response = await fetchImpl(ANTIGRAVITY_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) return undefined;
    const data = (await response.json()) as { email?: unknown };
    return typeof data.email === "string" ? data.email : undefined;
  } catch {
    return undefined;
  }
}

function generateState(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
}

export async function runAntigravityOAuthLogin(
  deps: OAuthFlowDeps = {}
): Promise<OAuthCredential> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const output = deps.output ?? console;
  const error = deps.error ?? console;

  const redirectUri = `http://127.0.0.1:${ANTIGRAVITY_CALLBACK_PORT}${ANTIGRAVITY_CALLBACK_PATH}`;

  let handle: CallbackServerHandle;
  try {
    handle = await startCallbackServer({
      port: ANTIGRAVITY_CALLBACK_PORT,
      hostname: "127.0.0.1",
      timeoutMs: 5 * 60_000,
    });
  } catch (err) {
    throw new Error(
      `Failed to start Antigravity OAuth callback server on ${ANTIGRAVITY_CALLBACK_PORT}: ${toErrorMessage(err)}`
    );
  }

  try {
    const state = generateState();

    const authParams = new URLSearchParams({
      client_id: ANTIGRAVITY_CLIENT_ID,
      response_type: "code",
      redirect_uri: redirectUri,
      scope: ANTIGRAVITY_SCOPES.join(" "),
      state,
      access_type: "offline",
      prompt: "consent",
    });
    const authUrl = `${ANTIGRAVITY_AUTH_URL}?${authParams.toString()}`;

    output.log(
      `Open the following URL in your browser to log in to Antigravity:\n  ${authUrl}`
    );

    if (deps.openBrowser) {
      try {
        await deps.openBrowser(authUrl);
      } catch (err) {
        error.error(
          `Failed to open browser automatically: ${toErrorMessage(err)}`
        );
      }
    }

    const callback = await handle.waitForCode();

    const tokenResponse = await fetchImpl(ANTIGRAVITY_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: ANTIGRAVITY_CLIENT_ID,
        client_secret: ANTIGRAVITY_CLIENT_SECRET,
        code: callback.code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const body = await tokenResponse.text();
      throw new Error(`Antigravity token exchange failed: ${body}`);
    }

    const tokenData = (await tokenResponse.json()) as AntigravityTokenPayload;

    if (typeof tokenData.refresh_token !== "string" || !tokenData.refresh_token.trim()) {
      throw new Error("No refresh token received. Please try again.");
    }

    if (typeof tokenData.access_token !== "string" || !tokenData.access_token.trim()) {
      throw new Error("No access token received. Please try again.");
    }

    const email = await getUserEmail(fetchImpl, tokenData.access_token.trim());
    const projectId = await discoverProject(
      fetchImpl,
      tokenData.access_token.trim(),
      message => output.log(message)
    );

    const now = (deps.now ?? Date.now)();
    return normalizeAntigravityTokenPayload({
      payload: tokenData,
      baseCredential: {
        provider: "antigravity",
        accountId: email,
        metadata: {
          projectId,
          email,
        },
      },
      now,
    });
  } finally {
    await handle.close();
  }
}

export async function refreshAntigravityOAuthToken(
  credential: OAuthCredential,
  deps: RefreshAntigravityTokenDeps = {}
): Promise<OAuthCredential> {
  return refreshAntigravityToken(credential, deps);
}

export function resolveAntigravityCredential(): OAuthCredential | null {
  return createOAuthTokenStore().read("antigravity");
}
