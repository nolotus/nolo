import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

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
 * The GNU tar arguments used to extract a hutch Windows tarball into
 * `tempDir`. Exposed for tests; `tarPath`/`tempDir` accept either separator
 * style, but the `-C` target is canonicalized to forward slashes.
 *
 * The tar binary is resolved per platform:
 * - Windows: "tar" (the runner PATH puts Git's GNU tar first under the
 *   workflow's bash shell, matching the CI failure environment)
 * - Other platforms (tests/dev): honor NOLO_GNU_TAR (e.g. gtar) when set, so
 *   the transform/--force-local behavior can be exercised off-Windows.
 */
export const resolveWindowsTarBinary = (): string => {
  if (process.platform === "win32") return "tar";
  return process.env.NOLO_GNU_TAR?.trim() || "tar";
};

export const buildWindowsExtractArgs = (
  tarPath: string,
  tempDir: string
): string[] => [
  resolveWindowsTarBinary(),
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
export const extractWindowsTarball = async (
  tarballPath: string,
  tempDir: string
): Promise<string> => {
  const extractProc = Bun.spawn(buildWindowsExtractArgs(tarballPath, tempDir), {
    stdout: "inherit",
    stderr: "pipe",
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
    throw new Error(
      `failed to extract ${tarballPath} with exit code ${extractExitCode}` +
        (stderrTail ? `\ntar/stderr:\n${stderrTail}` : "")
    );
  }

  return findWindowsPayloadDir(tempDir);
};