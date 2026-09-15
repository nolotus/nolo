import {
  chmodSync,
  existsSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { readdir } from "node:fs/promises";
import { basename, join } from "node:path";
import { rewriteTarballFromDir, withTempDir } from "./codesign-local";

/**
 * Linux launcher preflight: recover from a stale cross-host CEF profile lock
 * before CEF is initialized.
 *
 * Incident 2026-09-15 (installed canary, Fedora 44): the app crashed on every launch
 * with SIGSEGV inside libcef.so. Root cause was the CEF profile lock at
 * `~/.cache/chat.nolo.desktop/canary/CEF/SingletonLock`, which still pointed at the
 * machine's **previous hostname** (`MiWiFi-RD15-srv-880927`): Chromium treats a lock
 * written by another hostname as "profile in use" and refuses to initialize, and
 * Electrobun 2.0.2 keeps going after `CefInitialize` failure — into BrowserWindow
 * creation, where it crashes in native code.
 *
 * `src/bun/index.ts` cannot repair this: CEF is initialized by the Electrobun launcher
 * (`Resources/main.js` → `electrobun_core_run_main_thread`) before any app code runs.
 * The only pre-CEF hook the repository owns is the `bin/launcher` entry point, so
 * shipped Linux artifacts replace it with the wrapper at
 * `assets/linux-launcher.sh` and keep the real launcher as `bin/launcher-bin`.
 *
 * Scope stays deliberately narrow — only the case that is provably stale: a
 * `SingletonLock` symlink whose host part is not this machine. Same-host locks (live
 * or with a dead pid) are left to Chromium's own staleness handling, so a second
 * instance, extra windows and channel isolation are unchanged. Stale lock files are
 * moved, never deleted.
 */

/** Name of the real Electrobun launcher once the wrapper owns `bin/launcher`. */
export const LINUX_LAUNCHER_BINARY_NAME = "launcher-bin";

/** Marker line the wrapper carries; also the idempotency marker for injection. */
export const LINUX_LAUNCHER_WRAPPER_MARKER = "# nolo-linux-launcher-preflight";

const LAUNCHER_WRAPPER_MODE = 0o755;
const WRAPPER_ASSET_PATH = join(import.meta.dir, "../assets/linux-launcher.sh");

export const buildLinuxLauncherWrapperScript = (): string =>
  readFileSync(WRAPPER_ASSET_PATH, "utf8");

const isLinuxLauncherWrapper = (content: Buffer) =>
  content.subarray(0, 2).toString("utf8") === "#!" &&
  content.includes(LINUX_LAUNCHER_WRAPPER_MARKER);

/**
 * Wrap `bin/launcher` in one app tree: move the real launcher to `bin/launcher-bin`
 * and install the preflight wrapper in its place. Idempotent — re-running refreshes
 * the wrapper text without touching the real launcher again.
 */
export const injectLinuxLauncherPreflight = ({ appDir }: { appDir: string }): {
  injected: boolean;
} => {
  const binDir = join(appDir, "bin");
  const wrapperPath = join(binDir, "launcher");
  const realLauncherPath = join(binDir, LINUX_LAUNCHER_BINARY_NAME);

  if (!existsSync(wrapperPath)) {
    throw new Error(
      `[desktop] linux launcher preflight: ${wrapperPath} not found; refusing to modify an unexpected app tree`,
    );
  }

  const wrapperScript = buildLinuxLauncherWrapperScript();

  if (isLinuxLauncherWrapper(readFileSync(wrapperPath))) {
    writeFileSync(wrapperPath, wrapperScript, "utf8");
    chmodSync(wrapperPath, LAUNCHER_WRAPPER_MODE);
    return { injected: false };
  }

  if (existsSync(realLauncherPath)) {
    throw new Error(
      `[desktop] linux launcher preflight: both launcher and ${LINUX_LAUNCHER_BINARY_NAME} exist in ${binDir}; refusing to guess which binary is the real one`,
    );
  }

  renameSync(wrapperPath, realLauncherPath);
  chmodSync(realLauncherPath, LAUNCHER_WRAPPER_MODE);
  writeFileSync(wrapperPath, wrapperScript, "utf8");
  chmodSync(wrapperPath, LAUNCHER_WRAPPER_MODE);

  return { injected: true };
};

/** Find the single app tree (`bin/launcher` + `Resources/version.json`) under `root`. */
const findLinuxAppDir = (root: string, maxDepth = 2): string => {
  const matches: string[] = [];

  const walk = (dir: string, depth: number) => {
    if (
      existsSync(join(dir, "bin", "launcher")) &&
      existsSync(join(dir, "Resources", "version.json"))
    ) {
      matches.push(dir);
      return;
    }
    if (depth >= maxDepth) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(dir, entry.name), depth + 1);
    }
  };

  walk(root, 0);

  if (matches.length !== 1) {
    throw new Error(
      `[desktop] linux launcher preflight: expected exactly one app tree under ${root}, found ${matches.length}`,
    );
  }

  return matches[0];
};

/**
 * Apply the wrapper to the Linux release tarball.
 *
 * The tarball is the artifact the updater installs and the source both DEB and RPM are
 * derived from, so wrapping it here guarantees no shipped Linux artifact can start CEF
 * without the preflight. Fails loudly instead of silently shipping an unwrapped
 * launcher when the artifact layout is not what we expect.
 */
export const applyLinuxLauncherPreflight = async ({
  artifactDir,
  platform = process.platform,
}: {
  artifactDir: string;
  platform?: NodeJS.Platform;
}): Promise<{ applied: boolean; tarballPaths?: string[] }> => {
  if (platform !== "linux") {
    return { applied: false };
  }

  // Wrap EVERY Linux tarball, not just the first match: arch prefixes sort
  // differently (arm64 before x64), and a second, unwrapped tarball would ship
  // while the build stayed green — that would break the invariant this step exists
  // to hold.
  const tarballNames = (await readdir(artifactDir)).filter(
    (name) => name.includes("linux") && name.endsWith(".tar.zst"),
  );
  if (tarballNames.length === 0) {
    throw new Error(
      `[desktop] linux launcher preflight: no *linux*.tar.zst found in ${artifactDir}; the stale-CEF-lock preflight would not reach any shipped Linux artifact`,
    );
  }

  const tarballPaths: string[] = [];

  for (const tarballName of tarballNames) {
    const tarballPath = join(artifactDir, tarballName);

    await withTempDir("nolo-linux-launcher-preflight-", async (dir) => {
      const extract = Bun.spawn(["tar", "--zstd", "-xf", tarballPath, "-C", dir], {
        stdout: "inherit",
        stderr: "inherit",
      });
      if ((await extract.exited) !== 0) {
        throw new Error(`[desktop] linux launcher preflight: failed to extract ${tarballPath}`);
      }

      const topLevelEntries = readdirSync(dir).filter((name) => name !== "." && name !== "..");
      if (topLevelEntries.length !== 1) {
        throw new Error(
          `[desktop] linux launcher preflight: expected a single top-level entry in ${tarballName} ` +
            `(the DEB/RPM builders extract with --strip-components=1), found ${topLevelEntries.length}`,
        );
      }

      const appDir = findLinuxAppDir(join(dir, topLevelEntries[0]));
      const { injected } = injectLinuxLauncherPreflight({ appDir });
      console.log(
        `[desktop] linux launcher preflight ${injected ? "injected into" : "refreshed in"} ` +
          `${tarballName} (${basename(appDir)})`,
      );

      await rewriteTarballFromDir(tarballPath, dir, topLevelEntries[0]);
    });

    tarballPaths.push(tarballPath);
  }

  return { applied: true, tarballPaths };
};
