import { describe, expect, it, mock } from "bun:test";
import { searchDialogMessagesFunc } from "./searchDialogMessagesTool";

mock.module("identity/selectors", () => ({
  selectIdentityToken: (state: any) => state.auth?.currentToken,
  selectIdentityUserId: (state: any) => state.auth?.currentUser?.userId,
  selectIdentityIsLoggedIn: () => true,
  selectIdentityUser: (state: any) => state.auth?.currentUser,
}));

const makeOriginalDialogMessages = () => {
  const dialogId = "01ORIGINALDIALOG0000000001";
  return Array.from({ length: 60 }, (_, index) => {
    const number = index + 1;
    const id = `msg-${String(number).padStart(3, "0")}`;
    const base = {
      id,
      dbKey: `dialog-${dialogId}-msg-${id}`,
      role: number % 2 === 0 ? "assistant" : "user",
      content: `普通项目讨论消息 ${number}`,
      createdAt: `2026-05-01T00:${String(number).padStart(2, "0")}:00.000Z`,
    };

    if (number === 37) {
      return {
        ...base,
        role: "assistant",
        content:
          "关键提醒：不要改 signup 主链路。原因是注册属于高风险转化路径，invite 新功能应该绕开核心注册流程。",
      };
    }

    if (number === 44) {
      return {
        ...base,
        role: "tool",
        toolName: "applyEdit",
        content: JSON.stringify({
          filePath: "packages/signup/invite.ts",
          applied: true,
        }),
      };
    }

    return base;
  });
};

const createDb = (records: any[]) => ({
  iterator(options: { gte: string; lte: string }) {
    return {
      async *[Symbol.asyncIterator]() {
        for (const record of records) {
          if (record.dbKey >= options.gte && record.dbKey <= options.lte) {
            yield [record.dbKey, record];
          }
        }
      },
    };
  },
});

describe("searchDialogMessages user stories", () => {
  it("finds an old original message without loading the whole dialog into the prompt", async () => {
    const db = createDb(makeOriginalDialogMessages());

    const result = await searchDialogMessagesFunc(
      {
        dialogKey: "dialog-user-01ORIGINALDIALOG0000000001",
        query: "signup 主链路 invite 高风险",
        contextMessages: 1,
      },
      { extra: { db } }
    );

    expect(result.rawData.scannedMessages).toBe(60);
    expect(result.rawData.matches).toHaveLength(1);
    expect(result.rawData.matches[0].messageId).toBe("msg-037");
    expect(result.rawData.matches[0].role).toBe("assistant");
    expect(result.rawData.matches[0].content).toContain("不要改 signup 主链路");
    expect(result.rawData.matches[0].context.map((item: any) => item.messageId)).toEqual([
      "msg-036",
      "msg-037",
      "msg-038",
    ]);
    expect(result.displayData).toContain("Found 1 message match");
  });

  it("can audit tool evidence without unrelated chat transcript", async () => {
    const db = createDb(makeOriginalDialogMessages());

    const result = await searchDialogMessagesFunc(
      {
        dialogKey: "dialog-user-01ORIGINALDIALOG0000000001",
        query: "packages/signup/invite.ts",
        role: "tool",
        includeTools: true,
        contextMessages: 0,
      },
      { extra: { db } }
    );

    expect(result.rawData.matches).toHaveLength(1);
    expect(result.rawData.matches[0].messageId).toBe("msg-044");
    expect(result.rawData.matches[0].toolName).toBe("applyEdit");
    expect(result.rawData.matches[0].content).toContain("packages/signup/invite.ts");
    expect(result.rawData.matches[0].context).toHaveLength(1);
  });

  it("falls back to the local runtime server when the browser cache only has recent messages", async () => {
    const originalFetch = globalThis.fetch;
    const originalWindow = (globalThis as any).window;
    const allMessages = makeOriginalDialogMessages();
    const db = createDb(allMessages.slice(-20));
    const fetchMock = mock(async () =>
      new Response(JSON.stringify([...allMessages].reverse()), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    globalThis.fetch = fetchMock as any;
    (globalThis as any).window = { location: { origin: "http://localhost" } };

    try {
      const result = await searchDialogMessagesFunc(
        {
          dialogKey: "dialog-user-01ORIGINALDIALOG0000000001",
          query: "signup 主链路 invite 高风险",
        },
        {
          extra: { db },
          getState: () => ({
            auth: {
              currentUser: { userId: "user" },
              currentToken: "token-demo",
            },
            settings: {
              currentServer: "https://us.nolo.chat",
              syncServers: [],
            }
          }),
        } as any
      );

      expect(fetchMock).toHaveBeenCalled();
      const [url, init] = (fetchMock.mock.calls as any[])[0];
      expect(String(url)).toContain("/rpc/getConvMsgs");
      expect(init).toMatchObject({
        method: "POST",
        headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }),
      });
      expect(result.rawData.scannedMessages).toBe(60);
      expect(result.rawData.matches[0].messageId).toBe("msg-037");
    } finally {
      globalThis.fetch = originalFetch;
      (globalThis as any).window = originalWindow;
    }
  });
});
