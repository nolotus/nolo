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

export function resolveNativeHostInstallPaths({
  home = process.env.HOME || "",
  connectorRoot = DEFAULT_CONNECTOR_ROOT,
} = {}) {
  const supportDir = resolve(home, "Library/Application Support/Nolo/ChromeConnector");
  return {
    connectorRoot,
    extensionManifestPath: resolve(connectorRoot, "extension", "manifest.json"),
    hostPath: resolve(connectorRoot, "native-host", "nolo-chrome-native-host.mjs"),
    templatePath: resolve(connectorRoot, "native-host", "com.nolo.chrome_connector.json"),
    nativeManifestPath: resolve(
      home,
      "Library/Application Support/Google/Chrome/NativeMessagingHosts/com.nolo.chrome_connector.json",
    ),
    supportDir,
    tokenPath: resolve(supportDir, "token"),
    wrapperPath: resolve(supportDir, "nolo-chrome-native-host"),
  };
}

export function installNativeHostManifest({
  home = process.env.HOME || "",
  connectorRoot = DEFAULT_CONNECTOR_ROOT,
  extensionId,
  nodePath,
} = {}) {
  const paths = resolveNativeHostInstallPaths({ home, connectorRoot });
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
