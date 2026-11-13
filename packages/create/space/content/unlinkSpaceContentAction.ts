// create/space/content/unlinkSpaceContentAction.ts
//
// 纯「从空间移除引用」原语：
// - 只 patch 指定 space 的 `contents[contentKey] = null`；
// - 不调用 remove / deleteDbKey / ENTITY_DELETE_STRATEGIES —— 绝不删除内容本体；
// - 不动其它空间的引用；
// - 权限 = checkSpaceMembership（能写该空间）+ canManageSpaceContent（空间 owner/admin
//   或设备本地）；普通成员/guest 拒绝，普通成员也不能借「管理」名义动别人的条目；
// - 实体 spaceId 只在「操作者是实体 owner 且实体当前 spaceId 恰是该空间」时清空，
//   他人实体一个字节都不改；实体读失败照实上报（引用移除仍成立，可重试对齐）。
import type { SpaceData } from "app/types";
import type { SpaceId } from "create/space/types";
import { createSpaceKey, normalizeSpaceId } from "create/space/spaceKeys";
import { read, patch } from "database/dbSlice";
import { selectIdentityUserId } from "identity/selectors";
import { isDeviceLocalOwnerId } from "database/authority/deviceLocal";
import { createClientLogger } from "core/clientLogger";
import {
  canManageSpaceContent,
  checkSpaceMembership,
  localSpaceAuthorityPatchStamp,
} from "../utils/permissions";
import { getAllMemberSpaces } from "../spaceMembershipStore";
import {
  notifyUserDataUpdated,
  readContentRecordForSpaceSync,
} from "./spaceContentPatch";

const logger = createClientLogger("unlink-space-content");

export interface UnlinkSpaceContentInput {
  spaceId: SpaceId;
  contentKey: string;
  sourceServerOrigin?: string | null;
}

export type UnlinkEntitySpaceSync =
  | "cleared"
  | "skipped-not-owner"
  | "skipped-mismatch"
  | "unreadable"
  | "no-record"
  | "failed";

export interface UnlinkSpaceContentResult {
  spaceId: SpaceId;
  contentKey: string;
  updatedSpaceData: SpaceData | null;
  /** 引用是否由本次调用移除（false = 本来就没有，幂等）。 */
  removed: boolean;
  entitySpaceSync: UnlinkEntitySpaceSync;
  error?: string;
}

const resolveMembershipRole = (
  spaceId: SpaceId
): { role?: string | null } | null => {
  const normalized = normalizeSpaceId(spaceId);
  const membership = getAllMemberSpaces().find(
    (space) => normalizeSpaceId(space.spaceId) === normalized
  );
  return membership ? { role: (membership as { role?: string }).role } : null;
};

export const unlinkSpaceContentAction = async (
  input: UnlinkSpaceContentInput,
  thunkAPI: { dispatch: any; getState: () => any }
): Promise<UnlinkSpaceContentResult> => {
  const { spaceId, contentKey, sourceServerOrigin } = input;
  const { dispatch, getState } = thunkAPI;
  const userId = selectIdentityUserId(getState()) ?? null;

  if (!contentKey || typeof contentKey !== "string" || !contentKey.trim()) {
    throw new Error("无效的内容 Key。");
  }
  if (!spaceId || typeof spaceId !== "string" || !spaceId.trim()) {
    throw new Error("无效的空间 ID。");
  }

  const spaceKey = createSpaceKey.space(spaceId);
  const spaceData = (await dispatch(
    read({ dbKey: spaceKey, preferredServerOrigin: sourceServerOrigin })
  ).unwrap()) as SpaceData | null;
  if (!spaceData) {
    throw new Error(`无法加载空间数据: ${spaceId}`);
  }
  // 能写这个空间，且在该空间里具备管理权（owner/admin/设备本地）。
  checkSpaceMembership(spaceData, userId);
  if (!canManageSpaceContent(spaceData, userId, resolveMembershipRole(spaceId))) {
    throw new Error("当前角色不能从空间移除内容");
  }

  const result: UnlinkSpaceContentResult = {
    spaceId,
    contentKey,
    updatedSpaceData: spaceData,
    removed: false,
    entitySpaceSync: "no-record",
  };

  // 缺源只跳过引用 patch；失败后的重试仍须核实实体 owner 并收敛归属。
  if (spaceData.contents?.[contentKey]) {
    let updatedSpaceData: SpaceData;
    try {
      updatedSpaceData = (await dispatch(
        patch({
          dbKey: spaceKey,
          changes: {
            contents: { [contentKey]: null },
            updatedAt: Date.now(),
            ...localSpaceAuthorityPatchStamp(spaceData),
          },
        })
      ).unwrap()) as SpaceData;
    } catch (patchError: any) {
      throw new Error(
        `从空间移除引用失败: ${patchError?.message || "未知错误"}`
      );
    }
    result.removed = true;
    result.updatedSpaceData = updatedSpaceData;
  }

  // 实体对齐：只在「自有实体且归属空间恰是该空间」时清空 spaceId。
  const entityRead = await readContentRecordForSpaceSync(dispatch, contentKey);
  if (entityRead.status === "unreadable") {
    result.entitySpaceSync = "unreadable";
    result.error =
      "引用已从空间移除，但无法读取内容记录，归属空间未对齐（可重试）";
    notifyUserDataUpdated();
    return result;
  }
  if (entityRead.status === "missing") {
    result.entitySpaceSync = "no-record";
    notifyUserDataUpdated();
    return result;
  }

  const record = entityRead.record as {
    userId?: unknown;
    ownerId?: unknown;
    spaceId?: unknown;
  };
  const ownerRaw =
    typeof record.userId === "string"
      ? record.userId
      : typeof record.ownerId === "string"
        ? record.ownerId
        : "";
  const owner = ownerRaw.trim();
  const ownsRecord = Boolean(owner) && (owner === userId || owner === "local");
  if (!ownsRecord) {
    // 他人实体：绝不改写（哪怕我是这个空间的管理员）。
    result.entitySpaceSync = "skipped-not-owner";
    notifyUserDataUpdated();
    return result;
  }

  const currentSpaceId =
    typeof record.spaceId === "string"
      ? normalizeSpaceId(record.spaceId)
      : null;
  if (currentSpaceId !== normalizeSpaceId(spaceId)) {
    result.entitySpaceSync = "skipped-mismatch";
    notifyUserDataUpdated();
    return result;
  }

  try {
    await dispatch(
      patch({ dbKey: contentKey, changes: { spaceId: null } })
    ).unwrap();
    result.entitySpaceSync = "cleared";
  } catch (entityPatchError: any) {
    result.entitySpaceSync = "failed";
    result.error = `引用已移除，但清空内容归属空间失败（可重试）: ${
      entityPatchError?.message || "未知错误"
    }`;
    logger.error(
      { contentKey, spaceId, reason: entityPatchError?.message },
      "Failed to clear content spaceId after unlink"
    );
  }
  notifyUserDataUpdated();
  return result;
};
