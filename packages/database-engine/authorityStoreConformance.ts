import { describe, expect, it } from "bun:test";

import type { AuthorityStore } from "./authorityStoreTypes";

type FakeLevelOp = { type: "put" | "del"; key: string; value?: unknown };

type FakeNotFoundError = Error & { notFound: true };

const createNotFoundError = (): FakeNotFoundError => {
  const error = new Error("NotFound") as FakeNotFoundError;
  error.notFound = true;
  return error;
};

export class FakeAuthorityBacking {
  location = "/tmp/authority-conformance";
  status = "closed";
  private readonly data = new Map<string, unknown>();

  async open() {
    this.status = "open";
  }

  async close() {
    this.status = "closed";
  }

  async get(key: string) {
    if (!this.data.has(key)) {
      throw createNotFoundError();
    }
    return this.data.get(key);
  }

  async put(key: string, value: unknown) {
    this.data.set(key, value);
  }

  async del(key: string) {
    this.data.delete(key);
  }

  batch(ops?: FakeLevelOp[]) {
    if (Array.isArray(ops)) {
      return Promise.resolve().then(async () => {
        for (const op of ops) {
          if (op.type === "put") {
            await this.put(op.key, op.value);
          } else {
            await this.del(op.key);
          }
        }
      });
    }

    const buffered: FakeLevelOp[] = [];
    return {
      put: (key: string, value: unknown) => {
        buffered.push({ type: "put", key, value });
      },
      del: (key: string) => {
        buffered.push({ type: "del", key });
      },
      write: async () => {
        await this.batch(buffered);
      },
    };
  }

  async *iterator(options: {
    gte?: string;
    lte?: string;
    lt?: string;
    reverse?: boolean;
    keys?: boolean;
    values?: boolean;
  } = {}) {
    const keys = Array.from(this.data.keys()).sort();
    if (options.reverse) keys.reverse();
    for (const key of keys) {
      if (options.gte && key < options.gte) continue;
      if (options.lte && key > options.lte) continue;
      if (options.lt && key >= options.lt) continue;
      const value = options.values === false ? undefined : this.data.get(key);
      yield [key, value] as [string, unknown];
    }
  }
}

type CreateStore = () => Promise<{
  backing: FakeAuthorityBacking;
  store: AuthorityStore;
}>;

export function runAuthorityStoreConformanceSuite(
  label: string,
  createStore: CreateStore,
  options: {
    expectedLocation?: string;
  } = {}
) {
  const expectedLocation =
    options.expectedLocation ?? "/tmp/authority-conformance";

  describe(label, () => {
    it("preserves open/close status, location, and NotFound semantics", async () => {
      const { store } = await createStore();

      expect(store.status).toBe("closed");
      expect(store.location).toBe(expectedLocation);

      await store.open();
      expect(store.status).toBe("open");

      await expect(store.get("missing")).rejects.toMatchObject({
        message: "NotFound",
        notFound: true,
      });

      await store.close();
      expect(store.status).toBe("closed");
    });

    it("supports direct put/get/del writes", async () => {
      const { store } = await createStore();

      await store.put("alpha", { value: 1 });
      await store.put("beta", { value: 2 });

      expect(await store.get("alpha")).toEqual({ value: 1 });
      expect(await store.get("beta")).toEqual({ value: 2 });

      await store.del("alpha");
      await expect(store.get("alpha")).rejects.toMatchObject({
        message: "NotFound",
        notFound: true,
      });
    });

    it("supports array-style batchWrite with mixed put/del operations", async () => {
      const { store } = await createStore();

      await store.batchWrite([
        { type: "put", key: "alpha", value: 1 },
        { type: "put", key: "beta", value: 2 },
        { type: "del", key: "alpha" },
      ]);

      await expect(store.get("alpha")).rejects.toMatchObject({
        message: "NotFound",
        notFound: true,
      });
      expect(await store.get("beta")).toBe(2);
    });

    it("supports builder-style createBatch writes", async () => {
      const { store } = await createStore();

      await store.put("alpha", 1);

      const batch = store.createBatch();
      batch.put("beta", 2);
      batch.del("alpha");
      batch.put("gamma", 3);
      await batch.write();

      await expect(store.get("alpha")).rejects.toMatchObject({
        message: "NotFound",
        notFound: true,
      });
      expect(await store.get("beta")).toBe(2);
      expect(await store.get("gamma")).toBe(3);
    });

    it("preserves ordered iterator range semantics", async () => {
      const { store } = await createStore();

      await store.put("a", 1);
      await store.put("b", 2);
      await store.put("c", 3);

      const scanned: Array<[string, unknown]> = [];
      for await (const entry of store.iterator({ gte: "a", lt: "c" })) {
        scanned.push(entry);
      }

      expect(scanned).toEqual([
        ["a", 1],
        ["b", 2],
      ]);
    });

    it("preserves reverse iterator semantics within a bounded range", async () => {
      const { store } = await createStore();

      await store.put("a", 1);
      await store.put("b", 2);
      await store.put("c", 3);

      const scanned: string[] = [];
      for await (const [key] of store.iterator({
        gte: "a",
        lte: "c",
        reverse: true,
      })) {
        scanned.push(key);
      }

      expect(scanned).toEqual(["c", "b", "a"]);
    });

    it("supports keys:true, values:false iteration yielding valid keys and nullish values", async () => {
      const { store } = await createStore();

      await store.put("k:1", "val1");
      await store.put("k:2", "val2");

      const entries: Array<[string, unknown]> = [];
      for await (const entry of store.iterator({
        gte: "k:",
        lte: "k:\uffff",
        keys: true,
        values: false,
      })) {
        entries.push(entry);
      }

      expect(entries).toHaveLength(2);
      expect(entries[0][0]).toBe("k:1");
      expect(entries[1][0]).toBe("k:2");
      // 断言 value 必须为 nullish（level 给 null，memory/sqlite 给 undefined），严禁返回真实 value
      expect(entries[0][1] == null).toBe(true);
      expect(entries[1][1] == null).toBe(true);
    });
  });
}
