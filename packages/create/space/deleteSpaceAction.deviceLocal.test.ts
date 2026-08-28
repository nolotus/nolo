/**
 * Device-local Space B2 — deleteSpaceAction local authority lifecycle.
 */
import { afterEach, describe, expect, it, mock } from "bun:test";
import { DEVICE_LOCAL_OWNER_ID } from "database/authority/deviceLocal";
import { resolveAuthorityReplicationServers } from "database/actions/replication";
import { isTombstoneRecord } from "database/tombstones";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realDbSlice = { ...(await import("database/dbSlice")) };
const realDeleteDbKey = { ...(await import("app/hooks/deleteDbKey")) };

let moduleVersion = 0;

type WriteCall = { data: any; customKey: string; userId?: string };
type RemoveCall = any;

const restoreLeakedModuleMocks = () => {
  mock.module("database/dbSlice", () => realDbSlice);
  mock.module("app/hooks/deleteDbKey", () => realDeleteDbKey);
};

function mockDbSliceActs() {
  const act = (type: string) => (payload: any) => ({
    type,
    payload,
    meta: { arg: payload },
  });
  // Full surface: incomplete dbSlice mocks leak readAndWait/select* and break sibling suites.
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
    // Local only; afterEach reinstalls real selectById for sibling suites.
    selectById: () => undefined,
    selectEntities: () => ({}),
    selectAll: () => [],
    selectIds: () => [],
    selectTotal: () => 0,
    dbAdapter: { getSelectors: () => ({}) },
    default: () => null,
  }));
  return act;
}

function mockModules() {
  mockDbSliceActs();
  mock.module("app/hooks/deleteDbKey", () => ({
    ...realDeleteDbKey,
    deleteDbKey: (contentKey: string) => ({
      type: "deleteDbKey",
      payload: contentKey,
    }),
  }));
}

function createThunk(opts: {
  accountUserId?: string | null;
  db: Record<string, any>;
  writeCalls?: WriteCall[];
  removeCalls?: RemoveCall[];
}) {
  const writeCalls = opts.writeCalls ?? [];
  const removeCalls = opts.removeCalls ?? [];
  const db = opts.db;

  const dispatch = (action: any) => {
    const type = action?.type ?? "";
    const payload = action?.payload ?? action?.meta?.arg ?? {};

    if (type.endsWith("/read") || type === "read") {
      const key = payload.dbKey ?? payload;
      return { unwrap: async () => db[key] ?? null };
    }
    if (type.endsWith("/write") || type === "write") {
      const key = payload.customKey;
      const record = { ...(payload.data ?? {}) };
      if (payload.userId != null) record.userId = payload.userId;
      if (key) db[key] = record;
      writeCalls.push({
        data: record,
        customKey: key,
        userId: payload.userId,
      });
      return { unwrap: async () => record };
    }
    if (type.endsWith("/remove") || type === "remove") {
      const key = typeof payload === "string" ? payload : payload.dbKey;
      removeCalls.push(payload);
      if (key && db[key]) {
        db[key] = {
          ...db[key],
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return { unwrap: async () => ({ dbKey: key }) };
    }
    if (type.endsWith("/patch") || type === "patch") {
      return { unwrap: async () => true };
    }
    if (type === "deleteDbKey") {
      return { unwrap: async () => true };
    }
    return { unwrap: async () => ({}) };
  };

  return {
    dispatch,
    getState: () => ({
      auth: {
        currentUser:
          opts.accountUserId == null
            ? null
            : { userId: opts.accountUserId },
        userId: opts.accountUserId,
      },
    }),
  };
}

const spaceId = "01KLOCALDELSPACE000000001";
const spaceKey = `space-${spaceId}`;
const memberKey = `space-member-local-${spaceId}`;

function seedLocalSpace(db: Record<string, any>) {
  db[spaceKey] = {
    id: spaceId,
    dbKey: spaceKey,
    ownerId: DEVICE_LOCAL_OWNER_ID,
    userId: DEVICE_LOCAL_OWNER_ID,
    members: [DEVICE_LOCAL_OWNER_ID],
    contents: {},
    type: "space",
  };
  db[memberKey] = {
    dbKey: memberKey,
    userId: DEVICE_LOCAL_OWNER_ID,
    ownerId: DEVICE_LOCAL_OWNER_ID,
    spaceId,
    role: "owner",
    type: "space",
  };
}

describe("deleteSpaceAction device-local B2", () => {
  afterEach(() => {
    mock.restore();
    restoreLeakedModuleMocks();
  });

  it("guest can delete local Space: tombstones body + membership, zero remote", async () => {
    mockModules();
    const { deleteSpaceAction } = await import(
      `./deleteSpaceAction.ts?guest-del-${moduleVersion++}`
    );
    const db: Record<string, any> = {};
    const writeCalls: WriteCall[] = [];
    seedLocalSpace(db);

    await deleteSpaceAction(spaceId, createThunk({
      accountUserId: null,
      db,
      writeCalls,
    }) as any);

    expect(isTombstoneRecord(db[spaceKey])).toBe(true);
    expect(db[spaceKey].userId).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(isTombstoneRecord(db[memberKey])).toBe(true);
    expect(db[memberKey].userId).toBe(DEVICE_LOCAL_OWNER_ID);

    // Restart listing: tombstoned body/membership must not count as live
    expect(isTombstoneRecord(db[spaceKey])).toBe(true);
    expect(isTombstoneRecord(db[memberKey])).toBe(true);

    expect(writeCalls.length).toBeGreaterThanOrEqual(2);
    for (const call of writeCalls) {
      expect(call.userId).toBe(DEVICE_LOCAL_OWNER_ID);
      expect(
        resolveAuthorityReplicationServers({
          currentServer: "https://nolo.chat",
          syncServers: ["https://us.nolo.chat"],
          dbKey: call.customKey,
          record: call.data,
          state: {
            auth: { currentUser: null },
            settings: {},
          },
        })
      ).toEqual([]);
    }
  });

  it("logged-in account deletes local Space with local authority (not account)", async () => {
    mockModules();
    const { deleteSpaceAction } = await import(
      `./deleteSpaceAction.ts?acct-local-del-${moduleVersion++}`
    );
    const db: Record<string, any> = {};
    const writeCalls: WriteCall[] = [];
    const removeCalls: RemoveCall[] = [];
    seedLocalSpace(db);

    await deleteSpaceAction(spaceId, createThunk({
      accountUserId: "user-a",
      db,
      writeCalls,
      removeCalls,
    }) as any);

    expect(isTombstoneRecord(db[spaceKey])).toBe(true);
    expect(db[spaceKey].userId).toBe(DEVICE_LOCAL_OWNER_ID);
    // Must not use account remove path for the body
    expect(
      removeCalls.some(
        (c) => c === spaceKey || c?.dbKey === spaceKey || c === `space-${spaceId}`
      )
    ).toBe(false);

    for (const call of writeCalls) {
      expect(call.userId).toBe(DEVICE_LOCAL_OWNER_ID);
      expect(
        resolveAuthorityReplicationServers({
          currentServer: "https://nolo.chat",
          syncServers: ["https://us.nolo.chat"],
          dbKey: call.customKey,
          record: call.data,
          state: {
            auth: { currentUser: { userId: "user-a" } },
            settings: {
              userAuthorityRegistry: {
                "user-a": "https://self.example.com",
              },
            },
          },
        })
      ).toEqual([]);
    }
  });

  it("account Space delete keeps owner gate + remove path (regression)", async () => {
    mockModules();
    const { deleteSpaceAction } = await import(
      `./deleteSpaceAction.ts?acct-del-reg-${moduleVersion++}`
    );
    const acctId = "01KACCTDELSPACE000000001";
    const acctKey = `space-${acctId}`;
    const acctMember = `space-member-user-a-${acctId}`;
    const db: Record<string, any> = {
      [acctKey]: {
        id: acctId,
        ownerId: "user-a",
        userId: "user-a",
        members: ["user-a"],
        contents: {},
      },
      [acctMember]: {
        userId: "user-a",
        spaceId: acctId,
      },
    };
    const removeCalls: RemoveCall[] = [];
    const writeCalls: WriteCall[] = [];

    await expect(
      deleteSpaceAction(acctId, createThunk({
        accountUserId: null,
        db,
        removeCalls,
        writeCalls,
      }) as any)
    ).rejects.toThrow("User is not logged in");

    await expect(
      deleteSpaceAction(acctId, createThunk({
        accountUserId: "user-b",
        db,
        removeCalls,
        writeCalls,
      }) as any)
    ).rejects.toThrow("Only owner can delete space");

    await deleteSpaceAction(acctId, createThunk({
      accountUserId: "user-a",
      db,
      removeCalls,
      writeCalls,
    }) as any);

    // Account path uses remove, not local write tombstones
    expect(removeCalls.length).toBeGreaterThan(0);
    expect(
      writeCalls.some((c) => c.customKey === acctKey)
    ).toBe(false);
  });

  it("does not leave live body when membership tombstone write fails mid-way", async () => {
    // Re-import with a dispatch that fails membership write after body ok
    mockDbSliceActs();
    mock.module("app/hooks/deleteDbKey", () => ({
      deleteDbKey: (k: string) => ({ type: "deleteDbKey", payload: k }),
    }));
  
    const { deleteSpaceAction } = await import(
      `./deleteSpaceAction.ts?partial-del-${moduleVersion++}`
    );

    const db: Record<string, any> = {};
    seedLocalSpace(db);
    let memberWriteAttempts = 0;

    const dispatch = (action: any) => {
      const type = action?.type ?? "";
      const payload = action?.payload ?? action?.meta?.arg ?? {};
      if (type.endsWith("/read")) {
        return { unwrap: async () => db[payload.dbKey] ?? null };
      }
      if (type.endsWith("/write")) {
        const key = payload.customKey as string;
        if (key.startsWith("space-member-")) {
          memberWriteAttempts += 1;
          return {
            unwrap: async () => {
              throw new Error("membership write failed");
            },
          };
        }
        const record = { ...(payload.data ?? {}), userId: payload.userId };
        db[key] = record;
        return { unwrap: async () => record };
      }
      return { unwrap: async () => ({}) };
    };

    await deleteSpaceAction(spaceId, {
      dispatch,
      getState: () => ({ auth: { currentUser: null } }),
    } as any);

    // Body tombstoned first — restart listing drops the Space even if
    // membership tombstone failed (ghost membership dropped when body gone).
    expect(isTombstoneRecord(db[spaceKey])).toBe(true);
    expect(memberWriteAttempts).toBeGreaterThan(0);
  });
});
