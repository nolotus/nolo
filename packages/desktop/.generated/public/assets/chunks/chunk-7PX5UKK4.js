import {
  getRecordTimestamp,
  isTombstoneRecord,
  shouldReplaceWithNextRecord
} from "/public/assets/chunks/chunk-RWWUEPWY.js";

// packages/database/userDataMerge.ts
var getUserDataItemTimestamp = (dataItem) => getRecordTimestamp(dataItem);
var getItemKey = (item) => {
  const candidates = [
    typeof item.contentKey === "string" ? item.contentKey : void 0,
    typeof item.dbKey === "string" ? item.dbKey : void 0,
    typeof item.appKey === "string" ? item.appKey : void 0,
    typeof item.appId === "string" ? item.appId : void 0,
    item.id
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return null;
};
var mergeAndDedupUserData = (localData, remoteResults, options = {}) => {
  const uniqueMap = /* @__PURE__ */ new Map();
  const mergeRecordMetadata = (currentItem, nextItem) => {
    if (typeof currentItem.serverOrigin !== "string" && typeof nextItem.serverOrigin === "string" && nextItem.serverOrigin.trim().length > 0) {
      return {
        ...currentItem,
        serverOrigin: nextItem.serverOrigin
      };
    }
    return currentItem;
  };
  const addToMap = (item) => {
    const itemKey = getItemKey(item);
    if (!itemKey) return;
    const existing = uniqueMap.get(itemKey);
    if (!existing) {
      uniqueMap.set(itemKey, item);
      return;
    }
    if (shouldReplaceWithNextRecord(item, existing)) {
      uniqueMap.set(itemKey, item);
      return;
    }
    uniqueMap.set(itemKey, mergeRecordMetadata(existing, item));
  };
  localData.forEach(addToMap);
  remoteResults.forEach((result) => {
    const items = result?.data?.data;
    if (Array.isArray(items)) {
      items.forEach(addToMap);
    }
  });
  const merged = Array.from(uniqueMap.values());
  return options.includeDeleted ? merged : merged.filter((item) => !isTombstoneRecord(item));
};

export {
  getUserDataItemTimestamp,
  getItemKey,
  mergeAndDedupUserData
};
