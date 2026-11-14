import type { SpaceContent, SpaceData, ULID } from "app/types";
import { createSpaceKey, normalizeSpaceId } from "create/space/spaceKeys";
import { read, patch } from "database/dbSlice";
import { DEVICE_LOCAL_OWNER_ID } from "database/authority/deviceLocal";

export const notifyUserDataUpdated = () => {
  if (
    typeof window !== "undefined" &&
    typeof window.dispatchEvent === "function" &&
    typeof window.Event === "function"
  ) {
    window.dispatchEvent(new window.Event("nolo-user-data-updated"));
  }
};

export interface SpaceContentResult {
  spaceKey: string;
  spaceData: SpaceData;
  content: SpaceContent;
}

export const loadSpaceContentOrThrow = async (
  dispatch: any,
  spaceId: ULID,
  contentKey: string,
  sourceServerOrigin?: string | null
): Promise<SpaceContentResult> => {
  if (!contentKey || typeof contentKey !== "string" || contentKey.trim() === "") {
    throw new Error("Invalid contentKey provided.");
  }

  const spaceKey = createSpaceKey.space(spaceId);
  let spaceData: SpaceData | null = null;
  try {
    spaceData = await dispatch(
      read({ dbKey: spaceKey, preferredServerOrigin: sourceServerOrigin })
    ).unwrap();
  } catch (readError) {
    throw new Error(`无法加载空间数据: ${spaceId}`);
  }

  if (!spaceData) {
    throw new Error("Space not found");
  }

  const content = spaceData.contents?.[contentKey];
  if (!content) {
    throw new Error("Content not found in space");
  }

  return { spaceKey, spaceData, content };
};

export type ContentSpaceSyncOutcome =
  | "patched"
  | "unchanged"
  | "missing"
  | "unreadable"
  | "not-owner"
  | "unverified";

/**
 * 判断「当前 actor 能否改写这条内容实体的 spaceId」。
 *
 * 只有三种正证据放行：设备本地空间体（本地优先模型里内容归属本机 owner）、
 * 记录 owner 就是当前 actor、记录 owner 是 `local`（设备本地数据）。
 * 记录 owner 是**别的用户**时一律拒绝：空间管理员移动他人引用，不得顺手改写
 * 他人实体的归属空间。记录没有 owner 字段时仅经核实的本地目标空间可放行，否则 `unverified`。
 */
export function resolveContentSpaceWriteAuthority(input: {
  ownerId?: unknown;
  actorUserId?: string | null;
  targetSpaceIsDeviceLocal?: boolean;
}): "allow" | "deny" | "unverified" {
  const owner = typeof input.ownerId === "string" ? input.ownerId.trim() : "";
  const actor = typeof input.actorUserId === "string" ? input.actorUserId.trim() : "";
  if (owner && owner !== DEVICE_LOCAL_OWNER_ID && owner !== actor) return "deny";
  if (input.targetSpaceIsDeviceLocal) return "allow";
  if (owner === DEVICE_LOCAL_OWNER_ID) return "allow";
  if (!owner) return "unverified";
  if (actor && owner === actor) return "allow";
  return actor ? "deny" : "unverified";
}

export type ContentRecordRead =
  | { status: "ok"; record: Record<string, unknown> }
  | { status: "missing" }
  | { status: "unreadable" };

/** 读取内容实体记录（用于归属空间同步）。读失败与「记录不存在」必须区分。 */
export const readContentRecordForSpaceSync = async (
  dispatch: any,
  contentKey: string
): Promise<ContentRecordRead> => {
  try {
    const existing = await dispatch(read({ dbKey: contentKey })).unwrap();
    if (!existing || typeof existing !== "object") return { status: "missing" };
    return { status: "ok", record: existing as Record<string, unknown> };
  } catch {
    return { status: "unreadable" };
  }
};

/**
 * 对已读到的实体记录执行 authority 判定并写入 `spaceId`。
 * 供 move（读+写）与 add（先读后写，避免半完成）共用同一套规则。
 */
export const applyContentRecordSpaceId = async (
  dispatch: any,
  contentKey: string,
  record: Record<string, unknown>,
  targetSpaceId: string,
  failMessagePrefix: string,
  options: {
    onlyWhenUnset?: boolean;
    actorUserId?: string | null;
    targetSpaceIsDeviceLocal?: boolean;
  } = {}
): Promise<ContentSpaceSyncOutcome> => {
  const normalizedTarget = normalizeSpaceId(targetSpaceId) || targetSpaceId;
  const authority = resolveContentSpaceWriteAuthority({
    ownerId: (record as { userId?: unknown }).userId ?? (record as { ownerId?: unknown }).ownerId,
    actorUserId: options.actorUserId,
    targetSpaceIsDeviceLocal: options.targetSpaceIsDeviceLocal,
  });
  if (authority === "deny") return "not-owner";
  if (authority === "unverified") return "unverified";

  const rawCurrentSpaceId = (record as { spaceId?: unknown }).spaceId;
  const currentSpaceId =
    typeof rawCurrentSpaceId === "string"
      ? normalizeSpaceId(rawCurrentSpaceId)
      : null;
  if (currentSpaceId === normalizedTarget) return "unchanged";
  if (options.onlyWhenUnset && currentSpaceId) return "unchanged";

  try {
    await dispatch(
      patch({ dbKey: contentKey, changes: { spaceId: normalizedTarget } })
    ).unwrap();
  } catch (contentPatchError: any) {
    throw new Error(
      `${failMessagePrefix}: ${contentPatchError?.message || "未知错误"}`
    );
  }
  notifyUserDataUpdated();
  return "patched";
};

/**
 * 内容实体记录的归属空间（`spaceId`）必须跟随空间链接一起变化。
 *
 * 侧边栏工作视图的分组依据是 `item.spaceId`（「其他空间 / 空间外」两组
 * 完全由它决定，见 chat/web/sidebar/workDialogSpaceGroups.ts），只改 space 记录
 * 的 contents 链接会造成「空间链接已迁移、实体记录还挂在旧空间」的双真值。
 *
 * 只在实体记录已存在时写入，绝不给不存在的 key 造出只有 spaceId 的残记录。
 * `onlyWhenUnset` 用于「加入空间」这类引用式写入：记录已有别的归属空间时不抢。
 *
 * 读失败返回 `"unreadable"`（**不**当成「记录不存在」）：调用方必须把它当失败
 * 可见地上报，不能声称成功却仍漂移。
 */
export const syncContentRecordSpaceId = async (
  dispatch: any,
  contentKey: string,
  targetSpaceId: string,
  failMessagePrefix: string,
  options: {
    onlyWhenUnset?: boolean;
    actorUserId?: string | null;
    targetSpaceIsDeviceLocal?: boolean;
  } = {}
): Promise<ContentSpaceSyncOutcome> => {
  const readResult = await readContentRecordForSpaceSync(dispatch, contentKey);
  if (readResult.status === "unreadable") return "unreadable";
  if (readResult.status === "missing") return "missing";
  return applyContentRecordSpaceId(
    dispatch,
    contentKey,
    readResult.record,
    targetSpaceId,
    failMessagePrefix,
    options
  );
};

export const patchIndividualContentRecord = async (
  dispatch: any,
  contentKey: string,
  changes: Record<string, unknown>,
  sourceServerOrigin: string | null | undefined,
  failMessagePrefix: string
): Promise<void> => {
  let hasIndividualRecord = false;
  try {
    const existing = await dispatch(
      read({ dbKey: contentKey, preferredServerOrigin: sourceServerOrigin })
    ).unwrap();
    hasIndividualRecord = Boolean(existing);
  } catch {
    hasIndividualRecord = false;
  }

  if (hasIndividualRecord) {
    try {
      await dispatch(
        patch({
          dbKey: contentKey,
          changes,
          preferredServerOrigin: sourceServerOrigin,
        })
      ).unwrap();
      notifyUserDataUpdated();
    } catch (contentPatchError: any) {
      throw new Error(
        `${failMessagePrefix}: ${contentPatchError?.message || "未知错误"}`
      );
    }
  }
};
