import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import { useAppSelector } from "app/store";
import {
  buildMyContentItemsFromUserData,
  deduplicateContentRecordsWithMappings,
  isUserContentAppRecord,
  MY_CONTENT_USER_DATA_TYPES,
  resolveUserContentRecordKey,
  type MyContentListItem,
} from "app/utils/myContentItems";
import { selectAllMemberSpaces } from "create/space/spaceSlice";
import { selectRemoteServer } from "app/settings/settingSlice";
import { useUserId } from "identity";
import { DataType } from "create/types";
import { useUserData } from "database/hooks/useUserData";
import {
  bindSyncMappingClientDb,
  ensureSyncMappingsHydrated,
  getSyncMappingVersion,
  listSyncMappings,
  subscribeSyncMappingVersion,
} from "database/sync/syncMapping";
import { getDb } from "database/client/db";
import { localFirstLog } from "app/localFirst/localFirstLog";

export function useMyContentItems(
  filterTypes?: DataType[],
  limit?: number,
): { items: MyContentListItem[]; loading: boolean } {
  const { t } = useTranslation();
  const currentServer = useAppSelector(selectRemoteServer);
  const userId = useUserId() ?? "";
  const hasUser = userId.trim().length > 0;
  const shouldDebugLog =
    typeof window !== "undefined" &&
    /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  const memberSpaces = useAppSelector(selectAllMemberSpaces);

  // 按类型过滤拉取：传 filterTypes 时只拉对应类型；不传时拉全部类型。
  // server 端和 useUserData 都已按类型分摊 limit，单查询即可保证每类型
  // 各拿 limit 条，互不抢占。不再需要 7 个并行查询。
  const queryLimit = limit ?? 200;
  const queriedTypes = useMemo(
    () => (filterTypes && filterTypes.length > 0 ? filterTypes : MY_CONTENT_USER_DATA_TYPES),
    [filterTypes]
  );

  // Re-read listSyncMappings after put/remove/clear/hydrate without render writes.
  const mappingVersion = useSyncExternalStore(
    subscribeSyncMappingVersion,
    getSyncMappingVersion,
    () => 0
  );

  const {
    data: localRecords,
    loading: localLoading,
  } = useUserData(queriedTypes, "local", queryLimit, {
    localOnly: true,
    partialDataStrategy: "hydrated-cache",
    remoteSummary: true,
  });

  const {
    data: accountRecords,
    loading: accountLoading,
  } = useUserData(queriedTypes, userId, queryLimit, {
    partialDataStrategy: "hydrated-cache",
    remoteSummary: true,
  });

  useEffect(() => {
    try {
      const db = getDb();
      if (db) {
        bindSyncMappingClientDb(db);
      }
    } catch {
      /* getDb may throw in non-browser test hosts */
    }
    void ensureSyncMappingsHydrated().catch(() => {
      /* hydrate best-effort; list stays empty until next attempt */
    });
  }, [userId]);

  const records = useMemo(() => {
    if (!hasUser) return localRecords as unknown[];
    const mappings = listSyncMappings({ accountUserId: userId });
    return deduplicateContentRecordsWithMappings(
      [...(localRecords as unknown[]), ...(accountRecords as unknown[])],
      mappings,
    );
    // mappingVersion included because dedup recompute depends on it.
  }, [localRecords, accountRecords, hasUser, userId, mappingVersion]);

  const loading = hasUser ? localLoading || accountLoading : localLoading;

  const spaceNameById = useMemo(
    () =>
      new Map(
        memberSpaces.map((space) => [space.spaceId, space.spaceName || space.spaceId] as const),
      ),
    [memberSpaces],
  );

  const items = useMemo(
    () =>
      buildMyContentItemsFromUserData(
        records as any,
        currentServer,
        spaceNameById,
        t("homeActions.myAppsTitle", "我的应用"),
        t("homeTabs.myContent", "我的内容"),
      ),
    [records, currentServer, spaceNameById, t],
  );

  useEffect(() => {
    if (!hasUser || loading) return;
    if (localStorage.getItem("debugPerf") !== "1") return;
    const perf = window.__sidebarPerfTiming;
    perf?.measure("my_content_items_ready");
    console.debug(
      `[SIDEBAR-PERF] my_content_items_ready: ${((perf?.marks["my_content_items_ready"] ?? 0) - (perf?.marks["mount"] ?? 0)).toFixed(1)}ms since mount`,
    );
  }, [hasUser, loading]);

  useEffect(() => {
    if (loading) return;
    const mappings = hasUser ? listSyncMappings({ accountUserId: userId }) : [];
    localFirstLog("content.hydrate", {
      mergedCount: records.length,
      hasUser: hasUser ? 1 : 0,
    });
  }, [loading, hasUser, userId, records.length]);

  useEffect(() => {
    if (shouldDebugLog) {
      const appLikeRecords = (records as any[]).filter((record) => isUserContentAppRecord(record));
      const appItems = items.filter((item) => item.type === DataType.APP);
      console.debug("[my-content] merged items", {
        userId,
        mergedRecords: records.length,
        appLikeRecords: appLikeRecords.length,
        builtAppItems: appItems.length,
        memberships: memberSpaces.length,
        totalItems: items.length,
      });
    }
  }, [records, memberSpaces.length, items, shouldDebugLog, userId]);

  return { items, loading };
}