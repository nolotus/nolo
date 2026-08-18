import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;

const fetchFromClientDbMock = mock(async (..._args: any[]) => null as any);
const fetchFromServerMock = mock(async (..._args: any[]) => null as any);
const cleanupMissesMock = mock(() => undefined);
const cleanupLocalHitRevalidationsMock = mock(() => undefined);
const clearMissMock = mock(() => undefined);
const getRetryInMsMock = mock(() => null as number | null);
const getLocalHitRevalidateInMsMock = mock(() => null as number | null);
const markLocalHitRevalidatedMock = mock(() => undefined);
const markMissMock = mock(() => undefined);
const getInFlightMock = mock(() => null as Promise<any> | null);
const setInFlightMock = mock(() => undefined);
const clearInFlightMock = mock(() => undefined);
const scheduleExistingRecordReplicationMock = mock(() => undefined);
const loggerWarnMock = mock(() => undefined);

let runtimeContext = {
  currentToken: "token-1",
  remoteServers: ["https://preferred", "https://backup"],
  currentServer: "https://preferred",
  syncServers: ["https://backup"],
  userAuthorityRegistry: undefined as any,
};

const loadReadAction = async () => {
  const actualCommonModule = await import("./common");
  const actualReadRequestManagerModule = await import("./readRequestManager");
  const actualReplicationModule = await import("./replication");
  const actualTombstonesModule = await import("../tombstones");
  const actualRuntimeServerContext = await import("database/runtimeServerContext");

  mock.module("./common", () => ({
    ...actualCommonModule,
    fetchFromClientDb: fetchFromClientDbMock,
    fetchFromServer: fetchFromServerMock,
    isReadTimeoutError: (error: unknown) =>
      error instanceof Error && error.name === "ReadTimeoutError",
    logger: {
      ...actualCommonModule.logger,
      warn: loggerWarnMock,
      debug: () => undefined,
      info: () => undefined,
      error: () => undefined,
    },
  }));

  mock.module("./readRequestManager", () => ({
    ...actualReadRequestManagerModule,
    readRequestManager: {
      cleanupMisses: cleanupMissesMock,
      cleanupLocalHitRevalidations: cleanupLocalHitRevalidationsMock,
      clearMiss: clearMissMock,
      getRetryInMs: getRetryInMsMock,
      getLocalHitRevalidateInMs: getLocalHitRevalidateInMsMock,
      markLocalHitRevalidated: markLocalHitRevalidatedMock,
      markMiss: markMissMock,
      getInFlight: getInFlightMock,
      setInFlight: setInFlightMock,
      clearInFlight: clearInFlightMock,
    },
  }));

  mock.module("database/runtimeServerContext", () => ({
    ...actualRuntimeServerContext,
    getRuntimeServerContext: () => runtimeContext,
  }));

  // Keep real tombstone merge semantics — a simplified mock here leaks across the
  // suite because Bun mock.module is process-wide and mock.restore does not fully
  // rebind already-imported consumers (e.g. cacheMergedUserData tests).
  mock.module("../tombstones", () => actualTombstonesModule);

  mock.module("./replication", () => ({
    ...actualReplicationModule,
    scheduleExistingRecordReplication: scheduleExistingRecordReplicationMock,
  }));

  const module = await import(`./read.ts`);
  mock.restore();
  return module.readAction;
};

describe("readAction", () => {
  beforeEach(() => {
    fetchFromClientDbMock.mockClear();
    fetchFromServerMock.mockClear();
    cleanupMissesMock.mockClear();
    cleanupLocalHitRevalidationsMock.mockClear();
    clearMissMock.mockClear();
    getRetryInMsMock.mockClear();
    getLocalHitRevalidateInMsMock.mockClear();
    markLocalHitRevalidatedMock.mockClear();
    markMissMock.mockClear();
    getInFlightMock.mockClear();
    setInFlightMock.mockClear();
    clearInFlightMock.mockClear();
    scheduleExistingRecordReplicationMock.mockClear();
    loggerWarnMock.mockClear();

    runtimeContext = {
      currentToken: "token-1",
      remoteServers: ["https://preferred", "https://backup"],
      currentServer: "https://preferred",
      syncServers: ["https://backup"],
      userAuthorityRegistry: undefined,
    };

    fetchFromClientDbMock.mockImplementation(async () => null as any);
    fetchFromServerMock.mockImplementation(async () => null as any);
    getRetryInMsMock.mockImplementation(() => null);
    getLocalHitRevalidateInMsMock.mockImplementation(() => null);
    getInFlightMock.mockImplementation(() => null);
  });

  afterEach(() => {
    mock.restore();
  });

  it("falls back to remaining servers when the preferred server times out", async () => {
    const readAction = await loadReadAction();
    const putCalls: Array<{ key: string; value: any }> = [];
    const clientDb = {
      put: async (key: string, value: any) => {
        putCalls.push({ key, value });
      },
    };

    fetchFromServerMock.mockImplementation(async (server: string) => {
      if (server === "https://preferred") {
        const error = new Error("Timed out reading key");
        error.name = "ReadTimeoutError";
        throw error;
      }
      if (server === "https://backup") {
        return {
          id: "dialog-1",
          title: "Recovered remotely",
          updatedAt: "2026-04-13T00:00:00.000Z",
        };
      }
      return null;
    });

    const result = await readAction(
      {
        dbKey: "dialog-user-1",
        preferredServerOrigin: "https://preferred",
      },
      {
        extra: { db: clientDb },
        getState: () => ({}),
      } as any
    );

    expect(result).toMatchObject({
      dbKey: "dialog-user-1",
      serverOrigin: "https://backup",
      title: "Recovered remotely",
    });
    expect((fetchFromServerMock.mock.calls as any[]).map(([server]: any[]) => server)).toEqual([
      "https://preferred",
      "https://backup",
    ]);
    expect(putCalls).toEqual([
      {
        key: "dialog-user-1",
        value: {
          id: "dialog-1",
          title: "Recovered remotely",
          updatedAt: "2026-04-13T00:00:00.000Z",
          serverOrigin: "https://backup",
        },
      },
    ]);
    expect(loggerWarnMock).toHaveBeenCalledTimes(1);
  });

  it("returns local data immediately and revalidates against remote servers in the background", async () => {
    const readAction = await loadReadAction();
    const localData = {
      id: "dialog-1",
      title: "Local dialog",
      updatedAt: "2026-04-13T00:00:00.000Z",
    };

    fetchFromClientDbMock.mockImplementation(async () => localData);
    fetchFromServerMock.mockImplementation(async () => null);

    const result = await readAction(
      {
        dbKey: "dialog-user-1",
        preferredServerOrigin: "https://preferred",
      },
      {
        extra: { db: { put: async () => undefined } },
        getState: () => ({}),
      } as any
    );

    expect(result).toEqual({
      ...localData,
      dbKey: "dialog-user-1",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    expect((fetchFromServerMock.mock.calls as any[]).map(([server]: any[]) => server)).toEqual([
      "https://preferred",
      "https://backup",
    ]);
  });

  it("adds public nolo cluster servers for builtin platform agent reads", async () => {
    const readAction = await loadReadAction();

    fetchFromServerMock.mockImplementation(async (server: string) => {
      if (server === "https://nolo.chat") {
        return {
          id: "01NOLOAPPBLD000000019KCKT0",
          name: "nolo",
          updatedAt: "2026-05-24T00:00:00.000Z",
        };
      }
      return null;
    });

    const result = await readAction(
      {
        dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
      },
      {
        extra: { db: { put: async () => undefined } },
        getState: () => ({}),
      } as any
    );

    expect((fetchFromServerMock.mock.calls as any[]).map(([server]: any[]) => server)).toEqual([
      "https://preferred",
      "https://backup",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
    expect(result).toMatchObject({
      dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
      name: "nolo",
      serverOrigin: "https://nolo.chat",
    });
  });

  it("returns builtin Nolo public agent records as stored online", async () => {
    const readAction = await loadReadAction();
    const putCalls: Array<{ key: string; value: any }> = [];
    const clientDb = {
      put: async (key: string, value: any) => {
        putCalls.push({ key, value });
      },
    };

    fetchFromServerMock.mockImplementation(async (server: string) => {
      if (server === "https://nolo.chat") {
        return {
          id: "01NOLOAPPBLD000000019KCKT0",
          dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
          name: "nolo",
          prompt: "online prompt",
          tools: ["fetchWebpage", "runStreamingAgent"],
          updatedAt: "2026-05-24T00:00:00.000Z",
        };
      }
      return null;
    });

    const result = await readAction(
      {
        dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
      },
      {
        extra: { db: clientDb },
        getState: () => ({}),
      } as any
    );

    expect(result.tools).toEqual(["fetchWebpage", "runStreamingAgent"]);
    expect(result.prompt).toContain("online prompt");
    expect(result.prompt).not.toContain("用户明确要求删除自己的对话");
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0]).toMatchObject({
      key: "agent-pub-01NOLOAPPBLD000000019KCKT0",
      value: {
        dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
        serverOrigin: "https://nolo.chat",
      },
    });
    expect(putCalls[0]?.value.tools).toEqual(["fetchWebpage", "runStreamingAgent"]);
    expect(putCalls[0]?.value.prompt).toBe("online prompt");
  });

  it("returns builtin Nolo public agent local cache hits as stored", async () => {
    const readAction = await loadReadAction();
    fetchFromClientDbMock.mockImplementation(async () => ({
      id: "01NOLOAPPBLD000000019KCKT0",
      dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
      name: "nolo",
      prompt: "cached prompt",
      tools: ["fetchWebpage", "runStreamingAgent"],
      updatedAt: "2026-05-24T00:00:00.000Z",
    }));

    const result = await readAction(
      {
        dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
      },
      {
        extra: { db: { put: async () => undefined } },
        getState: () => ({}),
      } as any
    );

    expect(result.tools).toEqual(["fetchWebpage", "runStreamingAgent"]);
    expect(result.prompt).toContain("cached prompt");
    expect(result.prompt).not.toContain("用户明确要求删除自己的对话");
  });

  it("uses owner authority registry as the preferred server when no caller preference exists", async () => {
    const readAction = await loadReadAction();
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
          id: "dialog-1",
          title: "Authority dialog",
          updatedAt: "2026-05-27T00:00:00.000Z",
        };
      }
      return null;
    });

    const result = await readAction(
      {
        dbKey: "dialog-user1-01DIALOG",
      },
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
      serverOrigin: "https://self.example.com",
    });
  });
});
