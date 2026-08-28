// packages/chat/web/messageInputSendResolver.test.ts
//
// Thin compatibility test verifying the re-export shim still exposes the
// resolver under its legacy name. The decision-semantics test suite now lives
// in chat/queue/resolveChatSendDecision.test.ts.

import { describe, expect, it } from "bun:test";

import { resolveMessageInputSendDecision } from "./messageInputSendResolver";

describe("messageInputSendResolver (re-export shim)", () => {
  it("still resolves ordinary sends under the legacy export name", () => {
    expect(
      resolveMessageInputSendDecision({
        text: "hello",
        imagePreviewCount: 0,
        pendingFileCount: 0,
        isSendBlocked: false,
        canMultiImg: true,
        isLoopRunning: false,
        isSendPending: false,
        isFreshDialogSlashCommand: (input: string) => input === "/new",
        isCompactDialogSlashCommand: (input: string) => input === "/compact",
      })
    ).toEqual({ kind: "send", text: "hello" });
  });
});