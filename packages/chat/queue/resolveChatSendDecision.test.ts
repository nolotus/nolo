// packages/chat/queue/resolveChatSendDecision.test.ts
//
// Shared decision-resolver tests. These are the canonical tests for the
// cross-platform resolver; per-client test files may add client-specific
// wiring tests but the decision semantics live here.

import { describe, expect, it } from "bun:test";

import {
  resolveChatSendDecision,
  type ResolveChatSendDecisionInput,
} from "core/chat/resolveChatSendDecision";

describe("resolveChatSendDecision", () => {
  const makeInput = (
    overrides: Partial<ResolveChatSendDecisionInput> = {}
  ): ResolveChatSendDecisionInput => ({
    text: "hello",
    imagePreviewCount: 0,
    pendingFileCount: 0,
    isSendBlocked: false,
    canMultiImg: true,
    isLoopRunning: false,
    isSendPending: false,
    isFreshDialogSlashCommand: (input: string) => input === "/new",
    isCompactDialogSlashCommand: (input: string) => input === "/compact",
    ...overrides,
  });

  it("queues pure text while the loop is running", () => {
    expect(
      resolveChatSendDecision(makeInput({ isLoopRunning: true }))
    ).toEqual({ kind: "queue-text", text: "hello" });
  });

  it("returns send for ordinary sendable input", () => {
    expect(resolveChatSendDecision(makeInput())).toEqual({
      kind: "send",
      text: "hello",
    });
  });

  it("blocks compact while a turn is still active", () => {
    expect(
      resolveChatSendDecision(
        makeInput({ text: "/compact", isLoopRunning: true })
      )
    ).toEqual({ kind: "compact-blocked" });
  });

  it("blocks compact while a send is pending", () => {
    expect(
      resolveChatSendDecision(
        makeInput({ text: "/compact", isSendPending: true })
      )
    ).toEqual({ kind: "compact-blocked" });
  });

  it("runs compact when idle", () => {
    expect(
      resolveChatSendDecision(makeInput({ text: "/compact" }))
    ).toEqual({ kind: "compact-dialog" });
  });

  it("arms a fresh dialog on /new even while running", () => {
    expect(
      resolveChatSendDecision(
        makeInput({ text: "/new", isLoopRunning: true })
      )
    ).toEqual({ kind: "arm-fresh-dialog" });
  });

  it("is noop when text and attachments are empty", () => {
    expect(
      resolveChatSendDecision(makeInput({ text: "   " }))
    ).toEqual({ kind: "noop" });
  });

  it("is noop when send is blocked regardless of text", () => {
    expect(
      resolveChatSendDecision(makeInput({ isSendBlocked: true }))
    ).toEqual({ kind: "noop" });
  });

  it("blocks multi-image when canMultiImg is false", () => {
    expect(
      resolveChatSendDecision(
        makeInput({ imagePreviewCount: 2, canMultiImg: false })
      )
    ).toEqual({ kind: "multi-image-blocked" });
  });

  it("sends multi-image when canMultiImg is true", () => {
    expect(
      resolveChatSendDecision(
        makeInput({ imagePreviewCount: 2, canMultiImg: true })
      )
    ).toEqual({ kind: "send", text: "hello" });
  });

  it("queue-blocks when running with an attachment", () => {
    expect(
      resolveChatSendDecision(
        makeInput({ isLoopRunning: true, imagePreviewCount: 1 })
      )
    ).toEqual({ kind: "queue-blocked" });
  });

  it("queue-blocks when running with a pending file", () => {
    expect(
      resolveChatSendDecision(
        makeInput({ isLoopRunning: true, pendingFileCount: 1 })
      )
    ).toEqual({ kind: "queue-blocked" });
  });

  it("noop when running with empty text and no attachments", () => {
    // Empty text while running has nothing to queue and nothing to send.
    // The empty-input guard fires before the running guard, yielding noop —
    // this is intentional so pressing send with an empty composer never
    // produces a spurious "blocked" toast while a turn is active.
    expect(
      resolveChatSendDecision(
        makeInput({ text: "", isLoopRunning: true })
      )
    ).toEqual({ kind: "noop" });
  });

  it("trims text before queueing", () => {
    expect(
      resolveChatSendDecision(
        makeInput({ text: "  spaced  ", isLoopRunning: true })
      )
    ).toEqual({ kind: "queue-text", text: "spaced" });
  });
});