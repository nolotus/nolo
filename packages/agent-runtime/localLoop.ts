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
import { toErrorMessage } from "core/errorMessage";
import { runAbortableWithTimeout } from "./abortableKernel";
import { applyToolSurfaceConstraints } from "./runtimeToolSurface";
import type { ManagedRuntime } from "effect";
import {
  createLocalLoopObservationBoundary,
  DEFAULT_OBSERVATION_QUEUE_CAPACITY,
  type LocalLoopObservationBoundary,
  type LocalLoopObservationEvent,
  type LocalLoopObservationBoundaryOptions,
} from "./observationStream";
import { createLoopTiming } from "./loopTiming";
import {
  TOOL_DURATION_METADATA_KEY,
  blocksToOpenAiMessages,
  buildMessages,
  contentCharCount,
  filterImagePartsFromMessages,
  formatToolMessageContent,
  prepareMessagesForProviderCall,
  trimHistoryToContextBudget,
} from "./providerMessageProjection";
import type { LocalAgentToolEvent } from "./localLoopContract";

import type {
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
} from "./types";
import {
  buildAbortedError,
  emitLoopEvent,
  executeToolCall,
  throwIfAborted,
} from "./toolCallTransaction";
export { LOCAL_TURN_ABORTED_CODE } from "./toolCallTransaction";
import {
  countUnparsableToolArgKinds,
  describeUnparsableToolArgs,
} from "./toolArgsTruncationPolicy";
import { createTurnTranscript } from "./turnTranscript";
import { createTurnUsageLedger } from "./turnUsageLedger";
export { addOutOfBandUsage } from "./turnUsageLedger";
import { buildIdentityBlock } from "./identityBlock";
import { DELETE_SAFETY_RED_LINE } from "./deleteSafety";
import { LEAF_FINAL_HANDOFF_INSTRUCTIONS } from "./leafFinalHandoff";
import { buildUserResponseLanguageContext } from "./userResponseLanguage";
import { resolveAgentImageInputSupport } from "../ai/llm/agentCapabilities";
import { hasImageInRuntimeMessages } from "../ai/agent/imagePreprocessing";
import { buildRuntimeGuidanceBlocks } from "./runtimeGuidance";
import { resolveToolGuidedSections, TOOL_GUIDED_SECTION_ORDER } from "../ai/agent/toolGuidedSections";
import { detectDispatchIntent, detectDispatchIntentFromMessages } from "../ai/agent/dispatchIntent";
import { canonicalizeToolNames } from "./toolNameAliases";
import type {
  AgentExecutionContextMetrics,
  AgentExecutionObservationEvent,
} from "./executionObservation";
import type { ContextBlockScope } from "./contextBlockScope";
import { normalizeContextBlockScopes } from "./contextBlockScope";
import { resolveAgentContextWindow } from "./devin/devinChannelWindows";
import { createTurnCompactionController } from "./localAutoCompaction";
import { isolateInboundContent } from "./inboundCredentialVault";
import { scrubSecrets } from "./secretScrubber";
import { buildRequestTelemetry, shortHash, type ProviderCallTelemetry } from "./providerCallTelemetry";
import {
  resolveCompressionTriggerRatio,
  truncateToolOutputForContext,
} from "../ai/context/toolOutputCap";

// ─────────────────────────────────────────────────────────────────────────────
// NOLO_LOOP_TIMING instrumentation lives in ./loopTiming (per-turn instance,
// created inside runLocalAgentTurn — no module-level state, no cross-turn
// pollution when turns run concurrently).
// ─────────────────────────────────────────────────────────────────────────────

export type LocalAgentTurnInput = {
  adapter: AgentRuntimeHostAdapter;
  agentRef: string;
  /** Platform/user language, not an agent capability. */
  userLanguage?: string | null;
  input: AgentRuntimeMessageContent;
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
  runtimeContext?: Record<string, any> | null;
  /** Dispatched leaf runs receive parent-facing final-response guidance. */
  runKind?: "interactive" | "subtask";
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
   * 自动上下文压缩的摘要 fallback（形状 = CLI /compact 的 SummaryLlmCaller）。
   *
   * 常规由 host adapter 会话级注入（CLI：localRuntimeAdapter 的
   * setCliAutoCompactionSummaryFallback ← index.ts 启动 TUI 时用
   * createTuiSummaryLlmCaller 建好）；这里也允许直接透传，供测试与显式调用方
   * 覆盖。未注入 / desktop 无平台通道 → undefined → 自动压缩保持既有
   * fail-open 行为（不 fallback）。
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
  drainInjections?: () => string[];
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

function resolveLlmRequestTimeoutMs(input: LocalAgentTurnInput): number {
  const raw = input.llmRequestTimeoutMs ?? input.timeoutMs;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_LLM_REQUEST_TIMEOUT_MS;
}
function resolveCompactionTimeoutMs(input: LocalAgentTurnInput): number {
  const raw = input.compactionTimeoutMs;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_COMPACTION_TIMEOUT_MS;
}

/**
 * Host adapter 侧会话级注入的自动压缩摘要 fallback。
 *
 * CLI 本地 adapter（localRuntimeAdapter.createCliLocalRuntimeAdapter）会带上
 * `compactionSummaryFallback` 这个非接口成员字段（由 CLI 入口启动时注入已登录的
 * 平台摘要 caller）；desktop / headless 不带 → undefined，即不 fallback。
 * 刻意不在 AgentRuntimeHostAdapter 接口上扩字段：它是跨 host 契约，CLI 专有接线
 * 不该让所有 host 都背上新成员。
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
    });
    return saved?.dialogId;
  } catch {
    return args.input.continueDialogId;
  }
}
export async function runLocalAgentTurn(
  input: LocalAgentTurnInput
): Promise<LocalAgentTurnResult> {
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
  try {
    history = input.continueDialogId
      ? await input.adapter.loadDialogHistory(input.continueDialogId)
      : [];
  } catch (error) {
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
  });
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
      ...(input.runKind === "subtask" ? [LEAF_FINAL_HANDOFF_INSTRUCTIONS] : []),
    ]
      .map((content) => content.trim())
      .filter((content): content is string => content.length > 0)
      .map((content) => ({ content, cacheScope: "session" as const }));
  // Built-in scopes (identity/guidance) always come first; the caller's
  // normalized scopes follow. normalizeContextBlockScopes reconciles
  // input.contextBlockScopes (authoritative) with input.contextBlocks
  // (legacy plain strings → turn-scope) so a caller that only supplies
  // contextBlocks still gets its blocks included exactly once.
  const callerScopes = normalizeContextBlockScopes(
    input.contextBlocks,
    input.contextBlockScopes,
  );
  const mergedContextBlockScopes: ContextBlockScope[] = [
    // 删除安全红线：系统层最高优先级约束，位于所有块之前（含身份信息块），
    // owner 要求常驻「根本提示词」的最顶部（2026-09-26 批量误删事故）。
    { content: DELETE_SAFETY_RED_LINE, cacheScope: "session" as const },
    { content: identityBlock, cacheScope: "session" as const },
    ...guidanceScopes,
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

  // 获取该 dialog 上一次 provider 调用的真实 input tokens（方案 a）：
  // 轮开始兜底判定的真实遥测读取（loadLastContextUsage）已迁入 controller。
  const contextWindow = resolveAgentContextWindow(agentConfig);
  // 压缩触发线：随窗口留足「单轮工具灌水」余量（见 toolOutputCap.ts）。
  // 轮开始与轮内 round 之间共用同一条线。
  const compressionTriggerRatio = resolveCompressionTriggerRatio(contextWindow);

  // 自动上下文压缩（turn 级 controller，initial / in-loop 两入口，实现见
  // localAutoCompaction.ts）：先于预算兜底。摘要持久化，压缩点之间前缀稳定
  // 以保住缓存。失败只记日志（fail-open），绝不阻断本轮对话。
  // 摘要那次 LLM 调用是一次独立的计费调用，用量必须并入本轮 usage，
  // 否则只出现在 provider 账单上、我们自己的 token 记账看不到。
  const compaction = createTurnCompactionController({
    adapter: input.adapter,
    continueDialogId: input.continueDialogId,
    model: agentConfig.model,
    resolveProvider: resolveProviderOnce,
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
    getCanonicalCompactionHistory: () => [
      ...canonicalHistory,
      ...transcript.persisted(
        sanitizedPersistedInput,
        input.persistedInputReference,
      ),
    ],
    getWorkingPrefix: () => transcript.working().slice(0, prefixCount),
    replaceWorkingView: (next) => transcript.replaceWorkingHistory(next),
    contextReferenceResolver:
      input.adapter.host === "cli" ? input.contextReferenceResolver : undefined,
    onUsage: (usage) => usageLedger.addCompaction(usage),
  });
  const initialCompaction = await compaction.runInitial(history);
  history = initialCompaction.history;
  // 首轮摘要用量先入暂存，账本（usageLedger）在 buildMessages 之后创建再入账。
  const initialCompactionUsage = initialCompaction.usage;
  loopTiming.mark("maybeAutoCompactLocalHistory", 0);

  // 上下文预算兜底：必须在消息组装之前裁，否则投影与原始消息错位。
  const trimmedHistory = trimHistoryToContextBudget(history, agentConfig.model, contextWindow);
  if (trimmedHistory.droppedCount > 0) {
    history = trimmedHistory.history;
  }
  loopTiming.mark("trimHistoryToContextBudget", 0);

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
    // 告警只改归因措辞：类别来自同一批历史里不可解析 arguments 的纯统计
    // （口径与降级判定同源）；计数仍用 poisonDowngraded（含被降级的 tool 结果），
    // 降级动作与持久化历史一律不动。
    console.warn(
      `[nolo] downgraded ${builtMessages.poisonDowngraded} tool_call(s) with unparsable JSON arguments from outbound history (${describeUnparsableToolArgs(countUnparsableToolArgKinds(history))}); persisted history untouched`,
    );
  }
  // vision 能力检测：catalog 已知模型按 hasVision 判定，未知模型默认 true。
  // 不支持图片时，buildMessages 产出的 image_url parts 必须在发给 provider 前剥离，
  // 否则上游 400 "this model does not support image input" → local 判失败 → fallback
  // 到没有 local code 工具的 server → agent 报 blocker。hasVision 字段类型不一定在
  // AgentRuntimeAgentConfig 上声明，用 as any 兜底。
  const supportsImages = resolveAgentImageInputSupport({
    apiSource: agentConfig.apiSource,
    provider: agentConfig.provider,
    model: agentConfig.model,
    hasVision: (agentConfig as any).hasVision,
  });

  // 纯文本模型 + 有图：无 vision 能力时剥离 image_url 为占位符，避免上游 400。
  if (!supportsImages && hasImageInRuntimeMessages(messages)) {
    messages = filterImagePartsFromMessages(messages, false);
    emitLoopEvent(observationBoundary, {
      kind: "image-downgraded",
      reason: "no-vision",
      atMs: Date.now(),
    });
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
  const transcript = createTurnTranscript({
    initialWorking: messages,
    prefixCount,
    historyCount: history.length,
    capToolMessage,
  });

  const userInputText = extractUserInputText(input.input);
  let toolCallCount = 0;
  // 兜底标记（emptyAssistantFallbackReason / emptyAssistantOutputUsable）已
  // 收敛到 AgentRuntimeResult 本体，这里不再需要本地类型放宽。
  let result: AgentRuntimeResult;
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
  if (initialCompactionUsage) usageLedger.addCompaction(initialCompactionUsage);
  let loopError: unknown;
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

  try {
    // resolveProvider used to sit outside the try: credential / provider-init
    // failures then skipped saveTurn, so TUI lost dialogId and the next
    // message opened a fresh conversation ("amnesia").
    // Auto-compaction may have already resolved the provider; reuse it.
    const provider = await resolveProviderOnce();
    // 回合内注入：取走收件箱条目并作为 user 消息追加到当前上下文。
    // 返回是否真的注入了内容（供正常完成路径决定是否继续跑一轮）。
    const applyPendingInjections = (): boolean => {
      if (!input.drainInjections) return false;
      let pending: string[] = [];
      try {
        pending = input.drainInjections() ?? [];
      } catch (error) {
        console.warn("[localLoop] drainInjections failed:", error);
        return false;
      }
      let injected = false;
      for (const text of pending) {
        if (typeof text !== "string" || !text.trim()) continue;
        const safeText = scrubSecrets(text).cleaned;
        transcript.push({ role: "user", content: safeText });
        injected = true;
      }
      return injected;
    };
    const newDialogTelemetryKey = `new:${crypto.randomUUID()}`;
    while (true) {
      partialContent = "";
      throwIfAborted(input);
      loopTiming.mark("roundStart", round);
      // 注入放在 roundStart 标记之后：roundStart 记的是「上一相位结束到本轮开始」
      // 的边界耗时，注入的开销应计入随后的 prepareMessagesForProviderCall 相位，
      // 不污染边界读数。注入仍在构造请求消息之前，本轮 provider 调用即可见。
      applyPendingInjections();
      // 空轮修复：把 repair user message 追加到本轮请求末尾重试一次（系统消息放在末尾会被大部分 Provider API 拒收或返回空消息）。
      const preparedMessages = prepareMessagesForProviderCall(transcript.working());
      const baseRequestMessages = filterImagePartsFromMessages(
        preparedMessages.messages,
        supportsImages,
      );
      const requestMessages: AgentRuntimeChatMessage[] = emptyAssistantRepairPending
        ? [...baseRequestMessages, { role: "user", content: EMPTY_ASSISTANT_REPAIR_PROMPT }]
        : baseRequestMessages;
      const contextMetrics: LocalAgentContextMetrics = {
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
      const callStartedAt = Date.now();
      const requestTelemetry = buildRequestTelemetry({
        // 无 dialogId 的新对话用本 turn 唯一键，避免不同新对话共用一个槽误报漂移。
        dialogKey: input.continueDialogId || newDialogTelemetryKey,
        messages: requestMessages,
        toolsHash: safeToolNamesHash(agentTools),
      });
      result = await runCompleteWithTimeout({
        provider,
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
      loopTiming.mark("llmCall", round);
      usageLedger.recordProviderCall({
        usage: result.usage,
        model: result.model,
        provider: result.provider,
        telemetry: finalizeCallTelemetry(requestTelemetry, result, round, callStartedAt),
      });
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
      if (result.runtimeProviderFailure) {
        result = {
          ...result,
          error: true,
          errorMessage: result.runtimeProviderFailure.message,
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
          if (applyPendingInjections()) {
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
          for (const blockMsg of blocksToOpenAiMessages(outputBlocks)) {
            transcript.pushTool(blockMsg);
          }
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
      for (const toolCall of toolCalls) {
        const toolName = toolCall.function.name;
        // 单工具事务（参数补全/毒丸诊断、写文件会话门、abort 级联、
        // tool-start/tool-end 事件与 legacy 桥接、错误转工具结果）整体在
        // toolCallTransaction.ts；循环侧只保留两本账推入、executedToolResults
        // 累计与 progressGuard 熔断决策。
        const { toolResult, toolExecMs } = await executeToolCall({
          input,
          toolCall,
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
        // 观测字段合并到 metadata：随 tool_result_metadata 一并持久化，供后续
        // 从历史反推工具耗时分布。formatToolMessageContent 会把它剔除，
        // 模型可见内容逐字节不变（见该函数注释）。
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
          }),
          tool_call_id: toolCall.id,
          toolName,
          ...(observedMetadata ? { tool_result_metadata: observedMetadata } : {}),
        });
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
      // 轮内压缩主防线：工具结果灌水之后、下一轮 provider 调用之前。
      // contextUsage 在手时按真实遥测判定；缺失时每轮走估算兜底——
      // 「不报 usage 的上游」与「新对话首轮（无 dialogId）」都不再有零保护窗口。
      await compaction.maybeCompactInLoop();
      loopTiming.mark("roundEnd", round);
      round += 1;
    }
  } catch (error) {
    loopError = error;
  }

  // 即使 provider 循环失败（超时/额度/凭证等），也保存 dialog 以便续聊与复盘
  if (loopError) {
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
    turnMessages,
  };
  } finally {
    observationBoundary.close();
  }
}
