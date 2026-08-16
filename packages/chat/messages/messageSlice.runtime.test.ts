import { describe, expect, test } from "bun:test";

const MESSAGE_SLICE_MODULE_URL = new URL("./messageSlice.ts", import.meta.url).href;
let moduleVersion = 0;

const loadMessageSliceModule = () =>
  import(`${MESSAGE_SLICE_MODULE_URL}`);

const selectAllFromState = (state: any, dialogId?: string | null) => {
  const dialogState =
    (dialogId && state?.dialogStateById?.[dialogId]) ??
    state?.dialogStateById?.[Object.keys(state?.dialogStateById ?? {})[0]] ??
    state;
  const ids = dialogState?.msgs?.ids ?? [];
  const entities = dialogState?.msgs?.entities ?? {};
  return ids.map((id: string) => entities[id]).filter(Boolean);
};

const messageStreamingAction = (payload: any) => ({
  type: "message/messageStreaming",
  payload,
});

describe("messageSlice runtime isolation", () => {
  test("stores streaming updates in the matching dialog bucket", async () => {
    const {
      default: messageReducer,
      initMsgs,
    } = await loadMessageSliceModule();
    let state = messageReducer(
      undefined,
      initMsgs.pending("req-init", {
        dialogId: "dialog-b",
        limit: 20,
      })
    );

    state = messageReducer(
      state,
      messageStreamingAction({
        id: "msg-a-1",
        dialogId: "dialog-a",
        dbKey: "dialog-dialog-a-msg-msg-a-1",
        role: "assistant",
        content: "background update",
      })
    );

    expect(selectAllFromState(state, "dialog-a")).toHaveLength(1);
    expect(selectAllFromState(state, "dialog-b")).toHaveLength(0);
  });

  test("new-dialog bootstrap does not wipe an optimistic first user message", async () => {
    const {
      default: messageReducer,
      addUserMessage,
      initMsgs,
    } = await loadMessageSliceModule();
    let state = messageReducer(
      undefined,
      initMsgs.pending("req-init-quick", {
        dialogId: "quick-1",
        dialogKey: "dialog-user-quick-1",
        limit: 30,
        isNew: true,
      })
    );

    state = messageReducer(
      state,
      addUserMessage({
        id: "msg-user-1",
        dialogId: "quick-1",
        dbKey: "dialog-quick-1-msg-msg-user-1",
        role: "user",
        content: "hello from quick chat",
      } as any)
    );

    state = messageReducer(
      state,
      initMsgs.fulfilled([], "req-init-quick", {
        dialogId: "quick-1",
        dialogKey: "dialog-user-quick-1",
        limit: 30,
        isNew: true,
      })
    );

    expect(selectAllFromState(state, "quick-1").map((msg: any) => msg.content)).toEqual([
      "hello from quick chat",
    ]);
  });

  test("new-dialog bootstrap does not wipe an optimistic first user message (real race condition order)", async () => {
    const {
      default: messageReducer,
      addUserMessage,
      initMsgs,
    } = await loadMessageSliceModule();
    // 1. 乐观消息先抢先写入
    let state = messageReducer(
      undefined,
      addUserMessage({
        id: "msg-user-1",
        dialogId: "quick-1",
        dbKey: "dialog-quick-1-msg-msg-user-1",
        role: "user",
        content: "hello from quick chat",
      } as any)
    );

    // 2. initMsgs.pending 后发生
    state = messageReducer(
      state,
      initMsgs.pending("req-init-quick", {
        dialogId: "quick-1",
        dialogKey: "dialog-user-quick-1",
        limit: 30,
        isNew: true,
      })
    );

    // 3. initMsgs.fulfilled 后发生
    state = messageReducer(
      state,
      initMsgs.fulfilled([], "req-init-quick", {
        dialogId: "quick-1",
        dialogKey: "dialog-user-quick-1",
        limit: 30,
        isNew: true,
      })
    );

    expect(selectAllFromState(state, "quick-1").map((msg: any) => msg.content)).toEqual([
      "hello from quick chat",
    ]);
  });

  test("re-enter initMsgs merges when local bucket still has a streaming message", async () => {
    const {
      default: messageReducer,
      addUserMessage,
      initMsgs,
      messageStreaming,
    } = await loadMessageSliceModule();
    const { setStreamingMessageId, resetMessageSessionStoreForTests } =
      await import("./messageSessionStore");
    resetMessageSessionStoreForTests();

    let state = messageReducer(
      undefined,
      addUserMessage({
        id: "msg-user-reenter",
        dialogId: "dialog-reenter",
        dbKey: "dialog-dialog-reenter-msg-msg-user-reenter",
        role: "user",
        content: "keep going",
      } as any)
    );
    state = messageReducer(
      state,
      messageStreaming({
        id: "msg-assistant-live",
        dialogId: "dialog-reenter",
        dbKey: "dialog-dialog-reenter-msg-msg-assistant-live",
        role: "assistant",
        content: "partial live tokens",
      } as any)
    );
    setStreamingMessageId("dialog-reenter", "msg-assistant-live");

    state = messageReducer(
      state,
      initMsgs.pending("req-reenter", {
        dialogId: "dialog-reenter",
        dialogKey: "dialog-user-dialog-reenter",
        limit: 30,
        isNew: false,
      })
    );
    // DB lag: only the user message is persisted; replace would wipe the live reply.
    state = messageReducer(
      state,
      initMsgs.fulfilled(
        [
          {
            id: "msg-user-reenter",
            dbKey: "dialog-dialog-reenter-msg-msg-user-reenter",
            role: "user",
            content: "keep going",
          },
        ] as any,
        "req-reenter",
        {
          dialogId: "dialog-reenter",
          dialogKey: "dialog-user-dialog-reenter",
          limit: 30,
          isNew: false,
        }
      )
    );

    const contents = selectAllFromState(state, "dialog-reenter").map(
      (msg: any) => msg.content
    );
    expect(contents).toContain("keep going");
    expect(contents).toContain("partial live tokens");
  });

  test("stores older-message payloads in the requested dialog bucket", async () => {
    const {
      default: messageReducer,
      initMsgs,
      loadOlderMessages,
    } = await loadMessageSliceModule();
    let state = messageReducer(
      undefined,
      initMsgs.pending("req-init-b", {
        dialogId: "dialog-b",
        limit: 20,
      })
    );

    state = messageReducer(
      state,
      loadOlderMessages.pending("req-older-a", {
        dialogId: "dialog-a",
        beforeKey: "dialog-dialog-a-msg-msg-9",
        limit: 30,
      })
    );

    state = messageReducer(
      state,
      loadOlderMessages.fulfilled(
        {
          messages: [
            {
              id: "msg-a-older",
              dbKey: "dialog-dialog-a-msg-msg-a-older",
              role: "assistant",
              content: "older background message",
            } as any,
          ],
          limit: 30,
        },
        "req-older-a",
        {
          dialogId: "dialog-a",
          beforeKey: "dialog-dialog-a-msg-msg-9",
          limit: 30,
        }
      )
    );

    expect(selectAllFromState(state, "dialog-a")).toHaveLength(1);
    expect(selectAllFromState(state, "dialog-b")).toHaveLength(0);
  });

  test("resetMsgs clears only the current dialog bucket by default", async () => {
    const {
      default: messageReducer,
      initMsgs,
      resetMsgs,
    } = await loadMessageSliceModule();
    let state = messageReducer(
      undefined,
      initMsgs.pending("req-init-a", {
        dialogId: "dialog-a",
        limit: 20,
      })
    );

    state = messageReducer(
      state,
      messageStreamingAction({
        id: "msg-a-1",
        dialogId: "dialog-a",
        dbKey: "dialog-dialog-a-msg-msg-a-1",
        role: "assistant",
        content: "dialog a",
      })
    );

    state = messageReducer(
      state,
      messageStreamingAction({
        id: "msg-b-1",
        dialogId: "dialog-b",
        dbKey: "dialog-dialog-b-msg-msg-b-1",
        role: "assistant",
        content: "dialog b",
      })
    );

    state = messageReducer(state, resetMsgs());

    expect(selectAllFromState(state, "dialog-a")).toHaveLength(0);
    expect(selectAllFromState(state, "dialog-b")).toHaveLength(1);
  });

  test("selectors tolerate legacy persisted state without dialogStateById", async () => {
    const {
      selectMessagesLoadingState,
    } = await loadMessageSliceModule();
    const { patchMessageSession, resetMessageSessionStoreForTests } =
      await import("./messageSessionStore");
    resetMessageSessionStoreForTests();
    const legacyState = {
      message: {
        msgs: {
          ids: ["msg-1"],
          entities: {
            "msg-1": {
              id: "msg-1",
              dbKey: "dialog-dialog-a-msg-msg-1",
              role: "assistant",
              content: "legacy",
            },
          },
        },
      },
    } as any;

    expect(selectAllFromState(legacyState.message, "dialog-a")).toHaveLength(1);
    // Wave10: loading flash lives in messageSessionStore, not Redux.
    patchMessageSession("dialog-a", {
      isLoadingInitial: true,
      isLoadingOlder: false,
      hasMoreOlder: false,
      error: null,
    });
    expect(selectMessagesLoadingState(legacyState, "dialog-a")).toEqual({
      isLoadingInitial: true,
      isLoadingOlder: false,
      hasMoreOlder: false,
      error: null,
    });
  });

  test("setMessages default merge keeps final assistant when revalidate snapshot is user-only", async () => {
    const {
      default: messageReducer,
      messageStreaming,
      messageStreamEnd,
      setMessages,
    } = await loadMessageSliceModule();
    const dialogId = "quick-race-1";
    const assistantId = "msg-assistant-race";
    const userId = "msg-user-race";
    const assistantDbKey = `msg:${dialogId}:${assistantId}`;

    let state = messageReducer(
      undefined,
      messageStreaming({
        id: assistantId,
        dialogId,
        dbKey: assistantDbKey,
        role: "assistant",
        content: "hello from stream",
        isStreaming: true,
        agentKey: "agent-a",
        cybotKey: "agent-a",
      } as any)
    );

    state = messageReducer(
      state,
      messageStreamEnd.fulfilled(
        {
          id: assistantId,
          content: "hello from stream",
          thinkContent: "",
          usage: { completion_tokens: 8 },
          agentKey: "agent-a",
          cybotKey: "agent-a",
          dialogId,
          agentName: "A",
        },
        "req-end-race",
        {
          finalContentBuffer: [{ type: "text", text: "hello from stream" }],
          totalUsage: { completion_tokens: 8 },
          msgKey: assistantDbKey,
          agentConfig: { dbKey: "agent-a", provider: "fireworks" },
          dialogId,
          dialogKey: `dialog-user-${dialogId}`,
          messageId: assistantId,
          reasoningBuffer: "",
        }
      )
    );

    state = messageReducer(
      state,
      setMessages({
        dialogId,
        messages: [
          {
            id: userId,
            dbKey: `msg:${dialogId}:${userId}`,
            role: "user",
            content: "hi",
          } as any,
        ],
      })
    );

    const msgs = selectAllFromState(state, dialogId);
    expect(msgs.map((m: any) => m.id).sort()).toEqual([assistantId, userId].sort());
    expect(msgs.find((m: any) => m.id === assistantId)?.content).toBe("hello from stream");
    expect(msgs.find((m: any) => m.id === assistantId)?.isStreaming).toBe(false);
  });

  test("setMessages replace:true replaces the whole bucket", async () => {
    const { default: messageReducer, messageStreaming, setMessages } =
      await loadMessageSliceModule();
    const dialogId = "replace-1";
    let state = messageReducer(
      undefined,
      messageStreaming({
        id: "a1",
        dialogId,
        dbKey: "msg:replace-1:a1",
        role: "assistant",
        content: "will vanish",
        isStreaming: false,
      } as any)
    );

    state = messageReducer(
      state,
      setMessages({
        dialogId,
        messages: [
          {
            id: "u1",
            dbKey: "msg:replace-1:u1",
            role: "user",
            content: "only user",
          } as any,
        ],
        replace: true,
      })
    );

    expect(selectAllFromState(state, dialogId).map((m: any) => m.id)).toEqual(["u1"]);
  });

  test("messageStreamEnd fulfilled restores assistant after resetMsgs clears bucket", async () => {
    const {
      default: messageReducer,
      messageStreaming,
      messageStreamEnd,
      resetMsgs,
    } = await loadMessageSliceModule();
    const dialogId = "01KX1DYX38RT0CN7M1NWR3P0DX";
    const messageId = "msg-assistant-1";
    const dbKey = `msg:${dialogId}:${messageId}`;

    let state = messageReducer(
      undefined,
      messageStreaming({
        id: messageId,
        dialogId,
        dbKey,
        role: "assistant",
        content: "streaming answer",
        isStreaming: true,
        agentKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
        cybotKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
      } as any)
    );

    state = messageReducer(state, resetMsgs({ dialogId }));

    state = messageReducer(
      state,
      messageStreamEnd.fulfilled(
        {
          id: messageId,
          content: "final answer from stream end",
          thinkContent: "",
          usage: { completion_tokens: 12 },
          agentKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
          cybotKey: "agent-pub-01DSV4FLASHPB00000000JFPFD",
          dialogId,
          agentName: "DeepSeek",
        },
        "req-stream-end-restore",
        {
          finalContentBuffer: [{ type: "text", text: "final answer from stream end" }],
          totalUsage: { completion_tokens: 12 },
          msgKey: dbKey,
          agentConfig: { dbKey: "agent-pub-01DSV4FLASHPB00000000JFPFD", provider: "fireworks" },
          dialogId,
          dialogKey: `dialog-user-${dialogId}`,
          messageId,
          reasoningBuffer: "",
        }
      )
    );

    const msgs = selectAllFromState(state, dialogId);
    expect(msgs).toHaveLength(1);
    expect(msgs[0]?.content).toBe("final answer from stream end");
    expect(msgs[0]?.isStreaming).toBe(false);
  });

  test("messageStreamEnd rejection preserves structured content instead of stringifying it", async () => {
    const {
      default: messageReducer,
      messageStreamEnd,
    } = await loadMessageSliceModule();
    let state = messageReducer(
      undefined,
      messageStreamingAction({
        id: "msg-image-1",
        dialogId: "dialog-image",
        dbKey: "dialog-dialog-image-msg-msg-image-1",
        role: "assistant",
        content: [
          {
            type: "image_url",
            image_url: { url: "https://example.com/cat.png" },
          },
        ],
        isStreaming: true,
      } as any)
    );

    state = messageReducer(
      state,
      messageStreamEnd.rejected(
        new Error("save failed"),
        "req-stream-end",
        {
          dialogId: "dialog-image",
          messageId: "msg-image-1",
        } as any
      )
    );

    expect(selectAllFromState(state, "dialog-image")[0]?.content).toEqual([
      {
        type: "image_url",
        image_url: { url: "https://example.com/cat.png" },
      },
      {
        type: "text",
        text: "[Failed to save message]",
      },
    ]);
  });
});
