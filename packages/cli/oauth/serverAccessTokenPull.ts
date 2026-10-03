// packages/cli/oauth/serverAccessTokenPull.ts
//
// 服务端托管凭据的「取 access token」通道。
//
// 为什么存在：同步到多个地方的账号，服务端是唯一持有 refresh token 并刷新的
// 一方。本地绝不自己刷新（自己刷会把服务端那条上游授权作废），过期时只向
// 服务端取一个新鲜的 access token。
//
// 纪律：
// - 只接受 access token / 有效期 / accountId，**绝不接收 refresh token**；
// - 调用前校验标记里的服务器 origin 与属主 userId，防止切换 profile 后串号；
// - 失败静默返回 null（调用方决定是继续用旧 token 还是明确报错）；
// - 进程内按 provider 做失败冷却，避免服务端不可达时每次请求都打一遍。

import type { ServerManagedMarker } from "../../agent-runtime/oauthTokenStore";
import { resolveServerSyncConfig, type ServerSyncConfig } from "./serverSyncConfig";
import { parseUserIdFromAuthToken } from "../cliEnvHelpers";

export type PulledAccessToken = {
  accessToken: string;
  expiresAt?: number;
  accountId?: string;
};

export type ServerAccessTokenPullInput = {
  provider: string;
  force: boolean;
  serverManaged: ServerManagedMarker;
};

export type ServerAccessTokenPullDeps = {
  fetchImpl?: typeof fetch;
  resolveServerSyncConfig?: () => ServerSyncConfig | null;
  /** 本机当前登录的 userId；缺省从 profile token 推。与标记不一致时拒绝（防止串号）。 */
  localUserId?: string;
  now?: () => number;
  /** 单次请求超时。 */
  timeoutMs?: number;
};

/** 失败后的冷却时长：期间不再打服务端（仍可继续用未过期的旧 token）。 */
export const PULL_FAILURE_COOLDOWN_MS = 60_000;

export function createServerAccessTokenPuller(deps: ServerAccessTokenPullDeps = {}) {
  const inFlight = new Map<string, Promise<PulledAccessToken | null>>();
  const cooldownUntil = new Map<string, number>();
  const now = deps.now ?? Date.now;

  return async function pullServerAccessToken(
    input: ServerAccessTokenPullInput,
  ): Promise<PulledAccessToken | null> {
    const { provider } = input;
    const { origin, userId } = input.serverManaged;

    const config = (deps.resolveServerSyncConfig ?? resolveServerSyncConfig)();
    if (!config) return null;
    // 串号防护：标记和当前登录 userId 必须都非空且完全一致，不一致或任一未知一律拒绝
    const localUserId =
      (deps.localUserId ?? parseUserIdFromAuthToken(config.authToken) ?? "").trim();
    const markerUserId = (userId ?? "").trim();
    if (!localUserId || !markerUserId || localUserId !== markerUserId) return null;
    if (!origin || config.serverOrigin !== origin) return null;

    const until = cooldownUntil.get(provider) ?? 0;
    if (now() < until) return null;

    const existing = inFlight.get(provider);
    if (existing) return existing;

    const run = (async (): Promise<PulledAccessToken | null> => {
      try {
        const fetchImpl = deps.fetchImpl ?? fetch;
        const res = await fetchImpl(
          `${config.serverOrigin}/api/oauth/${provider}/access-token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${config.authToken}`,
            },
            body: JSON.stringify({ force: input.force === true }),
            signal: AbortSignal.timeout(deps.timeoutMs ?? 10_000),
          },
        );
        if (!res.ok) {
          cooldownUntil.set(provider, now() + PULL_FAILURE_COOLDOWN_MS);
          return null;
        }
        const payload = (await res.json().catch(() => null)) as
          | { accessToken?: unknown; expiresAt?: unknown; accountId?: unknown }
          | null;
        const accessToken =
          typeof payload?.accessToken === "string" ? payload.accessToken.trim() : "";
        if (!accessToken) {
          cooldownUntil.set(provider, now() + PULL_FAILURE_COOLDOWN_MS);
          return null;
        }
        cooldownUntil.delete(provider);
        const expiresAt =
          typeof payload?.expiresAt === "number" && Number.isFinite(payload.expiresAt)
            ? payload.expiresAt
            : undefined;
        const accountId =
          typeof payload?.accountId === "string" && payload.accountId
            ? payload.accountId
            : undefined;
        return {
          accessToken,
          ...(expiresAt !== undefined ? { expiresAt } : {}),
          ...(accountId ? { accountId } : {}),
        };
      } catch {
        cooldownUntil.set(provider, now() + PULL_FAILURE_COOLDOWN_MS);
        return null;
      } finally {
        inFlight.delete(provider);
      }
    })();

    inFlight.set(provider, run);
    return run;
  };
}
