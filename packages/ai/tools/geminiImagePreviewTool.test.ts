import { afterAll, afterEach, describe, expect, it, mock } from "bun:test";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realSettingSlice = { ...(await import("app/settings/settingSlice")) };
const realSpaceModule = {
  ...(await import("create/space/spaceCurrentSelectors")),
};
const realDialogSlice = { ...(await import("chat/dialog/dialogSlice")) };

const realAddContentAction = {
  ...(await import("create/space/content/addContentAction")),
};

const callToolApiMock = mock(async () => ({
  text: "ok",
  files: [],
}));

let moduleVersion = 0;

const restoreLeakedModuleMocks = () => {
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("create/space/spaceCurrentSelectors", () => realSpaceModule);
  mock.module(
    "create/space/content/addContentAction",
    () => realAddContentAction,
  );
  mock.module("chat/dialog/dialogSlice", () => realDialogSlice);
};

afterAll(() => restoreLeakedModuleMocks());

const loadModule = async () => {
  mock.module("./toolApiClient", () => ({
    callToolApi: callToolApiMock,
  }));
  mock.module("create/space/spaceCurrentSelectors", () => ({
    ...realSpaceModule,
    selectCurrentSpaceId: () => "space-1",
  }));
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: any) => state?.auth?.currentUser?.userId ?? "user-1",
  }));
  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: () => "http://localhost",
  }));
  mock.module("chat/dialog/dialogSlice", () => ({
    ...realDialogSlice,
    selectCurrentDialogKey: () => "dialog-user1-01TESTDIALOG000000000001",
  }));
  mock.module("create/space/content/addContentAction", () => ({
    addContentAction: mock(async () => undefined),
  }));

  const mod = await import(
    `./geminiImagePreviewTool.ts?test=${moduleVersion++}`
  );
  return mod;
};

afterEach(() => {
  callToolApiMock.mockClear();
  mock.restore();
  restoreLeakedModuleMocks();
});

describe("geminiFlashLiteImageFunc", () => {
  it("uses gemini-3.1-flash-lite-image for the fastest/cheapest image path", async () => {
    const { geminiFlashLiteImageFunc } = await loadModule();

    await geminiFlashLiteImageFunc(
      {
        prompt: "draw a quick orange cat",
        imageSize: "1K",
      },
      {
        dispatch: mock(() => undefined),
        getState: () => ({
          dialog: {
            currentDialogKey: "dialog-user1-01TESTDIALOG000000000001",
          },
        }),
      },
    );

    const [, path, body] = (callToolApiMock.mock.calls as any[])[0] ?? [];
    expect(path).toBe("/api/gemini-image-preview");
    expect(body).toEqual({
      prompt: "draw a quick orange cat",
      images: [],
      aspectRatio: undefined,
      imageSize: "1K",
      model: "gemini-3.1-flash-lite-image",
      dialogId: "01TESTDIALOG000000000001",
    });
  });
});

describe("geminiFlashImageFunc", () => {
  it("passes the current dialog id to the billing-aware image API", async () => {
    const { geminiFlashImageFunc } = await loadModule();

    await geminiFlashImageFunc(
      {
        prompt: "draw an orange cat",
        imageSize: "2K",
      },
      {
        dispatch: mock(() => undefined),
        getState: () => ({
          dialog: {
            currentDialogKey: "dialog-user1-01TESTDIALOG000000000001",
          },
        }),
      },
    );

    const [receivedThunkApi, path, body, options] =
      (callToolApiMock.mock.calls as any[])[0] ?? [];
    expect(receivedThunkApi).toEqual({
      dispatch: expect.any(Function),
      getState: expect.any(Function),
    });
    expect(path).toBe("/api/gemini-image-preview");
    expect(body).toEqual({
      prompt: "draw an orange cat",
      images: [],
      aspectRatio: undefined,
      imageSize: "2K",
      model: "gemini-3.1-flash-image-preview",
      dialogId: "01TESTDIALOG000000000001",
    });
    expect(options).toEqual({ withAuth: true });
  });
});
