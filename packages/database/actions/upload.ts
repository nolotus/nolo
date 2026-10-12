// 文件路径: database/actions/upload.ts

import { getRuntimeServerContext } from "database/runtimeServerContext";
import { ulid } from "../utils/ulid";
import { normalizeTimeFields, logger } from "./common";
import { saveFileToIndexedDb } from "../fileStorage";
import { fileKey } from "../keys";
import {
  resolveUploadReplicationServers,
  scheduleUploadReplication,
  uploadToCurrentServer,
} from "./replication";
import { DataType } from "create/types";
import { isMediaFile, resolveFileCategory } from "app/utils/fileUtils";
import type { UploadProgressHandler } from "../requests";

/**
 * 辅助函数：保存文件元数据到客户端数据库
 */
const saveToClientDb = async (
  clientDb: any,
  dbKey: string,
  metadata: any
): Promise<void> => {
  if (!clientDb) {
    logger.error({ dbKey }, "Client database is undefined in saveToClientDb");
    throw new Error("Client database instance is required");
  }

  try {
    await clientDb.put(dbKey, metadata);
    logger.debug(
      { dbKey },
      "File metadata saved successfully to local database."
    );
  } catch (err: any) {
    logger.error(
      { err, dbKey },
      "Failed to save file metadata to local database"
    );
    throw new Error(`Local database put failed for ${dbKey}: ${err.message}`);
  }
};

/**
 * Upload File Action: 上传文件并保存元数据。
 *
 * 设计要点：
 * - 以 fileId 作为文件唯一 ID；
 * - 本地 IndexedDB 完整缓存一份（离线可用）；
 * - 按 tenantId（通常为 userId）通过 hash ring 选择若干服务器写入完整副本；
 * - 服务器只需跑单机 fileService，不感知 ring/tenant。
 *
 * 将来扩容到几十台服务器：
 * - 只需要在设置里增加/调整 syncServers 列表；
 * - getAllServers + planServersForTenant 会自动把新节点纳入分布；
 * - 无需修改业务调用代码。
 */
export const uploadFileAction = async (
  uploadConfig: {
    file: File;
    customKey?: string;
    userId?: string;
    /** 可选：主副本上传进度（Web 走 XHR）。不传时维持原 fetch 路径。 */
    onProgress?: UploadProgressHandler;
    /** 可选：取消主副本上传（例如用户移除了上传中的卡片）。 */
    signal?: AbortSignal;
  },
  thunkApi: any
): Promise<any> => {
  const { db: clientDb } = thunkApi.extra;
  const state = thunkApi.getState();
  const { currentServer, syncServers, currentUserId } =
    getRuntimeServerContext(state);

  const { file, customKey, onProgress, signal } = uploadConfig;
  const userId = uploadConfig.userId || currentUserId;
  // 1. 验证参数
  if (!file) {
    const errorMsg =
      "Invalid arguments for uploadFileAction: file is required.";
    logger.error({ uploadConfig }, errorMsg);
    throw new Error(errorMsg);
  }

  try {
    // 2. 生成文件 ID 和文件名（fileId 将作为逻辑 ID，服务端会沿用）
    const fileId = ulid();
    const fileExtension = file.name.split(".").pop() || "";
    const fileName = `${fileId}${fileExtension ? "." + fileExtension : ""}`;

    // 决定最终的 dbKey (强制使用 file-userId-ulid 模式)
    let finalDbKey = customKey;
    if (!finalDbKey || !finalDbKey.startsWith("file-")) {
      const actualUserId = userId || "unknown";
      if (actualUserId === "unknown") {
        console.warn("[uploadFileAction] User ID is unknown during upload. Key will be file-unknown.");
      }
      finalDbKey = fileKey.single(actualUserId, fileId);
    }

    // 3. 准备文件元数据（添加时间戳、dbKey、userId 等）
    const fileMetadata = normalizeTimeFields({
      id: fileId,
      title: file.name,
      originalName: file.name,
      fileName,
      filePath: "",
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      type: DataType.FILE,
      fileCategory: resolveFileCategory({
        mimeType: file.type,
        fileName: file.name,
      }),
      dbKey: finalDbKey,
      userId,
    });

    // 本地结构化元数据：key = finalDbKey（供 dbSlice 等使用）
    await saveToClientDb(clientDb, finalDbKey, fileMetadata);

    // 4. 将原始文件存入 IndexedDB / Native Storage
    // 本地以 fileId 为 key 缓存内容（离线使用）
    // 在 RN 环境下，saveFileToIndexedDb 实际上是存储文件路径引用
    // 音视频大文件（几十 MB）整份写 IndexedDB 要数秒，不能挡在上传前面：
    // 与主副本上传并行，上传完成后再等它收尾（保持「action 返回时本地已缓存」
    // 的既有契约）。其它文件维持原先「先缓存再上传」的顺序。
    const cacheLocally = async () => {
      try {
        await saveFileToIndexedDb(fileId, file);
      } catch (err) {
        logger.warn(
          { err, fileId },
          "[uploadFileAction] Failed to cache file locally."
        );
      }
    };
    const localCachePromise = isMediaFile(file) ? cacheLocally() : null;
    if (!localCachePromise) {
      await cacheLocally();
    }

    // 5. 基于用户 authority 选择 primary；无 authority 时退回 tenant placement。
    //    - 用户搬家或自建服务器时，文件元数据和内容先写入 owner authority
    //    - 副本仍由 syncServers 提供冗余
    const tenantId = userId || "default";
    const uploadReplicationConfig = {
      file,
      metadata: fileMetadata,
      customKey: finalDbKey,
      userId,
    };

    const uploadServers = resolveUploadReplicationServers({
      currentServer,
      syncServers,
      tenantId,
      uploadConfig: uploadReplicationConfig,
      state,
    });
    const primaryUploadServer = uploadServers[0] ?? currentServer;
    const primaryUploadSucceeded = await uploadToCurrentServer({
      currentServer: primaryUploadServer,
      uploadConfig: uploadReplicationConfig,
      state,
      ...(onProgress ? { onProgress } : {}),
      ...(signal ? { signal } : {}),
    });
    if (localCachePromise) {
      await localCachePromise;
    }
    if (primaryUploadServer && !primaryUploadSucceeded) {
      throw new Error(`Primary upload failed on authority server ${primaryUploadServer}`);
    }

    const serversToUse = scheduleUploadReplication({
      currentServer,
      syncServers,
      tenantId,
      uploadConfig: uploadReplicationConfig,
      state,
      excludeServers: primaryUploadServer ? [primaryUploadServer] : [],
    });

    if (!primaryUploadServer && !serversToUse.length) {
      logger.warn(
        { finalDbKey, fileName, tenantId },
        "[uploadFileAction] No replication servers available, file metadata only saved locally."
      );
      return fileMetadata;
    }

    logger.debug(
      { primaryUploadServer, currentServer, serversToUse, tenantId },
      `[uploadFileAction] Uploaded primary copy for ${fileName} and scheduled background sync to ${serversToUse.length} additional servers.`
    );
    // 8. 返回本地保存的元数据
    return fileMetadata;
  } catch (error: any) {
    const errorMessage = `Upload action failed for ${customKey}: ${error?.message || "Unknown error"
      }`;
    logger.error({ error }, "[uploadFileAction] Error");
    throw new Error(errorMessage);
  }
};
