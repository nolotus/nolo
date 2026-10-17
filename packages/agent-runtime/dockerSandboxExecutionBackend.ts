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
  | "exec-failed"
  | "stop-unverified";

/** 对外只允许出现固定安全文案；不透传 sbx stdout/stderr 原文。 */
const SAFE_MESSAGE: Record<DockerSandboxBackendFailureCode, string> = {
  "invalid-ticket": "Rejected: execution ticket cannot be satisfied by the docker sandbox backend",
  "quota-unverifiable": "Rejected before any sandbox side effect: docker quota could not be verified",
  "quota-insufficient": "Rejected before any sandbox side effect: docker quota is below the estimated budget",
  "concurrency-rejected": "Rejected: another sandbox run is still running on this account",
  "create-failed": "Sandbox create failed",
  "lease-not-found": "Unknown execution lease",
  "lease-mismatch": "Lease does not match this backend or ticket",
  "lease-released": "Lease was already released",
  "unsupported-request": "Request kind is not supported by the docker sandbox backend",
  "exec-failed": "Sandbox exec could not be completed",
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
};

export type SbxCommandFn = (args: readonly string[]) => Promise<SbxCommandOutcome>;

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
}

const DEFAULT_TTL_MINUTES = 15;
const DEFAULT_MAX_OUTPUT_CHARS = 8_000;
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

async function defaultRunSbx(args: readonly string[]): Promise<SbxCommandOutcome> {
  const { spawn } = await import("node:child_process");
  return await new Promise<SbxCommandOutcome>((resolve) => {
    // 数组传参 + shell:false：命令内容永远不会被 shell 重新解析。
    const child = spawn("sbx", [...args], {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", () => resolve({ exitCode: null, stdout, stderr }));
    child.on("close", (code) => resolve({ exitCode: code ?? null, stdout, stderr }));
  });
}

type LeaseEntry = {
  ticketId: string;
  grantId: string;
  sandboxName: string;
  quotaKey: string;
  estimatedNanoUsd: bigint;
  startedAt: number;
  released: boolean;
};

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
      ...(patch.stale ? { stale: true } : previous?.stale ? { stale: previous.stale } : {}),
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

      // 2) 并发闸门：同账户存在运行中记录即拒绝。
      const quotaKey = buildDockerQuotaKey(owner, dockerAccount);
      const existing = await kvStore.get(quotaKey).catch(() => null);
      if (existing?.status === "running") {
        throw new DockerSandboxBackendError("concurrency-rejected");
      }

      // 3) 创建沙盒。
      const startedAt = now();
      const sandboxName = buildDockerSandboxName(ticket.ticketId, startedAt);
      const create = await runSbx(
        buildSbxCloudCreateArgv({ name: sandboxName, shapeId, ttlMinutes }),
      );
      if (create.exitCode !== 0) {
        await writeQuotaRecord(quotaKey, {
          status: "failed",
          sandbox: sandboxName,
          taskId: ticket.ticketId,
        }).catch(() => undefined);
        throw new DockerSandboxBackendError("create-failed");
      }

      await writeQuotaRecord(
        quotaKey,
        {
          remainingNanoUsd: quota.availableNanoUsd.toString(),
          observedAt: quota.observedAt,
          pendingEstimateNanoUsd: estimatedNanoUsd.toString(),
          estimatedSpendNanoUsd: "0",
          taskId: ticket.ticketId,
          sandbox: sandboxName,
          status: "running",
        },
        {
          remainingNanoUsd: quota.availableNanoUsd.toString(),
          observedAt: quota.observedAt,
        },
      ).catch(() => undefined);

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
        estimatedNanoUsd,
        startedAt,
        released: false,
      });
      return lease;
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
      // fail-closed：本后端不兑现 env / stdin / cwd / timeoutMs。静默忽略会让调用方
      // 拿到「exitCode:0」的假成功（命令实际无这些约束），故显式拒绝而非假装成功。
      if (
        request.env !== undefined ||
        request.stdin !== undefined ||
        request.cwd !== undefined ||
        request.timeoutMs !== undefined
      ) {
        throw new DockerSandboxBackendError("unsupported-request", "request options not honored");
      }

      const executionId = `${entry.sandboxName}:${now().toString(36)}`;
      const startedAt = now();
      onEvent?.({ type: "started", executionId, at: startedAt });

      const script = argvToShellScript(request.argv);
      const outcome = await runSbx([
        "--cloud",
        "exec",
        entry.sandboxName,
        "bash",
        "-lc",
        script,
      ]);
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

      const stop = await runSbx(["--cloud", "stop", entry.sandboxName]);
      if (stop.exitCode !== 0) {
        // 不标记 released：允许重试，且明确告知云端可能仍有存活沙盒。
        throw new DockerSandboxBackendError("stop-unverified", undefined, true);
      }
      entry.released = true;

      await writeQuotaRecord(entry.quotaKey, {
        status: reason === "failed" ? "failed" : "stopped",
        pendingEstimateNanoUsd: "0",
        estimatedSpendNanoUsd: entry.estimatedNanoUsd.toString(),
        sandbox: entry.sandboxName,
      }).catch(() => undefined);
    },
  };
}
