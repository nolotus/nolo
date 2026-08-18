import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { configureStore } from "@reduxjs/toolkit";

const writeMock = mock((payload: any) => ({
  type: "db/write",
  payload,
}));
const addToolMessageMock = mock((payload: any) => ({
  type: "message/addToolMessage",
  payload,
}));
const updateToolMessageMock = mock((payload: any) => ({
  type: "message/updateToolMessage",
  payload,
}));
const streamAgentChatTurnMock = mock((payload: any) => ({
  type: "agent/streamAgentChatTurn",
  payload,
}));
const toolExecutorMock = mock();

let moduleVersion = 0;
let keysVersion = 0;

async function loadModule() {
  const actualDbSlice = await import("database/dbSlice");
  const actualAgentSlice = await import("ai/agent/agentSlice");
  const actualMessageSlice = await import("./messageSlice");
  const actualTools = await import("ai/tools");
  const actualKeys = await import(
    new URL(`../../database/keys.ts?actual=${keysVersion++}`, import.meta.url).href
  );

  mock.module("database/dbSlice", () => ({
    ...actualDbSlice,
    write: writeMock,
  }));

  mock.module("database/keys", () => ({
    ...actualKeys,
  }));

  mock.module("ai/tools", () => ({
    ...actualTools,
    findToolExecutor: () => ({
      canonicalName: "runStreamingAgent",
      executor: toolExecutorMock,
    }),
    toolDefinitionsByName: {
      runStreamingAgent: {
        behavior: "orchestrator",
        interaction: "auto",
      },
    },
  }));

  mock.module("ai/tools/toolRunStore", () => ({
    toolRunStarted: (payload: any) => payload,
    toolRunSucceeded: (payload: any) => payload,
    toolRunFailed: (payload: any) => payload,
    toolRunSetPending: (payload: any) => payload,
    createToolRunId: () => "tool-run-1",
  }));

  mock.module("ai/tools/toolResultError", () => ({
    getToolResultErrorData: () => undefined,
  }));

  mock.module("ai/agent/agentSlice", () => ({
    ...actualAgentSlice,
    streamAgentChatTurn: streamAgentChatTurnMock,
  }));

  mock.module("./messageSlice", () => ({
    ...actualMessageSlice,
    addToolMessage: addToolMessageMock,
    updateToolMessage: updateToolMessageMock,
  }));

  const mod = await import(`./toolThunks.ts`);
  mock.restore();
  return mod;
}

describe("handleToolCalls runStreamingAgent", () => {
  beforeEach(() => {
    writeMock.mockClear();
    addToolMessageMock.mockClear();
    updateToolMessageMock.mockClear();
    streamAgentChatTurnMock.mockClear();
    toolExecutorMock.mockReset();
  });

  afterEach(() => {
    mock.restore();
  });

  it("preserves serverBase when runStreamingAgent hands off to streamAgentChatTurn", async () => {
    toolExecutorMock.mockResolvedValue({
      rawData: {
        agentKey: "agent-runtime",
        userInput: "question",
        serverBase: "https://runtime.example.com",
      },
      displayData: "将调用 Agent(agent-runtime) 执行一轮流式对话",
    });

    const { handleToolCalls } = await loadModule();
    const store = configureStore({
      reducer: () => ({}),
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: false,
          immutableCheck: false,
        }),
    });

    const result = await store.dispatch(
      handleToolCalls({
        accumulatedCalls: [
          {
            id: "call-stream-1",
            function: {
              name: "runStreamingAgent",
              arguments: JSON.stringify({
                agentKey: "agent-runtime",
                userInput: "question",
                serverBase: "https://runtime.example.com",
              }),
            },
          },
        ],
        currentContentBuffer: [],
        agentConfig: { dbKey: "agent-parent" },
        messageId: "assistant-msg-3",
        dialogId: "dialog-1",
        dialogKey: "dialog-user-1",
      }) as any
    ) as any;

    expect(handleToolCalls.fulfilled.match(result)).toBe(true);
    expect(result.payload.hasHandedOff).toBe(true);
    expect(streamAgentChatTurnMock).toHaveBeenCalledWith(
      expect.objectContaining({
        agentKey: "agent-runtime",
        userInput: "question",
        dialogKey: "dialog-user-1",
        serverBase: "https://runtime.example.com",
      })
    );
    expect(streamAgentChatTurnMock).toHaveBeenCalledWith(
      expect.not.objectContaining({
        runtimeOptions: expect.anything(),
      })
    );
  });
});
