import { describe, expect, test } from "bun:test";

import {
  containsMarkdownTable,
  getColumnFilterOptions,
  getLatestTableActivityBadge,
  resolveTableDisplayMode,
  shouldRenderKanbanMarkdownTable,
} from "./tableView";

const baseColumns = [
  { id: "title-col", name: "title", label: "标题", isPrimary: true },
  { id: "status-col", name: "status", label: "状态", type: "select" as const },
  { id: "tags-col", name: "tags", label: "标签" },
  { id: "owner-col", name: "owner", label: "负责人" },
  { id: "progress-col", name: "progress", label: "进度" },
];

describe("resolveTableDisplayMode", () => {
  test("keeps ordinary tables in grid mode without a default view", () => {
    expect(
      resolveTableDisplayMode({
        tableId: "CUSTOMERS",
        columns: baseColumns,
        views: [],
      })
    ).toEqual({ type: "grid" });
  });

  test("opens the Nolo task board as a status kanban by default", () => {
    expect(
      resolveTableDisplayMode({
        tableId: "01KWSK4Q4TESXQ06SW39JN2TTJ",
        columns: baseColumns,
        views: [],
      })
    ).toEqual({
      type: "kanban",
      viewName: "看板",
      groupColumnName: "status",
      visibleColumnNames: ["title", "tags", "owner", "progress"],
      preferredGroupValues: ["待办", "进行中", "等待确认", "已完成"],
    });
  });

  test("uses explicit kanban view metadata when present", () => {
    expect(
      resolveTableDisplayMode({
        tableId: "CUSTOMERS",
        columns: baseColumns,
        views: [
          {
            id: "view-1",
            name: "Owner board",
            type: "kanban",
            isDefault: true,
            visibleColumnIds: ["title-col", "status-col"],
            group: { columnId: "owner-col" },
          },
        ],
      })
    ).toEqual({
      type: "kanban",
      viewName: "Owner board",
      groupColumnName: "owner",
      visibleColumnNames: ["title", "status"],
      preferredGroupValues: [],
    });
  });
});

describe("table filters", () => {
  const rows = [
    { dbKey: "row-1", title: "A", status: "待处理", owner: "林" },
    { dbKey: "row-2", title: "B", status: "进行中", owner: "周" },
    { dbKey: "row-3", title: "C", status: "待处理", owner: "周" },
    { dbKey: "row-4", title: "D", status: "", owner: "" },
  ];

  test("builds single-select filter options from column options and row values", () => {
    expect(
      getColumnFilterOptions(
        {
          id: "status-col",
          name: "status",
          label: "状态",
          options: ["已完成", "待处理", "进行中"],
        } as any,
        rows
      )
    ).toEqual(["已完成", "待处理", "进行中"]);

    expect(
      getColumnFilterOptions(
        {
          id: "status-col",
          name: "status",
          label: "状态",
          options: ["已完成", "待处理"],
        } as any,
        rows
      )
    ).toEqual(["已完成", "待处理", "进行中"]);

    expect(
      getColumnFilterOptions(
        {
          id: "owner-col",
          name: "owner",
          label: "负责人",
        } as any,
        rows
      )
    ).toEqual(["林", "周"]);
  });
});

describe("table activity badge", () => {
  test("projects latest dialog activity from row meta", () => {
    expect(
      getLatestTableActivityBadge({
        rowId: "row-1",
        meta: {
          latestActivityRef: {
            type: "dialog",
            dialogId: "01KSCHILDDIALOG000000000ABC",
            dialogKey: "dialog-user-01KSCHILDDIALOG000000000ABC",
            status: "running",
          },
        },
      })
    ).toMatchObject({
      dialogId: "01KSCHILDDIALOG000000000ABC",
      dialogKey: "dialog-user-01KSCHILDDIALOG000000000ABC",
      status: "running",
      label: "运行中 · 01KSCH…0ABC",
      tone: "running",
    });
  });

  test("falls back to the last activityRefs item and ignores non-dialog refs", () => {
    expect(
      getLatestTableActivityBadge({
        meta: {
          activityRefs: [
            { type: "page", dialogId: "not-dialog" },
            { type: "dialog", dialogId: "dialog-failed", status: "failed" },
          ],
        },
      })
    ).toMatchObject({
      dialogId: "dialog-failed",
      label: "失败 · dialog…iled",
      tone: "danger",
    });

    expect(getLatestTableActivityBadge({ meta: { latestActivityRef: { type: "page" } } })).toBeNull();
  });
});

describe("containsMarkdownTable", () => {
  const markdownTable = `执行结果：

| 项目 | 状态 |
| --- | --- |
| 实现 | 完成 |
| 验证 | 通过 |`;

  test("detects standard pipe-delimited markdown tables", () => {
    expect(containsMarkdownTable(markdownTable)).toBe(true);

    expect(
      containsMarkdownTable(`Name | Status
--- | :---:
Task board | done`)
    ).toBe(true);
  });

  test("ignores prose with pipes but no markdown table separator", () => {
    expect(containsMarkdownTable("请保留 A | B 这样的原始说明。")).toBe(false);
    expect(
      containsMarkdownTable(`| 项目 | 状态 |
| 还不是分隔行 | 进行中 |`)
    ).toBe(false);
  });

  test("renders markdown tables only for the Nolo task board kanban cards", () => {
    expect(shouldRenderKanbanMarkdownTable("01KWSK4Q4TESXQ06SW39JN2TTJ", markdownTable)).toBe(true);
    expect(shouldRenderKanbanMarkdownTable("CUSTOMERS", markdownTable)).toBe(false);
    expect(shouldRenderKanbanMarkdownTable(undefined, markdownTable)).toBe(false);
  });
});
