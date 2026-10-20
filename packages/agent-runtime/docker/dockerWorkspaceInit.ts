/**
 * Docker 云沙盒**工作区初始化策略**（块C）—— 纯规划函数，零副作用。
 *
 * 背景：云沙盒启动后 `/workspace` 是空的。调用方在 `sbx --cloud create` 之后、下发任务之前，
 * 先按本模块产出的 plan 执行（上传 → 解包 / mkdir / git clone），把工作区初始化成任务期望的形态。
 *
 * 设计约束（与 `runViaDockerSandbox.ts` 同一纪律）：
 * - 本模块**只做规划**：不读磁盘、不跑 sbx、不写日志、不发网络请求；所有拒绝路径 fail-closed。
 * - 命令一律数组传参（`["bash","-lc", <单条脚本>]`），脚本里的每个变量都经 `shQuote` 单引号转义，
 *   绝不把未转义的值拼进 shell 字符串；argv 最终再过一遍 `isValidArgv`（无 NUL / 换行，≤4096）。
 * - 失败只输出固定安全文案（code + 数值/上限字段），**绝不回显调用方原始输入**（可能是凭证）。
 * - 工作区根是常量 `WORKSPACE_ROOT`（= 容器默认 cwd，见 `sandboxWorkspaceHelper.ts`）：
 *   `input.workspaceRoot` 只用于校验，永远不会被拼进 argv。
 *
 * 凭证边界（gitClone，reviewer 重点）：
 * - 本块只支持**从容器内无凭证的公开仓库**拉取（`git clone --depth 1 <https url>`）。
 * - 绝不把 token 拼进 argv / 写入任何日志 / 放进 plan；带内嵌凭证的 URL（`https://user:token@host/…`）
 *   或带 `?access_token=` 之类查询参数的 URL 一律拒绝（code: `credential-in-url-not-allowed`）。
 * - 调用方若显式传 `credential`（需要私有仓库鉴权），本模块**拒绝**而不是静默忽略
 *   （code: `credential-auth-not-supported`）——见 `resolveWorkspaceInitPlan` 内的 TODO。
 * - `networkAllow` 只在本函数内充当**放行门**（空/缺失即拒绝），plan 不携带网络信息；
 *   真正出站放行由调用方把 `input.networkAllow` 交给 `buildSbxCloudCreateArgv` 的 `--allow-network`。
 */

// 与执行器同源的 argv 白名单与沙盒路径白名单（单一真值，避免各写一份后漂移）。
import { isValidArgv, isValidSandboxPath } from "./sandboxValidators";

export type WorkspaceInitStrategy = "bundle" | "tar" | "empty" | "gitClone";

/**
 * 默认策略：**git bundle 投送**（块F2 主路径）。
 *
 * bundle 是自包含的 git 对象包：沙盒里 `git clone <bundle>` 直接得到**真实历史 +
 * 全部分支**，agent 因此能 `git worktree`、能对真基线（base 分支）diff —— 这些是
 * 「单 commit 快照」（tar 解包 + `git init` 重建）做不到的。
 * tar 快照保留为 fallback（见 `localWorkspaceArchive.ts` 的 `deliveryPath`）。
 */
export const DEFAULT_WORKSPACE_INIT_STRATEGY: WorkspaceInitStrategy = "bundle";

export const WORKSPACE_INIT_STRATEGIES: readonly WorkspaceInitStrategy[] = [
  "bundle",
  "tar",
  "empty",
  "gitClone",
];

/** 工作区根：固定值，永不来自调用方输入。 */
import { SANDBOX_WORKSPACE_ROOT } from "./sandboxWorkspaceHelper";

/**
 * 沙盒内工作区根：**单一真值**来自 `sandboxWorkspaceHelper.ts` 的
 * `SANDBOX_WORKSPACE_ROOT`（= 钉住的沙盒镜像 `docker.io/oven/bun:<version>` 的默认
 * 工作目录 `/home/bun/app`）。此前这里硬编码 `/workspace`，与容器默认 cwd 不一致：
 * 投送把仓库解到 `/workspace`，而 agent 的 `pwd` / 文件工具都在 `/home/bun/app`
 * —— 沙盒看起来「有仓库」但 agent 眼里仍是空目录（块K 实测）。
 */
export const WORKSPACE_ROOT = SANDBOX_WORKSPACE_ROOT;

/** 上传快照在沙盒内的落地目录（固定，只有文件名随本地路径派生）。 */
export const TAR_ARCHIVE_REMOTE_DIR = "/tmp/nolo-workspace-init";

/** 快照归档大小上限（512 MiB）：调用方 stat 后把字节数交给校验器做纯函数比较。 */
export const MAX_TAR_ARCHIVE_BYTES = 512 * 1024 * 1024;

/** 本地归档路径长度上限（同时满足 argv 元素 4096 上限的余量）。 */
export const MAX_TAR_ARCHIVE_PATH_CHARS = 1024;

/** 出站白名单条目数上限（防把天文数字的 host 塞进一次 create）。 */
export const MAX_NETWORK_ALLOW_ENTRIES = 32;

/** 出站白名单单个 host 长度上限。 */
export const MAX_NETWORK_HOST_CHARS = 253;

/** 仓库 URL 长度上限。 */
export const MAX_REPO_URL_CHARS = 2048;

/** 允许的 tar 归档后缀（tar/tgz/gz 一律走 `tar -xzf`，gz 与 tar 之外的格式不支持）。 */
const TAR_ARCHIVE_SUFFIXES: readonly string[] = [".tar.gz", ".tgz", ".tar"];

/**
 * 允许的 git bundle 后缀。bundle 是**自包含的 git 对象包**（真实历史 + 全部分支），
 * 沙盒 `git clone` 它即可得到可 `git worktree`、可对真基线 diff 的仓库。
 */
const BUNDLE_ARCHIVE_SUFFIXES: readonly string[] = [".bundle"];

/** git bundle 在沙盒内的落地目录（与 tar 归档同一处，复用既有的投送准备步骤）。 */
export const GIT_BUNDLE_REMOTE_DIR = TAR_ARCHIVE_REMOTE_DIR;

/** base branch 名长度上限。 */
export const MAX_BASE_BRANCH_CHARS = 255;

/**
 * base branch 名：**裸 ref 名**（不带 `refs/heads/` 前缀）的保守字符集。
 * 空白 / 引号 / 控制字符 / glob / `~^:?*[\\` 一律拒绝；其余非法形态（`..`、`@{`、
 * 尾 `.lock` / `.` / `/` 等）由 `resolveBaseBranch` 另行判定。
 */
const BASE_BRANCH_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,254}$/;

/** 本地归档路径：绝对路径 + 只允许保守字符集（拒绝空白/引号/控制字符/glob）。 */
const TAR_ARCHIVE_PATH_PATTERN = /^\/[A-Za-z0-9._\-/]{1,1024}$/;

/** 落地文件名：必须有安全首字符、无隐藏文件、长度受限。 */
const SAFE_ARCHIVE_FILE_NAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/** 出站白名单 host：裸主机名（不含 scheme / 端口 / 路径 / 通配符 / 下划线）。 */
const NETWORK_HOST_PATTERN = /^[A-Za-z0-9](?:[A-Za-z0-9.-]{0,251}[A-Za-z0-9])?$/;

/** URL 里出现这些查询参数即视为「把凭证塞进了 URL」。 */
const CREDENTIAL_QUERY_PARAM_PATTERN = /[?&](?:access_token|auth|private_token|token)=/i;

export type WorkspaceInitFailureCode =
  | "invalid-workspace-root"
  | "unknown-strategy"
  | "invalid-tar-archive"
  | "tar-archive-too-large"
  | "invalid-git-bundle"
  | "git-bundle-too-large"
  | "invalid-base-branch"
  | "network-not-allowed"
  | "invalid-network-allow"
  | "invalid-repo-url"
  | "credential-in-url-not-allowed"
  | "credential-auth-not-supported"
  | "invalid-remote-path"
  | "invalid-argv";

/** 固定安全文案：只允许出现这些 code；message 由 code + 上限/计数拼装，不含调用方原始值。 */
const SAFE_MESSAGE: Record<WorkspaceInitFailureCode, string> = {
  "invalid-workspace-root": "Rejected: workspaceRoot must be the fixed sandbox workspace root",
  "unknown-strategy": "Rejected: unknown workspace init strategy",
  "invalid-tar-archive":
    "Rejected: tarArchivePath must be a safe absolute host path ending in .tar/.tar.gz/.tgz",
  "tar-archive-too-large": "Rejected: tar archive size is outside the allowed range",
  "invalid-git-bundle": "Rejected: gitBundlePath must be a safe absolute host path ending in .bundle",
  "git-bundle-too-large": "Rejected: git bundle size is outside the allowed range",
  "invalid-base-branch": "Rejected: baseBranch must be a plain safe git branch name",
  "network-not-allowed": "Rejected: gitClone requires an explicit non-empty networkAllow allowlist",
  "invalid-network-allow": "Rejected: networkAllow entries must be bare host names",
  "invalid-repo-url": "Rejected: repoUrl must be an https URL of a public repository",
  "credential-in-url-not-allowed": "Rejected: repoUrl must not embed credentials",
  "credential-auth-not-supported": "Rejected: credential-based git authentication is not supported",
  "invalid-remote-path": "Rejected: derived sandbox remote path failed validation",
  "invalid-argv": "Rejected: generated argv failed the argv whitelist",
};

export interface WorkspaceInitUploadStep {
  kind: "upload";
  remotePath: string;
  localPath: string;
}

export interface WorkspaceInitExecStep {
  kind: "exec";
  argv: string[];
}

export type WorkspaceInitStep = WorkspaceInitUploadStep | WorkspaceInitExecStep;

export type WorkspaceInitPlan =
  | { strategy: "bundle"; steps: [{ kind: "upload"; remotePath: string; localPath: string }, { kind: "exec"; argv: string[] }] }
  | { strategy: "tar"; steps: [{ kind: "upload"; remotePath: string; localPath: string }, { kind: "exec"; argv: string[] }] }
  | { strategy: "empty"; steps: [{ kind: "exec"; argv: string[] }] }
  | { strategy: "gitClone"; steps: [{ kind: "exec"; argv: string[] }] };

export interface WorkspaceInitInput {
  /** "bundle" | "tar" | "empty" | "gitClone"；运行时校验，非列举值一律拒绝。 */
  strategy: string;
  /** 必须严格等于 `WORKSPACE_ROOT`（= 容器默认 cwd `/home/bun/app`）。 */
  workspaceRoot: string;
  /** tar 策略：本地归档路径（宿主机路径，不受 `/workspace` 约束）。 */
  tarArchivePath?: string;
  /**
   * tar 策略可选：调用方 stat 出来的归档字节数。
   * 本模块不读磁盘，只能校验「这个数」；缺省表示调用方自行在 upload 前把关。
   */
  tarArchiveSizeBytes?: number;
  /**
   * bundle 策略：宿主 `git bundle create --all` 产出的自包含仓库包（宿主机路径）。
   * 沙盒 `git clone` 它即得**真实历史 + 全部分支**。
   */
  gitBundlePath?: string;
  /** bundle 策略可选：调用方 stat 出来的 bundle 字节数（本模块不读磁盘）。 */
  gitBundleSizeBytes?: number;
  /** bundle 策略必需：clone 后要 checkout 的 base 分支名（裸 ref 名，不带 `refs/heads/`）。 */
  baseBranch?: string;
  /** gitClone 策略：https 公开仓库 URL（不得内嵌凭证）。 */
  repoUrl?: string;
  /**
   * gitClone 策略必需：出站白名单（裸主机名），非空即表示调用方已显式放行网络。
   * 仅在本函数内充当放行门；plan 不携带它（调用方自行传给 create 的 `--allow-network`）。
   */
  networkAllow?: readonly string[];
  /**
   * 预留字段：需要私有仓库鉴权时的显式凭证传递口。
   * **当前不支持**：一旦出现即拒绝（`credential-auth-not-supported`），绝不静默忽略。
   * TODO(块C-后续)：实现凭证注入（容器内临时凭证文件 / git credential helper），
   * 同时保证任何日志、plan、argv 里都不出现凭证内容；在此之前保持 fail-closed。
   */
  credential?: unknown;
}

export interface WorkspaceInitDeps {
  /** argv 白名单校验器；缺省用执行器同一份 `isValidArgv`（注入是为了测试 fail-closed 门）。 */
  validateArgv?: (argv: readonly string[]) => boolean;
}

export type WorkspaceInitFailure = {
  ok: false;
  code: WorkspaceInitFailureCode;
  message: string;
};

export type WorkspaceInitResolution =
  | { ok: true; plan: WorkspaceInitPlan }
  | WorkspaceInitFailure;

type Resolved<T> = { ok: true; value: T } | WorkspaceInitFailure;

function failure(
  code: WorkspaceInitFailureCode,
  extra?: Record<string, number>,
): WorkspaceInitFailure {
  const base = SAFE_MESSAGE[code];
  // 只接受数值/上限字段：字符串一律不进 message，避免把调用方原始输入（可能是凭证）带出去。
  const parts = extra
    ? Object.entries(extra)
        .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
        .map(([k, v]) => `${k}=${String(v)}`)
    : [];
  return { ok: false, code, message: parts.length > 0 ? `${base} (${parts.join(", ")})` : base };
}

function isWorkspaceInitStrategy(value: unknown): value is WorkspaceInitStrategy {
  return value === "bundle" || value === "tar" || value === "empty" || value === "gitClone";
}

/** POSIX basename（不引 node:path，保持模块零依赖与可移植）。 */
function basenameOf(filePath: string): string {
  const idx = filePath.lastIndexOf("/");
  return idx === -1 ? filePath : filePath.slice(idx + 1);
}

/** 单引号转义：脚本里的每个变量都走这里，绝不裸拼。 */
function shQuote(token: string): string {
  return `'${token.replaceAll("'", `'\\''`)}'`;
}

/**
 * 归档路径校验的**通用实现**（tar 与 git bundle 共用形态规则，只有后缀与失败码不同）。
 * 不读磁盘：只校验形态与调用方 stat 出来的字节数。
 */
function validateArchivePath(
  path: unknown,
  sizeBytes: number | undefined,
  suffixes: readonly string[],
  invalidCode: "invalid-tar-archive" | "invalid-git-bundle",
  tooLargeCode: "tar-archive-too-large" | "git-bundle-too-large",
): { ok: true } | WorkspaceInitFailure {
  if (typeof path !== "string" || path.length === 0) return failure(invalidCode);
  if (path.length > MAX_TAR_ARCHIVE_PATH_CHARS) {
    return failure(invalidCode, { maxChars: MAX_TAR_ARCHIVE_PATH_CHARS });
  }
  if (!TAR_ARCHIVE_PATH_PATTERN.test(path)) return failure(invalidCode);
  if (!path.startsWith("/")) return failure(invalidCode);
  if (path.includes("..") || path.includes("//")) return failure(invalidCode);
  if (!suffixes.some((suffix) => path.endsWith(suffix))) return failure(invalidCode);
  if (!SAFE_ARCHIVE_FILE_NAME_PATTERN.test(basenameOf(path))) return failure(invalidCode);
  if (sizeBytes !== undefined) {
    if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
      return failure(tooLargeCode, { maxBytes: MAX_TAR_ARCHIVE_BYTES });
    }
    if (sizeBytes > MAX_TAR_ARCHIVE_BYTES) {
      return failure(tooLargeCode, { maxBytes: MAX_TAR_ARCHIVE_BYTES });
    }
  }
  return { ok: true };
}

/**
 * tar 归档路径的**纯函数**校验（不读磁盘）。
 * 校验形态与可选的对声明大小：绝对路径、保守字符集、无 `..`/`//`、允许后缀、长度与大小上限。
 * 真实存在性与 stat 由调用方在 upload 前完成（本模块刻意不触盘）。
 */
export function validateTarArchivePath(
  path: unknown,
  sizeBytes?: number,
): { ok: true } | WorkspaceInitFailure {
  return validateArchivePath(
    path,
    sizeBytes,
    TAR_ARCHIVE_SUFFIXES,
    "invalid-tar-archive",
    "tar-archive-too-large",
  );
}

/** git bundle 路径校验：形态规则与 tar 完全一致，仅后缀为 `.bundle`、失败码不同。 */
export function validateGitBundlePath(
  path: unknown,
  sizeBytes?: number,
): { ok: true } | WorkspaceInitFailure {
  return validateArchivePath(
    path,
    sizeBytes,
    BUNDLE_ARCHIVE_SUFFIXES,
    "invalid-git-bundle",
    "git-bundle-too-large",
  );
}

/**
 * 网络放行门：缺失 / 非数组 / 空数组 → `network-not-allowed`；条目非法 → `invalid-network-allow`。
 * 通过返回 null（调用方无需使用返回值：plan 不携带网络信息）。
 */
function checkNetworkAllow(value: unknown): WorkspaceInitFailure | null {
  if (value === undefined || value === null) return failure("network-not-allowed");
  if (!Array.isArray(value) || value.length === 0) return failure("network-not-allowed");
  if (value.length > MAX_NETWORK_ALLOW_ENTRIES) {
    return failure("invalid-network-allow", { maxEntries: MAX_NETWORK_ALLOW_ENTRIES });
  }
  for (const host of value) {
    if (typeof host !== "string" || host.length === 0) return failure("invalid-network-allow");
    if (host.length > MAX_NETWORK_HOST_CHARS) {
      return failure("invalid-network-allow", { maxHostChars: MAX_NETWORK_HOST_CHARS });
    }
    if (!NETWORK_HOST_PATTERN.test(host)) return failure("invalid-network-allow");
  }
  return null;
}

/**
 * base branch（裸 ref 名）校验：保守字符集 + git 明确禁止的形态，全部 fail-closed。
 * 不做任何「猜测式」修正（例如把 `HEAD` 当成 main）：调用方要投真基线就必须说清是哪个分支。
 */
function resolveBaseBranch(value: unknown): Resolved<string> {
  if (typeof value !== "string" || value.length === 0) return failure("invalid-base-branch");
  if (value.length > MAX_BASE_BRANCH_CHARS) return failure("invalid-base-branch");
  if (!BASE_BRANCH_PATTERN.test(value)) return failure("invalid-base-branch");
  if (
    value.includes("..")
    || value.includes("@{")
    || value.includes("//")
    || value.endsWith("/")
    || value.endsWith(".")
    || value.endsWith(".lock")
  ) {
    return failure("invalid-base-branch");
  }
  return { ok: true, value };
}

/** 公开仓库 https URL 校验：任何内嵌凭证 / 凭证式查询参数一律拒绝。 */
function resolvePublicHttpsRepoUrl(value: unknown): Resolved<string> {
  if (typeof value !== "string" || value.trim().length === 0) {
    return failure("invalid-repo-url");
  }
  const raw = value.trim();
  if (raw.length > MAX_REPO_URL_CHARS) return failure("invalid-repo-url");
  if (raw !== value) return failure("invalid-repo-url");
  if (!raw.startsWith("https://")) return failure("invalid-repo-url");
  if (/[\s\0\n\r"'`$\\]/.test(raw)) return failure("invalid-repo-url");

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return failure("invalid-repo-url");
  }
  if (parsed.protocol !== "https:") return failure("invalid-repo-url");
  if (!parsed.hostname || !parsed.hostname.includes(".")) return failure("invalid-repo-url");
  if (parsed.port && parsed.port !== "443") return failure("invalid-repo-url");
  // 凭证边界：userinfo 里出现的任何东西（token 或用户名）都不接受。
  if (parsed.username.length > 0 || parsed.password.length > 0) {
    return failure("credential-in-url-not-allowed");
  }
  if (CREDENTIAL_QUERY_PARAM_PATTERN.test(raw)) {
    return failure("credential-in-url-not-allowed");
  }
  return { ok: true, value: parsed.toString() };
}

function buildTarPlan(input: WorkspaceInitInput): Resolved<WorkspaceInitPlan> {
  const check = validateTarArchivePath(input.tarArchivePath, input.tarArchiveSizeBytes);
  if (!check.ok) return check;

  const localPath = input.tarArchivePath as string;
  const remotePath = `${TAR_ARCHIVE_REMOTE_DIR}/${basenameOf(localPath)}`;
  if (!isValidSandboxPath(remotePath)) return failure("invalid-remote-path");

  const script = `mkdir -p ${shQuote(WORKSPACE_ROOT)} && tar -xzf ${shQuote(remotePath)} -C ${shQuote(WORKSPACE_ROOT)}`;
  return {
    ok: true,
    value: {
      strategy: "tar",
      steps: [
        { kind: "upload", remotePath, localPath },
        { kind: "exec", argv: ["bash", "-lc", script] },
      ],
    },
  };
}

/**
 * bundle 策略（块F2 主路径）：投送 `git bundle create --all` 的自包含包，沙盒内
 * `git clone <bundle>` 得到**真实历史与全部分支**，再显式 `checkout <baseBranch>`。
 *
 * 与 tar 的关键差别：
 * - tar 解包出来的是**单 commit 快照**（无历史、无分支、无法 `git worktree`）；
 * - bundle clone 出来的是**真仓库**（全部分支 + 真基线），agent 能对真基线 diff。
 *
 * 沙盒里必须有 git：`git clone` 就是 git。装 git 的幂等步骤由调用方
 * （`sandboxWorkspaceDelivery.ts` 的 `buildWorkspaceDeliveryExecArgvs`）保证**先于**
 * 本步骤执行（`strategy === "bundle"` → installGit 前置）。
 *
 * 幂等：`<WORKSPACE_ROOT>/.git` 已存在即整体跳过（重复投送不炸、不覆盖 agent 改动历史）。
 * `git clone` 进一个**非空**目录按 git 自身语义显式失败 —— 这里不做静默清理。
 */
function buildBundlePlan(input: WorkspaceInitInput): Resolved<WorkspaceInitPlan> {
  const check = validateGitBundlePath(input.gitBundlePath, input.gitBundleSizeBytes);
  if (!check.ok) return check;
  const base = resolveBaseBranch(input.baseBranch);
  if (!base.ok) return base;

  const localPath = input.gitBundlePath as string;
  const remotePath = `${GIT_BUNDLE_REMOTE_DIR}/${basenameOf(localPath)}`;
  if (!isValidSandboxPath(remotePath)) return failure("invalid-remote-path");

  // argv 白名单禁止换行 → 脚本必须是**单行**（与 buildTarPlan / buildGitClonePlan 同口径）。
  const gitDir = `${WORKSPACE_ROOT}/.git`;
  const script =
    `set -e; mkdir -p ${shQuote(WORKSPACE_ROOT)};`
    + ` if [ -d ${shQuote(gitDir)} ]; then echo 'workspace-git-present-skip-clone';`
    + ` else git clone --quiet ${shQuote(remotePath)} ${shQuote(WORKSPACE_ROOT)}`
    + ` && git -C ${shQuote(WORKSPACE_ROOT)} checkout --quiet ${shQuote(base.value)}; fi`;
  return {
    ok: true,
    value: {
      strategy: "bundle",
      steps: [
        { kind: "upload", remotePath, localPath },
        { kind: "exec", argv: ["bash", "-lc", script] },
      ],
    },
  };
}

function buildEmptyPlan(): Resolved<WorkspaceInitPlan> {
  const script = `mkdir -p ${shQuote(WORKSPACE_ROOT)}`;
  return {
    ok: true,
    value: { strategy: "empty", steps: [{ kind: "exec", argv: ["bash", "-lc", script] }] },
  };
}

function buildGitClonePlan(input: WorkspaceInitInput): Resolved<WorkspaceInitPlan> {
  const networkFailure = checkNetworkAllow(input.networkAllow);
  if (networkFailure) return networkFailure;
  // 显式要求凭证 = 本块未支持的能力：拒绝而不是静默忽略（见 input.credential 的 TODO）。
  if (input.credential !== undefined) return failure("credential-auth-not-supported");

  const repo = resolvePublicHttpsRepoUrl(input.repoUrl);
  if (!repo.ok) return repo;

  // 公共无凭证 clone：URL 与目标目录都经单引号转义后进脚本，绝不裸拼。
  const script = `git clone --depth 1 ${shQuote(repo.value)} ${shQuote(WORKSPACE_ROOT)}`;
  return {
    ok: true,
    value: { strategy: "gitClone", steps: [{ kind: "exec", argv: ["bash", "-lc", script] }] },
  };
}

/**
 * 把 plan 的 steps 转成「可依次执行的 argv 列表」—— 纯函数：
 * 只取出 `exec` 步骤（upload 步骤是 runner.upload/cp 的输入，不是 argv），并返回深拷贝，
 * 调用方改返回值不会污染 plan。
 */
export function buildWorkspaceInitExecArgv(plan: WorkspaceInitPlan): string[][] {
  const argvs: string[][] = [];
  for (const step of plan.steps) {
    if (step.kind === "exec") argvs.push([...step.argv]);
  }
  return argvs;
}

/**
 * 解析初始化策略 → 计划。fail-closed：任何不明/不完整/可疑输入都返回 `ok:false`。
 * 顺序：workspaceRoot → strategy → 策略专属校验 → 最终 argv 白名单（含手工构造企图）。
 */
export function resolveWorkspaceInitPlan(
  input: WorkspaceInitInput,
  deps: WorkspaceInitDeps = {},
): WorkspaceInitResolution {
  if (!input || typeof input !== "object") return failure("invalid-workspace-root");
  if (input.workspaceRoot !== WORKSPACE_ROOT) return failure("invalid-workspace-root");
  if (!isWorkspaceInitStrategy(input.strategy)) return failure("unknown-strategy");

  const built =
    input.strategy === "bundle"
      ? buildBundlePlan(input)
      : input.strategy === "tar"
        ? buildTarPlan(input)
        : input.strategy === "empty"
          ? buildEmptyPlan()
          : buildGitClonePlan(input);
  if (!built.ok) return built;

  const validateArgv = deps.validateArgv ?? isValidArgv;
  for (const argv of buildWorkspaceInitExecArgv(built.value)) {
    if (!validateArgv(argv)) return failure("invalid-argv");
  }
  return { ok: true, plan: built.value };
}
