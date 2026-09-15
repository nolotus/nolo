import { existsSync, mkdirSync, rmSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Robust extraction of hutch-produced Windows update tarballs (.tar.zst).
 *
 * Failure background (public repo run 34331735636, Windows job): GNU tar
 * failed while extracting the canary tarball —
 *   tar: C\:\\Users\\RUNNER~1\\...\\nolo-desktop-win-installer-HWzkwz: Cannot open: No such file or directory
 *   zstd: error 70: Write error: Broken pipe
 *
 * The `C\:\\` display form is how GNU tar renders a member/operand that it
 * parsed as a possible remote-host path (leading drive letter + colon).
 * hutch 0.24.x builds the tarball with `tar -cf <abs.tar> -C <abs.dir> <name>`
 * (hutch src/electrobun.zig `appendBundleTarArgs`), and Windows-side member
 * names can surface with a literal drive prefix and backslash separators.
 * When GNU tar cannot reconcile such an operand it exits 2 mid-stream and the
 * zstd side of the pipe dies with "Broken pipe" (error 70).
 *
 * Mitigation used here (independent of the hutch-side fix):
 * 1. `--force-local` so drive-letter archive/operand paths are never treated
 *    as remote host specs, regardless of job-level TAR_OPTIONS.
 * 2. A sed `--transform` that strips a leading drive prefix (`C:\`, `C:/`)
 *    and normalizes member-name backslashes to `/` at extraction time.
 *    Relative forward-slash members (the v1 shape) match neither expression
 *    and pass through unchanged.
 * 3. A `-C` target expressed with POSIX-style slashes.
 * 4. Payload discovery that tolerates both flat and nested layouts, so a
 *    residual prefix in member names cannot strand the installer build.
 *
 * 2026-09-15 update: native spawns (Bun.spawn) resolve a different tar than
 * the bash-internal PATH — on Windows runners that is the System32 bsdtar,
 * which rejects the GNU-only flags above. The extractor now runs a portable
 * argv first and only falls back to the GNU argv (Git's tar / NOLO_GNU_TAR);
 * the mitigations above still apply to that fallback attempt.
 */

const WINDOWS_TAR_TRANSFORM = "s,^[A-Za-z]:[\\\\/],,";

/** Matches a member name that begins with a literal Windows drive prefix. */
export const hasWindowsDrivePrefix = (memberName: string): boolean =>
  /^[A-Za-z]:[\\/]/.test(memberName);

/** Strip a leading `C:\` / `C:/` prefix from a member name. */
export const stripWindowsDrivePrefix = (memberName: string): string =>
  memberName.replace(/^[A-Za-z]:[\\/]/, "");

/** Normalize Windows backslash separators in a member name to forward slashes. */
export const normalizeMemberSeparators = (memberName: string): string =>
  memberName.replace(/\\/g, "/");

/**
 * Resolve the default tar binary for native spawns.
 *
 * 2026-09-15：实测确认 Windows runner 上 `Bun.spawn("tar")` 解析到的是
 * System32 自带的 **bsdtar**（bash 的 Git GNU tar 只在 shell 内部 PATH 里，
 * 原生进程看不到），而 bsdtar 不接受 GNU 专属参数（--force-local/--transform）。
 * 因此默认参数集必须是 portable 的；GNU 参数集只在 NOLO_GNU_TAR 显式指定或
 * Windows 兜底尝试（Git 自带 GNU tar）时使用。见 extractWindowsTarball 的多策略循环。
 */
export const resolveWindowsTarBinary = (): string => {
  if (process.platform === "win32") return "tar";
  return process.env.NOLO_GNU_TAR?.trim() || "tar";
};
/** Portable extraction argv（无 GNU 专属参数）。
 *  Windows 上默认 tar = System32 bsdtar：原生解码 zstd、对现行 hutch 产物的
 *  干净成员名（NoloDesktop-.../bin/...）直接可解；现代 GNU tar 亦接受 `-xf`。 */
export const buildWindowsExtractArgs = (
  tarPath: string,
  tempDir: string
): string[] => [
  resolveWindowsTarBinary(),
  "-xf",
  tarPath,
  "-C",
  toPosixPath(tempDir),
];

/** GNU argv：保留 --force-local/--transform 旧规避（drive-prefixed 成员名）并
 *  经 --zstd 管道解压。仅在显式 NOLO_GNU_TAR 或 Windows 兜底尝试中使用。 */
export const buildGnuWindowsExtractArgs = (
  binary: string,
  tarPath: string,
  tempDir: string
): string[] => [
  binary,
  "--force-local",
  "--transform",
  WINDOWS_TAR_TRANSFORM,
  "--zstd",
  "-xf",
  tarPath,
  "-C",
  toPosixPath(tempDir),
];
/** Convert a Windows path to POSIX-style slashes (no-op on POSIX paths). */
export const toPosixPath = (path: string): string =>
  path.replace(/\\/g, "/");

/**
 * Locate the extracted Windows desktop payload inside `tempDir`.
 *
 * `resolveWindowsPayloadDir` (v1 contract): a direct child of `tempDir`
 * containing `Resources/main.js` and `bin/`. Kept as the first check.
 *
 * Fallback: a bounded depth-first scan for the same marker pair, used when
 * extraction materialized an extra nesting level (e.g. a drive-letter root
 * directory) instead of the flat v1 layout.
 */
export const findWindowsPayloadDir = async (
  tempDir: string,
  maxDepth = 6
): Promise<string> => {
  const direct = await findWindowsPayloadDirShallow(tempDir);
  if (direct) return direct;

  const nested = await findWindowsPayloadDirNested(tempDir, 0, maxDepth);
  if (nested) return nested;

  throw new Error(
    `Unable to locate extracted Windows desktop payload in ${tempDir}`
  );
};

const looksLikeWindowsPayload = async (dir: string): Promise<boolean> => {
  const [resources, bin] = await Promise.all([
    stat(join(dir, "Resources")).catch(() => null),
    stat(join(dir, "bin")).catch(() => null),
  ]);
  return resources?.isDirectory() === true && bin?.isDirectory() === true;
};

const findWindowsPayloadDirShallow = async (
  tempDir: string
): Promise<string | null> => {
  const entries = await readdir(tempDir);
  for (const name of entries) {
    const path = join(tempDir, name);
    if (await looksLikeWindowsPayload(path)) return path;
  }
  return null;
};

const findWindowsPayloadDirNested = async (
  dir: string,
  depth: number,
  maxDepth: number
): Promise<string | null> => {
  if (depth >= maxDepth) return null;
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return null;
  }
  for (const name of entries) {
    // GNU tar can leave backslash separators inside extracted entry names
    // (e.g. "Users\x\NoloDesktop" as one nested component chain, or even a
    // flat file name). Try every interpretation: the literal component, and
    // each slash-joined prefix chain built from backslash segments.
    const segments = name.split("\\");
    const candidates: string[] = [join(dir, name)];
    if (segments.length > 1) {
      for (let i = 1; i < segments.length; i++) {
        candidates.push(join(dir, ...segments.slice(0, i), segments[i]));
      }
      candidates.push(join(dir, ...segments));
    }
    for (const path of candidates) {
      let isDir = false;
      try {
        isDir = (await stat(path)).isDirectory();
      } catch {
        continue;
      }
      if (!isDir) continue;
      if (await looksLikeWindowsPayload(path)) return path;
    }
    // descend only into real directories of this level
    const realDir = join(dir, name);
    let isRealDir = false;
    try {
      isRealDir = (await stat(realDir)).isDirectory();
    } catch {
      continue;
    }
    if (!isRealDir) continue;
    const deeper = await findWindowsPayloadDirNested(realDir, depth + 1, maxDepth);
    if (deeper) return deeper;
  }
  return null;
};

/**
 * Extract `tarballPath` into `tempDir` and return the located payload dir.
 * Throws with a stderr tail when tar/zstd fail, so CI logs carry the actual
 * tar diagnostic instead of a bare exit code.
 */
const WINDOWS_GIT_GNU_TAR_CANDIDATES = [
  "C:\\Program Files\\Git\\usr\\bin\\tar.exe",
  "C:\\Program Files\\Git\\mingw64\\bin\\tar.exe",
];

type WindowsExtractAttempt = {
  label: string;
  args: string[];
  env?: Record<string, string | undefined>;
};

/** 尝试序列：portable 优先；GNU 作为兜底（Windows = Git 自带 tar；POSIX = PATH tar）。
 *  显式 NOLO_GNU_TAR 时只跑 GNU 参数集（保持旧调用方可控性）。 */
export const buildWindowsExtractAttempts = (
  tarballPath: string,
  tempDir: string
): WindowsExtractAttempt[] => {
  const override = process.env.NOLO_GNU_TAR?.trim();
  if (override) {
    return [
      { label: `gnu:${override}`, args: buildGnuWindowsExtractArgs(override, tarballPath, tempDir) },
    ];
  }
  const attempts: WindowsExtractAttempt[] = [
    { label: "portable", args: buildWindowsExtractArgs(tarballPath, tempDir) },
  ];
  if (process.platform === "win32") {
    const gitTar = WINDOWS_GIT_GNU_TAR_CANDIDATES.find((candidate) => existsSync(candidate));
    if (gitTar) {
      attempts.push({
        label: `gnu-fallback:${gitTar}`,
        args: buildGnuWindowsExtractArgs(gitTar, tarballPath, tempDir),
        env: { ...process.env, PATH: `${dirname(gitTar)};${process.env.PATH ?? ""}` },
      });
    }
  } else {
    attempts.push({ label: "gnu:tar", args: buildGnuWindowsExtractArgs("tar", tarballPath, tempDir) });
  }
  return attempts;
};

/**
 * Extract `tarballPath` into `tempDir` and return the located payload dir.
 *
 * 多策略（2026-09-15）：先以 portable 参数集尝试（Windows bsdtar 原生解 zstd），
 * 失败或解出后定位不到载荷时，清理重试 GNU 参数集（Git GNU tar 兜底，保留旧
 * drive-prefix 规避）。全部失败时抛出包含每个尝试 stderr 的诊断。
 */
export const extractWindowsTarball = async (
  tarballPath: string,
  tempDir: string
): Promise<string> => {
  const failures: string[] = [];
  for (const attempt of buildWindowsExtractAttempts(tarballPath, tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
    mkdirSync(tempDir, { recursive: true });

    const extractProc = Bun.spawn(attempt.args, {
      stdout: "inherit",
      stderr: "pipe",
      ...(attempt.env ? { env: attempt.env } : {}),
    });

    const [extractExitCode, stderrTail] = await Promise.all([
      extractProc.exited,
      new Response(extractProc.stderr).text().then((text) =>
        text
          .split(/\r?\n/)
          .filter(Boolean)
          .slice(-10)
          .join("\n")
      ),
    ]);

    if (extractExitCode !== 0) {
      failures.push(
        `${attempt.label}: tar exited ${extractExitCode}` + (stderrTail ? `\ntar/stderr:\n${stderrTail}` : ""),
      );
      continue;
    }

    try {
      return await findWindowsPayloadDir(tempDir);
    } catch (error) {
      failures.push(
        `${attempt.label}: extraction succeeded but payload discovery failed (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }

  throw new Error(
    `failed to extract ${tarballPath}: every tar strategy failed\n` + failures.join("\n---\n"),
  );
};
