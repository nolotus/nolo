/**
 * Vultr 实例执行后端（`kind: "cloud"`）。块 F。
 *
 * 定位与 gcp-cloud-run-jobs / instabox / docker 沙盒后端一致：它是**执行后端**
 * （命令在哪跑），不是「run 落点」，ticket.target 仍沿用 server|machine 词汇。
 *
 * 真机事实（2026-10-18 实测，本文件不重复踩）：
 * - 512MB plan **跑不了 Ubuntu 24.04**：create 被 API 拒绝，要求 ≥1000MB。
 * - create 后实例有 **locked 期**：此时 `DELETE /v2/instances/{id}` 返回
 *   **409 `Server is currently locked`**，必须轮询重试；删干净以 **404** 确认。
 * - 实例状态在 running 之后是 `active`（pending → active），`main_ip` 在
 *   active 之前是 `0.0.0.0`：**有 IP 才算能执行**，不能只看 status。
 * - **关机也按小时计费**：停实例等于白付钱，只能 destroy。
 * - API key 需要在 Vultr 侧放行调用方出口 IP；环境变量 `VULTR` 或
 *   `VULTR_API_KEY`。
 * - 冷启实测 5_035ms（见 EXECUTION_BACKEND_BENCHMARKS 的 vultr-instance 行）。
 *   executionClass 只有 `session`（**不是** oneshot）：Vultr 是 VM 形状，
 *   分钟级生命周期，不适合一次性 run。
 *
 * 四条硬约束：
 * 1. 命令以 **argv 数组**交给注入的 `sshImpl`，本文件不产生任何 shell 命令
 *    字符串（本地的 shell 展开因此不可能发生）。
 * 2. **argv 不变式只覆盖本地**：本后端没有「argv 保真」的远端通道 ——
 *    `ssh <host> -- cmd arg1 arg2` 的远端命令是**由远端 login shell 拼接执行**的
 *    （这是 ssh 协议本身的限制，不是我们偷懒）。所以 lease metadata 里显式记录
 *    `remoteArgvInterpolation: "ssh-remote-login-shell"`，不假装端到端 argv 保真。
 *    想规避远端 shell 的调用方应把整个 argv 编码进单个 token（如 base64），
 *    本层不做这种自动改写。
 * 3. 删除未确认一律抛 `vultr_cleanup_pending`（`cleanupPending: true`），
 *    lease 保持可重试；绝不把「已请求删除」谎报成「已清理」。
 * 4. `exitCode !== 0` 是**有效结果**：返回 `ok:false` 并原样保留 stdout/stderr；
 *    只有传输/协议层失败才抛错。
 *
 * 已知边界（本块刻意不假装）：
 * - **没有文件系统挂载通道**：ticket 的 readableRoots/writableRoots 一个都没
 *   送进 VM。因此 `capabilities.filesystem` / `persistentFilesystem` 都声明
 *   **false**：这两个字段的含义是「能否兑现 ticket 的文件系统权威」，不是
 *   「机器上有没有盘」。实例自带持久磁盘是真的，但本块没有卷/同步通道，
 *   所以 lease metadata 里显式记录 `unmountedRoots`（= 全部 roots），
 *    让路由层 fail closed、让审计看见缺口。
 * - 不声明 `streamingExec`（ssh 回包一次性给全，没有实时流）、无 processSignals
 *   （超时由上界的 `timeoutMs` 表达，见下）、`snapshots`/`gpu` 均为 false。
 * - `request.cwd` / `request.env` / `request.stdin` 在本块**没有落地通道**，
 *   显式拒绝而不是静默丢弃（cwd 要拼 shell 字符串，env 要注入远端进程环境，
 *   stdin 需要长连接）。
 * - 超时是**上界而不是精确截断**：`timeoutMs` 传给注入的 ssh 实现由其强制执行
 *   （默认实现 `createVultrSshImpl` 用 spawnSync 的 timeout + kill，并把
 *   信号/ETIMEDOUT 作为显式信号回传）。`output.timedOut` **只采信这些显式
 *   信号**，不用挂钟差值推断；挂钟超出界另记为 `output.wallOverrun` 观测值，
 *   退出码原样带上，不伪造「已截断」。
 * - 日志卫生：本文件**从不回显命令行**（argv 里可能有凭据/密钥），
 *   detail 只放状态码/退出码，执行结果里只记 `argvTokenCount`。
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

export const VULTR_INSTANCE_BACKEND_ID = "vultr-instance";
export const VULTR_API_BASE_URL = "https://api.vultr.com/v2";
/** 实测可用的最小形状：1 vCPU / 1 GiB（512MB plan 被 Ubuntu 24.04 拒绝）。 */
export const VULTR_DEFAULT_PLAN = "vc2-1c-1gb";
export const VULTR_DEFAULT_REGION = "ewr";
/**
 * Ubuntu 24.04 LTS x64 的 Vultr os_id。**本文件默认值**：传错会被 create 的
 * 400 直接拒绝，不会产生半成品 lease（本块没有用 API 复核该 id 的数值）。
 */
export const VULTR_DEFAULT_OS_ID = 2284;
export const VULTR_DEFAULT_SSH_USER = "root";
export const VULTR_DEFAULT_SSH_PORT = 22;
export const VULTR_DEFAULT_SSH_PATH = "/usr/bin/ssh";

/**
 * 512MB plan 被 API 拒绝时给出的内存下限（真机报错是「要求至少 1000MB」）。
 * 这是**观测值**，不是文档承诺：API 的真实下限仍由 Vultr 决定，本常量只用于
 * 「本地先拦一道，别为了一个必然失败的 create 去付钱」。
 */
export const VULTR_MIN_PLAN_MEMORY_MB = 1000;

export const VULTR_DEFAULT_READY_TIMEOUT_MS = 180_000;
export const VULTR_DEFAULT_READY_POLL_INTERVAL_MS = 2_000;
export const VULTR_DEFAULT_DESTROY_TIMEOUT_MS = 120_000;
export const VULTR_DEFAULT_DESTROY_RETRY_DELAY_MS = 5_000;
export const VULTR_DEFAULT_EXEC_TIMEOUT_MS = 60_000;
export const VULTR_MAX_EXEC_TIMEOUT_MS = 600_000;
export const VULTR_MAX_OUTPUT_CHARS = 64 * 1024;

/**
 * 计费模型常量（**只声明，不在本文件算钱**，由审计层消费）：
 * 所以「按小时」这个 kind 对我们是准确的而不是乐观的。
 */
export const VULTR_INSTANCE_RATE: ExecutionBillingModel = {
  kind: "per-hour",
  rateNanoUsd: "7000000",
};

/**
 * 能力声明。`filesystem`/`persistentFilesystem` 都是 **false** —— 不是
 * 「机器没盘」，而是本块没有把 ticket roots 送进 VM 的通道（见文件头「已知边界」）。
 */
export const VULTR_INSTANCE_CAPABILITIES: ExecutionBackendCapabilities = {
  // session 是它的**真实形态**（VM 会一直活着直到 destroy），但一次性命令在 VM 上
  // 同样成立；云通道固定发 oneshot 票，只声明 session 会让 Vultr 从这条路径上
  // 永远不可用（2026-10-18 真机实测：vultr_invalid_ticket）。
  executionClasses: ["session", "oneshot"],
  streamingExec: false,
  filesystem: false,
  persistentFilesystem: false,
  processSignals: false,
  /** VM 有公网 IP 与全部入站端口（我们不代管防火墙组）。 */
  inboundPorts: true,
  /** 实例有网络；但注意这不等于我们会替调用方执行 egress 策略。 */
  networkPolicy: true,
  snapshots: false,
  gpu: false,
  isolationModes: ["container"],
};

/**
 * **主机侧风险声明**（随每条 lease 的 metadata 一起交付，测试断言它存在，
 * 不是只躺在注释里的说法）。本块走的是「②保持现状 + 如实声明」这一支：
 * 不做 per-lease key 注入、不固定 host key，因此下面三条风险由调用方承担。
 */
export const VULTR_INSTANCE_HOST_SECURITY_DECLARATION = {
  sshUser: VULTR_DEFAULT_SSH_USER,
  sshLogin:
    "root over the instance public IP (no bastion, no per-lease key, no host key pinning)",
  hostKeyVerification:
    "StrictHostKeyChecking=accept-new (TOFU: the first host key presented is trusted without verification)",
  hostKeyPinning: false,
  perLeaseKeyInjection: false,
  hostFirewall:
    "unmanaged: inboundPorts=true is declared and no Vultr firewall group is configured or validated, so services the operator starts are reachable from the public internet",
} as const;

export type VultrInstanceFailureCode =
  | "vultr_invalid_config"
  | "vultr_missing_api_key"
  | "vultr_invalid_ticket"
  | "vultr_unsupported_request"
  | "vultr_plan_too_small"
  | "vultr_lease_not_found"
  | "vultr_lease_mismatch"
  | "vultr_lease_released"
  | "vultr_create_failed"
  | "vultr_ready_timeout"
  | "vultr_exec_failed"
  | "vultr_cleanup_pending";

/** 对外只允许固定安全文案；detail 只放状态码/退出码，绝不带凭据或命令行。 */
const SAFE_MESSAGE: Record<VultrInstanceFailureCode, string> = {
  "vultr_invalid_config":
    "Rejected: vultr instance backend needs a valid region, plan, osId and transport",
  "vultr_missing_api_key":
    "Rejected: vultr instance backend needs an API key (VULTR or VULTR_API_KEY) when no fetchImpl is injected",
  "vultr_invalid_ticket":
    "Rejected: execution ticket cannot be satisfied by the vultr instance backend",
  "vultr_unsupported_request":
    "Request is not supported by the vultr instance backend",
  "vultr_plan_too_small":
    "Vultr rejected the plan: the selected plan is too small for this OS image",
  "vultr_lease_not_found": "Unknown execution lease",
  "vultr_lease_mismatch": "Lease does not match this backend or ticket",
  "vultr_lease_released": "Lease was already released",
  "vultr_create_failed": "Vultr instance create failed",
  "vultr_ready_timeout": "Vultr instance never became ready (no IP / not active)",
  "vultr_exec_failed": "Vultr instance command transport failed",
  "vultr_cleanup_pending": "Vultr instance destroy was not confirmed",
};

export class VultrInstanceBackendError extends Error {
  readonly code: VultrInstanceFailureCode;
  readonly detail?: string;
  readonly cleanupPending: boolean;

  constructor(code: VultrInstanceFailureCode, detail?: string) {
    super(detail ? `${SAFE_MESSAGE[code]} (${detail})` : SAFE_MESSAGE[code]);
    this.name = "VultrInstanceBackendError";
    this.code = code;
    this.detail = detail;
    this.cleanupPending = code === "vultr_cleanup_pending";
  }
}

// ---------------------------------------------------------------------------
// 注入点：HTTP（控制面）与 ssh（数据面）
// ---------------------------------------------------------------------------

/** HTTP 注入点：只给 method/path/body，凭据由实现自己持有（本层看不到 key）。 */
export type VultrApiRequest = {
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: unknown;
};
/** `status: 0` 表示传输层失败（连不上/DNS/超时），不是 HTTP 状态码。 */
export type VultrApiResponse = { status: number; body: unknown };
export type VultrFetchImpl = (request: VultrApiRequest) => Promise<VultrApiResponse>;

/** ssh 注入点：argv 是**数组**，timeoutMs 是要求实现强制执行的上界。 */
export type VultrSshInvocation = { argv: string[]; timeoutMs: number };
/**
 * ssh 结果 + **传输层显式信号**。`code: null` 表示进程没有正常退出
 * （被信号杀死 / 实现侧错误），不要把它读成「退出码 0」。
 *
 * 超时判定只看显式信号（`timedOut` / `signal` / `errorCode`）：只有实现自己
 * 知道它有没有按 `timeoutMs` 把进程 kill 掉。挂钟差值只作为观测值上报
 * （见 `execute` 的 `wallOverrun`），不用来推断超时。
 */
export type VultrSshResult = {
  code: number | null;
  stdout: string;
  stderr: string;
  /** 实现**自报**：因 `timeoutMs` 到点而 kill 了远端进程。 */
  timedOut?: boolean;
  /** 终止信号（如 "SIGKILL"/"SIGTERM"）；正常退出为 null 或未给。 */
  signal?: string | null;
  /** 传输错误码（如 "ETIMEDOUT"/"ENOENT"）；无错误为 null 或未给。 */
  errorCode?: string | null;
};
export type VultrSshImpl = (invocation: VultrSshInvocation) => Promise<VultrSshResult>;

/**
 * 超时判定（纯函数，可单测）：只采信传输层显式信号 —— 实现自报 `timedOut`、
 * 进程被信号 kill、或实现报 `ETIMEDOUT`。**不用挂钟差值**：恰好卡在界上返回的
 * 成功结果不该被算成超时（旧版 `wallMs > timeoutMs` 的误判），而被 kill 的
 * 必须算超时（旧版可能漏判）。
 *
 * 「被 kill 即为超时」是有意的：本后端没有取消通道，能 kill 这个 ssh 进程的
 * 只有 `timeoutMs` 的执行者。将来若加入主动取消，必须在这里补一个显式标志。
 */
export function isTransportTimeout(run: VultrSshResult): boolean {
  if (run.timedOut === true) return true;
  if (typeof run.signal === "string" && run.signal.length > 0) return true;
  return run.errorCode === "ETIMEDOUT";
}

/**
 * 默认 HTTP 实现：真实 `fetch` + Bearer 头。**测试永远注入替身**，本函数在
 * 单测里不会被调用（它是给运行期接线用的，不改变注入契约）。
 */
export function createVultrFetchImpl(
  apiKey: string,
  baseUrl: string = VULTR_API_BASE_URL,
): VultrFetchImpl {
  return async (request) => {
    const init: RequestInit = {
      method: request.method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...(request.body === undefined
        ? {}
        : { body: JSON.stringify(request.body) }),
    };
    try {
      const response = await fetch(`${baseUrl}${request.path}`, init);
      let body: unknown = null;
      const text = await response.text();
      if (text.length > 0) {
        try {
          body = JSON.parse(text);
        } catch {
          // 非 JSON 错误页不解析；调用方只看 status。
          body = null;
        }
      }
      return { status: response.status, body };
    } catch {
      return { status: 0, body: null };
    }
  };
}

/**
 * 默认 ssh 实现：`spawnSync` 数组传参（不经过本地 shell），由**实现自己**执行
 * 超时并把它作为显式信号回传 —— spawnSync 超时会 kill 子进程并把
 * `error.code` 置为 `ETIMEDOUT`、`signal` 置为 killSignal，两者都如实带上；
 * 被 kill 时没有退出码，`code` 就是 `null`，不伪造 0。
 *
 * **测试永远注入替身**，本函数在单测里不会被调用（它是给运行期接线用的，
 * 不改变注入契约）。
 */
export function createVultrSshImpl(): VultrSshImpl {
  return async ({ argv, timeoutMs }) => {
    if (argv.length === 0) {
      throw new Error("vultr ssh: empty argv");
    }
    const { spawnSync } = await import("node:child_process");
    const child = spawnSync(argv[0], argv.slice(1), {
      timeout: timeoutMs,
      killSignal: "SIGKILL",
      encoding: "utf8",
      maxBuffer: VULTR_MAX_OUTPUT_CHARS * 4,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const failure = child.error as { code?: unknown } | undefined;
    const errorCode = typeof failure?.code === "string" ? failure.code : null;
    const signal = typeof child.signal === "string" ? child.signal : null;
    // 只有超时路径会给 ETIMEDOUT；其余错误（ENOENT 等）如实带上，但不算超时。
    const timedOut = errorCode === "ETIMEDOUT";
    return {
      code: typeof child.status === "number" ? child.status : null,
      stdout: typeof child.stdout === "string" ? child.stdout : "",
      stderr: typeof child.stderr === "string" ? child.stderr : "",
      timedOut,
      signal,
      errorCode,
    };
  };
}

export type VultrInstanceBackendOptions = {
  /** 注入 HTTP 替身时无需 apiKey；不注入则必须给 key，否则 fail closed。 */
  fetchImpl?: VultrFetchImpl;
  /** 数据面注入点：**必须显式给**，本层不隐式发起真实 ssh。 */
  sshImpl: VultrSshImpl;
  apiKey?: string;
  env?: Record<string, string | undefined>;
  baseUrl?: string;
  region?: string;
  plan?: string;
  osId?: number;
  /**
   * 该 plan 的内存（MiB）。给了就在 create **之前**按 VULTR_MIN_PLAN_MEMORY_MB
   * 拦一道（512MB plan 会在 API 侧被拒，本地先拦省一次必然失败的调用）。
   * 不给就不做本地判断，交给 API 的真实报错分类。
   */
  planMemoryMb?: number;
  minimumPlanMemoryMb?: number;
  sshKeyIds?: string[];
  /**
   * **外部前提声明**（谁说的、说的是什么），由接线方注入，不由后端自证：
   * Vultr 侧必须放行调用方出口 IP —— 本后端既不校验也校验不了。未注入即
   * `null`，绝不会被写成一个好看的 `true`（旧字段 `apiKeyAllowlistedAtCaller`
   * 就是那种自证，已删）。只作声明文本，**不要放凭据**。
   */
  apiKeyAllowlistAssumption?: string;
  labelPrefix?: string;
  sshPath?: string;
  sshUser?: string;
  sshPort?: number;
  readyTimeoutMs?: number;
  readyPollIntervalMs?: number;
  destroyTimeoutMs?: number;
  destroyRetryDelayMs?: number;
  defaultExecTimeoutMs?: number;
  maxExecTimeoutMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

type LeaseEntry = {
  instanceId: string;
  label: string;
  mainIp: string;
  ticketId: string;
  grantId: string;
  executionClass: ExecutionTicket["executionClass"];
  /** ticket 的运行预算（秒）；execute 的超时上界会再被它压一次。 */
  maxRunSeconds?: number;
  requestedAt: number;
  readyAt: number;
  executionSeq: number;
  releasedAt: number | null;
  releaseReason: ExecutionReleaseReason | null;
};

// ---------------------------------------------------------------------------
// 标识符 / 参数编码（纯函数，可单测）
// ---------------------------------------------------------------------------

/**
 * ticketId 白名单：只允许字母数字和 `_ . : -`，且必须以字母数字开头。
 * 其它字符（空格、`;`、`$`、`&`、`|`、换行……）直接拒绝 —— 白名单是
 * 「不把可疑输入写进任何 API 参数/命令行」的第一道闸。
 */
const TICKET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
/** Vultr label/hostname：小写字母数字与 `-`，字母数字开头结尾，≤63。 */
const LABEL_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const REGION_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}$/;
const PLAN_PATTERN = /^[a-z0-9][a-z0-9-]{1,40}$/;
const BASE_URL_PATTERN = /^https:\/\/[A-Za-z0-9.-]{1,200}(?::\d{2,5})?(?:\/[A-Za-z0-9._/-]{0,200})?$/;
const PATH_PATTERN = /^[A-Za-z0-9._/:-]{1,512}$/;
const IPV4_PATTERN = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;

/** 32-bit FNV-1a，让「规范化后被压平的 ticketId」仍有唯一后缀。 */
function fnv1aHex(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index) & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

/**
 * ticketId → Vultr label/hostname：`nolo-<slug>-<hash8>`。
 * 非法字符**拒绝**（不静默吞掉），再把非 `[a-z0-9]` 压成 `-`，最后加 8 位哈希
 * 保证 `a.b` 与 `a-b` 不撞名。
 */
export function buildVultrInstanceLabel(
  ticketId: string,
  prefix: string = "nolo",
): string {
  if (typeof ticketId !== "string" || !TICKET_ID_PATTERN.test(ticketId)) {
    throw new VultrInstanceBackendError(
      "vultr_invalid_ticket",
      "ticketId must match [A-Za-z0-9][A-Za-z0-9_.:-]{0,63}",
    );
  }
  if (typeof prefix !== "string" || !/^[a-z]{1,8}$/.test(prefix)) {
    throw new VultrInstanceBackendError(
      "vultr_invalid_config",
      "labelPrefix must be lowercase letters",
    );
  }
  const slug = ticketId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const label = `${prefix}-${slug.length > 0 ? slug : "vm"}-${fnv1aHex(ticketId)}`;
  if (!LABEL_PATTERN.test(label)) {
    throw new VultrInstanceBackendError(
      "vultr_invalid_config",
      "derived label is not a safe identifier",
    );
  }
  return label;
}

function assertPattern(value: string, pattern: RegExp, label: string): string {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new VultrInstanceBackendError(
      "vultr_invalid_config",
      `${label} is not a safe identifier`,
    );
  }
  return value;
}

/**
 * 本地内存下限检查。`planMemoryMb` 未声明时不猜测（返回 false，交给 API 报错
 * 分类）；声明了且低于下限 → 直接拒绝，**不产生任何 API 调用**。
 */
export function assertPlanMeetsMemoryFloor(args: {
  plan: string;
  planMemoryMb?: number;
  minimumPlanMemoryMb?: number;
}): void {
  const floor = args.minimumPlanMemoryMb ?? VULTR_MIN_PLAN_MEMORY_MB;
  if (args.planMemoryMb === undefined) return;
  if (
    !Number.isInteger(args.planMemoryMb) ||
    !Number.isInteger(floor) ||
    floor <= 0
  ) {
    throw new VultrInstanceBackendError(
      "vultr_invalid_config",
      "planMemoryMb/minimumPlanMemoryMb must be positive integers",
    );
  }
  if (args.planMemoryMb < floor) {
    throw new VultrInstanceBackendError(
      "vultr_plan_too_small",
      `plan ${args.plan} has ${args.planMemoryMb}MB, needs >= ${floor}MB`,
    );
  }
}

/** 用户机器上看到的两种内存下限写法（真机报错长这样）。 */
const MEMORY_FLOOR_PATTERNS = [
  /at least\s+(\d+)\s*MB/i,
  /minimum of\s+(\d+)\s*MB/i,
  /requires?\s+(\d+)\s*MB/i,
  /(\d+)\s*MB\s+of memory/i,
];

/**
 * 从 API 的 4xx 响应体里识别「plan 太小」这一类拒绝，返回 API 要求的内存下限
 * （MiB）。识别不出返回 null（调用方按通用 create 失败处理，不猜）。
 */
export function detectPlanMemoryFloorRejection(
  status: number,
  body: unknown,
): number | null {
  if (status < 400 || status >= 500) return null;
  const text =
    typeof body === "string"
      ? body
      : body === null || body === undefined
        ? ""
        : safeJson(body);
  if (text.length === 0) return null;
  // 只在真的提到内存/plan 不可用的措辞上落地，避免把别的 400 误分类。
  if (!/memory|plan/i.test(text)) return null;
  for (const pattern of MEMORY_FLOOR_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      const value = Number.parseInt(match[1], 10);
      if (Number.isInteger(value) && value > 0) return value;
    }
  }
  return null;
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
}

/** 实例「真的能执行」的判据：status 为 active/running **且**有非 0.0.0.0 的 IP。 */
export function isInstanceReady(instance: {
  status?: unknown;
  mainIp?: unknown;
}): boolean {
  const status = typeof instance.status === "string" ? instance.status : "";
  const ip = typeof instance.mainIp === "string" ? instance.mainIp : "";
  if (status !== "active" && status !== "running") return false;
  return isValidIpv4(ip) && ip !== "0.0.0.0";
}

export function isValidIpv4(value: string): boolean {
  const match = IPV4_PATTERN.exec(value);
  if (!match) return false;
  for (let index = 1; index <= 4; index += 1) {
    const part = Number.parseInt(match[index], 10);
    if (!Number.isInteger(part) || part < 0 || part > 255) return false;
  }
  return true;
}

/**
 * SSH argv 组装：`ssh <options> user@host -- <argv...>`。
 * 选项**必须**在 destination 之前（ssh 语法），`--` 之后是远端命令与参数。
 *
 * 诚实提醒：远端那一侧由 ssh 交给 login shell 拼接执行（见文件头约束 2），
 * 所以严格控制字符（NUL/换行）而不是假装远端无 shell。
 */
export function buildVultrSshArgv(args: {
  sshPath: string;
  user: string;
  host: string;
  port: number;
  argv: readonly string[];
  connectTimeoutMs: number;
}): string[] {
  if (!Array.isArray(args.argv) || args.argv.length === 0) {
    throw new VultrInstanceBackendError(
      "vultr_unsupported_request",
      "argv must be a non-empty array",
    );
  }
  for (const token of args.argv) {
    if (typeof token !== "string") {
      throw new VultrInstanceBackendError(
        "vultr_unsupported_request",
        "argv tokens must be strings",
      );
    }
    if (token.includes("\0") || token.includes("\n") || token.includes("\r")) {
      throw new VultrInstanceBackendError(
        "vultr_unsupported_request",
        "argv token contains NUL or newline",
      );
    }
  }
  const connectSeconds = Math.max(1, Math.ceil(args.connectTimeoutMs / 1000));
  return [
    args.sshPath,
    "-o",
    "BatchMode=yes",
    "-o",
    "StrictHostKeyChecking=accept-new",
    "-o",
    `ConnectTimeout=${connectSeconds}`,
    "-p",
    String(args.port),
    `${args.user}@${args.host}`,
    "--",
    ...args.argv,
  ];
}

/**
 * 超时上界解析。三条来源取最小值：调用方请求、ticket.maxRunSeconds（session 的
 * 预算），以及后端的运维上限。**永远有上界**：不给请求就用默认值。
 */
export function resolveExecTimeoutMs(args: {
  requestedMs?: number;
  maxRunSeconds?: number;
  defaultTimeoutMs: number;
  maxTimeoutMs: number;
}): { timeoutMs: number; clamped: boolean } {
  if (args.requestedMs !== undefined) {
    if (!Number.isInteger(args.requestedMs) || args.requestedMs <= 0) {
      throw new VultrInstanceBackendError(
        "vultr_unsupported_request",
        "timeoutMs must be a positive integer",
      );
    }
  }
  const ticketCeiling =
    args.maxRunSeconds === undefined
      ? Number.POSITIVE_INFINITY
      : Math.floor(args.maxRunSeconds * 1000);
  const ceiling = Math.min(args.maxTimeoutMs, ticketCeiling);
  const base = args.requestedMs ?? Math.min(args.defaultTimeoutMs, ceiling);
  const timeoutMs = Math.max(1, Math.min(base, ceiling));
  return {
    timeoutMs,
    clamped: args.requestedMs !== undefined && timeoutMs !== args.requestedMs,
  };
}

function truncateOutput(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n…[truncated ${value.length - maxChars} chars]`;
}

function readInstance(body: unknown): {
  id: string;
  status: string;
  mainIp: string;
} | null {
  if (typeof body !== "object" || body === null) return null;
  const instance = (body as { instance?: unknown }).instance;
  if (typeof instance !== "object" || instance === null) return null;
  const record = instance as Record<string, unknown>;
  const id =
    typeof record.id === "string"
      ? record.id
      : typeof record.id === "number"
        ? String(record.id)
        : "";
  if (id.length === 0) return null;
  return {
    id,
    status: typeof record.status === "string" ? record.status : "",
    mainIp: typeof record.main_ip === "string" ? record.main_ip : "",
  };
}

// ---------------------------------------------------------------------------
// Backend
// ---------------------------------------------------------------------------

export class VultrInstanceBackend implements ExecutionBackend {
  readonly #fetch: VultrFetchImpl;
  readonly #ssh: VultrSshImpl;
  readonly #region: string;
  readonly #plan: string;
  readonly #osId: number;
  readonly #planMemoryMb: number | undefined;
  readonly #minimumPlanMemoryMb: number;
  readonly #sshKeyIds: string[];
  readonly #apiKeyAllowlistAssumption: string | null;
  readonly #labelPrefix: string;
  readonly #sshPath: string;
  readonly #sshUser: string;
  readonly #sshPort: number;
  readonly #readyTimeoutMs: number;
  readonly #readyPollIntervalMs: number;
  readonly #destroyTimeoutMs: number;
  readonly #destroyRetryDelayMs: number;
  readonly #defaultExecTimeoutMs: number;
  readonly #maxExecTimeoutMs: number;
  readonly #now: () => number;
  readonly #sleep: (ms: number) => Promise<void>;
  readonly #leases = new Map<string, LeaseEntry>();

  constructor(options: VultrInstanceBackendOptions) {
    if (typeof options?.sshImpl !== "function") {
      throw new VultrInstanceBackendError(
        "vultr_invalid_config",
        "sshImpl is required (no implicit real ssh invocation)",
      );
    }
    this.#ssh = options.sshImpl;

    if (options.fetchImpl !== undefined) {
      if (typeof options.fetchImpl !== "function") {
        throw new VultrInstanceBackendError(
          "vultr_invalid_config",
          "fetchImpl must be a function when provided",
        );
      }
      this.#fetch = options.fetchImpl;
    } else {
      // 显式给了 apiKey（哪怕是空串）就不再回落到环境变量：让「缺 key」可测、
      // 也让多租户接线者能明确表达「这个后端没有凭据」。
      const explicit = options.apiKey !== undefined;
      const fromEnv = options.env ?? process.env;
      const apiKey = explicit
        ? (options.apiKey as string)
        : ((fromEnv.VULTR_API_KEY ?? fromEnv.VULTR) as string | undefined);
      if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
        throw new VultrInstanceBackendError(
          "vultr_missing_api_key",
          "set VULTR or VULTR_API_KEY, or inject fetchImpl",
        );
      }
      const baseUrl = assertPattern(
        options.baseUrl ?? VULTR_API_BASE_URL,
        BASE_URL_PATTERN,
        "baseUrl",
      );
      this.#fetch = createVultrFetchImpl(apiKey.trim(), baseUrl);
    }

    this.#region = assertPattern(
      options.region ?? VULTR_DEFAULT_REGION,
      REGION_PATTERN,
      "region",
    );
    this.#plan = assertPattern(
      options.plan ?? VULTR_DEFAULT_PLAN,
      PLAN_PATTERN,
      "plan",
    );
    const osId = options.osId ?? VULTR_DEFAULT_OS_ID;
    if (!Number.isInteger(osId) || osId <= 0) {
      throw new VultrInstanceBackendError(
        "vultr_invalid_config",
        "osId must be a positive integer",
      );
    }
    this.#osId = osId;

    if (options.planMemoryMb !== undefined) {
      if (!Number.isInteger(options.planMemoryMb) || options.planMemoryMb <= 0) {
        throw new VultrInstanceBackendError(
          "vultr_invalid_config",
          "planMemoryMb must be a positive integer",
        );
      }
    }
    this.#planMemoryMb = options.planMemoryMb;
    const floor = options.minimumPlanMemoryMb ?? VULTR_MIN_PLAN_MEMORY_MB;
    if (!Number.isInteger(floor) || floor <= 0) {
      throw new VultrInstanceBackendError(
        "vultr_invalid_config",
        "minimumPlanMemoryMb must be a positive integer",
      );
    }
    this.#minimumPlanMemoryMb = floor;
    // 形状本身在构造期就不合法 → 直接拒绝（构造失败不会产生任何计费资源）。
    assertPlanMeetsMemoryFloor({
      plan: this.#plan,
      planMemoryMb: this.#planMemoryMb,
      minimumPlanMemoryMb: this.#minimumPlanMemoryMb,
    });

    this.#sshKeyIds = [...(options.sshKeyIds ?? [])];
    for (const keyId of this.#sshKeyIds) {
      assertPattern(keyId, PATH_PATTERN, "sshKeyIds[]");
    }
    const allowlistAssumption = options.apiKeyAllowlistAssumption;
    if (allowlistAssumption !== undefined) {
      if (
        typeof allowlistAssumption !== "string" ||
        allowlistAssumption.length === 0 ||
        allowlistAssumption.length > 200 ||
        /[\u0000-\u001f\u007f]/.test(allowlistAssumption)
      ) {
        throw new VultrInstanceBackendError(
          "vultr_invalid_config",
          "apiKeyAllowlistAssumption must be 1..200 chars without control characters",
        );
      }
    }
    this.#apiKeyAllowlistAssumption = allowlistAssumption ?? null;
    this.#labelPrefix = assertPattern(
      options.labelPrefix ?? "nolo",
      /^[a-z]{1,8}$/,
      "labelPrefix",
    );
    this.#sshPath = assertPattern(
      options.sshPath ?? VULTR_DEFAULT_SSH_PATH,
      /^[A-Za-z0-9._/:-]{1,512}$/,
      "sshPath",
    );
    this.#sshUser = assertPattern(
      options.sshUser ?? VULTR_DEFAULT_SSH_USER,
      /^[a-z_][a-z0-9_-]{0,31}$/,
      "sshUser",
    );
    const sshPort = options.sshPort ?? VULTR_DEFAULT_SSH_PORT;
    if (!Number.isInteger(sshPort) || sshPort < 1 || sshPort > 65535) {
      throw new VultrInstanceBackendError(
        "vultr_invalid_config",
        "sshPort must be an integer in [1,65535]",
      );
    }
    this.#sshPort = sshPort;

    this.#readyTimeoutMs = assertDuration(
      options.readyTimeoutMs ?? VULTR_DEFAULT_READY_TIMEOUT_MS,
      "readyTimeoutMs",
      600_000,
    );
    this.#readyPollIntervalMs = assertDuration(
      options.readyPollIntervalMs ?? VULTR_DEFAULT_READY_POLL_INTERVAL_MS,
      "readyPollIntervalMs",
      60_000,
    );
    this.#destroyTimeoutMs = assertDuration(
      options.destroyTimeoutMs ?? VULTR_DEFAULT_DESTROY_TIMEOUT_MS,
      "destroyTimeoutMs",
      1_800_000,
    );
    this.#destroyRetryDelayMs = assertDuration(
      options.destroyRetryDelayMs ?? VULTR_DEFAULT_DESTROY_RETRY_DELAY_MS,
      "destroyRetryDelayMs",
      300_000,
    );
    this.#defaultExecTimeoutMs = assertDuration(
      options.defaultExecTimeoutMs ?? VULTR_DEFAULT_EXEC_TIMEOUT_MS,
      "defaultExecTimeoutMs",
      VULTR_MAX_EXEC_TIMEOUT_MS,
    );
    this.#maxExecTimeoutMs = assertDuration(
      options.maxExecTimeoutMs ?? VULTR_MAX_EXEC_TIMEOUT_MS,
      "maxExecTimeoutMs",
      VULTR_MAX_EXEC_TIMEOUT_MS,
    );
    if (this.#defaultExecTimeoutMs > this.#maxExecTimeoutMs) {
      throw new VultrInstanceBackendError(
        "vultr_invalid_config",
        "defaultExecTimeoutMs must not exceed maxExecTimeoutMs",
      );
    }
    this.#now = options.now ?? Date.now;
    this.#sleep =
      options.sleep ??
      ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  }

  describe(): ExecutionBackendDescriptor {
    return {
      id: VULTR_INSTANCE_BACKEND_ID,
      kind: "cloud",
      capabilities: { ...VULTR_INSTANCE_CAPABILITIES },
    };
  }

  /**
   * create instance → 轮询到 active 且有 IP → 记 readyAt。
   * create 失败**不产生 lease**（抛错即没有 lease，调用方不会拿到可执行的句柄）。
   * 轮询超时也**不留悬空实例**：尽力 destroy，删掉了报 ready_timeout，
   * 删不掉报 cleanup_pending（把「还在计费」这件事说出来）。
   */
  async prepare(ticket: ExecutionTicket): Promise<ExecutionLease> {
    if (ticket.version !== 1 || !ticket.ticketId || !ticket.grantId) {
      throw new VultrInstanceBackendError("vultr_invalid_ticket");
    }
    // VM 形状：session 是真实形态，oneshot（跑完即 destroy）同样成立。判定统一走
    // 能力表，避免"声明支持但 prepare 里另有硬编码"这类两处真值。
    if (!VULTR_INSTANCE_CAPABILITIES.executionClasses.includes(ticket.executionClass)) {
      throw new VultrInstanceBackendError(
        "vultr_invalid_ticket",
        `executionClass ${ticket.executionClass} is not in [${VULTR_INSTANCE_CAPABILITIES.executionClasses.join(", ")}]`,
      );
    }
    const label = buildVultrInstanceLabel(ticket.ticketId, this.#labelPrefix);
    assertPlanMeetsMemoryFloor({
      plan: this.#plan,
      planMemoryMb: this.#planMemoryMb,
      minimumPlanMemoryMb: this.#minimumPlanMemoryMb,
    });

    const requestedAt = this.#now();
    const createBody: Record<string, unknown> = {
      region: this.#region,
      plan: this.#plan,
      os_id: this.#osId,
      label,
      hostname: label,
    };
    if (this.#sshKeyIds.length > 0) createBody.sshkey_id = [...this.#sshKeyIds];

    const created = await this.#call("POST", "/instances", createBody);
    if (created.status === 0) {
      throw new VultrInstanceBackendError(
        "vultr_create_failed",
        "create transport error",
      );
    }
    if (created.status >= 400 || created.status === 0) {
      const requiredMb = detectPlanMemoryFloorRejection(
        created.status,
        created.body,
      );
      if (requiredMb !== null) {
        throw new VultrInstanceBackendError(
          "vultr_plan_too_small",
          `api requires >= ${requiredMb}MB (plan ${this.#plan})`,
        );
      }
      throw new VultrInstanceBackendError(
        "vultr_create_failed",
        `create returned ${created.status}`,
      );
    }
    const createdInstance = readInstance(created.body);
    if (!createdInstance) {
      // 2xx 但读不出实例：我们拿不到 id 就没法删它，这是最坏的情况，必须明说。
      throw new VultrInstanceBackendError(
        "vultr_create_failed",
        `create returned ${created.status} without an instance id (orchestration artifact may exist)`,
      );
    }

    const instanceId = createdInstance.id;
    let polls = 0;
    let ready: { mainIp: string; status: string } | null = null;
    let lastStatus = createdInstance.status;
    while (this.#now() - requestedAt < this.#readyTimeoutMs) {
      const probed = await this.#call("GET", `/instances/${instanceId}`);
      polls += 1;
      if (probed.status === 0) {
        lastStatus = "transport-error";
      } else if (probed.status >= 400) {
        lastStatus = `http-${probed.status}`;
        if (probed.status === 404) break; // 实例消失了，等下去没有意义
      } else {
        const instance = readInstance(probed.body);
        if (instance) {
          lastStatus = instance.status;
          if (isInstanceReady(instance)) {
            ready = { mainIp: instance.mainIp, status: instance.status };
            break;
          }
        } else {
          lastStatus = "unreadable-body";
        }
      }
      await this.#sleep(this.#readyPollIntervalMs);
    }

    if (!ready) {
      const confirmed = await this.#destroyInstance(instanceId);
      if (!confirmed) {
        throw new VultrInstanceBackendError(
          "vultr_cleanup_pending",
          `ready timeout and destroy unconfirmed for instance (status ${lastStatus})`,
        );
      }
      throw new VultrInstanceBackendError(
        "vultr_ready_timeout",
        `instance never became active with an IP (last status ${lastStatus}, ${polls} polls)`,
      );
    }

    const readyAt = this.#now();
    const leaseId = `${instanceId}:${ticket.ticketId}`;
    this.#leases.set(leaseId, {
      instanceId,
      label,
      mainIp: ready.mainIp,
      ticketId: ticket.ticketId,
      grantId: ticket.grantId,
      executionClass: ticket.executionClass,
      ...(ticket.maxRunSeconds === undefined
        ? {}
        : { maxRunSeconds: ticket.maxRunSeconds }),
      requestedAt,
      readyAt,
      executionSeq: 0,
      releasedAt: null,
      releaseReason: null,
    });

    // 本块没有挂载通道：ticket 要的根目录一个都没送进 VM，写进 metadata
    // 让审计看见缺口，而不是假装文件系统能力已经落地。
    const unmountedRoots = [
      ...new Set([
        ...ticket.filesystem.readableRoots,
        ...ticket.filesystem.writableRoots,
      ]),
    ];

    return {
      leaseId,
      backendId: VULTR_INSTANCE_BACKEND_ID,
      ticketId: ticket.ticketId,
      grantId: ticket.grantId,
      createdAt: readyAt,
      readableRoots: [],
      writableRoots: [],
      metadata: {
        instanceId,
        label,
        region: this.#region,
        plan: this.#plan,
        planMemoryMb: this.#planMemoryMb ?? null,
        osId: this.#osId,
        mainIp: ready.mainIp,
        requestedAt,
        readyAt,
        coldBootMs: readyAt - requestedAt,
        readyPolls: polls,
        mountedRoots: [],
        unmountedRoots,
        filesystemMountChannel: "none",
        ssh: {
          user: this.#sshUser,
          port: this.#sshPort,
          host: ready.mainIp,
          // TOFU 如实写进 metadata（不是只写在注释里）：首个 host key 无验证接受。
          hostKeyVerification: "accept-new",
          hostKeyPinned: false,
        },
        // 主机侧风险声明（root + TOFU + 不代管主机防火墙）随每条 lease 交付。
        hostSecurity: VULTR_INSTANCE_HOST_SECURITY_DECLARATION,
        remoteArgvInterpolation: "ssh-remote-login-shell",
        billing:
          "instance bills hourly until destroy; stopping still bills",
        // 旧字段 apiKeyAllowlistedAtCaller: true 是**自证**（本后端没校验任何
        // allowlist），已删除；这里只记录「这是外部前提 + 谁声明的」。
        apiKeyAllowlist: {
          verifiedByBackend: false,
          externalAssumption: this.#apiKeyAllowlistAssumption,
        },
      },
    };
  }

  /**
   * 一条命令一次 ssh 调用：argv 数组穿过注入点，超时上界永远存在。
   * 非零退出是有效结果（ok:false + stdout/stderr 一个都不丢）。
   */
  async execute(
    lease: ExecutionLease,
    request: ExecutionRequest,
    onEvent?: (event: ExecutionEvent) => void,
  ): Promise<ExecutionResult> {
    const entry = this.#requireEntry(lease);
    if (entry.releasedAt !== null) {
      throw new VultrInstanceBackendError("vultr_lease_released");
    }
    if (request.kind !== "command") {
      throw new VultrInstanceBackendError(
        "vultr_unsupported_request",
        `request kind ${request.kind} is not supported`,
      );
    }
    // 这三项在本后端都没有落地通道，显式拒绝而不是静默丢弃。
    if (request.cwd !== undefined) {
      throw new VultrInstanceBackendError(
        "vultr_unsupported_request",
        "cwd is not implemented (would require building a remote shell string)",
      );
    }
    if (request.env !== undefined) {
      throw new VultrInstanceBackendError(
        "vultr_unsupported_request",
        "env injection is not implemented",
      );
    }
    if (request.stdin !== undefined) {
      throw new VultrInstanceBackendError(
        "vultr_unsupported_request",
        "stdin is not implemented (no persistent channel)",
      );
    }

    const { timeoutMs, clamped } = resolveExecTimeoutMs({
      requestedMs: request.timeoutMs,
      maxRunSeconds: entry.maxRunSeconds,
      defaultTimeoutMs: this.#defaultExecTimeoutMs,
      maxTimeoutMs: this.#maxExecTimeoutMs,
    });

    entry.executionSeq += 1;
    const executionId = `${entry.instanceId}:${entry.ticketId}:${entry.executionSeq}`;
    const startedAt = this.#now();
    onEvent?.({ type: "started", executionId, at: startedAt });

    const argv = buildVultrSshArgv({
      sshPath: this.#sshPath,
      user: this.#sshUser,
      host: entry.mainIp,
      port: this.#sshPort,
      argv: request.argv,
      connectTimeoutMs: Math.min(timeoutMs, 30_000),
    });

    let run: VultrSshResult;
    try {
      run = await this.#ssh({ argv, timeoutMs });
    } catch (error) {
      throw new VultrInstanceBackendError(
        "vultr_exec_failed",
        `ssh transport error: ${error instanceof Error ? error.message : "unknown"}`,
      );
    }

    const finishedAt = this.#now();
    const wallMs = finishedAt - startedAt;
    const code = typeof run.code === "number" ? run.code : null;
    // 超时只采信**传输层显式信号**（实现自报 timedOut / 进程被 kill /
    // ETIMEDOUT）。挂钟超出界另记为观测值 wallOverrun，不用来推断超时：
    // 卡在界上按时返回的成功结果不是超时，被 kill 的才是。
    const timedOut = isTransportTimeout(run);
    const wallOverrun = wallMs > timeoutMs;
    const ok = code === 0 && !timedOut;

    onEvent?.({
      type: "usage",
      executionId,
      usage: { wallMs },
    });
    onEvent?.({
      type: "exited",
      executionId,
      exitCode: code,
      ...(timedOut ? { signal: "timeout" } : {}),
    });

    return {
      executionId,
      ok,
      exitCode: code,
      output: {
        exitCode: code,
        exitCodeSource: "ssh",
        stdout: truncateOutput(run.stdout ?? "", VULTR_MAX_OUTPUT_CHARS),
        stderr: truncateOutput(run.stderr ?? "", VULTR_MAX_OUTPUT_CHARS),
        wallMs,
        timedOut,
        /** 观测值：挂钟超出 timeoutMs。**不是**超时判定（判定见 timedOut）。 */
        wallOverrun,
        transportSignal: run.signal ?? null,
        transportErrorCode: run.errorCode ?? null,
        timeoutMs,
        timeoutClamped: clamped,
        // 不回显命令行（可能带凭据）：只记 token 数。
        argvTokenCount: request.argv.length,
        instanceId: entry.instanceId,
        mainIp: entry.mainIp,
      },
    };
  }

  /**
   * destroy + 轮询确认。409 `Server is currently locked` 是**预期**的中途状态，
   * 必须重试；删干净以 404 确认。确认不到就抛 `vultr_cleanup_pending`
   * （lease 保留可重试），绝不谎报 released。
   */
  async release(
    lease: ExecutionLease,
    reason: ExecutionReleaseReason,
  ): Promise<void> {
    const entry = this.#requireEntry(lease);
    if (entry.releasedAt !== null) return; // 幂等：重复 release 不重复打 API
    const confirmed = await this.#destroyInstance(entry.instanceId);
    if (!confirmed) {
      throw new VultrInstanceBackendError(
        "vultr_cleanup_pending",
        `destroy not confirmed for instance ${entry.instanceId}`,
      );
    }
    entry.releasedAt = this.#now();
    entry.releaseReason = reason;
  }

  /**
   * DELETE 直到被接受（409/5xx/传输失败都重试），然后 GET 直到 **404** 才算确认。
   * 200（哪怕 body 读不出实例）一律不算：返回 true 只代表「已确认不存在」，
   * 任何一步没确认都返回 false。
   */
  async #destroyInstance(instanceId: string): Promise<boolean> {
    const deadline = this.#now() + this.#destroyTimeoutMs;
    let deleteAccepted = false;
    while (this.#now() < deadline) {
      if (!deleteAccepted) {
        const deleted = await this.#call("DELETE", `/instances/${instanceId}`);
        if (
          deleted.status === 204 ||
          deleted.status === 200 ||
          deleted.status === 404
        ) {
          deleteAccepted = true;
        }
        // 409（locked）/5xx/传输失败 → 落到下面的 sleep 再试。
      }
      if (deleteAccepted) {
        const probe = await this.#call("GET", `/instances/${instanceId}`);
        // **只认 404**。200 但 body 读不出实例（空 body / 非 JSON / 字段缺失）
        // 不是「已删除」，只是「我们读不懂」；把它当确认会让 cleanup_pending
        // 被假成功吞掉，也与本节注释自相矛盾。
        if (probe.status === 404) return true;
      }
      await this.#sleep(this.#destroyRetryDelayMs);
    }
    return false;
  }

  /** 传输失败折算成 `status: 0`，让循环里的状态判断保持单一形状。 */
  async #call(
    method: VultrApiRequest["method"],
    path: string,
    body?: unknown,
  ): Promise<VultrApiResponse> {
    try {
      return await this.#fetch(
        body === undefined ? { method, path } : { method, path, body },
      );
    } catch {
      return { status: 0, body: null };
    }
  }

  #requireEntry(lease: ExecutionLease): LeaseEntry {
    if (lease.backendId !== VULTR_INSTANCE_BACKEND_ID) {
      throw new VultrInstanceBackendError(
        "vultr_lease_mismatch",
        `lease belongs to ${lease.backendId}`,
      );
    }
    const entry = this.#leases.get(lease.leaseId);
    if (!entry) {
      throw new VultrInstanceBackendError("vultr_lease_not_found");
    }
    if (entry.ticketId !== lease.ticketId || entry.grantId !== lease.grantId) {
      throw new VultrInstanceBackendError(
        "vultr_lease_mismatch",
        "lease ticket/grant does not match",
      );
    }
    return entry;
  }
}

function assertDuration(value: number, label: string, max: number): number {
  if (!Number.isInteger(value) || value < 1 || value > max) {
    throw new VultrInstanceBackendError(
      "vultr_invalid_config",
      `${label} must be an integer in [1,${max}]`,
    );
  }
  return value;
}

export function createVultrInstanceExecutionBackend(
  options: VultrInstanceBackendOptions,
): ExecutionBackend {
  return new VultrInstanceBackend(options);
}
