import { asOptionalFiniteNumber } from "core/optionalNumber";
import { getClaudeCodeUserAgent } from "./anthropicClaudeCodeFingerprint";

import type { OAuthCredential, OAuthRefreshFn } from "./oauthTokenStore";
import { OAuthRefreshError, classifyOAuthRefreshHttpFailure } from "./oauthRefreshError";

export const ANTHROPIC_OAUTH_CLIENT_ID =
  "9d1c250a-e61b-44d9-88ed-5944d1962f5e";
export const ANTHROPIC_OAUTH_AUTHORIZE_URL =
  "https://claude.ai/oauth/authorize";
export const ANTHROPIC_OAUTH_TOKEN_URL =
  "https://api.anthropic.com/v1/oauth/token";
export const ANTHROPIC_OAUTH_CALLBACK_PORT = 54545;
export const ANTHROPIC_OAUTH_REDIRECT_URI =
  `http://localhost:${ANTHROPIC_OAUTH_CALLBACK_PORT}/callback`;
export const ANTHROPIC_OAUTH_SCOPES = [
  "org:create_api_key",
  "user:profile",
  "user:inference",
  "user:sessions:claude_code",
  "user:mcp_servers",
  "user:file_upload",
];
export const ANTHROPIC_ACCESS_TOKEN_CLIENT_SKEW_MS = 5 * 60 * 1000;
export const ANTHROPIC_OAUTH_BETA = "oauth-2025-04-20";
export const ANTHROPIC_BOOTSTRAP_URL =
  "https://api.anthropic.com/api/claude_cli/bootstrap";

/**
 * Anthropic OAuth grant family 最大存活周期（30 天）。
 *
 * 启发式展示值（基于实际观测）：Anthropic 的 refresh token 会轮换（约 8 小时一次），
 * 但整个 grant 家族有 30 天绝对硬寿命，到期后 token 端点会对最新的 refresh token
 * 返回 invalid_grant: Refresh token expired，必须重新交互式登录。
 * 此值不是 wire 协议契约字段，仅用于本地生命周期前瞻与 CLI 提示。
 */
export const ANTHROPIC_OAUTH_GRANT_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * 刷新路径重查账号/组织身份的最小间隔（24h）。
 *
 * 身份是天级变化；refresh 在凭据关键链上，每次多打一跳 bootstrap 只会拖慢所有
 * 需要刷新的请求。因此刷新路径按「字段不全 or 距上次检查超期」才查，
 * 登录路径不设限。见 refreshAnthropicToken 的注释。
 */
export const ANTHROPIC_IDENTITY_RECHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export type AnthropicTokenPayload = {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  scope?: unknown;
  account?: { uuid?: unknown; email_address?: unknown };
  organization?: { uuid?: unknown; name?: unknown };
  error?: unknown;
  error_description?: unknown;
};

export type RefreshAnthropicTokenDeps = {
  fetchImpl?: typeof fetch;
  now?: () => number;
  warn?: (message: string) => void;
};

export type AnthropicBootstrapIdentity = {
  accountId?: string;
  email?: string;
  orgId?: string;
  orgName?: string;
};

/**
 * Anthropic OAuth grant 剩余有效时间（毫秒）。
 * 若凭据未记录 grantedAt（如历史旧凭据），返回 undefined；
 * 否则返回 grantedAt + ANTHROPIC_OAUTH_GRANT_TTL_MS - now（已过期时为负数）。
 */
export function anthropicGrantRemainingMs(
  credential?: { metadata?: Record<string, unknown> | null } | null,
  now: number = Date.now()
): number | undefined {
  const rawGrantedAt = credential?.metadata?.grantedAt;
  if (typeof rawGrantedAt !== "number" || !Number.isFinite(rawGrantedAt)) {
    return undefined;
  }
  return rawGrantedAt + ANTHROPIC_OAUTH_GRANT_TTL_MS - now;
}

/**
 * 从 Claude CLI bootstrap 端点补全 OAuth 账号与组织身份信息。
 * 遵循 omp 实践：当 token 响应不带账号时，用 claude-cli UA 请求 bootstrap 端点回填。
 * 失败时静默返回空对象，绝不阻断主流程。
 */
export async function fetchAnthropicBootstrapIdentity(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
  debugLog?: (msg: string, err?: unknown) => void
): Promise<AnthropicBootstrapIdentity> {
  if (!accessToken || typeof accessToken !== "string") {
    return {};
  }
  try {
    const response = await fetchImpl(ANTHROPIC_BOOTSTRAP_URL, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
        // UA 版本必须走 fingerprint 单一真源：400 自愈 adopt 新版本后，
        // 这里若自带一份 pin，就会继续发旧版本，上游抬门槛时身份回填会静默失效。
        "User-Agent": getClaudeCodeUserAgent(),
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      debugLog?.(`Claude bootstrap identity returned HTTP ${response.status}`);
      return {};
    }
    const data = (await response.json().catch(() => ({}))) as {
      oauth_account?: {
        account_uuid?: unknown;
        account_email?: unknown;
        organization_uuid?: unknown;
        organization_name?: unknown;
      };
    };
    const account = data?.oauth_account;
    const identity: AnthropicBootstrapIdentity = {};
    if (typeof account?.account_uuid === "string" && account.account_uuid.trim()) {
      identity.accountId = account.account_uuid.trim();
    }
    if (typeof account?.account_email === "string" && account.account_email.trim()) {
      identity.email = account.account_email.trim();
    }
    if (typeof account?.organization_uuid === "string" && account.organization_uuid.trim()) {
      identity.orgId = account.organization_uuid.trim();
    }
    if (typeof account?.organization_name === "string" && account.organization_name.trim()) {
      identity.orgName = account.organization_name.trim();
    }
    return identity;
  } catch (err) {
    debugLog?.("Claude bootstrap identity fetch failed", err);
    return {};
  }
}

export function normalizeAnthropicTokenPayload(args: {
  payload: AnthropicTokenPayload;
  baseCredential?: Partial<OAuthCredential>;
  now?: number;
  /**
   * 显式指定是否为交互式初始登录。
   * 当未提供时，根据 baseCredential 是否存在区分：
   * - 初始登录（无 baseCredential）：写入当前时间 now 作为 grantedAt
   * - 刷新令牌（有 baseCredential）：保留已存的 grantedAt，绝不重写为当前时间
   */
  isInitialLogin?: boolean;
}): OAuthCredential {
  const { payload, baseCredential, now = Date.now() } = args;

  if (typeof payload.access_token !== "string" || !payload.access_token.trim()) {
    throw new Error("Claude OAuth token response missing access_token");
  }

  const expiresIn = asOptionalFiniteNumber(payload.expires_in);
  const accountId =
    typeof payload.account?.uuid === "string" && payload.account.uuid
      ? payload.account.uuid
      : baseCredential?.accountId;
  const email =
    typeof payload.account?.email_address === "string" && payload.account.email_address
      ? payload.account.email_address
      : (baseCredential?.metadata?.email as string | undefined);

  // 当 payload 明确提供组织信息时采用（登录或经过 bootstrap 确认）；
  // 当 payload 缺失组织信息时（如 bootstrap 失败/空回）回退至 baseCredential，
  // 绝不使用空值覆盖已有组织。
  const organizationId =
    typeof payload.organization?.uuid === "string" && payload.organization.uuid
      ? payload.organization.uuid
      : (baseCredential?.metadata?.organizationId as string | undefined);
  const organizationName =
    typeof payload.organization?.name === "string" && payload.organization.name
      ? payload.organization.name
      : (baseCredential?.metadata?.organizationName as string | undefined);

  const refreshToken =
    typeof payload.refresh_token === "string" && payload.refresh_token.trim()
      ? payload.refresh_token.trim()
      : baseCredential?.refreshToken;

  const scope =
    typeof payload.scope === "string" && payload.scope
      ? payload.scope
      : baseCredential?.scope;

  // 区分交互式登录与令牌刷新：只有登录时设置 grantedAt，刷新必须保留已存 grantedAt
  const isInteractiveLogin = args.isInitialLogin ?? (baseCredential === undefined);
  const grantedAt = isInteractiveLogin
    ? now
    : typeof baseCredential?.metadata?.grantedAt === "number" &&
        Number.isFinite(baseCredential.metadata.grantedAt)
      ? baseCredential.metadata.grantedAt
      : undefined;

  const metadata: Record<string, unknown> = {
    ...(baseCredential?.metadata ?? {}),
    ...(email ? { email } : {}),
    ...(organizationId ? { organizationId } : {}),
    ...(organizationName ? { organizationName } : {}),
    ...(grantedAt !== undefined ? { grantedAt } : {}),
  };

  return {
    ...baseCredential,
    provider: "claude",
    accessToken: payload.access_token.trim(),
    ...(refreshToken ? { refreshToken } : {}),
    ...(expiresIn !== undefined
      ? { expiresAt: now + expiresIn * 1000 - ANTHROPIC_ACCESS_TOKEN_CLIENT_SKEW_MS }
      : baseCredential?.expiresAt !== undefined
        ? { expiresAt: baseCredential.expiresAt }
        : {}),
    ...(scope ? { scope } : {}),
    ...(accountId ? { accountId } : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    obtainedAt: now,
  };
}

export async function refreshAnthropicToken(
  credential: OAuthCredential,
  deps: RefreshAnthropicTokenDeps = {}
): Promise<OAuthCredential> {
  if (!credential.refreshToken) {
    throw new Error("Claude credential has no refresh_token");
  }
  const fetchImpl = deps.fetchImpl ?? fetch;
  const now = deps.now?.() ?? Date.now();
  const warn = deps.warn ?? console.warn;

  const response = await fetchImpl(ANTHROPIC_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-beta": ANTHROPIC_OAUTH_BETA,
      "User-Agent": "nolo-cli userOAuthProvider",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: ANTHROPIC_OAUTH_CLIENT_ID,
      refresh_token: credential.refreshToken,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const payload = (await response.json().catch(() => ({}))) as AnthropicTokenPayload;
  if (!response.ok) {
    throw classifyOAuthRefreshHttpFailure(response.status, payload, response.headers);
  }
  if (typeof payload.access_token !== "string" || !payload.access_token.trim()) {
    throw new OAuthRefreshError("bad_response");
  }

  // 身份自动更新与变更追溯（对齐 Codex/GPT 设计，不靠人工重登）：
  // 1. 需要时请求 bootstrap 端点获取最新账号与组织身份；
  // 2. accountId / email 与已存不同时直接更新（安全自愈）；
  // 3. orgId / orgName 与已存不同时也自动更新，但必须记录可追溯信息 previousOrgId 与
  //    orgChangedAt 到 metadata，并输出 warn 级日志说明「组织归属已随上游 bootstrap 变更」，
  //    做到「自动更新 + 可追溯，而不是静默换组织」；
  // 4. 只有 bootstrap 请求失败或字段缺失时拒绝改写已有 org，绝不用空值覆盖已有归属。
  //
  // 查询时机：组织/账号身份是天级变化，而 refresh 在凭据关键链上（每个要过期的
  // token 都要过一次）。因此刷新路径只在「身份字段不全」或「距上次检查超过
  // IDENTITY_RECHECK_INTERVAL_MS」时查，避免每次 refresh 都多一个网络往返把
  // 请求拖慢；登录路径（exchange）则无条件查一次。自动更新仍然成立：最迟一个
  // 检查周期内自愈。
  const identityCheckedAt = asOptionalFiniteNumber(credential.metadata?.identityCheckedAt);
  // 真正影响「能用不能用」的三件：账号、邮箱、组织。缺任何一个都必须立刻补。
  const identityIncomplete =
    !credential.accountId ||
    !credential.metadata?.email ||
    !credential.metadata?.organizationId;
  // orgName 是展示字段，**不放进** identityIncomplete：若上游对某个账号始终不返回
  // organization_name，它会让每次刷新都打一次 bootstrap，把 24h 节流整个旁路掉。
  const orgNameMissing = !credential.metadata?.organizationName;
  const identityStale =
    identityCheckedAt === undefined ||
    now - identityCheckedAt >= ANTHROPIC_IDENTITY_RECHECK_INTERVAL_MS;
  // 缺 orgName 只在节流窗口到期时才重查（最多滞后一个周期，但不会每次刷新都多一跳）。
  const shouldCheck = identityIncomplete || identityStale || (orgNameMissing && identityStale);
  const bootstrap = shouldCheck
    ? await fetchAnthropicBootstrapIdentity(payload.access_token, fetchImpl)
    : {};

  const updatedMetadata: Record<string, unknown> = {
    ...(credential.metadata ?? {}),
  };
  // 只在真的查过上游时才推进「上次检查时间」（跳过不算已检查）。
  if (shouldCheck) {
    updatedMetadata.identityCheckedAt = now;
  }

  // 1) accountId / email 自愈更新
  if (bootstrap.accountId && bootstrap.accountId !== credential.accountId) {
    payload.account = { ...payload.account, uuid: bootstrap.accountId };
  }
  if (bootstrap.email && bootstrap.email !== credential.metadata?.email) {
    payload.account = { ...payload.account, email_address: bootstrap.email };
    updatedMetadata.email = bootstrap.email;
  }

  // 2) orgId / orgName 自动更新与变更追溯
  const existingOrgId = credential.metadata?.organizationId as string | undefined;
  if (!bootstrap.orgId) {
    // 刷新路径的 org 归属只能由 bootstrap 确认后才允许改写。token 响应自带的
    // organization 字段（若上游真会返回）没有经过追溯流程，直接采用会形成
    // 「绕过 previousOrgId 的静默换组织」——宁可保留已存 org。
    delete payload.organization;
  }
  if (bootstrap.orgId) {
    if (existingOrgId && existingOrgId !== bootstrap.orgId) {
      updatedMetadata.previousOrgId = existingOrgId;
      updatedMetadata.orgChangedAt = now;
      warn(
        `[anthropicOAuth] 组织归属已随上游 bootstrap 变更: ${existingOrgId} -> ${bootstrap.orgId}`
      );
    }
    payload.organization = {
      ...payload.organization,
      uuid: bootstrap.orgId,
      ...(bootstrap.orgName ? { name: bootstrap.orgName } : {}),
    };
    updatedMetadata.organizationId = bootstrap.orgId;
    if (bootstrap.orgName) {
      updatedMetadata.organizationName = bootstrap.orgName;
    }
  }

  return normalizeAnthropicTokenPayload({
    payload,
    baseCredential: {
      ...credential,
      ...(Object.keys(updatedMetadata).length > 0
        ? { metadata: updatedMetadata }
        : { metadata: undefined }),
    },
    now,
    // 显式声明是刷新：grantedAt 必须沿用已存值，绝不因为「这次拿到了新 token」
    // 就把 30 天寿命重新起算——refresh 轮换不延长 grant 家族寿命。
    isInitialLogin: false,
  });
}

export const anthropicRefresh: OAuthRefreshFn = refreshAnthropicToken;
