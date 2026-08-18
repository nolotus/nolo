// packages/chat/queue/chatQueueRuntime.test.ts
//
// Imperative wrapper tests: subscription fan-out, on() typed listeners,
// dispose, and the round-trip through the pure machine.

import { describe, expect, it } from "bun:test";

import { createChatQueueRuntime } from "core/chat/chatQueueRuntime";
import { createTurnRequest } from "core/chat/internalTurnEvent";

describe("createChatQueueRuntime", () => {
  it("starts from the initial state", () => {
    const q = createChatQueueRuntime();
    expect(q.getState()).toEqual({
      running: false,
      queue: [],
      drainPaused: false,
      lastDrainError: null,
    });
  });

  it("send() updates state and dispatches outgoing events to subscribers", () => {
    const q = createChatQueueRuntime();
    const received: string[] = [];
    q.subscribe((e) => received.push(e.type));

    q.send({ type: "enqueue", text: "hi" });

    expect(q.getState().queue.map((r) => r.text)).toEqual(["hi"]);
    expect(received).toContain("queue-changed");
  });

  it("on(type, cb) only invokes cb for that event type", () => {
    const q = createChatQueueRuntime();
    const drains: string[] = [];
    const lengths: number[] = [];

    q.on("drain-ready", (e) => drains.push(e.text));
    q.on("queue-changed", (e) => lengths.push(e.length));

    q.send({ type: "enqueue", text: "follow-up" });
    q.send({ type: "turn-start" });
    q.send({ type: "turn-end", ok: true, aborted: false });

    expect(drains).toEqual(["follow-up"]);
    expect(lengths).toEqual([1]);
  });

  it("subscribe returns an unsubscribe function", () => {
    const q = createChatQueueRuntime();
    const seen: string[] = [];
    const off = q.subscribe((e) => seen.push(e.type));

    q.send({ type: "turn-start" });
    off();
    q.send({ type: "turn-end", ok: true, aborted: false });

    // Only the first event was observed; after unsubscribe, nothing.
    expect(seen).toEqual(["running-changed"]);
  });

  it("full drain cycle through the runtime calls drain-ready once per queued item", () => {
    const q = createChatQueueRuntime();
    const drains: string[] = [];
    q.on("drain-ready", (e) => {
      drains.push(e.text);
      // Adapter: send the text, dequeue the head, runtime will turn-start/end.
      q.send({ type: "dequeue" });
    });

    q.send({ type: "enqueue", text: "a" });
    q.send({ type: "enqueue", text: "b" });

    // First turn ends cleanly → drain a.
    q.send({ type: "turn-start" });
    q.send({ type: "turn-end", ok: true, aborted: false });

    // Simulate the adapter actually sending "a": a new turn starts.
    q.send({ type: "turn-start" });
    q.send({ type: "turn-end", ok: true, aborted: false });

    // Simulate sending "b": another turn.
    q.send({ type: "turn-start" });
    q.send({ type: "turn-end", ok: true, aborted: false });

    expect(drains).toEqual(["a", "b"]);
    expect(q.getState().queue).toEqual([]);
    expect(q.getState().running).toBe(false);
  });

  it("abort during a turn clears the queue and never emits drain-ready", () => {
    const q = createChatQueueRuntime();
    const drains: string[] = [];
    q.on("drain-ready", (e) => drains.push(e.text));

    q.send({ type: "enqueue", text: "x" });
    q.send({ type: "turn-start" });
    q.send({ type: "turn-end", ok: false, aborted: true });

    expect(q.getState().queue).toEqual([]);
    expect(drains).toEqual([]);
  });

  it("drain-ready is not emitted while paused", () => {
    const q = createChatQueueRuntime();
    const drains: string[] = [];
    q.on("drain-ready", (e) => drains.push(e.text));

    q.send({ type: "enqueue", text: "x" });
    q.send({ type: "pause-drain" });
    q.send({ type: "turn-start" });
    q.send({ type: "turn-end", ok: true, aborted: false });

    expect(drains).toEqual([]);
    expect(q.getState().queue.map((r) => r.text)).toEqual(["x"]);

    // Resuming does not retroactively fire drain-ready; the adapter must
    // re-check shouldDrainAfterTurnEnd after resume if it wants to drain now.
    q.send({ type: "resume-drain" });
    expect(drains).toEqual([]);
  });

  it("dispose resets state to initial and clears listeners", () => {
    const q = createChatQueueRuntime();
    const seen: string[] = [];
    q.subscribe((e) => seen.push(e.type));

    q.send({ type: "enqueue", text: "x" });
    const eventsBeforeDispose = seen.length;
    q.dispose();

    expect(q.getState().queue).toEqual([]);
    q.send({ type: "enqueue", text: "y" });
    // No new events after dispose — listener was cleared.
    expect(seen.length).toBe(eventsBeforeDispose);
  });

  it("seeds from a provided initial state", () => {
    const q = createChatQueueRuntime({
      running: false,
      queue: [createTurnRequest("already-queued")],
      drainPaused: false,
      lastDrainError: null,
    });
    expect(q.getState().queue.map((r) => r.text)).toEqual(["already-queued"]);
  });
});
