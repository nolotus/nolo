import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tablePageSource = readFileSync(join(import.meta.dir, "TablePage.tsx"), "utf-8");
const tableTanstackSource = readFileSync(
  join(import.meta.dir, "tableTanstack.ts"),
  "utf-8"
);

describe("TablePage TanStack Table v9 source contract (on-demand)", () => {
  it("drives the grid through the v9 useTable hook", () => {
    expect(tablePageSource).toContain('from "@tanstack/react-table"');
    expect(tablePageSource).toContain("useTanStackTable({");
    expect(tablePageSource).toContain("features: tableFeatures");
    expect(tablePageSource).toContain("state: { sorting, columnFilters }");
    expect(tablePageSource).toContain("table.getFilteredRowModel()");
    expect(tablePageSource).toContain("table.getSortedRowModel()");
  });

  it("keeps v9 row-model plumbing in tableTanstack.ts instead of TablePage", () => {
    expect(tablePageSource).toContain('from "./tableTanstack"');
    expect(tablePageSource).toContain("buildTableColumnDefs(columns)");
    expect(tablePageSource).toContain("sortRuleToSorting(sortRule)");
    expect(tablePageSource).toContain("buildColumnFilters(");
    expect(tablePageSource).toContain("onSortingChange");
    expect(tablePageSource).toContain("onColumnFiltersChange");
  });

  it("registers only the features this table actually uses (按需)", () => {
    // Feature-slot 注册：只带 column filtering + row sorting 及其行模型。
    expect(tableTanstackSource).toContain("rowSortingFeature");
    expect(tableTanstackSource).toContain("columnFilteringFeature");
    expect(tableTanstackSource).toContain("sortedRowModel: createSortedRowModel()");
    expect(tableTanstackSource).toContain("filteredRowModel: createFilteredRowModel()");
    // 本表没用到的一律不注册（v9 未注册的 feature 不进运行时/类型推导）。
    expect(tableTanstackSource).not.toContain("createGroupedRowModel");
    expect(tableTanstackSource).not.toContain("createPaginatedRowModel");
    expect(tableTanstackSource).not.toContain("createExpandedRowModel");
    expect(tableTanstackSource).not.toContain("rowPinningFeature");
    expect(tableTanstackSource).not.toContain("rowSelectionFeature");
    expect(tableTanstackSource).not.toContain("columnVisibilityFeature");
    expect(tableTanstackSource).not.toContain("globalFilteringFeature");
    expect(tableTanstackSource).not.toContain("columnOrderingFeature");
    expect(tableTanstackSource).not.toContain("columnPinningFeature");
  });

  it("registers its own sort/filter fns instead of pulling the built-in registries", () => {
    expect(tableTanstackSource).toContain("sortFns: { tableColumnSort }");
    expect(tableTanstackSource).toContain("filterFns: { tableColumnFilter }");
    // 自定义函数承接旧手写语义（见 tableTanstack.test.ts）。
    expect(tableTanstackSource).toContain("compareTableValues");
    expect(tableTanstackSource).toContain("matchesTableFilter");
  });

  it("avoids the v8 legacy shim, stockFeatures and flexRender", () => {
    // v9 包内的 legacy 子路径是 v8 兼容层（@deprecated），迁移目标不用它。
    expect(tablePageSource).not.toContain('@tanstack/react-table/legacy"');
    expect(tableTanstackSource).not.toContain('@tanstack/react-table/legacy"');
    expect(tablePageSource).not.toContain("useLegacyTable");
    expect(tableTanstackSource).not.toContain("useLegacyTable");
    // 只检查实际 import 面（文件注释里允许解释性提及）：
    // 全量 feature 组合（stockFeatures）与 flexRender 都不属于"按需"路径。
    const tableCoreImport =
      tableTanstackSource.match(
        /import \{[^}]*\} from "@tanstack\/table-core"/
      )?.[0] ?? "";
    expect(tableCoreImport).not.toContain("stockFeatures");
    expect(tableCoreImport).not.toContain("flexRender");
    expect(tablePageSource).not.toContain("flexRender");
  });

  it("loads row-model factories and features straight from table-core", () => {
    expect(tableTanstackSource).toContain('from "@tanstack/table-core"');
    expect(tableTanstackSource).toContain("createFilteredRowModel");
    expect(tableTanstackSource).toContain("createSortedRowModel");
    expect(tableTanstackSource).toContain("createColumnHelper");
  });
});
