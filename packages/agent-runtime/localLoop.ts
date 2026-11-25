import { dialogTurnUserMessageId, orderDialogHistory } from "./dialogHistoryOrder";
import { classifyContextRefusal, type ContextRefusalDiagnostics } from "./contextRefusal";
/**
 * Agent 本地执行主循环（Local Execution Loop / Agent Harness Engine）。
 *
 * 遵循 Agent Harness Playbook 核心准则：
 * 1. 【有界工作与输出防爆（Bounded Work & Spills）】：
 *    - 工具输出受 `toolOutputPolicy` 的 per-tool 稳定预算严格截断
 *      （stable provider-visible projection：同一 tool execution 的 provider
 *      可见表示从第一次进入 transcript 起逐字节不变，见
 *      docs/plans/2026-09-05-tool-output-cache-stability.md）；
 *    - 超过阈值的大输出通过 `spillToolOutput` 溢出落盘，仅向上下文注入索引与摘要，保护内存与 Token 预算。
 * 2. 【严格取消级联（Cancellation Propagation）】：
 *    - 每次模型调用与工具执行严格绑定 `abortSignal` 与 `runAbortableWithTimeout`，
 *      用户中断或会话中止信号立即下发至底层进程/网络流，严禁孤儿进程与挂起 Promise。
 * 3. 【状态单调演进（Monotonic Turn Journaling）】：
 *    - 工具调用与执行结果必须严格成对记录（`sanitizeToolCallPairing`）；
 *    - 每一轮推进通过 `hostAdapter.saveTurn` 沉淀权威日志。
 */
import { normalizeUsage } from "../ai/token/normalizeUsage";
import { isContextOverflowText } from "../ai/chat/parseApiError";
import { resolveToolExecutionContract } from "../ai/tools/toolExecutionSemantics";
import { normalizeLocalToolName } from "./localToolPolicy";
import { resolve as resolvePath } from "node:path";
import { resolveModelTier } from "../ai/agent/dispatchSelectionPolicy";
import { toErrorMessage } from "core/errorMessage";
import { runAbortableWithTimeout } from "./abortableKernel";
import { applyToolSurfaceConstraints } from "./runtimeToolSurface";
import { hasMemoryTools } from "./turnContext";
import { MEMORY_USE_GUIDANCE } from "./memoryUseGuidance";
import type { ManagedRuntime } from "effect";
import {
  createLocalLoopObservationBoundary,
  DEFAULT_OBSERVATION_QUEUE_CAPACITY,
  type LocalLoopObservationBoundary,
  type LocalLoopObservationEvent,
  type LocalLoopObservationBoundaryOptions,
} from "./observationStream";
import { createLoopTiming } from "./loopTiming";
import { isToolExecutionFailure } from "./toolExecutionFailure";
import {
  TOOL_DURATION_METADATA_KEY,
  blocksToOpenAiMessages,
  buildMessages,
  contentCharCount,
  filterImagePartsFromMessages,
  formatToolMessageContent,
  prepareMessagesForProviderCall,
  composeProviderMessages,
  trimHistoryToContextBudget,
  updateLocalRequestCalibration,
  estimateLocalRequestInput,
  evaluateLocalRequestBudget,
} from "./providerMessageProjection";
import type { LocalAgentToolEvent } from "./localLoopContract";

import type {
  AgentRuntimeDialogHistorySource,
  AgentRuntimeHostAdapter,
  AgentRuntimeProvider,
  AgentRuntimeToolResult,
  AgentRuntimeSaveTurnInput,
} from "./hostAdapter";
import type { ActionGate } from "./actionGate";
import type {
  AgentRuntimeChatMessage,
  AgentRuntimeMessageContent,
  AgentRuntimeOutputBlock,
  AgentRuntimeResult,
  AgentRuntimeToolCall,
  LocalTurnInjection,
} from "./types";
import {
  LOCAL_TURN_ABORTED_CODE,
  buildAbortedError,
  emitLoopEvent,
  executeToolCall,
  runAbortableToolTask,
  throwIfAborted,
} from "./toolCallTransaction";
export { LOCAL_TURN_ABORTED_CODE } from "./toolCallTransaction";
import { createTurnTranscript } from "./turnTranscript";
import { TOOL_IMAGE_NOTICES, createToolImageNotices, TOOL_HAD_IMAGES, TOOL_IMAGES, createToolImageLedger, stripToolImages, toolImages, resetToolImageDelivery, toolImageDelivery } from "./toolImages";
import { createTurnUsageLedger } from "./turnUsageLedger";
export { addOutOfBandUsage } from "./turnUsageLedger";
import { buildIdentityBlock } from "./identityBlock";
import { buildPlatformStaticScopedBlocks } from "./platformStaticPromptLayers";
import {
  createSubtaskSoftBudgetAdvisor,
  type SubtaskBudgetLimits,
  type SubtaskSoftBudgetConfig,
} from "./subtaskBudget";
import { LEAF_FINAL_HANDOFF_INSTRUCTIONS } from "./leafFinalHandoff";
import { buildUserResponseLanguageContext } from "./userResponseLanguage";
import { resolveAgentImageInputSupport } from "../ai/llm/agentCapabilities";
import { hasImageInRuntimeMessages } from "../ai/agent/imagePreprocessing";
import { buildRuntimeGuidanceBlocks } from "./runtimeGuidance";
import { resolveToolGuidedSections, TOOL_GUIDED_SECTION_ORDER } from "../ai/agent/toolGuidedSections";
import { detectDispatchIntent, detectDispatchIntentFromMessages, OFFLOAD_NUDGE_PREFIX, ROUND_BUDGET_WARNING_PREFIX } from "../ai/agent/dispatchIntent";
import { canonicalizeToolNames } from "./toolNameAliases";
import type {
  AgentExecutionContextMetrics,
  AgentExecutionObservationEvent,
} from "./executionObservation";
import type { ContextBlockScope } from "./contextBlockScope";
import { normalizeContextBlockScopes } from "./contextBlockScope";
import {
  resolveResponseGuidelines,
  type ResponseViewport,
} from "./responseGuidelines";
import { resolveAgentContextWindow } from "./devin/devinChannelWindows";
import { createTurnCompactionController } from "./localAutoCompaction";
import { isolateInboundContent } from "./inboundCredentialVault";
import { scrubSecrets } from "./secretScrubber";
import { contextPhase, buildRequestTelemetry, shortHash, type ProviderCallTelemetry } from "./providerCallTelemetry";
import {
  resolveCompressionTriggerRatio,
  truncateToolOutputForContext,
} from "../ai/context/toolOutputCap";

// ─────────────────────────────────────────────────────────────────────────────
// NOLO_LOOP_TIMING instrumentation lives in ./loopTiming (per-turn instance,
// created inside runLocalAgentTurn — no module-level state, no cross-turn
// pollution when turns run concurrently).
// ─────────────────────────────────────────────────────────────────────────────

/** Recoverable pre-send failure: canonical history and the pending input remain untouched. */
export class LocalContextCoverageError extends Error {
  readonly code = "LOCAL_CONTEXT_COVERAGE_REQUIRED";
  constructor(
    readonly droppedCount: number,
    /**
     * 失败路径救援压缩已经发生的摘要用量。本轮没有 provider 结果可以承载它，
     * 由宿主在失败结算时记录（TUI 的 turn billing audit），避免白花一次计费调用。
     */
    readonly compactionUsage?: Record<string, unknown>,
    readonly diagnostics?: ContextRefusalDiagnostics,
  ) {
    super("Context protection: history cannot fit without losing messages not represented in the sending context. " +
      "This pending provider request was not sent; canonical history and pending input are retained. " +
      "Restore summary access/provider availability and retry this same input, or select a larger context window. " +
      "An invalid summary must be rebuilt before retrying.");
    this.name = "LocalContextCoverageError";
  }
}

export type LocalAgentTurnInput = {
  adapter: AgentRuntimeHostAdapter;
  agentRef: string;
  /** Platform/user language, not an agent capability. */
  userLanguage?: string | null;
  input: AgentRuntimeMessageContent;
  userMessages?: Array<AgentRuntimeChatMessage & { cliMessageId?: string }>;
  /**
   * Optional expanded input used only when persisting a runtime reference
   * (for example a TUI paste). Provider messages keep the compact reference;
   * the durable dialog keeps the complete user input.
   */
  persistedInput?: AgentRuntimeMessageContent;
  /** Compact provider-visible form for the durable persistedInput. */
  persistedInputReference?: AgentRuntimeMessageContent;
  /**
   * Returns true only when the current host can resolve a persisted context
   * reference. Unresolvable references fall back to durable content so a
   * resumed dialog never sends a dead pointer to a model.
   */
  contextReferenceResolver?: (reference: AgentRuntimeMessageContent) => boolean;
  continueDialogId?: string;
  strictContinueHistory?: boolean;
  spaceId?: string;
  /**
   * Runtime-assembled context blocks (space/workspace layers from
   * turnContext.ts). Appended after the agent prompt inside the same
   * system message so every host surface shares identical semantics.
   */
  contextBlocks?: string[];
  /**
   * Context blocks with cacheScope metadata. When provided, `buildMessages`
   * splits the system message into a stable prefix (session-scope blocks +
   * agent prompt) and a dynamic suffix (turn-scope blocks), enabling
   * Claude cache_control breakpoints and DeepSeek auto prefix-cache hits.
   * Falls back to `contextBlocks` by converting each legacy block to a
   * turn-scope block once.
   */
  contextBlockScopes?: ContextBlockScope[];
  category?: string;
  inheritedFromDialogKey?: string;
  parentDialogId?: string;
  freshDialog?: boolean;
  runtimeContext?: Record<string, any> | null;
  /** Dispatched leaf runs receive parent-facing final-response guidance. */
  runKind?: "interactive" | "subtask";
  /** Explicit subtask flag (also activates subtask soft-budget convergence advisories). */
  isSubtask?: boolean;
  /**
   * Optional soft-budget convergence advisory config for subtask runs.
   * Defaults to enabled only in subtask mode (`isSubtask`, `runKind === "subtask"`,
   * non-empty `NOLO_PARENT_DIALOG_ID`, or `NOLO_AGENT_RUN_CHILD`), and disabled via
   * `NOLO_SUBTASK_SOFT_BUDGET=0`. Never terminates or truncates execution.
   */
  softBudget?: boolean | SubtaskSoftBudgetConfig;
  /** Optional env map override for `createSubtaskSoftBudgetAdvisor`. */
  softBudgetEnv?: Record<string, string | undefined>;
  /** @deprecated Accepted for older callers only; never limits execution. */
  subtaskMaxToolCalls?: number;
  /** @deprecated Accepted for older callers only; never limits execution. */
  subtaskMaxWallClockMs?: number;
  /** @deprecated Ignored. Cumulative tool/time budgets no longer stop runs. */
  subtaskBudgetLimits?: SubtaskBudgetLimits;
  /** @deprecated Ignored alongside the removed wall-clock budget. */
  subtaskBudgetNow?: () => number;
  /**
   * 宿主可确认的展示能力：narrow（窄屏终端/TUI）、wide（宽屏桌面）、
   * unknown（默认；拿不到视口信息：非交互 CLI、后台 run、管道、桌面 runtime）。
   * 行为段恒注入，排版段只在能力已知时注入一份——无法确认时不要猜。
   */
  responseViewport?: ResponseViewport;
  /**
   * 可选：宿主当次扫描确认「当前模型已是免付费池顶」（池内无更高且免付费的候选）。
   * 仅 true 时轻档姿态换成池顶姿态，不再让轻主模型空找高档；缺省 undefined 时
   * 与既往输出逐字节相同（会话常量，宿主只算一次，不在轮内翻转）。
   */
  callerIsPoolTop?: boolean;
  timeoutMs?: number;
  background?: boolean;
  noStream?: boolean;
  onToolEvent?: (event: LocalAgentToolEvent) => void;
  onActionGate?: (gate: LocalAgentActionGate) => Promise<AgentRuntimeToolResult | void>;
  /** Stable dialog/session key used for interactive approval state. */
  fileWriteSessionId?: string;
  /**
   * Escape hatch for the session-first-write confirm gate. `undefined`/`true`
   * keeps today's behavior (gate active); `false` skips it entirely and
   * writes/edits execute directly, as if already session-approved. Resolved
   * by the CLI layer from `NOLO_CLI_WRITE_GATE` (fail-safe: unparsable or
   * unset values must resolve to `true` upstream) — agent-runtime itself
   * never reads `process.env` so it stays embeddable outside the CLI.
   */
  fileWriteGateEnabled?: boolean;
  onTextDelta?: (chunk: string) => void;
  /**
   * 端侧 reasoning 增量透传（第一层）。provider.complete 收到 reasoning
   * 增量时回调，与 onTextDelta 同模式。端侧（desktop handler / CLI 显示）
   * 接入是后续 Task B，本字段只打通 localLoop 接口层与 provider 读取路径。
   */
  onReasoningDelta?: (chunk: string) => void;
  onLoopEvent?: (event: LocalAgentLoopEvent) => void;
  /**
   * [Observation Stream boundary] 统一观测事件流回调（可选）。
   */
  onObservationEvent?: (event: LocalLoopObservationEvent) => void;
  /**
   * [Observation Stream boundary] 自定义观测 boundary（可选，用于 Stream 收集/测试）。
   */
  observationBoundary?: LocalLoopObservationBoundary;
  /**
   * 单次 provider.complete 的可选空闲超时（idle 语义：距上一次 delta/事件
   * 的最长静默期，不是整请求总时长）。未设置时：若本回合传了 timeoutMs 则继承
   * 之；否则取运行层默认 `DEFAULT_LLM_REQUEST_TIMEOUT_MS`（10 分钟静默无输出
   * 即放弃，兜底“请求挂起、用户无反馈”）。持续吐字的长流式生成不会被误杀；
   * 确需更宽/关闭时限的调用方请显式传入本字段（当前未提供“不限时”语义）。
   */
  llmRequestTimeoutMs?: number;
  /** Summary-provider deadline; runtime default is 60 seconds. */
  compactionTimeoutMs?: number;
  /**
   * 自动上下文压缩的摘要通道选择器（形状 = CLI /compact 的 SummaryLlmCaller）。
   *
   * 常规由 host adapter 会话级注入（CLI：localRuntimeAdapter 的
   * setCliAutoCompactionSummaryFallback ← index.ts 启动 TUI 时用
   * createTuiSummaryLlmCaller 建好）；这里也允许直接透传，供测试与显式调用方
   * 覆盖。未注入 / desktop 无平台通道 → undefined → 自动压缩只用当前 provider，
   * 保持既有 fail-open 行为。
   */
  compactionSummaryFallback?: (content: string) => Promise<string | null>;
  /**
   * 协作式停止（用户按 Esc 等）。在轮次边界和每个工具执行前检查，并与
   * provider.complete race。provider 没有取消契约，在途请求会被放弃而不是
   * 真正撤销；中断的回合仍会 saveTurn 留档。
   */
  abortSignal?: AbortSignal;
  /**
   * [test seam] 注入带 TestClock 的 Effect runtime：timeout 由虚拟时钟驱动，
   * 测试可精确构造 9999ms 不触发 / +1ms 触发（deterministic world，无真实
   * sleep）。生产调用方不传——kernel 走默认 runtime（真实 Clock），行为与
   * 旧 setTimeout/Promise.race 实现一致。
   */
  effectRuntime?: ManagedRuntime.ManagedRuntime<never, never>;
  /**
   * 可选进度看门狗配置（用于防死循环/复读熔断）。
   */
  progressGuardConfig?: ProgressGuardConfig;
  /**
   * 任务轮次软上限预警阈值。默认 25 轮。
   * 达到此阈值时向模型注入收敛提示，促使模型收尾输出阶段性成果或卡点，防止单 run 无限膨胀。
   * 设置为 <= 0 时禁用预警。
   */
  roundBudgetWarningThreshold?: number;
  /**
   * 关闭「高档主模型自包提醒」（Tier-Aware Offload Nudge）。
   * 默认开启，但只在 extreme/complex 主模型、非子任务、且工具面含
   * startAgentRun 时生效；显式设为 true 可完全关闭。
   */
  offloadNudgeDisabled?: boolean;
  /**
   * 回合内注入收件箱的 drain 回调（TUI「后台 run 终态唤醒」直投当前 loop）。
   *
   * 语义：每次调用取走并清空当前待注入的文本条目（调用方负责去重/一次性），
   * 返回空数组表示无注入。localLoop 在两处 drain：
   *  1) 每轮开头（throwIfAborted 之后、构造请求消息之前）——注入内容在下一次
   *     provider 调用即可见；
   *  2) 无 tool_calls 的正常完成路径上、break 之前——此时若有新注入则不结束
   *     本回合，push 成 user 消息后再跑一轮，让模型当场消化。
   *
   * 注入消息进入 `messages`，因此天然随 turnMessages 一起 saveTurn 持久化。
   */
  drainInjections?: () => LocalTurnInjection[] | Promise<LocalTurnInjection[]>;
  /** Lazily persist the original direct user input when a work-memory write needs it. */
  prepareDirectWorkMemorySource?: (message: AgentRuntimeChatMessage) => Promise<string | undefined>;
  /** Host-only persisted source resolution after receipt commits, before provider dispatch. */
  resolveInjectedUserMessageId?: (
    messages: readonly (AgentRuntimeChatMessage & { cliMessageId?: string })[],
  ) => Promise<string | undefined>;
  /**
   * [test seam] completion-boundary 缝隙：在「no-tool result 已确定、final
   * injection drain 尚未执行」处 await 调用。生产调用方不传——行为零变化；
   * deterministic race 测试用它在该窗口（provider 已 resolve 之后的同步段，
   * Promise 语义上外部无插入点）内精确投递 child completion，验证收尾
   * drain 不丢迟到事件。seal 刀专用，见 localLoop.test.ts。
   */
  onBeforeFinalInjectionDrain?: () => Promise<void> | void;
};

export type LocalAgentTurnResult = AgentRuntimeResult & {
  dialogId: string;
  // emptyAssistantFallbackReason / emptyAssistantRepairUsed 已上移到
  // AgentRuntimeResult（server loop 与 localLoop 共用同一字段与注释）。
  /** Dialog title persisted by saveTurn (LLM-generated or fallback). */
  title?: string;
  /** 后台 LLM 标题 patch（fire-and-forget）；resolve 携带最终标题（无/失败为 null）。 */
  titlePatchPromise?: Promise<string | null>;
  turnMessages?: AgentRuntimeChatMessage[];
  /**
   * 本轮续聊历史来源（"local" | "remote" | "none"）。仅续聊轮存在；"none"
   * 表示本地为空且远端回退失败/无内容——本轮没有拿到历史上下文。留给上层
   * （TUI）渲染「历史未加载」提示，避免静默当成全新对话。
   */
  dialogHistorySource?: AgentRuntimeDialogHistorySource;
  /** Full per-call accounting evidence; context UI must continue using usage. */
  usageRecords?: AgentRuntimeSaveTurnInput["usageRecords"];
  accountingUsage?: Record<string, unknown>;
};

export type { LocalAgentToolEvent } from "./localLoopContract";

export type LocalAgentContextMetrics = AgentExecutionContextMetrics;

/**
 * Compat alias over the canonical shared vocabulary (see executionObservation.ts).
 * Kept as a type alias so existing consumers of `LocalAgentLoopEvent` / the
 * `onLoopEvent` seam keep compiling while the two loops speak one vocabulary.
 */
export type LocalAgentLoopEvent = AgentExecutionObservationEvent;

export type {
  LocalLoopObservationBoundary,
  LocalLoopObservationEvent,
  LocalLoopObservationBoundaryOptions,
};
export {
  createLocalLoopObservationBoundary,
  DEFAULT_OBSERVATION_QUEUE_CAPACITY,
};

// 兼容 re-export：投影实现已下沉到 ./providerMessageProjection（纯函数层），
// 既有消费方（historyContextBudget.test、__bench__、外部 caller）从 ./localLoop
// 导入的路径保持不变。
export {
  TOOL_DURATION_METADATA_KEY,
  summarizeHistoricalToolContent,
  trimHistoryToContextBudget,
  updateLocalRequestCalibration,
  estimateLocalRequestInput,
  evaluateLocalRequestBudget,
} from "./providerMessageProjection";

export type LocalAgentActionGate = ActionGate & {
  toolName: string;
  toolCallId: string;
};

export const LOCAL_AGENT_CONFIG_MISSING_CODE = "LOCAL_AGENT_CONFIG_MISSING";

/**
 * 空轮修复共享常量。
 *
 * 这些文案常量与判定语义由 `packages/server/handlers/agentRun/loopMessageExtract.ts`
 * 的空轮处置流程首次落地，现下沉到 agent-runtime 共享层，使 CLI local 与
 * 桌面 local turn（都消费 `runLocalAgentTurn`）与服务端 loop 行为一致。
 * 服务端 loop 通过 `../../../agent-runtime` 引用同一常量，仅替换常量来源，
 * 不动其判定/流程逻辑。
 *
 * 语义要点（与服务端逐条对齐）：
 * - reasoning_content 不计入可见输出——reasoning-only 且无 tool_calls 视为空轮，走 repair/fallback；
 * - finish_reason === "length" 单独兜底为 LENGTH_TRUNCATED_FALLBACK_MESSAGE，不走 repair。
 */
import {
  EMPTY_ASSISTANT_REPAIR_PROMPT,
  EMPTY_ASSISTANT_FALLBACK_MESSAGE,
  LENGTH_TRUNCATED_FALLBACK_MESSAGE,
  STREAM_TRUNCATED_FALLBACK_MESSAGE,
  REPETITION_LOOP_FALLBACK_MESSAGE,
  STAGNANT_TOOL_CALLS_FALLBACK_MESSAGE,
  LENGTH_TRUNCATED_REASONING_MARKER,
  MAX_TRUNCATED_REASONING_CHARS,
  resolveEmptyAssistantOutcome,
  resolveEmptyAssistantFallbackMessage,
  formatLengthTruncatedReasoningTail,
  formatStreamTruncatedReasoningTail,
  resolveTruncatedReasoningTailLog,
  hasAssistantVisibleOutput,
} from "./emptyAssistantRepair";
import {
  createLocalLoopProgressGuard,
  LocalLoopProgressGuard,
  type ProgressGuardConfig,
  type ProgressGuardVerdict,
} from "./progressGuard";

export {
  EMPTY_ASSISTANT_REPAIR_PROMPT,
  EMPTY_ASSISTANT_FALLBACK_MESSAGE,
  LENGTH_TRUNCATED_FALLBACK_MESSAGE,
  STREAM_TRUNCATED_FALLBACK_MESSAGE,
  REPETITION_LOOP_FALLBACK_MESSAGE,
  STAGNANT_TOOL_CALLS_FALLBACK_MESSAGE,
  LENGTH_TRUNCATED_REASONING_MARKER,
  MAX_TRUNCATED_REASONING_CHARS,
  resolveEmptyAssistantOutcome,
  resolveEmptyAssistantFallbackMessage,
  formatLengthTruncatedReasoningTail,
  formatStreamTruncatedReasoningTail,
  resolveTruncatedReasoningTailLog,
  hasAssistantVisibleOutput,
  createLocalLoopProgressGuard,
  LocalLoopProgressGuard,
  type ProgressGuardConfig,
  type ProgressGuardVerdict,
};

const LLM_REQUEST_TIMEOUT = "LLM_REQUEST_TIMEOUT";
/**
 * 默认空闲超时（idle 语义）：单次 provider.complete 连续 10 分钟没有任何
 * delta / 工具事件才放弃。语义是「静默期」不是「总时长」——长流式生成只要
 * 还在输出就会不断重置计时（见 abortableKernel 的 idleWatchdog），因此不会
 * 被 10 分钟一刀切掉。历史事故：用户看到「模型在 10 分钟内没有响应」而实际
 * 是在生成，导致重复发送付费请求。
 */
export const DEFAULT_LLM_REQUEST_TIMEOUT_MS = 10 * 60 * 1000;
export const DEFAULT_COMPACTION_TIMEOUT_MS = 60 * 1000;
export const DEFAULT_ROUND_BUDGET_WARNING_THRESHOLD = 25;

export function buildRoundBudgetWarningPrompt(threshold: number): string {
  // 前缀与 dispatchIntent 的内部提醒清单共用同一常量：正文里若出现派发关键词，
  // 历史扫描必须能把这条提醒与真实用户输入区分开，否则会误锁 full 协议。
  return `${ROUND_BUDGET_WARNING_PREFIX} ${threshold} 轮，请进行进展与成本检查：若已授权目标未完成且持续有进展，应继续推进，不得仅因轮数交接；仅在目标已完成、遇到真实阻塞或用户明确停止时才收尾；若进展停滞，请及时更换策略。`;
}

export const ROUND_BUDGET_WARNING_PROMPT = buildRoundBudgetWarningPrompt(
  DEFAULT_ROUND_BUDGET_WARNING_THRESHOLD,
);

// ── 高档主模型自包提醒（Tier-Aware Offload Nudge）────────────────────────────
// 强主模型（extreme / complex）的典型失败模式是把体力活全包在主循环里：连续多轮
// 只读盲搜，或契约定了之后自己写满一屏文件。这两类工作交给低档子 Agent 更便宜、
// 也不污染主上下文。仅在「有 startAgentRun、非子任务、未关闭」时启用，且最多提
// 醒一次——提醒走 transcript.append 路径，严格 append-only，不击穿前缀缓存。
export const DEFAULT_OFFLOAD_EXPLORE_ROUNDS = 4;
export const DEFAULT_OFFLOAD_WRITE_FILES = 3;

/** 计入「写/改文件」的工具名。 */
const OFFLOAD_WRITE_TOOLS: ReadonlySet<string> = new Set([
  "writeFile",
  "editFile",
  "applyEdit",
  "applyLineEdits",
]);

export function buildOffloadNudgePrompt(reason: "explore" | "write"): string {
  const lead = reason === "explore"
    ? "主循环已连续多轮只读摸底。"
    : "主循环已直接写入多个文件。";
  // 正文含「派发」这类派发关键词是刻意的：这条提醒必须真的能被
  // detectDispatchIntent 判成派发意图，回归测试才能证明「排除逻辑」本身有效
  // （否则测试只是测了一条本来就判 false 的文本）。排除靠 OFFLOAD_NUDGE_PREFIX
  // 这个精确前缀，不靠正文里没有关键词。
  return `${OFFLOAD_NUDGE_PREFIX} ${lead}契约已定时，批量摸底/统计与实现、单测、跑修可派发给低档执行者（startAgentRun，brief 只传路径、行号区间与验收命令）；主循环聚焦需求、契约、高风险判断与最终验收。`;
}

/**
 * 缺少执行元数据的既有只读工具兼容集合。
 * 优先采用共享执行契约；子任务启动始终是调用屏障。
 * 遇到写操作或命令执行时切回严格串行；最终结果严格按模型原始 tool_calls 下标保序推入。
 */
// Legacy fallback only; registered tools use the shared execution contract below.
// This schedules tools already admitted by the host; it does not expand its tool surface.
export const CONCURRENT_READONLY_TOOLS: ReadonlySet<string> = new Set([
  "readFile",
  "read_image",
  "read_file",
  "readWorkspaceFile",
  "globFiles",
  "readDoc",
  "readSkillDoc",
  "listSpaces",
  "readSpace",
  "listTables",
  "queryTableRows",
  "listDialogs",
  "readDialog",
  "queryDialogsBySubjectRef",
  "listAgents",
  "readAgent",
  "cliWhoami",
  "cliDoctor",
  "listProcesses",
  "readProcessOutput",
  "fetchWebpage",
  "exa_search",
]);

type ToolCallWithIndex = {
  index: number;
  toolCall: AgentRuntimeToolCall;
};

type ToolCallExecutionBatch = {
  isConcurrent: boolean;
  calls: ToolCallWithIndex[];
};

// Dispatch arguments (readOnly/runtimeKey/credentialGroup) are not evidence of
// isolation or authoritative admission. startAgentRun remains a call barrier;
// its asynchronous children can still overlap after the call returns. Lifecycle
// isolation and credential/cost admission must be enforced by the executor.
export function partitionToolCallsIntoBatches(
  toolCalls: readonly AgentRuntimeToolCall[],
): ToolCallExecutionBatch[] {
  const batches: ToolCallExecutionBatch[] = [];
  let currentBatch: ToolCallWithIndex[] = [];
  const flush = () => {
    if (currentBatch.length) batches.push({ isConcurrent: true, calls: currentBatch });
    currentBatch = [];
  };
  for (let index = 0; index < toolCalls.length; index += 1) {
    const toolCall = toolCalls[index];
    const contract = resolveToolExecutionContract(toolCall.function.name);
    const isReadOnly = contract.interaction === "none" && contract.concurrency === "safe";
    const legacyRead = contract.concurrency === "exclusive" && contract.interaction === "unknown"
      && CONCURRENT_READONLY_TOOLS.has(toolCall.function.name);
    if (toolCall.function.name === "startAgentRun" || (!isReadOnly && !legacyRead)) {
      flush();
      batches.push({ isConcurrent: false, calls: [{ index, toolCall }] });
      continue;
    }
    currentBatch.push({ index, toolCall });
  }
  flush();
  return batches;
}

function resolveLlmRequestTimeoutMs(input: LocalAgentTurnInput): number {
  const raw = input.llmRequestTimeoutMs ?? input.timeoutMs;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LLM_REQUEST_TIMEOUT_MS;
}
function resolveCompactionTimeoutMs(input: LocalAgentTurnInput): number {
  const raw = input.compactionTimeoutMs;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? Math.min(raw, DEFAULT_COMPACTION_TIMEOUT_MS) : DEFAULT_COMPACTION_TIMEOUT_MS;
}

/**
 * Host adapter 侧会话级注入的自动压缩摘要通道选择器。
 *
 * CLI 本地 adapter（localRuntimeAdapter.createCliLocalRuntimeAdapter）会带上
 * `compactionSummaryFallback` 这个非接口成员字段（由 CLI 入口启动时注入已登录的
 * 平台摘要 caller）；desktop / headless 不带 → undefined，自动压缩只用当前
 * provider。刻意不在 AgentRuntimeHostAdapter 接口上扩字段：它是跨 host 契约，
 * CLI 专有接线不该让所有 host 都背上新成员。
 */
function readHostCompactionSummaryFallback(
  adapter: AgentRuntimeHostAdapter,
): ((content: string) => Promise<string | null>) | undefined {
  const value = (
    adapter as AgentRuntimeHostAdapter & { compactionSummaryFallback?: unknown }
  ).compactionSummaryFallback;
  return typeof value === "function"
    ? (value as (content: string) => Promise<string | null>)
    : undefined;
}

async function runCompleteWithTimeout(args: {
  provider: { complete(messages: AgentRuntimeChatMessage[], options?: any): Promise<AgentRuntimeResult> };
  messages: AgentRuntimeChatMessage[];
  options: Record<string, unknown>;
  /** 未设置 = 不硬超时，等 provider 自然结束。 */
  timeoutMs?: number;
  /**
   * idle 计时源（见 abortableKernel.RunAbortableArgs.activityVersion）：每次
   * delta / 工具事件到达时 +1，把 timeoutMs 从「整请求总时长」变成「距上一
   * 次输出的最长静默期」。不传 = 旧的总时长语义。
   */
  activityVersion?: () => number;
  round: number;
  input: LocalAgentTurnInput;
  boundary: LocalLoopObservationBoundary;
  context?: LocalAgentContextMetrics;
  providerName?: string;
  model?: string;
}): Promise<AgentRuntimeResult> {
  const { provider, messages, options, timeoutMs, round, input, boundary, context, providerName, model } = args;

  emitLoopEvent(boundary, {
    kind: "llm-start",
    round,
    atMs: Date.now(),
    ...(providerName ? { provider: providerName } : {}),
    ...(model ? { model } : {}),
    ...(context ? { context } : {}),
  });
  const complete = provider.complete(messages, options);
  let ok = false;

  let result: AgentRuntimeResult | undefined;
  let errorMessage: string | undefined;
  try {
    // timeout/abort 收敛进 Effect v4 kernel（runAbortableWithTimeout）：
    // timeout 走 Clock（测试可注入 TestClock 虚拟推进），abort 经 AbortSignal
    // 桥接 raceFirst interruption，输家 cleanup 必然执行（ensuring 兜底）。
    // 无硬超时且无中止信号时保持零开销路径（直接 await，不进 kernel）。
    if (typeof timeoutMs !== "number" && !input.abortSignal) {
      result = await complete;
    } else {
      const outcome = await runAbortableWithTimeout({
        task: complete,
        timeoutMs: typeof timeoutMs === "number" ? timeoutMs : undefined,
        activityVersion: args.activityVersion,
        abortSignal: input.abortSignal,
        runtime: input.effectRuntime,
      });
      if (outcome.kind === "done") {
        result = outcome.value;
        ok = true;
        return result;
      }
      if (outcome.kind === "timeout") {
        // provider.complete has no cancellation contract. Retrying here would leave
        // the timed-out CLI process alive and start a duplicate invocation.
        const timeoutError = new Error(
          `LLM request timed out after ${timeoutMs}ms without new output (idle window, round ${round})`,
        ) as Error & { code?: string };
        timeoutError.code = LLM_REQUEST_TIMEOUT;
        throw timeoutError;
      }
      if (outcome.kind === "aborted") throw buildAbortedError();
      throw outcome.error;
    }
    ok = true;
    return result;
  } catch (error) {
    errorMessage = toErrorMessage(error);
    throw error;
  } finally {
    // Emit llm-end with per-request cache metrics for token-level analysis
    const usage = result?.usage;
    const cacheHit = Number(usage?.cache_read_input_tokens ?? usage?.prompt_cache_hit_tokens ?? 0);
    const cacheMiss = Number(usage?.cache_creation_input_tokens ?? usage?.prompt_cache_miss_tokens ?? 0);
    const inputTokens = Number(usage?.input_tokens ?? usage?.prompt_tokens ?? 0);
    const outputTokens = Number(usage?.output_tokens ?? usage?.completion_tokens ?? 0);
    emitLoopEvent(boundary, {
      kind: "llm-end",
      round,
      atMs: Date.now(),
      ok,
      ...(providerName ? { provider: providerName } : {}),
      ...(model ? { model } : {}),
      ...(typeof usage?.provider_call_id === "string" && usage.provider_call_id.trim()
        ? { providerCallId: usage.provider_call_id.trim() }
        : {}),
      ...(errorMessage ? { errorMessage } : {}),
      // 原始 usage 帧随行：CLI TUI 的实时积分（liveTurnCredits）靠它逐帧
      // 折算，不必等整轮结束才看到 ⚡ 增长。与 cache 投影互补——cache 是
      // token 级分析口径，usage 是计费口径（cost / billing_unit）。
      ...(usage && Object.keys(usage).length > 0 ? { usage } : {}),
      ...(inputTokens > 0 || cacheHit > 0 || cacheMiss > 0
        ? {
            cache: {
              inputTokens,
              outputTokens,
              cacheHitTokens: cacheHit,
              cacheMissTokens: cacheMiss,
              hitRatio: inputTokens > 0 ? Math.round((cacheHit / inputTokens) * 10000) / 10000 : 0,
            },
          }
        : {}),
    });
  }
}

function extractUserInputText(content: AgentRuntimeMessageContent): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .flatMap((part) => (part?.type === "text" && part.text ? [part.text] : []))
    .join("\n")
    .trim();
}

function safeToolNamesHash(names: string[]): string | undefined {
  try {
    return names.length ? shortHash([...names].sort().join(",")) : undefined;
  } catch {
    return undefined;
  }
}

function finalizeCallTelemetry(
  base: Partial<ProviderCallTelemetry> | undefined,
  result: AgentRuntimeResult,
  round: number,
  startedAt: number,
): ProviderCallTelemetry | undefined {
  try {
    const endTs = Date.now();
    const toolCalls = (result.tool_calls ?? [])
      .map((call: any) => call?.function?.name ?? call?.name)
      .filter((name: unknown): name is string => typeof name === "string");
    const providerToolsHash = result.toolsHash;
    return {
      ...base,
      ...(typeof providerToolsHash === "string" ? { toolsHash: providerToolsHash } : {}),
      round,
      endTs,
      durationMs: endTs - startedAt,
      ...(toolCalls.length ? { toolCalls } : {}),
    };
  } catch {
    return undefined;
  }
}

function attachDialogIdToError(error: unknown, dialogId: string | undefined) {
  if (!dialogId) return;
  if (typeof error === "object" && error !== null) {
    (error as { dialogId?: string }).dialogId = dialogId;
  }
}

/**
 * 把本轮已发生的逐次调用计费证据挂到错误上。
 *
 * 中断（TUI Esc）和失败的 turn 一样在扣费——`persistFailedLocalTurn` 已经把
 * usageRecords 存了下来、服务端也照常记账。但错误路径此前只把 dialogId 传出去，
 * 调用方拿不到 usage，状态行的会话累计就漏掉这一整轮。长 turn 里 Esc 很常用，
 * 漏的往往还是最贵的那几轮。
 */
function attachUsageRecordsToError(
  error: unknown,
  usageRecords: AgentRuntimeSaveTurnInput["usageRecords"],
) {
  if (!usageRecords?.length) return;
  if (typeof error === "object" && error !== null) {
    (error as { usageRecords?: AgentRuntimeSaveTurnInput["usageRecords"] }).usageRecords =
      usageRecords;
  }
}

/**
 * Persist a failed/aborted turn so TUI can keep `state.dialogId` and the next
 * user message continues the same conversation instead of opening a fresh one.
 * If saveTurn itself fails, fall back to continueDialogId when present.
 */
async function persistFailedLocalTurn(args: {
  adapter: AgentRuntimeHostAdapter;
  agentKey: string;
  messages: AgentRuntimeChatMessage[];
  error: unknown;
  model?: string;
  toolCallCount?: number;
  partialContent?: string;
  usage?: Record<string, unknown>;
  accountingUsage?: Record<string, unknown>;
  usageRecords?: AgentRuntimeSaveTurnInput["usageRecords"];
  billingConfig?: AgentRuntimeSaveTurnInput["billingConfig"];
  input: LocalAgentTurnInput;
}): Promise<string | undefined> {
  const errorMessage = toErrorMessage(args.error);
  try {
    const saved = await args.adapter.saveTurn({
      agentKey: args.agentKey,
      messages: args.messages,
      result: {
        content:
          args.partialContent ||
          `[nolo] Agent run failed: ${errorMessage}`,
        model: args.model ?? "unknown",
        toolCallCount: args.toolCallCount ?? 0,
        error: true,
        errorMessage,
        ...(args.usage ? { usage: args.usage } : {}),
      },
      ...(args.accountingUsage ? { accountingUsage: args.accountingUsage } : {}),
      ...(args.usageRecords?.length ? { usageRecords: args.usageRecords } : {}),
      ...(args.billingConfig ? { billingConfig: args.billingConfig } : {}),
      ...(args.input.runtimeContext
        ? { runtimeContext: args.input.runtimeContext }
        : {}),
      ...(args.input.continueDialogId
        ? { continueDialogId: args.input.continueDialogId }
        : {}),
      ...(args.input.spaceId ? { spaceId: args.input.spaceId } : {}),
      ...(args.input.category ? { category: args.input.category } : {}),
      ...(args.input.inheritedFromDialogKey
        ? { inheritedFromDialogKey: args.input.inheritedFromDialogKey }
        : {}),
      ...(args.input.parentDialogId
        ? { parentDialogId: args.input.parentDialogId }
        : {}),
      ...(typeof args.input.freshDialog === "boolean"
        ? { freshDialog: args.input.freshDialog }
        : {}),
    });
    attachFailedTurnPersistence(args.error, "saved");
    return saved?.dialogId;
  } catch {
    // Preserve the original provider error, but never mistake an existing
    // dialog pointer for evidence that this failed turn was saved.
    attachFailedTurnPersistence(args.error, "failed");
    return args.input.continueDialogId;
  }
}

function attachFailedTurnPersistence(error: unknown, status: "saved" | "failed") {
  if (!error || typeof error !== "object") return;
  try {
    Object.assign(error, { failedTurnPersistence: { status } });
  } catch {
    // Frozen foreign errors cannot carry metadata; clients must treat absent
    // evidence as unknown, not as successful persistence.
  }
}
/**
 * Load continue-dialog history, preferring the source-aware host method when the
 * adapter implements it (CLI). Hosts without it (desktop/web) keep the plain
 * array contract and leave the source unknown.
 */
async function loadAdapterDialogHistory(
  adapter: AgentRuntimeHostAdapter,
  dialogId: string,
  options?: { strictContinueHistory?: boolean; freshDialog?: boolean },
): Promise<{
  messages: AgentRuntimeChatMessage[];
  source?: AgentRuntimeDialogHistorySource;
}> {
  if (adapter.loadDialogHistoryWithSource) {
    return await adapter.loadDialogHistoryWithSource(dialogId, options);
  }
  return { messages: await adapter.loadDialogHistory(dialogId) };
}

function combineRollbackError(primary: unknown, rollbackError: unknown): Error {
  const primaryError = primary instanceof Error ? primary : new Error(String(primary));
  const rollbackErr = rollbackError instanceof Error ? rollbackError : new Error(String(rollbackError));
  const combined = new AggregateError(
    [primaryError, rollbackErr],
    `${primaryError.message} (additionally, injection rollback failed: ${rollbackErr.message})`,
  );
  if (primary && typeof primary === "object") {
    Object.assign(combined, primary);
  }
  return combined;
}

export async function runLocalAgentTurn(
  input: LocalAgentTurnInput
): Promise<LocalAgentTurnResult> {
  // Provenance changes within this loop, not in the caller's initial turn facts.
  input = { ...input, runtimeContext: input.runtimeContext ? { ...input.runtimeContext } : undefined };
  const legacyCallbacks = {
    onLoopEvent: input.onLoopEvent,
    onToolEvent: input.onToolEvent,
    onTextDelta: input.onTextDelta,
    onReasoningDelta: input.onReasoningDelta,
    onObservationEvent: input.onObservationEvent,
  };
  const observationBoundary =
    input.observationBoundary ??
    createLocalLoopObservationBoundary(legacyCallbacks);

  if (input.observationBoundary) {
    // 自定义 boundary 传入时，合并 input 的 legacy callbacks 避免静默丢弃
    observationBoundary.attachCallbacks(legacyCallbacks);
  }

  // 计时探针（NOLO_LOOP_TIMING=1）：per-turn 实例，并发 turn 互不污染；
  // 门控关闭时每个调用点仅一次布尔判断（见 ./loopTiming）。
  const loopTiming = createLoopTiming();

  try {
    // 入口先打点，覆盖 loadAgentConfig/loadDialogHistory 段。
    loopTiming.mark("turnStart", 0);
  let agentConfig = await input.adapter.loadAgentConfig(input.agentRef);
  if (!agentConfig) {
    const error = new Error(
      `agentRef "${input.agentRef}" 未匹配到本地 agent。这不是配置缺失，请用 listAgents 查看可用 agent，再用 readAgent 解析 agentKey，勿手工拼 key。`,
    ) as Error & {
      code?: string;
      agentRef?: string;
    };
    error.code = LOCAL_AGENT_CONFIG_MISSING_CODE;
    error.agentRef = input.agentRef;
    throw error;
  }
  const runtimeContext = input.runtimeContext;
  const runConstraints = {
    allowedToolNames: Array.isArray(runtimeContext?.allowedToolNames)
      ? runtimeContext.allowedToolNames
      : undefined,
    blockedToolNames: Array.isArray(runtimeContext?.blockedToolNames)
      ? runtimeContext.blockedToolNames
      : undefined,
  };
  if (runConstraints.allowedToolNames !== undefined || runConstraints.blockedToolNames !== undefined) {
    // Narrow the host's EFFECTIVE surface (exposedToolNames: after pack
    // expansion, incl. the host-required `code` fallback), never the bare
    // declared list. Narrowing the declared list turned `--read-only` on a
    // zero-declared agent into "no tools at all" — reviewers lost shell/read.
    const effective = agentConfig.exposedToolNames ?? agentConfig.toolNames;
    const toolNames = Array.isArray(effective) ? effective : [];
    const constrainedSurface = applyToolSurfaceConstraints(
      { explicitToolNames: toolNames, injectedToolNames: [], finalToolNames: toolNames },
      runConstraints,
    );
    agentConfig = {
      ...agentConfig,
      toolNames: constrainedSurface.finalToolNames,
      exposedToolNames: constrainedSurface.finalToolNames,
      ...(agentConfig.rawRecord
        ? { rawRecord: { ...agentConfig.rawRecord, toolNames: constrainedSurface.finalToolNames } }
        : {}),
      toolSurface: constrainedSurface,
      runScopedToolSurface: constrainedSurface,
    } as typeof agentConfig;
  }
  const rawBillingConfig = agentConfig.rawRecord ?? {};
  const billingConfig: NonNullable<AgentRuntimeSaveTurnInput["billingConfig"]> = {
    model: agentConfig.model || "unknown",
    ...(agentConfig.provider ? { provider: agentConfig.provider } : {}),
    ...(agentConfig.apiSource ? { apiSource: agentConfig.apiSource } : {}),
    ...(agentConfig.apiKeyRef !== undefined ? { apiKeyRef: agentConfig.apiKeyRef } : {}),
    ...(typeof rawBillingConfig.inputPrice === "number" ? { inputPrice: rawBillingConfig.inputPrice } : {}),
    ...(typeof rawBillingConfig.outputPrice === "number" ? { outputPrice: rawBillingConfig.outputPrice } : {}),
    ...(rawBillingConfig.sharingLevel ? { sharingLevel: rawBillingConfig.sharingLevel as "default" | "split" | "full" } : {}),
    id: agentConfig.key,
    ...(typeof rawBillingConfig.userId === "string" ? { userId: rawBillingConfig.userId } : {}),
  };

  /**
   * 入路隔离：把明文凭据换成本地 broker 的不透明引用；broker 不可用时降级到正则脱敏。
   *
   * 失败必须**降级**而不是把 turn 抛掉。接线前同一种输入本来就只走到 scrub，接线后
   * 若因桌面 Keychain 锁定、存储不可写而直接让本轮失败，等于用一个安全层的故障
   * 换掉整个回合的可用性——fail-closed 指的是「明文不外流」，不是「对话不能用」。
   */
  const sanitizeInbound = async (
    content: AgentRuntimeMessageContent,
  ): Promise<AgentRuntimeMessageContent> => {
    if (input.adapter.credentialBroker) {
      try {
        const isolated = await isolateInboundContent(
          content,
          input.adapter.credentialBroker,
        );
        return isolated.safeContent;
      } catch (error) {
        console.warn(
          "[localLoop] inbound credential isolation failed, falling back to scrub:",
          error,
        );
      }
    }
    if (typeof content === "string") return scrubSecrets(content).cleaned;
    if (Array.isArray(content)) {
      return content.map((part) =>
        part?.type === "text" && typeof part.text === "string"
          ? { ...part, text: scrubSecrets(part.text).cleaned }
          : part,
      );
    }
    return content;
  };

  // 凭据入路隔离：支持纯文本与多模态 Parts 数组，防止明文进入历史、失败快照与 Provider
  let sanitizedInput = await sanitizeInbound(input.input);

  // [Security F2 修复]：对 TUI 粘贴展开路径 (persistedInput) 施加同一隔离与脱敏，防止展开内容落库时泄漏
  let sanitizedPersistedInput: AgentRuntimeMessageContent | undefined =
    input.persistedInput === undefined
      ? undefined
      : await sanitizeInbound(input.persistedInput);

  let history: AgentRuntimeChatMessage[] = [];
  /** Where the continued dialog's history came from ("none" = not loaded). */
  let dialogHistorySource: AgentRuntimeDialogHistorySource | undefined;
  try {
    if (input.continueDialogId) {
      const loaded = await loadAdapterDialogHistory(
        input.adapter,
        input.continueDialogId,
        {
          strictContinueHistory: input.strictContinueHistory,
          freshDialog: input.freshDialog,
        },
      );
      if (input.freshDialog && loaded.messages.length > 0) {
        throw new Error("Fresh dialog already has history");
      }
      if (input.strictContinueHistory && (loaded.source === "none" || loaded.source === "partial")) {
        throw new Error(`Strict continuation history unavailable: ${loaded.source}`);
      }
      const currentIds = new Set(input.userMessages?.map(message => message.cliMessageId));
      history = loaded.messages.filter(message => !currentIds.has((message as any).cliMessageId));
      dialogHistorySource = loaded.source;
    }
  } catch (error) {
    if (input.strictContinueHistory || input.freshDialog) throw error;
    // History load failed mid-continue: still park the user's message on the
    // existing dialog so the next "继续" keeps the same pointer.
    const dialogId = await persistFailedLocalTurn({
      adapter: input.adapter,
      agentKey: agentConfig.key,
      messages: [{ role: "user", content: sanitizedInput }],
      error,
      model: agentConfig.model,
      input,
    });
    attachDialogIdToError(error, dialogId);
    throw error;
  }
  loopTiming.mark("loadDialogHistory", 0);
  if (input.continueDialogId && !input.freshDialog && history.length === 0 && dialogHistorySource === "none") {
    // Explicit "history not loaded" signal instead of silently treating a
    // resumed dialog as brand-new: the remote fallback failed (network /
    // unauthenticated / 404), so this turn runs without prior context.
    console.warn(
      `[localLoop] dialog history unavailable for ${input.continueDialogId} ` +
        "(source: none); continuing without prior context.",
    );
  } else if (input.continueDialogId && dialogHistorySource === "partial") {
    // Restored history that must not pass for a complete resume (damaged /
    // truncated records, or a fallback that could not run). Warning here keeps
    // the degradation visible instead of silently losing earlier context.
    console.warn(
      `[localLoop] dialog history incomplete for ${input.continueDialogId} ` +
        `(source: partial); only ${history.length} message(s) available, ` +
        "earlier context may be missing.",
    );
  }
  // 轮内压缩的 canonical 坐标底稿：store 全量历史（未投影）。
  // history 随后会被压缩投影/兜底裁剪整体替换（rebind，非原地改），
  // 该引用保持全量原始顺序不变，锚点坐标与 store 持久化历史对齐。
  const canonicalHistory = history;
  // Identity block (名称/ID/模型) — session-scope so it sits in the
  // stable prefix. Built from the resolved agentConfig so subscribed/custom
  // agents get their model name injected, matching the web and server paths
  // (previously the local/desktop/TUI runtime omitted the identity block).
  const identityBlock = buildIdentityBlock({
    agentName: agentConfig.name,
    agentId: agentConfig.key,
    model: agentConfig.model,
  });
  // 与 web/server 对齐：为本地宿主注入 runtime guidance 块（startup-protocol /
  // context-layer-contract / email-registration-workflow / web-research-tool-policy，
  // 仅保留非空块）。guidance 块作为 session-scope（稳定前缀，利于 prefix cache）。
  // current-time 时间块已删除：模型需要精确时间时用 shell `date` 自行获取。
  // Guidance must describe the tools the model can actually call. Hosts that
  // drop undeliverable names report the survivors via exposedToolNames; fall
  // back to the declared list for hosts that expose everything they declare.
  const agentTools = canonicalizeToolNames(
    agentConfig.exposedToolNames ?? agentConfig.toolNames ?? []
  );
  const guidanceBlocks = buildRuntimeGuidanceBlocks(agentTools);
  // 与 web/server 对齐：工具驱动指令表（多 Agent 编排/协作 review 硬门、
  // menuUsage、网页访问、知识管理、记忆捕获等）与 buildSystemPrompt 共用同一
  // resolveToolGuidedSections。本地运行时此前只拼 runtime guidance 块，review
  // 硬门因此只在服务端路径生效——“本地会话不走第三方 review”事故的根因。
  // menuUsage 已并入该表，不再单独注入。
  const toolGuidedSections = resolveToolGuidedSections(agentTools, {
    // 单调锁定：历史里任一 user 消息命中派发关键词、或已出现过
    // startAgentRun/controlAgentRun 的 tool_calls，后续每轮都保持 true，
    // 防止 session-scope 的 agentCollaboration 段逐轮翻转击穿前缀缓存。
    dispatchIntent:
      detectDispatchIntentFromMessages(history) ||
      detectDispatchIntent(
        typeof input.input === "string" ? input.input : undefined
      ),
    runKind: input.runKind,
    // 主 Agent 强弱姿态：本地宿主能直读当前会话模型（agentConfig.model，会话内
    // 恒定），显式透传后由 resolveToolGuidedSections 按档位追加一句短指引；
    // 模型缺失/推不出档位时不追加文本，前缀缓存稳定性不受影响。
    callerModel: agentConfig.model,
    // 池顶姿态：宿主启动会话时按内存中已有的候选池算一次（零网络 I/O），
    // 会话内恒定；不传时不改动任何既有字节。
    callerIsPoolTop: input.callerIsPoolTop,
  });
  // 宿主自己注入过记忆使用指引吗？CLI/TUI/desktop 在本函数之前用
  // `buildMemoryUseGuidanceLayer({ promptBlock })` 按「有 overlay 就注入」放过一份
  // （`promptBlock` 门控那一档），这里只补它覆盖不到的缺口——空库 + 有记忆工具。
  // 去重按同一模块导出的常量文本比对（MEMORY_USE_GUIDANCE 是唯一真值，改写文案
  // 不会让这里失效），因此不会出现两份指引。
  const callerScopes = normalizeContextBlockScopes(
    input.contextBlocks,
    input.contextBlockScopes,
  );
  const callerHasMemoryGuidance = callerScopes.some((scope) =>
    scope.content.includes(MEMORY_USE_GUIDANCE),
  );
  const guidanceScopes: ContextBlockScope[] =
    [
      ...(input.userLanguage?.trim()
        ? [buildUserResponseLanguageContext({ language: input.userLanguage })]
        : []),
      guidanceBlocks.startupProtocol,
      guidanceBlocks.contextLayerContract,
      guidanceBlocks.emailRegistrationWorkflow,
      // 注入顺序遵循 TOOL_GUIDED_SECTION_ORDER（与 buildSystemPrompt 的显式
      // layer 列表同源），禁止用 Object.values 自行定序。
      ...TOOL_GUIDED_SECTION_ORDER.map((id) => toolGuidedSections[id] ?? ""),
      // 记忆使用指引（session-scope，进稳定前缀）：判定真值是 turnContext 的
      // `hasMemoryTools`（有效工具面），与 web/server 的 buildSystemPrompt 同一条
      // 规则。放在这里而不是各宿主：CLI/TUI/desktop 都经 runLocalAgentTurn 进入本
      // 函数，一处即可覆盖三端，并补齐「空库 + 有记忆工具」这一档——此前本地宿主
      // 只按记忆 overlay 是否为空门控，空库时模型永远不知道该怎么用记忆工具。
      ...(hasMemoryTools(agentTools) && !callerHasMemoryGuidance
        ? [MEMORY_USE_GUIDANCE]
        : []),
      ...(input.runKind === "subtask" ? [LEAF_FINAL_HANDOFF_INSTRUCTIONS] : []),
    ]
      .map((content) => content.trim())
      .filter((content): content is string => content.length > 0)
      .map((content) => ({ content, cacheScope: "session" as const }));
  // Built-in scopes (identity/guidance) always come first; the caller's
  // normalized scopes follow (computed above as `callerScopes`).
  // 回复准则集合经单一入口解析：行为和排版都来自同一处真值，
  // 宿主只声明能力（input.responseViewport），不自己拼准则文本。
  const responseGuidelines = resolveResponseGuidelines(
    input.responseViewport ?? "unknown",
  );
  const responseGuidelineScopes: ContextBlockScope[] = [
    { content: responseGuidelines.behavior, cacheScope: "session" as const },
    ...(responseGuidelines.presentation.trim().length > 0
      ? [
          {
            content: responseGuidelines.presentation,
            cacheScope: "session" as const,
          },
        ]
      : []),
  ];
  const mergedContextBlockScopes: ContextBlockScope[] = [
    // 顶部固定平台层（唯一真源见 platformStaticPromptLayers.ts；localLoop 无 static 作用域，session 占位）。
    ...buildPlatformStaticScopedBlocks(),
    { content: identityBlock, cacheScope: "session" as const },
    ...guidanceScopes,
    // 回复行为准则：local 线（CLI 非交互 / 桌面 / TUI）的唯一注入边界。
    // 行为段恒注入；排版段只在宿主声明了可确认的展示能力时追加一份
    // （unknown = 拿不到视口信息，不得猜成宽屏或窄屏）。两块同属 session scope。
    ...responseGuidelineScopes,
    ...callerScopes,
  ];
  loopTiming.mark("buildContextBlocks", 0);

  // Provider 惰性解析：自动压缩需要生成摘要时才 resolve；主循环复用同一实例。
  // resolve 失败由压缩路径吞掉（退回兜底裁剪），主循环再 resolve 时仍走原有 saveTurn 路径。
  let resolvedProvider: AgentRuntimeProvider | undefined;
  const resolveProviderOnce = async (): Promise<AgentRuntimeProvider> => {
    if (!resolvedProvider) {
      resolvedProvider = await input.adapter.resolveProvider(agentConfig);
    }
    return resolvedProvider;
  };

  // 摘要调用专用 provider：**独立实例、空工具面、不带 agent 人设**。
  //
  // 摘要是纯文本补全（压缩 system prompt 明确禁止调工具），没有理由带上
  // 整份工具 schema 与 agent prompt——实测工具面 15 个 ≈ 13.3k token、全量
  // 注册表 157 个 ≈ 66k token，叠加在 ~30k token 的摘要 prompt 上会把 gpt-6.x
  // 的摘要延迟推到 60s 超时边缘（2026-11-03 本机日志）。必须由 host 明确保证
  // textOnly 隔离；不支持的 native CLI / host 在 complete 前失败，沿用压缩失败恢复，
  // 不得退回带工具的主 provider（空 schema / prompt 本身不是执行隔离）。
  let resolvedSummaryProvider: AgentRuntimeProvider | undefined;
  const resolveSummaryProviderOnce = async (): Promise<AgentRuntimeProvider> => {
    if (!resolvedSummaryProvider) {
      const provider = await input.adapter.resolveProvider(agentConfig, {
        textOnly: true,
        toolNames: [],
        prompt: "",
      });
      if (provider.textOnly !== true) {
        throw new Error("auto-compaction requires an isolated text-only provider");
      }
      resolvedSummaryProvider = provider;
    }
    return resolvedSummaryProvider;
  };

  // 获取该 dialog 上一次 provider 调用的真实 input tokens（方案 a）：
  // 轮开始兜底判定的真实遥测读取（loadLastContextUsage）已迁入 controller。
  const contextWindow = resolveAgentContextWindow(agentConfig);
  // 压缩触发线：随窗口留足「单轮工具灌水」余量（见 toolOutputCap.ts）。
  // 轮开始与轮内 round 之间共用同一条线。
  const compressionTriggerRatio = resolveCompressionTriggerRatio(contextWindow);

  // 自动上下文压缩（turn 级 controller，统一发送前准入，实现见
  // localAutoCompaction.ts）：先于预算兜底。摘要持久化，压缩点之间前缀稳定
  // 以保住缓存。失败可继续，但不得以未覆盖的尾部裁剪换取继续发送。
  // 摘要那次 LLM 调用是一次独立的计费调用，用量必须并入本轮 usage，
  // 否则只出现在 provider 账单上、我们自己的 token 记账看不到。
  let selectedSummary: NonNullable<import("./providerCallTelemetry").ContextProvenance["summary"]> = { outcome: "unknown" };
  let summaryProjectedPhase = contextPhase("summary-projected", history);
  const historyLoadedPhase = contextPhase("history-loaded", history, { source: dialogHistorySource ?? "unknown" });
  const compaction = createTurnCompactionController({
    adapter: input.adapter,
    continueDialogId: input.continueDialogId,
    model: agentConfig.model,
    provider: agentConfig.provider,
    providerEndpoint: agentConfig.customProviderUrl,
    resolveProvider: resolveSummaryProviderOnce,
    contextWindow,
    compressionTriggerRatio,
    abortSignal: input.abortSignal,
    timeoutMs: resolveCompactionTimeoutMs(input),
    // 摘要 fallback：优先显式入参；否则读 host adapter 的会话级注入（CLI 本地
    // adapter 专有字段，见 localRuntimeAdapter.setCliAutoCompactionSummaryFallback）。
    // desktop/其他 host 不带该字段 → undefined → 自动压缩行为与注入前完全一致，
    // 绝不在这里新建第二条摘要通道。
    summaryFallback:
      input.compactionSummaryFallback ?? readHostCompactionSummaryFallback(input.adapter),
    boundary: observationBoundary,
    getContextUsage: () => usageLedger.lastContextUsage(),
    getCanonicalCompactionHistory: () => orderDialogHistory([
      ...canonicalHistory,
      ...transcript.persisted(
        sanitizedPersistedInput,
        input.persistedInputReference,
      ).map(message => {
        const receipt = (message as typeof message & { cliMessageId?: string }).cliMessageId;
        return receipt ? { ...message, id: receipt } : message;
      }),
    ]),
    getWorkingPrefix: () => transcript.working().slice(0, prefixCount),
    onSelectedSummary: (summary) => { selectedSummary = summary; },
    replaceWorkingView: (next) => {
      transcript.replaceWorkingHistory(next);
      input.adapter.onWorkingHistoryReplaced?.();
      summaryProjectedPhase = contextPhase("summary-projected", next);
    },
    contextReferenceResolver:
      input.adapter.host === "cli" ? input.contextReferenceResolver : undefined,
    onUsage: (usage) => usageLedger.addCompaction(usage),
  });
  // Already-cancelled initial turns must not enter failed-turn persistence.
  throwIfAborted(input);
  // Request admission runs after transcript/ledger initialization and all injections.
  let budgetTrimPhase = contextPhase("budget-trim", history, { droppedCount: 0 });

  const builtMessages = buildMessages({
    prompt: agentConfig.prompt,
    contextBlockScopes: mergedContextBlockScopes,
    history,
    input: sanitizedInput,
    contextReferenceResolver:
      input.adapter.host === "cli" ? input.contextReferenceResolver : undefined,
  });
  let messages = builtMessages.messages;
  // 相位说明：buildMessages 读数含发送视图的毒丸 tool_call 降级扫描
  // （已并入 composeProviderMessages），与旧实现相比该成本从后一相位移入此处。
  loopTiming.mark("buildMessages", 0);
  // 毒丸防御：历史中 arguments 非法 JSON 的 tool_call（典型成因：上游流式截断，
  // 如 GLM 并行 tool_call 丢结尾 `"}]}`）会让网关对整个请求 400（实测 UPSTREAM_400
  // messages[N].tool_calls[0].function.arguments invalid JSON string），而坏消息已
  // 在存储历史里，每轮重放每轮失败 → dialog 永久死锁（"继续"无效）。发送前就地
  // 降级为文本（存储不动、幂等），模型看到意图与 tool 结果文本后可重发调用 → 自愈。
  // 降级已在 buildMessages → composeProviderMessages 内完成，这里只保留告警。
  if (builtMessages.poisonDowngraded > 0) {
    // 单源统计：数字直接来自投影（composeProviderMessages →
    // downgradeUnparsableToolCalls）的分类统计，与实际降级同源；
    // 这里不再旁路扫描 history。降级动作与持久化历史一律不动。
    const stats = builtMessages.poisonStats;
    console.warn(
      `[nolo] rewrote ${stats.rewrittenToolCalls} tool calls in ${stats.rewrittenAssistantMessages} assistant messages and ${stats.rewrittenToolMessages} tool-result messages (bad arguments: truncated=${stats.badArguments.truncated}, malformed=${stats.badArguments.malformed}); persisted history untouched`,
    );
  }
  // vision 能力检测：catalog 已知模型按 hasVision 判定，未知模型默认 true。
  // 不支持图片时，buildMessages 产出的 image_url parts 必须在发给 provider 前剥离，
  // 否则上游 400 "this model does not support image input" → local 判失败 → fallback
  // 到没有 local code 工具的 server → agent 报 blocker。直接传入完整 agentConfig，
  // 供能力检测层按需解构 apiSource/provider/model/apiKeyRef/customProviderUrl/apiKey 等。
  const supportsImages = resolveAgentImageInputSupport(agentConfig as any);

  let imageDowngradeEmitted = false;
  // 纯文本模型 + 有图：无 vision 能力时剥离 image_url 为占位符，避免上游 400。
  if (!supportsImages && hasImageInRuntimeMessages(messages)) {
    messages = filterImagePartsFromMessages(messages, false);
    emitLoopEvent(observationBoundary, {
      kind: "image-downgraded",
      reason: "no-vision",
      atMs: Date.now(),
    });
    imageDowngradeEmitted = true;
  }

  // 发送视图（messages）与持久化原文（raw）收成一本账：压缩只换发送视图，
  // 持久化不跟投影走（否则丢本轮原始消息、且与持久化锚点的 canonical
  // 坐标系错位）；注入边界的「预置 assistant 再撤回」两本账同步。
  // 前缀条数用 buildMessages 实际发出的 prefixCount（旧实现按 prompt/
  // contextBlocks 自行推算，prompt 为空但仅有 turn-scope 块时会多切一条）。
  const prefixCount = builtMessages.prefixCount;
  // 单条工具输出硬上限：让「单轮最大灌水增量」有界，轮内压缩触发线的
  // 余量公式才成立（见 toolOutputCap.ts）。只截进入上下文/持久化的 content，
  // 结构化数组 content（图片等）不截。
  const capToolMessage = (
    msg: AgentRuntimeChatMessage,
  ): AgentRuntimeChatMessage =>
    msg.role === "tool" && typeof msg.content === "string"
      ? {
          ...msg,
          content: truncateToolOutputForContext(msg.content, contextWindow),
        }
      : msg;
  if (input.userMessages?.length) {
    const currentInputStart = builtMessages.prefixCount + history.length;
    const sanitizedUsers = await Promise.all(input.userMessages.map(async message => ({
      ...message, content: await sanitizeInbound(message.content),
    })));
    messages.splice(currentInputStart, messages.length - currentInputStart, ...sanitizedUsers);
  }
  if (!input.userMessages?.length && input.adapter.host === "cli") {
    const userIndex = builtMessages.prefixCount + history.length;
    const id = dialogTurnUserMessageId(input.runtimeContext?.turnId, 0);
    if (id && messages[userIndex]?.role === "user") messages[userIndex] = { ...messages[userIndex], id };
  }
  const acceptToolImages = createToolImageLedger();
  const transcript = createTurnTranscript({
    initialWorking: messages,
    prefixCount,
    historyCount: history.length,
    capToolMessage,
  });

  let prepareDirectWorkMemorySource = !input.userMessages?.length ? input.prepareDirectWorkMemorySource : undefined;
  const directUserMessage = prepareDirectWorkMemorySource
    ? transcript.persisted(sanitizedPersistedInput, input.persistedInputReference)[0]
    : undefined;

  let directWorkSource: Promise<string | undefined> | undefined;
  const getDirectWorkSource = async () => {
    const prepare = prepareDirectWorkMemorySource;
    if (!prepare || directUserMessage?.role !== "user") return undefined;
    const attempt = directWorkSource ??= (async () => {
      try {
        const id = await prepare(directUserMessage);
        return id && id === directUserMessage.id ? id : undefined;
      } catch {
        return undefined;
      }
    })();
    const id = await attempt;
    // Share in-flight work. A failed waiter must not clear a newer retry.
    if (!id && directWorkSource === attempt) directWorkSource = undefined;
    return id;
  };

  const userInputText = extractUserInputText(input.input);
  let toolCallCount = 0;
  // 兜底标记（emptyAssistantFallbackReason / emptyAssistantOutputUsable）已
  // 收敛到 AgentRuntimeResult 本体，这里不再需要本地类型放宽。
  // 结果容器：给一个**确定的初值**（content 为空，其余字段缺省）。
  // 原因：provider 首轮就抛错时 result 从未被赋值，下游读 result.content 会直接崩，
  // TS 也会报 TS2454（used before being assigned）。有了初值，
  // 「还没有 provider 结果」这条路径也有稳定形态。
  let requestCalibrationRatio = 1; // no-telemetry heuristic, not a tokenizer guarantee
  let result: AgentRuntimeResult = { content: "" } as unknown as AgentRuntimeResult;
  let stopReason: AgentRuntimeResult["stopReason"];
  // 计费/用量账本：逐次调用证据（callId 优先 provider_call_id）+ 带外摘要
  // 用量 + 结算口径；成功与失败两条路径共用同一出口。
  const usageLedger = createTurnUsageLedger({
    model: agentConfig.model,
    provider: agentConfig.provider,
    ...(builtMessages.stablePrefixHash
      ? {
          stablePrefixHash: builtMessages.stablePrefixHash,
          stablePrefixEstimatedTokens: builtMessages.stablePrefixEstimatedTokens,
        }
      : {}),
  });
  let loopError: unknown;
  let consumedInjectedMessages = false;
  let round = 0;
  // 空轮修复状态（语义与 server loop 对齐）：
  //   repairPending  → 下一轮请求注入 repair system message
  //   repairUsed     → 已用过 repair，二次仍空则 fallback
  let emptyAssistantRepairPending = false;
  let emptyAssistantRepairUsed = false;
  // reasoning-only 空轮已 repair 次数（防死循环，上限见 MAX_REASONING_ONLY_REPAIRS）
  let reasoningEmptyRepairCount = 0;
  // provider（如 Cursor）在流内执行完所有工具时，output blocks 已含全部
  // 文本块（含最后一段）。break 后跳过通用最终 assistant 消息追加。
  let skipFinalAppend = false;
  // 当前未完成轮的流式文本累加。每轮入口重置，只保留最新未完成轮的文本，
  // 供 loopError 分支在 saveTurn 时写入，避免中断时丢失已生成的部分回复。
  let partialContent = "";
  const progressGuard = createLocalLoopProgressGuard(input.progressGuardConfig);
  const softBudgetAdvisor = createSubtaskSoftBudgetAdvisor({
    softBudget: input.softBudget,
    isSubtask: input.isSubtask,
    runKind: input.runKind,
    ...(input.softBudgetEnv ? { env: input.softBudgetEnv } : {}),
  });
  // Deferred mid-turn injection commits. Registered at the round boundary and
  // committed only at the request boundary (immediately before the provider
  // dispatch); rolled back if the turn aborts before that point so the unsent
  // message stays re-sendable instead of being frozen at `requested`. Declared
  // outside the try so the outer catch can roll back on any abort path.
  let pendingInjectionCommits: Array<{
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
    messages: Array<AgentRuntimeChatMessage & { cliMessageId?: string }>;
  }> = [];
  // Active injection transactions currently in flight: committed at the
  // request boundary, but retained until providerInvoked === true so any
  // failure before the provider is actually called can roll them back.
  let inFlightTransactions: Array<{
    commit: () => Promise<void>;
    rollback: () => Promise<void>;
    messages: Array<AgentRuntimeChatMessage & { cliMessageId?: string }>;
  }> = [];
  // Assigned inside the try (it closes over `transcript`), but bound here so the
  // outer catch can roll back on every abort path.
  let rollbackInjectionCommits: (
    transactions: Array<{
      rollback: () => Promise<void>;
      messages: Array<AgentRuntimeChatMessage & { cliMessageId?: string }>;
    }>,
  ) => Promise<void> = async () => {};

  try {
    // resolveProvider used to sit outside the try: credential / provider-init
    // failures then skipped saveTurn, so TUI lost dialogId and the next
    // message opened a fresh conversation ("amnesia").
    // Auto-compaction may have already resolved the provider; reuse it.
    const provider = await resolveProviderOnce();
    // 回合内注入：取走收件箱条目并作为 user 消息追加到当前上下文。
    // 返回是否真的注入了内容（供正常完成路径决定是否继续跑一轮）。
    //
    // 契约（见 LocalTurnInjection）：兼容旧的同步 `string[]`（内部唤醒文本），
    // 也接受结构化 user 消息（排队用户批次，带 cliMessageId）与 Promise。
    // 回调抛错（附件准备/持久化失败）必须向上传播：调用方已把批次留在队列里，
    // 吞掉错误继续旧任务会让用户消息既不进模型也不再可见。
    const applyPendingInjections = async (): Promise<boolean> => {
      if (!input.drainInjections) return false;
      const pending = (await input.drainInjections()) ?? [];
      let injected = false;
      for (const entry of pending) {
        if (typeof entry === "string") {
          if (!entry.trim()) continue;
          transcript.push({ role: "user", content: scrubSecrets(entry).cleaned });
        } else if (entry && typeof entry === "object" && "messages" in entry) {
          for (const message of entry.messages) {
            const content = typeof message.content === "string"
              ? scrubSecrets(message.content).cleaned
              : Array.isArray(message.content)
                ? message.content.map(part => part?.type === "text" && typeof part.text === "string"
                    ? { ...part, text: scrubSecrets(part.text).cleaned }
                    : part)
                : message.content;
            transcript.push({
              role: "user",
              content,
              ...(message.cliMessageId ? { cliMessageId: message.cliMessageId } : {}),
              ...(Number.isFinite(message.cliHistoryOrder) ? { cliHistoryOrder: message.cliHistoryOrder } : {}),
            });
          }
          pendingInjectionCommits.push({ commit: entry.commit, rollback: entry.rollback, messages: entry.messages });
        } else if (entry && typeof entry === "object" && "content" in entry) {
          const content = typeof entry.content === "string"
            ? scrubSecrets(entry.content).cleaned
            : Array.isArray(entry.content)
              ? entry.content.map(part => part?.type === "text" && typeof part.text === "string"
                  ? { ...part, text: scrubSecrets(part.text).cleaned }
                  : part)
              : entry.content;
          transcript.push({
            role: "user",
            content,
            ...(entry.cliMessageId ? { cliMessageId: entry.cliMessageId } : {}),
          });
        } else {
          continue;
        }
        consumedInjectedMessages = true;
        injected = true;
      }
      return injected;
    };
    rollbackInjectionCommits = async (
      transactions: Array<{
        rollback: () => Promise<void>;
        messages: Array<AgentRuntimeChatMessage & { cliMessageId?: string }>;
      }>,
    ) => {
      const errors: unknown[] = [];
      for (const transaction of transactions.slice().reverse()) {
        try {
          await transaction.rollback();
        } catch (rollbackError) {
          errors.push(rollbackError);
        }
        // Remove exactly this transaction's messages by identity, leaving the
        // budget warning / internal notices in place (count-based popLast would
        // corrupt the stack when the budget warning was pushed after them).
        const ids = new Set(
          transaction.messages.map(message => message.cliMessageId).filter((id): id is string => Boolean(id)),
        );
        if (ids.size > 0) {
          transcript.retract((msg) => {
            const id = (msg as any).cliMessageId;
            return typeof id === "string" && ids.has(id);
          });
        }
      }
      // Never swallow a rollback failure: an unrolled injection would leave an
      // orphan `requested` and leak an unsent message into history.
      if (errors.length > 0) {
        throw new Error(
          `injection rollback failed: ${errors.map(error => error instanceof Error ? error.message : String(error)).join("; ")}`,
        );
      }
    };
    const newDialogTelemetryKey = `new:${crypto.randomUUID()}`;
    let roundBudgetWarningInjected = false;
    const roundWarningThreshold = input.roundBudgetWarningThreshold ?? DEFAULT_ROUND_BUDGET_WARNING_THRESHOLD;
    // 高档主模型自包提醒（Tier-Aware Offload Nudge）：状态只在本轮 loop 内累积。
    // 触发后写的是 transcript.append 路径的一次性 user 提示，与轮次预算预警同构，
    // 严格 append-only，不击穿前缀缓存。
    const callerTier = resolveModelTier(agentConfig.model ?? "");
    const offloadNudgeEnabled = input.runKind !== "subtask"
      && input.offloadNudgeDisabled !== true
      && (callerTier === "extreme" || callerTier === "complex")
      && agentTools.includes("startAgentRun");
    let offloadNudgeInjected = false;
    let hasDispatchedSubagent = false;
    let consecutiveReadOnlyRounds = 0;
    const writtenPaths = new Set<string>();

    /**
     * 把一次写/改调用归一成「实际落盘文件的规范绝对路径」，归一失败返回 null。
     *
     * 规范路径优先取执行结果元数据（writeFile/editFile 产出的 `metadata.path`
     * 是 workspace 相对规范路径，外部写为绝对路径），其次回落到对调用参数路径做
     * `resolve(workspaceRoot, p)`。`packages/a.ts`、`./packages/a.ts` 与绝对路径
     * 因此折叠成同一个键；解析不出目标的调用**不计文件**（曾把解析失败也计数，
     * 一次调用就能把「多文件」阈值顶满）。
     */
    const resolveWrittenPath = (
      metadata: Record<string, unknown> | undefined,
      rawArguments: string | undefined,
    ): string | null => {
      const workspaceRoot = input.adapter.workspaceRoot;
      const candidates: string[] = [];
      for (const key of ["resolvedPath", "path", "filePath", "file_path"]) {
        const fromMetadata = metadata?.[key];
        if (typeof fromMetadata === "string" && fromMetadata.trim()) candidates.push(fromMetadata.trim());
      }
      if (rawArguments) {
        try {
          const parsed = JSON.parse(rawArguments) as Record<string, unknown> | null;
          if (parsed && typeof parsed === "object") {
            for (const key of ["path", "filePath", "file_path"]) {
              const value = (parsed as Record<string, unknown>)[key];
              if (typeof value === "string" && value.trim()) candidates.push(value.trim());
            }
          }
        } catch {
          // 参数不是 JSON：交给元数据路径，解析不出就按「无目标」处理。
        }
      }
      for (const candidate of candidates) {
        if (!candidate) continue;
        try {
          // 无 workspaceRoot（宿主未声明）时用进程 cwd 作为归一基准：阈值只关心
          // 「是否同一个文件」，基准只影响键的前缀，不影响去重。
          const base = workspaceRoot && workspaceRoot.trim() ? workspaceRoot : process.cwd();
          return resolvePath(base, candidate);
        } catch {
          continue;
        }
      }
      return null;
    };

    const trackRoundOffloadSignals = (
      roundToolCalls: readonly AgentRuntimeToolCall[],
      roundResults: ReadonlyArray<AgentRuntimeToolResult | undefined>,
    ): void => {
      if (!offloadNudgeEnabled || roundToolCalls.length === 0) return;
      let readOnlyRound = true;
      roundToolCalls.forEach((call, index) => {
        // 分类前先归一到派发器认识的规范工具名：模型可能写 `functions.writeFile`、
        // `grep`、`search` 这类别名，按原始名字判断会把只读轮误判成写轮（或反之）。
        const name = normalizeLocalToolName(call.function.name);
        if (name === "startAgentRun") {
          // 已派发子 run：这条提醒再没有意义（主动派发已发生）。
          hasDispatchedSubagent = true;
          readOnlyRound = false;
          return;
        }
        if (!(CONCURRENT_READONLY_TOOLS.has(name) || name === "searchFiles")) {
          readOnlyRound = false;
        }
        if (OFFLOAD_WRITE_TOOLS.has(name)) {
          // 关键：按**原始调用下标**取本次调用的结果，不按 `call.id` 建表。
          // 模型可以在同一轮里重复使用同一 id（同一批"重试同一个文件"就常见）；
          // 按 id 索引会让前一槽的结果被后一槽覆盖，把「失败 ×2 + 成功 ×1」
          // 误读成「同一个文件的成功结果」，或把成功结果错记到失败调用上。
          const toolResult = roundResults[index];
          // 只统计**执行成功**的写/改：失败、blocked、无结果的调用没有落盘，
          // 计进去会把「一次成功的多轮改写」夸大成多文件。
          const failed = !toolResult
            || toolResult.metadata?.blocked === true
            || Boolean(toolResult.metadata?.error)
            || isToolExecutionFailure(toolResult);
          if (!failed) {
            const resolved = resolveWrittenPath(toolResult.metadata, call.function.arguments);
            if (resolved) writtenPaths.add(resolved);
          }
        }
      });
      consecutiveReadOnlyRounds = readOnlyRound ? consecutiveReadOnlyRounds + 1 : 0;
    };
    while (true) {
      partialContent = "";
      throwIfAborted(input);
      loopTiming.mark("roundStart", round);
      // 注入放在 roundStart 标记之后：roundStart 记的是「上一相位结束到本轮开始」
      // 的边界耗时，注入的开销应计入随后的 prepareMessagesForProviderCall 相位，
      // 不污染边界读数。注入仍在构造请求消息之前，本轮 provider 调用即可见。
      await applyPendingInjections();
      if (
        roundWarningThreshold > 0 &&
        round >= roundWarningThreshold &&
        !roundBudgetWarningInjected
      ) {
        // 关键（Sol Review P1 阻断项修复）：通过 transcript 正式追加路径注入一次。
        // 这样若模型看到提示后继续发 tool_calls，该提示自然成为 transcript 历史的一部分，
        // 保证后续轮次的请求严格保持 Append-Only，前缀缓存绝不发生分叉或断裂。
        const prompt = buildRoundBudgetWarningPrompt(roundWarningThreshold);
        transcript.push({ role: "user", content: prompt });
        roundBudgetWarningInjected = true;
      }
      if (offloadNudgeEnabled && !offloadNudgeInjected && !hasDispatchedSubagent) {
        const reason = consecutiveReadOnlyRounds >= DEFAULT_OFFLOAD_EXPLORE_ROUNDS
          ? "explore" as const
          : writtenPaths.size >= DEFAULT_OFFLOAD_WRITE_FILES
            ? "write" as const
            : null;
        if (reason) {
          // 与轮次预算预警完全相同的 append-only 注入路径：只追加一次 user 消息，
          // 已发出的历史逐字节不变，前缀缓存不分叉。
          transcript.push({ role: "user", content: buildOffloadNudgePrompt(reason) });
          offloadNudgeInjected = true;
        }
      }
      // 空轮修复：把 repair user message 追加到本轮请求末尾重试一次（系统消息放在末尾会被大部分 Provider API 拒收或返回空消息）。
      const projectRequest = (source: AgentRuntimeChatMessage[]) => {
        const prepared = prepareMessagesForProviderCall(source);
        const base = filterImagePartsFromMessages(prepared.messages, supportsImages);
        return emptyAssistantRepairPending
          ? [...base, { role: "user" as const, content: EMPTY_ASSISTANT_REPAIR_PROMPT }]
          : base;
      };
      // Resolve transport-owned schema/output facts before either admission check.
      const admissionProvider = await resolveProviderOnce();
      throwIfAborted(input);
      const requestOverBudget = (messages: AgentRuntimeChatMessage[]) =>
        !evaluateLocalRequestBudget({ messages, contextWindow,
          descriptor: admissionProvider.requestBudget,
          calibrationRatio: requestCalibrationRatio }).fitsEstimate;
      const availableHistoryTokens = () => {
        const decision = evaluateLocalRequestBudget({ messages: [], contextWindow,
          descriptor: admissionProvider.requestBudget, calibrationRatio: requestCalibrationRatio });
        const prefixTokens = estimateLocalRequestInput(projectRequest(transcript.working().slice(0, prefixCount)));
        return Math.max(0, Math.floor(decision.availableInputTokens / requestCalibrationRatio)
          - prefixTokens - (admissionProvider.requestBudget?.toolSchemaTokens ?? 0));
      };
      // Diagnostic snapshot uses the admission estimator and calibration, before compaction.
      const historyTokensBeforeCompaction = Math.ceil(estimateLocalRequestInput(
        projectRequest(transcript.working()).slice(prefixCount)) * requestCalibrationRatio);
      await compaction.prepareRequest((source) => {
        const projected = composeProviderMessages({ prefix: transcript.working().slice(0, prefixCount),
          history: source, contextReferenceResolver:
            input.adapter.host === "cli" ? input.contextReferenceResolver : undefined });
        return requestOverBudget(projectRequest(projected.messages));
      }, round === 0, availableHistoryTokens);
      throwIfAborted(input);
      const preparedMessages = prepareMessagesForProviderCall(transcript.working());
      if (!supportsImages && hasImageInRuntimeMessages(preparedMessages.messages) && !imageDowngradeEmitted) {
        emitLoopEvent(observationBoundary, {
          kind: "image-downgraded",
          reason: "no-vision",
          atMs: Date.now(),
        });
        imageDowngradeEmitted = true;
      }
      let requestMessages = projectRequest(transcript.working());
      // Enforce the same full projected request bound after every tool round,
      // not only on history load. A failed compaction must never permit an
      // oversized request to escape to the provider.
      if (requestOverBudget(requestMessages)) {
        const budget = evaluateLocalRequestBudget({ messages: requestMessages, contextWindow,
          descriptor: admissionProvider.requestBudget, calibrationRatio: requestCalibrationRatio });
        const largestMessageTokens = requestMessages.reduce((largest, message) => Math.max(largest,
          Math.ceil(estimateLocalRequestInput([message]) * requestCalibrationRatio)), 0);
        throw new LocalContextCoverageError(0, undefined, classifyContextRefusal({
          outcome: compaction.getLastCompactionOutcome(),
          historyTokens: historyTokensBeforeCompaction, budget: budget.availableInputTokens,
          droppedCount: 0, largestMessageTokens,
        }));
      }
      budgetTrimPhase = contextPhase("budget-trim", requestMessages, { droppedCount: 0 });
      let contextMetrics: LocalAgentContextMetrics = {
        ...preparedMessages.metrics,
        messageCount: requestMessages.length,
        contentChars: requestMessages.reduce(
          (total, message) => total + contentCharCount(message.content),
          0,
        ),
        stableContextChars: builtMessages.stableContextChars,
        dynamicContextChars: builtMessages.dynamicContextChars,
      };
      emptyAssistantRepairPending = false;
      loopTiming.mark("prepareMessagesForProviderCall", round);
      const shouldStreamDeltas = Boolean(
        input.onTextDelta || input.onObservationEvent || input.observationBoundary,
      );
      const shouldStreamReasoning = Boolean(
        input.onReasoningDelta || input.onObservationEvent || input.observationBoundary,
      );
      const shouldPassToolEvents = Boolean(
        input.onToolEvent || input.onObservationEvent || input.observationBoundary,
      );
      // idle 计时源（ctx-overflow-feedback review 修复 1）：本轮 provider 调用
      // 期间每个 delta / 工具事件到达即 +1，kernel 据此把 llmRequestTimeoutMs
      // 判成「距上一次输出的最长静默期」而非「整请求总时长」——长流式生成
      // 只要还在吐字就不会被误杀。只在本来就透传回调（会 streaming）时生效，
      // 否则 provider 不会回调，读数恒 0，退化为旧的总时长语义。
      let llmStreamActivity = 0;

      // 缓存遥测（fail-open）：请求侧数字/哈希在调用前计算一次，O(消息数)。
      let callStartedAt = Date.now();
      let requestTelemetry = buildRequestTelemetry({
        // 无 dialogId 的新对话用本 turn 唯一键，避免不同新对话共用一个槽误报漂移。
        dialogKey: input.continueDialogId || newDialogTelemetryKey,
        messages: requestMessages,
        provenance: {
          schemaVersion: 1, transport: provider.transport ?? "unknown",
          phases: [historyLoadedPhase, summaryProjectedPhase, budgetTrimPhase, contextPhase("final-request", requestMessages)],
          summary: selectedSummary,
        },
        toolsHash: safeToolNamesHash(agentTools),
      });
      resetToolImageDelivery(requestMessages.flatMap(toolImages));
      // Request boundary: commit the round-boundary injections now that the
      // request is admitted and the provider is about to be invoked. Before this
      // point they are retained in the queue with no receipt, so an abort here
      // leaves them re-sendable. If the abort lands during the commit's own
      // store write, roll the receipt back and re-throw — never leave a
      // `requested` marker for a request that was never sent.
      if (pendingInjectionCommits.length > 0) {
        inFlightTransactions = pendingInjectionCommits.splice(0);
        try {
          for (const transaction of inFlightTransactions) await transaction.commit();
          // Only receipt-backed user batches replace provenance. Internal wakes
          // are transcript text, never a new user source. Resolve the whole
          // admitted batch together: multiple messages must not inherit old A.
          input.runtimeContext = { ...input.runtimeContext };
          delete input.runtimeContext.userMessageId;
          prepareDirectWorkMemorySource = undefined;
          const admittedMessages = inFlightTransactions.flatMap(transaction => transaction.messages);
          if (admittedMessages.length === 1 && admittedMessages[0]?.cliMessageId) {
            try {
              const id = await input.resolveInjectedUserMessageId?.(admittedMessages);
              if (id === admittedMessages[0].cliMessageId) input.runtimeContext.userMessageId = id;
            } catch {
              // Unverifiable sources fail closed; tools report refused writes.
            }
          }
          if (input.abortSignal?.aborted) throw buildAbortedError();
        } catch (error) {
          // Keep the transaction list for rollback even when a commit throws:
          // splice(0) already removed them, so the outer catch would see an
          // empty list and leak the unsent messages + orphan `requested`.
          const toRollback = inFlightTransactions;
          inFlightTransactions = [];
          try {
            await rollbackInjectionCommits(toRollback);
          } catch (rbErr) {
            throw combineRollbackError(error, rbErr);
          }
          throw error;
        }
      }
      const tryOverflowRescueCompaction = async (): Promise<boolean> => {
        const beforeTokens = estimateLocalRequestInput(requestMessages);
        const compacted = await compaction.prepareRequest((source) => {
          const projected = composeProviderMessages({ prefix: transcript.working().slice(0, prefixCount),
            history: source, contextReferenceResolver:
              input.adapter.host === "cli" ? input.contextReferenceResolver : undefined });
          return requestOverBudget(projectRequest(projected.messages));
        }, false, availableHistoryTokens, true);
        if (!compacted) return false;
        const nextPrepared = prepareMessagesForProviderCall(transcript.working());
        const nextRequestMessages = projectRequest(transcript.working());
        const afterTokens = estimateLocalRequestInput(nextRequestMessages);
        if (afterTokens >= beforeTokens || requestOverBudget(nextRequestMessages)) return false;
        requestMessages = nextRequestMessages;
        contextMetrics = {
          ...nextPrepared.metrics,
          messageCount: requestMessages.length,
          contentChars: requestMessages.reduce(
            (total, message) => total + contentCharCount(message.content),
            0,
          ),
          stableContextChars: builtMessages.stableContextChars,
          dynamicContextChars: builtMessages.dynamicContextChars,
        };
        callStartedAt = Date.now();
        requestTelemetry = buildRequestTelemetry({
          dialogKey: input.continueDialogId || newDialogTelemetryKey,
          messages: requestMessages,
          provenance: {
            schemaVersion: 1, transport: provider.transport ?? "unknown",
            phases: [historyLoadedPhase, summaryProjectedPhase, budgetTrimPhase, contextPhase("final-request", requestMessages)],
            summary: selectedSummary,
          },
          toolsHash: safeToolNamesHash(agentTools),
        });
        resetToolImageDelivery(requestMessages.flatMap(toolImages));
        return true;
      };
      let overflowRescueAttempted = false;
      while (true) {
        llmStreamActivity = 0;
        partialContent = "";
        let providerInvoked = false;
        try {
          result = await runCompleteWithTimeout({
            provider: { complete: (messages, options) => {
              providerInvoked = true;
              // Provider invoked: the request is dispatched and in flight with
              // the model. The transactions belong to the completion boundary now
              // and must not be rolled back to pending if the provider fails.
              inFlightTransactions = [];
              return provider.complete(messages, options);
            } },
            messages: requestMessages,
            options: {
              timeoutMs: resolveLlmRequestTimeoutMs(input),
              // 用户取消信号穿进 provider options：providerStreamRetry 据此在
              // 取消后跳过重试，provider 分支（如 antigravity/openai-compatible）
              // 也可把 fetch 绑定到同一信号，实现真正的传输层取消。
              ...(input.abortSignal ? { signal: input.abortSignal } : {}),
              // 计费归因：续聊轮次带上 dialogId，platform proxy 才能把 token 记录
              // 归到具体对话而不是 chat-proxy 兜底桶。新对话首轮 id 尚未分配。
              ...(input.continueDialogId ? { dialogId: input.continueDialogId } : {}),
              ...(shouldStreamDeltas ? { onTextDelta: (chunk: string) => {
                llmStreamActivity += 1;
                partialContent += chunk;
                observationBoundary.emit({
                  kind: "text-delta",
                  chunk,
                  round,
                  atMs: Date.now(),
                });
              } } : {}),
              ...(shouldStreamReasoning ? { onReasoningDelta: (chunk: string) => {
                llmStreamActivity += 1;
                observationBoundary.emit({
                  kind: "reasoning-delta",
                  chunk,
                  round,
                  atMs: Date.now(),
                });
              } } : {}),
              ...(shouldPassToolEvents ? { onToolEvent: (event: LocalAgentToolEvent) => {
                llmStreamActivity += 1;
                observationBoundary.emit({
                  kind: "tool-event",
                  event,
                  round,
                  atMs: Date.now(),
                });
              } } : {}),
              ...(shouldPassToolEvents ? { toolEventRound: round } : {}),
            },
            timeoutMs: resolveLlmRequestTimeoutMs(input),
            activityVersion: () => llmStreamActivity,
            round,
            input,
            boundary: observationBoundary,
            context: contextMetrics,
            providerName: agentConfig.provider,
            model: provider.model,
          });
        } catch (error) {
          if (!providerInvoked && inFlightTransactions.length > 0) {
            // Provider was never invoked (e.g. pre-dispatch timeout, abort, or
            // provider-init failure): roll back the in-flight transactions so the
            // messages return to pending and are retracted from the transcript.
            const toRollback = inFlightTransactions;
            inFlightTransactions = [];
            try {
              await rollbackInjectionCommits(toRollback);
            } catch (rbErr) {
              error = combineRollbackError(error, rbErr);
            }
          }
          if (providerInvoked) usageLedger.recordProviderCall({
            model: agentConfig.model,
            telemetry: { ...requestTelemetry, round, endTs: Date.now(),
              requestState: input.abortSignal?.aborted ? "cancelled" : "failed" },
          });
          if (
            providerInvoked &&
            !overflowRescueAttempted &&
            llmStreamActivity === 0 &&
            !input.abortSignal?.aborted &&
            isContextOverflowText(toErrorMessage(error))
          ) {
            overflowRescueAttempted = true;
            if (await tryOverflowRescueCompaction()) {
              continue;
            }
          }
          throw error;
        }
        if (
          (result.error || result.runtimeProviderFailure) &&
          !overflowRescueAttempted &&
          llmStreamActivity === 0 &&
          !input.abortSignal?.aborted &&
          isContextOverflowText(result.runtimeProviderFailure?.message ?? result.errorMessage ?? "")
        ) {
          overflowRescueAttempted = true;
          usageLedger.recordProviderCall({
            usage: result.usage,
            model: result.model ?? agentConfig.model,
            provider: result.provider,
            telemetry: { ...finalizeCallTelemetry(requestTelemetry, result, round, callStartedAt), requestState: "failed" },
          });
          if (await tryOverflowRescueCompaction()) {
            continue;
          }
        }
        break;
      }

      acceptToolImages.discard(requestMessages.flatMap(toolImages).filter((image) => toolImageDelivery(image) === "impossible"));
      acceptToolImages.commit(
        requestMessages.flatMap(toolImages).filter((image) => toolImageDelivery(image) === "delivered"),
        requestMessages.flatMap(toolImages).filter((image) => !toolImageDelivery(image)),
      );
      // Strip payload only — never rewrite content, or the prompt prefix diverges
      // at this message and every later cache hit is lost.
      transcript.replaceWorkingHistory(transcript.working().map((message) => {
        const pending = toolImages(message).filter((image) => supportsImages && !toolImageDelivery(image));
        return pending.length ? { ...message, [TOOL_IMAGES]: pending } : stripToolImages(message);
      }));
      const actualInput = normalizeUsage(result.usage as any).input_tokens;
      const estimatedInput = estimateLocalRequestInput(requestMessages,
        admissionProvider.requestBudget?.toolSchemaTokens ?? 0);
      requestCalibrationRatio = updateLocalRequestCalibration(requestCalibrationRatio, actualInput, estimatedInput);
      loopTiming.mark("llmCall", round);
      usageLedger.recordProviderCall({
        usage: result.usage,
        model: result.model,
        provider: result.provider,
        telemetry: { ...finalizeCallTelemetry(requestTelemetry, result, round, callStartedAt), requestState: "completed" },
      });
      // Canonical text blocks can be the only final reply (flat content is empty).
      // Preserve the full generated reply before empty-result handling and settlement.
      if (!result.content && result.output?.some((block) => block.type === "text") &&
          !result.output.some((block) => block.type === "toolCall")) {
        result = {
          ...result,
          content: result.output.filter((block) => block.type === "text").map((block) => block.text).join(""),
        };
      }
      // 熔断保护：检查模型是否陷入重复复读输出/工具调用死循环
      const assistantGuardVerdict = progressGuard.observeAssistantResponse(result);
      if (assistantGuardVerdict.action === "stall") {
        emitLoopEvent(observationBoundary, {
          kind: "loop-stalled",
          round,
          reason: assistantGuardVerdict.reason,
          detail: assistantGuardVerdict.detail,
          consecutiveRounds: assistantGuardVerdict.consecutiveRounds,
          atMs: Date.now(),
        });
        result = {
          ...result,
          content: resolveEmptyAssistantFallbackMessage(assistantGuardVerdict.reason),
          emptyAssistantFallbackReason: assistantGuardVerdict.reason,
        };
        break;
      }
      if (result.error || result.runtimeProviderFailure) {
        result = {
          ...result,
          error: true,
          errorMessage: result.runtimeProviderFailure?.message ?? result.errorMessage,
        };
        break;
      }
      const toolCalls = result.tool_calls ?? [];
      const rawToolCallsCount = (result.tool_calls?.length ?? 0) || (Array.isArray((result as any).raw_tool_calls) ? (result as any).raw_tool_calls.length : 0);
      loopTiming.mark("postLlmProcessing", round);
      if (toolCalls.length === 0 && rawToolCallsCount === 0) {
        // 空轮判定：无可见输出（文本/图片）且绝对无 tool_calls 意图即空轮。
        // reasoning_content 不算可见输出（见 hasAssistantVisibleOutput 注释），
        // reasoning-only 仍按空轮处理，走 repair/fallback。
        const outcome = resolveEmptyAssistantOutcome({
          hasToolCalls: rawToolCallsCount > 0,
          hasVisibleOutput: hasAssistantVisibleOutput(result.content),
          repairUsed: emptyAssistantRepairUsed,
          finishReason: result.finish_reason,
          streamComplete: result.stream_complete,
          hasReasoning: !!result.reasoning_content,
          reasoningRepairCount: reasoningEmptyRepairCount,
        });
        if (outcome.kind === "repair") {
          emptyAssistantRepairPending = true;
          emptyAssistantRepairUsed = true;
          if (!!result.reasoning_content) reasoningEmptyRepairCount += 1;
          continue;
        }
        if (outcome.kind === "ok_with_warning") {
          // 半截输出截断：正文已部分流出，保留原文，不重试也不替换；
          // 打截断标记让上层（子 run 结算/编排者）可观测并按截断语义接力。
          // errorMessage 记录告警文案（内容与正文分离，落盘记录可自解释）。
          //
          // hasVisibleOutput=true：本轮**有完整可见正文**，只是缺 finish_reason
          // 收尾帧（部分上游从不发该帧）。这与 fallback 分支的「真的没拿到输出」
          // 是两回事，但二者共用 reason="stream_truncated"，导致上层只看 reason
          // 时把有正文的正常轮次也结算为 failed（实测：review 子任务完整输出
          // 结论后仍被判 failed/exitCode=1）。这里显式标注正文可用，供结算层区分。
          result = {
            ...result,
            errorMessage: resolveEmptyAssistantFallbackMessage(outcome.reason),
            emptyAssistantFallbackReason: outcome.reason,
            emptyAssistantOutputUsable: true,
            emptyAssistantRepairUsed,
          };
          break;
        }
        if (outcome.kind === "fallback") {
          // 二次仍空：按成因选诊断文案作为最终 content 结束，不抛错
          // （行为与 server loop 对齐——两边共用同一个映射函数）。
          // 截断类成因（length/stream）同时提取 reasoning 尾部打日志，
          // 与 server loop 的 fallback 分支共用同一提取机制。
          const reasoningTailLog = resolveTruncatedReasoningTailLog(outcome.reason, result.reasoning_content);
          if (reasoningTailLog) {
            console.warn(`\n${reasoningTailLog}\n`);
          }
          const fallbackMessage = resolveEmptyAssistantFallbackMessage(outcome.reason);
          result = {
            ...result,
            content: fallbackMessage,
            // 只打标记不抛错：交互侧仍照常显示诊断文案（零行为变化）。
            // 上层（后台 run 编排者）据 emptyAssistantFallbackReason 判断
            // 是否把本轮结算为 failed。见 LocalAgentTurnResult 注释。
            errorMessage: fallbackMessage,
            emptyAssistantFallbackReason: outcome.reason,
            emptyAssistantRepairUsed,
          };
          break;
        }
        // 正常完成路径（无 tool_calls、有可见输出）：结束本回合前再 drain 一次。
        // 若此刻恰好有注入（例如后台 run 刚到终态被 TUI 直投），就不结束——
        // 先把本轮 assistant 回复落进上下文，再追加注入的 user 消息并多跑一轮，
        // 让模型在本回合内当场消化。abort/熔断/错误的 break 路径不做拦截。
        if (input.drainInjections) {
          // completion-boundary 缝隙：此刻 no-tool result 已确定（provider 已
          // resolve）、final drain 尚未执行。生产不传，行为零变化；race 测试
          // 借此在「resolve 之后的同步段」内精确投递迟到 injection（seal 刀）。
          if (input.onBeforeFinalInjectionDrain) {
            await input.onBeforeFinalInjectionDrain();
          }
          const assistantMessage: AgentRuntimeChatMessage = {
            role: "assistant",
            content: result.content,
            ...(result.reasoning_content
              ? { reasoning_content: result.reasoning_content }
              : {}),
          };
          transcript.push(assistantMessage);
          if (await applyPendingInjections()) {
            // 注入续跑也是一个完整回合的结束：补 roundEnd 标记，让 timing 探针
            // 的相位序列保持「每轮都有 roundEnd」的不变式（与工具调用路径一致），
            // 否则续跑轮在 JSONL 里会缺一行、相位配对错位。
            loopTiming.mark("roundEnd", round);
            round += 1;
            continue;
          }
          // 无注入：撤回刚才的预置 assistant 消息（两本账同步撤回），交回统一
          // 的最终追加路径（skipFinalAppend 语义与 thinkContent 附加都在那里处理）。
          transcript.popLast();
        }
        stopReason = "done";
        break;
      }
      // ── Canonical output blocks：provider（如 Cursor）返回有序 block 序列时，
      // 按 block 消费。toolCall block 的 result 已填充 = 流内已执行，不跑 executeTool。
      // 有带 result 的 toolCall 时 skipFinalAppend（文本已由 onTextDelta 推完）。
      const outputBlocks: AgentRuntimeOutputBlock[] = result.output ?? [];
      if (outputBlocks.length > 0) {
        let hasInlineExecutedTools = false;
        for (const block of outputBlocks) {
          if (block.type !== "toolCall") continue;
          toolCallCount += 1;
          const toolName = block.toolCall.function.name;
          if (block.result) {
            hasInlineExecutedTools = true;
            // Provider 已经在流内通过 onToolEvent 发过 tool-call / tool-result
            // （见 cursorProvider.handleExecServerMessage）。这里不再补发，避免
            // CLI/Desktop 收到重复事件、工具卡片错位。loop 事件同理不再补。
            // 仍递增 toolCallCount 以反映本轮工具调用数。
          } else {
            // block 无 result = provider 未流内执行。
            // 当前没有任何 provider 走到这里（Cursor 所有 toolCall 都带 result）。
            // 拒绝继续而不是悄悄跑 executeTool 后丢上下文：未流内执行的 output
            // block 在标准 tool 循环里没有对应 messages，下一轮发给 provider 会
            // 丢历史。让调用方显式报 bug，而不是把工具结果悄悄塞进 block 里
            // 当没发生。
            throw new Error(
              `provider returned output block with unexecuted toolCall "${toolName}" (id=${block.toolCall.id}); ` +
              "no provider currently emits this shape. Either the provider must fill block.result " +
              "(like Cursor's exec channel) or it must not set result.output at all.",
            );
          }
        }
        if (hasInlineExecutedTools) {
          // Provider 流内已执行所有工具并推完文本（如 Cursor 流），
          // 消费完 outputBlocks 后直接 break 退出循环，单轮即终态，无多轮死循环风险。
          for (const blockMsg of blocksToOpenAiMessages(outputBlocks, input.adapter.workspaceRoot)) {
            transcript.pushTool(blockMsg);
          }
          const inlineResults = outputBlocks.flatMap(block => block.type === "toolCall" && block.result ? [block.result] : []);
          // Inline execution is terminal, but completion must not erase a tool
          // failure or an unresolved interaction already reported by the host.
          stopReason = inlineResults.some(isToolExecutionFailure) ? "error" :
            inlineResults.some(({ metadata }) => metadata?.uiAskChoice === true && metadata.resolved !== true) ? "pending" : "done";
          skipFinalAppend = true;
          break;
        }
        round += 1;
        continue;
      }
      toolCallCount += toolCalls.length;
      transcript.push({
        role: "assistant",
        content: result.content || null,
        ...(result.reasoning_content ? { reasoning_content: result.reasoning_content } : {}),
        tool_calls: toolCalls,
      });
      const executedToolResults: Array<{
        toolName: string;
        content?: string | null;
        metadata?: Record<string, unknown>;
      }> = [];
      loopTiming.mark("toolLoopStart", round);

      const slotResults = new Array<{
        toolName: string;
        toolResult: AgentRuntimeToolResult;
        toolExecMs?: number;
      }>(toolCalls.length);

      const runSingleTool = async (
        { index, toolCall }: ToolCallWithIndex,
        executionInput = input,
        isClosed = () => false,
      ) => {
        throwIfAborted(executionInput);
        const { toolResult, toolExecMs } = await executeToolCall({
          input: executionInput,
          toolCall,
          ...(prepareDirectWorkMemorySource ? { getDirectWorkSource } : {}),
          round,
          boundary: observationBoundary,
          loopTiming,
          userInputText,
          runToolNames: (agentConfig as any).runScopedToolSurface?.finalToolNames,
          diagnosticContext: {
            ...(agentConfig.provider ? { provider: String(agentConfig.provider) } : {}),
            ...(agentConfig.model ? { model: String(agentConfig.model) } : {}),
            ...(result.finish_reason ? { finishReason: result.finish_reason } : {}),
          },
        });
        // A non-cooperative adapter may finish after its batch was abandoned.
        // Never mutate the saved transcript/evidence from that detached task.
        if (isClosed()) return;
        slotResults[index] = {
          toolName: toolCall.function.name,
          toolResult,
          toolExecMs,
        };
      };

      const commitSlot = (i: number) => {
        const toolCall = toolCalls[i];
        const slot = slotResults[i];
        if (!slot) return;
        const { toolName, toolResult, toolExecMs } = slot;
        const observedMetadata =
          toolExecMs === undefined
            ? toolResult.metadata
            : { ...(toolResult.metadata ?? {}), [TOOL_DURATION_METADATA_KEY]: toolExecMs };
        // 关键：喂给 progressGuard 的必须是**原始** metadata，不能带 toolExecMs。
        // buildToolResultsSignature 把 metadata 整体 JSON 化做指纹，只有「内容与
        // 元数据完全无变化」才计入无进展 streak（repetition_loop 5 轮 /
        // stagnant_tool_calls 8 轮熔断）。掺进一个每次执行必然抖动的毫秒数，
        // 签名将永不重复 → 两条死循环熔断对所有场景静默失效。
        executedToolResults.push({
          toolName,
          content: toolResult.content,
          metadata: toolResult.metadata,
        });
        loopTiming.mark("toolResultFormat", round);
        transcript.pushTool({
          role: "tool",
          content: formatToolMessageContent({
            toolName,
            content: toolResult.content,
            metadata: observedMetadata,
            workspaceRoot: input.adapter.workspaceRoot,
          }),
          tool_call_id: toolCall.id,
          toolName,
          [TOOL_IMAGES]: acceptToolImages(toolResult.images),
          [TOOL_IMAGE_NOTICES]: createToolImageNotices(),
          ...((observedMetadata || toolResult.images?.length) ? { tool_result_metadata: {
            ...observedMetadata,
            ...(toolResult.images?.length ? { [TOOL_HAD_IMAGES]: true } : {}),
          } } : {}),
        });
      };

      const batches = partitionToolCallsIntoBatches(toolCalls);
      for (const batch of batches) {
        throwIfAborted(input);
        let batchError: unknown;
        try {
          if (batch.isConcurrent && batch.calls.length > 1) {
            const controller = new AbortController();
            const batchInput = {
              ...input,
              abortSignal: input.abortSignal
                ? AbortSignal.any([input.abortSignal, controller.signal])
                : controller.signal,
            };
            let closed = false;
            let failed = false;
            let firstError: unknown;
            // Race the whole transaction, not just adapter execution: even an
            // unresponsive pre-tool hook cannot keep batch shutdown waiting.
            // A failure aborts sibling waiters; handlers observe late rejections.
            const tasks = batch.calls.map((call) => runAbortableToolTask(
              batchInput,
              runSingleTool(call, batchInput, () => closed),
              call.toolCall.function.name,
            ).catch((error) => {
              if (!failed) {
                failed = true;
                firstError = error;
                closed = true;
                controller.abort();
              }
              throw error;
            }));
            await Promise.allSettled(tasks);
            closed = true;
            if (failed) throw firstError;
          } else {
            for (const call of batch.calls) {
              await runSingleTool(call);
            }
          }
        } catch (error) {
          batchError = error;
        } finally {
          // 关键（Sol & Gemini 4 副作用审查一致发现）：
          // 无论并发批次是正常完成还是中途抛错/被 Abort 中断，
          // 立即将该批次中已经就绪的槽位保序推进 transcript，
          // 确保同批次内已完成的工具结果绝不因兄弟任务的中断或失败而丢失。
          for (const call of batch.calls) {
            if (slotResults[call.index]) {
              commitSlot(call.index);
            }
          }
        }
        if (batchError) throw batchError;
      }
      // 本轮实际执行结果按**原始调用下标**排列：写/改计数只认执行成功的调用。
      // 不按 `call.id` 建 Map——同轮重复 id 会让结果互相覆盖，把失败写成成功。
      const collectRoundToolResults = (): Array<AgentRuntimeToolResult | undefined> =>
        toolCalls.map((_call, index) => slotResults[index]?.toolResult);
      trackRoundOffloadSignals(toolCalls, collectRoundToolResults());
      // Same tool-result handoff contract consumed by the server loop.
      const handoff = executedToolResults.map(({ content }) => {
        try { return typeof content === "string" ? JSON.parse(content) : null; }
        catch { return null; }
      }).find(value => value?.handoff && typeof value.content === "string" && value.content.trim());
      if (handoff) {
        result = { ...result, content: handoff.content };
        stopReason = "handoff";
        break;
      }
      // Existing executor metadata is the authority for unresolved choices.
      if (executedToolResults.some(({ metadata }) => metadata?.uiAskChoice === true && metadata.resolved !== true)) {
        stopReason = "pending";
        break;
      }
      // 熔断保护：检查工具调用序列与返回结果是否陷入无进展停滞死循环
      const toolExecutionGuardVerdict = progressGuard.observeToolExecution(
        toolCalls,
        executedToolResults,
      );
      if (toolExecutionGuardVerdict.action === "stall") {
        emitLoopEvent(observationBoundary, {
          kind: "loop-stalled",
          round,
          reason: toolExecutionGuardVerdict.reason,
          detail: toolExecutionGuardVerdict.detail,
          consecutiveRounds: toolExecutionGuardVerdict.consecutiveRounds,
          atMs: Date.now(),
        });
        result = {
          ...result,
          content: resolveEmptyAssistantFallbackMessage(toolExecutionGuardVerdict.reason),
          emptyAssistantFallbackReason: toolExecutionGuardVerdict.reason,
        };
        break;
      }
      // 子任务软预算收敛提醒：仅在子任务/显式启用模式下于里程碑阈值（默认 40 / 80 次工具调用）
      // 通过 append-only transcript 追加一次性提醒；不强杀、不改写前序历史消息（保护 KV Prefix Cache）。
      if (!input.abortSignal?.aborted) {
        const softBudgetAdvisory = softBudgetAdvisor.observeToolCalls(toolCallCount);
        if (softBudgetAdvisory) {
          transcript.push({
            role: "user",
            content: softBudgetAdvisory.message,
          });
        }
      }
      // 轮内压缩主防线：工具结果灌水之后、下一轮 provider 调用之前。
      // contextUsage 在手时按真实遥测判定；缺失时每轮走估算兜底——
      // 「不报 usage 的上游」与「新对话首轮（无 dialogId）」都不再有零保护窗口。
      // The next request is admitted after all next-round injections.
      loopTiming.mark("roundEnd", round);
      round += 1;
    }
  } catch (error) {
    // The turn aborted/failed before the request boundary or before the provider
    // was invoked: roll back any deferred injection commits so the unsent
    // messages stay `pending` in the queue (re-sendable) and out of the
    // persisted history.
    const toRollback = [...pendingInjectionCommits.splice(0), ...inFlightTransactions];
    inFlightTransactions = [];
    let rollbackErr: unknown;
    try {
      await rollbackInjectionCommits(toRollback);
    } catch (rbErr) {
      rollbackErr = rbErr;
    }
    loopError = rollbackErr ? combineRollbackError(error, rollbackErr) : error;
  }

  if (!loopError && input.abortSignal?.aborted) loopError = buildAbortedError();

  // 即使 provider 循环失败（超时/额度/凭证等），也保存 dialog 以便续聊与复盘
  if (loopError) {
    // Initial admission historically leaves pending input with the caller rather
    // than appending an unsent user turn. Later-round failures must still save
    // completed provider/tool work. Preserve both contracts after moving admission.
    if (loopError instanceof LocalContextCoverageError && round === 0 && !consumedInjectedMessages) {
      if (input.continueDialogId) attachDialogIdToError(loopError, input.continueDialogId);
      attachUsageRecordsToError(loopError, usageLedger.records());
      await loopTiming.flush();
      throw loopError;
    }
    const turnMessages = transcript.persisted(
      sanitizedPersistedInput,
      input.persistedInputReference,
    );
    // 本轮全部计费证据（带外的压缩摘要调用排在前面，与成功路径同一出口）。
    // saveTurn 与「挂到错误上带给调用方」用的必须是同一批记录，否则状态行的
    // 会话累计和落盘账目会对不上。
    const failedTurnUsageRecords = usageLedger.records();
    const dialogId = await persistFailedLocalTurn({
      adapter: input.adapter,
      agentKey: agentConfig.key,
      messages: turnMessages,
      error: loopError,
      model: agentConfig.model,
      toolCallCount,
      partialContent,
      usage: usageLedger.lastContextUsage(),
      accountingUsage: usageLedger.accounting(),
      usageRecords: failedTurnUsageRecords,
      billingConfig,
      input,
    });
    attachDialogIdToError(loopError, dialogId);
    // 中断/失败的 turn 同样扣了费：把逐次调用证据带出去，调用方才能把这一轮
    // 计进会话累计。
    attachUsageRecordsToError(loopError, failedTurnUsageRecords);
    // 失败路径同样落盘计时数据，避免中断时丢失已收集的相位。
    await loopTiming.flush();
    throw loopError;
  }

  result = result!;
  result = { ...result, stopReason:
    input.abortSignal?.aborted ? "aborted" :
    result.error || result.runtimeProviderFailure || result.emptyAssistantFallbackReason ? "error" :
    stopReason,
  };
  if (!skipFinalAppend) {
    // 截断类兜底/告警（length/stream）时提取 reasoning 尾部（带 marker），
    // 以 thinkContent 附加到最终 assistant 消息：web 思考折叠可读的落盘通道，
    // 与 server loop 的 fallback 分支机制对齐。正常轮无标记 → 无附加，零变化。
    const truncatedReasoningTailLog = resolveTruncatedReasoningTailLog(
      result.emptyAssistantFallbackReason,
      result.reasoning_content,
    );
    transcript.push({
      role: "assistant",
      content: result.content,
      // 与中间轮(:561)一致带上 reasoning_content,让 saveTurn 持久化思维链,
      // 空轮/异常排查时能回看模型实际想了什么。
      ...(result.reasoning_content
        ? { reasoning_content: result.reasoning_content }
        : {}),
      ...(truncatedReasoningTailLog ? { thinkContent: truncatedReasoningTailLog } : {}),
    });
  }
  const turnMessages = transcript.persisted(
    sanitizedPersistedInput,
    input.persistedInputReference,
  );
  // 全部计费证据（压缩记录排首位，压缩记录仅在用量非空时入账）。
  const usageRecords = usageLedger.records(result.model);
  const accountingUsage = usageLedger.accounting();
  loopTiming.mark("saveTurnStart", round);
  const saved = await input.adapter.saveTurn({
    agentKey: agentConfig.key,
    messages: turnMessages,
    result: {
      ...result,
      ...(toolCallCount > 0 ? { toolCallCount } : {}),
      ...((agentConfig as any).toolSurface ? { runtimeToolSurface: (agentConfig as any).toolSurface } : {}),
    },
    ...(usageRecords.length > 0 ? { usageRecords } : {}),
    ...(accountingUsage ? { accountingUsage } : {}),
    billingConfig,
    ...(input.runtimeContext ? { runtimeContext: input.runtimeContext } : {}),
    ...(input.continueDialogId ? { continueDialogId: input.continueDialogId } : {}),
    ...(input.spaceId ? { spaceId: input.spaceId } : {}),
    ...(input.category ? { category: input.category } : {}),
    ...(input.inheritedFromDialogKey ? { inheritedFromDialogKey: input.inheritedFromDialogKey } : {}),
    ...(input.parentDialogId ? { parentDialogId: input.parentDialogId } : {}),
    ...(typeof input.freshDialog === "boolean" ? { freshDialog: input.freshDialog } : {}),
  });
  loopTiming.mark("saveTurn", round);
  await loopTiming.flush();

  return {
    ...result,
    ...(usageRecords.length > 0 ? { usageRecords } : {}),
    ...(accountingUsage ? { accountingUsage } : {}),
    ...(toolCallCount > 0 ? { toolCallCount } : {}),
    ...((agentConfig as any).toolSurface ? { runtimeToolSurface: (agentConfig as any).toolSurface } : {}),
    // 透出最后一轮 provider 调用的 finish_reason；多轮工具循环里只有最后一轮收尾状态有意义。
    ...(result.finish_reason ? { finish_reason: result.finish_reason } : {}),
    dialogId: saved.dialogId,
    title: saved.title,
    ...(saved.titlePatchPromise ? { titlePatchPromise: saved.titlePatchPromise } : {}),
    ...(dialogHistorySource ? { dialogHistorySource } : {}),
    turnMessages,
  };
  } finally {
    observationBoundary.close();
  }
}
