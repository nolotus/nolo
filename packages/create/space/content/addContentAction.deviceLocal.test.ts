/**
 * Device-local Space B2 — addContentAction under local authority.
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
      const key = payload.dbKey;
      return { unwrap: async () => spaces[key] ?? null };
    }
    if (type.endsWith("/patch")) {
      patchCalls.push({ dbKey: payload.dbKey, changes: payload.changes });
      const prev = spaces[payload.dbKey] ?? {};
      const next = {
        ...prev,
        ...payload.changes,
        contents: {
          ...(prev.contents ?? {}),
          ...(payload.changes?.contents ?? {}),
        },
      };
      // null content values delete keys (mirror deepMerge)
      for (const [k, v] of Object.entries(payload.changes?.contents ?? {})) {
        if (v === null) delete next.contents[k];
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
        // Both shapes: real selectUserId uses currentUser; some suites mock userId root.
        currentUser:
          opts.accountUserId == null
            ? null
            : { userId: opts.accountUserId },
        userId: opts.accountUserId,
      },
    }),
  };
}

const localSpaceId = "01KLOCALSPACEB200000000001";
const localSpaceKey = `space-${localSpaceId}`;
const accountSpaceId = "01KACCTSPACEB200000000001";
const accountSpaceKey = `space-${accountSpaceId}`;

function localBody(overrides: Record<string, any> = {}) {
  return {
    id: localSpaceId,
    ownerId: DEVICE_LOCAL_OWNER_ID,
    userId: DEVICE_LOCAL_OWNER_ID,
    members: [DEVICE_LOCAL_OWNER_ID],
    categories: {},
    contents: {},
    ...overrides,
  };
}

function accountBody(overrides: Record<string, any> = {}) {
  return {
    id: accountSpaceId,
    ownerId: "user-a",
    userId: "user-a",
    members: ["user-a"],
    categories: {},
    contents: {},
    ...overrides,
  };
}

describe("addContentAction device-local B2", () => {
  afterEach(() => mock.restore());

  it("guest can add content to local Space with userId=local stamp (zero remote)", async () => {
    mockDbSlice();
    const { addContentAction } = await import(
      `./addContentAction.ts?guest-add-${moduleVersion++}`
    );
    const patchCalls: PatchCall[] = [];
    const spaces = { [localSpaceKey]: localBody() };

    await addContentAction(
      {
        spaceId: localSpaceId,
        title: "Local note",
        type: "page" as any,
        contentKey: "page-local-01NOTE",
      },
      createThunk({ accountUserId: null, spaces, patchCalls }) as any
    );

    expect(patchCalls).toHaveLength(1);
    expect(patchCalls[0].changes.userId).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(patchCalls[0].changes.contents["page-local-01NOTE"]).toEqual(
      expect.objectContaining({ title: "Local note", type: "page" })
    );

    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: patchCalls[0].dbKey,
      record: patchCalls[0].changes,
      state: {
        auth: { currentUser: null },
        settings: {},
      },
    });
    expect(servers).toEqual([]);
  });

  it("logged-in account still uses local authority on local Space (not account)", async () => {
    mockDbSlice();
    const { addContentAction } = await import(
      `./addContentAction.ts?acct-local-add-${moduleVersion++}`
    );
    const patchCalls: PatchCall[] = [];
    const spaces = { [localSpaceKey]: localBody() };

    await addContentAction(
      {
        spaceId: localSpaceId,
        title: "While logged in",
        type: "dialog" as any,
        contentKey: "dialog-local-01D",
      },
      createThunk({
        accountUserId: "user-account-a",
        spaces,
        patchCalls,
      }) as any
    );

    expect(patchCalls[0].changes.userId).toBe(DEVICE_LOCAL_OWNER_ID);
    expect(patchCalls[0].changes.userId).not.toBe("user-account-a");

    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: patchCalls[0].dbKey,
      record: patchCalls[0].changes,
      state: {
        auth: { currentUser: { userId: "user-account-a" } },
        settings: {
          userAuthorityRegistry: {
            "user-account-a": "https://self.example.com",
          },
        },
      },
    });
    expect(servers).toEqual([]);
  });

  it("account Space regression: requires membership and does not stamp local", async () => {
    mockDbSlice();
    const { addContentAction } = await import(
      `./addContentAction.ts?acct-reg-${moduleVersion++}`
    );
    const patchCalls: PatchCall[] = [];
    const spaces = { [accountSpaceKey]: accountBody() };

    await expect(
      addContentAction(
        {
          spaceId: accountSpaceId,
          title: "Nope",
          type: "page" as any,
          contentKey: "page-user-a-1",
        },
        createThunk({ accountUserId: null, spaces, patchCalls }) as any
      )
    ).rejects.toThrow();

    await addContentAction(
      {
        spaceId: accountSpaceId,
        title: "Acct page",
        type: "page" as any,
        contentKey: "page-user-a-1",
      },
      createThunk({ accountUserId: "user-a", spaces, patchCalls }) as any
    );

    expect(patchCalls).toHaveLength(1);
    expect(patchCalls[0].changes.userId).toBeUndefined();
    expect(patchCalls[0].changes.contents["page-user-a-1"].title).toBe(
      "Acct page"
    );

    const servers = resolveAuthorityReplicationServers({
      currentServer: "https://nolo.chat",
      syncServers: ["https://us.nolo.chat"],
      dbKey: patchCalls[0].dbKey,
      record: {
        ...accountBody(),
        userId: "user-a",
        ...patchCalls[0].changes,
      },
      state: {
        auth: { currentUser: { userId: "user-a" } },
        settings: {
          userAuthorityRegistry: {
            "user-a": "https://self.example.com",
          },
        },
      },
    });
    expect(servers.length).toBeGreaterThan(0);
  });
});
