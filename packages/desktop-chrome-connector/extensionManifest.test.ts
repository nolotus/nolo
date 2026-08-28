import { describe, expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { installNativeHostManifest } from "./nativeHostInstall.mjs";

const root = import.meta.dir;
const nodePath = Bun.which("node") ?? "node";

function extensionIdFromPublicKey(publicKeyBase64: string) {
  const digest = createHash("sha256").update(Buffer.from(publicKeyBase64, "base64")).digest();
  return Array.from(digest.subarray(0, 16), (byte) =>
    `${String.fromCharCode(97 + (byte >> 4))}${String.fromCharCode(97 + (byte & 15))}`
  ).join("");
}

describe("Nolo Chrome connector extension scaffold", () => {
  test("declares the unpacked Chrome extension permissions needed for desktop control", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "extension", "manifest.json"), "utf8")
    );

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toBe("Nolo Browser Connector");
    expect(extensionIdFromPublicKey(manifest.key)).toBe("ahpdoopadkamnglhlacfjdfnonpjdplg");
    expect(manifest.permissions).toEqual(expect.arrayContaining([
      "activeTab",
      "debugger",
      "nativeMessaging",
      "scripting",
      "tabs",
    ]));
    expect(manifest.permissions).not.toContain("<all_urls>");
    expect(manifest.background.service_worker).toBe("background.js");
  });

  test("ships a macOS native messaging manifest template and host entrypoint", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "native-host", "com.nolo.chrome_connector.json"), "utf8")
    );

    expect(manifest.name).toBe("com.nolo.chrome_connector");
    expect(manifest.type).toBe("stdio");
    expect(manifest.allowed_origins).toEqual(["chrome-extension://__EXTENSION_ID__/"]);
    expect(manifest.path).toContain("nolo-chrome-native-host.mjs");
    expect(existsSync(join(root, "native-host", "nolo-chrome-native-host.mjs"))).toBe(true);
    expect(existsSync(join(root, "scripts", "installNativeHostManifest.mjs"))).toBe(true);
    expect(existsSync(join(root, "README.md"))).toBe(true);
  });

  test("installer writes a stable native host wrapper with an absolute Node path", () => {
    const home = mkdtempSync(join(tmpdir(), "nolo-chrome-connector-home-"));
    try {
      execFileSync(nodePath, [
        join(root, "scripts", "installNativeHostManifest.mjs"),
      ], {
        cwd: root,
        env: {
          ...process.env,
          HOME: home,
        },
        encoding: "utf8",
      });

      const nativeManifestPath = join(
        home,
        "Library/Application Support/Google/Chrome/NativeMessagingHosts/com.nolo.chrome_connector.json",
      );
      const wrapperPath = join(
        home,
        "Library/Application Support/Nolo/ChromeConnector/nolo-chrome-native-host",
      );
      const tokenPath = join(
        home,
        "Library/Application Support/Nolo/ChromeConnector/token",
      );
      const nativeManifest = JSON.parse(readFileSync(nativeManifestPath, "utf8"));
      const wrapper = readFileSync(wrapperPath, "utf8");
      const token = readFileSync(tokenPath, "utf8").trim();

      expect(nativeManifest.path).toBe(wrapperPath);
      expect(nativeManifest.allowed_origins).toEqual([
        "chrome-extension://ahpdoopadkamnglhlacfjdfnonpjdplg/",
      ]);
      expect(wrapper).toContain("exec \"/");
      expect(wrapper).toContain("/node\" \"");
      expect(wrapper).toContain(`NOLO_CHROME_CONNECTOR_TOKEN=${JSON.stringify(token)}`);
      expect(token.length).toBeGreaterThanOrEqual(32);
      expect(wrapper).toContain("nolo-chrome-native-host.mjs");
      expect(statSync(wrapperPath).mode & 0o111).not.toBe(0);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("installer reuses the existing connector token on reinstall", () => {
    const home = mkdtempSync(join(tmpdir(), "nolo-chrome-connector-home-"));
    try {
      const first = installNativeHostManifest({
        home,
        connectorRoot: root,
        nodePath: "/usr/local/bin/node",
      } as any);
      const firstToken = readFileSync(first.tokenPath, "utf8").trim();

      const second = installNativeHostManifest({
        home,
        connectorRoot: root,
        nodePath: "/opt/homebrew/bin/node",
      } as any);
      const secondToken = readFileSync(second.tokenPath, "utf8").trim();
      const wrapper = readFileSync(second.wrapperPath, "utf8");

      expect(secondToken).toBe(firstToken);
      expect(wrapper).toContain(`NOLO_CHROME_CONNECTOR_TOKEN=${JSON.stringify(firstToken)}`);
      expect(wrapper).toContain("/opt/homebrew/bin/node");
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
