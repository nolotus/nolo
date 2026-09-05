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
import { clipCompactText } from "core/clipCompactText";
import { toErrorMessage } from "core/errorMessage";
import { runAbortableWithTimeout } from "./abortableKernel";
import type { ManagedRuntime } from "effect";
import {
  createLocalLoopObservationBoundary,
  type LocalLoopObservationBoundary,
  type LocalLoopObservationEvent,
} from "./observationStream";

import type {
  AgentRuntimeHostAdapter,
  AgentRuntimeProvider,
  AgentRuntimeToolResult,
  AgentRuntimeSaveTurnInput,
} from "./hostAdapter";
import type { ActionGate } from "./actionGate";
import { readActionGate, readCommandActionGatePayload } from "./actionGate";
import { evaluateFileWritePolicy } from "./fileWritePolicy";
import type {
  AgentRuntimeChatMessage,
  AgentRuntimeMessageContent,
  AgentRuntimeOutputBlock,
  AgentRuntimeResult,
  AgentRuntimeToolCall,
} from "./types";

import { sanitizeToolCallPairing } from "./toolCallPairing";
import { downgradeUnparsableToolCalls, hasParsableObjectArguments } from "./outboundHistorySanitize";
import { summarizeToolArguments } from "./summarizeToolArguments";
import { buildIdentityBlock } from "./identityBlock";
import { LEAF_FINAL_HANDOFF_INSTRUCTIONS } from "./leafFinalHandoff";
import { buildUserResponseLanguageContext } from "./userResponseLanguage";
import { resolveAgentImageInputSupport } from "../ai/llm/agentCapabilities";
import { hasImageInRuntimeMessages, stripImagePartsFromMessages } from "../ai/agent/imagePreprocessing";
import { buildRuntimeGuidanceBlocks } from "./runtimeGuidance";
import { resolveToolGuidedSections, TOOL_GUIDED_SECTION_ORDER } from "../ai/agent/toolGuidedSections";
import { canonicalizeToolNames } from "./toolNameAliases";
import {
  estimateContextTokens,
  hashStablePrefixContent,
} from "../ai/agent/contextCompiler";
import type {
  AgentExecutionContextMetrics,
  AgentExecutionObservationEvent,
} from "./executionObservation";
import type { ContextBlockScope } from "./contextBlockScope";
import { normalizeContextBlockScopes } from "./contextBlockScope";
import {
  clipToolText,
  resolveToolOutputProfile,
} from "../ai/agent/toolOutputPolicy";
import {
  readCacheCreationInputTokens,
  readCacheReadInputTokens,
} from "../ai/token/cacheTokenFields";
import { spillToolOutput } from "./toolSpillStore";
import { planContextUsage } from "../ai/context/retention";
import { estimateTokenCount } from "../ai/context/tokenUtils";
import { getModelContextWindow } from "../ai/llm/getModelContextWindow";
import { maybeAutoCompactLocalHistory } from "./localAutoCompaction";

// ─────────────────────────────────────────────────────────────────────────────
// NOLO_LOOP_TIMING instrumentation — measurement-only, zero behavior change.
// Gated by env var; when off, each call site costs a single boolean check.
// Emits one JSONL row per phase: { phase, round, durationMs } to stderr or to
// the file given by NOLO_LOOP_TIMING_FILE. Never touches persisted data.
// ─────────────────────────────────────────────────────────────────────────────
const LOOP_TIMING_ENABLED =
  typeof process !== "undefined" && process.env?.NOLO_LOOP_TIMING === "1";
const LOOP_TIMING_FILE =
  typeof process !== "undefined" ? process.env?.NOLO_LOOP_TIMING_FILE : undefined;
let loopTimingRows: Array<{ phase: string; round: number; durationMs: number }> = [];
let loopTimingLastMark: number | undefined;

function loopTimingMark(phase: string, round: number): void {
  if (!LOOP_TIMING_ENABLED) return;
  const now = performance.now();
  if (loopTimingLastMark !== undefined) {
    loopTimingRows.push({ phase, round, durationMs: now - loopTimingLastMark });
  }
  loopTimingLastMark = now;
}

async function loopTimingFlush(): Promise<void> {
  if (!LOOP_TIMING_ENABLED) return;
  const lines = loopTimingRows.map((row) => JSON.stringify(row)).join("\n");
  loopTimingRows = [];
  loopTimingLastMark = undefined;
  if (!lines) return;
  if (LOOP_TIMING_FILE) {
    try {
      const { appendFileSync } = await import("node:fs");
      appendFileSync(LOOP_TIMING_FILE, lines + "\n");
    } catch {
      // measurement must never break the loop
    }
  } else {
    process.stderr.write(lines + "\n");
  }
}

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
   * 单次 provider.complete 的可选硬超时。
   * 未设置时：若本回合传了 timeoutMs 则继承之；否则不限时（coding loop 常跑很久，禁止默认 120s 杀请求）。
   */
  llmRequestTimeoutMs?: number;
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

export type LocalAgentToolEvent = {
  type: "tool-call" | "tool-result" | "tool-error";
  round: number;
  toolCallId: string;
  toolName: string;
  argumentsPreview?: string;
  elapsedMs?: number;
  summary?: string;
  /** Full tool result text for UI expand (model path still uses turn messages). */
  content?: string;
  message?: string;
  metadata?: Record<string, unknown>;
};

export type LocalAgentContextMetrics = AgentExecutionContextMetrics;

/**
 * Compat alias over the canonical shared vocabulary (see executionObservation.ts).
 * Kept as a type alias so existing consumers of `LocalAgentLoopEvent` / the
 * `onLoopEvent` seam keep compiling while the two loops speak one vocabulary.
 */
export type LocalAgentLoopEvent = AgentExecutionObservationEvent;

export type { LocalLoopObservationBoundary, LocalLoopObservationEvent };
export { createLocalLoopObservationBoundary };

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

function formatToolExecutionError(args: {
  toolName: string;
  error: unknown;
}) {
  const message = toErrorMessage(args.error);
  return `${args.toolName} failed: ${message}`;
}

function formatStructuredToolExecutionError(args: {
  toolName: string;
  error: unknown;
}) {
  if (!args.error || typeof args.error !== "object") return null;
  const error = args.error as {
    code?: unknown;
    message?: unknown;
    policy?: unknown;
    permissionRequest?: unknown;
  };
  if (typeof error.code !== "string") return null;
  return JSON.stringify({
    error: error.code,
    message:
      typeof error.message === "string"
        ? error.message
        : formatToolExecutionError(args),
    ...(error.policy && typeof error.policy === "object"
      ? { policy: error.policy }
      : {}),
    ...(error.permissionRequest && typeof error.permissionRequest === "object"
      ? { permissionRequest: error.permissionRequest }
      : {}),
  });
}

function shouldReturnToolExecutionErrors(adapter: AgentRuntimeHostAdapter) {
  return adapter.capabilities.includes("local-tools");
}

/**
 * Canonical observation event 唯一出口（收敛经由 observationBoundary 发射）。
 *
 * - 发送给 Queue/Stream（当 Stream 被监听时）形成单一真相源。
 * - 自动单向投影给 legacy 回调（onLoopEvent / onToolEvent 等，fail-open）。
 * - 纯净分离：bridge 不再混入 canonical event 对象，杜绝 onLoopEvent payload 污染。
 */
function emitLoopEvent(
  boundary: LocalLoopObservationBoundary,
  event: LocalAgentLoopEvent,
  bridge?: LocalAgentToolEvent,
) {
  boundary.emit(bridge ? { event, bridge } : { event });
}

const LLM_REQUEST_TIMEOUT = "LLM_REQUEST_TIMEOUT";

export const LOCAL_TURN_ABORTED_CODE = "LOCAL_TURN_ABORTED";

function buildAbortedError(): Error & { code?: string } {
  const error = new Error("local agent turn aborted by user") as Error & {
    code?: string;
  };
  error.code = LOCAL_TURN_ABORTED_CODE;
  return error;
}

function throwIfAborted(input: LocalAgentTurnInput) {
  if (input.abortSignal?.aborted) throw buildAbortedError();
}

async function runAbortableToolTask<T>(
  input: LocalAgentTurnInput,
  task: Promise<T>,
  pendingToolName?: string,
): Promise<T> {
  if (!input.abortSignal) return task;
  const outcome = await runAbortableWithTimeout({
    task,
    abortSignal: input.abortSignal,
    runtime: input.effectRuntime,
  });
  if (outcome.kind === "done") return outcome.value;
  if (outcome.kind === "failed") throw outcome.error;
  if (outcome.kind === "aborted") {
    const error = buildAbortedError() as Error & { pendingToolName?: string };
    if (pendingToolName) error.pendingToolName = pendingToolName;
    throw error;
  }
  // timeout outcome is impossible without timeoutMs
  throw buildAbortedError();
}

function resolveLlmRequestTimeoutMs(input: LocalAgentTurnInput): number | undefined {
  const raw = input.llmRequestTimeoutMs ?? input.timeoutMs;
  if (typeof raw !== "number" || !Number.isFinite(raw) || raw <= 0) return undefined;
  return raw;
}

async function runCompleteWithTimeout(args: {
  provider: { complete(messages: AgentRuntimeChatMessage[], options?: any): Promise<AgentRuntimeResult> };
  messages: AgentRuntimeChatMessage[];
  options: Record<string, unknown>;
  /** 未设置 = 不硬超时，等 provider 自然结束。 */
  timeoutMs?: number;
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
          `LLM request timed out after ${timeoutMs}ms (round ${round})`,
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

function clip(value: string, max = 240) {
  return clipCompactText(value, max);
}

/**
 * 提取安全观测 metadata：只保留结构化标量（exitCode / command / path / lineCount 等），
 * 并且对字符串字段做最大长度裁剪（<= 240 字符），绝不透传未经裁剪的原始 tool payload / 敏感 token / 内部对象。
 */
function projectSafeToolObservationMetadata(
  metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== "object") return undefined;
  const safe: Record<string, unknown> = {};
  if (typeof metadata.exitCode === "number") safe.exitCode = metadata.exitCode;
  if (typeof metadata.actionGate === "string") safe.actionGate = clip(metadata.actionGate, 240);
  if (typeof metadata.command === "string") safe.command = clip(metadata.command, 240);
  if (typeof metadata.path === "string") safe.path = clip(metadata.path, 240);
  if (typeof metadata.truncated === "boolean") safe.truncated = metadata.truncated;
  if (typeof metadata.byteCount === "number") safe.byteCount = metadata.byteCount;
  if (typeof metadata.lineCount === "number") safe.lineCount = metadata.lineCount;
  return Object.keys(safe).length > 0 ? safe : undefined;
}

function summarizeToolResult(content: unknown, metadata?: Record<string, unknown>) {
  const parts: string[] = [];
  const exitCode = metadata?.exitCode;
  if (typeof exitCode === "number") parts.push(`exit=${exitCode}`);
  if (typeof content === "string") {
    const trimmed = content.trim();
    if (trimmed) {
      const lines = trimmed.split(/\r?\n/).length;
      parts.push(`${lines} line${lines === 1 ? "" : "s"}`);
      parts.push(`${trimmed.length} chars`);
      const tail = clip(trimmed.slice(-160), 160);
      if (tail) parts.push(`tail="${tail}"`);
    } else {
      parts.push("empty");
    }
  }
  return parts.join(" ");
}

/**
 * 纯观测字段：只随 tool_result_metadata 持久化，不进入模型可见内容。
 *
 * 新增这类字段时有**三处**必须同时确认，漏一处就会出事：
 *  1. 加进下面的 OBSERVATION_ONLY_METADATA_KEYS —— 否则 formatToolMessageContent
 *     会把它拼进 globFiles/codeSearch/readFile 三个工具发给模型的 prompt 字节。
 *  2. 确认它不在 compactToolMetadata 的 TOOL_METADATA_KEYS 允许清单里 ——
 *     那条路（in-turn 投影与跨轮历史摘要共用）是白名单制，另一道独立闸门。
 *  3. **不要**把它混进推给 progressGuard 的 executedToolResults ——
 *     buildToolResultsSignature 对 metadata 整体做指纹，掺进任何逐次抖动的值
 *     都会让 repetition_loop / stagnant_tool_calls 两条死循环熔断静默失效。
 *     这一条被真实踩中过（见 executedToolResults.push 处的注释）。
 */
export const TOOL_DURATION_METADATA_KEY = "toolExecMs";
const OBSERVATION_ONLY_METADATA_KEYS = new Set<string>([
  TOOL_DURATION_METADATA_KEY,
]);

function formatToolMessageContent(args: {
  toolName: string;
  content: string;
  metadata?: Record<string, unknown>;
}) {
  if (
    (
      args.toolName !== "globFiles" &&
      args.toolName !== "codeSearch" &&
      args.toolName !== "readFile"
    ) ||
    !args.metadata ||
    Object.keys(args.metadata).length === 0
  ) {
    return args.content;
  }
  // 剔除纯观测字段后再判空：只带观测字段的 metadata 必须与「无 metadata」
  // 走同一条路径，否则会凭空多出一个空的 [tool metadata] 块。
  const visible: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args.metadata)) {
    if (!OBSERVATION_ONLY_METADATA_KEYS.has(key)) visible[key] = value;
  }
  if (Object.keys(visible).length === 0) return args.content;
  return `${args.content}\n\n[tool metadata]\n${JSON.stringify(visible)}`;
}

/**
 * 把 provider 返回的有序 output blocks（text→toolCall→text）展开为 OpenAI 扁平消息：
 * assistant(text_before | null, tool_calls[]) → tool(tool_call_id, content) → …
 * 连续 toolCall 无中间 text → 合并进同一条 assistant 的 tool_calls[]。
 * thinking → 折进该段 assistant 的 reasoning_content（不单独成 role）。
 * 末尾 text → 追加一条无 tool_calls 的 assistant。
 * 仅供 localLoop output 分支调用，不重跑工具（result 已由流内执行填充）。
 */
function blocksToOpenAiMessages(
  blocks: AgentRuntimeOutputBlock[],
): AgentRuntimeChatMessage[] {
  const out: AgentRuntimeChatMessage[] = [];
  let text = "";
  let reasoning = "";
  let pendingToolCalls: AgentRuntimeToolCall[] = [];
  let pendingToolResults: { content: string; metadata?: Record<string, unknown> }[] = [];

  const flushSegment = () => {
    if (text === "" && pendingToolCalls.length === 0 && reasoning === "") return;
    out.push({
      role: "assistant",
      content: text || null,
      ...(reasoning ? { reasoning_content: reasoning } : {}),
      ...(pendingToolCalls.length > 0 ? { tool_calls: pendingToolCalls } : {}),
    });
    for (let i = 0; i < pendingToolCalls.length; i += 1) {
      const tc = pendingToolCalls[i];
      const res = pendingToolResults[i];
      out.push({
        role: "tool",
        content: formatToolMessageContent({
          toolName: tc.function.name,
          content: res?.content ?? "",
          ...(res?.metadata ? { metadata: res.metadata } : {}),
        }),
        tool_call_id: tc.id,
        toolName: tc.function.name,
        ...(res?.metadata ? { tool_result_metadata: res.metadata } : {}),
      });
    }
    text = "";
    reasoning = "";
    pendingToolCalls = [];
    pendingToolResults = [];
  };

  for (const block of blocks) {
    if (block.type === "text") {
      // toolCalls 已挂起 → 先 flush assistant+tools，再开新 text 段
      if (pendingToolCalls.length > 0) {
        flushSegment();
      }
      text += block.text;
      continue;
    }
    if (block.type === "thinking") {
      reasoning += block.thinking;
      continue;
    }
    if (block.type === "toolCall") {
      pendingToolCalls.push(block.toolCall);
      pendingToolResults.push({
        content: block.result?.content ?? "",
        ...(block.result?.metadata ? { metadata: block.result.metadata } : {}),
      });
    }
  }
  flushSegment();
  return out;
}

function buildActionGate(args: {
  toolName: string;
  toolCallId: string;
  metadata?: Record<string, unknown>;
}): LocalAgentActionGate | null {
  const gate = readActionGate(args.metadata?.actionGate);
  if (!gate) return null;
  if (gate.kind === "handoff" && !readCommandActionGatePayload(gate.payload)) return null;
  return {
    ...gate,
    toolName: args.toolName,
    toolCallId: args.toolCallId,
  };
}

const TOOL_METADATA_KEYS = [
  "path",
  "query",
  "effectivePattern",
  "startLine",
  "endLine",
  "totalLines",
  "totalBytes",
  "bytes",
  "totalChars",
  "count",
  "matchCount",
  "matchedFiles",
  "truncated",
  "limitedByMaxResults",
  "limitedByMaxDepth",
  "visitedEntries",
  "maxResults",
  "exitCode",
  "status",
  "timedOut",
  "aborted",
  "replacements",
  "code",
  "error",
  "message",
  "warnings",
  "pasteId",
  "source",
] as const;

/**
 * 按模型上下文预算裁掉最老的历史消息。
 *
 * 为什么需要：localLoop 此前把完整历史无条件发给 provider，没有任何窗口或压缩。
 * 实测本地对话里有末轮上下文达 10.2M token 的会话，而 deepseek-v4-flash 的窗口
 * 是 100 万——这类请求要么失败，要么被 provider 静默截断（模型在缺失上下文的
 * 情况下继续作答，且无人知晓）。
 *
 * 预算判定复用 web 端同一个纯函数 `planContextUsage`，不在 CLI 侧另造一套阈值。
 * 该规划器是 cache-first 的：1M 窗口模型的历史预算约 94 万 token，所以本裁剪
 * 只在接近撞窗口时才生效，正常会话完全不受影响、provider 前缀缓存不被破坏。
 *
 * 裁剪后必须过 `sanitizeToolCallPairing`：从头部丢消息可能丢掉声明 tool_calls 的
 * assistant 却留下对应的 tool 结果，provider 会直接报错。
 */
export function trimHistoryToContextBudget(
  history: AgentRuntimeChatMessage[],
  model: string | undefined,
): { history: AgentRuntimeChatMessage[]; droppedCount: number } {
  if (history.length === 0) return { history, droppedCount: 0 };

  const { rawMessageBudget } = planContextUsage({
    contextWindow: getModelContextWindow(model ?? ""),
    summaryTokens: 0,
    // localLoop 没有 web 端的负载分档器；medium 是中性默认值，
    // 不为了省几个 token 在这里复制一份分类逻辑。
    recentLoad: "medium",
  });

  // 必须用 estimateTokenCount：它是中文感知的（中文 1.5 tok/字，其他 0.25 tok/字符）。
  // 平铺 chars/4 对中文低估约 6 倍，会导致中文会话该裁不裁、照旧撞窗口。
  const messageTokens = (message: AgentRuntimeChatMessage): number => {
    const toolCalls = (message as any).tool_calls;
    return (
      estimateTokenCount(contentAsText(message.content)) +
      (Array.isArray(toolCalls) ? estimateTokenCount(JSON.stringify(toolCalls)) : 0)
    );
  };

  let used = 0;
  let start = history.length;
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const cost = messageTokens(history[i]);
    // 至少保留最后一条，否则预算极小时会裁成空历史
    if (used + cost > rawMessageBudget && start < history.length) break;
    used += cost;
    start = i;
  }

  if (start === 0) return { history, droppedCount: 0 };
  return {
    history: sanitizeToolCallPairing(history.slice(start)),
    droppedCount: start,
  };
}

/** 把结构化 content 摊平成文本，供中文感知的 estimateTokenCount 使用。 */
function contentAsText(content: AgentRuntimeMessageContent): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (part?.type === "text") return part.text;
      if (part?.type === "image_url") return part.image_url.url;
      return "";
    })
    .join("\n");
}

function contentCharCount(content: AgentRuntimeMessageContent): number {
  if (typeof content === "string") return content.length;
  if (!Array.isArray(content)) return 0;
  return content.reduce((total, part) => {
    if (part?.type === "text") return total + part.text.length;
    if (part?.type === "image_url") return total + part.image_url.url.length;
    return total;
  }, 0);
}

function compactToolMetadata(
  metadata: Record<string, unknown> | undefined,
): string {
  if (!metadata) return "";
  const selected: Record<string, unknown> = {};
  for (const key of TOOL_METADATA_KEYS) {
    const value = metadata[key];
    if (value === undefined) continue;
    if (typeof value === "string") {
      selected[key] = clipCompactText(value, 240);
      continue;
    }
    if (Array.isArray(value)) {
      selected[key] = value.slice(0, 20).map((item) =>
        typeof item === "string"
          ? clipCompactText(item, 180)
          : clipCompactText(JSON.stringify(item), 180),
      );
      continue;
    }
    selected[key] = value;
  }
  return Object.keys(selected).length > 0
    ? clipCompactText(JSON.stringify(selected), 1200)
    : "";
}

function projectToolContentForProvider(args: {
  content: AgentRuntimeMessageContent;
  toolName?: string;
  metadata?: Record<string, unknown>;
  maxChars: number;
  label: string;
}): AgentRuntimeMessageContent {
  const content = args.content;
  if (typeof content !== "string") return content;
  const metadataText = compactToolMetadata(args.metadata);
  // Some tool formatters already append the full metadata JSON to the durable
  // content. Remove that provider-side duplicate and re-add the bounded
  // projection below so metadata cannot disappear in the clipped middle/tail.
  const embeddedMetadataIndex = metadataText
    ? content.indexOf("\n\n[tool metadata]\n")
    : -1;
  const contentForProjection = embeddedMetadataIndex >= 0
    ? content.slice(0, embeddedMetadataIndex)
    : content;
  const metadataSuffix = metadataText
    ? `\n\n[tool metadata]\n${metadataText}`
    : "";
  // Keep already-bounded durable tool messages byte-for-byte stable. This is
  // important for short read/search results whose metadata is already part of
  // the canonical message; projection is only needed once the provider bound
  // would actually be exceeded.
  if (embeddedMetadataIndex >= 0 && content.length <= args.maxChars) {
    return content;
  }
  // Idempotence guard (stable-projection contract): buildMessages projects
  // cross-turn history via summarizeHistoricalToolContent, then
  // prepareMessagesForProviderCall projects the SAME message again in the same
  // request. The second pass must be a no-op for already-projected content,
  // otherwise the diagnostic suffix would be re-clipped (initialBudget =
  // maxChars - 120 < projected length) and the bytes would drift between
  // provider calls — exactly the cache-prefix break this policy exists to
  // prevent. Only content that still fits the budget short-circuits; oversized
  // raw output is always projected.
  if (
    content.length <= args.maxChars &&
    content.includes(`\n\n[${args.label}; originalChars=`)
  ) {
    return content;
  }
  const headRatio = resolveToolOutputProfile(args.toolName).headRatio;
  const initialBudget = Math.max(
    1,
    args.maxChars - metadataSuffix.length - 120,
  );
  let clipped = clipToolText(contentForProjection, initialBudget, headRatio);
  const wasClipped = clipped.length < contentForProjection.trim().length;
  const needsProjection = wasClipped || Boolean(metadataSuffix) || embeddedMetadataIndex >= 0;
  if (!needsProjection) return args.content;

  let spillNote = "";
  if (wasClipped) {
    try {
      const spill = spillToolOutput({
        content: contentForProjection,
        toolName: args.toolName,
      });
      spillNote = `; spillFile=${spill.displayPath}; totalLines=${spill.totalLines}`;
    } catch {
      // Ignore spill write failures to prevent breaking prompt generation
    }
  }

  const diagnostic = (clippedLength: number) =>
    `[${args.label}; originalChars=${content.length}; omittedChars=${Math.max(
      0,
      content.length - clippedLength,
    )}${spillNote}]`;
  const suffix = (clippedLength: number) =>
    [diagnostic(clippedLength), metadataSuffix.trimStart()]
      .filter(Boolean)
      .join("\n\n");

  let projected = wasClipped || metadataSuffix
    ? `${clipped}\n\n${suffix(clipped.length)}`
    : clipped;
  // Tighten so maxChars is a real provider bound, including metadata and the truncation marker.
  if (projected.length > args.maxChars) {
    const boundedBudget = Math.max(
      1,
      args.maxChars - suffix(clipped.length).length - 2,
    );
    clipped = clipToolText(contentForProjection, boundedBudget, headRatio);
    projected = `${clipped}\n\n${suffix(clipped.length)}`;
  }
  return projected.length <= args.maxChars
    ? projected
    : projected.slice(0, args.maxChars);
}

type PreparedProviderMessages = {
  messages: AgentRuntimeChatMessage[];
  metrics: LocalAgentContextMetrics;
};

// 单一稳定 label：同一条 tool 消息在 fresh、同 turn 更早轮、跨 turn 历史三个
// 投影点必须携带完全相同的诊断后缀文本，否则跨 turn 后缀变化本身就是一次
// byte 漂移（前缀缓存断裂）。沿用 in-turn 历史文本：desktop-runtime 的披露
// 折叠按 `"\n\n[in-turn tool result"` 切分，改文案会破坏该解析。
const TOOL_OUTPUT_PROJECTION_LABEL =
  "in-turn tool result truncated/projected before next provider call";

// Exported for the cross-turn retention regression test: the ledger gate in
// the read executors and this projection must agree on the same cap, or the
// dedup notice can claim "still in context" for content history already cut.
export function summarizeHistoricalToolContent(
  content: AgentRuntimeMessageContent,
  toolName?: string,
  metadata?: Record<string, unknown>,
): AgentRuntimeMessageContent {
  return projectToolContentForProvider({
    content,
    toolName,
    metadata,
    // Stable projection contract: the SAME per-tool profile budget and label
    // as prepareMessagesForProviderCall, so the first provider-visible
    // representation of a tool execution is byte-identical on every later
    // round and across turns. Read-family profiles keep their ledger cap
    // (4800); unprofiled tools use the default profile (4000) instead of the
    // old flat 1600 — a historical rewrite below the fresh budget was itself
    // a cache-prefix break (see docs/plans/2026-09-05-tool-output-cache-stability.md).
    maxChars: resolveToolOutputProfile(toolName).maxChars,
    label: TOOL_OUTPUT_PROJECTION_LABEL,
  });
}

function prepareMessagesForProviderCall(
  messages: AgentRuntimeChatMessage[],
): PreparedProviderMessages {
  // 发 provider 前的唯一咽喉点：先修掉 tool_calls/tool 配对违规（孤儿 tool、悬空 tool_calls），
  // 再走原 map。脏历史不能原样发给 OpenAI 兼容接口。
  const paired = sanitizeToolCallPairing(messages);
  // Stable provider-visible projection：所有 in-turn tool 消息（含刚产出的 fresh
  // 消息）使用与跨 turn 历史（summarizeHistoricalToolContent）完全相同的
  // per-tool 预算与 label。投影因此是 (content, toolName, metadata) 的纯函数，
  // 同一 tool execution 第一次进入 provider transcript 后每轮 byte-identical。
  // 旧「fresh 32k 宽窗口 → 非 fresh 回压 profile → 跨 turn 1.6k」三档设计会在
  // 每轮把上一轮的 tool 消息改写一次（实测 17,779 → 4,361 字符），前缀缓存
  // 从该消息起整体失效（2026-08-25 事故同类根因）。超预算部分仍由
  // projectToolContentForProvider 通过 spillToolOutput 完整落盘（内容寻址路径，
  // (toolName, content) 纯函数），provider 看到 deterministic projection +
  // spillFile 引用；durable 历史/UI 保留完整原文。fresh 窗口的质量代价由 spill
  // 重读（readFile/grep spill 文件）覆盖，属于已拍板的产品决策
  // （docs/plans/2026-09-05-tool-output-cache-stability.md，推翻
  // 2026-09-02 perf sweep 中「仅性能收益不足」的否决——本次目标是 cache ROI）。
  let toolMessageCount = 0;
  let rawToolContentChars = 0;
  let projectedToolContentChars = 0;
  let truncatedToolResults = 0;
  const projected = paired.map((message) => {
    const { context_reference: _contextReference, ...providerMessage } = message;
    const sanitizedContent =
      providerMessage.content == null
        ? ""
        : typeof providerMessage.content === "string"
          ? providerMessage.content
          : providerMessage.content;

    if (providerMessage.role !== "tool") {
      return {
        ...providerMessage,
        content: sanitizedContent,
      };
    }
    toolMessageCount += 1;
    rawToolContentChars += contentCharCount(sanitizedContent);
    const projectedContent = projectToolContentForProvider({
      content: sanitizedContent,
      toolName: providerMessage.toolName,
      metadata: providerMessage.tool_result_metadata,
      maxChars: resolveToolOutputProfile(providerMessage.toolName).maxChars,
      label: TOOL_OUTPUT_PROJECTION_LABEL,
    });
    projectedToolContentChars += contentCharCount(projectedContent);
    if (contentCharCount(projectedContent) < contentCharCount(sanitizedContent)) {
      truncatedToolResults += 1;
    }
    return {
      ...providerMessage,
      content: projectedContent,
    };
  });
  return {
    messages: projected,
    metrics: {
      messageCount: projected.length,
      contentChars: projected.reduce((total, message) => total + contentCharCount(message.content), 0),
      toolMessageCount,
      rawToolContentChars,
      projectedToolContentChars,
      truncatedToolResults,
      stableContextChars: 0,
      dynamicContextChars: 0,
    },
  };
}

function prepareHistoryForNextTurn(
  history: AgentRuntimeChatMessage[],
  contextReferenceResolver?: (reference: AgentRuntimeMessageContent) => boolean,
): AgentRuntimeChatMessage[] {
  return history.map((message) => {
    if (
      message.role === "user" &&
      message.context_reference !== undefined &&
      contextReferenceResolver?.(message.context_reference)
    ) {
      return { ...message, content: message.context_reference };
    }
    if (message.role !== "tool") return message;
    return {
      ...message,
      content: summarizeHistoricalToolContent(
        message.content,
        message.toolName,
        message.tool_result_metadata,
      ),
    };
  });
}

/**
 * 按 vision 能力过滤整条消息数组。supportsImages 为 true 时原样返回（catalog 默认）；
 * 为 false 时逐条剥离 image_url parts，保留 text/tool_calls 等其他内容。
 */
function filterImagePartsFromMessages(
  messages: AgentRuntimeChatMessage[],
  supportsImages: boolean,
): AgentRuntimeChatMessage[] {
  if (supportsImages) return messages;
  return stripImagePartsFromMessages(messages);
}

type BuiltMessages = {
  messages: AgentRuntimeChatMessage[];
  stableContextChars: number;
  dynamicContextChars: number;
  /** 稳定前缀内容指纹（与 contextCompiler 同一 FNV 算法），用于 token 记录的 prefix churn 观测。 */
  stablePrefixHash?: string;
  stablePrefixEstimatedTokens?: number;
};

function buildMessages(args: {
  prompt?: string;
  contextBlocks?: string[];
  contextBlockScopes?: ContextBlockScope[];
  history: AgentRuntimeChatMessage[];
  input: AgentRuntimeMessageContent;
  contextReferenceResolver?: (reference: AgentRuntimeMessageContent) => boolean;
}): BuiltMessages {
  // When contextBlockScopes is provided, split into stable (session) + dynamic (turn).
  // The agent prompt is always part of the stable prefix.
  if (args.contextBlockScopes?.length) {
    const blocks = args.contextBlockScopes.filter((b) => b.content.trim());
    const stableParts = [args.prompt?.trim(), ...blocks.filter((b) => b.cacheScope === "session").map((b) => b.content)]
      .filter(Boolean);
    const dynamicParts = blocks
      .filter((b) => b.cacheScope === "turn")
      .map((b) => b.content)
      .map((block) => block.trim())
      .filter(Boolean);
    const stableContent = stableParts.join("\n\n");
    const dynamicContent = dynamicParts.join("\n\n");
    // 前缀缓存契约：turn-scope 动态块（当前时间等）绝不拼进 system 尾部。
    // system 每轮在动态块处逐秒变化，会把其身后全部历史消息的前缀缓存命中
    // 一起切断（RunInfra cached_tokens / Anthropic cache_control 都按 prompt
    // 前缀匹配；实测 113k 上下文 A/B：拼尾部 cached=0 vs 移到末尾命中 49%、
    // TTFT 5.4s→2.9s，见 packages/cli/__perf__/cachePrefixAbProbe.ts）。
    // 动态块并入末尾 user 消息头部：system(stable) + history(append-only)
    // 全程前缀稳定，每轮只有新增尾巴是天然 miss。
    const userContent: AgentRuntimeMessageContent = dynamicContent
      ? typeof args.input === "string"
        ? `${dynamicContent}\n\n${args.input}`
        : [
            { type: "text", text: dynamicContent },
            ...(Array.isArray(args.input) ? args.input : args.input ? [args.input] : []),
          ]
      : args.input;
    return {
      messages: [
        ...(stableContent
          ? [{
              role: "system" as const,
              content: stableContent,
              ...(stableContent ? { stable_prefix_chars: stableContent.length } : {}),
            }]
          : []),
        ...prepareHistoryForNextTurn(args.history, args.contextReferenceResolver),
        { role: "user" as const, content: userContent },
      ],
      stableContextChars: stableContent.length,
      dynamicContextChars: dynamicContent.length,
      ...(stableContent
        ? {
            stablePrefixHash: hashStablePrefixContent(stableContent),
            stablePrefixEstimatedTokens: estimateContextTokens(stableContent),
          }
        : {}),
    };
  }

  // Fallback: plain contextBlocks (no scope split)
  const blocks = (args.contextBlocks ?? [])
    .map((block) => block.trim())
    .filter(Boolean);
  const systemContent = [args.prompt?.trim(), ...blocks]
    .filter(Boolean)
    .join("\n\n");
  return {
    messages: [
      ...(systemContent
        ? [{ role: "system" as const, content: systemContent }]
        : []),
      ...prepareHistoryForNextTurn(args.history, args.contextReferenceResolver),
      { role: "user" as const, content: args.input },
    ],
    stableContextChars: (args.prompt?.trim() ?? "").length,
    dynamicContextChars: blocks.join("\n\n").length,
    ...(systemContent
      ? {
          stablePrefixHash: hashStablePrefixContent(systemContent),
          stablePrefixEstimatedTokens: estimateContextTokens(systemContent),
        }
      : {}),
  };
}

function mergeTurnUsage(
  current: Record<string, unknown> | undefined,
  next: Record<string, unknown> | undefined
) {
  if (!next) return current;
  // 缓存字段走共享别名表：OpenAI Responses / chat.completions 只在嵌套的
  // *_tokens_details.cached_tokens 里给缓存命中，只认顶层字段会让本轮记账
  // 显示 0 缓存，而同一次调用的 DB token 记录（走 normalizeUsage）却有值。
  const read = (usage: Record<string, unknown>) => ({
    input: Number(usage.input_tokens ?? usage.prompt_tokens ?? 0),
    output: Number(usage.output_tokens ?? usage.completion_tokens ?? 0),
    cacheHit: readCacheReadInputTokens(usage),
    cacheMiss: readCacheCreationInputTokens(usage),
  });
  const right = read(next);
  const left = current ? read(current) : { input: 0, output: 0, cacheHit: 0, cacheMiss: 0 };
  return {
    input_tokens: left.input + right.input,
    output_tokens: left.output + right.output,
    cache_read_input_tokens: left.cacheHit + right.cacheHit,
    cache_creation_input_tokens: left.cacheMiss + right.cacheMiss,
  };
}

/**
 * 把一次带外 LLM 调用（目前只有自动压缩的摘要生成）的用量加进本轮记账 usage (accountingUsage)。
 *
 * 摘要是主工具循环之外的独立 provider call。这里保留独立 helper，让调用方
 * 明确区分主循环累计与带外累计，并兼容旧的字段别名。注意：带外用量仅进入 accountingUsage
 * 与 usageRecords 用于费用结算，不得进入 run 结果的 context usage 快照。
 */
export function addOutOfBandUsage(
  turn: Record<string, unknown> | undefined,
  extra: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!extra) return turn;
  const num = (u: Record<string, unknown> | undefined, ...keys: string[]) => {
    if (!u) return 0;
    for (const k of keys) {
      const v = Number(u[k]);
      if (Number.isFinite(v) && v !== 0) return v;
    }
    return 0;
  };
  return {
    ...(turn ?? {}),
    input_tokens:
      num(turn, "input_tokens", "prompt_tokens") +
      num(extra, "input_tokens", "prompt_tokens"),
    output_tokens:
      num(turn, "output_tokens", "completion_tokens") +
      num(extra, "output_tokens", "completion_tokens"),
    cache_read_input_tokens:
      readCacheReadInputTokens(turn) + readCacheReadInputTokens(extra),
    cache_creation_input_tokens:
      readCacheCreationInputTokens(turn) + readCacheCreationInputTokens(extra),
  };
}

function extractUserInputText(content: AgentRuntimeMessageContent): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .flatMap((part) => (part?.type === "text" && part.text ? [part.text] : []))
    .join("\n")
    .trim();
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
function applyPersistedTurnInput(
  messages: AgentRuntimeChatMessage[],
  persistedInput: AgentRuntimeMessageContent | undefined,
  persistedInputReference: AgentRuntimeMessageContent | undefined,
): AgentRuntimeChatMessage[] {
  if (persistedInput === undefined && persistedInputReference === undefined) {
    return messages;
  }
  let replaced = false;
  return messages.map((message) => {
    if (replaced || message.role !== "user") return message;
    replaced = true;
    return {
      ...message,
      ...(persistedInput !== undefined ? { content: persistedInput } : {}),
      ...(persistedInputReference !== undefined
        ? { context_reference: persistedInputReference }
        : {}),
    };
  });
}

const fileWriteSessionApproval = new WeakMap<object, { approved: boolean }>();
const fileWriteSessionKeys = new Map<string, object>();

function getFileWriteSessionApproval(input: LocalAgentTurnInput): { approved: boolean } {
  if (input.fileWriteSessionId) {
    let key = fileWriteSessionKeys.get(input.fileWriteSessionId);
    if (!key) {
      key = {};
      fileWriteSessionKeys.set(input.fileWriteSessionId, key);
    }
    const existing = fileWriteSessionApproval.get(key);
    if (existing) return existing;
    const created = { approved: false };
    fileWriteSessionApproval.set(key, created);
    return created;
  }
  const key = input.adapter as unknown as object;
  const existing = fileWriteSessionApproval.get(key);
  if (existing) return existing;
  const created = { approved: false };
  fileWriteSessionApproval.set(key, created);
  return created;
}

function readToolPathForWriteGate(argumentsValue: string): string {
  try {
    const parsed = JSON.parse(argumentsValue) as Record<string, unknown>;
    return typeof parsed.path === "string" && parsed.path.trim()
      ? parsed.path.trim()
      : "the requested file";
  } catch {
    return "the requested file";
  }
}

function isCompletedActionGateResult(value: unknown): boolean {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as { status?: unknown }).status === "completed",
  );
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

  try {
    // 计时探针（NOLO_LOOP_TIMING=1）：入口先打点，覆盖 loadAgentConfig/loadDialogHistory 段。
    // 注意：模块级计时状态为单 turn 设计，并发跑多个 turn 且开启门控时数据会交错
    // （仅调试工具，不影响生产路径）。
    loopTimingMark("turnStart", 0);
  const agentConfig = await input.adapter.loadAgentConfig(input.agentRef);
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
      messages: [{ role: "user", content: input.input }],
      error,
      model: agentConfig.model,
      input,
    });
    attachDialogIdToError(error, dialogId);
    throw error;
  }
  loopTimingMark("loadDialogHistory", 0);
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
  const toolGuidedSections = resolveToolGuidedSections(agentTools);
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
    { content: identityBlock, cacheScope: "session" as const },
    ...guidanceScopes,
    ...callerScopes,
  ];
  loopTimingMark("buildContextBlocks", 0);

  // Provider 惰性解析：自动压缩需要生成摘要时才 resolve；主循环复用同一实例。
  // resolve 失败由压缩路径吞掉（退回兜底裁剪），主循环再 resolve 时仍走原有 saveTurn 路径。
  let resolvedProvider: AgentRuntimeProvider | undefined;
  const resolveProviderOnce = async (): Promise<AgentRuntimeProvider> => {
    if (!resolvedProvider) {
      resolvedProvider = await input.adapter.resolveProvider(agentConfig);
    }
    return resolvedProvider;
  };

  // 自动上下文压缩：先于预算兜底。摘要持久化，压缩点之间前缀稳定以保住缓存。
  // 失败只记日志，绝不阻断本轮对话。
  // 摘要那次 LLM 调用是一次独立的计费调用，用量必须并入本轮 usage，
  // 否则只出现在 provider 账单上、我们自己的 token 记账看不到。
  let compactionUsage: Record<string, unknown> | undefined;
  try {
    const compacted = await maybeAutoCompactLocalHistory({
      adapter: input.adapter,
      dialogId: input.continueDialogId,
      history,
      model: agentConfig.model,
      resolveProvider: resolveProviderOnce,
    });
    history = compacted.history;
    compactionUsage = compacted.usage;
    // 压缩观测事件：compressed / summaryGenerated 任一为 true 才发射；
    // 无压缩不发射。事件发射不能影响主流程（emitLoopEvent 本身已 fail-open）。
    if (compacted.compressed || compacted.summaryGenerated) {
      emitLoopEvent(observationBoundary, {
        kind: "compaction",
        atMs: Date.now(),
        reason: compacted.reason ?? "context_budget",
        summaryGenerated: compacted.summaryGenerated,
        compressed: compacted.compressed,
        ...(compacted.beforeTokens !== undefined
          ? { beforeTokens: compacted.beforeTokens }
          : {}),
        ...(compacted.afterTokens !== undefined
          ? { afterTokens: compacted.afterTokens }
          : {}),
        ...(compacted.savedTokens !== undefined
          ? { savedTokens: compacted.savedTokens }
          : {}),
        ...(compacted.stubbedCount !== undefined
          ? { stubbedCount: compacted.stubbedCount }
          : {}),
      });
    }
  } catch (error) {
    console.warn("[localLoop] auto-compaction unexpected error:", error);
  }
  loopTimingMark("maybeAutoCompactLocalHistory", 0);

  // 上下文预算兜底：必须在 turnStartIndex 之前裁，否则该索引会指向错误位置。
  const trimmedHistory = trimHistoryToContextBudget(history, agentConfig.model);
  if (trimmedHistory.droppedCount > 0) {
    history = trimmedHistory.history;
  }
  loopTimingMark("trimHistoryToContextBudget", 0);

  const hasContextBlocks =
    callerScopes.some((block) => block.content.trim()) ||
    mergedContextBlockScopes.some((block) => block.content.trim());
  const promptMessageCount =
    agentConfig.prompt?.trim() || hasContextBlocks ? 1 : 0;
  const turnStartIndex = promptMessageCount + history.length;
  const builtMessages = buildMessages({
    prompt: agentConfig.prompt,
    contextBlockScopes: mergedContextBlockScopes,
    history,
    input: input.input,
    contextReferenceResolver:
      input.adapter.host === "cli" ? input.contextReferenceResolver : undefined,
  });
  let messages = builtMessages.messages;
  loopTimingMark("buildMessages", 0);
  // 毒丸防御：历史中 arguments 非法 JSON 的 tool_call（典型成因：上游流式截断，
  // 如 GLM 并行 tool_call 丢结尾 `"}]}`）会让网关对整个请求 400（实测 UPSTREAM_400
  // messages[N].tool_calls[0].function.arguments invalid JSON string），而坏消息已
  // 在存储历史里，每轮重放每轮失败 → dialog 永久死锁（"继续"无效）。发送前就地
  // 降级为文本（存储不动、幂等），模型看到意图与 tool 结果文本后可重发调用 → 自愈。
  const poisonDowngrade = downgradeUnparsableToolCalls(messages);
  if (poisonDowngrade.downgraded > 0) {
    messages = poisonDowngrade.messages;
    console.warn(
      `[nolo] downgraded ${poisonDowngrade.downgraded} tool_call(s) with unparsable JSON arguments from outbound history (suspected upstream stream truncation); persisted history untouched`,
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

  const userInputText = extractUserInputText(input.input);
  let toolCallCount = 0;
  // 兜底标记（emptyAssistantFallbackReason / emptyAssistantOutputUsable）已
  // 收敛到 AgentRuntimeResult 本体，这里不再需要本地类型放宽。
  let result: AgentRuntimeResult;
  let turnUsage: Record<string, unknown> | undefined;
  let contextUsage: Record<string, unknown> | undefined;
  const usageRecords: NonNullable<AgentRuntimeSaveTurnInput["usageRecords"]> = [];
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
        messages.push({ role: "user", content: text });
        injected = true;
      }
      return injected;
    };
    while (true) {
      partialContent = "";
      throwIfAborted(input);
      loopTimingMark("roundStart", round);
      // 注入放在 roundStart 标记之后：roundStart 记的是「上一相位结束到本轮开始」
      // 的边界耗时，注入的开销应计入随后的 prepareMessagesForProviderCall 相位，
      // 不污染边界读数。注入仍在构造请求消息之前，本轮 provider 调用即可见。
      applyPendingInjections();
      // 空轮修复：把 repair user message 追加到本轮请求末尾重试一次（系统消息放在末尾会被大部分 Provider API 拒收或返回空消息）。
      const preparedMessages = prepareMessagesForProviderCall(messages);
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
      loopTimingMark("prepareMessagesForProviderCall", round);
      const shouldStreamDeltas = Boolean(
        input.onTextDelta || input.onObservationEvent || input.observationBoundary,
      );
      const shouldStreamReasoning = Boolean(
        input.onReasoningDelta || input.onObservationEvent || input.observationBoundary,
      );
      const shouldPassToolEvents = Boolean(
        input.onToolEvent || input.onObservationEvent || input.observationBoundary,
      );

      result = await runCompleteWithTimeout({
        provider,
        messages: requestMessages,
        options: {
          ...(typeof input.timeoutMs === "number" ? { timeoutMs: input.timeoutMs } : {}),
          // 用户取消信号穿进 provider options：providerStreamRetry 据此在
          // 取消后跳过重试，provider 分支（如 antigravity/openai-compatible）
          // 也可把 fetch 绑定到同一信号，实现真正的传输层取消。
          ...(input.abortSignal ? { signal: input.abortSignal } : {}),
          // 计费归因：续聊轮次带上 dialogId，platform proxy 才能把 token 记录
          // 归到具体对话而不是 chat-proxy 兜底桶。新对话首轮 id 尚未分配。
          ...(input.continueDialogId ? { dialogId: input.continueDialogId } : {}),
          ...(shouldStreamDeltas ? { onTextDelta: (chunk: string) => {
            partialContent += chunk;
            observationBoundary.emit({
              kind: "text-delta",
              chunk,
              round,
              atMs: Date.now(),
            });
          } } : {}),
          ...(shouldStreamReasoning ? { onReasoningDelta: (chunk: string) => {
            observationBoundary.emit({
              kind: "reasoning-delta",
              chunk,
              round,
              atMs: Date.now(),
            });
          } } : {}),
          ...(shouldPassToolEvents ? { onToolEvent: (event: LocalAgentToolEvent) => {
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
        round,
        input,
        boundary: observationBoundary,
        context: contextMetrics,
        providerName: agentConfig.provider,
        model: provider.model,
      });
      loopTimingMark("llmCall", round);
      turnUsage = mergeTurnUsage(turnUsage, result.usage);
      contextUsage = result.usage;
      if (result.usage && Object.keys(result.usage).length > 0) {
        usageRecords.push({
          callId:
            typeof result.usage.provider_call_id === "string" &&
            result.usage.provider_call_id.trim()
              ? result.usage.provider_call_id.trim()
              : crypto.randomUUID(),
          usage: result.usage,
          model: result.model || agentConfig.model || "unknown",
          ...(result.provider || agentConfig.provider
            ? { provider: result.provider || agentConfig.provider }
            : {}),
          ...(builtMessages.stablePrefixHash
            ? {
                stablePrefixHash: builtMessages.stablePrefixHash,
                stablePrefixEstimatedTokens: builtMessages.stablePrefixEstimatedTokens,
              }
            : {}),
        });
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
      const toolCalls = result.tool_calls ?? [];
      const rawToolCallsCount = (result.tool_calls?.length ?? 0) || (Array.isArray((result as any).raw_tool_calls) ? (result as any).raw_tool_calls.length : 0);
      loopTimingMark("postLlmProcessing", round);
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
          messages.push(assistantMessage);
          if (applyPendingInjections()) {
            // 注入续跑也是一个完整回合的结束：补 roundEnd 标记，让 timing 探针
            // 的相位序列保持「每轮都有 roundEnd」的不变式（与工具调用路径一致），
            // 否则续跑轮在 JSONL 里会缺一行、相位配对错位。
            loopTimingMark("roundEnd", round);
            round += 1;
            continue;
          }
          // 无注入：撤回刚才的预置 assistant 消息，交回统一的最终追加路径
          // （skipFinalAppend 语义与 thinkContent 附加都在那里处理）。
          messages.pop();
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
          messages.push(...blocksToOpenAiMessages(outputBlocks));
          skipFinalAppend = true;
          break;
        }
        round += 1;
        continue;
      }
      toolCallCount += toolCalls.length;
      messages.push({
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
      loopTimingMark("toolLoopStart", round);
      for (const toolCall of toolCalls) {
        throwIfAborted(input);
        const toolName = toolCall.function.name;
        let toolResult;
        /**
         * 工具本体执行耗时（ms）。只包住 adapter.executeTool 这一段，**不含**
         * action gate 的人工确认等待——否则被门控的工具会记成用户的思考时间。
         * 流内已执行（result 已填充）与被 gate 取消的分支不产生该值。
         *
         * 为什么要记：历史里 11.3% 的轮次带多个工具、总计约 20% 的工具调用本可
         * 并行，但 tool metadata 从来没记过耗时，导致「轮内并行值不值得做」这个
         * 决定一直是瞎的（快工具 15–45ms 的话只省 ~1.8s/300 次，慢命令则可能是
         * 分钟级）。先把数据攒起来，再谈要不要并行。
         */
        let toolExecMs: number | undefined;
        const startedAt = Date.now();
        loopTimingMark("toolCallStart", round);
        const argumentsPreview = summarizeToolArguments(toolName, toolCall.function.arguments);
        // 唯一 canonical 出口：emitLoopEvent 发 tool-start，并桥接投影给 legacy onToolEvent。
        emitLoopEvent(
          observationBoundary,
          {
            kind: "tool-start",
            round,
            toolCallId: toolCall.id,
            toolName,
            atMs: startedAt,
            ...(argumentsPreview ? { argumentsPreview } : {}),
          },
          {
            type: "tool-call",
            round,
            toolCallId: toolCall.id,
            toolName,
            ...(argumentsPreview ? { argumentsPreview } : {}),
          },
        );
        try {
          // 毒丸参数拦截（配合发送 seam 的 downgradeUnparsableToolCalls）：
          // arguments 非空 string 但 JSON.parse 失败（典型成因：上游流式截断，
          // 如 GLM 并行 tool_call 丢结尾 `"}]}`）时，执行器只能拿到空对象并
          // 误报"缺少 xxx 参数"（参数明明生成了），模型无法自纠。这里提前抛出
          // 明确诊断，走统一 tool-error 路径，tool result 直接指示重新调用。
          const rawPoisonArguments = toolCall.function?.arguments;
          if (
            typeof rawPoisonArguments === "string" &&
            rawPoisonArguments.trim() !== "" &&
            !hasParsableObjectArguments(rawPoisonArguments)
          ) {
            throw new Error(
              `模型生成的 tool_call arguments 不是合法 JSON（疑似上游流式截断，原始长度 ${rawPoisonArguments.length}）。请重新完整调用 ${toolName}，确保 arguments 是闭合的 JSON 对象；若因参数过长被截断，先精简参数（不要内嵌 diff/日志等大段文本，改传路径让对方自行读取）再重试。`,
            );
          }
          const writeTool = toolName === "writeFile" || toolName === "editFile";
          // Only interactive hosts can approve the session gate. Headless/background
          // runs retain the pre-gate behavior and execute writes directly.
          // `fileWriteGateEnabled === false` is the explicit escape hatch
          // (NOLO_CLI_WRITE_GATE=off, resolved by the CLI); any other value,
          // including undefined, keeps the gate active — fail-safe default.
          if (writeTool && input.onActionGate && input.fileWriteGateEnabled !== false) {
            const writeSession = getFileWriteSessionApproval(input);
            const policy = evaluateFileWritePolicy({
              tool: toolName,
              path: readToolPathForWriteGate(toolCall.function.arguments),
              sessionApproved: writeSession.approved,
            });
            if (policy.permissionDecision === "ask") {
              const gate: LocalAgentActionGate = {
                ...policy.permissionRequest,
                id: `${policy.permissionRequest.id}-${toolCall.id}`,
                kind: "confirm",
                toolName,
                toolCallId: toolCall.id,
              };
              const replacement = await runAbortableToolTask(
                input,
                input.onActionGate(gate),
                `${toolName} confirmation`,
              );
              const gateResult = replacement?.metadata?.actionGateResult;
              if (
                replacement !== undefined &&
                isCompletedActionGateResult(gateResult)
              ) {
                writeSession.approved = true;
              } else {
                toolResult = replacement ?? {
                  content: `${toolName} cancelled: user declined file write confirmation.`,
                  metadata: {
                    cancelled: true,
                    actionGateResult: { gateId: gate.id, status: "cancelled" },
                  },
                };
              }
            }
          }
          if (!toolResult) {
            const executePromise = input.adapter.executeTool({
              id: toolCall.id,
              name: toolName,
              arguments: toolCall.function.arguments,
              ...(userInputText ? { userInput: userInputText } : {}),
              ...(input.runtimeContext
                ? { runtimeContext: input.runtimeContext }
                : {}),
              ...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
            }, {
              ...(input.abortSignal ? { abortSignal: input.abortSignal } : {}),
              ...(input.runtimeContext
                ? { runtimeContext: input.runtimeContext }
                : {}),
            });
            const execStartedAtMs = Date.now();
            toolResult = await runAbortableToolTask(input, executePromise, toolName);
            toolExecMs = Date.now() - execStartedAtMs;
          }
          const actionGate = buildActionGate({
            toolName,
            toolCallId: toolCall.id,
            metadata: toolResult.metadata,
          });
          if (actionGate && input.onActionGate) {
            const replacement = await runAbortableToolTask(input, input.onActionGate(actionGate), `${toolName} action gate`);
            if (replacement) {
              toolResult = replacement;
            }
          }
          const finishedAt = Date.now();
          const summary = summarizeToolResult(toolResult.content, toolResult.metadata);
          const safeMetadata = projectSafeToolObservationMetadata(toolResult.metadata);
          loopTimingMark("toolExecute", round);
          emitLoopEvent(
            observationBoundary,
            {
              kind: "tool-end",
              round,
              toolCallId: toolCall.id,
              toolName,
              atMs: finishedAt,
              ok: toolResult.metadata?.cancelled !== true &&
                (toolResult.metadata?.actionGateResult as { status?: unknown } | undefined)?.status !== "cancelled" &&
                (toolResult.metadata?.actionGateResult as { status?: unknown } | undefined)?.status !== "failed",
              elapsedMs: Math.max(0, finishedAt - startedAt),
              ...(summary ? { summary } : {}),
              ...(safeMetadata ? { metadata: safeMetadata } : {}),
            },
            {
              type: "tool-result",
              round,
              toolCallId: toolCall.id,
              toolName,
              elapsedMs: Math.max(0, finishedAt - startedAt),
              ...(summary ? { summary } : {}),
              ...(typeof toolResult.content === "string"
                ? { content: toolResult.content }
                : {}),
              metadata: toolResult.metadata,
            },
          );
        } catch (error) {
          const finishedAt = Date.now();
          emitLoopEvent(
            observationBoundary,
            {
              kind: "tool-end",
              round,
              toolCallId: toolCall.id,
              toolName,
              atMs: finishedAt,
              ok: false,
              elapsedMs: Math.max(0, finishedAt - startedAt),
              errorMessage: toErrorMessage(error),
            },
            {
              type: "tool-error",
              round,
              toolCallId: toolCall.id,
              toolName,
              elapsedMs: Math.max(0, finishedAt - startedAt),
              message: toErrorMessage(error),
            },
          );
          // abort 优先：race 赢后必须原样上抛（error 上带 pendingToolName），
          // 不能被 shouldReturnToolExecutionErrors 转成 tool result 吞掉。
          if (
            error &&
            typeof error === "object" &&
            (error as { code?: unknown }).code === LOCAL_TURN_ABORTED_CODE
          ) {
            throw error;
          }
          if (!shouldReturnToolExecutionErrors(input.adapter)) throw error;
          toolResult = {
            content:
              formatStructuredToolExecutionError({ toolName, error }) ??
              formatToolExecutionError({ toolName, error }),
            metadata: {
              error: true,
              toolName,
              message: toErrorMessage(error),
              ...(
                error &&
                typeof error === "object" &&
                typeof (error as { code?: unknown }).code === "string"
                  ? { code: (error as { code: string }).code }
                  : {}
              ),
            },
          };
        }
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
        loopTimingMark("toolResultFormat", round);
        messages.push({
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
      loopTimingMark("roundEnd", round);
      round += 1;
    }
  } catch (error) {
    loopError = error;
  }

  // 即使 provider 循环失败（超时/额度/凭证等），也保存 dialog 以便续聊与复盘
  if (loopError) {
    const turnMessages = applyPersistedTurnInput(
      messages.slice(turnStartIndex),
      input.persistedInput,
      input.persistedInputReference,
    );
    // 本轮全部计费证据（带外的压缩摘要调用排在前面）。saveTurn 与「挂到错误上
    // 带给调用方」用的必须是同一批记录，否则状态行的会话累计和落盘账目会对不上。
    const failedTurnUsageRecords = [
      ...(compactionUsage
        ? [{
            callId:
              typeof compactionUsage.provider_call_id === "string" &&
              compactionUsage.provider_call_id.trim()
                ? compactionUsage.provider_call_id.trim()
                : crypto.randomUUID(),
            usage: compactionUsage,
            model: agentConfig.model || "unknown",
            ...(agentConfig.provider ? { provider: agentConfig.provider } : {}),
          }]
        : []),
      ...usageRecords,
    ];
    const dialogId = await persistFailedLocalTurn({
      adapter: input.adapter,
      agentKey: agentConfig.key,
      messages: turnMessages,
      error: loopError,
      model: agentConfig.model,
      toolCallCount,
      partialContent,
      usage: contextUsage,
      accountingUsage: addOutOfBandUsage(turnUsage, compactionUsage),
      usageRecords: failedTurnUsageRecords,
      billingConfig,
      input,
    });
    attachDialogIdToError(loopError, dialogId);
    // 中断/失败的 turn 同样扣了费：把逐次调用证据带出去，调用方才能把这一轮
    // 计进会话累计。
    attachUsageRecordsToError(loopError, failedTurnUsageRecords);
    // 失败路径同样落盘计时数据，避免中断时丢失已收集的相位。
    await loopTimingFlush();
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
    messages.push({
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
  const turnMessages = applyPersistedTurnInput(
    messages.slice(turnStartIndex),
    input.persistedInput,
    input.persistedInputReference,
  );
  if (compactionUsage && Object.keys(compactionUsage).length > 0) {
    usageRecords.unshift({
      callId:
        typeof compactionUsage.provider_call_id === "string" &&
        compactionUsage.provider_call_id.trim()
          ? compactionUsage.provider_call_id.trim()
          : crypto.randomUUID(),
      usage: compactionUsage,
      model: agentConfig.model || result.model || "unknown",
      ...(agentConfig.provider ? { provider: agentConfig.provider } : {}),
    });
  }
  const accountingUsage = addOutOfBandUsage(turnUsage, compactionUsage);
  loopTimingMark("saveTurnStart", round);
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
  loopTimingMark("saveTurn", round);
  await loopTimingFlush();

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
