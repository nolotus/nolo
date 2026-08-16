import { describe, expect, it } from "bun:test";

import { fetchUserData } from "./fetchUserData";
import { getUserDataPrefixes } from "../queryPrefixes";

type Entry = [string, any];

function createDb(entries: Entry[]) {
  const sorted = [...entries].sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
  );
  return {
    async *iterator({ gte, lte }: { gte: string; lte: string }) {
      for (const [key, value] of sorted) {
        if (key < gte) continue;
        if (key > lte) break;
        yield [key, value];
      }
    },
  };
}

describe("fetchUserData", () => {
  it("attaches dbKey from iterator keys when stored values do not include it", async () => {
    const db = createDb([
      [
        "app-u1-demo",
        {
          appKey: "app-u1-demo",
          userId: "u1",
          name: "Demo app",
        },
      ],
    ]);

    const result = await fetchUserData(db, "app", "u1");
    expect(result).toHaveLength(1);
    expect(result[0]?.dbKey).toBe("app-u1-demo");
  });

  it("filters tombstones by default but can include them for merge callers", async () => {
    const db = createDb([
      [
        "page-u1-live",
        {
          dbKey: "page-u1-live",
          type: "page",
          userId: "u1",
        },
      ],
      [
        "page-u1-deleted",
        {
          dbKey: "page-u1-deleted",
          type: "page",
          userId: "u1",
          deletedAt: "2026-03-20T09:00:00.000Z",
        },
      ],
    ]);

    const visibleOnly = await fetchUserData(db, "page", "u1");
    const withDeleted = await fetchUserData(db, "page", "u1", {
      includeDeleted: true,
    });

    expect(visibleOnly).toEqual([
      expect.objectContaining({ dbKey: "page-u1-live" }),
    ]);
    expect(withDeleted).toHaveLength(2);
    expect(new Set(withDeleted.map((r: any) => r.dbKey))).toEqual(
      new Set(["page-u1-live", "page-u1-deleted"])
    );
  });

  it("maps table type to both meta- and table- keys for the requested user", async () => {
    const db = createDb([
      [
        "meta-u1-tableA",
        { dbKey: "meta-u1-tableA", type: "table", userId: "u1", name: "A" },
      ],
      [
        "meta-u10-tableB",
        { dbKey: "meta-u10-tableB", type: "table", userId: "u10", name: "B" },
      ],
      [
        "table-u1-legacy",
        { dbKey: "table-u1-legacy", type: "table", userId: "u1", name: "legacy" },
      ],
    ]);

    const result = await fetchUserData(db, "table", "u1");
    const keys = result.map((r: any) => r.dbKey).sort();
    // table 定义主要在 meta- 下，但远端缓存写入可能落在 table- 下，两个 prefix 都扫。
    expect(keys).toEqual(["meta-u1-tableA", "table-u1-legacy"]);
    expect(getUserDataPrefixes("table", "u1")).toEqual(["meta-u1-", "table-u1-"]);
  });

  it("does not pull neighbor userIds that share a string prefix", async () => {
    const db = createDb([
      ["app-u1-a", { dbKey: "app-u1-a", type: "app", userId: "u1" }],
      ["app-u10-b", { dbKey: "app-u10-b", type: "app", userId: "u10" }],
      ["app-u12-c", { dbKey: "app-u12-c", type: "app", userId: "u12" }],
      ["app-u1a-d", { dbKey: "app-u1a-d", type: "app", userId: "u1a" }],
    ]);

    const result = await fetchUserData(db, "app", "u1");
    expect(result.map((r: any) => r.dbKey)).toEqual(["app-u1-a"]);
  });

  it("returns multi-type map and dedupes repeated type names in the request", async () => {
    let iteratorCalls = 0;
    const base = createDb([
      ["app-u1-1", { dbKey: "app-u1-1", type: "app", userId: "u1" }],
      ["page-u1-1", { dbKey: "page-u1-1", type: "page", userId: "u1" }],
    ]);
    const db = {
      async *iterator(opts: { gte: string; lte: string }) {
        iteratorCalls += 1;
        yield* base.iterator(opts);
      },
    };

    const result = await fetchUserData(db, ["app", "page", "app"], "u1");
    expect(Object.keys(result).sort()).toEqual(["app", "page"]);
    expect(result.app).toHaveLength(1);
    expect(result.page).toHaveLength(1);
    // app scanned once despite appearing twice in the type list
    expect(iteratorCalls).toBe(2);
  });

  it("dedupes the same storage key when an iterator emits it more than once", async () => {
    const shared = {
      dbKey: "meta-u1-shared",
      type: "table",
      userId: "u1",
    };
    // Malformed/overlapping iterator: same key twice (covers multi-prefix merge Map path).
    const dupDb = {
      async *iterator() {
        yield ["meta-u1-shared", { ...shared }];
        yield ["meta-u1-shared", { ...shared, name: "second" }];
      },
    };

    const result = await fetchUserData(dupDb, "table", "u1");
    expect(result).toHaveLength(1);
    expect(result[0]?.dbKey).toBe("meta-u1-shared");
    expect(result[0]?.name).toBeUndefined();
  });

  it("returns empty array for unknown empty user without throwing", async () => {
    const db = createDb([
      ["app-u1-1", { dbKey: "app-u1-1", type: "app", userId: "u1" }],
    ]);
    expect(await fetchUserData(db, "app", "")).toEqual([]);
    expect(await fetchUserData(db, "app", "   ")).toEqual([]);
  });

  it("preserves result set equality vs owned keys only (fixture set compare)", async () => {
    const owned = [
      ["dialog-u1-d1", { dbKey: "dialog-u1-d1", type: "dialog", userId: "u1" }],
      ["dialog-u1-d2", { dbKey: "dialog-u1-d2", type: "dialog", userId: "u1" }],
    ] as Entry[];
    const noise = [
      ["dialog-u10-x", { dbKey: "dialog-u10-x", type: "dialog", userId: "u10" }],
    ] as Entry[];
    const db = createDb([...owned, ...noise]);
    const result = await fetchUserData(db, "dialog", "u1");
    const got = new Set(result.map((r: any) => r.dbKey));
    expect(got).toEqual(new Set(["dialog-u1-d1", "dialog-u1-d2"]));
  });
});
