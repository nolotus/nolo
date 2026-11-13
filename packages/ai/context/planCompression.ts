// 文件路径: packages/ai/context/planCompression.ts

/**
 * 纯决策核心：把「是否压缩 / 压缩多少 / 压缩哪些」从 Redux 副作用中剥离出来。
 *
 * 本模块不调 LLM、不写 DB、不读 store，只根据输入消息与预算算出一个
 * CompressionPlan。副作用（跑摘要模型、落库）由调用方通过 CompressionHost 注入，
 * 以便 TUI / Web / Redux 同构复用同一套决策逻辑。
 */

import type { Message } from "../../chat/messages/types";
import { estimateTokenCount } from "./tokenUtils";
import { serializeMessageContent } from "core/chat/messageContentSerialize";
import {
  resolveCompressionTriggerRatio,
} from "./toolOutputCap";

// --- 常量 ---

/** 至少压缩 5 条以上才有意义 */
export const MIN_COMPRESS_COUNT = 5;

/** Item pressure triggers early and retreats to 60% to avoid repeated compaction. */
export const INPUT_ITEM_TRIGGER_RATIO = 0.9;
export const INPUT_ITEM_RETENTION_RATIO = 0.6;

/** 主动归档时保留最后两条原文，避免刚给用户的结论立刻被折叠进 summary。 */
export const ACTIVE_SUMMARY_TAIL_KEEP_COUNT = 2;

/** 压缩后近期原文默认目标；不含摘要，不是整请求上限。 */
export const RECENT_ORIGINAL_TOKEN_BUDGET = 20_000;

/**
 * manual / cold_resume 的实际触发门槛：折叠数（pending - 保留尾部）还要过
 * MIN_COMPRESS_COUNT，所以 pending 至少要 5 + 2 = 7 条才不会空转。
 */
export const MIN_TRIGGER_PENDING_COUNT =
  MIN_COMPRESS_COUNT + ACTIVE_SUMMARY_TAIL_KEEP_COUNT;

// --- 类型 ---

export type CompressionReason =
  | "task_completed"
  | "context_budget"
  | "manual"
  | "cold_resume"
  /** 预算裁剪即将丢消息时的补救压缩（localLoop 失败路径，见 forceCompact）。 */
  | "budget_rescue";

export interface CompressionInput {
  allMsgs: Message[];
  summarizedBeforeId?: string;
  summary: string;
  contextWindow: number;
  /** Final-request allowance for summary + originals after external input/output costs. */
  availableHistoryTokens?: number;
  /** Expected NEW summary allowance; old summary is only input to the summarizer. */
  newSummaryTokenReserve?: number;
  /** Omitted preserves the token-only policy. */
  maxInputItems?: number;
  force?: boolean;
  reason?: CompressionReason;
  realContextUsagePercent?: number;
  /**
   * 冷恢复标记保留用于兼容；默认不单独触发压缩。
   */
  coldResume?: boolean;
  /** Caller must re-inject the newest covered user message verbatim when projecting. */
  preserveLatestUserByProjection?: boolean;
}

export interface CompressionPlan {
  shouldCompress: boolean;
  compressCount: number;
  msgsToCompress: Message[];
  msgsToKeep: Message[];
  newSummarizedBeforeId?: string;
  /** 本次决策相对于 allMsgs 的起点（summarizedBeforeId 之后第一条的下标）。 */
  startIndex: number;
  /** 决策可观测诊断（可选）：不触发时说明「为什么没压」，触发时记录判定输入快照。 */
  diagnostics?: CompressionPlanDiagnostics;
}

/**
 * 压缩决策的诊断快照。纯观测字段，不参与判定。
 * emptyReason 取值：
 * - no-pending：锚点之后没有待处理消息；
 * - not-triggered：真实占用与估算均未过线（附估算/预算/触发线）；
 * - below-min-compress-count：已触发但可摘要条数/内容不足；
 * - no-safe-prefix：受保护尾部之前没有安全的可摘要前缀。
 */
export interface CompressionPlanDiagnostics {
  pendingMsgCount: number;
  itemCount?: number;
  maxInputItems?: number;
  /** Protected current intent/tool groups may exceed the soft fixed tail target. Admission must recheck. */
  retainedTailOverBudget?: boolean;
  recentOriginalTokenBudget?: number;
  triggeredByItemLimit?: boolean;
  /** 估算口径：已有摘要 + 待处理消息的总 token。 */
  totalUsed: number;
  historyBudget: number;
  triggerRatio: number;
  /** 归一化后的真实占用（0..1）；遥测缺失时为 undefined。 */
  realUsageRatio?: number;
  triggeredByRealUsage: boolean;
  triggeredByEstimate: boolean;
  triggeredByColdResume: boolean;
  shouldRunActiveSummary: boolean;
  /** 触发后实际算出的可压缩条数（未触发时为 undefined）。 */
  compressCount?: number;
  emptyReason?: "no-pending" | "not-triggered" | "below-min-compress-count" | "no-safe-prefix";
}

// --- 辅助函数（纯函数） ---

/** getMessageTokenCount 接受的最小消息形状。 */
export interface TokenCountableMessage {
  content?: unknown;
  tool_calls?: Array<{
    function?: { name?: string; arguments?: unknown };
  }>;
}

/**
 * 估算一条消息在 context 窗口里占用的 token 数（输入侧）。
 *
 * 注意：不能用 `usage.completion_tokens`——那是模型生成回复消耗的输出侧
 * token，不等于这条消息在 context 里占多少。用 completion_tokens 会导致
 * assistant 消息的 context 占用被严重低估（例如回复 200 token 但 content
 * 实际 5000 token），进而让压缩决策错过该压缩的时机。
 *
 * 正确做法：从 content + tool_calls 结构估算输入侧占用。
 *
 * 导出供 compactionShared 的 metrics 复用，确保埋点和决策用同一套口径。
 */
export const getMessageTokenCount = (msg: TokenCountableMessage): number => {
  const content = serializeMessageContent(msg.content) || "";
  let tokens = estimateTokenCount(content);
  // tool_calls 的函数名 + arguments JSON 也占 context token
  if (Array.isArray(msg.tool_calls)) {
    for (const call of msg.tool_calls) {
      const fn = call?.function;
      if (fn?.name) tokens += estimateTokenCount(fn.name);
      const args = fn?.arguments;
      if (args) {
        tokens += estimateTokenCount(
          typeof args === "string" ? args : JSON.stringify(args),
        );
      }
    }
  }
  return tokens;
};

const hasOpenEndedToolCall = (msg: Message | undefined): boolean =>
  !!msg &&
  Array.isArray((msg as any).tool_calls) &&
  (msg as any).tool_calls.length > 0;

/**
 * Accept either a ratio (0..1) or a percentage (0..100), but reject invalid
 * values so bad provider telemetry falls back to the legacy estimate path.
 */
const normalizeContextUsageRatio = (value: number | undefined): number | undefined => {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  const ratio = value > 1 ? value / 100 : value;
  return ratio >= 0 && ratio <= 1 ? ratio : undefined;
};

const emptyPlan = (
  startIndex: number,
  diagnostics?: CompressionPlanDiagnostics,
): CompressionPlan => ({
  shouldCompress: false,
  compressCount: 0,
  msgsToCompress: [],
  msgsToKeep: [],
  newSummarizedBeforeId: undefined,
  startIndex,
  ...(diagnostics ? { diagnostics } : {}),
});

// --- 决策核心 ---

/**
 * 找到上次压缩边界后的待处理消息。
 */
function findPendingMessages(
  allMsgs: Message[],
  summarizedBeforeId?: string,
): { pendingMsgs: Message[]; startIndex: number } {
  let startIndex = 0;
  if (summarizedBeforeId) {
    const found = allMsgs.findIndex((m) => m.id === summarizedBeforeId);
    if (found !== -1) startIndex = found + 1;
  }
  return { pendingMsgs: allMsgs.slice(startIndex), startIndex };
}

/**
 * 判断是否应该触发压缩。
 *
 * 触发真值只有一条线：provider 上报的真实占用 ≥ 触发线（见
 * resolveCompressionTriggerRatio，所有窗口统一为 90% 软线）。
 * 估算超预算只在遥测缺失时兜底；手动可强制触发，冷恢复不单独触发。
 */
function shouldTriggerCompaction(args: {
  totalUsed: number;
  historyBudget: number;
  triggerRatio: number;
  force: boolean;
  reason?: CompressionReason;
  realContextUsagePercent?: number;
}): {
  trigger: boolean;
  triggeredByRealUsage: boolean;
  shouldRunActiveSummary: boolean;
  triggeredByColdResume: boolean;
} {
  const {
    totalUsed, historyBudget, triggerRatio,
    force, reason, realContextUsagePercent,
  } = args;

  const usageRatio = normalizeContextUsageRatio(realContextUsagePercent);

  const triggeredByRealUsage =
    usageRatio !== undefined && usageRatio >= triggerRatio;
  // 遥测缺失时的兜底：估算总量超预算。
  const triggeredByEstimate =
    usageRatio === undefined && totalUsed >= historyBudget;

  const shouldRunActiveSummary = force && (reason === "manual" || reason === "budget_rescue");

  const triggeredByColdResume = false;

  return {
    trigger:
      triggeredByRealUsage ||
      triggeredByEstimate ||
      shouldRunActiveSummary ||
      triggeredByColdResume,
    triggeredByRealUsage,
    shouldRunActiveSummary,
    triggeredByColdResume,
  };
}

/**
 * 从后往前保留消息直到填满 rawMessageBudget，返回应压缩的条数。
 */
function calculateCompressCount(
  pendingMsgs: Message[],
  rawMessageBudget: number,
): number {
  let tokensToKeep = 0;
  let keepCount = 0;
  for (let i = pendingMsgs.length - 1; i >= 0; i--) {
    const t = getMessageTokenCount(pendingMsgs[i]);
    if (tokensToKeep + t > rawMessageBudget) break;
    tokensToKeep += t;
    keepCount++;
  }
  return pendingMsgs.length - keepCount;
}

/** Fixed recent originals, clamped by available history after the NEW summary reserve.
 * summaryTokens is retained for compatibility; old-summary size is not the new output budget.
 */
export function resolveEffectiveCompactionBudgets(args: {
  contextWindow: number;
  triggerRatio: number;
  historyBudget: number;
  rawMessageBudget: number;
  summaryTokens: number;
  newSummaryTokenReserve?: number;
}): {
  effectiveHistoryBudget: number;
  effectiveRawMessageBudget: number;
} {
  const effectiveHistoryBudget = Math.max(0, Math.min(
    Math.floor(args.contextWindow), Math.floor(args.historyBudget),
  ));
  // Same default output allowance as the bounded summary request; no model/input changes.
  const newSummaryTokenReserve = args.newSummaryTokenReserve ??
    Math.min(8192, Math.max(1, Math.floor(args.contextWindow / 4)));
  return {
    effectiveHistoryBudget,
    effectiveRawMessageBudget: Math.max(0, Math.min(
      RECENT_ORIGINAL_TOKEN_BUDGET,
      effectiveHistoryBudget - Math.max(0, newSummaryTokenReserve),
    )),
  };
}

/** Never split a tool chain. Without projection support, retain latest user in the suffix. */
function guardToolChainBoundary(pendingMsgs: Message[], compressCount: number, preserveByProjection: boolean): number {
  let safeLimit = Math.max(0, pendingMsgs.length - 1);
  if (!preserveByProjection) {
    for (let i = pendingMsgs.length - 1; i >= 0; i--) {
      if (pendingMsgs[i].role === "user") {
        safeLimit = i;
        break;
      }
    }
  }
  let count = Math.min(compressCount, safeLimit);
  while (count > 0 &&
    (pendingMsgs[count]?.role === "tool" || hasOpenEndedToolCall(pendingMsgs[count - 1]))) {
    count--;
  }
  return count;
}

/** Reserve system + new summary, and a conservatively projected user if enabled.
 * Whether upstream also counts assistant tool_calls separately is unverified;
 * the 90%/60% thresholds leave headroom rather than filling the hard limit.
 */
function calculateItemCompressCount(pendingMsgs: Message[], maxInputItems: number,
  preserveByProjection: boolean): number {
  const keepCount = Math.max(0, Math.floor(maxInputItems * INPUT_ITEM_RETENTION_RATIO)
    - 2 - (preserveByProjection ? 1 : 0));
  return Math.max(0, pendingMsgs.length - keepCount);
}

export function planCompression(input: CompressionInput): CompressionPlan {
  const {
    allMsgs, summarizedBeforeId, summary, contextWindow,
    force = false, reason, realContextUsagePercent, preserveLatestUserByProjection = false,
  } = input;

  // 1. 找待处理消息
  const { pendingMsgs, startIndex } = findPendingMessages(allMsgs, summarizedBeforeId);
  if (pendingMsgs.length === 0) {
    return emptyPlan(startIndex, {
      pendingMsgCount: 0,
      totalUsed: estimateTokenCount(summary || ""),
      historyBudget: 0,
      triggerRatio: resolveCompressionTriggerRatio(contextWindow),
      realUsageRatio: normalizeContextUsageRatio(realContextUsagePercent),
      triggeredByRealUsage: false,
      triggeredByEstimate: false,
      triggeredByColdResume: false,
      shouldRunActiveSummary: false,
      emptyReason: "no-pending",
    });
  }

  // 2. 算 token 开销 + 预算
  const summaryTokens = estimateTokenCount(summary || "");
  const pendingTokens = pendingMsgs.reduce((sum, msg) => sum + getMessageTokenCount(msg), 0);
  let coveredUserTokens = 0;
  if (preserveLatestUserByProjection && summary && startIndex > 0) {
    for (let i = startIndex - 1; i >= 0; i--) {
      if (allMsgs[i].role === "user") { coveredUserTokens = getMessageTokenCount(allMsgs[i]); break; }
    }
  }
  const maxInputItems = typeof input.maxInputItems === "number" &&
    Number.isFinite(input.maxInputItems) && input.maxInputItems > 0
    ? input.maxInputItems : undefined;
  const itemCount = pendingMsgs.length + (summary ? 1 : 0) + 1 +
    (coveredUserTokens > 0 ? 1 : 0);
  const triggeredByItemLimit = maxInputItems !== undefined &&
    itemCount >= maxInputItems * INPUT_ITEM_TRIGGER_RATIO;
  const totalUsed = summaryTokens + coveredUserTokens + pendingTokens;
  const triggerRatio = resolveCompressionTriggerRatio(contextWindow);
  // 压缩专用预算不改变 retention 的其他调用者。
  const historyBudget = Math.floor(contextWindow * triggerRatio);
  const rawMessageBudget = Math.max(0, historyBudget - summaryTokens);

  // 3. 判断是否触发
  const {
    trigger,
    triggeredByRealUsage,
    shouldRunActiveSummary,
    triggeredByColdResume,
  } = shouldTriggerCompaction({
    totalUsed, historyBudget, triggerRatio,
    force, reason, realContextUsagePercent,
  });
  const diagnostics: CompressionPlanDiagnostics = {
    pendingMsgCount: pendingMsgs.length,
    ...(maxInputItems !== undefined ? { itemCount, maxInputItems, triggeredByItemLimit } : {}),
    totalUsed,
    historyBudget,
    triggerRatio,
    realUsageRatio: normalizeContextUsageRatio(realContextUsagePercent),
    triggeredByRealUsage,
    triggeredByEstimate:
      normalizeContextUsageRatio(realContextUsagePercent) === undefined &&
      totalUsed >= historyBudget,
    triggeredByColdResume,
    shouldRunActiveSummary,
  };
  if (!trigger && !triggeredByItemLimit) {
    return emptyPlan(startIndex, {
      ...diagnostics,
      emptyReason: "not-triggered",
    });
  }

  // 所有触发共用 token 尾部预算；预算内也留出有意义的前缀，
  // 以支持手动触发及真实占用高于本地估算的场景。
  const { effectiveRawMessageBudget } = resolveEffectiveCompactionBudgets({
    contextWindow, triggerRatio,
    historyBudget: Math.min(historyBudget, input.availableHistoryTokens ?? historyBudget), rawMessageBudget,
    summaryTokens, newSummaryTokenReserve: input.newSummaryTokenReserve,
  });
  const minimumPrefixTokens = Math.min(1000, Math.floor(contextWindow * 0.1));
  // Item pressure must not inherit the manual minimum-prefix heuristic: short
  // messages can exceed the item limit while all tokens fit comfortably.
  const tailBudget = triggeredByItemLimit
    ? effectiveRawMessageBudget
    : Math.min(effectiveRawMessageBudget, Math.max(0, pendingTokens - minimumPrefixTokens));
  const itemCompressCount = maxInputItems !== undefined
    ? calculateItemCompressCount(pendingMsgs, maxInputItems, preserveLatestUserByProjection) : 0;
  const guardedCut = (tokenCompressCount: number): number => {
    let candidate = Math.max(tokenCompressCount, itemCompressCount);
    let guarded = guardToolChainBoundary(pendingMsgs, candidate, preserveLatestUserByProjection);
    // The legacy guard retreats across tool chains. For item-limited requests,
    // try the next complete chain boundary instead of exceeding the retained cap.
    while (guarded < itemCompressCount && candidate < pendingMsgs.length - 1) {
      candidate++;
      const next = guardToolChainBoundary(pendingMsgs, candidate, preserveLatestUserByProjection);
      if (next === guarded && pendingMsgs[next]?.role === "user" && !preserveLatestUserByProjection) break;
      guarded = next;
    }
    return guarded;
  };
  let compressCount = guardedCut(calculateCompressCount(pendingMsgs, tailBudget));
  // A user message that moves across the cursor is still emitted verbatim by
  // the caller. Reserve its cost in the retained budget before choosing a cut.
  if (preserveLatestUserByProjection) {
    let latestUser = -1;
    for (let i = pendingMsgs.length - 1; i >= 0; i--) {
      if (pendingMsgs[i].role === "user") { latestUser = i; break; }
    }
    const preservedTokens = latestUser >= 0 && latestUser < compressCount
      ? getMessageTokenCount(pendingMsgs[latestUser])
      : latestUser < 0 ? coveredUserTokens : 0;
    if (preservedTokens > 0) {
      compressCount = guardedCut(
        calculateCompressCount(pendingMsgs, Math.max(0, tailBudget - preservedTokens)));
    }
  }
  if (compressCount === 0) {
    return emptyPlan(startIndex, { ...diagnostics, compressCount, emptyReason: "no-safe-prefix" });
  }
  const allowSmallPrefix = reason !== "task_completed" &&
    (shouldRunActiveSummary || triggeredByRealUsage || diagnostics.triggeredByEstimate);
  const compressibleTokens = pendingMsgs.slice(0, compressCount)
    .reduce((sum, msg) => sum + getMessageTokenCount(msg), 0);
  // 与摘要预算既有的 1k token 预留一致，短前缀不因手动触发而无意义压缩。
  if (compressCount < MIN_COMPRESS_COUNT &&
    !(allowSmallPrefix && compressibleTokens >= 1000)) {
    return emptyPlan(startIndex, {
      ...diagnostics,
      compressCount,
      emptyReason: "below-min-compress-count",
    });
  }

  const msgsToCompress = pendingMsgs.slice(0, compressCount);
  const msgsToKeep = pendingMsgs.slice(compressCount);
  const newSummarizedBeforeId = msgsToCompress[msgsToCompress.length - 1].id;

  return {
    shouldCompress: true,
    compressCount,
    msgsToCompress,
    msgsToKeep,
    newSummarizedBeforeId,
    startIndex,
    diagnostics: { ...diagnostics, compressCount, recentOriginalTokenBudget: tailBudget,
      retainedTailOverBudget: msgsToKeep.reduce((sum, msg) => sum + getMessageTokenCount(msg), 0) > tailBudget },
  };
}
