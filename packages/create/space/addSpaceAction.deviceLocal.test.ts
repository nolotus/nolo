/**
 * Device-local Space foundation — addSpaceAction create path.
 * Guest create shapes, account regression, migration owner classification,
 * explicit write userId stamping (zero-replication authority).
 */
import { afterEach, describe, expect, it, mock } from "bun:test";
import { MemberRole } from "app/types";
import { DEVICE_LOCAL_OWNER_ID } from "database/authority/deviceLocal";
import { resolveAuthorityReplicationServers } from "database/actions/replication";

// Snapshot values before mock.module — Bun mock.restore() does not clear overrides,
// and incomplete selectById would poison sibling suites (e.g. dialog patch).
const realDbSlice = { ...(await import("database/dbSlice")) };
const realEnv = { ...(await import("app/utils/env")) };
const realFetchUserData = { ...(await import("database/client/fetchUserData")) };

let moduleVersion = 0;

const restoreLeakedModuleMocks = () => {
  mock.module("database/dbSlice", () => realDbSlice);
  mock.module("app/utils/env", () => realEnv);
  mock.module("database/client/fetchUserData", () => realFetchUserData);
};

/** Empty migration scan — avoids `db.iterator is not a function` on plain map dbs. */
function mockEmptyFetchUserData() {
  mock.module("database/client/fetchUserData", () => ({
    ...realFetchUserData,
    fetchUserData: async () => ({ dialog: [], page: [] }),
  }));
}

function mockDbSlice() {
  const act = (type: string) => (payload: any) => ({
    type,
    payload,
    meta: { arg: payload },
  });

  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    write: act("db/write"),
    patch: act("db/patch"),
    read: act("db/read"),
    remove: act("db/remove"),
    readAndWait: act("db/readAndWait"),
    purge: act("db/purge"),
    upsert: act("db/upsert"),
    upload: act("db/upload"),
    readFileContent: act("db/readFileContent"),
    share: act("db/share"),
    upsertSSREntity: act("db/upsertSSREntity"),
    removeCachedEntity: act("db/removeCachedEntity"),
    // Local only for this suite; afterEach reinstalls real selectById.
    selectById: () => undefined,
    selectEntities: () => ({}),
    selectAll: () => [],
    selectIds: () => [],
    selectTotal: () => 0,
    dbAdapter: { getSelectors: () => ({}) },
    default: () => null,
  }));

  mock.module("app/utils/env", () => ({
    ...realEnv,
    getIsDesktopApp: () => false,
    isProduction: false,
  }));
}

type WriteCall = {
  data: any;
  customKey: string;
  userId?: string;
};

function createMockThunkApi(opts: {
  accountUserId?: string | null;
  memberSpaces?: any[];
  mockDb: Record<string, any>;
  writeCalls?: WriteCall[];
  patchCalls?: Array<{ dbKey: string; changes: any }>;
}) {
  const data = opts.mockDb;
  const writeCalls = opts.writeCalls ?? [];
  const patchCalls = opts.patchCalls ?? [];

  const dispatch = (action: any) => {
    if (action && typeof action === "object") {
      const type = action.type ?? "";
      const payload = action.payload ?? action.meta?.arg ?? {};

      if (type.endsWith("/write")) {
        const record = { ...(payload.data ?? payload) };
        const key = payload.customKey ?? record.id;
        const stampedUserId = payload.userId ?? record.userId;
        if (stampedUserId != null) record.userId = stampedUserId;
        if (key && record) data[key] = record;
        writeCalls.push({
          data: record,
          customKey: key,
          userId: payload.userId,
        });
        return { unwrap: async () => record };
      }

      if (type.endsWith("/patch")) {
        const key = payload.dbKey ?? "";
        const changes = payload.changes ?? {};
        patchCalls.push({ dbKey: key, changes });
        if (key && data[key]) Object.assign(data[key], changes);
        return { unwrap: async () => changes };
      }
    }
    return { unwrap: async () => ({}) };
  };

  const accountUserId = opts.accountUserId;
  return {
    getState: () => ({
      auth: {
        currentUser:
          accountUserId == null
            ? null
            : { userId: accountUserId },
        isLoggedIn: !!accountUserId,
      },
      space: { memberSpaces: opts.memberSpaces ?? [] },
      settings: {},
    }),
    dispatch,
    extra: { db: data },
  };
}

describe("addSpaceAction device-local foundation", () => {
  afterEach(() => {
    mock.restore();
    restoreLeakedModuleMocks();
  });

  it("guest create writes local Space body + space-member-local-* OWNER membership", async () => {
    mockDbSlice();
    mockEmptyFetchUserData();
    const { addSpaceAction } = await import(
      `./addSpaceAction.ts?guest-${moduleVersion++}`
    );

    const db: Record<string, any> = {};
    const writeCalls: WriteCall[] = [];
    const thunk = createMockThunkApi({
      accountUserId: null,
      mockDb: db,
      writeCalls,
    });

    const result = await addSpaceAction(
      { name: "Guest Space", description: "local only", visibility: "private" },
      thunk as any
    );

    expect(result.userId).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(result.ownerId).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(result.role).toBe(MemberRole.OWNER);
    expect(result.dbKey).toMatch(/^space-member-local-/);
    expect(result.spaceName).toBe("Guest Space");

    const spaceKey = Object.keys(db).find(
      (k) => k.startsWith("space-") && !k.includes("space-member-")
    );
    const memberKey = Object.keys(db).find((k) =>
      k.startsWith("space-member-local-")
    );
    expect(spaceKey).toBeDefined();
    expect(memberKey).toBeDefined();
    // No space-local-* body family
    expect(spaceKey!.startsWith("space-local-")).toBe(false);

    const spaceBody = db[spaceKey!];
    expect(spaceBody.ownerId).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(spaceBody.userId).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(spaceBody.members).toEqual([DEVICE_LOCAL_OWNER_ID]);
    expect(spaceBody.name).toBe("Guest Space");

    const membership = db[memberKey!];
    expect(membership.userId).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(membership.ownerId).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(membership.role).toBe(MemberRole.OWNER);

    // Explicit write config stamps local (even though no session)
    expect(writeCalls).toHaveLength(2);
    for (const call of writeCalls) {
      expect(call.userId).toBe(DEVICE_LOCAL_OWNER_ID);
    }
  });

  it("guest local Space body and membership plan zero replication servers", async () => {
    mockDbSlice();
    mockEmptyFetchUserData();
    const { addSpaceAction } = await import(
      `./addSpaceAction.ts?repl-${moduleVersion++}`
    );

    const db: Record<string, any> = {};
    const writeCalls: WriteCall[] = [];
    await addSpaceAction(
      { name: "No Repl", visibility: "private" },
      createMockThunkApi({
        accountUserId: null,
        mockDb: db,
        writeCalls,
      }) as any
    );

    expect(writeCalls).toHaveLength(2);
    for (const call of writeCalls) {
      const servers = resolveAuthorityReplicationServers({
        currentServer: "https://nolo.chat",
        syncServers: ["https://us.nolo.chat"],
        dbKey: call.customKey,
        record: call.data,
        state: {
          auth: { currentUser: null },
          settings: {},
        },
      });
      expect(servers).toEqual([]);
    }
  });

  it("logged-in account create remains account-owned (regression)", async () => {
    mockDbSlice();
    mockEmptyFetchUserData();
    const { addSpaceAction } = await import(
      `./addSpaceAction.ts?acct-${moduleVersion++}`
    );

    const db: Record<string, any> = {};
    const writeCalls: WriteCall[] = [];
    const accountId = "user-account-a";
    const result = await addSpaceAction(
      { name: "Account Space", visibility: "private" },
      createMockThunkApi({
        accountUserId: accountId,
        mockDb: db,
        writeCalls,
      }) as any
    );

    expect(result.userId).toBe(accountId);
    expect(result.ownerId).toBe(accountId);
    expect(result.dbKey).toBe(`space-member-${accountId}-${result.spaceId}`);

    const spaceKey = Object.keys(db).find(
      (k) => k.startsWith("space-") && !k.includes("space-member-")
    );
    expect(db[spaceKey!].ownerId).toBe(accountId);
    expect(db[spaceKey!].userId).toBe(accountId);
    expect(db[spaceKey!].members).toEqual([accountId]);

    for (const call of writeCalls) {
      expect(call.userId).toBe(accountId);
    }

    // Account-owned body still plans replication (not zero) when servers exist
    const bodyCall = writeCalls.find(
      (c) => !c.customKey.includes("space-member-")
    )!;
    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: bodyCall.customKey,
      record: bodyCall.data,
      state: {
        auth: { currentUser: { userId: accountId } },
        settings: {
          userAuthorityRegistry: {
            [accountId]: "https://self.example.com",
          },
        },
      },
    });
    expect(servers.length).toBeGreaterThan(0);
  });

  it("does not migrate account-owned content into a local Space", async () => {
    mockDbSlice();
    // Seed sidebar-like items under guest db map; classify by userId/dbKey.
    // fetchUserData is used by getUserDataOnce — mock via putting records that
    // fetchUserData can scan. Simpler: mock database/client/fetchUserData.
    mock.module("database/client/fetchUserData", () => ({
      fetchUserData: async () => ({
        dialog: [
          {
            id: "dialog-user-a-01X",
            dbKey: "dialog-user-a-01X",
            type: "dialog",
            userId: "user-a",
            title: "Account dialog",
          },
          {
            id: "dialog-local-01Y",
            dbKey: "dialog-local-01Y",
            type: "dialog",
            userId: "local",
            title: "Local dialog",
          },
        ],
        page: [],
      }),
    }));

    const { addSpaceAction } = await import(
      `./addSpaceAction.ts?mig-local-${moduleVersion++}`
    );

    const db: Record<string, any> = {};
    await addSpaceAction(
      { name: "Local First", visibility: "private" },
      createMockThunkApi({ accountUserId: null, mockDb: db }) as any
    );

    const spaceKey = Object.keys(db).find(
      (k) => k.startsWith("space-") && !k.includes("space-member-")
    )!;
    const contents = db[spaceKey].contents ?? {};
    expect(Object.keys(contents)).toEqual(["dialog-local-01Y"]);
    expect(contents["dialog-user-a-01X"]).toBeUndefined();
  });

  it("does not migrate local content into an account Space", async () => {
    mockDbSlice();
    mock.module("database/client/fetchUserData", () => ({
      fetchUserData: async () => ({
        dialog: [
          {
            id: "dialog-local-01Z",
            dbKey: "dialog-local-01Z",
            type: "dialog",
            userId: "local",
            title: "Local dialog",
          },
          {
            id: "dialog-user-a-01W",
            dbKey: "dialog-user-a-01W",
            type: "dialog",
            userId: "user-a",
            title: "Account dialog",
          },
        ],
        page: [],
      }),
    }));

    const { addSpaceAction } = await import(
      `./addSpaceAction.ts?mig-acct-${moduleVersion++}`
    );

    const db: Record<string, any> = {};
    await addSpaceAction(
      { name: "Account First", visibility: "private" },
      createMockThunkApi({
        accountUserId: "user-a",
        mockDb: db,
      }) as any
    );

    const spaceKey = Object.keys(db).find(
      (k) => k.startsWith("space-") && !k.includes("space-member-")
    )!;
    const contents = db[spaceKey].contents ?? {};
    expect(Object.keys(contents)).toEqual(["dialog-user-a-01W"]);
    expect(contents["dialog-local-01Z"]).toBeUndefined();
  });

  it("local-only memberSpaces still migrate on first account Space", async () => {
    mockDbSlice();
    mock.module("database/client/fetchUserData", () => ({
      fetchUserData: async () => ({
        dialog: [
          {
            id: "dialog-user-a-01M",
            dbKey: "dialog-user-a-01M",
            type: "dialog",
            userId: "user-a",
            title: "Account dialog",
          },
          {
            id: "dialog-local-01N",
            dbKey: "dialog-local-01N",
            type: "dialog",
            userId: "local",
            title: "Local dialog",
          },
        ],
        page: [],
      }),
    }));

    const { addSpaceAction } = await import(
      `./addSpaceAction.ts?mig-local-only-${moduleVersion++}`
    );

    const db: Record<string, any> = {};
    await addSpaceAction(
      { name: "Account First After Local", visibility: "private" },
      createMockThunkApi({
        accountUserId: "user-a",
        // Union list with only device-local membership — must not block
        // account first-Space migration.
        memberSpaces: [
          {
            userId: DEVICE_LOCAL_OWNER_ID,
            ownerId: DEVICE_LOCAL_OWNER_ID,
            spaceId: "01LOCALONLY0000000000001",
            spaceName: "Local Only",
            role: MemberRole.OWNER,
          },
        ],
        mockDb: db,
      }) as any
    );

    const spaceKey = Object.keys(db).find(
      (k) => k.startsWith("space-") && !k.includes("space-member-")
    )!;
    const contents = db[spaceKey].contents ?? {};
    expect(Object.keys(contents)).toEqual(["dialog-user-a-01M"]);
    expect(contents["dialog-local-01N"]).toBeUndefined();
  });

  it("account-only memberSpaces still migrate on first local Space", async () => {
    mockDbSlice();
    mock.module("database/client/fetchUserData", () => ({
      fetchUserData: async () => ({
        dialog: [
          {
            id: "dialog-local-01P",
            dbKey: "dialog-local-01P",
            type: "dialog",
            userId: "local",
            title: "Local dialog",
          },
          {
            id: "dialog-user-a-01Q",
            dbKey: "dialog-user-a-01Q",
            type: "dialog",
            userId: "user-a",
            title: "Account dialog",
          },
        ],
        page: [],
      }),
    }));

    const { addSpaceAction } = await import(
      `./addSpaceAction.ts?mig-acct-only-${moduleVersion++}`
    );

    const db: Record<string, any> = {};
    await addSpaceAction(
      { name: "Local First After Account", visibility: "private" },
      createMockThunkApi({
        // Guest create; memberSpaces only has account row (stale union).
        accountUserId: null,
        memberSpaces: [
          {
            userId: "user-a",
            ownerId: "user-a",
            spaceId: "01ACCTONLY00000000000001",
            spaceName: "Account Only",
            role: MemberRole.OWNER,
          },
        ],
        mockDb: db,
      }) as any
    );

    const spaceKey = Object.keys(db).find(
      (k) => k.startsWith("space-") && !k.includes("space-member-")
    )!;
    const contents = db[spaceKey].contents ?? {};
    expect(Object.keys(contents)).toEqual(["dialog-local-01P"]);
    expect(contents["dialog-user-a-01Q"]).toBeUndefined();
  });

  it("same-owner prior Space skips first-Space migration (no cross-actor false positive)", async () => {
    mockDbSlice();
    let fetchCalls = 0;
    mock.module("database/client/fetchUserData", () => ({
      fetchUserData: async () => {
        fetchCalls += 1;
        return {
          dialog: [
            {
              id: "dialog-user-a-01R",
              dbKey: "dialog-user-a-01R",
              type: "dialog",
              userId: "user-a",
              title: "Should not migrate",
            },
          ],
          page: [],
        };
      },
    }));

    const { addSpaceAction } = await import(
      `./addSpaceAction.ts?mig-skip-${moduleVersion++}`
    );

    const db: Record<string, any> = {};
    await addSpaceAction(
      { name: "Second Account Space", visibility: "private" },
      createMockThunkApi({
        accountUserId: "user-a",
        memberSpaces: [
          {
            userId: "user-a",
            ownerId: "user-a",
            spaceId: "01ACCTPRIOR0000000000001",
            spaceName: "Already Has Account Space",
            role: MemberRole.OWNER,
          },
        ],
        mockDb: db,
      }) as any
    );

    expect(fetchCalls).toBe(0);
    const spaceKey = Object.keys(db).find(
      (k) => k.startsWith("space-") && !k.includes("space-member-")
    )!;
    expect(db[spaceKey].contents ?? {}).toEqual({});
  });

  it("source has no login/auto-upload hook for local Space", async () => {
    const source = await Bun.file(
      new URL("./addSpaceAction.ts", import.meta.url)
    ).text();
    expect(source).not.toContain("syncStandaloneAgentToAccount");
    expect(source).not.toContain("syncAccountSpaceLocalAgentsToAccount");
    expect(source).not.toContain("onLogin");
    expect(source).not.toContain("autoUpload");
    expect(source).toContain("resolveEffectiveSpaceActorId");
    expect(source).toContain("resolveRecordOwnerUserId");
  });
});
