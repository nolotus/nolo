// Ported/derived from open-source research: magpie/OpenCode WorkBuddy plugin (commit 6a3fe9b4, MIT License).
// WorkBuddy uses a private Tencent browser polling protocol (not standard OAuth2).

import { randomBytes } from "node:crypto";
import { toErrorMessage } from "core/errorMessage";

import {
  getWorkBuddyHeaders,
  getWorkBuddyRefreshKey,
  getWorkBuddySite,
  normalizeWorkBuddyTokenPayload,
  refreshWorkBuddyToken,
  sanitizeWorkBuddyDomain,
  sanitizeWorkBuddyError,
  WORKBUDDY_APP_VERSION,
  WORKBUDDY_EARLY_REFRESH_SKEW_MS,
  WORKBUDDY_KEEP_RENEWED_MS,
  WORKBUDDY_POLL_INTERVAL_MS,
  WORKBUDDY_REQUEST_TIMEOUT_MS,
  WORKBUDDY_SIGN_IN_TIMEOUT_MS,
  WORKBUDDY_SITES,
  WORKBUDDY_UA_VERSION,
  workbuddyRefresh,
  type NormalizeWorkBuddyTokenArgs,
  type RefreshWorkBuddyTokenDeps,
  type WorkBuddySite,
  type WorkBuddySiteConfig,
  type WorkBuddyTokenPayload,
} from "../../../agent-runtime/workbuddyOAuth";
import type { CliFetchImpl } from "../../cliFetch";
import type { OAuthCredential, OAuthFlowDeps } from "../types";

export {
  getWorkBuddyHeaders,
  getWorkBuddyRefreshKey,
  getWorkBuddySite,
  normalizeWorkBuddyTokenPayload,
  refreshWorkBuddyToken,
  sanitizeWorkBuddyDomain,
  sanitizeWorkBuddyError,
  WORKBUDDY_APP_VERSION,
  WORKBUDDY_EARLY_REFRESH_SKEW_MS,
  WORKBUDDY_KEEP_RENEWED_MS,
  WORKBUDDY_POLL_INTERVAL_MS,
  WORKBUDDY_REQUEST_TIMEOUT_MS,
  WORKBUDDY_SIGN_IN_TIMEOUT_MS,
  WORKBUDDY_SITES,
  WORKBUDDY_UA_VERSION,
  workbuddyRefresh,
};
export type {
  NormalizeWorkBuddyTokenArgs,
  RefreshWorkBuddyTokenDeps,
  WorkBuddySite,
  WorkBuddySiteConfig,
  WorkBuddyTokenPayload,
};

/**
 * Validates that the authorization URL returned by Tencent API matches expected domain bounds.
 */
export function validateWorkBuddyAuthUrl(site: WorkBuddySite, authUrlString: string): URL {
  let url: URL;
  try {
    url = new URL(authUrlString);
  } catch {
    throw new Error(`Invalid WorkBuddy auth URL: "${authUrlString}"`);
  }

  if (url.protocol !== "https:") {
    throw new Error(`WorkBuddy sign-in page must use https:, got ${url.protocol}`);
  }

  const hostname = url.hostname.toLowerCase();
  if (site === "workbuddy") {
    const isAllowed = hostname === "copilot.tencent.com" || hostname.endsWith(".tencent.com");
    if (!isAllowed) {
      throw new Error(`Untrusted authorization host for WorkBuddy: ${hostname}`);
    }
  } else if (site === "workbuddy-ai") {
    const isAllowed =
      hostname === "www.workbuddy.ai" ||
      hostname === "workbuddy.ai" ||
      hostname.endsWith(".workbuddy.ai");
    if (!isAllowed) {
      throw new Error(`Untrusted authorization host for WorkBuddy AI: ${hostname}`);
    }
  }

  return url;
}

type CallResponse<T = unknown> = {
  code?: number;
  msg?: string;
  message?: string;
  data?: T;
};

async function callWorkBuddyApi<T = unknown>(
  siteConfig: WorkBuddySiteConfig,
  method: string,
  path: string,
  headers: Record<string, string>,
  body: unknown,
  fetchImpl: CliFetchImpl | typeof fetch
): Promise<T> {
  let response: Response;
  try {
    response = await fetchImpl(`${siteConfig.endpoint}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": `WorkBuddy/${WORKBUDDY_UA_VERSION}`,
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(WORKBUDDY_REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new Error(
      sanitizeWorkBuddyError(`${siteConfig.name} API request failed: ${toErrorMessage(error)}`)
    );
  }

  let text = "";
  try {
    text = await response.text();
  } catch {
    // ignore
  }

  let env: CallResponse<T> = {};
  try {
    env = JSON.parse(text);
  } catch {
    // ignore non-json
  }

  const code = typeof env.code === "number" ? env.code : Number.parseInt(String(env.code ?? ""), 10) || 0;

  if (!response.ok) {
    const why = String(env.msg || env.message || text.slice(0, 200) || response.statusText);
    const err = new Error(
      sanitizeWorkBuddyError(
        `${siteConfig.name}: ${why} (HTTP ${response.status}${code ? `, code ${code}` : ""})`
      )
    ) as Error & { code?: number; status?: number };
    err.code = code;
    err.status = response.status;
    throw err;
  }

  if (code !== 0) {
    const why = String(env.msg || env.message || "error");
    const err = new Error(
      sanitizeWorkBuddyError(`${siteConfig.name}: ${why} (${code})`)
    ) as Error & { code?: number; status?: number };
    err.code = code;
    err.status = response.status;
    throw err;
  }

  return env.data as T;
}

async function pollWorkBuddyEndpoint<T>(
  siteConfig: WorkBuddySiteConfig,
  path: string,
  headers: Record<string, string>,
  retryCodes: number[],
  deadline: number,
  fetchImpl: CliFetchImpl | typeof fetch,
  sleepFn: (ms: number) => Promise<void>,
  nowFn: () => number
): Promise<T> {
  while (true) {
    if (nowFn() > deadline) {
      throw new Error(`${siteConfig.name} sign-in timed out. Please try again.`);
    }

    try {
      const data = await callWorkBuddyApi<T>(siteConfig, "GET", path, headers, undefined, fetchImpl);
      if (data && typeof data === "object" && Object.keys(data).length > 0) {
        return data;
      }
    } catch (rawError: unknown) {
      const err = rawError as { code?: number; status?: number; message?: string };
      const isRetryable =
        (typeof err.code === "number" && retryCodes.includes(err.code)) ||
        err.status === 408 ||
        err.status === 429;

      if (!isRetryable) {
        throw rawError;
      }
    }

    await sleepFn(WORKBUDDY_POLL_INTERVAL_MS);
  }
}

type StateData = {
  state: string;
  authUrl: string;
};

type AccountData = {
  uid: string;
  nickname?: string;
  phoneNumber?: string;
  enterpriseId?: string;
  type?: string;
};

type AccountsListData = {
  accounts?: Array<{
    uid?: string;
    enterpriseId?: string;
    type?: string;
    lastLogin?: boolean;
  }>;
};

async function resolveEnterpriseId(
  siteConfig: WorkBuddySiteConfig,
  accessToken: string,
  domain: string,
  who: AccountData,
  fetchImpl: CliFetchImpl | typeof fetch
): Promise<string> {
  const own = typeof who.enterpriseId === "string" ? who.enterpriseId.trim() : "";
  if (own) return own;

  const type = String(who.type ?? "").trim().toLowerCase();
  if (!type || type === "personal") return "";

  try {
    const list = await callWorkBuddyApi<AccountsListData>(
      siteConfig,
      "GET",
      "/v2/plugin/accounts",
      {
        Authorization: `Bearer ${accessToken}`,
        "X-Domain": domain,
      },
      undefined,
      fetchImpl
    );

    const mine = (list?.accounts ?? []).filter(
      (x) => x?.uid === who.uid && typeof x?.enterpriseId === "string" && x.enterpriseId.trim()
    );
    const same = mine.filter((x) => String(x.type ?? "").trim().toLowerCase() === type);
    const last = mine.filter((x) => x.lastLogin);
    const pick = same.length === 1 ? same[0] : last.length === 1 ? last[0] : mine.length === 1 ? mine[0] : undefined;
    return pick && typeof pick.enterpriseId === "string" ? pick.enterpriseId.trim() : "";
  } catch {
    return "";
  }
}

/**
 * Executes browser-based interactive WorkBuddy sign-in.
 * Supports headless environments by printing the authorization URL,
 * and allows injecting fetchImpl, sleep, and now.
 */
export async function runWorkBuddyOAuthLogin(
  site: WorkBuddySite,
  deps: OAuthFlowDeps = {}
): Promise<OAuthCredential> {
  const siteConfig = getWorkBuddySite(site);
  const output = deps.output ?? console;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleepFn = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  const nowFn = deps.now ?? (() => Date.now());

  // 1. Request sign-in state and auth URL
  const stateData = await callWorkBuddyApi<StateData>(
    siteConfig,
    "POST",
    `/v2/plugin/auth/state?platform=${encodeURIComponent(siteConfig.platform)}`,
    {
      "X-No-Authorization": "true",
      "X-No-User-Id": "true",
      "X-No-Enterprise-Id": "true",
      "X-No-Department-Info": "true",
    },
    {},
    fetchImpl
  );

  if (!stateData?.state || !stateData?.authUrl) {
    throw new Error(`${siteConfig.name} gave no sign-in page`);
  }

  const validatedUrl = validateWorkBuddyAuthUrl(site, stateData.authUrl);
  validatedUrl.searchParams.set("version", WORKBUDDY_APP_VERSION);
  validatedUrl.searchParams.set("loginSessionId", randomBytes(16).toString("hex"));

  const finalAuthUrl = validatedUrl.toString();

  output.log(
    `\nOpen this URL in your browser to authorize ${siteConfig.name}:\n${finalAuthUrl}\n\n` +
      `Waiting for browser authentication...`
  );

  if (deps.openBrowser) {
    try {
      await deps.openBrowser(finalAuthUrl);
    } catch {
      // Non-fatal: the URL is already printed above.
    }
  }

  const deadline = nowFn() + WORKBUDDY_SIGN_IN_TIMEOUT_MS;
  const qState = encodeURIComponent(stateData.state);

  // 2. Poll for token (11217 indicates waiting for browser sign-in)
  const token = await pollWorkBuddyEndpoint<WorkBuddyTokenPayload>(
    siteConfig,
    `/v2/plugin/auth/token?state=${qState}`,
    {},
    [11217],
    deadline,
    fetchImpl,
    sleepFn,
    nowFn
  );

  if (typeof token?.accessToken !== "string" || !token.accessToken.trim()) {
    throw new Error(`${siteConfig.name} sent back no token`);
  }

  const defaultHost = new URL(siteConfig.endpoint).host;
  const tokenDomain = sanitizeWorkBuddyDomain(token.domain, defaultHost);

  // 3. Poll for account identity (12151 indicates waiting for account details)
  const who = await pollWorkBuddyEndpoint<AccountData>(
    siteConfig,
    `/v2/plugin/login/account?state=${qState}`,
    {
      Authorization: `Bearer ${token.accessToken}`,
      "X-Domain": tokenDomain,
      "X-No-User-Id": "true",
      "X-No-Enterprise-Id": "true",
    },
    [12151],
    deadline,
    fetchImpl,
    sleepFn,
    nowFn
  );

  // 4. Resolve enterprise id if needed
  const enterpriseId = await resolveEnterpriseId(
    siteConfig,
    token.accessToken,
    tokenDomain,
    who,
    fetchImpl
  );

  const now = nowFn();

  return normalizeWorkBuddyTokenPayload(site, {
    ...token,
    uid: who.uid,
    nickname: who.nickname || who.phoneNumber,
    enterpriseId: enterpriseId || who.enterpriseId,
  }, undefined, now);
}
