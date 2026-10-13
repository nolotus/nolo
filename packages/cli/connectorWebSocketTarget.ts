import { isGatewayHttpStatus } from "core/gatewayHttpStatus";
import { parseRetryAfterHeaderMs } from "core/retryAfterMs";
import { CORE_DRAIN_REASON } from "core/drainReason";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { parsePositiveFiniteNumberOrFallback } from "core/positiveFiniteNumberOrFallback";
import type { CliFetchImpl } from "./cliFetch";

/**
 * Node / Bun 的 setTimeout 把 delay > 2^31-1 的定时器静默夹到 1ms：一个「几乎
 * 不超时」的超大 env 值会反向变成「立刻超时」。所有 connector 超时/间隔 env
 * 一律夹到 [1, 2^31-1]，让超大值退化成「基本不超时」而不是「马上超时」。
 * 2^31-1 是运行时自身的定时器上限（超过它会被夹到 1ms），因此这是保留「不提前
 * 触发」语义下的最小上界；默认值仍远小于它，有界保证不受影响。
 */
export const MAX_CONNECTOR_TIMER_DELAY_MS = 2_147_483_647;

export function clampConnectorTimerDelayMs(value: number) {
  return Math.min(Math.max(value, 1), MAX_CONNECTOR_TIMER_DELAY_MS);
}

// 探测同样必须有界（2026-10-XX connector 静默卡死）：probe 是裸 fetch，服务器
// 接受 TCP 但不回响应头时它永不 settle，而它在任何 socket 创建之前执行 → 整个
// session 永不返回，外层 5s 重连循环也走不到。超时按「探测不可用」处理，回落
// directWsUrl（与 !response 分支同语义），不抛错、不改变重连语义。
export const DEFAULT_CONNECTOR_PROBE_TIMEOUT_MS = 5_000;

export function resolveConnectorProbeTimeoutMs(
  env: Record<string, string | undefined>,
) {
  return clampConnectorTimerDelayMs(
    parsePositiveFiniteNumberOrFallback(
      env.NOLO_CONNECT_PROBE_TIMEOUT_MS,
      DEFAULT_CONNECTOR_PROBE_TIMEOUT_MS,
    ),
  );
}

/**
 * 有界探测：AbortSignal 取消底层连接（正常运行时能让 fetch 立刻收场），
 * Promise.race 兜底（fetchImpl 忽略 signal 的测试 stub / 运行时怪癖也不会挂住）。
 * 超时返回 null，与「探测失败」走同一条回落路径。
 */
async function probeConnectorWebSocketTarget(args: {
  fetchImpl: CliFetchImpl;
  probeUrl: URL;
  headers: Record<string, string>;
  timeoutMs: number;
}): Promise<Response | null> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, args.timeoutMs);
  });
  try {
    return await Promise.race([
      args
        .fetchImpl(args.probeUrl, { headers: args.headers, signal: controller.signal })
        .catch(() => null),
      timeoutPromise,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class ConnectorWebSocketAuthError extends Error {
  code: string;

  constructor(message: string, code = "CONNECTOR_AUTH_FAILED") {
    super(message);
    this.name = "ConnectorWebSocketAuthError";
    this.code = code;
  }
}

export function isConnectorWebSocketAuthError(error: unknown): error is ConnectorWebSocketAuthError {
  return error instanceof ConnectorWebSocketAuthError;
}

export class ConnectorWebSocketRetryableError extends Error {
  reason: string;
  retryAfterMs?: number;

  constructor(message: string, options: { reason?: string; retryAfterMs?: number } = {}) {
    super(message);
    this.name = "ConnectorWebSocketRetryableError";
    this.reason = options.reason ?? "retryable";
    this.retryAfterMs = options.retryAfterMs;
  }
}

export function isConnectorWebSocketRetryableError(
  error: unknown
): error is ConnectorWebSocketRetryableError {
  return error instanceof ConnectorWebSocketRetryableError;
}

function parseRetryAfterMs(response: Response, bodyRetryAfterMs?: unknown) {
  const headerDelayMs = parseRetryAfterHeaderMs(response.headers.get("Retry-After"));
  if (headerDelayMs != null) return headerDelayMs;
  // Optional body ms: keep undefined when absent/invalid (no invented default).
  const parsed = Number(bodyRetryAfterMs);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : undefined;
}

export async function resolveConnectorWebSocketTarget(input: {
  serverUrl: string;
  machineId: string;
  connectorSurface?: string;
  headers: Record<string, string>;
  fetchImpl?: CliFetchImpl;
  /** Probe deadline override; production resolves NOLO_CONNECT_PROBE_TIMEOUT_MS. */
  probeTimeoutMs?: number;
  /** Env source for the probe deadline; defaults to process.env. */
  env?: Record<string, string | undefined>;
}) {
  const directWsUrl = new URL(input.serverUrl);
  directWsUrl.protocol = directWsUrl.protocol === "https:" ? "wss:" : "ws:";
  directWsUrl.pathname = "/api/connector/ws";
  directWsUrl.search = "";
  directWsUrl.searchParams.set("machineId", input.machineId);
  const connectorSurface = asTrimmedLowercaseString(input.connectorSurface);
  if (connectorSurface) {
    directWsUrl.searchParams.set("connectorSurface", connectorSurface);
  }

  const probeUrl = new URL(input.serverUrl);
  probeUrl.pathname = "/api/connector/ws";
  probeUrl.search = directWsUrl.search;

  const probeTimeoutMs =
    input.probeTimeoutMs ??
    resolveConnectorProbeTimeoutMs(input.env ?? process.env);
  const response = await probeConnectorWebSocketTarget({
    fetchImpl: input.fetchImpl ?? fetch,
    probeUrl,
    headers: input.headers,
    timeoutMs: clampConnectorTimerDelayMs(probeTimeoutMs),
  });

  if (response && (response.status === 401 || response.status === 403)) {
    const json = await response.json().catch(() => null);
    const code = typeof json?.code === "string" ? json.code : "CONNECTOR_AUTH_FAILED";
    const message = typeof json?.error === "string" ? json.error : `Connector auth failed with HTTP ${response.status}`;
    throw new ConnectorWebSocketAuthError(`${code}: ${message}`, code);
  }

  if (response && !response.ok) {
    const json = await response.clone().json().catch(() => null);
    const retryable =
      json?.retryable === true ||
      json?.reason === CORE_DRAIN_REASON ||
      isGatewayHttpStatus(response.status);
    if (retryable) {
      const reason = typeof json?.reason === "string" ? json.reason : "retryable";
      const message =
        typeof json?.error === "string"
          ? json.error
          : `Connector websocket unavailable with HTTP ${response.status}`;
      throw new ConnectorWebSocketRetryableError(message, {
        reason,
        retryAfterMs: parseRetryAfterMs(response, json?.retryAfterMs),
      });
    }
  }

  if (!response || !response.ok) {
    return directWsUrl.toString();
  }

  const json = await response.json().catch(() => null);
  return typeof json?.wsUrl === "string" && json.wsUrl
    ? json.wsUrl
    : directWsUrl.toString();
}
