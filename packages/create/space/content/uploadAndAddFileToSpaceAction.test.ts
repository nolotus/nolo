import { afterAll, describe, expect, it, mock } from "bun:test";

// Value-copy snapshots before sticky mocks — Bun mock.restore() does not clear
// mock.module. Top-level ./addContentAction stubs leak into
// addContentAction.deviceLocal (and other create content suites).
const realUploadActions = { ...(await import("database/actions/upload")) };
const realAddContentAction = { ...(await import("./addContentAction")) };
const realToast = { ...(await import("app/utils/toast")) };
const realUlid = { ...(await import("database/utils/ulid")) };

const uploadFileActionMock = mock(async ({ customKey }: { customKey: string }) => ({
  dbKey: customKey,
  id: "uploaded-file-id",
}));
const addContentActionMock = mock(async ({ spaceId, contentKey }: any) => ({
  spaceId,
  updatedSpaceData: {
    id: spaceId,
    contents: {
      [contentKey]: {
        contentKey,
      },
    },
  },
}));
const patchDbMock = mock(({ dbKey, changes }: { dbKey: string; changes: any }) => ({
  type: "patch",
  payload: { dbKey, changes },
}));
const toastSuccessMock = mock(() => undefined);
const toastErrorMock = mock(() => undefined);

mock.module("database/actions/upload", () => ({
  uploadFileAction: uploadFileActionMock,
}));

mock.module("./addContentAction", () => ({
  addContentAction: addContentActionMock,
}));

mock.module("app/utils/toast", () => ({
  toast: {
    success: toastSuccessMock,
    error: toastErrorMock,
  },
}));

mock.module("database/utils/ulid", () => ({
  ulid: () => "fixed-ulid",
}));

afterAll(() => {
  mock.module("database/actions/upload", () => realUploadActions);
  mock.module("./addContentAction", () => realAddContentAction);
  mock.module("create/space/content/addContentAction", () => realAddContentAction);
  mock.module("app/utils/toast", () => realToast);
  mock.module("database/utils/ulid", () => realUlid);
});

let moduleVersion = 0;

async function loadUploadAndAddFileToSpaceAction() {
  const realAuthSlice = await import("auth/authSlice");
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: any) => state.auth?.currentUser?.userId,
  }));

  const realDbSlice = await import("database/dbSlice");
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    patch: patchDbMock,
  }));

  const mod = await import(`./uploadAndAddFileToSpaceAction?test=${moduleVersion++}`);
  mock.restore();
  // Keep this file's intentional sticky mocks after restore (restore does not
  // clear mock.module, but reinstall so later loaders in this file stay stubbed).
  mock.module("database/actions/upload", () => ({
    uploadFileAction: uploadFileActionMock,
  }));
  mock.module("./addContentAction", () => ({
    addContentAction: addContentActionMock,
  }));
  mock.module("app/utils/toast", () => ({
    toast: {
      success: toastSuccessMock,
      error: toastErrorMock,
    },
  }));
  mock.module("database/utils/ulid", () => ({
    ulid: () => "fixed-ulid",
  }));
  return mod;
}

describe("uploadAndAddFileToSpaceAction", () => {
  it("forwards only supported uploadFileAction fields", async () => {
    const { uploadAndAddFileToSpaceAction } =
      await loadUploadAndAddFileToSpaceAction();
    uploadFileActionMock.mockClear();
    addContentActionMock.mockClear();
    patchDbMock.mockClear();
    toastSuccessMock.mockClear();
    toastErrorMock.mockClear();

    const file = new File(["hello"], "demo.png", { type: "image/png" });
    const thunkAPI = {
      dispatch: mock((action: any) => {
        if (action?.type === "patch") {
          return {
            unwrap: async () => ({
              dbKey: action.payload.dbKey,
              ...action.payload.changes,
            }),
          };
        }
        return undefined;
      }),
      getState: () => ({
        auth: {
          currentUser: {
            userId: "user-a",
          },
        },
      }),
    };

    const result = await uploadAndAddFileToSpaceAction(
      {
        spaceId: "space-a",
        file,
        categoryId: "cat-1",
      },
      thunkAPI
    );

    expect(uploadFileActionMock).toHaveBeenCalledTimes(1);
    expect(uploadFileActionMock).toHaveBeenCalledWith(
      {
        file,
        customKey: "file-user-a-fixed-ulid",
        userId: "user-a",
      },
      thunkAPI
    );
    expect(
      Object.prototype.hasOwnProperty.call(uploadFileActionMock.mock.calls[0][0], "waitForServer")
    ).toBe(false);

    expect(addContentActionMock).toHaveBeenCalledTimes(1);
    expect(addContentActionMock).toHaveBeenCalledWith(
      {
        spaceId: "space-a",
        contentKey: "file-user-a-fixed-ulid",
        title: "demo.png",
        type: "file",
        fileCategory: "image",
        mimeType: "image/png",
        fileSize: 5,
        originalName: "demo.png",
        categoryId: "cat-1",
      },
      thunkAPI
    );
    expect(patchDbMock).toHaveBeenCalledWith(
      {
        dbKey: "file-user-a-fixed-ulid",
        changes: {
          title: "demo.png",
          spaceId: "space-a",
          fileCategory: "image",
          mimeType: "image/png",
          fileSize: 5,
          originalName: "demo.png",
        },
      }
    );
    // Toast reporting is owned by the page-level caller (SpaceContent),
    // not by this action.
    expect(toastSuccessMock).not.toHaveBeenCalled();
    expect(toastErrorMock).not.toHaveBeenCalled();
    expect(result.fileId).toBe("uploaded-file-id");
    expect(result.contentKey).toBe("file-user-a-fixed-ulid");
  });

  it("notifies my-content listeners after a successful upload", async () => {
    const { uploadAndAddFileToSpaceAction } =
      await loadUploadAndAddFileToSpaceAction();
    const dispatchEventMock = mock(() => true);
    const previousWindow = (globalThis as any).window;
    (globalThis as any).window = {
      dispatchEvent: dispatchEventMock,
    };

    try {
      const file = new File(["hello"], "demo.png", { type: "image/png" });
      const thunkAPI = {
        dispatch: mock((action: any) => {
          if (action?.type === "patch") {
            return {
              unwrap: async () => ({
                dbKey: action.payload.dbKey,
                ...action.payload.changes,
              }),
            };
          }
          return undefined;
        }),
        getState: () => ({
          auth: {
            currentUser: {
              userId: "user-a",
            },
          },
        }),
      };

      await uploadAndAddFileToSpaceAction(
        {
          spaceId: "space-a",
          file,
        },
        thunkAPI
      );

      expect(dispatchEventMock).toHaveBeenCalledTimes(1);
      expect((dispatchEventMock.mock.calls as any)[0]?.[0]?.type).toBe("nolo-user-data-updated");
    } finally {
      (globalThis as any).window = previousWindow;
    }
  });

  it("classifies office and pdf uploads as document files", async () => {
    const { uploadAndAddFileToSpaceAction } =
      await loadUploadAndAddFileToSpaceAction();
    addContentActionMock.mockClear();

    const file = new File(["hello"], "brief.pdf", { type: "application/pdf" });
    const thunkAPI = {
      dispatch: mock((action: any) => {
        if (action?.type === "patch") {
          return {
            unwrap: async () => ({
              dbKey: action.payload.dbKey,
              ...action.payload.changes,
            }),
          };
        }
        return undefined;
      }),
      getState: () => ({
        auth: {
          currentUser: {
            userId: "user-a",
          },
        },
      }),
    };

    await uploadAndAddFileToSpaceAction(
      {
        spaceId: "space-a",
        file,
      },
      thunkAPI
    );

    expect(addContentActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "file",
        fileCategory: "document",
        mimeType: "application/pdf",
        fileSize: 5,
        originalName: "brief.pdf",
      }),
      thunkAPI
    );
  });
});
