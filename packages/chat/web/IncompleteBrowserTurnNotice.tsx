import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

type NoticeBodyProps = {
  retrying: boolean;
  canAbandon: boolean;
  onRetry: () => void;
  onAbandon: () => void;
};

/**
 * 提示本体与它的「确认重试」状态。
 *
 * 2026-11-19：原来的确认态挂在最外层组件上。提示被隐藏（`return`）时组件并不卸载，
 * 于是旧确认会保留下来，作用到之后出现的**另一条**消息上；两个状态分支又复用同一个
 * 按钮节点，长按 Enter 或窄布局下的同坐标双击能直接触发重试。现在确认态下沉到本组件，
 * 由调用方用 `dialogId + 消息标识` 作 key——提示一消失、目标一换，状态自然丢弃。
 */
const NoticeBody = React.memo(function NoticeBody({
  retrying,
  canAbandon,
  onRetry,
  onAbandon,
}: NoticeBodyProps) {
  // 重试会真的再跑一次模型（可能重复计费、重复执行工具）。系统此刻无法证明上一次
  // 执行确实不在跑，所以点击后先确认一次，避免手滑造成重复执行。
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const retryRef = useRef<HTMLButtonElement | null>(null);
  // 只有「用户主动取消」才把焦点还给重试按钮；提示因状态变化被卸载时不抢焦点。
  const shouldRestoreRetryFocus = useRef(false);

  // 进入确认态时把焦点移到「取消」：焦点若留在原「重试」按钮上，长按 Enter 的重复
  // keydown 会直接激活替换后的确认按钮，绕过这一步确认。
  useEffect(() => {
    if (confirming) {
      cancelRef.current?.focus();
      return;
    }
    if (shouldRestoreRetryFocus.current) {
      shouldRestoreRetryFocus.current = false;
      retryRef.current?.focus();
    }
  }, [confirming]);

  const cancelConfirm = useCallback(() => {
    shouldRestoreRetryFocus.current = true;
    setConfirming(false);
  }, []);

  // 确认是一次性的：点下「确定重试」就消费掉它。否则请求失败后按钮会留在
  // 「确定重试」上，用户不必重新确认就能再发一次（同一条消息始终可见时尤其明显）。
  const confirmRetry = useCallback(() => {
    setConfirming(false);
    onRetry();
  }, [onRetry]);

  const message = confirming
    ? "重试可能让这句话再跑一次（重复计费或重复执行工具），确定吗？"
    : "上次回复未完成，可重试或放弃这条回复。";

  return (
    <>
      {/* live region 只包说明文字：按钮在区域内会让状态切换与「重试中…」反复被播报。 */}
      <span role="status" aria-live="polite" style={{ opacity: 0.72 }}>
        {message}
      </span>
      <span style={{ display: "inline-flex", gap: 8, flexShrink: 0 }}>
        {confirming ? (
          <>
            {/* 「取消」占据原「重试」的位置，窄布局下同一坐标点到的也是取消。 */}
            <button
              key="cancel"
              ref={cancelRef}
              type="button"
              onClick={cancelConfirm}
              disabled={retrying}
              style={textActionStyle(retrying)}
            >
              取消
            </button>
            <button
              key="confirm"
              type="button"
              onClick={confirmRetry}
              disabled={retrying}
              style={textActionStyle(retrying)}
            >
              {retrying ? "重试中…" : "确定重试"}
            </button>
          </>
        ) : (
          <>
            <button
              key="retry"
              ref={retryRef}
              type="button"
              onClick={() => setConfirming(true)}
              disabled={retrying}
              style={textActionStyle(retrying)}
            >
              重试
            </button>
            <button
              key="abandon"
              type="button"
              onClick={onAbandon}
              disabled={!canAbandon || retrying}
              style={textActionStyle(!canAbandon || retrying)}
            >
              放弃
            </button>
          </>
        )}
      </span>
    </>
  );
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

  const retry = useCallback(async () => {
    if (!dialogKey || !incompleteMessage) return;
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
  }, [activeControllers, dialogKey, dispatch, incompleteMessage, retrying]);

  if (!incompleteMessage || !dialogKey) return messageDelete.modal;

  // key 绑定「对话 + 待重试消息」：提示消失或目标变化时整块重建，确认态随之丢弃。
  const noticeKey = `${dialogKey}:${
    typeof incompleteMessage.id === "string"
      ? incompleteMessage.id
      : String(incompleteMessage.dbKey ?? "")
  }`;

  return (
    <>
      {/* 2026-11-19：原来是一个带边框/圆角/内边距的提示盒，和输入框同量级，
          视觉上像第二个可操作控件；内容一旦因布局挤压而不可见，就只剩一个空框，
          反而制造「界面坏了」的错误认知。按 product-truth §7「告知与控制必须分开」，
          这里改成无边框的一行辅助提示：文字 + 文字式操作，不再有容器身份。 */}
      <div
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
        <NoticeBody
          key={noticeKey}
          retrying={retrying}
          canAbandon={messageDelete.canDelete}
          onRetry={() => void retry()}
          onAbandon={messageDelete.openConfirm}
        />
      </div>
      {messageDelete.modal}
    </>
  );
};

export default IncompleteBrowserTurnNotice;
