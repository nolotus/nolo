// packages/chat/web/QueueBadge.tsx
//
// Web UI for the chat queue: a small pill showing how many user inputs are
// queued while an agent turn is running, with an expandable preview popover.
//
// Reads the shared `ChatQueueStatus` projection (chat/queue/chatQueueStatus) so
// its semantics match the RN QueuedPill and the TUI status-line count exactly.
//
// During the Redux→core migration the status is still sourced from the legacy
// `selectPendingUserInputQueue` selector; once the adapter drives the core
// directly, this component will read from the adapter's runtime instead. The
// `ChatQueueStatus` shape stays the same either way.

import "./queue-badge.css";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  clearPendingUserInputQueue,
  usePendingUserInputQueue,
} from "chat/dialog/dialogSlice";

export type QueueBadgeProps = {
  dialogKey?: string | null;
  /** True while an agent turn is running (drives visibility). */
  isRunning: boolean;
};

function QueueBadgeImpl({ dialogKey, isRunning }: QueueBadgeProps) {
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
  // Keep a visible loop indicator even when the queue is empty. Without this
  // the composer goes completely quiet during long tool/model gaps and users
  // can mistake an active loop for a completed one.
  const visible = isRunning;
  const previewMax = 5;

  const handleClear = useCallback(() => {
    clearPendingUserInputQueue(dialogKey ? { dialogKey } : undefined);
    setOpen(false);
  }, [dialogKey]);

  if (!visible) return null;

  return (
    <div className="queue-badge" ref={popoverRef}>
      <button
        type="button"
        className={`queue-badge__pill${count === 0 ? " queue-badge__pill--running" : ""}`}
        aria-live="polite"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          count > 0
            ? t("queueBadgeLabel", "排队消息")
            : t("loopRunning", "Loop 运行中")
        }
        aria-expanded={open}
      >
        <span className="queue-badge__icon">{count > 0 ? "↥" : "⏳"}</span>
        {count > 0 && <span className="queue-badge__count">{count}</span>}
        <span className="queue-badge__label">
          {count > 0
            ? t("queueBadgeQueued", "排队中")
            : t("loopRunning", "Loop 运行中")}
        </span>
      </button>
      {open && count > 0 && (
        <div className="queue-badge__popover" role="dialog">
          <div className="queue-badge__popover-header">
            <span>{t("queueBadgeTitle", "排队消息")}</span>
            <button
              type="button"
              className="queue-badge__clear"
              onClick={handleClear}
            >
              {t("queueBadgeClear", "清空")}
            </button>
          </div>
          <ul className="queue-badge__list">
            {queue.slice(0, previewMax).map((text, i) => (
              <li key={i} className="queue-badge__item" title={text}>
                {text.length > 60 ? text.slice(0, 60) + "…" : text}
              </li>
            ))}
            {count > previewMax && (
              <li className="queue-badge__item queue-badge__item--more">
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