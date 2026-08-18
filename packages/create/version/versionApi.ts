import type { VersionEntityType } from "./VersionHistoryPanel";

type JsonHeaders = Record<string, string>;

const buildAuthHeaders = (token: string, includeJson = true): JsonHeaders => ({
  Authorization: `Bearer ${token}`,
  ...(includeJson ? { "Content-Type": "application/json" } : {}),
});

export function buildVersionListRequest(
  server: string,
  token: string,
  type: VersionEntityType,
  entityId: string
) {
  const params = new URLSearchParams({ type, entityId });
  return {
    url: `${server}/api/version/list?${params}`,
    init: {
      method: "GET",
      headers: buildAuthHeaders(token, false),
    } satisfies RequestInit,
  };
}

export function buildVersionGetRequest(
  server: string,
  token: string,
  type: VersionEntityType,
  entityId: string,
  versionId: string
) {
  const params = new URLSearchParams({ type, entityId, versionId });
  return {
    url: `${server}/api/version/get?${params}`,
    init: {
      method: "GET",
      headers: buildAuthHeaders(token, false),
    } satisfies RequestInit,
  };
}

export function buildVersionSaveRequest(
  server: string,
  token: string,
  type: VersionEntityType,
  entityId: string,
  snapshot: unknown,
  options: {
    label?: string;
    pinned?: boolean;
    versionId?: string;
    createdAt?: number;
  } = {}
) {
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
        createdAt: options.createdAt,
      }),
    } satisfies RequestInit,
  };
}

export function buildVersionPinRequest(
  server: string,
  token: string,
  type: VersionEntityType,
  entityId: string,
  versionId: string,
  pinned: boolean
) {
  return {
    url: `${server}/api/version/pin`,
    init: {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ type, entityId, versionId, pinned }),
    } satisfies RequestInit,
  };
}

export function buildVersionRestoreRequest(
  server: string,
  token: string,
  type: VersionEntityType,
  entityId: string,
  versionId: string,
  options: {
    restoreMode?: "source_only" | "full";
  } = {}
) {
  return {
    url: `${server}/api/version/restore`,
    init: {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({
        type,
        entityId,
        versionId,
        ...(options.restoreMode ? { restoreMode: options.restoreMode } : {}),
      }),
    } satisfies RequestInit,
  };
}

export function buildVersionDeleteRequest(
  server: string,
  token: string,
  type: VersionEntityType,
  entityId: string,
  versionId: string
) {
  return {
    url: `${server}/api/version/delete`,
    init: {
      method: "DELETE",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ type, entityId, versionId }),
    } satisfies RequestInit,
  };
}

export function buildVersionLabelRequest(
  server: string,
  token: string,
  type: VersionEntityType,
  entityId: string,
  versionId: string,
  label: string
) {
  return {
    url: `${server}/api/version/label`,
    init: {
      method: "PATCH",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ type, entityId, versionId, label }),
    } satisfies RequestInit,
  };
}
