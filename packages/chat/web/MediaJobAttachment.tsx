import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuX } from "react-icons/lu";
import type { MediaJob } from "ai/lecture/types";
import { ATTACHMENT_ITEM_KEY_ATTRIBUTE } from "./attachmentViewTransitions";

/** 附件条入参：jobId（随草稿发送）与文件名；语言/主题等由后续报价流程（W2）处理。 */
export interface MediaJobAttachmentProps {
  jobId: string;
  fileName: string;
  /** 轮询拿到 404/403（任务已无访问权）时调用，调用方摘除附件。 */
  onJobMissing?: () => void;
  /** cancelled 且无花费、无产物时调用，调用方摘除附件。 */
  onJobDiscard?: () => void;
  /** 用户点移除按钮；由调用方从草稿/存储中移除该附件。 */
  onRemove?: () => void;
}

const POLL_INTERVAL_MS = 5000;
const TERMINAL_STATUSES = new Set<MediaJob["status"]>([
  "done",
  "failed",
  "cancelled",
]);

/** 与报价卡一致的时长口径：不足 1 分钟显示秒，否则显示分钟（一位小数）。 */
export const formatMediaDuration = (sec: number) => {
  if (sec < 60) return `${Math.round(sec)} 秒`;
  const minutes = sec / 60;
  return Number.isInteger(minutes)
    ? `${minutes} 分钟`
    : `${minutes.toFixed(1)} 分钟`;
};

const MEDIA_JOB_ATTACHMENT_STYLES = `
  .attachment-item.media-job-attachment {
    flex: 1 1 240px;
    max-width: 360px;
    min-width: 200px;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--backgroundSecondary, var(--background));
    box-sizing: border-box;
  }

  .media-job-attachment__name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
    padding-right: var(--space-4);
  }

  .media-job-attachment__meta {
    display: block;
    margin-top: var(--space-1);
    color: var(--textSecondary);
    font-size: var(--fontSize-sm, 13px);
  }
`;

export function MediaJobAttachment({
  jobId,
  fileName,
  onJobMissing,
  onJobDiscard,
  onRemove,
}: MediaJobAttachmentProps) {
  const { t } = useTranslation("chat");
  const [durationSec, setDurationSec] = useState<number | null>(null);
  const [kind, setKind] = useState<MediaJob["kind"]>("audio");

  // 回调每次渲染都是新引用；经 ref 读取，避免轮询 effect 被反复重建。
  const callbacksRef = useRef({ onJobMissing, onJobDiscard });
  callbacksRef.current = { onJobMissing, onJobDiscard };

  useEffect(() => {
    let active = true;
    let timer: number | undefined;

    const schedule = () => {
      if (active) timer = window.setTimeout(load, POLL_INTERVAL_MS);
    };

    const load = async () => {
      if (!active) return;
      try {
        const response = await fetch(`/api/media-jobs/${jobId}`);
        if (!active) return;
        if (response.status === 404 || response.status === 403) {
          callbacksRef.current.onJobMissing?.();
          return;
        }
        if (!response.ok) return schedule();
        const data = (await response.json()) as { job?: MediaJob };
        const job = data.job;
        if (!job || !active) return schedule();
        setDurationSec(job.durationSec);
        setKind(job.kind);
        if (job.status === "cancelled") {
          const spent = Object.values(job.spent ?? {}).reduce(
            (sum, value) => sum + (value ?? 0),
            0,
          );
          const hasArtifacts = Object.keys(job.stageArtifacts ?? {}).length > 0;
          if (spent <= 0 && !hasArtifacts) {
            callbacksRef.current.onJobDiscard?.();
            return;
          }
        }
        if (TERMINAL_STATUSES.has(job.status)) return;
        schedule();
      } catch {
        /* 网络抖动：静默，下一轮再试 */
        schedule();
      }
    };

    void load();
    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [jobId]);

  const icon = kind === "video" ? "🎬" : "🎵";
  const removeLabel = t("mediaUploadRemove", {
    defaultValue: "移除 {{name}}",
    name: fileName,
  });

  return (
    <div
      className="attachment-item media-job-attachment"
      role="group"
      aria-label={fileName}
      data-media-job-attachment={jobId}
      {...{ [ATTACHMENT_ITEM_KEY_ATTRIBUTE]: `file-${jobId}` }}
    >
      <style data-name="media-job-attachment" precedence="high">
        {MEDIA_JOB_ATTACHMENT_STYLES}
      </style>
      <span className="media-job-attachment__name" title={fileName}>
        {icon} {fileName}
        {durationSec !== null ? ` · ${formatMediaDuration(durationSec)}` : ""}
      </span>
      {durationSec === null && (
        <span className="media-job-attachment__meta">
          {t("mediaJobReadingDuration", { defaultValue: "读取时长中…" })}
        </span>
      )}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove?.();
        }}
        className="remove-button"
        aria-label={removeLabel}
        title={removeLabel}
      >
        <LuX size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
