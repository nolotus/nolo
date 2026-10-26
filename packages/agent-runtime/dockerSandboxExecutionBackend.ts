/**
 * Docker 云沙盒 ExecutionBackend（`kind: "cloud"`）。
 *
 * 定位：这是一个**执行后端**，不是「run 落点」。ticket.target 仍是 server|machine
 * 的既有词汇——run 的落点不变，变的是「工具/命令在哪执行」：从宿主机进程换成
 * 一次性的 Docker 云沙盒。这样既拿到容器隔离，又不会制造「点名 A 落到 B」的位置漂移。
 *
 * 复用（不重写）：
 * - `dockerSandboxCloudSpec.buildSbxCloudCreateArgv`：create argv 单一真值（无 `--shape`）。
 * - `dockerBudgetAdmission.calculateEstimatedBudget`：nanoUSD bigint 预算，向上取整。
 * - `dockerQuotaStore`：KV 记录/键与 File/Remote store。
 *
 * 诚实申报：`streamingExec: false`（sbx exec 无实时流，stdout/stderr 在进程结束后一次投递）、
 * `processSignals: false`、`persistentFilesystem: false`、`inboundPorts/networkPolicy/snapshots/gpu: false`。
 *
 * 释放语义：`release()` 只发 `sbx --cloud stop`（挂起并保留状态），**从不删除**沙盒；
 * stop 未被确认时抛 `stop-unverified` 并带 `cleanupPending: true`，绝不谎报已清理。
 */

import type {
  ExecutionBackend,
  ExecutionBackendDescriptor,
  ExecutionEvent,
  ExecutionLease,
  ExecutionReleaseReason,
  ExecutionRequest,
  ExecutionResult,
  ExecutionTicket,
} from "./executionBackend";
import { calculateEstimatedBudget } from "./dockerBudgetAdmission";
import {
  SANDBOX_DEFAULT_SHAPE,
  buildSbxCloudCreateArgv,
} from "./dockerSandboxCloudSpec";
import {
  buildDockerQuotaKey,
  InMemoryDockerQuotaKvStore,
  type DockerQuotaKvStore,
  type DockerQuotaRecord,
} from "./dockerQuotaStore";

export const DOCKER_SANDBOX_BACKEND_ID = "docker-sandbox-cloud";

export type DockerSandboxBackendFailureCode =
  | "invalid-ticket"
  | "quota-unverifiable"
  | "quota-insufficient"
  | "concurrency-rejected"
  | "create-failed"
  | "lease-not-found"
  | "lease-mismatch"
  | "lease-released"
  | "unsupported-request"
  | "exec-timeout"
  | "exec-failed"
  | "quota-record-failed"
  | "stop-unverified";

/** 对外只允许出现固定安全文案；不透传 sbx stdout/stderr 原文。 */
const SAFE_MESSAGE: Record<DockerSandboxBackendFailureCode, string> = {
  "invalid-ticket": "Rejected: execution ticket cannot be satisfied by the docker sandbox backend",
  "quota-unverifiable": "Rejected before any sandbox side effect: docker quota could not be verified",
  "quota-insufficient": "Rejected before any sandbox side effect: docker quota is below the estimated budget",
  "concurrency-rejected": "Rejected: this docker account already holds the maximum number of active sandboxes",
  "create-failed": "Sandbox create failed",
  "lease-not-found": "Unknown execution lease",
  "lease-mismatch": "Lease does not match this backend or ticket",
  "lease-released": "Lease was already released",
  "unsupported-request": "Request kind is not supported by the docker sandbox backend",
  "exec-timeout": "Sandbox exec exceeded the backend execution bound and was killed",
  "exec-failed": "Sandbox exec could not be completed",
  "quota-record-failed": "Sandbox run aborted: docker quota bookkeeping could not be persisted",
  "stop-unverified": "Sandbox stop could not be confirmed; cleanup is pending",
};

export class DockerSandboxBackendError extends Error {
  readonly code: DockerSandboxBackendFailureCode;
  /** true = 云端可能仍有存活沙盒，调用方不得当作已清理。 */
  readonly cleanupPending: boolean;

  constructor(
    code: DockerSandboxBackendFailureCode,
    detail?: string,
    cleanupPending = false,
  ) {
    super(detail ? `${SAFE_MESSAGE[code]} (${detail})` : SAFE_MESSAGE[code]);
    this.name = "DockerSandboxBackendError";
    this.code = code;
    this.cleanupPending = cleanupPending;
  }
}

export type SbxCommandOutcome = {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  /** true = 已超出本次调用上界、被本模块强制杀掉（不是命令自身的退出）。 */
  timedOut?: boolean;
};

export type SbxRunOptions = {
  /** 本次 sbx 调用的执行上界；缺省 = 调用方自己负责上界。 */
  timeoutMs?: number;
};

/**
 * 注入实现必须兑现 `options.timeoutMs`（默认实现会 kill 子进程并回 `timedOut`）：
 * 不兑现则本后端对 exec 就没有上界，await 也就没有解锁路径。
 */
export type SbxCommandFn = (
  args: readonly string[],
  options?: SbxRunOptions,
) => Promise<SbxCommandOutcome>;

export type DockerSandboxQuotaSnapshot =
  | {
      ok: true;
      availableNanoUsd: bigint;
      /** 计费规格对应的每秒单价（nanoUSD）。 */
      rateNanoUsd: bigint;
      observedAt: number;
    }
  | { ok: false; reason: string };

export type DockerSandboxQuotaProvider = () => Promise<DockerSandboxQuotaSnapshot>;

export interface DockerSandboxExecutionBackendDeps {
  /** 默认实现 = node:child_process 数组传参、不启用 shell。 */
  runSbx?: SbxCommandFn;
  /** Trusted lifecycle journal reserves this name before create. */
  sandboxName?: string;
  /** 缺省视为「额度不可核实」→ 一律拒绝，绝不默认放行。 */
  quotaProvider?: DockerSandboxQuotaProvider;
  /**
   * 是否用 quotaProvider 核实余额（默认 true = 既有 fail-closed 语义）。
   * false 时跳过核实、但仍按固定费率记账；由**入口**按部署注入，模块不读 env。
   */
  quotaVerify?: boolean;
  /** 缺省为进程内 KV（只适合测试）；生产必须注入 File/Remote store。 */
  kvStore?: DockerQuotaKvStore;
  now?: () => number;
  owner?: string;
  dockerAccount?: string;
  shapeId?: string;
  ttlMinutes?: number;
  maxOutputChars?: number;
  /** exec 的默认上界（ms）。请求里的 timeoutMs 只能收紧它，不能放宽。 */
  execTimeoutMs?: number;
  /**
   * 按工具分档的 exec 上界（ms）：shell 类 argv 用 `shellMs`，其余用 `defaultMs`。
   * 未提供的档位回落到 `execTimeoutMs`（再回落 DEFAULT_EXEC_TIMEOUT_MS），
   * 因此不传本字段 = 与既有单档行为逐位一致。
   */
  execTimeouts?: { defaultMs?: number; shellMs?: number };
  /** 同一 dockerAccount 的活跃沙盒数上限（默认 3）。每 run 一个沙盒，账户内并发 ≤ N。 */
  maxActiveSandboxesPerAccount?: number;
  /** running 记录被判为陈旧的阈值（ms）；缺省按 ttlMinutes + execTimeoutMs 推导。 */
  staleRunningAfterMs?: number;
  /**
   * `stop` 之后的确认退避（attempts × delayMs）。真实云 `sbx --cloud stop` 是**异步**的：
   * 返回 0 之后沙盒还会经历 `running → stopping → stopped`（2026-10-26 真实云实测单轮
   * 约 17.6s 才到 stopped），所以单次 `--cloud ls` 查证几乎必然扑空。
   * 这里**只改查证时序**，不改判定语义：仍然只认「名字缺席」或 `status === "stopped"`，
   * 其余（stopping / running / ls 失败 / 形状不认识）一律继续重试，重试耗尽仍报未查证。
   */
  stopConfirm?: { attempts?: number; delayMs?: number };
}

const DEFAULT_TTL_MINUTES = 15;
const DEFAULT_MAX_OUTPUT_CHARS = 8_000;
/**
 * exec 默认上界，与 linuxBubblewrapBackend 同量级（那里是
 * `request.timeoutMs ?? 60_000`）。没有它，卡住的 sbx exec 只能等云端 TTL。
 */
export const DEFAULT_EXEC_TIMEOUT_MS = 60_000;
/**
 * 每 dockerAccount 的活跃沙盒上限默认值：每 run 一个沙盒，账户内最多 3 个并发。
 * 超出即 concurrency-rejected（明确失败码，不排队、不静默降级）。
 */
export const DEFAULT_MAX_ACTIVE_SANDBOXES_PER_ACCOUNT = 3;
/**
 * stop 确认默认退避：6 次 × 2.5s 间隔 ≈ 12.5s 固定等待，加上每轮 `--cloud ls` 自身耗时
 * （上界 = controlTimeoutMs），覆盖实测约 17.6s 的 `stopping → stopped` 窗口；
 * 全部 6 轮仍无法确认才报 `stop-unverified`。最坏总耗时 ≈ 6×ls 上界 + 12.5s。
 */
export const DEFAULT_STOP_CONFIRM_ATTEMPTS = 6;
export const DEFAULT_STOP_CONFIRM_DELAY_MS = 2_500;

/**
 * 活跃沙盒上限的**可配置**覆盖：显式注入 > `NOLO_DOCKER_MAX_ACTIVE_SANDBOXES` > 默认。
 *
 * 上限是部署/用户策略，不是常量。撞上限时错误只说「已达上限」，很容易被误判成
 * 云端限制（2026-10-18 两次实测踩到），所以这里把它显式化、可配、并把非法值
 * 报出来——静默回落默认值会让人以为设置生效了。
 */
export function resolveMaxActiveSandboxesFromEnv(
  env: Record<string, string | undefined> = process.env,
): number | null {
  const raw = (env.NOLO_DOCKER_MAX_ACTIVE_SANDBOXES ?? "").trim();
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(
      `NOLO_DOCKER_MAX_ACTIVE_SANDBOXES 必须是正整数，收到 "${raw}"；拒绝静默回落默认值`,
    );
  }
  return parsed;
}
/** 不核实余额时的记账费率（nanoUSD/s，benchmarks 实测 medium 档）。 */
const UNVERIFIED_QUOTA_RATE_NANO_USD = 77_780n; // bigint：calculateEstimatedBudget 只接受 bigint

/** shell 类可执行名：命中 argv[0] 时按 shell 档（`execTimeouts.shellMs`）取执行上界。 */
const SHELL_EXECUTABLES = new Set([
  "bash", "sh", "zsh", "dash", "ksh", "mksh", "ash", "fish",
]);
/** kill 之后 close 仍未到达时的兜底解锁窗口：保证 await 一定有出口。 */
const EXEC_TIMEOUT_KILL_GRACE_MS = 2_000;
/** 判定 running 陈旧时，除沙盒 TTL 之外再附加的对账余量。 */
const STALE_RUNNING_SLACK_MS = 60_000;
const SANDBOX_NAME_PATTERN = /^agent-sbx-[A-Za-z0-9][A-Za-z0-9_-]{0,47}-[a-z0-9]{1,13}$/;
/** 可兑现的隔离模式：容器语义由云沙盒提供；其余（gvisor/microvm/dedicated-vm）兑不了就拒绝。 */
const SATISFIABLE_ISOLATION = new Set(["none", "os-sandbox", "container"]);

export function buildDockerSandboxName(ticketId: string, ts: number): string {
  const safeId = ticketId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 48) || "run";
  const name = `agent-sbx-${safeId}-${ts.toString(36)}`;
  if (!SANDBOX_NAME_PATTERN.test(name)) {
    throw new DockerSandboxBackendError("invalid-ticket", "sandbox name rejected");
  }
  return name;
}

/** argv → 单条 `bash -lc` 脚本：逐元素单引号转义，绝不原样拼接。 */
export function argvToShellScript(argv: readonly string[]): string {
  const quote = (token: string) => `'${token.replaceAll("'", `'\\''`)}'`;
  if (argv.length === 3 && argv[0] === "bash" && argv[1] === "-lc") return argv[2];
  return argv.map(quote).join(" ");
}

export function truncateOutput(value: string, limitChars: number): string {
  if (value.length <= limitChars) return value;
  return `${value.slice(0, limitChars)}…[truncated ${value.length - limitChars} chars]`;
}

/**
 * 默认执行器：数组传参 + shell:false（命令内容永远不会被 shell 重新解析），
 * 并兑现 `options.timeoutMs` —— 超时 SIGKILL 子进程并回 `timedOut: true`。
 * kill 之后 close 迟迟不来时用兜底窗口结算，保证 await 一定有出口。
 */
export async function defaultRunSbx(
  args: readonly string[],
  options: SbxRunOptions = {},
): Promise<SbxCommandOutcome> {
  const { spawn } = await import("node:child_process");
  const timeoutMs =
    typeof options.timeoutMs === "number" &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? options.timeoutMs
      : undefined;
  return await new Promise<SbxCommandOutcome>((resolve) => {
    const child = spawn("sbx", [...args], {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
    let killGraceTimer: ReturnType<typeof setTimeout> | undefined;
    const settle = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (killGraceTimer) clearTimeout(killGraceTimer);
      resolve({ exitCode, stdout, stderr, ...(timedOut ? { timedOut: true } : {}) });
    };
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", () => settle(null));
    child.on("close", (code) => settle(code ?? null));
    if (timeoutMs !== undefined) {
      timeoutTimer = setTimeout(() => {
        timedOut = true;
        try {
          child.kill("SIGKILL");
        } catch {
          // 进程可能已退出；close 会照常终结。
        }
        killGraceTimer = setTimeout(() => settle(null), EXEC_TIMEOUT_KILL_GRACE_MS);
      }, timeoutMs);
    }
  });
}

/**
 * 活跃槽位键：slot 1 = 账户主闸门键（既有记录与外部 CI 工具读写的就是它），
 * slot 2..N = `${quotaKey}#slot:N`。槽位键是该次运行记录的唯一归属键。
 */
export function buildSandboxSlotKey(quotaKey: string, slot: number): string {
  return slot === 1 ? quotaKey : `${quotaKey}#slot:${slot}`;
}

/** argv 是否 shell 类（决定本次 exec 走哪一档执行上界）。 */
export function isShellArgv(argv: readonly string[]): boolean {
  const head = argv[0];
  if (typeof head !== "string" || !head) return false;
  const base = head.split(/[\\/]/).pop()?.toLowerCase().replace(/\.exe$/, "") ?? "";
  return SHELL_EXECUTABLES.has(base);
}

type LeaseEntry = {
  ticketId: string;
  grantId: string;
  sandboxName: string;
  quotaKey: string;
  /** 本次运行占用的活跃槽位键：终态记录必须写回它，否则槽位永不释放。 */
  slotKey: string;
  estimatedNanoUsd: bigint;
  startedAt: number;
  released: boolean;
};

/** running 记录被判为陈旧的原因；null = 不陈旧（含无法判定 → 保持阻塞）。 */
export function staleRunningReason(
  record: { status: string; stale?: boolean; observedAt?: unknown },
  nowMs: number,
  staleRunningAfterMs: number,
): string | null {
  // `stale: true` **不解锁**回收：陈旧与否只看 observedAt 年龄。写 stale 的一方
  // 不能越过年龄门槛放行新沙盒（否则活沙盒会被判为可回收 → 两个计费沙盒并发）。
  // 归档键是独立键，本就不需要任何捷径分支来解锁。
  const observedAt = record.observedAt;
  // 观察时间不可判定时不猜：保持并发阻塞（fail-closed）。
  if (typeof observedAt !== "number" || !Number.isFinite(observedAt)) return null;
  const age = nowMs - observedAt;
  // 时钟偏移（observedAt 落在未来）同样不当作陈旧。
  if (!Number.isFinite(age) || age <= staleRunningAfterMs) return null;
  return "observed-at-beyond-lifetime";
}

/**
 * 陈旧回收的审计痕迹键：保留原 sandbox 名，且不覆盖主闸门键
 * （主键必须留给新一次 prepare 的 running 记录）。
 */
export function buildStaleAuditKey(quotaKey: string, sandboxName: unknown): string {
  const safeSandbox =
    typeof sandboxName === "string"
      ? sandboxName.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 64) || "unknown"
      : "unknown";
  return `${quotaKey}#stale:${safeSandbox}`;
}

/** 陈旧阈值推导：云端沙盒最多活 ttlMinutes，再加一次 exec 上界与对账余量。 */
function deriveStaleRunningMs(ttlMinutes: number, execTimeoutMs: number): number {
  return ttlMinutes * 60_000 + execTimeoutMs + STALE_RUNNING_SLACK_MS;
}

/** 结构化、单行、不含凭证与账户标识的记账告警（便于 grep 与告警接线）。 */
function warnBookkeeping(phase: string, extra: Record<string, string> = {}): void {
  console.warn(
    `[dockerSandboxExecutionBackend] ${JSON.stringify({
      event: "quota-bookkeeping-failed",
      phase,
      ...extra,
    })}`,
  );
}

/**
 * 进程级 per-account 准入锁：DockerWorkloadLifecycle 每次 run 都会创建一个新的
 * backend 实例，实例级锁无法串行化同账户的并发 prepare，故锁必须挂在模块上。
 * 跨进程的权威闸门是 journal 的 SQLite 事务登记（单 host 拓扑）。
 */
const accountLockTails = new Map<string, Promise<unknown>>();

export function createDockerSandboxExecutionBackend(
  deps: DockerSandboxExecutionBackendDeps = {},
): ExecutionBackend {
  const runSbx = deps.runSbx ?? defaultRunSbx;
  const kvStore = deps.kvStore ?? new InMemoryDockerQuotaKvStore();
  const now = deps.now ?? (() => Date.now());
  const owner = deps.owner ?? "local-owner";
  const dockerAccount = deps.dockerAccount ?? "default-account";
  const shapeId = deps.shapeId ?? SANDBOX_DEFAULT_SHAPE;
  const ttlMinutes = deps.ttlMinutes ?? DEFAULT_TTL_MINUTES;
  const maxOutputChars = deps.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
  /** 先解析一次：release 每轮都要用，避免把「缺省」在循环里重复推导。 */
  const stopConfirm = {
    attempts: Math.max(1, deps.stopConfirm?.attempts ?? DEFAULT_STOP_CONFIRM_ATTEMPTS),
    delayMs: Math.max(0, deps.stopConfirm?.delayMs ?? DEFAULT_STOP_CONFIRM_DELAY_MS),
  };
  const leases = new Map<string, LeaseEntry>();

  const descriptor: ExecutionBackendDescriptor = {
    id: DOCKER_SANDBOX_BACKEND_ID,
    kind: "cloud",
    capabilities: {
      executionClasses: ["oneshot"],
      streamingExec: false,
      filesystem: true,
      persistentFilesystem: false,
      processSignals: false,
      inboundPorts: false,
      networkPolicy: false,
      snapshots: false,
      gpu: false,
      isolationModes: ["container"],
    },
  };

  const writeQuotaRecord = async (
    key: string,
    patch: Partial<{
      remainingNanoUsd: string;
      observedAt: number;
      pendingEstimateNanoUsd: string;
      estimatedSpendNanoUsd: string;
      taskId: string;
      sandbox: string;
      status: "idle" | "running" | "stopped" | "failed";
      stale: boolean;
    }>,
    before?: { remainingNanoUsd: string; observedAt: number },
  ): Promise<void> => {
    const previous = await kvStore.get(key).catch(() => null);
    await kvStore.put(key, {
      key,
      owner,
      dockerAccount,
      remainingNanoUsd: patch.remainingNanoUsd ?? previous?.remainingNanoUsd ?? "0",
      observedAt: patch.observedAt ?? previous?.observedAt ?? now(),
      pendingEstimateNanoUsd: patch.pendingEstimateNanoUsd ?? "0",
      estimatedSpendNanoUsd:
        patch.estimatedSpendNanoUsd ?? previous?.estimatedSpendNanoUsd ?? "0",
      taskId: patch.taskId ?? previous?.taskId ?? "",
      sandbox: patch.sandbox ?? previous?.sandbox ?? "",
      status: patch.status ?? previous?.status ?? "idle",
      // stale 必须能表达「显式清掉」：只有调用方完全不表态（undefined）才继承上一条
      // 记录。否则一次 stale:true 会沿 running→终态→running 永久连锁继承，把并发
      // 闸门的年龄判定打穿（C1）。new running 写入一律显式传 stale:false。
      ...(patch.stale === undefined
        ? previous?.stale === undefined
          ? {}
          : { stale: previous.stale }
        : { stale: patch.stale }),
      beforeAfter: {
        ...(before
          ? { before }
          : previous?.beforeAfter?.before
            ? { before: previous.beforeAfter.before }
            : {}),
        ...(previous?.beforeAfter?.after ? { after: previous.beforeAfter.after } : {}),
      },
    });
  };

  /**
   * exec 上界分档：shell 类 argv 用 `shellMs`，其余用 `defaultMs`；未提供的档位
   * 回落到 `execTimeoutMs`（再回落 DEFAULT_EXEC_TIMEOUT_MS）——不传 execTimeouts 时
   * 两档相同，与既有单档行为逐位一致。
   */
  const positiveMs = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
  const baseExecTimeoutMs = positiveMs(deps.execTimeoutMs) ?? DEFAULT_EXEC_TIMEOUT_MS;
  const defaultExecTimeoutMs = positiveMs(deps.execTimeouts?.defaultMs) ?? baseExecTimeoutMs;
  const shellExecTimeoutMs = positiveMs(deps.execTimeouts?.shellMs) ?? baseExecTimeoutMs;
  /** 控制面与陈旧阈值取两档的较大者：最慢的工具决定一条运行的存活上界。 */
  const maxExecTimeoutMs = Math.max(defaultExecTimeoutMs, shellExecTimeoutMs);
  const maxActiveSandboxes =
    typeof deps.maxActiveSandboxesPerAccount === "number" &&
    Number.isInteger(deps.maxActiveSandboxesPerAccount) &&
    deps.maxActiveSandboxesPerAccount > 0
      ? deps.maxActiveSandboxesPerAccount
      : (resolveMaxActiveSandboxesFromEnv() ?? DEFAULT_MAX_ACTIVE_SANDBOXES_PER_ACCOUNT);
  const staleRunningAfterMs =
    typeof deps.staleRunningAfterMs === "number" &&
    Number.isFinite(deps.staleRunningAfterMs) &&
    deps.staleRunningAfterMs > 0
      ? deps.staleRunningAfterMs
      : deriveStaleRunningMs(ttlMinutes, maxExecTimeoutMs);
  /** create/stop 等控制面调用共用同一上界：卡住的 sbx 不能被无限期 await。 */
  const controlTimeoutMs = maxExecTimeoutMs;

  /**
   * 记账写入失败必须可观测：`.catch(() => undefined)` 会把「没落盘」伪装成
   * 「已有并发保护」，从而同时放行两个计费沙盒。返回 false = 未落盘。
   */
  const persistQuotaRecord = async (
    phase: string,
    key: string,
    patch: Parameters<typeof writeQuotaRecord>[1],
    before?: Parameters<typeof writeQuotaRecord>[2],
  ): Promise<boolean> => {
    try {
      await writeQuotaRecord(key, patch, before);
      return true;
    } catch (error) {
      warnBookkeeping(phase, {
        sandbox: patch.sandbox ?? "",
        reason: error instanceof Error ? error.name : typeof error,
      });
      return false;
    }
  };

  /** 闸门读失败不能当成「没有并发」放行：读不到状态就无法证明没有并发。 */
  const readConcurrencyGate = async (
    key: string,
  ): Promise<Awaited<ReturnType<DockerQuotaKvStore["get"]>>> => {
    try {
      return await kvStore.get(key);
    } catch {
      throw new DockerSandboxBackendError("quota-unverifiable", "quota store read failed");
    }
  };

  /** 落盘后的读回校验：Remote store 会吞掉写失败，只有读回才看得见。 */
  const runningRecordPersisted = async (
    key: string,
    sandboxName: string,
  ): Promise<boolean> => {
    try {
      const record = await kvStore.get(key);
      return record?.status === "running" && record.sandbox === sandboxName;
    } catch (error) {
      warnBookkeeping("running-verify", {
        sandbox: sandboxName,
        reason: error instanceof Error ? error.name : typeof error,
      });
      return false;
    }
  };

  /**
   * per-account 串行锁：KV 只有 get/put（无 compare-and-swap），所以「数活跃 → 占槽位」
   * 必须整段不可交错，否则两个 prepare 会同时看到空槽位、各自 create 一个计费沙盒。
   * 跨进程的权威闸门仍是 DockerWorkloadLifecycle 的 SQLite 事务登记（单 host 拓扑），
   * 本锁负责同进程内（含同 event loop 的并发 prepare）的原子性。
   */
  const runWithAccountLock = async <T>(key: string, fn: () => Promise<T>): Promise<T> => {
    const previous = accountLockTails.get(key) ?? Promise.resolve();
    const run = previous.catch(() => undefined).then(fn);
    // 失败也必须解锁：不能让一次异常的 prepare 把整个账户永久锁死。
    const tail = run.catch(() => undefined);
    accountLockTails.set(key, tail);
    try {
      return await run;
    } finally {
      if (accountLockTails.get(key) === tail) accountLockTails.delete(key);
    }
  };

  /**
   * 归档一条「不该再占着该槽位」的 running 记录：键沿用 buildStaleAuditKey 语义
   * （独立键，绝不覆盖主闸门键），供后续 reconcile 看见。无论判定依据是时间推断
   * 陈旧，还是云真相证明沙盒已不存在，都走同一条归档语义。
   */
  const archiveStaleSlotRecord = async (
    slotKey: string,
    record: DockerQuotaRecord,
  ): Promise<void> => {
    await persistQuotaRecord(
      "stale-running-archive",
      buildStaleAuditKey(slotKey, record.sandbox),
      // 归档记的是「可能仍在计费的泄漏沙盒」：金额与归属必须从被回收的那条
      // 记录原样带入。改用 0/空串顶替（本函数对缺省字段的回落行为）会把敞口
      // 与责任归属一起抹掉，事后无法对账、无法定位泄漏来源（M-2）。
      {
        status: "running",
        stale: true,
        sandbox: record.sandbox ?? "",
        observedAt: record.observedAt,
        remainingNanoUsd: record.remainingNanoUsd,
        pendingEstimateNanoUsd: record.pendingEstimateNanoUsd,
        estimatedSpendNanoUsd: record.estimatedSpendNanoUsd,
        taskId: record.taskId,
      },
    );
  };

  /**
   * 占用一个活跃槽位（只允许在账户临界区内调用）：返回本次运行独占的槽位键。
   * 槽位全被**活的** running 记录占满 → concurrency-rejected（明确失败码，不排队）；
   * 被判陈旧的槽位先归档再复用（保留原 sandbox 名与金额，作为可审计泄漏痕迹）。
   *
   * 云真相纠偏：本地的时间推断不是「沙盒已死」的证据——被中断/崩溃的 run 留下的
   * 记录会堵住槽位数小时，而云上沙盒早已被删净（TTL 很长时尤其明显）。所以对
   * **未**判陈旧的 running 记录，向云列举要一次权威答案：
   *   - 记录引用的沙盒云上不存在 → 与陈旧记录同一条归档语义处理并释放该槽位；
   *   - 云上存在               → 活槽位，继续看下一个；
   *   - 云列举失败/超时/形状不可认 → 不得推定为「都不存在」（那会超卖并发）→
   *     fail-closed：保持原样（既不释放也不归档），整体抛 quota-unverifiable。
   *     复用该码而非新码：语义同属「账户级状态无法核实 → 拒绝」，且调用方
   *     （DockerWorkloadLifecycle 的 pre-create 白名单、CLI 的文案映射）已认识它，
   *     不会把「核实不了」错当成「确认没有沙盒」。可区分性由告警 phase
   *     `sandbox-presence-unverifiable` 与 reason 字段承担。
   */
  const reserveActiveSlot = async (quotaKey: string): Promise<string> => {
    // 每个账户每次 reserve 至多一次云列举（3 个槽位不得各调一次）：惰性记忆化，
    // 且只在真的撞上「running 且未判陈旧」的槽位时才发生——没有这种槽位就零调用。
    let cloudPresence: Promise<CloudSandboxPresence> | null = null;
    const cloudSandboxPresence = (): Promise<CloudSandboxPresence> => {
      cloudPresence ??= probeCloudSandboxPresence(runSbx, controlTimeoutMs);
      return cloudPresence;
    };

    for (let slot = 1; slot <= maxActiveSandboxes; slot += 1) {
      const slotKey = buildSandboxSlotKey(quotaKey, slot);
      // 闸门读失败不得被当成「该槽位空闲」：readConcurrencyGate 直接抛 quota-unverifiable。
      const record = await readConcurrencyGate(slotKey);
      if (record?.status !== "running") return slotKey;
      const staleReason = staleRunningReason(record, now(), staleRunningAfterMs);
      if (staleReason) {
        warnBookkeeping("stale-running-reclaimed", {
          sandbox: record.sandbox ?? "",
          reason: staleReason,
        });
        await archiveStaleSlotRecord(slotKey, record);
        return slotKey;
      }
      // 未判陈旧 ≠ 沙盒还活着：拿云真相核对这条记录引用的沙盒真的存在吗。
      const sandboxName = typeof record.sandbox === "string" ? record.sandbox : "";
      if (!sandboxName) {
        // 记录没有沙盒引用：既证明不了它已死，也核对不了。宁可继续阻塞，也不能
        // 凭空放行第二个计费沙盒（同 staleRunningReason 的 fail-closed 立场）。
        warnBookkeeping("sandbox-presence-unverifiable", { reason: "no-sandbox-reference" });
        throw new DockerSandboxBackendError(
          "quota-unverifiable",
          "active sandbox record carries no sandbox reference",
        );
      }
      const presence = await cloudSandboxPresence();
      if (!presence.ok) {
        warnBookkeeping("sandbox-presence-unverifiable", {
          sandbox: sandboxName,
          reason: presence.reason,
        });
        throw new DockerSandboxBackendError(
          "quota-unverifiable",
          "active sandbox presence could not be verified against the cloud listing",
        );
      }
      // 只要云列举里还有这个名字（不论 running/stopped）就按活槽位处理：stop 是
      // 「挂起并保留状态」，release 成功时本就会写终态记录；一条仍写着 running 的
      // 记录 + 云上对象尚在，不足以证明它可以被回收。
      if (presence.names.has(sandboxName)) continue;
      warnBookkeeping("stale-running-reclaimed", {
        sandbox: sandboxName,
        reason: "absent-from-cloud-listing",
      });
      await archiveStaleSlotRecord(slotKey, record);
      return slotKey;
    }
    throw new DockerSandboxBackendError(
      "concurrency-rejected",
      `active sandbox limit ${maxActiveSandboxes} reached`,
    );
  };

  return {
    describe() {
      return descriptor;
    },

    async prepare(ticket: ExecutionTicket): Promise<ExecutionLease> {
      if (
        ticket.version !== 1 ||
        !ticket.ticketId ||
        !ticket.grantId ||
        ticket.shellAllowed !== true ||
        !SATISFIABLE_ISOLATION.has(ticket.requestedIsolation)
      ) {
        throw new DockerSandboxBackendError("invalid-ticket");
      }
      // 落点一致性（本模块的核心不变量）：本后端只承服务端落点的 oneshot 执行，
      // 命令在容器里跑、run 落点不变。machine 落点或 session/service 类必须
      // fail-closed 拒绝，绝不静默接受（同 linuxBubblewrapBackend 的同形判定）。
      if (ticket.target.kind !== "server" || ticket.executionClass !== "oneshot") {
        throw new DockerSandboxBackendError("invalid-ticket", "target/class unsupported");
      }

      // 1) 配额与预算准入：不合格时零 sbx 调用。
      const quotaVerifyEnabled = deps.quotaVerify !== false;
      const quota = quotaVerifyEnabled && deps.quotaProvider
        ? await deps.quotaProvider()
        : ({ ok: false, reason: "verification-disabled" } as const);
      if (quotaVerifyEnabled && !quota.ok) {
        throw new DockerSandboxBackendError("quota-unverifiable");
      }
      const quotaRateNanoUsd = quota.ok ? quota.rateNanoUsd : UNVERIFIED_QUOTA_RATE_NANO_USD;
      const estimatedNanoUsd = calculateEstimatedBudget(ttlMinutes * 60, quotaRateNanoUsd);
      if (quota.ok && quota.availableNanoUsd < estimatedNanoUsd) {
        throw new DockerSandboxBackendError("quota-insufficient");
      }

      // 2) 活跃槽位闸：每 dockerAccount 的活跃沙盒数 ≤ maxActiveSandboxes（默认 3，
      //    每 run 一个沙盒）。「数活跃 → 占槽位」+ create + running 落盘确认整段在
      //    同一账户临界区内完成，杜绝「先查再写」同时放行 N+1 个计费沙盒。
      //    预算预扣（nanoUSD）语义不变：running 记录仍带 pendingEstimateNanoUsd。
      const quotaKey = buildDockerQuotaKey(owner, dockerAccount);
      return await runWithAccountLock(quotaKey, async () => {
        const slotKey = await reserveActiveSlot(quotaKey);

        // 3) 先登记（占用槽位）→ 读回确认 → 才 create：登记失败绝不 create。
        const startedAt = now();
        const sandboxName =
          deps.sandboxName ?? buildDockerSandboxName(ticket.ticketId, startedAt);
        const reservedRecorded = await persistQuotaRecord(
          "running",
          slotKey,
          {
            // 未核实时没有 availableNanoUsd：记账写 "unverified" 而不是崩溃（RV-FATAL）
            remainingNanoUsd: quota.ok ? quota.availableNanoUsd.toString() : "unverified",
            // 槽位记录的年龄必须从「这条记录落盘的时刻」起算，沿用配额快照的
            // observedAt 会让陈旧阈值被偷偷缩短（M-1）。配额观察时间没丢，仍在
            // beforeAfter.before 里。
            observedAt: now(),
            pendingEstimateNanoUsd: estimatedNanoUsd.toString(),
            estimatedSpendNanoUsd: "0",
            taskId: ticket.ticketId,
            sandbox: sandboxName,
            status: "running",
            // 显式清 stale：这条槽位记录代表**占位中的沙盒**，绝不能继承上一条终态
            // 记录残留的 stale:true（否则它会被年龄之外的捷径判成可回收）。
            stale: false,
          },
          {
            // 未核实时没有 availableNanoUsd：记账写 "unverified" 而不是崩溃（RV-FATAL）
            remainingNanoUsd: quota.ok ? quota.availableNanoUsd.toString() : "unverified",
            observedAt: quota.ok ? quota.observedAt : now(),
          },
        );
        if (!reservedRecorded || !(await runningRecordPersisted(slotKey, sandboxName))) {
          // 登记没落盘 = 计数闸事实上不存在。此刻**还没有任何沙盒被创建**，故直接
          // fail-closed 拒绝：不 create、不需要 stop，也不谎报「已清理」。
          throw new DockerSandboxBackendError("quota-record-failed");
        }

        // 4) 创建沙盒；create 失败立即把槽位标记为 failed 归还名额。
        const create = await runSbx(
          buildSbxCloudCreateArgv({ name: sandboxName, shapeId, ttlMinutes }),
          { timeoutMs: controlTimeoutMs },
        );
        if (create.exitCode !== 0) {
          await persistQuotaRecord("create-failed", slotKey, {
            status: "failed",
            sandbox: sandboxName,
            taskId: ticket.ticketId,
          });
          throw new DockerSandboxBackendError("create-failed");
        }

        const lease: ExecutionLease = {
          leaseId: sandboxName,
          backendId: descriptor.id,
          ticketId: ticket.ticketId,
          grantId: ticket.grantId,
          createdAt: startedAt,
          readableRoots: [],
          writableRoots: [],
          metadata: {
            sandboxName,
            estimatedNanoUsd: estimatedNanoUsd.toString(),
            quotaKey,
            slotKey,
            /**
             * release() 只 stop 不删除：沙盒在云端以 stopped 状态保留，
             * 本后端从不发 `sbx rm`。调用方据此判断是否需要另行清理。
             */
            sandboxRetainedOnRelease: true,
          },
        };
        leases.set(lease.leaseId, {
          ticketId: ticket.ticketId,
          grantId: ticket.grantId,
          sandboxName,
          quotaKey,
          slotKey,
          estimatedNanoUsd,
          startedAt,
          released: false,
        });
        return lease;
      });
    },

    async execute(
      lease: ExecutionLease,
      request: ExecutionRequest,
      onEvent?: (event: ExecutionEvent) => void,
    ): Promise<ExecutionResult> {
      const entry = leases.get(lease.leaseId);
      if (!entry) throw new DockerSandboxBackendError("lease-not-found");
      if (lease.backendId !== descriptor.id || lease.ticketId !== entry.ticketId) {
        throw new DockerSandboxBackendError("lease-mismatch");
      }
      if (entry.released) throw new DockerSandboxBackendError("lease-released");
      if (request.kind !== "command") {
        throw new DockerSandboxBackendError("unsupported-request");
      }
      // fail-closed：本后端不兑现 env / stdin / cwd。静默忽略会让调用方拿到
      // 「exitCode:0」的假成功（命令实际无这些约束），故显式拒绝而非假装成功。
      if (
        request.env !== undefined ||
        request.stdin !== undefined ||
        request.cwd !== undefined
      ) {
        throw new DockerSandboxBackendError("unsupported-request", "request options not honored");
      }
      // 上界按工具分档：shell 类 argv 走 shellMs 档，其余走 defaultMs 档。
      // 未配置 execTimeouts 时两档相同 = 与既有单档行为逐位一致。
      const tierExecTimeoutMs = isShellArgv(request.argv)
        ? shellExecTimeoutMs
        : defaultExecTimeoutMs;
      // timeoutMs 受支持：合法值只用来收紧本次 exec 上界；非有限/非正数或超过
      // 所选档位上界一律 fail-closed 拒绝，绝不「按后端上界悄悄放行」。
      const requestedTimeoutMs = request.timeoutMs;
      if (requestedTimeoutMs !== undefined) {
        if (!Number.isFinite(requestedTimeoutMs) || requestedTimeoutMs <= 0) {
          throw new DockerSandboxBackendError(
            "unsupported-request",
            "timeoutMs must be a positive finite number",
          );
        }
        if (requestedTimeoutMs > tierExecTimeoutMs) {
          throw new DockerSandboxBackendError(
            "unsupported-request",
            "timeoutMs exceeds the backend execution bound",
          );
        }
      }
      // 上界永远存在：没有它，卡住的 sbx exec 只能等云端 TTL，await 没有出口。
      const execBoundMs = requestedTimeoutMs ?? tierExecTimeoutMs;

      const executionId = `${entry.sandboxName}:${now().toString(36)}`;
      const startedAt = now();
      onEvent?.({ type: "started", executionId, at: startedAt });

      const script = argvToShellScript(request.argv);
      const outcome = await runSbx(
        ["--cloud", "exec", entry.sandboxName, "bash", "-lc", script],
        { timeoutMs: execBoundMs },
      );
      if (outcome.timedOut) {
        throw new DockerSandboxBackendError("exec-timeout");
      }
      if (outcome.exitCode === null) {
        throw new DockerSandboxBackendError("exec-failed");
      }

      // sbx exec 无实时流：输出在进程结束后一次性投递（capabilities.streamingExec=false）。
      const stdout = truncateOutput(outcome.stdout, maxOutputChars);
      const stderr = truncateOutput(outcome.stderr, maxOutputChars);
      if (stdout) onEvent?.({ type: "stdout", executionId, chunk: stdout, seq: 1 });
      if (stderr) onEvent?.({ type: "stderr", executionId, chunk: stderr, seq: 1 });
      onEvent?.({
        type: "usage",
        executionId,
        usage: { wallMs: Math.max(0, now() - startedAt) },
      });
      onEvent?.({ type: "exited", executionId, exitCode: outcome.exitCode });

      return {
        executionId,
        ok: outcome.exitCode === 0,
        exitCode: outcome.exitCode,
        output: { stdout, stderr },
      };
    },

    async release(
      lease: ExecutionLease,
      reason: ExecutionReleaseReason,
    ): Promise<void> {
      const entry = leases.get(lease.leaseId);
      if (!entry || entry.released) return; // 幂等：未知/已释放都不再产生副作用
      if (lease.backendId !== descriptor.id || lease.ticketId !== entry.ticketId) {
        throw new DockerSandboxBackendError("lease-mismatch");
      }

      // stop 与 create 共用同一上界：卡住的 `sbx --cloud stop` 不能无限期 await
      // （否则 release 永不结算、released 永远是 false）。超时回 exitCode: null，
      // 走下面同一条 stop-unverified + cleanupPending —— 绝不谎报已停止。
      const stop = await runSbx(["--cloud", "stop", entry.sandboxName], {
        timeoutMs: controlTimeoutMs,
      });
      if (stop.exitCode !== 0 || !await confirmDockerSandboxStopped(runSbx, entry.sandboxName, controlTimeoutMs, stopConfirm)) {
        // 不标记 released：允许重试，且明确告知云端可能仍有存活沙盒。
        throw new DockerSandboxBackendError("stop-unverified", undefined, true);
      }
      entry.released = true;

      // 终态记账失败只告警、不抛：stop 已确认，抛错会被调用方误读为「未清理」。
      // 代价是该记录会停留在 running，直到 M2 的陈旧回收（阈值 = TTL + exec
      // 上界 + 余量）放行下一次 prepare；这期间并发闸门仍然生效（宁可严，不可漏）。
      await persistQuotaRecord("release-final-state", entry.slotKey, {
        status: reason === "failed" ? "failed" : "stopped",
        pendingEstimateNanoUsd: "0",
        estimatedSpendNanoUsd: entry.estimatedNanoUsd.toString(),
        sandbox: entry.sandboxName,
      });
    },
  };
}

/**
 * `sbx` 会在 JSON 之前打人类可读的告警（实测：
 * `WARN: docker hub refresh lock held by another process: context deadline exceeded`）。
 * 直接 JSON.parse 会判成 malformed-listing，进而 fail-closed 把**所有** docker 派发
 * 拒掉——一条 WARN 让全平台停摆（2026-10-18 实测）。
 *
 * 这里只做一件事：跳过 JSON 之前的噪声行。不做"宽松找 JSON"（例如跨行截取），
 * 免得把坏输出误判成权威清单。
 */
export function parseSbxListingJson(stdout: string): unknown {
  const text = stdout ?? "";
  let start = -1;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch === "[" || ch === "{") {
      start = i;
      break;
    }
  }
  if (start < 0) return undefined;
  return JSON.parse(text.slice(start));
}

/**
 * 云真相：账户下活跃沙盒名的集合。
 *   - `ok: true`  → 这是权威答案（`--cloud ls` 无分页），可用于判定某个沙盒是否
 *                   真的还存在；
 *   - `ok: false` → 列举不可用（非 0 退出/超时/JSON 解析失败/元素形状不认识），
 *                   调用方**不得**把它当成「都不存在」。
 */
export type CloudSandboxPresence =
  | { ok: true; names: ReadonlySet<string> }
  | { ok: false; reason: "ls-failed" | "malformed-listing" };

/**
 * 只读列举云沙盒（不创建、不启动、不计费）。`sbx --cloud ls --format json` 是权威
 * 清单（无分页，实测空账户输出 `[]`）。
 *
 * fail-closed 的形状要求：清单必须是数组，且每个元素都得是能读出 `name` 的对象。
 * 少了 `name` 的元素意味着「清单里可能有一个我认不出来的沙盒」，此时把集合判成
 * 空集就等于放行并发（超卖计费沙盒），所以整份清单按不可核实处理。
 */
export async function probeCloudSandboxPresence(
  runSbx: SbxCommandFn,
  timeoutMs: number,
): Promise<CloudSandboxPresence> {
  try {
    const listing = await runSbx(["--cloud", "ls", "--format", "json"], { timeoutMs });
    if (listing.exitCode !== 0 || listing.timedOut) return { ok: false, reason: "ls-failed" };
    const parsed: unknown = parseSbxListingJson(listing.stdout);
    if (!Array.isArray(parsed)) return { ok: false, reason: "malformed-listing" };
    const names = new Set<string>();
    for (const entry of parsed) {
      if (!entry || typeof entry !== "object") return { ok: false, reason: "malformed-listing" };
      const name = (entry as { name?: unknown }).name;
      if (typeof name !== "string" || !name) return { ok: false, reason: "malformed-listing" };
      names.add(name);
    }
    return { ok: true, names };
  } catch {
    return { ok: false, reason: "ls-failed" };
  }
}

/** Exact positive observation only: absent, stopping, malformed and failed ls deny. */
export async function confirmDockerSandboxStopped(
  runSbx: SbxCommandFn, sandboxName: string, timeoutMs = 10_000,
  options: { attempts?: number; delayMs?: number } = {},
): Promise<boolean> {
  const attempts = Math.max(1, options.attempts ?? 1);
  const delayMs = Math.max(0, options.delayMs ?? 0);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const verdict = await probeOnce(runSbx, sandboxName, timeoutMs);
    if (verdict !== "pending") return verdict;
    if (attempt < attempts - 1 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return false;
}

/**
 * `sbx --cloud ls --format json` is the authoritative cloud listing (no
 * pagination), so:
 *   - name absent            → nothing is billing under that name → stopped
 *   - name present, "stopped" → stopped
 *   - name present, other     → still winding down → pending (retry)
 *   - ls failed / not JSON    → cannot confirm → false
 */
async function probeOnce(
  runSbx: SbxCommandFn, sandboxName: string, timeoutMs: number,
): Promise<boolean | "pending"> {
  try {
    const listing = await runSbx(["--cloud", "ls", "--format", "json"], { timeoutMs });
    if (listing.exitCode !== 0 || listing.timedOut) return false;
    const parsed: unknown = parseSbxListingJson(listing.stdout);
    if (!Array.isArray(parsed)) return false;
    const matches = parsed.filter(x => x && typeof x === "object" && (x as any).name === sandboxName);
    if (matches.length === 0) return true;
    if (matches.length === 1 && (matches[0] as any).status === "stopped") return true;
    return matches.length === 1 ? "pending" : false;
  } catch { return false; }
}
