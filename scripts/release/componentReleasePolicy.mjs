import { execFileSync } from "node:child_process";

export const COMPONENTS = ["cli", "desktop"];

export const RELEASE_RULES = [
  { type: "feat", release: "minor" },
  { type: "fix", release: "patch" },
  { type: "perf", release: "patch" },
  { type: "refactor", release: false },
  { type: "chore", release: false },
  { type: "docs", release: false },
  { type: "test", release: false },
  { type: "style", release: false },
  { type: "ci", release: false },
];

const COMPONENT_ONLY_EXACT_PATHS = new Map([
  ["packages/app/constants/cliDownloads.ts", ["cli"]],
  ["packages/app/constants/desktopReleaseManifest.ts", ["desktop"]],
  ["packages/server/agentAvailability/agentAvailability.ts", ["desktop"]],
]);

const SHARED_EXACT_PATHS = new Set([
  "package.json",
  "bun.lock",
  "packages/cli/machineCommands.ts",
  "packages/cli/client/profileConfig.ts",
  "packages/cli/oauth/types.ts",
]);

const SHARED_PACKAGE_PREFIXES = [
  "packages/agent-runtime/",
  "packages/ai/",
  "packages/app/",
  "packages/auth/",
  "packages/billing/",
  "packages/chat/",
  "packages/client/",
  "packages/connector-experimental/",
  "packages/core/",
  "packages/create/",
  "packages/database/",
  "packages/database-engine/",
  "packages/form/",
  "packages/identity/",
  "packages/integrations/",
  "packages/lab/",
  "packages/oauth/",
  "packages/render/",
  "packages/share/",
  "packages/shared/",
  "packages/tui/",
];

const COMPONENT_ONLY_PREFIXES = {
  cli: [
    "packages/cli-",
    ".github/workflows/cli-",
    "scripts/release/applyCliVersion.ts",
    "scripts/release/openSourcePackageOverlay",
    "scripts/release/prepareCli",
    "scripts/release/publishCli",
    "scripts/release/publishNoloCli.sh",
    "scripts/release/stageCliDownloads.ts",
  ],
  desktop: [
    "packages/desktop/",
    "packages/desktop-runtime/",
    "packages/desktop-chrome-connector/",
    "packages/web/",
    "public/",
    ".github/workflows/desktop-",
    ".github/actions/setup-windows-desktop/",
    "scripts/dev/",
    "scripts/helpers/desktopReleasePublisher",
    "scripts/release/publishDesktopDownloads.ts",
    "scripts/verify/desktop/",
  ],
};

const commitPathCache = new Map();

function matchesPrefix(path, prefixes) {
  return prefixes.some((prefix) => path.startsWith(prefix));
}

function isNonProductPath(path) {
  return (
    path.startsWith("docs/") ||
    path.includes("/__tests__/") ||
    /(?:^|\/)(?:README|CHANGELOG)\.md$/i.test(path) ||
    /\.(?:source\.)?(?:test|spec)\.[cm]?[jt]sx?$/.test(path)
  );
}

function conventionalHeader(message) {
  const header = String(message ?? "").split("\n", 1)[0];
  const match = /^(\w*)(?:\((.*)\))?(!)?: (.*)$/.exec(header);
  return match
    ? { type: match[1], scopes: match[2], breaking: Boolean(match[3]) }
    : null;
}

function conventionalScopes(message) {
  const scopes = conventionalHeader(message)?.scopes;
  if (!scopes) return new Set();
  return new Set(
    scopes
      .split(/[\s,]+/)
      .map((scope) => scope.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function commitCanTriggerRelease(message) {
  const normalized = String(message ?? "");
  const header = conventionalHeader(normalized);
  if (header) {
    const explicitRule = RELEASE_RULES.find((rule) => rule.type === header.type);
    // Explicit semantic-release rules win even for a breaking marker.
    if (explicitRule) return Boolean(explicitRule.release);
    // Unknown conventional types are deliberately conservative: the official
    // parser/preset remains authoritative after dependencies are installed.
    return true;
  }

  if (/(?:^|\n)BREAKING(?: CHANGE|-CHANGE):/im.test(normalized)) return true;
  if (/^Merge\s/i.test(normalized)) return false;

  return /(?:^|\n)This reverts commit [0-9a-f]+\.?\s*$/im.test(normalized);
}

function impactForPath(path) {
  if (isNonProductPath(path)) return [];

  const exact = COMPONENT_ONLY_EXACT_PATHS.get(path);
  if (exact) return exact;

  if (SHARED_EXACT_PATHS.has(path) || matchesPrefix(path, SHARED_PACKAGE_PREFIXES)) {
    return COMPONENTS;
  }

  // Desktop imports a small part of the CLI package, so conservatively treat
  // the package root as a shared code boundary.
  if (path.startsWith("packages/cli/")) {
    return COMPONENTS;
  }

  return COMPONENTS.filter((component) =>
    matchesPrefix(path, COMPONENT_ONLY_PREFIXES[component]),
  );
}

export function componentsForCommit({ message, paths }) {
  const scopes = conventionalScopes(message);
  // Paths are the safety floor. A scope may add ownership for an otherwise
  // unclassified path, but it must never suppress a component that ships a
  // changed file.
  const impacted = new Set(COMPONENTS.filter((component) => scopes.has(component)));
  for (const path of paths) {
    for (const component of impactForPath(path)) impacted.add(component);
  }
  return COMPONENTS.filter((component) => impacted.has(component));
}

function commitHash(commit) {
  return commit?.hash ?? commit?.commit?.long ?? "";
}

export function readCommitPaths(commit, repositoryRoot = process.cwd()) {
  const hash = commitHash(commit);
  if (!/^[0-9a-f]{40}$/i.test(hash)) {
    throw new Error(`[component-release] expected a full Git hash, got ${hash || "<empty>"}`);
  }

  const cacheKey = `${repositoryRoot}\0${hash}`;
  const cached = commitPathCache.get(cacheKey);
  if (cached) return cached;

  let output;
  try {
    output = execFileSync(
      "git",
      [
        "diff-tree",
        "--root",
        "-m",
        "--no-commit-id",
        "--name-status",
        "-z",
        "-r",
        "-M",
        hash,
      ],
      { cwd: repositoryRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (error) {
    throw new Error(`[component-release] failed to read paths for ${hash}`, { cause: error });
  }

  const tokens = output.split("\0");
  const paths = new Set();
  for (let index = 0; index < tokens.length; ) {
    const status = tokens[index++];
    if (!status) continue;
    const firstPath = tokens[index++];
    if (!firstPath) {
      throw new Error(`[component-release] malformed git diff-tree output for ${hash}`);
    }
    paths.add(firstPath);
    if (/^[RC]/.test(status)) {
      const secondPath = tokens[index++];
      if (!secondPath) {
        throw new Error(`[component-release] malformed rename/copy output for ${hash}`);
      }
      paths.add(secondPath);
    }
  }

  const resolved = [...paths].sort();
  commitPathCache.set(cacheKey, resolved);
  return resolved;
}

export function filterCommitsForComponent(
  commits,
  component,
  resolvePaths = (commit) => readCommitPaths(commit),
) {
  if (!COMPONENTS.includes(component)) {
    throw new Error(`[component-release] unsupported component: ${component}`);
  }
  return commits.filter((commit) =>
    componentsForCommit({
      message: commit.message ?? commit.subject ?? "",
      paths: resolvePaths(commit),
    }).includes(component),
  );
}
