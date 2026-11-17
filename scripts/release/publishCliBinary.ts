#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveDesktopPublishConfig,
  type DesktopPublishS3Config,
} from "./desktopReleasePublisher";
import { uploadS3Object } from "./s3Upload";
import { createCliBinaryPublishPlan, executeCliBinaryPublishPlan, prepareCliInstallerSource } from "./cliBinaryPublishPlan";

const PUBLIC_DOWNLOADS_DIR = join(process.cwd(), "public/downloads");

const channelValue = process.env.NOLO_CLI_BINARY_CHANNEL ?? "alpha";
const cliVersionValue = (JSON.parse(readFileSync(join(process.cwd(), "packages/cli/package.json"), "utf8")) as { version?: string }).version;
if (!cliVersionValue) throw new Error("packages/cli/package.json is missing a version");
const cliVersion = cliVersionValue.trim();
const publishPlan = createCliBinaryPublishPlan(channelValue, cliVersion);

const config = resolveDesktopPublishConfig({
  channel: publishPlan.channel,
  env: process.env,
});
if (config.storage !== "s3") {
  console.error(
    "[publish-cli-binary] S3 config required. Set DESKTOP_DOWNLOAD_S3_* env vars.",
  );
  process.exit(1);
}
const s3Config = config as DesktopPublishS3Config;

await executeCliBinaryPublishPlan(
  publishPlan.uploads,
  async (sourceName) => {
    const filePath = join(PUBLIC_DOWNLOADS_DIR, sourceName);
    if (!existsSync(filePath)) throw new Error(`${sourceName} not found at ${filePath}`);
    const rawSource = sourceName.endsWith(".tar.gz") ? Bun.file(filePath) : readFileSync(filePath, "utf8");
    const source = typeof rawSource === "string" ? prepareCliInstallerSource(rawSource, publishPlan.channel) : rawSource;
    const bytes = typeof source === "string" ? new TextEncoder().encode(source) : new Uint8Array(await source.arrayBuffer());
    return { source, payloadHash: createHash("sha256").update(bytes).digest("hex") };
  },
  async (entry, payload) => {
    const body = typeof payload.source === "string" ? new Blob([payload.source], { type: entry.contentType }) : payload.source;
    await uploadS3Object({ config: s3Config, uploadName: entry.targetName, body, payloadHash: payload.payloadHash, contentType: entry.contentType });
    console.log(`[publish-cli-binary] Uploaded ${entry.targetName}`);
  },
);
console.log("[publish-cli-binary] Done.");
