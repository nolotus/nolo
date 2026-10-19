import {
  listFavoriteAgentIdsAcrossServers,
  listLocalCachedAgents,
  listRemoteAgents,
  listRemoteAgentsAcrossServers,
  normalizeListedAgent,
  type ListedAgent,
} from "../agentListHelpers";
import { formatQuotaSummary, type AgentQuota } from "ai/agent/quotaSnapshot";
import { getReadableCliDb } from "../agentCommandSupport";
import type { CliKvDb } from "../client/hybridRecordStore";
import { queryUserRecords, readDbRecord } from "../agentRecordHelpers";
import { readLiveDbRecordAfterTombstoneMerge } from "../globalRecordOperations";
import type { CliFetchImpl } from "../cliFetch";
import {
  parseUserIdFromAuthToken,
  resolveAuthToken,
  resolveServerCandidates,
  resolveServerUrl,
} from "../cliEnvHelpers";
import { sortAgentsFavoriteOwnedPublic, type SortableAgentItem } from "ai/agent/utils/sortUtils";
import { t } from "./i18n";
import { NOLO_DEFAULT_AGENT_KEY } from "../agentAliases";
import {
  BUILTIN_NOLO_AGENT_MODEL,
  BUILTIN_NOLO_AGENT_NAME,
  parseBuiltinPlatformAgentId,
} from "core/builtinAgents";
import { builtinAgentCatalogEntryById } from "core/builtinAgentCatalog";
import { parsePublicAgentId } from "core/prefix";
import { refreshSubscriptionQuotas } from "../subscriptionQuotaRefresh";

// The TUI default is Nolo itself. App Builder is a separate platform agent and
// must never become the implicit fallback when profile/env resolution is absent.
export const DEFAULT_TUI_AGENT_KEY = NOLO_DEFAULT_AGENT_KEY;

export type AgentCatalogEntry = {
  name: string;
  key: string;
  model: string;
  kind: "platform" | "private";
  description?: string;
  updatedAt?: number;
  /** 收藏时间戳（web 收藏功能）；有值时目录排序靠前并显示 ★。 */
  favoritedAt?: number;
  /** 执行来源：platform=平台API  custom=自定义API  cli=订阅制 CLI。 */
  apiSource?: string;
  /** apiSource=cli 时的具体 CLI（copilot/codex/claude 等）。 */
  cliProvider?: string;
  /** 上游最近一次上报的配额窗口快照（无则不显示额度）。 */
  quota?: AgentQuota;
};

/**
 * 来源标签：平台（平台 API）/ API（自定义 API）/ 订阅（订阅制 CLI 工具）。
 * 目录与 picker 统一使用。
 */
export function formatAgentSourceLabel(entry: AgentCatalogEntry): string {
  if (entry.kind === "platform" || entry.apiSource === "platform") return t("agentSourcePlatform");
  if (entry.apiSource === "cli") {
    return entry.cliProvider ? `${t("agentSourceSubscription")}(${entry.cliProvider})` : t("agentSourceSubscription");
  }
  if (entry.apiSource === "custom") return t("agentSourceApi");
  return t("agentSourcePlatform");
}

export const PLATFORM_AGENTS: AgentCatalogEntry[] = [
  {
    // 名称与模型都从 builtinAgentCatalog 派生：`/switch` 里的 nolo 项直接显示
    // 它实际指向的模型（当前 deepseek-flash），换代自动跟随。
    name: BUILTIN_NOLO_AGENT_NAME,
    key: DEFAULT_TUI_AGENT_KEY,
    model: BUILTIN_NOLO_AGENT_MODEL,
    kind: "platform",
    description: "one assistant that routes work across your agents and data",
  },
];

/**
 * 目录展示用的平台 agent 列表：自动路由只剩 flash 一档，不再用合成
 * 「auto」项替换 nolo 项（该项曾用于表示「无显式选择」的 auto 模式），
 * 始终显示默认 agent 名 nolo。
 */
export function resolveCatalogPlatformAgents(
  _env: EnvLike = process.env,
): AgentCatalogEntry[] {
  return PLATFORM_AGENTS;
}

type EnvLike = Record<string, string | undefined>;

function toUpdatedAt(value: string | number | null | undefined) {
  if (value == null) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function listedAgentToCatalogEntry(agent: ListedAgent): AgentCatalogEntry {
  return {
    name: agent.name,
    key: agent.privateKey,
    model: agent.model,
    kind: "private",
    updatedAt: toUpdatedAt(agent.updatedAt),
    ...(agent.apiSource ? { apiSource: agent.apiSource } : {}),
    ...(agent.cliProvider ? { cliProvider: agent.cliProvider } : {}),
    ...(agent.quota ? { quota: agent.quota } : {}),
  };
}

export function mergeCatalogEntries(
  currentKey: string,
  platformAgents: AgentCatalogEntry[],
  privateAgents: AgentCatalogEntry[],
  favoritedAtByKey: Record<string, number> = {},
) {
  const seen = new Set<string>();
  const merged: AgentCatalogEntry[] = [];

  const push = (entry: AgentCatalogEntry) => {
    if (seen.has(entry.key)) return;
    seen.add(entry.key);
    const favoritedAt = favoritedAtByKey[entry.key];
    merged.push(favoritedAt ? { ...entry, favoritedAt } : entry);
  };

  const current =
    [...platformAgents, ...privateAgents].find((entry) => entry.key === currentKey) ?? null;
  if (current) push(current);

  // Always keep the explicit auto/platform choices available. User-owned
  // agents are shown regardless of favorite state; favorites only affect
  // ordering and the star marker.
  for (const entry of platformAgents) {
    if (entry.key !== currentKey) push(entry);
  }

  // The switcher includes every user-owned agent. Favorites are sorted first,
  // followed by the remaining owned agents by their update time.
  const sortablePrivate: SortableAgentItem[] = privateAgents.map((entry) => ({
    key: entry.key,
    ...(favoritedAtByKey[entry.key] !== undefined
      ? { favoritedAt: favoritedAtByKey[entry.key] }
      : {}),
    isOwned: true,
    updatedAt: entry.updatedAt ?? 0,
  }));
  const sortedKeys = sortAgentsFavoriteOwnedPublic(sortablePrivate);
  const sortedKeyOrder = new Map(sortedKeys.map((item, i) => [item.key, i]));
  const sortedPrivate = [...privateAgents].sort(
    (a, b) => (sortedKeyOrder.get(a.key) ?? 0) - (sortedKeyOrder.get(b.key) ?? 0)
  );
  for (const entry of sortedPrivate) {
    if (entry.key !== currentKey) push(entry);
  }

  return merged;
}

type AgentCatalogCacheEntry = {
  cacheKey: string;
  at: number;
  entries: AgentCatalogEntry[];
  /** 这批 entries 对应的 orphan 失败数（随缓存一起命中，口径与数据同源）。 */
  unavailableFavoriteCount: number;
};

/** 原始目录数据（网络拉取结果，不含 currentKey 排序）。 */
export type AgentCatalogRefreshStatus = "success" | "degraded" | "failed";

type RawCatalogData = {
  status: AgentCatalogRefreshStatus;
  privateAgents: AgentCatalogEntry[];
  favoritedAtByKey: Record<string, number>;
  /** 已收藏但 hydrate 失败的条数：>0 时目录视图给一行提示，0 时零额外输出。 */
  unavailableFavoriteCount: number;
};

/** 目录加载结果：条目 + 可见性诊断（提示行用，渲染层不需要猜）。 */
export type AgentCatalogLoadResult = {
  refreshStatus: AgentCatalogRefreshStatus | null;
  entries: AgentCatalogEntry[];
  /**
   * orphan 收藏项 hydrate 失败数（读取抛错/超时）。
   *
   * 口径说明：`readDbRecord` 把 HTTP 状态码编进错误字符串，tombstone merge 又
   * 把多服务器 failures 拼进同一条消息，取不到结构化状态码，因此这里只统计
   * 失败**总数**，不区分 404 与其他错误（不猜类型）。deleted/tombstone 记录
   * 也走抛错路径，同样计入。因 deadline 预算耗尽而主动跳过的 orphan 不计入：
   * 它们由 SWR 后台刷新补齐，不是失败。
   */
  unavailableFavoriteCount: number;
};

/**
 * 提示行文案：仅当失败数 > 0 时返回一行，否则返回 null（成功路径零额外输出）。
 * 目录列表（非交互）与 picker 底部提示共用同一文案。
 */
export function formatUnavailableFavoritesNotice(
  unavailableFavoriteCount: number
): string | null {
  if (!Number.isFinite(unavailableFavoriteCount) || unavailableFavoriteCount <= 0) {
    return null;
  }
  return t(
    "agentCatalogUnavailableFavorites",
    String(Math.floor(unavailableFavoriteCount)),
  );
}

let agentCatalogCache: AgentCatalogCacheEntry | null = null;
let lastRefresh: { cacheKey: string; status: AgentCatalogRefreshStatus } | null = null;

/** Last completed refresh; starting a retry does not erase a failure notice. */
export function getAgentCatalogRefreshStatus(args: { env?: EnvLike } = {}): AgentCatalogRefreshStatus | null {
  const env = args.env ?? process.env;
  const token = resolveAuthToken([], env);
  const key = `${token ? parseUserIdFromAuthToken(token) ?? "anon" : "anon"}|${resolveServerUrl(env)}`;
  return lastRefresh?.cacheKey === key ? lastRefresh.status : null;
}
let agentCatalogRefreshInFlight: Promise<void> | null = null;
// Explicit picker refreshes supersede older startup/SWR cache writes.
let agentCatalogGeneration = 0;
/** 首次加载的 in-flight Promise（原始数据层，不含 currentKey 排序）。 */
/**
 * 按 deadlineKind 分槽：前台调用只复用前台 in-flight，不能加入启动预热的
 * background 请求（8s 预算），否则 /switch 会失去 2.5s 前台上限。
 */
const agentCatalogRawLoadInFlight = new Map<
  "foreground" | "background",
  Promise<RawCatalogData>
>();

/** 缓存「新鲜」窗口：窗口内重复打开 /agent 不再触发后台刷新。 */
const AGENT_CATALOG_FRESH_MS = 15_000;
/** Hard limit: older snapshots must synchronously revalidate. */
export const AGENT_CATALOG_MAX_STALE_MS = 5 * 60_000;

/**
 * 目录网络请求截止时间：跨服务器用 Promise.all 合并，最慢的服务器决定整体耗时。
 * 实测（2026-09）备用服务器 us.nolo.chat 曾出现 3.5s~10s 的查询耗时，把首次
 * /switch 冷加载拖到 7~10s。前台等待有上限，超时的服务器放弃、走既有降级链
 * （本地 DB / 单服务器重试）；后台刷新用更宽的预算，慢服务器最终仍能合并进缓存。
 */
const AGENT_CATALOG_FOREGROUND_DEADLINE_MS = 2_500;
const AGENT_CATALOG_BACKGROUND_DEADLINE_MS = 8_000;

/** 测试与调优入口：NOLO_TUI_CATALOG_DEADLINE_MS 覆盖两档默认值。 */
export function resolveCatalogDeadlineMs(
  kind: "foreground" | "background",
  env: EnvLike,
): number {
  const override = Number.parseInt(env.NOLO_TUI_CATALOG_DEADLINE_MS ?? "", 10);
  if (Number.isFinite(override) && override > 0) return override;
  return kind === "foreground"
    ? AGENT_CATALOG_FOREGROUND_DEADLINE_MS
    : AGENT_CATALOG_BACKGROUND_DEADLINE_MS;
}

/**
 * 慢/挂死服务器熔断：前台跨服务器请求失败（含截止超时）的服务器进入冷却，
 * 冷却期内前台请求只打其余服务器；后台刷新用完整 server 列表探活，恢复即复位。
 * 实测（2026-09）us.nolo.chat 持续挂死时，主站 55ms 就能出全量数据，
 * 无熔断的话每次冷加载都要陪慢服务器吃满 2.5s 截止时间。
 */
const SERVER_TRIP_AFTER_CONSECUTIVE_FAILURES = 1;
const SERVER_COOLDOWN_MS = 5 * 60_000;

type ServerHealthState = {
  consecutiveFailures: number;
  trippedAt: number;
};

const serverHealth = new Map<string, ServerHealthState>();

/** 测试与显式刷新用：清空熔断状态。 */
export function resetServerHealthForTest() {
  serverHealth.clear();
}

/** 供测试注入时间源，生产 undefined（用 Date.now）。 */
let serverHealthNow: () => number = () => Date.now();

export function setServerHealthClockForTest(now: () => number) {
  serverHealthNow = now;
}

/** 前台视角的可用服务器列表：冷却中的服务器被熔断跳过。 */
export function filterHealthyServers(serverUrls: string[]): string[] {
  const now = serverHealthNow();
  const healthy = serverUrls.filter((url) => {
    const state = serverHealth.get(url);
    if (!state) return true;
    return !(
      state.consecutiveFailures >= SERVER_TRIP_AFTER_CONSECUTIVE_FAILURES &&
      now - state.trippedAt < SERVER_COOLDOWN_MS
    );
  });
  // 全部都在冷却时放行全量（宁可慢也不能一个服务器都不打）。
  return healthy.length > 0 ? healthy : serverUrls;
}

/**
 * 主站永不被前台熔断：它是收藏/自有 agent 的权威来源，偶发压线超时就被跳过
 * 5 分钟，会让 /switch 只显示备用服务器的残缺列表。熔断只用来跳过备用服务器。
 */
function keepPrimaryServer(serverUrls: string[], primary: string): string[] {
  return serverUrls.includes(primary) ? serverUrls : [primary, ...serverUrls];
}

function recordServerFailures(failures: Array<{ serverUrl: string }>) {
  const now = serverHealthNow();
  for (const failure of failures) {
    const state = serverHealth.get(failure.serverUrl) ?? {
      consecutiveFailures: 0,
      trippedAt: 0,
    };
    state.consecutiveFailures += 1;
    if (state.consecutiveFailures >= SERVER_TRIP_AFTER_CONSECUTIVE_FAILURES) {
      state.trippedAt = now;
    }
    serverHealth.set(failure.serverUrl, state);
  }
}

function recordServerSuccesses(serverUrls: string[]) {
  for (const url of serverUrls) serverHealth.delete(url);
}

/**
 * 给 fetchImpl 套一层截止时间：到点后 Promise 以可识别错误 reject，
 * 上层降级链（本地 DB / 单服务器重试）接手。
 * 注意不能因 init.signal 已存在就旁路：fetchWithTransportFallback 会给
 * 无 signal 的请求自动挂 AbortSignal.timeout(10s)，旁路会让截止时间失效。
 */
export function withFetchDeadline(
  fetchImpl: CliFetchImpl,
  deadlineMs: number,
): CliFetchImpl {
  return async (input, init) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`catalog fetch deadline exceeded (${deadlineMs}ms)`)),
        deadlineMs,
      );
    });
    const signal = init?.signal;
    let onAbort: (() => void) | undefined;
    let aborted: Promise<never> | null = null;
    if (signal) {
      if (signal.aborted) {
        // 已 abort 的 signal 不能参与竞速：fetch 可能立即成功而 abort 永不触发，
        // 调用方语义（放弃此次请求）会被静默吞掉。
        throw signal.reason ?? new Error("catalog fetch aborted");
      }
      aborted = new Promise<never>((_, reject) => {
        onAbort = () => reject(signal.reason ?? new Error("catalog fetch aborted"));
        signal.addEventListener("abort", onAbort, { once: true });
      });
    }
    try {
      // 头部与 body 都在截止时间内：实测慢服务器会出现「响应头先到、body 挂死」，
      // 只竞速 headers 的话 res.text() 仍会被底层 10s abort 拖住。
      // 目录链路的消费方全部只读 text，缓冲 body 不改变语义。
      const response = await Promise.race([
        fetchImpl(input, init),
        deadline,
        ...(aborted ? [aborted] : []),
      ]);
      const text = await Promise.race([
        response.text(),
        deadline,
        ...(aborted ? [aborted] : []),
      ]);
      return new Response(text, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } finally {
      if (timer) clearTimeout(timer);
      // 摘除 listener，避免长期存活的 signal 上累积闭包。
      if (signal && onAbort) signal.removeEventListener("abort", onAbort);
    }
  };
}

/** 清空目录缓存（测试与显式刷新用）。 */
export function invalidateAgentCatalogCache() {
  agentCatalogGeneration++;
  agentCatalogCache = null;
  lastRefresh = null;
  agentCatalogRawLoadInFlight.clear();
}

/** 检查当前环境是否已有热目录缓存。 */
export function hasWarmAgentCatalogCache(args: { env?: EnvLike } = {}): boolean {
  const env = args.env ?? process.env;
  const authToken = resolveAuthToken([], env);
  const userId = authToken ? parseUserIdFromAuthToken(authToken) : null;
  const cacheKey = `${userId ?? "anon"}|${resolveServerUrl(env)}`;
  return agentCatalogCache?.cacheKey === cacheKey &&
    Date.now() - agentCatalogCache.at < AGENT_CATALOG_MAX_STALE_MS;
}

/** 等待正在进行的后台刷新完成（测试及显式同步使用）。 */
export async function waitForAgentCatalogBackgroundRefresh(): Promise<void> {
  while (agentCatalogRefreshInFlight) {
    await agentCatalogRefreshInFlight;
  }
}

/**
 * SWR 目录加载：
 * - 无缓存 → 前台拉取（仅会话首次），复用 in-flight Promise 避免重复请求；
 * - 有缓存 → 立即返回旧数据；超过新鲜窗口则在后台刷新，
 *   新建的 agent 最迟下次打开出现（不会永远看不到）。
 *
 * 返回纯条目数组（历史契约，调用方大多只需要列表）。需要「收藏项取不回来」的
 * 可见性诊断时用 loadAgentCatalogWithNotices。
 */
export async function loadAgentCatalog(
  args: LoadAgentCatalogArgs
): Promise<AgentCatalogEntry[]> {
  return (await loadAgentCatalogWithNotices(args)).entries;
}

export type LoadAgentCatalogArgs = {
  env?: EnvLike;
  currentKey: string;
  fetchImpl?: CliFetchImpl;
  fallbackFetchImpl?: CliFetchImpl;
  /** 测试注入：替代 getReadableCliDb 的本地 DB 降级通道。生产中 undefined。 */
  getDb?: () => Promise<unknown>;
  /** 启动预热用 background：用户没在等，给慢主站足够预算，避免误触熔断。 */
  deadlineKind?: "foreground" | "background";
  /** Revalidate before opening a picker instead of serving the SWR snapshot. */
  fresh?: boolean;
  /** When serving from cache, trigger a background revalidation. Defaults to true when fresh is not set. */
  revalidateInBackground?: boolean;
};

/** 同 loadAgentCatalog，额外带出 orphan 失败数（目录视图提示行用）。 */
export async function loadAgentCatalogWithNotices(
  args: LoadAgentCatalogArgs
): Promise<AgentCatalogLoadResult> {
  const env = args.env ?? process.env;
  const authToken = resolveAuthToken([], env);
  const userId = authToken ? parseUserIdFromAuthToken(authToken) : null;
  const cacheKey = `${userId ?? "anon"}|${resolveServerUrl(env)}`;
  const cached =
    agentCatalogCache?.cacheKey === cacheKey ? agentCatalogCache : null;

  if (cached && !args.fresh && Date.now() - cached.at < AGENT_CATALOG_MAX_STALE_MS) {
    const refreshStatus = getAgentCatalogRefreshStatus({ env });
    if (args.revalidateInBackground || Date.now() - cached.at >= AGENT_CATALOG_FRESH_MS) {
      refreshAgentCatalogInBackground(args, env, cacheKey);
    }
    if (args.currentKey && cached.entries.length > 1 && cached.entries[0]?.key !== args.currentKey) {
      const idx = cached.entries.findIndex((entry) => entry.key === args.currentKey);
      if (idx > 0) {
        return {
          entries: [
            cached.entries[idx]!,
            ...cached.entries.slice(0, idx),
            ...cached.entries.slice(idx + 1),
          ],
          refreshStatus,
          unavailableFavoriteCount: cached.unavailableFavoriteCount,
        };
      }
    }
    return {
      entries: cached.entries,
      refreshStatus,
      unavailableFavoriteCount: cached.unavailableFavoriteCount,
    };
  }

  // 复用已有的原始数据请求（prefetch 触发后用户很快 /switch 时命中），
  // 然后用调用方自己的 currentKey 做排序合并——避免 prefetch 的空 key 影响排序。
  let rawData: RawCatalogData;
  const generation = args.fresh ? ++agentCatalogGeneration : agentCatalogGeneration;
  const deadlineKind = args.fresh ? "foreground" : args.deadlineKind ?? "foreground";
  const inFlight = agentCatalogRawLoadInFlight.get(deadlineKind);
  if (inFlight) {
    rawData = await inFlight;
  } else {
    const promise = fetchRawCatalogData({ ...args, deadlineKind }, env);
    agentCatalogRawLoadInFlight.set(deadlineKind, promise);
    try {
      rawData = await promise;
    } finally {
      if (agentCatalogRawLoadInFlight.get(deadlineKind) === promise) {
        agentCatalogRawLoadInFlight.delete(deadlineKind);
      }
    }
  }

  const entries = mergeCatalogEntries(
    args.currentKey,
    resolveCatalogPlatformAgents(env),
    rawData.privateAgents,
    rawData.favoritedAtByKey,
  );
  // 先落缓存让 picker 立即出列表：订阅额度探测（一次 /api/agents/quota/refresh
  // 往返，正常 ~300ms、慢时吃满 2s 预算）不再占用 /switch 冷加载关键路径。
  if (generation === agentCatalogGeneration) {
    lastRefresh = { cacheKey, status: rawData.status };
  }
  if (generation === agentCatalogGeneration && rawData.status === "success") {
    agentCatalogCache = {
      cacheKey,
      at: Date.now(),
      entries,
      unavailableFavoriteCount: rawData.unavailableFavoriteCount,
    };
  }
  // 额度只是行尾 [quota] 的展示增强——fire-and-forget：探测在后台跑，
  // mergeCatalogQuotas resolve 后就地写 entry.quota（mutate-in-place），
  // 若此刻 agentCatalogCache?.entries 仍是这批 entries，缓存条目自动获得
  // quota，下次 /switch（fresh 窗口内返回同一份缓存）即可见；若缓存已被
  // 后台 SWR 刷新或失效覆盖，结果随这批 entries 一起丢弃——两种情形都
  // 无需额外动作，也绝不能重建/重设 agentCatalogCache.at，否则配额探测
  // 会白送缓存新鲜窗口、延长缓存寿命。探测本身失败静默。
  void mergeCatalogQuotas(entries, { env, fetchImpl: args.fetchImpl }).catch(() => {});
  return { entries, unavailableFavoriteCount: rawData.unavailableFavoriteCount, refreshStatus: rawData.status };
}

/** 按需探测额度并就地合并进目录条目（平台条目永远没有 quota，不探测）。 */
async function mergeCatalogQuotas(
  entries: AgentCatalogEntry[],
  args: { env?: EnvLike; fetchImpl?: CliFetchImpl },
): Promise<void> {
  const fresh = await refreshSubscriptionQuotas({
    entries: entries.map((entry) => ({
      key: entry.key,
      ...(entry.quota ? { quota: entry.quota } : {}),
      probeable: entry.kind === "private",
    })),
    ...(args.env ? { env: args.env } : {}),
    ...(args.fetchImpl ? { fetchImpl: args.fetchImpl } : {}),
  });
  for (const entry of entries) {
    const quota = fresh[entry.key];
    if (quota) entry.quota = quota;
  }
}

function refreshAgentCatalogInBackground(
  args: {
    env?: EnvLike;
    currentKey: string;
    fetchImpl?: CliFetchImpl;
    fallbackFetchImpl?: CliFetchImpl;
  },
  env: EnvLike,
  cacheKey: string,
) {
  if (agentCatalogRefreshInFlight) return;
  const generation = agentCatalogGeneration;
  agentCatalogRefreshInFlight = fetchRawCatalogData(
    { ...args, deadlineKind: "background" },
    env,
  )
    .then(async (rawData) => {
      if (generation !== agentCatalogGeneration) return;
      lastRefresh = { cacheKey, status: rawData.status };
      // Only authoritative results may replace the retained snapshot.
      if (rawData.status !== "success") return;
      const entries = mergeCatalogEntries(
        args.currentKey,
        resolveCatalogPlatformAgents(env),
        rawData.privateAgents,
        rawData.favoritedAtByKey,
      );
      await mergeCatalogQuotas(entries, { env, fetchImpl: args.fetchImpl });
      if (generation === agentCatalogGeneration) {
        agentCatalogCache = {
          cacheKey,
          at: Date.now(),
          entries,
          unavailableFavoriteCount: rawData.unavailableFavoriteCount,
        };
      }
    })
    .catch(() => {
      if (generation === agentCatalogGeneration) lastRefresh = { cacheKey, status: "failed" };
      // 后台刷新失败：保留旧缓存，下次打开再试。
    })
    .finally(() => {
      agentCatalogRefreshInFlight = null;
    });
}

/**
 * Local DB prefill is intentionally disabled for the favorites-only switcher.
 * Cached Agent records do not contain authoritative favorite metadata, so using
 * them would briefly show agents the user did not select.
 */
export async function prefillCatalogFromLocalDb(_args: {
  env?: EnvLike;
  getDb?: () => Promise<unknown>;
}): Promise<void> {
  // Keep the hook for startup callers; the server response is the source of truth.
}

/** 启动预热：后台刷新收藏目录缓存（fire-and-forget）。 */
export function prefetchAgentCatalog(args: {
  env?: EnvLike;
  fetchImpl?: CliFetchImpl;
  /** 测试注入：用假的 DB 替代 getReadableCliDb。生产中 undefined。 */
  getDb?: () => Promise<unknown>;
}) {
  void (async () => {
    // 收藏元数据必须来自服务器；本地缓存不能作为 favorites-only 列表来源。
    await prefillCatalogFromLocalDb({ env: args.env, getDb: args.getDb }).catch(() => {});
    // 后台网络请求刷新收藏目录缓存（SWR，后台失败静默）。
    // 用 background 截止时间：主站实测 1.5~2.5s，压线 2.5s 前台预算时会被
    // 记为失败并熔断 5 分钟，导致此后 /switch 只拿到备用服务器的残缺列表。
    void loadAgentCatalog({ ...args, currentKey: "", deadlineKind: "background" }).catch(() => {});
  })();
}

/**
 * 原始数据拉取：只做网络请求，不做 currentKey 排序。
 * in-flight dedup 作用在这一层，保证不同 currentKey 的调用者都能复用同一次网络请求。
 */
async function fetchRawCatalogData(
  args: {
    env?: EnvLike;
    currentKey: string;
    deadlineKind?: "foreground" | "background";
    fetchImpl?: CliFetchImpl;
    fallbackFetchImpl?: CliFetchImpl;
    /** 测试注入：替代 getReadableCliDb 的本地 DB 降级通道。生产中 undefined。 */
    getDb?: () => Promise<unknown>;
  },
  env: EnvLike,
): Promise<RawCatalogData> {
  const deadlineMs = resolveCatalogDeadlineMs(args.deadlineKind ?? "foreground", env);
  const fetchImpl = withFetchDeadline(args.fetchImpl ?? fetch, deadlineMs);
  const fallbackFetchImpl = args.fallbackFetchImpl
    ? withFetchDeadline(args.fallbackFetchImpl, deadlineMs)
    : undefined;
  const authToken = resolveAuthToken([], env);
  const userId = authToken ? parseUserIdFromAuthToken(authToken) : null;

  if (!authToken || !userId) {
    return { privateAgents: [], favoritedAtByKey: {}, unavailableFavoriteCount: 0, status: "success" };
  }

  const serverUrl = resolveServerUrl(env);
  const allServerUrls = resolveServerCandidates([], env, serverUrl);
  // 后台刷新不熔断（探活恢复）；前台跳过冷却中的慢/挂死服务器。
  const serverUrls =
    (args.deadlineKind ?? "foreground") === "foreground"
      ? keepPrimaryServer(filterHealthyServers(allServerUrls), serverUrl)
      : allServerUrls;
  const fetchStartedAt = performance.now();
  // 保留原始 ListedAgent[]，供 orphan hydrate 做三键（privateKey/publicKey/id）去重，
  // 与 agentListCommands.ts 的 `nolo agent list --safe` 对齐，避免同一 agent 重复入目。
  let listedAgents: ListedAgent[] = [];
  let catalogAuthoritative = false;
  let catalogAvailable = false;
  let favoritesFailed = false;
  // 收藏列表与目录并行；保留失败诊断，不能把失败当作权威空收藏。
  const favoritesPromise = listFavoriteAgentIdsAcrossServers({
    authToken,
    fetchImpl,
    serverUrls,
    onFailure: () => { favoritesFailed = true; },
  }).catch(() => { favoritesFailed = true; return {} as Record<string, number>; });

  try {
    const remoteResult = await listRemoteAgentsAcrossServers({
      authToken,
      fallbackFetchImpl,
      fetchImpl,
      serverUrls,
      userId,
    });
    listedAgents = remoteResult.agents;
    catalogAvailable = true;
    catalogAuthoritative = remoteResult.failures.length === 0 && serverUrls.length === allServerUrls.length;
    // A successful empty result is authoritative, including after tombstone
    // merge. All-server failure already throws in listUserRecordsFromServers;
    // falling back on emptiness would revive historical local agents.
    recordServerSuccesses(serverUrls.filter((url) =>
      !remoteResult.failures.some((f) => f.serverUrl === url)
    ));
    recordServerFailures(remoteResult.failures);
  } catch {
    try {
      // 本地降级同样受截止时间约束（至少留 500ms）：本地库慢/被锁时不能让
      // /switch 无限停在「正在加载」，超时继续走单服务器重试或空目录。
      const localBudgetMs = Math.max(
        500,
        deadlineMs - (performance.now() - fetchStartedAt),
      );
      let localTimer: ReturnType<typeof setTimeout> | undefined;
      try {
        listedAgents = await Promise.race([
          (async () => {
            const db = args.getDb
              ? (await args.getDb() as CliKvDb)
              : await getReadableCliDb({ write: () => {} });
            return listLocalCachedAgents({ db, userId });
          })(),
          new Promise<never>((_, reject) => {
            localTimer = setTimeout(
              () => reject(new Error("local catalog deadline exceeded")),
              localBudgetMs,
            );
          }),
        ]);
        catalogAvailable = true;
      } finally {
        if (localTimer) clearTimeout(localTimer);
      }
    } catch {
      try {
        listedAgents = await listRemoteAgents({
          authToken,
          fallbackFetchImpl,
          fetchImpl,
          serverUrl,
          userId,
          queryUserRecords,
          readDbRecord,
        });
        catalogAvailable = true;
      } catch {
        // 所有通道（跨服务器查询 / 本地 DB / 单服务器重试）都不可用：
        // 返回空私有目录（仅平台内置项可切换），而不是把异常抛给 TUI 交互流。
        listedAgents = [];
      }
    }
  }
  const privateAgents = listedAgents.map(listedAgentToCatalogEntry);

  const favoritedAtByKey = await favoritesPromise;
  // A favorite may be keyed by publicKey while the switcher uses privateKey.
  for (const agent of listedAgents) {
    const favoritedAt = [agent.privateKey, agent.publicKey, agent.id]
      .map((key) => favoritedAtByKey[key])
      .find((value) => value !== undefined);
    if (favoritedAt !== undefined) favoritedAtByKey[agent.privateKey] = favoritedAt;
  }
  // orphan favorite hydrate：把「已收藏但不在 listRemoteAgentsAcrossServers 返回里」
  // 的 agent（典型是收藏的别人/公开 agent，或跨服务器、刚收藏未同步的记录）从各服务器
  // 按 dbKey 重新读回并并入目录，对齐 web 端 useAgentPickerCandidates 与 CLI
  // `nolo agent list --safe`（agentListCommands.ts）的兜底行为，避免 /switch 漏项。
  // 单个 orphan 读取失败不阻塞目录加载，但会**计数**并在目录视图给一行聚合提示
  // （formatUnavailableFavoritesNotice）：用户至少能看到「有收藏项取不回来」，
  // 而不是让收藏凭空消失。失败只在计数器上多一次自增，成功路径零额外开销。
  // 三键去重：与 agentListCommands.ts 一致，privateKey/publicKey/id 任一命中即视为已存在，
  // 防止「自有 public agent 以 publicKey 形态被收藏」时同一 agent 重复入目。
  const existingKeys = new Set<string>();
  for (const agent of listedAgents) {
    existingKeys.add(agent.privateKey);
    existingKeys.add(agent.publicKey);
    existingKeys.add(agent.id);
  }
  let unavailableFavoriteCount = 0;
  let orphanSkipped = false;

  // orphan 读取共享同一个 deadline 预算：目录主链路（agents + favorites）用掉的
  // 时间从预算里扣，剩余不足时跳过剩余 orphan——错过项由 SWR 后台刷新补齐，
  // 不能让兜底读取把首次 /switch 再次拖过预算。
  await Promise.all(
    Object.keys(favoritedAtByKey).map(async (favKey) => {
      if (existingKeys.has(favKey)) return;
      const remainingMs = deadlineMs - (performance.now() - fetchStartedAt);
      if (remainingMs <= 0) { orphanSkipped = true; return; }
      try {
        let orphanTimer: ReturnType<typeof setTimeout> | undefined;
        const orphanDeadline = new Promise<never>((_, reject) => {
          orphanTimer = setTimeout(
            () => reject(new Error("orphan hydrate deadline")),
            remainingMs,
          );
        });
        try {
          const favRead = await Promise.race([
            readLiveDbRecordAfterTombstoneMerge({
              authToken,
              dbKey: favKey,
              fallbackFetchImpl,
              fetchImpl,
              serverUrls,
            }),
            orphanDeadline,
          ]);
          void orphanTimer; // cleared in finally below
          const record = favRead.record;
          if (!record || (record.type && record.type !== "agent")) return;
          const norm = normalizeListedAgent(record);
          if (!norm) return;
          // 同源去重：normalize 后的 privateKey/publicKey/id 任一已存在则跳过
          if (
            existingKeys.has(norm.privateKey) ||
            existingKeys.has(norm.publicKey) ||
            existingKeys.has(norm.id)
          ) {
            return;
          }
          existingKeys.add(norm.privateKey);
          existingKeys.add(norm.publicKey);
          existingKeys.add(norm.id);
          privateAgents.push(listedAgentToCatalogEntry(norm));
        } finally {
          if (orphanTimer) clearTimeout(orphanTimer);
        }
      } catch {
        // orphan 读取失败（404/网络/授权/orphan 超时/tombstone 记录）：不阻塞目录，
        // 只做一次计数自增，聚合后在目录视图给一行提示。
        unavailableFavoriteCount += 1;
      }
    }),
  );


  const status: AgentCatalogRefreshStatus = !catalogAvailable && favoritesFailed
    ? "failed"
    : catalogAuthoritative && !favoritesFailed && unavailableFavoriteCount === 0 && !orphanSkipped
      ? "success" : "degraded";
  return { privateAgents, favoritedAtByKey, unavailableFavoriteCount, status };
}

export function renderAgentCatalogList(
  entries: AgentCatalogEntry[],
  currentKey: string,
  options?: {
    /** orphan 收藏项失败数：>0 时多渲染一行提示，0/缺省时输出与以前逐字节一致。 */
    unavailableFavoriteCount?: number;
  },
) {
  const lines = ["Agents:"];
  entries.forEach((entry, index) => {
    const current = entry.key === currentKey ? " (current)" : "";
    const favorite = entry.favoritedAt ? " ★" : "";
    const detail = entry.description ? ` — ${entry.description}` : "";
    // 额度和 description 互斥：有额度时额度信息优先（更能影响选人决策），
    // 否则回退平台条目的 description（nolo 默认条目没有 quota）。
    const quota = formatQuotaSummary(entry.quota);
    const trailing = quota ? ` [${quota}]` : detail;
    lines.push(
      `  ${String(index + 1).padStart(2)}  ${entry.name.padEnd(18)} ${entry.model.padEnd(14)} ${formatAgentSourceLabel(entry)}${favorite}${trailing}${current}`
    );
  });
  lines.push("");
  const notice = formatUnavailableFavoritesNotice(
    options?.unavailableFavoriteCount ?? 0,
  );
  if (notice) lines.push(notice);
  lines.push("Tip: run /switch in an interactive terminal to pick with ↑↓.");
  return lines.join("\n");
}

/**
 * `/switch <target>` 解析出的切换目标。
 *
 * 显式写出返回类型，而不是让 4 个分支各自推断出一个联合类型——改这个函数的人
 * （或 AI）不该被迫读完所有分支才知道契约。`model` / `apiSource` 可缺省：
 * 目录外的陌生 key 只能给出 key 本身。
 */
export type AgentSwitchTarget = {
  name: string;
  key: string;
  model?: string;
  apiSource?: string;
};

/**
 * 目录条目的来源标记：显式 apiSource 优先，其次平台条目算 "platform"，
 * 其余（用户自建、来源未知）不标。三个分支曾各自内联同一段三元表达式。
 */
function resolveEntryApiSource(entry: {
  apiSource?: string;
  kind?: string;
}): string | undefined {
  if (entry.apiSource) return entry.apiSource;
  return entry.kind === "platform" ? "platform" : undefined;
}

function toSwitchTarget(entry: AgentCatalogEntry): AgentSwitchTarget {
  const apiSource = resolveEntryApiSource(entry);
  return {
    name: entry.name,
    key: entry.key,
    model: entry.model,
    ...(apiSource ? { apiSource } : {}),
  };
}

export function findAgentCatalogEntry(
  entries: AgentCatalogEntry[],
  rawTarget: string
): AgentSwitchTarget | null {
  const target = rawTarget.trim();
  if (!target) return null;

  // 1) 列表序号
  if (/^\d+$/.test(target)) {
    const entry = entries[Number(target) - 1];
    return entry ? toSwitchTarget(entry) : null;
  }

  // 2) 名字 / key / key 后缀
  const lower = target.toLowerCase();
  const byName = entries.find(
    (entry) =>
      entry.name.toLowerCase() === lower ||
      entry.key.toLowerCase() === lower ||
      entry.key.toLowerCase().endsWith(`-${lower}`)
  );
  if (byName) return toSwitchTarget(byName);

  // 3) 目录里没有的 agent key（未登录、目录还没加载完、或切的是别人的 agent）。
  //    平台内置 agent 仍能从 builtinAgentCatalog 拿到真名与模型——直接把 key
  //    当显示名会连着 persistAgentSelection 一起把裸 key 写进 profile 的
  //    agentName，状态行随后显示一长串 `agent-pub-01…`。
  if (target.startsWith("agent-") || target.startsWith("agent-pub-")) {
    const builtin = builtinAgentCatalogEntryById(
      parseBuiltinPlatformAgentId(target) ?? parsePublicAgentId(target),
    );
    if (builtin) {
      return {
        name: builtin.name,
        key: target,
        model: builtin.model,
        apiSource: builtin.apiSource ?? "platform",
      };
    }
    return { name: target, key: target };
  }

  return null;
}
