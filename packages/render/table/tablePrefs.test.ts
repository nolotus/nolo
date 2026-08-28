// 文件: render/table/tablePrefs.test.ts
import { describe, expect, test } from "bun:test";

import {
  applyManualOrder,
  readTablePrefs,
  writeTablePrefs,
  type TablePrefs,
} from "./tablePrefs";

describe("tablePrefs read/write", () => {
  test("returns empty prefs when storage is empty", () => {
    const prefs = readTablePrefs("test-table");
    expect(prefs).toEqual({ sort: null, manualOrder: null });
  });

  test("round-trips a sort rule and manual order through storage", () => {
    if (typeof window === "undefined") return;
    const key = "round-trip";
    const next: TablePrefs = {
      sort: { columnId: "status", direction: "asc" },
      manualOrder: ["row-1", "row-2", "row-3"],
    };
    writeTablePrefs(key, next);
    const read = readTablePrefs(key);
    expect(read).toEqual(next);
  });

  test("rejects malformed payloads silently", () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "nolo.table.prefs.v1.malformed",
      "{not-json"
    );
    const prefs = readTablePrefs("malformed");
    expect(prefs).toEqual({ sort: null, manualOrder: null });
  });

  test("drops invalid sort direction on read", () => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "nolo.table.prefs.v1.bad-sort",
      JSON.stringify({ sort: { columnId: "x", direction: "sideways" } })
    );
    const prefs = readTablePrefs("bad-sort");
    expect(prefs.sort).toBeNull();
  });
});

describe("applyManualOrder", () => {
  test("keeps original order when manualOrder is null", () => {
    const rows = [{ dbKey: "a" }, { dbKey: "b" }];
    const ordered = applyManualOrder(rows, null, (r) => r.dbKey);
    expect(ordered).toBe(rows);
  });

  test("reorders according to manualOrder, appending unknown rows", () => {
    const rows = [{ dbKey: "a" }, { dbKey: "b" }, { dbKey: "c" }];
    const ordered = applyManualOrder(rows, ["c", "a"], (r) => r.dbKey);
    expect(ordered.map((r) => r.dbKey)).toEqual(["c", "a", "b"]);
  });

  test("ignores manualOrder entries that do not exist in rows", () => {
    const rows = [{ dbKey: "a" }, { dbKey: "b" }];
    const ordered = applyManualOrder(rows, ["ghost", "b", "a"], (r) => r.dbKey);
    expect(ordered.map((r) => r.dbKey)).toEqual(["b", "a"]);
  });
});
