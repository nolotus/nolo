import { describe, expect, it } from "bun:test";

import { MemoryDB } from "./MemoryDB";
import {
  createCliAuthorityBrokerClient,
  isCliAuthorityBrokerUnavailableError,
} from "./cliAuthorityBrokerClient";
import type {
  CliAuthorityBrokerIteratorPage,
  CliAuthorityBrokerRequest,
  CliAuthorityBrokerResponse,
} from "./cliAuthorityBrokerTypes";
import type { AuthorityIteratorOptions } from "./authorityStoreTypes";

function createIteratorPage(
  rows: Array<[string, unknown]>,
  args: {
    cursor?: string | null;
    limit: number;
    options?: AuthorityIteratorOptions;
  }
): CliAuthorityBrokerIteratorPage {
  let filtered = rows.slice().sort(([left], [right]) => left.localeCompare(right));
  if (args.options?.reverse) filtered = filtered.slice().reverse();
  filtered = filtered.filter(([key]) => {
    if (args.options?.gte && key < args.options.gte) return false;
    if (args.options?.lte && key > args.options.lte) return false;
    if (args.options?.lt && key >= args.options.lt) return false;
    return true;
  });

  const startIndex = args.cursor
    ? filtered.findIndex(([key]) => key === args.cursor) + 1
    : 0;
  const entries = filtered.slice(startIndex, startIndex + args.limit);
  const lastEntry = entries.at(-1) ?? null;

  return {
    entries,
    nextCursor: lastEntry ? lastEntry[0] : null,
    done: startIndex + entries.length >= filtered.length,
  };
}

function createBrokerInvoker() {
  const db = new MemoryDB();
  const requests: CliAuthorityBrokerRequest[] = [];

  return {
    db,
    requests,
    async invoke(request: CliAuthorityBrokerRequest): Promise<CliAuthorityBrokerResponse> {
      requests.push(request);
      switch (request.type) {
        case "status":
        case "open":
        case "close":
        case "put":
        case "del":
        case "batchWrite":
          if (request.type === "put") {
            await db.put(request.key, request.value);
          } else if (request.type === "del") {
            await db.del(request.key);
          } else if (request.type === "batchWrite") {
            await db.batch(request.ops);
          }
          return { ok: true, result: { type: request.type } };
        case "get":
          try {
            return { ok: true, result: { type: "get", value: await db.get(request.key) } };
          } catch (error) {
            return {
              ok: false,
              error: {
                code: "NOT_FOUND",
                message: error instanceof Error ? error.message : String(error),
              },
            };
          }
        case "iterator": {
          const rows: Array<[string, unknown]> = [];
          for await (const entry of db.iterator(request.options ?? {})) {
            rows.push(entry as [string, unknown]);
          }
          return {
            ok: true,
            result: {
              type: "iterator",
              page: createIteratorPage(rows, {
                cursor: request.cursor,
                limit: request.limit ?? 200,
                options: request.options,
              }),
            },
          };
        }
      }
    },
  };
}

describe("createCliAuthorityBrokerClient", () => {
  it("adapts get/put/del and batch operations to AuthorityStore semantics", async () => {
    const broker = createBrokerInvoker();
    const store = createCliAuthorityBrokerClient({
      endpoint: "unix:///tmp/nolo-authority.sock",
      invoke: broker.invoke,
    });

    await store.open();
    await store.put("agent:1", { model: "mimo-v2.5-pro" });
    expect(await store.get("agent:1")).toEqual({ model: "mimo-v2.5-pro" });

    await store.batchWrite([
      { type: "put", key: "agent:2", value: { model: "mimo-v2.5" } },
      { type: "del", key: "agent:missing" },
    ]);

    const batch = store.createBatch();
    batch.put("agent:3", { model: "mimo-v2.5-pro" });
    batch.del("agent:2");
    await batch.write();

    await store.del("agent:1");
    await store.close();

    expect(broker.requests.map((request) => request.type)).toEqual([
      "status",
      "put",
      "get",
      "batchWrite",
      "batchWrite",
      "del",
    ]);
    expect(broker.db.dump()).toEqual({
      "agent:3": { model: "mimo-v2.5-pro" },
    });
  });

  it("treats close as client-side cleanup instead of closing the shared broker owner", async () => {
    const broker = createBrokerInvoker();
    const store = createCliAuthorityBrokerClient({
      endpoint: "unix:///tmp/nolo-authority.sock",
      invoke: broker.invoke,
    });

    await store.close();
    await store.open();

    expect(broker.requests.map((request) => request.type)).toEqual(["status"]);
  });

  it("replays iterator pages until completion", async () => {
    const broker = createBrokerInvoker();
    await broker.db.put("dialog:001", { title: "one" });
    await broker.db.put("dialog:002", { title: "two" });
    await broker.db.put("dialog:003", { title: "three" });
    const store = createCliAuthorityBrokerClient({
      endpoint: "unix:///tmp/nolo-authority.sock",
      invoke: broker.invoke,
      iteratorPageSize: 2,
    });

    const rows: Array<[string, unknown]> = [];
    for await (const entry of store.iterator({ gte: "dialog:", lt: "dialog:\uffff" })) {
      rows.push(entry as [string, unknown]);
    }

    expect(rows).toEqual([
      ["dialog:001", { title: "one" }],
      ["dialog:002", { title: "two" }],
      ["dialog:003", { title: "three" }],
    ]);
    expect(
      broker.requests.filter((request) => request.type === "iterator")
    ).toEqual([
      {
        type: "iterator",
        options: { gte: "dialog:", lt: "dialog:\uffff" },
        cursor: undefined,
        limit: 2,
      },
      {
        type: "iterator",
        options: { gte: "dialog:", lt: "dialog:\uffff" },
        cursor: "dialog:002",
        limit: 2,
      },
    ]);
  });

  it("wraps transport failures as broker-unavailable errors", async () => {
    const store = createCliAuthorityBrokerClient({
      endpoint: "unix:///tmp/nolo-authority.sock",
      invoke: async () => {
        throw new Error("connect ENOENT");
      },
    });

    let error: unknown;
    try {
      await store.open();
    } catch (caught) {
      error = caught;
    }

    expect(isCliAuthorityBrokerUnavailableError(error)).toBe(true);
    expect((error as Error).message).toContain("CLI authority broker unavailable");
  });

  it("preserves broker protocol errors instead of misclassifying them as unavailable", async () => {
    const broker = createBrokerInvoker();
    const store = createCliAuthorityBrokerClient({
      endpoint: "unix:///tmp/nolo-authority.sock",
      invoke: broker.invoke,
    });

    await expect(store.get("agent:missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "NotFound",
    });
  });
});
