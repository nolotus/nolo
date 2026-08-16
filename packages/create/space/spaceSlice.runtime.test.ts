import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, test } from "bun:test";

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
  selectFavoritesCollapsed,
  selectIsCategoryCollapsed,
  selectDialogEventTimestamps,
  selectDialogStatuses,
  selectDialogTitles,
  selectMembershipStatus,
  selectUnreadDialogIds,
  toggleCategoryCollapse,
  toggleFavoritesCollapse,
} from "./spaceSlice";
import { UNCATEGORIZED_ID } from "./constants";

describe("spaceSlice membership status", () => {
  test("pending keeps cached rows; offline reject preserves them and marks offline", () => {
    const initial = spaceReducer(undefined, { type: "unknown" });
    expect(initial.membershipStatus).toBe("idle");

    let state = spaceReducer(
      initial,
      (fetchUserSpaceMemberships as any).pending("req-1", "user1") as any
    );
    expect(state.loading).toBe(true);
    expect(state.membershipStatus).toBe("loading");
    expect(state.memberSpaces).toBeNull();

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
    expect(state.memberSpaces?.map((s) => s.spaceId)).toEqual(["stale"]);
    expect(state.membershipStatus).toBe("loading");

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

    expect(state.loading).toBe(false);
    expect(state.membershipStatus).toBe("offline");
    expect(state.error).toContain("space_membership_remote_unavailable");
    expect(state.memberSpaces?.map((s) => s.spaceId)).toEqual(["stale"]);
  });

  test("hydrate releases loading once local rows fill (stale-while-revalidate)", () => {
    let state = spaceReducer(undefined, { type: "unknown" });
    state = spaceReducer(
      state,
      (fetchUserSpaceMemberships as any).pending("req-h1", "user1") as any
    );
    expect(state.loading).toBe(true);

    state = spaceReducer(
      state,
      hydrateMemberSpacesFromLocal([
        { userId: "user1", spaceId: "cached", spaceName: "Cached" } as any,
      ])
    );
    // 本地列表已可用：立刻停止转圈；远端校验仍在后台进行。
    expect(state.memberSpaces?.map((s) => s.spaceId)).toEqual(["cached"]);
    expect(state.loading).toBe(false);
    expect(state.membershipStatus).toBe("loading");
  });

  test("hydrate keeps loading when it cannot fill (empty payload or existing rows)", () => {
    let state = spaceReducer(undefined, { type: "unknown" });
    state = spaceReducer(
      state,
      (fetchUserSpaceMemberships as any).pending("req-h2", "user1") as any
    );

    // 空载荷：没有本地缓存可展示，loading 必须保持。
    state = spaceReducer(state, hydrateMemberSpacesFromLocal([]));
    expect(state.memberSpaces).toBeNull();
    expect(state.loading).toBe(true);

    // 已有 memberSpaces：hydrate 早退，不得解除 changeSpace 等场景的 loading。
    state = {
      ...state,
      memberSpaces: [{ spaceId: "existing" } as any],
    };
    state = spaceReducer(
      state,
      hydrateMemberSpacesFromLocal([
        { userId: "user1", spaceId: "cached", spaceName: "Cached" } as any,
      ])
    );
    expect(state.memberSpaces?.map((s) => s.spaceId)).toEqual(["existing"]);
    expect(state.loading).toBe(true);
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

    expect(state.membershipStatus).toBe("fresh");
    expect(state.error).toBeUndefined();
    expect(state.loading).toBe(false);
    expect(state.memberSpaces).toEqual([
      { spaceId: "fresh", spaceName: "Fresh" },
    ] as any);
  });

  test("unrelated membership reject does not mark offline", () => {
    let state = spaceReducer(undefined, { type: "unknown" });
    state = spaceReducer(
      state,
      (fetchUserSpaceMemberships as any).pending("req-3", "user1") as any
    );
    state = spaceReducer(
      state,
      (fetchUserSpaceMemberships as any).rejected(
        { name: "Error", message: "something else failed" },
        "req-3",
        "user1"
      ) as any
    );

    expect(state.membershipStatus).toBe("idle");
    expect(state.error).toBe("something else failed");
  });

  test("resetSpace clears membership status so account switches cannot inherit it", () => {
    let state = spaceReducer(undefined, { type: "unknown" });
    state = {
      ...state,
      memberSpaces: [{ spaceId: "a" } as any],
      membershipStatus: "offline",
      error: "space_membership_remote_unavailable: x",
      loading: true,
    };

    state = spaceReducer(state, resetSpace());

    expect(state.memberSpaces).toBeNull();
    expect(state.membershipStatus).toBe("idle");
    expect(state.error).toBeUndefined();
    expect(state.loading).toBe(false);
    expect(selectMembershipStatus({ space: state } as any)).toBe("idle");
  });

  test("selectMembershipStatus tolerates legacy state without the field", () => {
    expect(
      selectMembershipStatus({
        space: {
          currentSpaceId: null,
          currentSpace: null,
          memberSpaces: null,
          loading: false,
          initialized: true,
          collapsedCategories: {},
        },
      } as any)
    ).toBe("idle");
  });
});

describe("spaceSlice deleteSpace", () => {
  test("switches to all view when the active space is deleted", () => {
    const initialState = spaceReducer(undefined, { type: "unknown" });
    const withActiveSpace = {
      ...initialState,
      currentSpaceId: "space-a",
      currentSpace: { id: "space-a", name: "Space A" } as any,
      viewMode: "categories" as const,
      memberSpaces: [{ spaceId: "space-a" }, { spaceId: "space-b" }] as any,
    };

    const nextState = spaceReducer(
      withActiveSpace,
      (deleteSpace as any).fulfilled(
        { spaceId: "space-a", strategy: "delete-space-only" },
        "delete-space-request",
        "space-a"
      ) as any
    );

    expect(nextState.currentSpaceId).toBeNull();
    expect(nextState.currentSpace).toBeNull();
    expect(nextState.viewMode).toBe("all");
    expect(nextState.memberSpaces?.map((space) => space.spaceId)).toEqual(["space-b"]);
  });

  test("normalizes prefixed space ids when deleting the active space", () => {
    const initialState = spaceReducer(undefined, { type: "unknown" });
    const withActiveSpace = {
      ...initialState,
      currentSpaceId: "01SPACE",
      currentSpace: { id: "01SPACE", name: "Space A" } as any,
      viewMode: "categories" as const,
      memberSpaces: [{ spaceId: "01SPACE" }, { spaceId: "space-b" }] as any,
    };

    const nextState = spaceReducer(
      withActiveSpace,
      (deleteSpace as any).fulfilled(
        { spaceId: "space-01SPACE", strategy: "delete-space-only" },
        "delete-space-request",
        { spaceId: "space-01SPACE", strategy: "delete-space-only" }
      ) as any
    );

    expect(nextState.currentSpaceId).toBeNull();
    expect(nextState.currentSpace).toBeNull();
    expect(nextState.viewMode).toBe("all");
    expect(nextState.memberSpaces?.map((space) => space.spaceId)).toEqual(["space-b"]);
  });
});

describe("spaceSlice favorites collapse", () => {
  test("selectFavoritesCollapsed defaults to false on fresh initial state", () => {
    const state = {
      space: spaceReducer(undefined, { type: "unknown" }),
    } as any;
    expect(selectFavoritesCollapsed(state)).toBe(false);
  });

  test("selectFavoritesCollapsed tolerates legacy state without the field", () => {
    // 旧持久化 state 可能没有 favoritesCollapsed 字段——selector 必须兜底为 false
    const legacyState = { space: { viewMode: "all" } } as any;
    expect(selectFavoritesCollapsed(legacyState)).toBe(false);
  });

  test("toggleFavoritesCollapse flips favoritesCollapsed in-memory", () => {
    let state = spaceReducer(undefined, { type: "unknown" });
    expect(state.favoritesCollapsed).toBe(false);
    state = spaceReducer(state, toggleFavoritesCollapse());
    expect(state.favoritesCollapsed).toBe(true);
    state = spaceReducer(state, toggleFavoritesCollapse());
    expect(state.favoritesCollapsed).toBe(false);
  });

  test("resetSpace restores favoritesCollapsed from storage (re-reads default)", () => {
    let state = spaceReducer(undefined, { type: "unknown" });
    state = spaceReducer(state, toggleFavoritesCollapse());
    expect(state.favoritesCollapsed).toBe(true);
    state = spaceReducer(state, resetSpace());
    // resetSpace 重新读 localStorage；测试环境无显式写入时默认 false
    expect(state.favoritesCollapsed).toBe(false);
  });
});

describe("spaceSlice dialog runtime indicators", () => {
  test("tracks running status and unread completion state for dialogs", async () => {
    let state = spaceReducer(
      undefined,
      applySpaceEvent({
        type: "dialog.created",
        dialogId: "dialog-1",
        dialogKey: "dialog-user-dialog-1",
        title: "Test dialog",
      })
    );

    expect(state.dialogStatuses["dialog-1"]).toBe("running");
    expect(state.unreadDialogIds["dialog-1"]).toBeUndefined();

    state = spaceReducer(
      state,
      applySpaceEvent({
        type: "dialog.done",
        dialogId: "dialog-1",
      })
    );

    expect(state.dialogStatuses["dialog-1"]).toBe("done");
    expect(state.dialogEventTimestamps["dialog-1"]).toBeGreaterThan(0);
    expect(state.dialogTitles["dialog-1"]).toBe("Test dialog");
    expect(state.unreadDialogIds["dialog-1"]).toBe(true);

    // markDialogRead 为 asyncThunk：用真实 store 派发，fulfilled reducer 清内存态未读。
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
    expect((store.getState() as any).space.unreadDialogIds["dialog-1"]).toBe(true);

    await store.dispatch(markDialogRead({ dialogId: "dialog-1" }) as any);
    expect((store.getState() as any).space.unreadDialogIds["dialog-1"]).toBeUndefined();
  });

  test("selectors tolerate legacy persisted space state without new runtime fields", () => {
    const legacyState = {
      space: {
        currentSpaceId: "space-1",
        currentSpace: null,
        memberSpaces: null,
        loading: false,
        initialized: true,
        collapsedCategories: {},
      },
    } as any;

    expect(selectDialogStatuses(legacyState)).toEqual({});
    expect(selectDialogEventTimestamps(legacyState)).toEqual({});
    expect(selectDialogTitles(legacyState)).toEqual({});
    expect(selectUnreadDialogIds(legacyState)).toEqual({});
  });

  test("selectIsCategoryCollapsed falls back to DEFAULT_COLLAPSED_CATEGORIES for unregistered ids", () => {
    const state = {
      space: {
        ...spaceReducer(undefined, { type: "unknown" }),
        collapsedCategories: { "explicit-false": false },
      },
    } as any;

    // UNCATEGORIZED 在 DEFAULT_COLLAPSED_CATEGORIES 里是 false
    expect(selectIsCategoryCollapsed(UNCATEGORIZED_ID)(state)).toBe(false);
    // 普通分类未登记 → 回退到 true
    expect(selectIsCategoryCollapsed("category-1")(state)).toBe(true);
    // 显式登记 false 优先于默认
    expect(selectIsCategoryCollapsed("explicit-false")(state)).toBe(false);
  });

  test("addCategory.fulfilled seeds collapsedCategories for the new category", async () => {
    const baseSpaceState = spaceReducer(undefined, { type: "unknown" });
    const store = configureStore({
      reducer: { space: spaceReducer },
      preloadedState: {
        space: {
          ...baseSpaceState,
          currentSpaceId: "space-1",
          currentSpace: {
            spaceId: "space-1",
            name: "Test",
            ownerId: "user-1",
            members: {},
            categories: {},
            updatedAt: new Date().toISOString(),
          } as any,
        },
      },
    });

    const newCategoryId = "cat-new";
    store.dispatch(
      (addCategory as any).fulfilled(
        {
          spaceId: "space-1",
          updatedSpaceData: {
            spaceId: "space-1",
            name: "Test",
            ownerId: "user-1",
            members: {},
            categories: {
              [newCategoryId]: {
                name: "新分类",
                order: 0,
                updatedAt: new Date().toISOString(),
              },
            },
            updatedAt: new Date().toISOString(),
          } as any,
          newCategoryId,
          collapsedCategories: { [newCategoryId]: false },
        },
        "test-req-1",
        { spaceId: "space-1", name: "新分类", categoryId: newCategoryId }
      ) as any
    );

    expect(store.getState().space.collapsedCategories[newCategoryId]).toBe(false);
  });

  test("addContentToSpace.fulfilled expands the target category so new pages stay visible", () => {
    const baseSpaceState = spaceReducer(undefined, { type: "unknown" });
    const store = configureStore({
      reducer: { space: spaceReducer },
      preloadedState: {
        space: {
          ...baseSpaceState,
          currentSpaceId: "space-1",
          // Simulate never-toggled / default-collapsed category
          collapsedCategories: {},
          currentSpace: {
            spaceId: "space-1",
            name: "Test",
            ownerId: "user-1",
            members: {},
            categories: {
              "cat-1": { name: "笔记", order: 0, updatedAt: new Date().toISOString() },
            },
            contents: {},
            updatedAt: new Date().toISOString(),
          } as any,
        },
      },
    });

    expect(selectIsCategoryCollapsed("cat-1")(store.getState() as any)).toBe(true);

    store.dispatch(
      (addContentToSpace as any).fulfilled(
        {
          spaceId: "space-1",
          updatedSpaceData: {
            spaceId: "space-1",
            name: "Test",
            ownerId: "user-1",
            members: {},
            categories: {
              "cat-1": { name: "笔记", order: 0, updatedAt: new Date().toISOString() },
            },
            contents: {
              "page-1": {
                title: "新页面",
                type: "doc",
                contentKey: "page-1",
                categoryId: "cat-1",
                createdAt: Date.now(),
                updatedAt: Date.now(),
              },
            },
            updatedAt: new Date().toISOString(),
          } as any,
          expandCategoryId: "cat-1",
          collapsedCategories: { "cat-1": false },
        },
        "test-add-content",
        {
          spaceId: "space-1",
          title: "新页面",
          type: "doc",
          contentKey: "page-1",
          categoryId: "cat-1",
        }
      ) as any
    );

    expect(store.getState().space.collapsedCategories["cat-1"]).toBe(false);
    expect(selectIsCategoryCollapsed("cat-1")(store.getState() as any)).toBe(false);
  });

  test("toggleCategoryCollapse on an explicitly-expanded category collapses it", async () => {
    const baseSpaceState = spaceReducer(undefined, { type: "unknown" });
    const store = configureStore({
      reducer: { space: spaceReducer },
      preloadedState: {
        space: {
          ...baseSpaceState,
          currentSpaceId: "space-1",
          collapsedCategories: { "category-1": false },
        },
      },
    });

    store.dispatch(
      (toggleCategoryCollapse as any).fulfilled(
        { "category-1": true },
        "test-req-toggle",
        { categoryId: "category-1" }
      ) as any
    );

    expect(store.getState().space.collapsedCategories["category-1"]).toBe(true);
  });

  test("first collapse toggle expands regular categories and collapses uncategorized", async () => {
    const baseSpaceState = spaceReducer(undefined, { type: "unknown" });
    const store = configureStore({
      reducer: { space: spaceReducer },
      preloadedState: {
        space: {
          ...baseSpaceState,
          currentSpaceId: "space-1",
        },
      },
    });

    store.dispatch(
      (toggleCategoryCollapse as any).fulfilled(
        { "category-1": false },
        "test-request-1",
        { categoryId: "category-1" }
      ) as any
    );
    expect(store.getState().space.collapsedCategories["category-1"]).toBe(false);

    store.dispatch(
      (toggleCategoryCollapse as any).fulfilled(
        { [UNCATEGORIZED_ID]: true },
        "test-request-2",
        { categoryId: UNCATEGORIZED_ID }
      ) as any
    );
    expect(store.getState().space.collapsedCategories[UNCATEGORIZED_ID]).toBe(true);
  });
});

describe("appendRecoveredMemberships reducer", () => {
  test("initializes memberSpaces when null (cold list after resetSpace)", () => {
    const initial = spaceReducer(undefined, { type: "unknown" });
    expect(initial.memberSpaces).toBeNull();

    const state = spaceReducer(
      initial,
      appendRecoveredMemberships([
        { userId: "u", spaceId: "rec-1", spaceName: "Rec 1", role: "member" } as any,
      ])
    );
    expect(state.memberSpaces?.map((s) => s.spaceId)).toEqual(["rec-1"]);
  });

  test("unions and dedupes by spaceId via dedupeMemberSpacesById", () => {
    const base = spaceReducer(
      undefined,
      hydrateMemberSpacesFromLocal([
        { userId: "u", spaceId: "existing", spaceName: "Existing", role: "member" } as any,
      ])
    );
    // payload with a duplicate spaceId must not double-push
    const state = spaceReducer(
      base,
      appendRecoveredMemberships([
        { userId: "u", spaceId: "existing", spaceName: "Existing dup", role: "member" } as any,
        { userId: "u", spaceId: "new-rec", spaceName: "New Rec", role: "member" } as any,
      ])
    );
    const ids = state.memberSpaces?.map((s) => s.spaceId);
    expect(ids).toContain("existing");
    expect(ids).toContain("new-rec");
    // No duplicate entries despite payload containing "existing"
    expect(ids?.filter((id) => id === "existing").length).toBe(1);
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
    const ids = state.memberSpaces?.map((s) => s.spaceId);
    expect(ids?.indexOf("new")).toBeLessThanOrEqual(1);
    expect(ids?.indexOf("rec-iso")).toBeGreaterThan(ids?.indexOf("new") ?? 0);
    // No NaN corruption: all entries present and ordered, no undefined slots
    expect(state.memberSpaces?.length).toBe(4);
  });

  test("empty payload is a no-op", () => {
    const base = spaceReducer(
      undefined,
      hydrateMemberSpacesFromLocal([
        { userId: "u", spaceId: "keep", spaceName: "Keep", role: "member" } as any,
      ])
    );
    const state = spaceReducer(base, appendRecoveredMemberships([]));
    expect(state.memberSpaces?.map((s) => s.spaceId)).toEqual(["keep"]);
  });
});
