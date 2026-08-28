#!/usr/bin/env node
import { resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { installNativeHostManifest } from "../nativeHostInstall.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const connectorRoot = resolve(__dirname, "..");
const extensionId = process.argv[2];

const result = installNativeHostManifest({
  connectorRoot,
  ...(extensionId ? { extensionId } : {}),
});

console.log(`Installed ${result.nativeManifestPath}`);
console.log(`Installed native host wrapper: ${result.wrapperPath}`);
console.log(`Allowed Chrome extension id: ${result.extensionId}`);
