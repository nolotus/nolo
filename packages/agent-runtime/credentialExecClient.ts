// packages/agent-runtime/credentialExecClient.ts
//
// credential exec broker 的客户端。
//
// 放在**执行器一侧**（沙盒之外）：只有它能连上 broker 的 unix socket。
// agent 一侧连不上——这不是约定，是 seccomp 强制的（D8 已实测：盒内
// `socket(AF_UNIX)` 返回 EAFNOSUPPORT，见
// `linuxBubblewrapBackend.unixSocket.integration.test.ts`）。
//
// 这里**不做**策略：不解析 ref、不认识凭据存储、不做授权判断。
// 只负责「把请求送过去、把响应读回来」，任何失败（含同步初始化与序列化失败）
// 一律折算成固定错误码，不把底层异常（可能带路径或调用方数据）透给调用方。

import { connect, type Socket } from "node:net";
import type { CredentialExecRequest, CredentialExecResponse } from "./credentialExecBroker";

export type CredentialExecClientOptions = {
  socketPath: string;
  /** 调用方持有的能力 token —— 只在这里用它，不写入环境变量。 */
  token: string;
  /**
   * 传输层超时：限制**整次调用的等待**（默认 90s），应大于 broker 侧的执行超时（默认 60s）。
   *
   * 注意语义差别：broker 的 60s 只限制**子进程执行**；客户端超时后 `destroy()` 会让 broker
   * 取消该连接并阻止「resolver 返回后再启动命令」，但**不会中止 resolver 自身**尚未完成的
   * Promise / 存储读取。所以不能说「resolver 的耗时受客户端超时约束」。
   */
  timeoutMs?: number;
};

const DEFAULT_TIMEOUT_MS = 90_000;

/** 传输层结构校验：JSON 能解析 != 是合法的 broker 响应。 */
const isCredentialExecResponse = (value: unknown): value is CredentialExecResponse => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.ok !== "boolean") return false;
  if (record.exitCode !== undefined && typeof record.exitCode !== "number") return false;
  for (const key of ["stdout", "stderr", "error"] as const) {
    if (record[key] !== undefined && typeof record[key] !== "string") return false;
  }
  return true;
};

/** 发送一条执行请求；**不抛异常**，任何问题都折算成固定错误码。 */
export async function requestCredentialExec(
  options: CredentialExecClientOptions,
  request: Pick<CredentialExecRequest, "ref" | "argv" | "cwd" | "env" | "timeoutMs">,
): Promise<CredentialExecResponse> {
  const { socketPath, token, timeoutMs = DEFAULT_TIMEOUT_MS } = options;

  // 序列化在**建连接之前**做：请求对象可能含循环引用或抛错的 getter，
  // 那属于调用方错误，不该变成连接副作用。
  let payload: string;
  try {
    payload = `${JSON.stringify({ kind: "exec", ...request, token })}\n`;
  } catch {
    return { ok: false, error: "bad_request" };
  }

  return new Promise<CredentialExecResponse>((resolvePromise) => {
    let settled = false;
    let socket: Socket | null = null;
    const finish = (response: CredentialExecResponse) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket?.destroy();
      resolvePromise(response);
    };
    const timer = setTimeout(() => finish({ ok: false, error: "client_timeout" }), timeoutMs);

    try {
      socket = connect(socketPath);
    } catch {
      // 路径非法等**同步**失败：connect 会直接抛，不落进 'error' 事件
      finish({ ok: false, error: "broker_unreachable" });
      return;
    }

    let buffer = "";
    socket.setEncoding("utf8");
    socket.on("connect", () => {
      try {
        socket?.write(payload);
      } catch {
        finish({ ok: false, error: "broker_unreachable" });
      }
    });
    socket.on("data", (chunk: string) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline < 0) return;
      const line = buffer.slice(0, newline);
      try {
        const parsed: unknown = JSON.parse(line);
        finish(isCredentialExecResponse(parsed) ? parsed : { ok: false, error: "bad_broker_response" });
      } catch {
        finish({ ok: false, error: "bad_broker_response" });
      }
    });
    // 连接失败（broker 未启动 / socket 不存在 / 权限不足）都走这里
    socket.on("error", () => finish({ ok: false, error: "broker_unreachable" }));
    socket.on("close", () => {
      // 没有换行、也没有 error：对端提前关闭
      finish({ ok: false, error: "broker_closed" });
    });
  });
}
