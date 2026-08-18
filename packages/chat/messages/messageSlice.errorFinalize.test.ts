import { describe, expect, test } from "bun:test";

const MESSAGE_SLICE_MODULE_URL = new URL("./messageSlice.ts", import.meta.url).href;
let moduleVersion = 0;

const loadMessageSliceModule = () =>
  import(`${MESSAGE_SLICE_MODULE_URL}?errorFinalize=${moduleVersion++}`);

const getMessage = (state: any, dialogId: string, id: string) =>
  state?.dialogStateById?.[dialogId]?.msgs?.entities?.[id];

const messageStreamingAction = (payload: any) => ({
  type: "message/messageStreaming",
  payload,
});

describe("finalizeTransientMessageOnError", () => {
  test("keeps a non-empty transient message with an error marker", async () => {
    const { default: messageReducer, finalizeTransientMessageOnError } =
      await loadMessageSliceModule();

    let state = messageReducer(
      undefined,
      messageStreamingAction({
        id: "msg-1",
        dialogId: "dialog-a",
        dbKey: "dialog-dialog-a-msg-msg-1",
        role: "assistant",
        content: "partial answer before crash",
        isStreaming: true,
      })
    );

    state = messageReducer(
      state,
      finalizeTransientMessageOnError({ id: "msg-1", error: "boom" })
    );

    const msg = getMessage(state, "dialog-a", "msg-1");
    expect(msg).toBeDefined();
    expect(msg.content).toBe("partial answer before crash");
    expect(msg.isStreaming).toBe(false);
    expect(msg.metadata?.error).toBe(true);
    expect(msg.metadata?.message).toBe("boom");
  });

  test("keeps executed tool messages instead of wiping the trace", async () => {
    const { default: messageReducer, finalizeTransientMessageOnError } =
      await loadMessageSliceModule();

    let state = messageReducer(
      undefined,
      messageStreamingAction({
        id: "tool-1",
        dialogId: "dialog-a",
        dbKey: "dialog-dialog-a-msg-tool-1",
        role: "tool",
        content: '{"ok":true,"hits":7}',
        isStreaming: false,
        toolName: "codeSearch",
        toolCallId: "call-1",
        metadata: { durationMs: 42 },
      })
    );

    state = messageReducer(
      state,
      finalizeTransientMessageOnError({ id: "tool-1" })
    );

    const msg = getMessage(state, "dialog-a", "tool-1");
    expect(msg).toBeDefined();
    expect(msg.content).toBe('{"ok":true,"hits":7}');
    expect(msg.toolName).toBe("codeSearch");
    // Existing metadata is preserved, error flag added.
    expect(msg.metadata?.durationMs).toBe(42);
    expect(msg.metadata?.error).toBe(true);
  });

  test("removes an empty transient message", async () => {
    const { default: messageReducer, finalizeTransientMessageOnError } =
      await loadMessageSliceModule();

    let state = messageReducer(
      undefined,
      messageStreamingAction({
        id: "msg-empty",
        dialogId: "dialog-a",
        dbKey: "dialog-dialog-a-msg-msg-empty",
        role: "assistant",
        content: "",
        isStreaming: true,
      })
    );

    state = messageReducer(
      state,
      finalizeTransientMessageOnError({ id: "msg-empty", error: "boom" })
    );

    expect(getMessage(state, "dialog-a", "msg-empty")).toBeUndefined();
  });

  test("is a no-op for unknown message ids", async () => {
    const { default: messageReducer, finalizeTransientMessageOnError } =
      await loadMessageSliceModule();

    const state = messageReducer(
      undefined,
      finalizeTransientMessageOnError({ id: "missing", error: "boom" })
    );

    expect(state).toBeDefined();
  });
});
