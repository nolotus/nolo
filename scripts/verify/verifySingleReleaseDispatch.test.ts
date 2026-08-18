import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const files = [
  ".github/workflows/cli-npm-publish.yml",
  ".github/workflows/desktop-alpha.yml",
  ".github/workflows/desktop-release.yml",
];

describe("single release dispatch contract", () => {
  test("publishing workflows are not push-triggered", () => {
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      expect(source).not.toMatch(/\n  push:\n/);
      expect(source).toContain("workflow_dispatch:");
    }
  });

  test("stable desktop retains repository dispatch compatibility", () => {
    expect(readFileSync(files[2], "utf8")).toContain("repository_dispatch:");
  });

  test("version bump dispatches alpha and stable desktop workflows", () => {
    const source = readFileSync(".github/workflows/version-bump.yml", "utf8");
    expect(source).toContain("gh workflow run desktop-alpha.yml");
    expect(source).toContain("gh workflow run desktop-release.yml");
  });
});
