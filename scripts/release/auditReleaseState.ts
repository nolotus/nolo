#!/usr/bin/env bun
/**
 * Release state reconciliation (read-only).
 *
 * Cross-checks the release truth sources:
 *   ① component tags (reachable + channel-matched + highest semver)
 *   ② npm dist-tags (alpha / latest)
 *   ③ packages/app/constants/cliDownloads.ts NOLO_CLI_VERSION
 *   ④ S3 binary listing (nolo-*.tar.gz + install-nolo.sh lastModified)
 *   ⑤ packages/<component>/package.json version
 *   ⑥ public projection reconciliation (nolotus/nolo cli version + Source-Commit)
 *   ⑦ sync health (recent "chore: sync" committer date within 24h)
 *
 * Emits a human report and a `--json` machine-readable report. Exits 1 when
 * any consistency rule is violated (DRIFT). npm/S3 failures are marked
 * UNKNOWN/SKIP and do not abort the remaining checks.
 *
 * Usage:
 *   bun scripts/release/auditReleaseState.ts [--branch <alpha|main>] [--json] [--local-only]
 *
 * `--local-only` runs only the dependency-free local subset (①③⑤) and marks
 * ②④ as SKIP — used by the pre-install CI step in version-bump.yml.
 *
 * npm and S3 calls are behind injectable adapters so tests never hit the
 * network.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveComponentBaseline } from "./planComponentReleases.mjs";
import {
  resolveDesktopPublishConfig,
  type DesktopPublishS3Config,
} from "../helpers/desktopReleasePublisher";

const COMPONENT_CONFIG = {
  cli: { packagePath: "packages/cli/package.json", tagPrefix: "cli-v" },
  desktop: { packagePath: "packages/desktop/package.json", tagPrefix: "desktop-v" },
} as const;

const CLI_DOWNLOADS_PATH = "packages/app/constants/cliDownloads.ts";
const NOLO_CLI_VERSION_RE = /NOLO_CLI_VERSION\s*=\s*"([^"]+)"/;

export type SourceStatus = "ok" | "unknown" | "skip" | "error";
export type Source = { status: SourceStatus; value?: string; error?: string };
export type S3Object = { key: string; lastModified?: string };

export type NpmAdapter = (args: { distTag: string }) => Source;
export type S3Adapter = (args: {
  config: DesktopPublishS3Config;
}) => Promise<Source & { objects?: S3Object[] }>;

export type PublicProjection = {
  cliVersion?: string;
  sourceCommit?: string;
  syncCommitterDate?: string;
};
export type GhAdapter = () => Promise<Source & { projection?: PublicProjection }>;

export type AuditOptions = {
  branch?: string;
  repositoryRoot?: string;
  localOnly?: boolean;
  fetchTags?: boolean;
  npmAdapter?: NpmAdapter;
  s3Adapter?: S3Adapter;
  ghAdapter?: GhAdapter;
  env?: NodeJS.ProcessEnv;
};

export type AuditResult = {
  branch: string;
  sources: Record<string, Source>;
  orphans: Record<string, string[]>;
  drifts: Array<{
    left: string;
    right: string;
    leftValue?: string;
    rightValue?: string;
  }>;
  ok: boolean;
};

function git(args: string[], repositoryRoot: string): string {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function stripTagPrefix(tag: string, prefix: string): string {
  return tag.startsWith(prefix) ? tag.slice(prefix.length) : tag;
}

function highestReachableTag(
  component: string,
  branch: string,
  repositoryRoot: string,
): string | undefined {
  const config = COMPONENT_CONFIG[component];
  const tags = git(
    ["for-each-ref", "--merged=HEAD", "--sort=version:refname", "--format=%(refname:short)", `refs/tags/${config.tagPrefix}*`],
    repositoryRoot,
  )
    .split("\n")
    .filter(Boolean);
  // Channel match: alpha branch accepts alpha prerelease tags (and stable);
  // main accepts only stable (no prerelease). Mirrors the existing channel
  // filter in planComponentReleases.mjs.
  const channelMatched = tags.filter((tag) => {
    const version = stripTagPrefix(tag, config.tagPrefix);
    const dash = version.indexOf("-");
    const prerelease = dash === -1 ? "" : version.slice(dash + 1);
    if (branch === "main") return prerelease === "";
    return prerelease === "" || prerelease.startsWith("alpha");
  });
  return channelMatched[channelMatched.length - 1];
}

function collectComponentTags(
  branch: string,
  repositoryRoot: string,
): Record<string, Source> {
  const result: Record<string, Source> = {};
  for (const component of Object.keys(COMPONENT_CONFIG)) {
    try {
      const tag = resolveComponentBaseline(component, branch, repositoryRoot);
      result[`${component}Tag`] = { status: "ok", value: tag };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      // Pending-bump: package.json is ahead of any tag (normal mid-release
      // state). Fall back to the highest reachable channel-matched tag so
      // reconciliation can still compare against npm / declared version.
      const fallback = highestReachableTag(component, branch, repositoryRoot);
      if (fallback) {
        result[`${component}Tag`] = { status: "ok", value: fallback };
      } else {
        result[`${component}Tag`] = { status: "unknown", error: message };
      }
    }
  }
  return result;
}

function collectOrphans(
  branch: string,
  repositoryRoot: string,
): Record<string, string[]> {
  const orphans: Record<string, string[]> = {};
  for (const [component, config] of Object.entries(COMPONENT_CONFIG)) {
    const allTags = git(
      ["for-each-ref", "--format=%(refname:short)", `refs/tags/${config.tagPrefix}*`],
      repositoryRoot,
    )
      .split("\n")
      .filter(Boolean);
    const reachable = new Set(
      git(
        ["for-each-ref", "--merged=HEAD", "--format=%(refname:short)", `refs/tags/${config.tagPrefix}*`],
        repositoryRoot,
      )
        .split("\n")
        .filter(Boolean),
    );
    // Channel-filtered orphan detection: only alpha-channel prerelease tags
    // are orphans of the alpha channel. Stable tags belong to main and are
    // expected to be unreachable from the alpha branch (mirrors the existing
    // collectOrphanTags logic in planComponentReleases.mjs).
    orphans[component] = allTags
      .filter((tag) => !reachable.has(tag))
      .filter((tag) => {
        const version = stripTagPrefix(tag, config.tagPrefix);
        const dash = version.indexOf("-");
        const prerelease = dash === -1 ? "" : version.slice(dash + 1);
        return prerelease.startsWith("alpha");
      });
  }
  return orphans;
}

function collectCliDownloads(repositoryRoot: string): Source {
  try {
    const content = readFileSync(resolve(repositoryRoot, CLI_DOWNLOADS_PATH), "utf8");
    const match = NOLO_CLI_VERSION_RE.exec(content);
    if (!match) return { status: "error", error: "NOLO_CLI_VERSION not found" };
    return { status: "ok", value: match[1] };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function collectPackageJson(component: string, repositoryRoot: string): Source {
  try {
    const pkg = JSON.parse(
      readFileSync(resolve(repositoryRoot, COMPONENT_CONFIG[component].packagePath), "utf8"),
    );
    if (typeof pkg.version !== "string" || pkg.version.length === 0) {
      return { status: "error", error: "no version field" };
    }
    return { status: "ok", value: pkg.version };
  } catch (error) {
    return {
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function defaultNpmAdapter({ distTag }: { distTag: string }): Source {
  try {
    const result = spawnSync("npm", ["view", `nolo-cli@${distTag}`, "version"], {
      encoding: "utf8",
    });
    if (result.status !== 0) {
      const message = (result.stderr || result.stdout || "").trim();
      return {
        status: "unknown",
        error: message || `npm view failed (exit ${result.status})`,
      };
    }
    const version = result.stdout.trim();
    if (!version) return { status: "unknown", error: "empty npm view output" };
    return { status: "ok", value: version };
  } catch (error) {
    return {
      status: "unknown",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ⑥ 公开仓投影对账 adapter：gh api 只读。无 gh 时返回 SKIP。
// 取公开仓 packages/cli/package.json 版本 + main HEAD commit message 解析
// Source-Commit trailer + 最近 "chore: sync" commit 的 committer date。
async function defaultGhAdapter(): Promise<Source & { projection?: PublicProjection }> {
  try {
    const gh = spawnSync("gh", ["--version"], { encoding: "utf8" });
    if (gh.status !== 0) {
      return { status: "skip", error: "gh CLI not available" };
    }
    const pkg = spawnSync(
      "gh",
      ["api", "repos/nolotus/nolo/contents/packages/cli/package.json", "--jq", ".content"],
      { encoding: "utf8" },
    );
    if (pkg.status !== 0) {
      return {
        status: "unknown",
        error: (pkg.stderr || pkg.stdout || "").trim() || "gh api package.json failed",
      };
    }
    const cliVersion = JSON.parse(
      Buffer.from(pkg.stdout.trim(), "base64").toString("utf8"),
    ).version as string;

    const head = spawnSync(
      "gh",
      ["api", "repos/nolotus/nolo/commits/main", "--jq", ".commit.message"],
      { encoding: "utf8" },
    );
    if (head.status !== 0) {
      return {
        status: "unknown",
        error: (head.stderr || head.stdout || "").trim() || "gh api commits/main failed",
      };
    }
    const sourceCommit = /^Source-Commit:\s*(\S+)/m.exec(head.stdout)?.[1];

    // ⑦ sync 健康度：最近 "chore: sync" commit 的 committer date
    const syncCommit = spawnSync(
      "gh",
      [
        "api",
        "repos/nolotus/nolo/commits",
        "--jq",
        "[.[] | select(.commit.message | startswith(\"chore: sync open-source public projection\"))][0].commit.committer.date",
      ],
      { encoding: "utf8" },
    );
    const syncCommitterDate =
      syncCommit.status === 0 && syncCommit.stdout.trim()
        ? syncCommit.stdout.trim()
        : undefined;

    return {
      status: "ok",
      projection: { cliVersion, sourceCommit, syncCommitterDate },
    };
  } catch (error) {
    return {
      status: "unknown",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function parseS3ListXml(xml: string): S3Object[] {
  const objects: S3Object[] = [];
  const contents = xml.match(/<Contents>[\s\S]*?<\/Contents>/g) ?? [];
  for (const block of contents) {
    const key = /<Key>([\s\S]*?)<\/Key>/.exec(block)?.[1];
    const lastModified = /<LastModified>([\s\S]*?)<\/LastModified>/.exec(block)?.[1];
    if (key) objects.push({ key, lastModified });
  }
  return objects;
}

async function defaultS3Adapter({
  config,
}: {
  config: DesktopPublishS3Config;
}): Promise<Source & { objects?: S3Object[] }> {
  try {
    // s3Upload pulls core/errorMessage (needs node_modules); lazy-import so
    // the dependency-free local subset never touches it.
    const { signS3Request, sha256Hex, amzDateParts } = await import("../helpers/s3Upload");
    const prefix = config.pathPrefix ? `${config.pathPrefix}/` : "";
    const url = new URL(`${config.endpoint}/${config.bucket}`);
    url.searchParams.set("list-type", "2");
    url.searchParams.set("prefix", prefix);
    const { amzDate, dateStamp } = amzDateParts();
    const payloadHash = sha256Hex("");
    const authorization = signS3Request({
      config,
      method: "GET",
      url,
      payloadHash,
      amzDate,
      dateStamp,
    });
    const response = await fetch(url, {
      headers: {
        authorization,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
      },
    });
    if (!response.ok) {
      return {
        status: "unknown",
        error: `S3 list failed: ${response.status} ${await response.text()}`,
      };
    }
    const xml = await response.text();
    return { status: "ok", objects: parseS3ListXml(xml) };
  } catch (error) {
    return {
      status: "unknown",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function collectS3(options: AuditOptions): Promise<Source & { objects?: S3Object[] }> {
  const env = options.env ?? process.env;
  const hasS3Env = Boolean(
    env.DESKTOP_DOWNLOAD_S3_ENDPOINT ||
      env.DESKTOP_DOWNLOAD_S3_BUCKET ||
      env.DESKTOP_DOWNLOAD_S3_ACCESS_KEY_ID ||
      env.DESKTOP_DOWNLOAD_S3_SECRET_ACCESS_KEY,
  );
  if (!hasS3Env) return { status: "skip" };
  if (options.localOnly) return { status: "skip" };
  try {
    const config = resolveDesktopPublishConfig({ channel: "alpha", env });
    if (config.storage !== "s3") {
      return { status: "skip", error: "S3 config not selected (SSH storage)" };
    }
    const adapter = options.s3Adapter ?? defaultS3Adapter;
    return await adapter({ config });
  } catch (error) {
    return {
      status: "unknown",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function reconcile(
  sources: Record<string, Source>,
  branch: string,
  env: NodeJS.ProcessEnv = process.env,
): Array<{ left: string; right: string; leftValue?: string; rightValue?: string }> {
  const drifts: Array<{
    left: string;
    right: string;
    leftValue?: string;
    rightValue?: string;
  }> = [];

  const cliTag = sources.cliTag?.value
    ? stripTagPrefix(sources.cliTag.value, COMPONENT_CONFIG.cli.tagPrefix)
    : undefined;
  const npmKey = branch === "main" ? "npmLatest" : "npmAlpha";
  const npm = sources[npmKey]?.value;
  const cliDownloads = sources.cliDownloads?.value;
  const cliPkg = sources.cliPackageJson?.value;
  const desktopTag = sources.desktopTag?.value
    ? stripTagPrefix(sources.desktopTag.value, COMPONENT_CONFIG.desktop.tagPrefix)
    : undefined;
  const desktopPkg = sources.desktopPackageJson?.value;

  const check = (
    left: string,
    right: string,
    leftValue?: string,
    rightValue?: string,
  ) => {
    if (leftValue !== undefined && rightValue !== undefined && leftValue !== rightValue) {
      drifts.push({ left, right, leftValue, rightValue });
    }
  };

  // cli tag ⇄ npm dist-tag (alpha branch → alpha, main → latest)
  check("cli tag", `npm ${npmKey}`, cliTag, npm);
  // cli tag ⇄ cliDownloads constant
  check("cli tag", "cliDownloads constant", cliTag, cliDownloads);
  // cli tag ⇄ cli package.json
  check("cli tag", "cli package.json", cliTag, cliPkg);
  // desktop tag ⇄ desktop package.json
  check("desktop tag", "desktop package.json", desktopTag, desktopPkg);

  // S3 binaries: once listed, verify the channel artifacts actually exist
  // (a bare probe would pass an empty/stale bucket).
  const s3Objects = sources.s3?.objects;
  if (s3Objects && s3Objects.length > 0) {
    const keys = s3Objects.map((object) => object.key);
    for (const required of [
      "nolo-darwin-arm64.tar.gz",
      "nolo-linux-x64.tar.gz",
      "install-nolo.sh",
    ]) {
      if (!keys.includes(required)) {
        drifts.push({
          left: "S3 binaries",
          right: "expected object",
          leftValue: keys.join(", "),
          rightValue: required,
        });
      }
    }
  }

  // ⑥ 公开仓投影对账：公开仓 cli 版本 vs 私有仓 cli tag/package.json；
  // 公开仓 main HEAD 的 Source-Commit vs 私有仓 bot commit（私有仓 HEAD）。
  const projection = sources.publicProjection?.projection;
  if (projection) {
    check("public projection cli version", "cli tag", projection.cliVersion, cliTag);
    check("public projection cli version", "cli package.json", projection.cliVersion, cliPkg);
    if (projection.sourceCommit) {
      // 私有仓 bot commit sha 由调用方通过 env 传入（NOLO_SOURCE_COMMIT），
      // 缺省时仅报告公开仓 Source-Commit 存在性，不强制比对。
      const expectedSourceCommit = env.NOLO_SOURCE_COMMIT;
      if (expectedSourceCommit && projection.sourceCommit !== expectedSourceCommit) {
        drifts.push({
          left: "public projection Source-Commit",
          right: "private repo HEAD",
          leftValue: projection.sourceCommit,
          rightValue: expectedSourceCommit,
        });
      }
    }
  }

  // ⑦ sync 健康度：最近 "chore: sync" commit 的 committer date 超过 24h 标 DRIFT。
  const syncDate = projection?.syncCommitterDate;
  if (syncDate) {
    const ageMs = Date.now() - new Date(syncDate).getTime();
    if (Number.isFinite(ageMs) && ageMs > 24 * 60 * 60 * 1000) {
      drifts.push({
        left: "public projection sync age",
        right: "24h threshold",
        leftValue: syncDate,
        rightValue: ">24h (DRIFT)",
      });
    }
  }

  return drifts;
}

// ⑥ 公开仓投影对账 + ⑦ sync 健康度：通过可注入 ghAdapter 只读拉取。
// 无 gh / localOnly 时 SKIP，不阻断其余检查。
async function collectPublicProjection(
  options: AuditOptions,
): Promise<Source & { projection?: PublicProjection }> {
  if (options.localOnly) return { status: "skip" };
  const adapter = options.ghAdapter ?? defaultGhAdapter;
  return await adapter();
}

export async function auditReleaseState(
  options: AuditOptions = {},
): Promise<AuditResult> {
  const branch = options.branch ?? process.env.GITHUB_REF_NAME ?? "alpha";
  const repositoryRoot = options.repositoryRoot ?? process.cwd();
  const localOnly = options.localOnly ?? false;
  const npmAdapter = options.npmAdapter ?? defaultNpmAdapter;
  const s3Adapter = options.s3Adapter;

  // Refresh local tags so developer machines don't report stale-tag false
  // positives right after a remote tag was created. Only when running in
  // situ (no explicit repositoryRoot — tests always pass one, pointing at
  // fixtures whose remote must not be fetched). Failures silently ignored.
  if (options.fetchTags !== false && !options.repositoryRoot) {
    try {
      execFileSync("git", ["fetch", "--quiet", "--tags", "origin"], {
        cwd: repositoryRoot,
        stdio: ["ignore", "ignore", "ignore"],
        timeout: 30_000,
      });
    } catch {
      // offline: proceed with local refs
    }
  }

  const sources: Record<string, Source> = {};

  // ① component tags
  Object.assign(sources, collectComponentTags(branch, repositoryRoot));
  // ⑤ package.json declarations
  sources.cliPackageJson = collectPackageJson("cli", repositoryRoot);
  sources.desktopPackageJson = collectPackageJson("desktop", repositoryRoot);
  // ③ cliDownloads constant
  sources.cliDownloads = collectCliDownloads(repositoryRoot);
  // ② npm dist-tags
  if (localOnly) {
    sources.npmAlpha = { status: "skip" };
    sources.npmLatest = { status: "skip" };
  } else {
    sources.npmAlpha = npmAdapter({ distTag: "alpha" });
    sources.npmLatest = npmAdapter({ distTag: "latest" });
  }
  // ④ S3 binary listing
  sources.s3 = await collectS3({
    ...options,
    branch,
    repositoryRoot,
    localOnly,
    npmAdapter,
    s3Adapter,
  });
  // ⑥ 公开仓投影对账 + ⑦ sync 健康度
  sources.publicProjection = await collectPublicProjection({
    ...options,
    branch,
    repositoryRoot,
    localOnly,
    npmAdapter,
    s3Adapter,
  });

  const orphans = collectOrphans(branch, repositoryRoot);
  const drifts = reconcile(sources, branch, options.env);
  // Orphan tags are a form of release-state drift (historical rewrite or
  // abandoned release): report each as a DRIFT line and fail the audit.
  for (const [component, tags] of Object.entries(orphans)) {
    for (const tag of tags) {
      drifts.push({
        left: `${component} orphan tag`,
        right: "reachable history",
        leftValue: tag,
        rightValue: "unreachable from HEAD",
      });
    }
  }
  const ok =
    drifts.length === 0 &&
    !Object.values(sources).some((source) => source.status === "error");

  return { branch, sources, orphans, drifts, ok };
}

function printReport(result: AuditResult) {
  console.log(`[release-audit] branch=${result.branch}`);
  for (const [name, source] of Object.entries(result.sources)) {
    const status = source.status.toUpperCase();
    const value = source.value ? ` ${source.value}` : "";
    const error = source.error ? ` (${source.error})` : "";
    console.log(`[release-audit] ${name}: ${status}${value}${error}`);
  }
  for (const [component, tags] of Object.entries(result.orphans)) {
    if (tags.length > 0) {
      console.log(`[release-audit] orphan ${component} tags: ${tags.join(", ")}`);
    }
  }
  for (const drift of result.drifts) {
    console.log(
      `[release-audit] DRIFT: ${drift.left} (${drift.leftValue}) != ${drift.right} (${drift.rightValue})`,
    );
  }
  console.log(
    result.ok
      ? "[release-audit] PASS"
      : "[release-audit] FAIL: release state drift detected",
  );
}

async function main() {
  const args = process.argv.slice(2);
  let branch = process.env.GITHUB_REF_NAME ?? "alpha";
  let json = false;
  let localOnly = false;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--branch") branch = args[++i];
    else if (args[i] === "--json") json = true;
    else if (args[i] === "--local-only") localOnly = true;
    else throw new Error(`unknown argument: ${args[i]}`);
  }
  const result = await auditReleaseState({ branch, localOnly });
  if (json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    printReport(result);
  }
  // Observational mode: --local-only (the version-bump precondition) reports
  // drift without blocking the release path; the full scheduled audit
  // (maintenance.yml) is the enforcing gate.
  if (!result.ok && !localOnly) process.exit(1);
}

if (import.meta.main) {
  main();
}
