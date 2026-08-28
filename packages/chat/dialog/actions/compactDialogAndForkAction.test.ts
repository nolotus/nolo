import { describe, expect, it, mock } from "bun:test";
import { extractCustomId } from "core/prefix";

let moduleVersion = 0;

const createBucket = (messages: Array<Record<string, unknown>>) => ({
  msgs: {
    ids: messages.map((message) => message.id as string),
    entities: Object.fromEntries(
      messages.map((message) => [message.id as string, message])
    ),
  },
  firstStreamProcessed: false,
  isLoadingInitial: false,
  isLoadingOlder: false,
  hasMoreOlder: false,
  error: null,
  lastStreamTimestamp: 0,
});

const createState = ({
  dialogKey,
  dialogConfig,
  messages,
}: {
  dialogKey: string;
  dialogConfig: Record<string, unknown>;
  messages: Array<Record<string, unknown>>;
}) => {
  // Must match compactDialogAndForkAction: extractCustomId takes the last segment
  // (e.g. "dialog-user-old-1" → "1"), not a prefix-stripped dialogKey.
  const dialogId = extractCustomId(dialogKey);
  const messageBucket = createBucket(messages);

  const dialogState = {
    currentDialogKey: dialogKey,
  } as Record<string, unknown>;

  Object.defineProperty(dialogState, "currentDialogConfig", {
    get() {
      throw new Error("Test accessed state.dialog.currentDialogConfig instead of db selector");
    },
    enumerable: false,
  });

  return {
    dialog: dialogState,
    db: {
      ids: [dialogKey],
      entities: {
        [dialogKey]: dialogConfig,
      },
    },
    message: {
      dialogStateById: {
        [dialogId]: messageBucket,
      },
    },
  };
};

async function loadCompactDialogAndForkAction() {
  const actualDialogSlice = await import("../dialogSlice");
  const actualUpdateDialogSummaryAction = await import("./updateDialogSummaryAction");

  const createDialogMock = mock((payload: any) => ({
    type: "chat/dialog/createDialog/mock",
    payload,
  }));
  const updateDialogSummaryActionMock = mock(async () => undefined);

  mock.module("../dialogSlice", () => ({
    ...actualDialogSlice,
    createDialog: createDialogMock,
  }));
  mock.module("./updateDialogSummaryAction", () => ({
    ...actualUpdateDialogSummaryAction,
    updateDialogSummaryAction: updateDialogSummaryActionMock,
  }));
  mock.module("database/dbSlice", () => ({
    selectById: (state: any, id: string) => state.db.entities[id],
  }));

  const mod = await import(`./compactDialogAndForkAction`);
  mock.restore();

  return {
    runCompactDialogAndForkAction: mod.runCompactDialogAndForkAction,
    createDialogMock,
    updateDialogSummaryActionMock,
  };
}

describe("compactDialogAndForkAction", () => {
  it("refreshes summary, forks the dialog, and skips greeting", async () => {
    const { runCompactDialogAndForkAction, createDialogMock, updateDialogSummaryActionMock } =
      await loadCompactDialogAndForkAction();
    const dispatch = mock();
    const getState = () =>
      createState({
        dialogKey: "dialog-user-old-1",
        dialogConfig: {
          dbKey: "dialog-user-old-1",
          cybots: ["agent-1"],
          category: "test-dialogs",
          spaceId: "space-1",
        },
        messages: [
          { id: "m1", role: "user", content: "hello" },
          { id: "m2", role: "assistant", content: "world" },
        ],
      });

    dispatch.mockImplementation((action: any) => {
      if (action?.type === "chat/dialog/createDialog/mock") {
        return {
          unwrap: async () => ({ dbKey: "dialog-user-new-1", spaceId: "space-1" }),
        };
      }

      throw new Error(`Unexpected dispatch: ${String(action?.type ?? action)}`);
    });

    const result = await runCompactDialogAndForkAction(
      { dialogKey: "dialog-user-old-1" },
      { dispatch, getState }
    );

    expect(updateDialogSummaryActionMock).toHaveBeenCalledWith({
      dialogKey: "dialog-user-old-1",
      force: true,
      preFetchedMessages: [
        { id: "m1", role: "user", content: "hello" },
        { id: "m2", role: "assistant", content: "world" },
      ],
      reason: "manual",
    }, { dispatch, getState });
    expect(createDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cybots: ["agent-1"],
        category: "test-dialogs",
        spaceId: "space-1",
        inheritFromDialogKey: "dialog-user-old-1",
        skipGreeting: true,
      })
    );
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: expect.stringContaining("createDialog"),
        payload: expect.objectContaining({
          cybots: ["agent-1"],
          category: "test-dialogs",
          spaceId: "space-1",
          inheritFromDialogKey: "dialog-user-old-1",
          skipGreeting: true,
        }),
      })
    );
    expect(result.dbKey).toBe("dialog-user-new-1");
  });

  it("allows a short dialog to fork even when summary is a no-op", async () => {
    const { runCompactDialogAndForkAction, createDialogMock, updateDialogSummaryActionMock } =
      await loadCompactDialogAndForkAction();
    const dispatch = mock();
    const getState = () =>
      createState({
        dialogKey: "dialog-user-short-1",
        dialogConfig: {
          dbKey: "dialog-user-short-1",
          cybots: ["agent-2"],
          category: "test-dialogs",
          spaceId: "space-2",
        },
        messages: [{ id: "m1", role: "user", content: "hello" }],
      });

    dispatch.mockImplementation((action: any) => {
      if (action?.type === "chat/dialog/createDialog/mock") {
        return {
          unwrap: async () => ({ dbKey: "dialog-user-new-short-1", spaceId: "space-2" }),
        };
      }

      throw new Error(`Unexpected dispatch: ${String(action?.type ?? action)}`);
    });

    const result = await runCompactDialogAndForkAction(
      { dialogKey: "dialog-user-short-1" },
      { dispatch, getState }
    );

    expect(updateDialogSummaryActionMock).toHaveBeenCalledWith({
      dialogKey: "dialog-user-short-1",
      force: true,
      preFetchedMessages: [{ id: "m1", role: "user", content: "hello" }],
      reason: "manual",
    }, { dispatch, getState });
    expect(createDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        cybots: ["agent-2"],
        inheritFromDialogKey: "dialog-user-short-1",
        skipGreeting: true,
      })
    );
    expect(result).toEqual(
      expect.objectContaining({ dbKey: "dialog-user-new-short-1", spaceId: "space-2" })
    );
  });

  it("throws when the current dialog has no primary agent", async () => {
    const { runCompactDialogAndForkAction } = await loadCompactDialogAndForkAction();
    const dispatch = mock();
    const getState = () =>
      createState({
        dialogKey: "dialog-user-empty-1",
        dialogConfig: {
          dbKey: "dialog-user-empty-1",
          cybots: [],
          category: "test-dialogs",
          spaceId: "space-3",
        },
        messages: [],
      });

    await expect(
      runCompactDialogAndForkAction({ dialogKey: "dialog-user-empty-1" }, { dispatch, getState })
    ).rejects.toThrow("Cannot compact a dialog without a primary agent.");
    expect(dispatch).not.toHaveBeenCalled();
  });
});
