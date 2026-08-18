#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function readInstalledVersion(packageName: string) {
  const packageJsonPath = join(root, "node_modules", packageName, "package.json");
  if (!existsSync(packageJsonPath)) {
    throw new Error(`${packageName} is not installed under ${join(root, "node_modules")}. Run bun install first.`);
  }
  return JSON.parse(readFileSync(packageJsonPath, "utf8")).version as string;
}

const playwrightTest = readInstalledVersion("@playwright/test");
const playwright = readInstalledVersion("playwright");

if (playwrightTest !== playwright) {
  console.error(
    `Playwright package versions differ: @playwright/test=${playwrightTest}, playwright=${playwright}. Run bun install to align them.`
  );
  process.exit(1);
}

console.log(`Playwright versions aligned: ${playwright}`);
