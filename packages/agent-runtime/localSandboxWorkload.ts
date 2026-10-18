// packages/agent-runtime/localSandboxWorkload.ts
//
// 渐进第一步（本机 runtime）：bwrap 可用时，让 CLI 的 `execShell` 走
// `LinuxBubblewrapBackend` 的 OS 沙盒。文件工具本轮不动。
//
// workload 形状沿用 `executionWorkload.ts` 的语义：「本 run 的工具调用不跑在
// 宿主默认路径上，而是走一个外部执行通道」，backendId 固定
// `linux-bubblewrap-v1`。
//
// 失败契约：任何失败都返回 `null`，绝不抛错——bwrap 缺失、userns 不可用、
// ticket 被后端拒绝、非 Linux 平台（macOS/Windows）都是常态，不能因此让 run
// 失败。调用方据此把审计记成 `isolation:"none"`（本模块只提供建议值
// `isolation:"os-sandbox"`，落库是后续步）。

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  type ExecutionBackend,
  type ExecutionLease,
  type ExecutionReleaseReason,
  type ExecutionTicket,
} from "./executionBackend";
import { createExecutionChannel, EXECUTION_SHELL_TOOL } from "./executionChannel";
import { LinuxBubblewrapBackend } from "./linuxBubblewrapBackend";

/** 后端标识：与 `LinuxBubblewrapBackend.describe().id` 一致（审计用）。 */
export const LOCAL_SANDBOX_BACKEND_ID = "linux-bubblewrap-v1";
/** 建议的审计隔离级别（本轮不落库，供下一步消费）。 */
export const LOCAL_SANDBOX_ISOLATION = "os-sandbox";

/**
 * 额外只读根的缺省值：`["/usr/share"]`。
 *
 * 为什么需要一个非空值：bubblewrap backend 把「readableRoots 为空」判为非法
 * ticket（见 `linuxBubblewrapBackend.prepare`，该契约有测试锁定），所以
 * 必须给至少一个额外的只读根。选 `/usr/share` 的理由：存在、只读、不含主机标识
 * （**不挂 `/etc`** —— 实测挂上后 `cat /etc/hostname` 能读到真实主机名），
 * 且它不是 backend 内置 ro-bind 的目标路径（`/usr`、`/bin`、`/lib`、`/lib64`），
 * 不会产生嵌套挂载。
 *
 * 需要额外运行时（例如 bun 在 `~/.bun/bin`）时，用 `NOLO_LOCAL_SANDBOX_ROOTS`
 * （冒号分隔）追加；挂载了 `X` 就会把 `X/bin` 前插到沙盒 PATH。
 */
export const DEFAULT_SANDBOX_READABLE_ROOTS: readonly string[] = ["/usr/share"];

/**
 * 不允许作为额外只读根的路径：`/` 会把整个宿主暴露给沙盒，`/etc` 直接泄漏
 * 主机标识（hostname），`/proc` `/sys` `/dev` `/run` 与 backend 自带的
 * PSEUDO_FS 冲突。**过滤而不抛错**：一个坏的环境变量不该让整个 run 失去沙盒；
 * 被丢弃的根由测试锁定，保持可见。
 */
const FORBIDDEN_EXTRA_ROOTS: ReadonlySet<string> = new Set([
  "/", "/etc", "/proc", "/sys", "/dev", "/run",
]);

/**
 * 比 `ExecutionToolChannel` 宽一档：非 `execShell` 返回 `null` = 「不由本
 * workload 接管，调用方自己处理」。`ExecutionToolChannel`（`Promise<string>`）
 * 表达不了这个第三态，故此处单独声明（kind/backendId 等运行时契约不变，
 * `isReadyExecutionWorkload` 仍成立）。
 */
export type LocalSandboxChannel = (
  toolName: string,
  args: Record<string, unknown>,
  signal?: AbortSignal,
) => Promise<string | null>;

export type LocalSandboxWorkload = {
  kind: "external";
  backendId: string;
  /** 建议审计值；调用方在 workload 缺失时记 `isolation:"none"`。 */
  isolation: typeof LOCAL_SANDBOX_ISOLATION;
  channel: LocalSandboxChannel;
};

export type CreateLocalSandboxWorkloadArgs = {
  workspaceRoot: string;
  /** 额外只读根；不得与 workspaceRoot 重叠。缺省 `["/etc"]`。 */
  readableRoots?: string[];
  /** 单次命令预算（ms），透传给 executionChannel。 */
  timeoutMs?: number;
  /** 测试注入缝：缺省 `new LinuxBubblewrapBackend()`。 */
  backend?: ExecutionBackend;
  /** 环境注入缝（判定开关）；缺省 `process.env`。 */
  env?: Record<string, string | undefined>;
};

/**
 * 显式开关。**默认关闭**：沙盒内看不到宿主的凭据与配置（`gh` / git / npm
 * 的登录态），默认开启会静默破坏用户既有命令工作流（实测沙盒内
 * `gh` 报 `not logged in to any hosts`）。需要隔离时由调用方显式打开。
 */
export function isLocalSandboxExecEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.NOLO_LOCAL_SANDBOX_EXEC === "1";
}

const RELEASE_REASON: ExecutionReleaseReason = "completed";

/** 与 `localToolPolicy.normalizeLocalToolName` 同源的轻量归一化。 */
const canonicalToolName = (toolName: unknown): string =>
  typeof toolName === "string"
    ? toolName.trim().replace(/^functions\./i, "")
    : "";

/** POSIX 单引号转义（把 PATH 等值折进 shell 脚本时用）。 */
const quoteForShell = (value: string): string =>
  `'${String(value).replace(/'/g, `'\\''`)}'`;

/** 过滤空串并去重，保留调用方顺序。 */
function normalizeRoots(roots: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const root of roots) {
    if (typeof root !== "string") continue;
    const trimmed = root.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

/**
 * 准备一个本机 OS 沙盒 workload：`prepare(ticket)` 成功才返回，否则 `null`。
 * 调用方负责在 run 收尾/abort 时调用返回的 `release()`（幂等）。
 */
export async function createLocalSandboxWorkload(
  args: CreateLocalSandboxWorkloadArgs,
): Promise<{ workload: LocalSandboxWorkload; release: () => Promise<void> } | null> {
  if (!isLocalSandboxExecEnabled(args?.env ?? process.env)) return null;
  const workspaceRoot = typeof args?.workspaceRoot === "string" ? args.workspaceRoot.trim() : "";
  if (!workspaceRoot) return null;
  const env = args?.env ?? process.env;
  // 显式入参优先；否则「默认根 + NOLO_LOCAL_SANDBOX_ROOTS 追加」（冒号分隔）。
  // 追加而不是替换，是因为默认的 /usr/share 是满足 backend 契约的必需品。
  const envRoots = typeof env.NOLO_LOCAL_SANDBOX_ROOTS === "string"
    ? env.NOLO_LOCAL_SANDBOX_ROOTS.split(":").map((entry) => entry.trim())
    : [];
  const readableRoots = normalizeRoots(
    args.readableRoots && args.readableRoots.length > 0
      ? args.readableRoots
      : [...DEFAULT_SANDBOX_READABLE_ROOTS, ...envRoots],
  ).filter((root) => !FORBIDDEN_EXTRA_ROOTS.has(resolve(root)));
  const backend = args.backend ?? new LinuxBubblewrapBackend();
  const ticket: ExecutionTicket = {
    version: 1,
    ticketId: crypto.randomUUID(),
    grantId: crypto.randomUUID(),
    issuedAt: Date.now(),
    agentKey: "cli-local-sandbox",
    executionClass: "oneshot",
    target: { kind: "server" },
    toolNames: [EXECUTION_SHELL_TOOL],
    filesystem: {
      readScope: "configured-roots",
      readableRoots,
      writeScope: "configured-roots",
      writableRoots: [workspaceRoot],
    },
    shellAllowed: true,
    requestedIsolation: "os-sandbox",
  };

  let lease: ExecutionLease;
  try {
    lease = await backend.prepare(ticket);
  } catch {
    // bwrap 缺失 / userns 不可用 / ticket 被拒 —— 没有沙盒不能等于 run 失败。
    return null;
  }

  const execShell = createExecutionChannel({
    backend,
    lease,
    ...(args.timeoutMs === undefined ? {} : { timeoutMs: args.timeoutMs }),
  });

  let released = false;
  const release = async (): Promise<void> => {
    if (released) return;
    released = true;
    try {
      await backend.release(lease, RELEASE_REASON);
    } catch {
      // 释放失败不改变 run 结果；lease 随进程退出失效。
    }
  };

  const workload: LocalSandboxWorkload = {
    kind: "external",
    backendId: LOCAL_SANDBOX_BACKEND_ID,
    isolation: LOCAL_SANDBOX_ISOLATION,
    channel: async (toolName, toolArgs, signal) => {
      if (canonicalToolName(toolName) !== EXECUTION_SHELL_TOOL) return null;
      const callArgs = toolArgs ?? {};
      // The sandbox starts with a minimal environment. Carry the host PATH so
      // interpreters stay reachable wherever their directories are mounted
      // (missing dirs are simply skipped by the shell). Without this, commands
      // like `bun --version` silently produce no output inside the sandbox.
      const command = typeof callArgs.command === "string" ? callArgs.command : "";
      // Mounted roots contribute their bin/ so interpreters stay reachable even
      // when the host PATH does not contain them (bun lives in ~/.bun/bin and is
      // absent from this machine's PATH). Missing dirs are skipped by the shell.
      const mountedBins = readableRoots
        .map((root) => `${root}/bin`)
        .filter((dir) => existsSync(dir));
      const sandboxPath = [
        ...mountedBins,
        process.env.PATH ?? "/usr/local/bin:/usr/bin:/bin",
      ].join(":");
      const wrapped = command
        ? { ...callArgs, command: `export PATH=${quoteForShell(sandboxPath)};${command}` }
        : callArgs;
      return execShell(EXECUTION_SHELL_TOOL, wrapped, signal);
    },
  };

  return { workload, release };
}
