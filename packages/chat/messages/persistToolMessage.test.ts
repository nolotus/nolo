import { describe, expect, it, mock } from "bun:test";
import { DataType } from "create/types";

let moduleVersion = 0;

const DB_SLICE_NOOP = () => ({ type: "db/noop" });

async function loadPersistToolMessage(writeMock: ReturnType<typeof mock>) {
  // Full dbSlice action surface as no-op stubs so the module mock does not
  // starve other tests (e.g. ToolMessageContent via docSlice import
  // { readAndWait, patch }) of those exports when this file runs first.
  mock.module("database/dbSlice", () => ({
    write: writeMock,
    read: DB_SLICE_NOOP,
    readAndWait: DB_SLICE_NOOP,
    remove: DB_SLICE_NOOP,
    purge: DB_SLICE_NOOP,
    patch: DB_SLICE_NOOP,
    upsert: DB_SLICE_NOOP,
    upload: DB_SLICE_NOOP,
    readFileContent: DB_SLICE_NOOP,
    share: DB_SLICE_NOOP,
    upsertSSREntity: DB_SLICE_NOOP,
    removeCachedEntity: DB_SLICE_NOOP,
    selectById: () => undefined,
    selectEntities: () => ({}),
    selectAll: () => [],
    selectIds: () => [],
    selectTotal: () => 0,
    dbAdapter: { getSelectors: () => ({ selectById: () => undefined, selectEntities: () => ({}), selectAll: () => [], selectIds: () => [], selectTotal: () => 0 }) },
    default: (state: any) => state,
  }));
  return import(`./persistToolMessage.ts`);
}

describe("persistToolMessage", () => {
  it("awaits unwrap and forces role/type/streaming, strips controller", async () => {
    const writeMock = mock((config: { data: any; customKey: string }) => ({
      type: "db/write",
      payload: config,
      unwrap: async () => config,
    }));
    const { persistToolMessage } = await loadPersistToolMessage(writeMock);
    const dispatch = mock((action: any) => action);

    await persistToolMessage(
      dispatch,
      {
        id: "id-1",
        dbKey: "key-1",
        content: '{"a":1}',
        toolName: "readFile",
        toolCallId: "call-x",
        isStreaming: true,
        controller: {},
      },
      { isStreaming: false }
    );

    expect(writeMock).toHaveBeenCalledTimes(1);
    const config = writeMock.mock.calls[0][0];
    expect(config.customKey).toBe("key-1");
    expect(config.data).toMatchObject({
      id: "id-1",
      dbKey: "key-1",
      role: "tool",
      isStreaming: false,
      type: DataType.MSG,
      toolName: "readFile",
      toolCallId: "call-x",
      content: '{"a":1}',
    });
    expect(config.data.controller).toBeUndefined();
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it("soft mode swallows missing id without write", async () => {
    const writeMock = mock(() => ({ unwrap: async () => null }));
    const { persistToolMessage } = await loadPersistToolMessage(writeMock);
    await persistToolMessage(() => null, { content: "x" }, { soft: true });
    expect(writeMock).not.toHaveBeenCalled();
  });

  it("throws on missing id when not soft", async () => {
    const writeMock = mock(() => ({ unwrap: async () => null }));
    const { persistToolMessage } = await loadPersistToolMessage(writeMock);
    await expect(
      persistToolMessage(() => null, { content: "x" })
    ).rejects.toThrow(/missing id\/dbKey/);
    expect(writeMock).not.toHaveBeenCalled();
  });

  it("persistToolMessages writes each row in order", async () => {
    const order: string[] = [];
    const writeMock = mock((config: { data: any; customKey: string }) => {
      order.push(config.data.id);
      return { unwrap: async () => config };
    });
    const { persistToolMessages } = await loadPersistToolMessage(writeMock);
    const dispatch = mock((a: any) => a);
    await persistToolMessages(dispatch, [
      { id: "a", dbKey: "ka", content: "1" },
      { id: "b", dbKey: "kb", content: "2" },
    ]);
    expect(order).toEqual(["a", "b"]);
  });
});
