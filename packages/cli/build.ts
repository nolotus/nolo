#!/usr/bin/env bun

import { buildPublishArtifact } from "./buildPublish";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CLI_DIR = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(CLI_DIR, "dist");

console.log("Building publish artifact...");
console.log("Source:", CLI_DIR);
console.log("Dist:", DIST_DIR);

await buildPublishArtifact(CLI_DIR, DIST_DIR);

console.log("Build complete! Artifact at:", DIST_DIR);
