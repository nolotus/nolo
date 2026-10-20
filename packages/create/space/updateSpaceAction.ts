import { normalizeSpaceSavePatch } from "./spaceSaveNormalization";
import { selectIdentityUserId } from "identity/selectors";
import { toErrorMessage } from "core/errorMessage";
import { read, patch } from "database/dbSlice";
import { createSpaceKey } from "create/space/spaceKeys";
import type {
  SpaceMember,
  SpaceVisibility,
  SpaceData,
} from "app/types";
import type { AppDispatch, RootState } from "app/store";

export const updateSpaceAction = async (
  input: {
    spaceId: string;
    name?: string;
    description?: string;
    visibility?: SpaceVisibility;
  },
  thunkAPI: { dispatch: AppDispatch; getState: () => RootState }
) => {
  const { spaceId, name, description, visibility } = input;
  const { dispatch, getState } = thunkAPI;
  const state = getState();
  const userId = selectIdentityUserId(state);
  const spaceKey = createSpaceKey.space(spaceId);
  let spaceData: SpaceData | null = null;

  try {
    spaceData = await dispatch(read({
      dbKey: spaceKey
    })).unwrap();
  } catch (readError) {
    throw new Error(
      `无法加载空间数据: ${spaceId}, 原因: ${toErrorMessage(readError)}`
    );
  }

  if (!spaceData) {
    throw new Error(`空间不存在: ${spaceId}`);
  }

  if (!userId) {
    throw new Error("用户未登录，无法更新空间设置。");
  }

  if (!spaceData.members || !spaceData.members.includes(userId)) {
    throw new Error("当前用户不是空间成员，无法更新空间设置。");
  }

  const changes: Partial<SpaceData> & { updatedAt?: number } = {};
  if (name !== undefined && name !== spaceData.name) {
    changes.name = name.trim();
  }
  if (description !== undefined && description !== spaceData.description) {
    changes.description = description;
  }
  if (visibility !== undefined && visibility !== spaceData.visibility) {
    changes.visibility = visibility;
  }
  // Legacy Space folder is removed on any settings save; Project owns local cwd.
  // The normalization result states explicitly whether a legacy cleanup happened,
  // so `hasChanges` never depends on comparing key counts.
  const { changes: normalizedChanges, hasLegacyCleanup } = normalizeSpaceSavePatch(
    spaceData,
    changes,
  );
  const hasChanges = Object.keys(changes).length > 0 || hasLegacyCleanup;

  // 如果没有实际的值变化，直接返回，避免不必要的写入操作
  if (!hasChanges) {
    return { updatedSpace: spaceData, spaceId };
  }

  const now = Date.now();
  changes.updatedAt = now;
  // `updatedAt` must reach the database: it is part of the submitted payload.
  const patchChanges: Record<string, unknown> = { ...normalizedChanges, updatedAt: now };

  let updatedSpaceData: SpaceData;
  try {
    updatedSpaceData = await dispatch(
      patch({
        dbKey: spaceKey,
        changes: patchChanges,
      })
    ).unwrap();
  } catch (patchError) {
    throw new Error(`更新空间设置失败: ${toErrorMessage(patchError)}`);
  }

  // 如果更新了名称，同步更新当前用户的 space-member 数据
  if (changes.name !== undefined) {
    const memberKey = createSpaceKey.member(userId, spaceId);
    try {
      const memberData = (await dispatch(
        read({
          dbKey: memberKey
        })
      ).unwrap()) as SpaceMember | null;

      if (memberData) {
        const memberChanges = {
          spaceName: changes.name,
          updatedAt: now, // 为 member 数据也设置 updatedAt
        };
        await dispatch(
          patch({
            dbKey: memberKey,
            changes: memberChanges,
          })
        ).unwrap();
      }
    } catch (memberError) {
      // 此处捕获错误，确保即使成员信息更新失败，空间本身的更新也能成功返回
      console.error(
        `Failed to update member data ${memberKey} for space name change:`,
        memberError
      );
    }
  }

  return {
    updatedSpace: updatedSpaceData,
    spaceId,
  };
};
