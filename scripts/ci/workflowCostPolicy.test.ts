import { describe, expect, it } from "bun:test";
import { readdirSync } from "node:fs";
import { componentsForCommit } from "../release/componentSemanticRelease.mjs";

const read = (path: string) => Bun.file(path).text();

describe("workflowCostPolicy", () => {
  it("keeps every checked-in workflow structurally runnable", async () => {
    const invalid: string[] = [];
    for (const name of readdirSync(".github/workflows").filter((file) => /\.ya?ml$/.test(file))) {
      const source = await read(`.github/workflows/${name}`);
      try {
        const workflow = Bun.YAML.parse(source) as { jobs?: Record<string, unknown> };
        if (/^\s*on:\s*\{\}\s*$/m.test(source) || !workflow.jobs || Object.keys(workflow.jobs).length === 0) {
          invalid.push(name);
        }
      } catch {
        invalid.push(name);
      }
    }
    expect(invalid).toEqual([]);
  });

  it("releases desktop runtime and publisher changes through the unified version writer", async () => {
    const source = await read(".github/workflows/version-bump.yml");
    expect(source).toContain('"packages/**"');
    expect(source).toContain('"scripts/release/**"');
    expect(source).toContain('"scripts/dev/**"');
    expect(source).toContain('"scripts/helpers/desktopReleasePublisher*"');
    expect(
      componentsForCommit({
        message: "fix(release): repair desktop publishing",
        paths: [
          "packages/desktop-runtime/entry.ts",
          "scripts/release/publishDesktopDownloads.ts",
          "scripts/helpers/desktopReleasePublisher.ts",
        ],
      }),
    ).toEqual(["desktop"]);
  });

  it("runs each component release once while preserving failure isolation", async () => {
    const source = await read(".github/workflows/version-bump.yml");
    const workflow = Bun.YAML.parse(source) as {
      jobs: { bump: { steps: Array<Record<string, unknown>> } };
    };
    const steps = workflow.jobs.bump.steps;
    const allReleaseSteps = steps.filter(
      (step) =>
        typeof step.run === "string" &&
        /(^|\s)(?:npx\s+)?semantic-release(?:\s|$)/.test(step.run),
    );
    const releaseSteps = steps.filter((step) => step.run === "bunx semantic-release");

    const planIndex = steps.findIndex((step) => step.name === "Plan component releases");
    const notesIndex = steps.findIndex(
      (step) => step.name === "Fetch semantic-release channel notes",
    );
    const setupIndex = steps.findIndex((step) => step.uses === "oven-sh/setup-bun@v2");
    const installIndex = steps.findIndex(
      (step) => step.run === "bun install --frozen-lockfile",
    );
    expect(planIndex).toBeGreaterThanOrEqual(0);
    expect(notesIndex).toBeGreaterThanOrEqual(0);
    expect(notesIndex).toBeLessThan(planIndex);
    expect(steps[notesIndex]?.run).toBe(
      "git fetch --no-tags origin '+refs/notes/semantic-release*:refs/notes/semantic-release*'",
    );
    expect(planIndex).toBeLessThan(setupIndex);
    expect(planIndex).toBeLessThan(installIndex);
    expect(steps[planIndex]).toMatchObject({
      id: "release-plan",
      run: "node scripts/release/planComponentReleases.mjs",
    });
    expect(steps[setupIndex]?.if).toBe("steps.release-plan.outputs.any == 'true'");
    expect(steps[installIndex]?.if).toBe("steps.release-plan.outputs.any == 'true'");
    expect(steps.find((step) => step.id === "release-preflight")).toMatchObject({
      if: "steps.release-plan.outputs.any == 'true'",
      run: 'echo "ready=true" >> "$GITHUB_OUTPUT"',
    });

    expect(allReleaseSteps).toHaveLength(2);
    expect(releaseSteps).toEqual([
      {
        name: "Run CLI semantic-release",
        id: "cli-release",
        if: "steps.release-preflight.outputs.ready == 'true' && steps.release-plan.outputs.cli == 'true'",
        env: {
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}",
          NOLO_RELEASE_CONFIG: "cli",
        },
        run: "bunx semantic-release",
      },
      {
        name: "Run Desktop semantic-release",
        id: "desktop-release",
        if: "${{ !cancelled() && steps.release-preflight.outputs.ready == 'true' && steps.release-plan.outputs.desktop == 'true' }}",
        env: {
          GITHUB_TOKEN: "${{ secrets.GITHUB_TOKEN }}",
          NOLO_RELEASE_CONFIG: "desktop",
        },
        run: "bunx semantic-release",
      },
    ]);
    expect(source).not.toContain("desktop-dry-run");
    // CLI 发布已迁移到公开镜像仓库 nolo：version-bump 不再 dispatch 已删除的
    // 私有 cli-npm-publish workflow，CLI 的 npm 发布由 nolo 的 version-bump dispatch
    // cli-publish 承担。
    expect(steps.find((step) => step.name === "Dispatch CLI npm publish")).toBeUndefined();
    expect(source).not.toContain("gh workflow run cli-npm-publish.yml");
    // Desktop 发布已迁移到公开镜像仓库 nolo：version-bump 不再 dispatch 已删除的
    // 私有 desktop workflow，desktop 构建/发布由 nolo 的 desktop-build 在快照同步后承担。
    expect(steps.find((step) => step.name === "Dispatch desktop release")).toBeUndefined();
    expect(source).not.toContain("gh workflow run desktop-alpha.yml");
    expect(source).not.toContain("gh workflow run desktop-release.yml");
  });

  it("does not use GitHub cache or artifact storage for self-hosted Linux paths", async () => {
    const mainSource = await read(".github/workflows/main.yml");
    const localFirstSource = await read(".github/workflows/local-first-phase1.yml");
    const cliBinarySource = await read(".github/workflows/cli-binary-publish.yml");

    expect(mainSource).not.toContain("actions/cache");
    expect(localFirstSource).not.toContain("actions/cache");
    expect(cliBinarySource).not.toContain("Restore R2 cache");
    expect(cliBinarySource).not.toContain("Save R2 cache");
    expect(cliBinarySource).not.toContain("BUN_INSTALL_CACHE_DIR");
    expect(cliBinarySource).not.toContain("s5cmd");
    expect(cliBinarySource).not.toContain("cli-binary-cache.tar.gz");
    expect(cliBinarySource).not.toContain("/home/runner/cache");
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

  it("keeps npm auth passed directly through runCliPublishCi.sh instead of a package-local npmrc", async () => {
    // CLI 发布 workflow 已迁移到公开镜像仓库 nolo（由镜像脚本生成 cli-publish.yml），
    // bun-nolo 私有仓不再含 cli-npm-publish.yml。这里验证共享发布脚本 runCliPublishCi.sh
    // 仍保持 npm auth 直传的契约（不写 package-local .npmrc）。
    const scriptSource = await read("scripts/ci/runCliPublishCi.sh");
    expect(scriptSource).toContain("publish_or_update_dist_tag()");
    expect(scriptSource).toContain("dist-tag add");
    expect(scriptSource).toContain("whoami");
    expect(scriptSource).toContain("validate_cli_version_alignment");
    expect(scriptSource).toContain("verify_published_dist_tag");
    expect(scriptSource).toContain("NOLO_CLI_PUBLISH_TAG_VERIFY_ATTEMPTS");
    expect(scriptSource).toContain("dist-tag lag");
    expect(scriptSource).toContain("npm_auth_token()");
    expect(scriptSource).toContain('printf \'%s\' "${NPM_TOKEN:-${NODE_AUTH_TOKEN:-}}"');
    expect(scriptSource).toContain('NODE_AUTH_TOKEN="$(npm_auth_token)"');
    expect(scriptSource).not.toContain('printf \'//registry.npmjs.org/:_authToken=%s\\nregistry=https://registry.npmjs.org/\\n\' "$NPM_TOKEN" > .npmrc');
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
