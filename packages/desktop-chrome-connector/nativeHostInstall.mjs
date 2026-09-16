import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const DEFAULT_CONNECTOR_ROOT = dirname(fileURLToPath(import.meta.url));

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
} = {}) {
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
} = {}) {
  // Deliberately the same directory on every platform: the desktop app resolves its connector token
  // from this path (packages/desktop-chrome-connector/chromeConnector.ts) and the two must not drift.
  const supportDir = resolve(home, "Library/Application Support/Nolo/ChromeConnector");
  return {
    connectorRoot,
    extensionManifestPath: resolve(connectorRoot, "extension", "manifest.json"),
    hostPath: resolve(connectorRoot, "native-host", "nolo-chrome-native-host.mjs"),
    templatePath: resolve(connectorRoot, "native-host", "com.nolo.chrome_connector.json"),
    nativeManifestPath: resolve(
      nativeMessagingHostsDir({ home, platform }),
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
} = {}) {
  const paths = resolveNativeHostInstallPaths({ home, connectorRoot, platform });
  const manifest = JSON.parse(readFileSync(paths.templatePath, "utf8"));
  const extensionManifest = JSON.parse(readFileSync(paths.extensionManifestPath, "utf8"));
  const resolvedExtensionId = extensionId || extensionIdFromPublicKey(extensionManifest.key);
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
  manifest.allowed_origins = [`chrome-extension://${resolvedExtensionId}/`];

  mkdirSync(dirname(paths.nativeManifestPath), { recursive: true });
  writeFileSync(paths.nativeManifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    extensionId: resolvedExtensionId,
    nodePath: resolvedNodePath,
    tokenPath: paths.tokenPath,
    ...paths,
  };
}
