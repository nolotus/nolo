import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { DataType } from "create/types";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realSettingSlice = { ...(await import("app/settings/settingSlice")) };
const realRequests = { ...(await import("database/requests")) };

let moduleVersion = 0;
let currentServer = "https://us.nolo.chat";
let remoteServers = ["https://nolo.chat"];

const writeRequestMock = mock(async () => true);
const deleteRequestMock = mock(async () => true);
const patchRequestMock = mock(async () => true);

const restoreLeakedModuleMocks = () => {
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("database/requests", () => realRequests);
};

const loadShareAction = async () => {
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: any) =>
      state?.auth?.currentUser?.userId ?? "user123",
    selectCurrentUser: (state: any) =>
      state?.auth?.currentUser ?? { userId: "user123", name: "Nolo" },
  }));
  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: () => currentServer,
    selectRemoteServers: () => remoteServers,
  }));
  mock.module("database/requests", () => ({
    ...realRequests,
    noloWriteRequest: writeRequestMock,
    noloDeleteRequest: deleteRequestMock,
    noloPatchRequest: patchRequestMock,
  }));

  const mod = await import(`./action.ts?test=${moduleVersion}`);
  return mod;
};

describe("shareResourceAction table mode", () => {
  beforeEach(() => {
    moduleVersion += 1;
    currentServer = "https://us.nolo.chat";
    remoteServers = ["https://nolo.chat"];
    writeRequestMock.mockClear();
    deleteRequestMock.mockClear();
    patchRequestMock.mockClear();
    writeRequestMock.mockImplementation(async () => true);
    deleteRequestMock.mockImplementation(async () => true);
    patchRequestMock.mockImplementation(async () => true);
  });

  afterEach(() => {
    mock.restore();
    restoreLeakedModuleMocks();
  });

  it("publishes tables as live shares by default", async () => {
    const putMock = mock(async () => {});

    const { shareResourceAction } = await loadShareAction();
    const result = await shareResourceAction(
      {
        type: DataType.TABLE,
        data: {
          dbKey: "meta-user123-table123",
          tenantId: "user123",
          tableId: "table123",
          displayName: "Gemma 4 Benchmarks",
        },
        title: "Gemma 4 Benchmarks",
        visibility: "community",
      },
      {
        getState: () => ({}),
        extra: {
          db: {
            get: async () => null,
            put: putMock,
          },
        },
      } as any
    );

    expect(result.token).toEqual(expect.any(String));
    expect(writeRequestMock).toHaveBeenCalledTimes(2);

    const originWrite = (writeRequestMock.mock.calls as any[])[0][1];
    expect(originWrite.data.type).toBe(DataType.TABLE);
    expect(originWrite.data.data).toEqual({
      mode: "live",
      tableDbKey: "meta-user123-table123",
      tableOwnerId: "user123",
      originServer: "https://us.nolo.chat",
    });
    expect(originWrite.data.meta.mode).toBe("live");
    expect(originWrite.data.meta.tableDbKey).toBe("meta-user123-table123");
    expect(originWrite.data.meta.tableOwnerId).toBe("user123");
    expect(originWrite.data.meta.originServer).toBe("https://us.nolo.chat");
  });

  it("writes originServer before fan-out to remote servers", async () => {
    const { shareResourceAction } = await loadShareAction();

    await shareResourceAction(
      {
        type: DataType.TABLE,
        data: {
          dbKey: "meta-user123-table123",
          tenantId: "user123",
          tableId: "table123",
          displayName: "Gemma 4 Benchmarks",
        },
        title: "Gemma 4 Benchmarks",
        visibility: "community",
      },
      {
        getState: () => ({}),
        extra: {
          db: {
            get: async () => null,
            put: async () => {},
          },
        },
      } as any
    );

    expect(writeRequestMock).toHaveBeenCalledTimes(2);

    const [originRequest, replicaRequest] = (writeRequestMock.mock.calls as any[]).map(
      ([server, request]: any[]) => ({
        server,
        request,
      })
    );

    expect(originRequest.server).toBe("https://us.nolo.chat");
    expect(replicaRequest.server).toBe("https://nolo.chat");
    expect(originRequest.request.data.meta.originServer).toBe(
      "https://us.nolo.chat"
    );
    expect(replicaRequest.request.data.meta.originServer).toBe(
      "https://us.nolo.chat"
    );
    expect(originRequest.request.data.data.originServer).toBe(
      "https://us.nolo.chat"
    );
    expect(replicaRequest.request.data.data.originServer).toBe(
      "https://us.nolo.chat"
    );
  });

  it("leaves table body bootstrap to the server write path after live share publish", async () => {
    const { shareResourceAction } = await loadShareAction();

    await shareResourceAction(
      {
        type: DataType.TABLE,
        data: {
          dbKey: "meta-user123-table123",
          tenantId: "user123",
          tableId: "table123",
          displayName: "Gemma 4 Benchmarks",
        },
        title: "Gemma 4 Benchmarks",
        visibility: "community",
      },
      {
        getState: () => ({}),
        extra: {
          db: {
            get: async () => null,
            put: async () => {},
          },
        },
      } as any
    );

    const originWrite = (writeRequestMock.mock.calls as any[])[0][1];
    expect(originWrite.data.meta.replicaServers).toEqual(["https://nolo.chat"]);
    expect(writeRequestMock).toHaveBeenCalledTimes(2);
    expect(patchRequestMock).not.toHaveBeenCalled();
  });

  it("requires the origin share write to succeed before treating publish as successful", async () => {
    writeRequestMock
      .mockImplementationOnce(async () => false)
      .mockImplementationOnce(async () => true);
    const { shareResourceAction } = await loadShareAction();

    await expect(
      shareResourceAction(
        {
          type: DataType.TABLE,
          data: {
            dbKey: "meta-user123-table123",
            tenantId: "user123",
            tableId: "table123",
          },
          title: "Gemma 4 Benchmarks",
          visibility: "community",
        },
        {
          getState: () => ({}),
          extra: {
            db: {
              get: async () => null,
              put: async () => {},
            },
          },
        } as any
      )
    ).rejects.toThrow("Failed to publish share to origin server.");

    expect(deleteRequestMock).toHaveBeenCalledWith(
      "https://nolo.chat",
      expect.any(String),
      { type: "single" },
      {}
    );
  });

  it("refuses to publish dialog shares without persisted messages", async () => {
    const { shareResourceAction } = await loadShareAction();

    await expect(
      shareResourceAction(
        {
          type: DataType.DIALOG,
          data: {
            dbKey: "dialog-user123-empty",
            title: "Empty dialog",
            messages: [],
          },
          title: "Empty dialog",
          visibility: "community",
        },
        {
          getState: () => ({}),
          extra: {
            db: {
              get: async () => null,
              put: async () => {},
            },
          },
        } as any
      )
    ).rejects.toThrow("Cannot share dialog without persisted messages.");

    expect(writeRequestMock).not.toHaveBeenCalled();
  });

  it("keeps browser share action free of server-only table replication imports", async () => {
    const source = await Bun.file(new URL("./action.ts", import.meta.url)).text();

    expect(source).not.toContain("./server/tableReplication");
    expect(source).not.toContain("database-engine/db");
  });
});
