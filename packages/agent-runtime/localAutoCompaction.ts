import type { ContextCompactionFailure, ContextCompactionOutcome } from "./contextRefusal";
import { isTruncatedCompletion, summaryCompletionTokens } from "../ai/context/summaryContract";
import { createSummaryBudget, classifySummaryError, runSummaryWithContract, type SummaryCompletion } from "../ai/context/summaryRouting";
import { isQuotaExhaustedError } from "../ai/chat/parseApiError";
import { isAbortError } from "../core/abortError";
/**
 * localLoop 自动上下文压缩。
 *
 * 复用 web 端 `planCompression` 纯决策，在 CLI/桌面本地路径上：
 * 1) 判定是否需要压缩；2) 用当前 provider 生成事实性摘要；3) 摘要落盘；
 * 4) 把发给 provider 的历史投影为「摘要 + 保留尾部」。
 *
 * 硬约束：摘要只在压缩点生成一次并持久化。压缩点之间前缀必须稳定，
 * 否则会打掉 provider 前缀缓存（实测比不压缩更贵）。
 */

import { resolveProviderInputItemLimit } from "./providerInputItemLimits";
import { randomUUID } from "node:crypto";
import type { ContextProvenance } from "./providerCallTelemetry";
import { PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL } from "../ai/llm/platformHostedRoutingTable";
import { sha256Hex } from "../core/sha256";

import { planCompression, getMessageTokenCount, resolveEffectiveCompactionBudgets } from "../ai/context/planCompression";
import { getModelContextWindow } from "../ai/llm/getModelContextWindow";
import { estimateTokenCount } from "../ai/context/tokenUtils";
import { canonicalizeToolName } from "./toolNameAliases";
import {
  COMPACTION_SUMMARY_SYSTEM_PROMPT,
  COMPACTION_SUMMARY_SCHEMA_VERSION,
  computeSummarySourceMetadata,
  buildBoundedCompactionRequest,
  buildCompactionMetricsFromPlan,
  formatCompactionMetricsLog,
  type CompactionMetrics,
} from "../ai/context/compactionShared";
import type {
  AgentRuntimeHostAdapter,
  AgentRuntimeProvider,
} from "./hostAdapter";
import { buildDialogSummaryLayer } from "./turnContext";
import type { AgentRuntimeChatMessage, AgentRuntimeResult } from "./types";
import { normalizeUsage } from "../ai/token/normalizeUsage";
import { prepareHistoryForNextTurn, composeProviderMessages } from "./providerMessageProjection";
import { emitLoopEvent } from "./toolCallTransaction";
import { extractReferenceKeysFromMessage } from "../chat/dialog/actions/extractReferenceKeys";
import type { LocalLoopObservationBoundary } from "./observationStream";
import type { AgentExecutionObservationEvent } from "./executionObservation";
import type { AgentRuntimeMessageContent } from "./types";

/** planCompression 实际读取的字段（见 packages/ai/context/planCompression.ts）。 */
export type PlanCompressionBridgeMessage = {
  id: string;
  role: AgentRuntimeChatMessage["role"];
  content: AgentRuntimeChatMessage["content"];
  tool_calls?: AgentRuntimeChatMessage["tool_calls"];
  tool_call_id?: string;
};

/**
 * 保留向下兼容的 re-export：外部可能仍 import LOCAL_AUTO_COMPACTION_SYSTEM_PROMPT
 * 或 FileOperation，统一指向共享模块的同名常量。
 */
export { COMPACTION_SUMMARY_SYSTEM_PROMPT as LOCAL_AUTO_COMPACTION_SYSTEM_PROMPT } from "../ai/context/compactionShared";

/**
 * AgentRuntimeChatMessage → planCompression 输入桥接。
 * 只映射判定所需字段：id / role / content / tool_calls。
 * id 用稳定的位置索引（历史只追加不重排），以便 summarizedBeforeId 跨轮对齐。
 * P-1 后不再映射 usage.completion_tokens（getMessageTokenCount 从 content 估算）。
 */
export function toPlanCompressionMessages(
  history: AgentRuntimeChatMessage[],
): PlanCompressionBridgeMessage[] {
  return history.map((message, index) => ({
    id: typeof message.id === "string" && message.id.length > 0 ? message.id : `local-${index}`,
    role: message.role,
    content: message.content ?? "",
    ...(typeof message.tool_call_id === "string" ? { tool_call_id: message.tool_call_id } : {}),
    ...(Array.isArray(message.tool_calls)
      ? { tool_calls: message.tool_calls }
      : {}),
  }));
}

/**
 * 计算摘要锚点切片（summarizedBeforeId 及其之前的所有消息）的 SHA-256。
 * 用 JSON.stringify 后的内容寻址哈希做失效检测：历史被 fork/编辑/裁剪后，
 * 切片内容变化 → 重算哈希不匹配 → 摘要判无效。
 */
function findSummaryAnchorIndex(
  bridged: PlanCompressionBridgeMessage[],
  anchorId: string,
): number {
  const actual = bridged.findIndex((message) => message.id === anchorId);
  if (actual >= 0) return actual;
  const legacy = /^local-(0|[1-9]\d*)$/.exec(anchorId);
  if (!legacy) return -1;
  const index = Number(legacy[1]);
  return Number.isSafeInteger(index) && index < bridged.length ? index : -1;
}

export function hashSummarySourceSlice(
  history: AgentRuntimeChatMessage[],
  summarizedBeforeId?: string,
): string | undefined {
  if (!summarizedBeforeId) return undefined;
  const bridged = toPlanCompressionMessages(history);
  const found = findSummaryAnchorIndex(bridged, summarizedBeforeId);
  if (found === -1) return undefined;
  const slice = bridged.slice(0, found + 1).map((message, index) => ({
    id: `local-${index}`,
    role: message.role,
    content: message.content ?? "",
    ...(Array.isArray(message.tool_calls) ? { tool_calls: message.tool_calls } : {}),
  }));
  return sha256Hex(JSON.stringify(slice));
}

/**
 * 校验已持久化摘要的锚点是否仍与当前 canonical history 对齐。
 * 规则（仅当 stored.sourceHash 存在时生效）：
 *  - (v) stored.schemaVersion 已定义且 ≠ COMPACTION_SUMMARY_SCHEMA_VERSION → 无效
 *       （生成逻辑/投影格式改版，旧摘要需重建；字段缺失按 v1 处理）
 *  - (a) summarizedBeforeId 在当前历史找不到 → 无效
 *  - (b) 找得到但重算切片哈希 ≠ stored.sourceHash → 无效（历史被编辑）
 *  - (c) 当前 history.length < stored.sourceCount → 历史被裁剪 → 无效
 * 任一无效 → 返回 null（丢弃摘要，由决策层重新压缩）。
 * stored.sourceHash 缺失（旧记录）→ 返回 undefined（保持现有 findIndex 行为）。
 */
export function validateStoredSummary(args: {
  history: AgentRuntimeChatMessage[];
  stored: {
    summarizedBeforeId?: string;
    sourceHash?: string;
    sourceCount?: number;
    schemaVersion?: unknown;
  };
}): boolean | null | undefined {
  const { history, stored } = args;

  // (v) 生成逻辑版本位：字段存在（任意值）且 !== 当前版本 → 旧摘要失效。
  //     字段缺失（undefined）按 v1 处理不失效；畸形值（null / "2" / 非数字）
  //     等价于版本不匹配，同样判无效，避免静默当作 v1 信任。
  if (
    stored.schemaVersion !== undefined &&
    stored.schemaVersion !== COMPACTION_SUMMARY_SCHEMA_VERSION
  ) {
    return false;
  }

  const sourceHash = stored.sourceHash;
  if (typeof sourceHash !== "string" || !sourceHash) return undefined;

  // (c) 历史被裁剪：当前长度小于摘要锚点切片长度 → 锚点之前的消息必然不完整
  if (
    typeof stored.sourceCount === "number" &&
    history.length < stored.sourceCount
  ) {
    return false;
  }

  // (a) 锚点找不到 → 历史被重排/fork
  const bridged = toPlanCompressionMessages(history);
  const found = findSummaryAnchorIndex(bridged, stored.summarizedBeforeId ?? "");
  if (found === -1) return false;

  // (b) 哈希重算比对
  const recomputed = hashSummarySourceSlice(history, stored.summarizedBeforeId);
  if (recomputed === undefined) return false;
  if (recomputed !== sourceHash) return false;

  return true;
}

export function buildLocalSummaryHistoryMessage(
  summary: string,
): AgentRuntimeChatMessage {
  const layer = buildDialogSummaryLayer({ summary });
  return {
    role: "user",
    content:
      layer?.content ??
      `--- 历史对话摘要 ---\n${summary.trim()}`,
  };
}

export function projectHistoryWithSummary(args: {
  history: AgentRuntimeChatMessage[];
  summary: string;
  summarizedBeforeId?: string;
}): AgentRuntimeChatMessage[] {
  const bridged = toPlanCompressionMessages(args.history);
  let startIndex = 0;
  if (args.summarizedBeforeId) {
    const found = findSummaryAnchorIndex(bridged, args.summarizedBeforeId);
    if (found !== -1) startIndex = found + 1;
  }

  const projected = args.history.slice(startIndex);
  // Re-inject only the latest user message in the entire history, and only
  // when the cursor covers it. A newer user in the suffix supersedes it.
  let latestUser = -1;
  for (let i = args.history.length - 1; i >= 0; i--) {
    if (args.history[i].role === "user") { latestUser = i; break; }
  }
  const preservedUser = latestUser >= 0 && latestUser < startIndex
    ? [args.history[latestUser]] : [];

  const summaryMsg =
    args.summary.trim().length > 0
      ? [buildLocalSummaryHistoryMessage(args.summary)]
      : [];
  return [...summaryMsg, ...preservedUser, ...projected];
}

/**
 * 认为 provider 前缀缓存已过期的静默时长。
 *
 * 取值偏保守：误判为「已过期」会生成新摘要、改变前缀，把本来还热的缓存毁掉。
 * 常见 provider 的前缀缓存 TTL 在分钟到小时量级，取 60 分钟留足余量。
 */
export const COLD_RESUME_IDLE_MS = 60 * 60 * 1000;

/** 距最后一条带时间戳的历史消息是否已超过 COLD_RESUME_IDLE_MS。 */
export function isColdResume(
  history: AgentRuntimeChatMessage[],
  nowMs: number,
): boolean {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const at = history[i]?.createdAt;
    if (typeof at === "number" && Number.isFinite(at)) {
      return nowMs - at > COLD_RESUME_IDLE_MS;
    }
  }
  // 历史不带时间戳（旧记录或不支持的 host）→ 不触发，保持既有行为。
  return false;
}

export type LocalAutoCompactionFailureReason = "timeout" | "aborted" | "provider-error";

/**
 * 摘要 fallback 的形状（与 CLI `/compact` 的 `SummaryLlmCaller` 结构完全一致：
 * `(content: string) => Promise<string | null>`，失败/无额度返回 null）。
 *
 * 就地声明而不 `import` CLI 类型：agent-runtime 不能反向依赖 cli 包。CLI 侧
 * 直接把已有的 SummaryLlmCaller 实例按结构传进来即可，不需要适配层。
 */
export type LocalCompactionSummaryFallbackOptions = {
  signal?: AbortSignal;
  deadlineMs?: number;
  attemptId?: string;
  maxOutputTokens?: number;
};

/** One optional argument preserves compatibility with existing one-parameter callers. */
export type LocalCompactionSummaryFallback = ((
  content: string,
  options?: LocalCompactionSummaryFallbackOptions,
) => Promise<string | null>) & {
  /** Host-owned authenticated balance check; unknown/zero must return false. */
  preferPlatform?: (options?: LocalCompactionSummaryFallbackOptions) => Promise<boolean>;
  complete?: (content: string, options?: LocalCompactionSummaryFallbackOptions) => Promise<SummaryCompletion>;
};

/**
 * A routed host picks exactly one summary channel before sending: the platform
 * channel when the host admits it, otherwise the current text-only provider.
 * The chosen channel is the only request — a timeout / empty / error result is
 * never retried on another model, which is what produced repeated paid summary
 * calls. Cancellation stays terminal.
 */
export async function completeRoutedCompactionSummary(args: {
  fallback: LocalCompactionSummaryFallback;
  content: string;
  options: LocalCompactionSummaryFallbackOptions;
  current: () => ReturnType<AgentRuntimeProvider["complete"]>;
}): Promise<AgentRuntimeResult & { summaryCompletion?: SummaryCompletion }> {
  const budget = createSummaryBudget({ mode: "automatic", signal: args.options.signal, deadlineMs: args.options.deadlineMs });
  try {
    const options = { ...args.options, signal: budget.signal, deadlineMs: budget.deadlineMs };
    const eligible = await budget.run(async () => {
      try { return await args.fallback.preferPlatform?.(options) === true; }
      catch (error) {
        if (budget.signal.aborted || isAbortError(error) || (error as any)?.name === "TimeoutError") throw error;
        return false;
      }
    });
    let currentResult: Awaited<ReturnType<AgentRuntimeProvider["complete"]>> | undefined;
    const result = await runSummaryWithContract({ budget,
      eligibility: { userId: "authenticated-account", authenticated: eligible, platformAvailable: eligible, credits: eligible ? 1 : undefined },
      platform: { model: PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL, provider: "nolo", attemptId: options.attemptId,
        run: async () => args.fallback.complete
          ? args.fallback.complete(args.content, options)
          : { text: await args.fallback(args.content, options) ?? "" } },
      current: { attemptId: options.attemptId, run: async () => {
        currentResult = await args.current();
        return { text: currentResult.content ?? "", finishReason: currentResult.finish_reason,
          maxOutputTokens: options.maxOutputTokens,
          completionTokens: summaryCompletionTokens(currentResult.usage) };
      } },
    });
    if (result.kind === "error" || result.kind === "cancelled") {
      throw Object.assign(new Error(result.error.message), result.error, { type: result.error.errorType,
        name: result.kind === "cancelled" ? "AbortError" : result.error.category === "timeout" ? "TimeoutError" : "SummaryError" });
    }
    if (result.kind === "truncated") throw { code: "SUMMARY_TRUNCATED", stage: "decode",
      finishReason: result.completion?.finishReason,
      maxOutputTokens: result.completion?.maxOutputTokens ?? options.maxOutputTokens,
      completionTokens: result.completion?.completionTokens, outputChars: result.completion?.text.length,
      responseStatus: result.completion?.responseStatus, incompleteReason: result.completion?.incompleteReason,
      model: result.route === "platform" ? PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL : currentResult?.model,
      provider: result.route === "platform" ? "nolo" : currentResult?.provider };
    return result.route === "current" && currentResult ? { ...currentResult, summaryCompletion: result.completion } : {
      content: result.kind === "success" ? result.text : "", model: PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL, provider: "nolo",
      summaryCompletion: result.completion,
    };
  } finally { budget.dispose(); }
}

// Bounded per-dialog retry suppression.
//
// After a summary request fails (timeout / provider error) the same dialog must
// not re-pay the whole deadline on every following round: that is what produced a
// repeated 60s stall with no progress. Module scope is deliberate — the compaction
// controller is rebuilt per turn, while the pain being fixed is exactly the
// cross-turn repeat. Entries expire on read and the map is capped, so it cannot
// grow without bound.
//
// The clock is always the caller's injected `now`, never `Date.now()`: mixing the
// two made an injected-clock round read a wall-clock deadline and stay suppressed
// forever.
const COMPACTION_RETRY_BACKOFF_MS = 60_000;
const COMPACTION_RETRY_BACKOFF_MAX_ENTRIES = 256;
const compactionRetryBackoff = new Map<string, number>();

/**
 * 测试专用：恢复生产默认的摘要重试退避（3s / 8s）。
 *
 * 在**用例级 hook** 里成对设置/恢复（`beforeEach` 设、`afterEach` 清），禁止在模块
 * 顶层设。原因不是风格，是 bun 的求值与 hook 语义：
 *   - override 是模块级状态，而 bun 在同一进程内跨文件共享模块注册表；
 *   - `-t` 过滤下，一个「命中 0 个用例」的文件**仍会求值其顶层**，但任何 hook
 *     （含 `afterAll`）都不会执行。
 * 于是顶层 setter 必然把状态留给后续文件，而污染是**静默**的：邻居用例仍绿，只是
 * 不再验证真实退避（实测从 11.16s 变成 7.88ms）。用例级 hook 把状态存活窗口从
 * 「整个进程」收窄到「本文件用例执行中」，这才是可被结构保证的不变量——
 * 「记得收尾」不是。
 */
export function resetCompactionRetryDelaysForTests(): void {
  compactionRetryDelaysOverride = undefined;
}

/**
 * 测试专用：读出当前生效的退避表（生产默认或覆盖值）。
 *
 * 存在的理由：跨文件污染是**静默**的（用例仍绿，只是不再验证真实退避），所以测试
 * 需要能断言「状态已回到默认」，而不是假设它回去了。返回副本，避免调用方改到内部
 * 数组（交活引用会让一次误改传播到后续所有用例）。
 */
export function readCompactionRetryDelaysForTests(): readonly number[] {
  return [...(compactionRetryDelaysOverride ?? COMPACTION_RETRY_DELAYS_MS)];
}

/** 生产默认：首次重试等 3s，其后 8s。 */
const COMPACTION_RETRY_DELAYS_MS = [3_000, 8_000] as const;
let compactionRetryDelaysOverride: number[] | undefined;

function compactionRetryDelayMs(retryCount: number): number {
  const table = compactionRetryDelaysOverride ?? COMPACTION_RETRY_DELAYS_MS;
  return table[Math.min(retryCount, table.length - 1)];
}

function isCompactionBackedOff(dialogId: string, now: number): boolean {
  for (const [key, until] of compactionRetryBackoff) {
    if (until <= now) compactionRetryBackoff.delete(key);
  }
  const until = compactionRetryBackoff.get(dialogId);
  return until !== undefined && until > now;
}

function recordCompactionFailure(dialogId: string, now: number): void {
  compactionRetryBackoff.delete(dialogId);
  while (compactionRetryBackoff.size >= COMPACTION_RETRY_BACKOFF_MAX_ENTRIES) {
    const oldest = compactionRetryBackoff.keys().next().value;
    if (oldest === undefined) break;
    compactionRetryBackoff.delete(oldest);
  }
  compactionRetryBackoff.set(dialogId, now + COMPACTION_RETRY_BACKOFF_MS);
}

/**
 * 测试专用：模块级退避状态必须能在用例之间归零。否则前一个用例的失败会静默压住
 * 后一个用例（实测：一次超时用例让无关的 5c 用例不再触发压缩）。
 */
export function resetCompactionRetryBackoffForTests(): void {
  compactionRetryBackoff.clear();
}

/**
 * 测试专用：摘要重试的退避时长（生产默认 3s / 8s，见 COMPACTION_RETRY_DELAYS_MS）。
 *
 * 为什么需要它：断言「摘要通道持续忙时会耗尽 3 次物理请求」的用例必须真的等完
 * 3s + 8s（约 11s），单个文件因此从 ~2s 涨到 33s。这不是正确性问题，但把 CI 时间
 * 花在等待常量上是纯浪费。
 *
 * 传 undefined 恢复生产默认。刻意做成模块级 setter 而不是函数入参：入参要穿过
 * localLoop → controller 的调用链，扩大生产签名面；而测试钩子在本模块已有先例
 * （resetCompactionRetryBackoffForTests）。
 */
export function setCompactionRetryDelaysForTests(delays?: readonly number[]): void {
  compactionRetryDelaysOverride = delays && delays.length > 0 ? [...delays] : undefined;
}
export type LocalAutoCompactionPhase =
  | { kind: "validating-context" }
  | { kind: "compaction-start" }
  /** attempt is the upcoming 1-based physical request ordinal (2/3), not a retry count. */
  | { kind: "compaction-retry"; attempt: number; maxAttempts: number }
  | { kind: "waiting-provider" }
  | { kind: "compaction-end" }
  | { kind: "compaction-failed"; reason: LocalAutoCompactionFailureReason };

export type LocalAutoCompactionResult = {
  /** Identity of the summary actually projected, not storage/coverage proof. */
  selectedSummary?: ContextProvenance["summary"];
  history: AgentRuntimeChatMessage[];
  /** True when history was projected through a (new or existing) summary. */
  compressed: boolean;
  /** True only when this call generated and persisted a new summary. */
  summaryGenerated: boolean;
  /**
   * 摘要生成那次 LLM 调用的用量。必须透出并由调用方并入本轮 turnUsage——
   * 否则这次消耗只出现在 provider 账单上，我们自己的 token 记账完全看不到，
   * 形成计费盲区（本轮改动的主题恰恰是成本可观测）。
   */
  usage?: Record<string, unknown>;
  /** P1-8: 压缩 metrics（仅在 summaryGenerated=true 时有值） */
  metrics?: CompactionMetrics;
  /** Estimated from the actual projected history; not a provider token guarantee. */
  withinSafetyBudget?: boolean;
  /**
   * 压缩观测事件字段（可选，能映射就映射、拿不到就不给，禁止为凑数重计算）。
   * 全部复用已有 CompactionMetrics 口径，与 executionObservation
   * 的 compaction 事件直接对齐。
   */
  reason?: "context_budget" | "cold_resume" | "invalid_summary";
  /** 压缩前估算 token（before = previousSummary + compressed）。 */
  beforeTokens?: number;
  /** 压缩后估算 token（after = newSummary + retained）。 */
  afterTokens?: number;
  /** 压缩省下的估算 token（before - after）。 */
  savedTokens?: number;
  /**
   * 压缩决策命中但执行失败（目前是摘要 LLM 调用失败）时的简述。
   * 调用方据此发「压缩失败」观测事件——失败不能只有 console.warn，
   * 否则用户侧表现为「超限了也没压缩」且无任何线索。
   */
  failureMessage?: string;
  /** Stable machine-readable failure classification. */
  failureReason?: LocalAutoCompactionFailureReason;
  /** Sanitized machine fields only; never provider response bodies. */
  failure?: ContextCompactionFailure;
  /**
   * 决策可观测：本次调用的判定结果与「为什么没压缩」。
   * 每个返回路径都必须填充（unchanged / projectExisting / compressed / failed），
   * 调用方据此发结构化跳过/触发观测——否则「该压没压」只有症状没有原因。
   */
  decision: LocalCompactionDecision;
};

/** 自动压缩未生成新摘要的结构化原因。 */
export type LocalCompactionSkipReason =
  /** 无 dialogId（新对话首轮）：持久化锚点不存在，压缩管线整体跳过。 */
  | "no-dialog-id"
  /** 历史为空，无可压缩内容。 */
  | "empty-history"
  /** host adapter 未实现 loadDialogSummary/saveDialogSummary。 */
  | "adapter-missing-summary-methods"
  /** 读取已持久化摘要抛错。 */
  | "load-summary-failed"
  /** 决策层判定未过线：真实占用与估算都在预算内（附估算/预算/触发线快照）。 */
  | "below-trigger"
  /** 已触发但可压缩条数低于 MIN_COMPRESS_COUNT，不值得压。 */
  | "below-min-compress-count"
  /** 锚点之后没有待处理消息。 */
  | "no-safe-prefix"
  | "no-pending"
  /** 触发且调用了摘要模型，但返回空摘要。 */
  | "summary-empty"
  /** 上一次摘要失败后的退避窗口内，本轮不再重试摘要（没有发起请求，不是新失败）。 */
  | "retry-backoff"
  | "bounded-request-blocked"
  | "unsafe-projection";

type LocalCompactionItemDiagnostics = {
  itemCount?: number;
  maxInputItems?: number;
  triggeredByItemLimit?: boolean;
  projectedItemCount?: number;
};

export type LocalCompactionDecision = LocalCompactionItemDiagnostics & (
  | {
      outcome: "compressed";
      /** 触发依据：real-usage / estimate / cold-resume / invalid-summary / existing-summary（复用已持久化摘要投影）。 */
      trigger:
        | "item-limit"
        | "real-usage"
        | "estimate"
        | "cold-resume"
        | "invalid-summary"
        | "existing-summary";
      estimatedTokens?: number;
      historyBudget?: number;
      realUsageRatio?: number;
      triggerRatio?: number;
    }
  | {
      outcome: "skipped";
      skipReason: LocalCompactionSkipReason;
      detail?: string;
      estimatedTokens?: number;
      historyBudget?: number;
      realUsageRatio?: number;
      triggerRatio?: number;
      pendingMsgCount?: number;
      compressCount?: number;
    }
  | { outcome: "failed"; reason: LocalAutoCompactionFailureReason; detail: string; estimatedTokens?: number; historyBudget?: number });

export async function maybeAutoCompactLocalHistory(args: {
  adapter: AgentRuntimeHostAdapter;
  /** Per physical request, including usage returned with a rejection; never synthesized. */
  onAttemptUsage?: (usage: Record<string, unknown>) => void;
  dialogId?: string;
  /** 可注入的退避时钟，供测试保持确定性。 */
  now?: () => number;
  history: AgentRuntimeChatMessage[];
  contextReferenceResolver?: (reference: AgentRuntimeMessageContent) => boolean;
  model?: string;
  provider?: string | null;
  providerEndpoint?: string | null;
  /** Lazy provider resolver — only invoked when a new summary must be generated. */
  resolveProvider: () => Promise<AgentRuntimeProvider>;
  /** Test override; production uses getModelContextWindow(model). */
  contextWindow?: number;
  /**
   * 上一次调用 provider 侧真实上下文占用（0..1 比例，如 Math.min(1, inputTokens / contextWindow)）。
   * planCompression 据此在真实占用 ≥0.9 时强制触发，绕过本地启发式历史估算偏低导致的 400 溢出。
   */
  realContextUsagePercent?: number;
  /** Omitted preserves historical behavior for direct callers. */
  timeoutMs?: number;
  /**
   * 强制压缩：仅用于「预算裁剪已经要丢消息、再丢就得拒发」的失败路径
   * （localLoop 的 LocalContextCoverageError 之前）。只在确实有可压内容
   * （pendingMsgCount > 0）时生效，不改变健康路径的触发时机与缓存前缀。
   */
  force?: boolean;
  /** Evaluate the complete current request after applying the stored summary. */
  requestOverBudget?: (history: AgentRuntimeChatMessage[]) => boolean;
  availableHistoryTokens?: number;
  abortSignal?: AbortSignal;
  /**
   * 摘要通道选择器（可选）。带 `preferPlatform` 时，先在发送前做一次平台准入
   * （未知余额不放行），再在「平台通道」与「当前 text-only provider」之间二选一，
   * 且只发一次请求；不带该字段的普通函数不再作为二次 fallback 调用（一次自动
   * 压缩严格一次摘要请求）。desktop / 未注入 → 保持既有 fail-open 行为，不新建
   * 第二条摘要通道。
   */
  summaryFallback?: LocalCompactionSummaryFallback;
  /** Lifecycle only: no prompt, summary, or message content is exposed. */
  onPhase?: (phase: LocalAutoCompactionPhase) => void;
}): Promise<LocalAutoCompactionResult> {
  const { adapter, dialogId, history } = args;
  const emitPhase = (phase: LocalAutoCompactionPhase) => {
    try { args.onPhase?.(phase); } catch { /* observation is fail-open */ }
  };
  emitPhase({ kind: "validating-context" });
  const unchanged = (
    decision: LocalCompactionDecision,
  ): LocalAutoCompactionResult => ({
    history,
    compressed: false,
    summaryGenerated: false,
    decision,
  });

  if (!dialogId) {
    // 新对话首轮：dialogId 尚未分配，持久化锚点不存在，整条压缩管线跳过。
    // 这是长首轮（多轮工具循环灌水）零保护窗口，必须以观测事件透出。
    return unchanged({ outcome: "skipped", skipReason: "no-dialog-id" });
  }
  if (history.length === 0) {
    return unchanged({ outcome: "skipped", skipReason: "empty-history" });
  }
  if (
    typeof adapter.loadDialogSummary !== "function" ||
    typeof adapter.saveDialogSummary !== "function"
  ) {
    return unchanged({
      outcome: "skipped",
      skipReason: "adapter-missing-summary-methods",
    });
  }

  let stored: {
    summary: string;
    summarizedBeforeId?: string;
    sourceHash?: string;
    sourceCount?: number;
    schemaVersion?: unknown;
  } | null = null;
  try {
    stored = await adapter.loadDialogSummary(dialogId);
  } catch (error) {
    console.warn("[localLoop] loadDialogSummary failed:", error);
    return unchanged({
      outcome: "skipped",
      skipReason: "load-summary-failed",
    });
  }

  // 摘要锚点内容寻址校验：sourceHash 存在时，若历史被 fork/编辑/裁剪导致
  // 重算哈希不匹配或锚点失效，判摘要无效并丢弃，走「无摘要」
  // 路径由决策层重新压缩——否则 findIndex 落空会把投影退化成
  // 「摘要 + 全量历史」（比不压缩更贵）。旧记录缺 sourceHash → 保持原行为。
  // 此外 schemaVersion 已定义且不等于当前版本 → 生成逻辑改版，旧摘要同样判无效。
  const bridged = toPlanCompressionMessages(history);
  const validation = validateStoredSummary({ history, stored: stored ?? {} });
  // 摘要校验失效（sourceHash 失配 / schemaVersion 改版 / 锚点缺失 / 历史裁剪）触发的
  // 重新压缩与普通预算压缩在观测语义上不可混淆，须透传 invalid_summary 原因。
  const invalidSummary = validation === false;
  // validation===false 时 stored 必非 null（schemaVersion 不匹配或 sourceHash 校验失败均需有 stored）
  const invalidStored = stored as NonNullable<typeof stored>;
  if (validation === false) {
    let reason: string;
    if (
      invalidStored?.schemaVersion !== undefined &&
      invalidStored.schemaVersion !== COMPACTION_SUMMARY_SCHEMA_VERSION
    ) {
      reason = "schema-version-mismatch";
    } else if (
      typeof invalidStored?.summarizedBeforeId !== "string" ||
      !bridged.some((m) => m.id === invalidStored.summarizedBeforeId)
    ) {
      reason = "anchor-not-found";
    } else if (
      typeof invalidStored?.sourceCount === "number" &&
      history.length < invalidStored.sourceCount
    ) {
      reason = "history-trimmed";
    } else {
      reason = "hash-mismatch";
    }
    console.warn(
      `[localLoop] invalidated dialog summary for ${dialogId} (${reason}); discarding and re-compressing`,
      // 诊断分项（**仅加日志，不改任何哈希/校验/重锚语义**）：区分「历史真被改写」
      // 与「保存/重算口径不一致」。只记长度、条数、消息 id 与哈希前 8 位；
      // 消息正文与摘要正文一律不进日志。重算哈希只发生在失效分支内，
      // 健康路径零额外开销。
      {
        reason,
        historyLength: history.length,
        storedSourceCount: typeof invalidStored?.sourceCount === "number" ? invalidStored.sourceCount : null,
        summarizedBeforeId:
          typeof invalidStored?.summarizedBeforeId === "string" ? invalidStored.summarizedBeforeId : null,
        recomputedHashPrefix:
          hashSummarySourceSlice(history, invalidStored?.summarizedBeforeId)?.slice(0, 8) ?? null,
        storedHashPrefix:
          typeof invalidStored?.sourceHash === "string" && invalidStored.sourceHash
            ? invalidStored.sourceHash.slice(0, 8)
            : null,
      },
    );
    stored = null;
  }

  const existingSummary =
    typeof stored?.summary === "string" ? stored.summary : "";
  const summarizedBeforeId =
    typeof stored?.summarizedBeforeId === "string"
      ? stored.summarizedBeforeId
      : undefined;
  const legacyAnchorIndex = summarizedBeforeId
    ? findSummaryAnchorIndex(bridged, summarizedBeforeId)
    : -1;
  const planAnchorId =
    summarizedBeforeId && /^local-(0|[1-9]\d*)$/.test(summarizedBeforeId) && legacyAnchorIndex >= 0
      ? bridged[legacyAnchorIndex]!.id
      : summarizedBeforeId;

  const contextWindow =
    typeof args.contextWindow === "number" &&
    Number.isFinite(args.contextWindow) &&
    args.contextWindow > 0
      ? args.contextWindow
      : getModelContextWindow(args.model ?? "");

  // Budget the stable send projection, but retain canonical messages for
  // summary source hashes, anchors and actual compaction input.
  const allMsgs = toPlanCompressionMessages(prepareHistoryForNextTurn(history, args.contextReferenceResolver));
  const maxInputItems = resolveProviderInputItemLimit({ provider: args.provider, endpoint: args.providerEndpoint });
  const force = args.force === true || args.requestOverBudget?.(
    existingSummary ? projectHistoryWithSummary({ history, summary: existingSummary, summarizedBeforeId }) : history,
  ) === true;
  const plan = planCompression({
    allMsgs: allMsgs as any,
    summarizedBeforeId: planAnchorId,
    summary: existingSummary,
    contextWindow,
    // 失败路径补救：预算裁剪即将丢消息时由 localLoop 传入 force，交由 planCompression
    // 的既有 force 语义产出待压缩切片（仍受最小条数/安全前缀约束）。
    force,
    ...(force ? { reason: "budget_rescue" as const } : {}),
    availableHistoryTokens: args.availableHistoryTokens,
    preserveLatestUserByProjection: true,
    maxInputItems,
    ...(args.realContextUsagePercent !== undefined
      ? { realContextUsagePercent: args.realContextUsagePercent }
      : {}),
  });

  const itemDiagnostics: LocalCompactionItemDiagnostics = maxInputItems !== undefined ? {
    itemCount: plan.diagnostics?.itemCount,
    maxInputItems,
    triggeredByItemLimit: plan.diagnostics?.triggeredByItemLimit,
  } : {};

  const projectExisting = (): LocalAutoCompactionResult => {
    const diag = plan.diagnostics;
    const diagSnapshot = diag
      ? {
          ...itemDiagnostics,
          estimatedTokens: diag.totalUsed,
          historyBudget: diag.historyBudget,
          triggerRatio: diag.triggerRatio,
          ...(diag.realUsageRatio !== undefined
            ? { realUsageRatio: diag.realUsageRatio }
            : {}),
        }
      : {};
    const skippedDecision: LocalCompactionDecision = {
      outcome: "skipped",
      skipReason:
        diag?.emptyReason === "no-pending"
          ? "no-pending"
          : diag?.emptyReason === "below-min-compress-count"
            ? "below-min-compress-count"
            : diag?.emptyReason === "no-safe-prefix"
              ? "no-safe-prefix"
              : "below-trigger",
      ...diagSnapshot,
      ...(diag ? { pendingMsgCount: diag.pendingMsgCount } : {}),
      ...(diag?.compressCount !== undefined
        ? { compressCount: diag.compressCount }
        : {}),
    };
    // 有已持久化摘要时统一走投影；无摘要保持原样。
    if (!existingSummary.trim()) return unchanged(skippedDecision);
    return {
      history: projectHistoryWithSummary({
        history,
        summary: existingSummary,
        summarizedBeforeId,
      }),
      compressed: true,
      summaryGenerated: false,
      selectedSummary: { outcome: "loaded", hash: sha256Hex(existingSummary),
        ...(summarizedBeforeId ? { anchorId: summarizedBeforeId } : {}),
        ...(stored?.sourceHash ? { sourceHash: stored.sourceHash } : {}),
        ...(stored?.sourceCount !== undefined ? { sourceCount: stored.sourceCount } : {}),
      },
      decision: {
        outcome: "compressed",
        trigger: "existing-summary",
        ...diagSnapshot,
      },
    };
  };

  if (!plan.shouldCompress) {
    return projectExisting();
  }
  const retryNow = args.now?.() ?? Date.now();
  if (isCompactionBackedOff(dialogId, retryNow)) {
    // 退避窗口内的一轮：历史仍按已持久化摘要投影，但**不**报新的失败——这一轮
    // 没有发起任何请求，把它记成 provider 失败既是谎报，也让用户每轮都看到重复
    // 的失败提示（退避要消除的正是这个噪音）。首次失败那一轮照旧如实上报。
    const projected = projectExisting();
    const diag = plan.diagnostics;
    return {
      ...projected,
      decision: {
        outcome: "skipped",
        skipReason: "retry-backoff",
        ...(diag
          ? {
              ...itemDiagnostics,
              estimatedTokens: diag.totalUsed,
              historyBudget: diag.historyBudget,
              triggerRatio: diag.triggerRatio,
              ...(diag.realUsageRatio !== undefined
                ? { realUsageRatio: diag.realUsageRatio }
                : {}),
            }
          : {}),
      },
    };
  }

  const msgsToCompress = plan.msgsToCompress as PlanCompressionBridgeMessage[];
  const bounded = buildBoundedCompactionRequest({
    msgsToCompress,
    previousSummary: existingSummary,
    contextWindow,
    canonicalizeToolName,
  });
  if (bounded.status === "blocked") {
    const detail = `bounded compaction blocked: ${bounded.reason}`;
    // 数值分项只用于定位「哪一项撑爆」：不含消息正文，也不含路径内容
    // （fileOps 只给条数）。detail 保持原样，诊断走日志第二参数。
    console.warn(
      `[localLoop] ${detail}`,
      ...(bounded.diagnostics ? [bounded.diagnostics] : []),
    );
    return {
      ...projectExisting(),
      decision: { outcome: "skipped", skipReason: "bounded-request-blocked", detail },
    };
  }

  emitPhase({ kind: "compaction-start" });
  // 压缩观测（**仅日志**）：attemptId 把 compaction attempt 关联到
  // provider/transport 的 requestId；primary/save 分段耗时用于区分
  // 「主通道等待 vs 保存」——现有 elapsedMs 只在成功路径、且含义是
  // 「主通道请求前 → 保存完成后」的总时长，原义保持不变。
  // fallbackElapsedMs 恒为 null（单通道契约：没有 fallback 阶段），保留字段
  // 仅为兼容既有日志消费方。这些值绝不进 prompt、摘要、持久化历史或 schema。
  let compactionAttemptId = randomUUID();
  const maxAttempts = 3;
  // Shared ordinal: timing identifies the current physical request (1/2/3); a retry
  // event announces the upcoming request (2/3), whose timing uses that number.
  let attempt = 0;
  let retryCount = 0;
  let attemptRoute: "platform" | "current" = "current";
  let attemptTimingLogged = false;
  let compactionT0 = Date.now();
  // token 估算口径与改动前的成功埋点一致：旧实现在日志对象字面量里求值，因此
  // elapsedMs 含这两次 estimateTokenCount。这里改为在 logCompactionTiming 内
  // 惰性求值：成功路径落在计时窗口内（elapsedMs 求值之前），失败路径在失败时算。
  let compactionInputTokens: number | undefined;
  let compactionPrevSummaryTokens: number | undefined;
  let compactionInputSource: string | undefined;
  let compactionPrevSummarySource: string | undefined;
  let primaryElapsedMs: number | undefined;
  let fallbackElapsedMs: number | undefined;
  let saveElapsedMs: number | undefined;
  let summaryDeadlineMs = Infinity;
  let summaryModel = args.model;
  let summaryProvider = args.provider;
  let summaryDiagnostics: { finishReason?: string; maxOutputTokens?: number; completionTokens?: number; outputChars?: number; responseStatus?: string; incompleteReason?: string } = {
    maxOutputTokens: bounded.outputTokenBudget,
  };
  const logCompactionTiming = (
    outcome: "success" | "empty" | LocalAutoCompactionFailureReason,
    fields: { model?: string | null; outputChars?: number },
  ) => {
    if (attemptTimingLogged) return;
    attemptTimingLogged = true;
    // 惰性估算：与旧成功埋点同口径（估算在 elapsedMs 求值之前完成）。
    if (compactionInputTokens === undefined && compactionInputSource !== undefined) {
      compactionInputTokens = estimateTokenCount(compactionInputSource);
    }
    if (compactionPrevSummaryTokens === undefined && compactionPrevSummarySource !== undefined) {
      compactionPrevSummaryTokens = estimateTokenCount(compactionPrevSummarySource);
    }
    console.log(
      `[compaction-timing] ${JSON.stringify({
        attemptId: compactionAttemptId,
        attempt, maxAttempts, physicalAttempts: attempt, route: attemptRoute,
        model: fields.model ?? summaryModel ?? null,
        provider: summaryProvider ?? null,
        inputTokens: compactionInputTokens ?? null,
        prevSummaryTokens: compactionPrevSummaryTokens ?? null,
        outputChars: summaryDiagnostics.outputChars ?? fields.outputChars ?? null,
        finishReason: summaryDiagnostics.finishReason ?? null,
        responseStatus: summaryDiagnostics.responseStatus ?? null,
        incompleteReason: summaryDiagnostics.incompleteReason ?? null,
        maxOutputTokens: summaryDiagnostics.maxOutputTokens ?? null,
        completionTokens: summaryDiagnostics.completionTokens ?? null,
        elapsedMs: Date.now() - compactionT0,
        primaryElapsedMs: primaryElapsedMs ?? null,
        fallbackElapsedMs: fallbackElapsedMs ?? null,
        saveElapsedMs: saveElapsedMs ?? null,
        outcome,
      })}`,
    );
  };
  try {
    if (args.abortSignal?.aborted) {
      throw Object.assign(new Error("auto-compaction aborted"), { compactionReason: "aborted" as const });
    }
    const promptContent = bounded.promptContent;
    emitPhase({ kind: "waiting-provider" });
    // 只记估算源（惰性求值见 logCompactionTiming 注释）：不在计时起点之前消耗
    // CPU，保证成功路径 elapsedMs 与改动前同口径。
    compactionInputSource = promptContent;
    compactionPrevSummarySource = existingSummary;
    // 主通道计时起点（旧 elapsedMs 的起点，原义不变）。
    compactionT0 = Date.now();
    const timeoutMs = Math.min(60_000, typeof args.timeoutMs === "number" && Number.isFinite(args.timeoutMs) && args.timeoutMs > 0 ? args.timeoutMs : 60_000);
    const requestDeadlineMs = Date.now() + timeoutMs;
    summaryDeadlineMs = requestDeadlineMs;
    const requestController = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;
    if (args.abortSignal?.aborted) requestController.abort(args.abortSignal.reason);
    // Resolution (including text-only capability rejection) is a primary failure,
    // not a failure of the whole compaction: the turn stays fail-open and history
    // is retained. Race resolution and completion under the same guards.
    let currentOnly = false;
    // Equivalent to counting SummaryResult.attempts, but at the physical boundary:
    // reserve BEFORE invocation, including the platform-balance -> current hop.
    // This prevents even an internal route transition from exceeding the cap.
    const physicalRequest = async <T>(route: "platform" | "current", operation: () => Promise<T>): Promise<T> => {
      if (attempt >= maxAttempts) throw { code: "SUMMARY_ATTEMPT_LIMIT" };
      if (requestController.signal.aborted) throw requestController.signal.reason;
      attempt++;
      attemptRoute = route;
      attemptTimingLogged = false;
      compactionAttemptId = randomUUID();
      compactionT0 = Date.now();
      primaryElapsedMs = undefined;
      summaryDiagnostics = { maxOutputTokens: bounded.outputTokenBudget };
      try {
        const value = await operation();
        reportAttemptUsage(value);
        return value;
      } catch (error) {
        reportAttemptUsage(error);
        const safe = classifySummaryError(error);
        summaryDiagnostics = { ...summaryDiagnostics,
          finishReason: safe.finishReason, responseStatus: safe.responseStatus,
          incompleteReason: safe.incompleteReason, completionTokens: safe.completionTokens,
          outputChars: safe.outputChars, maxOutputTokens: safe.maxOutputTokens ?? bounded.outputTokenBudget };
        primaryElapsedMs = Date.now() - compactionT0;
        logCompactionTiming(safe.category === "cancelled" ? "aborted" : safe.category === "timeout" ? "timeout" : "provider-error", {});
        throw error;
      }
    };
    const currentRequest = async () => {
      currentOnly = true;
      const provider = await args.resolveProvider();
      summaryModel = provider.model ?? args.model;
      summaryProvider = args.provider;
      if (requestController.signal.aborted) throw requestController.signal.reason ?? new DOMException("Summary cancelled", "AbortError");
      try { return await physicalRequest("current", () => provider.complete(
        [{ role: "system", content: COMPACTION_SUMMARY_SYSTEM_PROMPT }, { role: "user", content: promptContent }],
        {
          signal: requestController.signal,
          timeoutMs: Math.max(1, requestDeadlineMs - Date.now()),
          // 仅日志用的 attempt id：让 compaction 埋点与 transport 诊断日志 /
          // 服务端 x-request-id 可对上，用于关联请求级证据。不进 prompt/摘要/持久化。
          requestId: compactionAttemptId,
          // Room for factual handoff, exact commands and file operations.
          max_tokens: bounded.outputTokenBudget,
          reasoning_effort: "low",
        },
      )); } catch (cause) {
        const safe = classifySummaryError(cause, { model: provider.model, provider: args.provider ?? undefined, attemptId: compactionAttemptId });
        throw Object.assign(new Error(safe.message), safe, { type: safe.errorType,
          name: safe.category === "cancelled" ? "AbortError" : safe.category === "timeout" ? "TimeoutError" : "SummaryError" });
      }
    };
    // Accounting is per physical request, not per successful compaction. Missing
    // provider usage stays unknown (no invented zero); late settlements still count.
    function reportAttemptUsage(value: unknown) {
      const usage = (value as { usage?: unknown } | undefined)?.usage;
      if (usage && typeof usage === "object") args.onAttemptUsage?.(usage as Record<string, unknown>);
    }
    const fallback = args.summaryFallback?.preferPlatform ? args.summaryFallback : undefined;
    // Pin admission across retries: busy never becomes a route/model failover.
    let eligibility: Promise<boolean> | undefined;
    const routedFallback = fallback ? Object.assign(
      async (content: string, options?: LocalCompactionSummaryFallbackOptions) => {
        summaryModel = PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL; summaryProvider = "nolo";
        return physicalRequest("platform", () => fallback(content, { ...options, attemptId: compactionAttemptId }));
      }, {
        preferPlatform: (options?: LocalCompactionSummaryFallbackOptions) =>
          eligibility ??= fallback.preferPlatform!(options),
        ...(fallback.complete ? { complete: async (content: string, options?: LocalCompactionSummaryFallbackOptions) => {
          summaryModel = PLATFORM_HOSTED_DEEPSEEK_FLASH_MODEL; summaryProvider = "nolo";
          return physicalRequest("platform", () => fallback.complete!(content, { ...options, attemptId: compactionAttemptId }));
        } } : {}),
      }) : undefined;
    const requestOnce = () => routedFallback && !currentOnly
      ? completeRoutedCompactionSummary({
          fallback: routedFallback, content: promptContent,
          options: { signal: requestController.signal, deadlineMs: requestDeadlineMs,
            attemptId: compactionAttemptId, maxOutputTokens: bounded.outputTokenBudget },
          current: currentRequest,
        })
      : currentRequest();
    const request = (async () => {
      for (;;) {
        try { return await requestOnce(); }
        catch (error) {
          const safe = classifySummaryError(error);
          // Explicit terminal errors win over any conflicting busy metadata.
          const terminal = isQuotaExhaustedError(safe.status ?? 0, safe.code, safe.errorType) || safe.category === "cancelled" || safe.category === "timeout"
            || ["PROVIDER_UNAVAILABLE", "SUMMARY_TRUNCATED", "INSUFFICIENT_BALANCE"].includes(safe.code ?? "")
            || safe.errorType === "insufficient_balance_error";
          const busy = !terminal && ((safe.category === "http" && (safe.status === 503 || safe.status === 429))
            || /^(capacity|overload(?:ed)?|rate[_-]?limit(?:ed)?)(?:[_-](?:error|exceeded))?$/i.test(safe.errorType ?? "")
            || ["PLATFORM_LLM_BUSY", "RATE_LIMIT", "CAPACITY", "OVERLOAD", "RESOURCE_EXHAUSTED"].includes(safe.code ?? ""));
          const delayMs = compactionRetryDelayMs(retryCount);
          // Reserve at least 5s for a useful attempt AFTER backoff; the original
          // request deadline and provider timeouts are never extended.
          if (!busy || attempt >= maxAttempts || requestController.signal.aborted
            || requestDeadlineMs - Date.now() < delayMs + 5000) throw error;
          primaryElapsedMs = Date.now() - compactionT0;
          logCompactionTiming("provider-error", {});
          emitPhase({ kind: "compaction-retry", attempt: attempt + 1, maxAttempts });
          await new Promise<void>((resolve, reject) => {
            const signal = requestController.signal;
            const cancel = () => { clearTimeout(timer); signal.removeEventListener("abort", cancel); reject(signal.reason); };
            const timer = setTimeout(() => { signal.removeEventListener("abort", cancel); resolve(); }, delayMs);
            signal.addEventListener("abort", cancel, { once: true });
            if (signal.aborted) cancel();
          });
          if (requestController.signal.aborted || requestDeadlineMs - Date.now() < 5000) throw error;
          retryCount++;
        }
      }
    })().then(
      (value) => ({ kind: "done" as const, value }),
      (error) => ({ kind: "provider-error" as const, error }),
    );
    const guards: Array<Promise<{ kind: "timeout" } | { kind: "aborted" }>> = [];
    if (timeoutMs) guards.push(new Promise((resolve) => {
      timeoutHandle = setTimeout(() => { requestController.abort(new DOMException("Summary deadline exceeded", "TimeoutError")); resolve({ kind: "timeout" }); }, timeoutMs);
    }));
    if (args.abortSignal) guards.push(new Promise((resolve) => {
      abortListener = () => { requestController.abort(args.abortSignal?.reason); resolve({ kind: "aborted" }); };
      args.abortSignal?.addEventListener("abort", abortListener, { once: true });
      if (args.abortSignal?.aborted) abortListener();
    }));
    const outcome = guards.length ? await Promise.race([request, ...guards]) : await request;
    // 主通道到结论（含 timeout guard 获胜的那一档）。
    primaryElapsedMs = Date.now() - compactionT0;
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (abortListener) args.abortSignal?.removeEventListener("abort", abortListener);
    // 主通道结论：done + 非空内容 = 拿到摘要；其余都是「主通道没拿到摘要」
    // （timeout / provider-error / done 但返回空内容）。aborted 单独一档，
    // 绝不换模型重发。
    const result = outcome.kind === "done" ? outcome.value : undefined;
    if (result?.model) summaryModel = result.model;
    if (result?.provider) summaryProvider = result.provider;
    if (outcome.kind === "aborted") throw Object.assign(new Error("Summary cancelled"), { name: "AbortError", compactionReason: "aborted" });
    if (outcome.kind === "timeout") throw Object.assign(new Error("Summary deadline exceeded"), { compactionReason: "timeout" });
    if (outcome.kind === "provider-error") throw outcome.error;
    const completion = (result as (AgentRuntimeResult & { summaryCompletion?: SummaryCompletion }) | undefined)?.summaryCompletion;
    const diagnostic = classifySummaryError({
      finishReason: completion?.finishReason ?? result?.finish_reason,
      responseStatus: completion?.responseStatus, incompleteReason: completion?.incompleteReason,
      maxOutputTokens: completion?.maxOutputTokens ?? bounded.outputTokenBudget,
      completionTokens: completion?.completionTokens ?? summaryCompletionTokens(result?.usage),
      outputChars: completion?.text.length ?? result?.content?.length,
    });
    summaryDiagnostics = { finishReason: diagnostic.finishReason, responseStatus: diagnostic.responseStatus,
      incompleteReason: diagnostic.incompleteReason, maxOutputTokens: diagnostic.maxOutputTokens,
      completionTokens: diagnostic.completionTokens, outputChars: diagnostic.outputChars };
    if (isTruncatedCompletion({ ...completion, finishReason: completion?.finishReason ?? result?.finish_reason })) {
      throw { code: "SUMMARY_TRUNCATED", stage: "decode", ...summaryDiagnostics };
    }
    const newSummary = result?.content?.trim() ?? "";
    if (!newSummary) {
      recordCompactionFailure(dialogId, args.now?.() ?? Date.now());
      logCompactionTiming("empty", { model: result?.model });
      emitPhase({ kind: "compaction-end" });
      return { ...projectExisting(), failureMessage: "Summary empty", failureReason: "provider-error", decision: { outcome: "failed", reason: "provider-error", detail: "Summary empty", ...itemDiagnostics } };
    }

    // P1-8 压缩埋点：记录 metrics 并日志
    // 原因优先级：校验失效触发的重压缩 > context_budget，与
    // localLoop 构造 compaction 事件 / buildCompactionMetricsFromPlan 同口径。
    const metricsReason: "invalid_summary" | "cold_resume" | "context_budget" =
      invalidSummary ? "invalid_summary" : "context_budget";
    const metrics = buildCompactionMetricsFromPlan({
      reason: metricsReason,
      previousSummary: existingSummary,
      plan: {
        msgsToCompress: bounded.coveredMessages,
        msgsToKeep: [...msgsToCompress.slice(bounded.coveredMessages.length), ...plan.msgsToKeep],
      },
      newSummary,
      summaryUsage: result?.usage as Record<string, unknown> | undefined,
    });
    const projectedHistory = projectHistoryWithSummary({ history, summary: newSummary,
      summarizedBeforeId: bounded.summarizedBeforeId });
    // Metrics and safety diagnostics count the actual projected user message too.
    const projectedMessages = toPlanCompressionMessages(prepareHistoryForNextTurn(projectedHistory, args.contextReferenceResolver));
    const projectedTokens = projectedMessages.reduce((sum, message) => sum + getMessageTokenCount(message as any), 0);
    const projectedRetained = projectedMessages.slice(1);
    metrics.retainedTokens = projectedRetained.reduce((sum, message) => sum + getMessageTokenCount(message as any), 0);
    metrics.retainedCount = projectedRetained.length;
    // Observability target is fixed recent originals plus actual new summary,
    // not the soft-trigger historyBudget. Hard admission is checked separately below.
    const { effectiveRawMessageBudget } = resolveEffectiveCompactionBudgets({
      contextWindow, triggerRatio: plan.diagnostics!.triggerRatio,
      historyBudget: contextWindow, rawMessageBudget: contextWindow,
      summaryTokens: 0, newSummaryTokenReserve: estimateTokenCount(newSummary),
    });
    const effectiveHistoryBudget = effectiveRawMessageBudget + estimateTokenCount(newSummary);
    const projectedItemCount = projectedHistory.length + 1; // system/agent prompt
    const withinSafetyBudget = projectedTokens <= effectiveHistoryBudget &&
      (maxInputItems === undefined || projectedItemCount <= Math.floor(maxInputItems * 0.6));
    if (!withinSafetyBudget) {
      console.warn("[localLoop] compaction projection remains above safety budget", {
        projectedTokens, effectiveHistoryBudget,
        ...(maxInputItems !== undefined ? { projectedItemCount, maxInputItems } : {}),
      });
    }
    const oldProjection = projectExisting();
    const beforeProjectedTokens = toPlanCompressionMessages(prepareHistoryForNextTurn(oldProjection.history, args.contextReferenceResolver))
      .reduce((sum, message) => sum + getMessageTokenCount(message as any), 0);
    // Candidate hard admission is independent of the 90% trigger and fixed 20K tail.
    // Full caller projection includes system/tools/output and calibrated tokenizer density.
    const historyBudget = Math.max(0, contextWindow - Math.min(8192, Math.max(1, Math.floor(contextWindow / 4))));
    const candidateOverBudget = args.requestOverBudget
      ? args.requestOverBudget(projectedHistory)
      : projectedTokens > historyBudget;
    if (projectedTokens >= beforeProjectedTokens || candidateOverBudget) {
      const failureMessage = `compaction candidate rejected: ${projectedTokens >= beforeProjectedTokens ? "no token reduction" : "above history budget"} (before=${beforeProjectedTokens}, after=${projectedTokens}, budget=${historyBudget})`;
      console.warn(`[localLoop] ${failureMessage}`);
      recordCompactionFailure(dialogId, args.now?.() ?? Date.now());
      logCompactionTiming("empty", {});
      emitPhase({ kind: "compaction-end" });
      return {
        ...oldProjection,
        failureMessage,
        ...(result?.usage ? { usage: result.usage as Record<string, unknown> } : {}),
        decision: { outcome: "skipped", skipReason: "unsafe-projection", detail: failureMessage, ...itemDiagnostics,
          ...(maxInputItems !== undefined ? { projectedItemCount } : {}) },
      };
    }
    const sourceMeta = await computeSummarySourceMetadata(
      toPlanCompressionMessages(history),
      bounded.summarizedBeforeId,
    );
    if (Date.now() >= summaryDeadlineMs) throw Object.assign(new Error("Summary deadline exceeded"), { compactionReason: "timeout" });
    if (args.abortSignal?.aborted) {
      throw Object.assign(new Error("auto-compaction aborted"), { compactionReason: "aborted" as const });
    }
    const saveT0 = Date.now();
    await adapter.saveDialogSummary({
      dialogId,
      summary: newSummary,
      summarizedBeforeId: bounded.summarizedBeforeId,
      // 内容寻址失效检测：存锚点切片哈希与长度，供下轮载入校验。
      sourceHash: sourceMeta?.sourceHash,
      sourceCount: sourceMeta?.sourceCount ?? 0,
      schemaVersion: COMPACTION_SUMMARY_SCHEMA_VERSION,
      referenceKeys: Array.from(
        new Set(
          history.slice(0, sourceMeta?.sourceCount ?? 0)
            .flatMap((message) => extractReferenceKeysFromMessage(message as any)),
        ),
      ),
    });
    saveElapsedMs = Date.now() - saveT0;

    console.log(formatCompactionMetricsLog(metrics));
    // Opus B′ 诊断：只记数字与 model，不记内容——用于判断绝对上限是否合适、
    // 瓶颈在输入(prefill)还是输出(generation)，自然触发收集后驱动 timeout/上限调整。
    logCompactionTiming("success", {
      model: result?.model ?? args.model ?? null,
      outputChars: newSummary.length,
    });

    emitPhase({ kind: "compaction-end" });
    return {
      history: projectedHistory,
      compressed: true,
      summaryGenerated: true,
      selectedSummary: { outcome: "generated", hash: sha256Hex(newSummary),
        anchorId: bounded.summarizedBeforeId,
        ...(sourceMeta?.sourceHash ? { sourceHash: sourceMeta.sourceHash } : {}),
        ...(sourceMeta?.sourceCount !== undefined ? { sourceCount: sourceMeta.sourceCount } : {}),
      },
      reason: metricsReason,
      beforeTokens:
        beforeProjectedTokens,
      afterTokens: projectedTokens,
      withinSafetyBudget,
      ...(result?.usage ? { usage: result.usage as Record<string, unknown> } : {}),
      metrics,
      decision: {
        outcome: "compressed",
        trigger: invalidSummary
          ? "invalid-summary"
          : plan.diagnostics?.triggeredByItemLimit
            ? "item-limit"
            : plan.diagnostics?.triggeredByRealUsage
              ? "real-usage"
              : "estimate",
        ...itemDiagnostics,
        ...(maxInputItems !== undefined ? { projectedItemCount } : {}),
        ...(plan.diagnostics
          ? {
              estimatedTokens: plan.diagnostics.totalUsed,
              historyBudget: plan.diagnostics.historyBudget,
              triggerRatio: plan.diagnostics.triggerRatio,
              ...(plan.diagnostics.realUsageRatio !== undefined
                ? { realUsageRatio: plan.diagnostics.realUsageRatio }
                : {}),
            }
          : {}),
      },
    };
  } catch (error) {
    const safe = classifySummaryError(error, { model: summaryModel ?? undefined, provider: summaryProvider ?? undefined, attemptId: compactionAttemptId });
    summaryModel = safe.model ?? summaryModel;
    summaryProvider = safe.provider ?? summaryProvider;
    const failureReason: LocalAutoCompactionFailureReason =
      args.abortSignal?.aborted || safe.category === "cancelled" || (error as any)?.compactionReason === "aborted" ? "aborted"
        : safe.category === "timeout" || (error as any)?.compactionReason === "timeout" ? "timeout" : "provider-error";
    const failureMessage = [safe.message, safe.code, safe.errorType, safe.balanceSource].filter(Boolean).join(" ");
    if (failureReason !== "aborted") console.warn("[localLoop] auto-compaction failed:", safe);
    // 失败路径的同结构观测：outcome 直接取失败档
    // （timeout / provider-error / aborted），分段字段区分主通道与保存。
    summaryDiagnostics = { ...summaryDiagnostics,
      ...(safe.finishReason === undefined ? {} : { finishReason: safe.finishReason }),
      ...(safe.responseStatus === undefined ? {} : { responseStatus: safe.responseStatus }),
      ...(safe.incompleteReason === undefined ? {} : { incompleteReason: safe.incompleteReason }),
      ...(safe.maxOutputTokens === undefined ? {} : { maxOutputTokens: safe.maxOutputTokens }),
      ...(safe.completionTokens === undefined ? {} : { completionTokens: safe.completionTokens }),
      ...(safe.outputChars === undefined ? {} : { outputChars: safe.outputChars }),
    };
    logCompactionTiming(failureReason, {});
    const failureNow = args.now?.() ?? Date.now();
    if (failureReason !== "aborted") recordCompactionFailure(dialogId, failureNow);
    if (failureReason === "aborted") emitPhase({ kind: "compaction-end" });
    else emitPhase({ kind: "compaction-failed", reason: failureReason });
    return {
      ...projectExisting(),
      failureMessage,
      failureReason,
      failure: safe,
      decision: { outcome: "failed", reason: failureReason, detail: failureMessage, ...itemDiagnostics,
        estimatedTokens: plan.diagnostics?.totalUsed, historyBudget: plan.diagnostics?.historyBudget },
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Turn 级 compaction controller（localLoop 拆分第二批，从 localLoop.ts 迁入）。
//
// 封装一个 turn 的两处压缩入口：
// - runInitial：轮开始检查（含 loadLastContextUsage 真实遥测读取）；
// - maybeCompactInLoop：轮内主防线（廉价门控 + 首轮 ephemeral 摘要 adapter +
//   发送视图投影替换）。
// phase/observation 映射（emitCompactionPhase / emitCompactionObservation）与
// 门控策略一并迁入，保持 fail-open、事件顺序与拆分前逐字节一致。
// ─────────────────────────────────────────────────────────────────────────────

type CompactionLoopEvent = AgentExecutionObservationEvent;

function emitCompactionPhaseEvent(
  boundary: LocalLoopObservationBoundary,
  phase: LocalAutoCompactionPhase,
  scope: "initial" | "in-loop",
) {
  const atMs = Date.now();
  if (phase.kind === "validating-context") emitLoopEvent(boundary, { kind: "turn-phase", phase: "validating-context", atMs, compactionScope: scope } as CompactionLoopEvent);
  else if (phase.kind === "compaction-start") {
    emitLoopEvent(boundary, { kind: "turn-phase", phase: "compacting", atMs, compactionScope: scope } as CompactionLoopEvent);
    emitLoopEvent(boundary, { kind: "compaction-start", atMs, scope } as CompactionLoopEvent);
  } else if (phase.kind === "waiting-provider") emitLoopEvent(boundary, { kind: "turn-phase", phase: "waiting-provider", atMs, compactionScope: scope } as CompactionLoopEvent);
  else if (phase.kind === "compaction-retry") emitLoopEvent(boundary, { kind: "compaction-retry", atMs, scope, attempt: phase.attempt, maxAttempts: phase.maxAttempts } as CompactionLoopEvent);
  else if (phase.kind === "compaction-end") emitLoopEvent(boundary, { kind: "compaction-end", atMs, scope } as CompactionLoopEvent);
  else emitLoopEvent(boundary, { kind: "compaction-failed", atMs, scope, reason: phase.reason } as CompactionLoopEvent);
}

function emitCompactionObservationEvent(
  boundary: LocalLoopObservationBoundary,
  compacted: LocalAutoCompactionResult,
) {
  const decision = compacted.decision;
  if (decision?.outcome === "skipped") {
    const isProtectionGap =
      decision.skipReason === "bounded-request-blocked" ||
      decision.skipReason === "unsafe-projection" ||
      decision.skipReason === "no-safe-prefix" ||
      decision.skipReason === "adapter-missing-summary-methods" ||
      decision.skipReason === "load-summary-failed";
    const approachingBudget =
      decision.skipReason === "below-trigger" &&
      typeof decision.estimatedTokens === "number" &&
      typeof decision.historyBudget === "number" &&
      decision.historyBudget > 0 &&
      decision.estimatedTokens >= decision.historyBudget * 0.5;
    if (!isProtectionGap && !approachingBudget) return;
  }
  emitLoopEvent(boundary, {
    kind: "compaction",
    atMs: Date.now(),
    ...(compacted.reason ? { reason: compacted.reason } : {}),
    ...(compacted.withinSafetyBudget === false ? { detail: "Projected history remains above the token or input-item safety budget" } : {}),
    summaryGenerated: compacted.summaryGenerated,
    compressed: compacted.compressed,
    ...(compacted.failureMessage
      ? { failed: true, detail: compacted.failureMessage }
      : {}),
    ...(decision?.outcome === "skipped"
      ? { skipped: true, skipReason: decision.skipReason, ...(decision.detail ? { detail: decision.detail } : {}) }
      : {}),
    ...(decision && "trigger" in decision && decision.trigger
      ? { trigger: decision.trigger }
      : {}),
    ...(decision && "estimatedTokens" in decision && decision.estimatedTokens !== undefined
      ? { estimatedTokens: decision.estimatedTokens }
      : {}),
    ...(decision && "historyBudget" in decision && decision.historyBudget !== undefined
      ? { historyBudget: decision.historyBudget }
      : {}),
    ...(decision && "realUsageRatio" in decision && decision.realUsageRatio !== undefined
      ? { realUsageRatio: decision.realUsageRatio }
      : {}),
    ...(decision && "triggerRatio" in decision && decision.triggerRatio !== undefined
      ? { triggerRatio: decision.triggerRatio }
      : {}),
    ...(decision?.maxInputItems !== undefined ? {
      itemCount: decision.itemCount,
      maxInputItems: decision.maxInputItems,
      triggeredByItemLimit: decision.triggeredByItemLimit,
      ...(decision.projectedItemCount !== undefined ? { projectedItemCount: decision.projectedItemCount } : {}),
    } : {}),
    ...(compacted.beforeTokens !== undefined
      ? { beforeTokens: compacted.beforeTokens }
      : {}),
    ...(compacted.afterTokens !== undefined
      ? { afterTokens: compacted.afterTokens }
      : {}),
    ...(compacted.savedTokens !== undefined
      ? { savedTokens: compacted.savedTokens }
      : {}),
  } as CompactionLoopEvent);
}

export type TurnCompactionController = {
  /**
   * 轮开始压缩检查（initial scope）。返回（可能被压缩投影替换的）历史与
   * 摘要调用用量；失败 fail-open，原样返回传入历史。
   */
  runInitial(
    history: AgentRuntimeChatMessage[],
  ): Promise<{ history: AgentRuntimeChatMessage[]; usage?: Record<string, unknown> }>;
  /** 轮内压缩主防线（in-loop scope）：工具结果灌水后、下一轮 provider 调用前。 */
  maybeCompactInLoop(): Promise<void>;
  /** Outcome of this prepareRequest only; reset before each evaluation. */
  getLastCompactionOutcome(): ContextCompactionOutcome | undefined;
  /** One decision/attempt for the current request; old usage cannot veto hard admission. */
  prepareRequest(overBudget: (history: AgentRuntimeChatMessage[]) => boolean, initial: boolean,
    availableHistoryTokens?: () => number): Promise<void>;
  /**
   * 失败路径补救：预算裁剪即将丢消息时强制压缩一次。applied=false 表示压不动
   * （没有可压内容 / 退避窗口 / 摘要失败），调用方保持原有拒发行为。
   */
  forceCompact(
    history: AgentRuntimeChatMessage[],
  ): Promise<{
    history: AgentRuntimeChatMessage[];
    applied: boolean;
    /** 摘要那次调用的真实用量；调用方负责入本轮账本（救援发生时账本尚未创建）。 */
    usage?: Record<string, unknown>;
  }>;
};

export function createTurnCompactionController(args: {
  adapter: AgentRuntimeHostAdapter;
  continueDialogId?: string;
  model?: string;
  provider?: string | null;
  providerEndpoint?: string | null;
  resolveProvider: () => Promise<AgentRuntimeProvider>;
  contextWindow: number;
  compressionTriggerRatio: number;
  abortSignal?: AbortSignal;
  timeoutMs?: number;
  /**
   * 摘要通道选择器（形状 = CLI 的 SummaryLlmCaller）：带 preferPlatform 时按
   * 平台准入结果在平台通道与当前 text-only provider 之间二选一；忙类错误
   * 仅在同一路由与原 deadline 内有界重试。CLI 本地 runtime 由已登录的平台摘要 caller 注入；不透传 = 既有
   * fail-open 行为。
   */
  summaryFallback?: LocalCompactionSummaryFallback;
  boundary: LocalLoopObservationBoundary;
  /** 最后一次 provider 调用的原始 usage（真实遥测；缺失时走估算兜底）。 */
  getContextUsage: () => Record<string, unknown> | undefined;
  /** canonical 坐标底稿：store 全量历史 + 本轮消息的持久化形态。 */
  getCanonicalCompactionHistory: () => AgentRuntimeChatMessage[];
  /** 当前发送视图的前缀（压缩重建时保留）。 */
  getWorkingPrefix: () => AgentRuntimeChatMessage[];
  /** 发送视图整体替换（只换视图，持久化原文不动）。 */
  replaceWorkingView: (messages: AgentRuntimeChatMessage[]) => void;
  onSelectedSummary?: (summary: NonNullable<ContextProvenance["summary"]>) => void;
  contextReferenceResolver?: (reference: AgentRuntimeMessageContent) => boolean;
  /** 摘要调用用量入账（带外，首次保留完整对象，之后合并）。 */
  onUsage: (usage: Record<string, unknown>) => void;
}): TurnCompactionController {
  const emitPhase = (phase: LocalAutoCompactionPhase, scope: "initial" | "in-loop") =>
    emitCompactionPhaseEvent(args.boundary, phase, scope);
  const emitObservation = (compacted: LocalAutoCompactionResult) =>
    emitCompactionObservationEvent(args.boundary, compacted);

  // 断点修复 1（首轮零保护窗口）：新对话首轮 dialogId 尚未分配（saveTurn
  // 在循环结束后才创建记录），旧实现 `if (!continueDialogId) return;` 让
  // 整条压缩管线在最长、最容易灌水失控的首轮完全缺位。现在用 turn 级
  // 内存摘要存储包装 adapter，跑同一条压缩管线：摘要只活在本轮内、不落盘，
  // 本轮 prompt 有界；下一轮拿到真 dialogId 后由轮开始检查重新生成并持久化。
  // 代价仅是首轮可能多一次摘要调用，远低于首轮上下文失控的代价。
  let ephemeralSummary: Awaited<
    ReturnType<NonNullable<AgentRuntimeHostAdapter["loadDialogSummary"]>>
  > = null;
  const ephemeralDialogId = `ephemeral-${crypto.randomUUID()}`;
  const compactionAdapter: AgentRuntimeHostAdapter = args.continueDialogId
    ? args.adapter
    : {
        ...args.adapter,
        loadDialogSummary: async () => ephemeralSummary,
        saveDialogSummary: async (summaryInput) => {
          ephemeralSummary = summaryInput;
        },
      };
  const compactionDialogId = args.continueDialogId ?? ephemeralDialogId;

  const runCompaction = async (history: AgentRuntimeChatMessage[], force: boolean) => {
    // 获取该 dialog 上一次 provider 调用的真实 input tokens（方案 a）。
    // 来源实现说明：
    // 轮开始兜底判定的真实遥测：saveTurn 时把最后一次 provider 调用的真实
    // input tokens 持久化到本地 per-dialog 记录，turn 开始经
    // adapter.loadLastContextUsage 读回（单 key O(1)，headless/CLI 均可靠）。
    // 记录缺失（旧对话）安全落到估算兜底。取「最后一次调用」而非累加值，
    // 精准反映真实上下文占用。主防线是轮内检查（maybeCompactInLoop）。
    let realContextUsagePercent: number | undefined;
    if (
      args.continueDialogId &&
      typeof (args.adapter as any).loadLastContextUsage === "function"
    ) {
      try {
        const usage = await (args.adapter as any).loadLastContextUsage(
          args.continueDialogId,
        );
        const inputTokens = usage?.inputTokens;
        // 守卫：数值合理（>0 且 ≤合理上界）才使用；归一化 clamp 到 [0, 1] 比例
        // 归一化陷阱防范：planCompression.normalizeContextUsageRatio 将 >1 视为百分数且要求结果 ≤1。
        // 如果直接传入 >1 的比例（如超限 1.04），会被二次除以 100 变成 1.04% 导致误判；
        // 因此此处强制 clamp 至 [0, 1] 闭区间。
        if (
          typeof inputTokens === "number" &&
          Number.isFinite(inputTokens) &&
          inputTokens > 0 &&
          typeof args.contextWindow === "number" &&
          Number.isFinite(args.contextWindow) &&
          args.contextWindow > 0
        ) {
          realContextUsagePercent = Math.min(
            1,
            Math.max(0, inputTokens / args.contextWindow),
          );
        }
      } catch (err) {
        console.warn("[localLoop] loadLastContextUsage failed:", err);
      }
    }

    // 自动上下文压缩：先于预算兜底。摘要持久化，压缩点之间前缀稳定以保住缓存。
    // 失败只记日志，绝不阻断本轮对话。
    // 摘要那次 LLM 调用是一次独立的计费调用，用量必须并入本轮 usage，
    // 否则只出现在 provider 账单上、我们自己的 token 记账看不到。
    try {
      const compacted = await maybeAutoCompactLocalHistory({
        adapter: args.adapter,
        dialogId: args.continueDialogId,
        history,
        contextReferenceResolver: args.contextReferenceResolver,
        model: args.model,
        provider: args.provider,
        providerEndpoint: args.providerEndpoint,
        resolveProvider: args.resolveProvider,
        contextWindow: args.contextWindow,
        realContextUsagePercent,
        force,
        abortSignal: args.abortSignal,
        timeoutMs: args.timeoutMs,
        summaryFallback: args.summaryFallback,
        onAttemptUsage: args.onUsage,
        onPhase: (phase) => emitPhase(phase, "initial"),
      });
      args.onSelectedSummary?.(compacted.selectedSummary ?? { outcome: "absent" });
      emitObservation(compacted);
      return { history: compacted.history, usage: compacted.usage };
    } catch (error) {
      console.warn("[localLoop] auto-compaction unexpected error:", error);
      return { history };
    }
  };

  const runInitial: TurnCompactionController["runInitial"] = async (history) =>
    runCompaction(history, false);

  const forceCompact: TurnCompactionController["forceCompact"] = async (history) => {
    const result = await runCompaction(history, true);
    return { history: result.history, applied: result.history !== history, usage: result.usage };
  };

  let lastCompactionOutcome: ContextCompactionOutcome | undefined;
  const prepareRequest = async (
    requestOverBudget?: (history: AgentRuntimeChatMessage[]) => boolean,
    initial = false,
    availableHistoryTokens?: () => number,
  ): Promise<void> => {
    lastCompactionOutcome = undefined;
    // 断点修复 2（遥测缺失即零保护）：旧实现 `if (!contextUsage) return;`
    // 与 `if (ratio < trigger) return;` 让「provider 不报 usage」的会话在
    // 轮内完全没有压缩检查——而估算兜底路径只在轮开始评估一次，轮内灌水
    // （工具结果恰恰是大头）完全无界，直到 provider 400。现在每轮都让
    // 决策层跑完整判定：真实占用在手时照旧按触发线强制；缺失时走估算兜底
    // （与轮开始同一条路径、同一套阈值，语义不变）。
    const contextUsage = args.getContextUsage();
    let inputTokens = contextUsage
      ? normalizeUsage(contextUsage as any).input_tokens
      : 0;
    if (initial && args.continueDialogId && args.adapter.loadLastContextUsage) {
      try { inputTokens = (await args.adapter.loadLastContextUsage(args.continueDialogId))?.inputTokens ?? 0; }
      catch (error) { console.warn("[localLoop] loadLastContextUsage failed:", error); }
    }
    const ratio =
      inputTokens > 0 ? Math.min(1, inputTokens / args.contextWindow) : undefined;
    // 仅无完整请求准入回调时使用旧的廉价门；它不是单轮增量上界。
    // 生产发送路径总带 requestOverBudget，每轮评估。
    // 遥测缺失（ratio undefined）必须每轮评估：估算兜底是唯一防线。
    if (!requestOverBudget && ratio !== undefined && ratio < args.compressionTriggerRatio * 0.85 &&
      resolveProviderInputItemLimit({ provider: args.provider, endpoint: args.providerEndpoint }) === undefined) {
      return;
    }
    try {
      const compacted = await maybeAutoCompactLocalHistory({
        adapter: compactionAdapter,
        dialogId: compactionDialogId,
        // canonical 坐标：store 全量历史 + 本轮消息的「持久化形态」
        // （getCanonicalCompactionHistory 内部经 applyPersistedTurnInput 把
        // 首条 user 消息换成 paste 展开形态）。
        // 锚点与 sourceHash 都必须按持久化形态计算——否则下轮从 store
        // 重载后重算 hash 必不匹配，摘要被判无效、白付一次摘要调用。
        history: args.getCanonicalCompactionHistory(),
        requestOverBudget,
        availableHistoryTokens: availableHistoryTokens?.(),
        contextReferenceResolver: args.contextReferenceResolver,
        model: args.model,
        provider: args.provider,
        providerEndpoint: args.providerEndpoint,
        resolveProvider: args.resolveProvider,
        contextWindow: args.contextWindow,
        ...(ratio !== undefined ? { realContextUsagePercent: ratio } : {}),
        abortSignal: args.abortSignal,
        timeoutMs: args.timeoutMs,
        summaryFallback: args.summaryFallback,
        onAttemptUsage: args.onUsage,
        onPhase: (phase) => emitPhase(phase, initial ? "initial" : "in-loop"),
      });
      lastCompactionOutcome = { result: compacted };
      if (compacted.compressed) {
        // 发送视图换投影：prompt 前缀保留，历史部分整体替换。
        // compacted.compressed=false 时 history 是原样返回的 canonical
        // 全量，不能换（会把完整历史塞回发送视图）。
        // 投影从 canonical/raw 重建，与首轮 buildMessages 走同一条
        // composeProviderMessages 管线：
        // 1. prepareHistoryForNextTurn：规划用持久化形态（paste 全文），
        //    发送视图必须恢复 context_reference 紧凑引用——否则 collapsed
        //    paste 的全文会被重新发回 provider，违反 TUI paste 契约；
        // 2. 毒丸 tool_calls 降级（幂等纯函数）。
        // 图片剥离不用重跑，发送 seam 每次 provider 调用都会做
        // filterImagePartsFromMessages。
        const rebuilt = composeProviderMessages({
          prefix: args.getWorkingPrefix(),
          history: compacted.history,
          contextReferenceResolver: args.contextReferenceResolver,
        });
        if (rebuilt.downgraded > 0) {
          // 单源统计：数字来自这次重建投影（composeProviderMessages →
          // downgradeUnparsableToolCalls）的分类统计，不再旁路扫描
          // compacted.history。降级动作与持久化历史一律不动。
          const stats = rebuilt.stats;
          console.warn(
            `[nolo] rewrote ${stats.rewrittenToolCalls} tool calls in ${stats.rewrittenAssistantMessages} assistant messages and ${stats.rewrittenToolMessages} tool-result messages after compaction (bad arguments: truncated=${stats.badArguments.truncated}, malformed=${stats.badArguments.malformed}); persisted history untouched`,
          );
        }
        args.replaceWorkingView(rebuilt.messages);
      }
      // 轮开始那次准入（initial=true）是本请求唯一的整体评估：即使无需压缩，也要
      // 如实归属摘要来源（absent / loaded），否则 ledger 的 summary 会停在
      // runLocalAgentTurn 的 unknown 默认值——那是「没评估过」，不是「无需摘要」。
      // 轮内轮次保持既有契约：只有真正发生压缩才报告，避免后续轮次把已生成的
      // 摘要归属覆盖回 absent。
      if (compacted.compressed || initial) {
        args.onSelectedSummary?.(compacted.selectedSummary ?? { outcome: initial ? "absent" : "unknown" });
      }
      emitObservation(compacted);
    } catch (error) {
      lastCompactionOutcome = { ...lastCompactionOutcome, error: classifySummaryError(error) };
      console.warn("[localLoop] in-loop auto-compaction failed:", error);
    }
  };

  return { getLastCompactionOutcome: () => lastCompactionOutcome, runInitial, maybeCompactInLoop: () => prepareRequest(), forceCompact, prepareRequest };
}
