import {
  createAsyncThunk,
  fetchFromClientDb,
  isTombstoneRecord,
  prepareTombstoneRecordForCache,
  shouldReplaceWithNextRecord
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";

// packages/database/actions/cacheMergedUserData.ts
var shouldUpdateLocalUserDataCache = (nextRecord, localRecord) => {
  if (!nextRecord || typeof nextRecord !== "object") {
    return false;
  }
  if (!localRecord || typeof localRecord !== "object") {
    return true;
  }
  if (shouldReplaceWithNextRecord(nextRecord, localRecord)) {
    return true;
  }
  return !isTombstoneRecord(localRecord) && typeof localRecord.serverOrigin !== "string" && typeof nextRecord.serverOrigin === "string" && nextRecord.serverOrigin.trim().length > 0;
};
var cacheMergedUserDataThunk = createAsyncThunk("db/cacheMergedUserData", async ({ records }, { extra }) => {
  const clientDb = extra.db;
  if (!clientDb) {
    throw new Error("Client database is not available.");
  }
  const uniqueByDbKey = /* @__PURE__ */ new Map();
  for (const record of records) {
    const dbKey = asTrimmedString(record?.dbKey);
    if (!dbKey) continue;
    uniqueByDbKey.set(dbKey, record);
  }
  await Promise.all(
    Array.from(uniqueByDbKey.entries()).map(async ([dbKey, record]) => {
      try {
        const recordForCache = prepareTombstoneRecordForCache(record);
        const localRecord = await fetchFromClientDb(clientDb, dbKey);
        if (!shouldUpdateLocalUserDataCache(recordForCache, localRecord)) {
          return;
        }
        await clientDb.put(dbKey, recordForCache);
      } catch (error) {
        console.warn("[useUserData] Failed to cache merged user data record", {
          dbKey,
          error
        });
      }
    })
  );
});

export {
  cacheMergedUserDataThunk
};
