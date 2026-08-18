import { afterEach, describe, expect, it, mock } from "bun:test";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realSettingSlice = { ...(await import("app/settings/settingSlice")) };
const realSpaceSlice = { ...(await import("create/space/spaceSlice")) };
const realDialogSlice = { ...(await import("chat/dialog/dialogSlice")) };

const callToolApiMock = mock(async () => ({
  text: "已生成图片",
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
    selectCurrentDialogConfig: () => ({
      cybots: ["agent-0e95801d90-internal-chatgpt-web-image"],
    }),
  }));
  mock.module("create/space/content/addContentAction", () => ({
    addContentAction: mock(async () => undefined),
  }));

  const mod = await import(`./chatgptWebImageTool.ts`);
  return mod;
};

afterEach(() => {
  callToolApiMock.mockClear();
  mock.restore();
  restoreLeakedModuleMocks();
});

describe("chatgptWebImageGenerateFunc", () => {
  it("posts prompt, dialogId, and agentKey to /api/chatgpt-web-image with auth", async () => {
    const { chatgptWebImageGenerateFunc } = await loadModule();

    const result = await chatgptWebImageGenerateFunc(
      {
        prompt: "画一张长安夜市海报",
        n: 3,
      },
      {
        dispatch: mock(() => undefined),
        getState: () => ({}),
      }
    );

    const [, path, body, options] =
      ((callToolApiMock.mock.calls as any[])[0]) ?? [];
    expect(path).toBe("/api/chatgpt-web-image");
    expect(body).toEqual({
      prompt: "画一张长安夜市海报",
      dialogId: "01TESTDIALOG000000000001",
      agentKey: "agent-0e95801d90-internal-chatgpt-web-image",
    });
    expect(options).toEqual({
      withAuth: true,
      agentKey: "agent-0e95801d90-internal-chatgpt-web-image",
    });
    expect(result.displayData).toBe("已生成图片");
    expect(result.rawData).toEqual({ text: "已生成图片", files: [] });
  });

  it("rejects empty prompt", async () => {
    const { chatgptWebImageGenerateFunc } = await loadModule();

    await expect(
      chatgptWebImageGenerateFunc(
        { prompt: "   " },
        {
          dispatch: mock(() => undefined),
          getState: () => ({}),
        }
      )
    ).rejects.toThrow("prompt 不能为空");
    expect(callToolApiMock).not.toHaveBeenCalled();
  });
});
