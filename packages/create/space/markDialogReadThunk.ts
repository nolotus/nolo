// create/space/markDialogReadThunk.ts
// Wave E: 原 spaceSlice.markDialogRead。保持 dispatch(markDialogRead(...)) 形态。
// pending 的 clearDialogUnread 语义要求「立即清除未读」，因此在 async 体开头同步执行。
import { createAsyncThunk } from "@reduxjs/toolkit";
import { clearDialogUnread } from "./spaceDialogStore";

export const markDialogRead = createAsyncThunk(
  "space/markDialogRead",
  async (
    payload: { dialogId: string; dialogKey?: string },
    thunkAPI: any
  ) => {
    // pending 副作用：立即清除未读，不等待 patch 往返。
    clearDialogUnread(payload.dialogId);

    if (payload.dialogKey) {
      const { patch } = await import("database/dbSlice");
      try {
        await thunkAPI
          .dispatch(
            patch({ dbKey: payload.dialogKey, changes: { unreadAt: null } })
          )
          .unwrap();
      } catch (error) {
        console.warn(
          "[space/markDialogRead] failed to clear unreadAt",
          payload.dialogKey,
          error
        );
      }
    }

    // fulfilled 副作用。
    clearDialogUnread(payload.dialogId);
    return { dialogId: payload.dialogId };
  }
);
