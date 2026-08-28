import { describe, expect, it, mock } from "bun:test";

const readMock = mock((input: any) => ({ kind: "read", input }));
const writeMock = mock((input: any) => ({ kind: "write", input }));
const removeMock = mock((input: any) => ({ kind: "remove", input }));

let moduleVersion = 0;

async function loadRemoveMemberAction() {
  const realDbSlice = await import("database/dbSlice");
  const realAuthSlice = await import("auth/authSlice");
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    read: readMock,
    write: writeMock,
    remove: removeMock,
  }));
  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectUserId: (state: any) => state.auth.userId,
  }));

  const mod = await import(`./removeMemberAction?test=${moduleVersion++}`);
  mock.restore();
  return mod;
}

describe("removeMemberAction", () => {
  it("removes the member key from the space", async () => {
    const { removeMemberAction } = await loadRemoveMemberAction();
    readMock.mockClear();
    writeMock.mockClear();
    removeMock.mockClear();

    const spaceData = {
      id: "team",
      dbKey: "space-team",
      ownerId: "owner",
      members: ["owner", "member"],
      name: "Team",
    };

    const dispatch = mock((action: any) => {
      if (action.kind === "read") {
        return { unwrap: async () => spaceData };
      }
      if (action.kind === "write") {
        return { unwrap: async () => true };
      }
      if (action.kind === "remove") {
        return { unwrap: async () => true };
      }
      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const result = await removeMemberAction(
      { spaceId: "team", memberId: "member" },
      {
        dispatch,
        getState: () => ({ auth: { userId: "owner" } }),
      }
    );

    expect(result.updatedSpaceData.members).toEqual(["owner"]);
    expect(removeMock).toHaveBeenCalledWith("space-member-member-team");
  });
});
