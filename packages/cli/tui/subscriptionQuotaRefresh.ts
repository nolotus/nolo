// packages/cli/tui/subscriptionQuotaRefresh.ts
//
// /switch 目录加载时的订阅额度合并：把 agent 目录条目发给服务端
// POST /api/agents/quota/refresh（服务端只给匹配 Kimi/GLM Coding 套餐且
// 快照过期的 agent 做主动探测），把返回的新快照就地合并进 entries。
//
// 纪律：额度是展示增强——任何失败（无 token/网络/超时/服务端报错）都
// 静默跳过，绝不影响目录加载；总预算 3s 超时兜底。

import type { AgentQuota } from "ai/agent/quotaSnapshot";
import type { CliFetchImpl } from "../cliFetch";
import {
  resolveAuthToken,
  resolveServerUrl,
} from "../cliEnvHelpers";
import type { AgentCatalogEntry } from "./agentCatalog";

type EnvLike = Record<string, string | undefined>;

// 前台目录加载的等待上限：本地 loopback 探测正常 <300ms 返回；
// 超时后服务端仍会继续探测并落库，下次打开目录即可见。
const CATALOG_QUOTA_REFRESH_TIMEOUT_MS = 2_000;
/** 快照距现在不足 60s 视为新鲜，整目录跳过刷新请求。 */
const CATALOG_QUOTA_STALE_MS = 60_000;
/** 上轮刷新没有任何订阅 agent 可探测时，5 分钟内不再发刷新请求
 * （普通 private agent 永远没有 quota，不能每次开 /switch 都白跑一次
 * HTTP 往返——review INFO finding）。 */
const EMPTY_REFRESH_BACKOFF_MS = 5 * 60_000;

let lastRefreshEmptyAt = 0;

function quotaIsFresh(entry: AgentCatalogEntry, now: number): boolean {
  const observedAt = entry.quota?.observedAt;
  return (
    typeof observedAt === "number" &&
    Number.isFinite(observedAt) &&
    now - observedAt < CATALOG_QUOTA_STALE_MS
  );
}

export async function refreshCatalogSubscriptionQuotas(args: {
  entries: AgentCatalogEntry[];
  env?: EnvLike;
  fetchImpl?: CliFetchImpl;
}): Promise<void> {
  try {
    const now = Date.now();
    // 全部私有条目都有新鲜快照时整轮跳过（平台条目永远没有 quota）。
    const needsRefresh = args.entries.some(
      (entry) => entry.kind === "private" && !quotaIsFresh(entry, now),
    );
    if (!needsRefresh) return;
    // 负缓存：上次刷新服务端一个订阅 agent 都没探测到 → 退避 5 分钟。
    if (lastRefreshEmptyAt && now - lastRefreshEmptyAt < EMPTY_REFRESH_BACKOFF_MS) {
      return;
    }

    const env = args.env ?? process.env;
    const authToken = resolveAuthToken([], env);
    if (!authToken) return;
    const fetchImpl = args.fetchImpl ?? fetch;

    // Promise.race 兜底而不是只靠 AbortSignal：catalog 的 fetchImpl 可能是
    // 不响应 abort 的通道（或测试里的悬挂 mock），超时必须无条件放行，
    // 否则会把 loadAgentCatalog 自身的 deadline 语义打破。
    const refreshPromise = (async () => {
      const res = await fetchImpl(
        `${resolveServerUrl(env)}/api/agents/quota/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: "{}",
          signal: AbortSignal.timeout(CATALOG_QUOTA_REFRESH_TIMEOUT_MS),
        },
      );
      if (!res.ok) return;
      const payload: any = await res.json().catch(() => null);
      const quotas = payload?.quotas;
      if (!quotas || typeof quotas !== "object") return;
      const probed = typeof payload?.probed === "number" ? payload.probed : 0;
      if (probed === 0 && Object.keys(quotas).length === 0) {
        lastRefreshEmptyAt = Date.now();
        return;
      }
      lastRefreshEmptyAt = 0;
      for (const entry of args.entries) {
        const quota = (quotas as Record<string, AgentQuota>)[entry.key];
        if (quota && Array.isArray(quota.windows)) {
          entry.quota = quota;
        }
      }
    })();
    let timer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      refreshPromise,
      new Promise<void>((resolve) => {
        timer = setTimeout(resolve, CATALOG_QUOTA_REFRESH_TIMEOUT_MS);
      }),
    ]).catch(() => {});
    if (timer) clearTimeout(timer);
    // 超时放行的悬挂请求不留 unhandled rejection。
    refreshPromise.catch(() => {});
  } catch {
    // 静默：目录展示不依赖额度刷新成功。
  }
}
