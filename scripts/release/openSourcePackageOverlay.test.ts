import { describe, expect, test } from "bun:test";
import { applyOpenSourcePackageOverlay } from "./openSourcePackageOverlay";

describe("openSourcePackageOverlay", () => {
  test("points package metadata at the public nolo repository", () => {
    const manifest = applyOpenSourcePackageOverlay({
      name: "nolo-cli",
      version: "0.1.46",
      bin: { nolo: "index.ts" },
    });

    expect(manifest.repository).toEqual({
      type: "git",
      url: "git+https://github.com/nolotus/nolo.git",
    });
    expect(manifest.bugs).toEqual({
      url: "https://github.com/nolotus/nolo/issues",
    });
    expect(manifest.homepage).toBe("https://github.com/nolotus/nolo#readme");
    expect(manifest.scripts).toEqual({
      test: "bun test",
      "pack:dry-run": "npm pack --dry-run",
    });
  });
});