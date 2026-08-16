#!/usr/bin/env bun
/**
 * Apply a CLI version bump across the two source-of-truth files:
 *   - packages/cli/package.json (version field)
 *   - packages/app/constants/cliDownloads.ts (NOLO_CLI_VERSION constant)
 *
 * Usage:
 *   bun ./scripts/release/applyCliVersion.ts <version>
 *
 * Guard: refuses to downgrade or no-op (candidate <= current).
 */

import * as fs from "node:fs";
import * as path from "node:path";

const CLI_PACKAGE_JSON = path.resolve("packages/cli/package.json");
const CLI_DOWNLOADS_TS = path.resolve("packages/app/constants/cliDownloads.ts");
const NOLO_CLI_VERSION_RE = /NOLO_CLI_VERSION\s*=\s*"([^"]+)"/;

/**
 * Compare two semver strings (major.minor.patch with optional prerelease).
 * Returns true when `candidate` is strictly greater than `current`.
 *
 * Prerelease handling follows semver spec: a prerelease version (e.g.
 * `0.6.1-alpha.1`) is *lower* than its release counterpart (`0.6.1`), and
 * two prereleases of the same core are compared by their dot-separated
 * numeric/lexicographic identifiers (e.g. `0.6.1-alpha.2` > `0.6.1-alpha.1`).
 *
 * Exported for unit testing.
 */
export function isVersionGreater(candidate: string, current: string): boolean {
  type Semver = {
    core: [number, number, number];
    prerelease: string[] | null; // null = no prerelease (release)
  };

  const parse = (v: string): Semver => {
    const noBuild = v.split("+")[0];
    const dashIdx = noBuild.indexOf("-");
    const mainPart = dashIdx === -1 ? noBuild : noBuild.slice(0, dashIdx);
    const prePart = dashIdx === -1 ? undefined : noBuild.slice(dashIdx + 1);
    const parts = mainPart.split(".");
    if (parts.length !== 3) throw new Error(`invalid semver: ${v}`);
    const core = parts.map((p) => {
      if (!/^\d+$/.test(p)) throw new Error(`invalid semver segment: ${p} in ${v}`);
      return Number(p);
    }) as [number, number, number];
    const prerelease = prePart ? prePart.split(".") : null;
    return { core, prerelease };
  };

  const cmpCore = (a: [number, number, number], b: [number, number, number]): number =>
    a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

  const c = parse(candidate);
  const r = parse(current);

  const coreDiff = cmpCore(c.core, r.core);
  if (coreDiff !== 0) return coreDiff > 0;

  // Same core version — compare prerelease.
  // No prerelease (release) > has prerelease.
  if (c.prerelease === null && r.prerelease !== null) return true;
  if (c.prerelease !== null && r.prerelease === null) return false;
  if (c.prerelease === null && r.prerelease === null) return false; // equal

  // Both have prerelease — compare identifiers per semver spec.
  const cPre = c.prerelease!;
  const rPre = r.prerelease!;
  const len = Math.min(cPre.length, rPre.length);
  for (let i = 0; i < len; i++) {
    const ci = cPre[i];
    const ri = rPre[i];
    const cNum = /^\d+$/.test(ci);
    const rNum = /^\d+$/.test(ri);
    if (cNum && rNum) {
      const diff = Number(ci) - Number(ri);
      if (diff !== 0) return diff > 0;
    } else if (cNum !== rNum) {
      // Numeric identifiers always have lower precedence than non-numeric.
      return cNum ? false : true;
    } else {
      // Both non-numeric — lexicographic comparison.
      if (ci !== ri) return ci > ri;
    }
  }
  // All compared identifiers equal — longer prerelease wins.
  return cPre.length > rPre.length;
}

function readCurrentVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(CLI_PACKAGE_JSON, "utf8"));
  return pkg.version;
}

function applyVersion(version: string): void {
  // 1. cliDownloads.ts — regex replace
  const tsOld = fs.readFileSync(CLI_DOWNLOADS_TS, "utf8");
  if (!NOLO_CLI_VERSION_RE.test(tsOld)) {
    throw new Error(`NOLO_CLI_VERSION not found in ${CLI_DOWNLOADS_TS}`);
  }
  const tsNew = tsOld.replace(NOLO_CLI_VERSION_RE, `NOLO_CLI_VERSION = "${version}"`);
  fs.writeFileSync(CLI_DOWNLOADS_TS, tsNew);

  // 2. package.json — JSON read/write, 2-space indent + trailing newline
  const pkgRaw = fs.readFileSync(CLI_PACKAGE_JSON, "utf8");
  const pkg = JSON.parse(pkgRaw);
  pkg.version = version;
  fs.writeFileSync(CLI_PACKAGE_JSON, JSON.stringify(pkg, null, 2) + "\n");
}

async function main(): Promise<void> {
  const targetVersion = process.argv[2];
  if (!targetVersion) {
    console.error("Usage: bun ./scripts/release/applyCliVersion.ts <version>");
    process.exit(1);
  }

  const currentVersion = readCurrentVersion();
  if (!isVersionGreater(targetVersion, currentVersion)) {
    console.error(
      `applyCliVersion: refusing to downgrade/no-op — candidate ${targetVersion} <= current ${currentVersion}`
    );
    process.exit(1);
  }

  applyVersion(targetVersion);
  console.log(`applyCliVersion: bumped ${currentVersion} → ${targetVersion}`);
}

// Run main only when executed directly (not when imported by tests).
if (import.meta.path === process.argv[1]) {
  main();
}