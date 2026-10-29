import type { ULID } from "app/types";
import { MemberRole } from "app/types";
import type { SpaceData } from "app/types";
import { selectIdentityUserId } from "identity/selectors";
import { createSpaceKey } from "create/space/spaceKeys";
import { DB_PREFIX } from "database/keys";
import { read, write } from "database/dbSlice";
import { SpaceMemberWithSpaceInfo } from "app/types";
import { DataType } from "create/types";
import type { DbThunkApi } from "database/thunkApiTypes";
import { dbThunkExtra, dbThunkState } from "database/thunkApiTypes";
import type { AppExtra } from "app/store";
import { logger } from "database/actions/common";
import { normalizeTimeFields } from "database/actions/common";
import { isDeviceLocalOwnerId } from "database/authority/deviceLocal";
import { applyFetchSpaceFulfilled } from "create/space/applyFetchSpaceFulfilled";
import { addMemberSpace } from "create/space/spaceMembershipStore";
import { submitAddSpaceMember } from "./submitAddSpaceMember";

/**
 * 添加成员到空间
 *
 * 说明：
 * 1. 当前用户必须为空间现有成员，才可以添加新成员；
 * 2. 如果成员已存在则直接报错；
 * 3. 更新 SpaceData.members 数组，同时为新成员创建 SpaceMemberWithSpaceInfo 数据。
 */
export const addMemberAction = async (
  input: { spaceId: ULID; memberId: string; role?: MemberRole },
  thunkAPI: DbThunkApi
): Promise<{ spaceId: ULID; updatedSpaceData: SpaceData }> => {
  const { spaceId, memberId, role = MemberRole.MEMBER } = input; // 默认角色为 MEMBER
  const { dispatch } = thunkAPI;
  const state = dbThunkState(thunkAPI);
  const currentUserId = selectIdentityUserId(state);

  const { db } = dbThunkExtra(thunkAPI);

  const resolvedMemberId = db
    ? await resolveMemberId(db, memberId)
    : memberId.trim();

  const spaceKey = createSpaceKey.space(spaceId);
  const spaceData: SpaceData | null = await dispatch(read({
    dbKey: spaceKey
  })).unwrap();

  if (!spaceData) {
    throw new Error("Space not found");
  }
  if (!currentUserId) {
    throw new Error("User is not logged in.");
  }
  // 检查当前用户是否为该空间的成员
  if (!spaceData.members.includes(currentUserId)) {
    throw new Error("当前用户不是空间成员，无法添加成员");
  }
  // 检查待添加的成员是否已存在
  if (spaceData.members.includes(resolvedMemberId)) {
    throw new Error("成员已存在");
  }

  // 更新 SpaceData
  const updatedSpaceData: SpaceData = {
    ...spaceData,
    members: [...spaceData.members, resolvedMemberId],
    updatedAt: Date.now(),
  };

  // 注意写入顺序（账号 actor）：成员关系由服务端的单次命令原子提交，本地只
  // 应用返回结果，不再做「本地写 + 后台复制」。设备本地 actor 没有服务端权威，
  // 仍在下面走两条本地写。

  // 创建并写入新成员的 SpaceMemberWithSpaceInfo 数据
  const now = Date.now();
  const spaceMemberData: SpaceMemberWithSpaceInfo = {
    userId: resolvedMemberId,
    role: role, // 使用传入的 role，默认为 MEMBER
    joinedAt: now,
    updatedAt: now, // 可选字段，初始化时设置为当前时间
    spaceId: spaceId,
    spaceName: spaceData.name,
    ownerId: spaceData.ownerId,
    visibility: spaceData.visibility,
    type: DataType.SPACE, // 添加 type 字段
  };

  const spaceMemberKey = createSpaceKey.member(resolvedMemberId, spaceId);

  if (currentUserId && !isDeviceLocalOwnerId(currentUserId)) {
    // 账号 actor：一次命令、一次提交。服务端保证 membership 与 body.members
    // 同时成立，客户端不再协调两次写、也不需要回滚。
    const submitted = await submitAddSpaceMember({
      spaceId,
      targetUserId: resolvedMemberId,
      role,
      state,
    });
    if (!submitted.ok) {
      throw new Error(submitted.message);
    }
    const authoritativeSpace: SpaceData =
      (submitted.result?.space as SpaceData) ?? updatedSpaceData;
    // 只应用服务端返回的权威数据，不触发写回复制。
    applyFetchSpaceFulfilled({ spaceId, spaceData: authoritativeSpace });
    // 本地缓存也要跟上，否则刷新/重进空间时本地仍是「没这个人」的旧 body。
    // 直接写 client DB（不走 writeAction），因此不会再次触发远端复制。
    if (db) {
      try {
        await db.put(
          spaceKey,
          normalizeTimeFields({
            ...authoritativeSpace,
            dbKey: spaceKey,
            userId: currentUserId,
          })
        );
      } catch (error) {
        // 服务端的成员关系已经生效，本地缓存失败只是显示滞后。
        logger.warn(
          { error },
          "[addMemberAction] 本地应用服务端返回的空间数据失败"
        );
      }
    }
    // 注意：result.membership 属于**目标成员**，不能塞进本地「我加入的空间列表」
    // —— dedupe 按 spaceId 覆盖且时间戳最新，会把操作者自己的条目顶掉
    // （OWNER 会瞬间变成 MEMBER）。只有它确实是本人的记录时才应用。
    const returnedMembership = submitted.result?.membership;
    if (returnedMembership && returnedMembership.userId === currentUserId) {
      addMemberSpace(returnedMembership);
    }
    return { spaceId, updatedSpaceData: authoritativeSpace };
  }

  // 设备本地 actor（`local`，桌面/CLI 本地模式）：没有服务端权威，保持本地双写。
  await dispatch(
    write({ data: updatedSpaceData, customKey: spaceKey })
  ).unwrap();
  await dispatch(
    write({
      data: spaceMemberData,
      customKey: spaceMemberKey,
    })
  ).unwrap();

  return { spaceId, updatedSpaceData };
};

async function resolveMemberId(
  db: NonNullable<AppExtra["db"]>,
  identifier: string
): Promise<string> {
  const trimmed = identifier.trim();
  let foundUserId: string | null = null;
  let matchCount = 0;

  try {
    for await (const [key, value] of db.iterator({
      gte: `${DB_PREFIX.USER}`,
      lte: `${DB_PREFIX.USER}\uFFFF`,
    })) {
      if (value.username === trimmed) {
        foundUserId = key.slice(DB_PREFIX.USER.length);
        matchCount++;
      }
    }
  } catch (err) {
    logger.warn({ err, identifier: trimmed }, "Failed to scan users by username");
  }

  if (matchCount > 1) {
    throw new Error(
      `找到多个用户名为 ${trimmed} 的用户，请使用用户 ID 邀请`
    );
  }
  if (matchCount === 1 && foundUserId) {
    return foundUserId;
  }
  return trimmed;
}
