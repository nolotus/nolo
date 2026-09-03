import { afterEach, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { commitAndPush, planAndPublish } from "./publishComponents.mts";

const fixtures: string[] = [];

afterEach(() => {
  for (const fixture of fixtures.splice(0)) rmSync(fixture, { recursive: true, force: true });
});

function git(cwd: string, args: string[]) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}
function write(cwd: string, file: string, contents: string) {
  const target = join(cwd, file);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, contents);
}
function commit(cwd: string, message: string, paths?: string[]) {
  if (paths) git(cwd, ["add", "-f", ...paths]);
  else git(cwd, ["add", "-A"]);
  git(cwd, ["commit", "-qm", message]);
}
function fixture() {
  const cwd = mkdtempSync(join(tmpdir(), "nolo-component-publish-"));
  fixtures.push(cwd);
  git(cwd, ["init", "-q", "-b", "main"]);
  git(cwd, ["config", "user.name", "Test"]);
  git(cwd, ["config", "user.email", "test@example.com"]);
  for (const component of ["cli", "desktop"]) {
    write(cwd, `packages/${component}/package.json`, '{"name":"fixture","version":"1.0.0"}\n');
    write(cwd, `packages/${component}/CHANGELOG.md`, `# ${component}\n`);
  }
  write(cwd, "packages/app/constants/cliDownloads.ts", 'export const NOLO_CLI_VERSION = "1.0.0";\n');
  write(cwd, ".releaserc.cli.json", '{"branches":[{"name":"alpha","prerelease":"alpha"},"main"],"tagFormat":"cli-v${version}"}\n');
  write(cwd, ".releaserc.desktop.json", '{"branches":[{"name":"alpha","prerelease":"alpha"},"main"],"tagFormat":"desktop-v${version}"}\n');
  git(cwd, ["add", "-f", ".releaserc.cli.json", ".releaserc.desktop.json"]);
  commit(cwd, "chore: fixture baseline");
  git(cwd, ["tag", "cli-v1.0.0"]);
  git(cwd, ["tag", "desktop-v1.0.0"]);
  return cwd;
}

describe("component publisher", () => {
  it("generates release-notes-generator output, filters components, and writes alpha changelogs without git notes", async () => {
    const cwd = fixture();
    write(cwd, "packages/desktop/desktop.ts", "export const runtimeFix = true;\n");
    write(cwd, "packages/app/constants/cliDownloads.ts", 'export const NOLO_CLI_VERSION = "1.0.0";\n// new command\n');
    commit(cwd, "fix(desktop): repair runtime\n\nDetails for desktop only.", ["packages/desktop/desktop.ts"]);
    commit(cwd, "feat(cli): add command", ["packages/app/constants/cliDownloads.ts"]);

    const releases = await planAndPublish({ branch: "alpha", repositoryRoot: cwd, push: false });
    expect(releases.map((release) => [release.component, release.next])).toEqual([
      ["cli", "1.1.0-alpha.1"],
      ["desktop", "1.0.1-alpha.1"],
    ]);
    expect(releases.find((release) => release.component === "cli")?.notes).toContain("add command");
    expect(releases.find((release) => release.component === "cli")?.notes).not.toContain("repair runtime");
    expect(readFileSync(join(cwd, "packages/cli/CHANGELOG.md"), "utf8")).toContain("## 1.1.0-alpha.1");
    expect(readFileSync(join(cwd, "packages/desktop/CHANGELOG.md"), "utf8")).toContain("## 1.0.1-alpha.1");
    expect(git(cwd, ["notes", "list"])).toBe("");
  });

  it("uses stable main context and leaves dry-run with zero file side effects", async () => {
    const cwd = fixture();
    write(cwd, "packages/desktop/package.json", '{"name":"fixture","version":"1.0.0","description":"runtime fix"}\n');
    commit(cwd, "fix(desktop): repair runtime");
    const before = git(cwd, ["status", "--porcelain"]);
    const releases = await planAndPublish({ branch: "main", repositoryRoot: cwd, dryRun: true, push: false });
    expect(releases[0]).toMatchObject({ component: "desktop", current: "1.0.0", next: "1.0.1" });
    expect(git(cwd, ["status", "--porcelain"])).toBe(before);
    expect(readFileSync(join(cwd, "packages/desktop/CHANGELOG.md"), "utf8")).toBe("# desktop\n");
  });

  it("rolls back a component when its changelog write fails and still releases the other component", async () => {
    const cwd = fixture();
    write(cwd, "packages/cli/package.json", '{"name":"fixture","version":"1.0.0","description":"new command"}\n');
    write(cwd, "packages/desktop/package.json", '{"name":"fixture","version":"1.0.0","description":"runtime fix"}\n');
    commit(cwd, "fix(cli): add command", ["packages/cli/package.json"]);
    commit(cwd, "fix(desktop): repair runtime", ["packages/desktop/package.json"]);
    rmSync(join(cwd, "packages/desktop/CHANGELOG.md"));
    mkdirSync(join(cwd, "packages/desktop/CHANGELOG.md"));

    const releases = await planAndPublish({ branch: "alpha", repositoryRoot: cwd, push: false });
    expect(releases.map((release) => release.component)).toEqual(["cli"]);
    expect(readFileSync(join(cwd, "packages/cli/package.json"), "utf8")).toContain('"version": "1.0.1-alpha.1"');
    expect(readFileSync(join(cwd, "packages/app/constants/cliDownloads.ts"), "utf8")).toContain("1.0.1-alpha.1");
    expect(readFileSync(join(cwd, "packages/desktop/package.json"), "utf8")).toContain('"version":"1.0.0"');
    expect(() => git(cwd, ["diff", "--cached", "--quiet"])).not.toThrow();
  });

  it("bot release commit bypasses repo hooks (2026-09-02/03 main version-bump 失败根因)", () => {
    const cwd = fixture();
    const hook = join(cwd, ".git/hooks/pre-commit");
    writeFileSync(hook, "#!/bin/sh\nexit 1\n");
    chmodSync(hook, 0o755);
    write(cwd, "packages/cli/package.json", '{"name":"fixture","version":"1.0.1-alpha.1"}\n');
    expect(() => commitAndPush(new Map([["cli", "1.0.1-alpha.1"]]), false, cwd, false)).not.toThrow();
    expect(git(cwd, ["log", "-1", "--pretty=%s"])).toBe("chore(release): cli-v1.0.1-alpha.1");
  });

  it("clears staged release files when commit genuinely fails", () => {
    const cwd = fixture();
    write(cwd, "packages/cli/package.json", '{"name":"fixture","version":"1.0.1-alpha.1"}\n');
    // 钩子已被 --no-verify 绕过（见上一个用例），这里用只读 COMMIT_EDITMSG 注入
    // 一个与钩子无关的真实提交失败（bun execFileSync 不继承运行时 env，无法走身份缺失路径）。
    chmodSync(join(cwd, ".git", "COMMIT_EDITMSG"), 0o444);
    expect(() => commitAndPush(new Map([["cli", "1.0.1-alpha.1"]]), false, cwd, false)).toThrow("release commit/push failed");
    expect(() => git(cwd, ["diff", "--cached", "--quiet"])).not.toThrow();
  });
});
