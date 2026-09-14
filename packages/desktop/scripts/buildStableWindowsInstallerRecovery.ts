import { closeSync, cpSync, existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";

export type WindowsInstallerRecoverySource =
  | { kind: "tar"; path: string }
  | { kind: "payload-dir"; path: string };

// Payload marker contract mirrors windows-tarball-extract.ts
// (looksLikeWindowsPayload): an electrobun/hutch Windows payload is identified
// by its Resources and bin directories. Requiring Resources/main.js here made
// the recovery path stricter than the post-package path and stranded run
// 34754603578 (GitHub Actions, windows-latest): the electrobun build exited 0
// but recovery reported "neither raw tar nor payload directory is available"
// with no diagnostic about what the build dir actually contained.
const MAX_NESTED_SCAN_DEPTH = 4;
const MAX_NESTED_SCAN_DIRS = 200;
const MAX_ERROR_LISTING_ENTRIES = 40;

const looksLikeWindowsPayloadDir = (path: string): boolean => {
  try {
    return (
      statSync(join(path, "Resources")).isDirectory() &&
      statSync(join(path, "bin")).isDirectory()
    );
  } catch {
    return false;
  }
};

/**
 * 恢复路径的产物要求，**按约束性质分两类**——混在一起会误导后续维护者：
 *
 * - `REQUIRED_RECOVERY_RUNTIME_FILES`：运行时硬依赖。缺任何一个，装出来的桌面端
 *   都起不来（smoke 会以 "Missing installed Bun runtime" 报错，且用户端表现为白屏）。
 * - `REQUIRED_RECOVERY_RELEASE_INTEGRITY_FILES`：发布完整性要求，**不是**启动硬依赖。
 *   桌面端对 `latest-assets.json` 的读取只打 warning（见 packages/desktop/src/bun/index.ts
 *   的 `failed to read public latest-assets.json`），但发布流水线要求安装包携带可用的
 *   web manifest（能力证据 gate 也依赖它定位 public tree）。
 *
 * 2026-09-14 stable 连败实录：恢复出的安装器缺 bin/bun.exe、bin/ElectrobunCore.dll、
 * Resources/main.js、Resources/app/public/latest-assets.json，流程仍记录 "recovered"
 * 成功，直到安装后 smoke 才失败——失败点离原因差了 30 分钟和一整个 job。
 *
 * 刻意不含 `Resources/version.json`：readPayloadVersion 在缺失时会补写，属恢复职责。
 */
export const REQUIRED_RECOVERY_RUNTIME_FILES = [
  "bin/bun.exe",
  "bin/launcher.exe",
  "bin/ElectrobunCore.dll",
  "Resources/main.js",
  "Resources/app/bun/index.js",
] as const;

export const REQUIRED_RECOVERY_RELEASE_INTEGRITY_FILES = [
  "Resources/app/public/latest-assets.json",
] as const;

export const REQUIRED_RECOVERY_PAYLOAD_FILES = [
  ...REQUIRED_RECOVERY_RUNTIME_FILES,
  ...REQUIRED_RECOVERY_RELEASE_INTEGRITY_FILES,
] as const;

export type RecoveryPayloadFileIssue = {
  /** 相对 payload 根的路径（POSIX 分隔符，便于比对错误文案）。 */
  path: string;
  reason:
    | "missing"
    | "not-a-regular-file"
    | "empty"
    | "not-a-windows-executable"
    | "invalid-manifest-json"
    | "manifest-not-desktop-edition";
  /** 该文件属于哪类约束，便于报错时区分「起不来」与「发布不完整」。 */
  group: "runtime" | "release-integrity";
};

export type RecoveryPayloadStat = {
  isFile: boolean;
  size: number;
  /** 可选：早退分支的 provenance 判断需要它。 */
  mtimeMs?: number;
};

export type RecoveryPayloadIntegrityDeps = {
  /** 默认 node:fs。返回 null 表示路径不存在。 */
  statFile?: (path: string) => RecoveryPayloadStat | null;
  /** 从指定偏移读取字节；返回 null 表示不可读。 */
  readBytesAt?: (path: string, offset: number, length: number) => Uint8Array | null;
  readText?: (path: string) => string | null;
};

const PE_MAGIC = "MZ";
const PE_SIGNATURE = "PE\u0000\u0000";
/** DOS 头至少要到 0x3C 起的 4 字节 e_lfanew。 */
const DOS_HEADER_BYTES = 0x40;
const ELFANEW_OFFSET = 0x3c;
/** COFF Machine 字段（PE 签名后 2 字节，小端）。本产物是 win-x64，兼容 arm64。 */
const COFF_MACHINE_X64 = 0x8664;
const COFF_MACHINE_ARM64 = 0xaa64;

const defaultDeps: Required<RecoveryPayloadIntegrityDeps> = {
  statFile: (path) => {
    try {
      const stat = statSync(path);
      return { isFile: stat.isFile(), size: stat.size, mtimeMs: stat.mtimeMs };
    } catch {
      return null;
    }
  },
  readBytesAt: (path, offset, length) => {
    try {
      const fd = openSync(path, "r");
      try {
        const buffer = Buffer.alloc(length);
        const read = readSync(fd, buffer, 0, length, offset);
        return buffer.subarray(0, read);
      } finally {
        closeSync(fd);
      }
    } catch {
      return null;
    }
  },
  readText: (path) => {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return null;
    }
  },
};

/**
 * 结构化 PE 判定，而不是「只要 MZ 两字节」。
 *
 * 旧的 MZ-only 检查会被截断文件蒙过（2026-09-14 跨家族复审第二轮 HIGH）。
 * 这里校验 DOS 头 + e_lfanew 指向的 PE 签名，二者都是 PE 格式的定义性特征，
 * 不是任意体积阈值：
 *   1. 前 64 字节可读，且以 `MZ` 开头；
 *   2. `e_lfanew`（偏移 0x3C，小端 u32）在文件范围内且 > 0；
 *   3. 该偏移处的 4 字节为 `PE\0\0`。
 */
const isWindowsExecutable = (
  absolutePath: string,
  fileSize: number,
  readBytesAt: (path: string, offset: number, length: number) => Uint8Array | null,
): boolean => {
  const head = readBytesAt(absolutePath, 0, DOS_HEADER_BYTES);
  if (!head || head.length < DOS_HEADER_BYTES) return false;
  if (String.fromCharCode(head[0], head[1]) !== PE_MAGIC) return false;

  const eLfanew =
    (head[ELFANEW_OFFSET] |
      (head[ELFANEW_OFFSET + 1] << 8) |
      (head[ELFANEW_OFFSET + 2] << 16) |
      (head[ELFANEW_OFFSET + 3] << 24)) >>>
    0;
  // 下界必须是 DOS_HEADER_BYTES：只要求 > 0 会允许 PE 签名落在 DOS 头内部，
  // 用一段精心构造的 64 字节数据即可伪造出「合法」可执行文件
  // （2026-09-14 独立复审 HIGH）。
  if (eLfanew < DOS_HEADER_BYTES || eLfanew + 8 > fileSize) return false;

  const signature = readBytesAt(absolutePath, eLfanew, 4);
  if (!signature || signature.length < 4) return false;
  if (
    String.fromCharCode(signature[0], signature[1], signature[2], signature[3]) !==
    PE_SIGNATURE
  ) {
    return false;
  }

  // COFF Machine 必须是 x64/arm64：否则一段 68 字节的 stub（MZ + e_lfanew +
  // PE\0\0 + 任意 Machine）就能冒充 50MB 的 bun.exe（复审 LOW）。
  const machineBytes = readBytesAt(absolutePath, eLfanew + 4, 2);
  if (!machineBytes || machineBytes.length < 2) return false;
  const machine = machineBytes[0] | (machineBytes[1] << 8);
  return machine === COFF_MACHINE_X64 || machine === COFF_MACHINE_ARM64;
};

/**
 * 单个文件的完整性判定。
 *
 * 为什么不只看存在性：`existsSync` 对目录同样返回 true，且零字节或被截断的
 * `bun.exe` 也能「存在」——只查存在性会把坏 payload 放行到安装阶段
 * （2026-09-14 跨家族复审的 HIGH：假阴性）。因此这里按文件类型检查内容：
 * Windows 可执行文件要求 PE 魔数，脚本要求非空，manifest 要求可解析且声明
 * desktop edition。
 */
export function inspectRecoveryPayloadFile(
  payloadDir: string,
  relativePath: string,
  group: RecoveryPayloadFileIssue["group"],
  deps: RecoveryPayloadIntegrityDeps = {},
): RecoveryPayloadFileIssue[] {
  const resolved = { ...defaultDeps, ...deps };
  const absolutePath = join(payloadDir, ...relativePath.split("/"));
  const stat = resolved.statFile(absolutePath);

  if (!stat) return [{ path: relativePath, reason: "missing", group }];
  if (!stat.isFile) return [{ path: relativePath, reason: "not-a-regular-file", group }];
  if (stat.size <= 0) return [{ path: relativePath, reason: "empty", group }];

  if (relativePath.endsWith(".exe") || relativePath.endsWith(".dll")) {
    if (!isWindowsExecutable(absolutePath, stat.size, resolved.readBytesAt)) {
      return [{ path: relativePath, reason: "not-a-windows-executable", group }];
    }
  }

  // 脚本要求有非空白内容：零字节已在上面拦下，纯空白同样是坏产物。
  if (relativePath.endsWith(".js")) {
    const text = resolved.readText(absolutePath);
    if (text === null || text.trim().length === 0) {
      return [{ path: relativePath, reason: "empty", group }];
    }
  }

  if (relativePath.endsWith(".json")) {
    const text = resolved.readText(absolutePath);
    let parsed: unknown = null;
    try {
      parsed = text === null ? null : JSON.parse(text);
    } catch {
      parsed = null;
    }
    if (!parsed || typeof parsed !== "object") {
      return [{ path: relativePath, reason: "invalid-manifest-json", group }];
    }
    // 桌面安装包必须携带 desktop edition 的 web manifest：pre-build 已强制过
    // 一次（desktop-edition-mismatch），恢复路径必须保持同一契约。
    if ((parsed as { edition?: unknown }).edition !== "desktop") {
      return [{ path: relativePath, reason: "manifest-not-desktop-edition", group }];
    }
  }

  return [];
}

/** 返回 payload 的全部完整性问题（空数组 = 通过）。deps 可注入以便测试。 */
export function findRecoveryPayloadIntegrityIssues(
  payloadDir: string,
  deps: RecoveryPayloadIntegrityDeps = {},
): RecoveryPayloadFileIssue[] {
  const issues: RecoveryPayloadFileIssue[] = [];
  for (const relativePath of REQUIRED_RECOVERY_RUNTIME_FILES) {
    issues.push(...inspectRecoveryPayloadFile(payloadDir, relativePath, "runtime", deps));
  }
  for (const relativePath of REQUIRED_RECOVERY_RELEASE_INTEGRITY_FILES) {
    issues.push(
      ...inspectRecoveryPayloadFile(payloadDir, relativePath, "release-integrity", deps),
    );
  }
  return issues;
}

/**
 * fail closed：payload 不完整就抛错，绝不让缺运行时的安装器被产出。
 * 错误信息列出每个文件的具体原因，避免逐个试错。
 */
export function assertRecoveryPayloadComplete(
  payloadDir: string,
  deps: RecoveryPayloadIntegrityDeps = {},
): void {
  const issues = findRecoveryPayloadIntegrityIssues(payloadDir, deps);
  if (issues.length === 0) {
    return;
  }
  const detail = issues
    .map((issue) => `${issue.path} (${issue.reason}, ${issue.group})`)
    .join(", ");
  throw new Error(
    `Windows installer recovery payload is incomplete at ${payloadDir}; ` +
      `refusing to build an installer that would ship without its runtime. ` +
      `Problems: ${detail}`,
  );
}

/**
 * 产物是否由**本次**构建产出。
 *
 * `smokeArtifactDir` 在运行 electrobun 之前已被清空，所以只凭「路径存在」判断
 * 会让「目录清理失败」或「其它步骤重新放入旧产物」蒙过后续 gate
 * （2026-09-14 跨家族复审的 MEDIUM：成功早退分支绕过 recovery gate）。
 * 用 mtime 不早于本次脚本启动来绑定 provenance；容忍少量时钟/文件系统粒度误差。
 */
export function isFreshBuildOutput(
  path: string,
  startedAtMs: number,
  toleranceMs = 5_000,
  deps: Pick<RecoveryPayloadIntegrityDeps, "statFile"> = {},
): boolean {
  const statFile = deps.statFile ?? defaultDeps.statFile;
  const stat = statFile(path);
  if (!stat || !stat.isFile) {
    return false;
  }
  if (typeof stat.mtimeMs !== "number" || !Number.isFinite(stat.mtimeMs)) {
    // fail closed：provenance gate 不因缺少 provenance 数据而放行。
    // 生产默认实现（statSync）总会给出 mtime；拿不到就说明调用方绕过了它，
    // 此时宁可走 recovery 也不能静默成功。
    return false;
  }
  return stat.mtimeMs >= startedAtMs - toleranceMs;
}

export function findWindowsPayloadDir(
  rootDir: string,
  options: {
    /** 默认 node:fs 的 readdirSync({ withFileTypes: true })；测试注入固定遍历顺序。 */
    readdirFn?: (dir: string) => Array<{ name: string; isDirectory(): boolean }>;
  } = {},
) {
  // 扁平布局：rootDir 本身可能就是 payload（其下直接有 Resources/ 与 bin/）。
  // 只从子目录开始探测会把它误报成「找不到 payload」（复审 MEDIUM），
  // 而早退路径依赖这个定位结果。
  if (looksLikeWindowsPayloadDir(rootDir)) {
    return rootDir;
  }

  const visited = { count: 0 };
  const payloadDir = findWindowsPayloadDirNested(
    rootDir,
    options.readdirFn ?? ((dir: string) => readdirSync(dir, { withFileTypes: true })),
    visited,
  );

  if (!payloadDir) {
    throw new Error(
      `Unable to locate Windows desktop payload directory in ${rootDir}`,
    );
  }

  return payloadDir;
}

/**
 * 真正的广度优先：整层目录全部检查完毕（浅层匹配优先于一切深层匹配）才
 * 进入下一层。之前的「先本层扫描再按序递归」本质是 DFS——第一个兄弟子树
 * 深处的匹配会抢先于后面兄弟子树浅处的匹配返回，违反 shallowest-match 语义。
 */
function findWindowsPayloadDirNested(
  rootDir: string,
  readdirFn: (dir: string) => Array<{ name: string; isDirectory(): boolean }>,
  visited: { count: number },
): string | undefined {
  let frontier = [rootDir];
  // 第 depth 层循环检查「相对深度 depth+1」的候选目录；与旧实现一致，
  // 候选最深到相对深度 MAX_NESTED_SCAN_DEPTH + 1。
  for (let depth = 0; depth <= MAX_NESTED_SCAN_DEPTH; depth += 1) {
    const nextFrontier: string[] = [];
    for (const dir of frontier) {
      let entries;
      try {
        entries = readdirFn(dir);
      } catch {
        continue;
      }
      // 浅层优先：先把这一层的每个目录都检查完，绝不提前下潜。
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (visited.count >= MAX_NESTED_SCAN_DIRS) return undefined;
        visited.count += 1;
        const path = join(dir, entry.name);
        if (looksLikeWindowsPayloadDir(path)) return path;
      }
      if (depth >= MAX_NESTED_SCAN_DEPTH) continue;
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        nextFrontier.push(join(dir, entry.name));
      }
    }
    frontier = nextFrontier;
  }
  return undefined;
}

function describeDirListing(dir: string): string {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return `  <unreadable: ${code ?? String(error)}>`;
  }

  if (names.length === 0) return "  <empty>";

  const shown = [...names].sort().slice(0, MAX_ERROR_LISTING_ENTRIES);
  const remainder = names.length - shown.length;
  const lines = shown.map((name) => `  ${name}`);
  if (remainder > 0) lines.push(`  ... and ${remainder} more`);
  return lines.join("\n");
}

export function resolveWindowsInstallerRecoverySource(args: {
  buildDir: string;
  rawTarPath: string;
  /** 测试注入固定目录遍历顺序；生产路径用真实 readdirSync。 */
  readdirFn?: (dir: string) => Array<{ name: string; isDirectory(): boolean }>;
}): WindowsInstallerRecoverySource {
  if (existsSync(args.rawTarPath)) {
    return {
      kind: "tar",
      path: args.rawTarPath,
    };
  }

  try {
    return {
      kind: "payload-dir",
      path: findWindowsPayloadDir(args.buildDir, { readdirFn: args.readdirFn }),
    };
  } catch (payloadError) {
    const payloadDetail =
      payloadError instanceof Error && payloadError.message
        ? `\n${payloadError.message}`
        : "";
    throw new Error(
      // Electrobun may have exited 0 and still not left either recovery input
      // (run 34754603578), so do not claim "Electrobun failed" here — list the
      // build dir contents instead so the next run is diagnosable.
      `neither raw tar nor payload directory is available ` +
        `(checked ${args.rawTarPath} and ${args.buildDir})\n` +
        `${args.buildDir} contents:\n${describeDirListing(args.buildDir)}` +
        payloadDetail,
    );
  }
}

/**
 * 恢复 payload 的 public 资产：缺 `latest-assets.json` 时从构建产生的
 * `generatedPublicDir` 复制过去。
 *
 * 三个分支都必须显式（复审 MEDIUM：原先只有 source.indexOf 契约、没有行为测试）：
 * 1. manifest 已存在 → 不动（避免用生成物覆盖更好的既有资产）；
 * 2. 生成物目录不存在 → 抛错，而不是留一个缺 manifest 的 payload；
 * 3. 复制后复核 manifest 仍缺失 → 抛错。
 */
export function ensureRecoveryPublicDir(
  payloadDir: string,
  generatedPublicDir: string,
): void {
  const packagedPublicDir = join(payloadDir, "Resources", "app", "public");
  const packagedLatestAssetsPath = join(packagedPublicDir, "latest-assets.json");
  if (existsSync(packagedLatestAssetsPath)) {
    return;
  }

  if (!existsSync(generatedPublicDir)) {
    throw new Error(
      `Missing desktop generated public assets for Windows installer recovery: ${generatedPublicDir}`,
    );
  }

  rmSync(packagedPublicDir, { recursive: true, force: true });
  mkdirSync(join(payloadDir, "Resources", "app"), { recursive: true });
  cpSync(generatedPublicDir, packagedPublicDir, { recursive: true, force: true });

  if (!existsSync(packagedLatestAssetsPath)) {
    throw new Error(
      `Windows installer recovery copied public assets but latest-assets.json is still missing: ${packagedLatestAssetsPath}`,
    );
  }
}
