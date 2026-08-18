// 文件路径: database/server/fileService.ts

import path from "path";
import { mkdir } from "node:fs/promises";
import { ulid } from "ulid";
import { asOptionalTrimmedString } from "core/optionalString";
import serverDb from "./db";
import { blobKey, fileKey, fileIdIndexKey, fileStatKey } from "database/keys";
import { isLevelNotFoundError } from "database/levelNotFoundError";
import { isTombstoneRecord } from "database/tombstones";
import { DataType } from "create/types";

const UPLOAD_DIR = path.join(process.cwd(), "data", "uploads");

type JsonRecord = Record<string, any>;

export interface BlobRecord {
    sha256: string;
    path: string;
    size: number;
    mimeType: string;
    refCount: number;
    createdAt: string;
}

/**
 * 文件元数据（服务器端）
 *
 * 注意：
 * - File 自己在 LevelDB 中的主键是 file-{tenantId}-{fileId}，和 ownerDbKey 无关。
 * - ownerDbKey 表示“这个文件属于哪条业务记录”，例如某个 profile/page 的 dbKey。
 */
export interface FileMetadata {
    id: string;
    tenantId: string;
    sha256: string;
    size: number;
    mimeType: string;
    filePath: string;

    originalName: string;

    // 归属信息
    ownerType?: string; // "user" | "space" | "system" | ...
    ownerId?: string;
    uploadedBy?: string;

    /**
     * 指向业务记录的主键（例如 profile/page 等的 dbKey），
     * 不是 File 自己在 LevelDB 中的主键。
     */
    ownerDbKey?: string;

    tags?: string[];

    // AI 信息
    source?: string; // "user-upload" | "ai-generated" | "system" | ...
    model?: string;
    prompt?: string;

    // 生命周期
    createdAt: string;
    deletedAt?: string;

    // 去重 / 变体等预留
    duplicateOf?: string;
    variants?: {
        thumb?: string;
        medium?: string;
        origin?: string;
        [key: string]: string | undefined;
    };

    // 允许扩展
    [key: string]: any;
}

export interface SaveFileOptions {
    tenantId: string;

    originalName: string;
    mimeType?: string;

    ownerType?: string;
    ownerId?: string;
    uploadedBy?: string;

    /**
     * 业务记录的 dbKey，例如 createUserKey.profile(userId)、
     * PAGE-... / DIALOG-... 等。
     */
    ownerDbKey?: string;

    source?: string;
    model?: string;
    prompt?: string;
    tags?: string[];

    /**
     * 客户端传来的原始 metadata（例如前端 uploadFileAction 生成的）
     * 服务端会以自己计算的 sha256/size/filePath/createdAt 覆盖同名字段。
     * 若其中有 dbKey，则会映射为 ownerDbKey 并删除 dbKey 字段。
     */
    clientMetadata?: JsonRecord | null;

    /**
     * 若客户端已经生成了全局唯一 ID（例如前端 ulid()），可以传入，
     * 服务端则不再重新生成。
     */
    clientProvidedId?: string;
}

/**
 * 租户 ID 兜底：避免出现空字符串
 */
const normalizeTenantId = (tenantId?: string): string =>
    asOptionalTrimmedString(tenantId) ?? "default";

/**
 * 确保上传目录存在
 */
const ensureUploadDirExists = async (): Promise<void> => {
    await mkdir(UPLOAD_DIR, { recursive: true });
};

/**
 * 使用 Bun.CryptoHasher 计算 sha256
 */
const calculateSha256 = (buffer: Buffer): string => {
    const hasher = new Bun.CryptoHasher("sha256");
    hasher.update(buffer);
    return hasher.digest("hex");
};

/**
 * 封装 LevelDB get，缺失时返回 null
 */
const dbGetOrNull = async <T = any>(key: string): Promise<T | null> => {
    try {
        const value = await serverDb.get(key);
        return value as T;
    } catch (err: any) {
        if (isLevelNotFoundError(err)) {
            return null;
        }
        throw err;
    }
};

/**
 * 今天的 dateKey: "YYYYMMDD"
 */
const getTodayDateKey = (): string => {
    const iso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    return iso.replace(/-/g, "");
};

/**
 * 更新按租户的日统计（最小版本）
 */
const updateTenantDailyStatsOnCreate = async (
    tenantId: string,
    size: number,
    isAi: boolean
): Promise<void> => {
    const dateKey = getTodayDateKey();
    const statKey = fileStatKey.tenantPerDay(tenantId, dateKey);

    const existing =
        (await dbGetOrNull<JsonRecord>(statKey)) ??
        ({
            tenantId,
            dateKey,
            filesCreated: 0,
            bytesAdded: 0,
            aiFilesCreated: 0,
        } satisfies JsonRecord);

    existing.filesCreated = (existing.filesCreated || 0) + 1;
    existing.bytesAdded = (existing.bytesAdded || 0) + size;
    if (isAi) {
        existing.aiFilesCreated = (existing.aiFilesCreated || 0) + 1;
    }

    await serverDb.put(statKey, existing);
};

/**
 * 更新按模型的日统计（仅对有 model 的记录）
 */
const updateModelDailyStatsOnCreate = async (
    modelName: string,
    size: number
): Promise<void> => {
    const dateKey = getTodayDateKey();
    const statKey = fileStatKey.modelPerDay(modelName, dateKey);

    const existing =
        (await dbGetOrNull<JsonRecord>(statKey)) ??
        ({
            modelName,
            dateKey,
            filesCreated: 0,
            bytesAdded: 0,
        } satisfies JsonRecord);

    existing.filesCreated = (existing.filesCreated || 0) + 1;
    existing.bytesAdded = (existing.bytesAdded || 0) + size;

    await serverDb.put(statKey, existing);
};

/**
 * 处理 Blob 记录（查重 + refCount）
 * 返回 BlobRecord（包含 path / size / mimeType）
 */
const ensureBlobRecord = async (
    buffer: Buffer,
    mimeType: string
): Promise<BlobRecord> => {
    const sha256 = calculateSha256(buffer);
    const key = blobKey(sha256);

    const existing = await dbGetOrNull<BlobRecord>(key);
    if (existing) {
        const updated: BlobRecord = {
            ...existing,
            refCount: (existing.refCount || 0) + 1,
        };
        await serverDb.put(key, updated);
        return updated;
    }

    // 新建 Blob
    await ensureUploadDirExists();
    const blobFileName = sha256;
    const blobPath = path.join(UPLOAD_DIR, blobFileName);

    await Bun.write(blobPath, buffer);

    const record: BlobRecord = {
        sha256,
        path: blobPath,
        size: buffer.byteLength,
        mimeType,
        refCount: 1,
        createdAt: new Date().toISOString(),
    };

    await serverDb.put(key, record);
    return record;
};

/**
 * 将 Blob refCount -1，若为 0 则删除物理文件和记录
 * （当前 demo 暂时未对外暴露 delete File 的 API，可留 TODO 使用）
 */
export const decrementBlobRefCount = async (sha256: string): Promise<void> => {
    const key = blobKey(sha256);
    const existing = await dbGetOrNull<BlobRecord>(key);
    if (!existing) return;

    const nextCount = (existing.refCount || 0) - 1;
    if (nextCount <= 0) {
        try {
            await Bun.write(existing.path, new Uint8Array());
        } catch {
            // 忽略物理删除失败
        }
        await serverDb.del(key);
        return;
    }

    const updated: BlobRecord = { ...existing, refCount: nextCount };
    await serverDb.put(key, updated);
};

/**
 * 保存二进制内容为 File（统一入口）
 */
export const saveBufferAsFile = async (
    buffer: Buffer,
    options: SaveFileOptions
): Promise<{ fileId: string; metadata: FileMetadata }> => {
    const tenantId = normalizeTenantId(options.tenantId);
    const mimeType = options.mimeType || "application/octet-stream";

    // 1) Blob 处理（查重 + refCount）
    const blob = await ensureBlobRecord(buffer, mimeType);

    // 2) FileId
    const fileId = options.clientProvidedId || ulid();

    // 3) 处理 clientMetadata
    const clientMetaSanitized: JsonRecord = {
        ...(options.clientMetadata || {}),
    };

    // 如果客户端提供了 dbKey，我们记录下来，但不一定要在 merged 里删除，
    // 因为它是物理主键的蓝图。
    const targetDbKey = options.ownerDbKey || clientMetaSanitized.dbKey;

    // 4) 组装 FileMetadata（以服务端字段覆盖 clientMetadata）
    const base: FileMetadata = {
        id: fileId,
        type: DataType.FILE,
        tenantId,
        sha256: blob.sha256,
        size: blob.size,
        mimeType: blob.mimeType,
        filePath: blob.path,

        originalName: options.originalName,

        ownerType: options.ownerType,
        ownerId: options.ownerId,
        uploadedBy: options.uploadedBy,

        ownerDbKey: options.ownerDbKey ?? clientMetaSanitized.ownerDbKey,
        tags: options.tags,

        source: options.source,
        model: options.model,
        prompt: options.prompt,

        createdAt: new Date().toISOString(),
    };

    const merged: FileMetadata = {
        ...clientMetaSanitized,
        ...base,
    };

    // 5) 写入 File 主记录
    // 如果 targetDbKey 符合 file- 规则，优先直接用（保持跨机一致性）
    const mainKey =
        targetDbKey && targetDbKey.startsWith("file-")
            ? targetDbKey
            : fileKey.single(tenantId, fileId);

    await serverDb.put(mainKey, { ...merged, dbKey: mainKey });

    // 6) 写入 fileId 索引
    const indexKey = fileIdIndexKey(fileId);
    await serverDb.put(indexKey, {
        tenantId,
        fileId,
        mainKey,
        createdAt: base.createdAt,
    });

    // 7) 更新简单统计（tenant / model）
    const isAi = merged.source === "ai-generated";
    await updateTenantDailyStatsOnCreate(tenantId, merged.size, isAi);
    if (merged.model) {
        await updateModelDailyStatsOnCreate(merged.model, merged.size);
    }

    return { fileId, metadata: merged };
};

/**
 * 通过 fileId 查到 { tenantId, fileId, mainKey }
 */
const resolveTenantAndFileId = async (
    fileId: string
): Promise<{ tenantId: string; fileId: string; mainKey?: string } | null> => {
    const indexKey = fileIdIndexKey(fileId);
    const index = await dbGetOrNull<{ tenantId: string; fileId: string; mainKey?: string }>(
        indexKey
    );
    if (!index) return null;
    return { tenantId: index.tenantId, fileId: index.fileId, mainKey: index.mainKey };
};

/**
 * 通过 fileId 获取 FileMetadata
 */
export const getFileMetadataById = async (
    fileId: string
): Promise<FileMetadata | null> => {
    // 1. 优先尝试直接读取（支持传入完整的 dbKey，如 file-userId-ulid）
    if (fileId.startsWith("file-")) {
        const metadata = await dbGetOrNull<FileMetadata>(fileId);
        if (metadata && !isTombstoneRecord(metadata)) return metadata;
        if (metadata && isTombstoneRecord(metadata)) return null;
    }

    // 2. 尝试通过 fileId 索引查找（支持传入纯 ulid）
    const resolved = await resolveTenantAndFileId(fileId);
    if (!resolved) return null;

    // 优先使用索引中存储的 mainKey（避免重建不一致），回退到按规则拼接
    const mainKey = resolved.mainKey || fileKey.single(resolved.tenantId, resolved.fileId);
    const metadata = await dbGetOrNull<FileMetadata>(mainKey);
    if (!metadata || isTombstoneRecord(metadata)) {
        return null;
    }

    return metadata;
};

export const hasFileTombstoneById = async (fileId: string): Promise<boolean> => {
    if (fileId.startsWith("file-")) {
        const metadata = await dbGetOrNull<FileMetadata>(fileId);
        return Boolean(metadata && isTombstoneRecord(metadata));
    }

    const resolved = await resolveTenantAndFileId(fileId);
    if (!resolved) return false;

    const mainKey = resolved.mainKey || fileKey.single(resolved.tenantId, resolved.fileId);
    const metadata = await dbGetOrNull<FileMetadata>(mainKey);
    return Boolean(metadata && isTombstoneRecord(metadata));
};

/**
 * 通过 fileId 获取文件内容（二进制）+ Metadata
 */
export const getFileContentById = async (
    fileId: string
): Promise<{ buffer: Buffer; metadata: FileMetadata }> => {
    const metadata = await getFileMetadataById(fileId);
    if (!metadata) {
        throw new Error(`File not found: ${fileId}`);
    }

    const file = Bun.file(metadata.filePath);
    const exists = await file.exists();
    if (!exists) {
        throw new Error(`File content missing on disk: ${fileId}`);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return { buffer, metadata };
};
