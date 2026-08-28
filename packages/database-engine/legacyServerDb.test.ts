import { describe, expect, it } from "bun:test";

import type { AuthorityBatchOperation, AuthorityStore } from "./authorityStoreTypes";

let moduleVersion = 0;

async function loadModule() {
  return import(`./legacyServerDb.ts`);
}

function createStoreStub(): AuthorityStore & {
  calls: {
    put: Array<[string, unknown]>;
    del: string[];
    batchWrite: AuthorityBatchOperation[][];
    iterator: Array<Record<string, unknown> | undefined>;
  };
} {
  const calls = {
    put: [] as Array<[string, unknown]>,
    del: [] as string[],
    batchWrite: [] as AuthorityBatchOperation[][],
    iterator: [] as Array<Record<string, unknown> | undefined>,
  };

  return {
    location: "/tmp/test-authority",
    status: "open",
    calls,
    async open() {},
    async close() {},
    async get(_key: string): Promise<any> {
      return null;
    },
    async put(key: string, value: unknown) {
      calls.put.push([key, value]);
    },
    async del(key: string) {
      calls.del.push(key);
    },
    async batchWrite(ops: AuthorityBatchOperation[]) {
      calls.batchWrite.push(ops);
    },
    createBatch() {
      const ops: AuthorityBatchOperation[] = [];
      return {
        put(key: string, value: unknown) {
          ops.push({ type: "put", key, value });
        },
        del(key: string) {
          ops.push({ type: "del", key });
        },
        async write() {
          calls.batchWrite.push(ops);
        },
      };
    },
    async *iterator(options) {
      calls.iterator.push(options);
      yield ["key-1", { ok: true }];
    },
  };
}

describe("createLegacyServerDb", () => {
  it("adapts authority store batch and iterator APIs to the legacy db shape", async () => {
    const { createLegacyServerDb } = await loadModule();
    const store = createStoreStub();
    const db = createLegacyServerDb(store);

    await db.put("alpha", { ok: true });
    await db.del("beta");
    await db.batch([{ type: "put", key: "gamma", value: 3 }]);

    const batch = db.batch();
    batch.put("delta", 4);
    batch.del("epsilon");
    await batch.write();

    const rows: Array<[string, unknown]> = [];
    for await (const entry of db.iterator({ gte: "a", lt: "z" })) {
      rows.push(entry);
    }

    expect(db.location).toBe("/tmp/test-authority");
    expect(db.status).toBe("open");
    expect(store.calls.put).toEqual([["alpha", { ok: true }]]);
    expect(store.calls.del).toEqual(["beta"]);
    expect(store.calls.batchWrite).toEqual([
      [{ type: "put", key: "gamma", value: 3 }],
      [
        { type: "put", key: "delta", value: 4 },
        { type: "del", key: "epsilon" },
      ],
    ]);
    expect(store.calls.iterator).toEqual([{ gte: "a", lt: "z" }]);
    expect(rows).toEqual([["key-1", { ok: true }]]);
  });
});
