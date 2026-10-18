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
      : DEFAULT_MAX_ACTIVE_SANDBOXES_PER_ACCOUNT;
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
   * 占用一个活跃槽位（只允许在账户临界区内调用）：返回本次运行独占的槽位键。
   * 槽位全被**活的** running 记录占满 → concurrency-rejected（明确失败码，不排队）；
   * 陈旧槽位先归档再复用（保留原 sandbox 名与金额，作为可审计泄漏痕迹）。
   */
  const reserveActiveSlot = async (quotaKey: string): Promise<string> => {
    for (let slot = 1; slot <= maxActiveSandboxes; slot += 1) {
      const slotKey = buildSandboxSlotKey(quotaKey, slot);
      // 闸门读失败不得被当成「该槽位空闲」：readConcurrencyGate 直接抛 quota-unverifiable。
      const record = await readConcurrencyGate(slotKey);
      if (record?.status !== "running") return slotKey;
      const staleReason = staleRunningReason(record, now(), staleRunningAfterMs);
      if (!staleReason) continue; // 该槽位有活沙盒，看下一个槽位。
      warnBookkeeping("stale-running-reclaimed", {
        sandbox: record.sandbox ?? "",
        reason: staleReason,
      });
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
      const quota = deps.quotaProvider
        ? await deps.quotaProvider()
        : ({ ok: false, reason: "no-provider" } as const);
      if (!quota.ok) {
        throw new DockerSandboxBackendError("quota-unverifiable");
      }
      const estimatedNanoUsd = calculateEstimatedBudget(
        ttlMinutes * 60,
        quota.rateNanoUsd,
      );
      if (quota.availableNanoUsd < estimatedNanoUsd) {
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
            remainingNanoUsd: quota.availableNanoUsd.toString(),
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
            remainingNanoUsd: quota.availableNanoUsd.toString(),
            observedAt: quota.observedAt,
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
      if (stop.exitCode !== 0 || !await confirmDockerSandboxStopped(runSbx, entry.sandboxName, controlTimeoutMs)) {
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
    const parsed: unknown = JSON.parse(listing.stdout);
    if (!Array.isArray(parsed)) return false;
    const matches = parsed.filter(x => x && typeof x === "object" && (x as any).name === sandboxName);
    if (matches.length === 0) return true;
    if (matches.length === 1 && (matches[0] as any).status === "stopped") return true;
    return matches.length === 1 ? "pending" : false;
  } catch { return false; }
}
