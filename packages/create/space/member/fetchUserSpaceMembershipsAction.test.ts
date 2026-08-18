import { describe, expect, it, beforeEach } from "bun:test";
import { MemoryDB } from "database-engine/MemoryDB";
import { clearMembershipFetchCache } from "../spaceAccess";
import { fetchUserSpaceMembershipsAction } from "./fetchUserSpaceMembershipsAction";

const createThunkApi = (
  db: MemoryDB,
  servers: string[] = [],
  token: string | null = servers.length > 0 ? "token" : null,
  dispatch?: (action: any) => void,
  currentUserId: string = "user1"
) =>
  ({
    getState: () => ({
      auth: { currentToken: token, currentUser: { userId: currentUserId } },
      space: { memberSpaces: null },
      settings: {
        currentServer: servers[0] ?? "",
        syncServers: servers.slice(1),
      },
    }),
    extra: { db },
    dispatch,
  }) as any;

describe("fetchUserSpaceMembershipsAction", () => {
  // membershipFetchCache 是模块级 30s TTL 缓存；不清理会跨测试命中
  // 前序测试的成功结果，导致"远程不可用"场景被错误放行。
  beforeEach(() => {
    clearMembershipFetchCache();
  });

  it("hydrates cached local memberships before slow remote verification finishes", async () => {
    const db = new MemoryDB();
    await db.put("space-member-user1-local", {
      userId: "user1",
      spaceId: "local",
      spaceName: "Local",
      role: "owner",
    });
    await db.put("space-local", {
      id: "local",
      name: "Local",
      ownerId: "user1",
      members: [],
    });

    const dispatchCalls: any[] = [];
    let releaseRemote!: () => void;
    const remoteMembershipsReady = new Promise<void>((resolve) => {
      releaseRemote = resolve;
    });
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        await remoteMembershipsReady;
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/api/v1/db/read/space-local")) {
        return new Response(
          JSON.stringify({
            id: "local",
            name: "Local",
            ownerId: "user1",
            members: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(JSON.stringify({ data: { data: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as any;

    try {
      const resultPromise = fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"], "token", (action) => {
          dispatchCalls.push(action);
        })
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(dispatchCalls).toEqual([
        {
          type: "space/hydrateMemberSpacesFromLocal",
          payload: [
            expect.objectContaining({
              spaceId: "local",
              spaceName: "Local",
            }),
          ],
        },
      ]);

      releaseRemote();
      await resultPromise;
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("filters deleted local memberships", async () => {
    const db = new MemoryDB();
    await db.put("space-member-user1-active", {
      userId: "user1",
      spaceId: "active",
    });
    await db.put("space-member-user1-deleted", {
      userId: "user1",
      spaceId: "deleted",
      deletedAt: "2026-05-06T06:47:12.424Z",
    });

    const result = await fetchUserSpaceMembershipsAction(
      "user1",
      createThunkApi(db)
    );

    expect(result.map((membership) => membership.spaceId)).toEqual(["active"]);
  });

  it("does not preserve orphan local memberships when the local space is deleted", async () => {
    const db = new MemoryDB();
    await db.put("space-member-user1-deleted", {
      userId: "user1",
      spaceId: "deleted",
    });
    await db.put("space-deleted", {
      spaceId: "deleted",
      deletedAt: "2026-05-06T06:47:12.424Z",
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"])
      );

      expect(result).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not let unverified local cached spaces revive memberships missing from a successful remote read", async () => {
    const db = new MemoryDB();
    await db.put("space-member-user1-stale", {
      userId: "user1",
      spaceId: "stale",
      spaceName: "Stale",
    });
    await db.put("space-stale", {
      id: "stale",
      name: "Stale",
      updatedAt: "2026-05-06T06:47:12.424Z",
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"])
      );

      expect(result).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("keeps a local membership missing from the remote index when the remote space still lists the user", async () => {
    const db = new MemoryDB();
    await db.put("space-member-user1-live", {
      userId: "user1",
      spaceId: "live",
      spaceName: "Live",
      role: "owner",
    });
    await db.put("space-live", {
      id: "live",
      name: "Live",
      ownerId: "user1",
      members: [],
      updatedAt: "2026-05-06T06:47:12.424Z",
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/api/v1/db/read/space-live")) {
        return new Response(
          JSON.stringify({
            id: "live",
            name: "Live",
            ownerId: "user1",
            members: [],
            updatedAt: "2026-05-06T06:47:12.424Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"])
      );

      expect(result.map((membership) => membership.spaceId)).toEqual(["live"]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("recovers visible spaces from user content summaries when membership indexes are empty", async () => {
    const db = new MemoryDB();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.startsWith("https://nolo.chat/api/v1/db/query/user1")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          includeDeleted: true,
          summary: true,
        });
        const headers = new Headers(init?.headers);
        expect(headers.get("Authorization")).toBe("Bearer token");
        return new Response(
          JSON.stringify({
            data: {
              data: [
                {
                  dbKey: "page-user1-doc",
                  type: "page",
                  userId: "user1",
                  title: "Doc",
                  spaceId: "recovered",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.endsWith("/api/v1/db/read/space-recovered")) {
        return new Response(
          JSON.stringify({
            id: "recovered",
            name: "Recovered Space",
            ownerId: "user1",
            members: ["user1"],
            updatedAt: "2026-05-20T10:00:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const dispatchCalls: any[] = [];
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["https://nolo.chat"], "token", (action) => {
          dispatchCalls.push(action);
        })
      );

      // Recover is fire-and-forget: the thunk return no longer contains it.
      expect(result).toEqual([]);

      // Recover runs in the background after the thunk resolves; wait for the
      // appendRecoveredMemberships dispatch to land.
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(dispatchCalls).toEqual([
        {
          type: "space/appendRecoveredMemberships",
          payload: [
            expect.objectContaining({
              userId: "user1",
              spaceId: "recovered",
              spaceName: "Recovered Space",
              role: "owner",
            }),
          ],
        },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("sends bearer auth on recovery query and omits Authorization when token is absent", async () => {
    const db = new MemoryDB();
    const originalFetch = globalThis.fetch;
    const recoveryAuthHeaders: Array<string | null> = [];

    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.startsWith("https://nolo.chat/api/v1/db/query/user1")) {
        const headers = new Headers(init?.headers);
        recoveryAuthHeaders.push(headers.get("Authorization"));
        // Never emit a malformed empty/null bearer.
        expect(headers.get("Authorization")).not.toBe("Bearer ");
        expect(headers.get("Authorization")).not.toBe("Bearer null");
        expect(headers.get("Authorization")).not.toBe("Bearer undefined");
        return new Response(JSON.stringify({ data: { data: [] } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["https://nolo.chat"], "recovery-token")
      );
      expect(recoveryAuthHeaders).toEqual(["Bearer recovery-token"]);

      recoveryAuthHeaders.length = 0;
      // Empty token: no remote authority → no recovery query, no malformed header.
      const emptyTokenResult = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["https://nolo.chat"], "")
      );
      expect(emptyTokenResult).toEqual([]);
      expect(recoveryAuthHeaders).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("canonicalizes legacy nolotus servers before reading memberships and recovery summaries", async () => {
    const db = new MemoryDB();
    const seenUrls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      seenUrls.push(url);
      expect(url).not.toContain("nolotus.com");
      if (url === "https://nolo.chat/rpc/getUserSpaceMemberships") {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "https://us.nolo.chat/rpc/getUserSpaceMemberships") {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.startsWith("https://nolo.chat/api/v1/db/query/user1")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          includeDeleted: true,
          summary: true,
        });
        return new Response(
          JSON.stringify({
            data: {
              data: [
                {
                  dbKey: "page-user1-legacy",
                  type: "page",
                  userId: "user1",
                  title: "Legacy",
                  spaceId: "legacy-recovered",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.startsWith("https://us.nolo.chat/api/v1/db/query/user1")) {
        return new Response(JSON.stringify({ data: { data: [] } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url === "https://nolo.chat/api/v1/db/read/space-legacy-recovered") {
        return new Response(
          JSON.stringify({
            id: "legacy-recovered",
            name: "Legacy Recovered",
            ownerId: "user1",
            members: ["user1"],
            updatedAt: "2026-05-20T10:00:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const dispatchCalls: any[] = [];
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["https://nolotus.com", "https://us.nolotus.com"], "token", (action) => {
          dispatchCalls.push(action);
        })
      );

      // Recover is fire-and-forget: the thunk return no longer contains it.
      expect(result).toEqual([]);
      expect(seenUrls).toContain("https://nolo.chat/rpc/getUserSpaceMemberships");
      expect(seenUrls).toContain("https://us.nolo.chat/rpc/getUserSpaceMemberships");

      // Recover runs in the background after the thunk resolves; wait for the
      // appendRecoveredMemberships dispatch to land.
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(dispatchCalls).toEqual([
        {
          type: "space/appendRecoveredMemberships",
          payload: [
            expect.objectContaining({
              userId: "user1",
              spaceId: "legacy-recovered",
              spaceName: "Legacy Recovered",
              role: "owner",
            }),
          ],
        },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not recover a content-referenced space when the remote space no longer lists the user", async () => {
    const db = new MemoryDB();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.startsWith("https://nolo.chat/api/v1/db/query/user1")) {
        return new Response(
          JSON.stringify({
            data: {
              data: [
                {
                  dbKey: "page-user1-doc",
                  type: "page",
                  userId: "user1",
                  title: "Doc",
                  spaceId: "removed",
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.endsWith("/api/v1/db/read/space-removed")) {
        return new Response(
          JSON.stringify({
            id: "removed",
            name: "Removed Space",
            ownerId: "owner",
            members: ["owner"],
            updatedAt: "2026-05-20T10:00:00.000Z",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["https://nolo.chat"])
      );

      expect(result).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects instead of clearing memberships when configured remote membership reads fail", async () => {
    const db = new MemoryDB();
    await db.put("space-member-user1-stale", {
      userId: "user1",
      spaceId: "stale",
      spaceName: "Stale",
    });
    await db.put("space-stale", {
      id: "stale",
      name: "Stale",
      ownerId: "owner",
      members: ["user1"],
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response("unavailable", { status: 503 });
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      await expect(fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"])
      )).rejects.toThrow("space_membership_remote_unavailable");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("hydrates actor-local preview then observably rejects when remote membership is unavailable", async () => {
    const db = new MemoryDB();
    await db.put("space-member-user1-stale", {
      userId: "user1",
      spaceId: "stale",
      spaceName: "Stale Offline",
      role: "member",
    });
    await db.put("space-stale", {
      id: "stale",
      name: "Stale Offline",
      ownerId: "owner",
      members: ["user1"],
    });
    // Ghost account membership (no body) must not appear in offline preview.
    await db.put("space-member-user1-ghost", {
      userId: "user1",
      spaceId: "ghost",
      spaceName: "Ghost",
      role: "member",
    });

    const dispatchCalls: any[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response("unavailable", { status: 503 });
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      await expect(
        fetchUserSpaceMembershipsAction(
          "user1",
          createThunkApi(db, ["http://127.0.0.1:38123"], "token", (action) => {
            dispatchCalls.push(action);
          })
        )
      ).rejects.toThrow("space_membership_remote_unavailable");

      expect(dispatchCalls).toEqual([
        {
          type: "space/hydrateMemberSpacesFromLocal",
          payload: [
            expect.objectContaining({
              spaceId: "stale",
              spaceName: "Stale Offline",
            }),
          ],
        },
      ]);
      expect(
        dispatchCalls[0].payload.map((m: { spaceId: string }) => m.spaceId)
      ).not.toContain("ghost");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("offline preview drops account membership when Space body is tombstoned or actor missing", async () => {
    const db = new MemoryDB();
    await db.put("space-member-user1-tombstoned", {
      userId: "user1",
      spaceId: "tombstoned",
      spaceName: "Tombstoned",
    });
    await db.put("space-tombstoned", {
      id: "tombstoned",
      deletedAt: "2026-05-06T06:47:12.424Z",
    });
    await db.put("space-member-user1-not-listed", {
      userId: "user1",
      spaceId: "not-listed",
      spaceName: "Not Listed",
    });
    await db.put("space-not-listed", {
      id: "not-listed",
      ownerId: "owner",
      members: ["owner"],
    });

    const dispatchCalls: any[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response("unavailable", { status: 503 });
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      await expect(
        fetchUserSpaceMembershipsAction(
          "user1",
          createThunkApi(db, ["http://127.0.0.1:38123"], "token", (action) => {
            dispatchCalls.push(action);
          })
        )
      ).rejects.toThrow("space_membership_remote_unavailable");

      // No usable offline preview → hydrate must not run with empty payload.
      expect(dispatchCalls).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("filters the two known stale route spaces when remote memberships are absent", async () => {
    const db = new MemoryDB();
    await db.put("space-member-user1-01KMX8DFZ6B8FEKQBH8JS0ZDNN", {
      userId: "user1",
      spaceId: "01KMX8DFZ6B8FEKQBH8JS0ZDNN",
      spaceName: "有问题的对话",
    });
    await db.put("space-member-user1-01KKX14CP0TNR6GFQ39GNNTJDJ", {
      userId: "user1",
      spaceId: "01KKX14CP0TNR6GFQ39GNNTJDJ",
      spaceName: "测试空间",
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"])
      );

      expect(result.map((membership) => membership.spaceId)).not.toContain(
        "01KMX8DFZ6B8FEKQBH8JS0ZDNN"
      );
      expect(result.map((membership) => membership.spaceId)).not.toContain(
        "01KKX14CP0TNR6GFQ39GNNTJDJ"
      );
      expect(result).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("lets a local space tombstone hide an active remote membership", async () => {
    const db = new MemoryDB();
    await db.put("space-remote-deleted", {
      id: "remote-deleted",
      name: "Remote Deleted",
      deletedAt: "2026-05-06T06:47:12.424Z",
      updatedAt: "2026-05-06T06:47:12.424Z",
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(
          JSON.stringify([
            {
              userId: "user1",
              spaceId: "remote-deleted",
              spaceName: "Remote Deleted",
              role: "owner",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("should not read tombstoned local space", { status: 500 });
    }) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"])
      );

      expect(result).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("trusts remote RPC memberships directly without re-fetching space records", async () => {
    const db = new MemoryDB();
    const seenUrls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      seenUrls.push(url);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(
          JSON.stringify([
            {
              userId: "user1",
              spaceId: "live",
              spaceName: "Live",
              role: "owner",
            },
            {
              userId: "user1",
              spaceId: "orphan",
              spaceName: "Orphan",
              role: "owner",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"])
      );

      // Remote RPC memberships are trusted directly: even one whose space
      // record is missing (orphan) is returned as-is, with no client-side
      // re-verification against /api/v1/db/read/space-*.
      expect(result.map((membership) => membership.spaceId)).toEqual([
        "live",
        "orphan",
      ]);
      expect(
        seenUrls.some((u) => u.includes("/api/v1/db/read/space-"))
      ).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("trusts remote memberships directly across configured remote servers without re-fetching space records", async () => {
    const db = new MemoryDB();
    const seenUrls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      seenUrls.push(url);
      if (url === "https://nolo.chat/rpc/getUserSpaceMemberships") {
        return new Response(
          JSON.stringify([
            {
              userId: "user1",
              spaceId: "cross-server",
              spaceName: "Cross Server",
              role: "owner",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url === "https://us.nolo.chat/rpc/getUserSpaceMemberships") {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["https://nolo.chat", "https://us.nolo.chat"])
      );

      expect(result.map((membership) => membership.spaceId)).toEqual([
        "cross-server",
      ]);
      expect(seenUrls).toContain("https://nolo.chat/rpc/getUserSpaceMemberships");
      expect(seenUrls).toContain("https://us.nolo.chat/rpc/getUserSpaceMemberships");
      // Direct trust: the membership is returned without re-verifying the
      // space record on any configured server.
      expect(
        seenUrls.some((u) => u.includes("/api/v1/db/read/space-"))
      ).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects remote memberships whose payload user does not match the current user", async () => {
    const db = new MemoryDB();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(
          JSON.stringify([
            {
              userId: "owner",
              spaceId: "bad",
              spaceName: "Bad",
              role: "member",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"])
      );

      expect(result).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("trusts remote RPC memberships even when the active space no longer lists the user", async () => {
    const db = new MemoryDB();
    const seenUrls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      seenUrls.push(url);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(
          JSON.stringify([
            {
              userId: "user1",
              spaceId: "removed",
              spaceName: "Removed",
              role: "member",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"])
      );

      // The RPC result is trusted directly even though the space record no
      // longer lists the user; no space-record re-verification happens.
      expect(result.map((membership) => membership.spaceId)).toEqual([
        "removed",
      ]);
      expect(
        seenUrls.some((u) => u.includes("/api/v1/db/read/space-"))
      ).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("trusts remote RPC memberships even when a stale local space record exists", async () => {
    const db = new MemoryDB();
    await db.put("space-removed", {
      id: "removed",
      name: "Removed",
      ownerId: "owner",
      members: ["user1"],
    });

    const seenUrls: string[] = [];
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      seenUrls.push(url);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(
          JSON.stringify([
            {
              userId: "user1",
              spaceId: "removed",
              spaceName: "Removed",
              role: "member",
            },
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"])
      );

      // The RPC result is trusted directly; the stale local space record is
      // irrelevant and no space-record re-verification happens.
      expect(result.map((membership) => membership.spaceId)).toEqual([
        "removed",
      ]);
      expect(
        seenUrls.some((u) => u.includes("/api/v1/db/read/space-"))
      ).toBe(false);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("recovers multiple candidate spaces in parallel, maintaining sequence and tolerating fetch failures", async () => {
    const db = new MemoryDB();
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/api/v1/db/query/user1")) {
        return new Response(
          JSON.stringify({
            data: {
              data: [
                { spaceId: "space_a" },
                { spaceId: "space_b" },
                { spaceId: "space_c" },
                { spaceId: "space_d" },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/api/v1/db/read/space-space_a")) {
        return new Response(
          JSON.stringify({
            id: "space_a",
            name: "Space A",
            ownerId: "user1",
            members: ["user1"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/api/v1/db/read/space-space_b")) {
        return new Response(
          JSON.stringify({
            id: "space_b",
            name: "Space B",
            ownerId: "otherUser",
            members: ["otherUser"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/api/v1/db/read/space-space_c")) {
        // HTTP-level failure (500 is not retried by fetchWithTransientReadRetry,
        // unlike a network error which would retry for ~1.3s): the candidate
        // read fails immediately and recover must tolerate it without
        // blocking the rest of the batch.
        return new Response(
          JSON.stringify({ error: "Network error fetching space_c" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("/api/v1/db/read/space-space_d")) {
        return new Response(
          JSON.stringify({
            id: "space_d",
            name: "Space D",
            ownerId: "user1",
            members: ["user1"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const dispatchCalls: any[] = [];
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"], "token", (action) => {
          dispatchCalls.push(action);
        })
      );

      // Recover is fire-and-forget: the thunk return no longer contains it.
      expect(result).toEqual([]);

      // Recover runs in the background after the thunk resolves; wait for the
      // appendRecoveredMemberships dispatch to land.
      await new Promise((resolve) => setTimeout(resolve, 50));

      expect(dispatchCalls).toEqual([
        {
          type: "space/appendRecoveredMemberships",
          payload: [
            expect.objectContaining({
              userId: "user1",
              spaceId: "space_a",
              spaceName: "Space A",
              role: "owner",
            }),
            expect.objectContaining({
              userId: "user1",
              spaceId: "space_d",
              spaceName: "Space D",
              role: "owner",
            }),
          ],
        },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("skips appendRecoveredMemberships dispatch when active account changed during in-flight recover", async () => {
    // Actor guard: recover fires fire-and-forget; if the active account
    // switches (logout / account switch dispatches resetSpace) before the
    // recover promise resolves, the recovered memberships belong to the OLD
    // actor and must NOT pollute the new account's list. The guard reads
    // getState().auth.currentUser.userId and compares to the initiating userId.
    const db = new MemoryDB();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      // content query returns one candidate space missing from membership index
      if (url.includes("/api/v1/db/query/")) {
        return new Response(
          JSON.stringify({
            data: { data: [{ dbKey: "page-user1-doc-recovered", spaceId: "recovered", updatedAt: "2026-05-01T00:00:00.000Z" }] },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      // space record fetch for the recovered candidate
      if (url.endsWith("/api/v1/db/read/space-recovered")) {
        return new Response(
          JSON.stringify({ id: "recovered", name: "Recovered", ownerId: "user1", members: ["user1"] }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    const dispatched: any[] = [];
    try {
      // Initiate with userId="user1", but the ACTIVE account is now "user2"
      // (simulating account switch after thunk started). Guard must drop dispatch.
      const result = await fetchUserSpaceMembershipsAction(
        "user1",
        createThunkApi(db, ["http://127.0.0.1:38123"], "token", (a) => dispatched.push(a), "user2")
      );
      // thunk returns empty (no local, no remote memberships, recover is backgrounded)
      expect(result).toEqual([]);
      // Allow in-flight recover to settle
      await new Promise((r) => setTimeout(r, 100));
      // The actor guard must have blocked the append dispatch
      const appendCalls = dispatched.filter((a) => a.type === "space/appendRecoveredMemberships");
      expect(appendCalls).toEqual([]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
