import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { rm } from "node:fs/promises";
import { createSqliteAuthorityStore } from "./sqliteAuthorityStore";

const TEST_DB_PATH = "/tmp/nolo-test-sqlite-authority-store.db";

describe("sqliteAuthorityStore", () => {
  let store = createSqliteAuthorityStore(TEST_DB_PATH);

  beforeAll(async () => {
    try {
      await rm(TEST_DB_PATH);
    } catch {
      // ignore
    }
    await store.open();
  });

  afterAll(async () => {
    await store.close();
    try {
      await rm(TEST_DB_PATH);
    } catch {
      // ignore
    }
  });

  it("has location and open status", () => {
    expect(store.location).toBe(TEST_DB_PATH);
    expect(store.status).toBe("open");
  });

  it("puts and gets a value", async () => {
    await store.put("user:1", { name: "Alice", age: 30 });
    const value = await store.get("user:1");
    expect(value).toEqual({ name: "Alice", age: 30 });
  });

  it("throws NotFound for missing keys", async () => {
    await expect(store.get("missing-key")).rejects.toThrow("NotFound");
  });

  it("deletes a key", async () => {
    await store.put("to-delete", "bye");
    await store.del("to-delete");
    await expect(store.get("to-delete")).rejects.toThrow("NotFound");
  });

  it("batch writes multiple operations", async () => {
    await store.batchWrite([
      { type: "put", key: "batch:a", value: 1 },
      { type: "put", key: "batch:b", value: 2 },
      { type: "del", key: "batch:a" },
    ]);
    await expect(store.get("batch:a")).rejects.toThrow("NotFound");
    expect(await store.get("batch:b")).toBe(2);
  });

  it("createBatch buffers and writes atomically", async () => {
    const batch = store.createBatch();
    batch.put("batch:c", 3);
    batch.put("batch:d", 4);
    await batch.write();

    expect(await store.get("batch:c")).toBe(3);
    expect(await store.get("batch:d")).toBe(4);
  });

  it("iterates all entries in key order", async () => {
    await store.put("iter:z", "last");
    await store.put("iter:a", "first");
    await store.put("iter:m", "middle");

    const entries: [string, unknown][] = [];
    for await (const entry of store.iterator()) {
      entries.push(entry);
    }

    expect(entries).toContainEqual(["iter:a", "first"]);
    expect(entries).toContainEqual(["iter:m", "middle"]);
    expect(entries).toContainEqual(["iter:z", "last"]);

    const keys = entries.map(([k]) => k);
    expect(keys.indexOf("iter:a")).toBeLessThan(keys.indexOf("iter:m"));
    expect(keys.indexOf("iter:m")).toBeLessThan(keys.indexOf("iter:z"));
  });

  it("iterates with gte / lte range", async () => {
    await store.put("range:1", "a");
    await store.put("range:2", "b");
    await store.put("range:3", "c");
    await store.put("range:4", "d");

    const entries: [string, unknown][] = [];
    for await (const entry of store.iterator({ gte: "range:2", lte: "range:3" })) {
      entries.push(entry);
    }

    expect(entries).toEqual([
      ["range:2", "b"],
      ["range:3", "c"],
    ]);
  });

  it("iterates in reverse", async () => {
    await store.put("rev:1", "a");
    await store.put("rev:2", "b");

    const entries: [string, unknown][] = [];
    for await (const entry of store.iterator({ reverse: true })) {
      if (String(entry[0]).startsWith("rev:")) {
        entries.push(entry);
      }
    }

    expect(entries.map(([k]) => k)).toEqual(["rev:2", "rev:1"]);
  });

  it("persists complex JSON values", async () => {
    const complex = {
      nested: { array: [1, 2, { deep: true }], bool: false },
      null: null,
      string: "hello 🌍",
    };
    await store.put("complex", complex);
    expect(await store.get("complex")).toEqual(complex);
  });

  it("supports concurrent multi-process reads (WAL)", async () => {
    // Simulate a second process opening the same SQLite DB
    const otherStore = createSqliteAuthorityStore(TEST_DB_PATH);
    await otherStore.open();

    await store.put("multi:shared", "from-main");
    const readBack = await otherStore.get("multi:shared");

    expect(readBack).toBe("from-main");
    await otherStore.close();
  });
});
