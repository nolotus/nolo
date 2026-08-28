import { describe, expect, it, mock } from "bun:test";

const shareResourceActionMock = mock(async () => ({
  token: "abc123def4",
  key: "share-abc123def4",
}));
const readAndWaitMock = Object.assign(
  mock((dbKey: string) => ({ type: "readAndWait", payload: dbKey })),
  {
    fulfilled: {
      match: (action: any) => action?.type === "fulfilled",
    },
  }
);

let moduleVersion = 0;

const mockMessageSlice = async (userInput: string) => {
  const actualMessageSlice = await import("chat/messages/messageSlice");
  mock.module("chat/messages/messageSlice", () => ({
    ...actualMessageSlice,
    selectCurrentDialogId: () => "dialog-1",
    selectAllMsgs: () => [{ role: "user", content: userInput }],
  }));
};

const loadShareTableTool = async (userInput = "请给我一个分享链接") => {
  const actualDbSlice = await import("database/dbSlice");
  mock.module("share/action", () => ({
    shareResourceAction: shareResourceActionMock,
  }));
  mock.module("database/dbSlice", () => ({
    ...actualDbSlice,
    readAndWait: readAndWaitMock,
  }));
  await mockMessageSlice(userInput);
  const mod = await import(`./shareTableTool`);
  mock.restore();
  return mod;
};

describe("shareTableFunc", () => {
  it("shares a table via shareResourceAction and returns the share url", async () => {
    const { shareTableFunc } = await loadShareTableTool();
    shareResourceActionMock.mockClear();

    const result = await shareTableFunc(
      {
        dbKey: "meta-user123-table123",
        tenantId: "user123",
        tableId: "table123",
        title: "Gemma 4 Benchmarks",
      },
      {
        getState: () => ({}),
      } as any
    );

    expect(shareResourceActionMock).toHaveBeenCalledTimes(1);
    expect((shareResourceActionMock.mock.calls as any[])[0][0]).toMatchObject({
      type: "table",
      title: "Gemma 4 Benchmarks",
      visibility: "community",
      data: {
        dbKey: "meta-user123-table123",
        tenantId: "user123",
        tableId: "table123",
      },
    });
    expect(result.rawData.url).toBe("/share/abc123def4");
    expect(result.displayData).toContain("/share/abc123def4");
  });

  it("blocks community sharing when the latest user input did not explicitly request a public share", async () => {
    mock.module("share/action", () => ({
      shareResourceAction: shareResourceActionMock,
    }));
    await mockMessageSlice("把这个表整理一下");
    const { shareTableFunc } = await import(`./shareTableTool`);
    mock.restore();
    shareResourceActionMock.mockClear();

    await expect(
      shareTableFunc(
        {
          dbKey: "meta-user123-table123",
          tenantId: "user123",
          tableId: "table123",
          title: "Gemma 4 Benchmarks",
        },
        {
          getState: () => ({}),
        } as any
      )
    ).rejects.toThrow("当前策略不允许在用户未明确要求公开/社区分享时自动发布表");
    expect(shareResourceActionMock).not.toHaveBeenCalled();
  });

  it("accepts hyphenated share-link wording and resolves tenant/table ids from table meta", async () => {
    const { shareTableFunc } = await loadShareTableTool("请给我一个 share-link");
    shareResourceActionMock.mockClear();
    readAndWaitMock.mockClear();

    const dispatch = mock(async (action: any) => {
      if (action?.type === "readAndWait" && action.payload === "meta-tenant-1-table-1") {
        return {
          type: "fulfilled",
          payload: {
            dbKey: "meta-tenant-1-table-1",
            tenantId: "tenant-1",
            tableId: "table-1",
            displayName: "Gemma 4 Benchmarks",
          },
        };
      }
      return {
        type: "rejected",
        error: { message: "not found" },
      };
    });

    const result = await shareTableFunc(
      {
        dbKey: "meta-tenant-1-table-1",
      },
      {
        getState: () => ({}),
        dispatch,
      } as any
    );

    expect(readAndWaitMock).toHaveBeenCalledWith("meta-tenant-1-table-1");
    expect(shareResourceActionMock).toHaveBeenCalledTimes(1);
    expect((shareResourceActionMock.mock.calls as any[])[0][0]).toMatchObject({
      type: "table",
      title: "Gemma 4 Benchmarks",
      visibility: "community",
      data: {
        dbKey: "meta-tenant-1-table-1",
        tenantId: "tenant-1",
        tableId: "table-1",
        displayName: "Gemma 4 Benchmarks",
      },
    });
    expect(result.rawData.url).toBe("/share/abc123def4");
  });
});
