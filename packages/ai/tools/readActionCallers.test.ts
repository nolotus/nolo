import { describe, expect, it, mock } from "bun:test";

const readActionMock = mock(async (payload: { dbKey: string }) => ({
  dbKey: payload.dbKey,
}));
const readAndWaitActionMock = mock(async (dbKey: string) => ({
  dbKey,
}));
const writeMock = mock((payload: any) => payload);

mock.module("database/actions/read", () => ({
  readAction: readActionMock,
}));

mock.module("database/actions/readAndWait", () => ({
  readAndWaitAction: readAndWaitActionMock,
}));

let moduleVersion = 0;

async function loadReadActionCallers() {
  const realDbSlice = await import("database/dbSlice");
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    write: writeMock,
  }));

  const [readTool, readDocTool, updateDocTool] = await Promise.all([
    import(`./readTool?test=${moduleVersion}`),
    import(`./readDocTool?test=${moduleVersion}`),
    import(`./updateDocTool?test=${moduleVersion}`),
  ]);
  moduleVersion += 1;
  mock.restore();
  return {
    readFunc: readTool.readFunc,
    readDocFunc: readDocTool.readDocFunc,
    updateDocFunc: updateDocTool.updateDocFunc,
  };
}

describe("AI tool readAction callers", () => {
  it("readFunc forwards dbKey payload to readAction", async () => {
    const { readFunc } = await loadReadActionCallers();
    readActionMock.mockClear();
    const signal = new AbortController().signal;
    const thunkApi = {} as any;

    await readFunc({ dbKey: "dialog-demo" }, thunkApi, { signal });

    expect(readActionMock).toHaveBeenCalledTimes(1);
    expect(readActionMock).toHaveBeenCalledWith(
      { dbKey: "dialog-demo", signal },
      thunkApi
    );
  });

  it("readDocFunc forwards dbKey payload to readAction", async () => {
    const { readDocFunc } = await loadReadActionCallers();
    readActionMock.mockClear();
    readActionMock.mockImplementationOnce(async (payload: { dbKey: string }) => ({
      dbKey: payload.dbKey,
      title: "Doc",
      slateData: [],
      spaceId: "space-demo",
      created: "2024-01-01T00:00:00.000Z",
    }));
    const thunkApi = {} as any;

    const result = await readDocFunc({ id: "PAGE-demo" }, thunkApi);

    expect(readActionMock).toHaveBeenCalledTimes(1);
    expect(readActionMock).toHaveBeenCalledWith({ dbKey: "PAGE-demo" }, thunkApi);
    expect(result.rawData).toMatchObject({
      id: "PAGE-demo",
      title: "Doc",
    });
  });

  it("updateDocFunc forwards dbKey payload before writing", async () => {
    const { updateDocFunc } = await loadReadActionCallers();
    readActionMock.mockClear();
    writeMock.mockClear();
    readActionMock.mockImplementationOnce(async (payload: { dbKey: string }) => ({
      dbKey: payload.dbKey,
      title: "Doc",
      slateData: [],
    }));
    const dispatch = mock((_action: any) => ({
      unwrap: async () => undefined,
    }));
    const thunkApi = { dispatch } as any;

    await updateDocFunc(
      { id: "PAGE-demo", content: "Hello world", mode: "replace" },
      thunkApi
    );

    expect(readActionMock).toHaveBeenCalledTimes(1);
    expect(readActionMock).toHaveBeenCalledWith({ dbKey: "PAGE-demo" }, thunkApi);
    expect(writeMock).toHaveBeenCalledTimes(1);
    expect(writeMock.mock.calls[0]?.[0]?.customKey).toBe("PAGE-demo");
    expect(dispatch).toHaveBeenCalledTimes(1);
  });
});
