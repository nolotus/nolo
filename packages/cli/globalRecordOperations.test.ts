import { describe, expect, test } from "bun:test";

import {
  deleteDbRecordOnTargets,
  deleteDbRecordOnServers,
  listUserRecordsFromServers,
  recordExistsAfterTombstoneMerge,
  readDbRecordFromServers,
} from "./globalRecordOperations";

type TestFetch = (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => Promise<Response>;

function testFetch(fn: TestFetch): typeof fetch {
  return fn as unknown as typeof fetch;
}

describe("CLI global record operations", () => {
  test("listUserRecordsFromServers queries every candidate and filters newer tombstones", async () => {
    const calls: Array<{ url: string; body: any }> = [];

    const result = await listUserRecordsFromServers({
      authToken: "token-1",
      fetchImpl: testFetch(async (url, init) => {
        calls.push({
          url: String(url),
          body: JSON.parse(String(init?.body ?? "{}")),
        });
        if (String(url).startsWith("https://nolo.chat")) {
          return new Response(JSON.stringify({
            data: {
              data: [
                {
                  dbKey: "dialog-user-1-deleted",
                  id: "deleted",
                  type: "dialog",
                  userId: "user-1",
                  updatedAt: "2026-05-30T10:00:00.000Z",
                },
              ],
            },
          }), { status: 200 });
        }
        return new Response(JSON.stringify({
          data: {
            data: [
              {
                dbKey: "dialog-user-1-deleted",
                id: "deleted",
                type: "dialog",
                userId: "user-1",
                deletedAt: "2026-05-31T10:00:00.000Z",
                updatedAt: "2026-05-31T10:00:00.000Z",
              },
              {
                dbKey: "dialog-user-1-live",
                id: "live",
                type: "dialog",
                userId: "user-1",
                updatedAt: "2026-05-31T09:00:00.000Z",
              },
            ],
          },
        }), { status: 200 });
      }),
      serverUrls: ["https://nolo.chat", "https://us.nolo.chat"],
      type: "dialog",
      userId: "user-1",
    });

    expect(calls).toEqual([
      {
        url: "https://nolo.chat/api/v1/db/query/user-1",
        body: { type: "dialog", includeDeleted: true },
      },
      {
        url: "https://us.nolo.chat/api/v1/db/query/user-1",
        body: { type: "dialog", includeDeleted: true },
      },
    ]);
    expect(result.failures).toEqual([]);
    expect(result.records.map((record) => record.dbKey)).toEqual(["dialog-user-1-live"]);
    expect(result.records[0].serverOrigin).toBe("https://us.nolo.chat");
  });

  test("readDbRecordFromServers returns the first readable record and keeps prior failures", async () => {
    const calls: string[] = [];

    const result = await readDbRecordFromServers({
      authToken: "token-1",
      dbKey: "dialog-user-1-dialog-1",
      fetchImpl: testFetch(async (url) => {
        calls.push(String(url));
        if (String(url).startsWith("https://stale.nolo.chat")) {
          return new Response(JSON.stringify({ error: "missing" }), { status: 404 });
        }
        return new Response(JSON.stringify({
          data: {
            dbKey: "dialog-user-1-dialog-1",
            title: "Readable dialog",
          },
        }), { status: 200 });
      }),
      serverUrls: ["https://stale.nolo.chat", "https://nolo.chat"],
    });

    expect(calls).toEqual([
      "https://stale.nolo.chat/api/v1/db/read/dialog-user-1-dialog-1",
      "https://nolo.chat/api/v1/db/read/dialog-user-1-dialog-1",
    ]);
    expect(result.serverUrl).toBe("https://nolo.chat");
    expect(result.record.title).toBe("Readable dialog");
    expect(result.failures).toEqual([
      {
        serverUrl: "https://stale.nolo.chat",
        error: 'read failed: HTTP 404 {"error":"missing"}',
      },
    ]);
  });

  test("recordExistsAfterTombstoneMerge returns true when the newest readable record is live", async () => {
    const calls: string[] = [];

    const exists = await recordExistsAfterTombstoneMerge({
      authToken: "token-1",
      dbKey: "agent-pub-agent-1",
      fetchImpl: testFetch(async (url) => {
        calls.push(String(url));
        if (String(url).startsWith("https://nolo.chat")) {
          return new Response(JSON.stringify({ error: "missing" }), { status: 404 });
        }
        return new Response(JSON.stringify({
          data: { dbKey: "agent-pub-agent-1" },
        }), { status: 200 });
      }),
      serverUrls: ["https://nolo.chat", "https://us.nolo.chat"],
    });

    expect(exists).toBe(true);
    expect(calls).toEqual([
      "https://nolo.chat/api/v1/db/read/agent-pub-agent-1?includeDeleted=true",
      "https://us.nolo.chat/api/v1/db/read/agent-pub-agent-1?includeDeleted=true",
    ]);
  });

  test("recordExistsAfterTombstoneMerge returns false when the newest readable record is a tombstone", async () => {
    const exists = await recordExistsAfterTombstoneMerge({
      authToken: "token-1",
      dbKey: "agent-pub-agent-1",
      fetchImpl: testFetch(async (url) => {
        if (String(url).startsWith("https://nolo.chat")) {
          return new Response(JSON.stringify({
            data: {
              dbKey: "agent-pub-agent-1",
              updatedAt: "2026-05-30T10:00:00.000Z",
            },
          }), { status: 200 });
        }
        return new Response(JSON.stringify({
          data: {
            dbKey: "agent-pub-agent-1",
            deletedAt: "2026-05-31T10:00:00.000Z",
            updatedAt: "2026-05-31T10:00:00.000Z",
          },
        }), { status: 200 });
      }),
      serverUrls: ["https://nolo.chat", "https://us.nolo.chat"],
    });

    expect(exists).toBe(false);
  });

  test("deleteDbRecordOnServers deletes every candidate and preserves per-server failures", async () => {
    const calls: string[] = [];

    const results = await deleteDbRecordOnServers({
      authToken: "token-1",
      dbKey: "meta-user-1-table-1",
      deleteOptions: { type: "table" },
      fetchImpl: testFetch(async (url, init) => {
        calls.push(`${init?.method ?? "GET"} ${url}`);
        if (String(url).startsWith("https://us.nolo.chat")) {
          return new Response(JSON.stringify({ error: "replica down" }), { status: 503 });
        }
        return new Response(JSON.stringify({ message: "Delete request processed" }), { status: 200 });
      }),
      serverUrls: ["https://nolo.chat", "https://us.nolo.chat"],
    });

    expect(calls).toEqual([
      "DELETE https://nolo.chat/api/v1/db/delete/meta-user-1-table-1?type=table",
      "DELETE https://us.nolo.chat/api/v1/db/delete/meta-user-1-table-1?type=table",
    ]);
    expect(results).toEqual([
      {
        serverUrl: "https://nolo.chat",
        ok: true,
        result: { message: "Delete request processed" },
      },
      {
        serverUrl: "https://us.nolo.chat",
        ok: false,
        error: 'delete failed: HTTP 503 {"error":"replica down"}',
      },
    ]);
  });

  test("deleteDbRecordOnTargets supports per-server auth tokens", async () => {
    const authHeaders: string[] = [];

    const results = await deleteDbRecordOnTargets({
      authToken: "fallback-token",
      dbKey: "page-user-1-page-1",
      fetchImpl: testFetch(async (url, init) => {
        authHeaders.push(`${url} ${new Headers(init?.headers).get("Authorization")}`);
        return new Response(JSON.stringify({ message: "Delete request processed" }), { status: 200 });
      }),
      targets: [
        { serverUrl: "https://nolo.chat", authToken: "main-token" },
        { serverUrl: "https://us.nolo.chat", authToken: "us-token" },
      ],
    });

    expect(authHeaders).toEqual([
      "https://nolo.chat/api/v1/db/delete/page-user-1-page-1 Bearer main-token",
      "https://us.nolo.chat/api/v1/db/delete/page-user-1-page-1 Bearer us-token",
    ]);
    expect(results.map((result) => result.ok)).toEqual([true, true]);
  });
});
