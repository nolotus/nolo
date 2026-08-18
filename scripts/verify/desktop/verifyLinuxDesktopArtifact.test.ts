import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SCRIPT_PATH = join(
  process.cwd(),
  "scripts/verify/desktop/verifyLinuxDesktopArtifact.sh"
);

describe("verifyLinuxDesktopArtifact.sh", () => {
  it("exists and is a bash script", () => {
    expect(existsSync(SCRIPT_PATH)).toBe(true);
    const source = readFileSync(SCRIPT_PATH, "utf8");
    expect(source.startsWith("#!/usr/bin/env bash")).toBe(true);
  });

  it("refuses to run on non-Linux hosts", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");
    expect(source).toContain('$(uname -s)" != "Linux"');
  });

  it("handles .deb, .tar.zst, and .AppImage", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");
    expect(source).toContain('*.deb)');
    expect(source).toContain('*.tar.zst)');
    expect(source).toContain('*.AppImage)');
  });

  it("checks the .desktop file when verifying .deb", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");
    expect(source).toContain("nolo-desktop.desktop");
    expect(source).toContain("\\[Desktop Entry\\]");
  });

  it("verifies the /usr/bin/nolo-desktop symlink target", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");
    expect(source).toContain("/usr/bin/nolo-desktop");
    expect(source).toContain("readlink");
  });

  it("rejects tarballs smaller than 1MB to catch partial extracts", () => {
    const source = readFileSync(SCRIPT_PATH, "utf8");
    expect(source).toContain("1000000");
  });
});
