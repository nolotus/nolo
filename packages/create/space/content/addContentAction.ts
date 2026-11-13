// 文件路径: create/space/actions/addContentAction.ts

import type { SpaceId } from "create/space/types";
import type { SpaceData, SpaceContent, ContentType, FileCategory } from "app/types";
import { selectIdentityUserId } from "identity/selectors";
import { createSpaceKey } from "create/space/spaceKeys";
import { read, patch } from "database/dbSlice";
import {
  checkSpaceMembership,
  localSpaceAuthorityPatchStamp,
} from "../utils/permissions";
import { UNCATEGORIZED_ID } from "create/space/constants";
import {
  applyContentRecordSpaceId,
  readContentRecordForSpaceSync,
} from "./spaceContentPatch";
import type { ContentSpaceSyncOutcome } from "./spaceContentPatch";
import { isDeviceLocalSpaceBody } from "database/authority/deviceLocal";

export interface AddContentRequest {
  title: string;
  type: ContentType;
  contentKey: string;
  fileCategory?: FileCategory;
  mimeType?: string;
  fileSize?: number;
  originalName?: string;
  categoryId?: string;
  pinned?: boolean;
  order?: number;
  triggerType?: string;
  skillSummary?: SpaceContent["skillSummary"];
}

export const addContentAction = async (
  input: AddContentRequest & { spaceId: SpaceId },
  thunkAPI: { dispatch: any; getState: () => any }
): Promise<{
  spaceId: SpaceId;
  updatedSpaceData: SpaceData;
  contentSpaceSync?: ContentSpaceSyncOutcome;
  /** 该 key 之前已在空间里（幂等收敛，未重写链接/分类）。 */
  alreadyPresent?: boolean;
}> => {
  const {
    spaceId,
    title,
    type,
    contentKey,
    fileCategory,
    mimeType,
    fileSize,
    originalName,
    categoryId: rawCategoryId,
    pinned = false,
    order,
    triggerType,
    skillSummary,
  } = input;

  const { dispatch, getState } = thunkAPI;
  const userId = selectIdentityUserId(getState());

  // 基本输入验证（登录门控下放到权限：本地 Space 允许 guest）
  if (!contentKey || typeof contentKey !== "string" || contentKey.trim() === "")
    throw new Error("Invalid contentKey provided.");
  if (!title || typeof title !== "string" || title.trim() === "")
    throw new Error("Invalid or empty title provided.");
  if (!type || typeof type !== "string")
    throw new Error("Invalid content type provided.");

  // 读取 Space 数据
  const spaceKey = createSpaceKey.space(spaceId);
  const spaceData = await dispatch(read({
    dbKey: spaceKey
  })).unwrap();

  // 权限检查：本地 body → local owner；账号 Space 仍要求成员
  checkSpaceMembership(spaceData, userId);

  // 检查 Content Key 是否已存在：同 key 视为已加入（幂等），不覆盖已有分类/元数据。
  // 这样「链接已写入、实体同步失败」的半完成状态可以靠再次加入收敛，而不是卡在
  //「内容键已存在」死路上。
  const alreadyPresent = Boolean(spaceData.contents?.[contentKey]);

  // 确定最终用于存储的 categoryId
  let categoryIdForStorage: string | undefined;
  if (
    rawCategoryId &&
    rawCategoryId !== "" &&
    rawCategoryId !== UNCATEGORIZED_ID
  ) {
    if (spaceData.categories?.[rawCategoryId]) {
      categoryIdForStorage = rawCategoryId;
    }
  }

  // 构造新内容对象
  const now = Date.now();
  const newSpaceContent: SpaceContent = {
    title: title.trim(),
    type,
    contentKey,
    ...(fileCategory !== undefined ? { fileCategory } : {}),
    ...(mimeType !== undefined ? { mimeType } : {}),
    ...(fileSize !== undefined ? { fileSize } : {}),
    ...(originalName !== undefined ? { originalName } : {}),
    ...(categoryIdForStorage !== undefined && {
      categoryId: categoryIdForStorage,
    }),
    pinned,
    createdAt: now,
    updatedAt: now,
    ...(order !== undefined && typeof order === "number" && { order }),
    ...(triggerType !== undefined && { triggerType }),
    ...(skillSummary !== undefined ? { skillSummary } : {}),
  };

  // 预检实体记录：读失败在写链接之前失败，避免「空间链接已写、归属空间无法确认」的
  // 半完成状态（可重试，且不留脏数据）。
  const entityRead = await readContentRecordForSpaceSync(dispatch, contentKey);
  if (entityRead.status === "unreadable") {
    throw new Error("无法读取内容记录，未加入空间（可重试）");
  }

  let updatedSpaceData: SpaceData;
  if (alreadyPresent) {
    updatedSpaceData = spaceData;
  } else {
    // 准备并执行 Patch 更新；本地 Space 显式 stamp userId=local → servers=[]
    const changes = {
      contents: { [contentKey]: newSpaceContent },
      updatedAt: now,
      ...localSpaceAuthorityPatchStamp(spaceData),
    };
    updatedSpaceData = await dispatch(
      patch({ dbKey: spaceKey, changes })
    ).unwrap();
  }

  // 内容实体记录的归属空间跟随空间链接（引用式写入：记录已有别的归属空间时不抢）。
  // 写权限来自实体 owner：不是本人实体时跳过（不越权改写他人记录）。
  let contentSpaceSync: ContentSpaceSyncOutcome;
  try {
    contentSpaceSync =
      entityRead.status === "ok"
        ? await applyContentRecordSpaceId(
            dispatch,
            contentKey,
            entityRead.record,
            spaceId,
            "内容已加入空间，但同步内容记录的归属空间失败",
            {
              onlyWhenUnset: true,
              actorUserId: userId,
              targetSpaceIsDeviceLocal: isDeviceLocalSpaceBody(spaceData),
            }
          )
        : "missing";
  } catch (entitySyncError: any) {
    throw new Error(
      `${entitySyncError?.message || "同步内容记录失败"}（空间链接已写入；再次加入会幂等收敛）`
    );
  }

  return { spaceId, updatedSpaceData, contentSpaceSync, alreadyPresent };
};
