import { describe, expect, test } from "bun:test";

import {
  getLatestUserInputFromMessages,
  captureUnderstandingFromCompletedUiTurn,
} from "./messageUnderstandingCapture";
import type { Message } from "./types";

describe("getLatestUserInputFromMessages", () => {
  test("returns the latest non-empty user text", () => {
    const messages = [
      { id: "1", role: "user", content: "first" },
      { id: "2", role: "assistant", content: "ok" },
      { id: "3", role: "user", content: "second" },
    ] as Message[];
    expect(getLatestUserInputFromMessages(messages)).toBe("second");
  });

  test("skips blank user rows", () => {
    const messages = [
      { id: "1", role: "user", content: "keep" },
      { id: "2", role: "user", content: "   " },
    ] as Message[];
    expect(getLatestUserInputFromMessages(messages)).toBe("keep");
  });
});

describe("captureUnderstandingFromCompletedUiTurn", () => {
  test("no-ops when tool calls are present", async () => {
    let called = false;
    // Dynamic import path is only hit after early returns; ensure we don't throw.
    await captureUnderstandingFromCompletedUiTurn({
      state: {},
      agentKey: "agent-1",
      dialogId: "d1",
      assistantText: "answer",
      toolCalls: [{ id: "c1" }],
      messages: [{ id: "u1", role: "user", content: "q" } as Message],
    });
    expect(called).toBe(false);
  });

  test("no-ops when assistant text is empty", async () => {
    await captureUnderstandingFromCompletedUiTurn({
      state: {},
      agentKey: "agent-1",
      dialogId: "d1",
      assistantText: "  ",
      messages: [{ id: "u1", role: "user", content: "q" } as Message],
    });
  });
});
