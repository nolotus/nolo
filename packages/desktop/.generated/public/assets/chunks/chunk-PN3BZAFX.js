import {
  asOptionalFiniteNumber,
  asOptionalPositiveFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";

// packages/core/trimmedString.ts
function asTrimmedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

// packages/database/levelNotFoundError.ts
function isLevelNotFoundError(error) {
  if (!error || typeof error !== "object") return false;
  const e = error;
  return e.notFound === true || e.name === "NotFoundError" || e.code === "LEVEL_NOT_FOUND" || e.code === "LEVEL_NOT_FOUND_ERROR" || e.message === "NotFound";
}

// packages/database/sync/syncMappingKeys.ts
var SYNC_MAPPING_KEY_PREFIX = "syncmap-local-";
var SYNC_MAPPING_KEY_SEPARATOR = "::";
var SYNC_MAPPING_RECORD_TYPE = "sync_mapping";
var normalizeSegment = (value) => asTrimmedString(value);
function buildSyncMappingRecordKey(accountUserId, localDbKey) {
  const account = normalizeSegment(accountUserId);
  const local = normalizeSegment(localDbKey);
  if (!account) {
    throw new Error("syncMapping record key requires accountUserId");
  }
  if (!local) {
    throw new Error("syncMapping record key requires localDbKey");
  }
  if (account.includes(SYNC_MAPPING_KEY_SEPARATOR)) {
    throw new Error(
      `syncMapping accountUserId must not contain "${SYNC_MAPPING_KEY_SEPARATOR}"`
    );
  }
  return `${SYNC_MAPPING_KEY_PREFIX}${account}${SYNC_MAPPING_KEY_SEPARATOR}${local}`;
}
function isSyncMappingRecordKey(dbKey) {
  const key = normalizeSegment(dbKey);
  return key.startsWith(SYNC_MAPPING_KEY_PREFIX);
}
function syncMappingRecordKeyRange() {
  const start = SYNC_MAPPING_KEY_PREFIX;
  return {
    gte: start,
    lte: `${start}\uFFFF`
  };
}

// packages/database/sync/syncMappingDurable.ts
var clean = (value) => asTrimmedString(value);
function toDurableSyncMappingRecord(input) {
  const localDbKey = clean(input.localDbKey);
  const remoteDbKey = clean(input.remoteDbKey);
  const accountUserId = clean(input.accountUserId);
  const contentType = clean(input.contentType) || "unknown";
  const updatedAt = asOptionalFiniteNumber(input.updatedAt) ?? Date.now();
  if (!localDbKey || !remoteDbKey || !accountUserId) {
    throw new Error("durable syncMapping requires local/remote/account keys");
  }
  const dbKey = buildSyncMappingRecordKey(accountUserId, localDbKey);
  return {
    type: SYNC_MAPPING_RECORD_TYPE,
    userId: "local",
    dbKey,
    localDbKey,
    remoteDbKey,
    accountUserId,
    contentType,
    updatedAt
  };
}
function parseDurableSyncMappingRecord(value) {
  if (!value || typeof value !== "object") return null;
  const row = value;
  if (row.type !== SYNC_MAPPING_RECORD_TYPE) return null;
  if (row.userId !== "local" && row.userId !== void 0) {
    return null;
  }
  const localDbKey = clean(row.localDbKey);
  const remoteDbKey = clean(row.remoteDbKey);
  const accountUserId = clean(row.accountUserId);
  const contentType = clean(row.contentType) || "unknown";
  const updatedAt = asOptionalFiniteNumber(row.updatedAt) ?? Date.now();
  if (!localDbKey || !remoteDbKey || !accountUserId) return null;
  if (localDbKey === remoteDbKey) return null;
  if (accountUserId === "local") return null;
  return {
    localDbKey,
    remoteDbKey,
    accountUserId,
    contentType,
    updatedAt
  };
}
async function persistSyncMappingToDb(db, input) {
  const record = toDurableSyncMappingRecord(input);
  await db.put(record.dbKey, record);
  return record;
}
async function removeSyncMappingFromDb(db, accountUserId, localDbKey) {
  const dbKey = buildSyncMappingRecordKey(accountUserId, localDbKey);
  try {
    if (typeof db.del === "function") {
      await db.del(dbKey);
      return true;
    }
    await db.put(dbKey, null);
    return true;
  } catch (err) {
    if (isLevelNotFoundError(err)) return false;
    throw err;
  }
}
async function loadSyncMappingsFromDb(db) {
  if (typeof db.iterator !== "function") {
    return [];
  }
  const range = syncMappingRecordKeyRange();
  let iterator = db.iterator(range);
  if (iterator && typeof iterator.then === "function") {
    iterator = await iterator;
  }
  if (!iterator) return [];
  const out = [];
  for await (const entry of iterator) {
    const pair = entry;
    const key = Array.isArray(pair) ? pair[0] : "";
    const value = Array.isArray(pair) ? pair[1] : null;
    if (!isSyncMappingRecordKey(key)) continue;
    if (value == null) continue;
    const mapping = parseDurableSyncMappingRecord(value);
    if (mapping) out.push(mapping);
  }
  return out;
}

// packages/database/sync/syncMapping.ts
var normalizeKey = (value) => asTrimmedString(value);
var normalizeContentType = (value) => {
  const trimmed = normalizeKey(value);
  return trimmed.length > 0 ? trimmed : "unknown";
};
var toUpdatedAt = (value, fallback) => {
  const asNumber = asOptionalPositiveFiniteNumber(value);
  if (asNumber !== void 0) return asNumber;
  if (typeof value === "string" && value.trim()) {
    return asOptionalPositiveFiniteNumber(Date.parse(value)) ?? fallback;
  }
  return fallback;
};
var pairKey = (accountUserId, localDbKey) => `${accountUserId}\0${localDbKey}`;
function normalizeSyncMapping(input, now = Date.now()) {
  const localDbKey = normalizeKey(input.localDbKey);
  const remoteDbKey = normalizeKey(input.remoteDbKey);
  const accountUserId = normalizeKey(input.accountUserId);
  const contentType = normalizeContentType(input.contentType);
  if (!localDbKey) {
    throw new Error("syncMapping.localDbKey is required");
  }
  if (!remoteDbKey) {
    throw new Error("syncMapping.remoteDbKey is required");
  }
  if (!accountUserId) {
    throw new Error("syncMapping.accountUserId is required");
  }
  if (localDbKey === remoteDbKey) {
    throw new Error("syncMapping.localDbKey and remoteDbKey must differ");
  }
  if (accountUserId === "local") {
    throw new Error(
      "syncMapping.accountUserId must be a non-local account user id"
    );
  }
  return {
    localDbKey,
    remoteDbKey,
    accountUserId,
    contentType,
    updatedAt: toUpdatedAt(input.updatedAt, now)
  };
}
function createSyncMappingStore(options) {
  const now = options?.now ?? Date.now;
  const byPair = /* @__PURE__ */ new Map();
  const remoteToPair = /* @__PURE__ */ new Map();
  const forgetRemoteIndex = (mapping) => {
    if (!mapping) return;
    const current = remoteToPair.get(mapping.remoteDbKey);
    if (current === pairKey(mapping.accountUserId, mapping.localDbKey)) {
      remoteToPair.delete(mapping.remoteDbKey);
    }
  };
  return {
    put(input) {
      const mapping = normalizeSyncMapping(input, now());
      const key = pairKey(mapping.accountUserId, mapping.localDbKey);
      const previousLocal = byPair.get(key);
      if (previousLocal) {
        forgetRemoteIndex(previousLocal);
      }
      const previousPairForRemote = remoteToPair.get(mapping.remoteDbKey);
      if (previousPairForRemote && previousPairForRemote !== key) {
        const displaced = byPair.get(previousPairForRemote);
        if (displaced) {
          byPair.delete(previousPairForRemote);
        }
      }
      byPair.set(key, mapping);
      remoteToPair.set(mapping.remoteDbKey, key);
      return { ...mapping };
    },
    get(localDbKey, accountUserId) {
      const local = normalizeKey(localDbKey);
      if (!local) return null;
      const account = normalizeKey(accountUserId);
      if (account) {
        const mapping = byPair.get(pairKey(account, local));
        return mapping ? { ...mapping } : null;
      }
      let best = null;
      for (const mapping of byPair.values()) {
        if (mapping.localDbKey !== local) continue;
        if (!best || mapping.updatedAt > best.updatedAt) {
          best = mapping;
        }
      }
      return best ? { ...best } : null;
    },
    getByRemoteDbKey(remoteDbKey, accountUserId) {
      const key = normalizeKey(remoteDbKey);
      if (!key) return null;
      const pair = remoteToPair.get(key);
      if (!pair) return null;
      const mapping = byPair.get(pair);
      if (!mapping) return null;
      const account = normalizeKey(accountUserId);
      if (account && mapping.accountUserId !== account) return null;
      return { ...mapping };
    },
    list(filter) {
      const accountUserId = normalizeKey(filter?.accountUserId);
      const contentType = normalizeKey(filter?.contentType);
      const rows = Array.from(byPair.values()).filter((mapping) => {
        if (accountUserId && mapping.accountUserId !== accountUserId) {
          return false;
        }
        if (contentType && mapping.contentType !== contentType) return false;
        return true;
      });
      return rows.map((mapping) => ({ ...mapping })).sort(
        (left, right) => right.updatedAt - left.updatedAt || left.localDbKey.localeCompare(right.localDbKey) || left.accountUserId.localeCompare(right.accountUserId)
      );
    },
    remove(localDbKey, accountUserId) {
      const local = normalizeKey(localDbKey);
      if (!local) return false;
      const account = normalizeKey(accountUserId);
      if (account) {
        const key = pairKey(account, local);
        const existing = byPair.get(key);
        if (!existing) return false;
        byPair.delete(key);
        forgetRemoteIndex(existing);
        return true;
      }
      let removed = false;
      for (const [key, mapping] of Array.from(byPair.entries())) {
        if (mapping.localDbKey !== local) continue;
        byPair.delete(key);
        forgetRemoteIndex(mapping);
        removed = true;
      }
      return removed;
    },
    clear() {
      byPair.clear();
      remoteToPair.clear();
    },
    size() {
      return byPair.size;
    }
  };
}
var defaultSyncMappingStore = createSyncMappingStore();
var mappingVersion = 0;
var mappingListeners = /* @__PURE__ */ new Set();
var sameConsumerMapping = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.localDbKey === b.localDbKey && a.remoteDbKey === b.remoteDbKey && a.accountUserId === b.accountUserId && a.contentType === b.contentType;
};
var notifySyncMappingListeners = () => {
  mappingVersion += 1;
  for (const listener of mappingListeners) {
    try {
      listener();
    } catch {
    }
  }
};
function subscribeSyncMappingVersion(listener) {
  mappingListeners.add(listener);
  return () => {
    mappingListeners.delete(listener);
  };
}
function getSyncMappingVersion() {
  return mappingVersion;
}
var boundClientDb = null;
var mappingsHydrated = false;
var hydrateEpoch = 0;
var hydrateInFlight = null;
function bindSyncMappingClientDb(db) {
  boundClientDb = db;
  mappingsHydrated = false;
  hydrateEpoch += 1;
}
function getBoundSyncMappingClientDb() {
  return boundClientDb;
}
async function ensureSyncMappingsHydrated(db) {
  const client = db ?? boundClientDb;
  if (!client) return false;
  if (mappingsHydrated) return false;
  if (hydrateInFlight && hydrateInFlight.epoch === hydrateEpoch) {
    await hydrateInFlight.promise;
    return false;
  }
  const epoch = hydrateEpoch;
  const clientAtStart = client;
  const promise = (async () => {
    const rows = await loadSyncMappingsFromDb(clientAtStart);
    if (epoch !== hydrateEpoch) {
      return false;
    }
    const beforeSize = defaultSyncMappingStore.size();
    defaultSyncMappingStore.clear();
    for (const row of rows) {
      try {
        defaultSyncMappingStore.put(row);
      } catch {
      }
    }
    mappingsHydrated = true;
    if (beforeSize > 0 || rows.length > 0 || defaultSyncMappingStore.size() > 0) {
      notifySyncMappingListeners();
    }
    return true;
  })();
  hydrateInFlight = { epoch, promise };
  try {
    return await promise;
  } finally {
    if (hydrateInFlight?.promise === promise) {
      hydrateInFlight = null;
    }
  }
}
function putSyncMapping(mapping) {
  const account = normalizeKey(mapping.accountUserId);
  const local = normalizeKey(mapping.localDbKey);
  const previous = account && local ? defaultSyncMappingStore.get(local, account) : null;
  const next = defaultSyncMappingStore.put(mapping);
  if (!sameConsumerMapping(previous, next)) {
    notifySyncMappingListeners();
  }
  return next;
}
async function putSyncMappingDurable(mapping) {
  const normalized = normalizeSyncMapping(mapping);
  if (!boundClientDb) {
    throw new Error(
      "putSyncMappingDurable requires a bound client DB; refuse silent memory-only durability"
    );
  }
  await persistSyncMappingToDb(boundClientDb, normalized);
  return putSyncMapping(normalized);
}
function getSyncMapping(localDbKey, accountUserId) {
  return defaultSyncMappingStore.get(localDbKey, accountUserId);
}
function getSyncMappingByRemoteDbKey(remoteDbKey, accountUserId) {
  return defaultSyncMappingStore.getByRemoteDbKey(remoteDbKey, accountUserId);
}
function listSyncMappings(filter) {
  return defaultSyncMappingStore.list(filter);
}
function removeSyncMapping(localDbKey, accountUserId) {
  const removed = defaultSyncMappingStore.remove(localDbKey, accountUserId);
  if (removed) {
    notifySyncMappingListeners();
  }
  return removed;
}
async function removeSyncMappingDurable(localDbKey, accountUserId) {
  const account = normalizeKey(accountUserId);
  const local = normalizeKey(localDbKey);
  if (!account || !local) return false;
  if (boundClientDb) {
    await removeSyncMappingFromDb(boundClientDb, account, local);
  }
  return removeSyncMapping(local, account);
}
function clearSyncMappings() {
  const hadRows = defaultSyncMappingStore.size() > 0;
  defaultSyncMappingStore.clear();
  mappingsHydrated = false;
  hydrateEpoch += 1;
  if (hadRows) {
    notifySyncMappingListeners();
  }
}
function getDefaultSyncMappingStore() {
  return defaultSyncMappingStore;
}
function areSyncMappingsHydrated() {
  return mappingsHydrated;
}

export {
  asTrimmedString,
  isLevelNotFoundError,
  normalizeSyncMapping,
  createSyncMappingStore,
  subscribeSyncMappingVersion,
  getSyncMappingVersion,
  bindSyncMappingClientDb,
  getBoundSyncMappingClientDb,
  ensureSyncMappingsHydrated,
  putSyncMapping,
  putSyncMappingDurable,
  getSyncMapping,
  getSyncMappingByRemoteDbKey,
  listSyncMappings,
  removeSyncMapping,
  removeSyncMappingDurable,
  clearSyncMappings,
  getDefaultSyncMappingStore,
  areSyncMappingsHydrated
};
