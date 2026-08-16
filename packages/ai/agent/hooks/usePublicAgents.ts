// 文件路径: ai/agent/hooks/usePublicAgents.ts

import { useEffect, useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";

import type { Agent } from "app/types";
import {
  selectCurrentServer,
  selectSyncServers,
} from "app/settings/settingSlice";
import { useUserId } from "identity";
import { toast } from "app/utils/toast";

import { fetchPublicAgents as fetchLocal } from "ai/agent/hooks/fetchPublicAgents";
import {
  dedupeRemotePublicAgents,
  maskRemoteAgentsByLocalTombstones,
  planPublicAgentCatalogView,
  type PublicAgentFilterOptions,
  type PublicAgentListOptions,
  shouldPruneStalePublicAgentCache as shouldPruneStalePublicAgentCacheImpl,
} from "ai/agent/publicAgentCatalog";
import {
  getPublicAgentId,
  getPublicAgentPruneDbKey,
  matchesPublicAgentIdentifiers,
} from "ai/agent/publicAgentIdentity";
import { cacheMergedUserDataThunk } from "database/actions/cacheMergedUserData";
import { remove } from "database/dbSlice";
import { getAllServers } from "database/actions/common";
import { isTombstoneRecord } from "database/tombstones";
import { isAbortError } from "core/abortError";

/* -------------------------------------------------------------------------- */
/* 类型定义                                                                   */
/* -------------------------------------------------------------------------- */

export interface UsePublicAgentsOptions
  extends PublicAgentFilterOptions,
    PublicAgentListOptions {
  /** Filter agents that include this tool in their tools array */
  /** Return list-card metadata only from remote public-agent APIs. */
  summary?: boolean;
  initialData?: Agent[];
  reloadMode?: "preview" | "catalog";
}

interface PublicAgentsState {
  loading: boolean;
  error: Error | null;
  data: Agent[];
}

/* -------------------------------------------------------------------------- */
/* 删除策略：最低投入档——误删抑制开关                                          */
/* -------------------------------------------------------------------------- */

const PRUNE_LIMIT_MULTIPLIER = 5;
const PRUNE_LIMIT_CAP = 500;

export function shouldPruneStalePublicAgentCache({
  searchName,
}: {
  searchName?: string;
}) {
  return shouldPruneStalePublicAgentCacheImpl({ searchName });
}

/* -------------------------------------------------------------------------- */
/* 远程获取（支持 Abort）                                                     */
/* -------------------------------------------------------------------------- */

// 远程请求超时：此前无超时，任一 server 响应慢/挂起时 Promise.allSettled 会等到
// 浏览器默认超时（数十秒），是 explore「超级慢」的直接原因之一。
const REMOTE_FETCH_TIMEOUT_MS = 8_000;

async function fetchRemoteAgents(
  serverUrl: string,
  options: UsePublicAgentsOptions,
  signal?: AbortSignal
): Promise<{ data: Agent[] }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS);
  const onOuterAbort = () => controller.abort();
  if (signal?.aborted) {
    // 外层 signal 在进入前已取消：立即中止，避免后续 fetch 悬挂
    controller.abort();
  } else {
    signal?.addEventListener("abort", onOuterAbort, { once: true });
  }
  try {
    const response = await fetch(`${serverUrl}/rpc/getPublicAgents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Remote fetch failed with status ${response.status}`);
    }

    const data = await response.json();
    return data as { data: Agent[] };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onOuterAbort);
  }
}

/* -------------------------------------------------------------------------- */
/* Hook 主体                                                                  */
/* -------------------------------------------------------------------------- */

export function usePublicAgents({
  limit = 20,
  sortBy = "recommended",
  searchName = "",
  userId,
  imageOutputOnly = false,
  toolName,
  summary = false,
  initialData = [],
  reloadMode = "catalog",
}: UsePublicAgentsOptions = {}) {
  // Intentionally still uses the raw configured server selectors instead of the
  // newer content/runtime helpers. Public-agent discovery is a mixed path:
  // local cache hydration + marketplace-style remote aggregation across the
  // currently configured peers. Keep it out of the local-first content CRUD
  // refactor until the agent marketplace/server-ownership phase.
  const currentServer = useAppSelector(selectCurrentServer);
  const syncServers = useAppSelector(selectSyncServers);
  const currentUserId = useUserId();
  const dispatch = useAppDispatch();
  const { t } = useTranslation();

  const [state, setState] = useState<PublicAgentsState>({
    loading: initialData.length === 0,
    error: null,
    data: initialData,
  });

  const requestIdRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const pendingExcludedIdsRef = useRef<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    const uiOptions: UsePublicAgentsOptions = {
      limit,
      sortBy,
      searchName,
      userId,
      imageOutputOnly,
      toolName,
      summary,
    };
    const myReqId = ++requestIdRef.current;

    // 进入 loading，但保留现有数据；已有数据时不强制 loading，避免 SSR 首屏抖动
    setState((prev) => ({
      ...prev,
      loading: prev.data.length === 0,
      error: null,
    }));

    const excludedIds = pendingExcludedIdsRef.current;
    // 只请求当前站点：public agents 由当前集群独立提供（数据同源），多 server 合并
    // 只增加等待与跨集群 tombstone/缓存互相污染（历史「explore 只有 6/9 个」误判根源之一）。
    const runtimeOrigin =
      typeof window !== "undefined" &&
      typeof window.location?.origin === "string" &&
      /^https?:\/\//.test(window.location.origin)
        ? window.location.origin
        : undefined;
    // currentServer 优先（配置的当前 server 是权威源；runtimeOrigin 兜底桌面/直连场景）
    const servers = [
      ...new Set(
        [currentServer, runtimeOrigin].filter(
          (s): s is string => typeof s === "string" && s.trim().length > 0
        )
      ),
    ];
    const hasRemoteServers = servers.length > 0;

    /* -------------------------- 1) 本地优先渲染 -------------------------- */

    let localResult: { data: Agent[]; tombstones: Array<Record<string, any>> } = {
      data: [],
      tombstones: [],
    };
    let localDataForUi: Agent[] = [];
    let localSortedForFallback: Agent[] = [];

    try {
      localResult = await fetchLocal(uiOptions);
      localDataForUi =
        excludedIds.size > 0
          ? localResult.data.filter(
              (agent) => !matchesPublicAgentIdentifiers(agent, excludedIds)
            )
          : localResult.data;

      if (myReqId !== requestIdRef.current) return;

      localSortedForFallback = planPublicAgentCatalogView({
        localAgents: localDataForUi,
        remoteAgents: [],
        hasAuthoritativeRemoteResult: false,
        currentUserId,
        options: uiOptions,
      }).localFallbackAgents;

      if (!hasRemoteServers) {
        setState((prev) => ({ ...prev, data: localSortedForFallback }));
      }
    } catch {
      // 本地失败不阻塞远程
    }

    /* -------------------------- 2) 构造远程服务器列表 --------------------- */

    // 若没有任何可用远程（离线或未配置），则结束（只保留本地）
    if (servers.length === 0) {
      if (excludedIds.size > 0) {
        const stillPending = new Set(
          Array.from(excludedIds).filter((identifier) =>
            localResult.data.some((agent) =>
              matchesPublicAgentIdentifiers(agent, new Set([identifier]))
            )
          )
        );
        pendingExcludedIdsRef.current = stillPending;
      }
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }

    /* -------------------------- 3) 远程请求 + 合并 ------------------------ */

    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const pruneLimit = Math.min(
        PRUNE_LIMIT_CAP,
        Math.max(limit, limit * PRUNE_LIMIT_MULTIPLIER)
      );
      const remoteOptions: UsePublicAgentsOptions = {
        ...uiOptions,
        limit: pruneLimit,
        summary: summary && !currentUserId,
      };

      const remoteResults = await Promise.allSettled(
        servers.map((server) =>
          fetchRemoteAgents(server, remoteOptions, abortRef.current!.signal)
        )
      );

      if (myReqId !== requestIdRef.current) return;

      const hasAuthoritativeRemoteResult = remoteResults.some(
        (res) => res.status === "fulfilled"
      );
      const remoteData = maskRemoteAgentsByLocalTombstones(
        dedupeRemotePublicAgents(
          remoteResults.flatMap((res, index) => {
            if (res.status !== "fulfilled") return [];
            const originServer = servers[index];
            return (res.value?.data ?? [])
              .filter((agent: Agent) => !isTombstoneRecord(agent))
              .map((agent: Agent) => ({
                ...agent,
                originServer,
              }));
          })
        ),
        localResult.tombstones ?? [],
        { currentUserId }
      );
      const remoteDataForUi =
        excludedIds.size > 0
          ? remoteData.filter(
              (agent) => !matchesPublicAgentIdentifiers(agent, excludedIds)
            )
          : remoteData;

      if (remoteData.length > 0) {
        // Full catalog: persist to clientDb as before.
        // Summary plaza cards: still soft-seed Redux only (via caller seed on
        // hover/open). Full clientDb write of summary rows can overwrite richer
        // records — keep that path gated to non-summary.
        if (!summary) {
          dispatch(cacheMergedUserDataThunk({ records: remoteData }));
        }
      }

      const viewPlan = planPublicAgentCatalogView({
        localAgents: localDataForUi ?? [],
        remoteAgents: remoteDataForUi,
        hasAuthoritativeRemoteResult,
        currentUserId,
        options: uiOptions,
      });

      /* -------------------------- 5) 条件化删除本地缓存 -------------------- */

      const canPruneScene = shouldPruneStalePublicAgentCache({
        searchName,
      });

      if (
        canPruneScene &&
        viewPlan.pruneIds.length > 0 &&
        myReqId === requestIdRef.current
      ) {
        // 提示用户：本地残留但远程权威列表已不存在的公开 AI 正在被清理，
        // 避免「昨晚还在、今天突然没了」的无缘无故感。
        toast.info(
          t("publicAgents.removedFromPlaza", "{{count}} AI removed from the plaza", {
            count: viewPlan.pruneIds.length,
          }),
        );
        viewPlan.pruneIds.forEach((id) => {
          const localItem = localResult.data.find(
            (agent) => getPublicAgentId(agent) === id
          );
          const dbKey = getPublicAgentPruneDbKey(localItem);
          if (dbKey) {
            dispatch(remove(dbKey));
          }
        });
      }

      if (myReqId !== requestIdRef.current) return;

      if (excludedIds.size > 0) {
        const stillPending = new Set(
          Array.from(excludedIds).filter((identifier) => {
            const identifierSet = new Set([identifier]);
            return (
              localResult.data.some((agent) =>
                matchesPublicAgentIdentifiers(agent, identifierSet)
              ) ||
              remoteData.some((agent) =>
                matchesPublicAgentIdentifiers(agent, identifierSet)
              )
            );
          })
        );
        pendingExcludedIdsRef.current = stillPending;
      }

      setState({
        loading: false,
        // allSettled 不会 throw：远程全部失败时（hasAuthoritative=false）必须显式标记
        // error，否则 error UI 永远无法覆盖「远程失败」场景。
        error: hasAuthoritativeRemoteResult
          ? null
          : new Error("public agents remote fetch failed"),
        data: viewPlan.visibleAgents,
      });
    } catch (err: any) {
      if (isAbortError(err)) return;
      if (myReqId !== requestIdRef.current) return;

      // 远程失败：标记 error（UI 显示"加载失败+重试"），不再静默回退本地缓存——
      // 静默 fallback 是历史「explore 只有 6/9 个」误判的根源（缓存不完整还无提示）。
      // 已渲染数据保留（避免白屏闪烁），无数据时才用本地缓存兜底。
      setState((prev) => ({
        ...prev,
        data: prev.data.length > 0 ? prev.data : localSortedForFallback,
        loading: false,
        error: new Error("public agents remote fetch failed"),
      }));
    }
  }, [
    limit,
    sortBy,
    searchName,
    userId,
    imageOutputOnly,
    toolName,
    summary,
    currentServer,
    syncServers,
    currentUserId,
    dispatch,
  ]);

  useEffect(() => {
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [
    fetchData,
    imageOutputOnly,
    initialData.length,
    reloadMode,
    searchName,
    sortBy,
    toolName,
    summary,
    userId,
  ]);

  const retry = useCallback((excludedAgentIds: string[] = []) => {
    if (excludedAgentIds.length > 0) {
      pendingExcludedIdsRef.current = new Set([
        ...pendingExcludedIdsRef.current,
        ...excludedAgentIds.map((value) => String(value)),
      ]);
    }

    setState((prev) => {
      const nextData =
        excludedAgentIds.length > 0
          ? prev.data.filter(
              (agent) =>
                !matchesPublicAgentIdentifiers(
                  agent,
                  new Set(excludedAgentIds.map((value) => String(value)))
                )
            )
          : prev.data;
      return {
        ...prev,
        data: nextData,
        loading:
          reloadMode === "catalog" &&
          excludedAgentIds.length === 0 &&
          nextData.length === 0,
        error: null,
      };
    });
    if (reloadMode === "catalog") {
      fetchData();
    }
  }, [fetchData]);

  return { ...state, retry };
}
