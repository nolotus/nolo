// packages/chat/web/MessageInputContextPanels.tsx
// Above-the-box panels: attachments, image config, edit chips, activity.
// Each section is memoized so keystrokes (text-only) do not re-commit them.

import React, {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ProcessLaunchInfo } from "chat/messages/types";
import {
  createDesktopProcessSnapshotClient,
  type DesktopProcessSnapshot,
  type DesktopProcessSnapshotClient,
} from "./desktopProcessSnapshot";
import {
  useAllToolRuns,
  updateProcessLaunchStatus,
} from "ai/tools/toolRunStore";
import type { PendingImagePreview } from "./AttachmentsPreview";
import type { ImageUiConfig } from "./messageInputAgentUi";
import ActivityProgressPanel from "./ActivityProgressPanel";
import AgentRunsPanel from "./AgentRunsPanel";
import type { AgentRunScope } from "./agentRunStore";
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
  agentRunScope?: AgentRunScope;
};

export const MessageInputActivityPanel = memo(
  function MessageInputActivityPanel({
    messages,
    isActive,
    agentRunScope,
  }: MessageInputActivityPanelProps) {
    return (
      <>
        {agentRunScope && <AgentRunsPanel scope={agentRunScope} />}
        <ActivityProgressPanel messages={messages} isActive={isActive} />
      </>
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
 * 向 bun 侧发送 nolo-desktop-process-control 消息，由 attachDesktopHostMessageBridge
 * 调 getProcessRegistry().kill(pid)。非 desktop 环境（web alpha）该全局函数不存在，
 * 按钮优雅降级为 disabled。停止后乐观更新本地 Redux 状态（若有 toolRunId），
 * 面板该行立即消失。
 */
export type RunningProcessEntry = {
  pid: number;
  label: string;
  toolRunId?: string;
  /**
   * 进程注册表任务 id。有 taskId 的条目会被宿主快照核对存活；
   * 没有 taskId（老消息/非 desktop 路径）时不做过滤，保持原行为。
   */
  taskId?: string;
};

export function isProcessLaunch(value: unknown): value is ProcessLaunchInfo {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as any).pid === "number" &&
    typeof (value as any).label === "string"
  );
}

export function useRunningProcesses(
  messages?: any[],
  stoppedPids?: Set<number>
): RunningProcessEntry[] {
  const toolRuns = useAllToolRuns();

  const candidates = useMemo<RunningProcessEntry[]>(() => {
    const byPid = new Map<number, RunningProcessEntry>();

    // 路径 1：toolRun.processLaunch
    for (const run of toolRuns) {
      const p = run.processLaunch;
      if (p && p.status === "running" && typeof p.pid === "number") {
        if (!stoppedPids?.has(p.pid)) {
          byPid.set(p.pid, {
            pid: p.pid,
            label: p.label,
            toolRunId: run.id,
            taskId: p.taskId,
          });
        }
      }
    }

    // 路径 2：tool message.metadata.processLaunch（desktop runtime 实际回传路径）
    if (Array.isArray(messages)) {
      for (const msg of messages) {
        if (!msg || msg.role !== "tool") continue;
        const p = (msg as any)?.metadata?.processLaunch;
        if (isProcessLaunch(p) && p.status === "running") {
          if (!stoppedPids?.has(p.pid) && !byPid.has(p.pid)) {
            byPid.set(p.pid, { pid: p.pid, label: p.label, taskId: p.taskId });
          }
        }
      }
    }

    return Array.from(byPid.values());
  }, [toolRuns, messages, stoppedPids]);

  const taskIds = useMemo(
    () =>
      candidates
        .map((entry) => entry.taskId)
        .filter((id): id is string => typeof id === "string" && !!id),
    [candidates]
  );
  const snapshot = useDesktopProcessSnapshot(taskIds);

  // 只有「宿主确实核对过、且不在存活集合里」才算退出。没查过的（发送失败的
  // 批次、超长 taskId、过期轮次、本轮未覆盖）一律按未知保留：把未知当死亡会
  // 隐藏真实进程，连带把它的停止入口一起弄丢。
  if (!snapshot) return candidates;
  return candidates.filter((entry) => {
    if (!entry.taskId) return true; // 老消息 / path 1：无从核对
    if (!snapshot.checked.has(entry.taskId)) return true;
    return snapshot.alive.has(entry.taskId);
  });
}

/**
 * Desktop 宿主快照：只回「哪些 taskId 还活着」。
 *
 * 为什么必须对账：面板数据来自消息里的 metadata.processLaunch，那条记录的
 * status 在进程自然退出、宿主重启后不会被改写，重开对话就会把早已死掉的 pid
 * 当成 running 显示。pid 不可靠（会被系统复用），taskId 才是注册表主键，所以
 * 只校验 taskId；拿不到快照（web 构建 / 无宿主桥）时返回 null，调用方不过滤。
 */
const DESKTOP_PROCESS_SNAPSHOT_GLOBAL = "__noloSetDesktopProcesses";

/**
 * 单例：页面（DialogPage）与面板（RunningProcessesPanel）都会调用
 * useRunningProcesses，必须共用同一个订阅器——否则后注册的会覆盖前一个回调，
 * 任一卸载又无条件删除，快照就收不到或串台。状态机本体在
 * ./desktopProcessSnapshot（纯逻辑、可单测）。
 */
let sharedDesktopSnapshotClient: DesktopProcessSnapshotClient | null = null;

function getSharedDesktopSnapshotClient(): DesktopProcessSnapshotClient | null {
  const send = (globalThis as any).__electrobunSendToHost;
  if (typeof send !== "function") return null; // web 构建：没有宿主注册表
  if (!sharedDesktopSnapshotClient) {
    const client = createDesktopProcessSnapshotClient({
      send: (message) => send(message),
    });
    (globalThis as any)[DESKTOP_PROCESS_SNAPSHOT_GLOBAL] = (
      requestId: unknown,
      alive: unknown,
      checked: unknown
    ) => client.handleReply(requestId, alive, checked);
    sharedDesktopSnapshotClient = client;
  }
  return sharedDesktopSnapshotClient;
}

function useDesktopProcessSnapshot(
  taskIds: string[]
): DesktopProcessSnapshot | null {
  const [snapshot, setSnapshot] = useState<DesktopProcessSnapshot | null>(null);
  const queryKey = taskIds.join(",");

  useEffect(() => {
    const client = getSharedDesktopSnapshotClient();
    if (!client) return;
    const ids = queryKey ? queryKey.split(",") : [];
    // 这里刻意不清空 snapshot：清空会让过滤临时失效，把已确认退出的条目闪回。
    // 三态语义下旧快照的 checked 只代表「上次核对过的范围」，新出现的 taskId
    // 不在其中，天然按未知保留，等下一轮刷新即可。
    return client.subscribe(ids, setSnapshot);
  }, [queryKey]);

  return snapshot;
}

export type RunningProcessesPanelProps = {
  /** 当前对话的全部消息（用于从 tool message.metadata.processLaunch 取进程信息） */
  messages?: any[];
};

export const RunningProcessesPanel = memo(function RunningProcessesPanel({
  messages,
}: RunningProcessesPanelProps) {
  const [stoppedPids, setStoppedPids] = useState<Set<number>>(() => new Set());
  const running = useRunningProcesses(messages, stoppedPids);

  const handleStop = useCallback(
    (entry: RunningProcessEntry) => {
      setStoppedPids((prev) => new Set(prev).add(entry.pid));
      // 下沉到共享层：另一个消费者（DialogPage）据此立刻收起右栏槽位，
      // 不必等下一轮宿主快照，避免点停止后留下一个空白侧栏。
      if (entry.taskId) getSharedDesktopSnapshotClient()?.markStopped(entry.taskId);
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
