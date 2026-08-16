// packages/chat/queue/chatQueueStatus.test.ts

import { describe, expect, it } from "bun:test";

import { initialChatQueueState } from "core/chat/chatQueueMachine";
import { projectChatQueueStatus } from "core/chat/chatQueueStatus";
import { createTurnRequest } from "core/chat/internalTurnEvent";

describe("projectChatQueueStatus", () => {
  it("projects the idle default state", () => {
    expect(projectChatQueueStatus({ state: initialChatQueueState })).toEqual({
      isRunning: false,
      queueLength: 0,
      queuePreview: [],
      canQueueNow: false,
      drainPaused: false,
      lastDrainError: null,
      composerPlaceholderKey: "default",
    });
  });

  it("projects a running state as queuing", () => {
    const s = { ...initialChatQueueState, running: true };
    const status = projectChatQueueStatus({ state: s });
    expect(status.isRunning).toBe(true);
    expect(status.queueLength).toBe(0);
    expect(status.canQueueNow).toBe(true);
    expect(status.composerPlaceholderKey).toBe("queuing");
  });

  it("projects queued items with preview truncation", () => {
    const long = "x".repeat(100);
    const s = {
      ...initialChatQueueState,
      running: true,
      queue: ["short", long, "third", "fourth"].map(createTurnRequest),
    };
    const status = projectChatQueueStatus({ state: s, maxPreview: 3, previewCharLimit: 10 });
    expect(status.queueLength).toBe(4);
    expect(status.queuePreview).toEqual(["short", "xxxxxxxxxx…", "third"]);
  });

  it("respects maxPreview limit", () => {
    const s = {
      ...initialChatQueueState,
      running: true,
      queue: ["a", "b", "c", "d", "e"].map(createTurnRequest),
    };
    const status = projectChatQueueStatus({ state: s, maxPreview: 2 });
    expect(status.queuePreview).toEqual(["a", "b"]);
  });

  it("marks drainPaused and stops canQueueNow", () => {
    const s = { ...initialChatQueueState, running: true, drainPaused: true };
    const status = projectChatQueueStatus({ state: s });
    expect(status.drainPaused).toBe(true);
    expect(status.canQueueNow).toBe(false);
    expect(status.composerPlaceholderKey).toBe("drain-paused");
  });

  it("surfaces lastDrainError and picks error placeholder", () => {
    const s = { ...initialChatQueueState, lastDrainError: "no balance" };
    const status = projectChatQueueStatus({ state: s });
    expect(status.lastDrainError).toBe("no balance");
    expect(status.composerPlaceholderKey).toBe("error");
  });

  it("error placeholder takes precedence over queuing/paused", () => {
    const s = {
      ...initialChatQueueState,
      running: true,
      drainPaused: true,
      lastDrainError: "boom",
    };
    expect(projectChatQueueStatus({ state: s }).composerPlaceholderKey).toBe("error");
  });

  it("drain-paused takes precedence over queuing when no error", () => {
    const s = { ...initialChatQueueState, running: true, drainPaused: true };
    expect(projectChatQueueStatus({ state: s }).composerPlaceholderKey).toBe("drain-paused");
  });
});