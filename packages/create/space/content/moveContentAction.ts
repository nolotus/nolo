// 文件路径: create/space/content/moveContentAction.ts

import type { AppDispatch, RootState } from "app/store"; // 确认 store 类型路径
import type { SpaceId } from "create/space/types"; // 确认类型路径
import type { SpaceData } from "app/types";
import type { SpaceContent } from "app/types";
import { selectIdentityUserId } from "identity/selectors";
import { createSpaceKey } from "create/space/spaceKeys"; // 确认导入路径
// 假设 dbSlice 提供 read, patch
import { read, patch } from "database/dbSlice"; // 确认导入路径
import {
  checkSpaceMembership,
  localSpaceAuthorityPatchStamp,
} from "../utils/permissions";
import { UNCATEGORIZED_ID } from "create/space/constants"; // 导入常量
import { createClientLogger } from "core/clientLogger";
import { isDeviceLocalSpaceBody } from "database/authority/deviceLocal";
import {
  syncContentRecordSpaceId,
  notifyUserDataUpdated,
  type ContentSpaceSyncOutcome,
} from "./spaceContentPatch";

const logger = createClientLogger("move-content");

// 定义移动操作的输入类型
interface MoveContentInput {
  contentKey: string; // 要移动的内容的 Key
  sourceSpaceId: SpaceId; // 源空间的 ID
  targetSpaceId: SpaceId; // 目标空间的 ID
  targetCategoryId?: string | null; // 目标空间中的分类 ID (可选, null/undefined/""/UNCATEGORIZED_ID 表示无分类)
}

// 定义返回类型，包含两个更新后的空间数据或 null (如果读取失败) 及可选错误
interface MoveContentResult {
  sourceSpaceId: SpaceId;
  updatedSourceSpaceData: SpaceData | null;
  targetSpaceId: SpaceId;
  updatedTargetSpaceData: SpaceData | null;
  /** 内容实体记录 spaceId 的同步结果（missing = 实体记录不存在，未写入）。 */
  contentSpaceSync?: ContentSpaceSyncOutcome;
  /** 目标引用是否由本次写入（false 表示目标原本就有引用，未覆盖其分类/元数据）。 */
  targetWritten?: boolean;
  /** 源引用是否已清理（false = 源清理失败，可重试）。 */
  sourcePruned?: boolean;
  /** 是否按「目标已有、源已清理」的幂等续跑收敛。 */
  resumedFromTarget?: boolean;
  error?: string; // 可选的错误信息传递
}

/**
 * 异步 Action Thunk，用于在两个 Space 之间移动内容项的引用。
 * 它会：
 * 1. 从源 Space 的 `contents` 中移除引用 (通过 patch)。
 * 2. 将内容的引用添加到目标 Space 的 `contents` 中 (通过 patch)，并根据 targetCategoryId 更新分类。
 * 3. 同步内容实体记录的归属空间 (spaceId) —— 侧边栏分组/只读判定依赖它，
 *    只改空间链接会让分组停留在旧空间。实体记录不存在时不写入残记录。
 * 4. 处理 categoryId 逻辑，使其与 addContentAction 一致（未分类则不存储 categoryId 属性）。
 */
export const moveContentAction = async (
  input: MoveContentInput,
  thunkAPI: { dispatch: AppDispatch; getState: () => RootState }
): Promise<MoveContentResult> => {
  const {
    contentKey,
    sourceSpaceId,
    targetSpaceId,
    targetCategoryId: rawTargetCategoryId,
  } = input;
  const { dispatch, getState } = thunkAPI;
  const state = getState();
  const userId = selectIdentityUserId(state);
  const now = Date.now(); // 用于更新时间戳

  logger.info({ ...input, userId }, "Initiating moveContentAction");

  // --- 1. 基本验证 ---
  // Login is not required up-front: device-local Spaces allow guest.
  // Account Spaces still fail inside checkSpaceMembership when userId is blank.
  if (sourceSpaceId === targetSpaceId) {
    logger.error("Source and target space IDs are the same.");
    throw new Error(
      "源空间和目标空间不能相同。如需修改分类，请使用更新分类操作。"
    );
  }
  if (
    !contentKey ||
    typeof contentKey !== "string" ||
    contentKey.trim() === ""
  ) {
    logger.error("Invalid contentKey provided.");
    throw new Error("无效的内容 Key。");
  }

  let sourceSpaceData: SpaceData | null = null;
  let targetSpaceData: SpaceData | null = null;
  let contentDataFromSource: SpaceContent | null = null; // 从源空间获取内容引用数据
  let finalSourceData: SpaceData | null = null;
  let finalTargetData: SpaceData | null = null;
  let contentSpaceSync: ContentSpaceSyncOutcome | undefined = undefined;
  /** 目标空间是否由本次写入（false = 目标已存在引用，未覆盖）。 */
  let targetWritten = false;
  /** 源引用是否已清理（false = 源清理失败，可重试收敛）。 */
  let sourcePruned = false;
  /** 是否以「目标已有引用、源已无引用」的幂等续跑方式完成。 */
  let resumedFromTarget = false;
  let overallError: string | undefined = undefined;

  try {
    // --- 2. 并行读取源和目标空间数据 ---
    const sourceSpaceKey = createSpaceKey.space(sourceSpaceId);
    const targetSpaceKey = createSpaceKey.space(targetSpaceId);

    logger.info(
      { sourceSpaceKey, targetSpaceKey },
      "Reading source and target space data."
    );

    const [sourceResult, targetResult] = await Promise.allSettled([
      dispatch(read({
        dbKey: sourceSpaceKey
      })).unwrap(),
      dispatch(read({
        dbKey: targetSpaceKey
      })).unwrap(),
    ]);

    // 处理源空间读取结果
    if (sourceResult.status === "rejected" || !sourceResult.value) {
      const reason =
        sourceResult.status === "rejected"
          ? sourceResult.reason
          : "Data is null";
      throw new Error(
        `无法加载源空间 (${sourceSpaceId}): ${reason?.message || reason}`
      );
    }
    sourceSpaceData = sourceResult.value as SpaceData;

    // 处理目标空间读取结果
    if (targetResult.status === "rejected" || !targetResult.value) {
      const reason =
        targetResult.status === "rejected"
          ? targetResult.reason
          : "Data is null";
      throw new Error(
        `无法加载目标空间 (${targetSpaceId}): ${reason?.message || reason}`
      );
    }
    targetSpaceData = targetResult.value as SpaceData;

    // --- 3. 权限检查 ---
    logger.info("Checking permissions for source and target spaces.");
    checkSpaceMembership(sourceSpaceData, userId); // 会在失败时抛出错误
    checkSpaceMembership(targetSpaceData, userId); // 会在失败时抛出错误

    // --- 4. 两端状态判定（支持「目标已有、源已清理」的幂等续跑） ---
    const sourceSpaceKeyForWrite = createSpaceKey.space(sourceSpaceId);
    const targetSpaceKeyForWrite = createSpaceKey.space(targetSpaceId);
    const sourceHasLink = Boolean(sourceSpaceData.contents?.[contentKey]);
    const targetHasLink = Boolean(targetSpaceData.contents?.[contentKey]);
    if (!sourceHasLink && !targetHasLink) {
      // 任意「源里没有」都不能当成功：两个空间都没有引用就是真失败。
      throw new Error(
        `内容 (${contentKey}) 既不在源空间 (${sourceSpaceId}) 也不在目标空间 (${targetSpaceId}) 中。`
      );
    }
    contentDataFromSource = sourceSpaceData.contents?.[contentKey] ?? null;
    resumedFromTarget = !sourceHasLink && targetHasLink;
    if (resumedFromTarget) {
      logger.info(
        { contentKey, sourceSpaceId, targetSpaceId },
        "Source link already pruned and target link exists; resuming convergence (no overwrite)."
      );
    }

    // --- 5. 目标分类只在确实写入新引用时使用（绝不覆盖目标已有分类/元数据） ---
    let categoryIdForTargetStorage: string | undefined;
    if (!targetHasLink) {
      if (
        rawTargetCategoryId &&
        rawTargetCategoryId !== "" &&
        rawTargetCategoryId !== UNCATEGORIZED_ID
      ) {
        if (targetSpaceData.categories?.[rawTargetCategoryId]) {
          categoryIdForTargetStorage = rawTargetCategoryId;
        } else {
          logger.warn(
            `Target category ${rawTargetCategoryId} not found in target space ${targetSpaceId}. Content will be uncategorized.`
          );
          categoryIdForTargetStorage = undefined; // 无效则降级
        }
      }
    }

    // --- 6/7. 阶段 1：目标先就位（target-first）。失败时源空间未被触碰。 ---
    if (!targetHasLink) {
      if (!contentDataFromSource) {
        throw new Error(`内容 (${contentKey}) 在源空间中没有可迁移的引用数据。`);
      }
      const contentReferenceForTarget: SpaceContent = {
        ...contentDataFromSource,
        updatedAt: now,
      };
      // 先删除旧的 categoryId (无论是否存在)，再根据需要添加新的
      delete (contentReferenceForTarget as Partial<SpaceContent>).categoryId;
      if (categoryIdForTargetStorage !== undefined) {
        contentReferenceForTarget.categoryId = categoryIdForTargetStorage;
      }
      try {
        await dispatch(
          patch({
            dbKey: targetSpaceKeyForWrite,
            changes: {
              contents: { [contentKey]: contentReferenceForTarget },
              updatedAt: now,
              ...localSpaceAuthorityPatchStamp(targetSpaceData),
            },
          })
        ).unwrap();
      } catch (targetPatchError: any) {
        throw new Error(
          `目标空间写入失败，源空间引用已保留（可重试）: ${
            targetPatchError?.message || "未知错误"
          }`
        );
      }
      targetWritten = true;
      logger.info("Target reference written (target-first).");
    }

    // --- 8. 阶段 2：实体 spaceId 同步（仅可靠 owner 且有权改写时） ---
    try {
      contentSpaceSync = await syncContentRecordSpaceId(
        dispatch,
        contentKey,
        targetSpaceId,
        "内容已迁移到目标空间，但同步内容记录的归属空间失败",
        {
          actorUserId: userId,
          targetSpaceIsDeviceLocal: isDeviceLocalSpaceBody(sourceSpaceData) ||
            isDeviceLocalSpaceBody(targetSpaceData),
        }
      );
    } catch (entitySyncError: any) {
      throw new Error(
        `${entitySyncError?.message || "同步内容记录失败"}（目标空间已写入，源空间引用已保留，可重试）`
      );
    }
    if (contentSpaceSync === "unreadable") {
      // 读不到实体就无法确认归属同步，源引用保持不动，等待重试。
      throw new Error(
        "无法读取内容记录确认归属空间同步（目标空间已写入，源空间引用已保留，可重试）"
      );
    }

    // --- 9. 阶段 3：清理源引用（目标已就位后才执行；失败可重试收敛） ---
    if (sourceHasLink) {
      try {
        await dispatch(
          patch({
            dbKey: sourceSpaceKeyForWrite,
            changes: {
              contents: { [contentKey]: null },
              updatedAt: now,
              ...localSpaceAuthorityPatchStamp(sourceSpaceData),
            },
          })
        ).unwrap();
      } catch (sourcePatchError: any) {
        throw new Error(
          `内容已写入目标空间，但从源空间移除引用失败（可重试）: ${
            sourcePatchError?.message || "未知错误"
          }`
        );
      }
    }
    sourcePruned = true;
    logger.info("Source reference pruned; move converged.");
  } catch (error: any) {
    logger.error(
      { error: error.message, stack: error.stack },
      "Error during move content action execution."
    );
    overallError = error.message || "移动内容时发生未知错误";
    // 不再继续，将在 finally 块中尝试读取并返回
  } finally {
    // --- 9. 无论成功与否，都尝试重新读取最终的空间数据 ---
    // (如果中途出错，可能只有一个或两个空间被更新，读取可以反映部分成功的状态)
    logger.info("Attempting to re-read final space data.");
    const sourceSpaceKey = createSpaceKey.space(sourceSpaceId);
    const targetSpaceKey = createSpaceKey.space(targetSpaceId);

    const [finalSourceResult, finalTargetResult] = await Promise.allSettled([
      dispatch(read({
        dbKey: sourceSpaceKey
      })).unwrap(),
      dispatch(read({
        dbKey: targetSpaceKey
      })).unwrap(),
    ]);

    if (finalSourceResult.status === "fulfilled") {
      finalSourceData = finalSourceResult.value as SpaceData;
    } else {
      logger.error(
        { sourceSpaceId, reason: finalSourceResult.reason },
        "Failed to re-read final source space data."
      );
    }

    if (finalTargetResult.status === "fulfilled") {
      finalTargetData = finalTargetResult.value as SpaceData;
    } else {
      logger.error(
        { targetSpaceId, reason: finalTargetResult.reason },
        "Failed to re-read final target space data."
      );
    }

    logger.info(
      {
        hasError: !!overallError,
        sourceReadSuccess: !!finalSourceData,
        targetReadSuccess: !!finalTargetData,
        targetWritten,
        sourcePruned,
        resumedFromTarget,
        contentSpaceSync,
      },
      "Move content action finished."
    );

    // 成功或部分失败都必须刷新侧栏投影：失败时源/目标空间数据仍是真值，
    // 不能因为抛错就让视图停留在旧分组。
    notifyUserDataUpdated();

    // --- 10. 返回结果 ---
    const result: MoveContentResult = {
      sourceSpaceId,
      updatedSourceSpaceData: finalSourceData,
      targetSpaceId,
      updatedTargetSpaceData: finalTargetData,
      contentSpaceSync,
      targetWritten,
      sourcePruned,
      resumedFromTarget,
      error: overallError, // 如果过程中有错误，则传递错误信息
    };

    return result;
  }
};
