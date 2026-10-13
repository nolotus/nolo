// 处理失败的API响应

/**
 * Actionable affordances offered by an error card for a classified API error.
 * `retry` starts a fresh turn id (never an automatic re-send of a paid request).
 */
export type ApiErrorAction = "compact-and-retry" | "new-dialog" | "switch-model" | "retry";

/**
 * Full action surface for a context-overflow rejection (plan §4.1): compress the
 * history and retry, open a fresh dialog, switch to a larger-window model, or
 * plain retry. Order is UI order.
 */
export const CONTEXT_OVERFLOW_ACTIONS: readonly ApiErrorAction[] = [
  "compact-and-retry",
  "new-dialog",
  "switch-model",
  "retry",
];

/** Leans toward compaction for oversize (413) but no auto-compress promise. */
export const CONTEXT_TOO_LARGE_ACTIONS: readonly ApiErrorAction[] = [
  "new-dialog",
  "switch-model",
  "retry",
];

export type ApiErrorKind =
  | "context_overflow"
  | "context_too_large"
  | "compaction_timeout"
  | "auth"
  | "timeout"
  | "rate_limit"
  | "server"
  | "generic";

/**
 * Structured view of a failed API response. `message` is the human string
 * (unchanged, what `parseApiError` returns); `kind` + `actions` give the error
 * card enough structure to render the right affordances without string matching
 * the Chinese message.
 */
export interface ApiErrorInfo {
  kind: ApiErrorKind;
  message: string;
  code: string | null;
  status: number;
  retryable: boolean;
  actions?: ApiErrorAction[];
}

/** Fields a caller already has; extracted so classification is pure + testable. */
export interface ClassifyApiErrorInput {
  status: number;
  statusText?: string;
  message: string;
  body: string;
  code: string | null;
}

const truncateErrorMessage = (message: string, maxChars = 320): string =>
  message.length <= maxChars ? message : `${message.slice(0, maxChars)}…`;

/**
 * Shared context-overflow detector for provider / server error text. Exported so
 * the local-turn stream classifier can reuse one source of truth (it used to
 * carry a duplicate regex — the review flagged the split truth).
 *
 * 覆盖面（上游各家措辞不一，宁可宽不可漏——漏判会让错误卡退化成 generic，
 * 用户失去「压缩并重试 / 开新对话 / 切换模型」三个出口）：
 *  - OpenAI/Anthropic: "maximum context length", "context length exceeded"
 *  - 通用: "context window", "context overflow", "context limit"
 *  - DeepSeek/本地: "context_length_exceeded"（含其它后缀）
 *  - Gemini: "prompt is too long", "exceeds the model's maximum..."
 */
export const isContextOverflowText = (message: string): boolean =>
  /maximum context|context (length|window|overflow|limit)|context_length_exceed\w*|requested about .*tokens|too many tokens|prompt is too long|exceeds? (the )?(model|max)/i.test(
    message,
  );

/**
 * Pure classification from already-parsed response facts. Produces the human
 * `message` (byte-compatible with the previous `parseApiError`) plus structured
 * `kind` / `actions`.
 */
export function classifyApiError(input: ClassifyApiErrorInput): ApiErrorInfo {
  const { status, message, body, code } = input;
  const errorMessage = message;
  let defaultMessage = `状态码 ${status} ${input.statusText ?? ""}`;

  switch (status) {
    case 400:
      if (isContextOverflowText(errorMessage) || isContextOverflowText(body) || code === "UPSTREAM_400") {
        return {
          kind: "context_overflow",
          message: "上下文过长：本轮消息或工具结果太大。请缩小范围，或先读取更小片段后再继续。",
          code,
          status,
          retryable: true,
          actions: [...CONTEXT_OVERFLOW_ACTIONS],
        };
      }
      if (code === "MISSING_PROVIDER_API_KEY") {
        return {
          kind: "generic",
          message: truncateErrorMessage(errorMessage),
          code,
          status,
          retryable: false,
        };
      }
      if (errorMessage && errorMessage !== defaultMessage) {
        return {
          kind: "generic",
          message: `请求参数错误: ${truncateErrorMessage(errorMessage)}`,
          code,
          status,
          retryable: false,
        };
      }
      return { kind: "generic", message: "请求参数错误，请检查输入", code, status, retryable: false };
    case 413:
      return {
        kind: "context_too_large",
        message: "请求内容过大：请减少一次发送的消息、文件或工具结果。",
        code,
        status,
        retryable: true,
        actions: [...CONTEXT_TOO_LARGE_ACTIONS],
      };
    case 401:
      return {
        kind: "auth",
        message:
          code === "AUTH_TOKEN_EXPIRED"
            ? "登录状态已过期，请先登出后重新登录"
            : code === "AUTH_ACCOUNT_INVALID"
              ? "账户无效或已被停用，请联系管理员"
              : code === "AUTH_NO_TOKEN"
                ? "未检测到登录状态，请先登录"
                : code === "AUTH_INVALID_TOKEN"
                  ? "登录凭证无效，请先登出后重新登录"
                  : code === "AUTH_TOKEN_NOT_ACTIVE"
                    ? "令牌尚未生效，请稍后再试"
                    : errorMessage && errorMessage !== `状态码 401 Unauthorized`
                      ? `认证错误: ${truncateErrorMessage(errorMessage)}`
                      : "身份验证失败，请先登出后重新登录",
        code,
        status,
        retryable: true,
        actions: ["retry"],
      };
    case 503:
      return {
        kind: "server",
        message:
          errorMessage && errorMessage !== `状态码 503 Service Unavailable`
            ? truncateErrorMessage(errorMessage)
            : "服务暂时不可用，请稍后再试",
        code,
        status,
        retryable: true,
        actions: ["retry"],
      };
    case 504:
      return {
        kind: "timeout",
        message: "请求超时，请稍后再试",
        code,
        status,
        retryable: true,
        actions: ["retry"],
      };
    default:
      return {
        kind: "generic",
        message: `API请求失败: ${truncateErrorMessage(errorMessage)}`,
        code,
        status,
        retryable: true,
        actions: ["retry"],
      };
  }
}

/** Parse a failed API `Response` into structured `ApiErrorInfo`. */
export async function parseApiErrorInfo(response: Response): Promise<ApiErrorInfo> {
  const errorBody = await response.text();
  let errorMessage = `状态码 ${response.status} ${response.statusText}`;
  let errorCode: string | null = `E${response.status}`;

  try {
    const errorJson = JSON.parse(errorBody);
    errorMessage = errorJson?.error?.message || errorJson?.message || errorJson?.msg || errorBody || errorMessage;
    errorCode = errorJson?.error?.code || errorJson?.code || errorCode;
  } catch (_e) {
    if (errorBody) {
      errorMessage = errorBody;
    }
  }

  return classifyApiError({
    status: response.status,
    statusText: response.statusText,
    message: errorMessage,
    body: errorBody,
    code: errorCode,
  });
}

/**
 * Human-readable error string (unchanged contract — all existing callers keep
 * working). Prefer `parseApiErrorInfo` where the card needs structured actions.
 */
export async function parseApiError(response: Response): Promise<string> {
  return (await parseApiErrorInfo(response)).message;
}
