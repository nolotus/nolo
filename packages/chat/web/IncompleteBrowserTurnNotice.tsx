import React, { useEffect, useMemo, useState } from "react";

import { useAppDispatch, useAppSelector } from "app/store";
import {
  handleSendMessage,
  useActiveControllers,
  useRecoveredForegroundTurn,
} from "chat/dialog/dialogSlice";
import { useCurrentDialogConfig } from "chat/dialog/useCurrentDialogConfig";
import {
  selectAllMsgs,
  useMessagesLoadingState,
} from "chat/messages/messageSlice";
import { useMessageDelete } from "chat/messages/hooks/useMessageDelete";
import { deriveIncompleteBrowserTurn } from "./incompleteBrowserTurn";

// ForegroundTurnRecovery needs 1.5s to discover a detached server-owned turn.
// Arm this browser-owned fallback slightly later so it cannot race the durable
// recovery banner on reload.
const INCOMPLETE_TURN_ARM_DELAY_MS = 1_700;

export const IncompleteBrowserTurnNotice: React.FC<{ dialogId: string }> = ({
  dialogId,
}) => {
  const dispatch = useAppDispatch();
  const dialogConfig = useCurrentDialogConfig();
  const dialogKey = dialogConfig?.dbKey ?? null;
  const hasReplyAgent =
    Array.isArray(dialogConfig?.cybots) && dialogConfig.cybots.length > 0;
  const messages = useAppSelector((state) => selectAllMsgs(state, dialogId));
  const { isLoadingInitial } = useMessagesLoadingState(dialogId);
  const activeControllers = useActiveControllers(dialogKey);
  const recoveredForegroundTurn = useRecoveredForegroundTurn(dialogKey);
  const [armed, setArmed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    setArmed(false);
    const timer = window.setTimeout(
      () => setArmed(true),
      INCOMPLETE_TURN_ARM_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [dialogId]);

  const incompleteMessage = useMemo(
    () =>
      armed && hasReplyAgent
        ? deriveIncompleteBrowserTurn({
            messages,
            isLoadingInitial,
            hasLocalOwner: Object.keys(activeControllers).length > 0,
            recoveredForegroundTurn,
          })
        : null,
    [
      activeControllers,
      armed,
      hasReplyAgent,
      isLoadingInitial,
      messages,
      recoveredForegroundTurn,
    ],
  );

  const messageDelete = useMessageDelete({
    dbKey:
      incompleteMessage && typeof incompleteMessage.dbKey === "string"
        ? incompleteMessage.dbKey
        : undefined,
    confirmMessageKey: "delConfirmMessage",
  });

  if (!incompleteMessage || !dialogKey) return messageDelete.modal;

  const retry = async () => {
    if (retrying || Object.keys(activeControllers).length > 0) return;
    setRetrying(true);
    try {
      await dispatch(
        handleSendMessage({
          dialogKey,
          isRetry: true,
          retryMessageId:
            typeof incompleteMessage.id === "string"
              ? incompleteMessage.id
              : undefined,
        }),
      ).unwrap();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <>
      <div
        role="status"
        aria-live="polite"
        data-testid="incomplete-browser-turn-notice"
        style={{
          margin: "0 12px 8px",
          padding: "8px 10px",
          border: "1px solid color-mix(in srgb, currentColor 18%, transparent)",
          borderRadius: 10,
          fontSize: 12,
          lineHeight: 1.45,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <span>上次回复在页面刷新或断开时未完成。</span>
        <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => void retry()}
            disabled={retrying}
          >
            {retrying ? "重试中…" : "重试"}
          </button>
          <button
            type="button"
            onClick={messageDelete.openConfirm}
            disabled={!messageDelete.canDelete || retrying}
          >
            放弃
          </button>
        </span>
      </div>
      {messageDelete.modal}
    </>
  );
};

export default IncompleteBrowserTurnNotice;
