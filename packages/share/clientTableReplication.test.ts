import { describe, expect, it, mock } from "bun:test";
import { DataType } from "create/types";

describe("clientTableReplication", () => {
  it("bootstraps local meta and rows to replica servers", async () => {
    const writeToServer = mock(async () => true);
    const patchShareMeta = mock(async () => true);
    const { bootstrapReplicatedTable } = await import(
      "./clientTableReplication"
    );

    const result = await bootstrapReplicatedTable({
      shareDbKey: "share-abc123def4",
      shareRecord: {
        type: DataType.TABLE,
        data: { mode: "live", tableDbKey: "meta-user123-table123" },
        meta: {
          authorId: "user123",
          title: "Gemma 4 Benchmarks",
          visibility: "community",
        },
      } as any,
      tableDbKey: "meta-user123-table123",
      replicaServers: ["https://nolo.chat"],
      loadLocalTableSnapshot: async () => ({
        tableMeta: {
          dbKey: "meta-user123-table123",
          type: DataType.TABLE,
          tenantId: "user123",
          tableId: "table123",
        },
        rows: [
          {
            dbKey: "row-user123-table123-row1",
            type: DataType.TABLE_ROW,
            tenantId: "user123",
            tableId: "table123",
            rowId: "row1",
          },
        ],
      }),
      writeToServer,
      patchShareMeta,
    } as any);

    expect(writeToServer).toHaveBeenCalledTimes(2);
    expect(writeToServer.mock.calls[0] as any[]).toEqual([
      "https://nolo.chat",
      "meta-user123-table123",
      expect.objectContaining({
        type: DataType.TABLE,
      }),
    ]);
    expect(writeToServer.mock.calls[1] as any[]).toEqual([
      "https://nolo.chat",
      "row-user123-table123-row1",
      expect.objectContaining({
        type: DataType.TABLE_ROW,
      }),
    ]);
    expect(patchShareMeta).toHaveBeenCalledWith(
      expect.objectContaining({
        replicaServers: ["https://nolo.chat"],
        lastReplicationAt: expect.any(Number),
      })
    );
    expect(result.failedServers).toEqual([]);
  });

  it("marks the share dirty instead of crashing when local table snapshot is missing", async () => {
    const writeToServer = mock(async () => true);
    const patchShareMeta = mock(async () => true);
    const { bootstrapReplicatedTable } = await import(
      "./clientTableReplication"
    );

    const result = await bootstrapReplicatedTable({
      shareDbKey: "share-abc123def4",
      shareRecord: {
        type: DataType.TABLE,
        data: { mode: "live", tableDbKey: "meta-user123-table123" },
      } as any,
      tableDbKey: "meta-user123-table123",
      replicaServers: ["https://nolo.chat"],
      loadLocalTableSnapshot: async () => ({
        tableMeta: null,
        rows: [],
      }),
      writeToServer,
      patchShareMeta,
    } as any);

    expect(writeToServer).not.toHaveBeenCalled();
    expect(patchShareMeta).toHaveBeenCalledWith(
      expect.objectContaining({
        replicaServers: ["https://nolo.chat"],
        replicationDirtyAt: expect.any(Number),
        lastReplicationError: expect.stringContaining("missing table meta"),
      })
    );
    expect(result.failedServers).toEqual(["https://nolo.chat"]);
  });

  it("loads the bootstrap snapshot from the origin share table endpoint by default", async () => {
    const fetchMock = mock(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        tableMeta: {
          dbKey: "meta-user123-table123",
          type: DataType.TABLE,
          tenantId: "user123",
          tableId: "table123",
        },
        rows: [],
      }),
    }));
    globalThis.fetch = fetchMock as any;
    const { bootstrapReplicatedTable } = await import(
      "./clientTableReplication"
    );

    await bootstrapReplicatedTable({
      shareDbKey: "share-abc123def4",
      shareRecord: {
        type: DataType.TABLE,
        data: {
          mode: "live",
          tableDbKey: "meta-user123-table123",
          originServer: "https://us.nolo.chat",
        },
      } as any,
      tableDbKey: "meta-user123-table123",
      replicaServers: ["https://nolo.chat"],
      thunkApi: {
        getState: () => ({
          auth: {
            currentToken: "user-token",
          },
        }),
      },
      writeToServer: async () => true,
      patchShareMeta: async () => true,
    } as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://us.nolo.chat/api/v1/share/abc123def4/table?rowLimit=all",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer user-token",
        }),
      })
    );
  });
});
