// packages/chat/web/MessageInputConfirmBar.tsx
// Memoized delete-confirm strip above the composer.

import React, { memo } from "react";

export type MessageInputConfirmBarProps = {
  status: "pending" | "running" | "failed" | string;
  errorText?: string | null;
  failureLabel: string;
  deleteLabel: string;
  confirmDisabled: boolean;
  dismissDisabled: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
};

export const MessageInputConfirmBar = memo(function MessageInputConfirmBar({
  status,
  errorText,
  failureLabel,
  deleteLabel,
  confirmDisabled,
  dismissDisabled,
  onConfirm,
  onDismiss,
}: MessageInputConfirmBarProps) {
  return (
    <div
      className="message-input__confirm-bar"
      role="status"
      aria-live="polite"
    >
      <span className="message-input__confirm-text">
        {status === "failed"
          ? errorText || failureLabel
          : `是否删除「${deleteLabel}」？`}
      </span>
      <div className="message-input__confirm-actions">
        <button
          type="button"
          className="message-input__confirm-secondary"
          onClick={onDismiss}
          disabled={dismissDisabled}
        >
          取消
        </button>
        <button
          type="button"
          className="message-input__confirm-danger"
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          {status === "running"
            ? "删除中…"
            : status === "failed"
              ? "重试删除"
              : "确认删除"}
        </button>
      </div>
    </div>
  );
});
