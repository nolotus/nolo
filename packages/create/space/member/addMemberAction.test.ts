import { expect, test, describe, beforeEach, mock } from "bun:test";

import { DB_PREFIX } from "database/keys";
import { MemoryDB } from "database-engine/MemoryDB";
import { createSpaceKey } from "create/space/spaceKeys";

type MockAction = { kind: "read" | "write"; input: Record<string, unknown> };

const readMock = mock((input: Record<string, unknown>): MockAction => ({
  kind: "read",
  input,
}));
const writeMock = mock((input: Record<string, unknown>): MockAction => ({
  kind: "write",
  input,
}));

let moduleVersion = 0;

async function loadAddMemberAction() {
  const realDbSlice = await import("database/dbSlice");
  const realAuthSlice = await import("auth/authSlice");
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    read: readMock,
    write: writeMock,
  }));
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: { auth: { currentUser: { userId: string } } }) =>
      state.auth.currentUser.userId,
  }));

  // Dynamic import with cache-bust to break the auth/space circular dependency
  // when unit-testing this action in isolation.
  const mod = await import(`./addMemberAction?test=${moduleVersion++}`);
  mock.restore();
  return mod;
}

const mockCurrentUserId = "user-111";
const spaceId = "team";

describe("addMemberAction", () => {
  let db: MemoryDB;

  beforeEach(async () => {
    db = new MemoryDB();
    await db.put(createSpaceKey.space(spaceId), {
      id: spaceId,
      ownerId: mockCurrentUserId,
      members: [mockCurrentUserId],
      name: "Test Space",
      visibility: "private",
      type: "space",
    });

    await db.put(`${DB_PREFIX.USER}alice123`, {
      userId: "alice123",
      username: "alice",
    });
    await db.put(`${DB_PREFIX.USER}bob456`, {
      userId: "bob456",
      username: "bob",
    });
    await db.put(`${DB_PREFIX.USER}dup111`, {
      userId: "dup111",
      username: "duplicate",
    });
    await db.put(`${DB_PREFIX.USER}dup222`, {
      userId: "dup222",
      username: "duplicate",
    });
  });

  const buildDispatch = () =>
    mock((action: unknown) => {
      if (!action || typeof action !== "object" || !("kind" in action)) {
        throw new Error(`unexpected action: ${JSON.stringify(action)}`);
      }
      const mockAction = action as MockAction;
      if (mockAction.kind === "read") {
        const dbKey = mockAction.input.dbKey;
        if (typeof dbKey !== "string") {
          throw new Error(`read action missing dbKey: ${JSON.stringify(mockAction)}`);
        }
        return { unwrap: async () => db.get(dbKey).catch(() => null) };
      }
      if (mockAction.kind === "write") {
        const customKey = mockAction.input.customKey;
        const data = mockAction.input.data;
        if (typeof customKey !== "string") {
          throw new Error(`write action missing customKey: ${JSON.stringify(mockAction)}`);
        }
        return { unwrap: async () => db.put(customKey, data) };
      }
      throw new Error(`unexpected action kind: ${JSON.stringify(action)}`);
    });

  test("Directly passing a valid userId adds successfully", async () => {
    const { addMemberAction } = await loadAddMemberAction();
    const state = { auth: { currentUser: { userId: mockCurrentUserId } } };
    const dispatch = buildDispatch();

    const res = await addMemberAction(
      { spaceId, memberId: "charlie789" },
      { dispatch, getState: () => state, extra: { db } }
    );

    expect(res.updatedSpaceData.members).toContain("charlie789");
    const spaceData = await db.get(createSpaceKey.space(spaceId));
    expect(spaceData.members).toContain("charlie789");
  });

  test("Passing a username that exists adds the correct userId", async () => {
    const { addMemberAction } = await loadAddMemberAction();
    const state = { auth: { currentUser: { userId: mockCurrentUserId } } };
    const dispatch = buildDispatch();

    const res = await addMemberAction(
      { spaceId, memberId: "alice" },
      { dispatch, getState: () => state, extra: { db } }
    );

    expect(res.updatedSpaceData.members).toContain("alice123");
    const spaceData = await db.get(createSpaceKey.space(spaceId));
    expect(spaceData.members).toContain("alice123");
  });

  test("Passing a non-existent username falls back to treating it as userId", async () => {
    const { addMemberAction } = await loadAddMemberAction();
    const state = { auth: { currentUser: { userId: mockCurrentUserId } } };
    const dispatch = buildDispatch();

    const res = await addMemberAction(
      { spaceId, memberId: "deadbeef00" },
      { dispatch, getState: () => state, extra: { db } }
    );

    expect(res.updatedSpaceData.members).toContain("deadbeef00");
    const spaceData = await db.get(createSpaceKey.space(spaceId));
    expect(spaceData.members).toContain("deadbeef00");
  });

  test("Throws error when username matches multiple users", async () => {
    const { addMemberAction } = await loadAddMemberAction();
    const state = { auth: { currentUser: { userId: mockCurrentUserId } } };
    const dispatch = buildDispatch();

    expect(
      addMemberAction(
        { spaceId, memberId: "duplicate" },
        { dispatch, getState: () => state, extra: { db } }
      )
    ).rejects.toThrow("找到多个用户名为 duplicate 的用户，请使用用户 ID 邀请");
  });

  test("Throws error when member already exists", async () => {
    const { addMemberAction } = await loadAddMemberAction();
    const state = { auth: { currentUser: { userId: mockCurrentUserId } } };
    const dispatch = buildDispatch();

    expect(
      addMemberAction(
        { spaceId, memberId: mockCurrentUserId },
        { dispatch, getState: () => state, extra: { db } }
      )
    ).rejects.toThrow("成员已存在");
  });

  test("Throws error when member already exists (resolved via username)", async () => {
    const { addMemberAction } = await loadAddMemberAction();
    const state = { auth: { currentUser: { userId: mockCurrentUserId } } };
    const dispatch = buildDispatch();

    await addMemberAction(
      { spaceId, memberId: "alice" },
      { dispatch, getState: () => state, extra: { db } }
    );

    expect(
      addMemberAction(
        { spaceId, memberId: "alice" },
        { dispatch, getState: () => state, extra: { db } }
      )
    ).rejects.toThrow("成员已存在");
  });
});
