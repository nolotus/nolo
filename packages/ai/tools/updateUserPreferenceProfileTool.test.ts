import { describe, expect, it, mock } from "bun:test";

const setSettingsMock = mock((payload: any) => ({
  kind: "setSettings",
  payload,
}));

let moduleVersion = 0;

async function loadUpdateUserPreferenceProfileTool() {
  return import(`./updateUserPreferenceProfileTool`);
}

describe("updateUserPreferenceProfileTool", () => {
  it("persists user preference settings through setSettings", async () => {
    const { updateUserPreferenceProfileFunc } =
      await loadUpdateUserPreferenceProfileTool();
    setSettingsMock.mockClear();

    const dispatch = mock((action: any) => {
      expect(action.kind).toBe("setSettings");
      expect(action.payload).toEqual({
        userTonePreset: "direct",
        knowledgeCaptureLevel: 2,
        spaceContextLevel: 3,
        enableReadCurrentSpace: true,
        autoApproveSelfUpdateFields: ["greeting", "tags"],
      });
      return { unwrap: async () => action.payload };
    });

    const result = await updateUserPreferenceProfileFunc(
      {
        userTonePreset: "direct",
        knowledgeCaptureLevel: 2,
        spaceContextLevel: 3,
        autoApproveSelfUpdateFields: ["greeting", "tags"],
      },
      { dispatch, extra: { setSettings: setSettingsMock } }
    );

    expect(setSettingsMock).toHaveBeenCalledTimes(1);
    expect(result.rawData).toMatchObject({
      success: true,
        updated: {
          userTonePreset: "direct",
          knowledgeCaptureLevel: 2,
          spaceContextLevel: 3,
          enableReadCurrentSpace: true,
          autoApproveSelfUpdateFields: ["greeting", "tags"],
        },
      });
  });

  it("rejects empty updates", async () => {
    const { updateUserPreferenceProfileFunc } =
      await loadUpdateUserPreferenceProfileTool();
    await expect(
      updateUserPreferenceProfileFunc({}, { dispatch: mock(() => null) })
    ).rejects.toThrow("没有可保存的用户偏好设置");
  });
});
