import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("single release dispatch contract", () => {
  test("version bump runs semantic-release once per component, not dispatch removed desktop workflows", () => {
    const source = readFileSync(".github/workflows/version-bump.yml", "utf8");
    // desktop 发布已迁移到 nolo 镜像：bun-nolo 的 version-bump 不得再 dispatch
    // 已删除的私有 desktop workflow（desktop-alpha/desktop-release）。
    expect(source).not.toContain("gh workflow run desktop-alpha.yml");
    expect(source).not.toContain("gh workflow run desktop-release.yml");
    expect(source).not.toContain("gh workflow run desktop-stable-windows.yml");
    // 版本号仍由 version-bump 的 semantic-release 单源决定（CLI + desktop）。
    expect(source).toContain("NOLO_RELEASE_CONFIG: cli");
    expect(source).toContain("NOLO_RELEASE_CONFIG: desktop");
  });

  test("removed private desktop workflow files no longer exist", () => {
    const { existsSync } = require("node:fs");
    expect(existsSync(".github/workflows/desktop-alpha.yml")).toBe(false);
    expect(existsSync(".github/workflows/desktop-release.yml")).toBe(false);
    expect(existsSync(".github/workflows/desktop-stable-windows.yml")).toBe(false);
  });
});
