import {
  useUserData
} from "/public/assets/chunks/chunk-QADHV2NS.js";
import {
  MY_CONTENT_USER_DATA_TYPES,
  buildMyContentItemsFromUserData,
  deduplicateContentRecordsWithMappings,
  isUserContentAppRecord
} from "/public/assets/chunks/chunk-Y3JDDU5C.js";
import {
  localFirstLog
} from "/public/assets/chunks/chunk-JFTWAW4J.js";
import {
  getDb
} from "/public/assets/chunks/chunk-IHMA4QTO.js";
import {
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  selectAllMemberSpaces,
  selectRemoteServer
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  bindSyncMappingClientDb,
  ensureSyncMappingsHydrated,
  getSyncMappingVersion,
  listSyncMappings,
  subscribeSyncMappingVersion
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  useTranslation
} from "/public/assets/chunks/chunk-UWXJIOEO.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/hooks/useMyContentItems.ts
var import_react = __toESM(require_react());
function useMyContentItems(filterTypes, limit) {
  const { t } = useTranslation();
  const currentServer = useAppSelector(selectRemoteServer);
  const userId = useUserId() ?? "";
  const hasUser = userId.trim().length > 0;
  const shouldDebugLog = typeof window !== "undefined" && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
  const memberSpaces = useAppSelector(selectAllMemberSpaces);
  const queryLimit = limit ?? 200;
  const queriedTypes = (0, import_react.useMemo)(
    () => filterTypes && filterTypes.length > 0 ? filterTypes : MY_CONTENT_USER_DATA_TYPES,
    [filterTypes]
  );
  const mappingVersion = (0, import_react.useSyncExternalStore)(
    subscribeSyncMappingVersion,
    getSyncMappingVersion,
    () => 0
  );
  const {
    data: localRecords,
    loading: localLoading
  } = useUserData(queriedTypes, "local", queryLimit, {
    localOnly: true,
    partialDataStrategy: "hydrated-cache",
    remoteSummary: true
  });
  const {
    data: accountRecords,
    loading: accountLoading
  } = useUserData(queriedTypes, userId, queryLimit, {
    partialDataStrategy: "hydrated-cache",
    remoteSummary: true
  });
  (0, import_react.useEffect)(() => {
    try {
      const db = getDb();
      if (db) {
        bindSyncMappingClientDb(db);
      }
    } catch {
    }
    void ensureSyncMappingsHydrated().catch(() => {
    });
  }, [userId]);
  const records = (0, import_react.useMemo)(() => {
    if (!hasUser) return localRecords;
    const mappings = listSyncMappings({ accountUserId: userId });
    return deduplicateContentRecordsWithMappings(
      [...localRecords, ...accountRecords],
      mappings
    );
  }, [localRecords, accountRecords, hasUser, userId, mappingVersion]);
  const loading = hasUser ? localLoading || accountLoading : localLoading;
  const spaceNameById = (0, import_react.useMemo)(
    () => new Map(
      memberSpaces.map((space) => [space.spaceId, space.spaceName || space.spaceId])
    ),
    [memberSpaces]
  );
  const items = (0, import_react.useMemo)(
    () => buildMyContentItemsFromUserData(
      records,
      currentServer,
      spaceNameById,
      t("homeActions.myAppsTitle", "\u6211\u7684\u5E94\u7528"),
      t("homeTabs.myContent", "\u6211\u7684\u5185\u5BB9")
    ),
    [records, currentServer, spaceNameById, t]
  );
  (0, import_react.useEffect)(() => {
    if (!hasUser || loading) return;
    if (localStorage.getItem("debugPerf") !== "1") return;
    const perf = window.__sidebarPerfTiming;
    perf?.measure("my_content_items_ready");
    console.debug(
      `[SIDEBAR-PERF] my_content_items_ready: ${((perf?.marks["my_content_items_ready"] ?? 0) - (perf?.marks["mount"] ?? 0)).toFixed(1)}ms since mount`
    );
  }, [hasUser, loading]);
  (0, import_react.useEffect)(() => {
    if (loading) return;
    const mappings = hasUser ? listSyncMappings({ accountUserId: userId }) : [];
    localFirstLog("content.hydrate", {
      mergedCount: records.length,
      hasUser: hasUser ? 1 : 0
    });
  }, [loading, hasUser, userId, records.length]);
  (0, import_react.useEffect)(() => {
    if (shouldDebugLog) {
      const appLikeRecords = records.filter((record) => isUserContentAppRecord(record));
      const appItems = items.filter((item) => item.type === "app" /* APP */);
      console.debug("[my-content] merged items", {
        userId,
        mergedRecords: records.length,
        appLikeRecords: appLikeRecords.length,
        builtAppItems: appItems.length,
        memberships: memberSpaces.length,
        totalItems: items.length
      });
    }
  }, [records, memberSpaces.length, items, shouldDebugLog, userId]);
  return { items, loading };
}

export {
  useMyContentItems
};
