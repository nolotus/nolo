import { describe, expect, it } from "bun:test";

const read = (path: string) => Bun.file(path).text();

// desktop-alpha, desktop-release, desktop-windows-preflight 已迁移到公开仓库
// nolotus/nolo 的 desktop-build.yml（GitHub-hosted runner 在公开仓库免费）。
// 这三个 workflow 在私有仓库保留为禁用 stub（on: {}），不再消耗账户级 Actions 分钟。
// 当 workflow 处于禁用状态时跳过内容断言——合规逻辑已转移到公开仓库镜像脚本测试。
const isDisabled = (source: string) => source.trim().includes("on: {}");

describe("workflowCostPolicy", () => {
  it("keeps macOS desktop packaging off the local command path in alpha, allows self-hosted stable", async () => {
    const alphaSource = await read(".github/workflows/desktop-alpha.yml");
    const stableSource = await read(".github/workflows/desktop-release.yml");
    const packageJson = await read("package.json");

    for (const source of [alphaSource, stableSource]) {
      expect(source).not.toContain("mac-local");
      expect(source).not.toContain("verifyDesktopMacLocalArtifacts.sh");
      expect(source).not.toContain("verifyPublishedMacDownload.sh");
      expect(source).not.toContain("verifyPublishedMacArtifact.sh");
    }
    // macOS forbidden patterns only apply to alpha (stable now uses self-hosted macOS runner)
    if (!isDisabled(alphaSource)) {
      expect(alphaSource).not.toContain("runner.os == 'macOS'");
      expect(alphaSource).not.toContain("self-hosted, macOS");
    }
    expect(packageJson).toContain('"desktop:build:alpha": "bun run --cwd packages/desktop build:alpha"');
    expect(packageJson).toContain('"desktop:build:stable": "bun run --cwd packages/desktop build:stable"');
    expect(packageJson).toContain('"verify:desktop:mac:local": "bash ./scripts/verify/desktop/verifyDesktopMacLocalArtifacts.sh"');
    expect(packageJson).toContain('"verify:desktop:mac:signing-env"');
    if (!isDisabled(alphaSource)) {
      expect(alphaSource).not.toContain("NOLO_DESKTOP_SKIP_DMG=1");
    }
    if (!isDisabled(stableSource)) {
      expect(stableSource).not.toContain("NOLO_DESKTOP_SKIP_DMG=1");
    }
  });

  it("runs Windows desktop workflows on GitHub-hosted runners and allows self-hosted macOS in stable", async () => {
    const alphaSource = await read(".github/workflows/desktop-alpha.yml");
    const stableSource = await read(".github/workflows/desktop-release.yml");
    const stableWindowsSource = await read(".github/workflows/desktop-stable-windows.yml");
    const preflightSource = await read(".github/workflows/desktop-windows-preflight.yml");
    const detoxSource = await read(".github/workflows/rn-detox-e2e.yml");

    // 禁用 workflow 跳过 runner 检查（已迁移到公开仓库 desktop-build.yml，由镜像测试覆盖）
    const activeDesktopWorkflows = [alphaSource, stableSource, stableWindowsSource, preflightSource].filter(
      (s) => !isDisabled(s)
    );
    for (const source of activeDesktopWorkflows) {
      expect(source).toContain("windows-latest");
      expect(source).not.toContain("windows-local");
      expect(source).not.toContain("self-hosted, Windows");
    }
    // macOS forbidden patterns only apply to alpha and detox (stable now uses self-hosted macOS runner)
    for (const source of [alphaSource, detoxSource]) {
      if (!isDisabled(source)) {
        expect(source).not.toContain("macos-latest");
        expect(source).not.toContain("mac-local");
        expect(source).not.toContain("self-hosted, macOS");
      }
    }
    // Stable release uses self-hosted macOS runner, not GitHub-hosted macos-latest or mac-local
    if (!isDisabled(stableSource)) {
      expect(stableSource).toContain('"self-hosted","macOS"');
      expect(stableSource).not.toContain("macos-latest");
      expect(stableSource).not.toContain("mac-local");
    }
    expect(detoxSource).toContain("runs-on: ubuntu-latest");
  });

  it("does not use GitHub cache or artifact storage for self-hosted Linux paths", async () => {
    const mainSource = await read(".github/workflows/main.yml");
    const localFirstSource = await read(".github/workflows/local-first-phase1.yml");
    const alphaSource = await read(".github/workflows/desktop-alpha.yml");
    const stableSource = await read(".github/workflows/desktop-release.yml");

    expect(mainSource).not.toContain("actions/cache");
    expect(localFirstSource).not.toContain("actions/cache");
    expect(alphaSource).not.toContain("actions/cache");
    expect(stableSource).not.toContain("actions/cache");
    expect(alphaSource).not.toContain("actions/upload-artifact");
    expect(alphaSource).not.toContain("actions/download-artifact");
    expect(stableSource).not.toContain("actions/upload-artifact");
    expect(stableSource).not.toContain("actions/download-artifact");
    if (!isDisabled(alphaSource)) {
      expect(alphaSource).toContain("max-parallel: 1");
    }
    if (!isDisabled(stableSource)) {
      expect(stableSource).toContain("max-parallel: 1");
    }
  });

  it("pins Linux desktop builds to runner disk TMPDIR in both alpha and stable workflows", async () => {
    const alphaSource = await read(".github/workflows/desktop-alpha.yml");
    const stableSource = await read(".github/workflows/desktop-release.yml");

    // 禁用 workflow 已迁移到公开仓库，TMPDIR 固定逻辑在镜像脚本生成
    // 的 desktop-build.yml 里。这里只检查仍活跃的 workflow。
    for (const source of [alphaSource, stableSource]) {
      if (!isDisabled(source)) {
        expect(source).toContain("TMPDIR: ${{ runner.temp }}");
      }
    }

    if (!isDisabled(stableSource)) {
      const stableBuild = stableSource.indexOf("Build desktop stable artifacts");
      const stableTmp = stableSource.indexOf("TMPDIR: ${{ runner.temp }}");
      expect(stableBuild).toBeGreaterThanOrEqual(0);
      expect(stableTmp).toBeGreaterThan(stableBuild);
    }

    if (!isDisabled(alphaSource)) {
      const alphaBuild = alphaSource.indexOf("Build desktop alpha artifacts");
      const alphaTmp = alphaSource.indexOf("TMPDIR: ${{ runner.temp }}");
      expect(alphaBuild).toBeGreaterThanOrEqual(0);
      expect(alphaTmp).toBeGreaterThan(alphaBuild);
    }
  });

  it("keeps the alpha token usage probe manual-only and audited immediately after it runs", async () => {
    const source = await read(".github/workflows/main.yml");

    expect(source).toContain("alpha_token_probe:");
    expect(source).toContain("Probe alpha token usage split ledger");
    expect(source).toContain("github.event_name == 'workflow_dispatch'");
    expect(source).toContain("inputs.alpha_token_probe == true");
    expect(source).toContain("bash ./scripts/ci/runAlphaServerCi.sh alpha-token-probe");
    expect((await read("scripts/ci/runAlphaServerCi.sh"))).toContain("agent-pub-01DSV4FLASHPB00000000JFPFD");
    expect((await read("scripts/ci/runAlphaServerCi.sh"))).not.toContain("--no-default-test-root");
    expect(source.indexOf("Probe alpha token usage split ledger")).toBeLessThan(
      source.indexOf("Audit alpha billing ledger after probe")
    );
  });

  it("passes npm auth directly to the CLI publish steps instead of relying on a package-local npmrc", async () => {
    const source = await read(".github/workflows/cli-npm-publish.yml");
    const scriptSource = await read("scripts/ci/runCliPublishCi.sh");
    expect(source).not.toContain("\n  push:\n");
    expect(source).toContain("workflow_dispatch:");
    expect(source).toContain("dist_tag:");
    expect(source).toContain("Publish nolo-cli");
    expect(source).toContain("bash ./scripts/ci/runCliPublishCi.sh");
    expect(scriptSource).toContain("publish_or_update_dist_tag()");
    expect(scriptSource).toContain("dist-tag add");
    expect(source).toContain("NPM_TOKEN: ${{ secrets.NPM_TOKEN }}");
    expect(source).toContain("token: ${{ secrets.NPM_TOKEN }}");
    expect(scriptSource).toContain("whoami");
    expect(scriptSource).toContain("validate_cli_version_alignment");
    expect(scriptSource).toContain("verify_published_dist_tag");
    expect(scriptSource).toContain("NOLO_CLI_PUBLISH_TAG_VERIFY_ATTEMPTS");
    expect(scriptSource).toContain("dist-tag lag");
    expect(scriptSource).toContain("npm_auth_token()");
    expect(scriptSource).toContain('printf \'%s\' "${NPM_TOKEN:-${NODE_AUTH_TOKEN:-}}"');
    expect(scriptSource).toContain('NODE_AUTH_TOKEN="$(npm_auth_token)"');
    expect(source).not.toContain('printf \'//registry.npmjs.org/:_authToken=%s\\nregistry=https://registry.npmjs.org/\\n\' "$NPM_TOKEN" > .npmrc');
  });

  // CI smoke uses nolotus account (0e95801d90) agent for alpha smoke.
  // Demo account (b2e06f801f) has been deleted.
  it("keeps the alpha maintenance smoke on a private fireworks agent key", async () => {
    const source = await read(".github/workflows/maintenance.yml");
    const alphaServerCiSource = await read("scripts/ci/runAlphaServerCi.sh");
    expect(source).toContain("Smoke agent run through alpha");
    expect(source).toContain("bash ./scripts/ci/runAlphaServerCi.sh alpha-agent-smoke");
    expect(alphaServerCiSource).toContain('NOLO_SERVER="$ALPHA_PUBLIC_BASE"');
    expect(alphaServerCiSource).toContain("agent-0e95801d90-01KIMILATEST0000000190TF2K");
    expect(alphaServerCiSource).not.toContain("agent-pub-01DICHEAPLLM00000000B2SOQW");
    expect(alphaServerCiSource).not.toContain("agent-pub-01MIMO25MONTH0000000NEW001");
  });
});
