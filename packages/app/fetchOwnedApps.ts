import { createAsyncThunk } from "@reduxjs/toolkit";
import type { AppThunkApi } from "app/store";
import { DataType } from "create/types";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import { normalizeServerOrigin } from "core/serverOrigin";
import { toTimestampMs } from "core/timestamp";
import { fetchUserData } from "database/client/fetchUserData";
import { noloQueryRequest } from "database/client/queryRequest";
import { isTombstoneRecord, shouldReplaceWithNextRecord } from "database/tombstones";
import {
  deriveAppIdFromRouteKey,
  isAppRouteKey,
  resolveAppRouteKey,
} from "app/utils/appKeys";
import { toAppSummary, type AppSummary } from "app/types/appSummary";
import type { ContentIcon } from "render/contentIcon/types";
import { syncAppRecord } from "./actions/syncAppRecord";

export type CachedOwnedAppRecord = {
  dbKey: string;
  type: DataType.APP;
  userId: string;
  appId?: string;
  appKey?: string;
  name: string;
  customUrl?: string | null;
  visibility?: "private" | "unlisted" | "public";
  deployMode?: "platform";
  spaceId?: string | null;
  updatedAt?: string | number;
  createdAt?: string | number;
  serverOrigin?: string;
  code?: string;
  source?: unknown;
  framework?: "worker" | "react-spa" | "nolo-react";
  icon?: ContentIcon | null;
};

const normalizeCachedRecord = (
  value: unknown,
  userId: string,
  fallbackServerOrigin?: string
): CachedOwnedAppRecord | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<CachedOwnedAppRecord>;
  const recordDbKey =
    typeof record.dbKey === "string" && record.dbKey.trim().length > 0
      ? record.dbKey
      : undefined;
  const explicitAppId =
    typeof record.appId === "string" && record.appId.trim().length > 0
      ? record.appId
      : undefined;
  const appKey = resolveAppRouteKey(
    typeof record.appKey === "string"
      ? record.appKey
      : isAppRouteKey(recordDbKey)
        ? recordDbKey
        : undefined,
    explicitAppId
  );
  if (!appKey) return null;
  const appId =
    explicitAppId ??
    deriveAppIdFromRouteKey(
      appKey,
      typeof record.userId === "string" && record.userId.trim().length > 0
        ? record.userId
        : userId
    );
  const name =
    typeof record.name === "string" && record.name.trim().length > 0
      ? record.name
      : appId ?? appKey;
  return {
    ...record,
    dbKey: appKey,
    type: DataType.APP,
    userId,
    appId,
    appKey,
    name,
    customUrl:
      typeof record.customUrl === "string" && record.customUrl.trim().length > 0
        ? record.customUrl
        : undefined,
    visibility: record.visibility ?? "private",
    deployMode: record.deployMode ?? "platform",
    icon: record.icon ?? null,
    spaceId:
      typeof record.spaceId === "string" && record.spaceId.trim().length > 0
        ? record.spaceId
        : null,
    updatedAt: record.updatedAt ?? record.createdAt ?? 0,
    createdAt: record.createdAt ?? record.updatedAt ?? 0,
    serverOrigin:
      typeof record.serverOrigin === "string" &&
      record.serverOrigin.trim().length > 0
        ? record.serverOrigin
        : fallbackServerOrigin,
  };
};

const buildCacheRecordFromRemote = (
  value: unknown,
  userId: string,
  serverOrigin: string
): CachedOwnedAppRecord | null => {
  const baseRecord = asRecordOrEmpty(value) as Partial<CachedOwnedAppRecord>;
  return normalizeCachedRecord(
    {
      ...baseRecord,
      serverOrigin,
    },
    userId,
    serverOrigin
  );
};

const mergeOwnedAppRecords = (
  localRecords: CachedOwnedAppRecord[],
  remoteRecords: CachedOwnedAppRecord[],
  fetchedServers: Set<string>
): { mergedRecords: CachedOwnedAppRecord[]; cacheWrites: CachedOwnedAppRecord[] } => {
  const mergedByKey = new Map<string, CachedOwnedAppRecord>();
  const localByKey = new Map<string, CachedOwnedAppRecord>();
  const remoteKeysByServer = new Map<string, Set<string>>();

  for (const record of localRecords) {
    mergedByKey.set(record.dbKey, record);
    localByKey.set(record.dbKey, record);
  }

  for (const remoteRecord of remoteRecords) {
    const remoteServer = remoteRecord.serverOrigin?.trim();
    if (remoteServer) {
      const keys = remoteKeysByServer.get(remoteServer) ?? new Set<string>();
      keys.add(remoteRecord.dbKey);
      remoteKeysByServer.set(remoteServer, keys);
    }
    const existing = mergedByKey.get(remoteRecord.dbKey);
    if (!existing || shouldReplaceWithNextRecord(remoteRecord, existing)) {
      mergedByKey.set(remoteRecord.dbKey, {
        ...existing,
        ...remoteRecord,
      });
    }
  }

  for (const localRecord of localRecords) {
    const localServer = localRecord.serverOrigin?.trim();
    if (!localServer || !fetchedServers.has(localServer)) continue;
    const remoteKeys = remoteKeysByServer.get(localServer) ?? new Set<string>();
    if (!remoteKeys.has(localRecord.dbKey)) {
      mergedByKey.delete(localRecord.dbKey);
    }
  }

  const mergedRecords = [...mergedByKey.values()]
    .filter((record) => !isTombstoneRecord(record))
    .sort((left, right) => toTimestampMs(right.updatedAt) - toTimestampMs(left.updatedAt));

  const cacheWrites = mergedRecords.filter((record) => {
    const localRecord = localByKey.get(record.dbKey);
    return !localRecord || toTimestampMs(record.updatedAt) > toTimestampMs(localRecord.updatedAt);
  });

  return { mergedRecords, cacheWrites };
};

const buildAppUrl = (serverOrigin: string | undefined, appId?: string): string | null => {
  if (!serverOrigin || !appId) return null;
  return `${serverOrigin.replace(/\/+$/, "")}/apps/${appId}/`;
};

export const toOwnedAppSummary = (
  record: CachedOwnedAppRecord,
  fallbackServerOrigin: string
): AppSummary => {
  const summary = toAppSummary(record, fallbackServerOrigin);
  if (!summary) {
    throw new Error(`Invalid app summary record: ${record.dbKey}`);
  }
  return summary;
};

const fetchRemoteOwnedApps = async (
  serverOrigin: string,
  userId: string,
  limit?: number,
  authToken?: string | null
): Promise<{ records: CachedOwnedAppRecord[]; fetched: boolean }> => {
  if (authToken) {
    try {
      const response = await fetch(`${serverOrigin.replace(/\/+$/, "")}/api/app/list`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        const json = await response.json().catch(() => ({ workers: [] }));
        const workers = Array.isArray(json?.workers) ? json.workers : [];
        return {
          records: workers
            .map((worker: any) =>
              buildCacheRecordFromRemote(
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
                  icon: worker.icon ?? null,
                },
                userId,
                serverOrigin
              )
            )
            .filter((record: unknown): record is CachedOwnedAppRecord => !!record),
          fetched: true,
        };
      }
    } catch {}
  }

  try {
    const response = await noloQueryRequest({
      server: serverOrigin,
      queryUserId: userId,
      authToken,
      options: {
        limit,
        condition: { type: DataType.APP },
      },
    });
    if (!response.ok) return { records: [], fetched: false };
    const json = await response.json().catch(() => ({ data: { data: [] } }));
    const items = Array.isArray(json?.data?.data) ? json.data.data : [];
    return {
      records: items
        .map((record: unknown) =>
          buildCacheRecordFromRemote(record, userId, serverOrigin)
        )
        .filter((record: unknown): record is CachedOwnedAppRecord => !!record),
      fetched: true,
    };
  } catch {
    return { records: [], fetched: false };
  }
};

export const fetchOwnedApps = createAsyncThunk<
  AppSummary[],
  { userId: string; server: string; servers: string[]; limit?: number; authToken?: string | null },
  AppThunkApi
>("app/fetchOwnedApps", async ({ userId, server, servers, limit, authToken }, { dispatch, extra }) => {
  const db = extra.db;
  const localRecordsRaw = db
    ? await fetchUserData(db, DataType.APP, userId, { includeDeleted: true }).catch(() => [])
    : [];
  const localRecords = (Array.isArray(localRecordsRaw) ? localRecordsRaw : [])
    .map((record: unknown) => normalizeCachedRecord(record, userId, server))
    .filter((record): record is CachedOwnedAppRecord => !!record);
  const configuredServers = Array.isArray(servers) && servers.length > 0 ? servers : [server];
  const targetServers = [
    ...new Set(
      [
        ...configuredServers,
        ...localRecords
          .map((record) => record.serverOrigin?.trim())
          .filter((origin): origin is string => !!origin),
      ].map((origin) => origin.replace(/\/+$/, ""))
    ),
  ];

  const remoteResults = await Promise.all(
    targetServers.map((serverOrigin) =>
      fetchRemoteOwnedApps(serverOrigin, userId, limit, authToken)
    )
  );
  const remoteRecords = remoteResults.flatMap((result) => result.records);
  const fetchedServers = new Set(
    remoteResults
      .map((result, index) => (result.fetched ? targetServers[index] : null))
      .filter((serverOrigin): serverOrigin is string => !!serverOrigin)
  );
  const { mergedRecords, cacheWrites } = mergeOwnedAppRecords(
    localRecords,
    remoteRecords,
    fetchedServers
  );

  if (db) {
    await Promise.all(
      cacheWrites.map((record) =>
        db.put(record.dbKey, {
          ...record,
          dbKey: record.dbKey,
          type: DataType.APP,
        })
      )
    ).catch(() => undefined);
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
