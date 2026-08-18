import {
  normalizeServerOrigin
} from "/public/assets/chunks/chunk-XJRNNKKF.js";

// packages/create/version/versionApi.ts
var buildAuthHeaders = (token, includeJson = true) => ({
  Authorization: `Bearer ${token}`,
  ...includeJson ? { "Content-Type": "application/json" } : {}
});
function buildVersionListRequest(server, token, type, entityId) {
  const params = new URLSearchParams({ type, entityId });
  return {
    url: `${server}/api/version/list?${params}`,
    init: {
      method: "GET",
      headers: buildAuthHeaders(token, false)
    }
  };
}
function buildVersionGetRequest(server, token, type, entityId, versionId) {
  const params = new URLSearchParams({ type, entityId, versionId });
  return {
    url: `${server}/api/version/get?${params}`,
    init: {
      method: "GET",
      headers: buildAuthHeaders(token, false)
    }
  };
}
function buildVersionSaveRequest(server, token, type, entityId, snapshot, options = {}) {
  return {
    url: `${server}/api/version/save`,
    init: {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({
        type,
        entityId,
        snapshot,
        label: options.label,
        pinned: options.pinned,
        versionId: options.versionId,
        createdAt: options.createdAt
      })
    }
  };
}
function buildVersionPinRequest(server, token, type, entityId, versionId, pinned) {
  return {
    url: `${server}/api/version/pin`,
    init: {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ type, entityId, versionId, pinned })
    }
  };
}
function buildVersionRestoreRequest(server, token, type, entityId, versionId, options = {}) {
  return {
    url: `${server}/api/version/restore`,
    init: {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({
        type,
        entityId,
        versionId,
        ...options.restoreMode ? { restoreMode: options.restoreMode } : {}
      })
    }
  };
}
function buildVersionDeleteRequest(server, token, type, entityId, versionId) {
  return {
    url: `${server}/api/version/delete`,
    init: {
      method: "DELETE",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ type, entityId, versionId })
    }
  };
}
function buildVersionLabelRequest(server, token, type, entityId, versionId, label) {
  return {
    url: `${server}/api/version/label`,
    init: {
      method: "PATCH",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ type, entityId, versionId, label })
    }
  };
}

// packages/create/version/appVersionReplication.ts
var RECENT_APP_VERSION_FANOUT_LIMIT = 5;
var normalizeOrigin = (origin) => {
  const normalized = normalizeServerOrigin(origin);
  return normalized || null;
};
async function fetchVersionList(server, token, entityId) {
  const request = buildVersionListRequest(server, token, "app", entityId);
  const res = await fetch(request.url, request.init);
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return Array.isArray(data?.versions) ? data.versions : [];
}
async function fetchVersionRecord(server, token, entityId, versionId) {
  const request = buildVersionGetRequest(server, token, "app", entityId, versionId);
  const res = await fetch(request.url, request.init);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.version && typeof data.version === "object" ? data.version : null;
}
async function saveVersionRecord(server, token, record) {
  const request = buildVersionSaveRequest(
    server,
    token,
    "app",
    record.entityId,
    record.snapshot,
    {
      label: record.label,
      pinned: record.pinned,
      versionId: record.versionId,
      createdAt: typeof record.createdAt === "number" ? record.createdAt : Date.parse(record.createdAt)
    }
  );
  const res = await fetch(request.url, request.init);
  return res.ok;
}
async function ensureSpecificAppVersionLocal(args) {
  const currentServer = normalizeOrigin(args.currentServer);
  const sourceServer = normalizeOrigin(args.sourceServer);
  if (!currentServer) return false;
  const localRecord = await fetchVersionRecord(currentServer, args.token, args.appId, args.versionId);
  if (localRecord) return true;
  if (!sourceServer || sourceServer === currentServer) return false;
  const remoteRecord = await fetchVersionRecord(sourceServer, args.token, args.appId, args.versionId);
  if (!remoteRecord) return false;
  return saveVersionRecord(currentServer, args.token, remoteRecord);
}
async function syncRecentAppVersions(args) {
  const currentServer = normalizeOrigin(args.currentServer);
  const sourceServer = normalizeOrigin(args.sourceServer);
  if (!currentServer || !sourceServer || currentServer === sourceServer) return 0;
  const remoteVersions = await fetchVersionList(sourceServer, args.token, args.appId);
  const targetVersions = remoteVersions.slice(0, args.limit ?? RECENT_APP_VERSION_FANOUT_LIMIT);
  if (targetVersions.length === 0) return 0;
  const results = await Promise.all(
    targetVersions.map(async (meta) => {
      const record = await fetchVersionRecord(
        sourceServer,
        args.token,
        args.appId,
        meta.versionId
      );
      if (!record) return false;
      return saveVersionRecord(currentServer, args.token, record);
    })
  );
  return results.filter(Boolean).length;
}
async function fetchAppVersionsCurrentServerFirst(args) {
  const currentServer = normalizeOrigin(args.currentServer);
  const sourceServer = normalizeOrigin(args.sourceServer);
  if (!currentServer) return [];
  const localVersions = await fetchVersionList(currentServer, args.token, args.appId);
  if (localVersions.length > 0 || !sourceServer || sourceServer === currentServer) {
    return localVersions;
  }
  const remoteVersions = await fetchVersionList(sourceServer, args.token, args.appId);
  if (remoteVersions.length === 0) return [];
  void syncRecentAppVersions({
    currentServer,
    sourceServer,
    token: args.token,
    appId: args.appId
  });
  return remoteVersions;
}

export {
  buildVersionListRequest,
  buildVersionPinRequest,
  buildVersionRestoreRequest,
  buildVersionDeleteRequest,
  buildVersionLabelRequest,
  ensureSpecificAppVersionLocal,
  syncRecentAppVersions,
  fetchAppVersionsCurrentServerFirst
};
