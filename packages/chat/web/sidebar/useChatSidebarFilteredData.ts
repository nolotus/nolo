import { useMemo } from "react";

import { UNCATEGORIZED_ID } from "create/space/constants";
import {
  matchesSidebarVisibleTypes,
  type SidebarVisibleType,
} from "create/space/sidebarVisibleTypes";
import type { SpaceContent } from "app/types";

import type { ChatSidebarCategoryItem, ChatSidebarGroupedData } from "./types";

interface UseChatSidebarFilteredDataParams {
  groupedData: ChatSidebarGroupedData;
  sortedCategories: ChatSidebarCategoryItem[];
  visibleTypes: SidebarVisibleType[];
  isShowingAllTypes: boolean;
  displayCount: number;
  isFullyLoaded: boolean;
  searchQuery: string;
  favoriteKeys?: ReadonlySet<string>;
}

export function buildFilteredSidebarGroupedData({
  groupedData,
  sortedCategories,
  visibleTypes,
  isShowingAllTypes,
  displayCount,
  isFullyLoaded,
  searchQuery,
}: UseChatSidebarFilteredDataParams): ChatSidebarGroupedData {
  // 收集子对话（parentDialogId 非空），按 parentDialogId 分组。
  // 这些子对话会被 matchesSidebarVisibleTypes 过滤掉（不单独显示），
  // 但我们要把它们挂到父对话下，供侧边栏折叠展开。
  // search 非空时不收集（搜索时展开所有，子对话也参与搜索匹配）。
  const collectChildren = (items: SpaceContent[]): Record<string, SpaceContent[]> => {
    if (searchQuery) return {};
    const map: Record<string, SpaceContent[]> = {};
    for (const item of items) {
      if (item.parentDialogId) {
        (map[item.parentDialogId] ??= []).push(item);
      }
    }
    return map;
  };

  // One predicate for visible-type + search filtering, applied to both
  // the uncategorized list and every category bucket.
  const applyFilters = (items: SpaceContent[]): SpaceContent[] => {
    if (isShowingAllTypes && !searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter((item) => {
      if (!matchesSidebarVisibleTypes(item, visibleTypes)) return false;
      if (!query) return true;
      return (
        (item.title || "").toLowerCase().includes(query) ||
        ((item as any).name || "").toLowerCase().includes(query) ||
        ((item as any).description || "").toLowerCase().includes(query)
      );
    });
  };

  // 子对话从两个来源收集：uncategorized + 所有 categorized buckets。
  const childrenByParent: Record<string, SpaceContent[]> = {
    ...collectChildren(groupedData.uncategorized),
  };
  for (const items of Object.values(groupedData.categorized)) {
    for (const [parentId, children] of Object.entries(collectChildren(items))) {
      (childrenByParent[parentId] ??= []).push(...children);
    }
  }

  const filteredUncategorized = applyFilters(groupedData.uncategorized);
  const filteredCategorized: Record<string, SpaceContent[]> = Object.fromEntries(
    Object.entries(groupedData.categorized).map(([id, items]) => [
      id,
      applyFilters(items),
    ])
  );

  if (isFullyLoaded) {
    return {
      uncategorized: filteredUncategorized,
      categorized: filteredCategorized,
      childrenByParent,
    };
  }

  // Truncate to `displayCount` total items, draining the uncategorized
  // bucket first and then filling each category in order.
  let remaining = displayCount;
  const uncategorized = filteredUncategorized.slice(0, remaining);
  remaining = Math.max(0, remaining - filteredUncategorized.length);

  const categorized: Record<string, SpaceContent[]> = {};
  for (const category of sortedCategories) {
    const items = filteredCategorized[category.id] || [];
    categorized[category.id] =
      remaining > 0 ? items.slice(0, remaining) : [];
    remaining = Math.max(0, remaining - items.length);
  }

  return { uncategorized, categorized, childrenByParent };
}

/**
 * The sidebar is empty only when there is no content AND no categories
 * to render. With this guard, a space that has user-created (empty)
 * categories still shows the category list even when the space is
 * otherwise content-free.
 *
 * Exported for unit tests; the hook wraps it in `useMemo` for callers.
 */
export function computeIsEmptySidebar({
  filteredGroupedData,
  sortedCategories,
}: {
  filteredGroupedData: ChatSidebarGroupedData;
  sortedCategories: ChatSidebarCategoryItem[];
}): boolean {
  const allContentCount =
    filteredGroupedData.uncategorized.length +
    Object.values(filteredGroupedData.categorized).reduce(
      (sum, items) => sum + items.length,
      0
    );
  return allContentCount === 0 && sortedCategories.length === 0;
}

/**
 * Split filtered grouped data into:
 * - `dedupedGroupedData`: items with pinned/favorite items removed from the
 *   visible lists (mirrors the pinned dedup pattern, extended to favorites).
 * - `pinnedItems`: all pinned items collected from both buckets.
 *
 * Exported for unit tests; the hook wraps it in `useMemo` for callers.
 */
export function splitPinnedAndFavoriteItems(
  filteredGroupedData: ChatSidebarGroupedData,
  favoriteKeys?: ReadonlySet<string>,
): {
  dedupedGroupedData: ChatSidebarGroupedData;
  pinnedItems: SpaceContent[];
} {
  const isHidden = (item: SpaceContent) =>
    item.pinned || (favoriteKeys?.has(item.contentKey) ?? false);

  const uncategorized = filteredGroupedData.uncategorized.filter(item => !isHidden(item));
  const pinnedItems = [
    ...filteredGroupedData.uncategorized.filter(item => item.pinned),
    ...Object.values(filteredGroupedData.categorized).flatMap(items =>
      items.filter(item => item.pinned),
    ),
  ];

  const categorized = Object.fromEntries(
    Object.entries(filteredGroupedData.categorized).map(([id, items]) => [
      id,
      items.filter(item => !isHidden(item)),
    ]),
  );

  return {
    dedupedGroupedData: {
      uncategorized,
      categorized,
      childrenByParent: filteredGroupedData.childrenByParent,
    },
    pinnedItems,
  };
}

export const useChatSidebarFilteredData = ({
  groupedData,
  sortedCategories,
  visibleTypes,
  isShowingAllTypes,
  displayCount,
  isFullyLoaded,
  searchQuery,
  favoriteKeys,
}: UseChatSidebarFilteredDataParams) => {
  const filteredGroupedData = useMemo(
    () =>
      buildFilteredSidebarGroupedData({
        groupedData,
        sortedCategories,
        visibleTypes,
        isShowingAllTypes,
        displayCount,
        isFullyLoaded,
        searchQuery,
      }),
    [
      displayCount,
      groupedData,
      isFullyLoaded,
      isShowingAllTypes,
      searchQuery,
      sortedCategories,
      visibleTypes,
    ]
  );

  const allVisibleCategoryIds = useMemo(() => {
    const ids: string[] = [];
    if (filteredGroupedData.uncategorized.length > 0) {
      ids.push(UNCATEGORIZED_ID);
    }
    for (const category of sortedCategories) {
      if ((filteredGroupedData.categorized[category.id]?.length || 0) > 0) {
        ids.push(category.id);
      }
    }
    return ids;
  }, [filteredGroupedData, sortedCategories]);

  const isEmpty = useMemo(
    () => computeIsEmptySidebar({ filteredGroupedData, sortedCategories }),
    [filteredGroupedData, sortedCategories]
  );

  const { dedupedGroupedData, pinnedItems } = useMemo(
    () => splitPinnedAndFavoriteItems(filteredGroupedData, favoriteKeys),
    [filteredGroupedData, favoriteKeys],
  );

  return { 
    filteredGroupedData: dedupedGroupedData,
    pinnedItems,
    allVisibleCategoryIds, 
    isEmpty 
  };
};
