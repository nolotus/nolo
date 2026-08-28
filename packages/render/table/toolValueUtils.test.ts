import { describe, expect, it } from "bun:test";
import { applyRowFilters, normalizeRowValues, pickRowColumns, sortRows } from "./toolValueUtils";

const columns = [
  { id: "1", name: "name", type: "text", required: true },
  { id: "2", name: "status", type: "select", options: ["todo", "done"] },
  { id: "3", name: "score", type: "number" },
  { id: "4", name: "tags", type: "multi_select", options: ["a", "b", "c"] },
] as const;

describe("normalizeRowValues", () => {
  it("normalizes supported field types and ignores unknown keys", () => {
    const result = normalizeRowValues(
      columns as any,
      {
        name: "Alice",
        status: "done",
        score: "42",
        tags: "a, c",
        extra: "skip",
      },
      { mode: "create" }
    );

    expect(result.errors).toEqual([]);
    expect(result.ignoredColumns).toEqual(["extra"]);
    expect(result.sanitizedValues).toEqual({
      name: "Alice",
      status: "done",
      score: 42,
      tags: ["a", "c"],
    });
  });

  it("reports invalid option values and missing required fields", () => {
    const result = normalizeRowValues(
      columns as any,
      {
        status: "blocked",
      },
      { mode: "create" }
    );

    expect(result.errors.join("\n")).toContain("status");
    expect(result.errors.join("\n")).toContain("缺少必填字段");
  });
});

describe("pickRowColumns", () => {
  it("keeps base row identity fields by default for compatibility", () => {
    expect(
      pickRowColumns({
        rowId: "row-1",
        tenantId: "tenant-1",
        tableId: "table-1",
        title: "Task",
        status: "todo",
      }, ["title"])
    ).toEqual({
      title: "Task",
      rowId: "row-1",
      tenantId: "tenant-1",
      tableId: "table-1",
    });
  });

  it("can omit base row identity fields for compact query output", () => {
    expect(
      pickRowColumns(
        {
          rowId: "row-1",
          tenantId: "tenant-1",
          tableId: "table-1",
          title: "Task",
          status: "todo",
        },
        ["title"],
        { includeBaseFields: false }
      )
    ).toEqual({ title: "Task" });
  });

  it("can pick nested meta paths for generic activity projections", () => {
    expect(
      pickRowColumns(
        {
          rowId: "row-1",
          title: "Task",
          meta: {
            latestActivityRef: {
              type: "dialog",
              dialogId: "dialog-child",
              status: "running",
            },
          },
        },
        ["title", "meta.latestActivityRef"],
        { includeBaseFields: false }
      )
    ).toEqual({
      title: "Task",
      meta: {
        latestActivityRef: {
          type: "dialog",
          dialogId: "dialog-child",
          status: "running",
        },
      },
    });
  });
});

describe("row nested value helpers", () => {
  const rows = [
    {
      rowId: "row-1",
      title: "Running",
      meta: {
        latestActivityRef: {
          status: "running",
          updatedAt: "2026-05-20T02:00:00.000Z",
        },
      },
    },
    {
      rowId: "row-2",
      title: "Pending",
      meta: {
        latestActivityRef: {
          status: "pending",
          updatedAt: "2026-05-20T01:00:00.000Z",
        },
      },
    },
  ];

  it("filters by nested meta paths", () => {
    expect(
      applyRowFilters(rows, {
        "meta.latestActivityRef.status": "running",
      }).map((row) => row.rowId)
    ).toEqual(["row-1"]);
  });

  it("sorts by nested meta paths", () => {
    expect(
      sortRows(rows, "meta.latestActivityRef.updatedAt", "asc").map((row) => row.rowId)
    ).toEqual(["row-2", "row-1"]);
  });
});
