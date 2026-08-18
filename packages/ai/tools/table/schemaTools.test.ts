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

async function loadSchemaTools() {
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
  const mod = await import(`./schemaTools`);
  mock.restore();
  return mod;
}

const tableMeta = {
  dbKey: "meta-tenant-1-table-1",
  tenantId: "tenant-1",
  tableId: "table-1",
  displayName: "测试表",
  columns: [
    { id: "col-name", name: "name", type: "text" },
    { id: "col-note", name: "note", type: "text", label: "备注" },
  ],
};

const rows = [
  {
    dbKey: "row-tenant-1-table-1-row-1",
    tenantId: "tenant-1",
    tableId: "table-1",
    rowId: "row-1",
    name: "alpha",
    note: "hello",
  },
];

function createThunkApi() {
  return {
    getState: () => ({
      table: {
        currentTable: tableMeta,
        rows,
      },
    }),
    dispatch: mock(async (action: any) => {
      if (action?.type === "readAndWait") {
        if (action.payload === tableMeta.dbKey) {
          return { type: "fulfilled", payload: tableMeta };
        }
      }

      if (action?.type === "loadTableRows") {
        return { type: "fulfilled", payload: rows };
      }

      if (action?.type === "patch") {
        const dbKey = action.payload.dbKey;
        if (dbKey === rows[0].dbKey) {
          const nextRow = { ...rows[0] };
          for (const [key, value] of Object.entries(action.payload.changes)) {
            if (value === null) {
              delete (nextRow as any)[key];
            } else {
              (nextRow as any)[key] = value;
            }
          }
          return { type: "fulfilled", payload: nextRow };
        }

        return {
          type: "fulfilled",
          payload: {
            ...tableMeta,
            ...action.payload.changes,
          },
        };
      }

      throw new Error(`Unexpected action: ${JSON.stringify(action)}`);
    }),
  };
}

describe("schema table tools", () => {
  beforeEach(() => {
    readAndWaitMock.mockClear();
    patchMock.mockClear();
    writeMock.mockClear();
    loadTableRowsMock.mockClear();
  });

  it("renames a column and migrates existing row keys", async () => {
    const { renameTableColumnFunc } = await loadSchemaTools();
    const thunkApi = createThunkApi();

    const result = await renameTableColumnFunc(
      {
        tenantId: "tenant-1",
        tableId: "table-1",
        oldName: "note",
        newName: "remark",
      },
      thunkApi as any
    );

    expect(patchMock.mock.calls[0]?.[0]).toEqual({
      dbKey: rows[0].dbKey,
      changes: expect.objectContaining({
        remark: "hello",
        note: null,
      }),
    });
    expect(patchMock.mock.calls[1]?.[0]).toEqual({
      dbKey: tableMeta.dbKey,
      changes: expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({ name: "remark" }),
        ]),
      }),
    });
    expect(result.displayData).toContain("remark");
  });

  it("deletes a column and removes it from rows and schema", async () => {
    const { deleteTableColumnFunc } = await loadSchemaTools();
    const thunkApi = createThunkApi();

    const result = await deleteTableColumnFunc(
      {
        tenantId: "tenant-1",
        tableId: "table-1",
        columnName: "note",
      },
      thunkApi as any
    );

    expect(patchMock.mock.calls[0]?.[0]).toEqual({
      dbKey: rows[0].dbKey,
      changes: expect.objectContaining({
        note: null,
      }),
    });
    expect(patchMock.mock.calls[1]?.[0]).toEqual({
      dbKey: tableMeta.dbKey,
      changes: expect.objectContaining({
        columns: [expect.objectContaining({ name: "name" })],
      }),
    });
    expect(result.displayData).toContain("note");
  });
});
