import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import {
  resetDialogRuntimeStoreForTests,
  setActiveDialogKey,
} from "../dialogRuntimeStore";
import { fileURLToPath } from "node:url";
const realMessageSlice = await import("chat/messages/messageSlice");
const realDbSlice = await import("database/dbSlice");

const prepareAndPersistUserMessageMock = mock((payload: any): any => ({
  kind: "prepareAndPersistUserMessage",
  payload,
}));
const messageStreamEndMock = mock((payload: any): any => ({
  kind: "messageStreamEnd",
  payload,
}));
const streamAgentChatTurnMock = mock((payload: any): any => ({
  kind: "streamAgentChatTurn",
  payload,
}));
const selectByIdMock = mock((): any => null);
const readAndWaitMock = mock((dbKey: string): any => ({
  kind: "readAndWait",
  dbKey,
}));
const buildPersonalizationRuntimeOptionsMock = mock((runtimeOptions?: any): any => ({
  ...runtimeOptions,
  extraTools: ["ask_user", "updateUserPreferenceProfile"],
}));

let moduleVersion = 0;
const dbSlicePath = fileURLToPath(
  new URL("../../../database/dbSlice.ts", import.meta.url)
);

const loadHandleSendMessageAction = async () => {
  mock.module("chat/messages/messageSlice", () => ({
    ...realMessageSlice,
    prepareAndPersistUserMessage: prepareAndPersistUserMessageMock,
    messageStreamEnd: messageStreamEndMock,
  }));
  mock.module("ai/agent/agentSlice", () => ({
    streamAgentChatTurn: streamAgentChatTurnMock,
  }));
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    selectById: selectByIdMock,
    readAndWait: readAndWaitMock,
  }));
  mock.module(dbSlicePath, () => ({
    ...realDbSlice,
    selectById: selectByIdMock,
    readAndWait: readAndWaitMock,
  }));
  mock.module("ai/policy/personalizationDialog", () => ({
    PERSONALIZATION_DIALOG_CATEGORY: "user-overlay-profile",
    buildPersonalizationRuntimeOptions: buildPersonalizationRuntimeOptionsMock,
  }));

  const module = await import(`./handleSendMessageAction.ts?test=${moduleVersion++}`);
  mock.restore();
  return module.handleSendMessageAction;
};

describe("handleSendMessageAction", () => {
  beforeEach(() => {
    resetDialogRuntimeStoreForTests();
  });
  afterEach(() => {
    resetDialogRuntimeStoreForTests();
  });

  it("rehydrates the current dialog config before failing when Redux is missing it", async () => {
    const handleSendMessageAction = await loadHandleSendMessageAction();
    prepareAndPersistUserMessageMock.mockClear();
    streamAgentChatTurnMock.mockClear();
    selectByIdMock.mockClear();
    readAndWaitMock.mockClear();

    const dialogConfig = {
      dbKey: "dialog-1",
      id: "1",
      cybots: ["agent-1"],
    };

    const dispatch = mock((action: any) => {
      if (action.kind === "readAndWait") {
        expect(action.dbKey).toBe("dialog-1");
        return { unwrap: async () => dialogConfig };
      }

      if (action.kind === "prepareAndPersistUserMessage") {
        expect(action.payload.dialogConfig).toEqual(dialogConfig);
        return { unwrap: async () => ({}) };
      }

      if (action.kind === "streamAgentChatTurn") {
        expect(action.payload.agentKey).toBe("agent-1");
        return { unwrap: async () => ({}) };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const rejectWithValue = mock((value: unknown) => value);

        setActiveDialogKey("dialog-1");
const result = await handleSendMessageAction(
      { userInput: "hello" },
      {
        dispatch,
        getState: () =>
          ({
            dialog: {},
          }) as any,
        rejectWithValue,
      }
    );

    expect(result).toBeUndefined();
    expect(readAndWaitMock).toHaveBeenCalledTimes(1);
    expect(prepareAndPersistUserMessageMock).toHaveBeenCalledTimes(1);
    expect(streamAgentChatTurnMock).toHaveBeenCalledTimes(1);
    expect(rejectWithValue).not.toHaveBeenCalled();
  });

  it("rehydrates an incomplete dialog config before choosing the default agent", async () => {
    const handleSendMessageAction = await loadHandleSendMessageAction();
    prepareAndPersistUserMessageMock.mockClear();
    streamAgentChatTurnMock.mockClear();
    selectByIdMock.mockClear();
    readAndWaitMock.mockClear();

    const incompleteDialogConfig = {
      dbKey: "dialog-1",
      id: "1",
      cybots: [],
    };
    const hydratedDialogConfig = {
      dbKey: "dialog-1",
      id: "1",
      cybots: ["agent-machine"],
    };

    selectByIdMock.mockReturnValue(incompleteDialogConfig);

    const dispatch = mock((action: any) => {
      if (action.kind === "readAndWait") {
        expect(action.dbKey).toBe("dialog-1");
        return { unwrap: async () => hydratedDialogConfig };
      }

      if (action.kind === "prepareAndPersistUserMessage") {
        expect(action.payload.dialogConfig).toEqual(hydratedDialogConfig);
        return { unwrap: async () => ({}) };
      }

      if (action.kind === "streamAgentChatTurn") {
        expect(action.payload.agentKey).toBe("agent-machine");
        expect(action.payload.dialogKey).toBe("dialog-1");
        return { unwrap: async () => ({}) };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const rejectWithValue = mock((value: unknown) => value);

        setActiveDialogKey("dialog-1");
const result = await handleSendMessageAction(
      { userInput: "hello" },
      {
        dispatch,
        getState: () =>
          ({
            dialog: {},
          }) as any,
        rejectWithValue,
      }
    );

    expect(result).toBeUndefined();
    expect(readAndWaitMock).toHaveBeenCalledTimes(1);
    expect(prepareAndPersistUserMessageMock).toHaveBeenCalledTimes(1);
    expect(streamAgentChatTurnMock).toHaveBeenCalledTimes(1);
    expect(rejectWithValue).not.toHaveBeenCalled();
  });

  it("injects personalization runtime tools for user-overlay-profile dialogs", async () => {
    const handleSendMessageAction = await loadHandleSendMessageAction();
    prepareAndPersistUserMessageMock.mockClear();
    streamAgentChatTurnMock.mockClear();
    buildPersonalizationRuntimeOptionsMock.mockClear();
    selectByIdMock.mockClear();

    const dialogConfig = {
      dbKey: "dialog-2",
      id: "2",
      cybots: ["agent-2"],
      category: "user-overlay-profile",
    };

    selectByIdMock.mockReturnValue(dialogConfig);

    const dispatch = mock((action: any) => {
      if (action.kind === "prepareAndPersistUserMessage") {
        return { unwrap: async () => ({}) };
      }

      if (action.kind === "streamAgentChatTurn") {
        expect(action.payload.runtimeOptions).toEqual({
          extraTools: ["ask_user", "updateUserPreferenceProfile"],
        });
        return { unwrap: async () => ({}) };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const rejectWithValue = mock((value: unknown) => value);

        setActiveDialogKey("dialog-2");
const result = await handleSendMessageAction(
      { userInput: "hello", dialogKey: "dialog-2" },
      {
        dispatch,
        getState: () => ({ dialog: {} }) as any,
        rejectWithValue,
      }
    );

    expect(result).toBeUndefined();
    expect(buildPersonalizationRuntimeOptionsMock).toHaveBeenCalledTimes(1);
    expect(streamAgentChatTurnMock).toHaveBeenCalledTimes(1);
    expect(rejectWithValue).not.toHaveBeenCalled();
  });

  it("finalizes a visible quick-chat error when the agent stream aborts after the user message is saved", async () => {
    const handleSendMessageAction = await loadHandleSendMessageAction();
    prepareAndPersistUserMessageMock.mockClear();
    streamAgentChatTurnMock.mockClear();
    messageStreamEndMock.mockClear();
    selectByIdMock.mockClear();

    const dialogConfig = {
      dbKey: "dialog-user1-dialog1",
      id: "dialog1",
      cybots: ["agent-quick"],
    };

    selectByIdMock.mockReturnValue(dialogConfig);

    const dispatch = mock((action: any) => {
      if (action.kind === "prepareAndPersistUserMessage") {
        return { unwrap: async () => ({}) };
      }

      if (action.kind === "streamAgentChatTurn") {
        return { unwrap: async () => undefined };
      }

      if (action.kind === "messageStreamEnd") {
        return { unwrap: async () => ({}) };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const rejectWithValue = mock((value: unknown) => value);

        setActiveDialogKey("dialog-user1-dialog1");
const result = await handleSendMessageAction(
      {
        userInput: "hello",
        dialogKey: "dialog-user1-dialog1",
        quickChatPerfStartedAt: 123,
      },
      {
        dispatch,
        getState: () => ({ dialog: {} }) as any,
        rejectWithValue,
      }
    );

    expect(result).toBeUndefined();
    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
    expect(messageStreamEndMock.mock.calls[0]?.[0]).toMatchObject({
      dialogId: "dialog1",
      dialogKey: "dialog-user1-dialog1",
      agentConfig: {
        dbKey: "agent-quick",
      },
      finalContentBuffer: [
        {
          type: "text",
          text: expect.stringContaining("未能启动"),
        },
      ],
    });
    expect(rejectWithValue).not.toHaveBeenCalled();
  });

  it("does not write the startup-failure message when the turn was aborted", async () => {
    // abort(用户取消/竞态取消)返回 { aborted: true },不是「启动失败」:
    // 绝不能写「未能启动模型回复」错误文案。
    const handleSendMessageAction = await loadHandleSendMessageAction();
    prepareAndPersistUserMessageMock.mockClear();
    streamAgentChatTurnMock.mockClear();
    messageStreamEndMock.mockClear();
    selectByIdMock.mockClear();

    const dialogConfig = {
      dbKey: "dialog-user1-dialog1",
      id: "dialog1",
      cybots: ["agent-quick"],
    };

    selectByIdMock.mockReturnValue(dialogConfig);

    const dispatch = mock((action: any) => {
      if (action.kind === "prepareAndPersistUserMessage") {
        return { unwrap: async () => ({}) };
      }

      if (action.kind === "streamAgentChatTurn") {
        return { unwrap: async () => ({ aborted: true }) };
      }

      if (action.kind === "messageStreamEnd") {
        return { unwrap: async () => ({}) };
      }

      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const rejectWithValue = mock((value: unknown) => value);

        setActiveDialogKey("dialog-user1-dialog1");
const result = await handleSendMessageAction(
      {
        userInput: "hello",
        dialogKey: "dialog-user1-dialog1",
        quickChatPerfStartedAt: 123,
      },
      {
        dispatch,
        getState: () => ({ dialog: {} }) as any,
        rejectWithValue,
      }
    );

    expect(result).toBeUndefined();
    expect(messageStreamEndMock).not.toHaveBeenCalled();
    expect(rejectWithValue).not.toHaveBeenCalled();
  });

  it("exposes no Redux-level deduplication: two concurrent dispatches create two user messages and two streamAgentChatTurn calls", async () => {
    const handleSendMessageAction = await loadHandleSendMessageAction();
    prepareAndPersistUserMessageMock.mockClear();
    streamAgentChatTurnMock.mockClear();
    selectByIdMock.mockClear();
    readAndWaitMock.mockClear();
    messageStreamEndMock.mockClear();

    setActiveDialogKey("dialog-user1-dialog1");
    const dialogConfig = {
      dbKey: "dialog-user1-dialog1",
      id: "dialog1",
      cybots: ["agent-1"],
    };
    selectByIdMock.mockReturnValue(dialogConfig);

    // Track dispatch order
    const dispatchedKinds: string[] = [];

    // streamAgentChatTurn must stay pending while both
    // handleSendMessageAction instances run, otherwise the first
    // one resolves and its side effects mask the second.
    const { promise: streamGate, resolve: releaseStream } =
      Promise.withResolvers<void>();

    streamAgentChatTurnMock.mockImplementation(() => {
      dispatchedKinds.push("streamAgentChatTurn");
      return {
        unwrap: async () => {
          await streamGate;
          return {};
        },
      };
    });

    const realPrepareAndPersist = prepareAndPersistUserMessageMock;
    realPrepareAndPersist.mockImplementation((payload: unknown) => {
      dispatchedKinds.push("prepareAndPersistUserMessage");
      return { unwrap: async () => ({}) };
    });

    const dispatch = mock(((action: { type?: string; kind?: string; payload?: unknown }) => {
      // Thunk-style (from mocks)
      if (action.kind === "readAndWait") {
        return { unwrap: async () => dialogConfig };
      }
      if (action.kind === "prepareAndPersistUserMessage") {
        return realPrepareAndPersist(action.payload);
      }
      if (action.kind === "streamAgentChatTurn") {
        return streamAgentChatTurnMock(action.payload);
      }
      // Plain RTK actions dispatched internally by prepareAndPersistMessage
      // (addUserMessage, write, addReferenceKeysAction, etc.)
      // These are reducer actions — just pass through.
      return action;
    }) as any);

    const rejectWithValue = mock((value: unknown) => value);
    const getState = () =>
      ({ dialog: {} }) as unknown as ReturnType<() => unknown>;

    // Fire two concurrent dispatches — DON'T await them yet, they'll
    const promise1 = handleSendMessageAction(
      { userInput: "hello" },
      { dispatch, getState, rejectWithValue },
    );
    const promise2 = handleSendMessageAction(
      { userInput: "hello" },
      { dispatch, getState, rejectWithValue },
    );

    // Give both microtasks a chance to reach streamAgentChatTurn
    await Promise.resolve();
    await Promise.resolve();

    // Both should have reached the streamAgentChatTurn dispatch by now
    expect(dispatchedKinds.filter((k) => k === "prepareAndPersistUserMessage")).toHaveLength(2);
    expect(dispatchedKinds.filter((k) => k === "streamAgentChatTurn")).toHaveLength(2);

    // Release gate so both streamAgentChatTurn calls resolve
    releaseStream();

    const [result1, result2] = await Promise.all([promise1, promise2]);
    expect(result1).toBeUndefined();
    expect(result2).toBeUndefined();
    expect(rejectWithValue).not.toHaveBeenCalled();
  });

  it("writes the failure into the dialog stream and marks it as error-in-dialog", async () => {
    // 前面的并发测试用 mockImplementation 污染了 streamAgentChatTurnMock，
    // 这里必须重置为默认实现，否则 dispatch 收到的返回值不是 {kind, payload}。
    streamAgentChatTurnMock.mockImplementation((payload: any) => ({
      kind: "streamAgentChatTurn",
      payload,
    }));
    const handleSendMessageAction = await loadHandleSendMessageAction();
    prepareAndPersistUserMessageMock.mockClear();
    streamAgentChatTurnMock.mockClear();
    messageStreamEndMock.mockClear();
    selectByIdMock.mockClear();
    readAndWaitMock.mockClear();

    const dialogConfig = {
      dbKey: "dialog-err",
      id: "err",
      cybots: ["agent-err"],
    };
    selectByIdMock.mockReturnValue(dialogConfig);

    const dispatch = mock((action: any) => {
      if (action.kind === "readAndWait") {
        return { unwrap: async () => dialogConfig };
      }
      if (action.kind === "prepareAndPersistUserMessage") {
        return { unwrap: async () => ({}) };
      }
      if (action.kind === "streamAgentChatTurn") {
        const err = new Error(
          'local Antigravity OAuth provider failed: HTTP 403 {"error":{"code":403,"message":"Verify your account to continue.","details":[{"url":"https://accounts.google.com/signin/continue?sarp=1"}]}}'
        );
        return { unwrap: async () => { throw err; } };
      }
      if (action.kind === "messageStreamEnd") {
        return { unwrap: async () => ({}) };
      }
      // Plain RTK reducer actions dispatched internally — pass through.
      return action;
    });

    const rejectWithValue = mock((value: unknown) => value);
    setActiveDialogKey("dialog-err");

    const result = await handleSendMessageAction(
      { userInput: "hello" },
      {
        dispatch,
        getState: () => ({ dialog: {} }) as any,
        rejectWithValue,
      }
    );

    // 返回带 __errorInDialog 标记的对象，上层据此跳过 toast
    expect(result).toEqual({
      __errorInDialog: true,
      message: expect.stringContaining("Antigravity OAuth provider failed"),
    });

    // 错误已作为 assistant 消息写入对话流（messageStreamEnd）
    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
    const endPayload = messageStreamEndMock.mock.calls[0][0];
    expect(endPayload.agentConfig.dbKey).toBe("agent-err");
    expect(endPayload.finalContentBuffer[0].type).toBe("text");
    expect(endPayload.finalContentBuffer[0].text).toContain("[发送失败]");
    // 验证链接被提取成 markdown 可点击链接
    expect(endPayload.finalContentBuffer[0].text).toContain(
      "https://accounts.google.com/signin/continue?sarp=1"
    );
  });

  it("does not write into the dialog when there is no agent to run", async () => {
    const handleSendMessageAction = await loadHandleSendMessageAction();
    prepareAndPersistUserMessageMock.mockClear();
    streamAgentChatTurnMock.mockClear();
    messageStreamEndMock.mockClear();
    selectByIdMock.mockClear();
    readAndWaitMock.mockClear();

    const dialogConfig = {
      dbKey: "dialog-noagent",
      id: "noagent",
      cybots: [],
    };
    selectByIdMock.mockReturnValue(dialogConfig);

    const dispatch = mock((action: any) => {
      if (action.kind === "readAndWait") {
        return { unwrap: async () => dialogConfig };
      }
      if (action.kind === "prepareAndPersistUserMessage") {
        return { unwrap: async () => ({}) };
      }
      // Plain RTK reducer actions dispatched internally — pass through.
      return action;
    });

    const rejectWithValue = mock((value: unknown) => value);
    setActiveDialogKey("dialog-noagent");

    const result = await handleSendMessageAction(
      { userInput: "hello" },
      {
        dispatch,
        getState: () => ({ dialog: {} }) as any,
        rejectWithValue,
      }
    );

    // 没有 agent 时提前 return，不写错误消息也不 reject
    expect(result).toBeUndefined();
    expect(messageStreamEndMock).not.toHaveBeenCalled();
    expect(rejectWithValue).not.toHaveBeenCalled();
  });
});
