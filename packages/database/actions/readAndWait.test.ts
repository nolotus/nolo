import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

import {
  BUILTIN_AGENT_CREATOR_AGENT_KEY,
  BUILTIN_NOLO_AGENT_KEY,
} from "core/builtinAgents";

let moduleVersion = 0;

const fetchFromClientDbMock = mock(async (..._args: any[]) => null as any);
const fetchFromServerMock = mock(async (..._args: any[]) => null as any);
const getInFlightMock = mock((..._args: any[]) => null as Promise<any> | null);
const setInFlightMock = mock(() => undefined);
const clearInFlightMock = mock(() => undefined);
const scheduleExistingRecordReplicationMock = mock(() => undefined);

let runtimeContext = {
  currentToken: "token-1",
  remoteServers: ["https://alpha.nolo.test"],
  currentServer: "https://alpha.nolo.test",
  syncServers: ["https://backup.nolo.test"],
  userAuthorityRegistry: undefined as any,
};

const loadReadAndWaitAction = async () => {
  const actualCommonModule = await import("./common");
  const actualReadRequestManagerModule = await import("./readRequestManager");
  const actualReplicationModule = await import("./replication");
  const actualRuntimeServerContext = await import("database/runtimeServerContext");

  mock.module("./common", () => ({
    ...actualCommonModule,
    fetchFromClientDb: fetchFromClientDbMock,
    fetchFromServer: fetchFromServerMock,
  }));

  mock.module("./readRequestManager", () => ({
    ...actualReadRequestManagerModule,
    readRequestManager: {
      getInFlight: getInFlightMock,
      setInFlight: setInFlightMock,
      clearInFlight: clearInFlightMock,
    },
  }));

  mock.module("./replication", () => ({
    ...actualReplicationModule,
    scheduleExistingRecordReplication: scheduleExistingRecordReplicationMock,
  }));

  mock.module("database/runtimeServerContext", () => ({
    ...actualRuntimeServerContext,
    getRuntimeServerContext: () => runtimeContext,
  }));

  const module = await import(`./readAndWait.ts`);
  mock.restore();
  return module.readAndWaitAction;
};

describe("readAndWaitAction", () => {
  beforeEach(() => {
    fetchFromClientDbMock.mockClear();
    fetchFromServerMock.mockClear();
    getInFlightMock.mockClear();
    setInFlightMock.mockClear();
    clearInFlightMock.mockClear();
    scheduleExistingRecordReplicationMock.mockClear();

    runtimeContext = {
      currentToken: "token-1",
      remoteServers: ["https://alpha.nolo.test"],
      currentServer: "https://alpha.nolo.test",
      syncServers: ["https://backup.nolo.test"],
      userAuthorityRegistry: undefined,
    };

    fetchFromClientDbMock.mockImplementation(async () => null as any);
    fetchFromServerMock.mockImplementation(async () => null as any);
    getInFlightMock.mockImplementation(() => null);
  });

  afterEach(() => {
    mock.restore();
  });

  it("reads the builtin agent creator from configured public servers", async () => {
    const readAndWaitAction = await loadReadAndWaitAction();
    runtimeContext = {
      currentToken: "token-1",
      remoteServers: ["https://alpha.nolo.test"],
      currentServer: "https://alpha.nolo.test",
      syncServers: [],
      userAuthorityRegistry: undefined,
    };
    fetchFromServerMock.mockImplementation(async (server: string, dbKey: string) => ({
      dbKey,
      name: server.includes("nolo.chat") ? "AI 创建助手" : "local miss",
      updatedAt: server.includes("nolo.chat") ? "2026-06-16T00:00:00.000Z" : "2026-01-01T00:00:00.000Z",
    }));

    const result = await readAndWaitAction(BUILTIN_AGENT_CREATOR_AGENT_KEY, {
      extra: { db: { put: async () => undefined } },
      getState: () => ({}),
    } as any);

    expect((fetchFromServerMock.mock.calls as any[]).map(([server]: any[]) => server)).toContain("https://nolo.chat");
    expect(result.name).toBe("AI 创建助手");
    expect(result.dbKey).toBe(BUILTIN_AGENT_CREATOR_AGENT_KEY);
  });

  it("reads the builtin nolo record from configured public servers", async () => {
    const readAndWaitAction = await loadReadAndWaitAction();
    fetchFromServerMock.mockImplementation(async (server: string, dbKey: string) => ({
      dbKey,
      name: server.includes("nolo.chat") ? "nolo" : "local miss",
      updatedAt: server.includes("nolo.chat") ? "2026-06-16T00:00:00.000Z" : "2026-01-01T00:00:00.000Z",
    }));

    const result = await readAndWaitAction(BUILTIN_NOLO_AGENT_KEY, {
      extra: { db: { put: async () => undefined } },
      getState: () => ({}),
    } as any);

    expect((fetchFromServerMock.mock.calls as any[]).map(([server]: any[]) => server)).toContain("https://nolo.chat");
    expect(result.name).toBe("nolo");
    expect(result.dbKey).toBe(BUILTIN_NOLO_AGENT_KEY);
  });

  it("uses owner authority registry as the preferred readAndWait source", async () => {
    const readAndWaitAction = await loadReadAndWaitAction();
    runtimeContext = {
      currentToken: "token-1",
      remoteServers: ["https://nolo.chat", "https://us.nolo.chat"],
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      userAuthorityRegistry: {
        user1: "https://self.example.com",
      },
    };

    fetchFromServerMock.mockImplementation(async (server: string) => {
      if (server === "https://self.example.com") {
        return {
          dbKey: "dialog-user1-01DIALOG",
          title: "Authority dialog",
          updatedAt: "2026-05-26T00:00:00.000Z",
        };
      }
      if (server === "https://us.nolo.chat") {
        return {
          dbKey: "dialog-user1-01DIALOG",
          title: "Replica should not win",
          updatedAt: "2026-05-27T00:00:00.000Z",
        };
      }
      return null;
    });

    const result = await readAndWaitAction(
      { dbKey: "dialog-user1-01DIALOG" },
      {
        extra: { db: { put: async () => undefined } },
        getState: () => ({}),
      } as any
    );

    expect((fetchFromServerMock.mock.calls as any[]).map(([server]: any[]) => server)).toEqual([
      "https://self.example.com",
    ]);
    expect(result).toMatchObject({
      dbKey: "dialog-user1-01DIALOG",
      title: "Authority dialog",
    });
  });

  it("scopes in-flight readAndWait requests by auth token", async () => {
    const readAndWaitAction = await loadReadAndWaitAction();
    const firstPromise = Promise.resolve({
      dbKey: "meta-user-table",
      title: "first in-flight",
    });

    getInFlightMock.mockImplementation((key: string) =>
      key === "meta-user-table" ? firstPromise : null
    );
    runtimeContext = {
      currentToken: "token-b",
      remoteServers: ["https://nolo.chat"],
      currentServer: "https://nolo.chat",
      syncServers: [],
      userAuthorityRegistry: undefined,
    };
    fetchFromServerMock.mockImplementation(async (_server: string, dbKey: string, token?: string) => ({
      dbKey,
      title: `read with ${token}`,
    }));

    const result = await readAndWaitAction("meta-user-table", {
      extra: { db: { put: async () => undefined } },
      getState: () => ({}),
    } as any);

    expect(result).toMatchObject({
      dbKey: "meta-user-table",
      title: "read with token-b",
    });
    expect(fetchFromServerMock).toHaveBeenCalledWith(
      "https://nolo.chat",
      "meta-user-table",
      "token-b"
    );
    const requestKey = getInFlightMock.mock.calls[0]?.[0];
    expect(requestKey).not.toBe("meta-user-table");
    expect(String(requestKey)).not.toContain("token-b");
    expect(setInFlightMock).toHaveBeenCalledWith(
      requestKey,
      expect.any(Promise)
    );
    expect(clearInFlightMock).toHaveBeenCalledWith(
      requestKey,
      expect.any(Promise)
    );
  });
});
