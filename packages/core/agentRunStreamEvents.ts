/**
 * SSE 事件词汇表的单一真值（discriminated union）。
 *
 * 以 loop.ts 全部 `send({type:...})` 为准，补充 index.ts 转发层事件。
 * 新增 turn_warning 用于空响应 / 长度截断提示。
 *
 * 纯类型文件，无 runtime 依赖（对 remoteTaskView 的引用是 `import type`，
 * 编译期擦除，不上运行时依赖）。
 */

import type {
  RemoteTaskCleanupView,
  RemoteTaskCostView,
  RemoteTaskProcessView,
  RemoteTaskStageView,
  ToolExecutionLocation,
} from "./remoteTaskView";

/** 文本增量 */
export interface AgentRunStreamTextEvent {
  type: "text";
  content: string;
}

/** 思考增量（reasoning） */
export interface AgentRunStreamThinkingEvent {
  type: "thinking";
  content: string;
}

/** 完成信号（SSE 分支完整版） */
export interface AgentRunStreamDoneEvent {
  type: "done";
  usage?: Record<string, any>;
  provider?: string;
  model?: string;
  inputPrice?: number;
  outputPrice?: number;
  /** CLI 分支用 elapsed 替代 provider/model/price */
  elapsed?: number;
  /** machine-connector 分支用 artifacts */
  artifacts?: unknown;
  /** Optional provider/model-bound Responses continuation state. */
  responsesState?: {
    provider: string;
    model: string;
    responseId: string;
  } | null;
  /**
   * 本轮以空轮/截断兜底文案收尾时的成因（失败轮可观测：done 但带伤）。
   * 消费方（计费/持久化包装层）据此在落盘记录上写 fallbackReason 等字段。
   * 取值复用 turn_warning 的 reason 枚举，不新增。
   */
  fallbackReason?: "empty_completion" | "length_truncated" | "stream_truncated" | "responses_state_fallback";
  /** 兜底发生时本轮是否已用过一次 repair。 */
  repairUsed?: boolean;
}

/** 错误信号 */
export interface AgentRunStreamErrorEvent {
  type: "error";
  message: string;
  reason?: "provider_credential_revoked";
  providerCredential?: unknown;
  /**
   * 结构化错误码（CLIENT_VERSION_TOO_OLD 三层贯通：server loop 的版本闸门
   * 拒绝帧携带；CLI handlePayload 把它挂到抛出的 Error 上供渲染分支识别）。
   */
  code?: string;
  /**
   * 结构化 detail（buildClientVersionGateErrorDetail 的形状：reason/model/
   * minClientVersion/clientVersion?/upgradeCommand/retryable）。与此前的
   * credential-revoked 附加字段同属「error 帧带结构化字段」的既有模式。
   */
  detail?: Record<string, unknown>;
}

/**
 * 取消信号（显式 Stop）：server-owned foreground execution 的 AbortSignal
 * 被控制面 abort 后，loop 在退出前发出的终态帧。
 *
 * 消费契约：
 * - 持久化包装层（index.ts 的 foreground SSE wrapper）据此把已收集的部分
 *   输出按 cancelled 落盘（与客户端断线的 cancel-hook 同语义）；
 * - durable mirror（response.ts）把 cancelled 归类为终态，在流 EOF 后发布
 *   foreground_turn_terminal { status: "cancelled" }；
 * - 不得把该帧当成 error 处理（cancelled ≠ failed）。
 */
export interface AgentRunStreamCancelledEvent {
  type: "cancelled";
  reason?: string;
}

/** assistant 工具调用声明 */
export interface AgentRunStreamAssistantToolCallsEvent {
  type: "assistant_tool_calls";
  content: string | null;
  tool_calls: Array<{
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }>;
}

/** 工具开始执行 */
export interface AgentRunStreamToolStartEvent {
  type: "tool_start";
  /**
   * 新版携带 provider 返回的真实 tool-call id；保留 string[] 兼容旧服务端。
   */
  calls: Array<string | {
    toolCallId: string;
    toolName: string;
  }>;
}

/** 工具执行结果 */
export interface AgentRunStreamToolResultEvent {
  type: "tool_result";
  toolCallId: string;
  toolName: string;
  content: string;
  metadata?: Record<string, any>;
}

/** 工具执行结束 */
export interface AgentRunStreamToolEndEvent {
  type: "tool_end";
}

/** agent 交接 */
export interface AgentRunStreamAgentHandoffEvent {
  type: "agent_handoff";
  agentKey: string;
  agentName: string;
  inline: boolean;
  threadMetadata?: unknown;
}

/** 文档创建 */
export interface AgentRunStreamDocCreatedEvent {
  type: "doc_created";
  dbKey: string;
  title?: string;
  spaceId?: string;
}

/** 对话元信息（index.ts 转发层发出） */
export interface AgentRunStreamDialogEvent {
  type: "dialog";
  dialogId: string;
  dialogKey: string;
  status: "running";
}

/** 对话状态变更（index.ts 转发层发出） */
export interface AgentRunStreamStatusEvent {
  type: "status";
  status: string;
}

/** 回合警告（空响应 / 长度截断） */
export interface AgentRunStreamTurnWarningEvent {
  type: "turn_warning";
  reason:
    | "empty_completion"
    | "length_truncated"
    | "stream_truncated"
    | "responses_state_fallback";
  message: string;
  /**
   * 失败轮可观测：警告发生时本轮是否已用过一次 repair（结构化字段，
   * 供持久化包装层写入 run/dialog 记录；CLI 客户端静默本事件，不受影响）。
   */
  repairUsed?: boolean;
  /** 兜底轮的 provider 信息（流式路径手里已有 lastResolvedProvider）。 */
  provider?: string;
  /** 平台侧 provider 调用 id（streamProviderCallId），用于对账/排障。 */
  providerCallId?: string;
}

/** sub-agent run 生命周期阶段 */
export type AgentRunLifecyclePhase = "started" | "updated" | "finished";

/** sub-agent run 快照（Web/桌面运行区的数据源） */
export interface AgentRunLifecycleRun {
  runId: string;
  title?: string;
  agentName?: string;
  status: "running" | "done" | "failed" | "cancelled";
  /** epoch ms */
  startedAt: number;
  finishedAt?: number;
  toolCallCount?: number;
  lastToolNames?: string[];
  /** 此刻在执行什么（拿不到就不填） */
  inFlight?: string;
}

/**
 * SSE scope 结构与鉴权字段的单一声明（§3.5 护栏 2）。
 * `agent_run` 与 `remote_task` 共用同一结构：不新增鉴权面、不新增第二中心。
 * 订阅端一律经 canUserAccessDialogEventChannel 校验归属；server 侧二次校验
 * `scope.userId === run owner userId`，不一致 → 丢弃 + 记诊断（不落库、不改状态）。
 */
export interface AgentRunStreamScope {
  userId: string;
  dialogId?: string;
  workspaceId?: string;
}

/**
 * sub-agent run 生命周期事件。仅发往 run 归属 user 的 scope.dialogId 事件通道
 * （dialog-<dialogId>，订阅端经 canUserAccessDialogEventChannel 校验归属）。
 * 终态 `finished` 之后不再发 `updated`。
 * 与 `remote_task` 的分界：**本条不豁免** startedAt 代际拒绝（迟到的 updated 按
 * 代际丢弃，`agentRunStore.ts` 的 tombstone 规则只作用于本成员）；`remote_task`
 * 明确豁免，见下（§7.3）。
 */
export interface AgentRunStreamAgentRunEvent {
  type: "agent_run";
  phase: AgentRunLifecyclePhase;
  scope: AgentRunStreamScope;
  run: AgentRunLifecycleRun;
}

/**
 * 远程任务（worker / 云沙箱）上报事件 —— 任务级相位，**独立 union 成员**。
 *
 * 为何独立成员而非扩入 run payload：本 `phase`（started / updated / stage /
 * cleanup / finished）无法映射进 `AgentRunLifecyclePhase`（run 轴只有
 * started | updated | finished），并入会把「run 轴」与「task 轴」混成一条。
 *
 * 同通道、同鉴权：scope 与 AgentRunStreamAgentRunEvent **逐字同构**
 * （AgentRunStreamScope），仍只发往 run 归属 user 的 scope.dialogId 事件通道。
 *
 * 增量形态：`task` 只带变化字段；消费端 merge **前必须**过 `stripUndefined`
 * （packages/core/remoteTaskView.ts，§3.6）——`undefined` 与「非 cost 的 `null`」
 * 视同「未提供」，**不得**覆盖既有字段；表达「清空」用整对象替换
 * （如 `cleanup: {status:"stop-unverified", pending:true}`），不允许 `cleanup: null`。
 * `cost: null` 是本 payload 唯一允许的 null 语义：显式未知（未知 ≠ 缺失，§8.2）。
 *
 * tombstone 豁免（§7.3，H3）：与 `agent_run` 不同，本成员**豁免** startedAt 代际
 * 拒绝 —— run 进入终态（done / failed / cancelled）之后的 cleanup 终局确认、
 * 失联转 unknown / 需处置等更新**不得被静默丢弃**；防重放改用任务内单调递增的
 * `eventSeq`（§5.3，拒绝 `eventSeq <= lastAcceptedSeq` 的陈旧上报）。终态后的 task
 * 状态落在 run 记录的 `remoteTask` 子对象，`run.status` 保持终态不变。
 * 消费端不得把本成员塞进 `agent_run` 的 startedAt 代际/tombstone 判定。
 *
 * 消费端契约（护栏 1，与审计清单同一批落地）：一切 switch / if 链遇未知 `type`
 * 必须走 default 并**忽略**（不 throw、不落库、不改状态）。审计清单见
 * docs/plans/2026-10-16-remote-task-visibility.md §4.2。
 *
 * 不携带（禁入，§9.3）：worker 凭据 / lease token、绝对本地路径、完整日志正文、
 * `command` + `args`、环境变量。`stage` 用 RemoteTaskStageView（不含 stdoutTail，
 * 日志走 §9 的脱敏投影）；`location` 用 ToolExecutionLocation（fail closed）。
 */
export interface AgentRunStreamRemoteTaskEvent {
  type: "remote_task";
  /** 任务级相位：无法映射进 AgentRunLifecyclePhase，故独立成员 */
  phase: "started" | "updated" | "stage" | "cleanup" | "finished";
  scope: AgentRunStreamScope;
  /** 增量形态：只带变化字段（merge 语义见 §3.6） */
  task: {
    runId: string;
    /** 每任务单调递增，用于重放判重（§5.3、§7.3） */
    eventSeq: number;
    location?: ToolExecutionLocation;
    process?: RemoteTaskProcessView;
    stage?: RemoteTaskStageView;
    /** 值域 RemoteTaskCostView：允许 `null` = 显式未知（未知 ≠ 缺失） */
    cost?: RemoteTaskCostView;
    cleanup?: RemoteTaskCleanupView;
  };
}

/** SSE 事件 discriminated union */
export type AgentRunStreamEvent =
  | AgentRunStreamTextEvent
  | AgentRunStreamThinkingEvent
  | AgentRunStreamDoneEvent
  | AgentRunStreamErrorEvent
  | AgentRunStreamCancelledEvent
  | AgentRunStreamAssistantToolCallsEvent
  | AgentRunStreamToolStartEvent
  | AgentRunStreamToolResultEvent
  | AgentRunStreamToolEndEvent
  | AgentRunStreamAgentHandoffEvent
  | AgentRunStreamDocCreatedEvent
  | AgentRunStreamDialogEvent
  | AgentRunStreamStatusEvent
  | AgentRunStreamTurnWarningEvent
  | AgentRunStreamAgentRunEvent
  | AgentRunStreamRemoteTaskEvent;

/** 窄化 helper：判断事件是否为指定 type */
export function isAgentRunStreamEvent<T extends AgentRunStreamEvent["type"]>(
  event: AgentRunStreamEvent,
  type: T,
): event is Extract<AgentRunStreamEvent, { type: T }> {
  return event.type === type;
}
