import { describe, expect, it, mock } from "bun:test";

const readMock = mock(({ dbKey }: { dbKey: string }) => ({
  type: "read",
  payload: { dbKey },
}));

const patchMock = mock(({ dbKey, changes }: { dbKey: string; changes: any }) => ({
  type: "patch",
  payload: { dbKey, changes },
}));

let moduleVersion = 0;

async function loadAddContentAction() {
  const realDbSlice = await import("database/dbSlice");
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    read: readMock,
    patch: patchMock,
  }));

  const realAuthSlice = await import("auth/authSlice");
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: any) => state.auth?.currentUser?.userId,
  }));

  const mod = await import(`./addContentAction?test=${moduleVersion++}`);
  mock.restore();
  return mod;
}

describe("addContentAction", () => {
  it("persists fileCategory on new file content records", async () => {
    const { addContentAction } = await loadAddContentAction();
    readMock.mockClear();
    patchMock.mockClear();

    const spaceData = {
      id: "space-a",
      members: ["user-a"],
      categories: {},
      contents: {},
    };
    const updatedSpaceData = {
      ...spaceData,
      updatedAt: 123,
      contents: {
        "file-user-a-1": {
          title: "brief.pdf",
          type: "file",
          fileCategory: "document",
          mimeType: "application/pdf",
          fileSize: 1024,
          originalName: "brief.pdf",
          contentKey: "file-user-a-1",
          pinned: false,
          createdAt: 123,
          updatedAt: 123,
        },
      },
    };

    const dispatch = mock((action: any) => {
      if (action?.type === "read") {
        return { unwrap: async () => spaceData };
      }
      if (action?.type === "patch") {
        const nextContent = action.payload.changes.contents["file-user-a-1"];
        return {
          unwrap: async () => ({
            ...spaceData,
            updatedAt: action.payload.changes.updatedAt,
            contents: {
              "file-user-a-1": nextContent,
            },
          }),
        };
      }
      return { unwrap: async () => updatedSpaceData };
    });

    const result = await addContentAction(
      {
        spaceId: "space-a",
        title: "brief.pdf",
        type: "file" as any,
        fileCategory: "document",
        mimeType: "application/pdf",
        fileSize: 1024,
        originalName: "brief.pdf",
        contentKey: "file-user-a-1",
      },
      {
        dispatch,
        getState: () => ({
          auth: { currentUser: { userId: "user-a" } },
        }),
      }
    );

    expect(readMock).toHaveBeenCalledTimes(1);
    expect(patchMock).toHaveBeenCalledTimes(1);
    expect(patchMock.mock.calls[0]?.[0]?.dbKey).toBe("space-a");
    expect(
      patchMock.mock.calls[0]?.[0]?.changes?.contents?.["file-user-a-1"]
    ).toEqual(
      expect.objectContaining({
        type: "file",
        fileCategory: "document",
        mimeType: "application/pdf",
        fileSize: 1024,
        originalName: "brief.pdf",
        title: "brief.pdf",
      })
    );
    expect(result.updatedSpaceData.contents["file-user-a-1"]).toEqual(
      expect.objectContaining({
        type: "file",
        fileCategory: "document",
        mimeType: "application/pdf",
        fileSize: 1024,
        originalName: "brief.pdf",
      })
    );
  });
});
