import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { validateReleaseUpdateCompatibility, type ReleaseCompatibilityInputs } from "./verifyReleaseUpdateCompatibility";

const root = `${import.meta.dir}/../..`;
const read = (path: string) => readFileSync(`${root}/${path}`, "utf8");
const valid: ReleaseCompatibilityInputs = {
  cliVersion: JSON.parse(read("packages/cli/package.json")).version,
  declaredCliVersion: read("packages/app/constants/cliDownloads.ts").match(/NOLO_CLI_VERSION\s*=\s*["']([^"']+)["']/)?.[1],
  cliDownloads: read("packages/app/constants/cliDownloads.ts"),
  cliUpdateCommands: read("packages/cli/updateCommands.ts"),
  desktopAlpha: read(".github/workflows/desktop-alpha.yml"),
  desktopStable: read(".github/workflows/desktop-release.yml"),
  versionBump: read(".github/workflows/version-bump.yml"),
};

describe("release/update compatibility gate", () => {
  test("passes the checked-in CLI and desktop contracts", () => {
    expect(() => validateReleaseUpdateCompatibility(valid)).not.toThrow();
  });

  test("fails when CLI package and displayed versions diverge", () => {
    expect(() => validateReleaseUpdateCompatibility({ ...valid, declaredCliVersion: "0.0.0" })).toThrow(/does not match/);
  });

  test("fails when a desktop channel loses legacy alias verification", () => {
    expect(() => validateReleaseUpdateCompatibility({ ...valid, desktopAlpha: valid.desktopAlpha.replace(/legacy alias/g, "removed") })).toThrow(/legacy alias/);
  });
});
