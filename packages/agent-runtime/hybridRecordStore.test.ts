import { describe, expect, test } from "bun:test";

import {
  createHybridRecordStore,
  parseSyncServersEnv,
  shouldCacheHybridRemoteRecord,
} from "./hybridRecordStore";

const asFetch = <T extends (...args: any[]) => any>(fn: T) => fn as unknown as typeof fetch;

function createMemoryDb(initial: Record<string, any> = {}) {
  const memory = new Map(Object.entries(initial));
  return {
    memory,
    db: {
      get: async (key: string) => {
        if (!memory.has(key)) throw new Error(`not found: ${key}`);
        return memory.get(key);
      },
      put: async (key: string, value: any) => {
        memory.set(key, value);
      },
      del: async (key: string) => {
        memory.delete(key);
      },
      batch: async (ops: Array<{ type: "put"; key: string; value: any }>) => {
        for (const op of ops) {
          if (op.type === "put") memory.set(op.key, op.value);
        }
      },
      iterator: ({ gte, lte }: { gte: string; lte?: string }) => (async function* () {
        for (const entry of [...memory.entries()].sort(([a], [b]) => a.localeCompare(b))) {
          if (entry[0] >= gte && (!lte || entry[0] <= lte)) yield entry;
        }
      })(),
    },
  };
}

describe("hybrid record store", () => {
  test("returns local records without fetching remote data", async () => {
    const { db } = createMemoryDb({
      "agent-user-1-frontend": { name: "local frontend" },
    });
    const store = createHybridRecordStore({
      db,
      defaultServer: "https://us.nolo.chat",
      fetchImpl: asFetch(async () => {
        throw new Error("remote fetch should not run on local hit");
      }),
    });

    await expect(store.read("agent-user-1-frontend")).resolves.toEqual({
      dbKey: "agent-user-1-frontend",
      name: "local frontend",
    });
  });

  test("reads remote records on local miss and caches newer remote truth", async () => {
    const { db, memory } = createMemoryDb();
    const requests: Array<{ url: string; auth: string | null }> = [];
    const store = createHybridRecordStore({
      db,
      defaultServer: "https://us.nolo.chat/",
      authToken: "token-1",
      fetchImpl: asFetch(async (url, init) => {
        requests.push({
          url: String(url),
          auth: new Headers(init?.headers).get("Authorization"),
        });
        return Response.json({
          data: {
            name: "remote frontend",
            updatedAt: "2026-05-14T00:00:00.000Z",
          },
        });
      }),
    });

    await expect(store.read("agent-user-1-frontend")).resolves.toMatchObject({
      dbKey: "agent-user-1-frontend",
      name: "remote frontend",
      serverOrigin: "https://us.nolo.chat",
    });
    expect(requests).toEqual([{
      url: "https://us.nolo.chat/api/v1/db/read/agent-user-1-frontend",
      auth: "Bearer token-1",
    }]);
    expect(memory.get("agent-user-1-frontend")).toMatchObject({
      name: "remote frontend",
      serverOrigin: "https://us.nolo.chat",
    });
  });

  test("refreshes a local record when remote reads are explicitly requested", async () => {
    const { db, memory } = createMemoryDb({
      "agent-user-1-frontend": {
        name: "stale frontend",
        prompt: "old prompt",
        updatedAt: "2026-05-13T00:00:00.000Z",
      },
    });
    const requests: string[] = [];
    const store = createHybridRecordStore({
      db,
      defaultServer: "https://us.nolo.chat",
      fetchImpl: asFetch(async (url) => {
        requests.push(String(url));
        return Response.json({
          data: {
            name: "remote frontend",
            prompt: "new prompt",
            updatedAt: "2026-05-14T00:00:00.000Z",
          },
        });
      }),
    });

    await expect(store.read("agent-user-1-frontend", { remote: true })).resolves.toMatchObject({
      dbKey: "agent-user-1-frontend",
      name: "remote frontend",
      prompt: "new prompt",
      serverOrigin: "https://us.nolo.chat",
    });
    expect(requests).toEqual([
      "https://us.nolo.chat/api/v1/db/read/agent-user-1-frontend",
    ]);
    expect(memory.get("agent-user-1-frontend")).toMatchObject({
      name: "remote frontend",
      prompt: "new prompt",
      serverOrigin: "https://us.nolo.chat",
    });
  });

  test("falls back to a local record when an explicit remote refresh fails", async () => {
    const { db } = createMemoryDb({
      "agent-user-1-frontend": {
        name: "cached frontend",
        prompt: "cached prompt",
      },
    });
    const store = createHybridRecordStore({
      db,
      defaultServer: "https://us.nolo.chat",
      fetchImpl: asFetch(async () => {
        throw new Error("network unavailable");
      }),
    });

    await expect(store.read("agent-user-1-frontend", { remote: true })).resolves.toMatchObject({
      dbKey: "agent-user-1-frontend",
      name: "cached frontend",
      prompt: "cached prompt",
    });
  });

  test("uses preferred server origin before the default server", async () => {
    const { db } = createMemoryDb();
    const requests: string[] = [];
    const store = createHybridRecordStore({
      db,
      defaultServer: "https://default.nolo.chat",
      fetchImpl: asFetch(async (url) => {
        requests.push(String(url));
        return requests.length === 1
          ? new Response("missing", { status: 404 })
          : Response.json({ data: { name: "default remote" } });
      }),
    });

    await expect(store.read("agent-user-1-frontend", {
      preferredServerOrigin: "https://preferred.nolo.chat/",
    })).resolves.toMatchObject({
      name: "default remote",
      serverOrigin: "https://default.nolo.chat",
    });
    expect(requests).toEqual([
      "https://preferred.nolo.chat/api/v1/db/read/agent-user-1-frontend",
      "https://default.nolo.chat/api/v1/db/read/agent-user-1-frontend",
    ]);
  });

  test("rethrows non-not-found local DB failures instead of treating them as a cache miss", async () => {
    const store = createHybridRecordStore({
      db: {
        get: async () => {
          throw new Error("LOCK: resource temporarily unavailable");
        },
        put: async () => undefined,
        del: async () => undefined,
        batch: async () => undefined,
        iterator: () => (async function* () {})(),
      },
      defaultServer: "https://default.nolo.chat",
      fetchImpl: asFetch(async () => {
        throw new Error("remote fetch should not run after a local DB failure");
      }),
    });

    await expect(store.read("agent-user-1-frontend")).rejects.toThrow(
      "LOCK: resource temporarily unavailable"
    );
  });

  test("keeps newer local records over stale remote records", () => {
    expect(shouldCacheHybridRemoteRecord(
      { updatedAt: "2026-05-13T00:00:00.000Z" },
      { updatedAt: "2026-05-14T00:00:00.000Z" }
    )).toBe(false);
    expect(shouldCacheHybridRemoteRecord(
      { updatedAt: "2026-05-15T00:00:00.000Z" },
      { updatedAt: "2026-05-14T00:00:00.000Z" }
    )).toBe(true);
  });

  test("does not contact fallback servers when the primary server succeeds (local miss)", async () => {
    const { db } = createMemoryDb();
    const requests: string[] = [];
    const store = createHybridRecordStore({
      db,
      defaultServer: "https://nolo.chat",
      fallbackServers: ["https://us.nolo.chat"],
      authToken: "token-1",
      fetchImpl: asFetch(async (url) => {
        requests.push(String(url));
        // Primary server returns a record.
        return Response.json({ data: { name: "primary record" } });
      }),
    });

    const result = await store.read("agent-user-1-frontend");
    expect(result).toMatchObject({ name: "primary record", serverOrigin: "https://nolo.chat" });
    expect(requests).toEqual([
      "https://nolo.chat/api/v1/db/read/agent-user-1-frontend",
    ]);
    expect(requests.some((url) => url.includes("us.nolo.chat"))).toBe(false);
  });

  test("tries the fallback server only after the primary server fails", async () => {
    const { db } = createMemoryDb();
    const requests: string[] = [];
    const store = createHybridRecordStore({
      db,
      defaultServer: "https://nolo.chat",
      fallbackServers: ["https://us.nolo.chat"],
      authToken: "token-1",
      fetchImpl: asFetch(async (url) => {
        requests.push(String(url));
        if (url.includes("nolo.chat/api/v1/db/read") && !url.includes("us.nolo.chat")) {
          // Primary fails with a non-2xx.
          return new Response("missing", { status: 503 });
        }
        // Fallback succeeds.
        return Response.json({ data: { name: "fallback record" } });
      }),
    });

    const result = await store.read("agent-user-1-frontend");
    expect(result).toMatchObject({ name: "fallback record", serverOrigin: "https://us.nolo.chat" });
    expect(requests).toEqual([
      "https://nolo.chat/api/v1/db/read/agent-user-1-frontend",
      "https://us.nolo.chat/api/v1/db/read/agent-user-1-frontend",
    ]);
  });

  test("aborts a slow remote server via requestTimeoutMs and advances to the next server", async () => {
    const { db } = createMemoryDb();
    const requests: string[] = [];
    const store = createHybridRecordStore({
      db,
      defaultServer: "https://nolo.chat",
      fallbackServers: ["https://us.nolo.chat"],
      authToken: "token-1",
      requestTimeoutMs: 50,
      fetchImpl: asFetch(async (url, init) => {
        requests.push(String(url));
        const signal = (init as RequestInit | undefined)?.signal;
        if (url.includes("nolo.chat/api/v1/db/read") && !url.includes("us.nolo.chat")) {
          // Primary hangs until aborted.
          return new Promise<Response>((_resolve, reject) => {
            if (signal) {
              signal.addEventListener("abort", () => reject(signal.reason ?? new Error("aborted")));
            }
          });
        }
        return Response.json({ data: { name: "fallback record" } });
      }),
    });

    const result = await store.read("agent-user-1-frontend");
    expect(result).toMatchObject({ name: "fallback record", serverOrigin: "https://us.nolo.chat" });
    expect(requests).toEqual([
      "https://nolo.chat/api/v1/db/read/agent-user-1-frontend",
      "https://us.nolo.chat/api/v1/db/read/agent-user-1-frontend",
    ]);
  });
});

describe("parseSyncServersEnv", () => {
  test("parses comma-separated sites, trims whitespace and filters empty elements", () => {
    expect(
      parseSyncServersEnv({
        NOLO_SYNC_SERVERS: " https://alpha.nolo.chat, ,https://us.nolo.chat, ",
      }),
    ).toEqual(["https://alpha.nolo.chat", "https://us.nolo.chat"]);
  });

  test("returns empty array for missing, blank or undefined env", () => {
    expect(parseSyncServersEnv({})).toEqual([]);
    expect(parseSyncServersEnv({ NOLO_SYNC_SERVERS: "   " })).toEqual([]);
    expect(parseSyncServersEnv({ NOLO_SYNC_SERVERS: ",," })).toEqual([]);
    expect(parseSyncServersEnv(undefined)).toEqual([]);
  });

  test("keeps raw origins as-is; normalize/dedup is the caller's job", () => {
    // Callers (resolveFallbackServers) dedup via normalizeServerOrigin + Set;
    // the parser itself only splits/trims/filters.
    expect(
      parseSyncServersEnv({
        NOLO_SYNC_SERVERS: "https://alpha.nolo.chat/,https://alpha.nolo.chat",
      }),
    ).toEqual(["https://alpha.nolo.chat/", "https://alpha.nolo.chat"]);
  });
});
