/**
 * GCP Cloud Run Jobs 执行后端（`kind: "cloud"`）。块 I。
 *
 * 定位与 instabox / docker 沙盒后端一致：它是**执行后端**（命令在哪跑），
 * 不是「run 落点」，ticket.target 仍沿用 server|machine 词汇。
 *
 * 真机事实（2026-10-19 在本机实测，gcloud 在
 * `/home/nolotus/google-cloud-sdk/bin/gcloud`，已登录 s@nolotus.com）：
 * - `gcloud run jobs create <job> --image=... --max-retries 0 --task-timeout 60s`
 *   成功；**create 只登记定义，不启动任何容器**，所以 create 成功即 ready，
 *   没有 instabox 那种异步 operation 需要轮询。
 * - `gcloud run jobs execute <job> --wait` 会**阻塞到容器退出**；
 *   `--wait` 未加时 gcloud 在 execution 一起跑就返回，对我们是假成功，故必加。
 * - `--args` 在两个子命令上都是 `[ARG,...]` 列表型 flag（comma 分隔），
 *   不是 shell 字符串；gcloud 用 `^DELIM^v1DELIMv2` 形式指定自定义分隔符
 *   （`gcloud topic escaping`：DELIM 可为单/多字符，且不得出现在任何 value 里）。
 *   我们据此把 argv 编码进去，全程**不拼 shell**、不经过 `sh -c`。
 * - `gcloud run jobs delete <job> --quiet` 成功即视为已确认删除。
 *
 * 三条硬约束：
 * 1. argv 永远以**数组**穿过注入的 `execImpl`；本文件不产生 command line 字符串，
 *    所以 argv 里的空格/引号/`$(...)`/`;` 都不会被任何 shell 解释。
 * 2. 删除未确认一律抛 `gcp_cleanup_pending`（`cleanupPending: true`），lease 保持
 *    可重试；绝不把「已请求删除」谎报成「已清理」。
 * 3. `exitCode !== 0` 是**有效结果**：返回 `ok:false` 并原样保留 stdout/stderr；
 *    只有传输/协议层失败才抛错。
 *
 * 已知边界（本块刻意不假装）：
 * - `capabilities.filesystem: true` 指的是「容器里有文件系统」，**不是**把
 *   ticket 的 readableRoots/writableRoots 挂进来；块 I 没有卷/GCS 同步，
 *   因此 lease metadata 里显式记录 `unmountedRoots`，让审计看得见这个缺口。
 * - `--wait` 失败时 gcloud 只报「execution 失败」，容器真实 exit code 不在
 *   stdout 里；我们能从 stderr 抠出来就用，抠不到记 1 并在
 *   `output.exitCodeSource` 标注 `"unknown"`，不伪装精确。
 * - 不声明 `streamingExec`（一次性回包，没有实时流）、无 processSignals、
 *   无可复用磁盘 —— 一条 lease 一次执行语义，靠 Cloud Run job 的 container 隔离。
 */

import type { ExecutionBillingModel } from "./executionAudit";
import type {
  ExecutionBackend,
  ExecutionBackendCapabilities,
  ExecutionBackendDescriptor,
  ExecutionEvent,
  ExecutionLease,
  ExecutionReleaseReason,
  ExecutionRequest,
  ExecutionResult,
  ExecutionTicket,
} from "./executionBackend";

export const GCP_CLOUD_RUN_BACKEND_ID = "gcp-cloud-run-jobs";
export const GCP_CLOUD_RUN_DEFAULT_PROJECT = "nolo-434215";
export const GCP_CLOUD_RUN_DEFAULT_REGION = "us-central1";
export const GCP_CLOUD_RUN_DEFAULT_IMAGE = "docker.io/library/busybox";
/** 本机已核实路径；生产可由配置覆盖。 */
export const GCP_CLOUD_RUN_DEFAULT_GCLOUD_PATH =
  "/home/nolotus/google-cloud-sdk/bin/gcloud";
export const GCP_CLOUD_RUN_DEFAULT_TASK_TIMEOUT_SECONDS = 60;
export const GCP_CLOUD_RUN_MAX_OUTPUT_CHARS = 64 * 1024;

/**
 * Cloud Run jobs 的计费模型常量（**只声明，不在本文件算钱**，由审计层消费）。
 * 向上取整（取整是审计层的事）。
 * 1 vCPU + 0.512 GiB = 512 MiB，即 Cloud Run 的最小可用形状。
 */
export const GCP_CLOUD_RUN_RATE: ExecutionBillingModel = {
  kind: "vcpu-gib-second",
  vcpuMilli: 1000,
  // 512 MiB = 0.5 GiB = 500 milli-GiB. (`gibMilli` counts thousandths of a
  // GiB, so 512 would mean 0.512 GiB and silently overcharge by 2.4%.)
  gibMilli: 500,
  vcpuRateNanoUsd: "12600",
  gibRateNanoUsd: "2500",
};

/**
 * 能力声明。注意 `streamingExec: false` —— 不是「暂不支持」，而是本后端
 * **不声明**该能力：一次 execute 一条命令，回包一次性给全。
 */
export const GCP_CLOUD_RUN_CAPABILITIES: ExecutionBackendCapabilities = {
  executionClasses: ["oneshot"],
  streamingExec: false,
  filesystem: true,
  persistentFilesystem: false,
  processSignals: false,
  inboundPorts: false,
  networkPolicy: true,
  snapshots: false,
  gpu: false,
  isolationModes: ["container"],
};

export type GcpCloudRunFailureCode =
  | "gcp_cloud_run_invalid_config"
  | "gcp_invalid_ticket"
  | "gcp_unsupported_request"
  | "gcp_lease_not_found"
  | "gcp_lease_mismatch"
  | "gcp_lease_released"
  | "gcp_create_failed"
  | "gcp_exec_failed"
  | "gcp_cleanup_pending";

/** 对外只允许固定安全文案；detail 只放状态码/退出码，绝不带凭据或命令行。 */
const SAFE_MESSAGE: Record<GcpCloudRunFailureCode, string> = {
  "gcp_cloud_run_invalid_config":
    "Rejected: gcp cloud run backend needs a valid project, region, image and execImpl",
  "gcp_invalid_ticket":
    "Rejected: execution ticket cannot be satisfied by the gcp cloud run backend",
  "gcp_unsupported_request":
    "Request is not supported by the gcp cloud run jobs backend",
  "gcp_lease_not_found": "Unknown execution lease",
  "gcp_lease_mismatch": "Lease does not match this backend or ticket",
  "gcp_lease_released": "Lease was already released",
  "gcp_create_failed": "Cloud Run job create failed",
  "gcp_exec_failed": "Cloud Run job execute failed",
  "gcp_cleanup_pending": "Cloud Run job delete was not confirmed",
};

export class GcpCloudRunBackendError extends Error {
  readonly code: GcpCloudRunFailureCode;
  readonly detail?: string;
  readonly cleanupPending: boolean;

  constructor(code: GcpCloudRunFailureCode, detail?: string) {
    super(detail ? `${SAFE_MESSAGE[code]} (${detail})` : SAFE_MESSAGE[code]);
    this.name = "GcpCloudRunBackendError";
    this.code = code;
    this.detail = detail;
    this.cleanupPending = code === "gcp_cleanup_pending";
  }
}

/** 注入点：唯一的外部调用通道。argv 是**数组**，绝不接受 shell 字符串。 */
export type GcpExecResult = { code: number; stdout: string; stderr: string };
export type GcpExecImpl = (argv: string[]) => Promise<GcpExecResult>;

export type GcpCloudRunBackendOptions = {
  execImpl: GcpExecImpl;
  project?: string;
  region?: string;
  image?: string;
  gcloudPath?: string;
  maxRetries?: number;
  taskTimeoutSeconds?: number;
  now?: () => number;
};

type LeaseEntry = {
  jobName: string;
  ticketId: string;
  grantId: string;
  requestedAt: number;
  readyAt: number;
  /** 上一次真正写进 job 的 `--args` 值；相同则跳过 update（幂等省一次调用）。 */
  appliedArgsFlag: string | null;
  executionSeq: number;
  releasedAt: number | null;
  releaseReason: ExecutionReleaseReason | null;
};

// ---------------------------------------------------------------------------
// 标识符 / 参数编码（纯函数，可单测）
// ---------------------------------------------------------------------------

/**
 * ticketId 白名单：只允许字母数字和 `_ . : -`，且必须是字母数字开头。
 * 其它字符（空格、`;`、`$`、`&`、`|`、换行……）直接拒绝 ——
 * 白名单是「不把可疑输入写进任何命令行」的第一道闸，字符被规范化后的
 * job 名再过 GCP 自己的命名规则校验（第二道闸）。
 */
const TICKET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;

/** Cloud Run job 名：小写字母数字与 `-`，字母数字开头结尾，≤63。 */
const JOB_NAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const PROJECT_PATTERN = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const REGION_PATTERN = /^[a-z]+-[a-z]+[0-9]$/;
const IMAGE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/:@-]{0,255}$/;
const GCLOUD_PATH_PATTERN = /^[A-Za-z0-9._/:-]{1,512}$/;

/** 32-bit FNV-1a，用于让「规范化后被压平的 ticketId」仍有唯一后缀。 */
function fnv1aHex(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index) & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * ticketId → Cloud Run job 名：`nolo-<slug>-<hash8>`。
 * 先做字符白名单校验（非法字符**拒绝**，不静默吞掉），再把非 `[a-z0-9]`
 * 压成 `-`，最后加 8 位哈希保证 `a.b` 与 `a-b` 不会撞名。
 */
export function buildGcpCloudRunJobName(ticketId: string): string {
  if (typeof ticketId !== "string" || !TICKET_ID_PATTERN.test(ticketId)) {
    throw new GcpCloudRunBackendError(
      "gcp_invalid_ticket",
      "ticketId must match [A-Za-z0-9][A-Za-z0-9_.:-]{0,63}",
    );
  }
  const slug = ticketId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const jobName = `nolo-${slug.length > 0 ? slug : "run"}-${fnv1aHex(ticketId)}`;
  if (!JOB_NAME_PATTERN.test(jobName)) {
    throw new GcpCloudRunBackendError(
      "gcp_invalid_ticket",
      `derived job name rejected by Cloud Run naming rules: ${jobName}`,
    );
  }
  return jobName;
}

/**
 * `--args` 自定义分隔符候选。要求：单/多字符序列，且**不出现在任何 value 里**，
 * 这样 join/split 可逆。按顺序取第一个安全的；全都出现就 fail closed。
 */
const ARG_LIST_DELIMITERS: readonly string[] = [
  "|",
  ";",
  "~~",
  ":::",
  "%%",
  "§",
  "\u001f",
];

export function assertGcpArgv(argv: readonly string[]): string[] {
  if (!Array.isArray(argv) || argv.length === 0) {
    throw new GcpCloudRunBackendError(
      "gcp_unsupported_request",
      "command.argv must be a non-empty string array",
    );
  }
  for (const token of argv) {
    if (typeof token !== "string") {
      throw new GcpCloudRunBackendError(
        "gcp_unsupported_request",
        "command.argv must contain only strings",
      );
    }
    if (token.includes("\u0000")) {
      throw new GcpCloudRunBackendError(
        "gcp_unsupported_request",
        "command.argv must not contain NUL bytes",
      );
    }
  }
  return [...argv];
}

/**
 * argv → `--args` flag 值（**不含** `--args=` 前缀）。
 * 形态遵循 `gcloud topic escaping`：`^DELIM^v1DELIMv2`。
 * 结果只是**一个** argv 元素，交给 execImpl 的数组； argv 内容不会被任何 shell 看到。
 */
export function buildGcpCloudRunArgsFlag(argv: readonly string[]): string {
  const values = assertGcpArgv(argv);
  for (const delimiter of ARG_LIST_DELIMITERS) {
    if (values.some((value) => value.includes(delimiter))) continue;
    return `^${delimiter}^${values.join(delimiter)}`;
  }
  throw new GcpCloudRunBackendError(
    "gcp_unsupported_request",
    "argv contains every candidate --args delimiter; refusing to guess a separator",
  );
}

/** 从 gcloud 失败文案里尽量还原容器退出码（`--wait` 不直接回传它）。 */
function extractTaskExitCode(text: string): number | null {
  const match =
    /exit(?:ed)?\s*(?:with\s*)?code[:\s]+(-?\d+)/i.exec(text) ??
    /non-zero exit\s*(-?\d+)/i.exec(text);
  if (!match) return null;
  const parsed = Number.parseInt(match[1] ?? "", 10);
  return Number.isFinite(parsed) ? parsed : null;
}

/** gcloud 的「job 不存在」是**已删除**的确认，可以当成功；其它失败一律 pending。 */
function isNotFoundFailure(result: GcpExecResult): boolean {
  const text = `${result.stderr}\n${result.stdout}`;
  return /NOT_FOUND|\bnot found\b|does not exist|Cannot find job/i.test(text);
}

function truncateOutput(value: string, limitChars: number): string {
  if (value.length <= limitChars) return value;
  return `${value.slice(0, limitChars)}…[truncated ${value.length - limitChars} chars]`;
}

function assertPattern(
  value: string,
  pattern: RegExp,
  label: string,
): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new GcpCloudRunBackendError(
      "gcp_cloud_run_invalid_config",
      `${label} is not a safe identifier`,
    );
  }
  return value;
}

// ---------------------------------------------------------------------------
// Backend
// ---------------------------------------------------------------------------

export class GcpCloudRunBackend implements ExecutionBackend {
  readonly #exec: GcpExecImpl;
  readonly #project: string;
  readonly #region: string;
  readonly #image: string;
  readonly #gcloudPath: string;
  readonly #maxRetries: number;
  readonly #taskTimeoutSeconds: number;
  readonly #now: () => number;
  readonly #leases = new Map<string, LeaseEntry>();

  constructor(options: GcpCloudRunBackendOptions) {
    if (typeof options?.execImpl !== "function") {
      throw new GcpCloudRunBackendError(
        "gcp_cloud_run_invalid_config",
        "execImpl is required (no implicit real gcloud invocation)",
      );
    }
    this.#exec = options.execImpl;
    this.#project = assertPattern(
      options.project ?? GCP_CLOUD_RUN_DEFAULT_PROJECT,
      PROJECT_PATTERN,
      "project",
    );
    this.#region = assertPattern(
      options.region ?? GCP_CLOUD_RUN_DEFAULT_REGION,
      REGION_PATTERN,
      "region",
    );
    this.#image = assertPattern(
      options.image ?? GCP_CLOUD_RUN_DEFAULT_IMAGE,
      IMAGE_PATTERN,
      "image",
    );
    this.#gcloudPath = assertPattern(
      options.gcloudPath ?? GCP_CLOUD_RUN_DEFAULT_GCLOUD_PATH,
      GCLOUD_PATH_PATTERN,
      "gcloudPath",
    );
    const maxRetries = options.maxRetries ?? 0;
    if (!Number.isInteger(maxRetries) || maxRetries < 0 || maxRetries > 10) {
      throw new GcpCloudRunBackendError(
        "gcp_cloud_run_invalid_config",
        "maxRetries must be an integer in [0,10]",
      );
    }
    this.#maxRetries = maxRetries;
    const taskTimeout = options.taskTimeoutSeconds ?? GCP_CLOUD_RUN_DEFAULT_TASK_TIMEOUT_SECONDS;
    if (!Number.isInteger(taskTimeout) || taskTimeout < 1 || taskTimeout > 86_400) {
      throw new GcpCloudRunBackendError(
        "gcp_cloud_run_invalid_config",
        "taskTimeoutSeconds must be an integer in [1,86400]",
      );
    }
    this.#taskTimeoutSeconds = taskTimeout;
    this.#now = options.now ?? Date.now;
  }

  describe(): ExecutionBackendDescriptor {
    return {
      id: GCP_CLOUD_RUN_BACKEND_ID,
      kind: "cloud",
      capabilities: { ...GCP_CLOUD_RUN_CAPABILITIES },
    };
  }

  /**
   * `gcloud run jobs create`：**只建定义，不启动容器**，所以 create 成功即 ready。
   * 不采信任何「已受理」中间态 —— 这里没有中间态，成功就是存在。
   */
  async prepare(ticket: ExecutionTicket): Promise<ExecutionLease> {
    if (ticket.version !== 1 || !ticket.ticketId || !ticket.grantId) {
      throw new GcpCloudRunBackendError("gcp_invalid_ticket");
    }
    const jobName = buildGcpCloudRunJobName(ticket.ticketId);
    const requestedAt = this.#now();

    let created: GcpExecResult;
    try {
      created = await this.#exec([
        this.#gcloudPath,
        "run",
        "jobs",
        "create",
        jobName,
        `--image=${this.#image}`,
        `--project=${this.#project}`,
        `--region=${this.#region}`,
        `--max-retries=${this.#maxRetries}`,
        `--task-timeout=${this.#taskTimeoutSeconds}s`,
      ]);
    } catch (error) {
      throw new GcpCloudRunBackendError(
        "gcp_create_failed",
        `create transport error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (created.code !== 0) {
      throw new GcpCloudRunBackendError(
        "gcp_create_failed",
        `create exited ${created.code}`,
      );
    }
    const readyAt = this.#now();

    const leaseId = `${jobName}:${ticket.ticketId}`;
    this.#leases.set(leaseId, {
      jobName,
      ticketId: ticket.ticketId,
      grantId: ticket.grantId,
      requestedAt,
      readyAt,
      appliedArgsFlag: null,
      executionSeq: 0,
      releasedAt: null,
      releaseReason: null,
    });

    // 块 I 没有卷挂载：把「ticket 要的根目录但没挂进来」写进 metadata，
    // 让审计看见缺口，而不是假装文件系统能力已经落地。
    const unmountedRoots = [
      ...new Set([
        ...ticket.filesystem.readableRoots,
        ...ticket.filesystem.writableRoots,
      ]),
    ];

    return {
      leaseId,
      backendId: GCP_CLOUD_RUN_BACKEND_ID,
      ticketId: ticket.ticketId,
      grantId: ticket.grantId,
      createdAt: readyAt,
      readableRoots: [...ticket.filesystem.readableRoots],
      writableRoots: [...ticket.filesystem.writableRoots],
      metadata: {
        jobName,
        project: this.#project,
        region: this.#region,
        image: this.#image,
        requestedAt,
        readyAt,
        unmountedRoots,
      },
    };
  }

  /**
   * 一条命令一次 execution：
   * 1. 只有 args 变了才 `gcloud run jobs update --args=...`（幂等省一次调用）；
   * 2. `gcloud run jobs execute <job> --wait` 阻塞到容器退出；
   * 3. 非零退出是有效结果（ok:false + stdout/stderr 一个都不丢）。
   */
  async execute(
    lease: ExecutionLease,
    request: ExecutionRequest,
    onEvent?: (event: ExecutionEvent) => void,
  ): Promise<ExecutionResult> {
    const entry = this.#requireEntry(lease);
    if (entry.releasedAt !== null) {
      throw new GcpCloudRunBackendError("gcp_lease_released");
    }
    if (request.kind !== "command") {
      throw new GcpCloudRunBackendError(
        "gcp_unsupported_request",
        `request kind ${request.kind} is not supported`,
      );
    }
    // 这三点在本后端都没有落地通道，显式拒绝而不是静默丢弃。
    if (request.cwd !== undefined) {
      throw new GcpCloudRunBackendError(
        "gcp_unsupported_request",
        "cwd is fixed inside the Cloud Run job container",
      );
    }
    if (request.env !== undefined) {
      throw new GcpCloudRunBackendError(
        "gcp_unsupported_request",
        "env injection is not implemented (use --set-env-vars at prepare time)",
      );
    }
    if (request.stdin !== undefined) {
      throw new GcpCloudRunBackendError(
        "gcp_unsupported_request",
        "stdin cannot be delivered to a Cloud Run job",
      );
    }

    const argsFlag = buildGcpCloudRunArgsFlag(request.argv);

    if (entry.appliedArgsFlag !== argsFlag) {
      let updated: GcpExecResult;
      try {
        updated = await this.#exec([
          this.#gcloudPath,
          "run",
          "jobs",
          "update",
          entry.jobName,
          `--args=${argsFlag}`,
          `--project=${this.#project}`,
          `--region=${this.#region}`,
        ]);
      } catch (error) {
        throw new GcpCloudRunBackendError(
          "gcp_exec_failed",
          `update transport error: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      if (updated.code !== 0) {
        throw new GcpCloudRunBackendError(
          "gcp_exec_failed",
          `update exited ${updated.code}`,
        );
      }
      entry.appliedArgsFlag = argsFlag;
    }

    entry.executionSeq += 1;
    const executionId = `${entry.jobName}:${entry.ticketId}:${entry.executionSeq}`;
    const startedAt = this.#now();
    onEvent?.({ type: "started", executionId, at: startedAt });

    let run: GcpExecResult;
    try {
      run = await this.#exec([
        this.#gcloudPath,
        "run",
        "jobs",
        "execute",
        entry.jobName,
        "--wait",
        `--project=${this.#project}`,
        `--region=${this.#region}`,
      ]);
    } catch (error) {
      throw new GcpCloudRunBackendError(
        "gcp_exec_failed",
        `execute transport error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    const stdout = truncateOutput(run.stdout ?? "", GCP_CLOUD_RUN_MAX_OUTPUT_CHARS);
    const stderr = truncateOutput(run.stderr ?? "", GCP_CLOUD_RUN_MAX_OUTPUT_CHARS);
    let exitCode = 0;
    let exitCodeSource: "gcloud" | "stderr" | "unknown" = "gcloud";
    if (run.code !== 0) {
      const parsed = extractTaskExitCode(stderr) ?? extractTaskExitCode(stdout);
      if (parsed === null) {
        exitCode = 1;
        exitCodeSource = "unknown";
      } else {
        exitCode = parsed;
        exitCodeSource = "stderr";
      }
    }

    if (stdout) onEvent?.({ type: "stdout", executionId, chunk: stdout, seq: 1 });
    if (stderr) onEvent?.({ type: "stderr", executionId, chunk: stderr, seq: 1 });
    onEvent?.({
      type: "usage",
      executionId,
      usage: { wallMs: Math.max(0, this.#now() - startedAt) },
    });
    onEvent?.({ type: "exited", executionId, exitCode });

    return {
      executionId,
      ok: exitCode === 0,
      exitCode,
      output: {
        stdout,
        stderr,
        jobName: entry.jobName,
        gcloudExitCode: run.code,
        exitCodeSource,
      },
    };
  }

  /**
   * `gcloud run jobs delete --quiet` 成功才算清理完成。
   * 失败（权限、网络、未知状态）一律抛 `gcp_cleanup_pending`，lease 保持可重试；
   * 只有 gcloud 明确回 NOT_FOUND（job 已不存在）才当成功。
   */
  async release(
    lease: ExecutionLease,
    reason: ExecutionReleaseReason,
  ): Promise<void> {
    const entry = this.#requireEntry(lease);
    if (entry.releasedAt !== null) return; // 幂等：已确认清理过
    entry.releaseReason = reason;

    let deleted: GcpExecResult;
    try {
      deleted = await this.#exec([
        this.#gcloudPath,
        "run",
        "jobs",
        "delete",
        entry.jobName,
        "--quiet",
        `--project=${this.#project}`,
        `--region=${this.#region}`,
      ]);
    } catch (error) {
      throw new GcpCloudRunBackendError(
        "gcp_cleanup_pending",
        `delete transport error: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    if (deleted.code !== 0 && !isNotFoundFailure(deleted)) {
      throw new GcpCloudRunBackendError(
        "gcp_cleanup_pending",
        `delete exited ${deleted.code}`,
      );
    }
    entry.releasedAt = this.#now();
  }

  #requireEntry(lease: ExecutionLease): LeaseEntry {
    if (lease.backendId !== GCP_CLOUD_RUN_BACKEND_ID) {
      throw new GcpCloudRunBackendError(
        "gcp_lease_mismatch",
        `lease belongs to ${lease.backendId}`,
      );
    }
    const entry = this.#leases.get(lease.leaseId);
    if (!entry) {
      throw new GcpCloudRunBackendError("gcp_lease_not_found");
    }
    if (entry.ticketId !== lease.ticketId || entry.grantId !== lease.grantId) {
      throw new GcpCloudRunBackendError(
        "gcp_lease_mismatch",
        "lease ticket/grant does not match",
      );
    }
    return entry;
  }
}

export function createGcpCloudRunExecutionBackend(
  options: GcpCloudRunBackendOptions,
): ExecutionBackend {
  return new GcpCloudRunBackend(options);
}
