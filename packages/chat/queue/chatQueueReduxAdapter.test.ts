// packages/chat/queue/chatQueueReduxAdapter.test.ts
//
// Adapter integration tests. Uses a minimal fake store + dialogRuntimeStore
// so we don't pull the real Redux store graph into the unit test. Verifies that:
//   - drain-ready dispatches handleSendMessage with the dequeued text,
//   - abort mirrors clearPendingUserInputQueue into the runtime store,
//   - enqueue writes to both core and the runtime-store shadow,
//   - syncDrainPause maps loopStopReason "pending" → pause-drain.

import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import {
  enqueueUserInput,
  getPendingUserInputQueue,
  resetDialogRuntimeStoreForTests,
  setLoopStopReason,
} from "chat/dialog/dialogRuntimeStore";

import { ChatQueueReduxAdapter } from "./chatQueueReduxAdapter";

type Action = { type: string; payload?: any } | ((...args: any[]) => any);

const makeFakeStore = () => {
  const dispatched: Action[] = [];
  const store = {
    getState: () => ({}),
    dispatch: (a: Action) => {
      dispatched.push(a);
      return a;
    },
  };
  return { store, dispatched };
};

beforeEach(() => {
  resetDialogRuntimeStoreForTests();
});

afterEach(() => {
  resetDialogRuntimeStoreForTests();
});

describe("ChatQueueReduxAdapter", () => {
  it("seeds the runtime from dialogRuntimeStore pendingUserInputQueue", () => {
    enqueueUserInput({ text: "legacy-1", dialogKey: "dialog-u-1" });
    enqueueUserInput({ text: "legacy-2", dialogKey: "dialog-u-1" });
    const { store } = makeFakeStore();
    const adapter = new ChatQueueReduxAdapter(store as any);
    expect(adapter.getQueue("dialog-u-1")).toEqual(["legacy-1", "legacy-2"]);
  });

  it("enqueue writes to both the core runtime and the runtime-store shadow", () => {
    const { store } = makeFakeStore();
    const adapter = new ChatQueueReduxAdapter(store as any);
    const result = adapter.enqueue("dialog-u-1", "hello");
    expect(result).toEqual({ accepted: true, queueLength: 1 });
    expect(getPendingUserInputQueue("dialog-u-1")).toEqual(["hello"]);
    expect(adapter.getQueue("dialog-u-1")).toEqual(["hello"]);
  });

  it("drain-ready dispatches handleSendMessage with the dequeued text", async () => {
    const { store } = makeFakeStore();
    const sends: { dialogKey: string; text: string }[] = [];
    const adapter = new ChatQueueReduxAdapter(store as any, {
      sendDrainedText: ({ dialogKey, text }) => {
        sends.push({ dialogKey, text });
      },
    });

    adapter.enqueue("dialog-u-1", "follow-up");
    adapter.notifyTurnStart("dialog-u-1");
    await adapter.notifyTurnEnd("dialog-u-1", { ok: true, aborted: false });

    expect(sends).toEqual([{ dialogKey: "dialog-u-1", text: "follow-up" }]);
    expect(getPendingUserInputQueue("dialog-u-1")).toEqual([]);
    expect(adapter.getQueue("dialog-u-1")).toEqual([]);
  });

  it("aborted turn-end clears the queue in both core and runtime store", () => {
    const { store } = makeFakeStore();
    const adapter = new ChatQueueReduxAdapter(store as any);
    adapter.enqueue("dialog-u-1", "will-be-abandoned");
    adapter.notifyTurnStart("dialog-u-1");
    adapter.notifyTurnEnd("dialog-u-1", { ok: false, aborted: true });

    expect(adapter.getQueue("dialog-u-1")).toEqual([]);
    expect(getPendingUserInputQueue("dialog-u-1")).toEqual([]);
  });

  it("failed (non-aborted) turn-end keeps the queue and does not drain", () => {
    const { store } = makeFakeStore();
    const sends: string[] = [];
    const adapter = new ChatQueueReduxAdapter(store as any, {
      sendDrainedText: ({ text }) => {
        sends.push(text);
      },
    });
    adapter.enqueue("dialog-u-1", "retry-me-later");
    adapter.notifyTurnStart("dialog-u-1");
    adapter.notifyTurnEnd("dialog-u-1", { ok: false, aborted: false });

    expect(adapter.getQueue("dialog-u-1")).toEqual(["retry-me-later"]);
    expect(sends).toEqual([]);
  });

  it("does not drain while loopStopReason is pending (pause-drain)", async () => {
    setLoopStopReason({ reason: "pending", dialogKey: "dialog-u-1" });
    const { store } = makeFakeStore();
    const sends: string[] = [];
    const adapter = new ChatQueueReduxAdapter(store as any, {
      sendDrainedText: ({ text }) => {
        sends.push(text);
      },
    });
    adapter.enqueue("dialog-u-1", "wait-for-confirm");
    adapter.syncDrainPause("dialog-u-1");
    adapter.notifyTurnStart("dialog-u-1");
    await adapter.notifyTurnEnd("dialog-u-1", { ok: true, aborted: false });

    expect(sends).toEqual([]);
    expect(adapter.getQueue("dialog-u-1")).toEqual(["wait-for-confirm"]);
  });

  it("does not drain when the queue is empty", async () => {
    const { store } = makeFakeStore();
    const sends: string[] = [];
    const adapter = new ChatQueueReduxAdapter(store as any, {
      sendDrainedText: ({ text }) => {
        sends.push(text);
      },
    });
    adapter.notifyTurnStart("dialog-u-1");
    await adapter.notifyTurnEnd("dialog-u-1", { ok: true, aborted: false });
    expect(sends).toEqual([]);
  });

  it("disposeRuntime removes the per-dialog runtime", () => {
    const { store } = makeFakeStore();
    const adapter = new ChatQueueReduxAdapter(store as any);
    adapter.enqueue("dialog-u-1", "x");
    adapter.disposeRuntime("dialog-u-1");
    // A fresh runtime is created on next access, seeded from the store shadow
    // (which still holds "x" because dispose doesn't clear the store).
    expect(adapter.getQueue("dialog-u-1")).toEqual(["x"]);
  });

  it("default sendDrainedText dispatches handleSendMessage", async () => {
    const { store, dispatched } = makeFakeStore();
    const adapter = new ChatQueueReduxAdapter(store as any);
    adapter.enqueue("dialog-u-1", "go");
    adapter.notifyTurnStart("dialog-u-1");
    await adapter.notifyTurnEnd("dialog-u-1", { ok: true, aborted: false });

    const dispatchedThunk = dispatched.find((a) => typeof a === "function");
    const dispatchedAction = dispatched.find(
      (a) =>
        a &&
        typeof a === "object" &&
        (a.type === "dialog/handleSendMessage" ||
          a.type === "dialog/handleSendMessage/pending")
    );
    expect(dispatchedThunk || dispatchedAction).toBeTruthy();
  });
});
