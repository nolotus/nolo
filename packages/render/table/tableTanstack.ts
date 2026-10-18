// 文件: render/table/tableTanstack.ts
//
// TanStack Table v9（按需引入）集成层。
//
// v9 采用 feature-slot 架构：行模型与函数通过 `features` 选项按需注册，
// 未注册的 feature（分组/分页/展开/选择/固定/列显隐/faceted/globalFilter…）
// 不会被拉进运行时，也不会参与类型推导 —— 这正是"按需"的落点。
//
// 本表只用两件事：列过滤（status/owner 快捷筛选）+ 单列排序。
// 因此只注册：
//   - columnFilteringFeature + filteredRowModel
//   - rowSortingFeature + sortedRowModel
// 并显式注册本表自己的 sortFns / filterFns（替代原手写
// tablePrefs.sortRowsByColumn 与 tableView.filterRowsByTableFilters，
// 比较/匹配语义逐行复刻，保证行为不变）。
//
// 不 import stockFeatures / legacy / flexRender：全量或 v8 兼容层都会
// 把本表用不到的功能带进产物。

import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  rowSortingFeature,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type Row,
  type SortFn,
  type SortingState,
  type TableFeatures,
} from "@tanstack/table-core";
import type { TableSortRule } from "./tablePrefs";
import type { TableColumn } from "./types";

/** 表格行在 UI 层的形状：行数据（列名 → 值）+ 稳定的 dbKey。 */
export type TableRow = Record<string, unknown> & { dbKey: string };

const isEmptyValue = (value: unknown): boolean =>
  value === null || value === undefined || value === "";

/**
 * 纯比较函数，复刻原 tablePrefs.sortRowsByColumn 的取值语义：
 * 1) 空值（null / undefined / ""）返回确定性方向（空值排后）——不能让空值
 *    返回 0：v9 排序器对 0 保持原相对位置，空值行会变成"排序屏障"，
 *    挡住非空值之间的交换（含空值的数据集会整体不排序）。
 * 2) 双方都可转有限数字时按数值比较（boolean 经 Number() 转 0/1，等价原实现）；
 * 3) 其余按 zh-Hans-CN + numeric 本地化比较。
 *
 * 注意：TanStack 对 desc 会把整个 sortFn 结果乘 -1（createSortedRowModel：
 * if (isDesc) sortInt *= -1），因此这里返回的"空值排后"在降序时会被反转成
 * 排前——这正是旧实现 factor 前单独处理空值所避免的。空值永远排尾的最终
 * 保证由排序完成后的稳定分区 partitionEmptyLast 提供（与方向无关），
 * 等价旧语义：factor 只作用于非空值之间的比较。
 */
export const compareTableValues = (a: unknown, b: unknown): number => {
  const aEmpty = isEmptyValue(a);
  const bEmpty = isEmptyValue(b);
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  const aNum = typeof a === "number" ? a : Number(a);
  const bNum = typeof b === "number" ? b : Number(b);
  if (Number.isFinite(aNum) && Number.isFinite(bNum) && aNum !== bNum) {
    return aNum - bNum;
  }

  return String(a).localeCompare(String(b), "zh-Hans-CN", { numeric: true });
};

/**
 * 把空值行（null / undefined / ""）稳定分区到末尾，保持相对顺序。
 * 复刻原 sortRowsByColumn 的"空值永远排尾、不随方向变化"语义——
 * TanStack 排序方向只作用于非空值之间。
 */
export const partitionEmptyLast = <T extends Record<string, unknown>>(
  rows: T[],
  columnName: string
): T[] => {
  const nonEmpty: T[] = [];
  const empty: T[] = [];
  for (const row of rows) {
    if (isEmptyValue(row[columnName])) {
      empty.push(row);
    } else {
      nonEmpty.push(row);
    }
  }
  return [...nonEmpty, ...empty];
};

/** 注册进 features.sortFns 的排序函数（按列取值后交给纯比较函数）。 */
const tableColumnSort: SortFn<TableFeatures, TableRow> = (
  rowA: Row<TableFeatures, TableRow>,
  rowB: Row<TableFeatures, TableRow>,
  columnId: string
): number => compareTableValues(rowA.getValue(columnId), rowB.getValue(columnId));

/**
 * 纯匹配函数，复刻原 tableView.filterRowsByTableFilters 的语义并扩展多选：
 * - filterValue 为 string[] 或 Set 时：若为空集合则放行；若包含行值则保留（多选支持）
 * - filterValue 为单个 string 时：trim 后为空 → 放行；否则精确匹配
 * - 行值若为数组（如 multi_select）：只要与 filterValue 存在交集即放行
 */
export const matchesTableFilter = (
  value: unknown,
  filterValue: unknown
): boolean => {
  if (filterValue === null || filterValue === undefined) return true;

  // 1. 多选集合分支（Array / Set）
  if (Array.isArray(filterValue) || filterValue instanceof Set) {
    const list = Array.from(filterValue)
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
    if (list.length === 0) return true;
    const filterSet = new Set(list);

    if (Array.isArray(value)) {
      return value.some((v) => filterSet.has(String(v ?? "").trim()));
    }
    return filterSet.has(String(value ?? "").trim());
  }

  // 2. 单值过滤分支
  const expected = String(filterValue ?? "").trim();
  if (!expected) return true;

  if (Array.isArray(value)) {
    return value.some((v) => String(v ?? "").trim() === expected);
  }
  return String(value ?? "").trim() === expected;
};

/** 注册进 features.filterFns 的过滤函数（按列取值后交给纯匹配函数）。 */
const tableColumnFilter: FilterFn<TableFeatures, TableRow> = (
  row: Row<TableFeatures, TableRow>,
  columnId: string,
  filterValue: unknown
): boolean => matchesTableFilter(row.getValue(columnId), filterValue);

/**
 * 本表的 v9 feature 组合（按需）。
 * - 行模型流水线：core → filtering → sorting（与旧实现 filter→sort 顺序一致）
 * - sortFns / filterFns 只注册本表用到的两个自定义函数
 */
export const tableFeatures = {
  rowSortingFeature,
  columnFilteringFeature,
  sortedRowModel: createSortedRowModel(),
  filteredRowModel: createFilteredRowModel(),
  sortFns: { tableColumnSort },
  filterFns: { tableColumnFilter },
} satisfies TableFeatures;

const columnHelper = createColumnHelper<typeof tableFeatures, TableRow>();

/**
 * 由 tableMeta.columns 派生 TanStack 列定义：
 * - accessor 按列机器名取值（兼容任意列类型）
 * - id 用列稳定 id，sort/filter 指向本表注册的自定义函数
 * - header 仅作元信息（排序指示等 UI 仍由 TablePage 既有头部渲染驱动）
 */
export const buildTableColumnDefs = (
  columns: TableColumn[]
): ColumnDef<typeof tableFeatures, TableRow>[] =>
  columns.map((col) =>
    columnHelper.accessor((row) => row[col.name], {
      id: col.id,
      header: col.label ?? col.name,
      sortFn: "tableColumnSort",
      filterFn: "tableColumnFilter",
    })
  );

/** TableSortRule（localStorage 持久化格式）→ TanStack SortingState。 */
export const sortRuleToSorting = (
  sortRule: TableSortRule | null
): SortingState =>
  sortRule
    ? [{ id: sortRule.columnId, desc: sortRule.direction === "desc" }]
    : [];

/** TanStack SortingState → TableSortRule（单列排序，取第一条）。 */
export const sortingToSortRule = (
  sorting: SortingState
): TableSortRule | null => {
  const first = sorting[0];
  return first
    ? { columnId: first.id, direction: first.desc ? "desc" : "asc" }
    : null;
};

/**
 * 由快捷筛选或通用多列筛选值派生 columnFilters 状态。
 * 兼容两种调用方式：
 * 1. 传统四参：(statusFilterColumn, statusValue, ownerFilterColumn, ownerValue)
 * 2. 扩展五参：追加 additionalFilters（键为 columnId，值为单字符串或多选数组）
 */
export const buildColumnFilters = (
  statusFilterColumn: Pick<TableColumn, "id"> | null,
  statusValue: string | string[],
  ownerFilterColumn: Pick<TableColumn, "id"> | null,
  ownerValue: string | string[],
  additionalFilters?: Record<string, string | string[]>
): ColumnFiltersState => {
  const filters: ColumnFiltersState = [];

  const addFilter = (colId: string | undefined, val: string | string[] | undefined) => {
    if (!colId || val === undefined || val === null) return;
    if (Array.isArray(val)) {
      const cleaned = val.map((item) => String(item ?? "").trim()).filter(Boolean);
      if (cleaned.length > 0) {
        filters.push({ id: colId, value: cleaned });
      }
    } else {
      const str = String(val).trim();
      if (str) {
        filters.push({ id: colId, value: str });
      }
    }
  };

  addFilter(statusFilterColumn?.id, statusValue);
  addFilter(ownerFilterColumn?.id, ownerValue);

  if (additionalFilters) {
    for (const [columnId, val] of Object.entries(additionalFilters)) {
      if (columnId === statusFilterColumn?.id || columnId === ownerFilterColumn?.id) continue;
      addFilter(columnId, val);
    }
  }

  return filters;
};
