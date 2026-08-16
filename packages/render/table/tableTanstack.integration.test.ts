// 文件: render/table/tableTanstack.integration.test.ts
//
// 真实 v9 row model 集成测试：用 constructTable + 与 useTable 相同的
// reactivity 绑定，验证 tableFeatures / buildTableColumnDefs 组合后的
// 实际行模型输出（getFilteredRowModel / getSortedRowModel）。
//
// 关键：空值排尾（partitionEmptyLast）在 TablePage 层应用（排序之后、
// manualOrder 之前），不在 row model 内——因为 v9 对 desc 会反转整个
// sortFn 结果（createSortedRowModel：if (isDesc) sortInt *= -1），
// sortFn 里对空值返回 ±1 会在降序时被反转成排头。因此最终 grid 顺序
// 必须模拟 TablePage 的完整链路：getSortedRowModel → partitionEmptyLast。
//
// 这是纯函数单测（tableTanstack.test.ts）测不到的部分：feature-slot
// 注册顺序、sortFn/filterFn 字符串引用解析、asc/desc 方向反转、
// 空值排尾与排序方向的交互等。

import { describe, expect, test } from "bun:test";
import { constructTable } from "@tanstack/table-core";
import { renderPhaseReactivity } from "@tanstack/table-core/reactivity";
import { batch, createAtom } from "@tanstack/react-store";

import {
  buildTableColumnDefs,
  partitionEmptyLast,
  tableFeatures,
  type TableRow,
} from "./tableTanstack";

const rows: TableRow[] = [
  { dbKey: "1", name: "Charlie", status: "待处理", owner: "林", priority: 5 },
  { dbKey: "2", name: "Alpha", status: "进行中", owner: "周", priority: 1 },
  { dbKey: "3", name: "Bravo", status: "待处理", owner: "周", priority: 3 },
  { dbKey: "4", name: "", status: "", owner: "", priority: 2 },
  { dbKey: "5", name: "10", status: "待处理", owner: "林", priority: 10 },
  { dbKey: "6", name: "2", status: "阻塞", owner: "林", priority: 7 },
];

const columns = buildTableColumnDefs([
  { id: "name-col", name: "name" },
  { id: "status-col", name: "status" },
  { id: "owner-col", name: "owner" },
  { id: "priority-col", name: "priority" },
]);

// coreReactivityFeature 由 react adapter（useTable）在运行时注入；
// constructTable 的类型签名从 features 推导 TFeatures，这里保持与
// useTable 一致的注入形态，类型用 tableFeatures 自身推导（含注入键）。
const buildFeatures = () =>
  ({
    coreReactivityFeature: renderPhaseReactivity({ createAtom, batch }),
    ...tableFeatures,
  }) as typeof tableFeatures & {
    coreReactivityFeature: ReturnType<typeof renderPhaseReactivity>;
  };

const buildTable = (state: {
  sorting: Array<{ id: string; desc: boolean }>;
  columnFilters: Array<{ id: string; value: unknown }>;
}) =>
  constructTable({
    features: buildFeatures(),
    data: rows,
    columns,
    state,
    getRowId: (row) => row.dbKey,
  });

const ids = (model: { rows: Array<{ original: TableRow }> }) =>
  model.rows.map((row) => row.original.dbKey);

/** 模拟 TablePage.sortedAndOrderedRows 的完整链路（排序 → 空值稳定分区）。 */
const finalGridIds = (
  table: ReturnType<typeof buildTable>,
  sortColumnName: string
) => {
  const sorted = table
    .getSortedRowModel()
    .rows.map((row) => row.original);
  return partitionEmptyLast(sorted, sortColumnName).map((row) => row.dbKey);
};

describe("TanStack v9 row model 集成（真实行模型）", () => {
  test("无排序无过滤时保持原始顺序", () => {
    const table = buildTable({ sorting: [], columnFilters: [] });
    expect(ids(table.getSortedRowModel())).toEqual(["1", "2", "3", "4", "5", "6"]);
  });

  test("asc 排序：数字字符串按数值、空值经分区后排尾", () => {
    const table = buildTable({
      sorting: [{ id: "name-col", desc: false }],
      columnFilters: [],
    });
    // 非空值：2 < 10（数值）< Alpha < Bravo < Charlie；空值("")排尾
    expect(finalGridIds(table, "name")).toEqual(["6", "5", "2", "3", "1", "4"]);
  });

  test("desc 排序：空值仍然排尾（回归防护：v9 反转 sortFn 结果）", () => {
    const table = buildTable({
      sorting: [{ id: "name-col", desc: true }],
      columnFilters: [],
    });
    // 非空值 desc：Charlie > Bravo > Alpha > 10 > 2；空值("")排尾
    expect(finalGridIds(table, "name")).toEqual(["1", "3", "2", "5", "6", "4"]);
  });

  test("数值列 desc：纯数值排序", () => {
    const table = buildTable({
      sorting: [{ id: "priority-col", desc: true }],
      columnFilters: [],
    });
    expect(finalGridIds(table, "priority")).toEqual(["5", "6", "1", "3", "4", "2"]);
  });

  test("列过滤：精确匹配、保持原始顺序", () => {
    const table = buildTable({
      sorting: [],
      columnFilters: [{ id: "status-col", value: "待处理" }],
    });
    expect(ids(table.getFilteredRowModel())).toEqual(["1", "3", "5"]);
  });

  test("filter → sort 流水线顺序（先过滤后排序）", () => {
    const table = buildTable({
      sorting: [{ id: "priority-col", desc: true }],
      columnFilters: [{ id: "status-col", value: "待处理" }],
    });
    // 待处理行：10(5) > 5(1) > 3(3)
    expect(finalGridIds(table, "priority")).toEqual(["5", "1", "3"]);
  });

  test("getFilteredRowModel 保持原始顺序（看板分组依赖）", () => {
    const table = buildTable({
      sorting: [{ id: "priority-col", desc: true }],
      columnFilters: [{ id: "status-col", value: "待处理" }],
    });
    // 排序存在但 filtered 模型不受影响
    expect(ids(table.getFilteredRowModel())).toEqual(["1", "3", "5"]);
  });

  test("空值列同时存在 null 与空串时保持相对顺序", () => {
    const withNull = [
      { dbKey: "a", name: "b" },
      { dbKey: "b", name: "" },
      { dbKey: "c", name: null },
      { dbKey: "d", name: "a" },
    ] as TableRow[];
    const table = constructTable({
      features: buildFeatures(),
      data: withNull,
      columns,
      state: { sorting: [{ id: "name-col", desc: false }], columnFilters: [] },
      getRowId: (row) => row.dbKey,
    });
    // 非空值 asc：a < b；空值（"" 与 null）稳定排尾，保持原始相对顺序（b 在 c 前）
    expect(finalGridIds(table, "name")).toEqual(["d", "a", "b", "c"]);
  });
});
