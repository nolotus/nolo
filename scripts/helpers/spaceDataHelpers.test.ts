import { afterEach, describe, expect, mock, test } from "bun:test";

const apiPostMock = mock(async (): Promise<{
  ok: boolean;
  status: number;
  data: any;
}> => ({
  ok: true,
  status: 200,
  data: { data: { data: [{ dbKey: "dialog-user-01A" }] } },
}));

let moduleVersion = 0;

async function loadModule() {
  mock.module("./apiHelpers", () => ({
    apiDelete: mock(async () => ({ ok: true, status: 200, data: {} })),
    apiGet: mock(async () => ({ ok: true, status: 200, data: {} })),
    apiPost: apiPostMock,
  }));
  return import(`./spaceDataHelpers.ts?test=${moduleVersion++}`);
}

describe("space data helpers", () => {
  afterEach(() => {
    mock.restore();
    apiPostMock.mockReset();
    apiPostMock.mockResolvedValue({
      ok: true,
      status: 200,
      data: { data: { data: [{ dbKey: "dialog-user-01A" }] } },
    });
  });

  test("queries user records through the read-only db query endpoint", async () => {
    const { queryDbRecords } = await loadModule();

    const records = await queryDbRecords("https://nolo.chat", "token", "user", {
      type: "dialog",
      limit: 25,
    });

    expect(records).toEqual([{ dbKey: "dialog-user-01A" }]);
    expect(apiPostMock).toHaveBeenCalledWith(
      "https://nolo.chat/api/v1/db/query/user?limit=25",
      { type: "dialog" },
      "token"
    );
  });

  test("passes subject refs through to indexed db queries", async () => {
    const { queryDbRecords } = await loadModule();

    await queryDbRecords("https://nolo.chat", "token", "user", {
      type: "dialog",
      limit: 10,
      subjectRef: { kind: "table-row", id: "row-user-board-1", role: "task" },
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      "https://nolo.chat/api/v1/db/query/user?limit=10",
      {
        type: "dialog",
        subjectRef: { kind: "table-row", id: "row-user-board-1", role: "task" },
      },
      "token"
    );
  });

  test("fails loudly when the query endpoint rejects the read", async () => {
    apiPostMock.mockResolvedValueOnce({
      ok: false,
      status: 403,
      data: { error: "forbidden" },
    });
    const { queryDbRecords } = await loadModule();

    await expect(queryDbRecords("https://nolo.chat", "token", "user", {
      type: "dialog",
    })).rejects.toThrow("查询记录失败 (403)");
  });
});
