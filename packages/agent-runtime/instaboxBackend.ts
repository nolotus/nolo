/**
 * Instabox 云执行后端（`kind: "cloud"`）。
 *
 * 与 docker 沙盒后端同样的定位：它是**执行后端**，不是「run 落点」。
 * ticket.target 仍是 server|machine 的既有词汇，变的只是工具/命令在哪执行。
 *
 * 真实 API（2026-10-18 实测，照抄不猜）：
 * - Base `https://api.instabox.sh/v1`，鉴权头 `X-API-Key`。
 * - 建机 `POST /machines {name, templateId, timeoutSeconds}` + `Idempotency-Key`
 *   → 202 `{id:"op_...", machineId:"m_...", state:"queued"}`（**异步**）。
 * - 轮询 `GET /operations/{opId}?wait=20s` → `{state:"queued"|"succeeded"|"failed", error}`
 *   （服务端长轮询）。
 * - 执行 `POST /machines/{machineId}/exec {cmd, timeoutSeconds, stdin?}`
 *   → `{stdout, stderr, exitCode, timedOut, truncated}`（单次上限 10 分钟）。
 *   `stdin` 支持已于 2026-10-20 按官方文档核实（https://instabox.sh/docs/api/commands）：
 *   可选 UTF-8 字符串、上限 1 MiB（按 UTF-8 字节计）、写完即 EOF、**非流式**
 *   （随请求体一次性提交，输出仍是结束后整包回传）。本后端只做「给了就透传、
 *   超限/类型不对就在发请求前拒绝」的适配，不声称任何实时流能力。
 * - 用量 `GET /machines/{machineId}/usage`
 *   → `{runningSeconds, vcpuSeconds, memGiBSeconds, diskGiBSeconds}`。
 *   **这是账号累计值**，单机用量只能靠「调用前后取差」得到。
 * - 删除 `DELETE /machines/{machineId}` + `Idempotency-Key`
 *   → 202 `{id:"op_...", state:"queued"}`（**异步**）。
 *
 * 三条硬约束：
 * 1. 建机与删除都是异步 operation：**op 到 `succeeded` 之前不得认定完成**。
 *    删除未被确认时抛 `instabox_cleanup_pending` 且 `cleanupPending: true`，
 *    绝不把「已请求删除」谎报成「已清理」。
 * 2. Instabox 只吃 shell 字符串（没有 argv 通道）：argv 必须逐个 token
 *    单引号转义后再拼，`bash -lc <script>` 形态保持原样透传（调用方已显式要 shell）。
 * 3. `exitCode !== 0` 是**有效结果**不是异常：返回 `ok:false` 并保留 stdout/stderr，
 *    只有传输/协议层失败才抛错。
 *
 * 依赖注入：`fetchImpl` + `now()` + `sleepImpl`。测试用 fake fetch + 假时钟，
 * 全程零真实网络、零真实等待。
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

export const INSTABOX_BACKEND_ID = "instabox";
export const INSTABOX_DEFAULT_BASE_URL = "https://api.instabox.sh/v1";

/** Instabox 服务端单次 exec 的硬上限：10 分钟。 */
export const INSTABOX_MAX_EXEC_SECONDS = 600;

/**
 * Instabox exec 的 stdin 上限：1 MiB，**按 UTF-8 字节计**（官方文档的字节口径，
 * 不是 JS `string.length`——后者会把「中」这种 3 字节字符算成 1）。
 */
export const INSTABOX_MAX_STDIN_BYTES = 1024 * 1024;

export type InstaboxFailureCode =
  | "instabox_invalid_config"
  | "instabox_invalid_ticket"
  | "instabox_unsupported_request"
  | "instabox_lease_not_found"
  | "instabox_lease_mismatch"
  | "instabox_lease_released"
  | "instabox_create_failed"
  | "instabox_create_unconfirmed"
  | "instabox_exec_failed"
  | "instabox_cleanup_pending";

/** 对外只允许固定安全文案；detail 只放状态码/operation 态，绝不带 API key 或 header。 */
const SAFE_MESSAGE: Record<InstaboxFailureCode, string> = {
  "instabox_invalid_config":
    "Rejected: instabox backend needs an apiKey and a templateId",
  "instabox_invalid_ticket":
    "Rejected: execution ticket cannot be satisfied by the instabox backend",
  "instabox_unsupported_request":
    "Request is not supported by the instabox backend",
  "instabox_lease_not_found": "Unknown execution lease",
  "instabox_lease_mismatch": "Lease does not match this backend or ticket",
  "instabox_lease_released": "Lease was already released",
  "instabox_create_failed": "Instabox machine create failed",
  "instabox_create_unconfirmed":
    "Instabox machine create could not be confirmed",
  "instabox_exec_failed": "Instabox exec could not be completed",
  "instabox_cleanup_pending":
    "Instabox machine delete could not be confirmed; cleanup is pending",
};

export class InstaboxBackendError extends Error {
  readonly code: InstaboxFailureCode;
  /** true = 云端可能仍有存活机器，调用方不得当作已清理。 */
  readonly cleanupPending: boolean;
  readonly upstreamErrorCode?: string;

  constructor(
    code: InstaboxFailureCode,
    detail?: string,
    cleanupPending = false,
    readonly machineId?: string,
    upstreamErrorCode?: string,
  ) {
    super(detail ? `${SAFE_MESSAGE[code]} (${detail})` : SAFE_MESSAGE[code]);
    this.name = "InstaboxBackendError";
    this.code = code;
    this.cleanupPending = cleanupPending;
    this.upstreamErrorCode = upstreamErrorCode;
  }
}

/** 最小 fetch 契约：只要求后端用到的三个字段，真实 `fetch` 结构上可满足。 */
export type InstaboxResponseLike = {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
};

export type InstaboxFetchRequest = {
  method: "GET" | "POST" | "DELETE";
  headers: Record<string, string>;
  body?: string;
};

export type InstaboxFetchImpl = (
  url: string,
  init: InstaboxFetchRequest,
) => Promise<InstaboxResponseLike>;

export type InstaboxUsageSample = {
  runningSeconds: number;
  vcpuSeconds?: number;
  memGiBSeconds?: number;
  diskGiBSeconds?: number;
};

/**
 * `ExecutionBackend.release()` 在通用契约里是 `Promise<void>`；Instabox 的
 * 释放必须能回告「已确认清理」与对账用的用量差值，所以本后端把 release 收窄成
 * 返回 outcome 的版本（`InstaboxExecutionBackend`），需要通用接口时用
 * `asExecutionBackend()` 适配（丢弃 outcome，语义不变）。
 */
export type InstaboxReleaseOutcome = {
  /** 只有 delete operation 确认 succeeded 后才会是 true。 */
  ok: boolean;
  /** usage 前后取差（毫秒）；拿不到任一侧样本时省略，不臆造 0。 */
  providerUsageMs?: number;
};

export type InstaboxExecutionBackend = Omit<ExecutionBackend, "release"> & {
  release(
    lease: ExecutionLease,
    reason: ExecutionReleaseReason,
  ): Promise<InstaboxReleaseOutcome>;
};

/** Exact, caller-scoped create contract. This is NOT a zero-cost authorization:
 * the API has no atomic "create only if org is still free" precondition.
 * maxRunMinutes is an expected server default, never sent with an API key.
 */
export type InstaboxBillingPolicy = "free-only" | "allow-paid";

export type InstaboxCreationPlan = {
  orgId: string; name: string; templateId: string;
  vcpus: number; memMiB: number; maxRunMinutes: number;
  snapshotId?: string; persistentDiskGiB?: number; rootDiskGiB?: number;
};
export type InstaboxFreeOrgObservation = {
  orgId: string; tier: "free" | "pro" | "team" | "enterprise"; observedAt: number;
  allowedSpecs: { vcpus: number; memMiB: number; persistentDiskGiB: number }[];
};

export type InstaboxBackendOptions = {
  apiKey: string;
  templateId: string;
  /** 创建合同（plan + 自由组织证据）：生产建机路径**必须**提供。
   * 计费闸门依赖它：缺 plan 时后端直接 fail-closed，不会发出建机请求。 */
  creationPlan?: InstaboxCreationPlan;
  /** 测试专用开关：允许无 plan 的 legacy 建机路径。
   * 生产调用点**禁止**设置 —— 它会绕过计费闸门；只给既有 legacy 单测用。 */
  testOnlyAllowLegacyNoPlan?: boolean;
  freeOrgObservation?: InstaboxFreeOrgObservation;
  billingPolicy?: InstaboxBillingPolicy;
  deleteMachineImpl?: (machineId: string) => Promise<void>;
  baseUrl?: string;
  /** 注入时钟（毫秒）。 */
  now?: () => number;
  /** 注入 fetch；默认用全局 fetch（生产路径），测试注入 fake。 */
  fetchImpl?: InstaboxFetchImpl;
  /** 注入等待；长轮询之间的间隔用，测试注入 no-op。 */
  sleepImpl?: (ms: number) => Promise<void>;
  /** 建机时写入机器的闲置超时（秒），默认 1800。 */
  machineTimeoutSeconds?: number;
  /** 建机轮询上界，默认 180s。 */
  createTimeoutMs?: number;
  /** 删除轮询上界，默认 120s。 */
  deleteTimeoutMs?: number;
  /** 长轮询窗口（秒），默认 20。 */
  operationWaitSeconds?: number;
  /** 两次轮询之间的等待，默认 1000ms。 */
  pollIntervalMs?: number;
  /** 轮询次数硬上界（与时间上界同时生效），默认 30。 */
  maxPollAttempts?: number;
  /** 默认单次 exec 的 timeoutSeconds，默认 300。 */
  execTimeoutSeconds?: number;
  /** 单次 exec 输出保留上限，默认 100_000 字符。 */
  maxOutputChars?: number;
};

const DEFAULT_OPERATION_WAIT_SECONDS = 20;
const DEFAULT_POLL_INTERVAL_MS = 1_000;
const DEFAULT_MAX_POLL_ATTEMPTS = 30;
const DEFAULT_EXEC_TIMEOUT_SECONDS = 300;
const DEFAULT_MAX_OUTPUT_CHARS = 100_000;

export const INSTABOX_CAPABILITIES: ExecutionBackendDescriptor["capabilities"] =
  {
    // oneshot：一次建机跑一条命令；session：多步 exec 复用同一台机器。
    executionClasses: ["oneshot", "session"],
    // exec 一次性回包，没有实时流。
    streamingExec: false,
    filesystem: true,
    persistentFilesystem: true,
    processSignals: true,
    inboundPorts: true,
    networkPolicy: true,
    snapshots: true,
    gpu: false,
    isolationModes: ["container"],
  };

type LeaseEntry = {
  machineId: string;
  ticketId: string;
  grantId: string;
  requestedAt: number;
  readyAt: number;
  createOperationId: string;
  /** 建机 ready 后的账号累计 runningSeconds；取不到则 null（不臆造基线）。 */
  usageBaselineRunningMs: number | null;
  releasedAt: number | null;
  releaseReason?: ExecutionReleaseReason;
  releaseOutcome: InstaboxReleaseOutcome | null;
};

type CallResult = {
  status: number;
  payload: unknown;
  transportError?: string;
};

function readString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function readFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isSuccess(status: number): boolean {
  return status >= 200 && status < 300;
}

/** 单引号转义：与 docker 后端 `argvToShellScript` 同一套规则（`'` → `'\''`）。 */
function shellQuote(token: string): string {
  return `'${token.replaceAll("'", `'\\''`)}'`;
}

const SHELL_EXECUTABLES = new Set([
  "bash",
  "sh",
  "zsh",
  "dash",
  "fish",
  "ksh",
]);

/** 去掉可执行文件路径与 `.exe`，得到小写 basename。 */
function executableBase(token: string): string {
  return (
    token.split(/[\\/]/).pop()?.toLowerCase().replace(/\.exe$/, "") ?? ""
  );
}

/**
 * argv → shell 命令。Instabox 只有 `cmd` 字符串通道，所以每个 token 单引号转义；
 * `bash -lc <script>` 的既有形态保持原样透传（调用方已显式要 shell，再包一层会改变语义）。
 */
export function argvToInstaboxCommand(argv: readonly string[]): string {
  if (
    argv.length === 3 &&
    SHELL_EXECUTABLES.has(executableBase(argv[0] ?? "")) &&
    argv[1] === "-lc"
  ) {
    return argv[2] ?? "";
  }
  return argv.map(shellQuote).join(" ");
}

/** 机器名：可预测（同 ticket 同名，配合 Idempotency-Key 重试不产生第二台）。 */
export function buildInstaboxMachineName(ticketId: string, agentKey = ""): string {
  const slug = (value: string, limit: number) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, limit);
  // FNV-1a 32bit：把 ticketId 收成一个稳定的短后缀，避免截断后撞名。
  let hash = 0x811c9dc5;
  for (let index = 0; index < ticketId.length; index += 1) {
    hash ^= ticketId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  const suffix = hash.toString(36);
  const head = slug(agentKey, 16) || "run";
  const tail = slug(ticketId, 24) || "ticket";
  return `nolo-${head}-${tail}-${suffix}`.slice(0, 60);
}

export function buildInstaboxCreateIdempotencyKey(ticketId: string): string {
  return `instabox-create-${ticketId}`;
}

export function buildInstaboxDeleteIdempotencyKey(machineId: string): string {
  return `instabox-delete-${machineId}`;
}

export class InstaboxBackend implements Omit<ExecutionBackend, "release"> {
  readonly #apiKey: string;
  readonly #templateId: string;
  readonly #baseUrl: string;
  readonly #now: () => number;
  readonly #fetch: InstaboxFetchImpl;
  readonly #sleep: (ms: number) => Promise<void>;
  readonly #machineTimeoutSeconds: number;
  readonly #createTimeoutMs: number;
  readonly #deleteTimeoutMs: number;
  readonly #operationWaitSeconds: number;
  readonly #pollIntervalMs: number;
  readonly #maxPollAttempts: number;
  readonly #execTimeoutSeconds: number;
  readonly #maxOutputChars: number;
  readonly #creationPlan?: InstaboxCreationPlan;
  readonly #freeOrgObservation?: InstaboxFreeOrgObservation;
  readonly #billingPolicy: InstaboxBillingPolicy;
  readonly #deleteMachineImpl?: (machineId: string) => Promise<void>;
  readonly #leases = new Map<string, LeaseEntry>();

  constructor(options: InstaboxBackendOptions) {
    const apiKey = options.apiKey?.trim() ?? "";
    const templateId = options.templateId?.trim() ?? "";
    if (!apiKey || !templateId) {
      throw new InstaboxBackendError("instabox_invalid_config");
    }
    if (options.freeOrgObservation && !options.creationPlan) {
      throw new InstaboxBackendError("instabox_invalid_config");
    }
    if (!options.creationPlan && options.testOnlyAllowLegacyNoPlan !== true) {
      // 计费闸门：没有创建合同就不许建机。legacy 无 plan 分支只对显式的
      // testOnlyAllowLegacyNoPlan 开放（测试专用），生产路径永远走不到。
      throw new InstaboxBackendError(
        "instabox_invalid_config",
        "creation plan is required: a plan-less create would bypass the billing gate",
      );
    }
    this.#creationPlan = options.creationPlan ? structuredClone(options.creationPlan) : undefined;
    this.#freeOrgObservation = options.freeOrgObservation ? structuredClone(options.freeOrgObservation) : undefined;
    this.#billingPolicy = options.billingPolicy ?? "free-only";
    this.#deleteMachineImpl = options.deleteMachineImpl;
    this.#apiKey = apiKey;
    this.#templateId = templateId;
    this.#baseUrl = (options.baseUrl ?? INSTABOX_DEFAULT_BASE_URL).replace(
      /\/+$/,
      "",
    );
    this.#now = options.now ?? Date.now;
    this.#fetch =
      options.fetchImpl ??
      ((url, init) =>
        (globalThis.fetch as unknown as InstaboxFetchImpl)(url, init));
    this.#sleep =
      options.sleepImpl ??
      ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
    this.#machineTimeoutSeconds = options.machineTimeoutSeconds ?? 1_800;
    this.#createTimeoutMs = options.createTimeoutMs ?? 180_000;
    this.#deleteTimeoutMs = options.deleteTimeoutMs ?? 120_000;
    this.#operationWaitSeconds =
      options.operationWaitSeconds ?? DEFAULT_OPERATION_WAIT_SECONDS;
    this.#pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    this.#maxPollAttempts =
      options.maxPollAttempts ?? DEFAULT_MAX_POLL_ATTEMPTS;
    this.#execTimeoutSeconds = clampExecSeconds(
      options.execTimeoutSeconds ?? DEFAULT_EXEC_TIMEOUT_SECONDS,
    );
    this.#maxOutputChars = options.maxOutputChars ?? DEFAULT_MAX_OUTPUT_CHARS;
  }

  describe(): ExecutionBackendDescriptor {
    return {
      id: INSTABOX_BACKEND_ID,
      kind: "cloud",
      capabilities: { ...INSTABOX_CAPABILITIES },
    };
  }

  /**
   * 建机 → 轮询 create operation 到 `succeeded` 才算 ready。
   * `requestedAt` 是本地发起时间（用户可感知的等待起点）；`readyAt` 是 operation
   * 成功时刻（不采信 202 响应时间，那是「已受理」不是「可用」）。
   */
  async prepare(ticket: ExecutionTicket): Promise<ExecutionLease> {
    if (ticket.version !== 1 || !ticket.ticketId || !ticket.grantId) {
      throw new InstaboxBackendError("instabox_invalid_ticket");
    }
    const requestedAt = this.#now();
    // plan 缺省只可能来自显式的 testOnlyAllowLegacyNoPlan（构造函数已挡掉生产路径）。
    const plan = this.#creationPlan;
    if (plan) {
      const observation = this.#freeOrgObservation;
      const positive = (v: number) => Number.isSafeInteger(v) && v > 0;
      if (!plan.orgId?.trim() || !plan.name?.trim() || plan.templateId !== this.#templateId ||
          (this.#billingPolicy === "free-only" && plan.templateId !== "agent-browser") ||
          plan.snapshotId !== undefined ||
          plan.persistentDiskGiB !== undefined || plan.rootDiskGiB !== undefined ||
          !positive(plan.vcpus) || !positive(plan.memMiB) || plan.maxRunMinutes !== 480 ||
          !observation || observation.orgId !== plan.orgId ||
          (observation.tier !== "free" && this.#billingPolicy !== "allow-paid") ||
          !Number.isFinite(observation.observedAt) || observation.observedAt > requestedAt ||
          requestedAt - observation.observedAt > 30_000 ||
          !Array.isArray(observation.allowedSpecs) ||
          observation.allowedSpecs.filter(s => s.vcpus === plan.vcpus && s.memMiB === plan.memMiB &&
            Number.isSafeInteger(s.persistentDiskGiB) && s.persistentDiskGiB >= 0).length !== 1) {
        throw new InstaboxBackendError("instabox_invalid_config", "creation plan lacks matching fresh free-org evidence");
      }
    }
    const machineName = plan?.name ?? buildInstaboxMachineName(ticket.ticketId, ticket.agentKey);

    const created = await this.#call({
      method: "POST",
      path: "/machines",
      idempotencyKey: buildInstaboxCreateIdempotencyKey(ticket.ticketId),
      body: plan ? {
        name: plan.name, templateId: plan.templateId, orgId: plan.orgId,
        vcpus: plan.vcpus, memMiB: plan.memMiB,
        // Ordinary API keys cannot change free maxRunMinutes. Do not send it.
      } : {
        name: machineName,
        templateId: this.#templateId,
        timeoutSeconds: this.#machineTimeoutSeconds,
      },
    });
    if (!isSuccess(created.status)) {
      const upstreamCode = extractInstaboxErrorCode(created.payload);
      let detail = `create HTTP ${created.status}`;
      if (upstreamCode) {
        detail += `: ${upstreamCode}`;
      } else if (created.transportError) {
        detail += ` ${created.transportError}`;
      }
      if (upstreamCode === "template_not_allowed" || created.status === 403) {
        detail += "; 免费层仅允许 agent-browser 或快照";
      }
      throw new InstaboxBackendError(
        "instabox_create_failed",
        detail,
        false,
        undefined,
        upstreamCode,
      );
    }
    const record = asRecord(created.payload);
    const machineId = readString(record?.machineId);
    const operationId = readString(record?.id);
    if (!machineId || !operationId) {
      throw new InstaboxBackendError(
        "instabox_create_unconfirmed",
        "create accepted but response missing machineId or operation id; identity unverified; cleanup pending",
        true,
        machineId ?? undefined,
      );
    }

    try {
      await this.#awaitOperation({
        operationId,
        failCode: "instabox_create_failed",
        unconfirmedCode: "instabox_create_unconfirmed",
        timeoutMs: this.#createTimeoutMs,
        cleanupPendingOnFailure: true,
      });
    } catch (error) {
      // POST binds the known id, but operation failure does not verify machine
      // identity. Preserve cleanup diagnostics without authorizing DELETE or
      // retaining arbitrary upstream text in a cause.
      throw new InstaboxBackendError(
        error instanceof InstaboxBackendError ? error.code : "instabox_create_unconfirmed",
        error instanceof InstaboxBackendError && error.code === "instabox_create_failed"
          ? "create operation failed; identity unverified; cleanup pending"
          : "create operation not confirmed; identity unverified; cleanup pending",
        true,
        machineId,
      );
    }
    if (plan) {
      const response = await this.#call({ method: "GET", path: `/machines/${encodeURIComponent(machineId)}` });
      const machine = asRecord(response.payload);
      const spec = asRecord(machine?.spec);
      const template = asRecord(machine?.template);
      const expectedSpec = this.#freeOrgObservation!.allowedSpecs.find(s => s.vcpus === plan.vcpus && s.memMiB === plan.memMiB)!;
      // Only a successful identity read may authorize compensating deletion.
      if (!isSuccess(response.status) || machine?.id !== machineId || machine.orgId !== plan.orgId) {
        throw new InstaboxBackendError("instabox_create_unconfirmed",
          "created machine identity could not be verified (HTTP/id/orgId mismatch); cleanup pending", true, machineId);
      }
      const mismatches: string[] = [];
      if (this.#billingPolicy === "free-only" && machine.free !== true) {
        mismatches.push("created machine is not confirmed free; allow-paid-required");
      } else if (typeof machine.free !== "boolean") {
        mismatches.push("machine.free is not boolean");
      }
      if (machine.name !== plan.name) mismatches.push("name mismatch");
      if (template?.id !== plan.templateId) mismatches.push("template mismatch");
      if (spec?.vcpus !== plan.vcpus || spec?.memMiB !== plan.memMiB ||
          spec?.persistentDiskGiB !== expectedSpec.persistentDiskGiB) mismatches.push("spec mismatch");
      if (this.#billingPolicy === "free-only" && machine.maxRunMinutes !== 480) mismatches.push("maxRunMinutes mismatch");
      if (mismatches.length > 0) {
        const reason = mismatches.join("; ");
        try {
          if (this.#deleteMachineImpl) {
            await this.#deleteMachineImpl(machineId);
          } else {
            const deleted = await this.#call({
              method: "DELETE",
              path: `/machines/${encodeURIComponent(machineId)}`,
              idempotencyKey: buildInstaboxDeleteIdempotencyKey(machineId),
            });
            const opId = readString(asRecord(deleted.payload)?.id);
            if (!isSuccess(deleted.status) || !opId) {
              throw new InstaboxBackendError("instabox_cleanup_pending",
                `delete HTTP ${deleted.status}${!opId ? "; missing operation id" : ""}`,
                true, machineId, extractInstaboxErrorCode(deleted.payload));
            }
            await this.#awaitOperation({
              operationId: opId,
              failCode: "instabox_cleanup_pending",
              unconfirmedCode: "instabox_cleanup_pending",
              timeoutMs: this.#deleteTimeoutMs,
              cleanupPendingOnFailure: true,
            });
          }
        } catch (error) {
          // Do not include arbitrary hook/transport messages in the safe error.
          const detail = error instanceof InstaboxBackendError ? error.message : "delete failed";
          throw new InstaboxBackendError("instabox_create_unconfirmed",
            `${reason}; cleanup pending: ${detail}`, true, machineId,
            error instanceof InstaboxBackendError ? error.upstreamErrorCode : undefined);
        }
        throw new InstaboxBackendError("instabox_create_failed", `${reason}; compensating deletion succeeded`);
      }
    }

    const readyAt = this.#now();

    // 建机完成即取基线：usage 是账号累计值，之后的对账只能靠取差。
    const baseline = await this.#fetchUsage(machineId);
    const usageBaselineRunningMs =
      baseline === null ? null : Math.round(baseline.runningSeconds * 1000);

    const leaseId = `${machineId}:${ticket.ticketId}`;
    this.#leases.set(leaseId, {
      machineId,
      ticketId: ticket.ticketId,
      grantId: ticket.grantId,
      requestedAt,
      readyAt,
      createOperationId: operationId,
      usageBaselineRunningMs,
      releasedAt: null,
      releaseOutcome: null,
    });

    return {
      leaseId,
      backendId: INSTABOX_BACKEND_ID,
      ticketId: ticket.ticketId,
      grantId: ticket.grantId,
      createdAt: readyAt,
      readableRoots: [...ticket.filesystem.readableRoots],
      writableRoots: [...ticket.filesystem.writableRoots],
      metadata: {
        machineId,
        machineName,
        templateId: this.#templateId,
        createOperationId: operationId,
        requestedAt,
        readyAt,
        usageBaselineRunningMs,
      },
    };
  }

  async execute(
    lease: ExecutionLease,
    request: ExecutionRequest,
    onEvent?: (event: ExecutionEvent) => void,
  ): Promise<ExecutionResult> {
    const entry = this.#requireEntry(lease);
    if (entry.releasedAt !== null) {
      throw new InstaboxBackendError("instabox_lease_released");
    }
    if (request.kind !== "command") {
      throw new InstaboxBackendError(
        "instabox_unsupported_request",
        `request kind ${request.kind} is not executable over the instabox exec API`,
      );
    }
    if (!Array.isArray(request.argv) || request.argv.length === 0) {
      throw new InstaboxBackendError(
        "instabox_unsupported_request",
        "argv must be a non-empty array",
      );
    }
    // 旧实现无条件拒绝 stdin（当时文档未确认支持）。2026-10-20 已按官方文档核实：
    // 合法就透传、越界/类型不对就在发请求之前拒绝（不产生任何机器侧副作用）。
    const stdin = this.#resolveStdin(request.stdin);
    const timeoutSeconds = this.#resolveExecTimeoutSeconds(request.timeoutMs);
    const cmd = this.#buildCommand(request);

    const executionId = `${entry.machineId}:${this.#now().toString(36)}`;
    const startedAt = this.#now();
    onEvent?.({ type: "started", executionId, at: startedAt });

    const response = await this.#call({
      method: "POST",
      path: `/machines/${encodeURIComponent(entry.machineId)}/exec`,
      body: { cmd, timeoutSeconds, ...(stdin === undefined ? {} : { stdin }) },
    });
    if (!isSuccess(response.status)) {
      throw new InstaboxBackendError(
        "instabox_exec_failed",
        `exec HTTP ${response.status}${response.transportError ? ` ${response.transportError}` : ""}`,
      );
    }
    const payload = asRecord(response.payload);
    if (!payload) {
      throw new InstaboxBackendError("instabox_exec_failed", "exec response is not an object");
    }
    const timedOut = payload.timedOut === true;
    const exitCode = readFiniteNumber(payload.exitCode);
    if (exitCode === null && !timedOut) {
      // 没有退出码又没有超时标记 = 协议层残缺，不能当成成功。
      throw new InstaboxBackendError(
        "instabox_exec_failed",
        "exec response missing exitCode",
      );
    }

    // exec 无实时流（streamingExec=false）：输出在调用结束后一次性投递。
    const stdout = truncateOutput(
      typeof payload.stdout === "string" ? payload.stdout : "",
      this.#maxOutputChars,
    );
    const stderr = truncateOutput(
      typeof payload.stderr === "string" ? payload.stderr : "",
      this.#maxOutputChars,
    );
    if (stdout) onEvent?.({ type: "stdout", executionId, chunk: stdout, seq: 1 });
    if (stderr) onEvent?.({ type: "stderr", executionId, chunk: stderr, seq: 1 });
    onEvent?.({
      type: "usage",
      executionId,
      usage: { wallMs: Math.max(0, this.#now() - startedAt) },
    });
    onEvent?.({ type: "exited", executionId, exitCode });

    // 非零退出是有效结果：ok=false，但 stdout/stderr 一个都不能丢。
    return {
      executionId,
      ok: !timedOut && exitCode === 0,
      exitCode,
      output: {
        stdout,
        stderr,
        timedOut,
        truncated: payload.truncated === true,
      },
    };
  }

  /**
   * DELETE 只是「已受理」；必须轮询 delete operation 到 `succeeded` 才算清理完成。
   * 未确认一律抛 `instabox_cleanup_pending`（`cleanupPending: true`），lease 保持可重试。
   * 已确认的 lease 再调 release 直接回缓存结果（幂等）。
   */
  async release(
    lease: ExecutionLease,
    reason: ExecutionReleaseReason,
  ): Promise<InstaboxReleaseOutcome> {
    const entry = this.#requireEntry(lease);
    if (entry.releasedAt !== null) {
      return entry.releaseOutcome ?? { ok: true };
    }
    entry.releaseReason = reason;

    // 机器还在时取「后」样本，与 prepare 的基线做差；取不到就不给差值，绝不填 0 冒充。
    const after = await this.#fetchUsage(entry.machineId);
    const providerUsageMs =
      after === null || entry.usageBaselineRunningMs === null
        ? undefined
        : Math.max(
            0,
            Math.round(after.runningSeconds * 1000) -
              entry.usageBaselineRunningMs,
          );

    const deleted = await this.#call({
      method: "DELETE",
      path: `/machines/${encodeURIComponent(entry.machineId)}`,
      idempotencyKey: buildInstaboxDeleteIdempotencyKey(entry.machineId),
    });
    if (deleted.transportError) {
      throw new InstaboxBackendError(
        "instabox_cleanup_pending",
        `delete transport error`,
        true,
      );
    }
    if (deleted.status === 404) {
      // 云端已无此机器 = 已经不在运行，等价于清理完成（与 docker 后端 absent 口径一致）。
      return this.#confirmRelease(entry, providerUsageMs);
    }
    if (!isSuccess(deleted.status)) {
      throw new InstaboxBackendError(
        "instabox_cleanup_pending",
        `delete HTTP ${deleted.status}`,
        true,
      );
    }
    const operationId = readString(asRecord(deleted.payload)?.id);
    if (!operationId) {
      // 没有 operation id 就等于无法确认，不能假成功。
      throw new InstaboxBackendError(
        "instabox_cleanup_pending",
        "delete response missing operation id",
        true,
      );
    }

    await this.#awaitOperation({
      operationId,
      failCode: "instabox_cleanup_pending",
      unconfirmedCode: "instabox_cleanup_pending",
      timeoutMs: this.#deleteTimeoutMs,
      cleanupPendingOnFailure: true,
    });
    return this.#confirmRelease(entry, providerUsageMs);
  }

  #confirmRelease(
    entry: LeaseEntry,
    providerUsageMs: number | undefined,
  ): InstaboxReleaseOutcome {
    const outcome: InstaboxReleaseOutcome =
      providerUsageMs === undefined ? { ok: true } : { ok: true, providerUsageMs };
    entry.releasedAt = this.#now();
    entry.releaseOutcome = outcome;
    return outcome;
  }

  #requireEntry(lease: ExecutionLease): LeaseEntry {
    if (lease.backendId !== INSTABOX_BACKEND_ID) {
      throw new InstaboxBackendError(
        "instabox_lease_mismatch",
        `lease belongs to ${lease.backendId}`,
      );
    }
    const entry = this.#leases.get(lease.leaseId);
    if (!entry) {
      throw new InstaboxBackendError("instabox_lease_not_found");
    }
    if (entry.ticketId !== lease.ticketId || entry.grantId !== lease.grantId) {
      throw new InstaboxBackendError(
        "instabox_lease_mismatch",
        "lease ticket/grant does not match",
      );
    }
    return entry;
  }

  /**
   * stdin 直通校验：`undefined` = 请求里没提供（body 里也不加字段，保持原报文兼容）；
   * 字符串（含空串）在 1 MiB / UTF-8 字节以内原样透传；其他类型或超限立即拒绝，
   * 错误文案只带上限数字，**绝不回显输入内容**。
   */
  #resolveStdin(stdin: unknown): string | undefined {
    if (stdin === undefined) return undefined;
    if (typeof stdin !== "string") {
      throw new InstaboxBackendError(
        "instabox_unsupported_request",
        "stdin must be a string",
      );
    }
    if (utf8ByteLengthExceeds(stdin, INSTABOX_MAX_STDIN_BYTES)) {
      throw new InstaboxBackendError(
        "instabox_unsupported_request",
        `stdin exceeds the ${INSTABOX_MAX_STDIN_BYTES} byte limit`,
      );
    }
    return stdin;
  }

  #resolveExecTimeoutSeconds(timeoutMs: number | undefined): number {
    const boundMs = INSTABOX_MAX_EXEC_SECONDS * 1000;
    if (timeoutMs === undefined) return this.#execTimeoutSeconds;
    if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new InstaboxBackendError(
        "instabox_unsupported_request",
        "timeoutMs must be a positive finite number",
      );
    }
    if (timeoutMs > boundMs) {
      throw new InstaboxBackendError(
        "instabox_unsupported_request",
        "timeoutMs exceeds the instabox exec bound (600s)",
      );
    }
    return clampExecSeconds(Math.ceil(timeoutMs / 1000));
  }

  /** cwd / env 仍用 `cd` + 赋值前缀表达（exec body 只多一个可选 stdin，不承载 cwd/env）。 */
  #buildCommand(request: Extract<ExecutionRequest, { kind: "command" }>): string {
    const script = argvToInstaboxCommand(request.argv);
    const segments: string[] = [];
    if (request.cwd) segments.push(`cd ${shellQuote(request.cwd)}`);
    let envPrefix = "";
    if (request.env) {
      const assignments: string[] = [];
      for (const [key, value] of Object.entries(request.env)) {
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
          throw new InstaboxBackendError(
            "instabox_unsupported_request",
            `env key ${key} is not a valid shell identifier`,
          );
        }
        assignments.push(`${key}=${shellQuote(value)}`);
      }
      if (assignments.length > 0) envPrefix = `${assignments.join(" ")} `;
    }
    segments.push(`${envPrefix}${script}`);
    return segments.join(" && ");
  }

  async #call(args: {
    method: "GET" | "POST" | "DELETE";
    path: string;
    body?: unknown;
    idempotencyKey?: string;
  }): Promise<CallResult> {
    const headers: Record<string, string> = {
      "X-API-Key": this.#apiKey,
      Accept: "application/json",
    };
    if (args.body !== undefined) headers["Content-Type"] = "application/json";
    if (args.idempotencyKey) headers["Idempotency-Key"] = args.idempotencyKey;
    try {
      const response = await this.#fetch(`${this.#baseUrl}${args.path}`, {
        method: args.method,
        headers,
        ...(args.body !== undefined
          ? { body: JSON.stringify(args.body) }
          : {}),
      });
      let payload: unknown = null;
      if (typeof response?.json === "function") {
        try {
          payload = await response.json();
        } catch {
          payload = null;
        }
      }
      return {
        status: Number.isFinite(response?.status) ? response.status : 0,
        payload,
      };
    } catch (error) {
      // 传输层失败不吞：status 0 + 短描述（不含 key / header）。
      const reason = error instanceof Error ? error.name : "unknown";
      return { status: 0, payload: null, transportError: reason };
    }
  }

  async #fetchUsage(machineId: string): Promise<InstaboxUsageSample | null> {
    const response = await this.#call({
      method: "GET",
      path: `/machines/${encodeURIComponent(machineId)}/usage`,
    });
    if (!isSuccess(response.status)) return null;
    const record = asRecord(response.payload);
    const runningSeconds = readFiniteNumber(record?.runningSeconds);
    if (runningSeconds === null) return null;
    const sample: InstaboxUsageSample = { runningSeconds };
    const vcpuSeconds = readFiniteNumber(record?.vcpuSeconds);
    if (vcpuSeconds !== null) sample.vcpuSeconds = vcpuSeconds;
    const memGiBSeconds = readFiniteNumber(record?.memGiBSeconds);
    if (memGiBSeconds !== null) sample.memGiBSeconds = memGiBSeconds;
    const diskGiBSeconds = readFiniteNumber(record?.diskGiBSeconds);
    if (diskGiBSeconds !== null) sample.diskGiBSeconds = diskGiBSeconds;
    return sample;
  }

  /**
   * 长轮询到 `succeeded` 才 resolve。`failed` / 超时 / 次数上界都抛错；
   * 轮询期间的 404/500 视为瞬时故障继续试（上界内），不把一次抖动当成结论。
   */
  async #awaitOperation(args: {
    operationId: string;
    failCode: InstaboxFailureCode;
    unconfirmedCode: InstaboxFailureCode;
    timeoutMs: number;
    cleanupPendingOnFailure: boolean;
  }): Promise<void> {
    const startedAt = this.#now();
    let lastStatus = 0;
    for (let attempt = 0; attempt < this.#maxPollAttempts; attempt += 1) {
      if (attempt > 0 && this.#pollIntervalMs > 0) {
        await this.#sleep(this.#pollIntervalMs);
      }
      const response = await this.#call({
        method: "GET",
        path: `/operations/${encodeURIComponent(args.operationId)}?wait=${this.#operationWaitSeconds}s`,
      });
      lastStatus = response.status;
      const record = isSuccess(response.status)
        ? asRecord(response.payload)
        : null;
      const state = readString(record?.state);
      if (state === "succeeded") return;
      if (state === "failed") {
        throw new InstaboxBackendError(
          args.failCode,
          "operation failed",
          args.cleanupPendingOnFailure,
        );
      }
      if (this.#now() - startedAt >= args.timeoutMs) break;
    }
    throw new InstaboxBackendError(
      args.unconfirmedCode,
      `operation not confirmed (last HTTP ${lastStatus})`,
      args.cleanupPendingOnFailure,
    );
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function clampExecSeconds(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) return 1;
  return Math.min(INSTABOX_MAX_EXEC_SECONDS, Math.max(1, Math.round(seconds)));
}

function truncateOutput(value: string, limitChars: number): string {
  if (value.length <= limitChars) return value;
  return `${value.slice(0, limitChars)}…[truncated ${value.length - limitChars} chars]`;
}

/**
 * UTF-8 字节数是否超限。UTF-8 编码后字节数恒 ≥ UTF-16 code unit 数，
 * 所以 `length` 已超限时无需再编码（避免为超大输入分配一整份副本）。
 */
function utf8ByteLengthExceeds(value: string, limit: number): boolean {
  if (value.length > limit) return true;
  return new TextEncoder().encode(value).length > limit;
}

export function createInstaboxExecutionBackend(
  options: InstaboxBackendOptions,
): InstaboxExecutionBackend {
  return new InstaboxBackend(options);
}

/**
 * 适配到通用 `ExecutionBackend` 契约（`release` 返回 `Promise<void>`）。
 * 语义不变：内部仍会等 delete operation 确认，未确认照旧抛 cleanup_pending。
 */
export function asExecutionBackend(
  backend: InstaboxExecutionBackend,
): ExecutionBackend {
  return {
    describe: () => backend.describe(),
    prepare: (ticket) => backend.prepare(ticket),
    execute: (lease, request, onEvent) =>
      backend.execute(lease, request, onEvent),
    release: async (lease, reason) => {
      await backend.release(lease, reason);
    },
  };
}

// Only codes already used by this backend's Instabox contract may be displayed.
// A syntactically valid code can still contain credentials; never echo unknown values.
const DISPLAYABLE_INSTABOX_ERROR_CODES: ReadonlySet<string> = new Set([
  "template_not_allowed",
]);

export function extractInstaboxErrorCode(payload: unknown): string | undefined {
  const rec = asRecord(payload);
  if (!rec) return undefined;
  const code = readString(asRecord(rec.error)?.code)
    ?? readString(rec.code)
    ?? readString(rec.error);
  if (code === null) return undefined;
  return DISPLAYABLE_INSTABOX_ERROR_CODES.has(code) ? code : "upstream_error";
}

/** 供测试/调用方判断 argv 是否走 shell 透传（`bash -lc`）。 */
export function isInstaboxShellArgv(argv: readonly string[]): boolean {
  return (
    argv.length === 3 &&
    SHELL_EXECUTABLES.has(executableBase(argv[0] ?? "")) &&
    argv[1] === "-lc"
  );
}
