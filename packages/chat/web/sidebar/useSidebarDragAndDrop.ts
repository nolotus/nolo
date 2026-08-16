import { useCallback } from "react";

import type { AppDispatch } from "app/store";
import {
  reorderCategories,
  updateContentCategory,
} from "create/space/spaceSlice";

import type { ChatSidebarCategoryItem } from "./types";

export const useCategoryDragAndDrop = (
  sortedCategories: ChatSidebarCategoryItem[],
  spaceId: string | undefined,
  dispatch: AppDispatch
) =>
  useCallback(
    (activeId: string, overId: string) => {
      if (!spaceId || activeId === overId) return;

      const oldIndex = sortedCategories.findIndex((category) => category.id === activeId);
      const newIndex = sortedCategories.findIndex((category) => category.id === overId);

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = [...sortedCategories];
      const [movedItem] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, movedItem);

      (dispatch as any)(
        reorderCategories({
          spaceId,
          sortedCategoryIds: reordered.map((category) => category.id),
        })
      );
    },
    [dispatch, sortedCategories, spaceId]
  );

export const useItemDragAndDrop = (
  spaceId: string | undefined,
  dispatch: AppDispatch
) =>
  useCallback(
    (itemId: string, sourceContainer: string, targetContainer: string) => {
      if (!spaceId || sourceContainer === targetContainer) return;

      (dispatch as any)(
        updateContentCategory({
          spaceId,
          contentKey: itemId,
          categoryId: targetContainer,
        })
      );
    },
    [dispatch, spaceId]
  );
