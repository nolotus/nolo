import { beforeEach, describe, expect, it, mock } from "bun:test";

const readAndWaitMock = Object.assign(
  mock((dbKey: string) => ({ type: "readAndWait", payload: dbKey })),
  {
    fulfilled: {
      match: (action: any) => action?.type === "fulfilled",
    },
  }
);

const patchMock = Object.assign(
  mock((payload: any) => ({ type: "patch", payload })),
  {
    fulfilled: {
      match: (action: any) => action?.type === "fulfilled",
    },
  }
);

const writeMock = Object.assign(
  mock((payload: any) => ({ type: "write", payload })),
  {
    fulfilled: {
      match: (action: any) => action?.type === "fulfilled",
    },
  }
);

const loadTableRowsMock = Object.assign(
  mock((payload: any) => ({ type: "loadTableRows", payload })),
  {
    fulfilled: {
      match: (action: any) => action?.type === "fulfilled",
    },
  }
);

let moduleVersion = 0;

async function loadRowTools() {
  const realDbSlice = await import("database/dbSlice");
  const realTableSlice = await import("render/table/tableSlice");
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    readAndWait: readAndWaitMock,
    patch: patchMock,
    write: writeMock,
  }));
  mock.module("render/table/tableSlice", () => ({
    ...realTableSlice,
    loadTableRows: loadTableRowsMock,
  }));
  const mod = await import(`./rowTools`);
  mock.restore();
  return mod;
}

const tableMeta = {
  dbKey: "meta-tenant-1-table-1",
  tenantId: "tenant-1",
  tableId: "table-1",
  displayName: "测试表",
  columns: [
    { id: "col-name", name: "name", type: "text", required: true },
    {
      id: "col-status",
      name: "status",
      type: "select",
      options: ["todo", "done"],
    },
    { id: "col-flag", name: "flag", type: "boolean" },
  ],
};

const rowRecord = {
  dbKey: "row-tenant-1-table-1-row-1",
  tenantId: "tenant-1",
  tableId: "table-1",
  rowId: "row-1",
  name: "alpha",
  status: "todo",
  flag: false,
};

function createThunkApi() {
  return {
    getState: () => ({
      table: {
        currentTable: tableMeta,
        rows: [rowRecord],
      },
    }),
    dispatch: mock(async (action: any) => {
      if (action?.type === "readAndWait") {
        if (action.payload === tableMeta.dbKey) {
          return { type: "fulfilled", payload: tableMeta };
        }
        if (action.payload === rowRecord.dbKey) {
          return { type: "fulfilled", payload: rowRecord };
        }
      }

      if (action?.type === "patch") {
        return {
          type: "fulfilled",
          payload: {
            ...rowRecord,
            ...action.payload.changes,
          },
        };
      }

      if (action?.type === "loadTableRows") {
        return {
          type: "fulfilled",
          payload: [rowRecord],
        };
      }

      throw new Error(`Unexpected action: ${JSON.stringify(action)}`);
    }),
  };
}

describe("updateTableRowFunc", () => {
  beforeEach(() => {
    readAndWaitMock.mockClear();
    patchMock.mockClear();
    writeMock.mockClear();
    loadTableRowsMock.mockClear();
  });

  it("normalizes values and patches the targeted row", async () => {
    const { updateTableRowFunc } = await loadRowTools();
    const thunkApi = createThunkApi();

    const result = await updateTableRowFunc(
      {
        tenantId: "tenant-1",
        tableId: "table-1",
        rowId: "row-1",
        changes: {
          status: "done",
          flag: "true",
          ignored: "skip-me",
        },
      },
      thunkApi as any
    );

    expect(patchMock).toHaveBeenCalledWith({
      dbKey: rowRecord.dbKey,
      changes: expect.objectContaining({
        status: "done",
        flag: true,
      }),
    });
    expect(result.rawData.status).toBe("done");
    expect(result.rawData.flag).toBe(true);
    expect(result.displayData).toContain("ignored");
  });

  it("rejects invalid select values before patching", async () => {
    const { updateTableRowFunc } = await loadRowTools();
    const thunkApi = createThunkApi();

    await expect(
      updateTableRowFunc(
        {
          tenantId: "tenant-1",
          tableId: "table-1",
          rowId: "row-1",
          changes: {
            status: "blocked",
          },
        },
        thunkApi as any
      )
    ).rejects.toThrow("status");

    expect(patchMock).not.toHaveBeenCalled();
  });
});

describe("queryTableRowsFunc", () => {
  beforeEach(() => {
    readAndWaitMock.mockClear();
    patchMock.mockClear();
    writeMock.mockClear();
    loadTableRowsMock.mockClear();
  });

  it("can omit base fields for compact task-board style queries", async () => {
    const { queryTableRowsFunc } = await loadRowTools();
    const thunkApi = createThunkApi();

    const result = await queryTableRowsFunc(
      {
        tenantId: "tenant-1",
        tableId: "table-1",
        columns: ["name", "status"],
        includeBaseFields: false,
      },
      thunkApi as any
    );

    expect(result.rawData.items).toEqual([{ name: "alpha", status: "todo" }]);
  });
});
