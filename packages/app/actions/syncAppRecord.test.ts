import { describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;

async function loadSyncAppRecord() {
  const actualSettingSlice = await import("app/settings/settingSlice");
  const actualRequests = await import("database/requests");
  const noloWriteRequestMock = mock(async () => true);
  mock.module("app/settings/settingSlice", () => ({
    ...actualSettingSlice,
    selectCurrentServer: (state: any) => state.settings.currentServer,
    selectSyncServers: (state: any) => state.settings.syncServers,
  }));
  mock.module("database/requests", () => ({
    ...actualRequests,
    noloWriteRequest: noloWriteRequestMock,
  }));

  const mod = await import(`./syncAppRecord`);
  mock.restore();
  return {
    syncAppRecord: mod.syncAppRecord,
    noloWriteRequestMock,
  };
}

describe("syncAppRecord", () => {
  it("writes normalized app payloads to local db and remote servers", async () => {
    const { syncAppRecord, noloWriteRequestMock } = await loadSyncAppRecord();
    const putMock = mock(async () => undefined);
    const state = {
      settings: {
        currentServer: "http://127.0.0.1:38123",
        syncServers: ["https://us.nolo.chat"],
      },
    };

    await syncAppRecord(
      "app-u1-app-1",
      {
        appId: "app-1",
        userId: "u1",
        name: "remote-app",
        code: "export default {}",
      },
      { includeCurrentServer: true }
    )(
      (() => undefined) as any,
      () => state as any,
      { db: { put: putMock } }
    );

    expect(putMock).toHaveBeenCalledWith(
      "app-u1-app-1",
      expect.objectContaining({
        dbKey: "app-u1-app-1",
        type: "app",
        userId: "u1",
      })
    );
    expect(noloWriteRequestMock.mock.calls as any).toEqual([
      [
        "http://127.0.0.1:38123",
        expect.objectContaining({
          customKey: "app-u1-app-1",
          userId: "u1",
          data: expect.objectContaining({
            dbKey: "app-u1-app-1",
            type: "app",
            appId: "app-1",
          }),
        }),
        state,
      ],
      [
        "https://us.nolo.chat",
        expect.objectContaining({
          customKey: "app-u1-app-1",
          userId: "u1",
          data: expect.objectContaining({
            dbKey: "app-u1-app-1",
            type: "app",
            appId: "app-1",
          }),
        }),
        state,
      ],
    ]);
  });
});
