// packages/ai/tools/agent/runFailureClass.ts
//
// run 终态结构化失败分类（纯逻辑，零 I/O，全端共享）。
//
// 背景：终态记录此前只有 failureReason（stalled / provider_rate_limited /
// provider_error / config_unresolved / cancelled），编排者要判断「能不能
// 重试、该不该换通道」只能肉读 logTail。本模块把终态映射为结构化的
// failureClass + retryable：
//
//   failureClass: rate_limited / provider_error / stalled / tool_error / unknown
//   retryable:    盲目重试（不改 brief、不换通道）是否有意义
//
// 判定优先级：显式 failureReason > 错误文本模式 > status 兜底。
// 取消类终态（killed/cancelled）不算失败，返回 undefined。

export type RunFailureClass =
  | "rate_limited"
  | "provider_error"
  | "stalled"
  | "tool_error"
  | "unknown";

export type RunFailureClassification = {
  failureClass: RunFailureClass;
  retryable: boolean;
};

export type RunFailureClassifyInput = {
  /** 终态 status（failed / timeout / killed / orphaned / done ...）。 */
  status?: string;
  /** 终态记录上的 failureReason（若已归类）。 */
  failureReason?: string | null;
  /** 错误文本（note / error message），用于无 failureReason 时的模式归类。 */
  errorMessage?: string | null;
};

const RATE_LIMIT_PATTERN =
  /429|rate.?limit|quota|insufficient.?balance|UPSTREAM_402|cooling|冷却/i;
const PROVIDER_ERROR_PATTERN =
  /provider|upstream|5\d\d|bad.?gateway|service.?unavailable|overloaded/i;
const MALFORMED_PATTERN =
  /MALFORMED_FUNCTION_CALL|malformed|invalid.?function.?call|invalid.?tool.?call/i;
const STALLED_PATTERN = /stall|no.?progress|repetition|stagnant|无进展|卡死/i;
const TOOL_ERROR_PATTERN = /tool.?error|tool.?fail|工具/i;

/**
 * 把终态 run 归类为结构化失败分类。
 *
 * 返回 undefined 的两种情况：
 * - status 是成功/取消类（done / killed / cancelled）——不是失败，不分类；
 * - 完全没有任何信号（status 也不是终态失败）——调用方不应分类。
 *
 * retryable 语义（编排者据此决定是否自动重试）：
 * - rate_limited: true  —— 冷却后可重试（配合 nextAvailableAt / cooling 时间）。
 * - provider_error: true —— 瞬态 provider 故障可重试；但 MALFORMED_FUNCTION_CALL
 *   这类确定性输入错误重试无意义，判 false。
 * - stalled: false —— 无进展卡死多为任务/提示词层面问题，盲目重试大概率复现，
 *   应先调整 brief 或换通道。
 * - tool_error / unknown: false。
 */
export function classifyRunFailure(
  input: RunFailureClassifyInput
): RunFailureClassification | undefined {
  const status = typeof input.status === "string" ? input.status : "";
  // 成功与主动取消不是失败。
  if (status === "done" || status === "killed" || status === "cancelled") {
    return undefined;
  }

  const reason =
    typeof input.failureReason === "string" ? input.failureReason : "";
  const message =
    typeof input.errorMessage === "string" ? input.errorMessage : "";

  // ── 1. 显式 failureReason 优先 ─────────────────────────────────────────
  switch (reason) {
    case "provider_rate_limited":
      return { failureClass: "rate_limited", retryable: true };
    case "provider_error":
      // MALFORMED_FUNCTION_CALL 是确定性输入错误，重试不改变结果。
      return MALFORMED_PATTERN.test(message)
        ? { failureClass: "provider_error", retryable: false }
        : { failureClass: "provider_error", retryable: true };
    case "stalled":
      return { failureClass: "stalled", retryable: false };
    case "tool_error":
      return { failureClass: "tool_error", retryable: false };
    case "config_unresolved":
      // 配置未解析：修好配置前重试无意义。
      return { failureClass: "unknown", retryable: false };
    case "cancelled":
      return undefined;
    default:
      break;
  }

  // ── 2. 错误文本模式归类 ────────────────────────────────────────────────
  if (message) {
    if (RATE_LIMIT_PATTERN.test(message)) {
      return { failureClass: "rate_limited", retryable: true };
    }
    if (MALFORMED_PATTERN.test(message)) {
      return { failureClass: "provider_error", retryable: false };
    }
    if (STALLED_PATTERN.test(message)) {
      return { failureClass: "stalled", retryable: false };
    }
    if (TOOL_ERROR_PATTERN.test(message)) {
      return { failureClass: "tool_error", retryable: false };
    }
    if (PROVIDER_ERROR_PATTERN.test(message)) {
      return { failureClass: "provider_error", retryable: true };
    }
  }

  // ── 3. status 兜底 ─────────────────────────────────────────────────────
  // timeout 不是 stalled（墙钟上限 ≠ 无进展），也不是 provider 故障。
  if (
    status === "failed" ||
    status === "timeout" ||
    status === "orphaned"
  ) {
    return { failureClass: "unknown", retryable: false };
  }

  return undefined;
}
