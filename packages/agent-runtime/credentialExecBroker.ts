// packages/agent-runtime/credentialExecBroker.ts
//
// 本地凭据**执行** broker（骨架）。
//
// 目的：让「凭据解析」发生在**沙盒之外**的执行器里，值永远不经过 agent 可见的面。
// D8 已用真实 bwrap 验证前提：盒内无法新建 AF_UNIX socket（errno 97/13），
// 因此 broker 走 unix socket 时 agent 连都连不上（见
// `linuxBubblewrapBackend.unixSocket.integration.test.ts`）。
//
// 与 `credentialBroker.ts`（既有的**存储** broker 契约）**是两个东西**：这里不定义
// 存储契约，只在 unix socket 上执行「解析 → 注入 → 运行」。
//
// 这一版只做四件事，不做策略：
// 1. 收一行 JSON 请求（大小上限、读取超时、取消语义）；
// 2. 用注入进来的 resolver 把 ref 解析成「要注入的环境变量」；
// 3. 带这些环境变量执行命令（进程组、输出上限、超时整组回收）；
// 4. 回传 stdout/stderr/exitCode。
//
// 刻意的边界：
// - **值永不进响应**（除非子进程自己打印出来——那是子进程的行为，不是 broker 的）；
// - **token 必填**，且不从环境变量读（环境变量会被子进程继承，agent 也就拿到了）；
// - **不把 broker 自己的 process.env 传给子进程**（可能有 SECRET_KEY 之类）；
// - **resolver 由调用方注入**：broker 不认识凭据存储、不做命名空间解析、不做授权判断
//   ——那些属 D5/D6 的范围，避免在这里长出一个半成品策略层。

import { createServer, type Server, type Socket } from "node:net";
import { spawn } from "node:child_process";
import { chmod, mkdir, stat } from "node:fs/promises";
import { dirname } from "node:path";

export type CredentialExecRequest = {
  kind: "exec";
  /** 凭据引用；由 resolver 解释。 */
  ref: string;
  /** 执行的命令（不经 shell；需要 shell 语义时自己传 sh -c）。 */
  argv: string[];
  cwd?: string;
  /** 额外环境变量（不含凭据；凭据由 resolver 合并进来）。 */
  env?: Record<string, string>;
  timeoutMs?: number;
  /** 调用方持有的能力 token。 */
  token: string;
};

export type CredentialExecResponse = {
  ok: boolean;
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  /** 固定错误码；不携带原始异常信息（可能带出路径或值）。 */
  error?: string;
};

/** 把 ref 解析成要注入的环境变量；返回 null 表示「没有这条凭据」。 */
export type CredentialResolver = (ref: string) => Promise<Record<string, string> | null>;

export type CredentialExecBrokerHandle = {
  socketPath: string;
  close: () => Promise<void>;
};

export type CredentialExecBrokerOptions = {
  socketPath: string;
  /** 调用方持有的 token；broker 只做相等比较。 */
  token: string;
  resolve: CredentialResolver;
  /** 单条请求的服务端上限；请求里的 timeoutMs 不得超过它。 */
  maxTimeoutMs?: number;
  /** 同时处理的连接数上限（含读请求阶段）。 */
  maxConcurrent?: number;
};

/** 单条请求体上限（字节）。 */
const MAX_REQUEST_BYTES = 64 * 1024;
/** stdout + stderr 合计上限（字节）。 */
const MAX_OUTPUT_BYTES = 1024 * 1024;
/** 读请求的等待上限（毫秒）。 */
const REQUEST_READ_TIMEOUT_MS = 5_000;
const DEFAULT_MAX_TIMEOUT_MS = 60_000;
const DEFAULT_MAX_CONCURRENT = 8;

/** 允许透传给子进程的基础环境白名单（其余 broker 自身环境一律不下传）。 */
const BASE_ENV_KEYS = [
  "PATH",
  "HOME",
  "LANG",
  "LC_ALL",
  "TZ",
  "TERM",
  "TMPDIR",
  "USER",
  "SHELL",
] as const;

const baseEnv = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const key of BASE_ENV_KEYS) {
    const value = process.env[key];
    if (value) out[key] = value;
  }
  return out;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string" && item.length > 0);

/**
 * 准备 socket 所在目录。
 *
 * 调用方必须提供**专属目录**。新建时用 0700；若目录已存在，则先验证
 * 「是目录 / 属主是当前用户 / 组与其它用户不可写」——
 * **不满足就拒绝启动**，不会替调用方放宽或改写其它目录的语义；
 * 验证通过后才把它收紧到 0700（这是幂等收紧，不是替用户改共享目录）。
 */
const prepareSocketDir = async (socketPath: string): Promise<void> => {
  const dir = dirname(socketPath);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const info = await stat(dir);
  if (!info.isDirectory()) throw new Error("socket directory is not a directory");
  const uid = typeof process.getuid === "function" ? process.getuid() : undefined;
  if (uid !== undefined && info.uid !== uid) throw new Error("socket directory is not owned by this user");
  if ((info.mode & 0o022) !== 0) {
    throw new Error("socket directory is group/other writable; use a dedicated private directory");
  }
  await chmod(dir, 0o700);
};

/** 读一行请求；超限/超时/断开都会 reject，且**停止接收**（不继续缓冲）。 */
const readRequestLine = (socket: Socket): Promise<string> =>
  new Promise((resolvePromise, reject) => {
    let buffer = "";
    let done = false;
    const cleanup = () => {
      socket.off("data", onData);
      socket.off("end", onEnd);
      socket.off("error", onError);
      clearTimeout(timer);
    };
    const finish = (error: Error | null, value?: string) => {
      if (done) return;
      done = true;
      cleanup();
      if (error) {
        socket.destroy();
        reject(error);
      } else {
        resolvePromise(value ?? "");
      }
    };
    let bytes = 0;
    const onData = (chunk: string) => {
      buffer += chunk;
      // 按 UTF-8 **字节**累计：字符串 length 是 UTF-16 码元数，多字节请求会超出宣称的字节上限
      bytes += Buffer.byteLength(chunk, "utf8");
      if (bytes > MAX_REQUEST_BYTES) {
        finish(new Error("request_too_large"));
        return;
      }
      const newline = buffer.indexOf("\n");
      if (newline >= 0) {
        socket.pause();
        finish(null, buffer.slice(0, newline));
      }
    };
    const onEnd = () => {
      if (buffer.trim()) finish(null, buffer);
      else finish(new Error("empty_request"));
    };
    const onError = (error: Error) => finish(error);
    const timer = setTimeout(() => finish(new Error("request_timeout")), REQUEST_READ_TIMEOUT_MS);

    socket.setEncoding("utf8");
    socket.on("data", onData);
    socket.on("end", onEnd);
    socket.on("error", onError);
  });

export async function startCredentialExecBroker(
  options: CredentialExecBrokerOptions,
): Promise<CredentialExecBrokerHandle> {
  const {
    socketPath,
    token,
    resolve,
    maxTimeoutMs = DEFAULT_MAX_TIMEOUT_MS,
    maxConcurrent = DEFAULT_MAX_CONCURRENT,
  } = options;

  await prepareSocketDir(socketPath);

  // 槽位在**第一次 await 之前**就占住，否则并发上限可以被并发请求绕过。
  let active = 0;
  /** 活动连接，用于关闭时强制收尾（否则 server.close() 会一直等）。 */
  const sockets = new Set<Socket>();
  /** 每个连接的取消函数（连接错误 / 提前关闭 / broker 关停都走它）。 */
  const cancels = new Set<() => void>();
  /** 已启动的子进程回收 promise：close() 要等它们真的结束。 */
  const runningChildren = new Set<Promise<void>>();
  let closing = false;

  const server: Server = createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    if (closing) {
      // 关停期间不再准入：否则新连接可能卡在 resolver 里，让最后的 server.close() 无限等待
      socket.on("error", () => {});
      socket.end(`${JSON.stringify({ ok: false, error: "shutting_down" })}\n`);
      return;
    }
    if (active >= maxConcurrent) {
      // 拒绝分支同样需要 error 监听器：socket.end() 期间对端断开会产生未处理的 'error'
      socket.on("error", () => {});
      socket.end(`${JSON.stringify({ ok: false, error: "too_many_requests" })}\n`);
      return;
    }
    active += 1;
    let settled = false;
    /** 已启动的子进程组：连接出错时要一并回收。 */
    let killRunning: (() => void) | null = null;
    const settle = (payload: CredentialExecResponse) => {
      if (settled) return;
      settled = true;
      active -= 1; // 幂等：settle 只会被调用一次（error/close 两条路径都走它）
      if (!socket.destroyed) socket.write(`${JSON.stringify(payload)}\n`);
      socket.end();
    };
    // 连接级取消：幂等，三个入口共用（连接错误 / 提前关闭 / broker 关停）。
    let cancelled = false;
    const cancel = () => {
      if (cancelled) return;
      cancelled = true;
      killRunning?.();
      settle({ ok: false, error: "cancelled" });
    };
    cancels.add(cancel);
    // 连接级错误处理：读请求结束后 socket 仍可能在写响应时出错（客户端断开/重置）。
    // 没有这层，EventEmitter 的 'error' 会变成未处理异常，整个 broker 进程退出。
    socket.on("error", cancel);
    socket.on("close", () => {
      cancels.delete(cancel);
      // 提前关闭（请求还没结束）：取消并回收，避免 resolver 返回后仍去 spawn
      if (!settled) cancel();
    });

    void (async () => {
      try {
        let raw: string;
        try {
          raw = await readRequestLine(socket);
        } catch {
          settle({ ok: false, error: "bad_request" });
          return;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          settle({ ok: false, error: "invalid_request" });
          return;
        }
        if (!isPlainObject(parsed)) {
          settle({ ok: false, error: "invalid_request" });
          return;
        }
        const request = parsed as unknown as CredentialExecRequest;
        if (
          request.kind !== "exec" ||
          typeof request.ref !== "string" ||
          !isNonEmptyStringArray(request.argv) ||
          typeof request.token !== "string"
        ) {
          settle({ ok: false, error: "invalid_request" });
          return;
        }
        if (request.token !== token) {
          settle({ ok: false, error: "unauthorized" });
          return;
        }
        const timeoutMs =
          typeof request.timeoutMs === "number" && Number.isFinite(request.timeoutMs) && request.timeoutMs > 0
            ? Math.min(request.timeoutMs, maxTimeoutMs)
            : maxTimeoutMs;

        let injected: Record<string, string> | null;
        try {
          injected = await resolve(request.ref);
        } catch {
          settle({ ok: false, error: "resolver_failed" });
          return;
        }
        if (cancelled || closing) {
          settle({ ok: false, error: "cancelled" });
          return;
        }
        if (!injected) {
          settle({ ok: false, error: "unknown_credential" });
          return;
        }

        let child;
        try {
          child = spawn(request.argv[0]!, request.argv.slice(1), {
            cwd: request.cwd,
            // **不把 broker 自己的 process.env 整个传下去**：broker 进程的环境里可能有
            // SECRET_KEY 之类的服务端秘密，而子进程是 agent 的命令——那等于把秘密交给了 agent。
            env: { ...baseEnv(), ...(request.env ?? {}), ...injected },
            // 独立进程组：超时/超限时能整组回收，避免后代继续持有凭据与管道。
            detached: true,
          });
        } catch {
          settle({ ok: false, error: "spawn_failed" });
          return;
        }

        let stdout = "";
        let stderr = "";
        let outputBytes = 0;
        let overflow = false;
        const killGroup = () => {
          try {
            if (child.pid) process.kill(-child.pid, "SIGKILL");
          } catch {
            try {
              child.kill("SIGKILL");
            } catch {
              /* 已经退出 */
            }
          }
        };

        let timedOut = false;
        killRunning = killGroup;
        const timer = setTimeout(() => {
          timedOut = true;
          killGroup();
        }, timeoutMs);

        const onChunk = (target: "stdout" | "stderr") => (chunk: Buffer) => {
          if (overflow) return;
          outputBytes += chunk.length;
          if (outputBytes > MAX_OUTPUT_BYTES) {
            overflow = true;
            killGroup();
            return;
          }
          if (target === "stdout") stdout += chunk.toString("utf8");
          else stderr += chunk.toString("utf8");
        };
        child.stdout?.on("data", onChunk("stdout"));
        child.stderr?.on("data", onChunk("stderr"));

        // 子进程启动失败（ENOENT / EACCES / 无效 cwd）走 'error' 事件，不会被 try/catch 捕获。
        child.on("error", () => {
          clearTimeout(timer);
          settle({ ok: false, error: "spawn_failed" });
        });
        const done = new Promise<void>((resolveDone) => {
          child.once("close", () => resolveDone());
        });
        runningChildren.add(done);
        void done.finally(() => runningChildren.delete(done));

        child.on("close", (code) => {
          clearTimeout(timer);
          killRunning = null;
          if (overflow) {
            settle({ ok: false, error: "output_limit_exceeded" });
            return;
          }
          if (timedOut) {
            settle({ ok: false, error: "timeout" });
            return;
          }
          settle({ ok: code === 0, exitCode: code ?? -1, stdout, stderr });
        });
      } catch {
        // 兜底：任何意外都只回固定错误码，绝不让连接处理变成未处理拒绝。
        settle({ ok: false, error: "broker_error" });
      }
    })();
  });

  await new Promise<void>((resolvePromise, reject) => {
    server.once("error", reject);
    server.listen(socketPath, () => resolvePromise());
  });
  await chmod(socketPath, 0o600);

  return {
    socketPath,
    close: async () => {
      closing = true;
      // 顺序很重要：先停止监听（拿到它的完成 promise），再取消在途请求、回收子进程，
      // 最后等服务器真正关闭。否则等待期间仍可能接进新连接。
      const closed = new Promise<void>((resolvePromise) => server.close(() => resolvePromise()));
      for (const cancel of [...cancels]) cancel();
      for (const socket of sockets) socket.destroy();
      sockets.clear();
      cancels.clear();
      await Promise.allSettled([...runningChildren]);
      await closed;
    },
  };
}
