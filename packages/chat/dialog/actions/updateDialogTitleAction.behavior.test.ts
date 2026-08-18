import { describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;

async function loadUpdateDialogTitleAction(options?: {
  currentUserId?: string | null;
}) {
  const runLlmMock = mock((payload: any) => ({
    type: "runLlm/mock",
    payload,
  }));
  const patchMock = mock((payload: any) => ({
    type: "db/patch/mock",
    payload,
  }));
  const selectByIdMock = mock((state: any, dbKey: string) => state.__dialogRecords[dbKey]);
  const selectAllMessagesMock = mock((state: any, dialogId: string) => {
    const bucket =
      state.message.dialogStateById[dialogId] ??
      Object.values(state.message.dialogStateById)[0] as any;
    return Object.values(bucket?.msgs?.entities ?? {});
  });
  const updateContentTitleMock = mock((payload: any) => ({
    type: "space/updateContentTitle/mock",
    payload,
  }));
  const selectCurrentUserIdMock = mock(
    (_state: any) => options?.currentUserId ?? null,
  );

  const mod = await import(`./updateDialogTitleAction`);
  return {
    updateDialogTitleAction: (args: any, thunkApi: any) =>
      mod.updateDialogTitleActionWithDeps(args, thunkApi, {
        runLlmAction: runLlmMock,
        patchAction: patchMock,
        selectDialogById: selectByIdMock,
        selectAllMessages: selectAllMessagesMock,
        updateSpaceContentTitle: updateContentTitleMock,
        selectCurrentUserId: selectCurrentUserIdMock,
      }),
    runLlmMock,
    patchMock,
    selectByIdMock,
    selectAllMessagesMock,
    updateContentTitleMock,
    selectCurrentUserIdMock,
  };
}

describe("updateDialogTitleAction behavior", () => {
  it("skips platform title LLM for logged-out local agent and persists fallback title", async () => {
    const {
      updateDialogTitleAction,
      runLlmMock,
      patchMock,
    } = await loadUpdateDialogTitleAction({ currentUserId: null });

    const dialogKey = "dialog-local-01LOCALTITLE000000000001";
    const dialogId = "01LOCALTITLE000000000001";
    const state = {
      __dialogRecords: {
        [dialogKey]: {
          dbKey: dialogKey,
          userId: "local",
          createdAt: "2026-03-20T05:40:00.000Z",
          updatedAt: "2026-03-20T05:40:00.000Z",
        },
      },
      message: {
        currentDialogId: null,
        dialogStateById: {
          [dialogId]: {
            msgs: {
              ids: ["m1", "m2"],
              entities: {
                m1: {
                  id: "m1",
                  role: "user",
                  content: "本地 Token Plan 首轮问题",
                },
                m2: {
                  id: "m2",
                  role: "assistant",
                  content: "本地回复内容",
                },
              },
            },
            firstStreamProcessed: false,
            isLoadingInitial: false,
            isLoadingOlder: false,
            hasMoreOlder: true,
            error: null,
            lastStreamTimestamp: 0,
          },
        },
      },
    };

    const dispatch = (action: any) => {
      switch (action?.type) {
        case "runLlm/mock":
          throw new Error("platform title LLM must not run while logged out");
        case "db/patch/mock":
          return {
            unwrap: async () => ({
              ...state.__dialogRecords[dialogKey],
              ...action.payload.changes,
            }),
          };
        case "space/updateContentTitle/mock":
          return action;
        default:
          throw new Error(`Unexpected action: ${JSON.stringify(action)}`);
      }
    };

    const result = await updateDialogTitleAction(
      {
        dialogKey,
        agentConfig: {
          userId: "local",
          credentialRef: "api-key:agent-local-1",
          useServerProxy: false,
        },
      },
      { dispatch, getState: () => state }
    );

    expect(runLlmMock).toHaveBeenCalledTimes(0);
    expect(patchMock.mock.calls).toEqual([
      [
        {
          dbKey: dialogKey,
          changes: {
            title: "本地 Token Plan 首轮问题",
          },
        },
      ],
    ]);
    expect(result).toEqual(
      expect.objectContaining({
        title: "本地 Token Plan 首轮问题",
      })
    );
  });

  it("uses DeepSeek title generation output and persists the normalized title", async () => {
    const {
      updateDialogTitleAction,
      runLlmMock,
      patchMock,
      updateContentTitleMock,
    } = await loadUpdateDialogTitleAction({ currentUserId: "user-1" });

    const dialogKey = "dialog-user-01DIALOGTITLE000000000001";
    const dialogId = "01DIALOGTITLE000000000001";
    const state = {
      __dialogRecords: {
        [dialogKey]: {
          dbKey: dialogKey,
          createdAt: "2026-03-20T05:40:00.000Z",
          updatedAt: "2026-03-20T05:55:00.000Z",
          spaceId: "space-01SPACEA",
        },
      },
      message: {
        currentDialogId: null,
        dialogStateById: {
          [dialogId]: {
            msgs: {
              ids: ["m1", "m2", "m3", "m4"],
              entities: {
                m1: {
                  id: "m1",
                  role: "user",
                  content: "我想比较 AI 邮件助手的方案取舍",
                },
                m2: {
                  id: "m2",
                  role: "assistant",
                  content: "可以先比较送达率、价格和维护成本。",
                },
                m3: {
                  id: "m3",
                  role: "tool",
                  content: "{\"kind\":\"pricing\"}",
                },
                m4: {
                  id: "m4",
                  role: "assistant",
                  content: "",
                  tool_calls: [{ id: "call-1", type: "function" }],
                },
              },
            },
            firstStreamProcessed: false,
            isLoadingInitial: false,
            isLoadingOlder: false,
            hasMoreOlder: true,
            error: null,
            lastStreamTimestamp: 0,
          },
        },
      },
    };

    const dispatch = (action: any) => {
      switch (action?.type) {
        case "runLlm/mock":
          return {
            unwrap: async () => '  "AI 邮件助手取舍"\n再来一行  ',
          };
        case "db/patch/mock":
          return {
            unwrap: async () => ({
              ...state.__dialogRecords[dialogKey],
              ...action.payload.changes,
            }),
          };
        case "space/updateContentTitle/mock":
          return action;
        default:
          throw new Error(`Unexpected action: ${JSON.stringify(action)}`);
      }
    };

    const result = await updateDialogTitleAction(
      { dialogKey },
      { dispatch, getState: () => state }
    );

    expect(runLlmMock).toHaveBeenCalledTimes(1);
    const runLlmPayload = runLlmMock.mock.calls[0]?.[0];
    expect(runLlmPayload).toEqual(
      expect.objectContaining({
        billingDialogKey: dialogKey,
        llmConfig: expect.objectContaining({
          provider: "nolo",
          model: "deepseek-v4-flash",
        }),
      })
    );
    expect(JSON.parse(runLlmPayload.content)).toEqual([
      { role: "user", content: "我想比较 AI 邮件助手的方案取舍" },
      { role: "assistant", content: "可以先比较送达率、价格和维护成本。" },
    ]);

    expect(updateContentTitleMock.mock.calls).toEqual([
      [
        {
          spaceId: "01SPACEA",
          contentKey: dialogKey,
          title: "AI 邮件助手取舍",
        },
      ],
    ]);
    expect(patchMock.mock.calls).toEqual([
      [
        {
          dbKey: dialogKey,
          changes: {
            title: "AI 邮件助手取舍",
          },
        },
      ],
    ]);
    expect(result).toEqual(
      expect.objectContaining({
        title: "AI 邮件助手取舍",
      })
    );
  });
});
