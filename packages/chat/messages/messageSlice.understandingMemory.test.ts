import { afterEach, describe, expect, it, mock } from "bun:test";

let moduleVersion = 0;
let keysVersion = 0;

const loadUnderstandingTestModules = async () => {
  const actualKeys = await import(
    new URL(`../../database/keys.ts?actual=${keysVersion++}`, import.meta.url).href
  );
  const actualAuthSlice = await import(
    new URL(`../../auth/authSlice.ts?actual=${moduleVersion}`, import.meta.url).href
  );
  mock.module("database/keys", () => actualKeys);
  mock.module("auth/authSlice", () => ({
    ...actualAuthSlice,
    selectUserId: (state: any) => state.auth?.currentUser?.userId ?? null,
  }));
  mock.module("identity/selectors", () => ({
    selectIdentityToken: (state: any) => state.auth?.currentToken,
    selectIdentityUserId: (state: any) => state.auth?.currentUser?.userId ?? null,
    selectIdentityIsLoggedIn: () => true,
    selectIdentityUser: (state: any) => state.auth?.currentUser ?? null,
  }));
  const messageSlice = await import(`./messageSlice.ts?test=${moduleVersion}`);
  mock.restore();
  moduleVersion += 1;
  return { messageSlice };
};

/**
 * Capture must go to the server, not the client DB: recall reads the server
 * store, so a local write is invisible to every later turn. These tests assert
 * the outbound request rather than a local row — asserting a local row is what
 * let the split-brain ship green.
 */
const authedState = (messageState: any, extra?: Record<string, any>) => ({
  auth: {
    currentUser: { userId: "user-1" },
    currentToken: "token-1",
  },
  settings: { currentServer: "https://nolo.example" },
  message: messageState,
  ...extra,
});

describe("messageSlice understanding memory capture", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.restore();
  });

  it("posts completed UI chat turns to the server capture endpoint", async () => {
    const {
      messageSlice: {
        default: messageReducer,
        addUserMessage,
        captureUnderstandingFromCompletedUiTurn,
      },
    } = await loadUnderstandingTestModules();

    const calls: Array<{ url: string; body: any; auth?: string }> = [];
    globalThis.fetch = (async (url: any, init: any) => {
      calls.push({
        url: String(url),
        body: JSON.parse(init?.body ?? "{}"),
        auth: init?.headers?.Authorization,
      });
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }) as any;

    const userText =
      "我现在真正纠结的是：第一阶段先只上 transactional，还是一开始就搭 marketing 分组体系。";
    const messageState = messageReducer(
      undefined,
      addUserMessage({
        id: "user-msg-1",
        dialogId: "dialog-1",
        dbKey: "dialog-dialog-1-msg-user-msg-1",
        role: "user",
        content: userText,
      } as any)
    );

    await captureUnderstandingFromCompletedUiTurn({
      state: authedState(messageState, {
        db: {
          ids: ["dialog-user-1-dialog-1"],
          entities: {
            "dialog-user-1-dialog-1": {
              dbKey: "dialog-user-1-dialog-1",
              spaceId: "space-1",
            },
          },
        },
      }),
      agentKey: "agent-email",
      dialogId: "dialog-1",
      dialogKey: "dialog-user-1-dialog-1",
      assistantText:
        "所以你卡的点不是能不能发邮件，而是稳定可信的首体验与更强运营能力之间的取舍。",
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://nolo.example/api/memory/capture-turn");
    expect(calls[0].auth).toBe("Bearer token-1");
    expect(calls[0].body.agentKey).toBe("agent-email");
    expect(calls[0].body.dialogId).toBe("dialog-1");
    expect(calls[0].body.userInput).toBe(userText);
    expect(calls[0].body.assistantText).toContain("稳定可信的首体验");
    // spaceId resolves from the dialog record, not just the explicit argument.
    expect(calls[0].body.spaceId).toBe("space-1");
  }, 10_000);

  it("skips understanding capture for tool-call intermediates", async () => {
    const {
      messageSlice: {
        default: messageReducer,
        addUserMessage,
        captureUnderstandingFromCompletedUiTurn,
      },
    } = await loadUnderstandingTestModules();

    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    }) as any;

    const messageState = messageReducer(
      undefined,
      addUserMessage({
        id: "user-msg-2",
        dialogId: "dialog-2",
        dbKey: "dialog-dialog-2-msg-user-msg-2",
        role: "user",
        content: "先帮我读一下这个空间里的资料。",
      } as any)
    );

    await captureUnderstandingFromCompletedUiTurn({
      state: authedState(messageState, { db: { ids: [], entities: {} } }),
      agentKey: "agent-email",
      dialogId: "dialog-2",
      assistantText: "我先调用工具看一下。",
      toolCalls: [
        {
          id: "call-1",
          type: "function",
          function: { name: "readSpace", arguments: "{}" },
        },
      ],
    });

    expect(fetchCalled).toBe(false);
  });

  it("skips capture when the session has no server or token to write to", async () => {
    const {
      messageSlice: {
        default: messageReducer,
        addUserMessage,
        captureUnderstandingFromCompletedUiTurn,
      },
    } = await loadUnderstandingTestModules();

    let fetchCalled = false;
    globalThis.fetch = (async () => {
      fetchCalled = true;
      return new Response("{}", { status: 200 });
    }) as any;

    const messageState = messageReducer(
      undefined,
      addUserMessage({
        id: "user-msg-3",
        dialogId: "dialog-3",
        dbKey: "dialog-dialog-3-msg-user-msg-3",
        role: "user",
        content: "我更喜欢先看结论再看推理。",
      } as any)
    );

    await captureUnderstandingFromCompletedUiTurn({
      state: {
        auth: { currentUser: { userId: "user-1" } },
        settings: { currentServer: "https://nolo.example" },
        message: messageState,
      } as any,
      agentKey: "agent-email",
      dialogId: "dialog-3",
      assistantText: "明白，之后都先给结论。",
    });

    expect(fetchCalled).toBe(false);
  });
});
