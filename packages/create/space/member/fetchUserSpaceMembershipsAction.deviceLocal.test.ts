/**
 * Device-local Space foundation — membership list union.
 * Guest = local only; account A/B = local + account; remote verify bypass;
 * collision prefers account; no token required for guest.
 */
import { describe, expect, it, beforeEach } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import { DEVICE_LOCAL_OWNER_ID } from "database/authority/deviceLocal";
import { clearMembershipFetchCache } from "../spaceAccess";
import { fetchUserSpaceMembershipsAction } from "./fetchUserSpaceMembershipsAction";

const createThunkApi = (
  db: MemoryDB,
  servers: string[] = [],
  token: string | null = servers.length > 0 ? "token" : null,
  dispatch?: (action: any) => void
) =>
  ({
    getState: () => ({
      auth: { currentToken: token },
      space: { memberSpaces: null },
      settings: {
        currentServer: servers[0] ?? "",
        syncServers: servers.slice(1),
      },
    }),
    extra: { db },
    dispatch,
  }) as any;

describe("fetchUserSpaceMembershipsAction device-local foundation", () => {
  // 同 fetchUserSpaceMembershipsAction.test.ts：清理模块级 membershipFetchCache，
  // 避免前序成功用例污染"远程不可用"的拒绝断言。
  beforeEach(() => {
    clearMembershipFetchCache();
  });
  it("guest lists only space-member-local-* without token/server", async () => {
    const db = new MemoryDB();
    await db.put("space-member-local-01LOCALSPACE000000000001", {
      userId: "local",
      spaceId: "01LOCALSPACE000000000001",
      spaceName: "Local Only",
      role: "owner",
      ownerId: "local",
      joinedAt: 100,
    });
    await db.put("space-01LOCALSPACE000000000001", {
      id: "01LOCALSPACE000000000001",
      name: "Local Only",
      ownerId: "local",
      userId: "local",
      members: ["local"],
    });
    // Account row must not appear for guest
    await db.put("space-member-userA-01ACCTSPACE000000000001", {
      userId: "userA",
      spaceId: "01ACCTSPACE000000000001",
      spaceName: "Account Space",
      role: "owner",
      joinedAt: 200,
    });

    const remoteHits: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      remoteHits.push(String(input));
      return new Response("should not be called for guest", { status: 500 });
    }) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        DEVICE_LOCAL_OWNER_ID,
        createThunkApi(db, [], null)
      );

      expect(result.map((m) => m.spaceId)).toEqual([
        "01LOCALSPACE000000000001",
      ]);
      expect(result[0].userId).toBe(DEVICE_LOCAL_OWNER_ID);
      expect(remoteHits).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("account A unions local + A memberships; account B sees local + B only", async () => {
    const db = new MemoryDB();
    await db.put("space-member-local-01LOCALSPACE000000000002", {
      userId: "local",
      spaceId: "01LOCALSPACE000000000002",
      spaceName: "Device Local",
      role: "owner",
      ownerId: "local",
      joinedAt: 50,
    });
    await db.put("space-01LOCALSPACE000000000002", {
      id: "01LOCALSPACE000000000002",
      ownerId: "local",
      members: ["local"],
    });
    await db.put("space-member-userA-01ASPACE0000000000000001", {
      userId: "userA",
      spaceId: "01ASPACE0000000000000001",
      spaceName: "A Space",
      role: "owner",
      joinedAt: 100,
    });
    await db.put("space-01ASPACE0000000000000001", {
      id: "01ASPACE0000000000000001",
      ownerId: "userA",
      members: ["userA"],
    });
    await db.put("space-member-userB-01BSPACE0000000000000001", {
      userId: "userB",
      spaceId: "01BSPACE0000000000000001",
      spaceName: "B Space",
      role: "owner",
      joinedAt: 200,
    });
    await db.put("space-01BSPACE0000000000000001", {
      id: "01BSPACE0000000000000001",
      ownerId: "userB",
      members: ["userB"],
    });

    const forA = await fetchUserSpaceMembershipsAction(
      "userA",
      createThunkApi(db)
    );
    const forB = await fetchUserSpaceMembershipsAction(
      "userB",
      createThunkApi(db)
    );

    expect(forA.map((m) => m.spaceId).sort()).toEqual(
      ["01ASPACE0000000000000001", "01LOCALSPACE000000000002"].sort()
    );
    expect(forB.map((m) => m.spaceId).sort()).toEqual(
      ["01BSPACE0000000000000001", "01LOCALSPACE000000000002"].sort()
    );
    expect(forA.some((m) => m.spaceId === "01BSPACE0000000000000001")).toBe(
      false
    );
    expect(forB.some((m) => m.spaceId === "01ASPACE0000000000000001")).toBe(
      false
    );
  });

  it("device-local membership bypasses remote space verification", async () => {
    const db = new MemoryDB();
    await db.put("space-member-local-01LOCALSPACE000000000003", {
      userId: "local",
      spaceId: "01LOCALSPACE000000000003",
      spaceName: "Local Bypass",
      role: "owner",
      ownerId: "local",
      joinedAt: 10,
    });
    await db.put("space-01LOCALSPACE000000000003", {
      id: "01LOCALSPACE000000000003",
      ownerId: "local",
      members: ["local"],
    });
    // Account membership present and will appear in remote index
    await db.put("space-member-user1-01REMOTEOK0000000000001", {
      userId: "user1",
      spaceId: "01REMOTEOK0000000000001",
      spaceName: "Remote Ok",
      role: "owner",
      joinedAt: 20,
    });
    await db.put("space-01REMOTEOK0000000000001", {
      id: "01REMOTEOK0000000000001",
      ownerId: "user1",
      members: ["user1"],
    });

    const remoteSpaceReads: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(
          JSON.stringify([
            {
              userId: "user1",
              spaceId: "01REMOTEOK0000000000001",
              spaceName: "Remote Ok",
              role: "owner",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/api/v1/db/read/space-")) {
        remoteSpaceReads.push(url);
        // Local space must never be remote-read for membership verify
        if (url.includes("01LOCALSPACE000000000003")) {
          return new Response("must not remote-verify local", { status: 500 });
        }
        if (url.includes("01REMOTEOK0000000000001")) {
          return new Response(
            JSON.stringify({
              id: "01REMOTEOK0000000000001",
              ownerId: "user1",
              members: ["user1"],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          );
        }
      }
      return new Response(JSON.stringify({ data: { data: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"])
      );

      const ids = result.map((m) => m.spaceId).sort();
      expect(ids).toEqual(
        ["01LOCALSPACE000000000003", "01REMOTEOK0000000000001"].sort()
      );
      expect(
        remoteSpaceReads.some((u) => u.includes("01LOCALSPACE000000000003"))
      ).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("prefers active-account membership when spaceId collides with local", async () => {
    const db = new MemoryDB();
    const sharedId = "01COLLIDESPACE00000000001";
    await db.put(`space-member-local-${sharedId}`, {
      userId: "local",
      spaceId: sharedId,
      spaceName: "Local Collision",
      role: "owner",
      ownerId: "local",
      joinedAt: 1,
    });
    await db.put(`space-member-user1-${sharedId}`, {
      userId: "user1",
      spaceId: sharedId,
      spaceName: "Account Collision",
      role: "member",
      ownerId: "user1",
      joinedAt: 2,
    });
    await db.put(`space-${sharedId}`, {
      id: sharedId,
      // Lists both so either check could pass — preference must pick account row
      ownerId: "user1",
      members: ["user1", "local"],
    });

    const result = await fetchUserSpaceMembershipsAction(
      "user1",
      createThunkApi(db)
    );

    expect(result).toHaveLength(1);
    expect(result[0].spaceId).toBe(sharedId);
    expect(result[0].userId).toBe("user1");
    expect(result[0].spaceName).toBe("Account Collision");
  });

  it("preserves account remote-unavailable error behavior", async () => {
    const db = new MemoryDB();
    await db.put("space-member-local-01LOCALSPACE000000000004", {
      userId: "local",
      spaceId: "01LOCALSPACE000000000004",
      spaceName: "Local",
      role: "owner",
      joinedAt: 1,
    });
    await db.put("space-01LOCALSPACE000000000004", {
      id: "01LOCALSPACE000000000004",
      ownerId: "local",
      members: ["local"],
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response("unavailable", { status: 503 });
      }
      return new Response(`unexpected ${url}`, { status: 500 });
    }) as any;

    try {
      await expect(
        fetchUserSpaceMembershipsAction(
          "user1",
          createThunkApi(db, ["http://127.0.0.1:38123"])
        )
      ).rejects.toThrow("space_membership_remote_unavailable");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("guest with configured servers still skips remote (no token required)", async () => {
    const db = new MemoryDB();
    await db.put("space-member-local-01LOCALSPACE000000000005", {
      userId: "local",
      spaceId: "01LOCALSPACE000000000005",
      spaceName: "Guest Server Config",
      role: "owner",
      joinedAt: 1,
    });
    await db.put("space-01LOCALSPACE000000000005", {
      id: "01LOCALSPACE000000000005",
      ownerId: "local",
      members: ["local"],
    });

    const remoteHits: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      remoteHits.push(String(input));
      return new Response("fail", { status: 503 });
    }) as any;

    try {
      // servers present but token null — guest must still succeed
      const result = await fetchUserSpaceMembershipsAction(
        DEVICE_LOCAL_OWNER_ID,
        createThunkApi(db, ["https://nolo.chat"], null)
      );
      expect(result.map((m) => m.spaceId)).toEqual([
        "01LOCALSPACE000000000005",
      ]);
      expect(remoteHits).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("guest drops ghost local membership when Space body is missing", async () => {
    const db = new MemoryDB();
    // Membership without body — must not surface as openable Space
    await db.put("space-member-local-01GHOSTSPACE000000000001", {
      userId: "local",
      spaceId: "01GHOSTSPACE000000000001",
      spaceName: "Ghost",
      role: "owner",
      ownerId: "local",
      joinedAt: 10,
    });
    // Valid local Space still listed
    await db.put("space-member-local-01REALSPACE0000000000001", {
      userId: "local",
      spaceId: "01REALSPACE0000000000001",
      spaceName: "Real",
      role: "owner",
      ownerId: "local",
      joinedAt: 20,
    });
    await db.put("space-01REALSPACE0000000000001", {
      id: "01REALSPACE0000000000001",
      ownerId: "local",
      userId: "local",
      members: ["local"],
    });

    const result = await fetchUserSpaceMembershipsAction(
      DEVICE_LOCAL_OWNER_ID,
      createThunkApi(db)
    );

    expect(result.map((m) => m.spaceId)).toEqual([
      "01REALSPACE0000000000001",
    ]);
  });

  it("logged-in union drops ghost local membership but keeps account row", async () => {
    const db = new MemoryDB();
    await db.put("space-member-local-01GHOSTSPACE000000000002", {
      userId: "local",
      spaceId: "01GHOSTSPACE000000000002",
      spaceName: "Ghost Local",
      role: "owner",
      ownerId: "local",
      joinedAt: 5,
    });
    // Tombstoned local body also drops (same as missing)
    await db.put("space-member-local-01TOMBSPACE0000000000001", {
      userId: "local",
      spaceId: "01TOMBSPACE0000000000001",
      spaceName: "Tombstoned Local",
      role: "owner",
      ownerId: "local",
      joinedAt: 6,
    });
    await db.put("space-01TOMBSPACE0000000000001", {
      id: "01TOMBSPACE0000000000001",
      ownerId: "local",
      members: ["local"],
      deletedAt: Date.now(),
    });
    await db.put("space-member-userA-01ASPACE0000000000000002", {
      userId: "userA",
      spaceId: "01ASPACE0000000000000002",
      spaceName: "A Space",
      role: "owner",
      joinedAt: 100,
    });
    await db.put("space-01ASPACE0000000000000002", {
      id: "01ASPACE0000000000000002",
      ownerId: "userA",
      members: ["userA"],
    });

    const result = await fetchUserSpaceMembershipsAction(
      "userA",
      createThunkApi(db)
    );

    expect(result.map((m) => m.spaceId)).toEqual([
      "01ASPACE0000000000000002",
    ]);
    expect(result.some((m) => m.spaceId === "01GHOSTSPACE000000000002")).toBe(
      false
    );
    expect(result.some((m) => m.spaceId === "01TOMBSPACE0000000000001")).toBe(
      false
    );
  });
});
