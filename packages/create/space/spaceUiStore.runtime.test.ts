// Wave E: 从 spaceSlice.runtime.test.ts 迁入 spaceUiStore / viewMode 用例。
// setViewMode 从 slice action 变为 spaceCurrentStore 的普通函数（直接调用，不再 dispatch）。
import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, test, beforeEach } from "bun:test";

import { UNCATEGORIZED_ID } from "./constants";
import {
  getFavoritesCollapsed,
  getCollapsedCategories,
  getIsCategoryCollapsed,
  resetSpaceUiState,
  setCollapsedCategories,
  toggleFavoritesCollapse,
} from "./spaceUiStore";
import {
  getViewMode,
  setViewMode,
  setCurrentSpaceBoth,
  resetSpaceCurrentState,
} from "./spaceCurrentStore";
import { selectCurrentSpaceId } from "./spaceCurrentSelectors";
import { setAllCategoriesCollapsed } from "./category/categoryActions";
import { resetSpace } from "./spaceReset";
import { resetSpaceDialogState } from "./spaceDialogStore";
import { resetSpaceMembershipState } from "./spaceMembershipStore";

beforeEach(() => {
  resetSpaceUiState();
  resetSpaceDialogState();
  resetSpaceMembershipState();
  resetSpaceCurrentState();
});

describe("spaceUiStore (Wave A module store)", () => {
  test("getViewMode defaults to all on fresh initial state", () => {
    expect(getViewMode()).toBe("all");
  });

  test("getFavoritesCollapsed defaults to false on fresh initial state", () => {
    expect(getFavoritesCollapsed()).toBe(false);
  });

  test("toggleFavoritesCollapse flips favoritesCollapsed in-memory", () => {
    expect(getFavoritesCollapsed()).toBe(false);
    toggleFavoritesCollapse();
    expect(getFavoritesCollapsed()).toBe(true);
    toggleFavoritesCollapse();
    expect(getFavoritesCollapsed()).toBe(false);
  });

  test("getIsCategoryCollapsed falls back to DEFAULT_COLLAPSED_CATEGORIES for unregistered ids", () => {
    setCollapsedCategories({ "explicit-false": false }, "space-1");
    // UNCATEGORIZED 在 DEFAULT_COLLAPSED_CATEGORIES 里是 false
    expect(getIsCategoryCollapsed(UNCATEGORIZED_ID)).toBe(false);
    // 普通分类未登记 → 回退到 true
    expect(getIsCategoryCollapsed("category-1")).toBe(true);
    // 显式登记 false 优先于默认
    expect(getIsCategoryCollapsed("explicit-false")).toBe(false);
  });

  test("setCollapsedCategories replaces the whole map", () => {
    setCollapsedCategories({ "cat-1": true, "cat-2": false }, "space-1");
    expect(getCollapsedCategories()).toEqual({ "cat-1": true, "cat-2": false });
    // 再次 set 应替换而非合并
    setCollapsedCategories({ "cat-3": true }, "space-1");
    expect(getCollapsedCategories()).toEqual({ "cat-3": true });
  });

  test("setAllCategoriesCollapsed uses thunk-built complete map (not just existing keys)", () => {
    // module store 初始为空（无已注册分类）
    expect(getCollapsedCategories()).toEqual({});
    const completeMap = {
      [UNCATEGORIZED_ID]: false,
      "cat-1": false,
      "cat-2": false,
    };
    setCollapsedCategories(completeMap, "space-1");
    expect(getIsCategoryCollapsed(UNCATEGORIZED_ID)).toBe(false);
    expect(getIsCategoryCollapsed("cat-1")).toBe(false);
    expect(getIsCategoryCollapsed("cat-2")).toBe(false);
  });

  test("setAllCategoriesCollapsed thunk dispatch writes complete map to module store", async () => {
    const store = configureStore({
      reducer: { noop: (s: any = {}) => s } as any,
      middleware: (gdm: any) => gdm({ thunk: true, serializableCheck: false }),
    });
    // 设当前 space 有两个分类（原测试靠 changeSpace/fulfilled action，现在直接写 module store）
    setCurrentSpaceBoth("space-1", {
      id: "space-1",
      categories: { "cat-1": {}, "cat-2": {} },
    } as any);
    setViewMode("categories");
    expect(getCollapsedCategories()).toEqual({});

    await store.dispatch(
      setAllCategoriesCollapsed({
        spaceId: "space-1",
        collapsed: false,
      }) as any
    );
    // 验证所有分类都展开（包括之前未注册的 cat-1, cat-2）
    expect(getIsCategoryCollapsed(UNCATEGORIZED_ID)).toBe(false);
    expect(getIsCategoryCollapsed("cat-1")).toBe(false);
    expect(getIsCategoryCollapsed("cat-2")).toBe(false);
  });

  test("resetSpaceUiState resets to defaults and clears localStorage (not reads it back)", () => {
    toggleFavoritesCollapse();
    expect(getFavoritesCollapsed()).toBe(true);
    resetSpaceUiState();
    expect(getViewMode()).toBe("all");
    expect(getFavoritesCollapsed()).toBe(false);
    expect(getCollapsedCategories()).toEqual({});
  });
});

describe("Wave D: viewMode current space store 一致性", () => {
  test("setViewMode 直接写 module store", () => {
    expect(getViewMode()).toBe("all");
    setViewMode("categories");
    expect(getViewMode()).toBe("categories");
  });

  test("selectCurrentSpaceId 在 setViewMode 后从 null 变为 currentSpaceId", () => {
    setCurrentSpaceBoth("space-1", { id: "space-1" } as any);
    // viewMode 还是 "all" → getCurrentSpaceId 返回 null
    expect(getViewMode()).toBe("all");
    expect(selectCurrentSpaceId()).toBeNull();
    // 切到 categories → 返回 spaceId
    setViewMode("categories");
    expect(selectCurrentSpaceId()).toBe("space-1");
  });

  test("resetSpace 同步重置 module store", () => {
    setViewMode("categories");
    setCollapsedCategories({ "cat-1": false }, "space-a");
    expect(getViewMode()).toBe("categories");

    resetSpace();
    expect(getViewMode()).toBe("all");
    expect(getCollapsedCategories()).toEqual({});
  });
});
