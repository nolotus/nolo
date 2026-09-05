// packages/chat/web/QueueBadge.tsx
//
// Web UI for the chat queue: a small pill showing how many user inputs are
// queued while an agent turn is running, with an expandable preview popover.
//
// Reads the shared `ChatQueueStatus` projection (chat/queue/chatQueueStatus) so
// its semantics match the RN QueuedPill and the TUI status-line count exactly.
//
// Queue-only contract（域 B）：count>0 显示排队数量；count===0 一律不渲染，
// 无论 loop 是否运行 —— 「正在进行」的单一主 working signal 由
// ConversationActivity（chat/runtime/conversationActivity）负责，本组件不再
// 展示循环运行的实现语言（原循环状态文案与内联 locale key 已随本变更移除）。

import { memo, useCallback, useEffect, useRef, useState } from "react";
import * as stylex from "@stylexjs/stylex";
import { useTranslation } from "react-i18next";
import { queueBadgeStyles } from "./queueBadgeStyles";
import "./chatStylexEscapeHatch.css";
import {
  clearPendingUserInputQueue,
  usePendingUserInputQueue,
} from "chat/dialog/dialogSlice";

export type QueueBadgeProps = {
  dialogKey?: string | null;
};

function QueueBadgeImpl({ dialogKey }: QueueBadgeProps) {
  const { t } = useTranslation("chat");
  const queue = usePendingUserInputQueue(dialogKey ?? undefined);
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  // Close the popover on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const count = Array.isArray(queue) ? queue.length : 0;
  // Queue-only visibility: nothing queued → nothing to say.
  const visible = count > 0;
  const previewMax = 5;

  const handleClear = useCallback(() => {
    clearPendingUserInputQueue(dialogKey ? { dialogKey } : undefined);
    setOpen(false);
  }, [dialogKey]);

  if (!visible) return null;

  return (
    <div {...stylex.props(queueBadgeStyles.badge)} ref={popoverRef}>
      <button
        type="button"
        {...stylex.props(queueBadgeStyles.pill)}
        aria-live="polite"
        onClick={() => setOpen((v) => !v)}
        aria-label={t("queueBadgeLabel", "排队消息")}
        aria-expanded={open}
      >
        <span {...stylex.props(queueBadgeStyles.icon)}>↥</span>
        <span {...stylex.props(queueBadgeStyles.count)}>{count}</span>
        <span {...stylex.props(queueBadgeStyles.label)}>
          {t("queueBadgeQueued", "排队中")}
        </span>
      </button>
      {open && count > 0 && (
        <div {...stylex.props(queueBadgeStyles.popover)} role="dialog">
          <div {...stylex.props(queueBadgeStyles.popoverHeader)}>
            <span>{t("queueBadgeTitle", "排队消息")}</span>
            <button
              type="button"
              {...stylex.props(queueBadgeStyles.clear)}
              onClick={handleClear}
            >
              {t("queueBadgeClear", "清空")}
            </button>
          </div>
          <ul {...stylex.props(queueBadgeStyles.list)}>
            {queue.slice(0, previewMax).map((text, i) => (
              <li key={i} {...stylex.props(queueBadgeStyles.item)} title={text}>
                {text.length > 60 ? text.slice(0, 60) + "…" : text}
              </li>
            ))}
            {count > previewMax && (
              <li
                {...stylex.props(queueBadgeStyles.item, queueBadgeStyles.itemMore)}
              >
                {t("queueBadgeMore", "还有 {{n}} 条", { n: count - previewMax })}
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export const QueueBadge = memo(QueueBadgeImpl);
