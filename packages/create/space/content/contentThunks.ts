// create/space/content/contentThunks.ts
// Wave E: 从 slice 工厂改为模块顶层 createAsyncThunk 直出，typePrefix 保持不变。
import { createAsyncThunk } from "@reduxjs/toolkit";
import { toast } from "app/utils/toast";
// Wave D: currentSpaceId/currentSpace 已剥至 module store。
import {
  getCurrentSpaceIdRaw,
  updateCurrentSpaceIfMatch,
} from "../spaceCurrentStore";
import { addContentAction } from "./addContentAction";
import { deleteContentFromSpaceAction } from "./deleteContentFromSpaceAction";
import { moveContentAction } from "./moveContentAction";
import { updateContentTitleAction } from "./updateContentTitleAction";
import { updateContentPinnedAction } from "./updateContentPinnedAction";
import { updateContentCategoryAction } from "./updateContentCategoryAction";
import { deleteMultipleContentAction } from "./deleteMultipleContentAction";
import { uploadAndAddFileToSpaceAction } from "./uploadAndAddFileToSpaceAction";
import { normalizeSpaceId } from "../spaceKeys";
import { UNCATEGORIZED_ID } from "../constants";
import { writeStoredCollapsedCategories } from "../spaceCollapsedState";
import { asTrimmedString } from "core/trimmedString";
// Wave A: collapsedCategories 已剥至 module store。
import {
  getCollapsedCategories,
  expandCategoryInCollapsed,
} from "../spaceUiStore";

/** 共享的 fulfilled 副作用：仅当 payload 属于当前空间时同步 currentSpace。 */
const syncCurrentSpaceIfNormalizedMatch = (
  spaceId: string,
  updatedSpaceData: any
): void => {
  const normalizedSpaceId = normalizeSpaceId(spaceId);
  const rawSpaceId = getCurrentSpaceIdRaw();
  const normalizedCurrentSpaceId = rawSpaceId
    ? normalizeSpaceId(rawSpaceId)
    : null;
  if (normalizedCurrentSpaceId === normalizedSpaceId && updatedSpaceData) {
    updateCurrentSpaceIfMatch(spaceId, updatedSpaceData);
  }
};

/**
 * Add content into a space. When the content lands in a real category,
 * force-expand that category (Redux + localStorage) so "create page"
 * never leaves the new item trapped inside a default-collapsed section.
 */
export const addContentToSpace = createAsyncThunk(
  "space/addContentToSpace",
  async (
    input: Parameters<typeof addContentAction>[0],
    thunkAPI: Parameters<typeof addContentAction>[1]
  ) => {
    const result = await addContentAction(input, thunkAPI);
    const rawCategoryId = asTrimmedString(input.categoryId);
    const expandCategoryId =
      rawCategoryId && rawCategoryId !== UNCATEGORIZED_ID
        ? rawCategoryId
        : null;

    if (expandCategoryId) {
      // Wave A: 从 module store 读当前折叠状态
      const collapsedCategories = {
        ...getCollapsedCategories(),
        [expandCategoryId]: false,
      };
      if (typeof window !== "undefined") {
        writeStoredCollapsedCategories(
          result.spaceId,
          collapsedCategories,
          window.localStorage
        );
      }
      // Wave A: 直接展开分类，替代原 fulfilled reducer 写 Redux state
      expandCategoryInCollapsed(expandCategoryId, result.spaceId);
      syncCurrentSpaceIfNormalizedMatch(
        result.spaceId,
        result.updatedSpaceData
      );
      return { ...result, expandCategoryId, collapsedCategories };
    }

    syncCurrentSpaceIfNormalizedMatch(result.spaceId, result.updatedSpaceData);
    return { ...result, expandCategoryId: null as string | null };
  }
);

export const moveContentToSpace = createAsyncThunk(
  "space/moveContentToSpace",
  async (arg: any, thunkAPI: any) => {
    const payload = await moveContentAction(arg, thunkAPI);
    const {
      sourceSpaceId,
      updatedSourceSpaceData,
      targetSpaceId,
      updatedTargetSpaceData,
    } = payload;
    if (getCurrentSpaceIdRaw() === sourceSpaceId && updatedSourceSpaceData) {
      updateCurrentSpaceIfMatch(sourceSpaceId, updatedSourceSpaceData);
    }
    if (getCurrentSpaceIdRaw() === targetSpaceId && updatedTargetSpaceData) {
      updateCurrentSpaceIfMatch(targetSpaceId, updatedTargetSpaceData);
    }
    return payload;
  }
);

export const deleteContentFromSpace = createAsyncThunk(
  "space/deleteContentFromSpace",
  async (arg: any, thunkAPI: any) => {
    const payload = await deleteContentFromSpaceAction(arg, thunkAPI);
    syncCurrentSpaceIfNormalizedMatch(
      payload.spaceId,
      payload.updatedSpaceData
    );
    return payload;
  }
);

export const deleteMultipleContent = createAsyncThunk(
  "space/deleteMultipleContent",
  async (arg: any, thunkAPI: any) => {
    const payload = await deleteMultipleContentAction(arg, thunkAPI);
    syncCurrentSpaceIfNormalizedMatch(
      payload.spaceId,
      payload.updatedSpaceData
    );
    return payload;
  }
);

export const uploadAndAddFileToSpace = createAsyncThunk(
  "space/uploadAndAddFileToSpace",
  async (arg: any, thunkAPI: any) => {
    const payload = await uploadAndAddFileToSpaceAction(arg, thunkAPI);
    if (getCurrentSpaceIdRaw() === payload.spaceId) {
      updateCurrentSpaceIfMatch(payload.spaceId, payload.updatedSpaceData);
    }
    return payload;
  }
);

export const updateContentTitle = createAsyncThunk(
  "space/updateContentTitle",
  async (arg: any, thunkAPI: any) => {
    try {
      const payload = await updateContentTitleAction(arg, thunkAPI);
      if (getCurrentSpaceIdRaw() === payload.spaceId) {
        updateCurrentSpaceIfMatch(payload.spaceId, payload.updatedSpaceData);
      }
      return payload;
    } catch (error) {
      const message =
        (error as { message?: string } | undefined)?.message || "标题保存失败";
      // 空间记录不可读（跨服务器/本地未同步的空间）属于次级同步失败：
      // 页面本身已保存成功，自动保存路径不需要每次按键都弹这个 toast；
      // 真正的写入失败（如 patch 失败）仍然提示。
      if (!message.includes("无法加载空间数据")) {
        toast.error(message);
      }
      throw error;
    }
  }
);

export const updateContentPinned = createAsyncThunk(
  "space/updateContentPinned",
  async (arg: any, thunkAPI: any) => {
    try {
      const payload = await updateContentPinnedAction(arg, thunkAPI);
      if (
        payload.updatedSpaceData &&
        payload.spaceId &&
        getCurrentSpaceIdRaw() === payload.spaceId
      ) {
        updateCurrentSpaceIfMatch(payload.spaceId, payload.updatedSpaceData);
      }
      return payload;
    } catch (error) {
      toast.error(
        (error as { message?: string } | undefined)?.message ||
          "置顶状态更新失败"
      );
      throw error;
    }
  }
);

export const updateContentCategory = createAsyncThunk(
  "space/updateContentCategory",
  async (arg: any, thunkAPI: any) => {
    const payload = await updateContentCategoryAction(arg, thunkAPI);
    if (getCurrentSpaceIdRaw() === payload.spaceId) {
      updateCurrentSpaceIfMatch(payload.spaceId, payload.updatedSpaceData);
    }
    return payload;
  }
);
