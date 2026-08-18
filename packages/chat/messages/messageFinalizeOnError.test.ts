import { describe, expect, test } from "bun:test";

import { resolveFinalizeTransientOnError } from "./messageFinalizeOnError";
import type { Message } from "./types";

const base = (overrides: Partial<Message> = {}): Message =>
  ({
    id: "msg-1",
    role: "assistant",
    content: "",
    ...overrides,
  }) as Message;

describe("resolveFinalizeTransientOnError", () => {
  test("noop when message is missing", () => {
    expect(resolveFinalizeTransientOnError(undefined)).toEqual({ kind: "noop" });
  });

  test("removes empty string content", () => {
    expect(resolveFinalizeTransientOnError(base({ content: "   " }))).toEqual({
      kind: "remove",
    });
  });

  test("removes empty array content", () => {
    expect(resolveFinalizeTransientOnError(base({ content: [] }))).toEqual({
      kind: "remove",
    });
  });

  test("marks error and stops streaming for non-empty content", () => {
    const existing = base({
      content: "partial",
      isStreaming: true,
      metadata: { durationMs: 9 },
    });
    expect(resolveFinalizeTransientOnError(existing, "boom")).toEqual({
      kind: "markError",
      changes: {
        isStreaming: false,
        metadata: {
          durationMs: 9,
          error: true,
          message: "boom",
        },
      },
    });
  });

  test("marks error without message when error string omitted", () => {
    const existing = base({ content: "ok", metadata: {} });
    const decision = resolveFinalizeTransientOnError(existing);
    expect(decision.kind).toBe("markError");
    if (decision.kind !== "markError") return;
    expect(decision.changes.metadata).toEqual({ error: true });
  });
});
