#!/usr/bin/env bun

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  resolveDesktopPublishConfig,
  type DesktopPublishS3Config,
} from "../helpers/desktopReleasePublisher";
import { uploadS3Object } from "../helpers/s3Upload";

const PUBLIC_DOWNLOADS_DIR = join(process.cwd(), "public/downloads");

const channel = process.env.NOLO_CLI_BINARY_CHANNEL ?? "alpha";
const isAlpha = channel === "alpha";

const config = resolveDesktopPublishConfig({
  channel: isAlpha ? "alpha" : "main",
  env: process.env,
});
if (config.storage !== "s3") {
  console.error(
    "[publish-cli-binary] S3 config required. Set DESKTOP_DOWNLOAD_S3_* env vars.",
  );
  process.exit(1);
}
const s3Config = config as DesktopPublishS3Config;

const tarballs = [
  { name: "nolo-darwin-arm64.tar.gz", contentType: "application/gzip" },
  { name: "nolo-linux-x64.tar.gz", contentType: "application/gzip" },
] as const;

for (const { name, contentType } of tarballs) {
  const filePath = join(PUBLIC_DOWNLOADS_DIR, name);
  if (!existsSync(filePath)) {
    console.error(`[publish-cli-binary] ${name} not found at ${filePath}`);
    process.exit(1);
  }
  const body = Bun.file(filePath);
  const payloadHash = createHash("sha256")
    .update(new Uint8Array(await body.arrayBuffer()))
    .digest("hex");
  await uploadS3Object({
    config: s3Config,
    uploadName: name,
    body,
    payloadHash,
    contentType,
  });
  console.log(`[publish-cli-binary] Uploaded ${name}`);
}

const installScriptPath = join(PUBLIC_DOWNLOADS_DIR, "install-nolo.sh");
if (!existsSync(installScriptPath)) {
  console.error(
    `[publish-cli-binary] install-nolo.sh not found at ${installScriptPath}`,
  );
  process.exit(1);
}
// Upload install-nolo.sh as-is. The script defaults to us.nolo.chat
// with nolo.chat fallback, so no patching is needed.
const scriptSource = readFileSync(installScriptPath, "utf8");
const scriptHash = createHash("sha256")
  .update(scriptSource, "utf8")
  .digest("hex");
await uploadS3Object({
  config: s3Config,
  uploadName: "install-nolo.sh",
  body: new Blob([scriptSource], { type: "text/plain; charset=utf-8" }),
  payloadHash: scriptHash,
  contentType: "text/plain; charset=utf-8",
});
console.log(`[publish-cli-binary] Uploaded install-nolo.sh`);
console.log("[publish-cli-binary] Done.");