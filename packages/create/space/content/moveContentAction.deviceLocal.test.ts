/**
 * Device-local Space B2 — moveContentAction under local authority.
 */
import { afterEach, describe, expect, it, mock } from "bun:test";
import { DEVICE_LOCAL_OWNER_ID } from "database/authority/deviceLocal";
import { resolveAuthorityReplicationServers } from "database/actions/replication";

let moduleVersion = 0;

function mockDbSlice() {
  const act = (type: string) => (payload: any) => ({
    type,
    payload,
    meta: { arg: payload },
  });
  // Full surface: incomplete dbSlice mocks leak and break sibling suites.
  mock.module("database/dbSlice", () => ({
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
    selectById: () => undefined,
    selectEntities: () => ({}),
    selectAll: () => [],
    selectIds: () => [],
    selectTotal: () => 0,
    dbAdapter: { getSelectors: () => ({}) },
    default: () => null,
  }));
  mock.module("pino", () => {
    const logger = {
      info: () => undefined,
      error: () => undefined,
      warn: () => undefined,
      child: () => logger,
    };
    return { default: () => logger };
  });
}

type PatchCall = { dbKey: string; changes: any };

function createThunk(opts: {
  accountUserId?: string | null;
  spaces: Record<string, any>;
  patchCalls?: PatchCall[];
}) {
  const patchCalls = opts.patchCalls ?? [];
  const spaces = opts.spaces;

  const dispatch = (action: any) => {
    const type = action?.type ?? "";
    const payload = action?.payload ?? action?.meta?.arg ?? {};
    if (type.endsWith("/read")) {
      return { unwrap: async () => spaces[payload.dbKey] ?? null };
    }
    if (type.endsWith("/patch")) {
      patchCalls.push({ dbKey: payload.dbKey, changes: payload.changes });
      const prev = spaces[payload.dbKey] ?? {};
      const next = {
        ...prev,
        ...payload.changes,
        contents: { ...(prev.contents ?? {}) },
      };
      for (const [k, v] of Object.entries(payload.changes?.contents ?? {})) {
        if (v === null) delete next.contents[k];
        else next.contents[k] = v;
      }
      spaces[payload.dbKey] = next;
      return { unwrap: async () => next };
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

const srcId = "01KLOCALSRC000000000000001";
const tgtId = "01KLOCALTGT000000000000001";
const srcKey = `space-${srcId}`;
const tgtKey = `space-${tgtId}`;
const acctId = "01KACCTMOVE00000000000001";
const acctKey = `space-${acctId}`;

const contentKey = "page-local-01MOVE";

describe("moveContentAction device-local B2", () => {
  afterEach(() => mock.restore());

  it("guest can move content between local Spaces with local stamps", async () => {
    mockDbSlice();
    const { moveContentAction } = await import(
      `./moveContentAction.ts?guest-move-${moduleVersion++}`
    );
    const patchCalls: PatchCall[] = [];
    const spaces = {
      [srcKey]: {
        id: srcId,
        ownerId: DEVICE_LOCAL_OWNER_ID,
        userId: DEVICE_LOCAL_OWNER_ID,
        members: [DEVICE_LOCAL_OWNER_ID],
        categories: {},
        contents: {
          [contentKey]: {
            title: "Move me",
            type: "page",
            contentKey,
            pinned: false,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      },
      [tgtKey]: {
        id: tgtId,
        ownerId: DEVICE_LOCAL_OWNER_ID,
        userId: DEVICE_LOCAL_OWNER_ID,
        members: [DEVICE_LOCAL_OWNER_ID],
        categories: {},
        contents: {},
      },
    };

    const result = await moveContentAction(
      {
        contentKey,
        sourceSpaceId: srcId,
        targetSpaceId: tgtId,
      },
      createThunk({ accountUserId: null, spaces, patchCalls }) as any
    );

    expect(result.error).toBeUndefined();
    expect(patchCalls).toHaveLength(2);
    for (const call of patchCalls) {
      expect(call.changes.userId).toBe(DEVICE_LOCAL_OWNER_ID);
      const servers = resolveAuthorityReplicationServers({
        currentServer: "https://nolo.chat",
        syncServers: ["https://us.nolo.chat"],
        dbKey: call.dbKey,
        record: call.changes,
        state: { auth: { currentUser: null }, settings: {} },
      });
      expect(servers).toEqual([]);
    }
    expect((spaces as any)[srcKey].contents[contentKey]).toBeUndefined();
    expect((spaces as any)[tgtKey].contents[contentKey]).toEqual(
      expect.objectContaining({ title: "Move me", contentKey })
    );
  });

  it("logged-in account moving on local Spaces still stamps local (zero remote)", async () => {
    mockDbSlice();
    const { moveContentAction } = await import(
      `./moveContentAction.ts?acct-local-move-${moduleVersion++}`
    );
    const patchCalls: PatchCall[] = [];
    const spaces = {
      [srcKey]: {
        id: srcId,
        ownerId: DEVICE_LOCAL_OWNER_ID,
        userId: DEVICE_LOCAL_OWNER_ID,
        members: [DEVICE_LOCAL_OWNER_ID],
        categories: {},
        contents: {
          [contentKey]: {
            title: "X",
            type: "page",
            contentKey,
            pinned: false,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      },
      [tgtKey]: {
        id: tgtId,
        ownerId: DEVICE_LOCAL_OWNER_ID,
        userId: DEVICE_LOCAL_OWNER_ID,
        members: [DEVICE_LOCAL_OWNER_ID],
        categories: {},
        contents: {},
      },
    };

    await moveContentAction(
      { contentKey, sourceSpaceId: srcId, targetSpaceId: tgtId },
      createThunk({
        accountUserId: "user-a",
        spaces,
        patchCalls,
      }) as any
    );

    for (const call of patchCalls) {
      expect(call.changes.userId).toBe(DEVICE_LOCAL_OWNER_ID);
      expect(
        resolveAuthorityReplicationServers({
          currentServer: "https://nolo.chat",
          syncServers: ["https://us.nolo.chat"],
          dbKey: call.dbKey,
          record: call.changes,
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

  it("account Space move still requires membership (regression)", async () => {
    mockDbSlice();
    const { moveContentAction } = await import(
      `./moveContentAction.ts?acct-move-reg-${moduleVersion++}`
    );
    const patchCalls: PatchCall[] = [];
    const spaces = {
      [acctKey]: {
        id: acctId,
        ownerId: "user-a",
        userId: "user-a",
        members: ["user-a"],
        categories: {},
        contents: {
          [contentKey]: {
            title: "A",
            type: "page",
            contentKey,
            pinned: false,
            createdAt: 1,
            updatedAt: 1,
          },
        },
      },
      [`space-01KACCTTGT00000000000001`]: {
        id: "01KACCTTGT00000000000001",
        ownerId: "user-a",
        userId: "user-a",
        members: ["user-a"],
        categories: {},
        contents: {},
      },
    };

    const guestResult = await moveContentAction(
      {
        contentKey,
        sourceSpaceId: acctId,
        targetSpaceId: "01KACCTTGT00000000000001",
      },
      createThunk({ accountUserId: null, spaces, patchCalls }) as any
    );
    expect(guestResult.error).toBeTruthy();
    expect(patchCalls).toHaveLength(0);
  });
});
