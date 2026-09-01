// Wave E: 从 spaceSlice.runtime.test.ts 迁入 deleteSpace 相关用例。
// 原测试 dispatch 手工构造的 deleteSpace.fulfilled action 触发 case reducer；
// 现在副作用内联在 thunk 内，因此改为 mock deleteSpaceAction 后真实 dispatch thunk，
// 端到端验证同一批 module store 写入。
import { configureStore } from "@reduxjs/toolkit";
import { afterAll, describe, expect, test, beforeEach, mock } from "bun:test";
import { readFileSync } from "node:fs";

const realDeleteSpaceAction = {
  ...(await import("create/space/deleteSpaceAction")),
};

afterAll(() => {
  mock.module("create/space/deleteSpaceAction", () => realDeleteSpaceAction);
});

mock.module("create/space/deleteSpaceAction", () => ({
  deleteSpaceAction: async (arg: any) => ({
    spaceId: arg.spaceId,
    strategy: "delete-space-only",
  }),
}));

const { deleteSpace } = await import("./spaceThunks");
const {
  getCurrentSpaceIdRaw,
  getCurrentSpaceRaw,
  getViewMode,
  setCurrentSpaceBoth,
  setViewMode,
  resetSpaceCurrentState,
} = await import("./spaceCurrentStore");
const { getAllMemberSpaces, setMemberSpaces, resetSpaceMembershipState } =
  await import("./spaceMembershipStore");
const { getCollapsedCategories, setCollapsedCategories, resetSpaceUiState } =
  await import("./spaceUiStore");

const makeStore = () =>
  configureStore({
    reducer: { noop: (s: any = {}) => s } as any,
    middleware: (gdm: any) => gdm({ thunk: true, serializableCheck: false }),
  });

beforeEach(() => {
  resetSpaceUiState();
  resetSpaceMembershipState();
  resetSpaceCurrentState();
});

describe("deleteSpace", () => {
  test("switches to all view when the active space is deleted", async () => {
    setCollapsedCategories({ "cat-1": false }, "space-a");
    setMemberSpaces([{ spaceId: "space-a" }, { spaceId: "space-b" }] as any);
    setCurrentSpaceBoth("space-a", { id: "space-a", name: "Space A" } as any);

    await makeStore().dispatch(
      deleteSpace({ spaceId: "space-a", strategy: "delete-space-only" }) as any,
    );

    expect(getCurrentSpaceIdRaw()).toBeNull();
    expect(getCurrentSpaceRaw()).toBeNull();
    expect(getViewMode()).toBe("all");
    expect(getAllMemberSpaces().map((space) => space.spaceId)).toEqual([
      "space-b",
    ]);
  });

  test("normalizes prefixed space ids when deleting the active space", async () => {
    setMemberSpaces([{ spaceId: "01SPACE" }, { spaceId: "space-b" }] as any);
    setCurrentSpaceBoth("01SPACE", { id: "01SPACE", name: "Space A" } as any);

    await makeStore().dispatch(
      deleteSpace({
        spaceId: "space-01SPACE",
        strategy: "delete-space-only",
      }) as any,
    );

    expect(getCurrentSpaceIdRaw()).toBeNull();
    expect(getCurrentSpaceRaw()).toBeNull();
    expect(getViewMode()).toBe("all");
    expect(getAllMemberSpaces().map((space) => space.spaceId)).toEqual([
      "space-b",
    ]);
  });

  test("deleteSpace 同步重置 module store（viewMode + collapsedCategories）", async () => {
    setViewMode("categories");
    setCurrentSpaceBoth("space-a", { id: "space-a" } as any);
    setCollapsedCategories({ "cat-1": false }, "space-a");
    expect(getViewMode()).toBe("categories");
    expect(getCollapsedCategories()).toEqual({ "cat-1": false });

    await makeStore().dispatch(
      deleteSpace({ spaceId: "space-a", strategy: "delete-space-only" }) as any,
    );

    expect(getViewMode()).toBe("all");
    expect(getCollapsedCategories()).toEqual({});
  });
});

describe("space thunk typePrefix 稳定性（跨模块调用点按字符串断言）", () => {
  // Wave E: 用源码断言而非运行时 import。24 个 thunk 分布在 4 个模块，
  // 运行时全量 import 会拉进 app/reducer 等仍引用已删除 spaceSlice 的包外文件
  // （T1 边界不允许改），源码断言可稳定守住 typePrefix 契约。
  const read = (rel: string) =>
    readFileSync(new URL(rel, import.meta.url), "utf8");

  const expected: Record<string, string[]> = {
    "./spaceThunks.ts": [
      "space/fetchSpaceSidebarState",
      "space/changeSpace",
      "space/addSpace",
      "space/deleteSpace",
      "space/updateSpace",
      "space/fetchSpace",
    ],
    "./category/categoryActions.ts": [
      "space/setAllCategoriesCollapsed",
      "space/toggleCategoryCollapse",
      "space/addCategory",
      "space/deleteCategory",
      "space/updateCategoryName",
      "space/reorderCategories",
    ],
    "./content/contentThunks.ts": [
      "space/addContentToSpace",
      "space/moveContentToSpace",
      "space/deleteContentFromSpace",
      "space/deleteMultipleContent",
      "space/uploadAndAddFileToSpace",
      "space/updateContentTitle",
      "space/updateContentPinned",
      "space/updateContentCategory",
    ],
    "./member/memberThunks.ts": [
      "space/fetchUserSpaceMemberships",
      "space/addMember",
      "space/removeMember",
    ],
    "./markDialogReadThunk.ts": ["space/markDialogRead"],
  };

  test("24 个 thunk 的 typePrefix 与原 spaceSlice 完全一致", () => {
    let total = 0;
    for (const [file, prefixes] of Object.entries(expected)) {
      const source = read(file);
      for (const prefix of prefixes) {
        expect(source).toContain(`"${prefix}"`);
        total += 1;
      }
    }
    expect(total).toBe(24);
  });

  test("每个 thunk 都由 createAsyncThunk 顶层导出（不再是 slice 工厂）", () => {
    for (const file of Object.keys(expected)) {
      const source = read(file);
      expect(source).toContain("createAsyncThunk");
      expect(source).not.toContain("create.asyncThunk");
    }
  });
});
