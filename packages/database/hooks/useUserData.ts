// database/hooks/useUserData.ts
import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  selectRuntimeRemoteServers,
  selectRuntimeSnapshot,
} from "app/stateViews/runtime";
import { toast } from "app/utils/toast";

import { DataType } from "create/types";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  getItemKey,
  getUserDataItemTimestamp,
  mergeAndDedupUserData,
} from "../userDataMerge";
import { isTombstoneRecord } from "../tombstones";
import { getUserDataLoadDecision } from "../userDataLoadDecision";

import { fetchUserDataThunk } from "../actions/fetchUserData";
import { cacheMergedUserDataThunk } from "../actions/cacheMergedUserData";
import { noloQueryRequest } from "../client/queryRequest";

interface BaseItem {
  id?: string;
  type?: DataType | string;
  updatedAt?: string | number;
  created?: string | number;
  userId?: string;
  [key: string]: unknown;
}

const isBaseItem = (value: unknown): value is BaseItem =>
  value !== null && typeof value === "object";

interface FetchState {
  loading: boolean;
  error: Error | null;
  data: BaseItem[];
}

interface UseUserDataReturn extends FetchState {
  reload: () => Promise<void>;
  clearCache: () => void;
}

interface UseUserDataOptions {
  allowPartialData?: boolean;
  partialDataStrategy?: PartialDataStrategy;
  remoteSummary?: boolean;
  /**
   * ponytail: recycle bin uses the same fetch + merge path, just keeps
   * only tombstoned records instead of dropping them.
   */
  trashOnly?: boolean;
  /**
   * When true, always query the device-local "local" owner and never
   * fall back to the active account or remote servers. This keeps local
   * records visible after login without leaking them across accounts.
   */
  localOnly?: boolean;
}

export type PartialDataStrategy = "always" | "never" | "hydrated-cache";

const shouldDebugUserData =
  typeof window !== "undefined" &&
  !!window.location &&
  typeof window.location.hostname === "string" &&
  /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);

const summarizeItemsByType = (items: BaseItem[]): Record<string, number> => {
  return items.reduce<Record<string, number>>((acc, item) => {
    const key =
      (typeof item.type === "string" && item.type.trim()) ||
      (typeof item.appKey === "string" && item.appKey.startsWith("app-") ? DataType.APP : "unknown");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
};

const summarizeAppKeys = (items: BaseItem[]): string[] => {
  return items
    .filter((item) => {
      const candidates = [item.dbKey, item.contentKey, item.appKey];
      return candidates.some(
        (candidate) => typeof candidate === "string" && candidate.startsWith("app-")
      );
    })
    .slice(0, 12)
    .map(
      (item) =>
        item.dbKey ??
        item.contentKey ??
        item.appKey ??
        item.appId ??
        item.id
    )
    .filter((candidate): candidate is string => typeof candidate === "string");
};

const __udPerf = typeof window !== "undefined" && localStorage.getItem("debugPerf") === "1"
  ? ((window as any).__userDataPerf ??= {
      marks: {} as Record<string, number>,
      start(label: string) { this.marks[label] = performance.now(); },
      end(label: string) {
        const t = this.marks[label];
        if (t !== undefined) {
          const ms = performance.now() - t;
          console.debug(`[USERDATA-PERF] ${label}: ${ms.toFixed(1)}ms`);
          delete this.marks[label];
        }
      },
    })
  : null;

const debugUserData = (
  phase: string,
  payload: Record<string, unknown>
) => {
  if (!shouldDebugUserData) return;
  console.debug(`[useUserData] ${phase}`, payload);
};

export const buildUserDataHydrationKey = ({
  userId,
  typesKey,
  serverKey,
}: {
  userId: string;
  typesKey: string;
  serverKey: string;
}): string => `nolo-user-data-hydrated:${userId}:${typesKey}:${serverKey}`;

export const buildUserDataTombstoneSafeHydrationKey = ({
  userId,
  typesKey,
  serverKey,
}: {
  userId: string;
  typesKey: string;
  serverKey: string;
}): string =>
  `nolo-user-data-hydrated:v2:summary-tombstone-safe:${userId}:${typesKey}:${serverKey}`;

const readHydratedUserDataCacheFlag = (hydrationKey: string): boolean => {
  if (typeof window === "undefined" || !hydrationKey) return false;
  try {
    return window.localStorage.getItem(hydrationKey) === "1";
  } catch {
    return false;
  }
};

const markHydratedUserDataCacheFlag = (hydrationKey: string) => {
  if (typeof window === "undefined" || !hydrationKey) return;
  try {
    window.localStorage.setItem(hydrationKey, "1");
  } catch {
    // Best-effort local UI optimization only.
  }
};

export const shouldUsePartialLocalData = ({
  strategy,
  hasHydratedCache,
  localItemCount,
}: {
  strategy: PartialDataStrategy;
  hasHydratedCache: boolean;
  localItemCount: number;
}): boolean => {
  if (strategy === "never") return false;
  if (strategy === "hydrated-cache") {
    return hasHydratedCache && localItemCount > 0;
  }
  return true;
};

export const resolveEffectiveUserId = ({
  requestedUserId,
  currentUserId,
  currentToken,
  localOnly,
}: {
  requestedUserId: string;
  currentUserId?: string | null;
  currentToken?: string | null;
  localOnly?: boolean;
}): string => {
  if (localOnly) return "local";
  if (requestedUserId === "local" && currentToken && currentUserId) {
    return currentUserId;
  }
  return requestedUserId;
};

const withServerOrigin = (items: BaseItem[], serverOrigin: string) =>
  items.map((item) => ({
    ...item,
    serverOrigin,
  }));

const extractRemoteItems = async (
  response: Response,
  serverOrigin: string
): Promise<BaseItem[]> => {
  const data: unknown = await response.json();
  const envelope = data && typeof data === "object" && "data" in data ? data.data : undefined;
  const nested = envelope && typeof envelope === "object" && "data" in envelope ? envelope.data : undefined;
  const items = Array.isArray(nested) ? nested.filter(isBaseItem) : [];
  return withServerOrigin(items, serverOrigin);
};

export type RemoteUserDataResult = { data: { data: BaseItem[] }; ok: boolean };

export const getItemTimestamp = (dataItem: BaseItem): number =>
  getUserDataItemTimestamp(dataItem);

/**
 * Deterministic comparator: newest updatedAt first, tie-broken by entity key
 * (contentKey/dbKey/...) so equal-timestamp items keep a stable order across
 * the progressive-merge setStates in loadData. Without the tie-breaker, rows
 * sharing a timestamp reshuffle on every setState (the "乱跳" bug).
 */
const byTimestampThenKey = (a: BaseItem, b: BaseItem) =>
  getItemTimestamp(b) - getItemTimestamp(a) ||
  (getItemKey(a) ?? "").localeCompare(getItemKey(b) ?? "");

/**
 * Apply limit per type when multiple types are queried, so a high-volume
 * type cannot starve low-volume types. Single-type queries use a plain
 * slice. The input must already be sorted (byTimestampThenKey).
 */
const applyPerTypeLimit = (
  sorted: BaseItem[],
  limit: number,
  types: DataType[],
): BaseItem[] => {
  if (types.length <= 1) return sorted.slice(0, limit);
  const byType = new Map<string, BaseItem[]>();
  for (const item of sorted) {
    const t = item.type ?? "unknown";
    const bucket = byType.get(t);
    if (bucket) bucket.push(item);
    else byType.set(t, [item]);
  }
  const result: BaseItem[] = [];
  for (const type of types) {
    const bucket = byType.get(type);
    if (bucket) result.push(...bucket.slice(0, limit));
  }
  return result;
};

export const mergeAndDedupData = (
  localData: BaseItem[],
  remoteResults: unknown[],
  options: { includeDeleted?: boolean } = {}
): BaseItem[] =>
  mergeAndDedupUserData(localData, remoteResults, options) as BaseItem[];

const loadRemoteUserData = async ({
  serverOrigin,
  queryUserId,
  types,
  limit,
  summary,
  authToken,
  since,
}: {
  serverOrigin: string;
  queryUserId: string;
  types: DataType[];
  limit: number;
  summary?: boolean;
  authToken?: string | null;
  since?: number;
}): Promise<RemoteUserDataResult> => {
  try {
    const batchResponse = await noloQueryRequest({
      server: serverOrigin,
      queryUserId,
      authToken,
      options: {
        limit,
        condition: { type: types, includeDeleted: true, ...(summary ? { summary: true } : {}) },
        ...(since ? { since } : {}),
      },
    });

    if (batchResponse.ok) {
      return { data: { data: await extractRemoteItems(batchResponse, serverOrigin) }, ok: true };
    }

    // 多服务器环境里远端可能还是旧版本，只接受单个 type。
    // 这里回退到 legacy per-type 查询，保证正确性优先于省请求。
    if (![400, 404].includes(batchResponse.status)) {
      return { data: { data: [] }, ok: false };
    }

    const legacyResponses = await Promise.all(
      types.map(async (type): Promise<{ items: BaseItem[]; ok: boolean }> => {
        try {
          const response = await noloQueryRequest({
            server: serverOrigin,
            queryUserId,
            authToken,
            options: {
              limit,
              condition: { type, includeDeleted: true, ...(summary ? { summary: true } : {}) },
            },
          });
          if (!response.ok) return { items: [], ok: false };
          return { items: await extractRemoteItems(response, serverOrigin), ok: true };
        } catch {
          return { items: [], ok: false };
        }
      })
    );

    return {
      data: { data: legacyResponses.flatMap((response) => response.items) },
      ok: legacyResponses.some((response) => response.ok),
    };
  } catch {
    return { data: { data: [] }, ok: false };
  }
};

export function useUserData(
  types: DataType | DataType[],
  userId: string,
  limit: number,
  options: UseUserDataOptions = {}
): UseUserDataReturn {
  const dispatch = useAppDispatch();
  const { currentUserId, currentToken } = useAppSelector(selectRuntimeSnapshot);
  const partialDataStrategy = useMemo<PartialDataStrategy>(() => {
    if (options.partialDataStrategy) return options.partialDataStrategy;
    return options.allowPartialData ?? true ? "always" : "never";
  }, [options.allowPartialData, options.partialDataStrategy]);
  const remoteSummary = options.remoteSummary === true;

  const [{ loading, error, data }, setState] = useState<FetchState>({
    loading: true,
    error: null,
    data: [],
  });

  const typeArray = useMemo(
    () => (Array.isArray(types) ? types : [types]),
    [types]
  );
  const typesKey = useMemo(() => typeArray.join(","), [typeArray]);

  const loadingRef = useRef(false);
  const pendingRefreshRef = useRef(false);
  const previousParamsRef = useRef<{
    typesKey: string;
    userId: string;
    serverKey: string;
    remoteSummary: boolean;
    localOnly: boolean;
  }>({
    typesKey: "",
    userId: "",
    serverKey: "",
    remoteSummary: false,
    localOnly: false,
  });

  const localOnly = options.localOnly === true;

  const effectiveUserId = useMemo(
    () =>
      resolveEffectiveUserId({
        requestedUserId: userId,
        currentUserId,
        currentToken,
        localOnly,
      }),
    [userId, currentToken, currentUserId, localOnly]
  );
  const allServers = useAppSelector(selectRuntimeRemoteServers);
  const serverKey = useMemo(
    () => [...allServers].sort().join(","),
    [allServers]
  );

  // ── Incremental sync cursor ──
  // Tracks the newest updatedAt timestamp seen across all remote responses.
  // On subsequent loads, passed as `since` to the remote query so only
  // records that changed since the last sync are returned (typically a few
  // bytes vs 60KB+ full fetch). Persisted in localStorage so it survives
  // component unmount/remount. Keyed by userId + types + sorted servers so
  // multiple useUserData instances with different type sets don't collide
  // and server order changes don't invalidate the cursor.
  const syncCursorKey = useMemo(() => {
    if (!effectiveUserId || effectiveUserId === "undefined") return "";
    return `ud-sync:${effectiveUserId}:${typesKey}:${serverKey}`;
  }, [effectiveUserId, typesKey, serverKey]);
  const lastSyncRef = useRef<number | undefined>(undefined);
  // Load/reset cursor in useEffect (not render) to avoid SSR hydration
  // mismatch and to reset when the key changes (user switch, type change).
  useEffect(() => {
    if (!syncCursorKey) {
      lastSyncRef.current = undefined;
      return;
    }
    const stored =
      typeof localStorage !== "undefined"
        ? localStorage.getItem(syncCursorKey)
        : null;
    lastSyncRef.current = stored ? Number(stored) || undefined : undefined;
  }, [syncCursorKey]);
  const hydrationKey = useMemo(() => {
    if (!effectiveUserId || effectiveUserId === "undefined") return "";
    const keyParts = {
      userId: effectiveUserId,
      typesKey,
      serverKey,
    };
    return remoteSummary
      ? buildUserDataTombstoneSafeHydrationKey(keyParts)
      : buildUserDataHydrationKey(keyParts);
  }, [effectiveUserId, remoteSummary, serverKey, typesKey]);

  const clearCache = useCallback(() => {
    previousParamsRef.current = { typesKey: "", userId: "", serverKey: "", remoteSummary: false, localOnly: false };
  }, []);

  // ponytail: 在 loadData 内部 options 会被内部参数 shadow，这里提前把 trashOnly 提取出来。
  const trashOnly = options?.trashOnly === true;

  const loadData = useCallback(async (options?: { forceRefresh?: boolean }) => {
    if (!effectiveUserId || effectiveUserId === "undefined") {
      previousParamsRef.current = { typesKey: "", userId: "", serverKey: "", remoteSummary: false, localOnly: false };
      setState({
        loading: false,
        error: null,
        data: [],
      });
      return;
    }

    const currentParams = {
      typesKey,
      userId: effectiveUserId,
      serverKey,
      remoteSummary,
      localOnly,
    };
    const hydratedCacheReady = readHydratedUserDataCacheFlag(hydrationKey);
    const sameParams =
      JSON.stringify(previousParamsRef.current) ===
      JSON.stringify(currentParams);
    const decision = getUserDataLoadDecision({
      loading: loadingRef.current,
      sameParams,
      forceRefresh: options?.forceRefresh,
    });

    if (decision === "queue") {
      pendingRefreshRef.current = true;
      return;
    }

    if (decision === "skip") {
      return;
    }

    loadingRef.current = true;
    previousParamsRef.current = currentParams;
    setState((prev) => ({ ...prev, loading: true, error: null }));

    __udPerf?.start("local_fetch");

    try {
      __udPerf?.start("total_load");
      const localResults = await dispatch(
        fetchUserDataThunk({
          types: typeArray,
          userId: effectiveUserId,
          includeDeleted: true,
        })
      ).unwrap();
      const localData: BaseItem[] =
        localResults && typeof localResults === "object"
          ? Object.values(localResults).flatMap((value) =>
              Array.isArray(value) ? value.filter(isBaseItem) : []
            )
          : [];
      debugUserData("local-loaded", {
        userId: effectiveUserId,
        types: typeArray,
        localCount: localData.length,
        localByType: summarizeItemsByType(localData),
        localAppKeys: summarizeAppKeys(localData),
      });

      // ── Incremental sync safety: if the local cache is empty but we have a
      // sync cursor, the cache was likely cleared (new device, eviction, etc).
      // Fall back to full fetch by clearing the cursor for this load only.
      let effectiveSince = lastSyncRef.current;
      if (effectiveSince && localData.length === 0) {
        effectiveSince = undefined;
      }

      if (localOnly || (userId === "local" && !currentToken)) {
        const sortedLocalData = [...localData]
          .filter((item) => !isTombstoneRecord(item))
          .sort(byTimestampThenKey);
        const limitedLocalData = applyPerTypeLimit(sortedLocalData, limit, typeArray);

        setState({
          loading: false,
          error: null,
          data: limitedLocalData,
        });
        loadingRef.current = false;
        return;
      }

      const sortedInitialLocalData = [...localData]
        .filter((item) => !isTombstoneRecord(item))
        .sort(byTimestampThenKey);
      const limitedInitialLocalData = applyPerTypeLimit(sortedInitialLocalData, limit, typeArray);

      if (
        shouldUsePartialLocalData({
          strategy: partialDataStrategy,
          hasHydratedCache: hydratedCacheReady,
          localItemCount: limitedInitialLocalData.length,
        })
      ) {
        setState((prev) => ({
          ...prev,
          data: limitedInitialLocalData,
          loading: true,
        }));
      } else {
        // 对于冷缓存或明确禁用 partial data 的场景，继续等完整 merge 后再替换，
        // 避免首次进入时空列表/错位列表带来的明显闪烁。
        setState((prev) => ({
          ...prev,
          loading: true,
        }));
      }

      __udPerf?.end("local_fetch");
      __udPerf?.start("remote_fetch");

      // 渐进式合并：每个服务器返回后立即合并本地 + 已到远端并 setState，
      // 让用户先看到部分数据，不必等最慢服务器。
      const arrivedRemote: RemoteUserDataResult[] = [];
      const computeAndRenderMerged = () => {
        const mergedDataWithDeleted = mergeAndDedupData(localData, arrivedRemote, {
          includeDeleted: true,
        });
        const mergedData = trashOnly
          ? mergedDataWithDeleted.filter((item) => isTombstoneRecord(item))
          : mergedDataWithDeleted.filter((item) => !isTombstoneRecord(item));
        const sortedData = [...mergedData].sort(byTimestampThenKey);
        const limitedData = applyPerTypeLimit(sortedData, limit, typeArray);
        setState({
          loading: true,
          error: null,
          data: limitedData,
        });
      };

      await Promise.all(
        allServers.map(async (serverOrigin) => {
          const result = await loadRemoteUserData({
            serverOrigin,
            queryUserId: effectiveUserId,
            authToken: currentToken,
            types: typeArray,
            limit,
            summary: remoteSummary,
            since: effectiveSince,
          });
          arrivedRemote.push(result);
          computeAndRenderMerged();
        })
      );
      const remoteResults = arrivedRemote;
      debugUserData("remote-loaded", {
        userId: effectiveUserId,
        servers: allServers,
        remoteCounts: remoteResults.map((result, index) => ({
          index,
          count: Array.isArray(result?.data?.data) ? result.data.data.length : 0,
          byType: summarizeItemsByType(Array.isArray(result?.data?.data) ? result.data.data : []),
          appKeys: summarizeAppKeys(Array.isArray(result?.data?.data) ? result.data.data : []),
        })),
      });

      __udPerf?.end("remote_fetch");
      __udPerf?.start("merge");
      const mergedDataWithDeleted = mergeAndDedupData(localData, remoteResults, {
        includeDeleted: true,
      });
      const mergedData = trashOnly
        ? mergedDataWithDeleted.filter((item) => isTombstoneRecord(item))
        : mergedDataWithDeleted.filter((item) => !isTombstoneRecord(item));
      const sortedData = [...mergedData].sort(byTimestampThenKey);
      const limitedData = applyPerTypeLimit(sortedData, limit, typeArray);
      debugUserData("merged", {
        userId: effectiveUserId,
        mergedCount: mergedData.length,
        mergedByType: summarizeItemsByType(mergedData),
        mergedAppKeys: summarizeAppKeys(mergedData),
        limitedCount: limitedData.length,
        limitedByType: summarizeItemsByType(limitedData),
        limitedAppKeys: summarizeAppKeys(limitedData),
      });

      setState({
        loading: false,
        error: null,
        data: limitedData,
      });
      __udPerf?.end("merge");
      __udPerf?.end("total_load");

      // ── Update incremental sync cursor ──
      // Only advance the cursor based on remote incremental data — never
      // local data (which may contain offline drafts or clock-skewed records
      // that would lock out future syncs). Only advance when the remote
      // returned fewer than limit records (no truncation); if truncated,
      // keep the old cursor so the remaining records are fetched next time.
      const remoteRecords = remoteResults.flatMap(
        (r) => (Array.isArray(r?.data?.data) ? r.data.data : []),
      );
      // Truncation check: for multi-type queries the server applies limit
      // per type, so we check if any single type hit the limit. For single-
      // type queries, compare total count to limit.
      const remoteWasTruncated =
        remoteRecords.length > 0 &&
        (typeArray.length > 1
          ? typeArray.some(
              (t) =>
                remoteRecords.filter((r) => (r as BaseItem).type === t).length >=
                limit,
            )
          : remoteRecords.length >= limit);
      if (remoteRecords.length > 0 && !remoteWasTruncated) {
        const newest = remoteRecords.reduce(
          (max, item) => Math.max(max, getItemTimestamp(item)),
          0,
        );
        if (newest > 0) {
          lastSyncRef.current = newest;
          if (syncCursorKey && typeof localStorage !== "undefined") {
            localStorage.setItem(syncCursorKey, String(newest));
          }
        }
      }

      // 不阻塞首屏渲染：setState 之后才异步写 LevelDB 缓存
      // hydration flag 等 cache 写成功后再打，避免标志提前但缓存未就绪。
      // 即使 summary 模式也要把远端墓碑写回本地，否则下次本地 partial 渲染会闪现
      // 已被远端删除的活记录。显式 restore 是同类事实，也必须写回本地覆盖旧墓碑。
      // summary 模式同时缓存正常记录的摘要，让下次 reload 本地能先出数据（localFirst），
      // 远端到达后通过 shouldUpdateLocalUserDataCache 覆盖旧缓存，tombstone 仍处理删除。
      const canMarkHydratedCache =
        !remoteSummary ||
        (remoteResults.length === allServers.length &&
          remoteResults.every((result) => result.ok));
      const recordsToCache = mergedDataWithDeleted;
      if (recordsToCache.length > 0) {
        const cachePromise = dispatch(cacheMergedUserDataThunk({ records: recordsToCache })).unwrap();
        cachePromise
          .then(() => {
            if (canMarkHydratedCache && partialDataStrategy === "hydrated-cache" && hydrationKey) {
              markHydratedUserDataCacheFlag(hydrationKey);
            }
          })
          .catch((cacheError: unknown) => {
            console.warn("[useUserData] Failed to persist merged user data cache", cacheError);
          });
      } else if (canMarkHydratedCache && partialDataStrategy === "hydrated-cache" && hydrationKey) {
        markHydratedUserDataCacheFlag(hydrationKey);
      }
    } catch (err) {
      const error =
        err instanceof Error
          ? err
          : new Error(String(err) || "Unknown error occurred");
      toast.error("加载数据失败，请检查网络或稍后重试");

      setState((prev) => ({
        ...prev,
        loading: false,
        error,
      }));
    } finally {
      loadingRef.current = false;
      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        void loadData({ forceRefresh: true });
      }
    }
  }, [
    typesKey,
    effectiveUserId,
    serverKey,
    hydrationKey,
    limit,
    dispatch,
    currentToken,
    userId,
    typeArray,
    partialDataStrategy,
    remoteSummary,
    allServers,
    trashOnly,
    localOnly,
  ]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const refresh = (event: Event) => {
      // 乐观移除：删除事件携带 deletedDbKey 时，立即从当前 data 中剔除该记录，
      // 不等 loadData 远端往返完成。loadData(forceRefresh) 在后台收敛权威状态。
      const deletedDbKey = (event as CustomEvent<{ deletedDbKey?: string }>).detail?.deletedDbKey;
      if (typeof deletedDbKey === "string" && deletedDbKey.trim().length > 0) {
        setState((prev) => {
          if (!prev.data.some((item) => getItemKey(item) === deletedDbKey)) {
            return prev;
          }
          return {
            ...prev,
            data: prev.data.filter((item) => getItemKey(item) !== deletedDbKey),
          };
        });
      }
      clearCache();
      void loadData({ forceRefresh: true });
    };

    window.addEventListener("nolo-user-data-updated", refresh);
    return () => {
      window.removeEventListener("nolo-user-data-updated", refresh);
    };
  }, [clearCache, loadData]);

  return { loading, error, data, reload: loadData, clearCache };
}
