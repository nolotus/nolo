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
  versionBump: read(".github/workflows/version-bump.yml"),
};

describe("release/update compatibility gate", () => {
  test("passes the checked-in CLI and desktop contracts", () => {
    expect(() => validateReleaseUpdateCompatibility(valid)).not.toThrow();
  });

  test("fails when CLI package and displayed versions diverge", () => {
    expect(() => validateReleaseUpdateCompatibility({ ...valid, declaredCliVersion: "0.0.0" })).toThrow(/does not match/);
  });

  test("fails when desktop version source leaves the unified version writer", () => {
    expect(() =>
      validateReleaseUpdateCompatibility({
        ...valid,
        versionBump: valid.versionBump.replace("NOLO_RELEASE_CONFIG: desktop", ""),
      }),
    ).toThrow(/no longer runs Desktop semantic-release/);
  });

  test("fails when private version-bump dispatches a removed desktop workflow", () => {
    expect(() =>
      validateReleaseUpdateCompatibility({
        ...valid,
        versionBump: valid.versionBump + "\ngh workflow run desktop-release.yml",
      }),
    ).toThrow(/must no longer dispatch removed desktop workflows/);
  });

  test("passes a public-mirror version-bump that dispatches cli-publish and desktop-build (no semantic-release)", () => {
    // 公开镜像 nolo 的 version-bump：不含 NOLO_RELEASE_CONFIG（不跑 semantic-release，
    // 版本号从 bun-nolo 同步），只 dispatch cli-publish/desktop-build。
    const publicVersionBump = [
      "on:",
      "  push:",
      "jobs:",
      "  bump:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      '      - run: bun scripts/verify/verifyReleaseUpdateCompatibility.ts',
      "      - run: gh workflow run cli-publish.yml -f dist_tag=alpha",
      "      - run: gh workflow run desktop-build.yml -f targets=all",
    ].join("\n");
    expect(() =>
      validateReleaseUpdateCompatibility({ ...valid, versionBump: publicVersionBump }),
    ).not.toThrow();
  });

  test("fails a public-mirror version-bump that runs semantic-release", () => {
    const publicVersionBumpWithSemantic = [
      "on:",
      "  push:",
      "jobs:",
      "  bump:",
      "    runs-on: ubuntu-latest",
      "    steps:",
      '      - run: npx semantic-release',
      "      - run: gh workflow run cli-publish.yml",
    ].join("\n");
    expect(() =>
      validateReleaseUpdateCompatibility({ ...valid, versionBump: publicVersionBumpWithSemantic }),
    ).toThrow(/public repo version-bump must not run semantic-release/);
  });
});
