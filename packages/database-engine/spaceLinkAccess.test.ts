import { describe, expect, it } from "bun:test";
import {
  findLinkedMemberSpaceId,
  getContentKeyCandidates,
  hasSpaceMembership,
  isPrivateRecordSharedWithMember,
  normalizeSpaceId,
} from "./spaceLinkAccess";

describe("spaceLinkAccess", () => {
  it("normalizeSpaceId strips space- prefix", () => {
    expect(normalizeSpaceId("space-team")).toBe("team");
    expect(normalizeSpaceId("team")).toBe("team");
    expect(normalizeSpaceId("")).toBeNull();
  });

  it("getContentKeyCandidates unions key shapes", () => {
    expect(
      getContentKeyCandidates("agent-user-A-1", {
        dbKey: "agent-user-A-1",
        id: "1",
        key: "legacy-key",
        contentKey: "ck",
      }),
    ).toEqual(["agent-user-A-1", "ck", "legacy-key", "1"]);
  });

  it("hasSpaceMembership checks membership key then space.members", async () => {
    const rows = new Map<string, unknown>([
      ["space-member-user-B-team", { spaceId: "team", userId: "user-B" }],
    ]);
    const store = {
      get: async (key: string) => {
        if (!rows.has(key)) throw Object.assign(new Error("missing"), { notFound: true });
        return rows.get(key);
      },
    };
    expect(await hasSpaceMembership(store, "user-B", "team")).toBe(true);
    expect(await hasSpaceMembership(store, "user-C", "team")).toBe(false);

    const membersOnly = {
      get: async (key: string) => {
        if (key === "space-team") {
          return { ownerId: "user-A", members: ["user-A", "user-C"] };
        }
        throw Object.assign(new Error("missing"), { notFound: true });
      },
    };
    expect(await hasSpaceMembership(membersOnly, "user-C", "space-team")).toBe(
      true,
    );
  });

  it("findLinkedMemberSpaceId matches contents by any candidate key", async () => {
    const agentKey = "agent-user-A-agent-1";
    const rows = new Map<string, unknown>([
      ["space-member-user-B-shared", { spaceId: "shared", userId: "user-B" }],
      [
        "space-shared",
        {
          id: "shared",
          contents: {
            "agent-1": { type: "agent" },
          },
        },
      ],
    ]);
    const store = {
      get: async (key: string) => {
        if (!rows.has(key)) throw Object.assign(new Error("missing"), { notFound: true });
        return rows.get(key);
      },
      iterator: async function* (options: { gte: string; lte: string }) {
        for (const [key, value] of rows) {
          if (key >= options.gte && key <= options.lte) {
            yield [key, value] as [string, unknown];
          }
        }
      },
    };

    expect(
      await findLinkedMemberSpaceId(store, "user-B", agentKey, {
        id: "agent-1",
      }),
    ).toBe("shared");
    expect(
      await isPrivateRecordSharedWithMember(store, "user-B", agentKey, {
        id: "agent-1",
      }),
    ).toBe(true);
  });
});
