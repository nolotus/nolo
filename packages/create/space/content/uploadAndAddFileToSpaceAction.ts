
import { ContentType, SpaceData } from "app/types";
import { uploadFileAction } from "database/actions/upload";
import { addContentAction } from "./addContentAction";
import { resolveFileCategory } from "app/utils/fileUtils";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { ulid } from "database/utils/ulid";
import { fileKey } from "database/keys";
import { selectIdentityUserId } from "identity/selectors";
import { patch } from "database/dbSlice";
import { read } from "database/dbSlice";
import { createSpaceKey } from "create/space/spaceKeys";
import { checkSpaceMembership, localSpaceAuthorityPatchStamp } from "../utils/permissions";
import {
    buildVersionedEntryPatch,
    findSameNameFileEntries,
    mergeVersions,
    planSpaceFileUpload,
    sha256Hex,
    type SpaceFileVersion,
} from "./spaceFileVersions";

interface UploadAndAddFileToSpacePayload {
    spaceId: string;
    file: File;
    categoryId?: string;
}

export type SpaceFileUploadOutcome = "new_file" | "new_version" | "unchanged" | "restored_existing";

/**
 * 同一 tab 内同空间同名上传串行化：避免本端两次上传互相读到旧快照。
 * 跨端/跨 tab 并发由 reconcile（版本并集合并）兜底，见 spaceFileVersions.ts。
 */
const uploadQueues = new Map<string, Promise<unknown>>();
const serialize = <T>(key: string, task: () => Promise<T>): Promise<T> => {
    const prev = uploadQueues.get(key) ?? Promise.resolve();
    const next = prev.catch(() => undefined).then(task);
    uploadQueues.set(key, next);
    void next.finally(() => {
        if (uploadQueues.get(key) === next) uploadQueues.delete(key);
    }).catch(() => undefined);
    return next;
};

const readSpaceOrNull = async (dispatch: any, spaceId: string): Promise<SpaceData | null> => {
    try {
        return (await dispatch(read({ dbKey: createSpaceKey.space(spaceId) })).unwrap()) ?? null;
    } catch {
        return null;
    }
};

/**
 * 把同名条目收敛为一个，当前版本 = currentKey（默认最新上传）。
 * 只做「并集 + 改指针」，从不删除任何 file 记录，因此任何竞态下版本都不会静默丢失。
 */
const reconcileSameNameEntries = async (
    thunkAPI: any,
    spaceId: string,
    originalName: string,
    options: { extraVersion?: SpaceFileVersion; currentKey?: string; restoredFrom?: string } = {},
): Promise<SpaceData | null> => {
    let updated = await reconcileOnce(thunkAPI, spaceId, originalName, options);
    // 校验：并发写可能让同名条目分裂或（极端情况下）漏掉本次版本；按确定性规则再收敛一次。
    for (let attempt = 0; attempt < 2 && updated; attempt += 1) {
        const same = findSameNameFileEntries(updated.contents, originalName);
        const keys = new Set(mergeVersions(same).map((v) => v.fileKey));
        const missingOwn = options.extraVersion && !keys.has(options.extraVersion.fileKey);
        if (same.length <= 1 && !missingOwn) break;
        const fresh = await readSpaceOrNull(thunkAPI.dispatch, spaceId);
        const freshSame = findSameNameFileEntries(fresh?.contents, originalName);
        const freshKeys = new Set(mergeVersions(freshSame).map((v) => v.fileKey));
        const stillMissing = options.extraVersion && !freshKeys.has(options.extraVersion.fileKey);
        if (freshSame.length <= 1 && !stillMissing) {
            updated = fresh;
            break;
        }
        // 不强制 currentKey：所有并发方都收敛到「最新上传」这一确定结果。
        updated = await reconcileOnce(thunkAPI, spaceId, originalName, {
            ...(stillMissing ? { extraVersion: options.extraVersion } : {}),
        });
    }
    return updated;
};

const reconcileOnce = async (
    thunkAPI: any,
    spaceId: string,
    originalName: string,
    options: { extraVersion?: SpaceFileVersion; currentKey?: string; restoredFrom?: string } = {},
): Promise<SpaceData | null> => {
    const { dispatch, getState } = thunkAPI;
    const spaceData = await readSpaceOrNull(dispatch, spaceId);
    if (!spaceData) return null;
    checkSpaceMembership(spaceData, selectIdentityUserId(getState()));
    const same = findSameNameFileEntries(spaceData.contents, originalName);
    if (same.length === 0 && !options.extraVersion) return spaceData;
    const contentsPatch = buildVersionedEntryPatch({ same, now: Date.now(), ...options });
    return await dispatch(
        patch({
            dbKey: createSpaceKey.space(spaceId),
            changes: {
                contents: contentsPatch,
                updatedAt: Date.now(),
                ...localSpaceAuthorityPatchStamp(spaceData),
            },
        })
    ).unwrap();
};

export const uploadAndAddFileToSpaceAction = async (
    payload: UploadAndAddFileToSpacePayload,
    thunkAPI: any
): Promise<{
    spaceId: string;
    updatedSpaceData: SpaceData;
    contentKey: string;
    fileId: string;
    outcome: SpaceFileUploadOutcome;
}> => {
    const { spaceId, file } = payload;
    const userId = selectIdentityUserId(thunkAPI.getState());
    if (!userId) {
        throw new Error("Cannot upload a file to a space without an authenticated user.");
    }
    return serialize(`${spaceId}\u0000${file.name}`, () =>
        uploadOnce(payload, thunkAPI, userId)
    );
};

const uploadOnce = async (
    payload: UploadAndAddFileToSpacePayload,
    thunkAPI: any,
    userId: string,
) => {
    const { spaceId, file, categoryId } = payload;
    const { dispatch } = thunkAPI;

    try {
        const sha256 = await sha256Hex(file);
        const existingSpace = await readSpaceOrNull(dispatch, spaceId);
        const plan = existingSpace
            ? planSpaceFileUpload(existingSpace.contents, file.name, sha256)
            : ({ kind: "new_file" } as const);

        // 同名同内容：不新增版本、不重复上传/存储。
        if (plan.kind === "unchanged") {
            return {
                spaceId,
                updatedSpaceData: existingSpace as SpaceData,
                contentKey: plan.currentKey,
                fileId: plan.currentKey.split("-").slice(2).join("-"),
                outcome: "unchanged" as const,
            };
        }
        // 内容等于某个旧版本：直接把指针移回该版本，不重复存储。
        if (plan.kind === "restore_existing") {
            const updated = await reconcileSameNameEntries(thunkAPI, spaceId, file.name, {
                currentKey: plan.versionKey,
                restoredFrom: plan.entryKey,
            });
            return {
                spaceId,
                updatedSpaceData: (updated ?? existingSpace) as SpaceData,
                contentKey: plan.versionKey,
                fileId: plan.versionKey.split("-").slice(2).join("-"),
                outcome: "restored_existing" as const,
            };
        }

        // 生成一个确保唯一的 Key (file-userId-ulid)；每个版本都是独立 file 记录。
        const id = ulid();
        const dbKey = fileKey.single(userId, id);
        const contentType = ContentType.FILE;
        const fileCategory = resolveFileCategory({
            mimeType: file.type,
            fileName: file.name,
        });

        const fileMetadata = await uploadFileAction(
            { file, customKey: dbKey, userId },
            thunkAPI
        );
        if (!fileMetadata) {
            throw new Error("Upload failed, no metadata returned");
        }

        const contentKey = fileMetadata.dbKey || dbKey;
        const title = file.name;
        const fileSize = asOptionalFiniteNumber(file.size);
        const version: SpaceFileVersion = {
            fileKey: contentKey,
            sha256,
            size: fileSize ?? 0,
            uploadedAt: Date.now(),
        };

        const addAsNewFile = async () => {
            const result = await addContentAction({
                spaceId,
                contentKey,
                title,
                type: contentType,
                fileCategory,
                mimeType: file.type || undefined,
                fileSize,
                originalName: file.name,
                categoryId,
            }, thunkAPI);
            return result;
        };
        // 新文件走 addContentAction；同名新版本不新增条目，由下方 reconcile 原子换指针。
        const result: { spaceId: string; updatedSpaceData: SpaceData } =
            plan.kind === "new_file"
                ? await addAsNewFile()
                : { spaceId, updatedSpaceData: existingSpace as SpaceData };

        await (dispatch as any)(
            patch({
                dbKey: contentKey,
                changes: {
                    title,
                    spaceId,
                    fileCategory,
                    mimeType: file.type || undefined,
                    fileSize,
                    originalName: file.name,
                },
            })
        ).unwrap();

        // 写入版本列表（新文件 = 单版本；新版本 = 旧版本并集 + 新版本，指针移到新版本）。
        // 并发同名上传会各自写出不同 map key，这一步再读一次并合并，保证不丢版本。
        const reconciled = await reconcileSameNameEntries(thunkAPI, spaceId, file.name, {
            extraVersion: version,
            currentKey: contentKey,
        }).catch((error) => {
            // 新版本只在这一步挂进空间；失败必须显式报错（file 记录已保存，可重试），
            // 不能假装成功。新文件的条目已由 addContentAction 写入，仅缺版本列表。
            if (plan.kind === "new_version") throw error;
            console.warn("[uploadAndAddFileToSpace] version reconcile failed", error);
            return null;
        });

        if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("nolo-user-data-updated"));
        }

        return {
            ...result,
            ...(reconciled ? { updatedSpaceData: reconciled } : {}),
            contentKey,
            fileId: fileMetadata.id,
            outcome: plan.kind === "new_file" ? ("new_file" as const) : ("new_version" as const),
        };

    } catch (error: any) {
        console.error("Upload and add file error:", error);
        throw error;
    }
};

/**
 * 恢复旧版本：只移动当前版本指针（新的 map key），旧版本记录与 blob 从未删除。
 */
export const restoreSpaceFileVersionAction = async (
    input: { spaceId: string; contentKey: string; versionKey: string },
    thunkAPI: any
): Promise<{ spaceId: string; updatedSpaceData: SpaceData; contentKey: string }> => {
    const { spaceId, contentKey, versionKey } = input;
    const spaceData = await readSpaceOrNull(thunkAPI.dispatch, spaceId);
    if (!spaceData) throw new Error(`无法加载空间数据: ${spaceId}`);
    const entry = spaceData.contents?.[contentKey] as any;
    if (!entry || entry.type !== ContentType.FILE) throw new Error("File not found in space");
    const versions: SpaceFileVersion[] = Array.isArray(entry.versions) ? entry.versions : [];
    if (!versions.some((v) => v.fileKey === versionKey)) {
        throw new Error("Version not found for this file");
    }
    const name = entry.originalName ?? entry.title;
    const updated = await serialize(`${spaceId}\u0000${name}`, () =>
        reconcileSameNameEntries(thunkAPI, spaceId, name, {
            currentKey: versionKey,
            restoredFrom: contentKey,
        })
    );
    return { spaceId, updatedSpaceData: (updated ?? spaceData) as SpaceData, contentKey: versionKey };
};
