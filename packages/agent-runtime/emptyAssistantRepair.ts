import type { AgentRuntimeMessageContent } from "./types";

/**
 * 空 assistant 回复修复协议常量与纯逻辑判定。
 *
 * 抽离为独立模块，确保前端 web 打包 / esbuild (platform: "browser")
 * 引入 repair prompt 时，不会意外带入 localLoop 及其 Node 原生模块依赖（child_process, fs, path）。
 */

export const EMPTY_ASSISTANT_REPAIR_PROMPT =
  "请给出明确的文字回答或执行下一步：如果任务已完成，请直接总结结果；如果需要调用工具，请直接输出 tool_calls。请切勿返回空内容。";
export const EMPTY_ASSISTANT_FALLBACK_MESSAGE =
  "模型连续返回空消息，当前任务未完成。请重试当前步骤，或给出更具体的修改范围。";

/**
 * length 截断兜底文案。与服务端 loopMessageExtract.LENGTH_TRUNCATED_FALLBACK_MESSAGE 逐字一致：
 * 模型因输出长度上限被截断（finish_reason === "length"）时，不再重试，直接以此文案结束，
 * 给用户一个明确诊断，而不是空串。
 */
export const LENGTH_TRUNCATED_FALLBACK_MESSAGE =
  "输出达到长度上限被截断，建议缩短任务或提高输出上限。";

/**
 * 上游流被中途切断（而不是模型真的没话说）时的文案。与服务端
 * loopMessageExtract.STREAM_TRUNCATED_FALLBACK_MESSAGE 逐字一致。
 *
 * 判据是「完全没有 finish_reason」：健康的 OpenAI 兼容流最后一个 chunk 必带它，
 * 拿不到就说明流在收尾前就断了。实测过两种成因：代理侧把整个 fetch 连同正在
 * 流式返回的 body 一起 abort（已在 providerGateway 修掉），以及上游自己提前
 * 关闭连接。两者对客户端的表征相同，且都会伪装成「模型返回空内容」。
 */
export const STREAM_TRUNCATED_FALLBACK_MESSAGE =
  "上游响应流在收尾前被中断（未收到结束标记），本轮输出不完整。请重试当前步骤。";

export const REPETITION_LOOP_FALLBACK_MESSAGE =
  "检测到模型陷入重复输出死循环，已自动熔断终止当前任务。";

export const STAGNANT_TOOL_CALLS_FALLBACK_MESSAGE =
  "检测到连续多次相同工具调用且无实质进展，已自动熔断终止当前任务。";

/**
 * 前三个值是 provider 返回形态的成因，server loop 与 CLI 共用。
 *
 * 后两个（repetition_loop / stagnant_tool_calls）是 CLI 侧 progressGuard 熔断
 * 的产物，server 路径不可达——复用本枚举只为直接拿到 fallback 文案。这构成
 * 一处跨层语义泄漏（server 的类型里出现了它永远不会产生的值），与
 * docs/handoff/2026-08-27-async-task-agents-research-handoff.md 12.7 讨论的
 * 问题同类。
 *
 * TODO(独立 PR)：把 ProgressGuardVerdict.reason 改为 CLI 本地的
 * LoopStallReason，在 localLoop 内映射到本枚举（仅用于取文案），使本类型恢复
 * 为纯 provider 语义。本次不做以免 PR 范围膨胀，且属纯重构无行为收益。
 */
export type EmptyAssistantFallbackReason =
  | "empty_completion"
  | "length_truncated"
  | "stream_truncated"
  | "repetition_loop"
  | "stagnant_tool_calls";

/**
 * reasoning-only 空轮允许的最大 repair 次数。reasoning 模型（如 deepseek-v4-flash）
 * 在长期 loop 中可能出现「只输出思考、没落正文也没调工具」的轮次。这不是静默失败
 * （模型确实在思考），值得给它几次引导（请输出正文/tool_calls），但必须有上限，防止
 * 模型反复只思考造成死循环。
 */
export const MAX_REASONING_ONLY_REPAIRS = 2;

export function resolveEmptyAssistantOutcome(args: {
  hasToolCalls: boolean;
  hasVisibleOutput: boolean;
  repairUsed: boolean;
  finishReason?: string;
  /**
   * 流收到了收尾元数据帧。有这个证据时它压过「缺 finish_reason」的推断——
   * 见 AgentRuntimeResult.stream_complete：确实存在从不发 finish_reason 的上游。
   */
  streamComplete?: boolean;
  /**
   * 该轮是否产生了 reasoning_content（有思考过程）。reasoning-only 且无正文/工具时，
   * 说明模型在思考但没落正文——区别于「真·空轮」（连思考都没有）的静默失败。
   */
  hasReasoning?: boolean;
  /**
   * reasoning-only 空轮累计已 repair 的次数。达到 MAX_REASONING_ONLY_REPAIRS 后
   * 不再 repair，走向 fallback，避免死循环。
   */
  reasoningRepairCount?: number;
}):
  | { kind: "ok" }
  | { kind: "repair" }
  | { kind: "fallback"; reason: EmptyAssistantFallbackReason } {
  if (args.hasToolCalls || args.hasVisibleOutput) return { kind: "ok" };
  // 长度截断：模型输出被截断（可能在思考阶段就被截断），无法靠 repair 补救 → fallback。
  if (args.finishReason === "length") return { kind: "fallback", reason: "length_truncated" };
  // 流截断：完全没有 finish_reason（健康的 OpenAI 兼容流最后一个 chunk 必带它）。
  // 这是传输层故障而非「模型想不出正文」，repair 一次（瞬时故障重试），仍截断则 fallback
  // stream_truncated。不受 reasoning 影响。
  if (!args.finishReason && !args.streamComplete) {
    if (!args.repairUsed) return { kind: "repair" };
    return { kind: "fallback", reason: "stream_truncated" };
  }
  // 到这里：流正常完成（有 finishReason 或 streamComplete）但无正文/无工具。
  // reasoning-only 空轮：模型有思考但没落正文/工具，属「有过程无结果」，
  // 给它可计数的 repair（提示输出正文/tool_calls），达到上限后 fallback，防死循环。
  // 真·空轮不受影响。
  if (args.hasReasoning && (args.reasoningRepairCount ?? 0) < MAX_REASONING_ONLY_REPAIRS) {
    return { kind: "repair" };
  }
  if (!args.repairUsed) return { kind: "repair" };
  return { kind: "fallback", reason: "empty_completion" };
}

/**
 * 成因 → 用户可见文案。三种成因各自指向不同的排查方向，
 * 退化成同一句会把方向带偏，所以这里是唯一的映射点。
 */
export function resolveEmptyAssistantFallbackMessage(
  reason: EmptyAssistantFallbackReason,
): string {
  if (reason === "length_truncated") return LENGTH_TRUNCATED_FALLBACK_MESSAGE;
  if (reason === "stream_truncated") return STREAM_TRUNCATED_FALLBACK_MESSAGE;
  if (reason === "repetition_loop") return REPETITION_LOOP_FALLBACK_MESSAGE;
  if (reason === "stagnant_tool_calls") return STAGNANT_TOOL_CALLS_FALLBACK_MESSAGE;
  return EMPTY_ASSISTANT_FALLBACK_MESSAGE;
}

/** assistant 是否产生了可见输出（文本/图片）。tool_calls 由调用方单独判定。
 *  reasoning_content 不算可见输出——与服务端 loopMessageExtract.hasAssistantVisibleOutput 一致：
 *  reasoning-only 且无 tool_calls 视为空轮，走 repair/fallback，避免用户只看到空串。 */
export function hasAssistantVisibleOutput(
  content: AgentRuntimeMessageContent,
): boolean {
  if (typeof content === "string") return content.trim().length > 0;
  if (!Array.isArray(content)) return false;
  return content.some((part) => {
    if (part?.type === "text" && String(part.text ?? "").trim()) return true;
    if (part?.type === "image_url") {
      const url = part?.image_url?.url;
      return typeof url === "string" && url.trim().length > 0;
    }
    return false;
  });
}

export const LENGTH_TRUNCATED_REASONING_MARKER = "[length_truncated_reasoning_tail]";
export const MAX_TRUNCATED_REASONING_CHARS = 2000;

/**
 * 当模型因 length 截断导致正文一行未落（reasoning-only 被截断）时，
 * 提取已有思考过程的尾部（clip 到约 2000 字符）并带上可识别标记，
 * 供运行时写入 run 日志以便编排者/宿主复盘与提取审查结论。
 */
export function formatLengthTruncatedReasoningTail(
  reasoning_content: string | undefined | null,
  maxChars = MAX_TRUNCATED_REASONING_CHARS,
): string | null {
  if (typeof reasoning_content !== "string") return null;
  const trimmed = reasoning_content.trim();
  if (trimmed.length === 0) return null;
  const tail = trimmed.length > maxChars ? trimmed.slice(-maxChars) : trimmed;
  return `[nolo] ${LENGTH_TRUNCATED_REASONING_MARKER}\n${tail}`;
}
