/**
 * Device-local Space slice B1 — open/fresh-fetch local Space while logged in.
 * Local body authority wins; remote miss must never erase a local Space.
 */
import { afterEach, describe, expect, it, mock } from "bun:test";
import { DEVICE_LOCAL_OWNER_ID } from "database/authority/deviceLocal";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realEnv = { ...(await import("app/utils/env")) };
const realCommon = { ...(await import("database/actions/common")) };
const realDbSlice = { ...(await import("database/dbSlice")) };

let moduleVersion = 0;
const testToken =
  "eyJ1c2VySWQiOiJ1c2VyMSIsInVzZXJuYW1lIjoidXNlcjEifQ==.signature";

const restoreLeakedModuleMocks = () => {
  mock.module("app/utils/env", () => realEnv);
  mock.module("database/actions/common", () => realCommon);
  mock.module("database/dbSlice", () => realDbSlice);
};

const localSpaceBody = {
  id: "01LOCALFRESH000000000001",
  name: "Device Local Space",
  ownerId: DEVICE_LOCAL_OWNER_ID,
  userId: DEVICE_LOCAL_OWNER_ID,
  members: [DEVICE_LOCAL_OWNER_ID],
};

const loadFetchSpaceAction = async (localByKey: Record<string, unknown>) => {
  // Spread real env exports — partial mocks strip isProduction for dbSlice/deps.
  mock.module("app/utils/env", () => ({
    ...realEnv,
    getIsDesktopApp: () => false,
  }));
  mock.module("database/actions/common", () => ({
    ...realCommon,
    fetchFromServer: async (server: string, dbKey: string) => {
      const response = await globalThis.fetch(
        `${server}/api/v1/db/read/${dbKey}`
      );
      return response.status === 200 ? response.json() : null;
    },
  }));
  // Full surface: incomplete dbSlice mocks leak and break sibling suites
  // (e.g. removeCachedEntity for chat/dialog imports under create tests).
  const act = (type: string) => (payload: any) => ({
    type,
    payload,
    meta: { arg: payload },
  });
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    write: act("db/write"),
    patch: act("db/patch"),
    read: (input: { dbKey: string }) => ({
      type: "db/read",
      payload: input,
      unwrap: async () => localByKey[input.dbKey] ?? null,
    }),
    remove: act("db/remove"),
    readAndWait: (dbKey: string) => ({
      type: "db/readAndWait",
      payload: dbKey,
      unwrap: async () => localByKey[dbKey] ?? null,
    }),
    purge: act("db/purge"),
    upsert: act("db/upsert"),
    upload: act("db/upload"),
    readFileContent: act("db/readFileContent"),
    share: act("db/share"),
    upsertSSREntity: act("db/upsertSSREntity"),
    removeCachedEntity: act("db/removeCachedEntity"),
    selectById: () => undefined,
    selectEntities: () => ({}),
    selectAll: () => [],
    selectIds: () => [],
    selectTotal: () => 0,
    dbAdapter: { getSelectors: () => ({}) },
    default: () => null,
  }));
  // Keep mocks active for the test body; afterEach restores.
  const mod = await import(`./fetchSpaceAction.ts?deviceLocal=${moduleVersion++}`);
  return mod.fetchSpaceAction;
};

const createLoggedInThunkApi = () => {
  const dispatch = mock((action: any) => {
    if (action && typeof action.unwrap === "function") {
      return action;
    }
    return {
      unwrap: async () => {
        throw new Error(`unexpected dispatch: ${JSON.stringify(action)}`);
      },
    };
  });
  return {
    getState: () => ({
      auth: {
        currentToken: testToken,
        currentUser: { id: "user1", userId: "user1" },
      },
      settings: {
        currentServer: "http://127.0.0.1:38123",
        syncServers: [],
      },
    }),
    extra: {},
    dispatch,
  } as any;
};

const createGuestThunkApi = () => {
  const dispatch = mock((action: any) => {
    if (action && typeof action.unwrap === "function") {
      return action;
    }
    return {
      unwrap: async () => {
        throw new Error(`unexpected dispatch: ${JSON.stringify(action)}`);
      },
    };
  });
  return {
    getState: () => ({
      auth: {
        currentToken: null,
        currentUser: null,
      },
      settings: {
        currentServer: "http://127.0.0.1:38123",
        syncServers: ["http://backup.example"],
      },
    }),
    extra: {},
    dispatch,
  } as any;
};

describe("fetchSpaceAction device-local body authority", () => {
  afterEach(() => {
    mock.restore();
    restoreLeakedModuleMocks();
  });

  it("fresh-fetch uses local body authority when logged in (never remote miss)", async () => {
    const fetchSpaceAction = await loadFetchSpaceAction({
      "space-01LOCALFRESH000000000001": localSpaceBody,
    });
    const remoteHits: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      remoteHits.push(String(input));
      return new Response(JSON.stringify({ error: "Not Found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;

    try {
      const result = await fetchSpaceAction(
        { spaceId: "01LOCALFRESH000000000001", fresh: true },
        createLoggedInThunkApi()
      );

      expect(result.spaceId).toBe("01LOCALFRESH000000000001");
      expect(result.spaceData).toMatchObject({
        name: "Device Local Space",
        ownerId: DEVICE_LOCAL_OWNER_ID,
        userId: DEVICE_LOCAL_OWNER_ID,
      });
      expect(remoteHits).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("guest fresh-fetch does not call remote even when servers are configured", async () => {
    const fetchSpaceAction = await loadFetchSpaceAction({
      "space-01LOCALFRESH000000000001": localSpaceBody,
    });
    const remoteHits: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      remoteHits.push(String(input));
      return new Response("should not be called", { status: 500 });
    }) as any;

    try {
      const result = await fetchSpaceAction(
        { spaceId: "01LOCALFRESH000000000001", fresh: true },
        createGuestThunkApi()
      );

      expect(result.spaceData.name).toBe("Device Local Space");
      expect(remoteHits).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("account Space fresh still uses remote authority (not local body short-circuit)", async () => {
    const accountBody = {
      id: "live",
      name: "Stale Local Copy",
      ownerId: "user1",
      userId: "user1",
      members: ["user1"],
    };
    const fetchSpaceAction = await loadFetchSpaceAction({
      "space-live": accountBody,
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("space-live")) {
        return new Response(
          JSON.stringify({
            id: "live",
            name: "Fresh Remote",
            ownerId: "user1",
            members: ["user1"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const result = await fetchSpaceAction(
        { spaceId: "live", fresh: true },
        createLoggedInThunkApi()
      );

      expect(result.spaceData).toMatchObject({
        id: "live",
        name: "Fresh Remote",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("account Space remote miss still fails (does not fall back to non-local local body)", async () => {
    // No local body → remote miss throws (existing account semantics).
    const fetchSpaceAction = await loadFetchSpaceAction({});
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("space-missing-account")) {
        return new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      await expect(
        fetchSpaceAction(
          { spaceId: "missing-account", fresh: true },
          createLoggedInThunkApi()
        )
      ).rejects.toThrow("Space not found");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
