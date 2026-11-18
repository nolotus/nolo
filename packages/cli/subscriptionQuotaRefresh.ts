// packages/cli/subscriptionQuotaRefresh.ts
//
// 订阅额度的「按需」合并（/switch 目录、`nolo agent list`、`nolo agent read` 共用）：
// 把 agent 条目发给服务端
// POST /api/agents/quota/refresh（服务端只给匹配 Kimi/GLM Coding 套餐且
// 快照过期的 agent 做主动探测），把返回的新快照就地合并进 entries。
//
// 纪律：额度是展示增强——任何失败（无 token/网络/超时/服务端报错）都
// 静默跳过，绝不影响目录加载；总预算 2s 超时兜底。

import {
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { AgentQuota } from "ai/agent/quotaSnapshot";
import type { CliFetchImpl } from "./cliFetch";
import {
  parseUserIdFromAuthToken,
  resolveAuthToken,
  resolveServerUrl,
} from "./cliEnvHelpers";

/** 公共函数只依赖这两个字段，任何带 key + quota 的条目都能用。 */
export type QuotaRefreshEntry = {
  key: string;
  quota?: AgentQuota;
  /** 缺省视为需要探测；TUI 目录用它跳过平台条目（平台条目永远没有 quota）。 */
  probeable?: boolean;
};

type EnvLike = Record<string, string | undefined>;

// 前台目录加载的等待上限：本地 loopback 探测正常 <300ms 返回；
// 超时后服务端仍会继续探测并落库，下次打开目录即可见。
const CATALOG_QUOTA_REFRESH_TIMEOUT_MS = 2_000;
/** 短窗口保鲜期：最近 45s 内观测过且未跨过 resetAt 待恢复时，直接复用快照。 */
export const FRESH_QUOTA_TTL_MS = 45_000;
/** 磁盘缓存条目的最大保留期，避免缓存文件长期堆积过期快照。 */
const CACHE_ENTRY_RETENTION_MS = 10 * 60_000;
/** 上轮「整批」刷新没有任何订阅 agent 可探测时，5 分钟内不再发刷新请求
 * （普通 private agent 永远没有 quota，不能每次开 /switch 都白跑一次
 * HTTP 往返——review INFO finding）。只对整批刷新（TUI 目录、agent list）
 * 生效；单 agent 的 `agent read`（onlyKeys）不读也不写它——否则读一个
 * 无订阅 agent 的空结果会让 list/TUI 的整批刷新被抑制 5 分钟。 */
const EMPTY_REFRESH_BACKOFF_MS = 5 * 60_000;

let lastRefreshEmptyAt = 0;

/** 仅测试用：清掉模块级退避状态。 */
export function resetSubscriptionQuotaBackoffForTests(): void {
  lastRefreshEmptyAt = 0;
}

type CachedQuotaRefreshScope = {
  lastBatchRefreshAt?: number;
  checkedKeys?: string[];
  quotas?: Record<string, AgentQuota>;
};

type QuotaRefreshDiskCache = Record<string, CachedQuotaRefreshScope>;

function hasPendingReset(quota: AgentQuota | undefined, now: number): boolean {
  if (!quota || !Array.isArray(quota.windows)) return false;
  const observedAt =
    typeof quota.observedAt === "number" && Number.isFinite(quota.observedAt)
      ? quota.observedAt
      : undefined;
  return quota.windows.some((win) => {
    if (typeof win?.resetAt !== "number" || !Number.isFinite(win.resetAt)) {
      return false;
    }
    if (win.resetAt > now) return false;
    // 观测时还未重置、现在已过 resetAt；或窗口已耗尽且已到重置时刻 → 需重探。
    if (observedAt !== undefined && observedAt < win.resetAt) return true;
    return (
      (typeof win.utilization === "number" && win.utilization >= 1) ||
      win.remaining === 0
    );
  });
}

function quotaSnapshotIsFresh(quota: AgentQuota | undefined, now: number): boolean {
  const observedAt = quota?.observedAt;
  if (typeof observedAt !== "number" || !Number.isFinite(observedAt)) return false;
  if (now - observedAt >= FRESH_QUOTA_TTL_MS) return false;
  return !hasPendingReset(quota, now);
}

function resolveQuotaCachePath(
  env: EnvLike,
  hasCustomFetch: boolean,
): string | undefined {
  const explicitNoloHome = env.NOLO_HOME?.trim();
  const noloHome =
    explicitNoloHome ||
    (!hasCustomFetch && env.HOME?.trim() ? `${env.HOME.trim()}/.nolo` : "");
  return noloHome ? join(noloHome, "cache", "subscription-quota-refresh.json") : undefined;
}

function readQuotaDiskCache(cachePath: string | undefined): QuotaRefreshDiskCache {
  if (!cachePath) return {};
  try {
    const parsed = JSON.parse(readFileSync(cachePath, "utf8"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as QuotaRefreshDiskCache)
      : {};
  } catch {
    return {};
  }
}

function writeQuotaDiskCache(
  cachePath: string | undefined,
  cacheKey: string,
  quotas: Record<string, AgentQuota>,
  wholeBatch: boolean,
  checkedKeys: string[],
  now: number,
): void {
  if (!cachePath) return;
  try {
    const current = readQuotaDiskCache(cachePath);
    const prevScope = current[cacheKey] ?? {};
    const mergedQuotas: Record<string, AgentQuota> = {};
    for (const [k, v] of Object.entries(prevScope.quotas ?? {})) {
      if (
        v &&
        typeof v.observedAt === "number" &&
        Number.isFinite(v.observedAt) &&
        now - v.observedAt < CACHE_ENTRY_RETENTION_MS
      ) {
        mergedQuotas[k] = v;
      }
    }
    for (const [k, v] of Object.entries(quotas)) {
      if (v && Array.isArray(v.windows)) {
        mergedQuotas[k] = v;
      }
    }
    const prevBatchFresh =
      typeof prevScope.lastBatchRefreshAt === "number" &&
      now - prevScope.lastBatchRefreshAt < FRESH_QUOTA_TTL_MS;
    const mergedCheckedKeys = wholeBatch
      ? Array.from(
          new Set([
            ...(prevBatchFresh && Array.isArray(prevScope.checkedKeys)
              ? prevScope.checkedKeys
              : []),
            ...checkedKeys,
          ]),
        )
      : prevScope.checkedKeys;
    current[cacheKey] = {
      lastBatchRefreshAt: wholeBatch ? now : prevScope.lastBatchRefreshAt,
      ...(mergedCheckedKeys ? { checkedKeys: mergedCheckedKeys } : {}),
      quotas: mergedQuotas,
    };
    mkdirSync(dirname(cachePath), { recursive: true });
    const tmpPath = `${cachePath}.tmp-${process.pid}-${Date.now()}`;
    writeFileSync(tmpPath, JSON.stringify(current), "utf8");
    renameSync(tmpPath, cachePath);
  } catch {
    // 缓存写失败静默：绝不阻塞配额展示。
  }
}

function pickNewerQuota(
  a: AgentQuota | undefined,
  b: AgentQuota | undefined,
): AgentQuota | undefined {
  if (!a) return b;
  if (!b) return a;
  const ta =
    typeof a.observedAt === "number" && Number.isFinite(a.observedAt)
      ? a.observedAt
      : -1;
  const tb =
    typeof b.observedAt === "number" && Number.isFinite(b.observedAt)
      ? b.observedAt
      : -1;
  return tb > ta ? b : a;
}

export async function refreshSubscriptionQuotas(args: {
  entries: QuotaRefreshEntry[];
  /** 只探测这些 key（`agent read` 只刷新被读的那一个）。缺省=全部可探测条目。 */
  onlyKeys?: string[];
  /** true 时跳过短窗口 TTL 与本地缓存，强制发起刷新请求（如 `--refresh-quota`）。 */
  forceRefresh?: boolean;
  env?: EnvLike;
  /** CLI 参数（--token/--server）：与调用方命令解析同一份服务器与 token。 */
  cliArgs?: string[];
  fetchImpl?: CliFetchImpl;
}): Promise<Record<string, AgentQuota>> {
  const fresh: Record<string, AgentQuota> = {};
  try {
    const now = Date.now();
    const env = args.env ?? process.env;
    const authToken = resolveAuthToken(args.cliArgs ?? [], env);
    if (!authToken) return fresh;

    const wholeBatch = !args.onlyKeys || args.onlyKeys.length === 0;
    const serverUrl = resolveServerUrl(args.cliArgs ?? [], env);
    const cachePath = resolveQuotaCachePath(
      env,
      Boolean(args.fetchImpl && args.fetchImpl !== fetch),
    );
    const userId = parseUserIdFromAuthToken(authToken) ?? "anon";
    const cacheKey = `${serverUrl}::${userId}`;
    const diskCache = !args.forceRefresh ? readQuotaDiskCache(cachePath) : {};
    const scopeCache = diskCache[cacheKey];

    const targetEntries = args.entries.filter(
      (entry) =>
        entry.probeable !== false &&
        (!args.onlyKeys || args.onlyKeys.includes(entry.key)),
    );

    const staleTargetKeys: string[] = [];
    if (!args.forceRefresh) {
      const batchWindowFresh =
        wholeBatch &&
        typeof scopeCache?.lastBatchRefreshAt === "number" &&
        now - scopeCache.lastBatchRefreshAt < FRESH_QUOTA_TTL_MS;
      const checkedKeySet = batchWindowFresh
        ? new Set(Array.isArray(scopeCache?.checkedKeys) ? scopeCache.checkedKeys : [])
        : null;

      for (const entry of targetEntries) {
        const cachedQuota = scopeCache?.quotas?.[entry.key];
        const bestQuota = pickNewerQuota(entry.quota, cachedQuota);
        if (hasPendingReset(bestQuota, now)) {
          staleTargetKeys.push(entry.key);
          continue;
        }
        if (quotaSnapshotIsFresh(bestQuota, now)) {
          if (
            cachedQuota &&
            bestQuota === cachedQuota &&
            (!entry.quota ||
              typeof entry.quota.observedAt !== "number" ||
              !Number.isFinite(entry.quota.observedAt) ||
              cachedQuota.observedAt > entry.quota.observedAt)
          ) {
            fresh[entry.key] = cachedQuota;
          }
          continue;
        }
        // 本轮 45s 整批窗内已检查过且未拿到 quota 的非订阅条目不重复触发全批阻塞，
        // 但不在 checkedKeySet 里的新增订阅 key 必须放行探测。
        if (checkedKeySet?.has(entry.key)) {
          continue;
        }
        staleTargetKeys.push(entry.key);
      }

      if (staleTargetKeys.length === 0) return fresh;

      // 负缓存：上次刷新服务端一个订阅 agent 都没探测到 → 退避 5 分钟。
      if (
        wholeBatch &&
        lastRefreshEmptyAt &&
        now - lastRefreshEmptyAt < EMPTY_REFRESH_BACKOFF_MS
      ) {
        return fresh;
      }
    }

    const requestAgentKeys =
      args.onlyKeys && args.onlyKeys.length > 0
        ? args.onlyKeys
        : !args.forceRefresh &&
            staleTargetKeys.length > 0 &&
            staleTargetKeys.length < targetEntries.length
          ? staleTargetKeys
          : undefined;
    const isFullBatchProbe = wholeBatch && !requestAgentKeys;
    const fetchImpl = args.fetchImpl ?? fetch;

    // Promise.race 兜底而不是只靠 AbortSignal：catalog 的 fetchImpl 可能是
    // 不响应 abort 的通道（或测试里的悬挂 mock），超时必须无条件放行，
    // 否则会把 loadAgentCatalog 自身的 deadline 语义打破。
    const refreshPromise = (async () => {
      const res = await fetchImpl(
        `${serverUrl}/api/agents/quota/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(
            requestAgentKeys && requestAgentKeys.length > 0
              ? { agentKeys: requestAgentKeys }
              : {},
          ),
          signal: AbortSignal.timeout(CATALOG_QUOTA_REFRESH_TIMEOUT_MS),
        },
      );
      if (!res.ok) return;
      const payload: any = await res.json().catch(() => null);
      const quotas = payload?.quotas;
      if (!quotas || typeof quotas !== "object") return;
      const probed = typeof payload?.probed === "number" ? payload.probed : 0;
      const completedAt = Date.now();
      if (probed === 0 && Object.keys(quotas).length === 0) {
        if (isFullBatchProbe) lastRefreshEmptyAt = completedAt;
        return;
      }
      if (wholeBatch) lastRefreshEmptyAt = 0;
      writeQuotaDiskCache(
        cachePath,
        cacheKey,
        quotas as Record<string, AgentQuota>,
        wholeBatch,
        requestAgentKeys ?? targetEntries.map((entry) => entry.key),
        completedAt,
      );
      for (const entry of args.entries) {
        const quota = (quotas as Record<string, AgentQuota>)[entry.key];
        if (quota && Array.isArray(quota.windows)) {
          fresh[entry.key] = quota;
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
    // 静默：展示不依赖额度刷新成功。
  }
  return fresh;
}
