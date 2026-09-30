#!/usr/bin/env node
import { resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { installNativeHostManifest } from "../nativeHostInstall.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const connectorRoot = resolve(__dirname, "..");
const args = process.argv.slice(2);
const positional = args.filter((arg) => !arg.startsWith("--"));
const extensionId = positional[0];
// Optional flag: `--browser=firefox` (or `--browser firefox`) registers under Mozilla's
// native-messaging dir with `allowed_extensions`; default keeps the Chrome behavior unchanged.
const browserArg = args.find((arg) => arg.startsWith("--browser="));
const browserFlagIndex = args.indexOf("--browser");
const browser =
  browserArg?.slice("--browser=".length) ??
  (browserFlagIndex >= 0 ? args[browserFlagIndex + 1] : "chrome") ??
  "chrome";

const result = installNativeHostManifest({
  connectorRoot,
  browser,
  ...(extensionId ? { extensionId } : {}),
});

console.log(`Installed ${result.nativeManifestPath}`);
console.log(`Installed native host wrapper: ${result.wrapperPath}`);
console.log(`Allowed Chrome extension id: ${result.extensionId}`);
