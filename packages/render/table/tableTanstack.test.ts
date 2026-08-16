// 文件: render/table/tableTanstack.test.ts
//
// TanStack Table v9 集成层的纯函数语义测试。
// 覆盖原 tablePrefs.sortRowsByColumn / tableView.filterRowsByTableFilters
// 的行为契约（迁移后由 compareTableValues / matchesTableFilter 承接），
// 以及 columnFilters 派生规则。

import { describe, expect, test } from "bun:test";

import {
  buildColumnFilters,
  compareTableValues,
  matchesTableFilter,
  partitionEmptyLast,
  sortRuleToSorting,
  sortingToSortRule,
} from "./tableTanstack";

describe("compareTableValues（原 sortRowsByColumn 语义）", () => {
  test("字符串按 zh-Hans-CN + numeric 本地化比较", () => {
    expect(compareTableValues("Charlie", "Alpha")).toBeGreaterThan(0);
    expect(compareTableValues("Alpha", "Charlie")).toBeLessThan(0);
    expect(compareTableValues("Alpha", "Alpha")).toBe(0);
  });

  test("数字按数值比较（而非字符串序）", () => {
    expect(compareTableValues(5, 1)).toBeGreaterThan(0);
    expect(compareTableValues(1, 5)).toBeLessThan(0);
    // 数值字符串同样按数值比较（等价原实现 Number(raw) 分支）
    expect(compareTableValues("10", "2")).toBeGreaterThan(0);
  });

  test("boolean 经 Number() 归一到 0/1", () => {
    expect(compareTableValues(true, false)).toBeGreaterThan(0);
    expect(compareTableValues(false, true)).toBeLessThan(0);
  });

  test("空值返回确定性方向（空值排后）；排尾由 partitionEmptyLast 兜底", () => {
    // 空值不能返回 0：v9 排序器对 0 保持原相对位置，空值行会变成
    // "排序屏障"挡住非空值之间的交换。返回 ±1 保证排序可进行；
    // desc 反转造成的空值排前由 partitionEmptyLast 无条件修正。
    expect(compareTableValues("", "a")).toBeGreaterThan(0);
    expect(compareTableValues(null, "a")).toBeGreaterThan(0);
    expect(compareTableValues(undefined, "a")).toBeGreaterThan(0);
    expect(compareTableValues("a", "")).toBeLessThan(0);
    expect(compareTableValues("", "")).toBe(0);
    expect(compareTableValues(null, "")).toBe(0);
  });
});

describe("partitionEmptyLast（空值排尾、与排序方向无关）", () => {
  const rows = [
    { dbKey: "1", name: "b" },
    { dbKey: "2", name: "" },
    { dbKey: "3", name: "a" },
    { dbKey: "4", name: null },
    { dbKey: "5", name: "c" },
  ];

  test("空值稳定分区到末尾，非空值保持原相对顺序", () => {
    expect(partitionEmptyLast(rows, "name").map((r) => r.dbKey)).toEqual([
      "1",
      "3",
      "5",
      "2",
      "4",
    ]);
  });

  test("全部非空或全部空时保持原顺序", () => {
    expect(partitionEmptyLast(rows.slice(0, 1), "name").map((r) => r.dbKey)).toEqual([
      "1",
    ]);
    expect(partitionEmptyLast(rows.slice(1, 2), "name").map((r) => r.dbKey)).toEqual([
      "2",
    ]);
  });

  test("列不存在（值均为 undefined）时全部视为空值", () => {
    expect(partitionEmptyLast(rows, "missing").map((r) => r.dbKey)).toEqual([
      "1",
      "2",
      "3",
      "4",
      "5",
    ]);
  });
});

describe("matchesTableFilter（原 filterRowsByTableFilters 语义）", () => {
  test("过滤值为空时放行所有行", () => {
    expect(matchesTableFilter("任意值", "")).toBe(true);
    expect(matchesTableFilter("任意值", "   ")).toBe(true);
    expect(matchesTableFilter("任意值", null)).toBe(true);
    expect(matchesTableFilter("", "")).toBe(true);
  });

  test("trim 后精确匹配", () => {
    expect(matchesTableFilter(" 待处理 ", "待处理")).toBe(true);
    expect(matchesTableFilter("待处理", "待处理")).toBe(true);
    expect(matchesTableFilter("待处理", "进行中")).toBe(false);
    expect(matchesTableFilter("", "待处理")).toBe(false);
    expect(matchesTableFilter(null, "待处理")).toBe(false);
  });
});

describe("sortRule ⇄ SortingState 互转", () => {
  test("null / 空数组双向一致", () => {
    expect(sortRuleToSorting(null)).toEqual([]);
    expect(sortingToSortRule([])).toBeNull();
  });

  test("asc/desc 映射", () => {
    expect(sortRuleToSorting({ columnId: "status", direction: "asc" })).toEqual([
      { id: "status", desc: false },
    ]);
    expect(sortRuleToSorting({ columnId: "status", direction: "desc" })).toEqual([
      { id: "status", desc: true },
    ]);
    expect(
      sortingToSortRule([{ id: "status", desc: true }])
    ).toEqual({ columnId: "status", direction: "desc" });
    expect(
      sortingToSortRule([{ id: "status", desc: false }, { id: "owner", desc: true }])
    ).toEqual({ columnId: "status", direction: "asc" });
  });
});

describe("buildColumnFilters", () => {
  const statusColumn = { id: "status-col" };
  const ownerColumn = { id: "owner-col" };

  test("无筛选时不产生任何 columnFilters", () => {
    expect(buildColumnFilters(statusColumn, "", ownerColumn, "")).toEqual([]);
    expect(buildColumnFilters(null, "待处理", null, "周")).toEqual([]);
  });

  test("只在列存在且值非空时生成对应 filter", () => {
    expect(
      buildColumnFilters(statusColumn, "待处理", ownerColumn, "")
    ).toEqual([{ id: "status-col", value: "待处理" }]);
    expect(
      buildColumnFilters(statusColumn, "待处理", ownerColumn, "周")
    ).toEqual([
      { id: "status-col", value: "待处理" },
      { id: "owner-col", value: "周" },
    ]);
    expect(buildColumnFilters(null, "待处理", ownerColumn, "周")).toEqual([
      { id: "owner-col", value: "周" },
    ]);
  });
});
