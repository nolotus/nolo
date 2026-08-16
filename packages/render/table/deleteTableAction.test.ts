import { afterEach, describe, expect, it, mock } from "bun:test";

// Value-copy snapshot — Bun mock.restore() does not clear mock.module.
// Leaving resolveAuthorityReplicationServers stuck at () => [] poisons sibling
// suites that assert account-owned records still plan replication servers
// (e.g. create space device-local regression tests).
const realReplication = { ...(await import("database/actions/replication")) };

const restoreLeakedModuleMocks = () => {
  mock.module("database/actions/replication", () => realReplication);
};

class MemoryTableDb {
  records = new Map<string, any>();

  async get(key: string) {
    if (!this.records.has(key)) {
      throw Object.assign(new Error("not found"), { notFound: true });
    }
    return this.records.get(key);
  }

  async batch(
    ops: Array<
      | { type: "del"; key: string }
      | { type: "put"; key: string; value: unknown }
    >
  ) {
    for (const op of ops) {
      if (op.type === "put") {
        this.records.set(op.key, op.value);
      } else {
        this.records.delete(op.key);
      }
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

describe("deleteTableAction", () => {
  afterEach(() => {
    mock.restore();
    restoreLeakedModuleMocks();
  });

  it("does not delete sibling local table data that shares a key prefix", async () => {
    const scheduleDeleteReplication = mock(() => []);
    mock.module("database/actions/replication", () => ({
      ...realReplication,
      resolveReplicationServers: () => [],
      resolveAuthorityReplicationServers: () => [],
      resolveTenantReplicationServers: () => [],
      resolveUploadReplicationServers: () => [],
      scheduleWriteReplication: () => undefined,
      scheduleExistingRecordReplication: () => [],
      schedulePatchReplication: () => undefined,
      scheduleConfiguredPatchReplication: () => [],
      scheduleUploadReplication: () => [],
      uploadToCurrentServer: async () => false,
      deleteFromReplicationServers: async () => ({ succeeded: [], failed: [] }),
      scheduleDeleteReplication,
    }));
    const { deleteTableAction } = await import("./deleteTableAction");

    const db = new MemoryTableDb();
    db.records.set("meta-user1-table", {
      dbKey: "meta-user1-table",
      type: "table",
      tenantId: "user1",
      tableId: "table",
    });
    db.records.set("row-user1-table-row1", {
      dbKey: "row-user1-table-row1",
      type: "table_row",
      tenantId: "user1",
      tableId: "table",
      rowId: "row1",
    });
    db.records.set("idx-user1-table-status-open-row1", "row-user1-table-row1");

    db.records.set("meta-user1-table-extra", {
      dbKey: "meta-user1-table-extra",
      type: "table",
      tenantId: "user1",
      tableId: "table-extra",
    });
    db.records.set("row-user1-table-extra-row2", {
      dbKey: "row-user1-table-extra-row2",
      type: "table_row",
      tenantId: "user1",
      tableId: "table-extra",
      rowId: "row2",
    });
    db.records.set(
      "idx-user1-table-extra-status-open-row2",
      "row-user1-table-extra-row2"
    );

    await deleteTableAction(
      { dbKey: "meta-user1-table" },
      {
        dispatch: (() => undefined) as any,
        getState: () =>
          ({
            auth: { currentUser: { userId: "user1" } },
            settings: { currentServer: undefined, syncServers: [] },
          }) as any,
        extra: { db },
      }
    );

    expect(db.records.get("meta-user1-table")).toEqual(
      expect.objectContaining({ deletedAt: expect.any(String) })
    );
    expect(db.records.get("row-user1-table-row1")).toEqual(
      expect.objectContaining({ deletedAt: expect.any(String) })
    );
    expect(db.records.has("idx-user1-table-status-open-row1")).toBe(false);

    expect(db.records.get("meta-user1-table-extra")).toEqual(
      expect.objectContaining({ tableId: "table-extra" })
    );
    expect(db.records.get("row-user1-table-extra-row2")).toEqual(
      expect.objectContaining({ tableId: "table-extra" })
    );
    expect(db.records.get("row-user1-table-extra-row2").deletedAt).toBeUndefined();
    expect(db.records.has("idx-user1-table-extra-status-open-row2")).toBe(true);
    expect(scheduleDeleteReplication).toHaveBeenCalled();
  });
});
