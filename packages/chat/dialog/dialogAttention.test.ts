import { describe, expect, test } from "bun:test";
import {
  getDialogAttentionTitle,
  resolveDialogCompletionOutcome,
  shouldNotifyDialogCompletion,
} from "./dialogAttention";

describe("dialog completion attention", () => {
  test("notifies when a streaming reply finishes while the page is hidden", () => {
    expect(
      shouldNotifyDialogCompletion({
        previousStreaming: true,
        nextStreaming: false,
        hasAssistantMessage: true,
        completionOutcome: "success",
        isDocumentVisible: false,
      }),
    ).toBe(true);
  });

  test.each([
    ["initial page load", false, false, true, "success", false],
    ["still streaming", true, true, true, "success", false],
    ["no assistant message", true, false, false, "success", false],
    ["failed turn", true, false, true, "failure", false],
    ["aborted turn", true, false, true, "aborted", false],
    ["errored and aborted", true, false, true, "failure", false],
    ["page visible", true, false, true, "success", true],
  ] as const)("does not notify for %s", (_name, previousStreaming, nextStreaming, hasAssistantMessage, completionOutcome, isDocumentVisible) => {
    expect(
      shouldNotifyDialogCompletion({
        previousStreaming,
        nextStreaming,
        hasAssistantMessage,
        completionOutcome,
        isDocumentVisible,
      }),
    ).toBe(false);
  });

  test("marks the title only while attention is pending", () => {
    expect(getDialogAttentionTitle("My chat", true)).toBe("✦ My chat");
    expect(getDialogAttentionTitle("My chat", false)).toBe("My chat");
  });

  test("maps metadata + abort state to completion outcome (error wins)", () => {
    expect(resolveDialogCompletionOutcome(undefined, false)).toBe("success");
    expect(resolveDialogCompletionOutcome({ error: true }, false)).toBe("failure");
    expect(resolveDialogCompletionOutcome(undefined, true)).toBe("aborted");
    expect(resolveDialogCompletionOutcome({ error: true }, true)).toBe("failure");
  });
});
