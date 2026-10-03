import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_CONNECTOR_ROOT = dirname(fileURLToPath(import.meta.url));

/**
 * Fixed Gecko id for the Firefox build (docs/plans/2026-09-28-firefox-amo-port.md). It is also the
 * only entry in the Firefox native host manifest's `allowed_extensions`.
 */
export const FIREFOX_EXTENSION_ID = "nolo-browser-connector@nolo.chat";

export function extensionIdFromPublicKey(publicKeyBase64) {
  const digest = createHash("sha256").update(Buffer.from(publicKeyBase64, "base64")).digest();
  return Array.from(digest.subarray(0, 16), (byte) =>
    `${String.fromCharCode(97 + (byte >> 4))}${String.fromCharCode(97 + (byte & 15))}`
  ).join("");
}

function resolveNodePath() {
  if (typeof Bun !== "undefined" && typeof Bun.which === "function") {
    const bunResolvedNode = Bun.which("node");
    if (bunResolvedNode) return bunResolvedNode;
  }
  const resolved = execFileSync("/usr/bin/env", ["node", "-p", "process.execPath"], {
    encoding: "utf8",
  }).trim();
  return resolved || "node";
}

/**
 * Where Chrome reads a *user-level* native messaging host manifest, per platform. Verified against
 * Chrome's native messaging documentation: Chrome and Chromium use different directories, and Windows
 * has no manifest directory at all (it looks the host up through a registry value instead).
 */
export function nativeMessagingHostsDir({
  home = process.env.HOME || "",
  platform = process.platform,
  browser = "chrome",
} = {}) {
  if (browser === "firefox") {
    if (platform === "darwin") {
      return resolve(home, "Library/Application Support/Mozilla/NativeMessagingHosts");
    }
    if (platform === "linux") {
      return resolve(home, ".mozilla/native-messaging-hosts");
    }
    throw new Error(
      `Firefox native host installation is not implemented for platform "${platform}". Windows needs a ` +
        "registry value under HKCU\\Software\\Mozilla\\NativeMessagingHosts pointing at the manifest file.",
    );
  }
  if (browser !== "chrome") {
    throw new Error(`Unknown native messaging browser target: "${browser}".`);
  }
  if (platform === "darwin") {
    return resolve(home, "Library/Application Support/Google/Chrome/NativeMessagingHosts");
  }
  if (platform === "linux") {
    return resolve(home, ".config/google-chrome/NativeMessagingHosts");
  }
  throw new Error(
    `Native host installation is not implemented for platform "${platform}". Windows needs a registry value under ` +
      "HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts pointing at the manifest file, plus an executable launcher: " +
      "Chrome starts the manifest's path as a process, so a shell wrapper will not work there.",
  );
}

export function resolveNativeHostInstallPaths({
  home = process.env.HOME || "",
  connectorRoot = DEFAULT_CONNECTOR_ROOT,
  platform = process.platform,
  browser = "chrome",
} = {}) {
  // Deliberately the same directory on every platform: the desktop app resolves its connector token
  // from this path (packages/desktop-chrome-connector/chromeConnector.ts) and the two must not drift.
  const supportDir = resolve(home, "Library/Application Support/Nolo/ChromeConnector");
  return {
    connectorRoot,
    browser,
    extensionManifestPath: resolve(connectorRoot, "extension", "manifest.json"),
    hostPath: resolve(connectorRoot, "native-host", "nolo-chrome-native-host.mjs"),
    templatePath: resolve(connectorRoot, "native-host", "com.nolo.chrome_connector.json"),
    nativeManifestPath: resolve(
      nativeMessagingHostsDir({ home, platform, browser }),
      "com.nolo.chrome_connector.json",
    ),
    supportDir,
    tokenPath: resolve(supportDir, "token"),
    wrapperPath: resolve(supportDir, "nolo-chrome-native-host"),
  };
}

export function installNativeHostManifest({
  home = process.env.HOME || "",
  connectorRoot = DEFAULT_CONNECTOR_ROOT,
  platform = process.platform,
  extensionId,
  nodePath,
  browser = "chrome",
} = {}) {
  const paths = resolveNativeHostInstallPaths({ home, connectorRoot, platform, browser });
  const manifest = JSON.parse(readFileSync(paths.templatePath, "utf8"));
  const extensionManifest = JSON.parse(readFileSync(paths.extensionManifestPath, "utf8"));
  const resolvedExtensionId =
    extensionId ||
    (browser === "firefox" ? FIREFOX_EXTENSION_ID : extensionIdFromPublicKey(extensionManifest.key));
  const resolvedNodePath = nodePath || resolveNodePath();

  mkdirSync(paths.supportDir, { recursive: true });
  const existingToken = existsSync(paths.tokenPath)
    ? readFileSync(paths.tokenPath, "utf8").trim()
    : "";
  const token = existingToken || randomBytes(32).toString("hex");
  writeFileSync(paths.tokenPath, `${token}\n`, { mode: 0o600 });
  writeFileSync(
    paths.wrapperPath,
    `#!/bin/sh\nNOLO_CHROME_CONNECTOR_TOKEN=${JSON.stringify(token)} exec ${JSON.stringify(resolvedNodePath)} ${JSON.stringify(paths.hostPath)}\n`,
  );
  chmodSync(paths.wrapperPath, 0o755);

  manifest.path = paths.wrapperPath;
  // Measured on Firefox 156: a native host manifest containing `allowed_origins` makes
  // `runtime.connectNative` drop the port immediately (onDisconnect fires with an empty
  // lastError, the host never starts, and the extension's 1s retry loop spins forever).
  // Firefox must get only name/description/path/type + `allowed_extensions` keyed on the
  // Gecko id — no `allowed_origins`, and no fake `chrome-extension://<gecko-id>/` origin.
  // Chrome ignores `allowed_extensions` and still needs `allowed_origins`.
  if (browser === "firefox") {
    delete manifest.allowed_origins;
    manifest.allowed_extensions = [FIREFOX_EXTENSION_ID];
  } else {
    manifest.allowed_origins = [`chrome-extension://${resolvedExtensionId}/`];
  }

  mkdirSync(dirname(paths.nativeManifestPath), { recursive: true });
  writeFileSync(paths.nativeManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    extensionId: resolvedExtensionId,
    browser,
    nodePath: resolvedNodePath,
    tokenPath: paths.tokenPath,
    ...paths,
  };
}

/** Browsers this installer can register a native messaging host for. */
export const NATIVE_HOST_BROWSERS = ["chrome", "firefox"];

/**
 * Platforms where a *user-level* native messaging manifest actually works. Windows needs a registry
 * value (and, for Chrome, an executable launcher), which this installer does not write — see
 * nativeMessagingHostsDir. Unattended callers check this first so an unsupported platform is a skip
 * with a reason rather than a per-boot failure log.
 */
export const NATIVE_HOST_SUPPORTED_PLATFORMS = ["darwin", "linux"];

/**
 * A linked git worktree (or a path inside `<checkout>/.worktrees/<name>`) is a throwaway checkout, and
 * the wrapper this installer writes embeds absolute paths into it: once the worktree is removed, the
 * browser keeps launching a host script that no longer exists. `nolo chrome install` refuses these for
 * the same reason (packages/cli/chromeCommands.ts:detectWorktreeCheckout also reports the main
 * checkout so it can print a fix); this returns just the offending root, for a skip reason.
 *
 * Detection: a linked worktree's repo root holds a `.git` *file* (`gitdir: …/worktrees/<name>`); when
 * that marker is gone the path shape decides, but only when `.worktrees` sits below a real checkout
 * root — a repository that merely lives under a directory called `.worktrees` is never refused.
 */
export function isThrowawayCheckout(root) {
  const resolvedRoot = resolve(root);
  let dir = resolvedRoot;
  let checkoutRoot = null;
  for (let depth = 0; depth < 8; depth += 1) {
    const gitEntry = resolve(dir, ".git");
    if (existsSync(gitEntry)) {
      let isGitFile = null;
      try {
        isGitFile = statSync(gitEntry).isFile();
      } catch {
        // Unreadable marker: fall through to the path-based heuristic (fail-safe).
      }
      if (isGitFile === true) {
        try {
          const match = /^gitdir:\s*(.+)$/m.exec(readFileSync(gitEntry, "utf8"));
          const gitDir = match ? resolve(dir, match[1].trim()) : null;
          if (gitDir && gitDir.split(/[\\/]+/).includes("worktrees")) return dir;
        } catch {
          // Unreadable .git marker: fall through to the path-based heuristic.
        }
      } else if (isGitFile === false) {
        checkoutRoot = dir;
      }
      break;
    }
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }

  const segments = resolvedRoot.split(/[\\/]+/);
  const markerIndex = segments.indexOf(".worktrees");
  if (markerIndex <= 0) return null;
  if (checkoutRoot) {
    const checkoutDepth = resolve(checkoutRoot).split(/[\\/]+/).length;
    if (markerIndex < checkoutDepth) return null;
  }
  return segments.slice(0, markerIndex + 2).join("/");
}

/**
 * Where each target keeps its user profile, used only as evidence that the browser is installed on
 * this machine. Path existence only: this never reads a profile, and the connector's own token lives
 * in Nolo's support dir (see resolveNativeHostInstallPaths).
 *
 * `chrome` here means Google Chrome, because that is the only Chrome-family directory the installer
 * writes to; a Chromium-only user is (still) not covered.
 */
function browserProfileDirs({ home = process.env.HOME || "", platform = process.platform, browser }) {
  if (browser === "firefox") {
    if (platform === "darwin") return [resolve(home, "Library/Application Support/Firefox")];
    if (platform === "linux") {
      return [
        resolve(home, ".mozilla/firefox"),
        resolve(home, ".config/mozilla/firefox"),
        resolve(home, "snap/firefox"),
        resolve(home, ".var/app/org.mozilla.firefox"),
      ];
    }
    return [];
  }
  if (platform === "darwin") return [resolve(home, "Library/Application Support/Google/Chrome")];
  if (platform === "linux") return [resolve(home, ".config/google-chrome")];
  return [];
}

export function detectInstalledBrowsers({ home = process.env.HOME || "", platform = process.platform } = {}) {
  return NATIVE_HOST_BROWSERS.filter((browser) =>
    browserProfileDirs({ home, platform, browser }).some((dir) => existsSync(dir)),
  );
}

/**
 * Which browsers to register for. An explicit target wins ("all" means every supported browser).
 * Without one, Chrome stays the default — that is the desktop endpoint's long-standing contract —
 * and every other detected browser is added on top, so a Firefox user is set up without the CLI.
 */
export function resolveNativeHostInstallTargets({ home, platform, browser } = {}) {
  if (browser === "all") return [...NATIVE_HOST_BROWSERS];
  if (browser) {
    if (!NATIVE_HOST_BROWSERS.includes(browser)) {
      throw new Error(`Unknown native messaging browser target: "${browser}".`);
    }
    return [browser];
  }
  return [...new Set(["chrome", ...detectInstalledBrowsers({ home, platform })])];
}

/**
 * Register the host for several browsers at once. Per-browser failures are collected rather than
 * thrown: this runs unattended at desktop start-up, and one unsupported platform must not turn into
 * a desktop app that cannot boot.
 */
export function installNativeHostManifests({
  home,
  connectorRoot,
  platform,
  extensionId,
  nodePath,
  browser,
} = {}) {
  const installs = [];
  const errors = [];
  for (const target of resolveNativeHostInstallTargets({ home, platform, browser })) {
    try {
      installs.push(
        installNativeHostManifest({ home, connectorRoot, platform, extensionId, nodePath, browser: target }),
      );
    } catch (error) {
      errors.push({ browser: target, message: error instanceof Error ? error.message : String(error) });
    }
  }
  return { installs, errors };
}
