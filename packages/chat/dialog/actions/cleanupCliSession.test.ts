import { afterEach, describe, expect, it, mock } from "bun:test";

const closeCliChatSessionMock = mock(async () => ({ ok: true }));
const patchMock = mock((payload: any) => ({
  type: "db/patch",
  payload,
}));

let moduleVersion = 0;

const loadModule = async () => {
  mock.module("ai/agent/cliChatClient", () => ({
    closeCliChatSession: closeCliChatSessionMock,
  }));
  mock.module("database/dbSlice", () => ({
    patch: patchMock,
  }));

  const mod = await import(`./cleanupCliSession.ts`);
  mock.restore();
  return mod;
};

afterEach(() => {
  closeCliChatSessionMock.mockClear();
  patchMock.mockClear();
  mock.restore();
});

describe("cleanupCliSessionForDialog", () => {
  it("closes the remote cli session and clears persisted cliSessionId", async () => {
    const { cleanupCliSessionForDialog } = await loadModule();
    const dispatch = mock((action: any) => ({
      unwrap: async () => action,
    }));

    await cleanupCliSessionForDialog(
      { dispatch, getState: () => ({}) as any },
      {
        dbKey: "dialog-user-1",
        cliSessionId: "cli-session-1",
      } as any,
    );

    expect(closeCliChatSessionMock).toHaveBeenCalledWith(
      { getState: expect.any(Function) },
      { sessionId: "cli-session-1" },
    );
    expect(patchMock).toHaveBeenCalledWith({
      dbKey: "dialog-user-1",
      changes: {
        cliSessionId: null,
      },
    });
  });

  it("does nothing when no cliSessionId is present", async () => {
    const { cleanupCliSessionForDialog } = await loadModule();
    const dispatch = mock(() => undefined);

    await cleanupCliSessionForDialog(
      { dispatch, getState: () => ({}) as any },
      {
        dbKey: "dialog-user-1",
      } as any,
    );

    expect(closeCliChatSessionMock).not.toHaveBeenCalled();
    expect(patchMock).not.toHaveBeenCalled();
  });
});
