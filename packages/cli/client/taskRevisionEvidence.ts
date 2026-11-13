import { createHash } from "node:crypto";
import { closeSync, lstatSync, openSync, readSync, readlinkSync, realpathSync } from "node:fs";
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import type { Readable } from "node:stream";
import { readPipeText, spawnProcess } from "../processSpawn";

/**
 * 任务 revision 证据采集（无索引副作用）。
 *
 * 目标：给定「任务路径 allowlist + 基线 commit」，把该任务在基线之上的完整改动
 * （staged / unstaged / untracked / 删除 / 模式位 / 二进制 / 重命名 / 符号链接）
 * 采集成一份可复核的证据，同时做到：
 *  - 不写 git 索引：所有 git 调用带 GIT_OPTIONAL_LOCKS=0，只用只读 plumbing
 *    （rev-parse / diff / ls-files / ls-tree / cat-file），绝不 add / update-index / status；
 *  - 不纳入非任务脏文件：allowlist 之外的文件不进证据，只计入 excludedDirtyPathCount，
 *    不改变本任务的 complete 结论（那属于别人的改动，不是本任务的问题）；
 *    只有条目自身的解析/认证失败才让 complete=false（fail closed）。
 *  - 不追随越界 symlink：链接真实路径经 realpath（含父目录）解析，越出仓库即显式失败；
 *  - 不读取凭据文件：路径命中凭据特征即拒绝读取内容，只给显式拒绝记录；
 *    硬链接别名（nlink > 1）同样拒读——无法确认它是否指向别处的凭据文件。
 *
 * hash 口径：对「实际读到的字节」做 sha256。普通文件读文件内容；symlink 读**链接文本**
 * （与 git 的 120000 blob 内容一致），因此 baseline / index / worktree 三列同域可比。
 *
 * 保证边界（下游不得把 complete:true 当成绝对完整）：
 *  - 凭据识别是**启发式**（路径特征），不是内容扫描；硬链接别名无法从路径特征识别。
 *  - 冲突条目（index 多 stage）、子模块（gitlink）、工作树里变成目录的条目都无法认证
 *    内容，一律记为显式失败（complete=false），不给「看起来完整」的空 hash。
 *  - entriesDigest 绑定 baseline 的 resolvedSha、条目、complete 与真实 failures，
 *    不含时间戳/绝对路径，可跨次/跨机比较。
 */

export const TASK_REVISION_HASH_ALGORITHM = "sha256";

export type TaskRevisionChangeKind =
  | "untracked"
  | "added"
  | "modified"
  | "deleted"
  | "renamed"
  | "copied"
  | "type-changed"
  | "unchanged";

export type TaskRevisionEntry = {
  /** 仓库相对路径（POSIX 分隔符）。 */
  path: string;
  /** 重命名 / 复制时的旧路径。 */
  previousPath?: string;
  changeKind: TaskRevisionChangeKind;
  /** 索引相对基线有变化（已 staged）。 */
  staged: boolean;
  /** 工作树相对索引有变化（未 staged）。 */
  unstaged: boolean;
  /** 未被 git 跟踪。 */
  untracked: boolean;
  baselineMode: string | null;
  indexMode: string | null;
  worktreeMode: string | null;
  /** 基线 blob 字节的 sha256（symlink 时为链接文本的 sha256）。 */
  baselineHash: string | null;
  /** 索引 blob 字节的 sha256（symlink 时为链接文本的 sha256）。 */
  indexHash: string | null;
  /** 工作树字节的 sha256（symlink 时为链接文本的 sha256）。 */
  worktreeHash: string | null;
  binary: boolean;
  /** symlink 链接文本的 sha256（与 worktreeHash 相同，单独列出便于审计）。 */
  linkTextHash?: string;
  /** symlink 目标内容的 sha256（仅在目标在仓库内且属于 allowlist 且未被拒绝时才有）。 */
  symlinkTargetHash?: string;
  symlinkTarget?: string;
  /** 是否真的读取了 symlink 目标内容。 */
  followedSymlink?: boolean;
  /** symlink 目标真实路径越出仓库。 */
  outOfScopeSymlink?: boolean;
  /** symlink 目标在仓库内但不在 allowlist 范围（未读取其内容）。 */
  symlinkTargetOutOfScope?: boolean;
  /** symlink 目标命中凭据特征（未读取其内容）。 */
  credentialTarget?: boolean;
  /** 路径命中凭据特征，未读取内容。 */
  credentialLike?: boolean;
  /** 文件硬链接数 > 1（可能是别处的别名；内容仍按路径读取）。 */
  hardLinkAlias?: boolean;
  /** 该条目未拿到完整 hash 时的显式原因。 */
  error?: string;
};

export type TaskRevisionFailure = {
  path: string;
  reason: string;
  detail?: string;
};

export type TaskRevisionEvidence = {
  cwd: string;
  repoRoot: string;
  baseline: { requested: string; resolvedSha: string };
  collectedAt: string;
  /** 是否所有条目都拿到了完整证据（false 表示有显式失败项）。 */
  complete: boolean;
  entries: TaskRevisionEntry[];
  failures: TaskRevisionFailure[];
  /** allowlist 之外被排除的脏文件数量（只计数，不入证据）。 */
  excludedDirtyPathCount: number;
  /** 与机器/时间无关的稳定摘要：条目内容（路径+hash+标记）的 sha256。 */
  entriesDigest: string;
};

export type TaskRevisionEvidenceOptions = {
  /** 采集时的当前工作目录（应是任务 worktree）。 */
  cwd: string;
  /** 任务路径 allowlist（仓库相对或绝对路径；文件或目录均可）。必填。 */
  taskPaths: string[];
  /** 基线 commit（sha 或 ref）。必填——必须由调用方显式给出，不允许隐式默认。 */
  baseline: string;
};

const GIT_TIMEOUT_MS = 30_000;
const BINARY_SNIFF_BYTES = 8000;
const HASH_CHUNK_BYTES = 1024 * 1024;

/**
 * 凭据特征（启发式，非内容扫描）：命中即拒绝读取内容。
 * 覆盖 `.env*` / `*.env` / `.envrc` / `.pgpass` / 私钥与证书 / 常见凭据 JSON/YAML 等。
 */
const CREDENTIAL_PATTERNS: RegExp[] = [
  /(^|\/)\.env(\.[^/]*)?$/i,
  /(^|\/)\.env[-_][^/]*$/i,
  /(^|\/)[^/]*\.env([-_.][^/]*)?$/i,
  /(^|\/)\.envrc$/i,
  /(^|\/)\.netrc$/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.pypirc$/i,
  /(^|\/)\.pgpass$/i,
  /(^|\/)\.git-credentials$/i,
  /(^|\/)\.htpasswd$/i,
  /(^|\/)\.docker\/config\.json$/i,
  /(^|\/)\.kube\/config$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i,
  /\.(pem|key|p12|pfx|jks|keystore|ppk|asc)$/i,
  /(^|\/)(credentials|secrets?|service[-_]?account|service[-_]?key|token|tokens|apikey|api[-_]?key)s?\.(json|ya?ml|toml)$/i,
  /(^|\/)\.aws\/credentials$/i,
  /(^|\/)\.config\/gcloud\/[^\/]*\.json$/i,
];

/** git 环境里必须清掉的变量：指向别处的仓库/对象/配置，以及会改写证据形状的配置注入。 */
const GIT_ENV_DROP_KEYS = [
  "GIT_DIR",
  "GIT_WORK_TREE",
  "GIT_INDEX_FILE",
  "GIT_COMMON_DIR",
  "GIT_OBJECT_DIRECTORY",
  "GIT_ALTERNATE_OBJECT_DIRECTORIES",
  "GIT_CEILING_DIRECTORIES",
  "GIT_NAMESPACE",
  "GIT_CONFIG",
  "GIT_CONFIG_COUNT",
  "GIT_CONFIG_PARAMETERS",
  "GIT_CONFIG_KEY_0",
  "GIT_CONFIG_VALUE_0",
  "GIT_REPLACE_REF_BASE",
  "GIT_SHALLOW_FILE",
  "GIT_ATTR_NOSYSTEM",
];

export function isCredentialLikePath(repoRelativePath: string): boolean {
  const normalized = repoRelativePath.replace(/\\/g, "/");
  return CREDENTIAL_PATTERNS.some((pattern) => pattern.test(normalized));
}

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

function errorCode(error: unknown): string | null {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return typeof code === "string" ? code : null;
}

function sha256(bytes: Buffer | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function looksBinary(bytes: Buffer): boolean {
  const limit = Math.min(bytes.length, BINARY_SNIFF_BYTES);
  for (let index = 0; index < limit; index += 1) {
    if (bytes[index] === 0) return true;
  }
  return false;
}

/** 流式计算文件 sha256（不把整个文件读进内存，避免大文件内存尖峰）。 */
function hashFileStreaming(absPath: string): { hash: string; binary: boolean; size: number } {
  const fd = openSync(absPath, "r");
  try {
    const head = Buffer.alloc(BINARY_SNIFF_BYTES);
    const headRead = readSync(fd, head, 0, BINARY_SNIFF_BYTES, null);
    const sniff = head.subarray(0, headRead);
    const hash = createHash("sha256");
    hash.update(sniff);
    let size = headRead;
    const chunk = Buffer.alloc(HASH_CHUNK_BYTES);
    for (;;) {
      const read = readSync(fd, chunk, 0, chunk.length, null);
      if (read <= 0) break;
      hash.update(chunk.subarray(0, read));
      size += read;
    }
    return { hash: hash.digest("hex"), binary: looksBinary(sniff), size };
  } finally {
    closeSync(fd);
  }
}

/**
 * git 子进程环境：
 *  - 清掉可能指向别处的仓库/对象/配置变量（否则 replace ref、namespace、全局配置都能改写证据）；
 *  - GIT_OPTIONAL_LOCKS=0：git 不取「可选锁」，即不因 stat 刷新而写回 .git/index；
 *  - GIT_CONFIG_GLOBAL/SYSTEM=/dev/null：证据形状不随本机 git 配置漂移。
 */
function gitEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") env[key] = value;
  }
  for (const key of GIT_ENV_DROP_KEYS) delete env[key];
  env.GIT_OPTIONAL_LOCKS = "0";
  env.GIT_TERMINAL_PROMPT = "0";
  env.GIT_CONFIG_GLOBAL = "/dev/null";
  env.GIT_CONFIG_SYSTEM = "/dev/null";
  env.LC_ALL = "C";
  return env;
}

/** git 命令前缀：禁用外部 diff/textconv，并显式信任目标仓库所有权（全局配置已隔离）。 */
function gitArgs(args: string[]): string[] {
  // safe.directory=*：全局/系统配置已被隔离（否则 safe.directory 例外也会被抹掉），
  // 采集器读取的是调用方显式指定的仓库，故显式豁免所有权检查，避免在 CI/容器里误失败。
  return ["-c", "safe.directory=*", "-c", "diff.renames=copies", "-c", "diff.noprefix=false", ...args];
}

async function readPipeBytes(stream: Readable | null): Promise<Buffer> {
  if (!stream) return Buffer.alloc(0);
  const anyStream = stream as any;
  const chunks: Buffer[] = [];
  if (typeof anyStream[Symbol.asyncIterator] === "function") {
    for await (const chunk of anyStream as AsyncIterable<unknown>) {
      if (typeof chunk === "string") chunks.push(Buffer.from(chunk, "utf8"));
      else if (chunk instanceof Uint8Array) chunks.push(Buffer.from(chunk));
      else chunks.push(Buffer.from(String(chunk ?? ""), "utf8"));
    }
    return Buffer.concat(chunks);
  }
  return new Promise<Buffer>((resolvePromise) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolvePromise(Buffer.concat(chunks));
    };
    stream.on("data", (chunk: Buffer | string) => {
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk, "utf8") : Buffer.from(chunk));
    });
    stream.on("end", finish);
    stream.on("close", finish);
    stream.on("error", finish);
  });
}

type GitResult = { exitCode: number; stdout: Buffer; stderr: string };

async function runGit(args: string[], cwd: string): Promise<GitResult> {
  const proc = spawnProcess({
    cmd: ["git", ...gitArgs(args)],
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    stdin: "ignore",
    env: gitEnv(),
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    readPipeBytes(proc.stdout),
    readPipeText(proc.stderr),
    new Promise<number>((resolvePromise) => {
      const timer = setTimeout(() => {
        proc.kill();
        resolvePromise(-1);
      }, GIT_TIMEOUT_MS);
      void proc.exited.then((code) => {
        clearTimeout(timer);
        resolvePromise(code);
      });
    }),
  ]);
  return { exitCode, stdout, stderr };
}

async function gitText(args: string[], cwd: string): Promise<string> {
  const result = await runGit(args, cwd);
  if (result.exitCode !== 0) {
    throw new Error(`git ${args.join(" ")} failed (exit ${result.exitCode}): ${result.stderr.trim()}`);
  }
  return result.stdout.toString("utf8");
}

type NameStatus = { status: string; path: string; previousPath?: string };

function parseNameStatusZ(text: string): NameStatus[] {
  const fields = text.split("\0");
  const out: NameStatus[] = [];
  let index = 0;
  while (index < fields.length) {
    const status = fields[index];
    if (!status) {
      index += 1;
      continue;
    }
    const letter = status[0];
    if (letter === "R" || letter === "C") {
      const previousPath = fields[index + 1];
      const path = fields[index + 2];
      if (!previousPath || !path) break;
      out.push({ status: letter, path, previousPath });
      index += 3;
      continue;
    }
    const path = fields[index + 1];
    if (!path) break;
    out.push({ status: letter, path });
    index += 2;
  }
  return out;
}

type TreeEntry = { mode: string; sha: string };

function parseLsTreeZ(text: string): Map<string, TreeEntry> {
  const map = new Map<string, TreeEntry>();
  for (const record of text.split("\0")) {
    if (!record) continue;
    const tabIndex = record.indexOf("\t");
    if (tabIndex < 0) continue;
    const meta = record.slice(0, tabIndex).split(" ");
    const path = record.slice(tabIndex + 1);
    if (meta.length < 3 || !path) continue;
    map.set(path, { mode: meta[0], sha: meta[2] });
  }
  return map;
}

function parseLsFilesZ(text: string): Map<string, TreeEntry> {
  const map = new Map<string, TreeEntry>();
  for (const record of text.split("\0")) {
    if (!record) continue;
    const tabIndex = record.indexOf("\t");
    if (tabIndex < 0) continue;
    const meta = record.slice(0, tabIndex).split(" ");
    const path = record.slice(tabIndex + 1);
    if (meta.length < 3 || !path) continue;
    if (meta[2] !== "0") continue; // 冲突条目（stage > 0）不作为稳定证据
    map.set(path, { mode: meta[0], sha: meta[1] });
  }
  return map;
}

/** 未合并（冲突）路径：多 stage，无法认证内容。 */
function parseUnmergedPaths(text: string): Set<string> {
  const paths = new Set<string>();
  for (const record of text.split("\0")) {
    if (!record) continue;
    const tabIndex = record.indexOf("\t");
    if (tabIndex < 0) continue;
    paths.add(record.slice(tabIndex + 1));
  }
  return paths;
}

function toPosixRelative(repoRoot: string, absolutePath: string): string | null {
  const rel = relative(repoRoot, absolutePath);
  if (!rel || rel.startsWith("..")) return null;
  return rel.split("\\").join("/");
}

function isInsideDir(root: string, candidate: string): boolean {
  if (candidate === root) return true;
  return candidate.startsWith(root.endsWith(sep) ? root : `${root}${sep}`);
}

/**
 * 解析真实路径：先 realpath 已存在的最深祖先（会解开中间的目录 symlink），
 * 再把剩余段按字面拼回去。返回 null 表示无法确认真实路径。
 */
function realpathBounded(absPath: string): string | null {
  let current = resolve(absPath);
  const rest: string[] = [];
  for (;;) {
    try {
      const real = realpathSync(current);
      return rest.length ? join(real, ...rest) : real;
    } catch (error) {
      const code = errorCode(error);
      if (code !== "ENOENT" && code !== "ENOTDIR") return null;
      const parent = dirname(current);
      if (parent === current) return null;
      rest.unshift(basename(current));
      current = parent;
    }
  }
}

function modeType(mode: string | null): string | null {
  if (!mode) return null;
  if (mode === "120000") return "symlink";
  if (mode === "160000") return "gitlink";
  if (mode === "040000") return "tree";
  if (mode.startsWith("100")) return "file";
  return "other";
}

type Scope = {
  /** 仓库相对（词法）路径前缀。 */
  lexical: string[];
  /** 真实路径前缀（realpath 解析后）。 */
  real: string[];
};

function normalizeScopePaths(args: {
  repoRoot: string;
  repoRootReal: string;
  taskPaths: string[];
}): Scope {
  const lexical: string[] = [];
  const real: string[] = [];
  for (const raw of args.taskPaths) {
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const absolute = isAbsolute(trimmed) ? resolve(trimmed) : resolve(args.repoRoot, trimmed);
    const rel = relative(args.repoRoot, absolute);
    if (rel.startsWith("..")) {
      throw new Error(`task path escapes repository root: ${raw}`);
    }
    // rel 为空 = allowlist 指向仓库根本身：scope 用 "" 表示「整个仓库」。
    const relativePath = rel === "" ? "" : rel.split("\\").join("/");
    lexical.push(relativePath);
    const realPath = realpathBounded(absolute);
    // 真实路径越出仓库的 scope 保留下来（不抛错）：该 scope 下的条目会逐条显式失败。
    real.push(realPath ?? absolute);
  }
  if (lexical.length === 0) {
    throw new Error("taskPaths allowlist is required: no task path given");
  }
  return { lexical, real };
}

function isWithinScope(repoRelativePath: string, scopes: string[]): boolean {
  return scopes.some((scope) => {
    if (scope === "") return true; // allowlist 指向仓库根
    if (repoRelativePath === scope) return true;
    return repoRelativePath.startsWith(scope.endsWith("/") ? scope : `${scope}/`);
  });
}

function isWithinRealScope(realPath: string, scopes: string[]): boolean {
  return scopes.some((scope) => isInsideDir(scope, realPath));
}

type HashedContent = { hash: string; binary: boolean };

async function hashGitBlob(args: {
  repoRoot: string;
  sha: string;
}): Promise<HashedContent> {
  const result = await runGit(["cat-file", "blob", args.sha], args.repoRoot);
  if (result.exitCode !== 0) {
    throw new Error(`git cat-file blob ${args.sha} failed: ${result.stderr.trim()}`);
  }
  return { hash: sha256(result.stdout), binary: looksBinary(result.stdout) };
}

/** 基线解析：拒绝以 `-` 开头或含控制字符的输入，并用 --end-of-options 阻断选项注入。 */
function assertSafeBaseline(baseline: string): void {
  if (baseline.startsWith("-")) {
    throw new Error(`baseline must not be parsed as a git option: ${baseline}`);
  }
  for (const char of baseline) {
    const code = char.codePointAt(0) ?? 0;
    if (code <= 0x20 || code === 0x7f) {
      throw new Error("baseline must not contain control characters or whitespace");
    }
  }
}

function isHexSha(value: string): boolean {
  return /^[0-9a-f]{40}$/.test(value) || /^[0-9a-f]{64}$/.test(value);
}

/**
 * 条目摘要：与机器、时间无关，用于跨次/跨机比较证据形状。
 * 绑定 baseline 的 resolvedSha 与全部安全标记（硬链接别名、凭据、越界 symlink、
 * 范围外目标、失败原因）——任一项不同，摘要必须不同。
 */
export function computeTaskRevisionEntriesDigest(
  entries: TaskRevisionEntry[],
  baselineSha: string,
  outcome: { complete: boolean; failures: TaskRevisionFailure[] }
): string {
  const canonicalEntries = entries.map((entry) => ({
    path: entry.path,
    previousPath: entry.previousPath ?? null,
    changeKind: entry.changeKind,
    staged: entry.staged,
    unstaged: entry.unstaged,
    untracked: entry.untracked,
    baselineMode: entry.baselineMode,
    indexMode: entry.indexMode,
    worktreeMode: entry.worktreeMode,
    baselineHash: entry.baselineHash,
    indexHash: entry.indexHash,
    worktreeHash: entry.worktreeHash,
    linkTextHash: entry.linkTextHash ?? null,
    symlinkTargetHash: entry.symlinkTargetHash ?? null,
    binary: entry.binary,
    error: entry.error ?? null,
    hardLinkAlias: entry.hardLinkAlias ?? false,
    credentialLike: entry.credentialLike ?? false,
    outOfScopeSymlink: entry.outOfScopeSymlink ?? false,
    symlinkTargetOutOfScope: entry.symlinkTargetOutOfScope ?? false,
    followedSymlink: entry.followedSymlink ?? false,
  }));
  // 绑定 baseline、条目、结论与真实 failures（不含时间戳/绝对路径；范围外脏文件计数
  // 不是本任务的 revision 来源，不进摘要）。
  return sha256(
    JSON.stringify({
      baselineSha,
      complete: outcome.complete,
      failures: outcome.failures.map((failure) => ({ path: failure.path, reason: failure.reason })),
      entries: canonicalEntries,
    })
  );
}
/**
 * 采集任务 revision 证据。
 *
 * 失败口径：
 *  - 入参缺失（taskPaths / baseline 为空）→ 直接 throw（不返回半成品）。
 *  - cwd 不在 git 仓库 / 基线无法解析 → 直接 throw。
 *  - 单个路径拿不到完整 hash（凭据文件、越界 symlink、真实路径越界、冲突、子模块、
 *    工作树类型冲突、读取失败）→ 该条目 error + failures 记录，evidence.complete=false；
 *    绝不返回「看起来完整但少算了内容」的证据。
 */
export async function collectTaskRevisionEvidence(
  options: TaskRevisionEvidenceOptions
): Promise<TaskRevisionEvidence> {
  const cwd = resolve(options.cwd);
  const requestedBaseline = (options.baseline ?? "").trim();
  if (!requestedBaseline) {
    throw new Error("baseline is required: caller must pass an explicit baseline commit");
  }
  if (!Array.isArray(options.taskPaths) || options.taskPaths.length === 0) {
    throw new Error("taskPaths allowlist is required: caller must pass the task-owned paths");
  }
  assertSafeBaseline(requestedBaseline);

  const repoRootText = await gitText(["rev-parse", "--show-toplevel"], cwd);
  const repoRoot = resolve(repoRootText.trim());
  const repoRootReal = realpathSync(repoRoot);
  const scopes = normalizeScopePaths({ repoRoot, repoRootReal, taskPaths: options.taskPaths });

  const baselineSha = (
    await gitText(["rev-parse", "--verify", "--end-of-options", `${requestedBaseline}^{commit}`], cwd)
  ).trim();
  if (!isHexSha(baselineSha)) {
    throw new Error(`baseline did not resolve to a commit object id: ${requestedBaseline}`);
  }

  const [baselineDiffText, stagedDiffText, unstagedDiffText, untrackedText, indexText, treeText, unmergedText] =
    await Promise.all([
      gitText(["diff", "--no-ext-diff", "--no-textconv", "--find-copies-harder", "--name-status", "-z", baselineSha, "--"], cwd),
      gitText(["diff", "--no-ext-diff", "--no-textconv", "--find-copies-harder", "--cached", "--name-status", "-z", baselineSha, "--"], cwd),
      gitText(["diff", "--no-ext-diff", "--no-textconv", "--find-copies-harder", "--name-status", "-z"], cwd),
      gitText(["ls-files", "--others", "--exclude-standard", "-z"], cwd),
      gitText(["ls-files", "-s", "-z"], cwd),
      gitText(["ls-tree", "-r", "-z", baselineSha], cwd),
      gitText(["ls-files", "-u", "-z"], cwd),
    ]);

  const baselineDiff = parseNameStatusZ(baselineDiffText);
  const stagedDiff = parseNameStatusZ(stagedDiffText);
  const unstagedDiff = parseNameStatusZ(unstagedDiffText);
  const indexEntries = parseLsFilesZ(indexText);
  const baselineTree = parseLsTreeZ(treeText);
  const unmergedPaths = parseUnmergedPaths(unmergedText);

  type Candidate = {
    path: string;
    previousPath?: string;
    /** 基线 → 工作树 的 diff 状态（整体视角）。 */
    baselineStatus?: string;
    /** 基线 → 索引 的 diff 状态（staged 视角）。 */
    stagedStatus?: string;
    /** 索引 → 工作树 的 diff 状态（unstaged 视角）。 */
    unstagedStatus?: string;
    untracked: boolean;
  };
  const candidates = new Map<string, Candidate>();
  const ensure = (path: string): Candidate => {
    const existing = candidates.get(path);
    if (existing) return existing;
    const created: Candidate = { path, untracked: false };
    candidates.set(path, created);
    return created;
  };

  for (const item of baselineDiff) {
    const candidate = ensure(item.path);
    candidate.baselineStatus = item.status;
    if (item.previousPath) candidate.previousPath = item.previousPath;
  }
  for (const item of stagedDiff) {
    const candidate = ensure(item.path);
    candidate.stagedStatus = item.status;
    if (item.previousPath) candidate.previousPath = item.previousPath;
  }
  for (const item of unstagedDiff) {
    const candidate = ensure(item.path);
    candidate.unstagedStatus = item.status;
    if (item.previousPath) candidate.previousPath = item.previousPath;
  }
  for (const path of untrackedText.split("\0")) {
    if (!path) continue;
    const candidate = ensure(path);
    candidate.untracked = true;
  }
  // 冲突条目（index 多 stage）内容无法认证：即使 diff 没列出，也要作为候选进入证据并显式失败。
  for (const path of unmergedPaths) {
    const candidate = ensure(path);
    candidate.stagedStatus = candidate.stagedStatus ?? "U";
    candidate.unstagedStatus = candidate.unstagedStatus ?? "U";
  }

  const failures: TaskRevisionFailure[] = [];
  const entries: TaskRevisionEntry[] = [];
  let excludedDirtyPathCount = 0;

  const sortedPaths = [...candidates.keys()].sort();
  for (const path of sortedPaths) {
    const absolutePath = resolve(repoRoot, path);
    // 词法范围或真实范围命中即算在任务内：allowlist 指向 symlink 目录时不能静默空证据。
    const lexicalMatch = isWithinScope(path, scopes.lexical);
    const realMatch = lexicalMatch
      ? true
      : isWithinRealScope(realpathBounded(absolutePath) ?? "", scopes.real);
    if (!realMatch) {
      excludedDirtyPathCount += 1;
      continue;
    }
    const candidate = candidates.get(path)!;
    const baselineEntry = baselineTree.get(path) ?? null;
    const indexEntry = indexEntries.get(path) ?? null;
    let worktreeMode: string | null = null;
    let worktreeHash: string | null = null;
    let worktreeBinary = false;
    let linkTextHash: string | undefined;
    let symlinkTargetHash: string | undefined;
    let symlinkTarget: string | undefined;
    let followedSymlink: boolean | undefined;
    let outOfScopeSymlink: boolean | undefined;
    let symlinkTargetOutOfScope: boolean | undefined;
    let credentialTarget: boolean | undefined;
    let credentialLike = false;
    let hardLinkAlias: boolean | undefined;
    let isGitlink = false;
    let entryError: string | undefined;

    let worktreeExists = false;
    let worktreeIsSymlink = false;
    let worktreeIsDirectory = false;
    let worktreeLinks = 1;
    try {
      const stats = lstatSync(absolutePath);
      worktreeExists = true;
      worktreeIsSymlink = stats.isSymbolicLink();
      worktreeIsDirectory = stats.isDirectory();
      worktreeLinks = stats.nlink;
      worktreeMode = worktreeIsSymlink
        ? "120000"
        : stats.isDirectory()
          ? "040000"
          : stats.mode & 0o111
            ? "100755"
            : "100644";
    } catch (error) {
      const code = errorCode(error);
      if (code !== "ENOENT") {
        // lstat 失败 ≠ 文件被删除：无法认证状态 → 显式失败。
        entryError = `worktree-stat-failed: ${code ?? toMessage(error)}`;
      }
      worktreeExists = false;
    }

    if (worktreeLinks > 1) hardLinkAlias = true;

    if (unmergedPaths.has(path)) {
      entryError = "unmerged-index-entry";
    } else if (isCredentialLikePath(path)) {
      credentialLike = true;
      entryError = "credential-file-refused";
    } else if (modeType(baselineEntry?.mode ?? null) === "gitlink" || modeType(indexEntry?.mode ?? null) === "gitlink") {
      entryError = "gitlink-entry-not-hashable";
      isGitlink = true;
    } else if (worktreeIsDirectory) {
      entryError = "worktree-directory-not-hashable";
    } else if (worktreeIsSymlink) {
      // symlink：worktreeHash 绑**链接文本**（与 git 的 120000 blob 同域）。
      // readlink 可能因竞态失败（lstat 之后链接被替换/删除）→ 显式失败，不让异常抛穿整个采集。
      let linkTarget: string | undefined;
      try {
        linkTarget = readlinkSync(absolutePath);
      } catch (error) {
        linkTarget = undefined;
        entryError = `symlink-read-failed: ${toMessage(error)}`;
      }
      if (linkTarget !== undefined) {
        symlinkTarget = linkTarget;
        const linkTextHashValue = sha256(Buffer.from(linkTarget, "utf8"));
        linkTextHash = linkTextHashValue;
        worktreeHash = linkTextHashValue;

        const targetAbsolute = resolve(dirname(absolutePath), linkTarget);
        const targetReal = realpathBounded(targetAbsolute);
        if (!targetReal || !isInsideDir(repoRootReal, targetReal)) {
          outOfScopeSymlink = true;
          followedSymlink = false;
          entryError = "out-of-scope-symlink";
        } else {
          const targetRelative = toPosixRelative(repoRootReal, targetReal);
          if (!targetRelative || isCredentialLikePath(targetRelative)) {
            credentialTarget = true;
            followedSymlink = false;
            entryError = "credential-target-refused";
          } else if (!isWithinRealScope(targetReal, scopes.real)) {
            // 目标在仓库内但不在本任务范围：不读它的内容（链接文本哈希已足够作为证据）。
            symlinkTargetOutOfScope = true;
            followedSymlink = false;
          } else {
            try {
              const targetStats = lstatSync(targetReal);
              if (targetStats.isDirectory()) {
                followedSymlink = false;
                entryError = "symlink-target-is-directory";
              } else {
                const hashed = hashFileStreaming(targetReal);
                symlinkTargetHash = hashed.hash;
                worktreeBinary = hashed.binary;
                followedSymlink = true;
              }
            } catch (error) {
              followedSymlink = false;
              entryError = `symlink-target-unreadable: ${toMessage(error)}`;
            }
          }
        }
      }
    } else if (worktreeExists) {
      if (worktreeLinks > 1) {
        // 硬链接别名：同一 inode 可能在别处（甚至指向凭据文件），无法确认 → 不读内容，显式失败。
        entryError = "hard-link-alias-refused";
      } else {
        // 真实路径校验：父目录 symlink 会在这里被 realpath 解开后暴露。
        const realPath = realpathBounded(absolutePath);
        if (!realPath || !isInsideDir(repoRootReal, realPath)) {
          entryError = "out-of-repo-realpath";
        } else if (!isWithinRealScope(realPath, scopes.real)) {
          entryError = "out-of-scope-realpath";
        } else {
          try {
            // 校验后读**真实路径**（不是词法路径）：避免校验与读取之间的替换竞态（TOCTOU）。
            const hashed = hashFileStreaming(realPath);
            worktreeHash = hashed.hash;
            worktreeBinary = hashed.binary;
          } catch (error) {
            entryError = `worktree-unreadable: ${toMessage(error)}`;
          }
        }
      }
    }

    // 基线 / 索引 blob 哈希：两个来源并行取，任何一个失败都记为显式失败（不覆盖首个原因）。
    const skipBlobRead = credentialLike || isGitlink;
    const readBlob = async (
      sha: string
    ): Promise<{ hash?: string; binary?: boolean; error?: unknown }> => {
      try {
        const hashed = await hashGitBlob({ repoRoot, sha });
        return { hash: hashed.hash, binary: hashed.binary };
      } catch (error) {
        return { error };
      }
    };
    const [baselineBlob, indexBlob] = await Promise.all([
      baselineEntry && !skipBlobRead ? readBlob(baselineEntry.sha) : Promise.resolve(null),
      indexEntry && !skipBlobRead ? readBlob(indexEntry.sha) : Promise.resolve(null),
    ]);

    let baselineHash: string | null = null;
    let baselineBinary = false;
    if (baselineBlob) {
      if (baselineBlob.error !== undefined) {
        entryError = entryError ?? `baseline-blob-unreadable: ${toMessage(baselineBlob.error)}`;
      } else {
        baselineHash = baselineBlob.hash ?? null;
        baselineBinary = baselineBlob.binary ?? false;
      }
    }

    let indexHash: string | null = null;
    let indexBinary = false;
    if (indexBlob) {
      if (indexBlob.error !== undefined) {
        entryError = entryError ?? `index-blob-unreadable: ${toMessage(indexBlob.error)}`;
      } else {
        indexHash = indexBlob.hash ?? null;
        indexBinary = indexBlob.binary ?? false;
      }
    }

    // staged / unstaged 以 git 自身的两个 diff 视角为准（索引 vs 基线 / 工作树 vs 索引），
    // 避免把「基线 vs 工作树」的整体差异误算成 staged。
    const staged = candidate.stagedStatus !== undefined;
    const unstaged = candidate.unstagedStatus !== undefined || candidate.untracked;

    const baselineType = modeType(baselineEntry?.mode ?? null);
    const worktreeType = modeType(worktreeMode);
    let changeKind: TaskRevisionChangeKind = "modified";
    if (candidate.untracked && !baselineEntry && !indexEntry) {
      changeKind = "untracked";
    } else if (baselineEntry && !worktreeExists && worktreeType !== "tree") {
      changeKind = "deleted";
    } else if (candidate.previousPath) {
      const renameStatus =
        candidate.stagedStatus ?? candidate.unstagedStatus ?? candidate.baselineStatus ?? "";
      changeKind = renameStatus.startsWith("C") ? "copied" : "renamed";
    } else if (!baselineEntry) {
      changeKind = "added";
    } else if (baselineType && worktreeType && baselineType !== worktreeType) {
      changeKind = "type-changed";
    } else if (!staged && !unstaged) {
      changeKind = "unchanged";
    }

    const entry: TaskRevisionEntry = {
      path,
      ...(candidate.previousPath ? { previousPath: candidate.previousPath } : {}),
      changeKind,
      staged,
      unstaged,
      untracked: candidate.untracked,
      baselineMode: baselineEntry?.mode ?? null,
      indexMode: indexEntry?.mode ?? null,
      worktreeMode,
      baselineHash,
      indexHash,
      worktreeHash,
      binary: worktreeBinary || indexBinary || baselineBinary,
      ...(linkTextHash !== undefined ? { linkTextHash } : {}),
      ...(symlinkTargetHash !== undefined ? { symlinkTargetHash } : {}),
      ...(symlinkTarget !== undefined ? { symlinkTarget } : {}),
      ...(followedSymlink !== undefined ? { followedSymlink } : {}),
      ...(outOfScopeSymlink !== undefined ? { outOfScopeSymlink } : {}),
      ...(symlinkTargetOutOfScope !== undefined ? { symlinkTargetOutOfScope } : {}),
      ...(credentialTarget !== undefined ? { credentialTarget } : {}),
      ...(credentialLike ? { credentialLike: true } : {}),
      ...(hardLinkAlias ? { hardLinkAlias: true } : {}),
      ...(entryError ? { error: entryError } : {}),
    };
    entries.push(entry);
    if (entryError) {
      failures.push({ path, reason: entryError });
    }
  }

  const complete = failures.length === 0;
  const entriesDigest = computeTaskRevisionEntriesDigest(entries, baselineSha, {
    complete,
    failures,
  });

  return {
    cwd,
    repoRoot,
    baseline: { requested: requestedBaseline, resolvedSha: baselineSha },
    collectedAt: new Date().toISOString(),
    complete,
    entries,
    failures,
    excludedDirtyPathCount,
    entriesDigest,
  };
}
