import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  auditReleaseState,
  type NpmAdapter,
  type S3Adapter,
} from "./auditReleaseState";

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
  try {
    git(repository, ["tag", "-d", tag]);
  } catch {
    // No such tag yet.
  }
  write(repository, "packages/desktop-runtime/orphan.ts", `export const orphan = "${tag}";\n`);
  commit(repository, `chore(release): orphan ${tag}`);
  git(repository, ["tag", tag]);
  git(repository, ["reset", "--hard", "HEAD~1"]);
}

function createReleaseHistory() {
  const repository = mkdtempSync(join(tmpdir(), "nolo-release-audit-"));
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
  write(
    repository,
    "packages/app/constants/cliDownloads.ts",
    'export const NOLO_CLI_VERSION = "1.0.0";\n',
  );
  commit(repository, "chore(release): stable baseline");
  git(repository, ["tag", "cli-v1.0.0"]);
  git(repository, ["tag", "desktop-v1.0.0"]);

  write(repository, "packages/desktop-runtime/entry.ts", "export const started = true;\n");
  commit(repository, "fix(desktop): repair startup");

  write(repository, "packages/cli/package.json", '{"version":"1.1.0-alpha.1"}\n');
  write(repository, "packages/desktop/package.json", '{"version":"1.1.0-alpha.1"}\n');
  write(
    repository,
    "packages/app/constants/cliDownloads.ts",
    'export const NOLO_CLI_VERSION = "1.1.0-alpha.1";\n',
  );
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
  return repository;
}

function npmAdapter(version: string): NpmAdapter {
  return () => ({ status: "ok", value: version });
}

function s3Adapter(objects: Array<{ key: string; lastModified?: string }>): S3Adapter {
  return async () => ({ status: "ok", objects });
}

describe("auditReleaseState", () => {
  it("reports PASS when all five sources are consistent", async () => {
    const repository = createReleaseHistory();
    const result = await auditReleaseState({
      branch: "alpha",
      repositoryRoot: repository,
      npmAdapter: npmAdapter("1.1.0-alpha.1"),
      s3Adapter: s3Adapter([
        { key: "nolo-darwin-arm64.tar.gz", lastModified: "2026-01-01T00:00:00Z" },
        { key: "install-nolo.sh", lastModified: "2026-01-01T00:00:00Z" },
      ]),
    });
    expect(result.ok).toBe(true);
    expect(result.drifts).toEqual([]);
    expect(result.sources.cliTag.value).toBe("cli-v1.1.0-alpha.1");
    expect(result.sources.desktopTag.value).toBe("desktop-v1.1.0-alpha.1");
    expect(result.sources.npmAlpha.value).toBe("1.1.0-alpha.1");
    expect(result.sources.cliDownloads.value).toBe("1.1.0-alpha.1");
    expect(result.sources.cliPackageJson.value).toBe("1.1.0-alpha.1");
    expect(result.sources.desktopPackageJson.value).toBe("1.1.0-alpha.1");
  });

  it("reports DRIFT when the npm dist-tag lags the cli tag", async () => {
    const repository = createReleaseHistory();
    const result = await auditReleaseState({
      branch: "alpha",
      repositoryRoot: repository,
      npmAdapter: npmAdapter("1.1.0-alpha.0"),
      s3Adapter: s3Adapter([]),
    });
    expect(result.ok).toBe(false);
    expect(result.drifts).toContainEqual(
      expect.objectContaining({
        left: "cli tag",
        right: "npm npmAlpha",
        leftValue: "1.1.0-alpha.1",
        rightValue: "1.1.0-alpha.0",
      }),
    );
  });

  it("reports DRIFT for an orphan tag", async () => {
    const repository = createReleaseHistory();
    createOrphanTag(repository, "cli-v1.2.0-alpha.1");
    const result = await auditReleaseState({
      branch: "alpha",
      repositoryRoot: repository,
      npmAdapter: npmAdapter("1.1.0-alpha.1"),
      s3Adapter: s3Adapter([]),
    });
    expect(result.ok).toBe(false);
    expect(result.orphans.cli).toContain("cli-v1.2.0-alpha.1");
    expect(result.drifts).toContainEqual(
      expect.objectContaining({
        left: "cli orphan tag",
        leftValue: "cli-v1.2.0-alpha.1",
      }),
    );
  });

  it("marks S3 as SKIP when no S3 env is present", async () => {
    const repository = createReleaseHistory();
    const result = await auditReleaseState({
      branch: "alpha",
      repositoryRoot: repository,
      npmAdapter: npmAdapter("1.1.0-alpha.1"),
      env: {},
    });
    expect(result.sources.s3.status).toBe("skip");
    expect(result.ok).toBe(true);
  });

  it("marks npm as UNKNOWN on adapter failure without aborting other checks", async () => {
    const repository = createReleaseHistory();
    const result = await auditReleaseState({
      branch: "alpha",
      repositoryRoot: repository,
      npmAdapter: () => ({ status: "unknown", error: "network down" }),
      s3Adapter: s3Adapter([]),
    });
    expect(result.sources.npmAlpha.status).toBe("unknown");
    // cli tag vs cliDownloads / package.json still reconcile.
    expect(result.sources.cliTag.value).toBe("cli-v1.1.0-alpha.1");
    expect(result.sources.cliDownloads.value).toBe("1.1.0-alpha.1");
  });

  it("runs the dependency-free local subset with --local-only", async () => {
    const repository = createReleaseHistory();
    const result = await auditReleaseState({
      branch: "alpha",
      repositoryRoot: repository,
      localOnly: true,
    });
    expect(result.sources.npmAlpha.status).toBe("skip");
    expect(result.sources.npmLatest.status).toBe("skip");
    expect(result.sources.s3.status).toBe("skip");
    expect(result.sources.cliTag.value).toBe("cli-v1.1.0-alpha.1");
    expect(result.sources.cliDownloads.value).toBe("1.1.0-alpha.1");
  });
});
