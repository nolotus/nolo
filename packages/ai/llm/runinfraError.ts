// packages/ai/llm/runinfraError.ts
//
// RunInfra 上游错误处理纯函数分类器（Single Source of Truth）。
//
// 依据 RunInfra 官方契约（2026-09-02）：
// 1. https://runinfra.ai/docs/api-reference/errors
// 2. https://runinfra.ai/docs/api-reference/rate-limits
// 3. https://runinfra.ai/docs/api-reference/idempotent-retries

import { parseRetryAfterHeaderMs } from "core/retryAfterMs";

export type RuninfraAction =
  | "retry-after"
  | "circuit-open"
  | "fix-request"
  | "fatal";

export type RuninfraErrorClassification = {
  readonly action: RuninfraAction;
  readonly retryAfterMs: number | null;
  readonly pausedUntil: string | null;
  readonly type: string | null;
  readonly code: string | null;
  readonly requestId: string | null;
  readonly userFacingMessage: string;
  readonly internalMessage: string;
  readonly param?: string | null;
  readonly balance?: unknown;
  readonly topupUrl?: string | null;
};

/**
 * Case-insensitive header lookup across Headers and plain object records.
 */
export function getHeader(
  headers: Headers | Record<string, string | null | undefined> | null | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  const lowerName = name.toLowerCase();
  if (typeof (headers as Headers).get === "function") {
    return (headers as Headers).get(name) ?? (headers as Headers).get(lowerName) ?? null;
  }
  if (typeof headers === "object") {
    for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
      if (k.toLowerCase() === lowerName && typeof v === "string") {
        return v;
      }
    }
  }
  return null;
}

/**
 * Parse retry delay in milliseconds from RunInfra response headers.
 * RunInfra emits both `Retry-After-Ms` (milliseconds) and `Retry-After` (seconds).
 * Priority: `Retry-After-Ms` > `Retry-After`.
 */
export function parseRuninfraRetryAfterMs(
  headers: Headers | Record<string, string | null | undefined> | null | undefined,
): number | null {
  const rawMs = getHeader(headers, "retry-after-ms");
  if (rawMs != null && rawMs.trim()) {
    const ms = Number(rawMs.trim());
    if (Number.isFinite(ms) && ms >= 0) {
      return Math.round(ms);
    }
  }

  const rawSec = getHeader(headers, "retry-after");
  return parseRetryAfterHeaderMs(rawSec);
}

/**
 * 纯函数：对 RunInfra 的 HTTP status、响应头及 body 进行分类。
 *
 * 保证：
 * - 绝不向外抛出任何异常；
 * - 401/402/403 绝不泄露凭据、余额或 topup_url 给终端用户；
 * - 413 与裸文本 FUNCTION_PAYLOAD_TOO_LARGE 统一映射为可操作的请求过大提示；
 * - 非法 JSON / 缺失字段 / 未知 type 或 code 安全降级为按 HTTP status 分档。
 */
export function classifyRuninfraError(
  status: number,
  headers?: Headers | Record<string, string | null | undefined> | null,
  bodyText?: string | null,
): RuninfraErrorClassification {
  const retryAfterMs = parseRuninfraRetryAfterMs(headers);
  const headerRequestId =
    getHeader(headers, "x-request-id") ??
    getHeader(headers, "x-runinfra-request-id") ??
    getHeader(headers, "request-id");

  // 1. 裸文本 FUNCTION_PAYLOAD_TOO_LARGE（平台边缘直接返回纯文本，无 JSON 信封）或 status 413
  const isBarePayloadTooLarge =
    typeof bodyText === "string" &&
    bodyText.trim() === "FUNCTION_PAYLOAD_TOO_LARGE";

  if (status === 413 || isBarePayloadTooLarge) {
    return {
      action: "fix-request",
      retryAfterMs: null,
      pausedUntil: null,
      type: "invalid_request_error",
      code: "payload_too_large",
      requestId: headerRequestId,
      userFacingMessage: "发送内容过长，请缩短内容或分次发送",
      internalMessage: bodyText?.trim() || "FUNCTION_PAYLOAD_TOO_LARGE (HTTP 413)",
    };
  }

  // 2. 尝试安全解析 JSON 信封
  let parsedJson: any = null;
  if (typeof bodyText === "string" && bodyText.trim()) {
    try {
      parsedJson = JSON.parse(bodyText.trim());
    } catch {
      parsedJson = null;
    }
  }

  const errorObj =
    parsedJson && typeof parsedJson.error === "object" && parsedJson.error !== null
      ? parsedJson.error
      : null;

  const rawType =
    typeof errorObj?.type === "string" ? errorObj.type : null;
  const rawCode =
    typeof errorObj?.code === "string" ? errorObj.code : null;
  const rawParam =
    typeof errorObj?.param === "string" ? errorObj.param : null;
  const rawPausedUntil =
    typeof errorObj?.paused_until === "string" ? errorObj.paused_until : null;
  const rawBalance = errorObj?.balance;
  const rawTopupUrl =
    typeof errorObj?.topup_url === "string" ? errorObj.topup_url : null;
  const rawRequestId =
    typeof parsedJson?.request_id === "string"
      ? parsedJson.request_id
      : headerRequestId;

  const rawMessage =
    typeof errorObj?.message === "string"
      ? errorObj.message
      : typeof parsedJson?.message === "string"
        ? parsedJson.message
        : bodyText?.trim() || `HTTP ${status}`;

  const internalMessage = rawMessage;

  // 3. 根据 status + type + code 进行结构化分类
  switch (status) {
    case 400: {
      let userFacingMessage = "请求参数有误，请修改后重试";
      if (rawCode === "hosted_parameter_not_supported") {
        userFacingMessage = "请求参数不受当前模型支持，请调整参数后重试";
      } else if (rawCode === "invalid_json") {
        userFacingMessage = "请求格式有误，请修改后重试";
      } else if (rawCode === "missing_required_field") {
        userFacingMessage = "请求缺少必要字段，请检查后重试";
      } else if (rawCode === "generation_count") {
        userFacingMessage = "生成候选数量超限，请调小候选数量后重试";
      } else if (rawCode === "total_output") {
        userFacingMessage = "输出预算超限，请调小输出预算后重试";
      } else if (
        rawCode === "unsupported_model_operation" ||
        rawCode === "hosted_capability_not_supported"
      ) {
        userFacingMessage = "当前模型不支持此操作或能力，请调整后重试";
      } else if (rawCode === "auth_error") {
        userFacingMessage = "服务配置异常，请稍后重试";
      }

      return {
        action: "fix-request",
        retryAfterMs: null,
        pausedUntil: null,
        type: rawType ?? "invalid_request_error",
        code: rawCode ?? "invalid_request",
        requestId: rawRequestId,
        param: rawParam,
        userFacingMessage,
        internalMessage,
      };
    }

    case 401: {
      return {
        action: "fatal",
        retryAfterMs: null,
        pausedUntil: null,
        type: rawType ?? "authentication_error",
        code: rawCode ?? "auth_error",
        requestId: rawRequestId,
        userFacingMessage: "服务暂时不可用，请稍后重试",
        internalMessage,
      };
    }

    case 402: {
      return {
        action: "fatal",
        retryAfterMs: null,
        pausedUntil: null,
        type: rawType ?? "permission_error",
        code: rawCode ?? "insufficient_credits",
        requestId: rawRequestId,
        balance: rawBalance,
        topupUrl: rawTopupUrl,
        userFacingMessage: "服务暂时不可用，请稍后重试",
        internalMessage,
      };
    }

    case 403: {
      return {
        action: "fatal",
        retryAfterMs: null,
        pausedUntil: null,
        type: rawType ?? "permission_error",
        code: rawCode ?? "permission_denied",
        requestId: rawRequestId,
        userFacingMessage: "服务暂时不可用，请稍后重试",
        internalMessage,
      };
    }

    case 404: {
      return {
        action: "fix-request",
        retryAfterMs: null,
        pausedUntil: null,
        type: rawType ?? "not_found_error",
        code: rawCode ?? "model_not_found",
        requestId: rawRequestId,
        userFacingMessage: "请求的模型或资源不存在",
        internalMessage,
      };
    }

    case 409: {
      return {
        action: "retry-after",
        retryAfterMs: retryAfterMs ?? 1000,
        pausedUntil: null,
        type: rawType ?? "invalid_request_error",
        code: rawCode ?? "idempotency_conflict",
        requestId: rawRequestId,
        userFacingMessage: "请求正在处理中，请稍候",
        internalMessage,
      };
    }

    case 422: {
      return {
        action: "fatal",
        retryAfterMs: null,
        pausedUntil: null,
        type: rawType ?? "invalid_request_error",
        code: rawCode ?? "idempotency_replay_unavailable",
        requestId: rawRequestId,
        userFacingMessage: "上游请求不可重放，请重新发起对话",
        internalMessage,
      };
    }

    case 429: {
      if (rawCode === "hosted_model_paused") {
        return {
          action: "circuit-open",
          retryAfterMs,
          pausedUntil: rawPausedUntil,
          type: rawType ?? "rate_limit_error",
          code: "hosted_model_paused",
          requestId: rawRequestId,
          userFacingMessage: "当前模型暂时暂停服务，请稍后重试",
          internalMessage,
        };
      }

      return {
        action: "retry-after",
        retryAfterMs,
        pausedUntil: null,
        type: rawType ?? "rate_limit_error",
        code: rawCode ?? "rate_limit_exceeded",
        requestId: rawRequestId,
        userFacingMessage: "当前模型请求过于频繁，请稍后重试",
        internalMessage,
      };
    }

    case 500:
    case 502:
    case 503:
    case 504: {
      let userFacingMessage = "上游服务暂时繁忙，请稍后重试";
      if (rawCode === "limiter_unavailable") {
        userFacingMessage = "上游限流服务暂时不可用，请稍后重试";
      }

      return {
        action: "retry-after",
        retryAfterMs,
        pausedUntil: null,
        type: rawType ?? "api_error",
        code: rawCode ?? (status === 503 ? "service_unavailable" : "internal_error"),
        requestId: rawRequestId,
        userFacingMessage,
        internalMessage,
      };
    }

    default: {
      if (status >= 500) {
        return {
          action: "retry-after",
          retryAfterMs,
          pausedUntil: null,
          type: rawType ?? "api_error",
          code: rawCode ?? "internal_error",
          requestId: rawRequestId,
          userFacingMessage: "上游服务暂时繁忙，请稍后重试",
          internalMessage,
        };
      }
      return {
        action: "fatal",
        retryAfterMs,
        pausedUntil: null,
        type: rawType,
        code: rawCode,
        requestId: rawRequestId,
        userFacingMessage: "上游服务异常，请稍后重试",
        internalMessage,
      };
    }
  }
}
