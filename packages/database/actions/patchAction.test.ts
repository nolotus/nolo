import { afterEach, describe, expect, it, mock } from "bun:test";
import * as realReplication from "./replication";
import * as realCommon from "./common";

const toastErrorMock = mock(() => undefined);
const scheduleConfiguredPatchReplicationMock = mock(() => []);
const fetchFromServerMock = mock(async () => null);
const getRuntimeServerContextMock = mock((state: any) => ({
  currentToken: state?.auth?.currentToken,
  currentUserId: state?.auth?.currentUser?.userId,
  currentServer: state?.settings?.currentServer,
  syncServers: Array.isArray(state?.settings?.syncServers)
    ? state.settings.syncServers
    : [],
  remoteServers: [],
}));
const baseState = {
  settings: {
    currentServer: undefined as string | undefined,
    syncServers: [] as string[],
  },
};
let moduleVersion = 0;

const noopSettingsActionMock = mock(() => undefined);

function setupModuleMocks() {
  mock.module("./replication", () => ({
    ...realReplication,
    scheduleConfiguredPatchReplication: scheduleConfiguredPatchReplicationMock,
  }));

  mock.module("./common", () => ({
    ...realCommon,
    fetchFromServer: fetchFromServerMock,
  }));

  mock.module("./actionToast", () => ({
    actionToast: {
      success: mock(() => undefined),
      error: toastErrorMock,
    },
  }));

  mock.module("app/utils/toast", () => ({
    toast: {
      error: toastErrorMock,
    },
  }));
}

async function loadModule() {
  const actualRuntimeServerContext = await import("database/runtimeServerContext");
  setupModuleMocks();
  mock.module("database/runtimeServerContext", () => ({
    ...actualRuntimeServerContext,
    getRuntimeServerContext: getRuntimeServerContextMock,
  }));
  const mod = await import(`./patch.ts`);
  mock.restore();
  return mod;
}

afterEach(() => {
  mock.restore();
  getRuntimeServerContextMock.mockClear();
  toastErrorMock.mockClear();
  fetchFromServerMock.mockClear();
  fetchFromServerMock.mockImplementation(async () => null);
});

describe("patchAction", () => {
  it("auto stamps string updatedAt, returns dbKey, and syncs stamped changes to configured peers", async () => {
    const { patchAction } = await loadModule();
    baseState.settings.syncServers = ["https://sync.nolo.chat"];
    scheduleConfiguredPatchReplicationMock.mockClear();

    const db = {
      get: mock(async () => ({
        type: "setting",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
        defaultSpaceId: "space-a",
      })),
      put: mock(async () => undefined),
    };

    const result = await patchAction(
      {
        dbKey: "user:settings:user-a",
        changes: { defaultSpaceId: "space-b" },
      },
      {
        extra: { db },
        getState: () => baseState,
      } as any
    );

    expect(result.dbKey).toBe("user:settings:user-a");
    expect(result.defaultSpaceId).toBe("space-b");
    expect(typeof result.updatedAt).toBe("string");
    expect(Date.parse(result.updatedAt)).toBeGreaterThan(
      Date.parse("2024-01-01T00:00:00.000Z")
    );
    expect(db.put).toHaveBeenCalledWith("user:settings:user-a", result);

    expect(scheduleConfiguredPatchReplicationMock).toHaveBeenCalledTimes(1);
    expect(scheduleConfiguredPatchReplicationMock).toHaveBeenCalledWith({
      currentServer: undefined,
      syncServers: ["https://sync.nolo.chat"],
      preferredServerOrigin: undefined,
      dbKey: "user:settings:user-a",
      changes: {
        defaultSpaceId: "space-b",
        updatedAt: result.updatedAt,
      },
      state: baseState,
    });
  });

  it("auto stamps numeric updatedAt when callers omit it", async () => {
    const { patchAction } = await loadModule();
    baseState.settings.syncServers = [];
    scheduleConfiguredPatchReplicationMock.mockClear();

    const db = {
      get: mock(async () => ({
        id: "space-a",
        createdAt: 100,
        updatedAt: 100,
        name: "Space A",
      })),
      put: mock(async () => undefined),
    };

    const result = await patchAction(
      {
        dbKey: "space-space-a",
        changes: { name: "Space A+" },
      },
      {
        extra: { db },
        getState: () => baseState,
      } as any
    );

    expect(result.dbKey).toBe("space-space-a");
    expect(result.name).toBe("Space A+");
    expect(typeof result.updatedAt).toBe("number");
    expect(result.updatedAt).toBeGreaterThan(100);
    expect(db.put).toHaveBeenCalledWith("space-space-a", result);

    expect(scheduleConfiguredPatchReplicationMock).toHaveBeenCalledTimes(1);
    expect(scheduleConfiguredPatchReplicationMock).toHaveBeenCalledWith({
      currentServer: undefined,
      syncServers: [],
      preferredServerOrigin: undefined,
      dbKey: "space-space-a",
      changes: {
        name: "Space A+",
        updatedAt: result.updatedAt,
      },
      state: baseState,
    });
  });

  it("hydrates from the preferred server when the record is missing locally, then applies the patch", async () => {
    const { patchAction } = await loadModule();
    baseState.settings.syncServers = [];
    scheduleConfiguredPatchReplicationMock.mockClear();
    const remoteRecord = {
      id: "msg-a",
      type: "msg",
      role: "assistant",
      content: [{ type: "text", text: "old answer" }],
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    fetchFromServerMock.mockImplementation(async () => remoteRecord);

    const db = {
      get: mock(async () => null),
      put: mock(async () => undefined),
    };

    const result = await patchAction(
      {
        dbKey: "dialog-d1-msg-m1",
        changes: { isStreaming: false },
        preferredServerOrigin: "https://preferred.nolo.chat",
      },
      {
        extra: { db },
        getState: () => baseState,
      } as any
    );

    // 水合走 preferredServerOrigin（缺省退 currentServer），并带上当前 token
    expect(fetchFromServerMock).toHaveBeenCalledWith(
      "https://preferred.nolo.chat",
      "dialog-d1-msg-m1",
      undefined
    );
    // 水合记录不单独落盘：水合 + patch 合并后一次性写入
    expect(db.put).toHaveBeenCalledTimes(1);
    expect(db.put).toHaveBeenCalledWith("dialog-d1-msg-m1", result);
    expect(result.isStreaming).toBe(false);
    expect(result.content).toEqual([{ type: "text", text: "old answer" }]);
    expect(scheduleConfiguredPatchReplicationMock).toHaveBeenCalledTimes(1);
    expect(toastErrorMock).not.toHaveBeenCalled();
  });

  it("fails with a clear error when the record is missing both locally and on the server", async () => {
    const { patchAction } = await loadModule();
    baseState.settings.syncServers = [];
    scheduleConfiguredPatchReplicationMock.mockClear();
    fetchFromServerMock.mockImplementation(async () => null);

    const db = {
      get: mock(async () => null),
      put: mock(async () => undefined),
    };

    await expect(
      patchAction(
        {
          dbKey: "dialog-d1-msg-missing",
          changes: { isStreaming: false },
        },
        {
          extra: { db },
          getState: () => baseState,
        } as any
      )
    ).rejects.toThrow("Data not found locally or on server");

    expect(db.put).not.toHaveBeenCalled();
    expect(scheduleConfiguredPatchReplicationMock).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalled();
  });
});
