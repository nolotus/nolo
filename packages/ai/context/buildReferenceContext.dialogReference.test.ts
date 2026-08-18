import { describe, expect, it, mock } from "bun:test";
import { estimateTokenCount } from "./tokenUtils";
import { DataType } from "create/types";

let moduleVersion = 0;

const makeOriginalDialogMessages = () => {
  const messages = Array.from({ length: 60 }, (_, index) => {
    const number = index + 1;
    return {
      id: `msg-${String(number).padStart(3, "0")}`,
      dbKey: `dialog-01ORIGINALDIALOG0000000001-msg-msg-${String(number).padStart(3, "0")}`,
      role: number % 2 === 0 ? "assistant" : "user",
      content: `普通项目讨论消息 ${number}：这里包含一段较长的设计讨论，用来模拟真实原始对话中的背景、约束、备选方案和取舍说明。`,
      createdAt: `2026-05-01T00:${String(number).padStart(2, "0")}:00.000Z`,
    };
  });

  messages[36] = {
    ...messages[36],
    role: "assistant",
    content:
      "关键提醒：不要改 signup 主链路。原因是注册属于高风险转化路径，invite 新功能应该绕开核心注册流程。",
  };

  messages[43] = {
    ...messages[43],
    role: "tool",
    toolName: "applyEdit",
    content: JSON.stringify({
      filePath: "packages/signup/invite.ts",
      applied: true,
    }),
  } as any;

  return messages;
};

async function loadFetchReferenceContents(recentMessages: any[]) {
  const actualRuntimeServerContext = await import("database/runtimeServerContext");

  mock.module("database/dbSlice", () => ({
    read: (payload: any) => ({ kind: "read", payload }),
  }));

  mock.module("database/runtimeServerContext", () => ({
    ...actualRuntimeServerContext,
    getRuntimeServerContext: () => ({
      currentToken: "token",
      remoteServers: [],
    }),
  }));

  let requestedLimit: number | undefined;
  mock.module("chat/messages/fetchAndCacheMessages", () => ({
    fetchAndCacheMessages: async (args: any) => {
      requestedLimit = args.limit;
      return recentMessages;
    },
  }));

  const mod = await import(`./buildReferenceContext.ts`);
  mock.restore();
  return {
    fetchReferenceContents: mod.fetchReferenceContents,
    getRequestedLimit: () => requestedLimit,
  };
}

describe("dialog reference user stories", () => {
  it("builds a conversation reference that supports resume/reference stories without loading irrelevant early history", async () => {
    const allMessages = makeOriginalDialogMessages();
    const recentMessages = allMessages.slice(-20).reverse();
    const { fetchReferenceContents, getRequestedLimit } =
      await loadFetchReferenceContents(recentMessages);

    const dialogKey = "dialog-user-01ORIGINALDIALOG0000000001";
    const dialogRecord = {
      type: DataType.DIALOG,
      dbKey: dialogKey,
      title: "原始对话：signup 风险和 invite 方案",
      status: "done",
      summary:
        "关键事实档案：讨论过 signup 风险和 invite 方案。对话剧情摘要：团队倾向保守处理注册链路。最近阶段集中在 invite 独立实现和文档整理，避免扩大注册路径改动。",
      runtimeCheckpoint: {
        status: "done",
        lastUserInput: "继续整理 invite 方案",
        lastAssistantText: "下一步是补 invite 旁路实现，并保留 signup 主链路稳定。",
        lastToolNames: ["applyEdit"],
        availableToolNames: ["read", "searchDialogMessages", "applyEdit"],
      },
    };

    const dispatched: any[] = [];
    const dispatch = (action: any) => {
      dispatched.push(action);
      if (typeof action === "function") {
        return action(
          dispatch,
          () => ({}),
          {
            db: {},
          }
        );
      }
      if (action?.kind === "read") return { unwrap: async () => dialogRecord };
      return { unwrap: async () => null };
    };

    const result = await fetchReferenceContents([dialogKey], dispatch as any);
    const content = result.get(dialogKey) ?? "";

    expect(getRequestedLimit()).toBe(20);
    expect(content).toContain("Conversation Reference:");
    expect(content).toContain("Conversation Handoff:");
    expect(content).toContain("Runtime Checkpoint:");
    expect(content).toContain("Passive Summary (compressed history, not original wording):");
    expect(content).toContain("Recent Transcript (original message excerpts");
    expect(content).toContain("Original Message Lookup Policy:");
    expect(content).toContain("who said what");
    expect(content).toContain("files/tools mentioned earlier");
    expect(content).toContain("searchDialogMessages");
    expect(content).toContain("Loaded Recent Messages: 20");
    expect(content).toContain("lastToolNames: applyEdit");

    // The exact old target message is intentionally outside the reference payload.
    // This keeps the default token load useful for resume/reference stories without pretending it is full history.
    expect(content).not.toContain("不要改 signup 主链路");

    const fullHistoryText = allMessages.map((message) => message.content).join("\n");
    const referenceTokens = estimateTokenCount(content);
    const fullHistoryTokens = estimateTokenCount(fullHistoryText);
    expect(referenceTokens).toBeLessThan(fullHistoryTokens);
  });

  it("keeps multiple attached dialogs as separate handoff contexts", async () => {
    const allMessages = makeOriginalDialogMessages();
    const recentMessages = allMessages.slice(-20).reverse();
    const { fetchReferenceContents } = await loadFetchReferenceContents(recentMessages);
    const firstDialogKey = "dialog-user-01ORIGINALDIALOG0000000001";
    const secondDialogKey = "dialog-user-01SECONDDIALOG0000000002";
    const preloaded = new Map<string, any>([
      [
        firstDialogKey,
        {
          type: DataType.DIALOG,
          dbKey: firstDialogKey,
          title: "原始对话：signup 风险和 invite 方案",
          status: "done",
          summary: "关键事实档案：signup 主链路风险。",
        },
      ],
      [
        secondDialogKey,
        {
          type: DataType.DIALOG,
          dbKey: secondDialogKey,
          title: "原始对话：pricing 方案和发布计划",
          status: "done",
          summary: "最近阶段集中在 pricing 文档和发布检查。",
        },
      ],
    ]);

    const result = await fetchReferenceContents(
      [firstDialogKey, secondDialogKey],
      ((action: any) => {
        if (typeof action === "function") {
          return action(
            () => null,
            () => ({}),
            {
              db: {},
            }
          );
        }
        return { unwrap: async () => null };
      }) as any,
      { preloaded }
    );

    expect(result.size).toBe(2);
    expect(result.get(firstDialogKey)).toContain(`DB Key: ${firstDialogKey}`);
    expect(result.get(secondDialogKey)).toContain(`DB Key: ${secondDialogKey}`);
    expect(result.get(firstDialogKey)).toContain("signup 主链路风险");
    expect(result.get(secondDialogKey)).toContain("pricing 文档和发布检查");
    expect(result.get(firstDialogKey)).toContain(`searchDialogMessages({ dialogKey: "${firstDialogKey}"`);
    expect(result.get(secondDialogKey)).toContain(`searchDialogMessages({ dialogKey: "${secondDialogKey}"`);
  });
});
