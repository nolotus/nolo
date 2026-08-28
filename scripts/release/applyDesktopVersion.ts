#!/usr/bin/env bun
/** Apply a desktop package version; equal candidates are idempotent no-ops. */
import * as fs from "node:fs";
import * as path from "node:path";
import semver from "semver";

const DESKTOP_PACKAGE_JSON = path.resolve("packages/desktop/package.json");

export function resolveDesktopVersionAction(candidate: string, current: string): "bump" | "noop" | "downgrade" {
  const comparison = semver.compare(candidate, current);
  return comparison === 0 ? "noop" : comparison < 0 ? "downgrade" : "bump";
}

export function readCurrentVersion(file = DESKTOP_PACKAGE_JSON): string {
  return JSON.parse(fs.readFileSync(file, "utf8")).version;
}

export function applyVersion(version: string, file = DESKTOP_PACKAGE_JSON): void {
  const raw = fs.readFileSync(file, "utf8");
  const pkg = JSON.parse(raw);
  const current = String(pkg.version);
  const action = resolveDesktopVersionAction(version, current);
  if (action === "downgrade") throw new Error(`applyDesktopVersion: refusing to downgrade — candidate ${version} < current ${current}`);
  if (action === "noop") return;
  pkg.version = version;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
}

async function main(): Promise<void> {
  const version = process.argv[2];
  if (!version) { console.error("Usage: bun ./scripts/release/applyDesktopVersion.ts <version>"); process.exit(1); }
  const current = readCurrentVersion();
  const action = resolveDesktopVersionAction(version, current);
  if (action === "downgrade") { console.error(`applyDesktopVersion: refusing to downgrade — candidate ${version} < current ${current}`); process.exit(1); }
  if (action === "noop") { console.log(`applyDesktopVersion: already at target version ${version}, no-op`); return; }
  applyVersion(version);
  console.log(`applyDesktopVersion: bumped ${current} → ${version}`);
}

if (import.meta.path === process.argv[1]) main();
