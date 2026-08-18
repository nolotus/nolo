import {
  isAppRouteKey,
  resolveAppRouteKey,
  toAppSummary
} from "/public/assets/chunks/chunk-G4VE62AJ.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  normalizeAppRouteId
} from "/public/assets/chunks/chunk-TBNFSVJC.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";

// packages/app/utils/myContentItems.ts
var MY_CONTENT_USER_DATA_TYPES = [
  "app" /* APP */,
  "page" /* DOC */,
  "dialog" /* DIALOG */,
  "image" /* IMAGE */,
  "file" /* FILE */,
  "table" /* TABLE */,
  "agent" /* AGENT */
];
var normalizeText = (value) => asTrimmedString(value);
var resolveUserContentRecordKey = (record) => {
  const contentKey = normalizeText(record.contentKey);
  if (contentKey) return contentKey;
  const dbKey = normalizeText(record.dbKey);
  if (dbKey) return dbKey;
  const appKey = normalizeText(record.appKey);
  if (appKey) return appKey;
  return resolveAppRouteKey(void 0, normalizeText(record.appId)) ?? "";
};
var isUserContentAppRecord = (record) => {
  const normalizedType = normalizeText(record.type).toLowerCase();
  const canonicalKey = resolveUserContentRecordKey(record);
  return normalizedType === "app" /* APP */ || isAppRouteKey(canonicalKey);
};
var resolveMyContentTab = (item) => {
  const normalizedType = item.type?.toLowerCase();
  const contentKey = item.contentKey;
  if (normalizedType === "app" /* APP */ || contentKey.startsWith("app-")) return "app";
  if (normalizedType === "agent" /* AGENT */ || contentKey.startsWith("agent-")) {
    return "agent";
  }
  if (normalizedType === "dialog" /* DIALOG */ || contentKey.startsWith("dialog-")) return "dialog";
  if (normalizedType === "page" /* DOC */ || contentKey.startsWith("page-")) return "page";
  if (normalizedType === "image" /* IMAGE */ || contentKey.startsWith("image-") || normalizedType === "file" /* FILE */ && item.fileCategory === "image") {
    return "image";
  }
  if (normalizedType === "file" /* FILE */ && item.fileCategory === "document") {
    return "document";
  }
  if (normalizedType === "file" /* FILE */ && item.fileCategory === "video") {
    return "video";
  }
  if (normalizedType === "file" /* FILE */ && item.fileCategory === "audio") {
    return "audio";
  }
  if (normalizedType === "table" || contentKey.startsWith("meta-")) return "table";
  return "file";
};
var toTimestamp = (value) => typeof value === "number" ? value : Date.parse(value) || 0;
var normalizeSpaceId = (spaceId) => {
  return asOptionalTrimmedString(spaceId) ?? null;
};
var resolveRecordTimestamp = (record) => record.updatedAt ?? record.updated_at ?? record.createdAt ?? record.created ?? 0;
var deduplicateContentRecords = (records) => {
  const uniqueMap = /* @__PURE__ */ new Map();
  for (const record of records) {
    const key = resolveUserContentRecordKey(record);
    if (!key) continue;
    const existing = uniqueMap.get(key);
    if (!existing) {
      uniqueMap.set(key, record);
      continue;
    }
    const existingTs = toTimestamp(resolveRecordTimestamp(existing));
    const nextTs = toTimestamp(resolveRecordTimestamp(record));
    if (nextTs > existingTs) {
      uniqueMap.set(key, record);
    }
  }
  return Array.from(uniqueMap.values());
};
var pickPreferredMappedRecord = (left, right) => {
  const leftTs = toTimestamp(resolveRecordTimestamp(left));
  const rightTs = toTimestamp(resolveRecordTimestamp(right));
  if (rightTs > leftTs) return right;
  if (leftTs > rightTs) return left;
  return right;
};
var deduplicateContentRecordsWithMappings = (records, mappings = []) => {
  const byKey = /* @__PURE__ */ new Map();
  for (const record of deduplicateContentRecords(records)) {
    const key = resolveUserContentRecordKey(record);
    if (!key) continue;
    byKey.set(key, record);
  }
  const dropKeys = /* @__PURE__ */ new Set();
  for (const mapping of mappings) {
    const localKey = asTrimmedString(mapping.localDbKey);
    const remoteKey = asTrimmedString(mapping.remoteDbKey);
    if (!localKey || !remoteKey || localKey === remoteKey) continue;
    if (dropKeys.has(localKey) || dropKeys.has(remoteKey)) continue;
    const localRecord = byKey.get(localKey);
    const remoteRecord = byKey.get(remoteKey);
    if (!localRecord || !remoteRecord) continue;
    const preferred = pickPreferredMappedRecord(localRecord, remoteRecord);
    const preferredKey = resolveUserContentRecordKey(preferred);
    const dropKey = preferredKey === remoteKey ? localKey : remoteKey;
    byKey.set(preferredKey || remoteKey, preferred);
    if (dropKey && dropKey !== (preferredKey || remoteKey)) {
      byKey.delete(dropKey);
      dropKeys.add(dropKey);
    }
  }
  return Array.from(byKey.values());
};
function buildOwnedAppContentItems(apps, myAppsLabel) {
  return apps.flatMap((app) => {
    const contentKey = app.appKey ?? normalizeAppRouteId(app.appId ?? "");
    if (!contentKey) return [];
    const timestamp = app.modifiedOn ?? 0;
    return [
      {
        source: "owned-app",
        title: typeof app.name === "string" && app.name.trim() ? app.name : contentKey,
        type: "app" /* APP */,
        contentKey,
        pinned: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        spaceId: null,
        spaceName: myAppsLabel,
        serverOrigin: app.serverOrigin,
        app
      }
    ];
  }).sort(
    (left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt) || left.contentKey.localeCompare(right.contentKey)
  );
}
function pinnedFirst(a, b) {
  return Number(Boolean(b.pinned)) - Number(Boolean(a.pinned));
}
function buildMyContentItemsFromUserData(records, currentServer, spaceNameById, myAppsLabel, fallbackSpaceLabel) {
  const items = records.flatMap((record) => {
    const contentKey = resolveUserContentRecordKey(record);
    const normalizedType = normalizeText(record.type).toLowerCase();
    const isAppRecord = isUserContentAppRecord(record);
    const contentType = isAppRecord ? "app" /* APP */ : normalizedType;
    const timestamp = resolveRecordTimestamp(record);
    const spaceId = normalizeSpaceId(record.spaceId);
    const spaceName = spaceId ? spaceNameById.get(spaceId) ?? spaceId : isAppRecord ? myAppsLabel : fallbackSpaceLabel;
    if (isAppRecord) {
      const app = toAppSummary(
        {
          ...record,
          appKey: typeof record.appKey === "string" && record.appKey.trim().length > 0 ? record.appKey : contentKey,
          dbKey: contentKey
        },
        currentServer
      );
      if (!app || !(app.appKey || app.appId)) return [];
      return [
        {
          source: "owned-app",
          title: typeof app.name === "string" && app.name.trim() ? app.name : contentKey,
          type: "app" /* APP */,
          contentKey: app.appKey ?? normalizeAppRouteId(app.appId ?? ""),
          pinned: Boolean(record.pinned),
          createdAt: timestamp,
          updatedAt: timestamp,
          spaceId,
          spaceName,
          serverOrigin: app.serverOrigin,
          app
        }
      ];
    }
    if (!contentKey || !contentType) return [];
    const title = normalizeText(record.title) || normalizeText(record.displayName) || normalizeText(record.name) || contentKey;
    return [
      {
        source: "user-data",
        title,
        type: contentType,
        fileCategory: record.fileCategory,
        mimeType: typeof record.mimeType === "string" ? record.mimeType : void 0,
        fileSize: typeof record.fileSize === "number" ? record.fileSize : void 0,
        originalName: typeof record.originalName === "string" && record.originalName.trim().length > 0 ? record.originalName : void 0,
        contentKey,
        pinned: Boolean(record.pinned),
        createdAt: record.createdAt ?? record.created ?? 0,
        updatedAt: timestamp,
        spaceId,
        spaceName,
        serverOrigin: typeof record.serverOrigin === "string" && record.serverOrigin.trim().length > 0 ? record.serverOrigin : void 0,
        cybots: record.cybots,
        primaryAgentKey: record.primaryAgentKey || record.primaryCybotKey
      }
    ];
  });
  return items.sort((left, right) => {
    const pinDiff = pinnedFirst(left, right);
    return pinDiff || toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt) || left.contentKey.localeCompare(right.contentKey);
  });
}
var previewItemKey = (item) => `${item.source}:${item.contentKey}:${item.spaceId ?? "none"}`;
function buildMyContentPreviewItems(items, limit, activeTab = "all") {
  if (typeof limit !== "number") return items;
  if (activeTab !== "all") return items.slice(0, limit);
  const previewPriority = [
    "app",
    "agent",
    "dialog",
    "page",
    "table",
    "image",
    "document",
    "video",
    "audio",
    "file"
  ];
  const selected = [];
  const selectedKeys = /* @__PURE__ */ new Set();
  const pushIfNeeded = (item) => {
    if (!item || selected.length >= limit) return;
    const key = previewItemKey(item);
    if (selectedKeys.has(key)) return;
    selected.push(item);
    selectedKeys.add(key);
  };
  for (const tab of previewPriority) {
    pushIfNeeded(items.find((item) => resolveMyContentTab(item) === tab));
    if (selected.length >= limit) return selected;
  }
  for (const item of items) {
    pushIfNeeded(item);
    if (selected.length >= limit) break;
  }
  return selected;
}

export {
  MY_CONTENT_USER_DATA_TYPES,
  isUserContentAppRecord,
  resolveMyContentTab,
  deduplicateContentRecordsWithMappings,
  buildOwnedAppContentItems,
  pinnedFirst,
  buildMyContentItemsFromUserData,
  buildMyContentPreviewItems
};
