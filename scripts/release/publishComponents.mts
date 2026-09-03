#!/usr/bin/env bun
/** Explicit component release orchestration. Tags are the only channel state. */
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import semver from "semver";
import { analyzeCommits } from "@semantic-release/commit-analyzer";
import { generateNotes } from "@semantic-release/release-notes-generator";
import { RELEASE_RULES, filterCommitsForComponent, readCommitPaths } from "./componentReleasePolicy.mjs";
import { resolveComponentBaseline, ReleaseStateForkError, OrphanTagSkipError } from "./planComponentReleases.mjs";
import { applyVersion as applyCliVersion } from "./applyCliVersion";
import { applyVersion as applyDesktopVersion } from "./applyDesktopVersion";

export const ANALYZER_OPTIONS = { preset: "conventionalcommits", releaseRules: RELEASE_RULES };
export const COMPONENTS = ["cli", "desktop"] as const;
type Component = (typeof COMPONENTS)[number];
type Commit = { hash: string; message: string };
type Release = { component: Component; current: string; next: string; type: string; commits: Commit[]; notes: string };

const config = { cli: { packagePath: "packages/cli/package.json", prefix: "cli-v" }, desktop: { packagePath: "packages/desktop/package.json", prefix: "desktop-v" } } as const;
const git = (args: string[], cwd = process.cwd()) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const conventional = (message: string) => { const m = /^(\w+)(?:\([^)]*\))?(!)?:/.exec(message.split("\n")[0]); return { type: m?.[1] ?? "", breaking: Boolean(m?.[2]) || /BREAKING CHANGE:/.test(message) }; };

export function bumpVersion(current: string, type: string, branch: "alpha" | "main") {
  const base = semver.parse(current);
  if (!base) throw new Error(`invalid current version ${current}`);
  const core = type === "major" ? `${base.major + 1}.0.0` : type === "minor" ? `${base.major}.${base.minor + 1}.0` : `${base.major}.${base.minor}.${base.patch + 1}`;
  if (branch === "main") return core;
  if (base.prerelease[0] === "alpha" && type !== "major" && type !== "minor" && type !== "patch") return current;
  if (base.prerelease[0] === "alpha" && type) {
    // semantic-release's alpha channel keeps patch releases on the same core
    // as alpha.N, while a minor/major release starts the new core at alpha.1.
    if (type === "minor" || type === "major") return `${core}-alpha.1`;
    const next = semver.inc(current, "prerelease", "alpha");
    return next ?? `${core}-alpha.1`;
  }
  return `${core}-alpha.1`;
}

function commitsSince(tag: string, repositoryRoot = process.cwd()): Commit[] {
  const hashes = git(["rev-list", "--reverse", `${tag}..HEAD`], repositoryRoot).split("\n").filter(Boolean);
  return hashes.map((hash) => ({ hash, message: git(["show", "-s", "--format=%B", hash], repositoryRoot) }));
}
async function analyze(component: Component, commits: Commit[], repositoryRoot = process.cwd()) {
  const selected = filterCommitsForComponent(commits, component, (c) => readCommitPaths({ hash: c.hash }, repositoryRoot));
  const type = await analyzeCommits(ANALYZER_OPTIONS, { commits: selected, cwd: repositoryRoot, logger: { log() {} } } as any);
  return { selected, type: type ?? false };
}
function tagFor(component: Component, version: string) { return `${config[component].prefix}${version}`; }
function existingTag(tag: string, repositoryRoot = process.cwd()) { try { return git(["rev-parse", "--verify", `refs/tags/${tag}^{commit}`], repositoryRoot); } catch { return null; } }
function tagIsReachable(tag: string, repositoryRoot = process.cwd()) {
  try { git(["merge-base", "--is-ancestor", tag, "HEAD"], repositoryRoot); return true; } catch { return false; }
}
export function commitAndPush(versions: Map<Component, string>, dryRun: boolean, repositoryRoot = process.cwd(), pushRemote = true) {
  if (dryRun) return;
  if (pushRemote) {
    git(["fetch", "origin", "--tags"], repositoryRoot);
  }
  const branch = git(["branch", "--show-current"], repositoryRoot);
  if (pushRemote) {
    try { git(["push", "--dry-run", "origin", `HEAD:refs/heads/${branch}`], repositoryRoot); }
    catch (e) { throw new Error("release push aborted: remote is not fast-forward", { cause: e }); }
  }
  const paths = [...versions.keys()].flatMap((c) => [config[c].packagePath, ...(c === "cli" ? ["packages/app/constants/cliDownloads.ts"] : []), `packages/${c}/CHANGELOG.md`]);
  git(["add", ...paths], repositoryRoot);
  try { git(["diff", "--cached", "--quiet"], repositoryRoot); return; } catch { /* staged changes exist */ }
  try {
    git(["commit", "-m", `chore(release): ${[...versions].map(([c, v]) => `${c}-v${v}`).join(", ")}`], repositoryRoot);
    if (pushRemote) git(["push", "origin", `HEAD:refs/heads/${branch}`], repositoryRoot);
  } catch (e) {
    // A failed commit/push must not leave staged release material behind.
    git(["reset", "--mixed", "HEAD"], repositoryRoot);
    throw new Error("release commit/push failed", { cause: e });
  }
}
export async function planAndPublish({ branch = "alpha", dryRun = false, repositoryRoot = process.cwd(), push = true } : { branch?: "alpha" | "main"; dryRun?: boolean; repositoryRoot?: string; push?: boolean } = {}) {
  const releases: Release[] = [];
  for (const component of COMPONENTS) {
    try {
      const baseline = resolveComponentBaseline(component, branch, repositoryRoot);
      const current = JSON.parse(readFileSync(resolve(repositoryRoot, config[component].packagePath), "utf8")).version;
      const pending = commitsSince(baseline, repositoryRoot); const result = await analyze(component, pending, repositoryRoot);
      if (!result.type) continue;
      const next = bumpVersion(current, result.type, branch);
      const existing = existingTag(tagFor(component, next), repositoryRoot);
      if (existing) {
        if (tagIsReachable(tagFor(component, next), repositoryRoot)) {
          console.log(`[component-release] ${component}: ${tagFor(component, next)} already exists; idempotent skip`);
          continue;
        }
        throw new ReleaseStateForkError(component, [tagFor(component, next)]);
      }
      const notes = await generateNotes({ preset: "conventionalcommits" }, { commits: result.selected, cwd: repositoryRoot, options: { repositoryUrl: "https://github.com/nolotus/bun-nolo" }, lastRelease: { version: current }, nextRelease: { version: next, gitTag: tagFor(component, next) }, logger: { log() {} } } as any);
      releases.push({ component, current, next, type: result.type, commits: result.selected, notes });
    } catch (e) {
      if (e instanceof OrphanTagSkipError) continue;
      if (e instanceof ReleaseStateForkError) throw e;
      console.error(`[component-release] ${component} failed:`, e);
      // A broken component must not suppress an otherwise valid component.
    }
  }
  if (!releases.length) { console.log("[component-release] no releases"); return releases; }
  for (const r of releases) console.log(`[component-release] ${r.component}: ${r.current} -> ${r.next} (${r.type})`);
  if (dryRun) return releases;
  const versions = new Map<Component, string>();
  for (const r of releases) {
    const packageFile = resolve(repositoryRoot, config[r.component].packagePath);
    const changelogFile = resolve(repositoryRoot, `packages/${r.component}/CHANGELOG.md`);
    const cliDownloadsFile = r.component === "cli" ? resolve(repositoryRoot, "packages/app/constants/cliDownloads.ts") : undefined;
    const before = new Map<string, string>();
    try {
      before.set(packageFile, readFileSync(packageFile, "utf8"));
      before.set(changelogFile, readFileSync(changelogFile, "utf8"));
      if (cliDownloadsFile) before.set(cliDownloadsFile, readFileSync(cliDownloadsFile, "utf8"));
      if (r.component === "cli") applyCliVersion(r.next, repositoryRoot); else applyDesktopVersion(r.next, packageFile);
      writeFileSync(changelogFile, `\n## ${r.next}\n\n${r.notes}\n` + before.get(changelogFile));
      versions.set(r.component, r.next);
    } catch (error) {
      for (const [file, contents] of before) writeFileSync(file, contents);
      console.error(`[component-release] ${r.component} write failed; rolled back component files`, error);
    }
  }
  if (!versions.size) return [];
  commitAndPush(versions, false, repositoryRoot, push);
  if (!push) return releases.filter((release) => versions.has(release.component));
  const tagErrors: Error[] = [];
  for (const r of releases.filter((release) => versions.has(release.component))) {
    try {
      const tag = tagFor(r.component, r.next); const prior = existingTag(tag);
      if (prior === git(["rev-parse", "HEAD"])) continue;
      if (prior) throw new ReleaseStateForkError(r.component, [tag]);
      git(["tag", "-a", tag, "-m", tag]); git(["push", "origin", tag]);
    } catch (error) {
      tagErrors.push(error instanceof Error ? error : new Error(String(error)));
      console.error(`[component-release] ${r.component} tag/push failed`, error);
    }
  }
  if (tagErrors.length) throw new AggregateError(tagErrors, "one or more component tags failed");
  return releases.filter((release) => versions.has(release.component));
}
if (import.meta.main) { const args = process.argv.slice(2); const branch = (args.includes("--branch") ? args[args.indexOf("--branch") + 1] : process.env.GITHUB_REF_NAME ?? "alpha") as "alpha" | "main"; planAndPublish({ branch, dryRun: args.includes("--dry-run") }).catch((e) => { console.error(e); process.exit(1); }); }
