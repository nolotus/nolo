import { afterEach, describe, expect, it, mock } from "bun:test";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realQueryRequest = { ...(await import("database/client/queryRequest")) };
const realSyncAppRecord = { ...(await import("./actions/syncAppRecord")) };

let moduleVersion = 0;
const originalFetch = globalThis.fetch;

const createDb = (records: unknown[]) => ({
  async *iterator() {
    for (const record of records) {
      const dbKey =
        record &&
        typeof record === "object" &&
        typeof (record as { dbKey?: unknown }).dbKey === "string"
          ? (record as { dbKey: string }).dbKey
          : `record-${Math.random()}`;
      yield [dbKey, record];
    }
  },
  put: async () => undefined,
});

const restoreLeakedModuleMocks = () => {
  mock.module("database/client/queryRequest", () => realQueryRequest);
  mock.module("./actions/syncAppRecord", () => realSyncAppRecord);
};

async function loadFetchOwnedApps() {
  mock.module("database/client/queryRequest", () => ({
    ...realQueryRequest,
    noloQueryRequest: async () => ({
      ok: false,
      json: async () => ({ data: { data: [] } }),
    }),
  }));

  const mod = await import(`./fetchOwnedApps`);
  return mod.fetchOwnedApps;
}

async function loadFetchOwnedAppsWithRemote(remoteItems: unknown[]) {
  const syncAppRecordMock = mock((_appKey: string, _appRecord: Record<string, unknown>) => ({
    type: "sync-app-record",
  }));

  mock.module("database/client/queryRequest", () => ({
    ...realQueryRequest,
    noloQueryRequest: async () => ({
      ok: true,
      json: async () => ({ data: { data: remoteItems } }),
    }),
  }));
  mock.module("./actions/syncAppRecord", () => ({
    syncAppRecord: syncAppRecordMock,
  }));

  const mod = await import(`./fetchOwnedApps`);
  return { fetchOwnedApps: mod.fetchOwnedApps, syncAppRecordMock };
}

describe("fetchOwnedApps local record normalization", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restore();
    // Re-register real modules so later suites (e.g. queryRequest.test.ts)
    // do not inherit sticky mock.module replacements.
    restoreLeakedModuleMocks();
  });

  it("derives appId from cached dbKey when older local records omit appId", async () => {
    const fetchOwnedApps = await loadFetchOwnedApps();

    const action = await fetchOwnedApps({
      userId: "u1",
      server: "https://nolo.chat",
      servers: ["https://nolo.chat"],
    })(
      () => undefined,
      () => ({}),
      { db: createDb([
        {
          dbKey: "app-u1-demo",
          userId: "u1",
          name: "Demo",
          updatedAt: 1710000000000,
          createdAt: 1710000000000,
          serverOrigin: "https://us.nolo.chat",
        },
      ]), tokenManager: null }
    );

    expect(action.type).toBe("app/fetchOwnedApps/fulfilled");
    expect(action.payload).toEqual([
      expect.objectContaining({
        appId: "demo",
        appKey: "app-u1-demo",
        url: "https://us.nolo.chat/apps/demo/",
      }),
    ]);
  });

  it("drops stale cached apps when the origin server confirms they were deleted", async () => {
    const { fetchOwnedApps } = await loadFetchOwnedAppsWithRemote([]);

    const action = await fetchOwnedApps({
      userId: "u1",
      server: "https://nolo.chat",
      servers: ["https://us.nolo.chat"],
    })(
      () => undefined,
      () => ({}),
      {
        db: createDb([
          {
            dbKey: "app-u1-deleted",
            userId: "u1",
            name: "Deleted Demo",
            appKey: "app-u1-deleted",
            appId: "deleted",
            updatedAt: 1710000000000,
            createdAt: 1710000000000,
            serverOrigin: "https://us.nolo.chat",
          },
        ]),
        tokenManager: null,
      }
    );

    expect(action.type).toBe("app/fetchOwnedApps/fulfilled");
    expect(action.payload).toEqual([]);
  });

  it("keeps local tombstones winning over older remote live app records", async () => {
    const { fetchOwnedApps } = await loadFetchOwnedAppsWithRemote([
      {
        dbKey: "app-u1-deleted",
        userId: "u1",
        name: "Deleted Demo",
        appKey: "app-u1-deleted",
        appId: "deleted",
        updatedAt: "2026-03-27T08:00:00.000Z",
        createdAt: "2026-03-27T07:00:00.000Z",
      },
    ]);

    const action = await fetchOwnedApps({
      userId: "u1",
      server: "https://nolo.chat",
      servers: ["https://us.nolo.chat"],
    })(
      () => undefined,
      () => ({}),
      {
        db: createDb([
          {
            dbKey: "app-u1-deleted",
            userId: "u1",
            name: "Deleted Demo",
            appKey: "app-u1-deleted",
            appId: "deleted",
            updatedAt: "2026-03-27T09:00:00.000Z",
            createdAt: "2026-03-27T07:00:00.000Z",
            deletedAt: "2026-03-27T09:00:00.000Z",
            serverOrigin: "https://us.nolo.chat",
          },
        ]),
        tokenManager: null,
      }
    );

    expect(action.type).toBe("app/fetchOwnedApps/fulfilled");
    expect(action.payload).toEqual([]);
  });

  it("mirrors newer remote owned app records back to the current server", async () => {
    const { fetchOwnedApps, syncAppRecordMock } = await loadFetchOwnedAppsWithRemote([
      {
        dbKey: "app-u1-remote",
        userId: "u1",
        name: "Remote Demo",
        appKey: "app-u1-remote",
        appId: "remote",
        code: "export default { fetch(){ return new Response('ok'); } }",
        updatedAt: "2026-03-30T04:00:00.000Z",
        createdAt: "2026-03-30T04:00:00.000Z",
      },
    ]);
    const dispatched: unknown[] = [];

    const action = await fetchOwnedApps({
      userId: "u1",
      server: "http://localhost",
      servers: ["https://us.nolo.chat"],
    })(
      (input: unknown) => {
        dispatched.push(input);
        return input;
      },
      () => ({}),
      {
        db: createDb([]),
        tokenManager: null,
      }
    );

    expect(action.type).toBe("app/fetchOwnedApps/fulfilled");
    expect(syncAppRecordMock).toHaveBeenCalledWith(
      "app-u1-remote",
      expect.objectContaining({
        userId: "u1",
        appId: "remote",
        code: expect.stringContaining("new Response"),
        serverOrigin: "https://us.nolo.chat",
      }),
      { includeCurrentServer: true }
    );
    expect(dispatched).toContainEqual({ type: "sync-app-record" });
  });

  it("uses app list responses when an auth token can hydrate custom domains", async () => {
    const { fetchOwnedApps } = await loadFetchOwnedAppsWithRemote([]);
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : input.toString();
      expect(url).toBe("https://us.nolo.chat/api/app/list");
      return new Response(
        JSON.stringify({
          success: true,
          workers: [
            {
              appId: "consult",
              appKey: "app-u1-consult",
              userFriendlyName: "Consult App",
              customUrl: "https://nolotus.com",
              modifiedOn: "2026-03-15T00:00:00.000Z",
              visibility: "private",
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const action = await fetchOwnedApps({
      userId: "u1",
      server: "https://nolo.chat",
      servers: ["https://us.nolo.chat"],
      authToken: "token",
    })(
      () => undefined,
      () => ({}),
      {
        db: createDb([]),
        tokenManager: null,
      }
    );

    expect(action.type).toBe("app/fetchOwnedApps/fulfilled");
    expect(action.payload).toEqual([
      expect.objectContaining({
        appId: "consult",
        appKey: "app-u1-consult",
        name: "Consult App",
        customUrl: "https://nolotus.com",
        serverOrigin: "https://us.nolo.chat",
      }),
    ]);
  });

  it("refreshes cached apps from their recorded origin server", async () => {
    const { fetchOwnedApps } = await loadFetchOwnedAppsWithRemote([]);
    const requestedUrls: string[] = [];
    globalThis.fetch = mock(async (input: RequestInfo | URL) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : input.toString();
      requestedUrls.push(url);
      return new Response(
        JSON.stringify({
          success: true,
          workers: url.startsWith("https://us.nolo.chat")
            ? [
                {
                  appId: "consult",
                  appKey: "app-u1-consult",
                  userFriendlyName: "Consult App",
                  customUrl: "https://nolotus.com",
                  modifiedOn: "2026-03-15T00:00:00.000Z",
                  visibility: "private",
                },
              ]
            : [],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const action = await fetchOwnedApps({
      userId: "u1",
      server: "http://127.0.0.1:38223",
      servers: ["http://127.0.0.1:38223"],
      authToken: "token",
    })(
      () => undefined,
      () => ({}),
      {
        db: createDb([
          {
            dbKey: "app-u1-consult",
            userId: "u1",
            name: "Consult App",
            appKey: "app-u1-consult",
            appId: "consult",
            updatedAt: "2026-03-14T00:00:00.000Z",
            createdAt: "2026-03-14T00:00:00.000Z",
            serverOrigin: "https://us.nolo.chat",
          },
        ]),
        tokenManager: null,
      }
    );

    expect(action.type).toBe("app/fetchOwnedApps/fulfilled");
    expect(requestedUrls).toEqual([
      "http://127.0.0.1:38223/api/app/list",
      "https://us.nolo.chat/api/app/list",
    ]);
    expect(action.payload).toEqual([
      expect.objectContaining({
        appId: "consult",
        customUrl: "https://nolotus.com",
        serverOrigin: "https://us.nolo.chat",
      }),
    ]);
  });
});
