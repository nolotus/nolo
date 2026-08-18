import { describe, expect, it, mock } from "bun:test";

const addRowMock = Object.assign(
  mock((payload: any) => ({ type: "addRow", payload })),
  {
    fulfilled: {
      match: (action: any) => action?.type === "fulfilled",
    },
  }
);

let moduleVersion = 0;

async function loadAddTableRowTool() {
  const realTableSlice = await import("render/table/tableSlice");
  mock.module("render/table/tableSlice", () => ({
    ...realTableSlice,
    addRow: addRowMock,
  }));
  const mod = await import(`./addTableRowTool`);
  mock.restore();
  return mod;
}

const createThunkApi = (currentTable: any, createdRow: any) => ({
  getState: () => ({
    table: {
      currentTable,
    },
  }),
  dispatch: mock(async (_action: any) => ({
    type: "fulfilled",
    payload: createdRow,
  })),
});

describe("addTableRowFunc", () => {
  it("passes values through when caller uses the canonical values object", async () => {
    const { addTableRowFunc } = await loadAddTableRowTool();
    addRowMock.mockClear();
    const thunkApi = createThunkApi(
      {
        tenantId: "tenant-1",
        tableId: "table-1",
        displayName: "反馈表",
        columns: [{ name: "content" }, { name: "status" }],
      },
      {
        dbKey: "row-1",
        rowId: "row-1",
        tenantId: "tenant-1",
        tableId: "table-1",
        content: "希望支持支付宝",
        status: "待处理",
      }
    );

    const result = await addTableRowFunc(
      {
        values: { content: "希望支持支付宝", status: "待处理" },
      },
      thunkApi as any
    );

    expect(addRowMock).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      tableId: "table-1",
      values: { content: "希望支持支付宝", status: "待处理" },
    });
    expect(result.rawData.values).toEqual({
      content: "希望支持支付宝",
      status: "待处理",
    });
  });

  it("normalizes legacy flat row fields into values and ignores unknown columns", async () => {
    const { addTableRowFunc } = await loadAddTableRowTool();
    addRowMock.mockClear();
    const thunkApi = createThunkApi(
      {
        tenantId: "tenant-1",
        tableId: "table-1",
        displayName: "反馈表",
        columns: [{ name: "content" }, { name: "status" }],
      },
      {
        dbKey: "row-2",
        rowId: "row-2",
        tenantId: "tenant-1",
        tableId: "table-1",
        content: "希望支持支付宝",
        status: "待处理",
      }
    );

    const result = await addTableRowFunc(
      {
        tenantId: "tenant-1",
        tableId: "table-1",
        content: "希望支持支付宝",
        status: "待处理",
        ignoredField: "skip-me",
      },
      thunkApi as any
    );

    expect(addRowMock).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      tableId: "table-1",
      values: { content: "希望支持支付宝", status: "待处理" },
    });
    expect(result.rawData.values).toEqual({
      content: "希望支持支付宝",
      status: "待处理",
    });
    expect(result.displayData).toContain("ignoredField");
  });
});
