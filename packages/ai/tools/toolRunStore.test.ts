import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

// Value-copy snapshot — incomplete spaceSlice mocks poison sibling suites
// (fetchUserSpaceMemberships.pending) and later files that spread live modules.
const realSpaceSlice = { ...(await import("create/space/spaceSlice")) };

const executorMock = mock();
const fetchUserSpaceMembershipsMock = mock((userId: string) => ({
  type: "space/fetchUserSpaceMemberships",
  payload: userId,
}));

let moduleVersion = 0;

const restoreLeakedModuleMocks = () => {
  mock.module("create/space/spaceSlice", () => realSpaceSlice);
};

async function loadToolRunStore() {
  mock.module(".", () => ({
    findToolExecutor: () => ({
      executor: executorMock,
    }),
  }));
  mock.module("create/space/spaceSlice", () => ({
    ...realSpaceSlice,
    fetchUserSpaceMemberships: fetchUserSpaceMembershipsMock,
  }));
  mock.module("./toolResultError", () => ({
    getToolResultErrorData: () => undefined,
  }));

  const mod = await import(`./toolRunStore.ts`);
  return mod;
}

// Minimal fake store/dispatch so dispatch(executeToolRun(...)) still works —
// createAsyncThunk is dispatched here; getState() exposes auth.currentUser.
function createFakeDispatch(authUser: { userId: string } | null) {
  const state = { auth: { currentUser: authUser } };
  const dispatch = async (action: any) => {
    if (typeof action === "function") {
      // thunk
      return action(dispatch, () => state, undefined);
    }
    return action;
  };
  return dispatch;
}

describe("executeToolRun", () => {
  beforeEach(() => {
    executorMock.mockReset();
    fetchUserSpaceMembershipsMock.mockClear();
  });

  afterEach(() => {
    mock.restore();
    restoreLeakedModuleMocks();
  });

  it("refreshes memberships after confirmed deleteSpaces succeeds", async () => {
    executorMock.mockResolvedValue({
      rawData: { deletedSpaceIds: ["space-a"] },
      displayData: "已删除 1 个 Space",
    });
    const {
      executeToolRun,
      toolRunStarted,
      toolRunSetPending,
      resetToolRunStoreForTests,
    } = await loadToolRunStore();
    resetToolRunStoreForTests();

    toolRunStarted({
      id: "run-1",
      messageId: "msg-1",
      toolName: "deleteSpaces",
      interaction: "confirm",
      input: { query: "rn_owner_verify", confirmedSpaceIds: ["space-a"] },
    });
    toolRunSetPending({ id: "run-1" });

    const dispatch = createFakeDispatch({ userId: "user-a" });
    const result = (await dispatch(executeToolRun({ id: "run-1" }) as any)) as any;

    expect(executeToolRun.fulfilled.match(result)).toBe(true);
    expect(fetchUserSpaceMembershipsMock).toHaveBeenCalledWith("user-a");
  });
});