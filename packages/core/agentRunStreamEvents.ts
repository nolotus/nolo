/**
 * SSE 事件词汇表的单一真值（discriminated union）。
 *
 * 以 loop.ts 全部 `send({type:...})` 为准，补充 index.ts 转发层事件。
 * 新增 turn_warning 用于空响应 / 长度截断提示。
 *
 * 纯类型文件，无 runtime 依赖。
 */

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
}

/** 错误信号 */
export interface AgentRunStreamErrorEvent {
  type: "error";
  message: string;
  reason?: "provider_credential_revoked";
  providerCredential?: unknown;
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
}

/** SSE 事件 discriminated union */
export type AgentRunStreamEvent =
  | AgentRunStreamTextEvent
  | AgentRunStreamThinkingEvent
  | AgentRunStreamDoneEvent
  | AgentRunStreamErrorEvent
  | AgentRunStreamAssistantToolCallsEvent
  | AgentRunStreamToolStartEvent
  | AgentRunStreamToolResultEvent
  | AgentRunStreamToolEndEvent
  | AgentRunStreamAgentHandoffEvent
  | AgentRunStreamDocCreatedEvent
  | AgentRunStreamDialogEvent
  | AgentRunStreamStatusEvent
  | AgentRunStreamTurnWarningEvent;

/** 窄化 helper：判断事件是否为指定 type */
export function isAgentRunStreamEvent<T extends AgentRunStreamEvent["type"]>(
  event: AgentRunStreamEvent,
  type: T,
): event is Extract<AgentRunStreamEvent, { type: T }> {
  return event.type === type;
}
