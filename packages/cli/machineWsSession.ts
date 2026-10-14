import { toErrorMessage } from "core/errorMessage";
import { parsePositiveFiniteNumberOrFallback } from "core/positiveFiniteNumberOrFallback";
import { CORE_DRAIN_REASON } from "core/drainReason";
import type { HeartbeatLoopOptions } from "connector-experimental/heartbeatLoop";
import type { MachineHeartbeat } from "connector-experimental/protocol";
import {
  clampConnectorTimerDelayMs,
  isConnectorWebSocketAuthError,
  isConnectorWebSocketRetryableError,
  resolveConnectorProbeTimeoutMs,
} from "./connectorWebSocketTarget";

type EnvLike = Record<string, string | undefined>;
type OutputLike = { write(chunk: string): unknown };

export type ConnectorWebSocketOptions = {
  headers: Record<string, string>;
  onMessage: (message: string) => void | Promise<void>;
  sentMessages: string[];
  signal?: AbortSignal;
  /**
   * 会话内部收尾信号，与外层 options.signal（命令级取消）分开：session 的有界
   * teardown 到期仍收不回 WS 时 abort 它。复用手柄里已有的 clearKeepalive +
   * ws.close()，不再新写一套关闭逻辑（2026-10-XX 静默卡死：心跳失败但 WS 仍健康
   * 时，旧实现只返回 exitCode 1，旧 socket 无人关闭，每 25s 继续 keepalive，
   * 长期无界累积）。
   */
  teardownSignal?: AbortSignal;
  /** Keepalive interval override; production uses CONNECTOR_WS_KEEPALIVE_MS. */
  keepaliveMs?: number;
};

export type RunMachineWsSessionResult = {
  exitCode: number;
  retryAfterMs?: number;
  reconnectReason?: string;
};

const CONNECTOR_WS_KEEPALIVE_MS = 25_000;

// teardown 必须有界（2026-10-XX connector 静默卡死）：会话收尾时原实现
// `await Promise.allSettled([websocketPromise, heartbeatLoopPromise])` 会死等
// 一个卡住的 promise（心跳循环卡在 await sendHeartbeat 时 abort 叫不停它），
// 于是 session 函数永不返回、外层 5s 重连循环再也走不到。这里改成与一个有界
// timer race：到点就放弃等待，任何未来卡死的 promise 都不能再挂住进程。
const DEFAULT_CONNECTOR_TEARDOWN_TIMEOUT_MS = 2_000;

export function resolveTeardownTimeoutMs(env: EnvLike) {
  return clampConnectorTimerDelayMs(
    parsePositiveFiniteNumberOrFallback(
      env.NOLO_CONNECT_TEARDOWN_TIMEOUT_MS,
      DEFAULT_CONNECTOR_TEARDOWN_TIMEOUT_MS,
    ),
  );
}

/**
 * 有界等待，并如实回报是否「没等到」：调用方必须在 timedOut 时强制收尾
 * （abort teardownSignal），否则放弃等待等于放跑一个仍在运行的 socket。
 */
async function settleWithinTimeout(
  promises: Promise<unknown>[],
  timeoutMs: number,
): Promise<{ timedOut: boolean }> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    const outcome = await Promise.race([
      Promise.allSettled(promises).then(() => "settled" as const),
      new Promise<"timeout">((resolve) => {
        timer = setTimeout(() => resolve("timeout"), timeoutMs);
      }),
    ]);
    return { timedOut: outcome === "timeout" };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function buildConnectorKeepaliveMessage() {
  return JSON.stringify({ type: "connector.keepalive", sentAt: Date.now() });
}

function resolveHeartbeatIntervalMs(env: EnvLike) {
  return clampConnectorTimerDelayMs(
    parsePositiveFiniteNumberOrFallback(env.NOLO_CONNECT_HEARTBEAT_MS, 30_000),
  );
}

export async function defaultConnectWebSocket(
  url: string,
  options: ConnectorWebSocketOptions,
) {
  const WebSocketCtor = globalThis.WebSocket;
  if (!WebSocketCtor) {
    throw new Error("WebSocket is not available in this runtime");
  }
  await new Promise<void>((resolve, reject) => {
    const ws = new WebSocketCtor(url, {
      headers: options.headers,
    } as any);
    let opened = false;
    let aborted = options.signal?.aborted ?? false;
    let keepalive: ReturnType<typeof setInterval> | null = null;
    const clearKeepalive = () => {
      if (keepalive) {
        clearInterval(keepalive);
        keepalive = null;
      }
    };
    const handleAbort = () => {
      aborted = true;
      clearKeepalive();
      try {
        ws.close();
      } catch {
        resolve();
      }
    };
    options.signal?.addEventListener("abort", handleAbort, { once: true });
    options.teardownSignal?.addEventListener("abort", handleAbort, { once: true });
    ws.addEventListener(
      "open",
      () => {
        opened = true;
        keepalive = setInterval(() => {
          try {
            ws.send(buildConnectorKeepaliveMessage());
          } catch {
            clearKeepalive();
            // keepalive 发送失败说明 socket 已经不健康：只看不关的话，既有的
            // close 事件永远不会触发，外层 Promise.race 也永远收不了场
            // （2026-10-XX 静默卡死）。补一次 close()，让会话退出。
            try {
              ws.close();
            } catch {
              resolve();
            }
          }
        }, options.keepaliveMs ?? CONNECTOR_WS_KEEPALIVE_MS);
      },
      { once: true },
    );
    ws.addEventListener("error", () => {
      clearKeepalive();
      if (aborted) {
        resolve();
        return;
      }
      reject(new Error("connector websocket failed"));
    });
    ws.addEventListener(
      "close",
      () => {
        clearKeepalive();
        if (opened || aborted) resolve();
        else reject(new Error("connector websocket closed before opening"));
      },
      { once: true },
    );
    ws.addEventListener("message", (event) => {
      const startIndex = options.sentMessages.length;
      Promise.resolve(options.onMessage(String(event.data)))
        .then(() => {
          for (const message of options.sentMessages.slice(startIndex)) {
            ws.send(message);
          }
        })
        .catch(() => undefined);
    });
  });
}

export async function runMachineWsSession(options: {
  env: EnvLike;
  output: OutputLike;
  machine: MachineHeartbeat;
  serverUrl: string;
  authToken: string;
  signal?: AbortSignal;
  sendHeartbeat: () => Promise<void>;
  runHeartbeatLoop: (options: HeartbeatLoopOptions) => Promise<void>;
  resolveConnectorWebSocketTarget: (args: {
    serverUrl: string;
    machineId: string;
    connectorSurface?: string;
    headers: Record<string, string>;
    probeTimeoutMs?: number;
  }) => Promise<string>;
  connectWebSocket: (url: string, options: ConnectorWebSocketOptions) => Promise<void>;
  onMessage: (message: string, send: (message: string) => void) => void | Promise<void>;
}): Promise<RunMachineWsSessionResult> {
  const sentMessages: string[] = [];
  const heartbeatAbort = new AbortController();
  const teardownAbort = new AbortController();
  const teardownTimeoutMs = resolveTeardownTimeoutMs(options.env);
  let heartbeatLoopPromise: Promise<void> | null = null;
  let websocketPromise: Promise<void> | null = null;
  const settleTeardown = async () => {
    const { timedOut } = await settleWithinTimeout(
      [websocketPromise, heartbeatLoopPromise].filter(Boolean) as Promise<unknown>[],
      teardownTimeoutMs,
    );
    if (timedOut) {
      // 有界等待到期 = WS 还没收场：必须自己收尾，否则旧 socket 会带着
      // keepalive interval 无界存活（外层重连马上新建一个）。
      teardownAbort.abort();
    }
  };
  try {
    if (options.signal?.aborted) {
      return { exitCode: 0 };
    }
    await options.sendHeartbeat();
    options.output.write(
      `Connector websocket connected: ${options.machine.name} (${options.machine.machineId})\n`
    );
    heartbeatLoopPromise = options.runHeartbeatLoop({
      intervalMs: resolveHeartbeatIntervalMs(options.env),
      sendHeartbeat: options.sendHeartbeat,
      signal: heartbeatAbort.signal,
    });
    const heartbeatMonitorPromise = heartbeatLoopPromise.then(() => {
      if (!heartbeatAbort.signal.aborted) {
        throw new Error("connector heartbeat loop ended unexpectedly");
      }
    });
    const wsTarget = await options.resolveConnectorWebSocketTarget({
      serverUrl: options.serverUrl,
      machineId: options.machine.machineId,
      connectorSurface: "cli",
      headers: { Authorization: `Bearer ${options.authToken}` },
      probeTimeoutMs: resolveConnectorProbeTimeoutMs(options.env),
    });
    websocketPromise = options.connectWebSocket(wsTarget, {
      headers: { Authorization: `Bearer ${options.authToken}` },
      signal: options.signal,
      teardownSignal: teardownAbort.signal,
      sentMessages,
      onMessage: (message) =>
        options.onMessage(message, (response) => {
          sentMessages.push(response);
        }),
    });
    const abortPromise = options.signal
      ? new Promise<"aborted">((resolve) => {
          if (options.signal?.aborted) {
            resolve("aborted");
            return;
          }
          options.signal?.addEventListener("abort", () => resolve("aborted"), { once: true });
        })
      : null;
    const raceResult = await Promise.race(
      [websocketPromise, heartbeatMonitorPromise, abortPromise].filter(Boolean) as Promise<void | "aborted">[]
    );
    heartbeatAbort.abort();
    await settleTeardown();
    if (raceResult === "aborted") {
      return { exitCode: 0 };
    }
    return { exitCode: 0 };
  } catch (error) {
    heartbeatAbort.abort();
    await settleTeardown();
    if (isConnectorWebSocketAuthError(error)) {
      options.output.write(
        `[nolo] Connector websocket auth failed: ${error.message}. Re-register this machine or update NOLO_MACHINE_API_KEY.\n`
      );
      return { exitCode: 2 };
    }
    if (isConnectorWebSocketRetryableError(error)) {
      const description =
        error.reason === CORE_DRAIN_REASON ? "core draining" : error.reason;
      options.output.write(
        `[nolo] Connector websocket unavailable: ${description} (${error.message}).\n`
      );
      return {
        exitCode: 1,
        retryAfterMs: error.retryAfterMs,
        reconnectReason: error.reason,
      };
    }
    options.output.write(
      `[nolo] Connector websocket failed: ${toErrorMessage(error)}\n`
    );
    return { exitCode: 1 };
  }
}
