import { afterEach, describe, expect, it } from "bun:test";

import {
  getHasStreamingMessage,
  getIsLoadingInitial,
  getLastStreamTimestamp,
  getMessagesLoadingState,
  getStreamingMessageId,
  markMessageStreamActivity,
  patchMessageSession,
  resetAllMessageSessions,
  resetMessageSessionStoreForTests,
  selectCurrentDialogId,
  selectHasStreamingMessage,
  setActiveMessageDialogId,
  setStreamingMessageId,
} from "./messageSessionStore";

describe("messageSessionStore", () => {
  afterEach(() => {
    resetMessageSessionStoreForTests();
  });

  it("keeps loading flash per dialog id", () => {
    patchMessageSession("dialog-a", { isLoadingInitial: true });
    patchMessageSession("dialog-b", { isLoadingOlder: true });
    expect(getIsLoadingInitial("dialog-a")).toBe(true);
    expect(getIsLoadingInitial("dialog-b")).toBe(false);
    expect(getMessagesLoadingState("dialog-b").isLoadingOlder).toBe(true);
  });

  it("marks stream activity timestamps", () => {
    setActiveMessageDialogId("dialog-a");
    const before = getLastStreamTimestamp("dialog-a");
    markMessageStreamActivity("dialog-a");
    expect(getLastStreamTimestamp("dialog-a")).toBeGreaterThanOrEqual(before);
    expect(getMessagesLoadingState("dialog-a").isLoadingInitial).toBe(false);
  });

  it("resetAll clears every session", () => {
    patchMessageSession("dialog-a", { isLoadingInitial: true });
    resetAllMessageSessions();
    expect(getIsLoadingInitial("dialog-a")).toBe(false);
  });
});

describe("messageSessionStore streamingMessageId index", () => {
  afterEach(() => {
    resetMessageSessionStoreForTests();
  });

  it("defaults to null (no streaming)", () => {
    expect(getStreamingMessageId("dialog-a")).toBe(null);
    expect(getHasStreamingMessage("dialog-a")).toBe(false);
  });

  it("set / get / clear the streaming message id per dialog", () => {
    setStreamingMessageId("dialog-a", "msg-1");
    expect(getStreamingMessageId("dialog-a")).toBe("msg-1");
    expect(getHasStreamingMessage("dialog-a")).toBe(true);
    // other dialog unaffected
    expect(getHasStreamingMessage("dialog-b")).toBe(false);

    setStreamingMessageId("dialog-a", null);
    expect(getStreamingMessageId("dialog-a")).toBe(null);
    expect(getHasStreamingMessage("dialog-a")).toBe(false);
  });

  it("selectHasStreamingMessage reads the store index (ignores Redux state)", () => {
    setStreamingMessageId("dialog-a", "msg-2");
    // pass a bogus state object — selector must ignore it
    expect(selectHasStreamingMessage({} as any, "dialog-a")).toBe(true);
    expect(selectHasStreamingMessage({} as any, "dialog-b")).toBe(false);
    expect(selectHasStreamingMessage({} as any, null)).toBe(false);
  });

  it("omitted dialogId falls back to activeDialogId for hasStreaming", () => {
    setActiveMessageDialogId("dialog-a");
    setStreamingMessageId("dialog-a", "msg-active");
    expect(getHasStreamingMessage(undefined)).toBe(true);
    expect(selectHasStreamingMessage({} as any)).toBe(true);
    setActiveMessageDialogId("dialog-b");
    expect(getHasStreamingMessage(undefined)).toBe(false);
  });

  it("selectCurrentDialogId reads activeDialogId (ignores Redux state)", () => {
    expect(selectCurrentDialogId({})).toBe(null);
    setActiveMessageDialogId("dialog-a");
    expect(selectCurrentDialogId({ message: { currentDialogId: "stale" } })).toBe(
      "dialog-a"
    );
  });

  it("deleteMessageSession clears the streaming id for that dialog", async () => {
    const { deleteMessageSession } = await import("./messageSessionStore");
    setStreamingMessageId("dialog-a", "msg-3");
    deleteMessageSession("dialog-a");
    expect(getStreamingMessageId("dialog-a")).toBe(null);
    expect(getHasStreamingMessage("dialog-a")).toBe(false);
  });

  it("resetAllMessageSessions clears every dialog's streaming id", () => {
    setStreamingMessageId("dialog-a", "msg-4");
    setStreamingMessageId("dialog-b", "msg-5");
    resetAllMessageSessions();
    expect(getStreamingMessageId("dialog-a")).toBe(null);
    expect(getStreamingMessageId("dialog-b")).toBe(null);
  });
});
