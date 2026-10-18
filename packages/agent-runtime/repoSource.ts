/**
 * RepoSource —— 代码来源抽象。
 *
 * 一次 agent run 需要在运行前拿到「一份代码」：可能来自 GitHub、平台内建仓库，
 * 也可能是随任务投递过来的打包产物（bundle artifact）。本模块只负责把来源描述
 * 解析成一条可执行的取代码计划（clone URL + 凭据 + ref），而不亲自执行 git。
 *
 * 两条硬约束（安全 / 可靠性，别改）：
 * 1. 只读 token 永远不拼进 cloneUrl：token 只出现在 `auth` 字段里，交给 git 的
 *    credential helper / http.extraHeader 使用。URL 会被日志、进程列表、错误消息
 *    到处打印，token 一旦内联就等于泄露。任何失败信息都过 `redactSecrets`。
 * 3. **成功结果里 `auth.token` 是明文**（它必须交给 git 用）。因此禁止把整份
 *    `ResolvedRepo` 直接写日志：需要落日志时用 `digestForLogs` 或只记 `cloneUrl`
 *    的 host 部分。这条是调用方契约，模块本身无法强制。
 * 2. 没有可用远端时必须**显式降级到打包投送**（bundle delivery），不许静默失败、
 *    也不许返回一个凭据缺失的「看起来能用」的计划：`tryResolveRepoSource` 返回
 *    带 fallback 的失败结果，`resolveRepoSource` 直接抛错并把 fallback 挂在错误上。
 */

export type RepoSource =
  | { kind: "github"; owner: string; repo: string; ref: string }
  | { kind: "builtin"; repoId: string; ref: string }
  | { kind: "bundle"; artifactId: string };

export type RepoAuth =
  | { kind: "basic"; username: string; token: string }
  | { kind: "none" };

export type ResolvedRepo = {
  cloneUrl: string;
  auth?: RepoAuth;
  ref: string;
};

export type RepoCredentials = {
  githubReadToken?: string;
  builtinBaseUrl?: string;
  builtinReadToken?: string;
};

/** 为什么退回到打包投送。调用方可以直接据此选降级路径。 */
export type RepoDegradeReason =
  | "bundle-source"
  | "missing-github-credentials"
  | "missing-builtin-base-url"
  | "missing-builtin-credentials"
  | "invalid-source";

/** 显式降级：这次不 clone，改走打包投送。 */
export type BundleDeliveryFallback = {
  kind: "bundle-delivery";
  reason: RepoDegradeReason;
  /** bundle 来源带 artifactId；其它来源降级时为 undefined（由投递侧另行决定） */
  artifactId?: string;
  /** 已脱敏的人类可读说明，可直接进日志/事件 */
  message: string;
};

export type RepoResolution =
  | { ok: true; repo: ResolvedRepo }
  | { ok: false; fallback: BundleDeliveryFallback };

/** 作为 basic auth 用户名；token 认证下用户名本身不敏感，用固定串保持可预期。 */
const TOKEN_USERNAME = "x-access-token";

/**
 * ref 白名单：git 分支/tag/SHA 的常见字符集。
 * 显式拒绝以 `-` 开头的字符串——那是**选项形**输入（`--upload-pack=...`），
 * 一旦下游把 ref 放在 argv 选项位置就会变成注入面（RV-S1 MEDIUM）。
 */
const SAFE_REF_FORBIDDEN = /[\s\u0000-\u001f~^:?*[\\]/;

export function isSafeRef(ref: string): boolean {
  const trimmed = ref.trim();
  if (!trimmed || trimmed.length > 200) return false;
  // 选项形（`--upload-pack=...`）绝不往下传：这是唯一的"语法注入"面。
  if (trimmed.startsWith("-")) return false;
  // 以下按 git check-ref-format 的真实规则判定，避免把合法 ref 拒掉
  // （`release+fix`、`_release`、`release/2026-10` 都是合法 ref）。
  if (SAFE_REF_FORBIDDEN.test(trimmed)) return false;
  if (trimmed.includes("..") || trimmed.includes("@{") || trimmed.includes("//")) return false;
  if (trimmed.startsWith("/") || trimmed.endsWith("/")) return false;
  if (trimmed.endsWith(".lock") || trimmed.endsWith(".")) return false;
  return true;
}

/**
 * 内建仓库 base URL 的规范化：只接受**https、无 userinfo、无 query/hash** 的裸 origin。
 * 带 `user:token@` 的 URL 会让 token 直接留在 cloneUrl 里（RV-S1 HIGH：那是最容易被
 * 日志/进程列表抓到的位置），`http:` 则会让后续认证走明文。
 */
export function normalizeBuiltinBase(raw: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password) return null;
  if (parsed.search || parsed.hash) return null;
  return `${parsed.origin}${parsed.pathname.replace(/\/+$/, "")}`;
}

/** resolveRepoSource 的失败类型：错误对象上带着显式降级计划，便于 catch 后继续跑。 */
export class RepoSourceResolutionError extends Error {
  readonly reason: RepoDegradeReason;
  readonly fallback: BundleDeliveryFallback;
  /**
   * 只保留**来源类别**，不保留任何标识符。
   * 上一版把 owner/repo 脱敏后放进 error，但短的不透明 token（例如
   * `opaqueSecret123`）匹配不了任何"像凭据"的模式，仍会经
   * `JSON.stringify(error)` 泄漏。正确的解法是**不携带**，而不是"尽量脱敏"。
   */
  readonly sourceKind: RepoSource["kind"];

  constructor(source: RepoSource, fallback: BundleDeliveryFallback) {
    super(fallback.message);
    this.name = "RepoSourceResolutionError";
    this.sourceKind = source.kind;
    this.reason = fallback.reason;
    this.fallback = fallback;
  }
}

/** 只用于日志的稳定摘要：不可逆、不携带原文（避免任何形式的回显）。 */
export function digestForLogs(value: string): string {
  // FNV-1a 32bit：不是安全哈希，只用于"可区分但不可还原"的日志标记。
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index) & 0xff;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `#${hash.toString(16).padStart(8, "0")}`;
}

/** 来源标识的脱敏视图：保留形状与可读性，但抹掉疑似凭据片段。 */
export function redactSource(source: RepoSource): RepoSource {
  const scrub = (value: string): string => {
    if (!value) return value;
    if (/:\/\/|@/.test(value)) return "[redacted]";
    if (/^(gh[pousr]_|github_pat_|glpat-|cfoat_)/.test(value)) return "[redacted]";
    if (value.length > 64) return `${value.slice(0, 8)}…[redacted]`;
    return value;
  };
  if (source.kind === "github") {
    return { kind: "github", owner: scrub(source.owner), repo: scrub(source.repo), ref: scrub(source.ref) };
  }
  if (source.kind === "builtin") {
    return { kind: "builtin", repoId: scrub(source.repoId), ref: scrub(source.ref) };
  }
  return { kind: "bundle", artifactId: scrub(source.artifactId) };
}

/**
 * 把所有已知凭据替换成 `[redacted]`。错误消息按构造只由非敏感片段拼成，
 * 这层是防御性的第二道闸：万一以后有人往 message 里塞了原始输入，也不会漏 token。
 */
export function redactSecrets(text: string, credentials?: RepoCredentials): string {
  if (!credentials) return text;
  const secrets = [
    credentials.githubReadToken,
    credentials.builtinReadToken,
    credentials.builtinBaseUrl,
  ];
  let out = text;
  for (const secret of secrets) {
    if (!secret) continue;
    out = out.split(secret).join("[redacted]");
  }
  return out;
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/** 去掉 base URL 尾部斜杠；只在确实有值时才做。 */
function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "");
}

function joinCloneUrl(base: string, repoId: string): string {
  const trimmed = repoId.trim();
  const withSuffix = trimmed.endsWith(".git") ? trimmed : `${trimmed}.git`;
  return `${base}/${withSuffix}`;
}

function degrade(
  source: RepoSource,
  reason: RepoDegradeReason,
  message: string,
  credentials?: RepoCredentials,
): RepoResolution {
  const fallback: BundleDeliveryFallback = {
    kind: "bundle-delivery",
    reason,
    // artifactId 由平台 ArtifactStore 生成（`runs/<runId>/diff.patch` 形态），
    // 不是用户输入；契约要求调用方不得把外部字符串直接塞进 artifactId。
    artifactId: source.kind === "bundle" ? source.artifactId : undefined,
    message: redactSecrets(message, credentials),
  };
  return { ok: false, fallback };
}

/**
 * 解析代码来源，**不抛异常**。失败一律返回显式降级计划（打包投送）。
 */
export function tryResolveRepoSource(input: {
  source: RepoSource;
  credentials?: RepoCredentials;
}): RepoResolution {
  const { source, credentials } = input;

  if (source.kind === "bundle") {
    // bundle 来源本来就没有远端：直接走打包投送，没有 URL 可给。
    return degrade(
      source,
      "bundle-source",
      "bundle 来源没有远端仓库：改用打包投送（artifact 已随任务投递），不执行 clone。",
      credentials,
    );
  }

  if (source.kind === "github") {
    if (!isNonEmpty(source.owner) || !isNonEmpty(source.repo) || !isNonEmpty(source.ref)) {
      return degrade(
        source,
        "invalid-source",
        "github 来源缺少 owner/repo/ref，无法构造 clone URL：改用打包投送。",
        credentials,
      );
    }
    // 选项形 ref（`--upload-pack=...`）绝不往下传：下游一旦把它放进 argv 选项位置就是注入面。
    if (!isSafeRef(source.ref)) {
      return degrade(
        source,
        "invalid-source",
        `ref 不是合法的分支/tag/SHA（拒绝选项形与非法字符）：改用打包投送。`,
        credentials,
      );
    }
    const token = credentials?.githubReadToken;
    if (!isNonEmpty(token)) {
      // fail-closed：缺只读 token 不构造匿名 URL，也不静默继续。
      return degrade(
        source,
        "missing-github-credentials",
        "缺少 GitHub 只读 token：远端不可用，改用打包投送。",
        credentials,
      );
    }
    const owner = source.owner.trim();
    const repo = source.repo.trim().replace(/\.git$/, "");
    return {
      ok: true,
      repo: {
        // 有意不含 token：凭据放在 auth 字段，由调用方交给 git credential helper。
        cloneUrl: `https://github.com/${owner}/${repo}.git`,
        auth: { kind: "basic", username: TOKEN_USERNAME, token },
        ref: source.ref.trim(),
      },
    };
  }

  // source.kind === "builtin"
  if (!isNonEmpty(source.repoId) || !isNonEmpty(source.ref)) {
    return degrade(
      source,
      "invalid-source",
      "builtin 来源缺少 repoId/ref，无法构造 clone URL：改用打包投送。",
      credentials,
    );
  }
  const rawBaseUrl = credentials?.builtinBaseUrl;
  if (!isNonEmpty(rawBaseUrl)) {
    return degrade(
      source,
      "missing-builtin-base-url",
      "缺少内建仓库 base URL：远端不可用，改用打包投送。",
      credentials,
    );
  }
  // 只接受 https + 无 userinfo + 无 query/hash：带 `user:token@` 的 base 会把凭据
  // 直接留在 cloneUrl 里（RV-S1 HIGH），http 则让后续认证走明文。
  const baseUrl = normalizeBuiltinBase(rawBaseUrl as string);
  if (!baseUrl) {
    return degrade(
      source,
      "invalid-source",
      `内建仓库 base URL 不合法（要求 https、无 userinfo、无 query/hash）：改用打包投送。`,
      credentials,
    );
  }
  if (!isSafeRef(source.ref)) {
    return degrade(
      source,
      "invalid-source",
      `ref 不是合法的分支/tag/SHA（拒绝选项形与非法字符）：改用打包投送。`,
      credentials,
    );
  }
  const builtinToken = credentials?.builtinReadToken;
  if (!isNonEmpty(builtinToken)) {
    return degrade(
      source,
      "missing-builtin-credentials",
      "缺少内建仓库只读 token：远端不可用，改用打包投送。",
      credentials,
    );
  }
  return {
    ok: true,
    repo: {
      cloneUrl: joinCloneUrl(normalizeBaseUrl(baseUrl), source.repoId),
      auth: { kind: "basic", username: TOKEN_USERNAME, token: builtinToken },
      ref: source.ref.trim(),
    },
  };
}

/**
 * `resolveRepoSource` 的 strict 版本：拿不到远端时抛错（错误上带 fallback），
 * 调用方要么 catch 后显式走打包投送，要么让这次 run 明确失败——没有第三种可能。
 *
 * 注意：入参可选 credentials 只用于脱敏；解析所需的凭据从 `credentials` 读。
 */
export function resolveRepoSource(input: {
  source: RepoSource;
  credentials?: RepoCredentials;
}): ResolvedRepo {
  const result = tryResolveRepoSource(input);
  if (result.ok) return result.repo;
  throw new RepoSourceResolutionError(input.source, result.fallback);
}
