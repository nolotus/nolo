import "./message-input.css";
import { LuArrowUp, LuLoader } from "react-icons/lu";
import { useAppDispatch } from "app/store";
import {
  abortAllMessages,
  useActiveControllers,
} from "chat/dialog/dialogSlice";
import { useHasStreamingMessage } from "chat/messages/messageSlice";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"
import { useCallback, useEffect, useState } from "react";
import type React from "react";

interface SendButtonProps {
  onClick: () => void;
  disabled: boolean;
  /**
   * Sending in flight (e.g. quick-chat 正在做意图分类/建对话)。渲染 loading
   * 形态（转圈 + aria-busy），同时禁用重复点击，给用户立即可见的反馈。
   * - `loading` 仅在 `canAbort` 为 false 时生效；停止生成态优先级更高。
   */
  loading?: boolean;
  testId?: string;
}

const SendButton: React.FC<SendButtonProps> = ({
  onClick,
  disabled,
  loading = false,
  testId,
}) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation("chat");
  const activeControllers = useActiveControllers();
  const hasStreamingMessage = useHasStreamingMessage();
  const canAbort = Object.keys(activeControllers).length > 0 || hasStreamingMessage;
  const isLoading = !canAbort && loading;

  const [isAnimating, setIsAnimating] = useState(false);

  const handleAbortAllMessages = useCallback(() => {
    dispatch(abortAllMessages());
    toast.success(t("allMessagesAborted", "已停止生成"), { duration: 3000 });
  }, [dispatch, t]);

  // 全局 Escape 键快捷打断（无模态框时生效）
  useEffect(() => {
    if (!canAbort) return;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      const hasModal =
        typeof document !== "undefined" &&
        Boolean(
          document.querySelector(
            ".modal--open, .c-dialog, dialog[open], [role='dialog']"
          )
        );
      if (hasModal) return;

      e.preventDefault();
      handleAbortAllMessages();
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [canAbort, handleAbortAllMessages]);

  const handleClick = useCallback(() => {
    if (canAbort) {
      handleAbortAllMessages();
      return;
    }
    // Loading 期间屏蔽重复点击，避免连发。
    if (isLoading) return;
    onClick();
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 500);
  }, [canAbort, isLoading, handleAbortAllMessages, onClick]);

  const handleMouseDown = useCallback<
    React.MouseEventHandler<HTMLButtonElement>
  >((event) => {
    // Keep textarea focus on pointer send/stop clicks; keyboard activation
    // still works normally because this only affects mouse down.
    event.preventDefault();
  }, []);

  const variantClass = canAbort
    ? "stop-mode"
    : isLoading
      ? "loading"
      : "send-mode";
  const isEffectivelyDisabled = (disabled || isLoading) && !canAbort;
  const ariaLabel = canAbort
    ? t("stopAllGeneration")
    : isLoading
      ? t("sendLoading", "Sending…")
      : t("send");
  const ariaTitle = canAbort
    ? t("stopAllGeneration")
    : isLoading
      ? t("sendLoading", "Sending…")
      : t("send");

  return (
    <button
      type="button"
      className={`send-button ${variantClass}`}
      data-testid={testId}
      data-loading={isLoading ? "true" : undefined}
      aria-busy={isLoading || undefined}
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      disabled={isEffectivelyDisabled}
      aria-label={ariaLabel}
      title={ariaTitle}
    >
      {canAbort ? (
        <div className="stop-indicator" aria-hidden="true" />
      ) : isLoading ? (
        <LuLoader
          size={20}
          strokeWidth={1.8}
          className="send-loading-icon"
          aria-hidden="true"
        />
      ) : (
        <LuArrowUp
          size={20}
          strokeWidth={1.75}
          className={`send-icon ${isAnimating ? "animating" : ""}`}
          aria-hidden="true"
        />
      )}
    </button>
  );
};

export default SendButton;
