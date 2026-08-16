import { createAsyncThunk } from "@reduxjs/toolkit";
import { extractCustomId } from "core/prefix";
import { DialogConfig } from "app/types";
import { selectById } from "database/dbSlice";
import { createDialog } from "../dialogSlice";
import { updateDialogSummaryAction } from "./updateDialogSummaryAction";

import type { Message } from "chat/messages/types";

export const runCompactDialogAndForkAction = async (
  args: { dialogKey: string },
  thunkApi: any
) => {
  const { dispatch, getState } = thunkApi;
  const state = getState();
  const dialogKey = args.dialogKey;
  const dialogId = extractCustomId(dialogKey);
  const dialogConfig = selectById(state, dialogKey) as DialogConfig | null;
  const preFetchedMessages: Message[] =
    state.message.dialogStateById[dialogId]?.msgs?.ids?.flatMap(
      (id: string) => {
        const msg =
          state.message.dialogStateById[dialogId]?.msgs?.entities?.[id];
        return msg ? [msg as Message] : [];
      },
    ) ?? [];

  const nextAgentKey = dialogConfig?.cybots?.[0];
  if (!nextAgentKey) {
    throw new Error("Cannot compact a dialog without a primary agent.");
  }

  await updateDialogSummaryAction(
    { dialogKey, preFetchedMessages, force: true, reason: "manual" },
    thunkApi
  );

  return dispatch(
    createDialog({
      cybots: [nextAgentKey],
      category: dialogConfig?.category,
      spaceId: dialogConfig?.spaceId,
      inheritFromDialogKey: dialogKey,
      skipGreeting: true,
    })
  ).unwrap();
};

export const compactDialogAndForkAction = createAsyncThunk(
  "dialog/compactDialogAndFork",
  runCompactDialogAndForkAction
);
