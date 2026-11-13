// create/space/utils/permissions.ts

import type { SpaceData } from "app/types";
import {
  DEVICE_LOCAL_OWNER_ID,
  isDeviceLocalSpaceBody,
} from "database/authority/deviceLocal";

/**
 * Check whether the actor may mutate the given Space.
 *
 * Device-local Space body (`userId`/`ownerId` === `"local"`) is owned by the
 * synthetic local owner: guest and any logged-in account may operate it.
 * Account Spaces keep strict membership (logged-in + members includes userId).
 * Local cache of an account Space is never treated as device-local.
 */
export const checkSpaceMembership = (
  spaceData: SpaceData | null,
  userId: string | null | undefined
): void => {
  if (!spaceData) {
    console.error("[Permission Check] Space data is missing.");
    throw new Error("无法执行权限检查：空间数据缺失。");
  }

  // Real local body authority only — not arbitrary cached account Spaces.
  if (isDeviceLocalSpaceBody(spaceData)) {
    return;
  }

  if (!userId) {
    console.error("[Permission Check] User ID is missing.");
    throw new Error("无法执行权限检查：用户 ID 缺失。");
  }

  if (
    !spaceData.members ||
    !Array.isArray(spaceData.members) ||
    !spaceData.members.includes(userId)
  ) {
    console.warn(
      `[Permission Check] User ${userId} attempt to operate on space ${spaceData.id} without membership.`
    );
    throw new Error("当前用户不是空间成员");
  }
};

/**
 * 空间内容管理权（用于「从空间移除引用」这类空间级动作）：
 * 设备本地空间体放行；账号空间要求空间 owner（`ownerId`/`userId` 是本人）
 * 或成员角色为 owner/admin。普通成员/guest 均不放行。
 *
 * 与 `checkSpaceMembership`（能否写这个空间）叠加使用：owner 同样必须先过成员检查。
 */
export const canManageSpaceContent = (
  spaceData:
    | {
        userId?: string | null;
        ownerId?: string | null;
        members?: string[] | null;
      }
    | null
    | undefined,
  userId: string | null | undefined,
  membership?: { role?: string | null } | null
): boolean => {
  if (!spaceData) return false;
  if (isDeviceLocalSpaceBody(spaceData)) return true;
  const actor = typeof userId === "string" ? userId.trim() : "";
  if (!actor) return false;
  const ownerValues = [spaceData.ownerId, spaceData.userId]
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);
  if (ownerValues.includes(actor)) return true;
  const role = typeof membership?.role === "string" ? membership.role.trim() : "";
  return role === "owner" || role === "admin";
};

/**
 * Fields to merge into Space body patch/write changes so replication authority
 * sees `userId === "local"` and plans zero remote servers.
 * No-op for account Spaces (must not rewrite account ownership stamps).
 */
export const localSpaceAuthorityPatchStamp = (
  spaceData: { userId?: string | null; ownerId?: string | null } | null | undefined
): { userId: typeof DEVICE_LOCAL_OWNER_ID } | Record<string, never> =>
  isDeviceLocalSpaceBody(spaceData) ? { userId: DEVICE_LOCAL_OWNER_ID } : {};
