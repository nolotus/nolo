// Wave E: spaceSlice 已删除。原测试 dispatch 手工构造的 `.fulfilled` action 来触发
// case reducer；副作用现在内联在 thunk 的 payload creator 里，合成 action 不再有效果。
// 因此改为 mock 底层 action、真实 dispatch thunk，端到端验证同一条
// "payload.spaceId 与 currentSpaceId 仅前缀不同时仍要同步 currentSpace" 的归一化契约。
import { configureStore } from "@reduxjs/toolkit";
import { afterAll, describe, expect, test, mock } from "bun:test";

const updatedSpaceDataForDelete = {
  id: "01SPACE",
  contents: {},
  updatedAt: 2,
};

const updatedSpaceDataForDeleteMultiple = {
  id: "01SPACE",
  contents: {},
  updatedAt: 2,
};

const realDeleteContentFromSpaceAction = {
  ...(await import("create/space/content/deleteContentFromSpaceAction")),
};
const realDeleteMultipleContentAction = {
  ...(await import("create/space/content/deleteMultipleContentAction")),
};

afterAll(() => {
  mock.module(
    "create/space/content/deleteContentFromSpaceAction",
    () => realDeleteContentFromSpaceAction,
  );
  mock.module(
    "create/space/content/deleteMultipleContentAction",
    () => realDeleteMultipleContentAction,
  );
});

mock.module("create/space/content/deleteContentFromSpaceAction", () => ({
  deleteContentFromSpaceAction: async (arg: any) => ({
    contentKey: arg.contentKey,
    spaceId: arg.spaceId,
    updatedSpaceData: updatedSpaceDataForDelete,
  }),
}));

mock.module("create/space/content/deleteMultipleContentAction", () => ({
  deleteMultipleContentAction: async (arg: any) => ({
    spaceId: arg.spaceId,
    updatedSpaceData: updatedSpaceDataForDeleteMultiple,
  }),
}));

const { deleteContentFromSpace, deleteMultipleContent } =
  await import("./contentThunks");
const { setCurrentSpaceBoth, getCurrentSpaceRaw, resetSpaceCurrentState } =
  await import("../spaceCurrentStore");

const makeStore = () =>
  configureStore({
    reducer: { noop: (s: any = {}) => s } as any,
    middleware: (gdm: any) => gdm({ thunk: true, serializableCheck: false }),
  });

describe("deleteContentFromSpace", () => {
  test("updates currentSpace when payload and state space ids differ only by prefix", async () => {
    resetSpaceCurrentState();
    setCurrentSpaceBoth("01SPACE", {
      id: "01SPACE",
      contents: {
        "agent-user-1-01AGENT": {
          title: "Agent",
          type: "agent",
          contentKey: "agent-user-1-01AGENT",
          createdAt: 1,
          updatedAt: 1,
        },
      },
    } as any);

    await makeStore().dispatch(
      deleteContentFromSpace({
        contentKey: "agent-user-1-01AGENT",
        spaceId: "space-01SPACE",
      }) as any,
    );

    expect(getCurrentSpaceRaw()).toEqual(updatedSpaceDataForDelete as any);
  });
});

describe("deleteMultipleContent", () => {
  test("updates currentSpace when payload and state space ids differ only by prefix", async () => {
    resetSpaceCurrentState();
    setCurrentSpaceBoth("01SPACE", {
      id: "01SPACE",
      contents: {
        "page-user-1-01PAGE": {
          title: "Page",
          type: "page",
          contentKey: "page-user-1-01PAGE",
          createdAt: 1,
          updatedAt: 1,
        },
      },
    } as any);

    await makeStore().dispatch(
      deleteMultipleContent({
        contentKeys: ["page-user-1-01PAGE"],
        spaceId: "space-01SPACE",
      }) as any,
    );

    expect(getCurrentSpaceRaw()).toEqual(
      updatedSpaceDataForDeleteMultiple as any,
    );
  });
});
