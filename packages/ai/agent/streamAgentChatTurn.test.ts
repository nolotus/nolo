import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import * as realSettingSliceNs from "../../app/settings/settingSlice";

// Value-copy snapshots — Bun mock.restore() does not clear mock.module.
const realAuthSlice = { ...(await import("auth/authSlice")) };
const realDbSlice = { ...(await import("database/dbSlice")) };
const realEnv = { ...(await import("app/utils/env")) };
const realDialogSlice = { ...(await import("chat/dialog/dialogSlice")) };
const realMessageSlice = { ...(await import("chat/messages/messageSlice")) };
const realSettingSlice = { ...realSettingSliceNs };
// 这些同样是粘性 mock，漏还原会打红后续 suite 文件里真实调用它们的测试
// （streamAgentChatTurnUtils 的 retention 测试就这么红过）。
const realChatTurnUtils = { ...(await import("./streamAgentChatTurnUtils")) };
const realReferenceUtils = { ...(await import("./referenceUtils")) };
const realCleanAgentMessages = { ...(await import("./cleanAgentMessages")) };
const realGetFullChatContextKeys = { ...(await import("ai/agent/getFullChatContextKeys")) };
const realGenerateRequestBody = { ...(await import("ai/llm/generateRequestBody")) };
const realIsResponseAPIModel = { ...(await import("ai/llm/isResponseAPIModel")) };
const realGetModelContextWindow = { ...(await import("ai/llm/getModelContextWindow")) };
const realSlateUtils = { ...(await import("create/editor/utils/slateUtils")) };
const realSendCompletions = { ...(await import("../chat/sendOpenAICompletionsRequest")) };
const realSendResponses = { ...(await import("../chat/sendOpenAIResponseRequest")) };

const restoreLeakedModuleMocks = () => {
  mock.module("auth/authSlice", () => realAuthSlice);
  mock.module("database/dbSlice", () => realDbSlice);
  mock.module("app/utils/env", () => realEnv);
  mock.module("chat/dialog/dialogSlice", () => realDialogSlice);
  mock.module("chat/messages/messageSlice", () => realMessageSlice);
  mock.module("app/settings/settingSlice", () => realSettingSlice);
  mock.module("./streamAgentChatTurnUtils", () => realChatTurnUtils);
  mock.module("./referenceUtils", () => realReferenceUtils);
  mock.module("./cleanAgentMessages", () => realCleanAgentMessages);
  mock.module("ai/agent/getFullChatContextKeys", () => realGetFullChatContextKeys);
  mock.module("ai/llm/generateRequestBody", () => realGenerateRequestBody);
  mock.module("ai/llm/isResponseAPIModel", () => realIsResponseAPIModel);
  mock.module("ai/llm/getModelContextWindow", () => realGetModelContextWindow);
  mock.module("create/editor/utils/slateUtils", () => realSlateUtils);
  mock.module("../chat/sendOpenAICompletionsRequest", () => realSendCompletions);
  mock.module("../chat/sendOpenAIResponseRequest", () => realSendResponses);
};

const selectCurrentDialogConfigMock = mock();
const selectDialogConfigByKeyMock = mock();
const selectPendingUserInputQueueMock = mock();
const selectByIdMock = mock((): any => null);
const selectAllMsgsMock = mock(() => []);
const addUserMessageMock = mock((message: any) => ({
  type: "message/addUserMessage",
  payload: message,
}));
const removeTransientMessageMock = mock((messageId: string) => ({
  type: "message/removeTransientMessage",
  payload: messageId,
}));
const writeMock = mock((payload: any) => ({
  type: "db/write",
  payload,
}));
const prepareAndPersistUserMessageMock = mock((payload: any) => ({
  kind: "prepareAndPersistUserMessage",
  payload,
}));
const generateRequestBodyMock = mock((..._args: any[]): any => ({}));
const sendOpenAICompletionsRequestMock = mock(async (): Promise<any> => ({
  hasHandedOff: false,
  hasPendingInteraction: false,
  hasToolCalls: true,
  messageId: "msg-stream-1",
}));
const sendOpenAIResponseRequestMock = mock(async (): Promise<any> => ({
  hasHandedOff: false,
  hasPendingInteraction: false,
  hasToolCalls: true,
  messageId: "msg-stream-1",
}));
const validateAccessAndBalanceMock = mock(() => null as string | null);
const clearPendingUserInputQueueMock = mock(() => ({
  type: "dialog/clearPendingUserInputQueue",
}));
const dequeueUserInputMock = mock(() => ({
  type: "dialog/dequeueUserInput",
}));
const addActiveControllerMock = mock((payload: any) => ({
  type: "dialog/addActiveController",
  payload,
}));
const removeActiveControllerMock = mock((payload: any) => ({
  type: "dialog/removeActiveController",
  payload,
}));
const createCliChatTurnStreamMock = mock();
const startCliChatSessionMock = mock();
const getCliChatSessionMock = mock();
const runDesktopAgentRuntimeTurnMock = mock();

let desktopStreamEventsOverride: unknown[] | null = null;
const patchMock = mock((payload: any) => ({
  type: "db/patch",
  payload,
}));
const messageStreamEndMock = mock((payload: any) => ({
  kind: "messageStreamEnd",
  payload,
}));

const originalNoloDesktopEnv = process.env.NOLO_DESKTOP;
let moduleVersion = 0;

function setupModuleMocks() {
  const setup = async () => {
    const actualChatTurnUtils = await import("./streamAgentChatTurnUtils");
    const actualReferenceUtils = await import("./referenceUtils");
    const actualPrefix = await import(
      new URL(`../../core/prefix.ts?actual=${moduleVersion}`, import.meta.url).href
    );

  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    read: (payload: any) => ({ kind: "read", payload }),
    readAndWait: (dbKey: string) => ({ kind: "readAndWait", dbKey }),
    selectById: selectByIdMock,
    write: writeMock,
    patch: patchMock,
  }));

  mock.module("chat/dialog/dialogSlice", () => ({
    ...realDialogSlice,
    selectCurrentDialogConfig: selectCurrentDialogConfigMock,
    selectDialogConfigByKey: selectDialogConfigByKeyMock,
    addActiveController: addActiveControllerMock,
    removeActiveController: removeActiveControllerMock,
    selectPendingUserInputQueue: selectPendingUserInputQueueMock,
    dequeueUserInput: dequeueUserInputMock,
    clearPendingUserInputQueue: clearPendingUserInputQueueMock,
    selectActiveControllers: () => ({}),
  }));

  mock.module("chat/messages/messageSlice", () => ({
    ...realMessageSlice,
    selectAllMsgs: selectAllMsgsMock,
    messageStreaming: (payload: any) => ({ type: "message/streaming", payload }),
    messageStreamEnd: messageStreamEndMock,
    prepareAndPersistUserMessage: prepareAndPersistUserMessageMock,
    addUserMessage: addUserMessageMock,
    removeTransientMessage: removeTransientMessageMock,
  }));

  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectMaxExecutionTime: () => 1_000,
    selectCurrentServer: () => "http://localhost:3000",
  }));

  mock.module("ai/agent/getFullChatContextKeys", () => ({
    getFullChatContextKeys: async () => ({
      botInstructionsContext: [],
      currentInputContext: [],
      historyContext: [],
      botKnowledgeContext: [],
    }),
    deduplicateContextKeys: (value: any) => value,
  }));

  mock.module("ai/llm/generateRequestBody", () => ({
    generateRequestBody: generateRequestBodyMock,
  }));

  mock.module("ai/llm/isResponseAPIModel", () => ({
    isResponseAPIModel: () => false,
  }));

  mock.module("ai/llm/getModelContextWindow", () => ({
    getModelContextWindow: () => 128_000,
  }));

  mock.module("create/editor/utils/slateUtils", () => ({
    extractCategorizedMentions: () => undefined,
  }));

  mock.module("core/prefix", () => actualPrefix);

  mock.module("./referenceUtils", () => ({
    ...actualReferenceUtils,
    resolveReferenceAssets: async () => ({
      references: [],
      contentByKey: new Map(),
    }),
    resolveToolsFromKeys: async () => ({
      tools: [],
      contentByKey: new Map(),
    }),
  }));


  mock.module("./streamAgentChatTurnUtils", () => ({
    ...actualChatTurnUtils,
    applyImageConfigRuntimeOverride: (agent: any) => agent,
    buildStaticContexts: async () => ({}),
    buildDynamicContexts: async () => ({}),
    compressOldToolResults: (messages: any[]) => messages,
    mergeContexts: (_static: any, dynamic: any) => dynamic,
    hasImageInMessages: () => false,
    mergeAgentToolsWithRuntime: (agent: any) => agent,
    trimMessagesWithSummary: (messages: any[]) => messages,
    validateAccessAndBalance: validateAccessAndBalanceMock,
  }));

  mock.module("./cleanAgentMessages", () => ({
    buildAgentViewMessages: () => [],
  }));

  mock.module("../chat/sendOpenAICompletionsRequest", () => ({
    sendOpenAICompletionsRequest: sendOpenAICompletionsRequestMock,
  }));

  mock.module("../chat/sendOpenAIResponseRequest", () => ({
    sendOpenAIResponseRequest: sendOpenAIResponseRequestMock,
  }));

  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectCurrentToken: () => null,
    selectCurrentUser: () => null,
    selectIsLoggedIn: () => true,
    selectUserId: (state: any) =>
      state?.auth?.currentUser?.userId ?? "user-test",
  }));

  mock.module("app/utils/env", () => ({
    ...realEnv,
    getIsDesktopApp: () => process.env.NOLO_DESKTOP === "1",
  }));

  mock.module("./cliChatClient", () => ({
    createCliChatTurnStream: createCliChatTurnStreamMock,
    startCliChatSession: startCliChatSessionMock,
    getCliChatSession: getCliChatSessionMock,
    closeCliChatSession: async () => ({ ok: true }),
  }));

  mock.module("app/utils/desktopAgentRuntimeTurnClient", () => ({
    runDesktopAgentRuntimeTurn: runDesktopAgentRuntimeTurnMock,
    runDesktopAgentRuntimeTurnStream: async function* (_args: unknown) {
      if (desktopStreamEventsOverride) {
        for (const event of desktopStreamEventsOverride) {
          yield event;
        }
        return;
      }
      const result = await runDesktopAgentRuntimeTurnMock(_args);
      if (result?.ok) {
        yield { type: "done", result: result.result };
      } else {
        yield { type: "error", error: result?.error ?? "Desktop runtime error" };
      }
    },
  }));
  };

  return setup();
}

async function loadModule() {
  await setupModuleMocks();
  const module = await import(`./streamAgentChatTurn.ts`);
  mock.restore();
  return module;
}

afterEach(() => {
  if (originalNoloDesktopEnv === undefined) {
    delete process.env.NOLO_DESKTOP;
  } else {
    process.env.NOLO_DESKTOP = originalNoloDesktopEnv;
  }
  mock.restore();
  restoreLeakedModuleMocks();
});

describe("streamAgentChatTurn queued input handling", () => {
  beforeEach(() => {
    delete process.env.NOLO_DESKTOP;
    selectCurrentDialogConfigMock.mockReset();
    selectDialogConfigByKeyMock.mockReset();
    selectPendingUserInputQueueMock.mockReset();
    selectByIdMock.mockReset();
    selectByIdMock.mockReturnValue(null);
    prepareAndPersistUserMessageMock.mockClear();
    generateRequestBodyMock.mockClear();
    sendOpenAICompletionsRequestMock.mockClear();
    sendOpenAIResponseRequestMock.mockClear();
    validateAccessAndBalanceMock.mockReset();
    validateAccessAndBalanceMock.mockReturnValue(null);
    clearPendingUserInputQueueMock.mockClear();
    dequeueUserInputMock.mockClear();
    addActiveControllerMock.mockClear();
    removeActiveControllerMock.mockClear();
    addUserMessageMock.mockClear();
    removeTransientMessageMock.mockClear();
    messageStreamEndMock.mockClear();
    writeMock.mockClear();
    patchMock.mockClear();
    createCliChatTurnStreamMock.mockReset();
    startCliChatSessionMock.mockReset();
    getCliChatSessionMock.mockReset();
    runDesktopAgentRuntimeTurnMock.mockReset();
    desktopStreamEventsOverride = null;
  });

  it("applies max reasoning to the cached default Flash auto route", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    const cachedAgent = {
      dbKey: "agent-user-test-1",
      model: "deepseek-v4-flash",
      provider: "nolo",
      apiSource: "platform",
      prompt: "You are cached",
      references: [],
    };
    selectByIdMock.mockReturnValue(cachedAgent);
    selectDialogConfigByKeyMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
    });
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);
    sendOpenAIResponseRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: false,
      hasToolCalls: false,
      messageId: "msg-stream-1",
    });

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          throw new Error("should not read cached agent config");
        }
        if (action?.kind === "prepareAndPersistUserMessage") {
          return {
            unwrap: async () => ({
              messageId: "msg-user-1",
              msgKey: "msg:dialog-1:msg-user-1",
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-1",
        userInput: "hello",
        dialogKey: "dialog-user-test-1",
        runtimeOptions: { quickChatReasoningEffort: "max" },
      },
      thunkApi
    );

    expect(dispatched.some((action) => action?.kind === "read")).toBe(false);
    expect(sendOpenAIResponseRequestMock).toHaveBeenCalledTimes(1);
    expect((sendOpenAIResponseRequestMock.mock.calls as any[])[0][0].agentConfig).toMatchObject({
      dbKey: "agent-user-test-1",
      model: "deepseek-v4-flash",
      provider: "nolo",
      reasoning_effort: "max",
    });
  });

  it("forces a fresh read when the cached agent is an SSR preview", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectByIdMock.mockReturnValue({
      dbKey: "agent-user-test-1",
      model: "gpt-4o-mini",
      provider: "openai",
      apiSource: "openai",
      prompt: "SSR preview",
      references: [],
      __ssrPreviewOnly: true,
    });
    selectDialogConfigByKeyMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
    });
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);
    sendOpenAICompletionsRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: false,
      hasToolCalls: false,
      messageId: "msg-stream-1",
    });

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "kimi-k2.6",
              provider: "deepinfra",
              apiSource: "platform",
              prompt: "Full agent config",
              references: [],
              customProviderUrl: "https://example.invalid/v1",
            }),
          };
        }
        if (action?.kind === "prepareAndPersistUserMessage") {
          return {
            unwrap: async () => ({
              messageId: "msg-user-1",
              msgKey: "msg:dialog-1:msg-user-1",
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-1",
        userInput: "hello",
        dialogKey: "dialog-user-test-1",
        quickChatPerfStartedAt: 1,
        runtimeOptions: { quickChatReasoningEffort: "max" },
      },
      thunkApi
    );

    expect(dispatched.some((action) => action?.kind === "read")).toBe(true);
    expect(sendOpenAICompletionsRequestMock).toHaveBeenCalledTimes(1);
    const agentConfig = (sendOpenAICompletionsRequestMock.mock.calls as any[])[0][0].agentConfig;
    expect(agentConfig).toMatchObject({
      dbKey: "agent-user-test-1",
      model: "kimi-k2.6",
      provider: "deepinfra",
      customProviderUrl: "https://example.invalid/v1",
    });
    expect(agentConfig.reasoning_effort).toBeUndefined();
  });

  it("uses a caller-provided execution config without reading any Agent record", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectByIdMock.mockReturnValue(null);
    selectDialogConfigByKeyMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      agentMode: "auto",
    });
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      agentMode: "auto",
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);
    sendOpenAIResponseRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: false,
      hasToolCalls: false,
      messageId: "msg-stream-1",
    });

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          throw new Error("should not read when an execution config is provided");
        }
        if (action?.kind === "prepareAndPersistUserMessage") {
          return {
            unwrap: async () => ({
              messageId: "msg-user-1",
              msgKey: "msg:dialog-1:msg-user-1",
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    await streamAgentChatTurnHandler(
      {
        agentKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
        agentConfig: {
          dbKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
          name: "DeepSeek V4 Flash",
          provider: "nolo",
          model: "deepseek-v4-flash",
          apiSource: "platform",
          useServerProxy: true,
        } as any,
        userInput: "hello",
        dialogKey: "dialog-user-test-1",
      },
      thunkApi
    );

    expect(dispatched.some((action) => action?.kind === "read")).toBe(false);
    expect(sendOpenAIResponseRequestMock).toHaveBeenCalledTimes(1);
    expect(
      (sendOpenAIResponseRequestMock.mock.calls as any[])[0][0].agentConfig
    ).toMatchObject({
      dbKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
      provider: "nolo",
      model: "deepseek-v4-flash",
    });
  });

  it("falls back to the builtin platform config when a tier agent record cannot be read", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectByIdMock.mockReturnValue(null);
    selectDialogConfigByKeyMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      agentMode: "auto",
    });
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      agentMode: "auto",
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);
    sendOpenAIResponseRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: false,
      hasToolCalls: false,
      messageId: "msg-stream-1",
    });

    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        if (action?.kind === "read") {
          return {
            unwrap: async () => {
              throw new Error(
                `Failed to fetch data for key "${action.payload?.dbKey}" from all sources.`
              );
            },
          };
        }
        if (action?.kind === "prepareAndPersistUserMessage") {
          return {
            unwrap: async () => ({
              messageId: "msg-user-1",
              msgKey: "msg:dialog-1:msg-user-1",
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    await streamAgentChatTurnHandler(
      {
        agentKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
        userInput: "hello",
        dialogKey: "dialog-user-test-1",
      },
      thunkApi
    );

    expect(sendOpenAIResponseRequestMock).toHaveBeenCalledTimes(1);
    // provider/model must survive the missing record — an empty provider is
    // what made the chat proxy answer MISSING_UPSTREAM_URL.
    expect(
      (sendOpenAIResponseRequestMock.mock.calls as any[])[0][0].agentConfig
    ).toMatchObject({
      dbKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
      provider: "nolo",
      model: "deepseek-v4-flash",
    });
  });

  it("still rejects when a non-builtin agent record cannot be read", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectByIdMock.mockReturnValue(null);
    selectDialogConfigByKeyMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
    });
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        if (action?.kind === "read") {
          return {
            unwrap: async () => {
              throw new Error("Failed to fetch data from all sources");
            },
          };
        }
        if (action?.kind === "prepareAndPersistUserMessage") {
          return {
            unwrap: async () => ({
              messageId: "msg-user-1",
              msgKey: "msg:dialog-1:msg-user-1",
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    const result = await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-nonexistent",
        userInput: "hello",
        dialogKey: "dialog-user-test-1",
      },
      thunkApi
    );

    expect(result).toMatchObject({ rejected: true });
    expect((result as any).value).toMatch(/from all sources/);
    expect(sendOpenAICompletionsRequestMock).not.toHaveBeenCalled();
  });

  it("finalizes a visible quick-chat error when access validation fails before a model request", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    const accessError = "余额不足，请充值后再试。";
    validateAccessAndBalanceMock.mockReturnValue(accessError);
    selectByIdMock.mockReturnValue({
      dbKey: "agent-user-test-1",
      model: "gpt-4o-mini",
      provider: "openai",
      apiSource: "platform",
      prompt: "You are cached",
      references: [],
    });
    selectDialogConfigByKeyMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
    });
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    const result = await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-1",
        userInput: "hello",
        dialogKey: "dialog-user-test-1",
        quickChatPerfStartedAt: 1,
      },
      thunkApi
    );

    expect(result).toEqual({ rejected: true, value: accessError });
    expect(sendOpenAICompletionsRequestMock).not.toHaveBeenCalled();
    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
    expect(messageStreamEndMock.mock.calls[0]?.[0]).toMatchObject({
      dialogKey: "dialog-user-test-1",
      agentConfig: {
        dbKey: "agent-user-test-1",
      },
      finalContentBuffer: [
        {
          type: "text",
          text: expect.stringContaining(accessError),
        },
      ],
    });
    expect(
      dispatched.some((action) => action?.kind === "messageStreamEnd")
    ).toBe(true);
  });

  it("rejects quick-chat while the client balance preload is pending", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    validateAccessAndBalanceMock.mockReturnValue("正在获取用户余额，请稍候...");
    selectByIdMock.mockReturnValue({
      dbKey: "agent-user-test-1",
      model: "gpt-4o-mini",
      provider: "openai",
      apiSource: "platform",
      prompt: "You are cached",
      references: [],
    });
    selectDialogConfigByKeyMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
    });
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);
    sendOpenAICompletionsRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: false,
      hasToolCalls: false,
      messageId: "msg-stream-1",
    });

    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        if (action?.kind === "prepareAndPersistUserMessage") {
          return {
            unwrap: async () => ({
              messageId: "msg-user-1",
              msgKey: "msg:dialog-1:msg-user-1",
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    const result = await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-1",
        userInput: "hello",
        dialogKey: "dialog-user-test-1",
        quickChatPerfStartedAt: 1,
      },
      thunkApi
    );

    expect(result).toEqual({
      rejected: true,
      value: "正在获取用户余额，请稍候...",
    });
    expect(sendOpenAICompletionsRequestMock).not.toHaveBeenCalled();
    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
  });

  it("disables tools for explicit quick-chat direct-answer requests", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectByIdMock.mockReturnValue({
      dbKey: "agent-pub-external",
      userId: "other-user",
      isPublic: true,
      model: "gpt-4o-mini",
      provider: "openai",
      apiSource: "platform",
      prompt: "You are cached",
      tools: ["runStreamingAgent", "fetchWebpage"],
      references: [],
    });
    selectDialogConfigByKeyMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);
    sendOpenAICompletionsRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: false,
      hasToolCalls: false,
      messageId: "msg-stream-1",
    });

    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        if (action?.kind === "prepareAndPersistUserMessage") {
          return {
            unwrap: async () => ({
              messageId: "msg-user-1",
              msgKey: "msg:dialog-1:msg-user-1",
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    await streamAgentChatTurnHandler(
      {
        agentKey: "agent-pub-external",
        userInput: "请只回复 OK",
        dialogKey: "dialog-user-test-1",
        quickChatPerfStartedAt: 1,
      },
      thunkApi
    );

    expect(sendOpenAICompletionsRequestMock.mock.calls.length).toBeGreaterThanOrEqual(1);
    const lastCall = (sendOpenAICompletionsRequestMock.mock.calls as any[]).at(-1);
    expect(lastCall?.[0]).toMatchObject({
      disableToolsForThisRequest: true,
    });
  });

  it("clears queued input and exits when dialog config disappears mid-loop", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockImplementationOnce(() => ({
      dbKey: "dialog-user-test-1",
    }));
    selectCurrentDialogConfigMock.mockImplementation(() => null);
    selectPendingUserInputQueueMock.mockReturnValue(["queued message"]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        if (action?.kind === "prepareAndPersistUserMessage") {
          throw new Error("should not try to persist when dialog config is missing");
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    const result = await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-1",
        userInput: "hello",
      },
      thunkApi
    );

    expect(result).toEqual({
      usage: undefined,
    });
    expect(sendOpenAICompletionsRequestMock).toHaveBeenCalledTimes(1);
    expect(prepareAndPersistUserMessageMock).not.toHaveBeenCalled();
    expect(dequeueUserInputMock).not.toHaveBeenCalled();
    expect(clearPendingUserInputQueueMock).toHaveBeenCalled();
    expect(removeActiveControllerMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messageId: expect.stringMatching(/^loop:/),
        dialogKey: "dialog-user-test-1",
      })
    );
    expect(
      dispatched.some(
        (action) => action?.type === "dialog/clearPendingUserInputQueue"
      )
    ).toBe(true);
  });

  it("removes the transient parent placeholder after a handoff", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockImplementation(() => ({
      dbKey: "dialog-user-test-1",
    }));
    selectPendingUserInputQueueMock.mockReturnValue([]);
    sendOpenAICompletionsRequestMock.mockResolvedValueOnce({
      hasHandedOff: true,
      hasPendingInteraction: false,
      hasToolCalls: false,
      messageId: "msg-handoff-parent",
    });

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    const result = await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-1",
        userInput: "handoff",
      },
      thunkApi
    );

    expect(result).toEqual({
      usage: undefined,
    });
    expect(removeTransientMessageMock).toHaveBeenCalledWith(
      "msg-handoff-parent"
    );
    expect(
      dispatched.some(
        (action) =>
          action?.type === "message/removeTransientMessage" &&
          action?.payload === "msg-handoff-parent"
      )
    ).toBe(true);
  });

  it("returns accumulated usage to upstream callers", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);
    sendOpenAICompletionsRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: false,
      hasToolCalls: false,
      messageId: "msg-stream-2",
      usage: {
        prompt_tokens: 12,
        completion_tokens: 3,
        total_tokens: 15,
      },
    });

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              provider: "openai",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        if (action?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    const result = await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-1",
        userInput: "hello",
        dialogKey: "dialog-user-test-1",
      },
      thunkApi
    );

    expect(result).toEqual({
      usage: {
        prompt_tokens: 12,
        completion_tokens: 3,
        total_tokens: 15,
      },
    });
  });

  it("prefers the explicit dialog config when dialogKey is provided", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue({
      dbKey: "dialog-user-explicit",
      referenceKeys: ["page-1"],
    });
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-current",
      referenceKeys: ["page-current"],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);
    sendOpenAICompletionsRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: true,
      hasToolCalls: false,
      messageId: "msg-stream-2",
    });

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        if (action?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    const result = await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-1",
        userInput: "hello",
        dialogKey: "dialog-user-explicit",
      },
      thunkApi
    );

    expect(result).toEqual({
      usage: undefined,
    });
    expect(selectDialogConfigByKeyMock).toHaveBeenCalled();
    expect(sendOpenAICompletionsRequestMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dialogKey: "dialog-user-explicit",
      })
    );
  });

  it("routes streaming turns through a remote serverBase when provided", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://runtime.example.com/api/agent/run");
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      expect(body).toMatchObject({
        agentKey: "agent-user-test-1",
        userInput: "hello remote",
        stream: true,
        runtimeContext: {
          surface: "web",
          host: "browser",
          runtime: "react",
          entrypoint: "chat-dialog",
        },
        runtimeOptions: { quickChatReasoningEffort: "max" },
      });
      return new Response(
        [
          'data: {"type":"agent_handoff","agentKey":"agent-user-specialist","inline":true,"threadMetadata":{"threadKind":"inline","presentationIntent":"handoff_speaker"}}',
          "",
          'data: {"type":"done","usage":{"total_tokens":12}}',
          "",
        ].join("\n"),
        {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        },
      );
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);
    const dispatched: any[] = [];

    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "deepseek-v4-flash",
              apiSource: "platform",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        if (action?.kind === "messageStreamEnd") {
          return {
            unwrap: async () => ({
              id: action.payload.messageId,
              content: action.payload.content,
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "hello remote",
          serverBase: "https://runtime.example.com",
          runtimeOptions: { quickChatReasoningEffort: "max" },
        } as any,
        thunkApi
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(remoteFetchMock).toHaveBeenCalledTimes(1);
    expect(sendOpenAICompletionsRequestMock).not.toHaveBeenCalled();
    expect(patchMock).toHaveBeenCalledWith({
      dbKey: "dialog-user-test-1",
      changes: {
        threadKind: "inline",
        presentationIntent: "handoff_speaker",
      },
    });
    expect(patchMock).toHaveBeenCalledWith({
      dbKey: "dialog-user-test-1",
      changes: {
        primaryAgentKey: "agent-user-specialist",
      },
    });
  });

  it("marks remote UI streaming runs as non-persistent for the current dialog", async () => {
    const originalFetch = globalThis.fetch;
    let capturedBody: any = null;
    const remoteFetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("https://runtime.example.com/api/agent/run");
      capturedBody = init?.body ? JSON.parse(String(init.body)) : null;
      return new Response('data: {"type":"done","usage":{"total_tokens":12}}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);
    const dispatched: any[] = [];

    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        if (action?.kind === "messageStreamEnd") {
          return {
            unwrap: async () => ({
              id: action.payload.messageId,
              content: action.payload.content,
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "hello remote",
          serverBase: "https://runtime.example.com",
        } as any,
        thunkApi
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(remoteFetchMock).toHaveBeenCalledTimes(1);
    expect(capturedBody).toMatchObject({
      agentKey: "agent-user-test-1",
      userInput: "hello remote",
      stream: true,
      persistDialog: false,
      clientDialogId: expect.any(String),
    });
  });

  it("parses remote SSE events correctly even when frames span multiple chunks", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async () => {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode('data: {"type":"text","content":"hel')
          );
          controller.enqueue(
            encoder.encode('lo"}\n\ndata: {"type":"done","usage":{"total_tokens":12}}\n\n')
          );
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "hello remote",
          serverBase: "https://runtime.example.com",
        } as any,
        thunkApi
      );

      expect(result).toEqual({
        usage: { total_tokens: 12 },
      });
      expect(
        dispatched.some(
          (action) =>
            action?.type === "message/streaming" &&
            action?.payload?.content === "hello"
        )
      ).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("keeps the local loop when serverBase is omitted", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async () => {
      throw new Error("should not proxy without explicit serverBase");
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;
    sendOpenAICompletionsRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: false,
      hasToolCalls: false,
      messageId: "msg-local-default",
    });

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "hello remote",
        } as any,
        thunkApi
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(remoteFetchMock).not.toHaveBeenCalled();
    expect(sendOpenAICompletionsRequestMock).toHaveBeenCalledTimes(1);
  });

  it("keeps redacted custom proxy public agents on the normal UI tool loop", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async () => {
      throw new Error("should not call agent/run for normal UI proxy agents");
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;
    sendOpenAICompletionsRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: false,
      hasToolCalls: false,
      messageId: "msg-custom-proxy-local",
    });

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-pub-custom-1",
              model: "mimo-v2.5-pro",
              provider: "custom",
              apiSource: "custom",
              useServerProxy: true,
              prompt: "You are a helpful assistant",
              tools: ["wereadGateway"],
              references: [],
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-pub-custom-1",
          userInput: "hello custom",
        } as any,
        thunkApi
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(remoteFetchMock).not.toHaveBeenCalled();
    expect(sendOpenAICompletionsRequestMock).toHaveBeenCalledTimes(1);
  });

  it("keeps same-server redacted custom proxy agents on the normal UI tool loop", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async () => {
      throw new Error("should not call agent/run when serverBase is the current server");
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;
    sendOpenAICompletionsRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: false,
      hasToolCalls: false,
      messageId: "msg-custom-proxy-same-server",
    });

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-pub-custom-1",
              model: "mimo-v2.5-pro",
              provider: "custom",
              apiSource: "custom",
              useServerProxy: true,
              prompt: "You are a helpful assistant",
              tools: ["wereadGateway"],
              references: [],
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-pub-custom-1",
          userInput: "hello custom",
          serverBase: "http://localhost:3000",
        } as any,
        thunkApi
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(remoteFetchMock).not.toHaveBeenCalled();
    expect(sendOpenAICompletionsRequestMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the local path when metadata auto-routing would drop multimodal input", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async () => {
      throw new Error("should not fetch remote runtime");
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);
    sendOpenAICompletionsRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: true,
      hasToolCalls: false,
      messageId: "msg-stream-local",
    });

    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
              delegation: {
                serverBase: "https://runtime.example.com",
              },
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: [
            { type: "text", text: "hello remote" },
            { type: "image_url", image_url: { url: "https://example.com/image.png" } },
          ],
        } as any,
        thunkApi
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(remoteFetchMock).not.toHaveBeenCalled();
    expect(sendOpenAICompletionsRequestMock).toHaveBeenCalledTimes(1);
  });

  it("keeps current-turn image parts in the local loop context for multimodal turns", async () => {
    const originalFetch = globalThis.fetch;
    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);
    sendOpenAICompletionsRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: true,
      hasToolCalls: false,
      messageId: "msg-stream-local",
    });

    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: [
            { type: "text", text: "please edit this" },
            { type: "image_url", image_url: { url: "https://example.com/current.png" } },
          ],
        } as any,
        thunkApi
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(generateRequestBodyMock).toHaveBeenCalledTimes(1);
    const bodyArgs = (generateRequestBodyMock.mock.calls as any[])[0]?.[0];
    expect(bodyArgs?.messages).toHaveLength(1);
    expect(bodyArgs?.messages?.[0]).toMatchObject({
      role: "user",
      content: [
        { type: "text", text: "please edit this" },
        { type: "image_url", image_url: { url: "https://example.com/current.png" } },
      ],
    });
  });

  it("removes the transient remote assistant message when the remote stream fails immediately", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async () =>
      new Response("runtime failed", {
        status: 500,
        headers: { "Content-Type": "text/plain" },
      })
    );
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "hello remote",
          serverBase: "https://runtime.example.com",
        } as any,
        thunkApi
      );

      expect(result).toEqual({
        rejected: true,
        value: "runtime failed",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(
      dispatched.some(
        (action) =>
          action?.type === "message/removeTransientMessage" &&
          typeof action?.payload === "string"
      )
    ).toBe(true);
  });

  it("removes the transient remote assistant message when the remote fetch throws", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async () => {
      throw new Error("connect ECONNREFUSED");
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "hello remote",
          serverBase: "https://runtime.example.com",
        } as any,
        thunkApi
      );

      expect(result).toEqual({
        rejected: true,
        value: "connect ECONNREFUSED",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    // Error path finalizes the transient: the reducer removes empty ones and
    // keeps non-empty ones with an error marker instead of wiping the trace.
    expect(
      dispatched.some(
        (action) =>
          action?.type === "message/finalizeTransientMessageOnError" &&
          typeof action?.payload?.id === "string"
      )
    ).toBe(true);
  });

  it("retries a remote agent run once when the runtime is draining before any content is streamed", async () => {
    const originalFetch = globalThis.fetch;
    const originalSetTimeout = globalThis.setTimeout;
    let callCount = 0;
    const remoteFetchMock = mock(async () => {
      callCount += 1;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            error: "Server draining",
            reason: "core_draining",
            retryable: true,
            retryAfterMs: 1,
          }),
          {
            status: 503,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      return new Response(
        'data: {"type":"text","content":"hello"}\n\ndata: {"type":"done","usage":{"total_tokens":12}}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }
      );
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;
    globalThis.setTimeout = (((callback: (...args: any[]) => void) => {
      callback();
      return 0;
    }) as unknown) as typeof setTimeout;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "hello remote",
          serverBase: "https://runtime.example.com",
        } as any,
        thunkApi
      );

      expect(result).toEqual({
        usage: { total_tokens: 12 },
      });
    } finally {
      globalThis.fetch = originalFetch;
      globalThis.setTimeout = originalSetTimeout;
    }

    expect(remoteFetchMock).toHaveBeenCalledTimes(2);
    expect(
      dispatched.some((action) => action?.type === "message/removeTransientMessage")
    ).toBe(false);
  });

  it("routes machine-bound cli agents through agent run without creating a local cli session", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("http://localhost:3000/api/agent/run");
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      expect(body).toMatchObject({
        agentKey: "agent-user-test-1",
        userInput: "list local files",
        stream: true,
        persistDialog: false,
        clientDialogId: expect.any(String),
        runtimeContext: {
          surface: "web",
          host: "browser",
          runtime: "react",
          entrypoint: "chat-dialog",
        },
      });
      return new Response('data: {"type":"text","content":"cwd C:\\\\Users\\\\nolot"}\n\ndata: {"type":"done","usage":{"total_tokens":9}}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-5.4",
              apiSource: "cli",
              cliProvider: "copilot",
              prompt: "You are a helpful assistant",
              references: [],
              runtimeBinding: { machineId: "machine-win" },
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "list local files",
        },
        thunkApi
      );

      expect(result).toEqual({
        usage: { total_tokens: 9 },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(remoteFetchMock).toHaveBeenCalledTimes(1);
    expect(startCliChatSessionMock).not.toHaveBeenCalled();
    expect(createCliChatTurnStreamMock).not.toHaveBeenCalled();
    expect(
      dispatched.filter(
        (action) =>
          action?.type === "message/streaming" &&
          action?.payload?.role === "assistant"
      )
    ).toHaveLength(2);
    expect(
      dispatched.some(
        (action) =>
          action?.type === "message/streaming" &&
          action?.payload?.content === "cwd C:\\Users\\nolot" &&
          action?.payload?.role === "assistant"
      )
    ).toBe(true);
    const persistedAssistantWrites = writeMock.mock.calls.filter(
      (call) =>
        call[0]?.data?.role === "assistant" &&
        call[0]?.data?.content === "cwd C:\\Users\\nolot"
    );
    expect(persistedAssistantWrites).toHaveLength(1);
    expect(removeTransientMessageMock).not.toHaveBeenCalled();
  });

  it("renders machine-bound tool events (assistant_tool_calls + tool_result) as tool message cards", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async (input: RequestInfo | URL, _init?: RequestInit) => {
      expect(String(input)).toBe("http://localhost:3000/api/agent/run");
      // 服务器端 loop 发出的事件序列：assistant_tool_calls → tool_result → done
      const sseBody = [
        'data: {"type":"assistant_tool_calls","content":null,"tool_calls":[{"id":"call-ask-1","type":"function","function":{"name":"ask_user","arguments":"{\\"question\\":\\"pick one\\",\\"choices\\":[{\\"id\\":\\"a\\",\\"label\\":\\"A\\"}]}"}}]}',
        'data: {"type":"tool_result","toolCallId":"call-ask-1","toolName":"ask_user","content":"{\\"type\\":\\"ask_user\\",\\"question\\":\\"pick one\\",\\"choices\\":[{\\"id\\":\\"a\\",\\"label\\":\\"A\\"}],\\"blocking\\":true}"}',
        'data: {"type":"text","content":"done"}',
        'data: {"type":"done","usage":{"total_tokens":5}}',
      ].join("\n\n");
      return new Response(`${sseBody}\n\n`, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-5.4",
              apiSource: "cli",
              cliProvider: "copilot",
              prompt: "You are a helpful assistant",
              references: [],
              runtimeBinding: { machineId: "machine-win" },
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        { agentKey: "agent-user-test-1", userInput: "ask me" },
        thunkApi
      );
      expect(result).toEqual({ usage: { total_tokens: 5 } });
    } finally {
      globalThis.fetch = originalFetch;
    }

    // 工具卡片：assistant_tool_calls 建一条 running tool message，
    // tool_result 更新为 succeeded，两次都 dispatch message/streaming。
    const toolStreaming = dispatched.filter(
      (a) =>
        a?.type === "message/streaming" && a?.payload?.role === "tool"
    );
    expect(toolStreaming.length).toBeGreaterThanOrEqual(2);
    const runningTool = toolStreaming.find((a) => a.payload.isStreaming === true);
    expect(runningTool).toBeDefined();
    expect(runningTool.payload.toolName).toBe("ask_user");
    expect(runningTool.payload.toolCallId).toBe("call-ask-1");
    const doneTool = toolStreaming.find((a) => a.payload.isStreaming === false);
    expect(doneTool).toBeDefined();
    expect(doneTool.payload.toolName).toBe("ask_user");
    // tool_result content 经 projectDesktopToolUiContent 投影后应非空
    expect(typeof doneTool.payload.content === "string" && doneTool.payload.content.length > 0).toBe(true);

    // tool 消息被持久化（refresh 不丢）
    const persistedToolWrites = writeMock.mock.calls.filter(
      (call) => call[0]?.data?.role === "tool" && call[0]?.data?.toolName === "ask_user"
    );
    expect(persistedToolWrites.length).toBeGreaterThanOrEqual(1);
  });

  it("routes machine-bound localhost custom providers through agent run", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
      expect(String(input)).toBe("http://localhost:3000/api/agent/run");
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      expect(body).toMatchObject({
        agentKey: "agent-user-local-qwen",
        userInput: "say hi",
        stream: true,
        persistDialog: false,
        clientDialogId: expect.any(String),
        runtimeContext: {
          surface: "web",
          host: "browser",
          runtime: "react",
          entrypoint: "chat-dialog",
        },
      });
      return new Response('data: {"type":"text","content":"local qwen ok"}\n\ndata: {"type":"done","usage":{"total_tokens":7}}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-local-qwen",
              model: "Qwen3.6-27B-MTP-Q3_K_M.gguf",
              apiSource: "custom",
              provider: "custom",
              customProviderUrl: "http://127.0.0.1:8080/v1/chat/completions",
              runtimeBinding: { machineId: "machine-win" },
              prompt: "You are a local qwen assistant",
              references: [],
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-local-qwen",
          userInput: "say hi",
        },
        thunkApi
      );

      expect(result).toEqual({
        usage: { total_tokens: 7 },
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(remoteFetchMock).toHaveBeenCalledTimes(1);
    expect(sendOpenAICompletionsRequestMock).not.toHaveBeenCalled();
    expect(startCliChatSessionMock).not.toHaveBeenCalled();
    expect(createCliChatTurnStreamMock).not.toHaveBeenCalled();
    expect(
      dispatched.some(
        (action) =>
          action?.type === "message/streaming" &&
          action?.payload?.content === "local qwen ok" &&
          action?.payload?.role === "assistant"
      )
    ).toBe(true);
  });

  it("keeps unbound localhost custom providers on the normal chat provider path", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async (input: RequestInfo | URL) => {
      throw new Error(`unexpected remote runtime fetch: ${String(input)}`);
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;
    sendOpenAICompletionsRequestMock.mockResolvedValueOnce({
      hasHandedOff: false,
      hasPendingInteraction: false,
      hasToolCalls: false,
      messageId: "msg-stream-1",
    });

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-local-client",
              model: "Qwen3.6-27B-MTP-Q3_K_M.gguf",
              apiSource: "custom",
              provider: "custom",
              customProviderUrl: "http://127.0.0.1:8080/v1/chat/completions",
              useServerProxy: false,
              prompt: "You are a current-client local qwen assistant",
              references: [],
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-local-client",
          userInput: "say hi",
        },
        thunkApi
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(remoteFetchMock).not.toHaveBeenCalled();
    expect(sendOpenAICompletionsRequestMock).toHaveBeenCalledTimes(1);
    expect(startCliChatSessionMock).not.toHaveBeenCalled();
    expect(createCliChatTurnStreamMock).not.toHaveBeenCalled();
  });

  it("surfaces machine-bound cli offline errors without starting a local cli session", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async (input: RequestInfo | URL) => {
      expect(String(input)).toBe("http://localhost:3000/api/agent/run");
      return new Response(JSON.stringify({
        error: "Connector offline",
        reason: "connector_offline",
        message: "Bound machine machine-win is online, but no live connector is attached.",
      }), {
        status: 409,
        headers: { "Content-Type": "application/json" },
      });
    });
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-5.4",
              apiSource: "cli",
              cliProvider: "copilot",
              prompt: "You are a helpful assistant",
              references: [],
              runtimeBinding: { machineId: "machine-win" },
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "list local files",
        },
        thunkApi
      );

      expect(result).toEqual({
        rejected: true,
        value: "电脑在线，但连接器未连接。请在这台电脑上重新运行连接命令后再试。",
      });
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(remoteFetchMock).toHaveBeenCalledTimes(1);
    expect(startCliChatSessionMock).not.toHaveBeenCalled();
    expect(createCliChatTurnStreamMock).not.toHaveBeenCalled();
    expect(
      dispatched.filter((action) => action?.type === "message/streaming")
    ).toHaveLength(1);
    expect(
      dispatched.filter((action) => action?.type === "message/removeTransientMessage")
    ).toHaveLength(1);
  });

  it("routes desktop built-in nolo turns through the desktop local runtime client", async () => {
    const originalDesktopEnv = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    runDesktopAgentRuntimeTurnMock.mockResolvedValue({
      ok: true,
      result: {
        content: "I can inspect your Desktop from the local runtime.",
        model: "gpt-5.4-mini",
        dialogId: "test-1",
        usage: { total_tokens: 12 },
      },
    });

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
              id: "01NOLOAPPBLD000000019KCKT0",
              model: "gpt-5.4-mini",
              provider: "openai",
              apiSource: "platform",
              prompt: "You are Nolo",
              references: [],
            }),
          };
        }
        if (action?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
          userInput: "Can you inspect my Desktop downloads?",
        },
        thunkApi
      );

      expect(result).toEqual({
        usage: { total_tokens: 12 },
      });
    } finally {
      if (originalDesktopEnv === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktopEnv;
      }
    }

    expect(runDesktopAgentRuntimeTurnMock).toHaveBeenCalledTimes(1);
    expect(runDesktopAgentRuntimeTurnMock).toHaveBeenCalledWith(expect.objectContaining({
      agentRef: "agent-pub-01NOLOAPPBLD000000019KCKT0",
      input: "Can you inspect my Desktop downloads?",
      continueDialogId: expect.any(String),
    }));
    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
    expect(messageStreamEndMock.mock.calls[0]?.[0]).toMatchObject({
      finalContentBuffer: [
        {
          type: "text",
          text: "I can inspect your Desktop from the local runtime.",
        },
      ],
      dialogId: expect.any(String),
      dialogKey: "dialog-user-test-1",
      totalUsage: { total_tokens: 12 },
      reasoningBuffer: "",
      toolCalls: [],
    });
    expect(
      dispatched.some((action) => action?.kind === "messageStreamEnd")
    ).toBe(true);
  });

  it("projects desktop local runtime tool messages into the active dialog UI", async () => {
    const originalDesktopEnv = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    runDesktopAgentRuntimeTurnMock.mockResolvedValue({
      ok: true,
      result: {
        content: "Done.",
        model: "gpt-5.4-mini",
        dialogId: "test-1",
        usage: { total_tokens: 18 },
        turnMessages: [
          {
            role: "user",
            content: "edit /tmp/tool-visible.txt",
          },
          {
            role: "assistant",
            content: null,
            tool_calls: [
              {
                id: "call-write-1",
                type: "function",
                function: {
                  name: "writeFile",
                  arguments: JSON.stringify({
                    path: "/tmp/tool-visible.txt",
                    _activity: {
                      phase: {
                        id: "write-visible-file",
                        title: "写入可见测试文件",
                      },
                      action: {
                        title: "写入本地文件",
                        kind: "write",
                        refs: [{ type: "file", path: "/tmp/tool-visible.txt" }],
                      },
                    },
                  }),
                },
              },
            ],
          },
          {
            role: "tool",
            content: "{\"ok\":true}",
            tool_call_id: "call-write-1",
            tool_result_metadata: {
              toolName: "writeFile",
              path: "/tmp/tool-visible.txt",
            },
          },
          {
            role: "assistant",
            content: "Done.",
          },
        ],
      },
    });

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
              id: "01NOLOAPPBLD000000019KCKT0",
              model: "gpt-5.4-mini",
              provider: "openai",
              apiSource: "platform",
              prompt: "You are Nolo",
              references: [],
            }),
          };
        }
        if (action?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
          userInput: "edit /tmp/tool-visible.txt",
        },
        thunkApi
      );
    } finally {
      if (originalDesktopEnv === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktopEnv;
      }
    }

    const streamedMessages = dispatched
      .filter((action) => action?.type === "message/streaming")
      .map((action) => action.payload);
    const firstToolIndex = streamedMessages.findIndex((message) => message?.role === "tool");
    const finalAssistantIndex = streamedMessages.findIndex(
      (message) => message?.role === "assistant" && message?.content === "Done."
    );
    expect(firstToolIndex).toBeGreaterThanOrEqual(0);
    expect(finalAssistantIndex).toBeGreaterThan(firstToolIndex);
    expect(streamedMessages).toContainEqual(
      expect.objectContaining({
        dialogId: expect.any(String),
        role: "tool",
        toolName: "writeFile",
        toolCallId: "call-write-1",
        metadata: expect.objectContaining({
          activity: expect.objectContaining({
            phase: expect.objectContaining({
              id: "write-visible-file",
              title: "写入可见测试文件",
            }),
            action: expect.objectContaining({
              title: "写入本地文件",
            }),
          }),
        }),
      })
    );
    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
    // Contract change (Task C gap 1): on the done-only path the tool_calls now
    // belong to the earlier assistant segment and are persisted via the write
    // action below, so messageStreamEnd receives an empty toolCalls array.
    expect(messageStreamEndMock.mock.calls[0]?.[0].toolCalls).toEqual([]);
    // The earlier assistant segment must carry the tool_calls so the persisted
    // history has an assistant declaring call-write-1 before the tool row.
    const assistantWriteWithToolCalls = writeMock.mock.calls
      .map((call) => call[0])
      .filter(
        (payload) =>
          payload?.data?.role === "assistant" &&
          Array.isArray(payload?.data?.tool_calls) &&
          payload.data.tool_calls.some((tc: any) => tc?.id === "call-write-1")
      );
    expect(assistantWriteWithToolCalls.length).toBeGreaterThanOrEqual(1);

    // Tool rows must be written to LevelDB — otherwise refresh drops the trajectory.
    const toolWrites = writeMock.mock.calls
      .map((call) => call[0])
      .filter((payload) => payload?.data?.role === "tool");
    expect(toolWrites.length).toBeGreaterThanOrEqual(1);
    expect(toolWrites[0]?.data).toEqual(
      expect.objectContaining({
        role: "tool",
        toolName: "writeFile",
        toolCallId: "call-write-1",
        isStreaming: false,
        type: "msg",
      })
    );
    expect(toolWrites[0]?.customKey).toEqual(toolWrites[0]?.data?.dbKey);
  });

  it("routes desktop platform agents with stale machine bindings through the desktop local runtime", async () => {
    const originalDesktopEnv = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    runDesktopAgentRuntimeTurnMock.mockResolvedValue({
      ok: true,
      result: {
        content: "Edited locally from the desktop runtime.",
        model: "kimi-k2",
        dialogId: "test-1",
      },
    });

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const remoteFetchMock = mock(async () => new Response("", { status: 500 }));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;
    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-kimi",
              model: "kimi-k2",
              provider: "fireworks",
              apiSource: "platform",
              prompt: "You edit local files.",
              references: [],
              runtimeBinding: { machineId: "machine-old" },
            }),
          };
        }
        if (action?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-kimi",
          userInput: "edit /tmp/example.txt",
        },
        thunkApi
      );

      expect(result).toEqual({ usage: undefined });
    } finally {
      globalThis.fetch = originalFetch;
      if (originalDesktopEnv === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktopEnv;
      }
    }

    expect(runDesktopAgentRuntimeTurnMock).toHaveBeenCalledTimes(1);
    expect(runDesktopAgentRuntimeTurnMock).toHaveBeenCalledWith(expect.objectContaining({
      agentRef: "agent-user-kimi",
      input: "edit /tmp/example.txt",
      continueDialogId: expect.any(String),
    }));
    expect(remoteFetchMock).not.toHaveBeenCalled();
    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
    expect(
      dispatched.some((action) => action?.type === "message/removeTransientMessage")
    ).toBe(false);
  });

  it("creates and persists a cli session before the first cli turn", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockImplementation(() => ({
      dbKey: "dialog-user-test-1",
      cliSessionId: null,
    }));
    selectPendingUserInputQueueMock.mockReturnValue([]);
    startCliChatSessionMock.mockResolvedValue({
      ok: true,
      sessionId: "cli-session-1",
    });
    createCliChatTurnStreamMock.mockResolvedValue(
      new Response('data: {"chunk":"hello"}\n\ndata: {"done":true,"elapsed":12,"sessionId":"cli-session-1"}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-5.4",
              apiSource: "cli",
              cliProvider: "codex",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        if (action?.type === "db/patch") {
          return {
            unwrap: async () => action.payload,
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-1",
        userInput: "hello",
      },
      thunkApi
    );

    expect(startCliChatSessionMock).toHaveBeenCalled();
    expect(createCliChatTurnStreamMock.mock.calls[0]?.[1]).toMatchObject({
      sessionId: "cli-session-1",
      prompt: expect.stringContaining("hello"),
      model: "gpt-5.4",
    });
    expect(dispatched.some((action) => action?.type === "db/patch")).toBe(true);
  });

  it("routes desktop cli agents bound to the current machine through a local cli session", async () => {
    const originalDesktopEnv = process.env.NOLO_DESKTOP;
    const originalMachineId = process.env.NOLO_CURRENT_MACHINE_ID;
    process.env.NOLO_DESKTOP = "1";
    process.env.NOLO_CURRENT_MACHINE_ID = "machine-mac";

    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async () => new Response("", { status: 500 }));
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockImplementation(() => ({
      dbKey: "dialog-user-test-1",
      cliSessionId: null,
    }));
    selectPendingUserInputQueueMock.mockReturnValue([]);
    startCliChatSessionMock.mockResolvedValue({
      ok: true,
      sessionId: "cli-session-current-machine",
    });
    createCliChatTurnStreamMock.mockResolvedValue(
      new Response('data: {"chunk":"local agy"}\n\ndata: {"done":true,"elapsed":12,"sessionId":"cli-session-current-machine"}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-agy",
              model: "",
              apiSource: "cli",
              cliProvider: "agy",
              prompt: "You are AGY on this Mac.",
              references: [],
              runtimeBinding: { machineId: "machine-mac" },
            }),
          };
        }
        if (action?.type === "db/patch") {
          return {
            unwrap: async () => action.payload,
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-agy",
          userInput: "hello local agy",
        },
        thunkApi
      );
    } finally {
      globalThis.fetch = originalFetch;
      if (originalDesktopEnv === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktopEnv;
      }
      if (originalMachineId === undefined) {
        delete process.env.NOLO_CURRENT_MACHINE_ID;
      } else {
        process.env.NOLO_CURRENT_MACHINE_ID = originalMachineId;
      }
    }

    expect(remoteFetchMock).not.toHaveBeenCalled();
    expect(startCliChatSessionMock).toHaveBeenCalled();
    expect(createCliChatTurnStreamMock.mock.calls[0]?.[1]).toMatchObject({
      sessionId: "cli-session-current-machine",
      prompt: expect.stringContaining("hello local agy"),
    });
    expect(dispatched.some((action) => action?.type === "db/patch")).toBe(true);
  });

  it("restarts a cli session when the persisted one is no longer valid", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockImplementation(() => ({
      dbKey: "dialog-user-test-1",
      cliSessionId: "stale-session",
    }));
    selectPendingUserInputQueueMock.mockReturnValue([]);
    getCliChatSessionMock.mockResolvedValue({
      ok: false,
      session: null,
    });
    startCliChatSessionMock.mockResolvedValue({
      ok: true,
      sessionId: "fresh-session",
    });
    createCliChatTurnStreamMock.mockResolvedValue(
      new Response('data: {"chunk":"restarted"}\n\ndata: {"done":true,"elapsed":12,"sessionId":"fresh-session"}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-5.4",
              apiSource: "cli",
              cliProvider: "codex",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        if (action?.type === "db/patch") {
          return {
            unwrap: async () => action.payload,
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-1",
        userInput: "hello again",
      },
      thunkApi
    );

    expect(getCliChatSessionMock).toHaveBeenCalledWith(
      { getState: expect.any(Function) },
      { sessionId: "stale-session" },
    );
    expect(startCliChatSessionMock).toHaveBeenCalled();
    expect(createCliChatTurnStreamMock.mock.calls[0]?.[1]).toMatchObject({
      sessionId: "fresh-session",
    });
  });

  it("appends CLI capability warnings to the final streamed CLI assistant message", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockImplementation(() => ({
      dbKey: "dialog-user-test-1",
      cliSessionId: null,
    }));
    selectPendingUserInputQueueMock.mockReturnValue([]);
    startCliChatSessionMock.mockResolvedValue({
      ok: true,
      sessionId: "cli-session-1",
    });
    createCliChatTurnStreamMock.mockResolvedValue(
      new Response('data: {"chunk":"hello"}\n\ndata: {"done":true,"elapsed":12,"sessionId":"cli-session-1","warnings":["Claude CLI does not support max_tokens; ignored."]}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "claude-sonnet-4.6",
              apiSource: "cli",
              cliProvider: "claude",
              prompt: "You are a helpful assistant",
              max_tokens: 4096,
              references: [],
            }),
          };
        }
        if (action?.type === "db/patch") {
          return {
            unwrap: async () => action.payload,
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-1",
        userInput: "hello",
      },
      thunkApi
    );

    const streamingUpdates = dispatched.filter((action) => action?.type === "message/streaming");
    const lastUpdate = streamingUpdates[streamingUpdates.length - 1];

    expect(lastUpdate?.payload?.content).toContain("[CLI 能力提示]");
    expect(lastUpdate?.payload?.content).toContain("Claude CLI does not support max_tokens; ignored.");
  });

  it("streams text deltas progressively to the assistant message", async () => {
    const originalDesktopEnv = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    desktopStreamEventsOverride = [
      { type: "delta", text: "Hello" },
      { type: "delta", text: " world" },
      {
        type: "done",
        result: {
          content: "Hello world",
          model: "gpt-5.4-mini",
          dialogId: "test-1",
          usage: { total_tokens: 8 },
        },
      },
    ];

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: unknown[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: unknown) => {
        const a = action as Record<string, unknown> | null;
        dispatched.push(a);
        if (a?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
              id: "01NOLOAPPBLD000000019KCKT0",
              model: "gpt-5.4-mini",
              provider: "openai",
              apiSource: "platform",
              prompt: "You are Nolo",
              references: [],
            }),
          };
        }
        if (a?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: unknown) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
          userInput: "hello",
        },
        thunkApi
      );

      expect(result).toEqual({ usage: { total_tokens: 8 } });
    } finally {
      if (originalDesktopEnv === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktopEnv;
      }
    }

    const streamingMessages = dispatched
      .filter(
        (action) =>
          (action as Record<string, unknown>)?.type === "message/streaming"
      )
      .map((action) => (action as Record<string, unknown>)?.payload as Record<string, unknown>);

    const assistantMessages = streamingMessages.filter(
      (m) => m?.role === "assistant"
    );
    expect(assistantMessages.length).toBeGreaterThanOrEqual(1);

    // First dispatch should have partial content
    expect(assistantMessages[0]?.content).toBe("Hello");
    expect(assistantMessages[0]?.isStreaming).toBe(true);

    // Last dispatch should have full content
    const last = assistantMessages[assistantMessages.length - 1];
    expect(last?.content).toBe("Hello world");

    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
    expect(messageStreamEndMock.mock.calls[0]?.[0]).toMatchObject({
      finalContentBuffer: [{ type: "text", text: "Hello world" }],
      totalUsage: { total_tokens: 8 },
    });
  });

  it("accumulates desktop SSE thinking deltas into messageStreamEnd reasoningBuffer", async () => {
    const originalDesktopEnv = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    desktopStreamEventsOverride = [
      { type: "thinking", content: "思考片段A" },
      { type: "delta", text: "Answer" },
      { type: "thinking", content: "思考片段B" },
      { type: "delta", text: " text" },
      {
        type: "done",
        result: {
          content: "Answer text",
          model: "gpt-5.4-mini",
          dialogId: "test-1",
          usage: { total_tokens: 9 },
        },
      },
    ];

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: unknown[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: unknown) => {
        const a = action as Record<string, unknown> | null;
        dispatched.push(a);
        if (a?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
              id: "01NOLOAPPBLD000000019KCKT0",
              model: "gpt-5.4-mini",
              provider: "openai",
              apiSource: "platform",
              prompt: "You are Nolo",
              references: [],
            }),
          };
        }
        if (a?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: unknown) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
          userInput: "think then answer",
        },
        thunkApi
      );

      expect(result).toEqual({ usage: { total_tokens: 9 } });
    } finally {
      if (originalDesktopEnv === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktopEnv;
      }
    }

    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
    // reasoningBuffer 必须包含两段 thinking 的累计内容(顺序保留)。
    expect(messageStreamEndMock.mock.calls[0]?.[0].reasoningBuffer).toBe(
      "思考片段A思考片段B"
    );
    expect(messageStreamEndMock.mock.calls[0]?.[0]).toMatchObject({
      finalContentBuffer: [{ type: "text", text: "Answer text" }],
      totalUsage: { total_tokens: 9 },
    });
    expect(
      dispatched.some((action) => (action as Record<string, unknown>)?.kind === "messageStreamEnd")
    ).toBe(true);
  });

  it("passes streamResult.finish_reason to messageStreamEnd on the desktop branch", async () => {
    const originalDesktopEnv = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    desktopStreamEventsOverride = [
      { type: "delta", text: "truncated" },
      {
        type: "done",
        result: {
          content: "truncated",
          model: "gpt-5.4-mini",
          dialogId: "test-1",
          usage: { total_tokens: 5 },
          finish_reason: "length",
        },
      },
    ];

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: unknown[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: unknown) => {
        const a = action as Record<string, unknown> | null;
        dispatched.push(a);
        if (a?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
              id: "01NOLOAPPBLD000000019KCKT0",
              model: "gpt-5.4-mini",
              provider: "openai",
              apiSource: "platform",
              prompt: "You are Nolo",
              references: [],
            }),
          };
        }
        if (a?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: unknown) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
          userInput: "long answer",
        },
        thunkApi
      );
    } finally {
      if (originalDesktopEnv === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktopEnv;
      }
    }

    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
    // streamResult.finish_reason 必须原样透传给 messageStreamEnd。
    expect(messageStreamEndMock.mock.calls[0]?.[0].finishReason).toBe("length");
  });

  it("handles streaming tool-call and tool-result events from desktop runtime", async () => {
    const originalDesktopEnv = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    desktopStreamEventsOverride = [
      {
        type: "tool",
        event: {
          type: "tool-call",
          round: 1,
          toolCallId: "call-read-1",
          toolName: "readFile",
        },
      },
      {
        type: "tool",
        event: {
          type: "tool-result",
          round: 1,
          toolCallId: "call-read-1",
          toolName: "readFile",
          summary: "file contents here",
          metadata: { path: "/tmp/example.txt" },
        },
      },
      {
        type: "done",
        result: {
          content: "Done.",
          model: "gpt-5.4-mini",
          dialogId: "test-1",
          usage: { total_tokens: 12 },
        },
      },
    ];

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: unknown[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: unknown) => {
        const a = action as Record<string, unknown> | null;
        dispatched.push(a);
        if (a?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
              id: "01NOLOAPPBLD000000019KCKT0",
              model: "gpt-5.4-mini",
              provider: "openai",
              apiSource: "platform",
              prompt: "You are Nolo",
              references: [],
            }),
          };
        }
        if (a?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: unknown) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
          userInput: "read /tmp/example.txt",
        },
        thunkApi
      );

      expect(result).toEqual({ usage: { total_tokens: 12 } });
    } finally {
      if (originalDesktopEnv === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktopEnv;
      }
    }

    const streamingMessages = dispatched
      .filter(
        (action) =>
          (action as Record<string, unknown>)?.type === "message/streaming"
      )
      .map((action) => (action as Record<string, unknown>)?.payload as Record<string, unknown>);

    const toolMessages = streamingMessages.filter((m) => m?.role === "tool");
    expect(toolMessages.length).toBeGreaterThanOrEqual(1);

    // First tool message: tool-call creates streaming entry
    const toolCallMsg = toolMessages.find(
      (m) => m?.toolCallId === "call-read-1" && m?.isStreaming === true
    );
    expect(toolCallMsg).toBeDefined();
    expect(toolCallMsg?.toolName).toBe("readFile");
    expect(toolCallMsg?.content).toBe("");

    // Second tool message: tool-result finalizes it
    const toolResultMsg = toolMessages.find(
      (m) => m?.toolCallId === "call-read-1" && m?.isStreaming === false
    );
    expect(toolResultMsg).toBeDefined();
    // projectDesktopToolUiContent now wraps readFile into {filePath, content} JSON
    // so the CodePreviewViewer meta-only preview can render path + line stats.
    const parsedReadContent = JSON.parse(toolResultMsg?.content as string);
    expect(parsedReadContent.content).toBe("file contents here");
    expect(parsedReadContent.filePath).toBe("/tmp/example.txt");
    expect(
      (toolResultMsg?.metadata as Record<string, unknown>)?.path
    ).toBe("/tmp/example.txt");

    // Should NOT dispatch fallback tool messages via buildDesktopRuntimeToolMessagesForUi
    // since activeToolMessages was populated by the stream
    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
    expect(messageStreamEndMock.mock.calls[0]?.[0].toolCalls).toEqual([]);

    const toolWrites = writeMock.mock.calls
      .map((call) => call[0])
      .filter((payload) => payload?.data?.role === "tool");
    expect(toolWrites.length).toBeGreaterThanOrEqual(1);
    expect(toolWrites.some((w) => w?.data?.toolCallId === "call-read-1")).toBe(
      true
    );
    expect(
      toolWrites.find((w) => w?.data?.toolCallId === "call-read-1")?.data
    ).toEqual(
      expect.objectContaining({
        role: "tool",
        toolName: "readFile",
        isStreaming: false,
        // readFile is projected as {filePath, content} JSON for the meta-only UI.
        content: expect.stringContaining("file contents here"),
      })
    );
  });

  it("projects desktop execShell tool-result into structured UI content", async () => {
    const originalDesktopEnv = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    desktopStreamEventsOverride = [
      {
        type: "tool",
        event: {
          type: "tool-call",
          round: 1,
          toolCallId: "call-shell-1",
          toolName: "execShell",
          argumentsPreview: "git status -sb",
        },
      },
      {
        type: "tool",
        event: {
          type: "tool-result",
          round: 1,
          toolCallId: "call-shell-1",
          toolName: "execShell",
          summary: "exit=0 1 lines",
          content: "stdout:\n## alpha...origin/alpha [ahead 2]\n\nexitCode: 0",
          metadata: { command: "git status -sb", exitCode: 0 },
        },
      },
      {
        type: "done",
        result: {
          content: "Done.",
          model: "gpt-5.4-mini",
          dialogId: "test-shell-1",
          usage: { total_tokens: 12 },
        },
      },
    ];

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-shell-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: unknown[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: unknown) => {
        const a = action as Record<string, unknown> | null;
        dispatched.push(a);
        if (a?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
              id: "01NOLOAPPBLD000000019KCKT0",
              model: "gpt-5.4-mini",
              provider: "openai",
              apiSource: "platform",
              prompt: "You are Nolo",
              references: [],
            }),
          };
        }
        if (a?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: unknown) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
          userInput: "git status",
        },
        thunkApi
      );
    } finally {
      if (originalDesktopEnv === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktopEnv;
      }
    }

    const streamingMessages = dispatched
      .filter(
        (action) =>
          (action as Record<string, unknown>)?.type === "message/streaming"
      )
      .map((action) => (action as Record<string, unknown>)?.payload as Record<string, unknown>);

    const toolResultMsg = streamingMessages.find(
      (m) => m?.toolCallId === "call-shell-1" && m?.isStreaming === false
    );
    expect(toolResultMsg).toBeDefined();
    const parsed = JSON.parse(String(toolResultMsg?.content ?? "{}"));
    expect(parsed.command).toBe("git status -sb");
    expect(parsed.stdout).toContain("ahead 2");
    expect(parsed.exitCode).toBe(0);

    const toolWrites = writeMock.mock.calls
      .map((call) => call[0])
      .filter((payload) => payload?.data?.role === "tool");
    expect(
      toolWrites.some((w) => w?.data?.toolCallId === "call-shell-1")
    ).toBe(true);
  });

  it("splits assistant text around tool calls so the message list interleaves text→tool→text", async () => {
    const originalDesktopEnv = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    desktopStreamEventsOverride = [
      { type: "delta", text: "Let me check that file." },
      {
        type: "tool",
        event: {
          type: "tool-call",
          round: 0,
          toolCallId: "call-read-1",
          toolName: "readFile",
        },
      },
      {
        type: "tool",
        event: {
          type: "tool-result",
          round: 0,
          toolCallId: "call-read-1",
          toolName: "readFile",
          summary: "file contents here",
          metadata: { path: "/tmp/example.txt" },
        },
      },
      { type: "delta", text: "The file looks good!" },
      {
        type: "done",
        result: {
          content: "The file looks good!",
          model: "gpt-5.4-mini",
          dialogId: "test-1",
          usage: { total_tokens: 12 },
          turnMessages: [
            {
              role: "assistant",
              content: "Let me check that file.",
              tool_calls: [
                {
                  id: "call-read-1",
                  type: "function",
                  function: { name: "readFile", arguments: "{}" },
                },
              ],
            },
            {
              role: "tool",
              content: "file contents here",
              tool_call_id: "call-read-1",
            },
            {
              role: "assistant",
              content: "The file looks good!",
            },
          ],
        },
      },
    ];

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: unknown[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: unknown) => {
        const a = action as Record<string, unknown> | null;
        dispatched.push(a);
        if (a?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
              id: "01NOLOAPPBLD000000019KCKT0",
              model: "gpt-5.4-mini",
              provider: "openai",
              apiSource: "platform",
              prompt: "You are Nolo",
              references: [],
            }),
          };
        }
        if (a?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: unknown) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
          userInput: "read /tmp/example.txt",
        },
        thunkApi
      );

      expect(result).toEqual({ usage: { total_tokens: 12 } });
    } finally {
      if (originalDesktopEnv === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktopEnv;
      }
    }

    const streamingMessages = dispatched
      .filter(
        (action) =>
          (action as Record<string, unknown>)?.type === "message/streaming"
      )
      .map((action) => (action as Record<string, unknown>)?.payload as Record<string, unknown>);

    const assistantMessages = streamingMessages.filter(
      (m) => m?.role === "assistant"
    );
    const toolMessages = streamingMessages.filter((m) => m?.role === "tool");

    // Two distinct assistant text segments: "Let me check that file." and "The file looks good!"
    expect(assistantMessages.length).toBeGreaterThanOrEqual(2);
    const firstSegmentId = assistantMessages[0]?.id;
    const lastSegmentId = assistantMessages[assistantMessages.length - 1]?.id;
    expect(firstSegmentId).not.toBe(lastSegmentId);
    expect(assistantMessages[0]?.content).toBe("Let me check that file.");
    expect(
      assistantMessages[assistantMessages.length - 1]?.content
    ).toBe("The file looks good!");

    // One tool message
    expect(toolMessages.length).toBeGreaterThanOrEqual(1);

    // Record-order: the first segment's id must precede the tool message's id,
    // and the tool message's id must precede the second segment's id. The
    // entity adapter sorts by `id` via localeCompare, so this ordering is what
    // the UI will display.
    const toolMessageId = toolMessages[0]?.id;
    expect(typeof toolMessageId).toBe("string");
    expect(firstSegmentId! < toolMessageId!).toBe(true);
    expect(toolMessageId! < lastSegmentId!).toBe(true);

    // The finalized first segment must be marked isStreaming: false at least
    // once (the finalize dispatch before the tool card).
    const firstSegmentFinalized = assistantMessages.some(
      (m) =>
        m?.id === firstSegmentId &&
        m?.content === "Let me check that file." &&
        m?.isStreaming === false
    );
    expect(firstSegmentFinalized).toBe(true);

    // messageStreamEnd persists the final (second) segment only.
    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
    expect(messageStreamEndMock.mock.calls[0]?.[0].messageId).toBe(
      lastSegmentId
    );
    expect(messageStreamEndMock.mock.calls[0]?.[0].finalContentBuffer).toEqual([
      { type: "text", text: "The file looks good!" },
    ]);

    // The earlier finalized segment must be written to the db so history
    // reload preserves the ordering.
    const writeCalls = writeMock.mock.calls.map(
      (call: any) => call[0] as Record<string, unknown>
    );
    const earlierSegmentWrite = writeCalls.find(
      (w) =>
        w?.customKey &&
        typeof (w.data as any)?.content === "string" &&
        (w.data as any).content === "Let me check that file."
    );
    expect(earlierSegmentWrite).toBeDefined();
    expect((earlierSegmentWrite?.data as any)?.role).toBe("assistant");
    expect((earlierSegmentWrite?.data as any)?.isStreaming).toBe(false);
    // Core behavior of the tool_calls attribution fix: the earlier finalized
    // segment must carry the tool_calls it declared (call-read-1), otherwise
    // the persisted history has an orphan tool row.
    expect((earlierSegmentWrite?.data as any)?.tool_calls).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "call-read-1" })])
    );
    // The last (final) segment must NOT carry tool_calls — it is the trailing
    // text segment after the tool result. It is persisted via messageStreamEnd
    // (not a write call), so assert its toolCalls payload is empty.
    expect(messageStreamEndMock.mock.calls[0]?.[0].toolCalls).toEqual([]);
  });

  it("mixed stream (delta text + done-only tool_calls) does not produce a duplicate/empty assistant bubble", async () => {
    const originalDesktopEnv = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    // Mixed stream: delta text arrives (so currentContent > 0), but NO tool
    // event fires during the stream. The done event's result.turnMessages
    // carries an assistant with tool_calls + a tool result. The done-only
    // branch must NOT finalize the current segment (currentContent.length > 0),
    // otherwise a second segment S2 would be minted and duplicate the content.
    desktopStreamEventsOverride = [
      { type: "delta", text: "I will read the file." },
      {
        type: "done",
        result: {
          content: "I will read the file.",
          model: "gpt-5.4-mini",
          dialogId: "test-1",
          usage: { total_tokens: 9 },
          turnMessages: [
            {
              role: "assistant",
              content: "I will read the file.",
              tool_calls: [
                {
                  id: "call-read-mixed",
                  type: "function",
                  function: { name: "readFile", arguments: "{}" },
                },
              ],
            },
            {
              role: "tool",
              content: '{"ok":true}',
              tool_call_id: "call-read-mixed",
            },
          ],
        },
      },
    ];
    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: unknown[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: unknown) => {
        const a = action as Record<string, unknown> | null;
        dispatched.push(a);
        if (a?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
              id: "01NOLOAPPBLD000000019KCKT0",
              model: "gpt-5.4-mini",
              provider: "openai",
              apiSource: "platform",
              prompt: "You are Nolo",
              references: [],
            }),
          };
        }
        if (a?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: unknown) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      const result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
          userInput: "read /tmp/mixed.txt",
        },
        thunkApi
      );
      expect(result).toEqual({ usage: { total_tokens: 9 } });
    } finally {
      if (originalDesktopEnv === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktopEnv;
      }
    }

    const streamingMessages = dispatched
      .filter(
        (action) =>
          (action as Record<string, unknown>)?.type === "message/streaming"
      )
      .map((action) => (action as Record<string, unknown>)?.payload as Record<string, unknown>);
    const assistantMessages = streamingMessages.filter(
      (m) => m?.role === "assistant"
    );
    // Dedupe by id: there must be exactly ONE assistant id (no duplicate bubble).
    const assistantIds = new Set(
      assistantMessages.map((m) => m?.id).filter((id) => typeof id === "string")
    );
    expect(assistantIds.size).toBe(1);
    // messageStreamEnd must persist the tool_calls on the single segment
    // (the done-only branch attached them to the current segment instead of
    // finalizing).
    expect(messageStreamEndMock).toHaveBeenCalledTimes(1);
    const endToolCalls = messageStreamEndMock.mock.calls[0]?.[0].toolCalls as any[];
    expect(Array.isArray(endToolCalls)).toBe(true);
    expect(endToolCalls.some((tc: any) => tc?.id === "call-read-mixed")).toBe(true);
  });

  it("does not create an empty first assistant segment when a tool call arrives before any text", async () => {
    const originalDesktopEnv = process.env.NOLO_DESKTOP;
    process.env.NOLO_DESKTOP = "1";
    desktopStreamEventsOverride = [
      {
        type: "tool",
        event: {
          type: "tool-call",
          round: 0,
          toolCallId: "call-read-1",
          toolName: "readFile",
        },
      },
      {
        type: "tool",
        event: {
          type: "tool-result",
          round: 0,
          toolCallId: "call-read-1",
          toolName: "readFile",
          summary: "file contents here",
          metadata: { path: "/tmp/example.txt" },
        },
      },
      { type: "delta", text: "The file looks good!" },
      {
        type: "done",
        result: {
          content: "The file looks good!",
          model: "gpt-5.4-mini",
          dialogId: "test-1",
          usage: { total_tokens: 12 },
        },
      },
    ];

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: unknown[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: unknown) => {
        const a = action as Record<string, unknown> | null;
        dispatched.push(a);
        if (a?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
              id: "01NOLOAPPBLD000000019KCKT0",
              model: "gpt-5.4-mini",
              provider: "openai",
              apiSource: "platform",
              prompt: "You are Nolo",
              references: [],
            }),
          };
        }
        if (a?.kind === "messageStreamEnd") {
          return { unwrap: async () => ({}) };
        }
        return action;
      },
      rejectWithValue: (value: unknown) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    try {
      await streamAgentChatTurnHandler(
        {
          agentKey: "agent-pub-01NOLOAPPBLD000000019KCKT0",
          userInput: "read /tmp/example.txt",
        },
        thunkApi
      );
    } finally {
      if (originalDesktopEnv === undefined) {
        delete process.env.NOLO_DESKTOP;
      } else {
        process.env.NOLO_DESKTOP = originalDesktopEnv;
      }
    }

    const streamingMessages = dispatched
      .filter(
        (action) =>
          (action as Record<string, unknown>)?.type === "message/streaming"
      )
      .map((action) => (action as Record<string, unknown>)?.payload as Record<string, unknown>);

    const assistantMessages = streamingMessages.filter(
      (m) => m?.role === "assistant"
    );
    // Only one assistant message id — the tool-first case must not create an
    // empty pre-tool segment. Multiple dispatches for the same id are expected
    // (streaming then finalized), so dedupe by id.
    const assistantIds = new Set(
      assistantMessages.map((m) => m?.id).filter((id) => typeof id === "string")
    );
    expect(assistantIds.size).toBe(1);
    const finalizedAssistant = assistantMessages.find(
      (m) => m?.isStreaming === false
    );
    expect(finalizedAssistant?.content).toBe("The file looks good!");
  });

  // ── 流式静默截断修复:reader.read() 提前返回 done:true 但未收到完成信号 ──
  // 三条路径(machine-bound / 本地 CLI / remote)都应走异常终止,而不是当成正常完成。

  it("marks the remote assistant message as an error when the stream ends without a done event (silent truncation)", async () => {
    const originalFetch = globalThis.fetch;
    // 流只发了一条 text,然后就 EOF(done:true),从未收到 done 事件 ——
    // 等价于网络抖动 / keep-alive 超时导致的静默截断。
    const remoteFetchMock = mock(async () =>
      new Response('data: {"type":"text","content":"partial reply"}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        if (action?.kind === "messageStreamEnd") {
          return {
            unwrap: async () => ({
              id: action.payload.messageId,
              content: action.payload.content,
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    let result: any;
    try {
      result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "hello remote",
          serverBase: "https://runtime.example.com",
        } as any,
        thunkApi
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    // 截断应当被拒绝,而不是当成正常完成。
    expect(result).toEqual({
      rejected: true,
      value: expect.stringContaining("被中断"),
    });
    // 走的是异常终止路径:finalizeTransientMessageOnError 带错误标记,
    // 而不是把截断内容当完整回复落库。
    expect(
      dispatched.some(
        (action) =>
          action?.type === "message/finalizeTransientMessageOnError" &&
          typeof action?.payload?.id === "string" &&
          action?.payload?.error
      )
    ).toBe(true);
    // 不应当把截断内容当成完整回复写入数据库。
    const persistedAssistantWrites = writeMock.mock.calls.filter(
      (call) => call[0]?.data?.role === "assistant"
    );
    expect(persistedAssistantWrites).toHaveLength(0);
  });

  it("marks a machine-bound cli assistant message as an error when the stream ends without a done event", async () => {
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async () =>
      new Response('data: {"type":"text","content":"machine partial"}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-5.4",
              apiSource: "cli",
              cliProvider: "copilot",
              prompt: "You are a helpful assistant",
              references: [],
              runtimeBinding: { machineId: "machine-win" },
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    let result: any;
    try {
      result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "list local files",
        } as any,
        thunkApi
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    expect(result).toEqual({
      rejected: true,
      value: expect.stringContaining("被中断"),
    });
    expect(
      dispatched.some(
        (action) =>
          action?.type === "message/finalizeTransientMessageOnError" &&
          typeof action?.payload?.id === "string" &&
          action?.payload?.error
      )
    ).toBe(true);
    const persistedAssistantWrites = writeMock.mock.calls.filter(
      (call) => call[0]?.data?.role === "assistant"
    );
    expect(persistedAssistantWrites).toHaveLength(0);
  });

  it("marks a local cli assistant message as an error when the stream ends without a done payload", async () => {
    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockImplementation(() => ({
      dbKey: "dialog-user-test-1",
      cliSessionId: null,
    }));
    selectPendingUserInputQueueMock.mockReturnValue([]);
    startCliChatSessionMock.mockResolvedValue({
      ok: true,
      sessionId: "cli-session-trunc",
    });
    // 流只发了一条 chunk,然后 EOF(done:true),没有 done payload —— 静默截断。
    createCliChatTurnStreamMock.mockResolvedValue(
      new Response('data: {"chunk":"cli partial"}\n\n', {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-5.4",
              apiSource: "cli",
              cliProvider: "copilot",
              prompt: "You are a helpful assistant",
              references: [],
              // 不绑定机器:走本地 CLI session 路径
            }),
          };
        }
        if (action?.type === "db/patch") {
          return {
            unwrap: async () => action.payload,
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    const result = await streamAgentChatTurnHandler(
      {
        agentKey: "agent-user-test-1",
        userInput: "hello",
      } as any,
      thunkApi
    );

    expect(result).toEqual({
      rejected: true,
      value: expect.stringContaining("被中断"),
    });
    expect(
      dispatched.some(
        (action) =>
          action?.type === "message/finalizeTransientMessageOnError" &&
          typeof action?.payload?.id === "string" &&
          action?.payload?.error
      )
    ).toBe(true);
    const persistedAssistantWrites = writeMock.mock.calls.filter(
      (call) => call[0]?.data?.role === "assistant"
    );
    expect(persistedAssistantWrites).toHaveLength(0);
  });

  it("treats an explicit done event as a normal completion (regression guard for the sawDone fix)", async () => {
    // 对照组:同样 EOF,但流里带了 done 事件 —— 必须当成正常完成持久化,
    // 而不是被新的 sawDone 逻辑误判成截断。
    const originalFetch = globalThis.fetch;
    const remoteFetchMock = mock(async () =>
      new Response(
        'data: {"type":"text","content":"all good"}\n\ndata: {"type":"done","usage":{"total_tokens":3}}\n\n',
        {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }
      )
    );
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        if (action?.kind === "messageStreamEnd") {
          return {
            unwrap: async () => ({
              id: action.payload.messageId,
              content: action.payload.content,
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: new AbortController().signal,
    };

    let result: any;
    try {
      result = await streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "hello",
          serverBase: "https://runtime.example.com",
        } as any,
        thunkApi
      );
    } finally {
      globalThis.fetch = originalFetch;
    }

    // 正常完成:返回 usage,没有 finalizeTransientMessageOnError,且落库了一条 assistant 消息。
    expect(result).toEqual({ usage: { total_tokens: 3 } });
    expect(
      dispatched.some(
        (action) => action?.type === "message/finalizeTransientMessageOnError"
      )
    ).toBe(false);
    const persistedAssistantWrites = writeMock.mock.calls.filter(
      (call) => call[0]?.data?.role === "assistant"
    );
    expect(persistedAssistantWrites).toHaveLength(1);
  });

  it("does not mistake a user abort as a silent truncation (abort must beat done)", async () => {
    // 用户主动 abort:reader.read() 返回 done:true 的同时 signal 已 aborted ——
    // 必须走"用户取消"(aborted 分支),而不是被 sawDone=false 判成连接异常截断。
    // 这是修复的关键不变量:abort 检测必须在 done 判断之前。
    const originalFetch = globalThis.fetch;
    const encoder = new TextEncoder();
    const abortController = new AbortController();
    // 流先吐一段文本,在下一次 reader.read() 返回 done:true 之前先把 signal 置为 aborted。
    // 这样 consumeAgentRunStream 在 reader.read() resolve 出 done:true 时,
    // 会先命中 isAborted() 分支(用户取消),而不是 sawDone=false 的截断分支。
    let pulled = false;
    const stream = new ReadableStream<Uint8Array>({
      async pull(controller) {
        if (!pulled) {
          pulled = true;
          controller.enqueue(
            encoder.encode('data: {"type":"text","content":"partial before abort"}\n\n')
          );
          // 让出控制权,使外层的 queueMicrotask 有机会在 close 前 abort。
          await Promise.resolve();
          controller.close();
          return;
        }
      },
    });
    const remoteFetchMock = mock(async () =>
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );
    globalThis.fetch = remoteFetchMock as unknown as typeof fetch;

    const { streamAgentChatTurnHandler } = await loadModule();
    selectDialogConfigByKeyMock.mockReturnValue(null);
    selectCurrentDialogConfigMock.mockReturnValue({
      dbKey: "dialog-user-test-1",
      referenceKeys: [],
    });
    selectPendingUserInputQueueMock.mockReturnValue([]);

    const dispatched: any[] = [];
    const thunkApi = {
      getState: () => ({}),
      dispatch: (action: any) => {
        dispatched.push(action);
        if (action?.kind === "read") {
          return {
            unwrap: async () => ({
              dbKey: "agent-user-test-1",
              model: "gpt-4o-mini",
              apiSource: "openai",
              prompt: "You are a helpful assistant",
              references: [],
            }),
          };
        }
        if (action?.kind === "messageStreamEnd") {
          return {
            unwrap: async () => ({
              id: action.payload.messageId,
              content: action.payload.content,
            }),
          };
        }
        return action;
      },
      rejectWithValue: (value: any) => ({ rejected: true, value }),
      signal: abortController.signal,
    };

    let result: any;
    try {
      const handle = streamAgentChatTurnHandler(
        {
          agentKey: "agent-user-test-1",
          userInput: "hello",
          serverBase: "https://runtime.example.com",
        } as any,
        thunkApi
      );
      // 在流被消费期间、第二次 reader.read()(返回 done)之前 abort。
      queueMicrotask(() => abortController.abort());
      result = await handle;
    } finally {
      globalThis.fetch = originalFetch;
    }

    // 用户取消:绝不能走"静默截断"路径。
    // 1) 不派发 finalizeTransientMessageOnError(那是截断错误标记)。
    expect(
      dispatched.some(
        (action) => action?.type === "message/finalizeTransientMessageOnError"
      )
    ).toBe(false);
    // 2) 返回值绝不是"被中断"的截断 reject。
    expect(result).not.toEqual({
      rejected: true,
      value: expect.stringContaining("被中断"),
    });
    // 3) abort 返回标记,供 quick-chat 区分「取消」与「启动失败」。
    expect(result).toEqual({ aborted: true });
  });
});
