import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

describe("single release dispatch contract", () => {
  test("version bump runs the unified component engine, not dispatch removed desktop workflows", () => {
    const source = readFileSync(".github/workflows/version-bump.yml", "utf8");
    // desktop 发布已迁移到 nolo 镜像：bun-nolo 的 version-bump 不得再 dispatch
    // 已删除的私有 desktop workflow。用组合 regex 断言缺失，同时避免把已删除
    // workflow 名作为活跃引用写进测试源码（release projection P0 引用卫生）。
    expect(/gh workflow run desktop-(alpha|release)\.yml/.test(source)).toBe(false);
    expect(source).not.toContain("gh workflow run desktop-stable-windows.yml");
    // 版本号仍由 version-bump 的统一组件引擎单源决定（CLI + desktop）。
    expect(source).toContain("publishComponents.mts");
  });

  test("binary tarball dispatch does not depend on gh being installed on the runner", () => {
    const source = readFileSync(".github/workflows/version-bump.yml", "utf8");
    expect(source).toContain("https://api.github.com/repos/${{ github.repository }}/actions/workflows/cli-binary-publish.yml/dispatches");
    expect(source).toContain('Authorization: Bearer ${GITHUB_TOKEN}');
    expect(source).toContain("NEW_CLI_TAG=$(git tag --points-at HEAD");
    expect(source).not.toContain('gh api -X POST "repos/${{ github.repository }}/actions/workflows/cli-binary-publish.yml/dispatches"');
  });

  test("dispatch JSON body is built with node from an env var, never spliced from github.ref_name", () => {
    const source = readFileSync(".github/workflows/version-bump.yml", "utf8");
    // ref_name 表达式不得直接拼进 --data 字符串：先经 env 透传，再以
    // node -e 从 process.env 安全注入 JSON body（self-hosted alpha-ci
    // runner 必有 node/bun，jq 不保证存在）。
    expect(source).toContain("DISPATCH_REF: ${{ github.ref_name }}");
    expect(source).toContain("DISPATCH_REF=\"$DISPATCH_REF\" node -e 'process.stdout.write(JSON.stringify({ref:process.env.DISPATCH_REF}))'");
    expect(source).not.toContain('--data \'{"ref":"${{ github.ref_name }}"}\'');
    expect(source).not.toContain("jq -n --arg ref");
    // 用便携的 --fail（不依赖 GitHub-hosted runner 的 curl 版本），
    // dispatch 失败时以 --write-out 的 http_code 兜住诊断信息。
    expect(source).toContain("--fail --silent --show-error");
    expect(source).toContain("--write-out '%{http_code}'");
    expect(source).not.toContain("--fail-with-body");
    expect(source).not.toContain("curl ≥ 7.76");
  });

  test("removed private desktop workflow files no longer exist", () => {
    const { existsSync } = require("node:fs");
    for (const removed of ["alpha", "release"] as const) {
      expect(existsSync(`.github/workflows/desktop-${removed}.yml`)).toBe(false);
    }
    expect(existsSync(".github/workflows/desktop-stable-windows.yml")).toBe(false);
  });
});
