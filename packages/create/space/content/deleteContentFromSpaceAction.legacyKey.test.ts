import { describe, expect, it, mock } from "bun:test";

const readMock = mock((input: any) => ({ kind: "read", input }));
const patchMock = mock((input: any) => ({ kind: "patch", input }));
const removeMock = mock((input: any) => ({ kind: "remove", input }));
const deleteFileActionMock = mock(async () => undefined);

mock.module("database/actions/deleteFile", () => ({
  deleteFileAction: deleteFileActionMock,
}));

let moduleVersion = 0;

async function loadDeleteContentFromSpaceAction() {
  const realDbSlice = await import("database/dbSlice");
  const realAuthSlice = await import("auth/authSlice");
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    read: readMock,
    patch: patchMock,
    remove: removeMock,
  }));

  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: any) => state.auth?.currentUser?.userId,
    selectIsLoggedIn: () => true,
    selectCurrentToken: () => "token",
    selectCurrentUser: () => ({ userId: "user-a" }),
    selectUsers: () => [],
    selectCurrentUserBalance: () => 0,
  }));

  const mod = await import(`./deleteContentFromSpaceAction?test=${moduleVersion++}`);
  mock.restore();
  return mod;
}

describe("deleteContentFromSpaceAction legacy key handling", () => {
  it("removes both entry key and canonical content key for legacy image refs", async () => {
    const { deleteContentFromSpaceAction } = await loadDeleteContentFromSpaceAction();
    readMock.mockClear();
    patchMock.mockClear();
    deleteFileActionMock.mockClear();

    const spaceData = {
      id: "space-a",
      updatedAt: 100,
      members: ["user-a"],
      contents: {
        "image-user-a-legacy": {
          type: "image",
          contentKey: "file-user-a-canonical",
          title: "legacy image",
        },
      },
    };
    const updatedSpaceData = {
      ...spaceData,
      updatedAt: 101,
      contents: {},
    };

    const dispatch = mock((action: any) => {
      if (action.kind === "read") {
        return { unwrap: async () => spaceData };
      }
      if (action.kind === "patch") {
        return { unwrap: async () => updatedSpaceData };
      }
      if (action.kind === "remove") {
        return { unwrap: async () => undefined };
      }
      return { unwrap: async () => undefined };
    });

    await deleteContentFromSpaceAction(
      { contentKey: "file-user-a-canonical", spaceId: "space-a" },
      {
        dispatch,
        getState: () => ({ auth: { currentUser: { userId: "user-a" } } }),
      }
    );

    expect(patchMock).toHaveBeenCalledTimes(1);
    const patchInput = patchMock.mock.calls[0][0];
    expect(patchInput.changes.contents).toEqual({
      "image-user-a-legacy": null,
      "file-user-a-canonical": null,
    });
    expect(typeof patchInput.changes.updatedAt).toBe("number");
    expect(patchInput.changes.updatedAt).toBeGreaterThan(100);

    expect(deleteFileActionMock).toHaveBeenCalledTimes(1);
    expect((deleteFileActionMock.mock.calls as any)[0][0]).toBe("file-user-a-canonical");
  });
});
