import { createAsyncThunk } from "@reduxjs/toolkit";

import type { AppThunkApi } from "app/store";
import { asTrimmedString } from "core/trimmedString";

import { fetchFromClientDb } from "./common";
import { isTombstoneRecord, prepareTombstoneRecordForCache, shouldReplaceWithNextRecord } from "../tombstones";

type CacheableUserDataRecord = {
  dbKey?: string;
  serverOrigin?: string;
  [key: string]: unknown;
};

export const shouldUpdateLocalUserDataCache = (
  nextRecord: CacheableUserDataRecord,
  localRecord: CacheableUserDataRecord | null
): boolean => {
  if (!nextRecord || typeof nextRecord !== "object") {
    return false;
  }

  if (!localRecord || typeof localRecord !== "object") {
    return true;
  }

  if (shouldReplaceWithNextRecord(nextRecord, localRecord)) {
    return true;
  }

  return (
    !isTombstoneRecord(localRecord) &&
    typeof localRecord.serverOrigin !== "string" &&
    typeof nextRecord.serverOrigin === "string" &&
    nextRecord.serverOrigin.trim().length > 0
  );
};

export const cacheMergedUserDataThunk = createAsyncThunk<
  void,
  { records: CacheableUserDataRecord[] },
  AppThunkApi
>("db/cacheMergedUserData", async ({ records }, { extra }) => {
  const clientDb = extra.db;
  if (!clientDb) {
    throw new Error("Client database is not available.");
  }

  // Last record wins per dbKey so concurrent puts never race on the same key.
  const uniqueByDbKey = new Map<string, CacheableUserDataRecord>();
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
          error,
        });
      }
    }),
  );
});
