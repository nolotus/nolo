import { describe, expect, mock, test } from "bun:test";

import { createDeleteSpacesToolHandlers } from "./deleteSpacesTool";

const buildThunkApi = () => {
  const deleted: any[] = [];
  const serverDeletedKeys: string[] = [];
  const readRecords: Record<string, any> = {
    "space-a": {
      id: "a",
      name: "rn_owner_verify_0504",
      ownerId: "user-a",
      members: ["user-a", "user-b"],
      contents: { "dialog-user-a-1": {} },
    },
    "space-b": {
      id: "b",
      name: "rn_owner_verify_0504b",
      ownerId: "user-a",
      members: ["user-a"],
      contents: {},
    },
  };
  const thunkApi = {
    getState: () => ({
      auth: { userId: "user-a" },
      space: {
        memberSpaces: [
          { spaceId: "a", spaceName: "rn_owner_verify_0504", role: "owner", ownerId: "user-a" },
          { spaceId: "b", spaceName: "rn_owner_verify_0504b", role: "owner", ownerId: "user-a" },
          { spaceId: "c", spaceName: "other", role: "owner", ownerId: "user-a" },
        ],
      },
    }),
    dispatch: mock((action: any) => {
      if (action.kind === "read") {
        return {
          unwrap: async () => readRecords[action.payload.dbKey],
        };
      }
      if (action.kind === "deleteSpace") {
        deleted.push(action.payload);
        return { unwrap: async () => action.payload };
      }
      throw new Error(`unexpected action ${JSON.stringify(action)}`);
    }),
  };
  const handlers = createDeleteSpacesToolHandlers({
    selectCurrentUserId: (state) => state.auth.userId,
    selectMemberSpaces: (state) => state.space.memberSpaces,
    readSpaceRecord: async (_thunkApi, spaceId) => readRecords[`space-${spaceId}`],
    selectDeleteServers: () => ["http://local.test"],
    deleteServerKey: async (_thunkApi, _server, dbKey) => {
      serverDeletedKeys.push(dbKey);
      return { ok: true, status: 200, detail: "" };
    },
    deleteOwnedSpace: async (_thunkApi, input) => {
      deleted.push(input);
    },
  });
  return { thunkApi, deleted, serverDeletedKeys, handlers };
};

describe("deleteSpacesTool", () => {
  test("preview lists matching spaces without deleting", async () => {
    const { thunkApi, deleted, handlers } = buildThunkApi();

    const result = await handlers.preview(
      { query: "rn_owner_verify_0504", matchMode: "prefix" },
      thunkApi
    );

    expect(result.rawData.deletable.map((item: any) => item.spaceId)).toEqual(["a", "b"]);
    expect(result.displayData).toContain("需要确认后才会删除");
    expect(deleted).toEqual([]);
  });

  test("confirmed execution deletes only confirmed fresh matches", async () => {
    const { thunkApi, deleted, serverDeletedKeys, handlers } = buildThunkApi();

    const result = await handlers.execute(
      {
        query: "rn_owner_verify_0504",
        matchMode: "prefix",
        confirmedSpaceIds: ["b", "missing"],
      },
      thunkApi
    );

    expect(serverDeletedKeys).toEqual(["space-member-user-a-b", "space-b"]);
    expect(deleted).toEqual([{ spaceId: "b", strategy: "delete-space-only" }]);
    expect(result.rawData.deletedSpaceIds).toEqual(["b"]);
    expect(result.rawData.deletedKeys).toEqual(["space-member-user-a-b", "space-b"]);
    expect(result.rawData.deletedRecords).toEqual([
      { server: "http://local.test", dbKey: "space-member-user-a-b" },
      { server: "http://local.test", dbKey: "space-b" },
    ]);
    expect(result.rawData.deleteServers).toEqual(["http://local.test"]);
    expect(result.rawData.failures).toEqual([]);
    expect(result.rawData.missingConfirmedSpaceIds).toEqual(["missing"]);
  });

  test("confirmed execution reports failures and does not mark a failed target deleted", async () => {
    const { thunkApi, deleted, handlers } = buildThunkApi();
    const failingHandlers = createDeleteSpacesToolHandlers({
      selectCurrentUserId: (state) => state.auth.userId,
      selectMemberSpaces: (state) => state.space.memberSpaces,
      readSpaceRecord: async (_thunkApi, spaceId) => ({
        id: spaceId,
        name: `rn_owner_verify_0504${spaceId}`,
        ownerId: "user-a",
        members: ["user-a"],
        contents: {},
      }),
      selectDeleteServers: () => ["http://local.test"],
      deleteServerKey: async (_thunkApi, _server, dbKey) => ({
        ok: dbKey !== "space-b",
        status: dbKey === "space-b" ? 500 : 200,
        detail: dbKey === "space-b" ? "boom" : "",
      }),
      deleteOwnedSpace: async (_thunkApi, input) => {
        deleted.push(input);
      },
    });

    const result = await failingHandlers.execute(
      {
        query: "rn_owner_verify_0504",
        matchMode: "prefix",
        confirmedSpaceIds: ["b"],
      },
      thunkApi
    );

    expect(deleted).toEqual([]);
    expect(result.rawData.deletedSpaceIds).toEqual([]);
    expect(result.rawData.failures).toEqual([
      { server: "http://local.test", dbKey: "space-b", status: 500, detail: "boom" },
    ]);
  });

  test("confirmed execution deletes matching keys on every configured list server", async () => {
    const { thunkApi, deleted } = buildThunkApi();
    const calls: Array<{ server: string; dbKey: string }> = [];
    const handlers = createDeleteSpacesToolHandlers({
      selectCurrentUserId: (state) => state.auth.userId,
      selectMemberSpaces: (state) => state.space.memberSpaces,
      readSpaceRecord: async (_thunkApi, spaceId) => ({
        id: spaceId,
        name: `rn_owner_verify_0504${spaceId}`,
        ownerId: "user-a",
        members: ["user-a"],
        contents: {},
      }),
      selectDeleteServers: () => ["http://local.test", "https://nolo.chat"],
      deleteServerKey: async (_thunkApi, server, dbKey) => {
        calls.push({ server, dbKey });
        return { ok: true, status: 200, detail: "" };
      },
      deleteOwnedSpace: async (_thunkApi, input) => {
        deleted.push(input);
      },
    });

    const result = await handlers.execute(
      {
        query: "rn_owner_verify_0504",
        matchMode: "prefix",
        confirmedSpaceIds: ["b"],
      },
      thunkApi
    );

    expect(calls).toEqual([
      { server: "http://local.test", dbKey: "space-member-user-a-b" },
      { server: "http://local.test", dbKey: "space-b" },
      { server: "https://nolo.chat", dbKey: "space-member-user-a-b" },
      { server: "https://nolo.chat", dbKey: "space-b" },
    ]);
    expect(result.rawData.deletedSpaceIds).toEqual(["b"]);
    expect(result.rawData.deletedRecords).toEqual(calls);
  });
});
