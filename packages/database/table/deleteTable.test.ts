import { describe, expect, it } from "bun:test";
import { deleteTable } from "./deleteTable";

class MemoryKeyValueDb {
  records = new Map<string, any>();

  async get(key: string) {
    if (!this.records.has(key)) {
      throw Object.assign(new Error("not found"), { notFound: true });
    }
    return this.records.get(key);
  }

  async put(key: string, value: unknown) {
    this.records.set(key, value);
  }

  async del(key: string) {
    this.records.delete(key);
  }

  async batch(
    ops: Array<
      | { type: "del"; key: string }
      | { type: "put"; key: string; value: unknown }
    >
  ) {
    for (const op of ops) {
      if (op.type === "put") this.records.set(op.key, op.value);
      else this.records.delete(op.key);
    }
  }

  iterator({ gte, lte }: { gte?: string; lte?: string }) {
    const entries = Array.from(this.records.entries()).filter(([key]) => {
      if (gte && key < gte) return false;
      if (lte && key > lte) return false;
      return true;
    });
    return {
      async *[Symbol.asyncIterator]() {
        yield* entries;
      },
    };
  }
}

describe("deleteTable", () => {
  it("tombstones table meta and rows while physically deleting derived keys", async () => {
    const db = new MemoryKeyValueDb();
    await db.put("meta-user1-table1", {
      dbKey: "meta-user1-table1",
      type: "table",
      tenantId: "user1",
      tableId: "table1",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
    await db.put("row-user1-table1-row1", {
      dbKey: "row-user1-table1-row1",
      type: "table_row",
      tenantId: "user1",
      tableId: "table1",
      rowId: "row1",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
    await db.put("idx-user1-table1-status-open-row1", "row-user1-table1-row1");
    await db.put("view-user1-table1-main", {
      tenantId: "user1",
      tableId: "table1",
      viewId: "main",
    });

    const result = await deleteTable(db, "meta-user1-table1");

    expect(result.processingIds).toEqual(
      expect.arrayContaining([
        "meta-user1-table1",
        "row-user1-table1-row1",
        "idx-user1-table1-status-open-row1",
        "view-user1-table1-main",
      ])
    );
    expect(db.records.get("meta-user1-table1")).toEqual(
      expect.objectContaining({
        dbKey: "meta-user1-table1",
        deletedAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
    expect(db.records.get("row-user1-table1-row1")).toEqual(
      expect.objectContaining({
        dbKey: "row-user1-table1-row1",
        deletedAt: expect.any(String),
        updatedAt: expect.any(String),
      })
    );
    expect(db.records.has("idx-user1-table1-status-open-row1")).toBe(false);
    expect(db.records.has("view-user1-table1-main")).toBe(false);
  });

  it("supports table ids that contain separators", async () => {
    const db = new MemoryKeyValueDb();
    await db.put("meta-user1-meta-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ", {
      dbKey: "meta-user1-meta-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ",
      type: "table",
      tenantId: "user1",
      tableId: "meta-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });
    await db.put("row-user1-meta-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ-row1", {
      dbKey: "row-user1-meta-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ-row1",
      type: "table_row",
      tenantId: "user1",
      tableId: "meta-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ",
      rowId: "row1",
      updatedAt: "2026-05-01T00:00:00.000Z",
    });

    await deleteTable(db, "meta-user1-meta-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ");

    expect(db.records.get("meta-user1-meta-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ")).toEqual(
      expect.objectContaining({ deletedAt: expect.any(String) })
    );
    expect(db.records.get("row-user1-meta-0e95801d90-01KWSK4Q4TESXQ06SW39JN2TTJ-row1")).toEqual(
      expect.objectContaining({ deletedAt: expect.any(String) })
    );
  });

  it("does not delete sibling tables that share a key prefix", async () => {
    const db = new MemoryKeyValueDb();
    await db.put("meta-user1-table", {
      dbKey: "meta-user1-table",
      type: "table",
      tenantId: "user1",
      tableId: "table",
    });
    await db.put("row-user1-table-row1", {
      dbKey: "row-user1-table-row1",
      type: "table_row",
      tenantId: "user1",
      tableId: "table",
      rowId: "row1",
    });
    await db.put("idx-user1-table-status-open-row1", "row-user1-table-row1");
    await db.put("view-user1-table-main", {
      tenantId: "user1",
      tableId: "table",
      viewId: "main",
    });

    await db.put("meta-user1-table-extra", {
      dbKey: "meta-user1-table-extra",
      type: "table",
      tenantId: "user1",
      tableId: "table-extra",
    });
    await db.put("row-user1-table-extra-row2", {
      dbKey: "row-user1-table-extra-row2",
      type: "table_row",
      tenantId: "user1",
      tableId: "table-extra",
      rowId: "row2",
    });
    await db.put("idx-user1-table-extra-status-open-row2", "row-user1-table-extra-row2");
    await db.put("view-user1-table-extra-main", {
      tenantId: "user1",
      tableId: "table-extra",
      viewId: "main",
    });

    await deleteTable(db, "meta-user1-table");

    expect(db.records.get("row-user1-table-row1")).toEqual(
      expect.objectContaining({ deletedAt: expect.any(String) })
    );
    expect(db.records.has("idx-user1-table-status-open-row1")).toBe(false);
    expect(db.records.has("view-user1-table-main")).toBe(false);
    expect(db.records.get("row-user1-table-extra-row2")).toEqual(
      expect.objectContaining({
        tableId: "table-extra",
      })
    );
    expect(db.records.get("row-user1-table-extra-row2").deletedAt).toBeUndefined();
    expect(db.records.has("idx-user1-table-extra-status-open-row2")).toBe(true);
    expect(db.records.has("view-user1-table-extra-main")).toBe(true);
  });
});
