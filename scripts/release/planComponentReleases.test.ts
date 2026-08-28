import { afterEach, describe, expect, it } from "bun:test";
import { analyzeCommits as analyzeConventionalCommits } from "@semantic-release/commit-analyzer";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { commitCanTriggerRelease, RELEASE_RULES } from "./componentReleasePolicy.mjs";
import {
  isSemanticReleaseSemver,
  planComponentReleases,
  resolveComponentBaseline,
} from "./planComponentReleases.mjs";

const temporaryRepositories: string[] = [];

afterEach(() => {
  for (const repository of temporaryRepositories.splice(0)) {
    rmSync(repository, { recursive: true, force: true });
  }
});

function git(repository: string, args: string[]) {
  return execFileSync("git", args, { cwd: repository, encoding: "utf8" }).trim();
}

function write(repository: string, path: string, contents: string) {
  mkdirSync(join(repository, path, ".."), { recursive: true });
  writeFileSync(join(repository, path), contents);
}

function commit(repository: string, message: string) {
  git(repository, ["add", "."]);
  git(repository, ["commit", "-qm", message]);
  return git(repository, ["rev-parse", "HEAD"]);
}

function createOrphanTag(repository: string, tag: string) {
  // The fixture may already carry a reachable tag with the same name.
  try {
    git(repository, ["tag", "-d", tag]);
  } catch {
    // No such tag yet.
  }
  write(repository, "packages/desktop-runtime/orphan.ts", `export const orphan = "${tag}";\n`);
  commit(repository, `chore(release): orphan ${tag}`);
  git(repository, ["tag", tag]);
  // Rewind HEAD so the tagged commit is no longer reachable from any branch.
  git(repository, ["reset", "--hard", "HEAD~1"]);
}

function createReleaseHistory() {
  const repository = mkdtempSync(join(tmpdir(), "nolo-release-plan-"));
  temporaryRepositories.push(repository);
  git(repository, ["init", "-q", "-b", "main"]);
  git(repository, ["config", "user.name", "Test"]);
  git(repository, ["config", "user.email", "test@example.com"]);

  write(repository, "packages/cli/package.json", '{"version":"1.0.0"}\n');
  write(repository, "packages/desktop/package.json", '{"version":"1.0.0"}\n');
  write(
    repository,
    ".releaserc.cli.json",
    '{"branches":[{"name":"alpha","prerelease":"alpha"},"main"],"tagFormat":"cli-v${version}"}\n',
  );
  write(
    repository,
    ".releaserc.desktop.json",
    '{"branches":[{"name":"alpha","prerelease":"alpha"},"main"],"tagFormat":"desktop-v${version}"}\n',
  );
  commit(repository, "chore(release): stable baseline");
  git(repository, ["tag", "cli-v1.0.0"]);
  git(repository, ["tag", "desktop-v1.0.0"]);

  write(repository, "packages/desktop-runtime/entry.ts", "export const started = true;\n");
  commit(repository, "fix(desktop): repair startup");

  write(repository, "packages/cli/package.json", '{"version":"1.1.0-alpha.1"}\n');
  write(repository, "packages/desktop/package.json", '{"version":"1.1.0-alpha.1"}\n');
  commit(repository, "chore(release): alpha baseline");
  git(repository, ["tag", "cli-v1.1.0-alpha.1"]);
  git(repository, ["tag", "desktop-v1.1.0-alpha.1"]);
  git(repository, [
    "notes",
    "--ref=semantic-release-test",
    "add",
    "-m",
    '{"channels":["alpha"]}',
    "cli-v1.1.0-alpha.1",
  ]);
  // Historical non-SemVer tags must never become the main release baseline.
  git(repository, ["tag", "desktop-v20260324-1430"]);

  write(repository, ".github/workflows/desktop-check.yml", "name: Desktop check\n");
  commit(repository, "ci(desktop): adjust release check");
  return repository;
}

describe("pre-install component release planning", () => {
  it("keeps the preflight release-type decision aligned with the official analyzer", async () => {
    const messages = [
      "feat(cli): add command",
      "fix(desktop): repair startup",
      "perf(agent): reduce allocations",
      "build!: replace packaging contract",
      "foo_bar!: underscore type is valid",
      "build: replace contract\n\nbreaking change: lower-case note",
      "Merge branch 'feature' into alpha\n\nBREAKING CHANGE: merge body note",
      "FEAT: uppercase default rule",
      "CHORE!: uppercase type falls through to the default breaking rule",
      "revert: fix(cli): bad change\n\nThis reverts commit abc1234.",
      "ci(desktop): adjust workflow",
      "chore(release): cli-v1.0.0",
      "chore!: explicit false rules still win",
      "docs: explain release",
      "Merge branch 'feature' into alpha",
    ];
    for (const message of messages) {
      const releaseType = await analyzeConventionalCommits(
        { preset: "conventionalcommits", releaseRules: RELEASE_RULES },
        {
          cwd: process.cwd(),
          commits: [{ hash: "a".repeat(40), message }],
          logger: { log() {} },
        },
      );
      expect(commitCanTriggerRelease(message)).toBe(Boolean(releaseType));
    }
  });

  it("uses the alpha package tag but the latest stable tag on main", () => {
    const repository = createReleaseHistory();
    expect(resolveComponentBaseline("desktop", "alpha", repository)).toBe(
      "desktop-v1.1.0-alpha.1",
    );
    expect(resolveComponentBaseline("desktop", "main", repository)).toBe(
      "desktop-v1.0.0",
    );

    expect(planComponentReleases({ branch: "alpha", repositoryRoot: repository })).toMatchObject({
      any: false,
      cli: { candidate: false },
      desktop: { candidate: false },
    });
    expect(planComponentReleases({ branch: "main", repositoryRoot: repository })).toMatchObject({
      any: true,
      cli: { candidate: false },
      desktop: { candidate: true },
    });
  });

  it("plans CLI-only and shared commits from the component tag range", () => {
    const repository = createReleaseHistory();
    write(repository, ".github/workflows/cli-binary-publish.yml", "name: CLI publish\n");
    commit(repository, "fix(cli): repair npm publish");
    expect(planComponentReleases({ branch: "alpha", repositoryRoot: repository })).toMatchObject({
      any: true,
      cli: { candidate: true },
      desktop: { candidate: false },
    });

    write(repository, "packages/agent-runtime/index.ts", "export const shared = true;\n");
    commit(repository, "fix(agent): repair shared runtime");
    expect(planComponentReleases({ branch: "alpha", repositoryRoot: repository })).toMatchObject({
      any: true,
      cli: { candidate: true },
      desktop: { candidate: true },
    });
  });

  it("falls back to the authoritative release path when a baseline is unavailable", () => {
    const repository = createReleaseHistory();
    git(repository, ["tag", "-d", "desktop-v1.1.0-alpha.1"]);
    const plan = planComponentReleases({ branch: "alpha", repositoryRoot: repository });
    expect(plan.desktop).toMatchObject({ candidate: true, baseline: null });
    expect(plan.desktop.reason).toContain("conservative fallback");
  });

  it("keeps the conservative fallback when the package tag does not exist yet", () => {
    const repository = createReleaseHistory();
    write(repository, "packages/desktop/package.json", '{"version":"1.2.0-alpha.1"}\n');
    commit(repository, "chore(release): bump desktop to 1.2.0-alpha.1");
    const plan = planComponentReleases({ branch: "alpha", repositoryRoot: repository });
    expect(plan.desktop).toMatchObject({ candidate: true, baseline: null });
    expect(plan.desktop.reason).toContain("conservative fallback");
  });

  it("skips a component whose package tag is an orphan at the same version", () => {
    const repository = createReleaseHistory();
    createOrphanTag(repository, "desktop-v1.1.0-alpha.1");
    const plan = planComponentReleases({ branch: "alpha", repositoryRoot: repository });
    expect(plan.desktop).toMatchObject({ candidate: false, baseline: null });
    expect(plan.desktop.reason).toContain("orphan tag desktop-v1.1.0-alpha.1");
    expect(plan.desktop.reason).toContain("not reachable from HEAD");
    expect(plan.desktop.reason).toContain("skipping to avoid tag collision");
  });

  it("fails fast when a higher orphan tag exists for a component", () => {
    const repository = createReleaseHistory();
    createOrphanTag(repository, "desktop-v1.2.0-alpha.1");
    expect(() => planComponentReleases({ branch: "alpha", repositoryRoot: repository })).toThrow(
      /RELEASE STATE FORK/,
    );
    expect(() => planComponentReleases({ branch: "alpha", repositoryRoot: repository })).toThrow(
      /desktop-v1\.2\.0-alpha\.1/,
    );
  });

  it("ignores unreachable stable-channel tags when scanning alpha orphans", () => {
    const repository = createReleaseHistory();
    // desktop-v1.1.0 is a stable (main-channel) tag on a commit unreachable
    // from the alpha branch. Per SemVer 1.1.0 > 1.1.0-alpha.1, a channel-blind
    // orphan scan would false-positive a RELEASE STATE FORK here.
    createOrphanTag(repository, "desktop-v1.1.0");
    expect(() => planComponentReleases({ branch: "alpha", repositoryRoot: repository })).not.toThrow(
      /RELEASE STATE FORK/,
    );
  });


  it("reports orphan skip reasons in --json mode", () => {
    const repository = createReleaseHistory();
    createOrphanTag(repository, "desktop-v1.1.0-alpha.1");
    for (const name of ["componentReleasePolicy.mjs", "planComponentReleases.mjs"]) {
      write(
        repository,
        `scripts/release/${name}`,
        readFileSync(resolve(import.meta.dir, name), "utf8"),
      );
    }
    const script = join(repository, "scripts/release/planComponentReleases.mjs");
    const output = execFileSync("node", [script, "--branch", "alpha", "--json"], {
      cwd: repository,
      encoding: "utf8",
    });
    const plan = JSON.parse(output);
    expect(plan.desktop).toMatchObject({ candidate: false });
    expect(plan.desktop.reason).toContain("orphan tag desktop-v1.1.0-alpha.1");
  });

  it("rejects malformed, wrong-channel, and ambiguous release baselines", () => {
    expect(isSemanticReleaseSemver("9007199254740991.0.0")).toBe(true);
    expect(isSemanticReleaseSemver("9007199254740992.0.0")).toBe(false);
    expect(isSemanticReleaseSemver(`1.0.0-${"a".repeat(250)}`)).toBe(true);
    expect(isSemanticReleaseSemver(`1.0.0-${"a".repeat(251)}`)).toBe(false);

    const malformedMain = createReleaseHistory();
    write(malformedMain, "packages/desktop-runtime/later.ts", "export const later = true;\n");
    commit(malformedMain, "fix(desktop): pending stable repair");
    git(malformedMain, ["tag", "desktop-v01.2.3"]);
    git(malformedMain, ["tag", "desktop-v1.2.3+foo_bar"]);
    git(malformedMain, ["tag", "desktop-v9007199254740992.0.0"]);
    expect(resolveComponentBaseline("desktop", "main", malformedMain)).toBe("desktop-v1.0.0");
    expect(planComponentReleases({ branch: "main", repositoryRoot: malformedMain }).desktop)
      .toMatchObject({ candidate: true, baseline: "desktop-v1.0.0" });

    const wrongChannel = createReleaseHistory();
    write(wrongChannel, "packages/desktop/package.json", '{"version":"1.2.0-beta.1"}\n');
    commit(wrongChannel, "chore(release): wrong channel baseline");
    git(wrongChannel, ["tag", "desktop-v1.2.0-beta.1"]);
    expect(planComponentReleases({ branch: "alpha", repositoryRoot: wrongChannel }).desktop)
      .toMatchObject({ candidate: true, baseline: null });

    const unnotedAlpha = createReleaseHistory();
    write(unnotedAlpha, "packages/desktop-runtime/unnoted.ts", "export const pending = true;\n");
    commit(unnotedAlpha, "fix(desktop): pending alpha repair");
    write(unnotedAlpha, "packages/desktop/package.json", '{"version":"1.2.0-alpha.1"}\n');
    commit(unnotedAlpha, "chore(release): unnoted alpha tag");
    git(unnotedAlpha, ["tag", "desktop-v1.2.0-alpha.1"]);
    expect(planComponentReleases({ branch: "alpha", repositoryRoot: unnotedAlpha }).desktop)
      .toMatchObject({ candidate: true, baseline: null });

    const ambiguous = createReleaseHistory();
    git(ambiguous, ["tag", "desktop-v1.0.0+a", "desktop-v1.0.0"]);
    write(ambiguous, "packages/desktop-runtime/ambiguous.ts", "export const ambiguous = true;\n");
    commit(ambiguous, "fix(desktop): ambiguous tagged history");
    git(ambiguous, ["tag", "desktop-v1.0.0+b"]);
    expect(planComponentReleases({ branch: "main", repositoryRoot: ambiguous }).desktop)
      .toMatchObject({ candidate: true, baseline: null });
  });

  it("runs the authoritative release path for an unsupported manual branch", () => {
    const repository = createReleaseHistory();
    expect(
      planComponentReleases({ branch: "feature/test", repositoryRoot: repository }),
    ).toMatchObject({
      any: true,
      cli: { candidate: true, baseline: null },
      desktop: { candidate: true, baseline: null },
    });
  });

  it("runs under dependency-free Node before install", () => {
    const repository = createReleaseHistory();
    for (const name of ["componentReleasePolicy.mjs", "planComponentReleases.mjs"]) {
      write(
        repository,
        `scripts/release/${name}`,
        readFileSync(resolve(import.meta.dir, name), "utf8"),
      );
    }
    const script = join(repository, "scripts/release/planComponentReleases.mjs");
    const output = execFileSync("node", [script, "--branch", "alpha", "--json"], {
      cwd: repository,
      encoding: "utf8",
    });
    expect(JSON.parse(output)).toMatchObject({
      any: false,
      cli: { candidate: false },
      desktop: { candidate: false },
    });
  });
});
