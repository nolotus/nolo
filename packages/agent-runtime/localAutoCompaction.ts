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

import { createHash } from "node:crypto";

import { planCompression } from "../ai/context/planCompression";
import { getModelContextWindow } from "../ai/llm/getModelContextWindow";
import { canonicalizeToolName } from "./toolNameAliases";
import {
  COMPACTION_SUMMARY_SYSTEM_PROMPT,
  COMPACTION_SUMMARY_SCHEMA_VERSION,
  formatMessagesForSummaryWithTruncation,
  formatFileOperationsFromMessages,
  buildCompactionUserContent,
  buildCompactionMetricsFromPlan,
  formatCompactionMetricsLog,
  type CompactionMetrics,
} from "../ai/context/compactionShared";
import type {
  AgentRuntimeHostAdapter,
  AgentRuntimeProvider,
} from "./hostAdapter";
import { buildDialogSummaryLayer } from "./turnContext";
import type { AgentRuntimeChatMessage } from "./types";
import { normalizeUsage } from "../ai/token/normalizeUsage";
import { composeProviderMessages } from "./providerMessageProjection";
import { emitLoopEvent } from "./toolCallTransaction";
import type { LocalLoopObservationBoundary } from "./observationStream";
import type { AgentExecutionObservationEvent } from "./executionObservation";
import type { AgentRuntimeMessageContent } from "./types";

/** planCompression 实际读取的字段（见 packages/ai/context/planCompression.ts）。 */
export type PlanCompressionBridgeMessage = {
  id: string;
  role: AgentRuntimeChatMessage["role"];
  content: AgentRuntimeChatMessage["content"];
  tool_calls?: AgentRuntimeChatMessage["tool_calls"];
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
    id: `local-${index}`,
    role: message.role,
    content: message.content,
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
export function hashSummarySourceSlice(
  history: AgentRuntimeChatMessage[],
  summarizedBeforeId?: string,
): string | undefined {
  if (!summarizedBeforeId) return undefined;
  const bridged = toPlanCompressionMessages(history);
  const found = bridged.findIndex((m) => m.id === summarizedBeforeId);
  if (found === -1) return undefined;
  const slice = bridged.slice(0, found + 1);
  return createHash("sha256")
    .update(JSON.stringify(slice))
    .digest("hex");
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
  const found = bridged.findIndex(
    (m) => m.id === stored.summarizedBeforeId,
  );
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
    const found = bridged.findIndex((m) => m.id === args.summarizedBeforeId);
    if (found !== -1) startIndex = found + 1;
  }

  const projected = args.history.slice(startIndex);

  const summaryMsg =
    args.summary.trim().length > 0
      ? [buildLocalSummaryHistoryMessage(args.summary)]
      : [];
  return [...summaryMsg, ...projected];
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
export type LocalCompactionSummaryFallback = (
  content: string,
) => Promise<string | null>;

/**
 * 主通道失败后的一次性摘要 fallback 调用。
 *
 * 契约：整个压缩流程只调用 fallback 一次；任何异常/非字符串/空串都归为
 * 「没拿到摘要」，由调用方继续走既有 fail-open 路径（绝不静默丢历史）。
 */
async function runSummaryFallback(
  fallback: LocalCompactionSummaryFallback,
  content: string,
): Promise<string | null> {
  try {
    const text = await fallback(content);
    if (typeof text !== "string") return null;
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : null;
  } catch (error) {
    console.warn("[localLoop] auto-compaction summary fallback failed:", error);
    return null;
  }
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
export type LocalAutoCompactionPhase =
  | { kind: "validating-context" }
  | { kind: "compaction-start" }
  | { kind: "waiting-provider" }
  | { kind: "compaction-end" }
  | { kind: "compaction-failed"; reason: LocalAutoCompactionFailureReason };

export type LocalAutoCompactionResult = {
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
  | "no-pending"
  /** 触发且调用了摘要模型，但返回空摘要。 */
  | "summary-empty"
  /** 上一次摘要失败后的退避窗口内，本轮不再重试摘要（没有发起请求，不是新失败）。 */
  | "retry-backoff";

export type LocalCompactionDecision =
  | {
      outcome: "compressed";
      /** 触发依据：real-usage / estimate / cold-resume / invalid-summary / existing-summary（复用已持久化摘要投影）。 */
      trigger:
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
      estimatedTokens?: number;
      historyBudget?: number;
      realUsageRatio?: number;
      triggerRatio?: number;
      pendingMsgCount?: number;
      compressCount?: number;
    }
  | { outcome: "failed"; reason: LocalAutoCompactionFailureReason; detail: string };

export async function maybeAutoCompactLocalHistory(args: {
  adapter: AgentRuntimeHostAdapter;
  dialogId?: string;
  /** 可注入的当前时间，供 cold-resume 判定使用；测试用来保持确定性。 */
  now?: () => number;
  history: AgentRuntimeChatMessage[];
  model?: string;
  /** Lazy provider resolver — only invoked when a new summary must be generated. */
  resolveProvider: () => Promise<AgentRuntimeProvider>;
  /** Test override; production uses getModelContextWindow(model). */
  contextWindow?: number;
  /**
   * 上一次调用 provider 侧真实上下文占用（0..1 比例，如 Math.min(1, inputTokens / contextWindow)）。
   * planCompression 据此在真实占用 ≥0.78 时强制触发，绕过本地启发式历史估算偏低导致的 400 溢出。
   */
  realContextUsagePercent?: number;
  /** Omitted preserves historical behavior for direct callers. */
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  /**
   * 主通道（agent 自己的 provider）超时 / 失败时的摘要 fallback，最多调用一次。
   * CLI 传平台摘要 caller（与 /compact 同一条通道，预算独立且有限）；desktop /
   * 未注入 → 保持既有 fail-open 行为，不新建第二条摘要通道。
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
    );
    stored = null;
  }

  const existingSummary =
    typeof stored?.summary === "string" ? stored.summary : "";
  const summarizedBeforeId =
    typeof stored?.summarizedBeforeId === "string"
      ? stored.summarizedBeforeId
      : undefined;

  const contextWindow =
    typeof args.contextWindow === "number" &&
    Number.isFinite(args.contextWindow) &&
    args.contextWindow > 0
      ? args.contextWindow
      : getModelContextWindow(args.model ?? "");

  const allMsgs = toPlanCompressionMessages(history);
  // Cold-resume 判定：距上次活动很久再继续的对话，provider 前缀缓存必然已过期，
  // 这一轮无论如何都要全量重发整个上下文。那正是压缩最划算的时刻——反正要付
  // 全量未命中的钱，不如让重发的那份小一点，且后续每一轮都跟着受益。
  //
  // 阈值方向必须保守：若缓存其实还热却误触发，新摘要会改变前缀、把热缓存毁掉。
  // 所以取一个明显高于常见 provider TTL 的值，宁可漏判也不误判。
  const coldResume = isColdResume(history, args.now?.() ?? Date.now());

  const plan = planCompression({
    allMsgs: allMsgs as any,
    summarizedBeforeId,
    summary: existingSummary,
    contextWindow,
    ...(coldResume
      ? { coldResume: true, reason: "cold_resume" as const }
      : {}),
    ...(args.realContextUsagePercent !== undefined
      ? { realContextUsagePercent: args.realContextUsagePercent }
      : {}),
  });

  const projectExisting = (): LocalAutoCompactionResult => {
    const diag = plan.diagnostics;
    const diagSnapshot = diag
      ? {
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

  emitPhase({ kind: "compaction-start" });
  try {
    if (args.abortSignal?.aborted) {
      throw Object.assign(new Error("auto-compaction aborted"), { compactionReason: "aborted" as const });
    }
    const provider = await args.resolveProvider();
    // 审计修复：abort 若发生在 resolveProvider 的 await 窗口内，listener 尚未注册，
    // 会被漏掉；这里补一次检查，收盘「pre-check → listener 注册」之间的竞态窗口。
    if (args.abortSignal?.aborted) {
      throw Object.assign(new Error("auto-compaction aborted"), { compactionReason: "aborted" as const });
    }
    const msgsToCompress =
      plan.msgsToCompress as PlanCompressionBridgeMessage[];
    // 用共享模块的截断版格式化，避免大工具结果撑爆摘要请求（P0-2）。
    const messagesText = formatMessagesForSummaryWithTruncation(msgsToCompress);
    const fileOpsText = formatFileOperationsFromMessages(
      msgsToCompress,
      canonicalizeToolName,
    );
    const promptContent = buildCompactionUserContent({
      previousSummary: existingSummary,
      messagesText,
      fileOpsText,
    });
    emitPhase({ kind: "waiting-provider" });
    const timeoutMs = typeof args.timeoutMs === "number" && Number.isFinite(args.timeoutMs) && args.timeoutMs > 0 ? args.timeoutMs : undefined;
    const requestController = new AbortController();
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
    let abortListener: (() => void) | undefined;
    const request = provider.complete(
      [{ role: "system", content: COMPACTION_SUMMARY_SYSTEM_PROMPT }, { role: "user", content: promptContent }],
      { signal: requestController.signal, ...(timeoutMs ? { timeoutMs } : {}) },
    ).then(
      (value) => ({ kind: "done" as const, value }),
      (error) => ({ kind: "provider-error" as const, error }),
    );
    const guards: Array<Promise<{ kind: "timeout" } | { kind: "aborted" }>> = [];
    if (timeoutMs) guards.push(new Promise((resolve) => {
      timeoutHandle = setTimeout(() => { requestController.abort(); resolve({ kind: "timeout" }); }, timeoutMs);
    }));
    if (args.abortSignal) guards.push(new Promise((resolve) => {
      abortListener = () => { requestController.abort(args.abortSignal?.reason); resolve({ kind: "aborted" }); };
      args.abortSignal?.addEventListener("abort", abortListener, { once: true });
    }));
    const outcome = guards.length ? await Promise.race([request, ...guards]) : await request;
    if (timeoutHandle) clearTimeout(timeoutHandle);
    if (abortListener) args.abortSignal?.removeEventListener("abort", abortListener);
    // 主通道结论：done + 非空内容 = 拿到摘要；其余都是「主通道没拿到摘要」
    // （timeout / provider-error / done 但返回空内容）。aborted 单独一档，
    // 绝不 fallback。
    const result = outcome.kind === "done" ? outcome.value : undefined;
    let newSummary =
      typeof result?.content === "string" ? result.content.trim() : "";
    const primaryFailure: LocalAutoCompactionFailureReason | null =
      outcome.kind === "aborted"
        ? "aborted"
        : newSummary
          ? null
          : outcome.kind === "done"
            ? "provider-error"
            : outcome.kind;
    if (primaryFailure === "aborted") {
      throw Object.assign(new Error("auto-compaction aborted"), {
        compactionReason: "aborted" as const,
      });
    }

    // 主通道没拿到摘要 → 平台摘要 fallback（CLI 复用 /compact 那条通道；
    // desktop/未注入 = 完全不进这里，行为与今天一致）。上限严格 1 次：整个
    // 函数只有这一处调用点，且只有两条通道都失败才记 per-dialog 退避，所以
    // 不可能与退避叠加成多次请求。fallback 拿到的摘要走下面同一条持久化 /
    // 内容寻址锚点 / schema 版本路径。
    const summaryFallback = args.summaryFallback;
    if (primaryFailure && summaryFallback) {
      const fallbackSummary = await runSummaryFallback(
        summaryFallback,
        promptContent,
      );
      // 用户在 fallback 在途期间取消：既不能算 provider 失败（不该退避），
      // 也绝不能落盘任何摘要。
      if (args.abortSignal?.aborted) {
        throw Object.assign(new Error("auto-compaction aborted"), {
          compactionReason: "aborted" as const,
        });
      }
      if (fallbackSummary) newSummary = fallbackSummary;
    }

    if (!newSummary) {
      // 两条通道都没拿到摘要：这里才记一次退避（不与 fallback 叠加）。
      recordCompactionFailure(dialogId, retryNow);
      if (outcome.kind === "done") {
        console.warn(
          "[localLoop] auto-compaction produced empty summary; keeping prior projection",
        );
        const failureReason = "provider-error" as const;
        emitPhase({ kind: "compaction-failed", reason: failureReason });
        return {
          ...projectExisting(),
          failureMessage: "summary model returned empty content",
          failureReason,
          decision: {
            outcome: "failed",
            reason: failureReason,
            detail: "summary model returned empty content",
          },
        };
      }
      const reason: LocalAutoCompactionFailureReason =
        primaryFailure ?? "provider-error";
      const detail =
        outcome.kind === "provider-error"
          ? outcome.error instanceof Error
            ? outcome.error.message
            : String(outcome.error)
          : `auto-compaction timed out after ${timeoutMs}ms`;
      throw Object.assign(new Error(detail), { compactionReason: reason });
    }

    await adapter.saveDialogSummary({
      dialogId,
      summary: newSummary,
      summarizedBeforeId: plan.newSummarizedBeforeId,
      // 内容寻址失效检测：存锚点切片哈希与长度，供下轮载入校验。
      sourceHash: hashSummarySourceSlice(history, plan.newSummarizedBeforeId),
      sourceCount: (() => {
        const b = toPlanCompressionMessages(history);
        const i = b.findIndex((m) => m.id === plan.newSummarizedBeforeId);
        return i === -1 ? 0 : i + 1;
      })(),
      schemaVersion: COMPACTION_SUMMARY_SCHEMA_VERSION,
    });

    // P1-8 压缩埋点：记录 metrics 并日志
    // 原因优先级：校验失效触发的重压缩 > cold_resume > context_budget，与
    // localLoop 构造 compaction 事件 / buildCompactionMetricsFromPlan 同口径。
    const metricsReason: "invalid_summary" | "cold_resume" | "context_budget" =
      invalidSummary
        ? "invalid_summary"
        : coldResume
          ? "cold_resume"
          : "context_budget";
    const metrics = buildCompactionMetricsFromPlan({
      reason: metricsReason,
      previousSummary: existingSummary,
      plan,
      newSummary,
      summaryUsage: result?.usage as Record<string, unknown> | undefined,
    });
    console.log(formatCompactionMetricsLog(metrics));

    emitPhase({ kind: "compaction-end" });
    return {
      history: projectHistoryWithSummary({
        history,
        summary: newSummary,
        summarizedBeforeId: plan.newSummarizedBeforeId,
      }),
      compressed: true,
      summaryGenerated: true,
      reason: metricsReason,
      beforeTokens:
        metrics.previousSummaryTokens + metrics.compressedTokens,
      afterTokens: metrics.newSummaryTokens + metrics.retainedTokens,
      ...(result?.usage ? { usage: result.usage as Record<string, unknown> } : {}),
      metrics,
      decision: {
        outcome: "compressed",
        trigger: invalidSummary
          ? "invalid-summary"
          : coldResume
            ? "cold-resume"
            : plan.diagnostics?.triggeredByRealUsage
              ? "real-usage"
              : "estimate",
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
    // 观测/优化功能：摘要失败绝不能让本轮对话失败。
    console.warn("[localLoop] auto-compaction failed:", error);
    const failureMessage =
      error instanceof Error && error.message
        ? error.message.slice(0, 200)
        : String(error).slice(0, 200);
    const failureReason: LocalAutoCompactionFailureReason =
      error instanceof Error && "compactionReason" in error
        ? (error as Error & { compactionReason: LocalAutoCompactionFailureReason }).compactionReason
        : "provider-error";
    if (failureReason !== "aborted") recordCompactionFailure(dialogId, retryNow);
    emitPhase({ kind: "compaction-failed", reason: failureReason });
    return {
      ...projectExisting(),
      failureMessage,
      failureReason,
      decision: { outcome: "failed", reason: failureReason, detail: failureMessage },
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
    summaryGenerated: compacted.summaryGenerated,
    compressed: compacted.compressed,
    ...(compacted.failureMessage
      ? { failed: true, detail: compacted.failureMessage }
      : {}),
    ...(decision?.outcome === "skipped"
      ? { skipped: true, skipReason: decision.skipReason }
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
};

export function createTurnCompactionController(args: {
  adapter: AgentRuntimeHostAdapter;
  continueDialogId?: string;
  model?: string;
  resolveProvider: () => Promise<AgentRuntimeProvider>;
  contextWindow: number;
  compressionTriggerRatio: number;
  abortSignal?: AbortSignal;
  timeoutMs?: number;
  /**
   * 摘要 fallback（形状 = CLI 的 SummaryLlmCaller）：主通道超时/失败时最多
   * 调用一次。CLI 本地 runtime 由已登录的平台摘要 caller 注入；不透传 =
   * 既有 fail-open 行为。
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

  const runInitial: TurnCompactionController["runInitial"] = async (history) => {
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
        model: args.model,
        resolveProvider: args.resolveProvider,
        contextWindow: args.contextWindow,
        realContextUsagePercent,
        abortSignal: args.abortSignal,
        timeoutMs: args.timeoutMs,
        summaryFallback: args.summaryFallback,
        onPhase: (phase) => emitPhase(phase, "initial"),
      });
      emitObservation(compacted);
      return { history: compacted.history, usage: compacted.usage };
    } catch (error) {
      console.warn("[localLoop] auto-compaction unexpected error:", error);
      return { history };
    }
  };

  const maybeCompactInLoop = async (): Promise<void> => {
    // 断点修复 2（遥测缺失即零保护）：旧实现 `if (!contextUsage) return;`
    // 与 `if (ratio < trigger) return;` 让「provider 不报 usage」的会话在
    // 轮内完全没有压缩检查——而估算兜底路径只在轮开始评估一次，轮内灌水
    // （工具结果恰恰是大头）完全无界，直到 provider 400。现在每轮都让
    // 决策层跑完整判定：真实占用在手时照旧按触发线强制；缺失时走估算兜底
    // （与轮开始同一条路径、同一套阈值，语义不变）。
    const contextUsage = args.getContextUsage();
    const inputTokens = contextUsage
      ? normalizeUsage(contextUsage as any).input_tokens
      : 0;
    const ratio =
      inputTokens > 0 ? Math.min(1, inputTokens / args.contextWindow) : undefined;
    // 廉价门控：真实占用在手且距触发线还有余量（单轮最大灌水 = 工具输出上限
    // + 回合开销，见 toolOutputCap；0.85 余量保证过线那一轮必然落到评估分支）
    // 时跳过本轮评估——真实遥测是最准信号，健康路径不为估算付 O(历史) 成本。
    // 遥测缺失（ratio undefined）必须每轮评估：估算兜底是唯一防线。
    if (ratio !== undefined && ratio < args.compressionTriggerRatio * 0.85) {
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
        model: args.model,
        resolveProvider: args.resolveProvider,
        contextWindow: args.contextWindow,
        ...(ratio !== undefined ? { realContextUsagePercent: ratio } : {}),
        abortSignal: args.abortSignal,
        timeoutMs: args.timeoutMs,
        summaryFallback: args.summaryFallback,
        onPhase: (phase) => emitPhase(phase, "in-loop"),
      });
      if (compacted.usage) {
        args.onUsage(compacted.usage);
      }
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
          console.warn(
            `[nolo] downgraded ${rebuilt.downgraded} tool_call(s) with unparsable JSON arguments from outbound history after compaction; persisted history untouched`,
          );
        }
        args.replaceWorkingView(rebuilt.messages);
      }
      emitObservation(compacted);
    } catch (error) {
      console.warn("[localLoop] in-loop auto-compaction failed:", error);
    }
  };

  return { runInitial, maybeCompactInLoop };
}
