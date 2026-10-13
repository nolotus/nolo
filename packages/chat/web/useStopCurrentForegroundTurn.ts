import { useCallback } from "react";

import { getForegroundExecutionClientState } from "ai/agent/foregroundExecutionClientState";
import { selectCurrentServer } from "app/settings/settingSlice";
import { useAppDispatch, useAppSelector } from "app/store";
import { abortAllMessages } from "chat/dialog/dialogSlice";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import { extractCustomId } from "core/prefix";
import { useToken } from "identity";
import { stopForegroundTurnOnServer } from "./stopForegroundTurnOnServer";

/**
 * Stop the current foreground turn from any Web control surface.
 *
 * Local abort keeps the initiating tab responsive; the server control call is
 * authoritative for server-owned execution. When the live/recovery stream has
 * exposed an executionId, include it so a delayed Stop cannot kill a newer
 * same-dialog turn.
 */
export function useStopCurrentForegroundTurn(): () => void {
  const dispatch = useAppDispatch();
  const server = useAppSelector(selectCurrentServer);
  const token = useToken();
  const dialogConfig = useCurrentDialogConfig();
  const dialogId = dialogConfig?.dbKey
    ? extractCustomId(dialogConfig.dbKey)
    : null;

  return useCallback(() => {
    // Read identity before local abort: aborting the response stream clears the
    // live client cache as part of stream cleanup.
    const executionId = dialogId
      ? getForegroundExecutionClientState(dialogId)?.executionId
      : undefined;

    dispatch(abortAllMessages());
    if (server && token && dialogId) {
      void stopForegroundTurnOnServer({
        server,
        token,
        dialogId,
        executionId,
      });
    }
  }, [dialogId, dispatch, server, token]);
}
