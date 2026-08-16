// packages/create/space/spaceEventCore.test.ts
//
// Wave22：applySpaceEvent 纯决策 core 的单测。脱离 Redux store 直接钉死
// SSE space 事件 → space 运行时指示字段的就地变更行为。
import { describe, expect, it } from "bun:test";

import {
  applySpaceEventCore,
  nextSpaceEventTimestamp,
  type SpaceEventState,
} from "./spaceEventCore";

const createState = (
  overrides: Partial<SpaceEventState> = {}
): SpaceEventState => ({
  currentSpace: null,
  dialogStatuses: {},
  dialogEventTimestamps: {},
  dialogTitles: {},
  unreadDialogIds: {},
  ...overrides,
});

const NOW = 1_700_000_000_000;

describe("nextSpaceEventTimestamp", () => {
  it("returns at least now when there is no previous timestamp", () => {
    expect(nextSpaceEventTimestamp(undefined, NOW)).toBe(NOW);
  });

  it("is strictly greater than the previous timestamp", () => {
    expect(nextSpaceEventTimestamp(NOW + 5, NOW)).toBe(NOW + 6);
  });

  it("never goes backwards when now has advanced past prev", () => {
    expect(nextSpaceEventTimestamp(NOW - 100, NOW)).toBe(NOW);
  });
});

describe("applySpaceEventCore dialog.created", () => {
  it("appends content and marks running when a currentSpace exists", () => {
    const state = createState({
      currentSpace: { contents: {}, updatedAt: 1 },
    });

    applySpaceEventCore(
      state,
      {
        type: "dialog.created",
        dialogId: "d1",
        dialogKey: "dialog-user-d1",
        title: "Hello",
      },
      NOW
    );

    expect(state.dialogStatuses["d1"]).toBe("running");
    expect(state.dialogTitles["d1"]).toBe("Hello");
    expect(state.dialogEventTimestamps["d1"]).toBe(NOW);
    expect(state.currentSpace?.contents?.["dialog-user-d1"]).toMatchObject({
      title: "Hello",
      contentKey: "dialog-user-d1",
      pinned: false,
      createdAt: NOW,
      updatedAt: NOW,
    });
    expect(state.currentSpace?.updatedAt).toBe(NOW);
  });

  it("initializes contents when currentSpace has none", () => {
    const state = createState({ currentSpace: { updatedAt: 1 } });

    applySpaceEventCore(
      state,
      {
        type: "dialog.created",
        dialogId: "d1",
        dialogKey: "k1",
        title: "T",
      },
      NOW
    );

    expect(state.currentSpace?.contents?.["k1"]).toBeDefined();
  });

  it("still records status/title/timestamp without a currentSpace", () => {
    const state = createState({ currentSpace: null });

    applySpaceEventCore(
      state,
      {
        type: "dialog.created",
        dialogId: "d1",
        dialogKey: "k1",
        title: "T",
      },
      NOW
    );

    expect(state.dialogStatuses["d1"]).toBe("running");
    expect(state.dialogTitles["d1"]).toBe("T");
    expect(state.dialogEventTimestamps["d1"]).toBe(NOW);
    expect(state.currentSpace).toBeNull();
  });

  it("clears a stale unread mark for the dialog", () => {
    const state = createState({ unreadDialogIds: { d1: true } });

    applySpaceEventCore(
      state,
      {
        type: "dialog.created",
        dialogId: "d1",
        dialogKey: "k1",
        title: "T",
      },
      NOW
    );

    expect(state.unreadDialogIds["d1"]).toBeUndefined();
  });

  it("is a no-op when required fields are missing", () => {
    const state = createState();
    const before = JSON.stringify(state);

    applySpaceEventCore(
      state,
      { type: "dialog.created", dialogId: "d1" }, // 缺 dialogKey/title
      NOW
    );

    expect(JSON.stringify(state)).toBe(before);
  });
});

describe("applySpaceEventCore dialog.done / dialog.failed", () => {
  it("marks done, bumps timestamp monotonically and sets unread", () => {
    const state = createState({
      dialogStatuses: { d1: "running" },
      dialogEventTimestamps: { d1: NOW },
    });

    applySpaceEventCore(state, { type: "dialog.done", dialogId: "d1" }, NOW);

    expect(state.dialogStatuses["d1"]).toBe("done");
    expect(state.dialogEventTimestamps["d1"]).toBe(NOW + 1);
    expect(state.unreadDialogIds["d1"]).toBe(true);
  });

  it("marks failed and sets unread", () => {
    const state = createState({
      dialogStatuses: { d1: "running" },
      dialogEventTimestamps: { d1: NOW },
    });

    applySpaceEventCore(state, { type: "dialog.failed", dialogId: "d1" }, NOW);

    expect(state.dialogStatuses["d1"]).toBe("failed");
    expect(state.dialogEventTimestamps["d1"]).toBe(NOW + 1);
    expect(state.unreadDialogIds["d1"]).toBe(true);
  });

  it("ignores done/failed without a dialogId", () => {
    const state = createState();
    const before = JSON.stringify(state);

    applySpaceEventCore(state, { type: "dialog.done" }, NOW);
    applySpaceEventCore(state, { type: "dialog.failed" }, NOW);

    expect(JSON.stringify(state)).toBe(before);
  });

  it("ignores unknown event types", () => {
    const state = createState();
    const before = JSON.stringify(state);

    applySpaceEventCore(state, { type: "dialog.something", dialogId: "d1" }, NOW);

    expect(JSON.stringify(state)).toBe(before);
  });
});
