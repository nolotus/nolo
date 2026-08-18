import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const tablePageSource = readFileSync(join(import.meta.dir, "TablePage.tsx"), "utf-8");
const tableGridSectionSource = readFileSync(
  join(import.meta.dir, "TableGridSection.tsx"),
  "utf-8"
);
const tableGridRowSource = readFileSync(
  join(import.meta.dir, "TableGridRow.tsx"),
  "utf-8"
);
const tableCssSource = readFileSync(
  join(import.meta.dir, "../table.css"),
  "utf-8"
);

describe("TablePage grid windowing source contract (react-virtual)", () => {
  it("uses @tanstack/react-virtual with dynamic measurement instead of the fixed-height window", () => {
    expect(tableGridSectionSource).toContain('from "@tanstack/react-virtual"');
    expect(tableGridSectionSource).toContain("useVirtualizer");
    expect(tableGridSectionSource).toContain("useVirtualizer({");
    // Dynamic measurement is the point of this migration — measureElement reads
    // real row heights via data-index; without it we silently fall back to the
    // 48px estimate and reproduce the old scrollbar-drift bug.
    expect(tableGridSectionSource).toContain("measureElement");
    // scrollToIndex replaces the hand-rolled `index * 48` scrollTop math for
    // keeping the edited row in the window after keyboard navigation.
    expect(tableGridSectionSource).toContain("scrollToIndex");
    expect(tableGridSectionSource).not.toContain("index * TABLE_ROW_ESTIMATED_HEIGHT");
    // Old self-built fixed-height window module is gone.
    expect(tablePageSource).not.toContain('from "./tableRowWindow"');
    expect(tablePageSource).not.toContain("computeTableRowWindow");
    expect(tablePageSource).not.toContain("expandWindowToIncludeIndex");
    // react-virtual owns scroll/resize observation — no manual mirror state left.
    expect(tablePageSource).not.toContain("gridScrollTop");
    expect(tablePageSource).not.toContain("gridViewportHeight");
    expect(tablePageSource).not.toContain("DEFAULT_GRID_VIEWPORT_HEIGHT");
  });

  it("keeps the edited row mounted in the same render, not one frame later", () => {
    // `switchCell` walks filteredRows while the virtualizer indexes
    // sortedAndOrderedRows, so with a sort active the edited row can land far
    // outside the window. scrollToIndex only sets scrollTop and the virtualizer
    // re-renders off an async scroll event — the row would miss a frame and its
    // autoFocus textarea would never mount in time. rangeExtractor widens the
    // mounted range during render, which is what expandWindowToIncludeIndex did.
    expect(tableGridSectionSource).toContain("rangeExtractor: gridRangeExtractor");
    expect(tableGridSectionSource).toContain("defaultRangeExtractor");
    // The extractor must depend on editingRowIndex, not read it from a ref: the
    // virtualizer memoizes its index list on the extractor's identity, so a
    // stable callback would keep returning the stale range.
    expect(tableGridSectionSource).toContain("[editingRowIndex]");
    expect(tableGridSectionSource).not.toContain("editingRowIndexRef");
  });

  it("keeps the window threshold and the small-table full-mount path", () => {
    expect(tablePageSource).toContain("GRID_WINDOWING_ROW_THRESHOLD");
    expect(tablePageSource).toContain("shouldWindowGridRows");
    expect(tableGridSectionSource).toContain("count: sortedAndOrderedRows.length");
    expect(tableGridSectionSource).toContain("enabled: shouldWindowGridRows");
    // Spacer heights and mapped items come from the virtualizer in TableGridSection.
    expect(tableGridSectionSource).toContain("gridVirtualItems.map");
    expect(tableGridSectionSource).toContain("sortedAndOrderedRows[virtualRow.index]");
    expect(tableGridSectionSource).toContain("getVirtualItems()");
    expect(tableGridSectionSource).toContain("getTotalSize()");
  });

  it("measures rows via data-index on memoized, ref-forwarding grid rows", () => {
    // measureElement resolves the virtual item from the element's data-index;
    // without this attribute dynamic measurement silently breaks.
    expect(tableGridRowSource).toContain("data-index={rowIndex}");
    expect(tableGridRowSource).toContain("forwardRef");
    expect(tableGridRowSource).toContain("memo(");
    expect(tableGridRowSource).toContain("areTableGridRowPropsEqual");
    expect(tableGridRowSource).toContain("cellEdit");
    expect(tableGridSectionSource).toContain("cellEdit=");
    expect(tableGridSectionSource).toContain("onStartEdit={handleStartEdit}");
    expect(tableGridSectionSource).toContain(
      "onEditingValueChange={handleEditingValueChange}"
    );
  });

  it("owns a scroll viewport in table.css without layout package edits", () => {
    expect(tableCssSource).toContain(".table-page__grid-scroll");
  });

  it("delegates sorting to the TanStack Table v9 row model instead of a per-row comparator", () => {
    // Sorting now lives in ./tableTanstack (tableColumnSort registered in the
    // v9 sortFns slot); TablePage only projects sortRule into SortingState.
    expect(tablePageSource).toContain("sortRuleToSorting(sortRule)");
    expect(tablePageSource).toContain("table.getSortedRowModel()");
    // Old hand-rolled sort path is gone — no per-column resolver in TablePage.
    expect(tablePageSource).not.toContain("const sortColumn = sortRule");
    expect(tablePageSource).not.toContain("row[sortColumn.name]");
    expect(tablePageSource).not.toContain("sortRowsByColumn(");
  });

  it("derives spacer heights from the virtualizer so uneven rows measure correctly", () => {
    // With dynamic measurement, total content height must come from
    // getTotalSize() (updated as measureElement reports real row heights),
    // not from a row-count × fixed-estimate product. The top/bottom spacers
    // must track the first/last virtual item's measured start/end so that
    // uneven rows do not drift the scrollbar.
    expect(tableGridSectionSource).toContain("estimateSize: () => 48");
    expect(tableGridSectionSource).toContain("rowVirtualizer.getTotalSize()");
    expect(tableGridSectionSource).toContain("gridVirtualItems[0].start");
    expect(tableGridSectionSource).toContain(
      "gridVirtualItems[gridVirtualItems.length - 1].end"
    );
    // A fixed-height spacer would be `rowIndex * 48` style arithmetic; that
    // drifts when real rows are taller than the 48px initial estimate.
    expect(tableGridSectionSource).not.toContain("* TABLE_ROW_ESTIMATED_HEIGHT");
    expect(tableGridSectionSource).not.toContain("rowIndex * 48");
    // measureElement must read data-index so re-measure after sort/HMR maps
    // back to the right row even when the DOM order changes.
    expect(tableGridSectionSource).toContain("rowVirtualizer.measureElement");
  });
});
