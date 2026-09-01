// Wave E: 从 spaceSlice.runtime.test.ts 迁入 dialog runtime indicator 用例。
// applySpaceEvent 从 slice reducer 变为 spaceDialogStore 的普通函数（直接调用，不再 dispatch）；
// markDialogRead 仍是 thunk，保持 dispatch 形态。
import { configureStore } from "@reduxjs/toolkit";
import { describe, expect, test, beforeEach } from "bun:test";

import {
  applySpaceEvent,
  getDialogStatus,
  getIsDialogUnread,
  getUnreadDialogIds,
  resetSpaceDialogState,
} from "./spaceDialogStore";
import { markDialogRead } from "./markDialogReadThunk";
import { resetSpace } from "./spaceReset";
import { resetSpaceCurrentState } from "./spaceCurrentStore";
import { resetSpaceUiState } from "./spaceUiStore";
import { resetSpaceMembershipState } from "./spaceMembershipStore";

const makeStore = () =>
  configureStore({
    reducer: { noop: (s: any = {}) => s } as any,
    middleware: (gdm: any) => gdm({ thunk: true, serializableCheck: false }),
  });

beforeEach(() => {
  resetSpaceUiState();
  resetSpaceDialogState();
  resetSpaceMembershipState();
  resetSpaceCurrentState();
});

describe("space dialog runtime indicators (Wave B: module store)", () => {
  test("tracks running status and unread completion state for dialogs", async () => {
    applySpaceEvent({
      type: "dialog.created",
      dialogId: "dialog-1",
      dialogKey: "dialog-user-dialog-1",
      title: "Test dialog",
    } as any);

    // Wave B: dialog 实时状态在 module store，不在 Redux state。
    expect(getDialogStatus("dialog-1")).toBe("running");
    expect(getIsDialogUnread("dialog-1")).toBe(false);

    applySpaceEvent({ type: "dialog.done", dialogId: "dialog-1" } as any);
    expect(getIsDialogUnread("dialog-1")).toBe(true);

    // markDialogRead 无 dialogKey 时不触碰 db，仅清未读。
    await makeStore().dispatch(markDialogRead({ dialogId: "dialog-1" }) as any);
    expect(getIsDialogUnread("dialog-1")).toBe(false);
  });

  test("resetSpace clears dialog module store state", () => {
    applySpaceEvent({
      type: "dialog.created",
      dialogId: "dialog-1",
      dialogKey: "dialog-user-dialog-1",
      title: "Test dialog",
    } as any);
    expect(getDialogStatus("dialog-1")).toBe("running");

    resetSpace();
    expect(getDialogStatus("dialog-1")).toBeUndefined();
    expect(getUnreadDialogIds()).toEqual({});
  });
});
