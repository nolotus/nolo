import { normalizeServerOrigin } from "core/serverOrigin";
import {
  buildVersionGetRequest,
  buildVersionListRequest,
  buildVersionSaveRequest,
} from "./versionApi";

export interface VersionListEntry {
  versionId: string;
  entityId: string;
  type: "app" | "doc" | "agent";
  label?: string;
  pinned?: boolean;
  createdAt: number | string;
  createdBy?: string;
}

interface VersionRecord extends VersionListEntry {
  snapshot: any;
}

export const RECENT_APP_VERSION_FANOUT_LIMIT = 5;

const normalizeOrigin = (origin?: string | null): string | null => {
  const normalized = normalizeServerOrigin(origin);
  return normalized || null;
};

async function fetchVersionList(
  server: string,
  token: string,
  entityId: string
): Promise<VersionListEntry[]> {
  const request = buildVersionListRequest(server, token, "app", entityId);
  const res = await fetch(request.url, request.init);
  if (!res.ok) return [];
  const data = await res.json().catch(() => null);
  return Array.isArray(data?.versions) ? data.versions : [];
}

async function fetchVersionRecord(
  server: string,
  token: string,
  entityId: string,
  versionId: string
): Promise<VersionRecord | null> {
  const request = buildVersionGetRequest(server, token, "app", entityId, versionId);
  const res = await fetch(request.url, request.init);
  if (!res.ok) return null;
  const data = await res.json().catch(() => null);
  return data?.version && typeof data.version === "object" ? (data.version as VersionRecord) : null;
}

async function saveVersionRecord(
  server: string,
  token: string,
  record: VersionRecord
): Promise<boolean> {
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
      createdAt:
        typeof record.createdAt === "number"
          ? record.createdAt
          : Date.parse(record.createdAt),
    }
  );
  const res = await fetch(request.url, request.init);
  return res.ok;
}

export async function ensureSpecificAppVersionLocal(args: {
  currentServer: string;
  sourceServer?: string | null;
  token: string;
  appId: string;
  versionId: string;
}): Promise<boolean> {
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

export async function syncSpecificAppVersion(args: {
  currentServer: string;
  sourceServer?: string | null;
  token: string;
  appId: string;
  versionId: string;
}): Promise<boolean> {
  return ensureSpecificAppVersionLocal(args);
}

export async function syncRecentAppVersions(args: {
  currentServer: string;
  sourceServer?: string | null;
  token: string;
  appId: string;
  limit?: number;
}): Promise<number> {
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

export async function fetchAppVersionsCurrentServerFirst(args: {
  currentServer: string;
  sourceServer?: string | null;
  token: string;
  appId: string;
}): Promise<VersionListEntry[]> {
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
    appId: args.appId,
  });

  return remoteVersions;
}
