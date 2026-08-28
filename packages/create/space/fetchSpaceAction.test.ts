import { afterEach, describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;
const testToken =
  "eyJ1c2VySWQiOiJ1c2VyMSIsInVzZXJuYW1lIjoidXNlcjEifQ==.signature";
const activeTestUserIds = [
  "user1",
  "user-1",
  "user-test",
  "user-a",
  "user",
  "owner",
  "live",
  "nolotus",
  testToken,
];

const loadFetchSpaceAction = async () => {
  mock.module("app/utils/env", () => ({
    getIsDesktopApp: () => false,
  }));
  // Spread actual exports so spaceAccess/runtimeServerContext still see
  // getAllServers after mock.module replaces the common surface.
  const actualCommon = await import("database/actions/common");
  mock.module("database/actions/common", () => ({
    ...actualCommon,
    fetchFromServer: async (server: string, dbKey: string) => {
      const response = await globalThis.fetch(`${server}/api/v1/db/read/${dbKey}`);
      return response.status === 200 ? response.json() : null;
    },
  }));
  // Keep mocks active for the test body; afterEach calls mock.restore().
  const mod = await import(`./fetchSpaceAction.ts`);
  return mod.fetchSpaceAction;
};

const createThunkApi = () =>
  ({
    getState: () => ({
      auth: {
        userId: "user1",
        currentUserId: "user1",
        currentToken: testToken,
        currentUser: { id: "user1", userId: "user1" },
      },
      settings: {
        currentServer: "http://127.0.0.1:38123",
        syncServers: [],
      },
    }),
    extra: {},
    dispatch: () => ({
      unwrap: async () => {
        throw new Error("local read should not be used for fresh remote space");
      },
    }),
  }) as any;

describe("fetchSpaceAction", () => {
  afterEach(() => {
    mock.restore();
  });

  it("loads fresh spaces from the remote space record", async () => {
    const fetchSpaceAction = await loadFetchSpaceAction();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(
          JSON.stringify([
            ...activeTestUserIds.map((userId) => ({ userId, spaceId: "live" })),
          ]),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.includes("space-live")) {
        return new Response(
          JSON.stringify({
            id: "live",
            name: "Live",
            ownerId: "owner",
            members: activeTestUserIds,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({
          id: "live",
          name: "Live",
          ownerId: "owner",
          members: activeTestUserIds,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }) as any;

    try {
      const result = await fetchSpaceAction(
        { spaceId: "live", fresh: true },
        createThunkApi()
      );

      expect(result.spaceData).toMatchObject({ id: "live", name: "Live" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does not fall back to local data when a fresh remote space is missing", async () => {
    const fetchSpaceAction = await loadFetchSpaceAction();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/db/read/space-missing")) {
        return new Response(JSON.stringify({ error: "Not Found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      await expect(
        fetchSpaceAction({ spaceId: "missing", fresh: true }, createThunkApi())
      ).rejects.toThrow("Space not found");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects fresh spaces when the remote record no longer lists the user", async () => {
    const fetchSpaceAction = await loadFetchSpaceAction();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/db/read/space-removed")) {
        return new Response(
          JSON.stringify({
            id: "removed",
            name: "Removed",
            ownerId: "owner",
            members: ["owner"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      await expect(
        fetchSpaceAction({ spaceId: "removed", fresh: true }, createThunkApi())
      ).rejects.toThrow("not a member");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects fresh spaces when only space.members is stale", async () => {
    const fetchSpaceAction = await loadFetchSpaceAction();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/db/read/space-stale-member")) {
        return new Response(
          JSON.stringify({
            id: "stale-member",
            name: "Stale Member",
            ownerId: "owner",
            members: ["user1"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      await expect(
        fetchSpaceAction(
          { spaceId: "stale-member", fresh: true },
          createThunkApi()
        )
      ).rejects.toThrow("no active membership");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects the two known stale route spaces when active memberships are absent", async () => {
    const fetchSpaceAction = await loadFetchSpaceAction();
    const originalFetch = globalThis.fetch;
    const staleSpaces = new Map([
      [
        "space-01KMX8DFZ6B8FEKQBH8JS0ZDNN",
        {
          id: "01KMX8DFZ6B8FEKQBH8JS0ZDNN",
          name: "有问题的对话",
          ownerId: "owner",
          members: ["user1"],
        },
      ],
      [
        "space-01KKX14CP0TNR6GFQ39GNNTJDJ",
        {
          id: "01KKX14CP0TNR6GFQ39GNNTJDJ",
          name: "测试空间",
          ownerId: "owner",
          members: ["user1"],
        },
      ],
    ]);
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      const key = [...staleSpaces.keys()].find((spaceKey) =>
        url.endsWith(`/api/v1/db/read/${spaceKey}`)
      );
      if (key) {
        return new Response(JSON.stringify(staleSpaces.get(key)), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.endsWith("/rpc/getUserSpaceMemberships")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      for (const spaceId of [
        "01KMX8DFZ6B8FEKQBH8JS0ZDNN",
        "01KKX14CP0TNR6GFQ39GNNTJDJ",
      ]) {
        await expect(
          fetchSpaceAction({ spaceId, fresh: true }, createThunkApi())
        ).rejects.toThrow("no active membership");
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("allows fresh owner spaces without a separate membership row", async () => {
    const fetchSpaceAction = await loadFetchSpaceAction();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v1/db/read/space-owned")) {
        return new Response(
          JSON.stringify({
            id: "owned",
            name: "Owned",
            ownerId: "user1",
            members: [],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(`unexpected url ${url}`, { status: 500 });
    }) as any;

    try {
      const result = await fetchSpaceAction(
        { spaceId: "owned", fresh: true },
        createThunkApi()
      );

      expect(result.spaceData).toMatchObject({ id: "owned", name: "Owned" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
