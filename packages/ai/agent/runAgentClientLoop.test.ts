import { describe, expect, it, mock } from "bun:test";
import { fileURLToPath } from "node:url";

const realDbSlice = await import("database/dbSlice");
const realSettingSlice = await import("app/settings/settingSlice");
const realAuthSlice = await import("auth/authSlice");

const readMock = mock((input: any) => ({ kind: "read", input }));
const performFetchRequestMock = mock(async () => ({
  json: async () => ({}),
}));
const executeToolCallMock = mock(async () => "tool-result");
const updateTokensActionMock = mock(async () => undefined);

let moduleVersion = 0;
const dbSlicePath = fileURLToPath(
  new URL("../../database/dbSlice.ts", import.meta.url)
);
const settingSlicePath = fileURLToPath(
  new URL("../../app/settings/settingSlice.tsx", import.meta.url)
);
const authSlicePath = fileURLToPath(
  new URL("../../auth/authSlice.ts", import.meta.url)
);

async function loadRunAgentClientLoop() {
  mock.module("database/dbSlice", () => ({
    ...realDbSlice,
    read: readMock,
  }));
  mock.module(dbSlicePath, () => ({
    ...realDbSlice,
    read: readMock,
  }));

  mock.module("app/settings/settingSlice", () => ({
    ...realSettingSlice,
    selectCurrentServer: () => "http://localhost",
  }));
  mock.module(settingSlicePath, () => ({
    ...realSettingSlice,
    selectCurrentServer: () => "http://localhost",
  }));

  mock.module("auth/authSlice", () => ({
    ...realAuthSlice,
    selectCurrentToken: () => "token",
  }));
  mock.module(authSlicePath, () => ({
    ...realAuthSlice,
    selectCurrentToken: () => "token",
  }));

  mock.module("ai/agent/fetchAgentContexts", () => ({
    fetchAgentContexts: async () => ({}),
  }));
  mock.module("ai/llm/generateRequestBody", () => ({
    generateRequestBody: () => ({
      messages: [{ role: "system", content: "system" }],
    }),
  }));
  mock.module("ai/chat/fetchUtils", () => ({
    performFetchRequest: performFetchRequestMock,
  }));
  mock.module("ai/agent/executeToolCall", () => ({
    executeToolCall: executeToolCallMock,
  }));
  mock.module("chat/dialog/actions/updateTokensAction", () => ({
    updateTokensAction: updateTokensActionMock,
  }));

  const module = await import(`./runAgentClientLoop.ts`);
  mock.restore();
  return module.runAgentClientLoop;
}

describe("runAgentClientLoop", () => {
  it("stops after the same tool call fails with the same error three times", async () => {
    const runAgentClientLoop = await loadRunAgentClientLoop();
    readMock.mockClear();
    performFetchRequestMock.mockClear();
    executeToolCallMock.mockClear();
    updateTokensActionMock.mockClear();

    const repeatedToolCall = {
      id: "tool-1",
      function: { name: "addTableRow", arguments: JSON.stringify({ values: { content: "slow" } }) },
    };
    const responses = [1, 2, 3].map(() => ({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            role: "assistant",
            content: "",
            tool_calls: [repeatedToolCall],
          },
        },
      ],
    }));

    performFetchRequestMock.mockImplementation(async () => {
      const next = responses.shift();
      if (!next) {
        throw new Error("unexpected extra fetch");
      }
      return { json: async () => next };
    });
    executeToolCallMock.mockResolvedValue(
      JSON.stringify({ ok: false, error: "tenantId 必传。" })
    );

    const result = await runAgentClientLoop(
      {
        agentKey: "agent-db-key",
        content: "record feedback",
      },
      {
        dispatch: mock((action: any) => {
          if (action.kind === "read") {
            return {
              unwrap: async () => ({
                dbKey: "agent-db-key",
                id: "agent-id",
                provider: "custom",
                model: "gpt-5.4-mini",
                customProviderUrl: "http://localhost/api/chat",
                references: [],
              }),
            };
          }
          throw new Error(`unexpected action: ${JSON.stringify(action)}`);
        }),
        getState: () => ({}),
      } as any
    );

    expect(result.toolCallCount).toBe(3);
    expect(result.content).toContain("已停止工具循环");
    expect(performFetchRequestMock).toHaveBeenCalledTimes(3);
    expect(executeToolCallMock).toHaveBeenCalledTimes(3);
  });

  it("does not stop repeated tool failures when the arguments change", async () => {
    const runAgentClientLoop = await loadRunAgentClientLoop();
    readMock.mockClear();
    performFetchRequestMock.mockClear();
    executeToolCallMock.mockClear();
    updateTokensActionMock.mockClear();

    const responses = [
      ...[1, 2, 3].map((index) => ({
        choices: [
          {
            finish_reason: "tool_calls",
            message: {
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: `tool-${index}`,
                  function: {
                    name: "addTableRow",
                    arguments: JSON.stringify({ values: { content: `row ${index}` } }),
                  },
                },
              ],
            },
          },
        ],
      })),
      {
        choices: [
          {
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: "done",
            },
          },
        ],
      },
    ];

    performFetchRequestMock.mockImplementation(async () => {
      const next = responses.shift();
      if (!next) {
        throw new Error("unexpected extra fetch");
      }
      return { json: async () => next };
    });
    executeToolCallMock.mockResolvedValue(
      JSON.stringify({ ok: false, error: "tenantId 必传。" })
    );

    const result = await runAgentClientLoop(
      {
        agentKey: "agent-db-key",
        content: "record rows",
      },
      {
        dispatch: mock((action: any) => {
          if (action.kind === "read") {
            return {
              unwrap: async () => ({
                dbKey: "agent-db-key",
                id: "agent-id",
                provider: "custom",
                model: "gpt-5.4-mini",
                customProviderUrl: "http://localhost/api/chat",
                references: [],
              }),
            };
          }
          throw new Error(`unexpected action: ${JSON.stringify(action)}`);
        }),
        getState: () => ({}),
      } as any
    );

    expect(result).toEqual({
      content: "done",
      toolCallCount: 3,
    });
    expect(performFetchRequestMock).toHaveBeenCalledTimes(4);
    expect(executeToolCallMock).toHaveBeenCalledTimes(3);
  });

  it("bills every non-streaming agent round back to the parent dialog when requested", async () => {
    const runAgentClientLoop = await loadRunAgentClientLoop();
    readMock.mockClear();
    performFetchRequestMock.mockClear();
    executeToolCallMock.mockClear();
    updateTokensActionMock.mockClear();

    const usageRecords = [
      {
        prompt_tokens: 120,
        completion_tokens: 12,
        total_tokens: 132,
        prompt_cache_hit_tokens: 0,
        prompt_cache_miss_tokens: 120,
      },
      {
        prompt_tokens: 40,
        completion_tokens: 8,
        total_tokens: 48,
        prompt_cache_hit_tokens: 0,
        prompt_cache_miss_tokens: 40,
      },
    ];

    const responses = [
      {
        choices: [
          {
            finish_reason: "tool_calls",
            message: {
              role: "assistant",
              content: "",
              tool_calls: [{ id: "tool-1", function: { name: "demo", arguments: "{}" } }],
            },
          },
        ],
        usage: usageRecords[0],
      },
      {
        choices: [
          {
            finish_reason: "stop",
            message: {
              role: "assistant",
              content: "done",
            },
          },
        ],
        usage: usageRecords[1],
      },
    ];

    performFetchRequestMock.mockImplementation(async () => {
      const next = responses.shift();
      if (!next) {
        throw new Error("unexpected extra fetch");
      }
      return {
        json: async () => next,
      };
    });

    const agentConfig = {
      dbKey: "agent-db-key",
      id: "agent-id",
      provider: "custom",
      model: "gpt-5.4-mini",
      customProviderUrl: "http://localhost/api/chat",
      references: [],
    };

    const dispatch = mock((action: any) => {
      if (action.kind === "read") {
        return {
          unwrap: async () => agentConfig,
        };
      }
      throw new Error(`unexpected action: ${JSON.stringify(action)}`);
    });

    const result = await runAgentClientLoop(
      {
        agentKey: "agent-db-key",
        content: "summarize this",
        billingDialogKey: "dialog-user1-01KABCDEFGHJKMNPQRSTUVWX",
      },
      {
        dispatch,
        getState: () => ({}),
      } as any
    );

    expect(result).toEqual({
      content: "done",
      toolCallCount: 1,
    });
    expect((executeToolCallMock.mock.calls as any[])[0]?.[2]).toEqual({
      parentMessageId: undefined,
      agentKey: "agent-db-key",
    });
    expect(updateTokensActionMock.mock.calls).toHaveLength(2);
    expect((updateTokensActionMock.mock.calls as any[]).map(([args]) => args)).toEqual([
      expect.objectContaining({
        dialogKey: "dialog-user1-01KABCDEFGHJKMNPQRSTUVWX",
        usage: usageRecords[0],
      }),
      expect.objectContaining({
        dialogKey: "dialog-user1-01KABCDEFGHJKMNPQRSTUVWX",
        usage: usageRecords[1],
      }),
    ]);
  });
});
