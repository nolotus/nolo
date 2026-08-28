import { describe, expect, it, mock } from "bun:test";

const readMock = mock((input: any) => ({ kind: "read", input }));
const patchMock = mock((input: any) => ({ kind: "patch", input }));
const removeMock = mock((input: any) => ({ kind: "remove", input }));
const deleteDbKeyMock = mock((contentKey: string, spaceId?: string | null) => ({
  kind: "deleteDbKey",
  contentKey,
  spaceId,
}));

let moduleVersion = 0;

async function loadDeleteSpaceAction() {
  const realDbSlice = await import("database/dbSlice");
  const realAuthSlice = await import("auth/authSlice");
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    read: readMock,
    patch: patchMock,
    remove: removeMock,
    write: (input: any) => ({ kind: "write", input }),
  }));

  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    // Match real selectUserId; keep auth.userId fallback for this suite's getState.
    selectUserId: (state: any) =>
      state.auth?.currentUser?.userId ?? state.auth?.userId ?? null,
  }));

  mock.module("app/hooks/deleteDbKey", () => ({
    deleteDbKey: deleteDbKeyMock,
  }));

  const mod = await import(`./deleteSpaceAction?test=${moduleVersion++}`);
  mock.restore();
  return mod;
}

describe("deleteSpaceAction", () => {
  it("move-owned-to-all clears spaceId without deleting entities", async () => {
    const { deleteSpaceAction } = await loadDeleteSpaceAction();
    readMock.mockClear();
    patchMock.mockClear();
    removeMock.mockClear();
    deleteDbKeyMock.mockClear();

    const spaceId = "demo-space";
    const pageKey = "page-user-1";
    const tableKey = "meta-user-table-1";
    const dialogKey = "dialog-user-1";

    const spaceData = {
      id: spaceId,
      dbKey: `space-${spaceId}`,
      ownerId: "user",
      members: ["user"],
      contents: {
        [pageKey]: {
          title: "Page",
          type: "page",
          contentKey: pageKey,
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
        },
        [tableKey]: {
          title: "Table",
          type: "table",
          contentKey: tableKey,
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
        },
        [dialogKey]: {
          title: "Dialog",
          type: "dialog",
          contentKey: dialogKey,
          pinned: false,
          createdAt: 1,
          updatedAt: 1,
        },
      },
    };

    const entityMap: Record<string, any> = {
      [pageKey]: { dbKey: pageKey, spaceId, updatedAt: "2026-03-01T00:00:00.000Z" },
      [tableKey]: {
        dbKey: tableKey,
        tenantId: "user",
        tableId: "table-1",
        spaceId,
        updatedAt: "2026-03-01T00:00:00.000Z",
      },
      [dialogKey]: { dbKey: dialogKey, spaceId, updatedAt: "2026-03-01T00:00:00.000Z" },
    };

    const dispatch = mock((action: any) => {
      if (action.kind === "read") {
        const dbKey = action.input.dbKey;
        if (dbKey === `space-${spaceId}`) {
          return { unwrap: async () => spaceData };
        }
        return { unwrap: async () => entityMap[dbKey] ?? null };
      }

      if (action.kind === "patch") {
        return { unwrap: async () => true };
      }

      if (action.kind === "remove") {
        return { unwrap: async () => true };
      }

      if (action.kind === "deleteDbKey") {
        return { unwrap: async () => true };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const result = await deleteSpaceAction(
      { spaceId, strategy: "move-owned-to-all" },
      {
        dispatch,
        getState: () => ({ auth: { userId: "user" } }),
      }
    );

    expect(result).toEqual({ spaceId, strategy: "move-owned-to-all" });
    expect(deleteDbKeyMock).not.toHaveBeenCalled();
    expect(patchMock).toHaveBeenCalledTimes(3);
    expect(patchMock.mock.calls.map(([input]) => input)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          dbKey: pageKey,
          changes: expect.objectContaining({ spaceId: null }),
        }),
        expect.objectContaining({
          dbKey: tableKey,
          changes: expect.objectContaining({ spaceId: null }),
        }),
        expect.objectContaining({
          dbKey: dialogKey,
          changes: expect.objectContaining({ spaceId: null }),
        }),
      ])
    );
    expect(removeMock.mock.calls.map(([key]) => key)).toEqual(
      expect.arrayContaining([`space-${spaceId}`, `space-member-user-${spaceId}`])
    );
  });

  it("deletes space body and membership keys without default-space preference writes", async () => {
    const { deleteSpaceAction } = await loadDeleteSpaceAction();
    readMock.mockClear();
    patchMock.mockClear();
    removeMock.mockClear();
    deleteDbKeyMock.mockClear();

    const spaceData = {
      id: "team",
      dbKey: "space-team",
      ownerId: "owner",
      members: ["owner", "member"],
      contents: {},
    };

    const dispatch = mock((action: any) => {
      if (action.kind === "read") {
        return { unwrap: async () => spaceData };
      }
      if (action.kind === "remove") {
        return { unwrap: async () => true };
      }
      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    await deleteSpaceAction("team", {
      dispatch,
      getState: () => ({ auth: { userId: "owner" } }),
    });

    expect(removeMock.mock.calls.map(([key]) => key)).toEqual(
      expect.arrayContaining([
        "space-team",
        "space-member-owner-team",
        "space-member-member-team",
      ])
    );
  });
});
