// 文件: render/table/tablePrefs.test.ts
import { describe, expect, test } from "bun:test";

import {
  applyDefaultRecentSort,
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

describe("applyDefaultRecentSort", () => {
  const key = (r: { dbKey: string }) => r.dbKey;

  test("puts most recently updated row first", () => {
    const rows = [
      { dbKey: "old", updatedAt: "2026-08-01T00:00:00Z" },
      { dbKey: "new", updatedAt: "2026-09-02T00:19:33Z" },
      { dbKey: "mid", updatedAt: "2026-08-20T10:00:00Z" },
    ];
    const sorted = applyDefaultRecentSort(rows, key);
    expect(sorted.map((r) => r.dbKey)).toEqual(["new", "mid", "old"]);
  });

  test("falls back to createdAt when updatedAt is missing", () => {
    const rows = [
      { dbKey: "a", createdAt: "2026-08-01T00:00:00Z" },
      { dbKey: "b", createdAt: "2026-09-01T00:00:00Z" },
      {
        dbKey: "c",
        createdAt: "2026-07-01T00:00:00Z",
        updatedAt: "2026-08-15T00:00:00Z",
      },
    ];
    const sorted = applyDefaultRecentSort(rows, key);
    expect(sorted.map((r) => r.dbKey)).toEqual(["b", "c", "a"]);
  });

  test("sinks rows without any timestamp and breaks ties deterministically by dbKey desc", () => {
    const rows = [
      { dbKey: "row-2", updatedAt: "2026-08-01T00:00:00Z" },
      { dbKey: "ghost" },
      { dbKey: "row-1", updatedAt: "2026-08-01T00:00:00Z" },
      { dbKey: "row-3", updatedAt: "2026-08-01T00:00:00Z" },
    ];
    const sorted = applyDefaultRecentSort(rows, key);
    expect(sorted.map((r) => r.dbKey)).toEqual([
      "row-3",
      "row-2",
      "row-1",
      "ghost",
    ]);
  });

  test("does not mutate the input array", () => {
    const rows = [
      { dbKey: "old", updatedAt: "2026-08-01T00:00:00Z" },
      { dbKey: "new", updatedAt: "2026-09-02T00:19:33Z" },
    ];
    applyDefaultRecentSort(rows, key);
    expect(rows.map((r) => r.dbKey)).toEqual(["old", "new"]);
  });

  test("treats unparseable timestamps as missing", () => {
    const rows = [
      { dbKey: "bad", updatedAt: "not-a-date" },
      { dbKey: "good", updatedAt: "2026-09-02T00:19:33Z" },
    ];
    const sorted = applyDefaultRecentSort(rows, key);
    expect(sorted.map((r) => r.dbKey)).toEqual(["good", "bad"]);
  });
});
