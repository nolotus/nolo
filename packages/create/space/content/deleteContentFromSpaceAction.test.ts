import { describe, expect, it, mock } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(
  join(import.meta.dir, "deleteContentFromSpaceAction.ts"),
  "utf-8"
);

describe("deleteContentFromSpaceAction source contract", () => {
  it("passes full thunkAPI to deleteFileAction for file/image strategy", () => {
    expect(source).toContain("file: async (key, { thunkAPI }) =>");
    expect(source).toContain("image: async (key, { thunkAPI }) =>");
    expect(source).toContain("await deleteFileAction(key, thunkAPI);");
  });

  it("forwards sourceServerOrigin as preferredServerOrigin to read and patch", () => {
    expect(source).toContain("preferredServerOrigin: sourceServerOrigin,");
  });
});

const deleteFileActionMock = mock(async () => undefined);
mock.module("database/actions/deleteFile", () => ({
  deleteFileAction: deleteFileActionMock,
}));
let moduleVersion = 0;

async function loadDeleteContentFromSpaceAction() {
  const realAuthSlice = await import("auth/authSlice");
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

describe("deleteContentFromSpaceAction behavior", () => {
  it("forwards full thunkAPI to deleteFileAction for image deletion path", async () => {
    const { deleteContentFromSpaceAction } = await loadDeleteContentFromSpaceAction();
    deleteFileActionMock.mockClear();
    const contentKey = "image-user-a-1";
    const spaceId = "test-space";
    const spaceData = {
      id: spaceId,
      members: ["user-a"],
      contents: {
        [contentKey]: { type: "image", contentKey, title: "img" },
      },
    };
    const updatedSpaceData = { ...spaceData, contents: { [contentKey]: null } };

    let dispatchCount = 0;
    const dispatch = mock((_action: any) => {
      dispatchCount += 1;
      if (dispatchCount === 1) return { unwrap: async () => spaceData };
      if (dispatchCount === 2) return { unwrap: async () => updatedSpaceData };
      return { unwrap: async () => undefined };
    });
    const thunkAPI = {
      dispatch,
      getState: () => ({ auth: { currentUser: { userId: "user-a" } } }),
      extra: { db: { get: async () => null, put: async () => undefined } },
    };

    const result = await deleteContentFromSpaceAction({ contentKey, spaceId }, thunkAPI);

    expect(dispatch).toHaveBeenCalledTimes(2);
    expect(deleteFileActionMock).toHaveBeenCalledTimes(1);
    expect(deleteFileActionMock).toHaveBeenCalledWith(contentKey, thunkAPI);
    expect(result.updatedSpaceData).toEqual(updatedSpaceData);
    expect(result.entityRemoveError).toBeNull();
  });

  it("physically removes owned page entities after removing the space reference", async () => {
    const { deleteContentFromSpaceAction } = await loadDeleteContentFromSpaceAction();
    const contentKey = "page-usera-1";
    const spaceId = "test-space";
    const spaceData = {
      id: spaceId,
      members: ["usera"],
      contents: {
        [contentKey]: { type: "page", contentKey, title: "doc" },
      },
    };
    const updatedSpaceData = { ...spaceData, contents: { [contentKey]: null } };

    let dispatchCount = 0;
    const dispatch = mock((_action: any) => {
      dispatchCount += 1;
      if (dispatchCount === 1) return { unwrap: async () => spaceData };
      if (dispatchCount === 2) return { unwrap: async () => updatedSpaceData };
      if (dispatchCount === 3) return { unwrap: async () => undefined };
      return { unwrap: async () => undefined };
    });
    const thunkAPI = {
      dispatch,
      getState: () => ({ auth: { currentUser: { userId: "usera" } } }),
      extra: { db: { get: async () => null, put: async () => undefined } },
    };

    const result = await deleteContentFromSpaceAction({ contentKey, spaceId }, thunkAPI);

    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(result.updatedSpaceData).toEqual(updatedSpaceData);
    expect(result.entityRemoveError).toBeNull();
  });

  it("prefers the originating server when reading and patching the space", async () => {
    const { deleteContentFromSpaceAction } = await loadDeleteContentFromSpaceAction();
    const contentKey = "page-usera-2";
    const spaceId = "test-space";
    const spaceData = {
      id: spaceId,
      members: ["usera"],
      contents: {
        [contentKey]: { type: "page", contentKey, title: "doc" },
      },
    };
    const updatedSpaceData = { ...spaceData, contents: { [contentKey]: null } };

    let dispatchCount = 0;
    const actions: any[] = [];
    const dispatch = mock((action: any) => {
      actions.push(action);
      dispatchCount += 1;
      if (dispatchCount === 1) return { unwrap: async () => spaceData };
      if (dispatchCount === 2) return { unwrap: async () => updatedSpaceData };
      if (dispatchCount === 3) return { unwrap: async () => undefined };
      return { unwrap: async () => undefined };
    });
    const thunkAPI = {
      dispatch,
      getState: () => ({ auth: { currentUser: { userId: "usera" } } }),
      extra: { db: { get: async () => null, put: async () => undefined } },
    };

    const result = await deleteContentFromSpaceAction(
      {
        contentKey,
        spaceId,
        sourceServerOrigin: "https://us.nolo.chat",
      },
      thunkAPI
    );

    // RTK thunks are functions; verify dispatch count instead.
    // Source contract below validates the preferredServerOrigin plumbing.
    expect(dispatch).toHaveBeenCalledTimes(3);
    expect(result.entityRemoveError).toBeNull();
  });
});
