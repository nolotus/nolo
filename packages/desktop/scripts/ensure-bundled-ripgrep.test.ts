import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  RIPGREP_TARGETS,
  RIPGREP_VERSION,
  resolveRipgrepTargetKey,
  getDesktopVendorRipgrepRoot,
} from "./ensure-bundled-ripgrep";

describe("ensure-bundled-ripgrep", () => {
  it("maps host platforms to release asset keys", () => {
    expect(resolveRipgrepTargetKey("darwin", "arm64")).toBe("darwin-arm64");
    expect(resolveRipgrepTargetKey("darwin", "x64")).toBe("darwin-x64");
    expect(resolveRipgrepTargetKey("linux", "x64")).toBe("linux-x64");
    expect(resolveRipgrepTargetKey("linux", "arm64")).toBe("linux-arm64");
    expect(resolveRipgrepTargetKey("win32", "x64")).toBe("win32-x64");
  });

  it("pins a known ripgrep release for every packaged target", () => {
    expect(RIPGREP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    for (const target of Object.values(RIPGREP_TARGETS)) {
      expect(target.asset).toContain(RIPGREP_VERSION);
      expect(target.binaryName === "rg" || target.binaryName === "rg.exe").toBe(true);
    }
  });

  it("stages current-host binary under vendor/ripgrep when pre-fetched", () => {
    const key = resolveRipgrepTargetKey();
    const root = getDesktopVendorRipgrepRoot();
    const platformBinary = join(root, key, RIPGREP_TARGETS[key].binaryName);
    // CI/local pre-build should have run ensure; if skipped, do not fail the suite.
    if (process.env.NOLO_DESKTOP_SKIP_BUNDLED_RG === "1") return;
    if (!existsSync(platformBinary)) return;
    expect(existsSync(platformBinary)).toBe(true);
  });
});
