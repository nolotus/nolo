import { afterEach, describe, expect, it, mock } from "bun:test";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realSettingSlice = { ...(await import("app/settings/settingSlice")) };
const realSpaceSlice = { ...(await import("create/space/spaceSlice")) };
const realDialogSlice = { ...(await import("chat/dialog/dialogSlice")) };

const callToolApiMock = mock(async () => ({
  text: "ok",
  files: [],
}));

let moduleVersion = 0;

const restoreLeakedModuleMocks = () => {
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("create/space/spaceSlice", () => realSpaceSlice);
  mock.module("chat/dialog/dialogSlice", () => realDialogSlice);
};

const loadModule = async () => {
  mock.module("./toolApiClient", () => ({
    callToolApi: callToolApiMock,
  }));
  mock.module("create/space/spaceSlice", () => ({
    ...realSpaceSlice,
    selectCurrentSpaceId: () => "space-1",
  }));
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: any) =>
      state?.auth?.currentUser?.userId ?? "user-1",
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

  const mod = await import(`./openaiImageTool.ts`);
  return mod;
};

afterEach(() => {
  callToolApiMock.mockClear();
  mock.restore();
  restoreLeakedModuleMocks();
});

describe("openAIGptImageFunc", () => {
  it("passes the current dialog id to the OpenAI image API", async () => {
    const { openAIGptImageFunc } = await loadModule();

    await openAIGptImageFunc(
      {
        prompt: "make a clean hero banner illustration",
        quality: "high",
        size: "1536x1024",
      },
      {
        dispatch: mock(() => undefined),
        getState: () => ({}),
      }
    );

    const [, path, body, options] = ((callToolApiMock.mock.calls as any[])[0]) ?? [];
    expect(path).toBe("/api/openai-image");
    expect(body).toEqual({
      prompt: "make a clean hero banner illustration",
      images: [],
      size: "1536x1024",
      quality: "high",
      background: undefined,
      outputFormat: undefined,
      outputCompression: undefined,
      moderation: undefined,
      n: undefined,
      model: "gpt-image-1.5",
      dialogId: "01TESTDIALOG000000000001",
    });
    expect(options).toEqual({ withAuth: true });
  });

  it("uses the explicit generation operation by default", async () => {
    const { openAIGptImageGenerateFunc } = await loadModule();

    await openAIGptImageGenerateFunc(
      { prompt: "A ceramic cup" },
      {
        dispatch: mock(() => undefined),
        getState: () => ({}),
      }
    );

    const [, path, body] = ((callToolApiMock.mock.calls as any[])[0]) ?? [];
    expect(path).toBe("/api/openai-image");
    expect(body).toMatchObject({
      operation: "generate",
      model: "gpt-image-2",
    });
  });

  it("uses the explicit edit operation for GPT Image 2 edit flows", async () => {
    const { openAIGptImageEditFunc } = await loadModule();

    await openAIGptImageEditFunc(
      {
        prompt: "Swap the background",
        images: [{ data: "https://example.com/input.png" }],
      },
      {
        dispatch: mock(() => undefined),
        getState: () => ({}),
      }
    );

    const [, path, body] = ((callToolApiMock.mock.calls as any[])[0]) ?? [];
    expect(path).toBe("/api/openai-image");
    expect(body).toMatchObject({
      operation: "edit",
      model: "gpt-image-2",
    });
  });
});
