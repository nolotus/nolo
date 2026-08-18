import {
  fetchUserDataThunk
} from "/public/assets/chunks/chunk-APUNFOYF.js";
import {
  cacheMergedUserDataThunk
} from "/public/assets/chunks/chunk-GYU2TA6X.js";
import {
  noloQueryRequest
} from "/public/assets/chunks/chunk-SDMAWFBN.js";
import {
  getItemKey,
  getUserDataItemTimestamp,
  mergeAndDedupUserData
} from "/public/assets/chunks/chunk-7PX5UKK4.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  isTombstoneRecord,
  selectRuntimeRemoteServers,
  selectRuntimeSnapshot,
  toast
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/database/hooks/useUserData.ts
var import_react = __toESM(require_react(), 1);

// packages/database/userDataLoadDecision.ts
var getUserDataLoadDecision = ({
  loading,
  sameParams,
  forceRefresh
}) => {
  if (forceRefresh) {
    return loading ? "queue" : "load";
  }
  return loading || sameParams ? "skip" : "load";
};

// packages/database/hooks/useUserData.ts
var isBaseItem = (value) => value !== null && typeof value === "object";
var shouldDebugUserData = typeof window !== "undefined" && !!window.location && typeof window.location.hostname === "string" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
var summarizeItemsByType = (items) => {
  return items.reduce((acc, item) => {
    const key = typeof item.type === "string" && item.type.trim() || (typeof item.appKey === "string" && item.appKey.startsWith("app-") ? "app" /* APP */ : "unknown");
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
};
var summarizeAppKeys = (items) => {
  return items.filter((item) => {
    const candidates = [item.dbKey, item.contentKey, item.appKey];
    return candidates.some(
      (candidate) => typeof candidate === "string" && candidate.startsWith("app-")
    );
  }).slice(0, 12).map(
    (item) => item.dbKey ?? item.contentKey ?? item.appKey ?? item.appId ?? item.id
  ).filter((candidate) => typeof candidate === "string");
};
var __udPerf = typeof window !== "undefined" && localStorage.getItem("debugPerf") === "1" ? window.__userDataPerf ?? (window.__userDataPerf = {
  marks: {},
  start(label) {
    this.marks[label] = performance.now();
  },
  end(label) {
    const t = this.marks[label];
    if (t !== void 0) {
      const ms = performance.now() - t;
      console.debug(`[USERDATA-PERF] ${label}: ${ms.toFixed(1)}ms`);
      delete this.marks[label];
    }
  }
}) : null;
var debugUserData = (phase, payload) => {
  if (!shouldDebugUserData) return;
  console.debug(`[useUserData] ${phase}`, payload);
};
var buildUserDataHydrationKey = ({
  userId,
  typesKey,
  serverKey
}) => `nolo-user-data-hydrated:${userId}:${typesKey}:${serverKey}`;
var buildUserDataTombstoneSafeHydrationKey = ({
  userId,
  typesKey,
  serverKey
}) => `nolo-user-data-hydrated:v2:summary-tombstone-safe:${userId}:${typesKey}:${serverKey}`;
var readHydratedUserDataCacheFlag = (hydrationKey) => {
  if (typeof window === "undefined" || !hydrationKey) return false;
  try {
    return window.localStorage.getItem(hydrationKey) === "1";
  } catch {
    return false;
  }
};
var markHydratedUserDataCacheFlag = (hydrationKey) => {
  if (typeof window === "undefined" || !hydrationKey) return;
  try {
    window.localStorage.setItem(hydrationKey, "1");
  } catch {
  }
};
var shouldUsePartialLocalData = ({
  strategy,
  hasHydratedCache,
  localItemCount
}) => {
  if (strategy === "never") return false;
  if (strategy === "hydrated-cache") {
    return hasHydratedCache && localItemCount > 0;
  }
  return true;
};
var resolveEffectiveUserId = ({
  requestedUserId,
  currentUserId,
  currentToken,
  localOnly
}) => {
  if (localOnly) return "local";
  if (requestedUserId === "local" && currentToken && currentUserId) {
    return currentUserId;
  }
  return requestedUserId;
};
var withServerOrigin = (items, serverOrigin) => items.map((item) => ({
  ...item,
  serverOrigin
}));
var extractRemoteItems = async (response, serverOrigin) => {
  const data = await response.json();
  const envelope = data && typeof data === "object" && "data" in data ? data.data : void 0;
  const nested = envelope && typeof envelope === "object" && "data" in envelope ? envelope.data : void 0;
  const items = Array.isArray(nested) ? nested.filter(isBaseItem) : [];
  return withServerOrigin(items, serverOrigin);
};
var getItemTimestamp = (dataItem) => getUserDataItemTimestamp(dataItem);
var byTimestampThenKey = (a, b) => getItemTimestamp(b) - getItemTimestamp(a) || (getItemKey(a) ?? "").localeCompare(getItemKey(b) ?? "");
var applyPerTypeLimit = (sorted, limit, types) => {
  if (types.length <= 1) return sorted.slice(0, limit);
  const byType = /* @__PURE__ */ new Map();
  for (const item of sorted) {
    const t = item.type ?? "unknown";
    const bucket = byType.get(t);
    if (bucket) bucket.push(item);
    else byType.set(t, [item]);
  }
  const result = [];
  for (const type of types) {
    const bucket = byType.get(type);
    if (bucket) result.push(...bucket.slice(0, limit));
  }
  return result;
};
var mergeAndDedupData = (localData, remoteResults, options = {}) => mergeAndDedupUserData(localData, remoteResults, options);
var loadRemoteUserData = async ({
  serverOrigin,
  queryUserId,
  types,
  limit,
  summary,
  authToken,
  since
}) => {
  try {
    const batchResponse = await noloQueryRequest({
      server: serverOrigin,
      queryUserId,
      authToken,
      options: {
        limit,
        condition: { type: types, includeDeleted: true, ...summary ? { summary: true } : {} },
        ...since ? { since } : {}
      }
    });
    if (batchResponse.ok) {
      return { data: { data: await extractRemoteItems(batchResponse, serverOrigin) }, ok: true };
    }
    if (![400, 404].includes(batchResponse.status)) {
      return { data: { data: [] }, ok: false };
    }
    const legacyResponses = await Promise.all(
      types.map(async (type) => {
        try {
          const response = await noloQueryRequest({
            server: serverOrigin,
            queryUserId,
            authToken,
            options: {
              limit,
              condition: { type, includeDeleted: true, ...summary ? { summary: true } : {} }
            }
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
      ok: legacyResponses.some((response) => response.ok)
    };
  } catch {
    return { data: { data: [] }, ok: false };
  }
};
function useUserData(types, userId, limit, options = {}) {
  const dispatch = useAppDispatch();
  const { currentUserId, currentToken } = useAppSelector(selectRuntimeSnapshot);
  const partialDataStrategy = (0, import_react.useMemo)(() => {
    if (options.partialDataStrategy) return options.partialDataStrategy;
    return options.allowPartialData ?? true ? "always" : "never";
  }, [options.allowPartialData, options.partialDataStrategy]);
  const remoteSummary = options.remoteSummary === true;
  const [{ loading, error, data }, setState] = (0, import_react.useState)({
    loading: true,
    error: null,
    data: []
  });
  const typeArray = (0, import_react.useMemo)(
    () => Array.isArray(types) ? types : [types],
    [types]
  );
  const typesKey = (0, import_react.useMemo)(() => typeArray.join(","), [typeArray]);
  const loadingRef = (0, import_react.useRef)(false);
  const pendingRefreshRef = (0, import_react.useRef)(false);
  const previousParamsRef = (0, import_react.useRef)({
    typesKey: "",
    userId: "",
    serverKey: "",
    remoteSummary: false,
    localOnly: false
  });
  const localOnly = options.localOnly === true;
  const effectiveUserId = (0, import_react.useMemo)(
    () => resolveEffectiveUserId({
      requestedUserId: userId,
      currentUserId,
      currentToken,
      localOnly
    }),
    [userId, currentToken, currentUserId, localOnly]
  );
  const allServers = useAppSelector(selectRuntimeRemoteServers);
  const serverKey = (0, import_react.useMemo)(
    () => [...allServers].sort().join(","),
    [allServers]
  );
  const syncCursorKey = (0, import_react.useMemo)(() => {
    if (!effectiveUserId || effectiveUserId === "undefined") return "";
    return `ud-sync:${effectiveUserId}:${typesKey}:${serverKey}`;
  }, [effectiveUserId, typesKey, serverKey]);
  const lastSyncRef = (0, import_react.useRef)(void 0);
  (0, import_react.useEffect)(() => {
    if (!syncCursorKey) {
      lastSyncRef.current = void 0;
      return;
    }
    const stored = typeof localStorage !== "undefined" ? localStorage.getItem(syncCursorKey) : null;
    lastSyncRef.current = stored ? Number(stored) || void 0 : void 0;
  }, [syncCursorKey]);
  const hydrationKey = (0, import_react.useMemo)(() => {
    if (!effectiveUserId || effectiveUserId === "undefined") return "";
    const keyParts = {
      userId: effectiveUserId,
      typesKey,
      serverKey
    };
    return remoteSummary ? buildUserDataTombstoneSafeHydrationKey(keyParts) : buildUserDataHydrationKey(keyParts);
  }, [effectiveUserId, remoteSummary, serverKey, typesKey]);
  const clearCache = (0, import_react.useCallback)(() => {
    previousParamsRef.current = { typesKey: "", userId: "", serverKey: "", remoteSummary: false, localOnly: false };
  }, []);
  const trashOnly = options?.trashOnly === true;
  const loadData = (0, import_react.useCallback)(async (options2) => {
    if (!effectiveUserId || effectiveUserId === "undefined") {
      previousParamsRef.current = { typesKey: "", userId: "", serverKey: "", remoteSummary: false, localOnly: false };
      setState({
        loading: false,
        error: null,
        data: []
      });
      return;
    }
    const currentParams = {
      typesKey,
      userId: effectiveUserId,
      serverKey,
      remoteSummary,
      localOnly
    };
    const hydratedCacheReady = readHydratedUserDataCacheFlag(hydrationKey);
    const sameParams = JSON.stringify(previousParamsRef.current) === JSON.stringify(currentParams);
    const decision = getUserDataLoadDecision({
      loading: loadingRef.current,
      sameParams,
      forceRefresh: options2?.forceRefresh
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
          includeDeleted: true
        })
      ).unwrap();
      const localData = localResults && typeof localResults === "object" ? Object.values(localResults).flatMap(
        (value) => Array.isArray(value) ? value.filter(isBaseItem) : []
      ) : [];
      debugUserData("local-loaded", {
        userId: effectiveUserId,
        types: typeArray,
        localCount: localData.length,
        localByType: summarizeItemsByType(localData),
        localAppKeys: summarizeAppKeys(localData)
      });
      let effectiveSince = lastSyncRef.current;
      if (effectiveSince && localData.length === 0) {
        effectiveSince = void 0;
      }
      if (localOnly || userId === "local" && !currentToken) {
        const sortedLocalData = [...localData].filter((item) => !isTombstoneRecord(item)).sort(byTimestampThenKey);
        const limitedLocalData = applyPerTypeLimit(sortedLocalData, limit, typeArray);
        setState({
          loading: false,
          error: null,
          data: limitedLocalData
        });
        loadingRef.current = false;
        return;
      }
      const sortedInitialLocalData = [...localData].filter((item) => !isTombstoneRecord(item)).sort(byTimestampThenKey);
      const limitedInitialLocalData = applyPerTypeLimit(sortedInitialLocalData, limit, typeArray);
      if (shouldUsePartialLocalData({
        strategy: partialDataStrategy,
        hasHydratedCache: hydratedCacheReady,
        localItemCount: limitedInitialLocalData.length
      })) {
        setState((prev) => ({
          ...prev,
          data: limitedInitialLocalData,
          loading: true
        }));
      } else {
        setState((prev) => ({
          ...prev,
          loading: true
        }));
      }
      __udPerf?.end("local_fetch");
      __udPerf?.start("remote_fetch");
      const arrivedRemote = [];
      const computeAndRenderMerged = () => {
        const mergedDataWithDeleted2 = mergeAndDedupData(localData, arrivedRemote, {
          includeDeleted: true
        });
        const mergedData2 = trashOnly ? mergedDataWithDeleted2.filter((item) => isTombstoneRecord(item)) : mergedDataWithDeleted2.filter((item) => !isTombstoneRecord(item));
        const sortedData2 = [...mergedData2].sort(byTimestampThenKey);
        const limitedData2 = applyPerTypeLimit(sortedData2, limit, typeArray);
        setState({
          loading: true,
          error: null,
          data: limitedData2
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
            since: effectiveSince
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
          appKeys: summarizeAppKeys(Array.isArray(result?.data?.data) ? result.data.data : [])
        }))
      });
      __udPerf?.end("remote_fetch");
      __udPerf?.start("merge");
      const mergedDataWithDeleted = mergeAndDedupData(localData, remoteResults, {
        includeDeleted: true
      });
      const mergedData = trashOnly ? mergedDataWithDeleted.filter((item) => isTombstoneRecord(item)) : mergedDataWithDeleted.filter((item) => !isTombstoneRecord(item));
      const sortedData = [...mergedData].sort(byTimestampThenKey);
      const limitedData = applyPerTypeLimit(sortedData, limit, typeArray);
      debugUserData("merged", {
        userId: effectiveUserId,
        mergedCount: mergedData.length,
        mergedByType: summarizeItemsByType(mergedData),
        mergedAppKeys: summarizeAppKeys(mergedData),
        limitedCount: limitedData.length,
        limitedByType: summarizeItemsByType(limitedData),
        limitedAppKeys: summarizeAppKeys(limitedData)
      });
      setState({
        loading: false,
        error: null,
        data: limitedData
      });
      __udPerf?.end("merge");
      __udPerf?.end("total_load");
      const remoteRecords = remoteResults.flatMap(
        (r) => Array.isArray(r?.data?.data) ? r.data.data : []
      );
      const remoteWasTruncated = remoteRecords.length > 0 && (typeArray.length > 1 ? typeArray.some(
        (t) => remoteRecords.filter((r) => r.type === t).length >= limit
      ) : remoteRecords.length >= limit);
      if (remoteRecords.length > 0 && !remoteWasTruncated) {
        const newest = remoteRecords.reduce(
          (max, item) => Math.max(max, getItemTimestamp(item)),
          0
        );
        if (newest > 0) {
          lastSyncRef.current = newest;
          if (syncCursorKey && typeof localStorage !== "undefined") {
            localStorage.setItem(syncCursorKey, String(newest));
          }
        }
      }
      const canMarkHydratedCache = !remoteSummary || remoteResults.length === allServers.length && remoteResults.every((result) => result.ok);
      const recordsToCache = mergedDataWithDeleted;
      if (recordsToCache.length > 0) {
        const cachePromise = dispatch(cacheMergedUserDataThunk({ records: recordsToCache })).unwrap();
        cachePromise.then(() => {
          if (canMarkHydratedCache && partialDataStrategy === "hydrated-cache" && hydrationKey) {
            markHydratedUserDataCacheFlag(hydrationKey);
          }
        }).catch((cacheError) => {
          console.warn("[useUserData] Failed to persist merged user data cache", cacheError);
        });
      } else if (canMarkHydratedCache && partialDataStrategy === "hydrated-cache" && hydrationKey) {
        markHydratedUserDataCacheFlag(hydrationKey);
      }
    } catch (err) {
      const error2 = err instanceof Error ? err : new Error(String(err) || "Unknown error occurred");
      toast.error("\u52A0\u8F7D\u6570\u636E\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u6216\u7A0D\u540E\u91CD\u8BD5");
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error2
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
    localOnly
  ]);
  (0, import_react.useEffect)(() => {
    loadData();
  }, [loadData]);
  (0, import_react.useEffect)(() => {
    if (typeof window === "undefined") {
      return;
    }
    const refresh = (event) => {
      const deletedDbKey = event.detail?.deletedDbKey;
      if (typeof deletedDbKey === "string" && deletedDbKey.trim().length > 0) {
        setState((prev) => {
          if (!prev.data.some((item) => getItemKey(item) === deletedDbKey)) {
            return prev;
          }
          return {
            ...prev,
            data: prev.data.filter((item) => getItemKey(item) !== deletedDbKey)
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

export {
  useUserData
};
