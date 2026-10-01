// packages/agent-runtime/oauthRefreshError.ts
//
// OAuth refresh 失败的分类。零依赖（oauthProviders.ts 已 import 各 provider，
// 放在那里会循环依赖）。
//
// 安全纪律：message 只来自固定文案表，绝不拼接上游返回的任何文本
// （error_description 是不可信输入，不能落库、不能回传前端）。

export type OAuthRefreshErrorCode =
  | "invalid_grant"
  | "refresh_token_reused"
  | "invalid_client"
  | "unauthorized"
  | "rate_limited"
  | "http_5xx"
  | "network"
  | "bad_response"
  | "unknown";

/** 永久失败：重试没有意义，必须重新授权（重新 sync 会清掉标记）。 */
export const PERMANENT_REFRESH_CODES: ReadonlySet<OAuthRefreshErrorCode> =
  new Set(["invalid_grant", "refresh_token_reused", "invalid_client"]);

const SAFE_MESSAGES: Record<OAuthRefreshErrorCode, string> = {
  invalid_grant: "refresh token 已失效，请重新授权",
  refresh_token_reused: "refresh token 已被其他副本使用，请重新授权",
  invalid_client: "OAuth 客户端被拒绝，请重新授权",
  unauthorized: "上游拒绝了刷新请求（401/403）",
  rate_limited: "上游限流，稍后重试",
  http_5xx: "上游服务暂时不可用",
  network: "无法连接上游",
  bad_response: "上游返回了无法识别的响应",
  unknown: "刷新失败",
};

export class OAuthRefreshError extends Error {
  readonly code: OAuthRefreshErrorCode;
  readonly status?: number;
  readonly retryAfterMs?: number;

  constructor(
    code: OAuthRefreshErrorCode,
    opts: { status?: number; retryAfterMs?: number } = {},
  ) {
    super(SAFE_MESSAGES[code]);
    this.name = "OAuthRefreshError";
    this.code = code;
    if (opts.status !== undefined) this.status = opts.status;
    if (opts.retryAfterMs !== undefined) this.retryAfterMs = opts.retryAfterMs;
  }

  get permanent(): boolean {
    return PERMANENT_REFRESH_CODES.has(this.code);
  }
}

/** 从 token 端点响应里取 error code：同时认 string 与 {code} 嵌套两种形状。 */
function readErrorCode(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const err = (payload as Record<string, unknown>).error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const code = (err as Record<string, unknown>).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}

export function classifyOAuthRefreshHttpFailure(
  status: number,
  payload: unknown,
  headers?: Headers | null,
): OAuthRefreshError {
  const raw = readErrorCode(payload)?.toLowerCase();
  if (raw === "invalid_grant") return new OAuthRefreshError("invalid_grant", { status });
  if (raw === "refresh_token_reused") {
    return new OAuthRefreshError("refresh_token_reused", { status });
  }
  if (raw === "invalid_client") return new OAuthRefreshError("invalid_client", { status });
  if (status === 429) {
    const seconds = Number(headers?.get("retry-after"));
    return new OAuthRefreshError("rate_limited", {
      status,
      ...(Number.isFinite(seconds) && seconds > 0
        ? { retryAfterMs: seconds * 1000 }
        : {}),
    });
  }
  if (status === 401 || status === 403) return new OAuthRefreshError("unauthorized", { status });
  if (status >= 500) return new OAuthRefreshError("http_5xx", { status });
  return new OAuthRefreshError("unknown", { status });
}

export function toOAuthRefreshError(err: unknown): OAuthRefreshError {
  return err instanceof OAuthRefreshError ? err : new OAuthRefreshError("unknown");
}

/** 落库的失败状态：明文非机密，只含固定文案与分类，不含任何上游文本。 */
export type OAuthRefreshFailure = {
  code: OAuthRefreshErrorCode;
  message: string;
  at: number;
  status?: number;
  /** 连续失败次数（用于指数退避）。 */
  failures: number;
  /** 临时类失败的下次允许重试时刻；永久类没有（直到重新同步）。 */
  nextRetryAt?: number;
};

const TRANSIENT_BASE_MS = 30_000;
const TRANSIENT_MAX_MS = 15 * 60_000;

export function buildRefreshFailure(
  err: OAuthRefreshError,
  prev: OAuthRefreshFailure | undefined,
  now: number,
): OAuthRefreshFailure {
  const failures = (prev?.failures ?? 0) + 1;
  let nextRetryAt: number | undefined;
  if (!err.permanent) {
    const wait =
      err.code === "rate_limited"
        ? (err.retryAfterMs ?? 5 * 60_000)
        : err.code === "unauthorized"
          ? 15 * 60_000
          : Math.min(TRANSIENT_BASE_MS * 2 ** (failures - 1), TRANSIENT_MAX_MS);
    nextRetryAt = now + wait;
  }
  return {
    code: err.code,
    message: err.message,
    at: now,
    failures,
    ...(err.status !== undefined ? { status: err.status } : {}),
    ...(nextRetryAt !== undefined ? { nextRetryAt } : {}),
  };
}

/** 该失败状态下是否应跳过刷新（永久类一直跳过；临时类冷却内跳过）。 */
export function shouldSkipRefresh(
  failure: OAuthRefreshFailure | undefined,
  now: number,
): boolean {
  if (!failure) return false;
  if (PERMANENT_REFRESH_CODES.has(failure.code)) return true;
  return typeof failure.nextRetryAt === "number" && now < failure.nextRetryAt;
}
