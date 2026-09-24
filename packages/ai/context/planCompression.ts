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
import { serializeMessageContent } from "../../chat/messages/messageContent";
import { ConversationLoad, planContextUsage } from "ai/context/retention";
import { resolveCompressionTriggerRatio } from "./toolOutputCap";

// --- 常量 ---

/** 至少压缩 5 条以上才有意义 */
export const MIN_COMPRESS_COUNT = 5;

/** 主动归档时保留最后两条原文，避免刚给用户的结论立刻被折叠进 summary。 */
export const ACTIVE_SUMMARY_TAIL_KEEP_COUNT = 2;

/**
 * 压缩后历史保留上限相对于触发线的安全余量比例（占窗口的 18%）。
 *
 * 为什么需要余量：
 * 压缩触发线 triggerRatio 为上限防爆线（例如 256k/1M 下为 0.78）。
 * 若压缩后保留的历史仍贴近或超过 triggerRatio（此前 1M 下 rawMessageBudget 达 0.94，
 * 256k 下达 0.79），刚压缩完下一轮甚至立即再次过线，形成 0.768↔0.878 锯齿，
 * 每 1~2 轮就调用一次摘要 LLM，彻底打爆 provider 的前缀缓存（KV cache）。
 *
 * 余量选择理由：
 * 单轮工具最大灌水 + 轮次开销约占 20%（headroom）。
 * 将余量设为 0.18（回撤到 ~60% 窗口，或 triggerRatio - 0.18）：
 * 1) 一次压缩后真实占用落回 ≤60% 窗口，与 78% 触发线保持 18% 窗口（256k 下 46k tokens，
 *    1M 下 180k tokens）的安全距离；
 * 2) 该余量在极端工具 flood 下可支撑多轮缓冲，在常规会话中可支撑数十轮交互无需再压缩，
 *    彻底消除「触发即贴线、贴线又触发」的抖动与缓存失效；
 * 3) 保留了 60% 窗口的最近历史，在大窗口模型（如 1M 达 60 万 tokens）上依然完整保留
 *    丰富的近期上下文与代码细节，兼顾了 cache-first 与上下文完整性。
 */
export const COMPACTION_RETENTION_CUSHION_RATIO = 0.18;

/**
 * manual / cold_resume 的实际触发门槛：折叠数（pending - 保留尾部）还要过
 * MIN_COMPRESS_COUNT，所以 pending 至少要 5 + 2 = 7 条才不会空转。
 */
export const MIN_TRIGGER_PENDING_COUNT =
  MIN_COMPRESS_COUNT + ACTIVE_SUMMARY_TAIL_KEEP_COUNT;

/**
 * 压缩触发线（真实 input_tokens / contextWindow 比例）。
 * 公式与工具输出上限互为基础，真值在 toolOutputCap.ts，这里 re-export
 * 供决策模块与运行时统一引用。
 */
// --- 类型 ---

export type CompressionReason =
  | "task_completed"
  | "context_budget"
  | "manual"
  | "cold_resume";

export interface CompressionInput {
  allMsgs: Message[];
  summarizedBeforeId?: string;
  summary: string;
  contextWindow: number;
  force?: boolean;
  reason?: CompressionReason;
  realContextUsagePercent?: number;
  /**
   * 冷恢复：距上次活动超过 provider 缓存 TTL，缓存反正已冷，
   * 全价发送时更小的上下文 = 更便宜。此时只要有足量新内容可折叠
   * 即触发压缩（门槛见 MIN_TRIGGER_PENDING_COUNT）。
   */
  coldResume?: boolean;
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
 * - below-min-compress-count：已触发但可压缩条数 < MIN_COMPRESS_COUNT。
 */
export interface CompressionPlanDiagnostics {
  pendingMsgCount: number;
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
  emptyReason?: "no-pending" | "not-triggered" | "below-min-compress-count";
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

const classifyConversationLoad = (msgs: Message[]): ConversationLoad => {
  const N = 20;
  if (!Array.isArray(msgs) || msgs.length === 0) return "light";

  const tail = msgs.slice(-N);
  const tokenSamples = tail.map(getMessageTokenCount);
  if (tokenSamples.length === 0) return "light";

  const sum = tokenSamples.reduce((acc, v) => acc + v, 0);
  const avg = sum / tokenSamples.length;
  const sorted = [...tokenSamples].sort((a, b) => a - b);
  const p95 = sorted[Math.floor((sorted.length - 1) * 0.95)];

  if (p95 < 200 && avg < 120) {
    return "light";
  }
  if (p95 > 2000 || avg > 1200) {
    return "heavy";
  }
  return "medium";
};

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
 * resolveCompressionTriggerRatio，随窗口留足单轮灌水余量）。
 * 估算超预算只在遥测缺失时兜底。cold_resume / manual 是两条独立的
 * 主动路径，不参与占用判定。
 */
function shouldTriggerCompaction(args: {
  pendingMsgCount: number;
  totalUsed: number;
  historyBudget: number;
  triggerRatio: number;
  force: boolean;
  reason?: CompressionReason;
  realContextUsagePercent?: number;
  coldResume?: boolean;
  lastMsg?: Message;
}): {
  trigger: boolean;
  triggeredByRealUsage: boolean;
  shouldRunActiveSummary: boolean;
  triggeredByColdResume: boolean;
} {
  const {
    pendingMsgCount, totalUsed, historyBudget, triggerRatio,
    force, reason, realContextUsagePercent, coldResume, lastMsg,
  } = args;

  const usageRatio = normalizeContextUsageRatio(realContextUsagePercent);

  const triggeredByRealUsage =
    usageRatio !== undefined && usageRatio >= triggerRatio;
  // 遥测缺失时的兜底：估算总量超预算。
  const triggeredByEstimate =
    usageRatio === undefined && totalUsed >= historyBudget;

  const shouldRunActiveSummary =
    force &&
    reason === "manual" &&
    !hasOpenEndedToolCall(lastMsg) &&
    pendingMsgCount >= MIN_TRIGGER_PENDING_COUNT;

  const triggeredByColdResume =
    coldResume === true && pendingMsgCount >= MIN_TRIGGER_PENDING_COUNT;

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
  opts: { keepTailCount: boolean; totalUsed: number; historyBudget: number },
): number {
  const { keepTailCount, totalUsed, historyBudget } = opts;

  if (keepTailCount && totalUsed < historyBudget) {
    return Math.max(0, pendingMsgs.length - ACTIVE_SUMMARY_TAIL_KEEP_COUNT);
  }

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

/**
 * 计算压缩后的历史总保留预算上限与原始消息预算上限。
 *
 * 保证压缩后的保留上限严格位于压缩触发线以下，留足多轮安全余量（防抖 / 消除锯齿 / 保护前缀缓存）。
 */
export function resolveEffectiveCompactionBudgets(args: {
  contextWindow: number;
  triggerRatio: number;
  historyBudget: number;
  rawMessageBudget: number;
  summaryTokens: number;
  cushionRatio?: number;
}): {
  effectiveHistoryBudget: number;
  effectiveRawMessageBudget: number;
  maxRetainedRatio: number;
} {
  const {
    contextWindow,
    triggerRatio,
    historyBudget,
    rawMessageBudget,
    summaryTokens,
    cushionRatio = COMPACTION_RETENTION_CUSHION_RATIO,
  } = args;

  // 保留比例严格钳制在触发线下方，至少留出 cushionRatio；下限保护 0.20
  const maxRetainedRatio = Math.max(
    0.2,
    Number((triggerRatio - cushionRatio).toFixed(4)),
  );
  const maxRetainedHistoryBudget = Math.floor(contextWindow * maxRetainedRatio);
  const effectiveHistoryBudget = Math.min(historyBudget, maxRetainedHistoryBudget);
  const effectiveRawMessageBudget = Math.min(
    rawMessageBudget,
    Math.max(0, effectiveHistoryBudget - summaryTokens),
  );

  return {
    effectiveHistoryBudget,
    effectiveRawMessageBudget,
    maxRetainedRatio,
  };
}

/**
 * 保护 tool chain 边界：不切断 assistant(tool_calls) → tool(result) 配对。
 *
 * 若切点落在 tool 消息上，将 tool 消息向后推进压缩集，使整组 tool chain
 * 在压缩集内闭环归档，同时防止向前倒退导致保留尾部超出预算、再次打爆触发线。
 */
function guardToolChainBoundary(pendingMsgs: Message[], compressCount: number): number {
  let count = compressCount;
  // 不让保留的第一条是 tool（它的 assistant 已被压缩，若留在保留集会成孤儿 tool 报 400；
  // 将其一并纳入压缩集，既配对又保证保留集不超预算）
  while (count < pendingMsgs.length && pendingMsgs[count].role === "tool") {
    count++;
  }
  // 最后一条被压缩的不能是带 tool_calls 的 assistant（若其 tool 结果还在保留集，则将 tool 结果也推进压缩集）
  while (count > 0 && hasOpenEndedToolCall(pendingMsgs[count - 1])) {
    if (count < pendingMsgs.length && pendingMsgs[count].role === "tool") {
      count++;
    } else {
      count--;
      break;
    }
  }
  return count;
}

export function planCompression(input: CompressionInput): CompressionPlan {
  const {
    allMsgs, summarizedBeforeId, summary, contextWindow,
    force = false, reason, realContextUsagePercent, coldResume,
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
  const totalUsed = summaryTokens + pendingTokens;
  const adjustedSummaryTokens = Math.max(summaryTokens, 1000);
  const recentLoad = classifyConversationLoad(pendingMsgs);
  const { historyBudget, rawMessageBudget } = planContextUsage({
    contextWindow, summaryTokens: adjustedSummaryTokens, recentLoad,
  });
  const triggerRatio = resolveCompressionTriggerRatio(contextWindow);

  // 3. 判断是否触发
  const {
    trigger,
    triggeredByRealUsage,
    shouldRunActiveSummary,
    triggeredByColdResume,
  } = shouldTriggerCompaction({
    pendingMsgCount: pendingMsgs.length,
    totalUsed, historyBudget, triggerRatio,
    force, reason, realContextUsagePercent, coldResume,
    lastMsg: pendingMsgs[pendingMsgs.length - 1],
  });
  const diagnostics: CompressionPlanDiagnostics = {
    pendingMsgCount: pendingMsgs.length,
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
  if (!trigger) {
    return emptyPlan(startIndex, {
      ...diagnostics,
      emptyReason: "not-triggered",
    });
  }

  // 4. 算压缩条数 + 保护 tool chain
  // 主动路径（手动 / 真实占用超线 / 冷恢复）折叠到只留尾部原文；
  // 估算兜底路径按预算从后往前保留。
  // 注意：保留上限必须钳制到触发线以下（留足 cushion 距离），
  // 消除「触发即贴线、贴线又触发」的锯齿与前缀缓存打爆。
  const { effectiveHistoryBudget, effectiveRawMessageBudget } =
    resolveEffectiveCompactionBudgets({
      contextWindow,
      triggerRatio,
      historyBudget,
      rawMessageBudget,
      summaryTokens,
    });
  let compressCount = calculateCompressCount(
    pendingMsgs,
    effectiveRawMessageBudget,
    {
      keepTailCount:
        shouldRunActiveSummary || triggeredByRealUsage || triggeredByColdResume,
      totalUsed,
      historyBudget: effectiveHistoryBudget,
    },
  );
  compressCount = guardToolChainBoundary(pendingMsgs, compressCount);

  // 5. 太少不值得压缩
  if (compressCount < MIN_COMPRESS_COUNT) {
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
    diagnostics: { ...diagnostics, compressCount },
  };
}
