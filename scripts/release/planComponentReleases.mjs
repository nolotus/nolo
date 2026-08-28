import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, realpathSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  commitCanTriggerRelease,
  componentsForCommit,
  readCommitPaths,
} from "./componentReleasePolicy.mjs";

const COMPONENT_CONFIG = {
  cli: { packagePath: "packages/cli/package.json", releaseConfigPath: ".releaserc.cli.json" },
  desktop: {
    packagePath: "packages/desktop/package.json",
    releaseConfigPath: ".releaserc.desktop.json",
  },
};

const STRICT_SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const MAX_SEMVER_LENGTH = 256;
const MAX_SAFE_SEMVER_CORE = BigInt(Number.MAX_SAFE_INTEGER);

function git(args, repositoryRoot) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

class ReleaseStateForkError extends Error {
  constructor(component, orphanTags) {
    super(
      `RELEASE STATE FORK: ${component} has orphan tags ${orphanTags.join(", ")} newer than its package.json version. ` +
        "Delete the orphan tags or align the package.json version to reconcile.",
    );
    this.name = "ReleaseStateForkError";
    this.orphanTags = orphanTags;
  }
}

class OrphanTagSkipError extends Error {
  constructor(tag, orphanTags) {
    super(
      `orphan tag ${tag} not reachable from HEAD; version already released or pending manual reconciliation; skipping to avoid tag collision`,
    );
    this.name = "OrphanTagSkipError";
    this.orphanTags = orphanTags;
  }
}

function assertReachableTag(tag, repositoryRoot) {
  let exists = true;
  try {
    git(["rev-parse", "--verify", `refs/tags/${tag}^{commit}`], repositoryRoot);
  } catch {
    exists = false;
  }
  if (!exists) return { status: "missing", tag };
  try {
    git(["merge-base", "--is-ancestor", tag, "HEAD"], repositoryRoot);
  } catch {
    return { status: "orphan", tag };
  }
  return { status: "reachable", tag };
}

function collectOrphanTags(tagPrefix, repositoryRoot) {
  const allTags = git(
    ["for-each-ref", "--format=%(refname:short)", `refs/tags/${tagPrefix}*`],
    repositoryRoot,
  )
    .split("\n")
    .filter(Boolean);
  const reachable = new Set(
    git(
      ["for-each-ref", "--merged=HEAD", "--format=%(refname:short)", `refs/tags/${tagPrefix}*`],
      repositoryRoot,
    )
      .split("\n")
      .filter(Boolean),
  );
  return allTags
    .filter((tag) => !reachable.has(tag))
    .flatMap((tag) => {
      try {
        const parsed = parseSemver(tag.slice(tagPrefix.length));
        // Stable-channel tags (e.g. desktop-v0.32.0) belong to main and are
        // expected to be unreachable from the alpha branch; they are not
        // orphans of the alpha channel.
        if (parsed.prerelease.length === 0 || parsed.prerelease[0] !== "alpha") {
          return [];
        }
        return [{ tag, parsed }];
      } catch {
        return [];
      }
    });
}

function parseSemver(version) {
  if (version.length > MAX_SEMVER_LENGTH) {
    throw new Error(`SemVer exceeds ${MAX_SEMVER_LENGTH} characters`);
  }
  const match = STRICT_SEMVER.exec(version);
  if (!match) throw new Error(`invalid SemVer: ${version}`);
  const core = [BigInt(match[1]), BigInt(match[2]), BigInt(match[3])];
  if (core.some((identifier) => identifier > MAX_SAFE_SEMVER_CORE)) {
    throw new Error(`SemVer core exceeds Number.MAX_SAFE_INTEGER: ${version}`);
  }
  return {
    version,
    core,
    prerelease: match[4]?.split(".") ?? [],
  };
}

export function isSemanticReleaseSemver(version) {
  try {
    parseSemver(version);
    return true;
  } catch {
    return false;
  }
}

function compareIdentifiers(left, right) {
  const leftNumeric = /^\d+$/.test(left);
  const rightNumeric = /^\d+$/.test(right);
  if (leftNumeric && rightNumeric) {
    const leftNumber = BigInt(left);
    const rightNumber = BigInt(right);
    return leftNumber < rightNumber ? -1 : leftNumber > rightNumber ? 1 : 0;
  }
  if (leftNumeric !== rightNumeric) return leftNumeric ? -1 : 1;
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareSemver(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left.core[index] !== right.core[index]) {
      return left.core[index] < right.core[index] ? -1 : 1;
    }
  }
  if (left.prerelease.length === 0 || right.prerelease.length === 0) {
    return left.prerelease.length === right.prerelease.length
      ? 0
      : left.prerelease.length === 0
        ? 1
        : -1;
  }
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let index = 0; index < length; index += 1) {
    if (left.prerelease[index] === undefined) return -1;
    if (right.prerelease[index] === undefined) return 1;
    const comparison = compareIdentifiers(left.prerelease[index], right.prerelease[index]);
    if (comparison !== 0) return comparison;
  }
  return 0;
}

function readReleaseConfig(config, branch, repositoryRoot) {
  const releaseConfig = JSON.parse(
    readFileSync(resolve(repositoryRoot, config.releaseConfigPath), "utf8"),
  );
  const branchConfig = releaseConfig.branches?.find((entry) =>
    typeof entry === "string" ? entry === branch : entry?.name === branch,
  );
  if (!branchConfig) throw new Error(`${config.releaseConfigPath} does not configure ${branch}`);
  if (
    branch === "alpha" &&
    (typeof branchConfig !== "object" || branchConfig.prerelease !== "alpha")
  ) {
    throw new Error(`${config.releaseConfigPath} has an unexpected alpha channel`);
  }
  if (
    typeof releaseConfig.tagFormat !== "string" ||
    !releaseConfig.tagFormat.endsWith("${version}") ||
    releaseConfig.tagFormat.indexOf("${version}") !== releaseConfig.tagFormat.lastIndexOf("${version}")
  ) {
    throw new Error(`${config.releaseConfigPath} has an unsupported tagFormat`);
  }
  return { tagFormat: releaseConfig.tagFormat, tagPrefix: releaseConfig.tagFormat.slice(0, -10) };
}

function semanticReleaseChannelsByCommit(commits, repositoryRoot) {
  if (commits.length === 0) return new Map();
  const output = git(
    [
      "log",
      "--no-walk",
      "--format=%H%x1f%N%x1e",
      "--notes=refs/notes/semantic-release*",
      ...new Set(commits),
    ],
    repositoryRoot,
  );
  const channels = new Map();
  for (const record of output.split("\x1e")) {
    const [commit, notes = ""] = record.trim().split("\x1f", 2);
    if (!commit) continue;
    const commitChannels = notes
      .split("\n")
      .filter(Boolean)
      .flatMap((note) => {
        try {
          const parsed = JSON.parse(note).channels;
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      });
    channels.set(commit, commitChannels);
  }
  return channels;
}

function applicableTags(config, branch, repositoryRoot) {
  const { tagPrefix } = readReleaseConfig(config, branch, repositoryRoot);
  const tags = git(
    [
      "for-each-ref",
      "--merged=HEAD",
      "--format=%(refname:short)%09%(*objectname)%09%(objectname)",
      `refs/tags/${tagPrefix}*`,
    ],
    repositoryRoot,
  )
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [tag, peeledCommit, directObject] = line.split("\t");
      return { tag, commit: peeledCommit || directObject };
    });
  const channelsByCommit = semanticReleaseChannelsByCommit(
    [...new Set(tags.map(({ commit }) => commit))],
    repositoryRoot,
  );
  return tags.flatMap(({ tag, commit }) => {
    try {
      const parsed = parseSemver(tag.slice(tagPrefix.length));
      const noteChannels = channelsByCommit.get(commit) ?? [];
      const applicable =
        branch === "main" ? parsed.prerelease.length === 0 :
          parsed.prerelease.length === 0 ||
          (parsed.prerelease.includes("alpha") && noteChannels.includes("alpha"));
      return applicable ? [{ tag, parsed, commit }] : [];
    } catch {
      return [];
    }
  });
}

function authoritativeBaseline(config, branch, repositoryRoot) {
  const tags = applicableTags(config, branch, repositoryRoot);
  if (tags.length === 0) throw new Error(`no reachable ${branch} release tag`);
  let highest = tags[0];
  for (const tag of tags.slice(1)) {
    if (compareSemver(tag.parsed, highest.parsed) > 0) highest = tag;
  }
  const tied = tags.filter((tag) => compareSemver(tag.parsed, highest.parsed) === 0);
  if (new Set(tied.map((tag) => tag.commit)).size > 1) {
    throw new Error(`ambiguous highest ${branch} release tags: ${tied.map((tag) => tag.tag).join(", ")}`);
  }
  return highest;
}

export function resolveComponentBaseline(component, branch, repositoryRoot = process.cwd()) {
  const config = COMPONENT_CONFIG[component];
  if (!config) throw new Error(`unsupported component: ${component}`);
  if (branch !== "alpha" && branch !== "main") {
    throw new Error(`unsupported release branch: ${branch}`);
  }

  if (branch === "alpha") {
    const { tagFormat, tagPrefix } = readReleaseConfig(config, branch, repositoryRoot);
    const packageJson = JSON.parse(
      readFileSync(resolve(repositoryRoot, config.packagePath), "utf8"),
    );
    if (typeof packageJson.version !== "string" || packageJson.version.length === 0) {
      throw new Error(`${config.packagePath} has no version`);
    }
    const packageVersion = parseSemver(packageJson.version);
    if (packageVersion.prerelease.length > 0 && packageVersion.prerelease[0] !== "alpha") {
      throw new Error(`${config.packagePath} version is not on the alpha channel`);
    }
    const packageTag = tagFormat.replace("${version}", packageJson.version);
    const orphanTags = collectOrphanTags(tagPrefix, repositoryRoot);
    const higherOrphans = orphanTags.filter(
      (orphan) => compareSemver(orphan.parsed, packageVersion) > 0,
    );
    if (higherOrphans.length > 0) {
      throw new ReleaseStateForkError(
        component,
        higherOrphans.map((orphan) => orphan.tag),
      );
    }
    const reachability = assertReachableTag(packageTag, repositoryRoot);
    if (reachability.status === "orphan") {
      throw new OrphanTagSkipError(
        packageTag,
        orphanTags.map((orphan) => orphan.tag),
      );
    }
    if (reachability.status === "missing") {
      // package.json is ahead of any tag: normal pending-bump state, conservative fallback.
      throw new Error(`${packageTag} does not exist; awaiting first release`);
    }
    const officialBaseline = authoritativeBaseline(config, branch, repositoryRoot);
    if (compareSemver(packageVersion, officialBaseline.parsed) !== 0) {
      throw new Error(`${packageTag} is not the highest applicable alpha tag`);
    }
    if (git(["rev-list", "-n", "1", packageTag], repositoryRoot) !== officialBaseline.commit) {
      throw new Error(`${packageTag} does not identify the unambiguous alpha baseline`);
    }
    return packageTag;
  }

  return authoritativeBaseline(config, branch, repositoryRoot).tag;
}

function pendingCommitHashes(baseline, repositoryRoot) {
  const output = git(["rev-list", "--reverse", `${baseline}..HEAD`], repositoryRoot);
  return output ? output.split("\n") : [];
}

function commitMessage(hash, repositoryRoot) {
  return git(["show", "-s", "--format=%B", hash], repositoryRoot);
}

export function planComponentRelease(component, branch, repositoryRoot = process.cwd()) {
  try {
    const baseline = resolveComponentBaseline(component, branch, repositoryRoot);
    const hashes = pendingCommitHashes(baseline, repositoryRoot);
    for (const hash of hashes) {
      const message = commitMessage(hash, repositoryRoot);
      if (!commitCanTriggerRelease(message)) continue;
      const paths = readCommitPaths({ hash }, repositoryRoot);
      if (componentsForCommit({ message, paths }).includes(component)) {
        return {
          candidate: true,
          baseline,
          pendingCommits: hashes.length,
          reason: `release commit ${hash}`,
        };
      }
    }
    return {
      candidate: false,
      baseline,
      pendingCommits: hashes.length,
      reason: "no release-triggering component commits",
    };
  } catch (error) {
    if (error instanceof ReleaseStateForkError) {
      throw error;
    }
    if (error instanceof OrphanTagSkipError) {
      return {
        candidate: false,
        baseline: null,
        pendingCommits: null,
        reason: error.message,
      };
    }
    // A planner uncertainty must never suppress the authoritative release path.
    return {
      candidate: true,
      baseline: null,
      pendingCommits: null,
      reason: `conservative fallback: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function planComponentReleases({
  branch,
  repositoryRoot = process.cwd(),
} = {}) {
  if (branch !== "alpha" && branch !== "main") {
    const reason = `conservative fallback: unsupported release branch ${branch ?? "<empty>"}`;
    const fallback = { candidate: true, baseline: null, pendingCommits: null, reason };
    return { branch, cli: { ...fallback }, desktop: { ...fallback }, any: true };
  }
  const cli = planComponentRelease("cli", branch, repositoryRoot);
  const desktop = planComponentRelease("desktop", branch, repositoryRoot);
  return { branch, cli, desktop, any: cli.candidate || desktop.candidate };
}

function writeGithubOutputs(plan, outputPath) {
  appendFileSync(
    outputPath,
    [
      `cli=${plan.cli.candidate}`,
      `desktop=${plan.desktop.candidate}`,
      `any=${plan.any}`,
      "",
    ].join("\n"),
  );
}

function parseArguments(args) {
  let branch = process.env.GITHUB_REF_NAME;
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--branch") branch = args[++index];
    else if (args[index] === "--json") json = true;
    else throw new Error(`unknown argument: ${args[index]}`);
  }
  return { branch, json };
}

let isMain = false;
if (process.argv[1]) {
  try {
    isMain = realpathSync(resolve(process.argv[1])) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    // Import contexts such as `node --input-type=module -` have no real argv path.
  }
}
if (isMain) {
  const { branch, json } = parseArguments(process.argv.slice(2));
  const plan = planComponentReleases({ branch });
  if (process.env.GITHUB_OUTPUT) writeGithubOutputs(plan, process.env.GITHUB_OUTPUT);
  if (json) {
    process.stdout.write(`${JSON.stringify(plan)}\n`);
  } else {
    console.log(`[release-plan] cli=${plan.cli.candidate}: ${plan.cli.reason}`);
    console.log(`[release-plan] desktop=${plan.desktop.candidate}: ${plan.desktop.reason}`);
  }
}
