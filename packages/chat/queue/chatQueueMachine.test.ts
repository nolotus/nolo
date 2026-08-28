// packages/chat/queue/chatQueueMachine.test.ts
//
// Pure unit tests for the chat queue state machine. No React, no Redux.
// These pin the cross-platform contract that every adapter (Web/RN/TUI) relies
// on: enqueue semantics, drain timing, abort clearing, pause/resume.

import { describe, expect, it } from "bun:test";

import {
  applyChatQueueEvent,
  initialChatQueueState,
  reduceChatQueue,
  shouldDrainAfterTurnEnd,
} from "core/chat/chatQueueMachine";

describe("reduceChatQueue", () => {
  it("starts idle with an empty queue", () => {
    expect(initialChatQueueState).toEqual({
      running: false,
      queue: [],
      drainPaused: false,
      lastDrainError: null,
    });
  });

  it("enqueue appends text to the queue", () => {
    const s = reduceChatQueue(initialChatQueueState, { type: "enqueue", text: "hi" });
    expect(s.queue.map((r) => r.text)).toEqual(["hi"]);
    expect(s.queue[0]?.event).toEqual({ kind: "user", text: "hi" });
  });

  it("enqueue ignores empty text", () => {
    const s = reduceChatQueue(initialChatQueueState, { type: "enqueue", text: "" });
    expect(s.queue).toEqual([]);
  });

  it("enqueue preserves FIFO order", () => {
    let s = initialChatQueueState;
    s = reduceChatQueue(s, { type: "enqueue", text: "a" });
    s = reduceChatQueue(s, { type: "enqueue", text: "b" });
    s = reduceChatQueue(s, { type: "enqueue", text: "c" });
    expect(s.queue.map((r) => r.text)).toEqual(["a", "b", "c"]);
  });

  it("dequeue removes the head", () => {
    let s = initialChatQueueState;
    s = reduceChatQueue(s, { type: "enqueue", text: "a" });
    s = reduceChatQueue(s, { type: "enqueue", text: "b" });
    s = reduceChatQueue(s, { type: "dequeue" });
    expect(s.queue.map((r) => r.text)).toEqual(["b"]);
  });

  it("dequeue on empty queue is a no-op", () => {
    const s = reduceChatQueue(initialChatQueueState, { type: "dequeue" });
    expect(s.queue).toEqual([]);
  });

  it("turn-start sets running and clears last error", () => {
    const errored = { ...initialChatQueueState, lastDrainError: "boom" };
    const s = reduceChatQueue(errored, { type: "turn-start" });
    expect(s.running).toBe(true);
    expect(s.lastDrainError).toBeNull();
  });

  it("turn-start while already running is a no-op", () => {
    const running = { ...initialChatQueueState, running: true };
    const s = reduceChatQueue(running, { type: "turn-start" });
    expect(s).toBe(running);
  });

  it("turn-end ok clears running but keeps the queue", () => {
    let s = initialChatQueueState;
    s = reduceChatQueue(s, { type: "enqueue", text: "follow-up" });
    s = reduceChatQueue(s, { type: "turn-start" });
    s = reduceChatQueue(s, { type: "turn-end", ok: true, aborted: false });
    expect(s.running).toBe(false);
    expect(s.queue.map((r) => r.text)).toEqual(["follow-up"]);
  });

  it("turn-end aborted clears the queue (user abandons follow-ups)", () => {
    let s = initialChatQueueState;
    s = reduceChatQueue(s, { type: "enqueue", text: "follow-up" });
    s = reduceChatQueue(s, { type: "turn-start" });
    s = reduceChatQueue(s, { type: "turn-end", ok: false, aborted: true });
    expect(s.running).toBe(false);
    expect(s.queue).toEqual([]);
  });

  it("turn-end failed (not aborted) keeps the queue and records an error", () => {
    let s = initialChatQueueState;
    s = reduceChatQueue(s, { type: "enqueue", text: "follow-up" });
    s = reduceChatQueue(s, { type: "turn-start" });
    s = reduceChatQueue(s, { type: "turn-end", ok: false, aborted: false });
    expect(s.running).toBe(false);
    expect(s.queue.map((r) => r.text)).toEqual(["follow-up"]);
    expect(s.lastDrainError).toBe("previous turn failed");
  });

  it("clear empties the queue and the error", () => {
    let s = initialChatQueueState;
    s = reduceChatQueue(s, { type: "enqueue", text: "x" });
    s = reduceChatQueue(s, { type: "drain-error", message: "no balance" });
    s = reduceChatQueue(s, { type: "clear" });
    expect(s.queue).toEqual([]);
    expect(s.lastDrainError).toBeNull();
  });

  it("clear on an already-empty, error-free state is a no-op (referential stability)", () => {
    const s = reduceChatQueue(initialChatQueueState, { type: "clear" });
    expect(s).toBe(initialChatQueueState);
  });

  it("pause-drain then resume-drain toggles the flag", () => {
    let s = initialChatQueueState;
    s = reduceChatQueue(s, { type: "pause-drain" });
    expect(s.drainPaused).toBe(true);
    s = reduceChatQueue(s, { type: "resume-drain" });
    expect(s.drainPaused).toBe(false);
  });

  it("pause-drain while already paused is a no-op", () => {
    const paused = { ...initialChatQueueState, drainPaused: true };
    expect(reduceChatQueue(paused, { type: "pause-drain" })).toBe(paused);
  });

  it("drain-error stores the message without changing queue/running", () => {
    let s = initialChatQueueState;
    s = reduceChatQueue(s, { type: "enqueue", text: "x" });
    s = reduceChatQueue(s, { type: "turn-start" });
    s = reduceChatQueue(s, { type: "drain-error", message: "no balance" });
    expect(s.lastDrainError).toBe("no balance");
    expect(s.queue.map((r) => r.text)).toEqual(["x"]);
    expect(s.running).toBe(true);
  });
});

describe("shouldDrainAfterTurnEnd", () => {
  it("drains when idle, not paused, queue non-empty, prev ok", () => {
    const s = reduceChatQueue(initialChatQueueState, { type: "enqueue", text: "x" });
    expect(shouldDrainAfterTurnEnd(s, true)).toBe(true);
  });

  it("does not drain while still running", () => {
    const s = { ...reduceChatQueue(initialChatQueueState, { type: "enqueue", text: "x" }), running: true };
    expect(shouldDrainAfterTurnEnd(s, true)).toBe(false);
  });

  it("does not drain when paused", () => {
    const s = { ...reduceChatQueue(initialChatQueueState, { type: "enqueue", text: "x" }), drainPaused: true };
    expect(shouldDrainAfterTurnEnd(s, true)).toBe(false);
  });

  it("does not drain when queue is empty", () => {
    expect(shouldDrainAfterTurnEnd(initialChatQueueState, true)).toBe(false);
  });

  it("does not drain when previous turn failed", () => {
    const s = reduceChatQueue(initialChatQueueState, { type: "enqueue", text: "x" });
    expect(shouldDrainAfterTurnEnd(s, false)).toBe(false);
  });
});

describe("applyChatQueueEvent (outgoing side-effects)", () => {
  it("enqueue emits queue-changed", () => {
    const { state, outgoing } = applyChatQueueEvent(initialChatQueueState, {
      type: "enqueue",
      text: "hi",
    });
    expect(outgoing).toContainEqual({ type: "queue-changed", length: 1 });
    expect(state.queue.map((r) => r.text)).toEqual(["hi"]);
  });

  it("turn-start emits running-changed(true)", () => {
    const { outgoing } = applyChatQueueEvent(initialChatQueueState, {
      type: "turn-start",
    });
    expect(outgoing).toContainEqual({ type: "running-changed", running: true });
  });

  it("clean turn-end with a queued follow-up emits drain-ready with the head", () => {
    let s = initialChatQueueState;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "follow-up" }).state;
    s = applyChatQueueEvent(s, { type: "turn-start" }).state;
    const { state, outgoing } = applyChatQueueEvent(s, {
      type: "turn-end",
      ok: true,
      aborted: false,
    });
    expect(state.running).toBe(false);
    expect(outgoing.some((e) => e.type === "drain-ready" && e.text === "follow-up")).toBe(true);
  });

  it("aborted turn-end does NOT emit drain-ready (queue is cleared)", () => {
    let s = initialChatQueueState;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "follow-up" }).state;
    s = applyChatQueueEvent(s, { type: "turn-start" }).state;
    const { state, outgoing } = applyChatQueueEvent(s, {
      type: "turn-end",
      ok: false,
      aborted: true,
    });
    expect(state.queue).toEqual([]);
    expect(outgoing.find((e) => e.type === "drain-ready")).toBeUndefined();
  });

  it("failed (non-aborted) turn-end does NOT emit drain-ready", () => {
    let s = initialChatQueueState;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "follow-up" }).state;
    s = applyChatQueueEvent(s, { type: "turn-start" }).state;
    const { outgoing } = applyChatQueueEvent(s, {
      type: "turn-end",
      ok: false,
      aborted: false,
    });
    expect(outgoing.find((e) => e.type === "drain-ready")).toBeUndefined();
  });

  it("paused turn-end does NOT emit drain-ready even if queue non-empty", () => {
    let s = initialChatQueueState;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "follow-up" }).state;
    s = applyChatQueueEvent(s, { type: "turn-start" }).state;
    s = { ...s, drainPaused: true };
    const { outgoing } = applyChatQueueEvent(s, {
      type: "turn-end",
      ok: true,
      aborted: false,
    });
    expect(outgoing.find((e) => e.type === "drain-ready")).toBeUndefined();
  });

  it("clean turn-end with empty queue does NOT emit drain-ready", () => {
    let s = initialChatQueueState;
    s = applyChatQueueEvent(s, { type: "turn-start" }).state;
    const { outgoing } = applyChatQueueEvent(s, {
      type: "turn-end",
      ok: true,
      aborted: false,
    });
    expect(outgoing.find((e) => e.type === "drain-ready")).toBeUndefined();
  });

  it("dequeue after drain-ready empties the head and emits queue-changed", () => {
    let s = initialChatQueueState;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "a" }).state;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "b" }).state;
    const { state, outgoing } = applyChatQueueEvent(s, { type: "dequeue" });
    expect(state.queue.map((r) => r.text)).toEqual(["b"]);
    expect(outgoing).toContainEqual({ type: "queue-changed", length: 1 });
  });

  it("full enqueue→run→end→drain→dequeue→run cycle drains one at a time", () => {
    let s = initialChatQueueState;
    const drains: string[] = [];

    const runOneTurn = (ok: boolean) => {
      s = applyChatQueueEvent(s, { type: "turn-start" }).state;
      const end = applyChatQueueEvent(s, {
        type: "turn-end",
        ok,
        aborted: false,
      });
      s = end.state;
      for (const e of end.outgoing) {
        if (e.type === "drain-ready") {
          drains.push(e.text);
          s = applyChatQueueEvent(s, { type: "dequeue" }).state;
        }
      }
    };

    s = applyChatQueueEvent(s, { type: "enqueue", text: "q1" }).state;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "q2" }).state;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "q3" }).state;

    runOneTurn(true);
    runOneTurn(true);
    runOneTurn(true);
    runOneTurn(true);

    expect(drains).toEqual(["q1", "q2", "q3"]);
    expect(s.queue).toEqual([]);
    expect(s.running).toBe(false);
  });

  it("recall-last pops the tail item and emits recalled-to-draft event", () => {
    let s = initialChatQueueState;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "first" }).state;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "second" }).state;

    const res = applyChatQueueEvent(s, { type: "recall-last" });
    expect(res.state.queue.map((r) => r.text)).toEqual(["first"]);
    expect(res.outgoing).toContainEqual({
      type: "recalled-to-draft",
      text: "second",
      request: expect.objectContaining({ text: "second" }),
    });
  });

  it("steer prepends to head and emits steer-ready when running", () => {
    let s = initialChatQueueState;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "queued follow-up" }).state;
    s = applyChatQueueEvent(s, { type: "turn-start" }).state;

    const res = applyChatQueueEvent(s, { type: "steer", text: "urgent correction" });
    expect(res.state.queue.map((r) => r.text)).toEqual(["urgent correction", "queued follow-up"]);
    expect(res.outgoing).toContainEqual({
      type: "steer-ready",
      text: "urgent correction",
      request: expect.objectContaining({ text: "urgent correction" }),
    });
  });

  it("steer with empty text is ignored and does not emit steer-ready", () => {
    let s = initialChatQueueState;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "existing" }).state;
    s = applyChatQueueEvent(s, { type: "turn-start" }).state;

    const res = applyChatQueueEvent(s, { type: "steer", text: "   " });
    expect(res.state.queue.map((r) => r.text)).toEqual(["existing"]);
    expect(res.outgoing.filter((e) => e.type === "steer-ready")).toHaveLength(0);
  });

  it("turn-end aborted emits aborted-draft-refill with all aborted items so UI can restore draft", () => {
    let s = initialChatQueueState;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "draft item 1" }).state;
    s = applyChatQueueEvent(s, { type: "enqueue", text: "draft item 2" }).state;
    s = applyChatQueueEvent(s, { type: "turn-start" }).state;

    const res = applyChatQueueEvent(s, { type: "turn-end", ok: false, aborted: true });
    expect(res.state.queue).toEqual([]);
    expect(res.outgoing).toContainEqual({
      type: "aborted-draft-refill",
      text: "draft item 1",
      request: expect.objectContaining({ text: "draft item 1" }),
      abortedRequests: [
        expect.objectContaining({ text: "draft item 1" }),
        expect.objectContaining({ text: "draft item 2" }),
      ],
    });
  });
});
