import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

const deleteRequests: Array<{ server: string; dbKey: string }> = [];
const noloDeleteRequestMock = mock(async (server: string, dbKey: string) => {
  deleteRequests.push({ server, dbKey });
  return true;
});

let moduleVersion = 0;

const loadRemoveAction = async () => {
  const actualRequests = await import("../requests");
  const actualRuntimeServerContext = await import("database/runtimeServerContext");
  mock.module("../requests", () => ({
    ...actualRequests,
    noloDeleteRequest: noloDeleteRequestMock,
  }));
  mock.module("database/runtimeServerContext", () => ({
    ...actualRuntimeServerContext,
    getRuntimeServerContext: () => ({
      currentToken: "token",
      remoteServers: ["http://localhost", "https://nolo.chat", "https://us.nolo.chat"],
      currentServer: "http://localhost",
      syncServers: ["https://nolo.chat", "https://us.nolo.chat"],
    }),
  }));

  const mod = await import(`./remove`);
  return mod;
};

describe("removeAction", () => {
  beforeEach(() => {
    deleteRequests.length = 0;
    noloDeleteRequestMock.mockReset();
    noloDeleteRequestMock.mockImplementation(async (server: string, dbKey: string) => {
      deleteRequests.push({ server, dbKey });
      return true;
    });
  });

  afterEach(() => {
    mock.restore();
  });

  it("returns after writing the local tombstone and then starts background delete with preferred server first", async () => {
    const { removeAction } = await loadRemoveAction();
    const writtenLocalRows = new Map<string, any>();
    const thunkApi = {
      extra: {
        db: {
          get: async () => ({
            dbKey: "page-user-1",
            type: "page",
            userId: "user-1",
            updatedAt: "2026-03-20T10:00:00.000Z",
          }),
          put: async (dbKey: string, value: any) => {
            writtenLocalRows.set(dbKey, value);
          },
        },
      },
      getState: () => ({
        auth: { currentToken: "token" },
        settings: {
          currentServer: "http://localhost",
          syncServers: ["https://nolo.chat", "https://us.nolo.chat"],
        },
      }),
    };

    const result = await removeAction(
      {
        dbKey: "page-user-1",
        preferredServerOrigin: "https://us.nolo.chat",
      },
      thunkApi as any
    );

    expect(result).toEqual({ dbKey: "page-user-1" });
    expect(writtenLocalRows.get("page-user-1")?.deletedAt).toEqual(expect.any(String));
    await Promise.resolve();
    expect(deleteRequests[0]).toEqual({
      server: "https://us.nolo.chat",
      dbKey: "page-user-1",
    });
  });

  it("still resolves immediately when one remote delete fails in the background", async () => {
    const { removeAction } = await loadRemoveAction();
    noloDeleteRequestMock.mockImplementation(async (server: string, dbKey: string) => {
      deleteRequests.push({ server, dbKey });
      return server !== "https://us.nolo.chat";
    });

    const putCalls: { key: string; value: any }[] = [];
    const thunkApi = {
      extra: {
        db: {
          get: async () => null,
          put: async (key: string, value: any) => { putCalls.push({ key, value }); },
        },
      },
      getState: () => ({
        auth: { currentToken: "token" },
        settings: {
          currentServer: "http://localhost",
          syncServers: ["https://nolo.chat", "https://us.nolo.chat"],
        },
      }),
    };

    const result = await removeAction(
      {
        dbKey: "page-user-2",
        preferredServerOrigin: "https://us.nolo.chat",
      },
      thunkApi as any
    );

    expect(result).toEqual({ dbKey: "page-user-2" });
    expect(putCalls.length).toBe(1);
    expect(putCalls[0].key).toBe("page-user-2");
    expect(putCalls[0].value.deletedAt).toBeTruthy();
    await Promise.resolve();
    expect(deleteRequests).toEqual([
      { server: "https://us.nolo.chat", dbKey: "page-user-2" },
      { server: "http://localhost", dbKey: "page-user-2" },
      { server: "https://nolo.chat", dbKey: "page-user-2" },
    ]);
  });
});
