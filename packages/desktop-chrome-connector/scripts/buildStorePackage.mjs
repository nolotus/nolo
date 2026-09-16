#!/usr/bin/env node
/**
 * Builds the Chrome Web Store upload package for the Nolo Browser Connector.
 *
 * The store requires manifest.json at the archive root, so this script zips the *contents* of
 * extension/ (never the directory itself) and verifies the result before reporting success.
 *
 * Usage: bun packages/desktop-chrome-connector/scripts/buildStorePackage.mjs
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const connectorRoot = resolve(here, "..");
const extensionDir = join(connectorRoot, "extension");
const outDir = join(connectorRoot, "dist");

/** Files that must never be part of a store package. */
const FORBIDDEN_ENTRIES = [".DS_Store", "node_modules", ".git", "*.map", "*.test.js", "*.md"];

function fail(message) {
  console.error(`[build-store-package] ${message}`);
  process.exit(1);
}

const manifestPath = join(extensionDir, "manifest.json");
if (!existsSync(manifestPath)) fail(`missing manifest: ${manifestPath}`);

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
for (const field of ["name", "version", "manifest_version"]) {
  if (!manifest[field]) fail(`manifest.json is missing "${field}"`);
}

const requiredFiles = ["background.js", "compactObservation.js", "manifest.json"];
for (const file of requiredFiles) {
  if (!existsSync(join(extensionDir, file))) fail(`extension is missing ${file}`);
}

const iconField = manifest.icons ?? {};
for (const size of ["16", "32", "48", "128"]) {
  const iconPath = iconField[size];
  if (!iconPath) fail(`manifest.icons["${size}"] is not declared`);
  if (!existsSync(join(extensionDir, iconPath))) fail(`missing icon file: ${iconPath}`);
}

const iconBytes = Object.values(iconField).map((iconPath) =>
  statSync(join(extensionDir, iconPath)).size,
);
if (iconBytes.some((size) => size < 100)) fail("an icon file looks empty");

mkdirSync(outDir, { recursive: true });
const version = String(manifest.version);
const zipPath = join(outDir, `nolo-browser-connector-${version}.zip`);
rmSync(zipPath, { force: true });

try {
  execFileSync("zip", ["-r", "-X", "-q", zipPath, "."], {
    cwd: extensionDir,
    stdio: "inherit",
  });
} catch (error) {
  fail(`zip failed (is the "zip" CLI installed?): ${error?.message ?? error}`);
}

const listing = execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

if (!listing.includes("manifest.json")) fail("manifest.json is not at the archive root");
if (!listing.some((entry) => entry.endsWith("background.js"))) fail("background.js is missing");

for (const entry of listing) {
  for (const pattern of FORBIDDEN_ENTRIES) {
    const hit = pattern.startsWith("*")
      ? entry.endsWith(pattern.slice(1))
      : entry === pattern || entry.startsWith(`${pattern}/`);
    if (hit) fail(`package contains a file that must not ship: ${entry}`);
  }
}

console.log("[build-store-package] ok");
console.log(`package: ${zipPath}`);
console.log(`entries: ${listing.length}`);
console.log(`bytes:   ${statSync(zipPath).size}`);
console.log(`version: ${version}`);
console.log("--- archive root ---");
console.log(listing.slice(0, 20).join("\n"));
