import { describe, expect, test } from "bun:test";
import { applyOpenSourcePackageOverlay } from "./openSourcePackageOverlay";

describe("openSourcePackageOverlay", () => {
  test("points package metadata at the public nolo-cli repository", () => {
    const manifest = applyOpenSourcePackageOverlay({
      name: "nolo-cli",
      version: "0.1.46",
      bin: { nolo: "index.ts" },
    });

    expect(manifest.repository).toEqual({
      type: "git",
      url: "git+https://github.com/nolotus/nolo-cli.git",
    });
    expect(manifest.bugs).toEqual({
      url: "https://github.com/nolotus/nolo-cli/issues",
    });
    expect(manifest.homepage).toBe("https://github.com/nolotus/nolo-cli#readme");
    expect(manifest.scripts).toEqual({
      test: "bun test",
      "pack:dry-run": "npm pack --dry-run",
    });
  });
});