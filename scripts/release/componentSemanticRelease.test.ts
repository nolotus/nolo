import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  analyzeCommits,
  componentsForCommit,
  filterCommitsForComponent,
  generateNotes,
  readCommitPaths,
} from "./componentSemanticRelease.mjs";
import { SEED_PACKAGES } from "./prepareNoloOpenSourceMirror";

const temporaryRepositories: string[] = [];

afterEach(() => {
  for (const repository of temporaryRepositories.splice(0)) {
    rmSync(repository, { recursive: true, force: true });
  }
});

describe("component semantic release policy", () => {
  it("keeps Desktop publisher and runtime fixes out of CLI releases", () => {
    expect(
      componentsForCommit({
        message: "fix(release): verify compressed desktop manifests",
        paths: [
          "scripts/helpers/desktopReleasePublisher.ts",
          "scripts/release/publishDesktopDownloads.ts",
        ],
      }),
    ).toEqual(["desktop"]);

    expect(
      componentsForCommit({
        message: "fix(desktop): align installed smoke with standalone runtime",
        paths: ["packages/desktop-runtime/entry.ts"],
      }),
    ).toEqual(["desktop"]);
  });

  it("uses component scopes as additive ownership, never as a path override", () => {
    expect(
      componentsForCommit({
        message: "feat(cli): expose local runtime diagnostics",
        paths: ["packages/agent-runtime/runtimeFacts.ts"],
      }),
    ).toEqual(["cli", "desktop"]);
    expect(
      componentsForCommit({
        message: "fix(desktop): reuse a CLI machine connector",
        paths: ["packages/cli/machineCommands.ts"],
      }),
    ).toEqual(["cli", "desktop"]);
    expect(
      componentsForCommit({
        message: "feat(cli,desktop): add a shared runtime capability",
        paths: ["packages/agent-runtime/runtimeFacts.ts"],
      }),
    ).toEqual(["cli", "desktop"]);
    expect(
      componentsForCommit({
        message: "fix(cli): mislabeled Desktop repair",
        paths: ["packages/desktop-runtime/entry.ts"],
      }),
    ).toEqual(["cli", "desktop"]);
  });

  it("conservatively releases both components for shared product inputs", () => {
    for (const path of [
      "package.json",
      "bun.lock",
      "packages/agent-runtime/localLoop.ts",
      "packages/ai/tools/prepareTools.ts",
      "packages/app/utils/desktopAgentRuntimeTurnClient.ts",
      "packages/chat/messages/types.ts",
      "packages/database/client/index.ts",
      "packages/integrations/openai/index.ts",
    ]) {
      expect(
        componentsForCommit({ message: "fix(agent): repair shared behavior", paths: [path] }),
      ).toEqual(["cli", "desktop"]);
    }
    expect(
      componentsForCommit({
        message: "fix: update an unscoped CLI runtime dependency",
        paths: ["packages/cli/machineCommands.ts"],
      }),
    ).toEqual(["cli", "desktop"]);
  });

  it("covers every package seeded into the Desktop public build", () => {
    for (const packageName of SEED_PACKAGES) {
      expect(
        componentsForCommit({
          message: "fix: update a Desktop build input",
          paths: [`packages/${packageName}/index.ts`],
        }),
      ).toContain("desktop");
    }
  });

  it("does not version products for shared release infrastructure fixes", () => {
    expect(
      componentsForCommit({
        message: "fix(release): restore semantic-release changelog generation",
        paths: [
          ".releaserc.cli.json",
          ".releaserc.desktop.json",
          ".github/workflows/version-bump.yml",
          "scripts/release/componentSemanticRelease.mjs",
        ],
      }),
    ).toEqual([]);
    expect(
      componentsForCommit({
        message: "fix(release): tolerate npm package processing delay",
        paths: [".github/workflows/cli-binary-publish.yml"],
      }),
    ).toEqual(["cli"]);
    expect(
      componentsForCommit({
        message: "fix(release): update a runtime dependency",
        paths: ["package.json"],
      }),
    ).toEqual(["cli", "desktop"]);
  });

  it("tracks the private Desktop runtime's precise server dependency", () => {
    expect(
      componentsForCommit({
        message: "fix(agent): record provider availability",
        paths: ["packages/server/agentAvailability/agentAvailability.ts"],
      }),
    ).toEqual(["desktop"]);
    expect(
      componentsForCommit({
        message: "fix(server): update an unrelated endpoint",
        paths: ["packages/server/handlers/admin.ts"],
      }),
    ).toEqual([]);
  });

  it("ignores unrelated server, docs, tests, and release bot commits", () => {
    expect(
      componentsForCommit({
        message: "fix(server): tighten an admin endpoint",
        paths: ["packages/server/handlers/admin.ts"],
      }),
    ).toEqual([]);
    expect(
      componentsForCommit({ message: "docs: explain releases", paths: ["docs/release.md"] }),
    ).toEqual([]);
    expect(
      componentsForCommit({
        message: "fix(agent): add regression coverage",
        paths: ["packages/agent-runtime/localLoop.test.ts"],
      }),
    ).toEqual([]);
    // The CLI package is a conservative Desktop input, but the analyzer's
    // existing `chore: false` rule prevents release-bot commits from bumping.
    expect(
      componentsForCommit({
        message: "chore(release): cli-v0.33.0-alpha.7",
        paths: ["packages/cli/package.json", "packages/cli/CHANGELOG.md"],
      }),
    ).toEqual(["cli", "desktop"]);
  });

  it("feeds analyzer and notes through the same component filter", () => {
    expect(typeof analyzeCommits).toBe("function");
    expect(typeof generateNotes).toBe("function");

    const commits = [
      { hash: "a".repeat(40), message: "fix(desktop): repair startup" },
      { hash: "b".repeat(40), message: "fix(cli): repair auth" },
      { hash: "c".repeat(40), message: "feat(agent): share runtime facts" },
    ];
    const pathsByHash = new Map([
      [commits[0].hash, ["packages/desktop-runtime/entry.ts"]],
      [commits[1].hash, [".github/workflows/cli-binary-publish.yml"]],
      [commits[2].hash, ["packages/agent-runtime/runtimeFacts.ts"]],
    ]);
    const resolvePaths = (commit: { hash: string }) => pathsByHash.get(commit.hash) ?? [];

    expect(filterCommitsForComponent(commits, "cli", resolvePaths).map((commit) => commit.hash)).toEqual([
      commits[1].hash,
      commits[2].hash,
    ]);
    expect(
      filterCommitsForComponent(commits, "desktop", resolvePaths).map((commit) => commit.hash),
    ).toEqual([commits[0].hash, commits[2].hash]);
  });

  it("delegates filtered commits to the official analyzer", async () => {
    const repository = mkdtempSync(join(tmpdir(), "nolo-component-analyzer-"));
    temporaryRepositories.push(repository);
    execFileSync("git", ["init", "-q"], { cwd: repository });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: repository });
    execFileSync("git", ["config", "user.email", "test@example.com"], {
      cwd: repository,
    });

    mkdirSync(join(repository, "packages/desktop-runtime"), { recursive: true });
    writeFileSync(join(repository, "packages/desktop-runtime/entry.ts"), "export {}\n");
    execFileSync("git", ["add", "."], { cwd: repository });
    execFileSync("git", ["commit", "-qm", "fix(desktop): repair startup"], {
      cwd: repository,
    });
    const hash = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repository,
      encoding: "utf8",
    }).trim();
    const context = {
      cwd: repository,
      commits: [{ hash, message: "fix(desktop): repair startup" }],
      logger: { log() {} },
    };

    expect(await analyzeCommits({ component: "cli" }, context)).toBeNull();
    expect(await analyzeCommits({ component: "desktop" }, context)).toBe("patch");
  });

  it("generates notes from the same component-filtered commits", async () => {
    const repository = mkdtempSync(join(tmpdir(), "nolo-component-notes-"));
    temporaryRepositories.push(repository);
    execFileSync("git", ["init", "-q"], { cwd: repository });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: repository });
    execFileSync("git", ["config", "user.email", "test@example.com"], {
      cwd: repository,
    });

    mkdirSync(join(repository, "packages/desktop-runtime"), { recursive: true });
    writeFileSync(join(repository, "packages/desktop-runtime/entry.ts"), "export {}\n");
    execFileSync("git", ["add", "."], { cwd: repository });
    execFileSync("git", ["commit", "-qm", "fix(desktop): desktop-only subject"], {
      cwd: repository,
    });
    const desktopHash = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repository,
      encoding: "utf8",
    }).trim();

    mkdirSync(join(repository, ".github/workflows"), { recursive: true });
    writeFileSync(join(repository, ".github/workflows/cli-test.yml"), "name: CLI\n");
    execFileSync("git", ["add", "."], { cwd: repository });
    execFileSync("git", ["commit", "-qm", "fix(cli): cli-only subject"], {
      cwd: repository,
    });
    const cliHash = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repository,
      encoding: "utf8",
    }).trim();
    const baseContext = {
      cwd: repository,
      commits: [
        { hash: desktopHash, message: "fix(desktop): desktop-only subject" },
        { hash: cliHash, message: "fix(cli): cli-only subject" },
      ],
      lastRelease: { gitTag: "desktop-v1.0.0-alpha.1", gitHead: desktopHash },
      nextRelease: {
        gitTag: "desktop-v1.0.0-alpha.2",
        gitHead: cliHash,
        version: "1.0.0-alpha.2",
      },
      options: { repositoryUrl: "https://github.com/nolotus/bun-nolo.git" },
      logger: { log() {} },
    };

    const notes = await generateNotes({ component: "desktop" }, baseContext);
    expect(notes).toContain("desktop-only subject");
    expect(notes).not.toContain("cli-only subject");
    expect(notes).toContain("desktop-v1.0.0-alpha.1...desktop-v1.0.0-alpha.2");
  });

  it("loads add, rename, delete, mode-only, and merge paths from Git", () => {
    const repository = mkdtempSync(join(tmpdir(), "nolo-component-release-"));
    temporaryRepositories.push(repository);
    execFileSync("git", ["init", "-q"], { cwd: repository });
    execFileSync("git", ["config", "user.name", "Test"], { cwd: repository });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repository });

    writeFileSync(join(repository, "old.ts"), "one\n");
    execFileSync("git", ["add", "old.ts"], { cwd: repository });
    execFileSync("git", ["commit", "-qm", "feat(cli): add old file"], { cwd: repository });
    const rootHash = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repository,
      encoding: "utf8",
    }).trim();
    expect(readCommitPaths({ hash: rootHash }, repository)).toEqual(["old.ts"]);

    execFileSync("git", ["mv", "old.ts", "renamed.ts"], { cwd: repository });
    execFileSync("git", ["commit", "-qm", "fix(cli): rename file"], { cwd: repository });
    const renameHash = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repository,
      encoding: "utf8",
    }).trim();
    expect(readCommitPaths({ hash: renameHash }, repository)).toEqual([
      "old.ts",
      "renamed.ts",
    ]);

    chmodSync(join(repository, "renamed.ts"), 0o755);
    execFileSync("git", ["add", "renamed.ts"], { cwd: repository });
    execFileSync("git", ["commit", "-qm", "fix(cli): make executable"], { cwd: repository });
    const modeHash = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repository,
      encoding: "utf8",
    }).trim();
    expect(readCommitPaths({ hash: modeHash }, repository)).toEqual(["renamed.ts"]);

    execFileSync("git", ["rm", "-q", "renamed.ts"], { cwd: repository });
    execFileSync("git", ["commit", "-qm", "fix(cli): remove old file"], { cwd: repository });
    const deleteHash = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repository,
      encoding: "utf8",
    }).trim();
    expect(readCommitPaths({ hash: deleteHash }, repository)).toEqual(["renamed.ts"]);

    const baseBranch = execFileSync("git", ["branch", "--show-current"], {
      cwd: repository,
      encoding: "utf8",
    }).trim();
    execFileSync("git", ["checkout", "-qb", "side"], { cwd: repository });
    writeFileSync(join(repository, "side.ts"), "side\n");
    execFileSync("git", ["add", "side.ts"], { cwd: repository });
    execFileSync("git", ["commit", "-qm", "fix(cli): add side"], { cwd: repository });
    execFileSync("git", ["checkout", "-q", baseBranch], { cwd: repository });
    writeFileSync(join(repository, "main.ts"), "main\n");
    execFileSync("git", ["add", "main.ts"], { cwd: repository });
    execFileSync("git", ["commit", "-qm", "fix(desktop): add main"], { cwd: repository });
    execFileSync("git", ["merge", "--no-ff", "-qm", "Merge side", "side"], {
      cwd: repository,
    });
    const mergeHash = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: repository,
      encoding: "utf8",
    }).trim();
    expect(readCommitPaths({ hash: mergeHash }, repository)).toEqual(["main.ts", "side.ts"]);
  });

  it("fails closed when commit paths cannot be read", () => {
    expect(() => readCommitPaths({ hash: "not-a-hash" }, process.cwd())).toThrow(
      "full Git hash",
    );
    expect(() => readCommitPaths({ hash: "f".repeat(40) }, process.cwd())).toThrow(
      "failed to read paths",
    );
  });

  it("routes both release configs through the shared wrapper", () => {
    const cliConfig = JSON.parse(readFileSync(".releaserc.cli.json", "utf8"));
    const desktopConfig = JSON.parse(readFileSync(".releaserc.desktop.json", "utf8"));
    const workflow = readFileSync(".github/workflows/version-bump.yml", "utf8");

    expect(cliConfig.plugins[0]).toEqual([
      "./scripts/release/componentSemanticRelease.mjs",
      { component: "cli" },
    ]);
    expect(desktopConfig.plugins[0]).toEqual([
      "./scripts/release/componentSemanticRelease.mjs",
      { component: "desktop" },
    ]);
    expect(JSON.stringify(cliConfig)).not.toContain("@semantic-release/commit-analyzer");
    expect(JSON.stringify(desktopConfig)).not.toContain("@semantic-release/release-notes-generator");
    expect(workflow).toContain('- "packages/**"');
    expect(workflow).toContain('- "scripts/release/**"');
    expect(workflow).toContain('- "scripts/dev/**"');
    expect(workflow).toContain('- ".github/actions/setup-windows-desktop/**"');
    expect(workflow).toContain('- ".github/workflows/cli-*"');
    expect(workflow).toContain('- ".github/workflows/desktop-*"');
    expect(workflow).toContain("componentSemanticRelease.mjs is the release truth source");
  });
});
