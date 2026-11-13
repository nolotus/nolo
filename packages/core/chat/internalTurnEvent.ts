// packages/core/chat/internalTurnEvent.ts
//
// Structured turn events and turn request models for chat queue and sub-agent
// completion wake events.

export type AgentRunCompletionShape = {
  runId: string;
  agentKey: string;
  agentName?: string;
  /**
   * 派发时调用方给的短标题（展示用）。
   *
   * 只做展示透传：归一化按白名单带上它，屏幕上的后台任务通知用它当标题
   * （优先于 agent 标签），因此「部分 run 已被 claim 后重新显示」那条路径
   * 也不会丢标题。缺省 = 没有，绝不从任务正文猜。
   */
  title?: string;
  status: string; // "done" | "failed" | "timeout" | "killed" | "orphaned" | etc.
  exitCode?: number;
  parentDialogId?: string;
  dialogId?: string;
  /** Local full-result path, when the runtime can read it directly. */
  resultFile?: string;
  ephemeral?: boolean;
  startedAt?: string | number;
  endedAt?: string | number;
  note?: string;
  error?: string;
  ack?: boolean;
  ackLease?: { token: string; claimedAt: number; ttlMs: number };
  activity?: {
    counters?: {
      toolCalls?: number;
      llmCalls?: number;
      fileEdits?: number;
    };
  };
};

export type ChildRunCompletedTurnEvent = {
  kind: "child-run-completed";
  runs: AgentRunCompletionShape[];
  /** 送进模型上下文的完整摘要。 */
  text: string;
  /**
   * 屏幕上要显示的紧凑单行（transcript / 队列预览）。
   *
   * 终态唤醒是 out-of-band 的系统事件，不是用户消息：完整摘要只该进模型
   * 上下文，屏幕上一行就够（详情本来就在 dock 面板和子 dialog 里）。缺省
   * 时调用方回落到 text。
   */
  displayText?: string;
};

export type UserTurnEvent = {
  kind: "user";
  text: string;
};

/**
 * 后台进程任务（`launchProcess` / 自动 detach 的 `execShell`）终态事件。
 *
 * 与 `child-run-completed` 刻意分开：进程任务没有 run 记录、没有子 dialog。两条状态轴
 * （ProcessTaskStatus vs AGENT_RUN_TERMINAL_STATUSES）不在这里合并。
 *
 * `text` 对 promoted execShell 终态直接携带 result capsule（bounded
 * stdout/stderr tail）；launchProcess ambient / 用户 kill 的终态没有
 * capsule，text 回落到摘要行（taskId / status / exitCode）。`displayText`
 * 始终是单行摘要，不含 capsule 正文。
 */
export type BackgroundTaskCompletedTurnEvent = {
  kind: "background-task-completed";
  /** Host-only causal depth; never part of event text. */
  processCausalDepth?: number;
  taskId: string;
  status: "stopped" | "exited" | "failed";
  exitCode?: number;
  /** 送进模型上下文的完整摘要（promoted execShell 含 result capsule 正文）。 */
  text: string;
  /** 屏幕上要显示的紧凑单行（系统事件不套用户气泡）。 */
  displayText?: string;
  /** 原始终态通知载荷（promoted execShell 含 resultCapsule、spill 路径、真实 pid/label 等）。 */
  notice?: import("../../agent-runtime/processRegistry").ProcessTerminalNotice;
};

/** Host lifecycle signal, never a user submission or a fabricated child run. */
export type AutoReviewContinuationTurnEvent = {
  kind: "auto-review-continuation";
  scope: { taskId: string; taskInstanceId?: string; dialogId: string; workspace: string };
  eventKey: string;
  action: "continue-author" | "request-review" | "decide-review" | "commit" | "local-merge";
  text: string;
  displayText: string;
};

export type InternalTurnEvent =
  | AutoReviewContinuationTurnEvent
  | UserTurnEvent
  | ChildRunCompletedTurnEvent
  | BackgroundTaskCompletedTurnEvent;

export type TurnRequest = {
  /** Durable user-message identity; adapters reuse it on admission, send and reload. */
  messageId?: string;
  /** Original submission source, retained across queue/batch boundaries. */
  source?: string;
  event: InternalTurnEvent;
  text: string;
  /**
   * 随消息排队的本地图片路径（已解析、入队时确认可读）。只存路径不存 dataURL：
   * 排队期间文件可能变化，也避免大 base64 常驻队列；由 drain 方在 turn 开始时
   * 再读取。可选字段，Web/RN 消费者无感。
   */
  imagePaths?: string[];
  /**
   * 随消息排队的可读音视频路径（与 imagePaths 同语义：存路径不存内容，
   * drain 方在 turn 开始前做 ffmpeg 预处理 + 转写，transcript 文本并入
   * 发给模型的消息体）。可选字段，不涉及的消费者无感。
   */
  mediaPaths?: string[];
};

/**
 * Normalizes a local RunRecord or generic run completion object into a minimal
 * completion shape for watcher and scheduler consumption.
 */
export function normalizeRunCompletionShape(
  record: Record<string, any>
): AgentRunCompletionShape {
  const runId = String(record.runId ?? record.id ?? "");
  const agentKey = String(record.agentKey ?? record.agent ?? "");
  const status = String(record.status ?? "done");
  const counters = record.activity?.counters;
  return {
    runId,
    agentKey,
    ...(typeof record.agentName === "string" ? { agentName: record.agentName } : {}),
    ...(typeof record.title === "string" && record.title.trim()
      ? { title: record.title.trim() }
      : {}),
    status,
    ...(typeof record.exitCode === "number" ? { exitCode: record.exitCode } : {}),
    ...(typeof record.parentDialogId === "string" ? { parentDialogId: record.parentDialogId } : {}),
    ...(typeof record.dialogId === "string" ? { dialogId: record.dialogId } : {}),
    ...(typeof record.resultFile === "string" ? { resultFile: record.resultFile } : {}),
    ...(typeof record.ephemeral === "boolean" ? { ephemeral: record.ephemeral } : {}),
    ...(record.startedAt !== undefined ? { startedAt: record.startedAt } : {}),
    ...(record.endedAt !== undefined ? { endedAt: record.endedAt } : {}),
    ...(typeof record.note === "string" ? { note: record.note } : {}),
    ...(typeof record.error === "string" ? { error: record.error } : {}),
    ...(typeof record.ack === "boolean" ? { ack: record.ack } : {}),
    ...(counters
      ? {
          activity: {
            counters: {
              toolCalls: typeof counters.toolCalls === "number" ? counters.toolCalls : 0,
              llmCalls: typeof counters.llmCalls === "number" ? counters.llmCalls : 0,
              fileEdits: typeof counters.fileEdits === "number" ? counters.fileEdits : 0,
            },
          },
        }
      : {}),
  };
}

export function createTurnRequest(input: InternalTurnEvent | TurnRequest | string): TurnRequest {
  if (typeof input === "string") {
    return {
      event: { kind: "user", text: input },
      text: input,
    };
  }
  if ("event" in input && typeof input.event === "object" && typeof input.text === "string") {
    return input as TurnRequest;
  }
  const event = input as InternalTurnEvent;
  return {
    event,
    text: event.text,
  };
}
