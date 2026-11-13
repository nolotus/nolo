import { createAsyncThunk } from "@reduxjs/toolkit";

import type { AppThunkApi } from "app/store";
import { asTrimmedString } from "core/trimmedString";

import { fetchFromClientDb } from "./common";
import { isTombstoneRecord, prepareTombstoneRecordForCache, shouldReplaceWithNextRecord } from "../tombstones";
import { isPageBodyDowngrade } from "./readResolution";

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

  // 页面元数据投影（summary：无 slateData / content）不得覆盖已缓存的完整正文，
  // 也不得把较新的 summary 时间盖到旧正文上冒充"已确认的新正文"。
  // 列表展示仍消费 summary —— 这里只跳过正文降级的缓存写入。
  if (isPageBodyDowngrade(nextRecord, localRecord)) {
    return false;
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
