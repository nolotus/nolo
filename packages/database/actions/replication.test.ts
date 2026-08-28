import { afterEach, describe, expect, it, mock } from "bun:test";

import * as realRequests from "../requests";

const syncWithServersMock = mock((..._args: any[]): any => undefined);
const noloDeleteRequestMock = mock(async (..._args: any[]): Promise<any> => true);
const noloPatchRequestMock = mock(async (..._args: any[]): Promise<any> => true);
const noloUploadRequestMock = mock(async (..._args: any[]): Promise<any> => true);
const noloWriteRequestMock = mock(async (..._args: any[]): Promise<any> => true);

let moduleVersion = 0;

function setupModuleMocks() {
  mock.module("../requests", () => ({
    ...realRequests,
    syncWithServers: syncWithServersMock,
    noloDeleteRequest: noloDeleteRequestMock,
    noloPatchRequest: noloPatchRequestMock,
    noloUploadRequest: noloUploadRequestMock,
    noloWriteRequest: noloWriteRequestMock,
  }));
}

async function loadModule() {
  setupModuleMocks();
  const mod = await import(`./replication.ts`);
  mock.restore();
  return mod;
}

afterEach(() => {
  mock.restore();
  syncWithServersMock.mockClear();
  noloDeleteRequestMock.mockReset();
  noloPatchRequestMock.mockReset();
  noloUploadRequestMock.mockReset();
  noloWriteRequestMock.mockReset();
  noloDeleteRequestMock.mockImplementation(async () => true);
  noloPatchRequestMock.mockImplementation(async () => true);
  noloUploadRequestMock.mockImplementation(async () => true);
  noloWriteRequestMock.mockImplementation(async () => true);
});

describe("scheduleExistingRecordReplication", () => {
  it("schedules replication for an already-persisted local record without re-writing locally", async () => {
    const { scheduleExistingRecordReplication } = await loadModule();
    syncWithServersMock.mockClear();

    const servers = scheduleExistingRecordReplication({
      currentServer: "http://localhost",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "page-user-1-doc-1",
      localData: {
        dbKey: "page-user-1-doc-1",
        userId: "user-1",
        title: "already local",
      },
      state: {
        auth: {
          currentUser: {
            userId: "user-1",
          },
        },
      },
    });

    expect(servers).toEqual([
      "http://localhost",
      "https://us.nolo.chat",
      "https://nolo.chat",
    ]);

    await Promise.resolve();
    await Promise.resolve();

    expect(noloWriteRequestMock).toHaveBeenCalledWith(
      "http://localhost",
      expect.objectContaining({
        customKey: "page-user-1-doc-1",
        userId: "user-1",
      }),
      expect.any(Object)
    );
    expect(syncWithServersMock).toHaveBeenCalledTimes(1);
    const [scheduledServers, requestFn, message, request] =
      (syncWithServersMock.mock.calls as any[])[0];
    expect(scheduledServers).toEqual([
      "https://us.nolo.chat",
      "https://nolo.chat",
    ]);
    expect(typeof requestFn).toBe("function");
    expect(message).toContain("Backup write sync failed for page-user-1-doc-1");
    expect(request).toEqual(
      expect.objectContaining({
        customKey: "page-user-1-doc-1",
        userId: "user-1",
        data: expect.objectContaining({
          dbKey: "page-user-1-doc-1",
          title: "already local",
        }),
      })
    );
  });

  it("skips replication for readonly public agent records", async () => {
    const { scheduleExistingRecordReplication } = await loadModule();
    syncWithServersMock.mockClear();

    const servers = scheduleExistingRecordReplication({
      currentServer: "https://us.nolo.chat",
      syncServers: ["https://nolo.chat"],
      dbKey: "agent-pub-01JYRSTM0MPPGQC9S25S3Y9J20",
      localData: {
        dbKey: "agent-pub-01JYRSTM0MPPGQC9S25S3Y9J20",
        userId: "someone-else",
      },
      state: {
        auth: {
          currentUser: {
            userId: "user-1",
          },
        },
      },
    });

    expect(servers).toEqual([]);

    await Promise.resolve();

    expect(syncWithServersMock).not.toHaveBeenCalled();
  });

  it("skips replication for records owned by a different user", async () => {
    const { scheduleExistingRecordReplication } = await loadModule();
    syncWithServersMock.mockClear();

    const servers = scheduleExistingRecordReplication({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "agent-other-user-01AGENT",
      localData: {
        dbKey: "agent-other-user-01AGENT",
        userId: "other-user",
      },
      state: {
        auth: {
          currentUser: {
            userId: "current-user",
          },
        },
      },
    });

    expect(servers).toEqual([]);

    await Promise.resolve();

    expect(noloWriteRequestMock).not.toHaveBeenCalled();
    expect(syncWithServersMock).not.toHaveBeenCalled();
  });

  it("returns an empty server list when replication has no available peers", async () => {
    const { scheduleExistingRecordReplication } = await loadModule();
    syncWithServersMock.mockClear();

    const servers = scheduleExistingRecordReplication({
      currentServer: undefined,
      syncServers: [],
      dbKey: "page-user-2-doc-1",
      localData: {
        dbKey: "page-user-2-doc-1",
      },
      state: {},
    });

    expect(servers).toEqual([]);

    await Promise.resolve();

    expect(syncWithServersMock).not.toHaveBeenCalled();
  });
});

describe("resolveTenantReplicationServers", () => {
  it("keeps tenant-targeted upload planning out of uploadAction", async () => {
    const { resolveTenantReplicationServers } = await loadModule();

    const servers = resolveTenantReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      tenantId: "user-1",
    });

    expect(servers).toContain("https://nolo.chat");
    expect(servers).toContain("https://us.nolo.chat");
    expect(servers.length).toBeGreaterThan(0);
  });
});

describe("resolveUploadReplicationServers", () => {
  it("routes user-owned file uploads to the user's authority server first", async () => {
    const { resolveUploadReplicationServers } = await loadModule();

    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const servers = resolveUploadReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      tenantId: "user-1",
      uploadConfig: {
        file,
        metadata: {
          dbKey: "file-user-1-aaa",
          userId: "user-1",
        },
        customKey: "file-user-1-aaa",
        userId: "user-1",
      },
      state: {
        auth: {
          currentUser: {
            userId: "user-1",
          },
        },
        settings: {
          userAuthorityRegistry: {
            "user-1": "https://self.example.com",
          },
        },
      },
    });

    expect(servers).toEqual([
      "https://self.example.com",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
  });
});

describe("scheduleUploadReplication", () => {
  it("schedules upload sync through replication helpers", async () => {
    const { scheduleUploadReplication } = await loadModule();
    syncWithServersMock.mockClear();

    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const servers = scheduleUploadReplication({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      tenantId: "user-1",
      uploadConfig: {
        file,
        metadata: { dbKey: "file-user-1-aaa", id: "aaa" },
        customKey: "file-user-1-aaa",
        userId: "user-1",
      },
      state: {},
    });

    expect(servers).toContain("https://nolo.chat");
    expect(servers).toContain("https://us.nolo.chat");

    await Promise.resolve();

    expect(syncWithServersMock).toHaveBeenCalledTimes(1);
    const [scheduledServers, requestFn, message, request] =
      (syncWithServersMock.mock.calls as any[])[0];
    expect(scheduledServers).toEqual(servers);
    expect(typeof requestFn).toBe("function");
    expect(message).toContain("Upload sync failed for file-user-1-aaa");
    expect(request).toEqual(
      expect.objectContaining({
        customKey: "file-user-1-aaa",
        userId: "user-1",
        metadata: expect.objectContaining({
          dbKey: "file-user-1-aaa",
          id: "aaa",
        }),
      })
    );
  });

  it("can exclude the current server after a primary upload succeeds", async () => {
    const { scheduleUploadReplication } = await loadModule();
    syncWithServersMock.mockClear();

    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const servers = scheduleUploadReplication({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      tenantId: "user-1",
      uploadConfig: {
        file,
        metadata: { dbKey: "file-user-1-bbb", id: "bbb" },
        customKey: "file-user-1-bbb",
        userId: "user-1",
      },
      state: {},
      excludeServers: ["https://nolo.chat"],
    });

    expect(servers).not.toContain("https://nolo.chat");
    expect(servers).toContain("https://us.nolo.chat");

    await Promise.resolve();

    const [scheduledServers] = (syncWithServersMock.mock.calls as any[])[0];
    expect(scheduledServers).toEqual(servers);
  });
});

describe("uploadToCurrentServer", () => {
  it("awaits a primary upload on the active server", async () => {
    const { uploadToCurrentServer } = await loadModule();
    noloUploadRequestMock.mockClear();

    const file = new File(["hello"], "hello.txt", { type: "text/plain" });
    const result = await uploadToCurrentServer({
      currentServer: "https://nolo.chat",
      uploadConfig: {
        file,
        metadata: { dbKey: "file-user-1-ccc", id: "ccc" },
        customKey: "file-user-1-ccc",
        userId: "user-1",
      },
      state: {},
    });

    expect(result).toBe(true);
    expect(noloUploadRequestMock).toHaveBeenCalledWith(
      "https://nolo.chat",
      expect.objectContaining({
        customKey: "file-user-1-ccc",
        userId: "user-1",
      }),
      {}
    );
  });
});

describe("scheduleConfiguredPatchReplication", () => {
  it("resolves peers and delegates patch sync through replication helpers", async () => {
    const { scheduleConfiguredPatchReplication } = await loadModule();
    syncWithServersMock.mockClear();
    noloPatchRequestMock.mockClear();

    const servers = scheduleConfiguredPatchReplication({
      currentServer: "http://localhost",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "page-user-1-doc-1",
      changes: { title: "patched" },
      state: {},
    });

    expect(servers).toEqual([
      "http://localhost",
      "https://us.nolo.chat",
      "https://nolo.chat",
    ]);

    await Promise.resolve();
    await Promise.resolve();

    expect(syncWithServersMock).toHaveBeenCalledTimes(1);
    const [scheduledServers, , message, scheduledDbKey, scheduledChanges] =
      (syncWithServersMock.mock.calls as any[])[0];
    expect(noloPatchRequestMock).toHaveBeenCalledWith(
      "http://localhost",
      "page-user-1-doc-1",
      { title: "patched" },
      {},
      undefined,
      { failureLogLevel: "warn" },
    );
    expect(scheduledServers).toEqual([
      "https://us.nolo.chat",
      "https://nolo.chat",
    ]);
    expect(message).toContain("Backup patch sync failed for page-user-1-doc-1");
    expect(scheduledDbKey).toBe("page-user-1-doc-1");
    expect(scheduledChanges).toEqual({ title: "patched" });
  });

  it("places owner authority before current server replicas for patch sync", async () => {
    const { scheduleConfiguredPatchReplication } = await loadModule();
    noloPatchRequestMock.mockClear();

    const servers = scheduleConfiguredPatchReplication({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "dialog-user1-01DIALOG",
      changes: { title: "Moved user dialog" },
      state: {
        auth: { currentUser: { userId: "user1" } },
        settings: {
          userAuthorityRegistry: {
            user1: "https://self.example.com",
          },
        },
      },
    });

    expect(servers).toEqual([
      "https://self.example.com",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);

    await Promise.resolve();
    await Promise.resolve();

    expect(noloPatchRequestMock.mock.calls[0]?.[0]).toBe(
      "https://self.example.com"
    );
  });
});

describe("scheduleDeleteReplication", () => {
  it("resolves peers and runs background deletes with preferred server first", async () => {
    const { scheduleDeleteReplication } = await loadModule();
    noloDeleteRequestMock.mockClear();
    noloDeleteRequestMock.mockImplementation(async (server: string) => server !== "https://us.nolo.chat");

    const results: Array<{ succeeded: string[]; failed: string[] }> = [];
    const servers = scheduleDeleteReplication({
      currentServer: "http://localhost",
      syncServers: ["https://nolo.chat", "https://us.nolo.chat"],
      preferredServerOrigin: "https://us.nolo.chat",
      dbKey: "page-user-2-doc-1",
      state: {},
      onResult: (result: any) => results.push(result),
    });

    expect(servers).toEqual([
      "https://us.nolo.chat",
      "http://localhost",
      "https://nolo.chat",
    ]);

    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect((noloDeleteRequestMock.mock.calls as any[]).map(([server, dbKey]: any[]) => ({ server, dbKey }))).toEqual([
      { server: "https://us.nolo.chat", dbKey: "page-user-2-doc-1" },
      { server: "http://localhost", dbKey: "page-user-2-doc-1" },
      { server: "https://nolo.chat", dbKey: "page-user-2-doc-1" },
    ]);
    expect(results).toEqual([
      {
        succeeded: ["http://localhost", "https://nolo.chat"],
        failed: ["https://us.nolo.chat"],
      },
    ]);
  });

  it("places owner authority before current server replicas for deletes", async () => {
    const { scheduleDeleteReplication } = await loadModule();
    noloDeleteRequestMock.mockClear();

    const servers = scheduleDeleteReplication({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "dialog-user1-01DIALOG",
      state: {
        auth: { currentUser: { userId: "user1" } },
        settings: {
          userAuthorityRegistry: {
            user1: "https://self.example.com",
          },
        },
      },
    });

    expect(servers).toEqual([
      "https://self.example.com",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);

    await Promise.resolve();
    await Promise.resolve();

    expect((noloDeleteRequestMock.mock.calls as any[]).map(([server]: any[]) => server)).toEqual([
      "https://self.example.com",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
  });
});

describe("resolveAuthorityReplicationServers", () => {
  it("returns an empty server list for local-owner records even with remote configured", async () => {
    const { resolveAuthorityReplicationServers } = await loadModule();

    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "agent-local-01ARANDOMID",
      record: { dbKey: "agent-local-01ARANDOMID", userId: "local" },
      state: {
        auth: { currentUser: { userId: "user1" } },
        settings: { userAuthorityRegistry: { user1: "https://self.example.com" } },
      },
    });

    expect(servers).toEqual([]);
  });

  it("returns an empty server list when record.userId is local even if the key is non-standard", async () => {
    const { resolveAuthorityReplicationServers } = await loadModule();

    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "agent-local-01ARANDOMID",
      record: { dbKey: "agent-local-01ARANDOMID", userId: "local" },
      state: { auth: { currentUser: { userId: "user1" } } },
    });

    expect(servers).toEqual([]);
  });

  it("keeps the existing account-owner planning path unchanged", async () => {
    const { resolveAuthorityReplicationServers } = await loadModule();

    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "dialog-user1-01DIALOG",
      record: { dbKey: "dialog-user1-01DIALOG", userId: "user1" },
      state: {
        auth: { currentUser: { userId: "user1" } },
        settings: {
          userAuthorityRegistry: { user1: "https://self.example.com" },
        },
      },
    });

    expect(servers).toEqual([
      "https://self.example.com",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
  });

  it("returns [] for dialog message keys with record.userId local under primary/backup config", async () => {
    const { resolveAuthorityReplicationServers } = await loadModule();

    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "dialog-01KXXXXXXXXXXXXXXXXXXXXXXX-msg-01MYYYYYYYYYYYYYYYYYYYYYYY",
      record: {
        dbKey: "dialog-01KXXXXXXXXXXXXXXXXXXXXXXX-msg-01MYYYYYYYYYYYYYYYYYYYYYYY",
        userId: "local",
      },
      state: {
        auth: { currentUser: null },
        settings: {},
      },
    });

    expect(servers).toEqual([]);
  });

  it("returns [] for device-local Space body and membership (userId local, normal space-* keys)", async () => {
    const { resolveAuthorityReplicationServers } = await loadModule();

    const spaceBodyServers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "space-01KLOCALSPACEULID000000001",
      record: {
        dbKey: "space-01KLOCALSPACEULID000000001",
        userId: "local",
        ownerId: "local",
        members: ["local"],
        type: "space",
      },
      state: {
        auth: { currentUser: { userId: "account-a" } },
        settings: {
          userAuthorityRegistry: {
            "account-a": "https://self.example.com",
          },
        },
      },
    });
    expect(spaceBodyServers).toEqual([]);

    const memberServers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "space-member-local-01KLOCALSPACEULID000000001",
      record: {
        dbKey: "space-member-local-01KLOCALSPACEULID000000001",
        userId: "local",
        spaceId: "01KLOCALSPACEULID000000001",
        role: "owner",
        type: "space",
      },
      state: {
        auth: { currentUser: { userId: "account-a" } },
        settings: {},
      },
    });
    expect(memberServers).toEqual([]);
  });

  it("returns [] for dialog-local keys even with remote primary/backup configured", async () => {
    const { resolveAuthorityReplicationServers } = await loadModule();

    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "dialog-local-01DIALOG",
      record: { dbKey: "dialog-local-01DIALOG", userId: "local" },
      state: {
        auth: { currentUser: { userId: "user1" } },
        settings: { userAuthorityRegistry: { user1: "https://self.example.com" } },
      },
    });

    expect(servers).toEqual([]);
  });

  it("still plans multi-server replication for non-local authenticated dialog messages", async () => {
    const { resolveAuthorityReplicationServers } = await loadModule();

    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "dialog-01KXXXXXXXXXXXXXXXXXXXXXXX-msg-01MYYYYYYYYYYYYYYYYYYYYYYY",
      record: {
        dbKey: "dialog-01KXXXXXXXXXXXXXXXXXXXXXXX-msg-01MYYYYYYYYYYYYYYYYYYYYYYY",
        userId: "user1",
      },
      state: {
        auth: { currentUser: { userId: "user1" } },
        settings: {
          userAuthorityRegistry: { user1: "https://self.example.com" },
        },
      },
    });

    expect(servers).toEqual([
      "https://self.example.com",
      "https://nolo.chat",
      "https://us.nolo.chat",
    ]);
  });

  it("returns [] for device-local Space body (space-{ULID} + userId local)", async () => {
    const { resolveAuthorityReplicationServers } = await loadModule();

    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "space-01ARZ3NDEKTSV4RRFFQ69G5FAV",
      record: {
        dbKey: "space-01ARZ3NDEKTSV4RRFFQ69G5FAV",
        userId: "local",
        ownerId: "local",
        members: ["local"],
      },
      state: {
        auth: { currentUser: { userId: "user1" } },
        settings: {
          userAuthorityRegistry: { user1: "https://self.example.com" },
        },
      },
    });

    expect(servers).toEqual([]);
  });

  it("returns [] for space-member-local-* membership records", async () => {
    const { resolveAuthorityReplicationServers } = await loadModule();

    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: "space-member-local-01ARZ3NDEKTSV4RRFFQ69G5FAV",
      record: {
        dbKey: "space-member-local-01ARZ3NDEKTSV4RRFFQ69G5FAV",
        userId: "local",
        ownerId: "local",
        spaceId: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      },
      state: {
        auth: { currentUser: null },
        settings: {},
      },
    });

    expect(servers).toEqual([]);
  });
});
