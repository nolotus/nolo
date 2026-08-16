
/**
 * React Native 端的"文件存储"实现
 * 
 * 由于 RN 环境没有 IndexedDB，且直接将文件存入 LevelDB 性能较差（虽然可行但不是最佳实践），
 * 这里我们采用折衷方案：
 * 1. 假设文件已经存在于设备文件系统中（例如相册选择的临时路径，或者下载后的路径）。
 * 2. 我们只存储 fileId -> localUri 的映射关系到 LevelDB 中。
 * 3. 读取时返回这个映射，让上层通过 Image.source 或 RNFS 读取。
 * 
 * 注意：如果原始文件被系统清理（如 tmp 目录），这个引用会失效。
 * 理想情况下应该 copy 到 DocumentDirectory，但为了避免引入 react-native-fs 依赖导致需要 rebuild，
 * 暂时先存储路径映射。
 */

import { getDb } from "./client/db";

// 在 RN 中，File 对象通常是 { uri, name, type, size } 的结构
export interface RNFile {
    uri: string;
    name: string;
    type: string;
    size: number;
}

export interface StoredFileRecord {
    id: string;
    uri: string; // 替代 blob
    size: number;
    type: string;
    createdAt: string;
}

const FILE_PREFIX = "local-file-ref:";

export const saveFileToIndexedDb = async (
    fileId: string,
    file: File | Blob | RNFile
): Promise<void> => {
    try {
        const db = getDb();
        if (!db) {
            console.warn("[fileStorage.native] Database not initialized");
            return;
        }

        // 检查是否为 RN 文件结构
        const uri = (file as any).uri;
        if (!uri) {
            console.warn("[fileStorage.native] File object missing URI, cannot store reference", file);
            return;
        }

        const record: StoredFileRecord = {
            id: fileId,
            uri: uri,
            size: (file as any).size || 0,
            type: (file as any).type || "application/octet-stream",
            createdAt: new Date().toISOString(),
        };

        await db.put(`${FILE_PREFIX}${fileId}`, record);
        console.log(`[fileStorage.native] Saved file reference: ${fileId} -> ${uri}`);
    } catch (err) {
        console.error("[fileStorage.native] Failed to save file reference:", err);
    }
};

export const loadFileFromIndexedDb = async (
    fileId: string
): Promise<StoredFileRecord | null> => {
    try {
        const db = getDb();
        if (!db) return null;

        const record = await db.get(`${FILE_PREFIX}${fileId}`);
        return record as StoredFileRecord;
    } catch (err) {
        // LevelDB throws if key not found
        return null;
    }
};

export const deleteFileFromIndexedDb = async (fileId: string): Promise<void> => {
    try {
        const db = getDb();
        if (!db) return;
        await db.del(`${FILE_PREFIX}${fileId}`);
    } catch (err) {
        console.warn("[fileStorage.native] Failed to delete file reference:", err);
    }
};
