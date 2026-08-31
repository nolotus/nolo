import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("publishNoloCli source contract", () => {
  test("gives agents a single publish entrypoint and verifies npm", () => {
    const source = readFileSync(join(import.meta.dir, "publishNoloCli.sh"), "utf8");

    expect(source).toContain("nolotus/nolo");
    expect(source).toContain("cli-publish.yml");
    expect(source).toContain("printf 'main'");
    expect(source).not.toContain("printf 'alpha'");
    expect(source).toContain("dist_tag=${CHANNEL}");
    expect(source).toContain("validate_version_alignment");
    expect(source).toContain('"$GH_BIN" run watch');
    expect(source).toContain("registry.npmjs.org/nolo-cli");
    expect(source).toContain("NOLO_CLI_PUBLISH_TAG_VERIFY_ATTEMPTS:-180");
    expect(source).toContain('seq 1 "$max_attempts"');
    expect(source).not.toContain("verify_open_source_mirror");
    expect(source).toContain("Do not ask the user to run gh manually");
  });

  test("token env reads use set -u-safe defaults in both release scripts", () => {
    const publishSource = readFileSync(join(import.meta.dir, "publishNoloCli.sh"), "utf8");
    const syncSource = readFileSync(join(import.meta.dir, "../ci/syncNoloOpenSourceMirror.sh"), "utf8");

    // 两个脚本都在 set -euo pipefail 下运行：SYNC_GH_TOKEN / CLI_MIRROR_GH_TOKEN
    // 未设置时必须以 ${VAR:-} 形式读取，否则会因 set -u 直接退出。
    expect(publishSource).toContain("set -Eeuo pipefail");
    expect(publishSource).toContain('${SYNC_GH_TOKEN:-}');
    expect(publishSource).toContain('${CLI_MIRROR_GH_TOKEN:-}');
    expect(syncSource).toContain("set -euo pipefail");
    expect(syncSource).toContain('${SYNC_GH_TOKEN:-${CLI_MIRROR_GH_TOKEN:-}}');

    // 兜底：脚本级语法探测 —— 不带任何 token env 也能完整通过 bash -n
    // （对齐守卫的 set -u 阶段因此被覆盖：未定义变量会在此阶段就被 shell
    // 解析器暴露）。bash -n 不执行网络请求，测试保持离线确定。
    for (const script of ["publishNoloCli.sh", "../ci/syncNoloOpenSourceMirror.sh"]) {
      expect(() =>
        execFileSync("bash", ["-n", join(import.meta.dir, script)], { stdio: "pipe" }),
      ).not.toThrow();
    }
  });

  test("manual publish refuses dispatch when remote @main version differs from local", () => {
    const source = readFileSync(join(import.meta.dir, "publishNoloCli.sh"), "utf8");

    // dispatch 前先对公开仓 nolotus/nolo@main 做远程 version 对齐断言。
    expect(source).toContain("validate_remote_version_alignment");
    expect(source).toContain("contents/packages/cli/package.json?ref=main");
    expect(source).toContain('Buffer.from(j.content, "base64")');
    // 远程 ≠ 本地 时必须拒绝 dispatch（return 1），并提示先对齐公开投影。
    expect(source).toContain('"$remote_version" != "$local_version"');
    expect(source).toContain("refusing to dispatch");
    expect(source).toContain("syncNoloOpenSourceMirror.sh");
    // 守卫必须在 trigger_workflow 之前执行。
    const mainBody = source.slice(source.indexOf("main()"));
    const triggerIdx = mainBody.indexOf("trigger_workflow");
    expect(triggerIdx).toBeGreaterThan(-1);
    expect(mainBody.slice(0, triggerIdx)).toContain("validate_remote_version_alignment");
    // 旧的私有仓 alpha/main branch-sync 检查已删除，不再指向本地 origin。
    expect(source).not.toContain("validate_branch_sync");
  });
});
