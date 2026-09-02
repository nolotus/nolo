import type { EmptyAssistantFallbackReason } from "./emptyAssistantRepair";

export type AgentRuntimeMode = "local" | "server";
export type AgentRuntimeHost = "cli" | "desktop" | "web" | "server";
export type AgentRuntimeRequestedMode = "auto" | AgentRuntimeMode;

export const AGENT_RUNTIME_MESSAGE_ROLES = ["system", "user", "assistant", "tool"] as const;

export type AgentRuntimeMessageContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | {
          type: "image_url";
          image_url: { url: string };
          google_native?: {
            inlineData: {
              mimeType: string;
              data: string;
            };
            thoughtSignature?: string;
          };
        }
    >
  | null;

export interface AgentRuntimeToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
  /**
   * Gemini 3.5 家族要求回放 functionCall 时携带真实的 thoughtSignature，
   * 否则返回 400 或空响应。由 antigravity CCA provider 在流式响应中捕获，
   * 随消息记录持久化，回放时原样带回（缺失时才回退哨兵）。
   */
  thought_signature?: string;
}

export interface AgentRuntimeChatMessage {
  role: (typeof AGENT_RUNTIME_MESSAGE_ROLES)[number];
  content: AgentRuntimeMessageContent;
  /** Internal system-prompt boundary used by explicit-cache providers. */
  stable_prefix_chars?: number;
  /**
   * Provider-visible replacement for a durable message body. The complete
   * `content` remains the source of truth; local runtime history projection
   * uses this reference and removes the field before sending it to a provider.
   */
  context_reference?: AgentRuntimeMessageContent;
  tool_call_id?: string;
  tool_calls?: AgentRuntimeToolCall[];
  /** 工具名：tool 行的语义字段，落库 / 回读 / 折叠头显示都依赖它。 */
  toolName?: string;
  /**
   * 消息创建时间（epoch ms）。仅用于判断「距上次活动多久」——隔了很久再继续的
   * 对话，provider 前缀缓存必然已过期，那一轮无论如何都要全量重发，
   * 因此是触发压缩最划算的时刻（见 localAutoCompaction 的 cold-resume 判定）。
   */
  createdAt?: number;
  tool_result_metadata?: Record<string, unknown>;
  reasoning_content?: string;
  /**
   * web 思考折叠可读的思考内容（web Message 模型只渲染 thinkContent，
   * 不读 reasoning_content）。仅在截断兜底时由运行时附加 reasoning 尾部
   * （带 marker、clip 到 2000 字符）；完整思维链始终走 reasoning_content。
   * 回读映射（dialogMessageRecordToAgentRuntimeMessage）刻意不还原此字段，
   * 避免混入下一轮 provider 请求。
   */
  thinkContent?: string;
  cybotKey?: string;
  agentKey?: string;
  agentName?: string;
}

/**
 * Durable continuation identity for the OpenAI Responses wire.
 *
 * This is deliberately separate from usage.audit `provider_response_ids`:
 * only the latest response for the same provider/model can be used as the
 * next turn's `previous_response_id`.
 */
export interface ResponsesConversationState {
  provider: string;
  model: string;
  responseId: string;
}

export type AgentRuntimeOutputBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | {
      type: "toolCall";
      toolCall: AgentRuntimeToolCall;
      /**
       * 已填充 = provider 流内已执行（如 Cursor exec 通道），localLoop 不得重跑 executeTool。
       */
      result?: { content: string; metadata?: Record<string, unknown> };
    };

export interface AgentRuntimeResult {
  content: string;
  model: string;
  provider?: string;
  /** Actual upstream identity used for per-call billing; provider remains product identity. */
  billingProvider?: string;
  billingModel?: string;
  /** Per-provider-call usage, retained when a run switches upstream providers. */
  billingSegments?: Array<{
    provider: string;
    model: string;
    usage: Record<string, any>;
  }>;
  inputPrice?: number;
  outputPrice?: number;
  usage?: Record<string, any>;
  responsesState?: ResponsesConversationState | null;
  trace?: AgentRuntimeChatMessage[];
  tool_calls?: AgentRuntimeToolCall[];
  reasoning_content?: string;
  runtimeToolNames?: string[];
  runtimeToolSurface?: unknown;
  toolCallCount?: number;
  /**
   * Provider 报告的本次 LLM 调用收尾原因（OpenAI chat.completions 语义）。
   * 典型值："stop"（正常说完）、"length"（撞输出 token 上限被砍断）、
   * "tool_calls"（要求调工具）、"content_filter"。
   *
   * 多轮工具循环里只有最后一轮的值有意义，由 localLoop 透出顶层。
   * 消费方据此区分"话说了一半"与"正常结束"，**不**改变控制流。
   */
  finish_reason?: string;
  /**
   * 流是否收到了收尾元数据帧（usage）。
   *
   * 空轮诊断此前只能靠「没有 finish_reason 就当流被切断」，但确实存在从不发
   * finish_reason 的上游——OpenCode Go 的 gpt-5.6-luna 全程 null，也不发
   * `[DONE]`，只在最后给一个 usage 帧。对这类 provider，缺 finish_reason 是常态，
   * 不是故障，误报成「上游响应流被中断」会把排查方向带偏。
   * 收到收尾帧即证明流走完了，此时空轮应判为 empty_completion。
   */
  stream_complete?: boolean;
  /**
   * Canonical 有序 block 输出序列（text/thinking/toolCall 交错）。
   * provider 有此序列时通过 output 返回，localLoop 按 block 消费。
   * OpenAI 兼容 provider 不设此字段（content + tool_calls 扁平模型足够）。
   */
  output?: AgentRuntimeOutputBlock[];
  /** Set when a turn is persisted after a provider/runtime failure. */
  error?: boolean;
  errorMessage?: string;
  /**
   * 空轮/截断兜底标记（server loop 与 CLI localLoop 共用，同一字段名保证
   * 两侧消费方语义一致）。本轮在空轮判定后走了诊断文案兜底（或半截输出
   * 截断告警）时的成因。只如实陈述，不决定成败：交互侧照常显示文案；
   * 上层（后台 run 编排者 / CLI 子 run 结算）据它决定是否结算为 failed。
   * 无此字段 = 正常轮。
   *
   * 注意：ok_with_warning（半截输出截断，正文保留）也会带此标记，
   * 但那种情况下 emptyAssistantOutputUsable=true，结算层须区别对待。
   */
  emptyAssistantFallbackReason?: EmptyAssistantFallbackReason;
  /**
   * 带 emptyAssistantFallbackReason 但正文完整可用（ok_with_warning 分支）。
   *
   * 起因：ok_with_warning（有可见正文、只缺 finish_reason 收尾帧，部分上游
   * 从不发该帧）与 fallback（真的没拿到输出）共用 reason="stream_truncated"，
   * 上层只看 reason 就把有完整正文的正常轮次也结算为 failed。实测表现为
   * review 子任务完整输出结论后仍被判 failed/exitCode=1，使「run 成功与否」
   * 这一信号对自动化闸门不可用。
   */
  emptyAssistantOutputUsable?: boolean;
  /** 兜底/告警发生时，本轮是否已用过一次 repair（观测字段，不影响行为）。 */
  emptyAssistantRepairUsed?: boolean;
  policyState?: unknown;
  latencyProfile?: {
    totalMs: number;
    llmRequestCount: number;
    llmWaitMs: number;
    llmJsonParseMs: number;
    toolExecutionMs: number;
    timeToFirstAssistantMs?: number;
    timeToFirstToolResultMs?: number;
    endedAt: number;
  };
}

export type AgentRuntimeDecisionInput = {
  requestedMode?: AgentRuntimeRequestedMode;
  syncRequested?: boolean;
  host?: AgentRuntimeHost;
  hasLocalAgentConfig: boolean;
  hasLocalProvider: boolean;
  hasLocalPersistence: boolean;
  missingLocalCapabilities?: string[];
  requiresServer?: boolean;
  serverFallbackAvailable: boolean;
};

export type AgentRuntimeWorkspaceMode = "none" | "current" | "lease";

export type AgentRuntimeShellPolicy = {
  enabled?: boolean;
  mode?: "off" | "worktree";
  commandPolicy?: "denylist" | "allowlist" | "approval";
  networkPolicy?: "default-deny" | "allowed" | "approval";
  maxOutputBytes?: number;
};

export type AgentRuntimeGitPolicy = {
  canCommit?: boolean;
  canPushAlpha?: boolean;
  canMergeMain?: boolean;
};

export type AgentRuntimeAuditPolicy = {
  logToolCalls?: boolean;
  logShellCommands?: boolean;
  writeToDialog?: boolean;
  writeToTask?: boolean;
};

export type AgentRuntimeIsolationPolicy = {
  mode?: "none" | "os-sandbox" | "container" | "gvisor" | "microvm" | "dedicated-vm";
};

export type AgentRuntimeToolPolicy = {
  version?: 1;
  agentTools?: string[];
  runtimeTools?: string[];
  workspace?: {
    mode?: AgentRuntimeWorkspaceMode;
    writableRoots?: string[];
    cwd?: string;
  };
  shell?: AgentRuntimeShellPolicy;
  isolation?: AgentRuntimeIsolationPolicy;
  git?: AgentRuntimeGitPolicy;
  budget?: {
    dailyUsdLimit?: number;
    maxRunSeconds?: number;
  };
  audit?: AgentRuntimeAuditPolicy;
};

export type AgentRuntimeDecision = {
  mode: AgentRuntimeMode;
  runnable: boolean;
  reason: string;
  missingLocalCapabilities: string[];
  syncAfterRun: boolean;
};
