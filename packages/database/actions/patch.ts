// 文件路径: database/actions/patch.ts

import type { DbThunkApi } from "database/thunkApiTypes";
import { getRuntimeServerContext } from "database/runtimeServerContext";
import { actionToast as toast } from "./actionToast";
import { fetchFromServer } from "./common";
import { isRecord } from "core/isRecord";
import { toTimestampMs } from "core/timestamp";
import {
  scheduleConfiguredPatchReplication,
} from "./replication";

/**
 * 深度合并两个对象。源对象中的 null 值会删除目标对象中对应的键。
 * @param target - 目标对象。
 * @param source - 源对象，包含要应用的更改。
 * @returns {any} - 合并后的新对象。
 */
const deepMerge = (target: any, source: any): any => {
  const output = { ...target };
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (source[key] === null && key in output) {
        delete output[key]; // null 值用于删除键
      } else if (isRecord(source[key])) {
        output[key] = deepMerge(output[key] || {}, source[key]); // 递归合并
      } else {
        output[key] = source[key]; // 直接赋值
      }
    }
  }
  return output;
};

const inferNextUpdatedAt = (currentData: any): number | string | undefined => {
  const previousUpdatedAt = currentData?.updatedAt;
  const previousCreatedAt = currentData?.createdAt;
  const previousMetaCreatedAt = currentData?.meta?.createdAt;
  const previousTimestamp = Math.max(
    toTimestampMs(previousUpdatedAt),
    toTimestampMs(previousCreatedAt),
    toTimestampMs(previousMetaCreatedAt)
  );
  const nextTimestamp = Math.max(Date.now(), previousTimestamp + 1);

  if (
    typeof previousUpdatedAt === "number" ||
    typeof previousCreatedAt === "number" ||
    typeof previousMetaCreatedAt === "number"
  ) {
    return nextTimestamp;
  }

  if (
    typeof previousUpdatedAt === "string" ||
    typeof previousCreatedAt === "string"
  ) {
    return new Date(nextTimestamp).toISOString();
  }

  return undefined;
};

/**
 * Patch Action: 对现有数据项应用增量更新。
 * 1. 从本地数据库读取现有数据；本地未命中时先从服务器水合（水合记录与 patch 结果合并后一次性落盘）。
 * 2. 将传入的 'changes' 对象与现有数据进行深度合并。
 * 3. 将合并后的新数据写回本地数据库。
 * 4. 异步地将 'changes' 对象同步到所有相关服务器。
 * @param payload - 包含 dbKey 和 changes 的对象。
 * @param {string} payload.dbKey - 要更新的数据的键。
 * @param {object} payload.changes - 要应用的更改。
 * @param thunkApi - Redux Thunk API，包含 state 和 extra arugments。
 * @returns {Promise<any>} 更新后的完整数据对象。
 * @throws 如果本地数据不存在或更新过程中发生任何错误，则抛出异常。
 */
export const patchAction = async (
  {
    dbKey,
    changes,
    preferredServerOrigin,
  }: { dbKey: string; changes: any; preferredServerOrigin?: string | null },
  thunkApi: DbThunkApi
): Promise<any> => {
  // 1. 从 thunkApi.extra 中获取数据库实例
  const { db } = thunkApi.extra as import("app/store").AppExtra;
  if (!db) {
    const errorMsg = "Database instance is not available.";
    toast.error(errorMsg);
    throw new Error(errorMsg);
  }

  // 2. 验证输入参数
  if (!dbKey || !changes || typeof changes !== "object") {
    const errorMsg = "Patch action requires a valid dbKey and changes object.";
    toast.error(errorMsg);
    throw new Error(errorMsg);
  }

  const state = thunkApi.getState() as import("app/store").RootState;
  const { currentServer, syncServers: configuredSyncServers, currentToken } =
    getRuntimeServerContext(state);

  try {
    // 3. 使用注入的 db 实例读取当前数据；本地未命中时先从服务器水合。
    // 注意：水合记录不单独落盘——与 patch 结果合并后一次性写入，避免
    // 「已回种未打补丁的记录」被后续 patch/读缓存当作权威数据。
    let currentData = await db.get(dbKey);
    if (!currentData) {
      // 本地未命中：记录可能只存在服务器端（典型：web 端服务端 run 持久化的
      // assistant 消息，客户端拉取后只进 redux 不进本地 IndexedDB，导致
      // editUserMessageAndReplay 对目标消息 patch 必失败）。
      const hydrateServer = preferredServerOrigin ?? currentServer;
      const remoteData = hydrateServer
        ? await fetchFromServer(hydrateServer, dbKey, currentToken)
        : null;
      if (!remoteData) {
        throw new Error(
          `Cannot apply patch: Data not found locally or on server for key: ${dbKey}.`
        );
      }
      // 水合是异步的：等待期间本地可能已被并发写入（另一 patch / 同步回写）。
      // 写回前重读本地，命中则以本地为权威，避免用水合快照覆盖较新的本地数据。
      const latestLocal = await db.get(dbKey);
      currentData = latestLocal ?? remoteData;
    }

    const patchChanges = Object.prototype.hasOwnProperty.call(changes, "updatedAt")
      ? changes
      : {
          ...changes,
          ...(inferNextUpdatedAt(currentData) !== undefined
            ? { updatedAt: inferNextUpdatedAt(currentData) }
            : {}),
        };

    // 4. 合并数据并写回本地数据库
    const newData = deepMerge(currentData, patchChanges);
    const persistedData =
      newData && typeof newData === "object" ? { ...newData, dbKey } : { dbKey };
    await db.put(dbKey, persistedData);

    // 5. 异步触发对远程服务器的同步（即发即忘）
    scheduleConfiguredPatchReplication({
      currentServer,
      syncServers: configuredSyncServers,
      preferredServerOrigin,
      dbKey,
      changes: patchChanges,
      state,
    });

    // 6. 乐观地返回更新后的数据
    return persistedData;
  } catch (error: any) {
    const errorMessage = `Failed to update data for ${dbKey}.`;
    toast.error(errorMessage);
    throw new Error(error.message || errorMessage);
  }
};
