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


export type GenerationErrorCategory = "config_protocol" | "empty" | "policy" | "transient";

/** Conservative classification: a generic upstream rejection is NOT evidence
 * of moderation or of a safely retryable failure. Never retain prompts, keys,
 * URLs or the raw provider message in persisted diagnostics. */
export function classifyGenerationError(data: any, status?: number) {
  const error = data?.error ?? data;
  const upstreamStatus = error?.status ?? data?.status;
  if (status === undefined && typeof upstreamStatus === "number") status = upstreamStatus;
  const rawCode = error?.code ?? data?.code;
  const code = typeof rawCode === "string" && /^[a-zA-Z0-9_.:-]{1,80}$/.test(rawCode) &&
    !/^(sk-|Bearer|AIza)/i.test(rawCode) ? rawCode : undefined;
  const message = typeof error?.message === "string" ? error.message :
    typeof error?.msg === "string" ? error.msg : typeof data === "string" ? data : "";
  const evidence = `${code ?? ""} ${message}`;
  let category: GenerationErrorCategory = "config_protocol";
  if (/content[_ -]filter|content[_ -]policy|safety[_ -](?:violation|blocked)|policy[_ -]violation|prohibited[_ -]content/i.test(evidence)) {
    category = "policy";
  } else if (/thought_signature|reasoning_effort|not supported|invalid[_ -](?:request|argument)|authentication|api[_ -]key/i.test(evidence) || status === 401 || status === 403) {
    category = "config_protocol";
  } else if (code === "EMPTY_RESPONSE" || /空响应|empty response/i.test(message)) {
    category = "empty";
  } else if (status === 408 || status === 429 || (status !== undefined && status >= 500) ||
    /timeout|timed out|秒内没有返回新内容|network|fetch failed|failed to fetch|ECONNRESET|ECONNREFUSED|EPIPE|socket hang up|connection (?:reset|closed)|rate[_ -]limit|overloaded|temporarily unavailable|internal_server_error|service_unavailable/i.test(evidence)) {
    category = "transient";
  }
  const messages = {
    config_protocol: "模型配置或工具通信不兼容，请联系管理员检查配置；重复发送不会解决此问题。",
    empty: "模型返回了空响应，请联系管理员检查服务响应。",
    policy: "服务商的内容安全规则阻止了本次请求。请检查请求是否符合其规则；不会自动重试或改写内容。",
    transient: "模型服务暂时不可用。你可以稍后手动重试同一模型（新请求可能产生费用）。",
  };
  return {
    category,
    message: messages[category],
    retryable: category === "transient",
    actions: category === "transient" ? ["retry" as const] : [],
    diagnostic: { ...(code ? { code } : {}), ...(status ? { status } : {}) },
  };
}
