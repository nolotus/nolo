import { describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;
const fetchAndCacheMessagesMock = mock(async (_options?: any) => [] as any[]);
const getRuntimeServerContextMock = mock(() => ({
  currentToken: "token-1",
  remoteServers: ["https://chat.example.test"],
}));

const fetchAndCacheMessagesLocalFirstMock = mock(async (options?: any) => {
  const messages = await fetchAndCacheMessagesMock(options);
  return {
    localMessages: messages,
    remotePromise: Promise.resolve(messages),
    earlyReturned: false,
  };
}) as any;

mock.module("./fetchAndCacheMessages", () => ({
  fetchAndCacheMessages: fetchAndCacheMessagesMock,
  fetchAndCacheMessagesLocalFirst: fetchAndCacheMessagesLocalFirstMock,
}));

const loadMessageThunks = async () => {
  const actualRuntimeServerContext = await import("database/runtimeServerContext");

  mock.module("database/runtimeServerContext", () => ({
    ...actualRuntimeServerContext,
    getRuntimeServerContext: getRuntimeServerContextMock,
  }));

  const mod = await import(`./messageSlice.ts`);
  return {
    initMsgs: mod.initMsgs,
    loadOlderMessages: mod.loadOlderMessages,
  };
};

describe("initMsgs", () => {
  it("still loads persisted messages even when the route state marks the dialog as new", async () => {
    const { initMsgs } = await loadMessageThunks();

    const localMessage = {
      id: "msg-001",
      dbKey: "dialog-dialog-1-msg-msg-001",
      role: "user",
      content: "hello",
      createdAt: "2026-03-06T00:00:00.000Z",
    };

    fetchAndCacheMessagesMock.mockClear();
    getRuntimeServerContextMock.mockClear();
    fetchAndCacheMessagesMock.mockResolvedValue([localMessage]);

    const db = {};

    const dispatch = mock((action: any) => action);
    const state = {
      auth: {
        currentToken: "token-1",
      },
      settings: {
        currentServer: "https://chat.example.test",
        syncServers: [],
      },
      db: {
        entities: {},
      },
    } as any;
    const getState = () => state;

    const result = await initMsgs({
      dialogId: "dialog-1",
      dialogKey: "dialog-user-dialog-1",
      limit: 20,
      isNew: true,
    })(dispatch as any, getState, { db });

    expect(fetchAndCacheMessagesMock).toHaveBeenCalledTimes(1);
    expect(getRuntimeServerContextMock).toHaveBeenCalledWith(state);
    expect(fetchAndCacheMessagesMock).toHaveBeenCalledWith({
      db,
      dialogId: "dialog-1",
      dialogKey: "dialog-user-dialog-1",
      limit: 20,
      token: "token-1",
      remoteServers: ["https://chat.example.test"],
      signal: expect.any(AbortSignal),
    });
    expect(result.type).toEndWith("/fulfilled");
    expect(result.payload).toHaveLength(1);
    expect(result.payload.map((msg: any) => msg.id)).toEqual(["msg-001"]);
  });

  it("passes dialogKey through older-message loads when available", async () => {
    const { loadOlderMessages } = await loadMessageThunks();

    fetchAndCacheMessagesMock.mockClear();
    getRuntimeServerContextMock.mockClear();
    fetchAndCacheMessagesMock.mockResolvedValue([]);

    const db = {};
    const dispatch = mock((action: any) => action);
    const state = {
      auth: {
        currentToken: "token-1",
      },
      settings: {
        currentServer: "https://chat.example.test",
        syncServers: [],
      },
      db: {
        entities: {},
      },
    } as any;
    const getState = () => state;

    const result = await loadOlderMessages({
      dialogId: "dialog-1",
      dialogKey: "dialog-user-dialog-1",
      beforeKey: "dialog-user-dialog-1-msg-oldest",
      limit: 30,
    })(dispatch as any, getState, { db });

    expect(fetchAndCacheMessagesMock).toHaveBeenCalledTimes(1);
    expect(getRuntimeServerContextMock).toHaveBeenCalledWith(state);
    expect(fetchAndCacheMessagesMock).toHaveBeenCalledWith({
      db,
      dialogId: "dialog-1",
      dialogKey: "dialog-user-dialog-1",
      limit: 30,
      beforeKey: "dialog-user-dialog-1-msg-oldest",
      token: "token-1",
      remoteServers: ["https://chat.example.test"],
      signal: expect.any(AbortSignal),
    });
    expect(result.type).toEndWith("/fulfilled");
  });
});
