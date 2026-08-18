import {
  noloQueryRequest
} from "/public/assets/chunks/chunk-SDMAWFBN.js";
import {
  syncAppRecord
} from "/public/assets/chunks/chunk-2XKWBRFO.js";
import {
  deriveAppIdFromRouteKey,
  isAppRouteKey,
  resolveAppRouteKey,
  toAppSummary
} from "/public/assets/chunks/chunk-G4VE62AJ.js";
import {
  useToken,
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  asRecordOrEmpty,
  createAsyncThunk,
  fetchUserData,
  isTombstoneRecord,
  selectRemoteServer,
  selectRemoteServers,
  shouldReplaceWithNextRecord,
  toTimestampMs
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  normalizeServerOrigin
} from "/public/assets/chunks/chunk-XJRNNKKF.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/hooks/useMyApps.ts
var import_react = __toESM(require_react());

// packages/app/fetchOwnedApps.ts
var normalizeCachedRecord = (value, userId, fallbackServerOrigin) => {
  if (!value || typeof value !== "object") return null;
  const record = value;
  const recordDbKey = typeof record.dbKey === "string" && record.dbKey.trim().length > 0 ? record.dbKey : void 0;
  const explicitAppId = typeof record.appId === "string" && record.appId.trim().length > 0 ? record.appId : void 0;
  const appKey = resolveAppRouteKey(
    typeof record.appKey === "string" ? record.appKey : isAppRouteKey(recordDbKey) ? recordDbKey : void 0,
    explicitAppId
  );
  if (!appKey) return null;
  const appId = explicitAppId ?? deriveAppIdFromRouteKey(
    appKey,
    typeof record.userId === "string" && record.userId.trim().length > 0 ? record.userId : userId
  );
  const name = typeof record.name === "string" && record.name.trim().length > 0 ? record.name : appId ?? appKey;
  return {
    ...record,
    dbKey: appKey,
    type: "app" /* APP */,
    userId,
    appId,
    appKey,
    name,
    customUrl: typeof record.customUrl === "string" && record.customUrl.trim().length > 0 ? record.customUrl : void 0,
    visibility: record.visibility ?? "private",
    deployMode: record.deployMode ?? "platform",
    icon: record.icon ?? null,
    spaceId: typeof record.spaceId === "string" && record.spaceId.trim().length > 0 ? record.spaceId : null,
    updatedAt: record.updatedAt ?? record.createdAt ?? 0,
    createdAt: record.createdAt ?? record.updatedAt ?? 0,
    serverOrigin: typeof record.serverOrigin === "string" && record.serverOrigin.trim().length > 0 ? record.serverOrigin : fallbackServerOrigin
  };
};
var buildCacheRecordFromRemote = (value, userId, serverOrigin) => {
  const baseRecord = asRecordOrEmpty(value);
  return normalizeCachedRecord(
    {
      ...baseRecord,
      serverOrigin
    },
    userId,
    serverOrigin
  );
};
var mergeOwnedAppRecords = (localRecords, remoteRecords, fetchedServers) => {
  const mergedByKey = /* @__PURE__ */ new Map();
  const localByKey = /* @__PURE__ */ new Map();
  const remoteKeysByServer = /* @__PURE__ */ new Map();
  for (const record of localRecords) {
    mergedByKey.set(record.dbKey, record);
    localByKey.set(record.dbKey, record);
  }
  for (const remoteRecord of remoteRecords) {
    const remoteServer = remoteRecord.serverOrigin?.trim();
    if (remoteServer) {
      const keys = remoteKeysByServer.get(remoteServer) ?? /* @__PURE__ */ new Set();
      keys.add(remoteRecord.dbKey);
      remoteKeysByServer.set(remoteServer, keys);
    }
    const existing = mergedByKey.get(remoteRecord.dbKey);
    if (!existing || shouldReplaceWithNextRecord(remoteRecord, existing)) {
      mergedByKey.set(remoteRecord.dbKey, {
        ...existing,
        ...remoteRecord
      });
    }
  }
  for (const localRecord of localRecords) {
    const localServer = localRecord.serverOrigin?.trim();
    if (!localServer || !fetchedServers.has(localServer)) continue;
    const remoteKeys = remoteKeysByServer.get(localServer) ?? /* @__PURE__ */ new Set();
    if (!remoteKeys.has(localRecord.dbKey)) {
      mergedByKey.delete(localRecord.dbKey);
    }
  }
  const mergedRecords = [...mergedByKey.values()].filter((record) => !isTombstoneRecord(record)).sort((left, right) => toTimestampMs(right.updatedAt) - toTimestampMs(left.updatedAt));
  const cacheWrites = mergedRecords.filter((record) => {
    const localRecord = localByKey.get(record.dbKey);
    return !localRecord || toTimestampMs(record.updatedAt) > toTimestampMs(localRecord.updatedAt);
  });
  return { mergedRecords, cacheWrites };
};
var toOwnedAppSummary = (record, fallbackServerOrigin) => {
  const summary = toAppSummary(record, fallbackServerOrigin);
  if (!summary) {
    throw new Error(`Invalid app summary record: ${record.dbKey}`);
  }
  return summary;
};
var fetchRemoteOwnedApps = async (serverOrigin, userId, limit, authToken) => {
  if (authToken) {
    try {
      const response = await fetch(`${serverOrigin.replace(/\/+$/, "")}/api/app/list`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });
      if (response.ok) {
        const json = await response.json().catch(() => ({ workers: [] }));
        const workers = Array.isArray(json?.workers) ? json.workers : [];
        return {
          records: workers.map(
            (worker) => buildCacheRecordFromRemote(
              {
                dbKey: worker.appKey,
                appKey: worker.appKey,
                appId: worker.appId,
                userId,
                name: worker.userFriendlyName ?? worker.name,
                customUrl: worker.customUrl,
                visibility: worker.visibility,
                deployMode: worker.deployMode ?? "platform",
                spaceId: worker.spaceId ?? null,
                updatedAt: worker.modifiedOn,
                createdAt: worker.createdAt ?? worker.modifiedOn,
                icon: worker.icon ?? null
              },
              userId,
              serverOrigin
            )
          ).filter((record) => !!record),
          fetched: true
        };
      }
    } catch {
    }
  }
  try {
    const response = await noloQueryRequest({
      server: serverOrigin,
      queryUserId: userId,
      authToken,
      options: {
        limit,
        condition: { type: "app" /* APP */ }
      }
    });
    if (!response.ok) return { records: [], fetched: false };
    const json = await response.json().catch(() => ({ data: { data: [] } }));
    const items = Array.isArray(json?.data?.data) ? json.data.data : [];
    return {
      records: items.map(
        (record) => buildCacheRecordFromRemote(record, userId, serverOrigin)
      ).filter((record) => !!record),
      fetched: true
    };
  } catch {
    return { records: [], fetched: false };
  }
};
var fetchOwnedApps = createAsyncThunk("app/fetchOwnedApps", async ({ userId, server, servers, limit, authToken }, { dispatch, extra }) => {
  const db = extra.db;
  const localRecordsRaw = db ? await fetchUserData(db, "app" /* APP */, userId, { includeDeleted: true }).catch(() => []) : [];
  const localRecords = (Array.isArray(localRecordsRaw) ? localRecordsRaw : []).map((record) => normalizeCachedRecord(record, userId, server)).filter((record) => !!record);
  const configuredServers = Array.isArray(servers) && servers.length > 0 ? servers : [server];
  const targetServers = [
    ...new Set(
      [
        ...configuredServers,
        ...localRecords.map((record) => record.serverOrigin?.trim()).filter((origin) => !!origin)
      ].map((origin) => origin.replace(/\/+$/, ""))
    )
  ];
  const remoteResults = await Promise.all(
    targetServers.map(
      (serverOrigin) => fetchRemoteOwnedApps(serverOrigin, userId, limit, authToken)
    )
  );
  const remoteRecords = remoteResults.flatMap((result) => result.records);
  const fetchedServers = new Set(
    remoteResults.map((result, index) => result.fetched ? targetServers[index] : null).filter((serverOrigin) => !!serverOrigin)
  );
  const { mergedRecords, cacheWrites } = mergeOwnedAppRecords(
    localRecords,
    remoteRecords,
    fetchedServers
  );
  if (db) {
    await Promise.all(
      cacheWrites.map(
        (record) => db.put(record.dbKey, {
          ...record,
          dbKey: record.dbKey,
          type: "app" /* APP */
        })
      )
    ).catch(() => void 0);
  }
  const normalizedCurrentServer = normalizeServerOrigin(server);
  for (const record of cacheWrites) {
    const recordOrigin = normalizeServerOrigin(record.serverOrigin);
    if (!recordOrigin || recordOrigin === normalizedCurrentServer) continue;
    if (record.userId !== userId) continue;
    if (typeof record.code !== "string" || !record.code.trim()) continue;
    void dispatch(syncAppRecord(record.dbKey, record, { includeCurrentServer: true }));
  }
  return mergedRecords.map((record) => toOwnedAppSummary(record, server));
});

// packages/app/hooks/useMyApps.ts
function useMyAppListData(spaceId, options = {}) {
  const dispatch = useAppDispatch();
  const userId = useUserId();
  const currentToken = useToken();
  const server = useAppSelector(selectRemoteServer);
  const servers = useAppSelector(selectRemoteServers);
  const [apps, setApps] = (0, import_react.useState)([]);
  const [loading, setLoading] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)(null);
  const enabled = options.enabled ?? true;
  const fetchApps = (0, import_react.useCallback)(async () => {
    if (!enabled || !userId) return;
    setLoading(true);
    setError(null);
    try {
      if (!spaceId) {
        const ownedApps = await dispatch(
          fetchOwnedApps({
            userId,
            server,
            servers,
            limit: 200,
            authToken: currentToken
          })
        ).unwrap();
        setApps(ownedApps);
        return;
      }
      const res = await fetch(`${server}/api/app/list`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ spaceId })
      });
      if (!res.ok) throw new Error(`\u83B7\u53D6\u5E94\u7528\u5217\u8868\u5931\u8D25 (${res.status})`);
      const json = await res.json();
      const workers = (json.workers ?? []).map((w) => ({
        name: w.userFriendlyName ?? w.name ?? w.appId ?? w.appKey ?? "Untitled App",
        url: w.url ?? null,
        appId: w.appId,
        appKey: w.appKey ?? resolveAppRouteKey(void 0, w.appId) ?? void 0,
        spaceId: w.spaceId ?? null,
        customUrl: w.customUrl,
        modifiedOn: w.modifiedOn,
        visibility: w.visibility ?? "private",
        deployMode: "platform"
      }));
      setApps(workers);
    } catch (err) {
      setError(err?.message || "\u52A0\u8F7D\u5931\u8D25");
    } finally {
      setLoading(false);
    }
  }, [dispatch, enabled, userId, currentToken, server, servers, spaceId]);
  (0, import_react.useEffect)(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void fetchApps();
  }, [enabled, fetchApps]);
  return {
    apps,
    setApps,
    loading,
    error,
    fetchApps
  };
}
function useMyAppActions({ setApps }) {
  const currentToken = useToken();
  const server = useAppSelector(selectRemoteServer);
  const servers = useAppSelector(selectRemoteServers);
  const resolveAppServer = (0, import_react.useCallback)(
    (app) => app?.serverOrigin?.trim() || server,
    [server]
  );
  const resolveAppServers = (0, import_react.useCallback)(
    (app) => {
      const ordered = [resolveAppServer(app), ...servers];
      return [
        ...new Set(
          ordered.filter(
            (value) => typeof value === "string" && value.trim().length > 0
          )
        )
      ];
    },
    [resolveAppServer, servers]
  );
  const postAppMutation = (0, import_react.useCallback)(
    async (app, path, body, options) => {
      if (!currentToken) {
        return [];
      }
      const targetServers = resolveAppServers(app);
      return Promise.all(
        targetServers.map(async (targetServer, index) => {
          try {
            const res = await fetch(`${targetServer}${path}`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${currentToken}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify(body)
            });
            const data = await res.json().catch(() => ({}));
            return {
              server: targetServer,
              required: index === 0,
              ok: res.ok || options?.treat404AsOk === true && res.status === 404,
              status: res.status,
              data
            };
          } catch {
            return {
              server: targetServer,
              required: index === 0,
              ok: false,
              status: null,
              data: {}
            };
          }
        })
      );
    },
    [currentToken, resolveAppServers]
  );
  const hasReplicaFailure = (0, import_react.useCallback)(
    (results) => {
      const replicaFailures = results.filter((result) => !result.required && !result.ok);
      if (replicaFailures.length > 0) {
        console.warn("[useMyApps] skipped failed replica servers", replicaFailures);
      }
    },
    []
  );
  const deleteApp = (0, import_react.useCallback)(
    async (app) => {
      const name = app.name;
      const appId = app.appId;
      if (!currentToken || !appId && !name) return false;
      try {
        const results = await postAppMutation(
          app,
          "/api/app/delete",
          appId ? { appId, name } : { name },
          { treat404AsOk: true }
        );
        if (!results.some((result) => result.required && result.ok)) return false;
        hasReplicaFailure(results);
        setApps(
          (prev) => prev.filter(
            (app2) => appId ? app2.appId !== appId : app2.name !== name
          )
        );
        return true;
      } catch {
        return false;
      }
    },
    [currentToken, hasReplicaFailure, postAppMutation, setApps]
  );
  const shareApp = (0, import_react.useCallback)(
    async (app, visibility) => {
      const appId = app.appId;
      if (!currentToken || !appId) return false;
      try {
        const results = await postAppMutation(
          app,
          "/api/app/share",
          { appId, visibility }
        );
        if (!results.some((result) => result.required && result.ok)) return false;
        hasReplicaFailure(results);
        setApps(
          (prev) => prev.map((a) => a.appId === appId ? { ...a, visibility } : a)
        );
        return true;
      } catch {
        return false;
      }
    },
    [currentToken, hasReplicaFailure, postAppMutation, setApps]
  );
  const bindDomain = (0, import_react.useCallback)(
    async (app, hostname) => {
      const appId = app.appId;
      if (!currentToken || !appId) return { ok: false, error: "\u672A\u767B\u5F55" };
      try {
        const results = await postAppMutation(
          app,
          "/api/app/domain/bind",
          { appId, hostname }
        );
        const primary = results.find((result) => result.required);
        const data = primary?.data;
        if (!primary?.ok) {
          return {
            ok: false,
            error: data?.error?.message || `\u7ED1\u5B9A\u5931\u8D25 (${primary?.status ?? "network"})`,
            code: data?.error?.code
          };
        }
        hasReplicaFailure(results);
        const domainData = data ?? {};
        setApps(
          (prev) => prev.map(
            (app2) => app2.appId === appId && !domainData.pendingDns ? { ...app2, customUrl: domainData.url ?? app2.customUrl } : app2
          )
        );
        return {
          ok: true,
          url: domainData.url,
          mode: domainData.mode,
          pendingDns: domainData.pendingDns,
          aRecords: Array.isArray(domainData.aRecords) ? domainData.aRecords : []
        };
      } catch (error) {
        return { ok: false, error: error?.message || "\u7ED1\u5B9A\u5931\u8D25" };
      }
    },
    [currentToken, hasReplicaFailure, postAppMutation, setApps]
  );
  const unbindDomain = (0, import_react.useCallback)(
    async (app, hostname) => {
      const appId = app.appId;
      if (!currentToken || !appId) return { ok: false, error: "\u672A\u767B\u5F55" };
      try {
        const results = await postAppMutation(
          app,
          "/api/app/domain/unbind",
          { appId, hostname }
        );
        const primary = results.find((result) => result.required);
        const data = primary?.data;
        if (!primary?.ok) {
          return {
            ok: false,
            error: data?.error?.message || `\u89E3\u7ED1\u5931\u8D25 (${primary?.status ?? "network"})`
          };
        }
        hasReplicaFailure(results);
        setApps(
          (prev) => prev.map(
            (app2) => app2.appId === appId && app2.customUrl === `https://${hostname}` ? { ...app2, customUrl: app2.url ?? void 0 } : app2
          )
        );
        return { ok: true };
      } catch (error) {
        return { ok: false, error: error?.message || "\u89E3\u7ED1\u5931\u8D25" };
      }
    },
    [currentToken, hasReplicaFailure, postAppMutation, setApps]
  );
  const listDomains = (0, import_react.useCallback)(
    async (app) => {
      const appId = app.appId;
      if (!currentToken || !appId) return [];
      try {
        const res = await fetch(`${resolveAppServer(app)}/api/app/domain/list`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${currentToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ appId })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return [];
        const domains = Array.isArray(data?.domains) ? data.domains : [];
        const activeDomain = domains.find((domain) => !domain.pendingDns);
        if (activeDomain?.url) {
          setApps(
            (prev) => prev.map(
              (app2) => app2.appId === appId ? { ...app2, customUrl: activeDomain.url } : app2
            )
          );
        }
        return domains;
      } catch {
        return [];
      }
    },
    [currentToken, resolveAppServer, setApps]
  );
  return {
    deleteApp,
    shareApp,
    bindDomain,
    unbindDomain,
    listDomains
  };
}

export {
  useMyAppListData,
  useMyAppActions
};
