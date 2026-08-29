import type {
  AgentRuntimeMessageContent,
  AgentRuntimeOutputBlock,
  AgentRuntimeToolCall,
} from "./types";
import type { EmptyAssistantFallbackReason } from "./emptyAssistantRepair";

/**
 * localLoop 进度看门狗配置。
 */
export type ProgressGuardConfig = {
  /**
   * 连续相同 assistant 响应（文本、思维链及发起的工具调用与参数完全一致）的最大允许轮数。
   * 默认 5 轮。
   * - 若 assistant 无工具调用（纯文本/思维链），连续相同达此阈值即熔断；
   * - 若 assistant 有工具调用，则必须同时满足「工具返回结果也无变化」达此阈值才熔断，
   *   防止误杀合法轮询/等待（如旁白相同但工具返回进度在推进）。
   */
  maxConsecutiveIdenticalRounds?: number;

  /**
   * 连续完全相同的工具调用序列且工具执行返回内容及元数据完全无变化的最大允许轮数。
   * 默认 8 轮。超过此阈值即判定模型陷入工具空转停滞（stagnant_tool_calls）。
   */
  maxConsecutiveStagnantToolRounds?: number;

  /**
   * 是否显式禁用进度看门狗。默认 false。
   */
  disabled?: boolean;
};

export const DEFAULT_MAX_CONSECUTIVE_IDENTICAL_ROUNDS = 5;
export const DEFAULT_MAX_CONSECUTIVE_STAGNANT_TOOL_ROUNDS = 8;

export type ProgressGuardVerdict =
  | { action: "continue" }
  | {
      action: "stall";
      reason: EmptyAssistantFallbackReason;
      detail: string;
      consecutiveRounds: number;
    };

/**
 * 递归对对象的 key 排序，生成确定性的序列化结果，避免不同属性顺序导致指纹误判。
 */
export function sortJsonKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sortJsonKeys);
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
    sorted[key] = sortJsonKeys((obj as Record<string, unknown>)[key]);
  }
  return sorted;
}

/**
 * 规范化工具调用参数字符串。
 */
export function normalizeToolArguments(rawArgs: unknown): string {
  if (typeof rawArgs !== "string") {
    try {
      return JSON.stringify(sortJsonKeys(rawArgs ?? ""));
    } catch {
      return String(rawArgs ?? "");
    }
  }
  const trimmed = rawArgs.trim();
  if (!trimmed) return "";
  try {
    const parsed = JSON.parse(trimmed);
    return JSON.stringify(sortJsonKeys(parsed));
  } catch {
    return trimmed;
  }
}

/**
 * 提取并规范化 assistant 消息文本内容。
 */
export function extractNormalizedContentText(
  content: AgentRuntimeMessageContent | undefined | null,
): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => {
      if (part?.type === "text") return String(part.text ?? "").trim();
      if (part?.type === "image_url") return `[img:${part.image_url?.url ?? ""}]`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

/**
 * 生成工具调用列表的结构化指纹。
 */
export function buildToolCallsSignature(
  toolCalls: readonly AgentRuntimeToolCall[] | undefined | null,
): string {
  if (!toolCalls || toolCalls.length === 0) return "";
  return toolCalls
    .map(
      (tc) =>
        `${tc.function?.name ?? ""}:${normalizeToolArguments(tc.function?.arguments)}`,
    )
    .join(";;");
}

/**
 * 生成 Assistant 单轮响应（文本 + 思维链 + 工具调用）的综合动作指纹。
 */
export function buildAssistantActionFingerprint(result: {
  content?: AgentRuntimeMessageContent | null;
  reasoning_content?: string | null;
  tool_calls?: AgentRuntimeToolCall[] | null;
  output?: AgentRuntimeOutputBlock[] | null;
}): {
  fingerprint: string;
  hasNonEmptyText: boolean;
  hasToolCalls: boolean;
  toolCallsSignature: string;
} {
  const content = extractNormalizedContentText(result.content);
  const reasoning =
    typeof result.reasoning_content === "string"
      ? result.reasoning_content.trim()
      : "";

  let toolCallsSig = buildToolCallsSignature(result.tool_calls);
  // 注意与 localLoop 空轮判定的不对称：后者用
  // `result.tool_calls?.length || result.raw_tool_calls?.length`（含 raw_tool_calls），
  // 这里只看 tool_calls 与 output 里的 toolCall block。当前无 provider 仅在
  // raw_tool_calls 返回工具，故不可达；若将来出现这类 provider，本轮会被误判为
  // "无工具调用"而走纯文本复读分支，重新打开 repetition_loop 的误杀窗口——
  // 届时需在此一并纳入 raw_tool_calls。
  let hasToolCalls = Array.isArray(result.tool_calls) && result.tool_calls.length > 0;

  if (!toolCallsSig && Array.isArray(result.output) && result.output.length > 0) {
    const blocksToolCalls = result.output
      .filter(
        (b): b is Extract<AgentRuntimeOutputBlock, { type: "toolCall" }> =>
          b.type === "toolCall",
      )
      .map((b) => b.toolCall);
    if (blocksToolCalls.length > 0) {
      toolCallsSig = buildToolCallsSignature(blocksToolCalls);
      hasToolCalls = true;
    }
  }

  const hasNonEmptyText = content.length > 0 || reasoning.length > 0;
  const fingerprint = `${content}##${reasoning}##${toolCallsSig}`;

  return {
    fingerprint,
    hasNonEmptyText,
    hasToolCalls,
    toolCallsSignature: toolCallsSig,
  };
}

/**
 * 生成已执行工具及其结果的综合指纹。
 */
export function buildToolResultsSignature(
  toolExecutions: Array<{
    toolName: string;
    content?: string | null;
    metadata?: Record<string, unknown>;
  }>,
): string {
  if (toolExecutions.length === 0) return "";
  return toolExecutions
    .map((exec) => {
      const contentStr =
        typeof exec.content === "string" ? exec.content.trim() : "";
      const metaStr = exec.metadata
        ? JSON.stringify(sortJsonKeys(exec.metadata))
        : "";
      return `${exec.toolName}:${contentStr}:${metaStr}`;
    })
    .join(";;");
}

/**
 * 解析并合并看门狗配置（options > env > default）。
 */
export function resolveProgressGuardConfig(
  options?: ProgressGuardConfig,
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? process.env
    : {},
): Required<ProgressGuardConfig> {
  const envDisabled =
    env.NOLO_LOOP_PROGRESS_GUARD_DISABLED === "true" ||
    env.NOLO_LOOP_PROGRESS_GUARD_DISABLED === "1";

  const disabled = options?.disabled ?? envDisabled ?? false;

  const parsePositiveInt = (val: unknown, fallback: number): number => {
    if (typeof val === "number" && Number.isFinite(val) && val >= 1) {
      return Math.floor(val);
    }
    if (typeof val === "string") {
      const parsed = parseInt(val, 10);
      if (Number.isFinite(parsed) && parsed >= 1) {
        return parsed;
      }
    }
    return fallback;
  };

  const maxConsecutiveIdenticalRounds = parsePositiveInt(
    options?.maxConsecutiveIdenticalRounds ??
      env.NOLO_LOOP_MAX_IDENTICAL_ROUNDS,
    DEFAULT_MAX_CONSECUTIVE_IDENTICAL_ROUNDS,
  );

  const maxConsecutiveStagnantToolRounds = parsePositiveInt(
    options?.maxConsecutiveStagnantToolRounds ??
      env.NOLO_LOOP_MAX_STAGNANT_TOOL_ROUNDS,
    DEFAULT_MAX_CONSECUTIVE_STAGNANT_TOOL_ROUNDS,
  );

  return {
    disabled,
    maxConsecutiveIdenticalRounds,
    maxConsecutiveStagnantToolRounds,
  };
}

/**
 * localLoop 内部运行的进度与死循环熔断监视器。
 */
export class LocalLoopProgressGuard {
  private readonly config: Required<ProgressGuardConfig>;
  private lastAssistantFingerprint: string | null = null;
  private lastAssistantHasNonEmptyText: boolean = false;
  private consecutiveIdenticalCount: number = 0;

  private lastToolCallsSignature: string | null = null;
  private lastToolResultsSignature: string | null = null;
  private consecutiveStagnantToolCount: number = 0;

  constructor(
    config?: ProgressGuardConfig,
    env?: Record<string, string | undefined>,
  ) {
    this.config = resolveProgressGuardConfig(config, env);
  }

  /**
   * 在 LLM 返回 assistant 响应后调用。
   * 仅在纯文本/无工具调用且实质文本相同达到阈值时直接熔断；
   * 若存在工具调用，则不在此处熔断，留待工具执行后结合工具结果综合判定。
   */
  observeAssistantResponse(result: {
    content?: AgentRuntimeMessageContent | null;
    reasoning_content?: string | null;
    tool_calls?: AgentRuntimeToolCall[] | null;
    output?: AgentRuntimeOutputBlock[] | null;
  }): ProgressGuardVerdict {
    if (this.config.disabled) return { action: "continue" };

    const { fingerprint, hasNonEmptyText, hasToolCalls } =
      buildAssistantActionFingerprint(result);

    if (
      this.lastAssistantFingerprint !== null &&
      this.lastAssistantFingerprint === fingerprint
    ) {
      this.consecutiveIdenticalCount += 1;
      // 纯文本复读（无工具调用）：连续 N 轮说同样的话，直接在 LLM 返回层熔断
      if (
        !hasToolCalls &&
        hasNonEmptyText &&
        this.consecutiveIdenticalCount >=
          this.config.maxConsecutiveIdenticalRounds
      ) {
        return {
          action: "stall",
          reason: "repetition_loop",
          detail: `Consecutive identical text-only assistant response for ${this.consecutiveIdenticalCount} rounds.`,
          consecutiveRounds: this.consecutiveIdenticalCount,
        };
      }
    } else {
      this.lastAssistantFingerprint = fingerprint;
      this.lastAssistantHasNonEmptyText = hasNonEmptyText;
      this.consecutiveIdenticalCount = 1;
    }

    return { action: "continue" };
  }

  /**
   * 在本轮所有工具执行完毕后调用，检查是否陷入停滞死循环。
   * 只有当工具返回内容与元数据完全无变化时才计入无进展 streak；
   * 一旦工具结果发生变化（如合法轮询状态推进），立即重置 identical streak，确保绝不误杀正常长任务。
   */
  observeToolExecution(
    toolCalls: readonly AgentRuntimeToolCall[],
    toolResults: Array<{
      toolName: string;
      content?: string | null;
      metadata?: Record<string, unknown>;
    }>,
  ): ProgressGuardVerdict {
    if (this.config.disabled) return { action: "continue" };
    if (!toolCalls || toolCalls.length === 0) return { action: "continue" };

    const toolCallsSig = buildToolCallsSignature(toolCalls);
    const toolResultsSig = buildToolResultsSignature(toolResults);

    const toolCallsUnchanged =
      this.lastToolCallsSignature !== null &&
      this.lastToolCallsSignature === toolCallsSig;
    const toolResultsUnchanged =
      this.lastToolResultsSignature !== null &&
      this.lastToolResultsSignature === toolResultsSig;

    if (toolCallsUnchanged && toolResultsUnchanged) {
      this.consecutiveStagnantToolCount += 1;

      // 判定 1: assistant 动作相同（文本+工具调用相同）且工具返回结果也完全无变化
      // 达到 maxConsecutiveIdenticalRounds (默认 5 轮) 熔断 repetition_loop
      if (
        this.consecutiveIdenticalCount >=
        this.config.maxConsecutiveIdenticalRounds
      ) {
        return {
          action: "stall",
          reason: "repetition_loop",
          detail: `Consecutive identical assistant response with unchanged tool results for ${this.consecutiveIdenticalCount} rounds.`,
          consecutiveRounds: this.consecutiveIdenticalCount,
        };
      }

      // 判定 2: 无论 assistant 文本是否有微小变动，工具调用相同且结果完全不变
      // 达到 maxConsecutiveStagnantToolRounds (默认 8 轮) 熔断 stagnant_tool_calls
      if (
        this.consecutiveStagnantToolCount >=
        this.config.maxConsecutiveStagnantToolRounds
      ) {
        return {
          action: "stall",
          reason: "stagnant_tool_calls",
          detail: `Consecutive stagnant tool calls with unchanged results for ${this.consecutiveStagnantToolCount} rounds.`,
          consecutiveRounds: this.consecutiveStagnantToolCount,
        };
      }
    } else {
      // 工具结果发生变化（说明外部状态在推进，例如合法轮询），或发起了新的工具调用
      this.lastToolCallsSignature = toolCallsSig;
      this.lastToolResultsSignature = toolResultsSig;
      this.consecutiveStagnantToolCount = 1;

      // 【核心防误杀保证】：若工具返回内容发生了变化，即使 assistant 旁白碰巧相同，
      // 任务也是在实质推进的，立即重置 consecutiveIdenticalCount 为 1
      if (!toolResultsUnchanged) {
        this.consecutiveIdenticalCount = 1;
      }
    }

    return { action: "continue" };
  }
}

export function createLocalLoopProgressGuard(
  config?: ProgressGuardConfig,
  env?: Record<string, string | undefined>,
): LocalLoopProgressGuard {
  return new LocalLoopProgressGuard(config, env);
}
