import { describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;

async function loadUpdateDialogSummaryAction() {
  const actualAgentSlice = await import("ai/agent/agentSlice");
  const actualDbSlice = await import("database/dbSlice");
  const actualRetention = await import("ai/context/retention");

  const runLlmMock = mock((payload: any) => ({
    type: "runLlm/mock",
    payload,
  }));
  const patchMock = mock((payload: any) => ({
    type: "db/patch/mock",
    payload,
  }));
  const selectByIdMock = mock((state: any, dbKey: string) => state.__dialogRecords[dbKey]);
  const planContextUsageMock = mock(() => ({
    historyBudget: 200,
    rawMessageBudget: 0,
    minTailTokens: 0,
  }));

  mock.module("ai/agent/agentSlice", () => ({
    ...actualAgentSlice,
    runLlm: runLlmMock,
  }));
  mock.module("database/dbSlice", () => ({
    ...actualDbSlice,
    patch: patchMock,
    selectById: selectByIdMock,
  }));
  mock.module("ai/context/retention", () => ({
    ...actualRetention,
    planContextUsage: planContextUsageMock,
  }));

  const mod = await import(`./updateDialogSummaryAction?test=${moduleVersion++}`);
  mock.restore();
  return {
    updateDialogSummaryAction: mod.updateDialogSummaryAction,
    runLlmMock,
    patchMock,
    selectByIdMock,
    planContextUsageMock,
  };
}

describe("updateDialogSummaryAction behavior", () => {
  it("uses the builtin summary model output and persists the new summary payload", async () => {
    const {
      updateDialogSummaryAction,
      runLlmMock,
      patchMock,
      planContextUsageMock,
    } = await loadUpdateDialogSummaryAction();

    const dialogKey = "dialog-01DIALOGSUMMARY0000000001";
    const state = {
      __dialogRecords: {
        [dialogKey]: {
          dbKey: dialogKey,
          summary: "已有摘要",
          referenceKeys: ["page-existing"],
          compressionCount: 2,
        },
      },
    };
    const preFetchedMessages = [
      {
        id: "m1",
        role: "user",
        content: "先记录用户想把标题和摘要模型切到 DeepSeek。",
        usage: { completion_tokens: 100 },
      },
      {
        id: "m2",
        role: "assistant",
        content: "已经完成标题模型切换。",
        usage: { completion_tokens: 100 },
      },
      {
        id: "m3",
        role: "user",
        content: [{ pageKey: "page-roadmap" }],
        usage: { completion_tokens: 100 },
      },
      {
        id: "m4",
        role: "assistant",
        content: { dialogKey: "dialog-related-followup" },
        usage: { completion_tokens: 100 },
      },
      {
        id: "m5",
        role: "user",
        content: "还需要补长期可跑的行为测试。",
        usage: { completion_tokens: 100 },
      },
    ];

    const dispatch = (action: any) => {
      switch (action?.type) {
        case "runLlm/mock":
          return {
            unwrap: async () =>
              "  关键事实档案\n- 标题和摘要都切到 DeepSeek V4 Flash\n对话剧情摘要\n- 已补充行为测试  ",
          };
        case "db/patch/mock":
          return {
            unwrap: async () => ({
              ...state.__dialogRecords[dialogKey],
              ...action.payload.changes,
            }),
          };
        default:
          throw new Error(`Unexpected action: ${JSON.stringify(action)}`);
      }
    };

    await updateDialogSummaryAction(
      { dialogKey, preFetchedMessages },
      { dispatch, getState: () => state }
    );

    expect(planContextUsageMock).toHaveBeenCalledTimes(1);
    expect(runLlmMock).toHaveBeenCalledTimes(1);
    const runLlmPayload = runLlmMock.mock.calls[0]?.[0];
    expect(runLlmPayload).toEqual(
      expect.objectContaining({
        billingDialogKey: dialogKey,
        llmConfig: expect.objectContaining({
          provider: "deepseek",
          model: "deepseek-v4-flash",
        }),
      })
    );
    expect(runLlmPayload.content).toContain("【现有记忆】：\n已有摘要");
    expect(runLlmPayload.content).toContain("user: 先记录用户想把标题和摘要模型切到 DeepSeek。");
    expect(runLlmPayload.content).toContain("assistant: 已经完成标题模型切换。");
    expect(runLlmPayload.content).toContain("user: 还需要补长期可跑的行为测试。");

    expect(patchMock.mock.calls).toEqual([
      [
        {
          dbKey: dialogKey,
          changes: {
            summary:
              "关键事实档案\n- 标题和摘要都切到 DeepSeek V4 Flash\n对话剧情摘要\n- 已补充行为测试",
            summarizedBeforeId: "m5",
            referenceKeys: [
              "page-existing",
              "page-roadmap",
              "dialog-related-followup",
            ],
            compressionCount: 3,
            summaryPending: false,
          },
        },
      ],
    ]);
  });

  it("does not actively summarize completed tasks before context pressure", async () => {
    const {
      updateDialogSummaryAction,
      runLlmMock,
      patchMock,
      planContextUsageMock,
    } = await loadUpdateDialogSummaryAction();

    const dialogKey = "dialog-01DIALOGSUMMARY0000000004";
    planContextUsageMock.mockImplementationOnce(() => ({
      historyBudget: 999999,
      rawMessageBudget: 0,
      minTailTokens: 0,
    }));

    const state = {
      __dialogRecords: {
        [dialogKey]: {
          dbKey: dialogKey,
          summary: "正式旧摘要",
          referenceKeys: [],
          compressionCount: 0,
        },
      },
    };
    const preFetchedMessages = Array.from({ length: 12 }, (_, index) => ({
      id: `m${index + 1}`,
      role: index === 2 ? "tool" : index % 2 === 0 ? "user" : "assistant",
      content: `第 ${index + 1} 条任务阶段消息`,
      usage: { completion_tokens: 1500 },
    }));

    const dispatch = (action: any) => {
      switch (action?.type) {
        case "runLlm/mock":
          return {
            unwrap: async () => "关键事实档案\n- 任务完成后正式归档\n对话剧情摘要\n- 保留尾部两条原文",
          };
        case "db/patch/mock":
          return { unwrap: async () => ({ ok: true }) };
        default:
          throw new Error(`Unexpected action: ${JSON.stringify(action)}`);
      }
    };

    await updateDialogSummaryAction(
      { dialogKey, preFetchedMessages, force: true, reason: "task_completed" },
      { dispatch, getState: () => state }
    );

    expect(runLlmMock).toHaveBeenCalledTimes(0);
    expect(patchMock).toHaveBeenCalledTimes(0);
  });

  it("still lets manual compaction run a formal summary", async () => {
    const {
      updateDialogSummaryAction,
      runLlmMock,
      patchMock,
      planContextUsageMock,
    } = await loadUpdateDialogSummaryAction();

    const dialogKey = "dialog-01DIALOGSUMMARY0000000004B";
    planContextUsageMock.mockImplementationOnce(() => ({
      historyBudget: 999999,
      rawMessageBudget: 0,
      minTailTokens: 0,
    }));

    const state = {
      __dialogRecords: {
        [dialogKey]: {
          dbKey: dialogKey,
          summary: "正式旧摘要",
          referenceKeys: [],
          compressionCount: 0,
        },
      },
    };
    const preFetchedMessages = Array.from({ length: 12 }, (_, index) => ({
      id: `m${index + 1}`,
      role: index === 2 ? "tool" : index % 2 === 0 ? "user" : "assistant",
      content: `第 ${index + 1} 条任务阶段消息`,
      usage: { completion_tokens: 1500 },
    }));

    const dispatch = (action: any) => {
      switch (action?.type) {
        case "runLlm/mock":
          return {
            unwrap: async () => "关键事实档案\n- 手动归档\n对话剧情摘要\n- 保留尾部两条原文",
          };
        case "db/patch/mock":
          return { unwrap: async () => ({ ok: true }) };
        default:
          throw new Error(`Unexpected action: ${JSON.stringify(action)}`);
      }
    };

    await updateDialogSummaryAction(
      { dialogKey, preFetchedMessages, force: true, reason: "manual" },
      { dispatch, getState: () => state }
    );

    expect(runLlmMock).toHaveBeenCalledTimes(1);
    expect(runLlmMock.mock.calls[0]?.[0].content).toContain("正式旧摘要");
    expect(runLlmMock.mock.calls[0]?.[0].content).toContain("第 1 条任务阶段消息");
    expect(runLlmMock.mock.calls[0]?.[0].content).toContain("第 10 条任务阶段消息");
    expect(runLlmMock.mock.calls[0]?.[0].content).not.toContain("第 11 条任务阶段消息");
    expect(runLlmMock.mock.calls[0]?.[0].content).not.toContain("第 12 条任务阶段消息");
    expect(patchMock.mock.calls[0]?.[0].changes).toEqual(
      expect.objectContaining({
        summary: "关键事实档案\n- 手动归档\n对话剧情摘要\n- 保留尾部两条原文",
        summarizedBeforeId: "m10",
        compressionCount: 1,
        summaryPending: false,
      })
    );
  });

  it("does not actively summarize short completed tasks", async () => {
    const {
      updateDialogSummaryAction,
      runLlmMock,
      patchMock,
      planContextUsageMock,
    } = await loadUpdateDialogSummaryAction();

    const dialogKey = "dialog-01DIALOGSUMMARY0000000005";
    planContextUsageMock.mockImplementationOnce(() => ({
      historyBudget: 999999,
      rawMessageBudget: 0,
      minTailTokens: 0,
    }));

    const state = {
      __dialogRecords: {
        [dialogKey]: {
          dbKey: dialogKey,
          summary: "正式旧摘要",
        },
      },
    };
    const preFetchedMessages = Array.from({ length: 10 }, (_, index) => ({
      id: `m${index + 1}`,
      role: index % 2 === 0 ? "user" : "assistant",
      content: `阶段推进 ${index + 1}`,
      usage: { completion_tokens: 500 },
    }));

    const dispatch = (action: any) => {
      switch (action?.type) {
        case "runLlm/mock":
          return { unwrap: async () => "不应该触发" };
        case "db/patch/mock":
          return { unwrap: async () => ({ ok: true }) };
        default:
          throw new Error(`Unexpected action: ${JSON.stringify(action)}`);
      }
    };

    await updateDialogSummaryAction(
      { dialogKey, preFetchedMessages, force: true, reason: "task_completed" },
      { dispatch, getState: () => state }
    );

    expect(runLlmMock).toHaveBeenCalledTimes(0);
    expect(patchMock).toHaveBeenCalledTimes(0);
  });

  it("respects expanded Qwen 3.6 local context windows before forcing an active summary", async () => {
    const {
      updateDialogSummaryAction,
      runLlmMock,
      patchMock,
      planContextUsageMock,
    } = await loadUpdateDialogSummaryAction();

    const dialogKey = "dialog-01DIALOGSUMMARY0000000006";
    const qwenAgentKey = "agent-user-qwen";
    planContextUsageMock.mockImplementationOnce(() => ({
      historyBudget: 999999,
      rawMessageBudget: 0,
      minTailTokens: 0,
    }));

    const state = {
      __dialogRecords: {
        [dialogKey]: {
          dbKey: dialogKey,
          summary: "正式旧摘要",
          cybots: [qwenAgentKey],
        },
        [qwenAgentKey]: {
          dbKey: qwenAgentKey,
          model: "Qwen3.6-27B-Q3_K_M.gguf",
        },
      },
    };
    const preFetchedMessages = Array.from({ length: 14 }, (_, index) => ({
      id: `m${index + 1}`,
      role: index === 3 ? "tool" : index % 2 === 0 ? "user" : "assistant",
      content: `Qwen 262k 下第 ${index + 1} 条消息`,
      usage: { completion_tokens: 550 },
    }));

    const dispatch = (action: any) => {
      switch (action?.type) {
        case "runLlm/mock":
          return { unwrap: async () => "不应该触发" };
        case "db/patch/mock":
          return { unwrap: async () => ({ ok: true }) };
        default:
          throw new Error(`Unexpected action: ${JSON.stringify(action)}`);
      }
    };

    await updateDialogSummaryAction(
      { dialogKey, preFetchedMessages, force: true, reason: "task_completed" },
      { dispatch, getState: () => state }
    );

    expect(runLlmMock).toHaveBeenCalledTimes(0);
    expect(patchMock).toHaveBeenCalledTimes(0);
  });
});
