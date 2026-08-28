/**
 * Device-local Space B2 — deleteContentFromSpaceAction under local authority.
 */
import { afterEach, describe, expect, it, mock } from "bun:test";

const actualDialogSlice = await import("chat/dialog/dialogSlice");
import { DEVICE_LOCAL_OWNER_ID } from "database/authority/deviceLocal";
import { resolveAuthorityReplicationServers } from "database/actions/replication";

let moduleVersion = 0;

function mockDeps() {
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
  mock.module("database/actions/deleteFile", () => ({
    deleteFileAction: async () => undefined,
  }));
  mock.module("chat/dialog/dialogSlice", () => ({
    ...actualDialogSlice,
    deleteDialog: act("dialog/delete"),
  }));
  mock.module("render/table/tableSlice", () => ({
    deleteTable: act("table/delete"),
  }));
}

type PatchCall = { dbKey: string; changes: any; preferredServerOrigin?: any };

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
    if (type.endsWith("/read") || type === "read") {
      return { unwrap: async () => spaces[payload.dbKey] ?? null };
    }
    if (type.endsWith("/patch") || type === "patch") {
      patchCalls.push({
        dbKey: payload.dbKey,
        changes: payload.changes,
        preferredServerOrigin: payload.preferredServerOrigin,
      });
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
    if (type.endsWith("/remove") || type === "remove") {
      return { unwrap: async () => ({ dbKey: payload }) };
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
    extra: { db: {} },
  };
}

const spaceId = "01KLOCALDELCONTENT0000001";
const spaceKey = `space-${spaceId}`;
const contentKey = "page-local-01DEL";

describe("deleteContentFromSpaceAction device-local B2", () => {
  afterEach(() => mock.restore());

  it("guest can remove content from local Space with local stamp", async () => {
    mockDeps();
    const { deleteContentFromSpaceAction } = await import(
      `./deleteContentFromSpaceAction.ts?guest-rm-${moduleVersion++}`
    );
    const patchCalls: PatchCall[] = [];
    const spaces = {
      [spaceKey]: {
        id: spaceId,
        ownerId: DEVICE_LOCAL_OWNER_ID,
        userId: DEVICE_LOCAL_OWNER_ID,
        members: [DEVICE_LOCAL_OWNER_ID],
        updatedAt: 100,
        contents: {
          [contentKey]: {
            type: "page",
            contentKey,
            title: "gone",
          },
        },
      },
    };

    const result = await deleteContentFromSpaceAction(
      { contentKey, spaceId },
      createThunk({ accountUserId: null, spaces, patchCalls }) as any
    );

    expect(patchCalls).toHaveLength(1);
    expect(patchCalls[0].changes.userId).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(patchCalls[0].changes.contents[contentKey]).toBeNull();
    expect(result.updatedSpaceData.contents[contentKey]).toBeUndefined();
    expect(
      resolveAuthorityReplicationServers({
        currentServer: "https://nolo.chat",
        syncServers: ["https://us.nolo.chat"],
        dbKey: spaceKey,
        record: patchCalls[0].changes,
        state: { auth: { currentUser: null }, settings: {} },
      })
    ).toEqual([]);
  });

  it("logged-in account remove on local Space stays local authority", async () => {
    mockDeps();
    const { deleteContentFromSpaceAction } = await import(
      `./deleteContentFromSpaceAction.ts?acct-local-rm-${moduleVersion++}`
    );
    const patchCalls: PatchCall[] = [];
    const spaces = {
      [spaceKey]: {
        id: spaceId,
        ownerId: DEVICE_LOCAL_OWNER_ID,
        userId: DEVICE_LOCAL_OWNER_ID,
        members: [DEVICE_LOCAL_OWNER_ID],
        updatedAt: 100,
        contents: {
          [contentKey]: { type: "page", contentKey, title: "x" },
        },
      },
    };

    await deleteContentFromSpaceAction(
      { contentKey, spaceId },
      createThunk({
        accountUserId: "user-a",
        spaces,
        patchCalls,
      }) as any
    );

    expect(patchCalls[0].changes.userId).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(
      resolveAuthorityReplicationServers({
        currentServer: "https://nolo.chat",
        syncServers: ["https://us.nolo.chat"],
        dbKey: spaceKey,
        record: patchCalls[0].changes,
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
  });

  it("account Space still rejects non-members (regression)", async () => {
    mockDeps();
    const { deleteContentFromSpaceAction } = await import(
      `./deleteContentFromSpaceAction.ts?acct-rm-reg-${moduleVersion++}`
    );
    const acctId = "01KACCTDELCONTENT0000001";
    const acctKey = `space-${acctId}`;
    const spaces = {
      [acctKey]: {
        id: acctId,
        ownerId: "user-a",
        userId: "user-a",
        members: ["user-a"],
        contents: {
          [contentKey]: { type: "page", contentKey, title: "x" },
        },
      },
    };

    await expect(
      deleteContentFromSpaceAction(
        { contentKey, spaceId: acctId },
        createThunk({ accountUserId: "user-b", spaces }) as any
      )
    ).rejects.toThrow();

    await expect(
      deleteContentFromSpaceAction(
        { contentKey, spaceId: acctId },
        createThunk({ accountUserId: null, spaces }) as any
      )
    ).rejects.toThrow();
  });
});
