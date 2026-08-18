import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

import { dialogMessageKey } from "database/keys";

import {
  addPageReferenceToRuntime,
  addPendingFile,
  addActiveController,
  applyUpdateTokensFulfilled,
  enqueueUserInput,
  dequeueUserInput,
  getActiveControllers,
  getActiveDialogKey,
  getDialogConfigError,
  getDialogRuntimeTokens,
  getPendingFiles,
  getPendingUserInputQueue,
  resetDialogRuntimeSessionState,
  resetDialogRuntimeStoreForTests,
  setActiveDialogKey,
  setDialogConfigError,
  tokenUsageLiveUpdate,
} from "./dialogRuntimeStore";

// Cache-bust so earlier suite mocks of chat/dialog/dialogSlice (e.g. AgentDraftPanel)
// cannot strip async-thunk helpers like initDialog.pending / updateTokens.fulfilled.
const dialogSliceModule = await import(
  `./dialogSlice?dialogSliceUnit=${Date.now()}`
);
const {
  clearDialogState,
  deleteDialog,
  initDialog,
  selectCurrentDialogTokens,
  selectPendingUserInputQueue,
} = dialogSliceModule as typeof import("./dialogSlice");

let moduleVersion = 0;

const loadDialogSliceModule = async () => {
  const actualDialogSlice = await import(
    `./dialogSlice?dialogSliceReload=${++moduleVersion}`
  );
  const actualDbSlice = await import("database/dbSlice");

  return { actualDialogSlice, actualDbSlice };
};

beforeEach(() => {
  resetDialogRuntimeStoreForTests();
});

afterEach(() => {
  resetDialogRuntimeStoreForTests();
});

test("preserves FIFO order when enqueueing and dequeueing queued loop input", () => {
  enqueueUserInput("first");
  enqueueUserInput("second");

  expect(getPendingUserInputQueue()).toEqual(["first", "second"]);

  dequeueUserInput();

  expect(getPendingUserInputQueue()).toEqual(["second"]);
});

test("clearDialogState clears queued loop input but preserves pending attachments", () => {
  enqueueUserInput("queued message");
  addPendingFile({
    id: "file-1",
    name: "doc.txt",
    type: "txt",
    pageKey: "page-1",
  });

  clearDialogState();

  expect(getPendingUserInputQueue()).toEqual([]);
  expect(getPendingFiles()).toHaveLength(1);
  expect(getPendingFiles()[0]?.id).toBe("file-1");
});

test("clearDialogState clears configError in the runtime store", () => {
  setActiveDialogKey("dialog-user-a");
  setDialogConfigError("load failed");
  clearDialogState();
  expect(getActiveDialogKey()).toBeNull();
  expect(getDialogConfigError()).toBeNull();
});

test("supports separate queued loop input per dialog", () => {
  enqueueUserInput({ text: "dialog-a-1", dialogKey: "dialog-user-a" });
  enqueueUserInput({ text: "dialog-b-1", dialogKey: "dialog-user-b" });
  enqueueUserInput({ text: "dialog-a-2", dialogKey: "dialog-user-a" });

  expect(getPendingUserInputQueue("dialog-user-a")).toEqual([
    "dialog-a-1",
    "dialog-a-2",
  ]);
  expect(getPendingUserInputQueue("dialog-user-b")).toEqual(["dialog-b-1"]);
});

test("initDialog resets token stats for the target dialog runtime", () => {
  setActiveDialogKey("dialog-user-dialog-a");
  resetDialogRuntimeSessionState("dialog-user-dialog-a");

  expect(getDialogRuntimeTokens("dialog-user-dialog-a")).toEqual({
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
  });
});

test("initDialog preserves pending attachments when re-entering a dialog", async () => {
  const { actualDialogSlice, actualDbSlice } = await loadDialogSliceModule();
  const readMock = mock(() => ({ type: "db/read" }));

  mock.module("database/dbSlice", () => ({
    ...actualDbSlice,
    read: readMock,
  }));

  const { initDialog: initDialogFresh } = await import(
    `./dialogSlice?preservePending=${moduleVersion++}`
  );
  mock.restore();

  setActiveDialogKey("dialog-user-a");
  addPendingFile({
    id: "draft-1",
    name: "note.txt",
    type: "txt",
    pageKey: "page-draft-1",
    targetDialogKey: "dialog-user-a",
  });

  const dispatch = mock((action: any) => {
    if (typeof action === "function") {
      return action(dispatch, () => ({}), undefined);
    }
    if (action.type === "db/read") {
      return {
        unwrap: async () => ({ dbKey: action.payload.dbKey }),
      };
    }
    return action;
  });

  // Enter B then return to A — payload creator must not wipe A's drafts.
  await initDialogFresh("dialog-user-b")(
    dispatch as any,
    () => ({}) as any,
    undefined
  );
  expect(getPendingFiles("dialog-user-a")).toHaveLength(1);

  await initDialogFresh("dialog-user-a")(
    dispatch as any,
    () => ({}) as any,
    undefined
  );
  expect(getPendingFiles("dialog-user-a")).toHaveLength(1);
  expect(getPendingFiles("dialog-user-a")[0]?.id).toBe("draft-1");

  // Keep type-only reference so tree-shaking does not drop the import.
  expect(actualDialogSlice.initDialog).toBeDefined();
});

test("initDialog preserves active controllers for an already running dialog", () => {
  const controller = new AbortController();
  setActiveDialogKey("dialog-user-dialog-a");
  resetDialogRuntimeSessionState("dialog-user-dialog-a");
  addActiveController({
    messageId: "loop:dialog-a",
    controller,
    dialogKey: "dialog-user-dialog-a",
  });

  setActiveDialogKey("dialog-user-dialog-a");
  resetDialogRuntimeSessionState("dialog-user-dialog-a");

  expect(
    getActiveControllers("dialog-user-dialog-a")["loop:dialog-a"]
  ).toBe(controller);
});

test("updateTokens does not pollute the current dialog when target runtime is absent", () => {
  setActiveDialogKey("dialog-user-current");
  resetDialogRuntimeSessionState("dialog-user-current");

  applyUpdateTokensFulfilled({
    dialogKey: "dialog-user-other",
    input_tokens: 5,
    output_tokens: 3,
    cost: 0.2,
  });

  expect(getDialogRuntimeTokens("dialog-user-current")).toEqual({
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
  });
  // Wave13/14: currentDialogKey lives in the module store, not Redux state.
  expect(getActiveDialogKey()).toBe("dialog-user-current");
});

test("selectCurrentDialogTokens reads runtime tokens from the module store", () => {
  setActiveDialogKey("dialog-user-current");
  resetDialogRuntimeSessionState("dialog-user-current");

  tokenUsageLiveUpdate({
    input_tokens: 5,
    output_tokens: 3,
    cost: 0.2,
    dialogKey: "dialog-user-current",
  });

  expect(
    selectCurrentDialogTokens({
      db: {
        ids: [],
        entities: {},
      },
    } as any)
  ).toEqual({
    inputTokens: 5,
    outputTokens: 3,
    totalCost: 0.2,
  });
});

test("updateTokens drains live runtime stats after persistence", () => {
  setActiveDialogKey("dialog-user-current");
  resetDialogRuntimeSessionState("dialog-user-current");

  tokenUsageLiveUpdate({
    input_tokens: 12,
    output_tokens: 8,
    cost: 0.1,
    dialogKey: "dialog-user-current",
  });

  applyUpdateTokensFulfilled({
    dialogKey: "dialog-user-current",
    input_tokens: 12,
    output_tokens: 8,
    cost: 0.1,
  });

  expect(getDialogRuntimeTokens("dialog-user-current")).toEqual({
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
  });
});

test("createPageAndAddReference keeps the reference on the originating dialog", () => {
  setActiveDialogKey("dialog-user-current");
  resetDialogRuntimeSessionState("dialog-user-current");

  addPageReferenceToRuntime({
    reference: {
      id: "file-1",
      name: "report.pdf",
      pageKey: "page-1",
      dialogKey: "dialog-user-origin",
      type: "pdf",
    },
    rawData: null,
    dialogKey: "dialog-user-origin",
  });

  expect(getPendingFiles("dialog-user-origin")).toHaveLength(1);
  expect(getPendingFiles("dialog-user-current")).toHaveLength(0);
});

test("addPendingFile keeps dialog references on the current dialog runtime", () => {
  setActiveDialogKey("dialog-user-current");
  resetDialogRuntimeSessionState("dialog-user-current");

  addPendingFile({
    id: "dialog-ref-1",
    name: "Original Dialog",
    pageKey: "dialog-user-origin",
    dialogKey: "dialog-user-origin",
    sourceDialogKey: "dialog-user-origin",
    type: "dialog",
  });

  expect(getPendingFiles("dialog-user-current")).toHaveLength(1);
  expect(getPendingFiles("dialog-user-current")[0]?.dialogKey).toBe(
    "dialog-user-origin"
  );
  expect(getPendingFiles("dialog-user-origin")).toHaveLength(0);
});

test("addPendingFile can target a runtime explicitly for dialog references", () => {
  addPendingFile({
    id: "dialog-ref-1",
    name: "Original Dialog",
    pageKey: "dialog-user-origin",
    dialogKey: "dialog-user-origin",
    sourceDialogKey: "dialog-user-origin",
    targetDialogKey: "dialog-user-target",
    type: "dialog",
  });

  expect(getPendingFiles("dialog-user-target")).toHaveLength(1);
  expect(getPendingFiles("dialog-user-target")[0]?.dialogKey).toBe(
    "dialog-user-origin"
  );
  expect(getPendingFiles("dialog-user-origin")).toHaveLength(0);
});

test("addPendingFile still accepts legacy runtimeDialogKey payloads", () => {
  addPendingFile({
    id: "dialog-ref-legacy",
    name: "Original Dialog",
    pageKey: "dialog-user-origin",
    dialogKey: "dialog-user-origin",
    runtimeDialogKey: "dialog-user-target",
    type: "dialog",
  });

  expect(getPendingFiles("dialog-user-target")).toHaveLength(1);
});

test("initDialog rejects when the nested db read rejects", async () => {
  const { actualDialogSlice, actualDbSlice } = await loadDialogSliceModule();
  const readMock = mock(() => ({ type: "db/read" }));

  mock.module("database/dbSlice", () => ({
    ...actualDbSlice,
    read: readMock,
  }));

  const { initDialog: initDialogFresh } = await import(
    `./dialogSlice?test=${moduleVersion++}`
  );
  mock.restore();

  const dispatch = mock((action: any) => {
    if (action.type === "db/read") {
      return {
        unwrap: async () => {
          throw new Error("dialog missing");
        },
      };
    }
    return action;
  });

  const result = await initDialogFresh("dialog-user-missing")(
    dispatch as any,
    () =>
      ({
        settings: {
          currentServer: "http://localhost",
          syncServers: [],
        },
      }) as any,
    undefined
  );

  expect(readMock).toHaveBeenCalledTimes(1);
  expect((readMock.mock.calls as any[])[0]?.[0]?.dbKey).toBe(
    "dialog-user-missing"
  );
  expect((readMock.mock.calls as any[])[0]?.[0]?.signal).toBeDefined();
  expect(result.type).toEndWith("/rejected");
  expect(result.error.message).toBe("dialog missing");
  expect(getActiveDialogKey()).toBe("dialog-user-missing");
  expect(getDialogConfigError()).toBe("dialog missing");
});

test("enqueueUserInput supports dialog-scoped and global queuing for in-progress streaming", () => {
  enqueueUserInput({ text: "Follow-up A", dialogKey: "dialog-user-x" });
  enqueueUserInput({ text: "Follow-up B", dialogKey: "dialog-user-x" });
  enqueueUserInput({ text: "Other dialog", dialogKey: "dialog-user-y" });

  expect(
    selectPendingUserInputQueue({} as any, "dialog-user-x")
  ).toEqual(["Follow-up A", "Follow-up B"]);
  expect(
    selectPendingUserInputQueue({} as any, "dialog-user-y")
  ).toEqual(["Other dialog"]);
});

describe("dialogSlice deleteDialog", () => {
  test("deleting a background dialog does not reset the current message list", async () => {
    const dispatched: any[] = [];
    const db = {
      iterator: () => ({
        async *[Symbol.asyncIterator]() {
          yield ["dialog-dialog-b-msg-msg-1", {}];
        },
      }),
      batch: async () => undefined,
    };

    setActiveDialogKey("dialog-user-dialog-a");
    const getState = () =>
      ({
        db: {
          ids: ["dialog-user-dialog-b"],
          entities: {
            "dialog-user-dialog-b": {
              dbKey: "dialog-user-dialog-b",
              id: "dialog-b",
              type: "dialog",
              title: "Background dialog",
              cybots: ["agent-b"],
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          },
        },
        settings: {
          currentServer: null,
          syncServers: [],
        },
      }) as any;

    const dispatch = async (action: any) => {
      dispatched.push(action);
      return { unwrap: async () => undefined };
    };

    const result = await deleteDialog("dialog-user-dialog-b")(
      dispatch as any,
      getState,
      {
        db,
      } as any
    );

    expect(result.type).toEndWith("/fulfilled");
    expect(
      dispatched.some((action) => action?.type === "message/resetMsgs")
    ).toBe(false);
  });

  test("deleting a dialog with attachments deletes explicitly owned file records", async () => {
    const deleteFileActionMock = mock(async () => undefined);
    mock.module("database/actions/deleteFile", () => ({
      deleteFileAction: deleteFileActionMock,
    }));
    const dispatched: any[] = [];
    const targetDialogId = "b";
    const records = new Map<string, any>([
      [
        dialogMessageKey(targetDialogId, "msg-1"),
        {
          id: "msg-1",
          content: [
            {
              type: "image_url",
              image_url: {
                url: "https://nolo.chat/api/v1/db/file/content/file-owned",
              },
            },
          ],
        },
      ],
      [
        "file-owned",
        {
          id: "file-owned",
          dbKey: "file-user-1-file-owned",
          ownerType: "dialog",
          ownerId: targetDialogId,
          size: 1024,
        },
      ],
    ]);
    const db = {
      get: async (key: string) => {
        if (!records.has(key))
          throw Object.assign(new Error("not found"), { notFound: true });
        return records.get(key);
      },
      iterator: ({ gte, lte }: { gte: string; lte: string }) => ({
        async *[Symbol.asyncIterator]() {
          for (const entry of records.entries()) {
            if (entry[0] >= gte && entry[0] <= lte) yield entry;
          }
        },
      }),
      batch: async () => undefined,
    };

    setActiveDialogKey("dialog-user-dialog-a");
    const getState = () =>
      ({
        db: {
          ids: ["dialog-user-dialog-b"],
          entities: {
            "dialog-user-dialog-b": {
              dbKey: "dialog-user-dialog-b",
              id: "dialog-b",
              type: "dialog",
              title: "Background dialog",
              cybots: ["agent-b"],
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          },
        },
        settings: {
          currentServer: null,
          syncServers: [],
        },
      }) as any;

    const dispatch = async (action: any) => {
      dispatched.push(action);
      return { unwrap: async () => undefined };
    };

    const result = await deleteDialog({
      dialogKey: "dialog-user-dialog-b",
      includeAttachments: true,
    })(dispatch as any, getState, { db } as any);

    expect(result.type).toEndWith("/fulfilled");
    expect(deleteFileActionMock).toHaveBeenCalledWith(
      "file-user-1-file-owned",
      expect.anything()
    );
  });
});
