import { afterEach, describe, expect, it, mock } from "bun:test";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realDbSlice = { ...(await import("database/dbSlice")) };
const realEnv = { ...(await import("app/utils/env")) };

let moduleVersion = 0;

const createUserId = () => `bftest-${Date.now().toString(36)}`;

const restoreLeakedModuleMocks = () => {
  mock.module("database/dbSlice", () => realDbSlice);
  mock.module("app/utils/env", () => realEnv);
};

/** Mock database/dbSlice to return plain action objects. */
function mockDbSlice() {
  const act = (type: string) => (payload: any) => ({
    type, payload, meta: { arg: payload },
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
    // Local only; afterEach reinstalls real selectById for sibling suites.
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

type MockThunkApi = {
  getState: () => any;
  dispatch: (action: any) => any;
  extra: { db: any };
};

function createMockThunkApi(opts: {
  userId?: string;
  mockDb: Record<string, any>;
}): MockThunkApi {
  const userId = opts.userId ?? createUserId();
  const data = opts.mockDb;

  const dispatch = (action: any) => {
    if (action && typeof action === "object") {
      const type = action.type ?? "";
      const payload = action.payload ?? action.meta?.arg ?? {};

      if (type.endsWith("/write")) {
        const record = payload.data ?? payload;
        const key = payload.customKey ?? record.id;
        if (key && record) data[key] = record;
        return { unwrap: () => record };
      }

      if (type.endsWith("/read")) {
        const key = payload.dbKey ?? "";
        return { unwrap: () => data[key] ?? null };
      }

      if (type.endsWith("/patch")) {
        const key = payload.dbKey ?? "";
        const changes = payload.changes ?? {};
        if (key && data[key]) Object.assign(data[key], changes);
        return { unwrap: () => changes };
      }
    }
    return { unwrap: () => ({}) };
  };

  return {
    getState: () => ({
      auth: { currentUser: { userId } },
      space: { memberSpaces: [] },
      settings: {},
    }),
    dispatch,
    extra: { db: data },
  };
}

function buildExisting(
  userId: string,
  spaceId: string,
  overrides: any = {}
) {
  return {
    id: spaceId,
    name: "old-name",
    description: "old",
    ownerId: userId,
    visibility: "private",
    members: [userId],
    categories: {},
    contents: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

// ─── addSpaceAction ───────────────────────────────────

describe("addSpaceAction boundFolder", () => {
  afterEach(() => {
    mock.restore();
    restoreLeakedModuleMocks();
  });


// Note: spaceIds must NOT have a "space-" prefix, because createSpaceKey.space()
// calls normalizeSpaceId which strips "space-". Using "space-spaceId" prefix
// causes a key mismatch between the test db and the action.


  it("writes boundFolder into SpaceData when provided", async () => {
    mockDbSlice();
    const { addSpaceAction } = await import(`./addSpaceAction.ts?a1-${moduleVersion++}`);
    // Keep mock active during the test action

    const db: Record<string, any> = {};
    const thunk = createMockThunkApi({ mockDb: db });

    await addSpaceAction(
      { name: "bound-test", description: "t", visibility: "private", boundFolder: "/Users/me/p" },
      thunk as any
    );

    mock.restore();

    const spaceKey = Object.keys(db).find(
      (k) => k.startsWith("space-") && !k.includes("space-member-")
    );
    expect(spaceKey).toBeDefined();
    expect(db[spaceKey!].boundFolder).toBe("/Users/me/p");
    expect(db[spaceKey!].name).toBe("bound-test");
  });

  it("sets boundFolder undefined when absent (backward compat)", async () => {
    mockDbSlice();
    const { addSpaceAction } = await import(`./addSpaceAction.ts?a2-${moduleVersion++}`);

    const db: Record<string, any> = {};
    const thunk = createMockThunkApi({ mockDb: db });

    await addSpaceAction(
      { name: "legacy", description: "t", visibility: "private" },
      thunk as any
    );

    mock.restore();
    const spaceKey = Object.keys(db).find(
      (k) => k.startsWith("space-") && !k.includes("space-member-")
    );
    expect(spaceKey).toBeDefined();
    expect(db[spaceKey!].boundFolder).toBeUndefined();
  });
});

// ─── updateSpaceAction ───────────────────────────────

describe("updateSpaceAction boundFolder", () => {
  afterEach(() => {
    mock.restore();
    restoreLeakedModuleMocks();
  });

  it("updates boundFolder when changed", async () => {
    mockDbSlice();
    const { updateSpaceAction } = await import(`./updateSpaceAction.ts?u1-${moduleVersion++}`);

    const userId = createUserId();
    const spaceId = "upd-1";
    const spaceKey = `space-${spaceId}`;
    const db: Record<string, any> = {
      [spaceKey]: buildExisting(userId, spaceId),
    };
    const thunk = createMockThunkApi({ userId, mockDb: db });

    await updateSpaceAction(
      { spaceId, boundFolder: "/new/bound/folder" },
      thunk as any
    );

    mock.restore();
    expect(db[spaceKey].boundFolder).toBe("/new/bound/folder");
  });

  it("clears boundFolder when empty string passed", async () => {
    mockDbSlice();
    const { updateSpaceAction } = await import(`./updateSpaceAction.ts?u2-${moduleVersion++}`);

    const userId = createUserId();
    const spaceId = "clear-1";
    const spaceKey = `space-${spaceId}`;
    const db: Record<string, any> = {
      [spaceKey]: buildExisting(userId, spaceId, {
        boundFolder: "/old/folder",
      }),
    };
    const thunk = createMockThunkApi({ userId, mockDb: db });

    await updateSpaceAction(
      { spaceId, boundFolder: "" },
      thunk as any
    );

    mock.restore();
    expect(db[spaceKey].boundFolder).toBeUndefined();
  });
});
