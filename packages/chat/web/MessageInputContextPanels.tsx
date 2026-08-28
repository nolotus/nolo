// packages/chat/web/MessageInputContextPanels.tsx
// Above-the-box panels: attachments, image config, edit chips, activity.
// Each section is memoized so keystrokes (text-only) do not re-commit them.

import React, { lazy, memo, Suspense, useCallback, useMemo } from "react";
import type { ProcessLaunchInfo } from "chat/messages/types";
import {
  useAllToolRuns,
  updateProcessLaunchStatus,
} from "ai/tools/toolRunStore";
import type { PendingImagePreview } from "./AttachmentsPreview";
import type { ImageUiConfig } from "./messageInputAgentUi";
import ActivityProgressPanel from "./ActivityProgressPanel";
import {
  MessageInputConfirmBar,
  type MessageInputConfirmBarProps,
} from "./MessageInputConfirmBar";

const AttachmentsPreview = lazy(() => import("./AttachmentsPreview"));
const ImageConfigRow = lazy(() => import("./ImageConfigRow"));

export type MessageInputAttachmentsPanelProps = {
  imagePreviews: PendingImagePreview[];
  pendingFiles: any[];
  onRemoveImage: (id: string) => void;
  processingFiles: Set<string>;
  isMobile: boolean;
};

export const MessageInputAttachmentsPanel = memo(
  function MessageInputAttachmentsPanel({
    imagePreviews,
    pendingFiles,
    onRemoveImage,
    processingFiles,
    isMobile,
  }: MessageInputAttachmentsPanelProps) {
    return (
      <Suspense fallback={null}>
        <AttachmentsPreview
          imagePreviews={imagePreviews}
          pendingFiles={pendingFiles}
          onRemoveImage={onRemoveImage}
          processingFiles={processingFiles}
          isMobile={isMobile}
        />
      </Suspense>
    );
  }
);

export type MessageInputImageConfigPanelProps = {
  visible: boolean;
  aspectRatio: string | undefined;
  imageSize: "1K" | "2K" | "4K" | undefined;
  imageProfileKey: string | undefined;
  imageUiConfig: ImageUiConfig;
  onAspectRatioChange: (value: string | undefined) => void;
  onImageSizeChange: (value: "1K" | "2K" | "4K" | undefined) => void;
  onImageProfileChange: (value: string | undefined) => void;
};

export const MessageInputImageConfigPanel = memo(
  function MessageInputImageConfigPanel({
    visible,
    aspectRatio,
    imageSize,
    imageProfileKey,
    imageUiConfig,
    onAspectRatioChange,
    onImageSizeChange,
    onImageProfileChange,
  }: MessageInputImageConfigPanelProps) {
    if (!visible) return null;
    return (
      <Suspense fallback={null}>
        <ImageConfigRow
          aspectRatio={aspectRatio}
          imageSize={imageSize}
          imageProfileKey={imageProfileKey as "speed" | "quality" | undefined}
          imageUiConfig={imageUiConfig}
          onAspectRatioChange={onAspectRatioChange}
          onImageSizeChange={onImageSizeChange}
          onImageProfileChange={onImageProfileChange}
        />
      </Suspense>
    );
  }
);

export type MessageInputChipProps = {
  label: string;
  onDismiss: () => void;
  dismissAriaLabel: string;
  /** Optional primary action (e.g. expand a collapsed paste into the textarea). */
  onActivate?: () => void;
  activateAriaLabel?: string;
  className?: string;
};

export const MessageInputChip = memo(function MessageInputChip({
  label,
  onDismiss,
  dismissAriaLabel,
  onActivate,
  activateAriaLabel,
  className,
}: MessageInputChipProps) {
  const rootClass = [
    "message-input__canvas-edit-chip",
    onActivate ? "message-input__canvas-edit-chip--actionable" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass}>
      {onActivate ? (
        <button
          type="button"
          className="message-input__canvas-edit-chip-label"
          onClick={onActivate}
          aria-label={activateAriaLabel ?? label}
        >
          {label}
        </button>
      ) : (
        <span>{label}</span>
      )}
      <button type="button" onClick={onDismiss} aria-label={dismissAriaLabel}>
        ×
      </button>
    </div>
  );
});

export type MessageInputActivityPanelProps = {
  messages: any[];
  isActive: boolean;
};

export const MessageInputActivityPanel = memo(
  function MessageInputActivityPanel({
    messages,
    isActive,
  }: MessageInputActivityPanelProps) {
    return (
      <ActivityProgressPanel messages={messages} isActive={isActive} />
    );
  }
);

/**
 * RunningProcessesPanel
 *
 * 显示 launchProcess 启动、当前仍 running 的后台进程，每行带「停止」按钮。
 * 数据来源有两路：
 *   1) toolRun.processLaunch（若上游通过 setProcessLaunch 写入 toolRun）
 *   2) tool message.metadata.processLaunch（desktop runtime 经 tool-result 事件回传，
 *      processLaunch 透传到 message.metadata —— 这是当前实际数据路径）
 * 两路合并去重（按 pid），取 status === "running" 的条目。
 *
 * 「停止」按钮通过 Electrobun host-message 通道（globalThis.__electrobunSendToHost）
 * 向 bun 侧发送 nolo-desktop-process-control 消息，由 setupDesktopWindowControls 调
 * getProcessRegistry().kill(pid)。非 desktop 环境（web alpha）该全局函数不存在，
 * 按钮优雅降级为 disabled。停止后乐观更新本地 Redux 状态（若有 toolRunId），
 * 面板该行立即消失。
 */
type RunningProcessEntry = {
  pid: number;
  label: string;
  toolRunId?: string;
};

function isProcessLaunch(value: unknown): value is ProcessLaunchInfo {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as any).pid === "number" &&
    typeof (value as any).label === "string"
  );
}

export type RunningProcessesPanelProps = {
  /** 当前对话的全部消息（用于从 tool message.metadata.processLaunch 取进程信息） */
  messages?: any[];
};

export const RunningProcessesPanel = memo(function RunningProcessesPanel({
  messages,
}: RunningProcessesPanelProps) {
  const toolRuns = useAllToolRuns();

  const running = useMemo<RunningProcessEntry[]>(() => {
    const byPid = new Map<number, RunningProcessEntry>();

    // 路径 1：toolRun.processLaunch
    for (const run of toolRuns) {
      const p = run.processLaunch;
      if (p && p.status === "running" && typeof p.pid === "number") {
        byPid.set(p.pid, { pid: p.pid, label: p.label, toolRunId: run.id });
      }
    }

    // 路径 2：tool message.metadata.processLaunch（desktop runtime 实际回传路径）
    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (!msg || msg.role !== "tool") continue;
        const p = (msg as any)?.metadata?.processLaunch;
        if (isProcessLaunch(p) && p.status === "running") {
          if (!byPid.has(p.pid)) {
            byPid.set(p.pid, { pid: p.pid, label: p.label });
          }
        }
      }
    }

    return Array.from(byPid.values());
  }, [toolRuns, messages]);

  const handleStop = useCallback(
    (entry: RunningProcessEntry) => {
      const sendToHost = (globalThis as any).__electrobunSendToHost;
      if (typeof sendToHost === "function") {
        sendToHost({
          type: "nolo-desktop-process-control",
          action: "stop-process",
          pid: entry.pid,
        });
      }
      // 乐观更新：若有 toolRunId 则立即把状态标 stopped，面板该行消失。
      if (entry.toolRunId) {
        updateProcessLaunchStatus({ toolRunId: entry.toolRunId, status: "stopped" });
      }
    },
    []
  );

  const canStop =
    typeof (globalThis as any).__electrobunSendToHost === "function";

  if (running.length === 0) return null;

  return (
    <div className="running-processes-panel">
      <div className="running-processes-panel__title">
        运行中进程 ({running.length})
      </div>
      {running.map((entry) => (
        <div className="running-processes-panel__row" key={entry.pid}>
          <span className="running-processes-panel__label" title={entry.label}>
            {entry.label}
          </span>
          <span className="running-processes-panel__pid">pid {entry.pid}</span>
          <button
            type="button"
            className="running-processes-panel__stop-btn"
            disabled={!canStop}
            onClick={() => handleStop(entry)}
          >
            停止
          </button>
        </div>
      ))}
    </div>
  );
});

export type MessageInputConfirmPanelProps = MessageInputConfirmBarProps & {
  visible: boolean;
};

export const MessageInputConfirmPanel = memo(function MessageInputConfirmPanel({
  visible,
  ...barProps
}: MessageInputConfirmPanelProps) {
  if (!visible) return null;
  return <MessageInputConfirmBar {...barProps} />;
});
