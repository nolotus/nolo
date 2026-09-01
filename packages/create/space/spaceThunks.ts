// create/space/spaceThunks.ts
// Wave E: spaceSlice 已删除。这些 thunk 从工厂模式改为模块顶层 createAsyncThunk 直出。
// typePrefix 保持与原 slice ("space" + key) 完全一致。
// 原 case reducer（pending/fulfilled/rejected）只操作 module store，从不碰 slice state，
// 因此全部内联进 payload creator：pending 在 async 体开头同步执行，fulfilled 在成功后，
// rejected 在 catch 中执行后 rethrow（保持 RTK 的 rejected action 语义）。
import { createAsyncThunk } from "@reduxjs/toolkit";
import { addSpaceAction } from "./addSpaceAction";
import { deleteSpaceAction } from "./deleteSpaceAction";
import { fetchSpaceAction } from "./fetchSpaceAction";
import { normalizeSpaceId } from "./spaceKeys";
import { updateSpaceAction } from "./updateSpaceAction";
import { fetchSpaceSidebarStateAction } from "./fetchSpaceSidebarStateAction";
import { changeSpaceAction } from "./changeSpaceAction";
import { applyFetchSpaceFulfilled } from "./applyFetchSpaceFulfilled";
// Wave A: collapsedCategories 已剥至 module store。
import { setCollapsedCategories as setCollapsedCategoriesUi } from "./spaceUiStore";
// Wave D: setViewMode 已从 spaceUiStore 迁至 spaceCurrentStore。
import { setViewMode as setViewModeUi } from "./spaceCurrentStore";
// Wave C: memberSpaces/loading/membershipStatus/initialized 已剥至 module store。
import {
  addMemberSpace,
  removeMemberSpace,
  updateMemberSpaceName,
  setMembershipLoading,
  setMembershipLoaded,
  setMembershipRejected,
} from "./spaceMembershipStore";
// Wave D: currentSpaceId/currentSpace 已剥至 module store。
import {
  getCurrentSpaceIdRaw,
  setCurrentSpaceBoth,
  setCurrentSpace,
  updateCurrentSpaceIfMatch,
} from "./spaceCurrentStore";

export { applyFetchSpaceFulfilled } from "./applyFetchSpaceFulfilled";

const errorMessage = (error: unknown): string | undefined =>
  (error as { message?: string } | undefined)?.message;

export const fetchSpaceSidebarState = createAsyncThunk(
  "space/fetchSpaceSidebarState",
  async (arg: any, thunkAPI: any) => {
    try {
      const payload = await fetchSpaceSidebarStateAction(arg, thunkAPI);
      setCollapsedCategoriesUi(
        payload.collapsedCategories,
        getCurrentSpaceIdRaw()
      );
      return payload;
    } catch (error) {
      console.error("获取空间侧边栏状态失败:", errorMessage(error));
      setCollapsedCategoriesUi({}, getCurrentSpaceIdRaw());
      throw error;
    }
  }
);

export const changeSpace = createAsyncThunk(
  "space/changeSpace",
  async (arg: any, thunkAPI: any) => {
    // pending 副作用：必须在 async 体开头同步执行，保持原 pending reducer 的即时性。
    const newSpaceId = normalizeSpaceId(arg);
    if (getCurrentSpaceIdRaw() !== newSpaceId) {
      setMembershipLoading();
      setCurrentSpace(null);
    }

    try {
      const payload = await changeSpaceAction(arg, thunkAPI);
      setCurrentSpaceBoth(payload.spaceId, payload.spaceData);
      setMembershipLoaded();
      setCollapsedCategoriesUi(
        payload.sidebarState?.collapsedCategories || {},
        payload.spaceId
      );
      return payload;
    } catch (error) {
      setMembershipRejected(errorMessage(error) || "切换空间失败", false);
      setCurrentSpaceBoth(null, null);
      setCollapsedCategoriesUi({}, null);
      throw error;
    }
  }
);

export const addSpace = createAsyncThunk(
  "space/addSpace",
  async (arg: any, thunkAPI: any) => {
    setMembershipLoading();
    try {
      const payload = await addSpaceAction(arg, thunkAPI);
      addMemberSpace(payload);
      return payload;
    } catch (error) {
      setMembershipRejected(errorMessage(error), false);
      throw error;
    }
  }
);

export const deleteSpace = createAsyncThunk(
  "space/deleteSpace",
  async (arg: any, thunkAPI: any) => {
    const payload = await deleteSpaceAction(arg, thunkAPI);
    const normalizedSpaceId = normalizeSpaceId(payload.spaceId);
    const currentSpaceId = getCurrentSpaceIdRaw();
    const normalizedCurrentSpaceId = currentSpaceId
      ? normalizeSpaceId(currentSpaceId)
      : null;
    removeMemberSpace(normalizedSpaceId);
    if (normalizedCurrentSpaceId === normalizedSpaceId) {
      setCurrentSpaceBoth(null, null);
      setCollapsedCategoriesUi({}, null);
      setViewModeUi("all");
    }
    return payload;
  }
);

export const updateSpace = createAsyncThunk(
  "space/updateSpace",
  async (arg: any, thunkAPI: any) => {
    const payload = await updateSpaceAction(arg, thunkAPI);
    const { updatedSpace, spaceId } = payload;
    updateCurrentSpaceIfMatch(spaceId, updatedSpace);
    if (updatedSpace.name) {
      updateMemberSpaceName(updatedSpace.id, updatedSpace.name);
    }
    return payload;
  }
);

export const fetchSpace = createAsyncThunk(
  "space/fetchSpace",
  async (arg: any, thunkAPI: any) => {
    const payload = await fetchSpaceAction(arg, thunkAPI);
    applyFetchSpaceFulfilled(payload);
    return payload;
  }
);
