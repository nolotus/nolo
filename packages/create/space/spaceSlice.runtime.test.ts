import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, test, beforeEach } from "bun:test";

import spaceReducer, {
  addCategory,
  addContentToSpace,
  appendRecoveredMemberships,
  applySpaceEvent,
  deleteSpace,
  fetchUserSpaceMemberships,
  hydrateMemberSpacesFromLocal,
  markDialogRead,
  resetSpace,
  selectCurrentSpaceId,
  selectViewMode,
  setViewMode,
  setAllCategoriesCollapsed,
  toggleCategoryCollapse,
} from "./spaceSlice";
import { UNCATEGORIZED_ID } from "./constants";
// Wave A: viewMode / favoritesCollapsed / collapsedCategories 已剥至 module store。
import {
  getFavoritesCollapsed,
  getCollapsedCategories,
  getIsCategoryCollapsed,
  resetSpaceUiState,
  setCollapsedCategories,
  toggleFavoritesCollapse as toggleFavoritesCollapseUi,
} from "./spaceUiStore";
// viewMode 已从 spaceUiStore 迁至 spaceCurrentStore。
import { getViewMode } from "./spaceCurrentStore";
// Wave B: dialog 实时状态已剥至 module store。
import {
  getDialogStatus,
  getIsDialogUnread,
  getDialogStatuses,
  getUnreadDialogIds,
  getDialogEventTimestamps,
  getDialogTitles,
  resetSpaceDialogState,
} from "./spaceDialogStore";
// Wave C: memberSpaces/loading/membershipStatus/initialized 已剥至 module store。
import {
  getMemberSpaces,
  getAllMemberSpaces,
  getSpaceLoading,
  getMembershipStatus,
  getSpaceInitialized,
  getSpaceError,
  resetSpaceMembershipState,
} from "./spaceMembershipStore";

// Wave A: module store 是单例，测试间需重置以免串数据。
beforeEach(() => {
  resetSpaceUiState();
  resetSpaceDialogState();
  resetSpaceMembershipState();
  // Wave D: current space store 也需要重置
  const { resetSpaceCurrentState } = require("./spaceCurrentStore");
  resetSpaceCurrentState();
});

describe("spaceSlice membership status", () => {
  test("pending keeps cached rows; offline reject preserves them and marks offline", () => {
    const initial = spaceReducer(undefined, { type: "unknown" });
    expect(getMembershipStatus()).toBe("idle");

    let state = spaceReducer(
      initial,
      (fetchUserSpaceMemberships as any).pending("req-1", "user1") as any
    );
    expect(getSpaceLoading()).toBe(true);
    expect(getMembershipStatus()).toBe("loading");
    expect(getMemberSpaces()).toBeNull();

    state = spaceReducer(
      state,
      hydrateMemberSpacesFromLocal([
        {
          userId: "user1",
          spaceId: "stale",
          spaceName: "Stale",
          role: "member",
        } as any,
      ])
    );
    expect(getAllMemberSpaces().map((s) => s.spaceId)).toEqual(["stale"]);
    expect(getMembershipStatus()).toBe("loading");

    state = spaceReducer(
      state,
      (fetchUserSpaceMemberships as any).rejected(
        {
          name: "Error",
          message:
            "space_membership_remote_unavailable: unable to refresh memberships",
        },
        "req-1",
        "user1"
      ) as any
    );

    expect(getSpaceLoading()).toBe(false);
    expect(getMembershipStatus()).toBe("offline");
    expect(getSpaceError()).toContain("space_membership_remote_unavailable");
    expect(getAllMemberSpaces().map((s) => s.spaceId)).toEqual(["stale"]);
  });

  test("hydrate releases loading once local rows fill (stale-while-revalidate)", () => {
    let state = spaceReducer(undefined, { type: "unknown" });
    state = spaceReducer(
      state,
      (fetchUserSpaceMemberships as any).pending("req-h1", "user1") as any
    );
    expect(getSpaceLoading()).toBe(true);

    state = spaceReducer(
      state,
      hydrateMemberSpacesFromLocal([
        { userId: "user1", spaceId: "cached", spaceName: "Cached" } as any,
      ])
    );
    // 本地列表已可用：立刻停止转圈；远端校验仍在后台进行。
    expect(getAllMemberSpaces().map((s) => s.spaceId)).toEqual(["cached"]);
    expect(getSpaceLoading()).toBe(false);
    expect(getMembershipStatus()).toBe("loading");
  });

  test("hydrate keeps loading when it cannot fill (empty payload or existing rows)", () => {
    let state = spaceReducer(undefined, { type: "unknown" });
    state = spaceReducer(
      state,
      (fetchUserSpaceMemberships as any).pending("req-h2", "user1") as any
    );

    // 空 payload 不释放 loading
    state = spaceReducer(state, hydrateMemberSpacesFromLocal([]));
    expect(getSpaceLoading()).toBe(true);
    expect(getMemberSpaces()).toBeNull();

    // 已有列表时不覆盖
    state = spaceReducer(
      state,
      hydrateMemberSpacesFromLocal([
        { userId: "user1", spaceId: "first", spaceName: "First" } as any,
      ])
    );
    state = spaceReducer(
      state,
      hydrateMemberSpacesFromLocal([
        { userId: "user1", spaceId: "second", spaceName: "Second" } as any,
      ])
    );
    expect(getAllMemberSpaces().map((s) => s.spaceId)).toEqual(["first"]);
    expect(getSpaceLoading()).toBe(false);
  });

  test("fulfilled clears remote-unavailable error and marks fresh", () => {
    let state = spaceReducer(undefined, { type: "unknown" });
    state = {
      ...state,
      memberSpaces: [{ spaceId: "stale" } as any],
      error: "space_membership_remote_unavailable: previous",
      membershipStatus: "offline",
    };

    state = spaceReducer(
      state,
      (fetchUserSpaceMemberships as any).fulfilled(
        [{ spaceId: "fresh", spaceName: "Fresh" }],
        "req-2",
        "user1"
      ) as any
    );

    expect(getMembershipStatus()).toBe("fresh");
    expect(getSpaceError()).toBeUndefined();
    expect(getSpaceLoading()).toBe(false);
    expect(getMemberSpaces()).toEqual([
      { spaceId: "fresh", spaceName: "Fresh" },
    ] as any);
  });

  test("unrelated membership reject does not mark offline", () => {
    const initial = spaceReducer(undefined, { type: "unknown" });
    const state = spaceReducer(
      initial,
      (fetchUserSpaceMemberships as any).rejected(
        { name: "Error", message: "some other error" },
        "req-3",
        "user1"
      ) as any
    );

    expect(getMembershipStatus()).not.toBe("offline");
    expect(getSpaceError()).toContain("some other error");
  });

  test("resetSpace clears membership status so account switches cannot inherit it", () => {
    let state = spaceReducer(undefined, { type: "unknown" });
    state = spaceReducer(
      state,
      (fetchUserSpaceMemberships as any).pending("req-4", "user1") as any
    );
    expect(getMembershipStatus()).toBe("loading");

    state = spaceReducer(state, resetSpace());
    expect(getMembershipStatus()).toBe("idle");
    // Also resets the UI module store (Wave A).
    expect(getViewMode()).toBe("all");
    expect(getFavoritesCollapsed()).toBe(false);
  });

  test("getMembershipStatus returns idle on fresh module store state", () => {
    resetSpaceMembershipState();
    expect(getMembershipStatus()).toBe("idle");
  });
});

describe("spaceSlice deleteSpace", () => {
  test("switches to all view when the active space is deleted", () => {
    resetSpaceUiState();
    resetSpaceMembershipState();
    const { resetSpaceCurrentState, setCurrentSpaceBoth } = require("./spaceCurrentStore");
    resetSpaceCurrentState();
    setCollapsedCategories({ "cat-1": false }, "space-a");
    // Wave C: memberSpaces 在 module store，通过 setMemberSpaces 设置
    const { setMemberSpaces } = require("./spaceMembershipStore");
    setMemberSpaces([{ spaceId: "space-a" }, { spaceId: "space-b" }] as any);
    // Wave D: currentSpaceId 在 module store，通过 setCurrentSpaceBoth 设置
    setCurrentSpaceBoth("space-a", { id: "space-a", name: "Space A" } as any);
    const initialState = spaceReducer(undefined, { type: "unknown" });

    const nextState = spaceReducer(
      initialState,
      (deleteSpace as any).fulfilled(
        { spaceId: "space-a", strategy: "delete-space-only" },
        "delete-space-request",
        "space-a"
      ) as any
    );

    expect(getCurrentSpaceIdRaw()).toBeNull();
    expect(getCurrentSpaceRaw()).toBeNull();
    // Wave A: viewMode 已剥至 module store，通过 getter 断言。
    expect(getViewMode()).toBe("all");
    expect(getCollapsedCategories()).toEqual({});
    expect(getAllMemberSpaces().map((space) => space.spaceId)).toEqual(["space-b"]);
  });

  test("normalizes prefixed space ids when deleting the active space", () => {
    resetSpaceUiState();
    resetSpaceMembershipState();
    const { setMemberSpaces } = require("./spaceMembershipStore");
    setMemberSpaces([{ spaceId: "01SPACE" }, { spaceId: "space-b" }] as any);
    const { setCurrentSpaceBoth } = require("./spaceCurrentStore");
    setCurrentSpaceBoth("01SPACE", { id: "01SPACE", name: "Space A" } as any);
    const initialState = spaceReducer(undefined, { type: "unknown" });

    const nextState = spaceReducer(
      initialState,
      (deleteSpace as any).fulfilled(
        { spaceId: "space-01SPACE", strategy: "delete-space-only" },
        "delete-space-request",
        { spaceId: "space-01SPACE", strategy: "delete-space-only" }
      ) as any
    );

    expect(getCurrentSpaceIdRaw()).toBeNull();
    expect(getCurrentSpaceRaw()).toBeNull();
    expect(getViewMode()).toBe("all");
    expect(getAllMemberSpaces().map((space) => space.spaceId)).toEqual(["space-b"]);
  });
});

describe("spaceSlice dialog runtime indicators (Wave B: module store)", () => {
  test("tracks running status and unread completion state for dialogs", async () => {
    resetSpaceDialogState();
    let state = spaceReducer(
      undefined,
      applySpaceEvent({
        type: "dialog.created",
        dialogId: "dialog-1",
        dialogKey: "dialog-user-dialog-1",
        title: "Test dialog",
      })
    );

    // Wave B: dialog 实时状态在 module store，不在 Redux state。
    expect(getDialogStatus("dialog-1")).toBe("running");
    expect(getIsDialogUnread("dialog-1")).toBe(false);

    state = spaceReducer(
      state,
      applySpaceEvent({
        type: "dialog.done",
        dialogId: "dialog-1",
      })
    );

    expect(getDialogStatus("dialog-1")).toBe("done");
    expect(getDialogEventTimestamps()["dialog-1"]).toBeGreaterThan(0);
    expect(getDialogTitles()["dialog-1"]).toBe("Test dialog");
    expect(getIsDialogUnread("dialog-1")).toBe(true);

    // markDialogRead 为 asyncThunk：用真实 store 派发，清 module store 未读。
    // thunk 内 patch（清零持久化 unreadAt）在无 db 时会被吞掉，不影响内存态断言。
    const store = configureStore({
      reducer: { space: spaceReducer } as any,
      middleware: (getDefaultMiddleware: any) =>
        getDefaultMiddleware({ thunk: true, serializableCheck: false }),
    });
    // 先用同样的 event 流在 store 里种出未读态。
    store.dispatch(applySpaceEvent({
      type: "dialog.created",
      dialogId: "dialog-1",
      dialogKey: "dialog-user-dialog-1",
      title: "Test dialog",
    }));
    store.dispatch(applySpaceEvent({ type: "dialog.done", dialogId: "dialog-1" }));
    expect(getIsDialogUnread("dialog-1")).toBe(true);

    await store.dispatch(markDialogRead({ dialogId: "dialog-1" }) as any);
    expect(getIsDialogUnread("dialog-1")).toBe(false);
  });

  test("resetSpace clears dialog module store state", () => {
    resetSpaceDialogState();
    const store = configureStore({
      reducer: { space: spaceReducer } as any,
      middleware: (getDefaultMiddleware: any) =>
        getDefaultMiddleware({ thunk: true, serializableCheck: false }),
    });
    // 种出 dialog 状态
    store.dispatch(applySpaceEvent({
      type: "dialog.created",
      dialogId: "dialog-1",
      dialogKey: "dialog-user-dialog-1",
      title: "Test dialog",
    }));
    expect(getDialogStatus("dialog-1")).toBe("running");

    // resetSpace 应清 module store
    store.dispatch(resetSpace());
    expect(getDialogStatus("dialog-1")).toBeUndefined();
    expect(getUnreadDialogIds()).toEqual({});
  });
});

describe("spaceUiStore (Wave A module store)", () => {
  test("getViewMode defaults to all on fresh initial state", () => {
    resetSpaceUiState();
    expect(getViewMode()).toBe("all");
  });

  test("getFavoritesCollapsed defaults to false on fresh initial state", () => {
    resetSpaceUiState();
    expect(getFavoritesCollapsed()).toBe(false);
  });

  test("toggleFavoritesCollapse flips favoritesCollapsed in-memory", () => {
    resetSpaceUiState();
    expect(getFavoritesCollapsed()).toBe(false);
    toggleFavoritesCollapseUi();
    expect(getFavoritesCollapsed()).toBe(true);
    toggleFavoritesCollapseUi();
    expect(getFavoritesCollapsed()).toBe(false);
  });

  test("getIsCategoryCollapsed falls back to DEFAULT_COLLAPSED_CATEGORIES for unregistered ids", () => {
    resetSpaceUiState();
    setCollapsedCategories({ "explicit-false": false }, "space-1");
    // UNCATEGORIZED 在 DEFAULT_COLLAPSED_CATEGORIES 里是 false
    expect(getIsCategoryCollapsed(UNCATEGORIZED_ID)).toBe(false);
    // 普通分类未登记 → 回退到 true
    expect(getIsCategoryCollapsed("category-1")).toBe(true);
    // 显式登记 false 优先于默认
    expect(getIsCategoryCollapsed("explicit-false")).toBe(false);
  });

  test("setCollapsedCategories replaces the whole map", () => {
    resetSpaceUiState();
    setCollapsedCategories({ "cat-1": true, "cat-2": false }, "space-1");
    expect(getCollapsedCategories()).toEqual({ "cat-1": true, "cat-2": false });
    // 再次 set 应替换而非合并
    setCollapsedCategories({ "cat-3": true }, "space-1");
    expect(getCollapsedCategories()).toEqual({ "cat-3": true });
  });

  test("setAllCategoriesCollapsed uses thunk-built complete map (not just existing keys)", () => {
    // 模拟 setAllCategoriesCollapsed thunk 的行为：
    // thunk 构造包含所有 category ID 的完整 map，调 setCollapsedCategoriesUi 写入。
    resetSpaceUiState();
    // module store 初始为空（无已注册分类）
    expect(getCollapsedCategories()).toEqual({});
    // 模拟 thunk 构造的完整 map（cat-1, cat-2, UNCATEGORIZED_ID）
    const completeMap = {
      [UNCATEGORIZED_ID]: false,
      "cat-1": false,
      "cat-2": false,
    };
    setCollapsedCategories(completeMap, "space-1");
    // 验证所有分类都在（包括之前未注册的）
    expect(getIsCategoryCollapsed(UNCATEGORIZED_ID)).toBe(false);
    expect(getIsCategoryCollapsed("cat-1")).toBe(false);
    expect(getIsCategoryCollapsed("cat-2")).toBe(false);
  });

  test("setAllCategoriesCollapsed thunk dispatch writes complete map to module store", async () => {
    // 真实 dispatch setAllCategoriesCollapsed thunk，验证 thunk 构造的完整 map
    // 被写入 module store（包括之前未注册的分类）。
    resetSpaceUiState();
    const store = configureStore({
      reducer: { space: spaceReducer } as any,
      middleware: (getDefaultMiddleware: any) =>
        getDefaultMiddleware({ thunk: true, serializableCheck: false }),
    });
    // 设当前 space 有两个分类
    store.dispatch({
      type: "space/changeSpace/fulfilled",
      payload: {
        spaceId: "space-1",
        spaceData: { id: "space-1", categories: { "cat-1": {}, "cat-2": {} } },
        sidebarState: {},
      },
    });
    // Wave D: changeSpace fulfilled 不设 viewMode; 手动设为 categories 让 selectCurrentSpaceId 返回 spaceId
    store.dispatch(setViewMode("categories") as any);
    // module store 初始为空
    expect(getCollapsedCategories()).toEqual({});

    // dispatch setAllCategoriesCollapsed（展开所有）
    await store.dispatch(
      (setAllCategoriesCollapsed as any)({ spaceId: "space-1", collapsed: false })
    );
    // 验证所有分类都展开（包括之前未注册的 cat-1, cat-2）
    expect(getIsCategoryCollapsed(UNCATEGORIZED_ID)).toBe(false);
    expect(getIsCategoryCollapsed("cat-1")).toBe(false);
    expect(getIsCategoryCollapsed("cat-2")).toBe(false);
  });

  test("resetSpaceUiState resets to defaults and clears localStorage (not reads it back)", () => {
    resetSpaceUiState();
    // 先设非默认值（通过 module store mutator 直接设）
    toggleFavoritesCollapseUi();
    expect(getFavoritesCollapsed()).toBe(true);
    // reset 应回到纯默认值，不从 localStorage 读
    resetSpaceUiState();
    expect(getViewMode()).toBe("all");
    expect(getFavoritesCollapsed()).toBe(false);
    expect(getCollapsedCategories()).toEqual({});
  });
});

describe("Wave D: viewMode current space store 一致性", () => {
  test("setViewMode dispatch 同步写 module store", () => {
    resetSpaceUiState();
    const { resetSpaceCurrentState } = require("./spaceCurrentStore");
    resetSpaceCurrentState();
    const store = configureStore({
      reducer: { space: spaceReducer } as any,
      middleware: (getDefaultMiddleware: any) =>
        getDefaultMiddleware({ thunk: true, serializableCheck: false }),
    });
    // 初始都应是 "all"
    expect(getViewMode()).toBe("all");

    // dispatch setViewMode("categories")
    store.dispatch(setViewMode("categories") as any);
    expect(getViewMode()).toBe("categories");
  });

  test("selectCurrentSpaceId 在 setViewMode 后从 null 变为 currentSpaceId", () => {
    resetSpaceUiState();
    const { resetSpaceCurrentState, setCurrentSpaceBoth, setViewMode: setViewModeDirect } = require("./spaceCurrentStore");
    resetSpaceCurrentState();
    // 设 currentSpaceId 但 viewMode="all" → getCurrentSpaceId 返回 null
    setCurrentSpaceBoth("space-1", { id: "space-1" } as any);
    // viewMode 还是 "all" → getCurrentSpaceId 返回 null
    expect(getViewMode()).toBe("all");
    // 切到 categories → getCurrentSpaceId 返回 "space-1"
    setViewModeDirect("categories");
    const { getCurrentSpaceId } = require("./spaceCurrentStore");
    expect(getCurrentSpaceId()).toBe("space-1");
  });

  test("resetSpace 同步重置 module store", () => {
    resetSpaceUiState();
    const { resetSpaceCurrentState } = require("./spaceCurrentStore");
    resetSpaceCurrentState();
    const store = configureStore({
      reducer: { space: spaceReducer } as any,
      middleware: (getDefaultMiddleware: any) =>
        getDefaultMiddleware({ thunk: true, serializableCheck: false }),
    });
    // 先设非默认值
    store.dispatch(setViewMode("categories") as any);
    expect(getViewMode()).toBe("categories");

    // resetSpace 应同步重置
    store.dispatch(resetSpace());
    expect(getViewMode()).toBe("all");
    expect(getFavoritesCollapsed()).toBe(false);
    expect(getCollapsedCategories()).toEqual({});
  });

  test("deleteSpace fulfilled 同步重置 module store", () => {
    resetSpaceUiState();
    const { resetSpaceCurrentState, setCurrentSpaceBoth } = require("./spaceCurrentStore");
    resetSpaceCurrentState();
    const store = configureStore({
      reducer: { space: spaceReducer } as any,
      middleware: (getDefaultMiddleware: any) =>
        getDefaultMiddleware({ thunk: true, serializableCheck: false }),
    });
    // 先设非默认值 + 设当前 space 为 space-a
    store.dispatch(setViewMode("categories") as any);
    setCurrentSpaceBoth("space-a", { id: "space-a" } as any);
    setCollapsedCategories({ "cat-1": false }, "space-a");
    expect(getViewMode()).toBe("categories");
    expect(getCollapsedCategories()).toEqual({ "cat-1": false });

    // 模拟 deleteSpace fulfilled（删除当前 space space-a）
    store.dispatch(
      (deleteSpace as any).fulfilled(
        { spaceId: "space-a", strategy: "delete-space-only" },
        "req-1",
        "space-a"
      ) as any
    );
    expect(getViewMode()).toBe("all");
    expect(getCollapsedCategories()).toEqual({});
  });
});

describe("appendRecoveredMemberships", () => {
  test("initializes memberSpaces when null (cold list after resetSpace)", () => {
    const base = spaceReducer(undefined, { type: "unknown" });
    const state = spaceReducer(
      base,
      appendRecoveredMemberships([
        { userId: "u", spaceId: "rec", spaceName: "Rec", role: "member" } as any,
      ])
    );
    expect(getAllMemberSpaces().map((s) => s.spaceId)).toEqual(["rec"]);
  });

  test("unions and dedupes by spaceId via dedupeMemberSpacesById", () => {
    const base = spaceReducer(
      undefined,
      hydrateMemberSpacesFromLocal([
        { userId: "u", spaceId: "old", spaceName: "Old", role: "member" } as any,
        { userId: "u", spaceId: "keep", spaceName: "Keep", role: "member" } as any,
      ])
    );
    const state = spaceReducer(
      base,
      appendRecoveredMemberships([
        { userId: "u", spaceId: "keep", spaceName: "Keep New", role: "member" } as any,
        { userId: "u", spaceId: "new", spaceName: "New", role: "member" } as any,
      ])
    );
    const ids = getAllMemberSpaces().map((s) => s.spaceId);
    expect(ids?.sort()).toEqual(["keep", "new", "old"]);
    expect(getAllMemberSpaces().length).toBe(3);
  });

  test("sorts by joinedAt desc, tolerating ISO string dates (NaN-safe)", () => {
    const base = spaceReducer(
      undefined,
      hydrateMemberSpacesFromLocal([
      { userId: "u", spaceId: "old", spaceName: "Old", role: "member", joinedAt: "2026-01-01T00:00:00.000Z" } as any,
      { userId: "u", spaceId: "mid", spaceName: "Mid", role: "member", joinedAt: 1736000000000 } as any,
      { userId: "u", spaceId: "new", spaceName: "New", role: "member", joinedAt: "2026-06-01T00:00:00.000Z" } as any,
      ])
    );
    const state = spaceReducer(
      base,
      appendRecoveredMemberships([
        { userId: "u", spaceId: "rec-iso", spaceName: "Rec ISO", role: "member", joinedAt: "2026-03-01T00:00:00.000Z" } as any,
      ])
    );
    // ISO strings must not produce NaN; order is by parsed timestamp desc.
    // 2026-06 (new) > 2026-03 (rec-iso) > 2026-01 (old, ISO) > mid (epoch ms, oldest)
    const ids = getAllMemberSpaces().map((s) => s.spaceId);
    expect(ids?.indexOf("new")).toBeLessThanOrEqual(1);
    expect(ids?.indexOf("rec-iso")).toBeGreaterThan(ids?.indexOf("new") ?? 0);
    // No NaN corruption: all entries present and ordered, no undefined slots
    expect(getAllMemberSpaces().length).toBe(4);
  });

  test("empty payload is a no-op", () => {
    const base = spaceReducer(
      undefined,
      hydrateMemberSpacesFromLocal([
        { userId: "u", spaceId: "keep", spaceName: "Keep", role: "member" } as any,
      ])
    );
    const state = spaceReducer(base, appendRecoveredMemberships([]));
    expect(getAllMemberSpaces().map((s) => s.spaceId)).toEqual(["keep"]);
  });
});
// Wave D: currentSpaceId/currentSpace 已剥至 module store。
import {
  getViewMode as getViewModeCurrent,
  getCurrentSpaceIdRaw,
  getCurrentSpaceRaw,
  resetSpaceCurrentState,
} from "./spaceCurrentStore";
// getViewMode from spaceUiStore is the same as spaceCurrentStore (Wave D migrated viewMode).
// Use spaceCurrentStore as source of truth.
const getViewMode = getViewModeCurrent;
