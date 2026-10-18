/**
 * Cloudflare Containers 执行后端（`kind: "cloud"`）。块 E。
 *
 * 定位与 gcpCloudRunBackend / dockerSandboxExecutionBackend 同类：它决定
 * 「命令在哪跑」，不是「run 落点」，ticket.target 仍沿用 server|machine 词汇。
 *
 * ── 已核实的事实（本仓库实测，写在这里以免后来者重新踩） ─────────────────
 *
 * 1. 形状与费率：CF Containers 默认实例 = **0.0625 vCPU / 256 MiB**
 *    （CF 的 `dev` 实例档），计费按 vCPU-s + GiB-s，费率 CPU
 *    `executionBackendBenchmarks.ts` 的 `cf-containers` 行
 *    （`vcpuMicro: 62_500` / `gibMicro: 250_000` / `vcpuRateNanoUsd: "20000"` /
 *    `gibRateNanoUsd: "2500"`，与 `providerRateCard.ts` 联动）。本文件只
 *    **镜像**该行（`CF_CONTAINERS_BILLING_MODEL`）并用手测把它钉住：审计层
 *    计费不要从本文件取数，改了 benchmarks 那行就必须同步这里。
 * 2. 时序：冷启 8_413ms / 热 27ms（同上表，specs 与 billing 已由测试焊死）。
 * 3. **建 application 记录 ≠ 可调度实例**：只建 application，或只上传一个没有
 *    Worker/Durable Object 绑定的脚本时，`/instances` 永远 `NOT_ENABLED`、
 *    version 的 `location` 恒为 `mock`、实测 169s 无实例落地、`cf containers ssh`
 *    直接 `INVALID_INSTANCE_ID`。正确路径是 `Container` class + Worker +
 *    deploy。本后端因此**只走 Workers Scripts API**（把 containers /
 *    durable_objects 绑定写进上传元数据），并且**必须等到真实实例应答才算
 *    ready**：prepare 的 readiness 探针一旦探到 `NOT_ENABLED` / `location: mock`
 *    立即 `cf_container_not_schedulable`，绝不把「脚本上传成功」当「容器能跑」。
 * 4. CF 与 sbx 同类：**没有 usage API**，成本只能按 wall clock 本地估算
 *    （审计层 `source: "local-estimate"`），本后端不发明用量数字。
 * 5. Workers Scripts API 是本仓库已用过的通道（`PUT
 *    /accounts/{id}/workers/scripts/{name}`、`/workers/subdomain`），
 *    上传体是 multipart：`metadata` 部件 = wrangler 同形 JSON，模块部件 = 代码。
 *
 * ── 本块的边界（刻意不假装） ─────────────────────────────────────────────
 *
 * - 纯 HTTP 路线**不能**打包：`Container` 基类来自 `@cloudflare/containers`，
 *   必须由构建步骤（wrangler / docker / podman 等）打成单文件模块才能上传，
 *   原始模块里的 npm import 在云端无法解析。故 `containerWorkerModule` 是
 *   **必填配置**，缺它一律 `cf_bridge_module_missing` fail-closed —— 绝不退回
 *   「建个 application 记录假装跑起来」。
 * - 三步（prepare / execute / release）的 HTTP 形态在单测里由注入 fetch 逐步
 *   断言；**尚未对真实 CF 账号跑通端到端**（前置是镜像推送 + 模块打包）。
 *   这是本块交给父方的显式缺口，不当作已完成的能力。
 * - `capabilities.filesystem: true` 指的是「容器里有文件系统」，**不是**把
 *   ticket 的 readableRoots / writableRoots 挂进来：本后端不做卷挂载与同步，
 *   lease metadata 里显式记录 `unmountedRoots`，让审计看得见这个缺口（与 GCP
 *   后端同一约定）。`networkPolicy: true` 同理 = 容器有网络出口，不代表本后端
 *   能施加 egress 策略。
 * - `/exec` **必须带鉴权**：脚本名由 ticketId 确定性派生（`nolo-exec-<slug>`），
 *   URL 可预测，所以 `execHeaders` 是**必填配置**：构造期就校验，缺失一律
 *   `cf_containers_invalid_config` 且零网络调用（不是「默认 {} 再告警」）。
 *   lease metadata 用 `execAuth` 记录「这次 lease 用了哪几个鉴权头名」，头值
 *   永不进日志 / 错误信息 / lease。
 * - wrangler 配置里的 `oauth_token` 是**宽 scopes** 的东西：必须显式 opt-in
 *   （`allowWranglerOAuthToken: true` 或 env
 *   `CLOUDFLARE_ALLOW_WRANGLER_OAUTH_TOKEN=1`）才会被读，且 `expiration_time`
 *   必须存在、可解析、未过期，否则**不采用**并说明原因 —— 不静默借用。
 * - 不兑现 cwd / env / stdin：调用方传了就 `cf_unsupported_request` fail-closed，
 *   不静默丢弃（静默丢弃会让「exitCode: 0」变成假成功）。
 * - argv 永远以**数组**穿过 JSON body，本文件不产生任何 shell 命令行字符串，
 *   也不经过 `sh -c`：argv 里的空格、引号、`$(...)`、`;` 都只是数据。
 */

import { readFile as readFileImplFs } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

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

export const CF_CONTAINERS_BACKEND_ID = "cf-containers";
export const CF_CONTAINERS_DEFAULT_BASE_URL = "https://api.cloudflare.com/client/v4";

/** `~/.config/cloudflare/config/default.json`：wrangler 的 OAuth 凭据落点。 */
export const CF_CONTAINERS_CREDENTIALS_PATH_SEGMENTS = [
  ".config",
  "cloudflare",
  "config",
  "default.json",
] as const;

/**
 * CF 实例档：`dev` = 1/16 vCPU + 256 MiB，即 benchmarks 表里 `specs.vcpu: 0.0625`
 * / `memoryMiB: 256` 那一行对应的形状（费率也据此算）。
 */
export const CF_CONTAINERS_DEFAULT_INSTANCE_TYPE = "dev";

export const CF_CONTAINERS_DEFAULT_EXEC_TIMEOUT_MS = 60_000;
/** 硬上界：request.timeoutMs 只能收紧，不能突破。 */
export const CF_CONTAINERS_HARD_MAX_EXEC_TIMEOUT_MS = 1_800_000;
export const CF_CONTAINERS_DEFAULT_MAX_OUTPUT_CHARS = 32 * 1024;
/**
 * readiness 探针上界。实测冷启 8_413ms，所以 30s 足够真实冷启；
 * 而没有 Worker/DO 绑定时实例**永远不会落地**（实测 169s 无落地），
 * 30s 的界限让这条路快速失败，而不是把 169s 的等待摊给调用方。
 */
export const CF_CONTAINERS_DEFAULT_WARMUP_TIMEOUT_MS = 30_000;

/** 桥接 Worker 契约（`containerWorkerModule` 必须实现这两个路由）。 */
export const CF_CONTAINERS_HEALTH_PATH = "/health";
export const CF_CONTAINERS_EXEC_PATH = "/exec";
/**
 * - `GET /health` → `{ ok: true, instanceId?: string }`；实例未落地时 CF 侧签名
 *   是 `NOT_ENABLED` / `location: "mock"`（本后端据此判定不可调度）。
 * - `POST /exec` ← `{ v: 1, argv: string[], timeoutMs?: number }`
 *                → `{ exitCode: number, stdout: string, stderr: string }`
 *   argv **作为数组**交给容器，容器侧不得再拼 shell 字符串。
 */
export const CF_CONTAINERS_BRIDGE_CONTRACT = {
  health: CF_CONTAINERS_HEALTH_PATH,
  exec: CF_CONTAINERS_EXEC_PATH,
  instanceNotSchedulableSignatures: ["NOT_ENABLED", "INVALID_INSTANCE_ID"],
  mocksLocation: "mock",
} as const;

/** 能力声明，必须与 `executionBackendDiscovery.ts` 的 cf 候选逐字一致（有测试钉住）。 */
export const CF_CONTAINERS_CAPABILITIES: ExecutionBackendCapabilities = {
  executionClasses: ["oneshot"],
  // 一次性回包，没有实时流：本后端不声明该能力，而不是「暂不支持」。
  streamingExec: false,
  // = 容器里有文件系统；ticket 的 roots 并不被挂载（见文件头 + unmountedRoots）。
  filesystem: true,
  persistentFilesystem: false,
  processSignals: false,
  inboundPorts: false,
  networkPolicy: true,
  snapshots: false,
  gpu: false,
  isolationModes: ["container"],
};

/**
 * 镜像 `executionBackendBenchmarks.ts` 的 `cf-containers` 行（形状 + 费率）。
 * 权威在那张表；这里的一份只为让本后端的形状自陈可读，并由单测断言两者相等。
 */
export const CF_CONTAINERS_BILLING_MODEL: ExecutionBillingModel = {
  kind: "vcpu-gib-second",
  // 1/16 vCPU = 62_500 millionths；1/4 GiB = 250_000 millionths。
  vcpuMicro: 62_500,
  gibMicro: 250_000,
  vcpuRateNanoUsd: "20000",
  gibRateNanoUsd: "2500",
};

/** wrangler `oauth_token` 兜底的显式 opt-in 开关（`1`/`true`/`yes` 算打开）。 */
export const CF_CONTAINERS_WRANGLER_OAUTH_OPT_IN_ENV =
  "CLOUDFLARE_ALLOW_WRANGLER_OAUTH_TOKEN";

/** RFC 7230 头名允许的 token 字符；值里出现 CR/LF 一律拒绝（防头注入）。 */
const HEADER_NAME_PATTERN = /^[A-Za-z0-9!#$%&'*+.^_`|~-]+$/;

/**
 * lease 里的鉴权描述：**只记方式与头名**。头值既不进错误信息，也不进 lease，
 * 这样审计能回答「这次 lease 靠什么鉴权」，但日志泄露不了密钥。
 */
export type CfExecAuth = {
  mechanism: "shared-secret-header";
  headerNames: string[];
};

/**
 * `/exec` 鉴权头的唯一入口：规范 + fail-closed 校验，返回**冻结副本**（构造后
 * 调用方再改 options 也影响不到已放行的请求）。缺失 / 空表 / 空值 / 非法头名
 * 一律 `cf_containers_invalid_config`；错误信息只提序号与头名，绝不回显值
 * （调用方可能把 name/value 写反，回显原样字符串就会泄密）。
 */
export function normalizeCfExecHeaders(input: unknown): {
  headers: Readonly<Record<string, string>>;
  auth: CfExecAuth;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new CfContainersBackendError(
      "cf_containers_invalid_config",
      "execHeaders is required: an unauthenticated /exec endpoint is not allowed",
    );
  }
  const headers: Record<string, string> = {};
  for (const [index, [rawName, rawValue]] of Object.entries(
    input as Record<string, unknown>,
  ).entries()) {
    const name = String(rawName).trim();
    if (!HEADER_NAME_PATTERN.test(name)) {
      throw new CfContainersBackendError(
        "cf_containers_invalid_config",
        `execHeaders entry #${index} is not a valid http header name`,
      );
    }
    if (typeof rawValue !== "string" || rawValue.trim().length === 0) {
      throw new CfContainersBackendError(
        "cf_containers_invalid_config",
        `execHeaders value for ${name} must be a non-empty string`,
      );
    }
    const value = rawValue.trim();
    if (/[\r\n]/.test(value)) {
      throw new CfContainersBackendError(
        "cf_containers_invalid_config",
        `execHeaders value for ${name} must not contain CR/LF`,
      );
    }
    headers[name] = value;
  }
  const headerNames = Object.keys(headers).sort();
  if (headerNames.length === 0) {
    throw new CfContainersBackendError(
      "cf_containers_invalid_config",
      "execHeaders must carry at least one credential header for /exec",
    );
  }
  return {
    headers: Object.freeze(headers),
    auth: { mechanism: "shared-secret-header", headerNames },
  };
}

/** 数字/ISO 字符串都认；返回 ms 时间戳，不可解析返回 null。 */
function parseExpirationMs(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return raw < 1_000_000_000_000 ? raw * 1_000 : raw;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      return numeric < 1_000_000_000_000 ? numeric * 1_000 : numeric;
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * wrangler oauth 兜底是否被**显式**打开：option `true` > option `false` > env 开关。
 * 没打开就根本不读那个文件（不静默借用宽 scopes token）。
 */
export function isWranglerOAuthOptedIn(
  inputs: Pick<CfContainersBackendOptions, "allowWranglerOAuthToken">,
  env: Record<string, string | undefined>,
): boolean {
  if (inputs.allowWranglerOAuthToken === true) return true;
  if (inputs.allowWranglerOAuthToken === false) return false;
  const flag = env[CF_CONTAINERS_WRANGLER_OAUTH_OPT_IN_ENV]?.trim().toLowerCase();
  return flag === "1" || flag === "true" || flag === "yes";
}

export type CfContainersFailureCode =
  | "cf_containers_invalid_config"
  | "cf_invalid_ticket"
  | "cf_credentials_missing"
  | "cf_account_missing"
  | "cf_bridge_module_missing"
  | "cf_unsupported_request"
  | "cf_lease_not_found"
  | "cf_lease_mismatch"
  | "cf_lease_released"
  | "cf_create_failed"
  | "cf_container_not_schedulable"
  | "cf_exec_failed"
  | "cf_exec_timeout"
  | "cf_cleanup_pending";

/** 对外只允许固定安全文案；detail 只放状态码/CF 错误码，绝不带凭据。 */
const SAFE_MESSAGE: Record<CfContainersFailureCode, string> = {
  cf_containers_invalid_config:
    "Rejected: cloudflare containers backend needs a valid base url, account, image and worker module",
  cf_invalid_ticket:
    "Rejected: execution ticket cannot be satisfied by the cloudflare containers backend",
  cf_credentials_missing:
    "Rejected before any cloud side effect: no Cloudflare API token (env CLOUDFLARE_API_TOKEN or wrangler config)",
  cf_account_missing:
    "Rejected before any cloud side effect: no Cloudflare account id (env CLOUDFLARE_ACCOUNT_ID or option)",
  cf_bridge_module_missing:
    "Rejected before any cloud side effect: no prebundled container worker module (Container class needs a build step)",
  cf_unsupported_request: "Request is not supported by the cloudflare containers backend",
  cf_lease_not_found: "Unknown execution lease",
  cf_lease_mismatch: "Lease does not match this backend or ticket",
  cf_lease_released: "Lease was already released",
  cf_create_failed: "Cloudflare container worker create failed",
  cf_container_not_schedulable:
    "Cloudflare container instance never became schedulable: a worker/durable-object binding must schedule a real instance",
  cf_exec_failed: "Cloudflare container exec could not be completed",
  cf_exec_timeout: "Cloudflare container exec exceeded the backend execution bound",
  cf_cleanup_pending: "Cloudflare container worker delete was not confirmed",
};

export class CfContainersBackendError extends Error {
  readonly code: CfContainersFailureCode;
  readonly detail?: string;
  /** true = 云端可能仍有存活 Worker 实例，调用方不得当作已清理。 */
  readonly cleanupPending: boolean;

  constructor(
    code: CfContainersFailureCode,
    detail?: string,
    cleanupPending = false,
  ) {
    super(detail ? `${SAFE_MESSAGE[code]} (${detail})` : SAFE_MESSAGE[code]);
    this.name = "CfContainersBackendError";
    this.code = code;
    this.detail = detail;
    this.cleanupPending = cleanupPending;
  }
}

// ---------------------------------------------------------------------------
// 注入点：唯一的外部调用通道
// ---------------------------------------------------------------------------

/** `Response` 的最小形状，测试替身不必构造真实 Response。 */
export type CfHttpResponseLike = {
  status: number;
  text: () => Promise<string>;
};

export type CfRequestInit = {
  method: string;
  headers: Record<string, string>;
  body?: FormData | string;
  signal?: AbortSignal;
};

/** 注入点：真实实现 = 全局 fetch；测试注入替身，零真实网络。 */
export type CfFetchImpl = (
  url: string,
  init: CfRequestInit,
) => Promise<CfHttpResponseLike>;

const defaultCfFetch: CfFetchImpl = (url, init) =>
  fetch(url, init as unknown as RequestInit) as unknown as Promise<CfHttpResponseLike>;

/** 凭据来源标注：env 与 wrangler 配置两条，来源记录下来便于审计。 */
export type CfCredentialsSource = "option" | "env" | "wrangler-config";

export type CfCredentials = {
  apiToken: string;
  accountId: string;
  source: CfCredentialsSource;
};

export type CfCredentialInputs = {
  env?: Record<string, string | undefined>;
  home?: string;
  readFileImpl?: (path: string) => Promise<string>;
  fileExistsImpl?: (path: string) => boolean;
  /**
   * 显式允许借用 wrangler 配置里的 `oauth_token`（宽 scopes）作兜底。默认
   * **false**：不显式打开就根本不去读那个文件。env
   * `CLOUDFLARE_ALLOW_WRANGLER_OAUTH_TOKEN=1|true|yes` 同样算打开；显式的
   * `false` 优先于 env。即便打开，`expiration_time` 过期 / 缺失仍不采用。
   */
  allowWranglerOAuthToken?: boolean;
};

export type CfContainersBackendOptions = CfCredentialInputs & {
  /** 显式凭据（优先于 env / 配置文件）。生产走 env 或 wrangler 配置。 */
  credentials?: CfCredentials;
  apiToken?: string;
  accountId?: string;
  /**
   * 预打包的桥接 Worker 模块源码（单文件 ESM，已把 `@cloudflare/containers`
   * 打进去）。**必填**：缺失一律 fail-closed，见文件头边界说明。
   */
  containerWorkerModule?: string;
  /** 容器镜像（registry 里已存在的 tag，CF 会真实校验）。 */
  image?: string;
  instanceType?: string;
  fetchImpl?: CfFetchImpl;
  baseUrl?: string;
  compatibilityDate?: string;
  /** 已绑定的自定义域名 / service 入口；给了就跳过 workers.dev 子域开关。 */
  workerBaseUrl?: string;
  /** workers.dev 子域（给了就不去 GET /workers/subdomain）。 */
  workersDevSubdomain?: string;
  /**
   * `/exec`（以及 readiness 探针）的鉴权头，例如 CF Access service token /
   * 共享密钥。**必填**：脚本名由 ticketId 确定性派生 → `/exec` URL 可预测，
   * 没有鉴权头就是「谁都能在容器里跑任意 argv」。
   * 值只在这里传入；审计只记头名（`execAuth`），值不进错误信息 / lease。
   */
  execHeaders: Record<string, string>;
  maxOutputChars?: number;
  /** exec 默认上界（ms）；request.timeoutMs 只能收紧它。 */
  execTimeoutMs?: number;
  /** readiness 探针上界（ms）。 */
  warmupTimeoutMs?: number;
  now?: () => number;
};

// ---------------------------------------------------------------------------
// 纯函数：标识符、规范化、就绪判定（可单测）
// ---------------------------------------------------------------------------

/** ticketId 白名单：字母数字开头，只允许 `_ . : -`，≤64。其它一律拒绝。 */
const TICKET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,63}$/;
/** CF account id：32 位十六进制（防止把任意字符串拼进 URL 路径）。 */
const ACCOUNT_ID_PATTERN = /^[a-f0-9]{32}$/i;
/** 镜像引用：不允许空白与 `?`/`#`。 */
const IMAGE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,200}$/;
/** 实例档名：小写字母数字与 `-`。 */
const INSTANCE_TYPE_PATTERN = /^[a-z0-9][a-z0-9-]{0,31}$/;
const COMPATIBILITY_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const CF_CONTAINERS_SCRIPT_PREFIX = "nolo-exec-";

/**
 * 派生 Worker 脚本名：**确定性**（同一 ticketId 永远同名），所以 prepare 重试
 * 只会覆盖同一个脚本，而不是漏出一堆孤儿脚本。ticketId 先过白名单，再规范化成
 * DNS-safe 标签（小写、`[a-z0-9-]`、首尾字母数字、总长 ≤63）。
 */
export function buildCfContainersScriptName(ticketId: string): string {
  if (!TICKET_ID_PATTERN.test(ticketId)) {
    throw new CfContainersBackendError(
      "cf_invalid_ticket",
      "ticketId must match [A-Za-z0-9][A-Za-z0-9_.:-]{0,63}",
    );
  }
  const slug = ticketId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63 - CF_CONTAINERS_SCRIPT_PREFIX.length);
  if (!slug) {
    throw new CfContainersBackendError("cf_invalid_ticket", "ticketId yields an empty slug");
  }
  return `${CF_CONTAINERS_SCRIPT_PREFIX}${slug}`;
}

/**
 * wrangler 同形的上传元数据：containers 绑定 + durable_objects 绑定 + migration。
 * 这是「脚本里有真正能调度容器的绑定」的机器可读证明，也正是
 * 「只建 application 记录」缺的那一块。
 */
export function buildCfContainersUploadMetadata(args: {
  containerWorkerModulePath: string;
  image: string;
  instanceType: string;
  className: string;
  bindingName: string;
  compatibilityDate: string;
  maxInstances?: number;
}): Record<string, unknown> {
  return {
    main_module: args.containerWorkerModulePath,
    compatibility_date: args.compatibilityDate,
    containers: [
      {
        class_name: args.className,
        image: args.image,
        instance_type: args.instanceType,
        max_instances: args.maxInstances ?? 1,
      },
    ],
    durable_objects: {
      bindings: [{ name: args.bindingName, class_name: args.className }],
    },
    migrations: [{ tag: "v1", new_sqlite_classes: [args.className] }],
  };
}

export type CfReadinessVerdict =
  | { kind: "ready"; instanceId?: string }
  | { kind: "not-schedulable"; detail: string }
  | { kind: "unknown"; detail: string };

/**
 * 判定 readiness 探针的响应。**只有明确的 ok:true 才算 ready**：
 * 缺失、非 2xx、以及 CF 的 `NOT_ENABLED` / `location: "mock"` 签名一律判为
 * 不可调度（实测「建了 application 却没绑定」就是这个签名）。
 */
export function classifyCfContainerReadiness(
  status: number,
  rawBody: string,
): CfReadinessVerdict {
  let parsed: unknown;
  try {
    parsed = rawBody ? JSON.parse(rawBody) : undefined;
  } catch {
    return { kind: "unknown", detail: `status ${status} with non-JSON body` };
  }
  const body =
    parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : undefined;
  if (body) {
    const statusText = typeof body.containerStatus === "string" ? body.containerStatus : "";
    const location = typeof body.location === "string" ? body.location : "";
    if (
      CF_CONTAINERS_BRIDGE_CONTRACT.instanceNotSchedulableSignatures.some((signature) =>
        statusText.includes(signature),
      ) ||
      location === CF_CONTAINERS_BRIDGE_CONTRACT.mocksLocation
    ) {
      return {
        kind: "not-schedulable",
        detail: `containerStatus=${statusText || "unknown"} location=${location || "unknown"}`,
      };
    }
  }
  if (status < 200 || status >= 300) {
    return { kind: "unknown", detail: `status ${status}` };
  }
  if (!body || body.ok !== true) {
    return { kind: "unknown", detail: `status ${status} without ok:true` };
  }
  return {
    kind: "ready",
    ...(typeof body.instanceId === "string" ? { instanceId: body.instanceId } : {}),
  };
}

/** CF 错误响应的错误码（只取数字码，绝不透传正文——正文可能带回显内容）。 */
export function extractCfErrorCodes(rawBody: string): string {
  try {
    const parsed = JSON.parse(rawBody) as {
      errors?: Array<{ code?: unknown }>;
    };
    const codes = (parsed.errors ?? [])
      .map((error) => error?.code)
      .filter((code): code is number => typeof code === "number");
    return codes.length > 0 ? codes.join(",") : "none";
  } catch {
    return "unparsed";
  }
}

function truncateOutput(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n…[truncated ${value.length - maxChars} chars]`;
}

/** 带真实定时器的上界：即使注入的 fetch 永不 settle，await 也一定有出口。 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  controller: AbortController,
  onTimeout: () => Error,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(onTimeout());
    }, timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type LeaseEntry = {
  scriptName: string;
  workerBaseUrl: string;
  ticketId: string;
  grantId: string;
  requestedAt: number;
  readyAt: number;
  releasedAt: number | null;
  releaseReason: ExecutionReleaseReason | null;
};

// ---------------------------------------------------------------------------
// 后端
// ---------------------------------------------------------------------------

export class CfContainersBackend implements ExecutionBackend {
  readonly #options: CfContainersBackendOptions;
  readonly #fetchImpl: CfFetchImpl;
  readonly #baseUrl: string;
  readonly #instanceType: string;
  readonly #execTimeoutMs: number;
  readonly #warmupTimeoutMs: number;
  readonly #maxOutputChars: number;
  readonly #now: () => number;
  readonly #execHeaders: Readonly<Record<string, string>>;
  readonly #execAuth: CfExecAuth;
  readonly #leases = new Map<string, LeaseEntry>();
  #credentialsPromise: Promise<CfCredentials> | null = null;

  constructor(options: CfContainersBackendOptions) {
    this.#options = options;
    this.#fetchImpl = options.fetchImpl ?? defaultCfFetch;
    const baseUrl = (options.baseUrl ?? CF_CONTAINERS_DEFAULT_BASE_URL).replace(/\/+$/, "");
    if (!/^https:\/\/[^\s/]+(?:\/[^\s?]*)?$/.test(baseUrl)) {
      throw new CfContainersBackendError(
        "cf_containers_invalid_config",
        "baseUrl must be an https url without query",
      );
    }
    this.#baseUrl = baseUrl;
    const instanceType = options.instanceType ?? CF_CONTAINERS_DEFAULT_INSTANCE_TYPE;
    if (!INSTANCE_TYPE_PATTERN.test(instanceType)) {
      throw new CfContainersBackendError(
        "cf_containers_invalid_config",
        "instanceType must match [a-z0-9][a-z0-9-]*",
      );
    }
    this.#instanceType = instanceType;
    const execTimeoutMs = options.execTimeoutMs ?? CF_CONTAINERS_DEFAULT_EXEC_TIMEOUT_MS;
    if (
      !Number.isInteger(execTimeoutMs) ||
      execTimeoutMs < 1 ||
      execTimeoutMs > CF_CONTAINERS_HARD_MAX_EXEC_TIMEOUT_MS
    ) {
      throw new CfContainersBackendError(
        "cf_containers_invalid_config",
        `execTimeoutMs must be an integer in [1,${CF_CONTAINERS_HARD_MAX_EXEC_TIMEOUT_MS}]`,
      );
    }
    this.#execTimeoutMs = execTimeoutMs;
    const warmupTimeoutMs = options.warmupTimeoutMs ?? CF_CONTAINERS_DEFAULT_WARMUP_TIMEOUT_MS;
    if (!Number.isInteger(warmupTimeoutMs) || warmupTimeoutMs < 1) {
      throw new CfContainersBackendError(
        "cf_containers_invalid_config",
        "warmupTimeoutMs must be a positive integer",
      );
    }
    this.#warmupTimeoutMs = warmupTimeoutMs;
    const maxOutputChars = options.maxOutputChars ?? CF_CONTAINERS_DEFAULT_MAX_OUTPUT_CHARS;
    if (!Number.isInteger(maxOutputChars) || maxOutputChars < 1) {
      throw new CfContainersBackendError(
        "cf_containers_invalid_config",
        "maxOutputChars must be a positive integer",
      );
    }
    this.#maxOutputChars = maxOutputChars;
    // `/exec` 的鉴权在构造期定死（并冻结），缺失即拒绝 —— 此时还没碰过网络。
    const execAuthConfig = normalizeCfExecHeaders(options.execHeaders);
    this.#execHeaders = execAuthConfig.headers;
    this.#execAuth = execAuthConfig.auth;
    this.#now = options.now ?? Date.now;
  }

  describe(): ExecutionBackendDescriptor {
    return {
      id: CF_CONTAINERS_BACKEND_ID,
      kind: "cloud",
      capabilities: { ...CF_CONTAINERS_CAPABILITIES },
    };
  }

  // -- 凭据（fail-closed，绝不打印凭据） -----------------------------------

  async credentials(): Promise<CfCredentials> {
    if (!this.#credentialsPromise) {
      this.#credentialsPromise = resolveCfContainersCredentials(this.#options).catch((error) => {
        // 失败不缓存：修好环境后下一次调用应当能成功，而不是永远记住第一次失败。
        this.#credentialsPromise = null;
        throw error;
      });
    }
    return await this.#credentialsPromise;
  }

  // -- 低层 HTTP（含上界与凭据注入；detail 只带状态码/CF 错误码） ----------

  async #apiRequest(
    method: string,
    path: string,
    init: { body?: FormData | string; headers?: Record<string, string>; timeoutMs: number },
  ): Promise<{ status: number; text: string }> {
    const credentials = await this.credentials();
    const controller = new AbortController();
    const headers: Record<string, string> = {
      // 唯一使用凭据的地方；错误信息里永远不带它。
      Authorization: `Bearer ${credentials.apiToken}`,
      ...(init.headers ?? {}),
    };
    const promise = this.#fetchImpl(`${this.#baseUrl}${path}`, {
      method,
      headers,
      ...(init.body !== undefined ? { body: init.body } : {}),
      signal: controller.signal,
    });
    const response = await withTimeout(
      promise,
      init.timeoutMs,
      controller,
      () =>
        new CfContainersBackendError("cf_create_failed", `${method} ${path} timed out`),
    );
    return { status: response.status, text: await response.text() };
  }

  async #probeApi(pathWithQuery: string, timeoutMs: number): Promise<{ status: number; text: string }> {
    return await this.#apiRequest("GET", pathWithQuery, { timeoutMs });
  }

  async #workerRequest(
    method: string,
    url: string,
    init: { body?: string; timeoutMs: number },
  ): Promise<{ status: number; text: string }> {
    const controller = new AbortController();
    if (this.#execAuth.headerNames.length === 0) {
      // 构造期已经拒过；这里是纵深防御：任何路径都不许走到无鉴权的 /exec。
      throw new CfContainersBackendError(
        "cf_containers_invalid_config",
        "exec credential is missing: refusing an unauthenticated worker request",
      );
    }
    const headers: Record<string, string> = {
      // 只来自构造期冻结的鉴权头；错误信息里不带它们。
      ...this.#execHeaders,
      ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
    };
    const promise = this.#fetchImpl(url, {
      method,
      headers,
      ...(init.body !== undefined ? { body: init.body } : {}),
      signal: controller.signal,
    });
    const response = await withTimeout(
      promise,
      init.timeoutMs,
      controller,
      () => new CfContainersBackendError("cf_exec_timeout", `${method} ${url} timed out`),
    );
    return { status: response.status, text: await response.text() };
  }

  // -- prepare ------------------------------------------------------------

  /**
   * 上传带容器绑定的 Worker 脚本 → 打开 workers.dev 入口 → **等真实实例应答**。
   * `readyAt` 是实例真的回包的时刻（冷启包含在内，实测 8_413ms），
   * 不是「上传返回 200」的时刻 —— 后者只证明脚本存在。
   */
  async prepare(ticket: ExecutionTicket): Promise<ExecutionLease> {
    if (this.#execAuth.headerNames.length === 0) {
      // 纵深防御：构造期既已校验，这里再挡一次，保证 prepare 永不产出无鉴权 lease。
      throw new CfContainersBackendError(
        "cf_containers_invalid_config",
        "exec credential is missing: refusing to open an unauthenticated /exec",
      );
    }
    if (ticket.version !== 1 || !ticket.ticketId || !ticket.grantId) {
      throw new CfContainersBackendError("cf_invalid_ticket");
    }
    if (ticket.target.kind === "machine") {
      // 用户机器上的 connector 不能借一个 CF 容器兑现。
      throw new CfContainersBackendError("cf_invalid_ticket", "machine target unsupported");
    }
    if (!CF_CONTAINERS_CAPABILITIES.executionClasses.includes(ticket.executionClass)) {
      throw new CfContainersBackendError(
        "cf_invalid_ticket",
        `executionClass ${ticket.executionClass} is not a declared capability`,
      );
    }
    const image = this.#options.image?.trim();
    if (!image || !IMAGE_PATTERN.test(image)) {
      throw new CfContainersBackendError(
        "cf_containers_invalid_config",
        "image must be a registry reference without whitespace",
      );
    }
    const moduleSource = this.#options.containerWorkerModule;
    if (!moduleSource || moduleSource.trim().length === 0) {
      throw new CfContainersBackendError(
        "cf_bridge_module_missing",
        "prebundled container worker module is required",
      );
    }
    const compatibilityDate =
      this.#options.compatibilityDate ?? new Date(this.#now()).toISOString().slice(0, 10);
    if (!COMPATIBILITY_DATE_PATTERN.test(compatibilityDate)) {
      throw new CfContainersBackendError(
        "cf_containers_invalid_config",
        "compatibilityDate must be YYYY-MM-DD",
      );
    }

    const scriptName = buildCfContainersScriptName(ticket.ticketId);
    // 凭据在**任何**副作用之前解析：缺凭据 = 零网络调用。
    const credentials = await this.credentials();
    const requestedAt = this.#now();
    const modulePath = `${scriptName}.js`;

    const form = new FormData();
    form.append(
      "metadata",
      JSON.stringify(
        buildCfContainersUploadMetadata({
          containerWorkerModulePath: modulePath,
          image,
          instanceType: this.#instanceType,
          className: "NoloExecContainer",
          bindingName: "NOLO_EXEC_CONTAINER",
          compatibilityDate,
        }),
      ),
    );
    // 部件名就是 `metadata.main_module` 指向的文件名（CF 的 multipart 约定）。
    form.append(modulePath, moduleSource);

    const uploaded = await this.#apiRequest(
      "PUT",
      `/accounts/${credentials.accountId}/workers/scripts/${scriptName}`,
      { body: form, timeoutMs: this.#warmupTimeoutMs },
    );
    if (uploaded.status < 200 || uploaded.status >= 300) {
      throw new CfContainersBackendError(
        "cf_create_failed",
        `script upload exited ${uploaded.status} (cf ${extractCfErrorCodes(uploaded.text)})`,
      );
    }

    let workerBaseUrl: string;
    try {
      workerBaseUrl = await this.#resolveWorkerBaseUrl(credentials.accountId, scriptName);
    } catch (error) {
      // 脚本已经建出来了：尽力删掉，删不掉就带 cleanupPending 上报，绝不假装干净。
      const cleaned = await this.#tryDeleteScript(credentials.accountId, scriptName);
      if (error instanceof CfContainersBackendError) {
        throw new CfContainersBackendError(error.code, error.detail, !cleaned);
      }
      throw error;
    }

    const verdict = await this.#awaitContainerReadiness(workerBaseUrl, scriptName);
    if (verdict.kind !== "ready") {
      const cleaned = await this.#tryDeleteScript(credentials.accountId, scriptName);
      const detail = `${verdict.detail}${cleaned ? "" : "; script cleanup unconfirmed"}`;
      if (verdict.kind === "not-schedulable") {
        throw new CfContainersBackendError("cf_container_not_schedulable", detail, !cleaned);
      }
      throw new CfContainersBackendError("cf_create_failed", detail, !cleaned);
    }

    const readyAt = this.#now();
    const readableRoots = [...ticket.filesystem.readableRoots];
    const writableRoots = [...ticket.filesystem.writableRoots];
    const unmountedRoots = [...new Set([...readableRoots, ...writableRoots])];
    const lease: ExecutionLease = {
      leaseId: `${ticket.ticketId}:${scriptName}`,
      backendId: CF_CONTAINERS_BACKEND_ID,
      ticketId: ticket.ticketId,
      grantId: ticket.grantId,
      createdAt: readyAt,
      readableRoots,
      writableRoots,
      metadata: {
        scriptName,
        workerBaseUrl,
        accountId: credentials.accountId,
        credentialSource: credentials.source,
        // 这次 lease 靠什么鉴权：只记方式 + 头名，头值永不落 lease。
        execAuth: this.#execAuth,
        image,
        instanceType: this.#instanceType,
        requestedAt,
        readyAt,
        ...(verdict.instanceId ? { instanceId: verdict.instanceId } : {}),
        // 容器里有文件系统 ≠ 这些 roots 被挂进来了；缺口必须可见。
        unmountedRoots,
        // CF 没有 usage API：成本只能本地估算，不许发明用量。
        usageSource: "local-estimate",
      },
    };
    this.#leases.set(lease.leaseId, {
      scriptName,
      workerBaseUrl,
      ticketId: ticket.ticketId,
      grantId: ticket.grantId,
      requestedAt,
      readyAt,
      releasedAt: null,
      releaseReason: null,
    });
    return lease;
  }

  async #resolveWorkerBaseUrl(accountId: string, scriptName: string): Promise<string> {
    const configured = this.#options.workerBaseUrl?.trim();
    if (configured) return configured.replace(/\/+$/, "");
    const enable = await this.#apiRequest(
      "POST",
      `/accounts/${accountId}/workers/scripts/${scriptName}/subdomain`,
      {
        body: JSON.stringify({ enabled: true, previews_enabled: false }),
        headers: { "Content-Type": "application/json" },
        timeoutMs: this.#warmupTimeoutMs,
      },
    );
    if (!(enable.status >= 200 && enable.status < 300)) {
      throw new CfContainersBackendError(
        "cf_create_failed",
        `subdomain enable exited ${enable.status} (cf ${extractCfErrorCodes(enable.text)})`,
      );
    }
    let subdomain = this.#options.workersDevSubdomain?.trim() ?? "";
    if (!subdomain) {
      const read = await this.#probeApi(
        `/accounts/${accountId}/workers/subdomain`,
        this.#warmupTimeoutMs,
      );
      if (read.status < 200 || read.status >= 300) {
        throw new CfContainersBackendError(
          "cf_create_failed",
          `subdomain read exited ${read.status} (cf ${extractCfErrorCodes(read.text)})`,
        );
      }
      try {
        const parsed = JSON.parse(read.text) as { result?: { subdomain?: unknown } };
        if (typeof parsed.result?.subdomain === "string") subdomain = parsed.result.subdomain.trim();
      } catch {
        subdomain = "";
      }
      if (!subdomain) {
        throw new CfContainersBackendError(
          "cf_create_failed",
          "workers.dev subdomain missing; set workerBaseUrl or workersDevSubdomain",
        );
      }
    }
    return `https://${scriptName}.${subdomain}.workers.dev`;
  }

  /** 只有实例真的回包才算 ready；未落地/超时一律不可调度。 */
  async #awaitContainerReadiness(
    workerBaseUrl: string,
    scriptName: string,
  ): Promise<CfReadinessVerdict> {
    let probe: { status: number; text: string };
    try {
      probe = await this.#workerRequest("GET", `${workerBaseUrl}${CF_CONTAINERS_HEALTH_PATH}`, {
        timeoutMs: this.#warmupTimeoutMs,
      });
    } catch (error) {
      if (
        error instanceof CfContainersBackendError &&
        error.code === "cf_exec_timeout"
      ) {
        // 实测：没有 Worker/DO 绑定时 169s 也没有实例落地。等不到就是不可调度。
        return {
          kind: "not-schedulable",
          detail: `no instance answered ${CF_CONTAINERS_HEALTH_PATH} within ${this.#warmupTimeoutMs}ms`,
        };
      }
      return {
        kind: "unknown",
        detail: `health probe failed: ${
          error instanceof Error ? error.name : typeof error
        }`,
      };
    }
    const verdict = classifyCfContainerReadiness(probe.status, probe.text);
    return verdict.kind === "unknown"
      ? { kind: "unknown", detail: `${verdict.detail} for ${scriptName}` }
      : verdict;
  }

  /** 删除并**确认**删除；返回 true 仅当 API 明确说出脚本已不存在。 */
  async #tryDeleteScript(accountId: string, scriptName: string): Promise<boolean> {
    try {
      const deleted = await this.#apiRequest(
        "DELETE",
        `/accounts/${accountId}/workers/scripts/${scriptName}`,
        { timeoutMs: this.#warmupTimeoutMs },
      );
      if (deleted.status === 404) return true;
      if (deleted.status < 200 || deleted.status >= 300) return false;
      const confirm = await this.#probeApi(
        `/accounts/${accountId}/workers/scripts/${scriptName}`,
        this.#warmupTimeoutMs,
      );
      return confirm.status === 404;
    } catch {
      return false;
    }
  }

  // -- execute ------------------------------------------------------------

  async execute(
    lease: ExecutionLease,
    request: ExecutionRequest,
    onEvent?: (event: ExecutionEvent) => void,
  ): Promise<ExecutionResult> {
    const entry = this.#requireEntry(lease);
    if (request.kind !== "command") {
      throw new CfContainersBackendError("cf_unsupported_request", `kind ${request.kind}`);
    }
    // fail-closed：桥接契约只兑现 argv。静默忽略 cwd/env/stdin 会让调用方拿到
    // 「exitCode: 0」的假成功（命令实际没有这些约束），故显式拒绝。
    if (request.cwd !== undefined || request.env !== undefined || request.stdin !== undefined) {
      throw new CfContainersBackendError("cf_unsupported_request", "request options not honored");
    }
    if (!Array.isArray(request.argv) || request.argv.length === 0) {
      throw new CfContainersBackendError("cf_unsupported_request", "argv must be a non-empty array");
    }
    if (request.argv.some((token) => typeof token !== "string")) {
      throw new CfContainersBackendError("cf_unsupported_request", "argv tokens must be strings");
    }
    const requestedTimeoutMs = request.timeoutMs;
    if (requestedTimeoutMs !== undefined) {
      if (!Number.isFinite(requestedTimeoutMs) || requestedTimeoutMs <= 0) {
        throw new CfContainersBackendError(
          "cf_unsupported_request",
          "timeoutMs must be a positive finite number",
        );
      }
      if (requestedTimeoutMs > this.#execTimeoutMs) {
        throw new CfContainersBackendError(
          "cf_unsupported_request",
          "timeoutMs exceeds the backend execution bound",
        );
      }
    }
    // 上界永远存在；没有它，卡住的容器 exec 只能等云端 TTL。
    const execBoundMs = requestedTimeoutMs ?? this.#execTimeoutMs;

    const executionId = `${entry.scriptName}:${this.#now().toString(36)}`;
    const startedAt = this.#now();
    onEvent?.({ type: "started", executionId, at: startedAt });

    // argv 以数组穿过 JSON body：不打 shell，不拼命令行字符串。
    const body = JSON.stringify({ v: 1, argv: [...request.argv] });
    let response: { status: number; text: string };
    try {
      response = await this.#workerRequest(
        "POST",
        `${entry.workerBaseUrl}${CF_CONTAINERS_EXEC_PATH}`,
        { body, timeoutMs: execBoundMs },
      );
    } catch (error) {
      if (error instanceof CfContainersBackendError && error.code === "cf_exec_timeout") {
        throw error;
      }
      throw new CfContainersBackendError(
        "cf_exec_failed",
        `transport ${error instanceof Error ? error.name : typeof error}`,
      );
    }
    if (response.status < 200 || response.status >= 300) {
      throw new CfContainersBackendError("cf_exec_failed", `status ${response.status}`);
    }
    let parsed: { exitCode?: unknown; stdout?: unknown; stderr?: unknown };
    try {
      parsed = JSON.parse(response.text) as typeof parsed;
    } catch {
      throw new CfContainersBackendError("cf_exec_failed", "response is not JSON");
    }
    if (typeof parsed.exitCode !== "number" || !Number.isInteger(parsed.exitCode)) {
      throw new CfContainersBackendError("cf_exec_failed", "response has no integer exitCode");
    }
    const stdout = truncateOutput(
      typeof parsed.stdout === "string" ? parsed.stdout : "",
      this.#maxOutputChars,
    );
    const stderr = truncateOutput(
      typeof parsed.stderr === "string" ? parsed.stderr : "",
      this.#maxOutputChars,
    );
    if (stdout) onEvent?.({ type: "stdout", executionId, chunk: stdout, seq: 1 });
    if (stderr) onEvent?.({ type: "stderr", executionId, chunk: stderr, seq: 1 });
    onEvent?.({
      type: "usage",
      executionId,
      usage: { wallMs: Math.max(0, this.#now() - startedAt) },
    });
    onEvent?.({ type: "exited", executionId, exitCode: parsed.exitCode });

    return {
      executionId,
      ok: parsed.exitCode === 0,
      exitCode: parsed.exitCode,
      output: { stdout, stderr },
    };
  }

  // -- release ------------------------------------------------------------

  /**
   * 删除 Worker 脚本并**二次确认**。未知/已释放的 lease 是幂等 no-op；
   * 删除未被确认一律 `cf_cleanup_pending`（cleanupPending: true）且**不**标 released，
   * 允许重试 —— 绝不把「已请求删除」谎报成「已清理」。
   */
  async release(lease: ExecutionLease, reason: ExecutionReleaseReason): Promise<void> {
    const entry = this.#leases.get(lease.leaseId);
    if (!entry || entry.releasedAt !== null) return;
    if (lease.backendId !== CF_CONTAINERS_BACKEND_ID || lease.ticketId !== entry.ticketId) {
      throw new CfContainersBackendError("cf_lease_mismatch");
    }
    const credentials = await this.credentials();
    const confirmed = await this.#tryDeleteScript(credentials.accountId, entry.scriptName);
    if (!confirmed) {
      throw new CfContainersBackendError("cf_cleanup_pending", undefined, true);
    }
    entry.releasedAt = this.#now();
    entry.releaseReason = reason;
  }

  #requireEntry(lease: ExecutionLease): LeaseEntry {
    if (lease.backendId !== CF_CONTAINERS_BACKEND_ID) {
      throw new CfContainersBackendError(
        "cf_lease_mismatch",
        `lease belongs to ${lease.backendId}`,
      );
    }
    const entry = this.#leases.get(lease.leaseId);
    if (!entry) {
      throw new CfContainersBackendError("cf_lease_not_found");
    }
    if (entry.ticketId !== lease.ticketId || entry.grantId !== lease.grantId) {
      throw new CfContainersBackendError("cf_lease_mismatch", "lease ticket/grant does not match");
    }
    if (entry.releasedAt !== null) {
      throw new CfContainersBackendError("cf_lease_released");
    }
    return entry;
  }
}

/**
 * 凭据解析：`CLOUDFLARE_API_TOKEN` → wrangler 的
 * `~/.config/cloudflare/config/default.json` 的 `oauth_token`（**必须显式 opt-in**）。
 * 注意本机实测该文件只有 `oauth_token / refresh_token / scopes / expiration_time`，
 * **没有 account id**，所以 accountId 必须由 env `CLOUDFLARE_ACCOUNT_ID` 或
 * 选项显式给出，不猜。wrangler 那条路还要求 `expiration_time` 存在、可解析且
 * 未过期：宽 scopes 的 oauth token 不允许被静默借来当执行凭据。
 *
 * 失败一律 fail-closed：抛错即「零网络调用」，且错误信息里绝不出现凭据内容。
 */
export async function resolveCfContainersCredentials(
  inputs: CfContainersBackendOptions,
): Promise<CfCredentials> {
  const env = inputs.env ?? process.env;
  if (inputs.credentials) {
    const apiToken = inputs.credentials.apiToken?.trim() ?? "";
    const accountId = inputs.credentials.accountId?.trim() ?? "";
    if (!apiToken) throw new CfContainersBackendError("cf_credentials_missing");
    if (!ACCOUNT_ID_PATTERN.test(accountId)) {
      throw new CfContainersBackendError("cf_account_missing", "accountId must be 32 hex chars");
    }
    return { apiToken, accountId, source: "option" };
  }

  let apiToken = inputs.apiToken?.trim() ?? "";
  let source: CfCredentialsSource = "option";
  if (!apiToken) {
    apiToken = env.CLOUDFLARE_API_TOKEN?.trim() ?? "";
    if (apiToken) source = "env";
  }
  let accountId = inputs.accountId?.trim() ?? env.CLOUDFLARE_ACCOUNT_ID?.trim() ?? "";

  if (!apiToken) {
    // 宽 scopes 的 wrangler oauth_token 只能**显式**借用：没 opt-in 就根本不读文件。
    if (!isWranglerOAuthOptedIn(inputs, env)) {
      throw new CfContainersBackendError(
        "cf_credentials_missing",
        `wrangler oauth_token fallback is not opted in (allowWranglerOAuthToken or env ${CF_CONTAINERS_WRANGLER_OAUTH_OPT_IN_ENV}=1)`,
      );
    }
    const readFile =
      inputs.readFileImpl ?? (async (path: string) => await readFileImplFs(path, "utf8"));
    const fileExists = inputs.fileExistsImpl ?? existsSync;
    const home = inputs.home ?? env.HOME?.trim() ?? homedir();
    const path = join(home, ...CF_CONTAINERS_CREDENTIALS_PATH_SEGMENTS);
    let notAdopted: string | null = null;
    if (fileExists(path)) {
      try {
        const parsed = JSON.parse(await readFile(path)) as {
          oauth_token?: unknown;
          account_id?: unknown;
          expiration_time?: unknown;
        };
        const candidate =
          typeof parsed.oauth_token === "string" ? parsed.oauth_token.trim() : "";
        if (!candidate) {
          notAdopted = "wrangler config has no oauth_token to adopt";
        } else {
          // 过期 / 无法判定有效期的 token 一律不采用，并说明原因（不回显 token）。
          const expirationMs = parseExpirationMs(parsed.expiration_time);
          const nowMs = inputs.now?.() ?? Date.now();
          if (expirationMs === null) {
            notAdopted =
              "wrangler oauth_token was not adopted: expiration_time is missing or unparsable";
          } else if (expirationMs <= nowMs) {
            notAdopted = `wrangler oauth_token was not adopted: expired at ${new Date(expirationMs).toISOString()}`;
          } else {
            apiToken = candidate;
            source = "wrangler-config";
          }
        }
        // 本机该文件没有 account_id；有就顺手用，没有就继续要求 env/选项。
        if (!accountId && typeof parsed.account_id === "string") {
          accountId = parsed.account_id.trim();
        }
      } catch {
        // 读不了/解析不了 = 没有可用凭据：下面统一按缺失处理，不猜、不回落。
      }
    }
    if (notAdopted) {
      throw new CfContainersBackendError("cf_credentials_missing", notAdopted);
    }
  }

  if (!apiToken) {
    throw new CfContainersBackendError("cf_credentials_missing");
  }
  if (!ACCOUNT_ID_PATTERN.test(accountId)) {
    throw new CfContainersBackendError("cf_account_missing", "accountId must be 32 hex chars");
  }
  return { apiToken, accountId, source };
}

export function createCfContainersExecutionBackend(
  options: CfContainersBackendOptions,
): ExecutionBackend {
  return new CfContainersBackend(options);
}
