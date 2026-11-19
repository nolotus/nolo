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

// 文字式操作：没有按钮底色与边框，靠下划线与继承色表达可点击，避免在辅助提示里
// 再立一套按钮形态（告知与控制分开，但控制不应喧宾夺主）。
// 弱化只作用于说明文字；按钮自己按禁用态显示（无下划线、默认光标、半透明），
// 否则启用与禁用看起来一样——禁用项仍像可点，是比"多一个框"更实的可用性缺陷。
const textActionStyle = (disabled: boolean): React.CSSProperties => ({
  padding: 0,
  border: "none",
  background: "none",
  font: "inherit",
  color: "inherit",
  textDecoration: disabled ? "none" : "underline",
  textUnderlineOffset: 2,
  cursor: disabled ? "default" : "pointer",
  opacity: disabled ? 0.5 : 1,
});

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
      {/* 2026-11-19：原来是一个带边框/圆角/内边距的提示盒，和输入框同量级，
          视觉上像第二个可操作控件；内容一旦因布局挤压而不可见，就只剩一个空框，
          反而制造「界面坏了」的错误认知。按 product-truth §7「告知与控制必须分开」，
          这里改成无边框的一行辅助提示：文字 + 文字式操作，不再有容器身份。 */}
      <div
        role="status"
        aria-live="polite"
        data-testid="incomplete-browser-turn-notice"
        style={{
          display: "flex",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: 8,
          margin: "0 12px 6px",
          fontSize: 12,
          lineHeight: 1.45,
        }}
      >
        <span style={{ opacity: 0.72 }}>上次回复未完成，可重试或放弃这条回复。</span>
        <span style={{ display: "inline-flex", gap: 8, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => void retry()}
            disabled={retrying}
            style={textActionStyle(retrying)}
          >
            {retrying ? "重试中…" : "重试"}
          </button>
          <button
            type="button"
            onClick={messageDelete.openConfirm}
            disabled={!messageDelete.canDelete || retrying}
            style={textActionStyle(!messageDelete.canDelete || retrying)}
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
