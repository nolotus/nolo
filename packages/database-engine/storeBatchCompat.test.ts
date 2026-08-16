import { describe, expect, it } from "bun:test";
import { createStoreBatch, writeStoreOps } from "./storeBatchCompat";

describe("storeBatchCompat", () => {
  it("writes array ops through authority-store style batchWrite", async () => {
    const writes: Array<{ type: string; key: string; value?: unknown }> = [];
    await writeStoreOps(
      {
        batchWrite: async (ops) => {
          writes.push(...ops);
        },
      },
      [{ type: "put", key: "a", value: 1 }]
    );

    expect(writes).toEqual([{ type: "put", key: "a", value: 1 }]);
  });

  it("creates builder batches through authority-store style createBatch", async () => {
    const writes: Array<{ type: string; key: string; value?: unknown }> = [];
    const batch = createStoreBatch({
      createBatch: () => ({
        put(key, value) {
          writes.push({ type: "put", key, value });
        },
        del(key) {
          writes.push({ type: "del", key });
        },
        async write() {},
      }),
    });

    batch.put("a", 1);
    batch.del("b");
    await batch.write();

    expect(writes).toEqual([
      { type: "put", key: "a", value: 1 },
      { type: "del", key: "b" },
    ]);
  });

  it("writes array ops through legacy builder-style batch stores", async () => {
    const writes: Array<{ type: string; key: string; value?: unknown }> = [];
    await writeStoreOps(
      {
        batch: () => ({
          put(key: string, value: unknown) {
            writes.push({ type: "put", key, value });
          },
          del(key: string) {
            writes.push({ type: "del", key });
          },
          async write() {},
        }),
      } as any,
      [
        { type: "put", key: "a", value: 1 },
        { type: "del", key: "b" },
      ]
    );

    expect(writes).toEqual([
      { type: "put", key: "a", value: 1 },
      { type: "del", key: "b" },
    ]);
  });
});
