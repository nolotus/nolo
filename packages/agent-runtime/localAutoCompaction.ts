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
import { TOOL_STUB_TEXT } from "../ai/context/planCompression";
import { estimateTokenCount } from "../ai/context/tokenUtils";
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
 * 任一无效 → 返回 null（丢弃摘要与 stub，由决策层重新压缩）。
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
  /** 老工具输出 stub 边界：此 id 及其之前（summarizedBeforeId 之后）的 tool 结果 content 被替换为 stub 文本。 */
  stubbedBeforeId?: string;
}): AgentRuntimeChatMessage[] {
  const bridged = toPlanCompressionMessages(args.history);
  let startIndex = 0;
  if (args.summarizedBeforeId) {
    const found = bridged.findIndex((m) => m.id === args.summarizedBeforeId);
    if (found !== -1) startIndex = found + 1;
  }

  let stubEndIndex = -1;
  if (args.stubbedBeforeId) {
    const found = bridged.findIndex((m) => m.id === args.stubbedBeforeId);
    if (found !== -1) stubEndIndex = found;
  }

  const projected = args.history.slice(startIndex).map((message, i) => {
    const absIndex = startIndex + i;
    // stub 区间：summarizedBeforeId 之后、stubbedBeforeId 及其之前
    if (
      stubEndIndex !== -1 &&
      message.role === "tool" &&
      absIndex <= stubEndIndex
    ) {
      const content =
        typeof message.content === "string"
          ? TOOL_STUB_TEXT
          : Array.isArray(message.content)
            ? [{ type: "text" as const, text: TOOL_STUB_TEXT }]
            : TOOL_STUB_TEXT;
      return { ...message, content };
    }
    return message;
  });

  // stub-only 投影：summary 为空时不 prepend 空摘要消息，只做 stub 替换。
  // 这避免「无已有摘要、首次进 stub 档」时把一条空摘要塞进 provider 历史。
  const summaryMsg =
    args.summary.trim().length > 0
      ? [buildLocalSummaryHistoryMessage(args.summary)]
      : [];
  return [...summaryMsg, ...projected];
}

/**
 * 把已持久化的 stubbedBeforeId 应用到 history 的一个副本上（等长等序，只替换
 * tool 消息的 content，不增删任何消息）。用于两个场景：
 * - HIGH-2：喂给 planCompression 的规划输入必须「已应用 stub」，否则已 stub 的
 *   工具输出会被再次计入 savedTokens（重复计入），可能反复选中 stub 档而投影
 *   仍超预算。
 * - 位置 id 契约：返回数组与 canonical history 逐位对齐，summarizedBeforeId /
 *   stubbedBeforeId 的 findIndex 对齐不受影响。
 */
function applyStoredStubToHistory(
  history: AgentRuntimeChatMessage[],
  stubbedBeforeId?: string,
): AgentRuntimeChatMessage[] {
  if (!stubbedBeforeId) return history;
  const bridged = toPlanCompressionMessages(history);
  const stubEndIndex = bridged.findIndex((m) => m.id === stubbedBeforeId);
  if (stubEndIndex === -1) return history;
  return history.map((message, i) => {
    if (i <= stubEndIndex && message.role === "tool") {
      const content =
        typeof message.content === "string"
          ? TOOL_STUB_TEXT
          : Array.isArray(message.content)
            ? [{ type: "text" as const, text: TOOL_STUB_TEXT }]
            : TOOL_STUB_TEXT;
      return { ...message, content };
    }
    return message;
  });
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
   * 全部复用已有 CompactionMetrics / plan.stub 口径，与 executionObservation
   * 的 compaction 事件直接对齐。
   */
  reason?: "tool_stub" | "context_budget" | "cold_resume" | "invalid_summary";
  /** 压缩前估算 token（before = previousSummary + compressed）。 */
  beforeTokens?: number;
  /** 压缩后估算 token（after = newSummary + retained）。 */
  afterTokens?: number;
  /** 压缩省下的估算 token（before - after）。 */
  savedTokens?: number;
  /** stub 路径：被替换为 stub 档的工具输出条数。 */
  stubbedCount?: number;
};

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
}): Promise<LocalAutoCompactionResult> {
  const { adapter, dialogId, history } = args;
  const unchanged = (): LocalAutoCompactionResult => ({
    history,
    compressed: false,
    summaryGenerated: false,
  });

  if (
    !dialogId ||
    history.length === 0 ||
    typeof adapter.loadDialogSummary !== "function" ||
    typeof adapter.saveDialogSummary !== "function"
  ) {
    return unchanged();
  }

  let stored: {
    summary: string;
    summarizedBeforeId?: string;
    stubbedBeforeId?: string;
    sourceHash?: string;
    sourceCount?: number;
    schemaVersion?: unknown;
  } | null = null;
  try {
    stored = await adapter.loadDialogSummary(dialogId);
  } catch (error) {
    console.warn("[localLoop] loadDialogSummary failed:", error);
    return unchanged();
  }

  // 摘要锚点内容寻址校验：sourceHash 存在时，若历史被 fork/编辑/裁剪导致
  // 重算哈希不匹配或锚点失效，判摘要无效并连同 stub 一起丢弃，走「无摘要」
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
  const storedStubbedBeforeId =
    typeof stored?.stubbedBeforeId === "string" &&
    stored.stubbedBeforeId
      ? stored.stubbedBeforeId
      : undefined;

  const contextWindow =
    typeof args.contextWindow === "number" &&
    Number.isFinite(args.contextWindow) &&
    args.contextWindow > 0
      ? args.contextWindow
      : getModelContextWindow(args.model ?? "");

  // HIGH-2：规划输入必须是「应用了 storedStubbedBeforeId 的历史副本」——已 stub
  // 的工具输出不能再以 canonical 原文计入 savedTokens（否则会重复计入、反复选中
  // stub 档而实际投影仍超预算，延误摘要档）。副本等长等序（只替换 tool content），
  // 位置 id 契约不受影响。摘要 token 由 summary 输入承担，不经消息列表。
  const allMsgs = toPlanCompressionMessages(
    applyStoredStubToHistory(history, storedStubbedBeforeId),
  );
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
    // 防死亡螺旋：用 summary 长度作为上次压缩后的基线。如果新内容没让
    // totalUsed 比 summary 本身增长超过 minNewTokens，不重复触发。
    lastCompactedTokenCount: existingSummary
      ? estimateTokenCount(existingSummary)
      : undefined,
    ...(coldResume ? { force: true, reason: "context_budget" as const } : {}),
  });

  const projectExisting = (): LocalAutoCompactionResult => {
    // HIGH-1：所有返回路径统一走投影，投影始终应用 storedStubbedBeforeId。
    // summary 为空时省略摘要层（projectHistoryWithSummary 内部处理），但 stub
    // 照常生效——「已 stub 但本轮不触发压缩」的轮次不能把老工具输出以原文重发。
    // 仅在确实有内容可投影（摘要或 stub 任一）时才返回压缩投影；否则保持原样。
    if (!existingSummary.trim() && !storedStubbedBeforeId) return unchanged();
    return {
      history: projectHistoryWithSummary({
        history,
        summary: existingSummary,
        summarizedBeforeId,
        stubbedBeforeId: storedStubbedBeforeId,
      }),
      compressed: true,
      summaryGenerated: false,
    };
  };

  if (!plan.shouldCompress) {
    return projectExisting();
  }

  // stub 档：零成本回到预算，不生成摘要、不调 LLM。
  if (plan.stub) {
    const nextStubbedBeforeId = plan.stub.beforeId;
    const changed = nextStubbedBeforeId !== storedStubbedBeforeId;
    if (changed) {
      try {
        await adapter.saveDialogSummary({
          dialogId,
          summary: existingSummary,
          summarizedBeforeId,
          stubbedBeforeId: nextStubbedBeforeId,
          // stub 档不改锚点切片 → 透传源校验字段保持读写对称
          sourceHash: stored?.sourceHash,
          sourceCount: stored?.sourceCount,
          schemaVersion: COMPACTION_SUMMARY_SCHEMA_VERSION,
        });
      } catch (error) {
        console.warn("[localLoop] saveDialogSummary (stub) failed:", error);
      }
    }
    // stub 档 metrics（reason=tool_stub）
    const metrics = buildCompactionMetricsFromPlan({
      reason: "tool_stub",
      previousSummary: existingSummary,
      plan,
      newSummary: existingSummary,
    });
    console.log(formatCompactionMetricsLog(metrics));

    return {
      history: projectHistoryWithSummary({
        history,
        summary: existingSummary,
        summarizedBeforeId,
        stubbedBeforeId: nextStubbedBeforeId,
      }),
      compressed: true,
      summaryGenerated: false,
      metrics,
      reason: "tool_stub",
      savedTokens: plan.stub.savedTokens,
      stubbedCount: plan.stub.stubbedCount,
      beforeTokens:
        metrics.previousSummaryTokens + metrics.compressedTokens,
      afterTokens: metrics.newSummaryTokens + metrics.retainedTokens,
    };
  }

  try {
    const provider = await args.resolveProvider();
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
    const result = await provider.complete([
      { role: "system", content: COMPACTION_SUMMARY_SYSTEM_PROMPT },
      { role: "user", content: promptContent },
    ]);
    const newSummary =
      typeof result.content === "string" ? result.content.trim() : "";
    if (!newSummary) {
      console.warn(
        "[localLoop] auto-compaction produced empty summary; keeping prior projection",
      );
      return projectExisting();
    }

    await adapter.saveDialogSummary({
      dialogId,
      summary: newSummary,
      summarizedBeforeId: plan.newSummarizedBeforeId,
      // 新摘要已覆盖 stub 区间 → 清空 stubbedBeforeId
      stubbedBeforeId: undefined,
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
      summaryUsage: result.usage as Record<string, unknown> | undefined,
    });
    console.log(formatCompactionMetricsLog(metrics));

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
      ...(result.usage ? { usage: result.usage as Record<string, unknown> } : {}),
      metrics,
    };
  } catch (error) {
    // 观测/优化功能：摘要失败绝不能让本轮对话失败。
    console.warn("[localLoop] auto-compaction failed:", error);
    return projectExisting();
  }
}
