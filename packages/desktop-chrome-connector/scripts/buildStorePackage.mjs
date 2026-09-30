#!/usr/bin/env node
/**
 * Builds a store upload package for the Nolo Browser Connector.
 *
 * Usage:
 *   node scripts/buildStorePackage.mjs                 # Chrome Web Store zip (default)
 *   node scripts/buildStorePackage.mjs --browser chrome
 *   node scripts/buildStorePackage.mjs --browser firefox
 *
 * The store requires manifest.json at the archive root, so this script zips the *contents* of
 * extension/ (never the directory itself) and verifies the result before reporting success.
 *
 * The Firefox variant rewrites manifest.json at pack time (gecko id, no `key`, event-page
 * background, no `debugger` permission) via ../extensionManifest.mjs; extension sources stay
 * single-tree for both browsers.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { cpSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildFirefoxManifest, FIREFOX_DROPPED_PERMISSIONS } from "../extensionManifest.mjs";

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

const browserArg = process.argv.find((arg) => arg.startsWith("--browser="));
const browserFlagIndex = process.argv.indexOf("--browser");
const browser =
  browserArg?.slice("--browser=".length) ??
  (browserFlagIndex >= 0 ? process.argv[browserFlagIndex + 1] : "chrome") ??
  "chrome";
if (!["chrome", "firefox"].includes(browser)) {
  fail(`unknown --browser value "${browser}" (expected "chrome" or "firefox")`);
}

const manifestPath = join(extensionDir, "manifest.json");
if (!existsSync(manifestPath)) fail(`missing manifest: ${manifestPath}`);

const sourceManifest = JSON.parse(readFileSync(manifestPath, "utf8"));
for (const field of ["name", "version", "manifest_version"]) {
  if (!sourceManifest[field]) fail(`manifest.json is missing "${field}"`);
}

const requiredFiles = ["background.js", "compactObservation.js", "manifest.json"];
for (const file of requiredFiles) {
  if (!existsSync(join(extensionDir, file))) fail(`extension is missing ${file}`);
}

const manifest = browser === "firefox" ? buildFirefoxManifest(sourceManifest) : sourceManifest;

const iconField = sourceManifest.icons ?? {};
for (const size of ["16", "32", "48", "128"]) {
  const iconPath = iconField[size];
  if (!iconPath) fail(`manifest.icons["${size}"] is not declared`);
  if (!existsSync(join(extensionDir, iconPath))) fail(`missing icon file: ${iconPath}`);
}

const iconBytes = Object.values(iconField).map((iconPath) =>
  statSync(join(extensionDir, iconPath)).size,
);
if (iconBytes.some((size) => size < 100)) fail("an icon file looks empty");

/**
 * Chrome packs extension/ in place. Firefox needs a rewritten manifest.json, so it packs from a
 * scratch copy of the tree — the checked-in manifest always stays the Chrome variant.
 */
let packDir = extensionDir;
if (browser === "firefox") {
  packDir = mkdtempSync(join(tmpdir(), "nolo-connector-firefox-"));
  try {
    cpSync(extensionDir, packDir, { recursive: true });
    writeFileSync(join(packDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  } catch (error) {
    rmSync(packDir, { recursive: true, force: true });
    fail(`failed to stage the Firefox package: ${error?.message ?? error}`);
  }
}

mkdirSync(outDir, { recursive: true });
const version = String(sourceManifest.version);
const zipName =
  browser === "firefox"
    ? `nolo-browser-connector-firefox-${version}.zip`
    : `nolo-browser-connector-${version}.zip`;
const zipPath = join(outDir, zipName);
rmSync(zipPath, { force: true });

try {
  execFileSync("zip", ["-r", "-X", "-q", zipPath, "."], {
    cwd: packDir,
    stdio: "inherit",
  });
} catch (error) {
  fail(`zip failed (is the "zip" CLI installed?): ${error?.message ?? error}`);
} finally {
  if (packDir !== extensionDir) rmSync(packDir, { recursive: true, force: true });
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
console.log(`browser:  ${browser}`);
console.log(`package:  ${zipPath}`);
console.log(`entries:  ${listing.length}`);
console.log(`bytes:    ${statSync(zipPath).size}`);
console.log(`version:  ${version}`);
if (browser === "firefox") {
  console.log(`gecko id: ${manifest.browser_specific_settings.gecko.id}`);
  console.log(`dropped permissions: ${FIREFOX_DROPPED_PERMISSIONS.join(", ")}`);
}
console.log("--- archive root ---");
console.log(listing.slice(0, 20).join("\n"));
