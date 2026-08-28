import { afterEach, describe, expect, it, mock } from "bun:test";

import * as realReplication from "./replication";

const scheduleWriteReplicationMock = mock(() => undefined);
const toastErrorMock = mock(() => undefined);
const getRuntimeServerContextMock = mock((state: any) => ({
  currentToken: state?.auth?.currentToken,
  currentUserId: state?.auth?.currentUser?.userId,
  currentServer: state?.settings?.currentServer,
  syncServers: Array.isArray(state?.settings?.syncServers)
    ? state.settings.syncServers
    : [],
  userAuthorityRegistry: state?.settings?.userAuthorityRegistry,
  remoteServers: [],
}));

let moduleVersion = 0;

function setupModuleMocks() {
  mock.module("./replication", () => ({
    ...realReplication,
    scheduleWriteReplication: scheduleWriteReplicationMock,
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
  const mod = await import(`./write.ts`);
  mock.restore();
  return mod;
}

afterEach(() => {
  mock.restore();
  getRuntimeServerContextMock.mockClear();
});

describe("writeAction", () => {
  it("writes locally first and schedules replication for configured local+remote peers", async () => {
    const { writeAction } = await loadModule();
    scheduleWriteReplicationMock.mockClear();

    const db = {
      put: mock(async () => undefined),
    };

    const result = await writeAction(
      {
        data: {
          type: "page",
          title: "Local-first doc",
          content: "hello",
        },
        customKey: "page-user-1-doc-1",
      },
      {
        extra: { db },
        getState: () => ({
          auth: {
            currentUser: { userId: "user-1" },
          },
          settings: {
            currentServer: "http://localhost",
            syncServers: ["https://us.nolo.chat"],
          },
        }),
      } as any
    );

    expect(db.put).toHaveBeenCalledTimes(1);
    expect(db.put).toHaveBeenCalledWith(
      "page-user-1-doc-1",
      expect.objectContaining({
        dbKey: "page-user-1-doc-1",
        userId: "user-1",
        title: "Local-first doc",
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        dbKey: "page-user-1-doc-1",
        userId: "user-1",
        title: "Local-first doc",
      })
    );

    await Promise.resolve();

    expect(scheduleWriteReplicationMock).toHaveBeenCalledTimes(1);
    const [servers, request] = (scheduleWriteReplicationMock.mock.calls as any[])[0];
    expect(servers).toEqual([
      "http://localhost",
      "https://us.nolo.chat",
      "https://nolo.chat",
    ]);
    expect(request).toEqual(
      expect.objectContaining({
        customKey: "page-user-1-doc-1",
        userId: "user-1",
      })
    );
  });

  it("stays local-only when callers omit all replication servers", async () => {
    const { writeAction } = await loadModule();
    scheduleWriteReplicationMock.mockClear();

    const db = {
      put: mock(async () => undefined),
    };

    const result = await writeAction(
      {
        data: {
          type: "page",
          title: "Default remote doc",
        },
        customKey: "page-user-2-doc-1",
      },
      {
        extra: { db },
        getState: () => ({
          auth: {
            currentUser: { userId: "user-2" },
          },
          settings: {
            currentServer: undefined,
            syncServers: [],
          },
        }),
      } as any
    );

    expect(db.put).toHaveBeenCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        dbKey: "page-user-2-doc-1",
        userId: "user-2",
      })
    );

    await Promise.resolve();

    expect(scheduleWriteReplicationMock).not.toHaveBeenCalled();
  });

  it("preserves the invited user id when writing a space membership record", async () => {
    const { writeAction } = await loadModule();
    scheduleWriteReplicationMock.mockClear();

    const db = {
      put: mock(async () => undefined),
    };

    const result = await writeAction(
      {
        data: {
          type: "space",
          userId: "invited-user",
          role: "guest",
          joinedAt: 123,
          spaceId: "team-space",
          spaceName: "Team Space",
          ownerId: "owner-user",
          visibility: "public",
        },
        customKey: "space-member-invited-user-team-space",
      },
      {
        extra: { db },
        getState: () => ({
          auth: {
            currentUser: { userId: "owner-user" },
          },
          settings: {
            currentServer: "https://nolo.chat",
            syncServers: [],
          },
        }),
      } as any
    );

    expect(db.put).toHaveBeenCalledWith(
      "space-member-invited-user-team-space",
      expect.objectContaining({
        dbKey: "space-member-invited-user-team-space",
        userId: "invited-user",
        role: "guest",
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        dbKey: "space-member-invited-user-team-space",
        userId: "invited-user",
        role: "guest",
      })
    );

    await Promise.resolve();

    expect(scheduleWriteReplicationMock).toHaveBeenCalledTimes(1);
    const [, request] = (scheduleWriteReplicationMock.mock.calls as any[])[0];
    expect(request).toEqual(
      expect.objectContaining({
        customKey: "space-member-invited-user-team-space",
        userId: "invited-user",
        data: expect.objectContaining({
          userId: "invited-user",
          role: "guest",
        }),
      })
    );
  });

  it("schedules user-owned writes to the owner authority before current server replicas", async () => {
    const { writeAction } = await loadModule();
    scheduleWriteReplicationMock.mockClear();

    const db = {
      put: mock(async () => undefined),
    };

    await writeAction(
      {
        data: {
          type: "dialog",
          title: "Moved user dialog",
        },
        customKey: "dialog-user1-01DIALOG",
      },
      {
        extra: { db },
        getState: () => ({
          auth: {
            currentUser: { userId: "user1" },
          },
          settings: {
            currentServer: "https://nolo.chat",
            syncServers: ["https://us.nolo.chat"],
            userAuthorityRegistry: {
              user1: "https://self.example.com",
            },
          },
        }),
      } as any
    );

    const [servers] = (scheduleWriteReplicationMock.mock.calls as any[])[0];
    expect(servers).toEqual([
      "https://self.example.com",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
  });
});
