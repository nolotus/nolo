import { describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { resolveWindowsInstallerRecoverySource } from "./scripts/buildStableWindowsInstallerRecovery";

// electrobun strips spaces from the app name for the raw non-macOS tar.
// This name must match the rawTarPath constant in build-stable-windows-installer.ts.
const ELECTROBUN_WIN_TAR_NAME = "NoloDesktop.tar";

function withTempDir(run: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), "nolo-desktop-win-recovery-"));
  try {
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function createPayloadDir(rootDir: string) {
  const payloadDir = join(rootDir, "NoloDesktop");
  mkdirSync(join(payloadDir, "Resources"), { recursive: true });
  mkdirSync(join(payloadDir, "bin"), { recursive: true });
  writeFileSync(join(payloadDir, "Resources", "main.js"), "console.log('ok');\n", "utf8");
  return payloadDir;
}

describe("buildStableWindowsInstallerRecovery", () => {
  it("uses the electrobun raw tar name for 'Nolo Desktop'", () => {
    // Source-contract: locks the recovery fixture to electrobun's current naming.
    // If this fails, update WINDOWS_DESKTOP_APP_FILE_NAME and electrobunTarName in
    // build-stable-windows-installer.ts to match the new electrobun output.
    expect(ELECTROBUN_WIN_TAR_NAME).toBe("NoloDesktop.tar");
  });

  it("prefers the raw tar when electrobun produced it", () => {
    withTempDir((dir) => {
      const buildDir = join(dir, "build");
      mkdirSync(buildDir, { recursive: true });
      createPayloadDir(buildDir);
      const rawTarPath = join(buildDir, ELECTROBUN_WIN_TAR_NAME);
      writeFileSync(rawTarPath, "tar placeholder\n", "utf8");

      expect(resolveWindowsInstallerRecoverySource({ buildDir, rawTarPath })).toEqual({
        kind: "tar",
        path: rawTarPath,
      });
    });
  });

  it("falls back to the existing payload directory when the raw tar is missing", () => {
    withTempDir((dir) => {
      const buildDir = join(dir, "build");
      mkdirSync(buildDir, { recursive: true });
      const payloadDir = createPayloadDir(buildDir);
      const rawTarPath = join(buildDir, ELECTROBUN_WIN_TAR_NAME);

      expect(resolveWindowsInstallerRecoverySource({ buildDir, rawTarPath })).toEqual({
        kind: "payload-dir",
        path: payloadDir,
      });
    });
  });

  it("throws when neither raw tar nor payload directory is available", () => {
    withTempDir((dir) => {
      const buildDir = join(dir, "build");
      mkdirSync(buildDir, { recursive: true });
      const rawTarPath = join(buildDir, ELECTROBUN_WIN_TAR_NAME);

      expect(() =>
        resolveWindowsInstallerRecoverySource({ buildDir, rawTarPath })
      ).toThrow("neither raw tar nor payload directory is available");
    });
  });
});
