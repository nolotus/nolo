#!/usr/bin/env bun

import {
  createDesktopReleaseArtifact,
  desktopReleaseManifestFileName,
  formatDesktopPublishDestination,
  hashFileSha256,
  mergeDesktopReleaseManifest,
  normalizeDesktopPublishChannel,
  resolveDesktopAppVersion,
  resolveDesktopPublishConfig,
  resolveDesktopReleaseUploadPlan,
  assertTripleConsistency,
  validateDesktopUpdateMetadata,
  verifyPublishedUrl,
  verifyPublishedTripleConsistency,
  type DesktopPublishConfig,
  type DesktopBuiltUpdateMetadata,
  type DesktopPublishPlatformInput,
} from "./desktopReleasePublisher";
import {
  sha256Hex,
  uploadS3Object,
} from "./s3Upload";
import {
  normalizeDesktopReleaseManifest,
  type DesktopReleaseManifest,
  type DesktopReleasePlatform,
} from "../../packages/app/constants/desktopReleaseManifest";

const args = process.argv.slice(2);

function readArg(flag: string) {
  const index = args.indexOf(flag);
  return index === -1 ? undefined : args[index + 1];
}

function readFlag(flag: string) {
  return args.includes(flag);
}

function readRepeatedArg(flag: string) {
  const values: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === flag && args[i + 1]) values.push(args[i + 1]);
  }
  return values;
}

function usage() {
  console.log(`Usage:
  bun scripts/release/publishDesktopDownloads.ts --channel <alpha|stable|main> [options]

Options:
  --platform <auto|all|windows|macos|linux>
                              Platform selection. Repeatable. Default: auto
  --artifact-dir <path>        Directory containing built artifacts. Default: packages/desktop/artifacts
  --windows <path>             Explicit Windows installer source
  --macos <path>               Explicit macOS DMG source
  --linux <path>               Explicit Linux archive source
  --build-sha <sha>            Build commit SHA written into the manifest
  --version <version>          App version written into the manifest
  --dry-run                    Print upload plan without SSH or HTTP calls
  --json                       Print machine-readable output
  -h, --help                   Show this help

Environment overrides:
  REMOTE_HOST, REMOTE_USER, REMOTE_DIR, PUBLIC_BASE, MIN_WIN_INSTALLER_BYTES
  DESKTOP_DOWNLOAD_S3_ENDPOINT, DESKTOP_DOWNLOAD_S3_BUCKET,
  DESKTOP_DOWNLOAD_S3_REGION, DESKTOP_DOWNLOAD_S3_ACCESS_KEY_ID,
  DESKTOP_DOWNLOAD_S3_SECRET_ACCESS_KEY, DESKTOP_DOWNLOAD_S3_PREFIX,
  DESKTOP_DOWNLOAD_PUBLIC_BASE
`);
}

function fail(message: string): never {
  console.error(`[publish-desktop] ${message}`);
  process.exit(1);
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

async function runProcess(command: string[], options: { stdin?: ReadableStream } = {}) {
  const proc = Bun.spawn(command, {
    stdin: options.stdin ?? "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(
      `${command.join(" ")} failed with ${exitCode}\n${stdout}${stderr}`,
    );
  }
  return stdout;
}

async function runSsh(config: DesktopPublishConfig, command: string) {
  if (config.storage !== "ssh") {
    throw new Error("SSH command requested for non-SSH desktop publish config");
  }
  return runProcess([`ssh`, `${config.remoteUser}@${config.remoteHost}`, command]);
}

function guessContentType(uploadName: string) {
  if (uploadName.endsWith(".json")) return "application/json";
  if (uploadName.endsWith(".dmg")) return "application/x-apple-diskimage";
  if (uploadName.endsWith(".exe")) return "application/vnd.microsoft.portable-executable";
  if (uploadName.endsWith(".zip")) return "application/zip";
  if (uploadName.endsWith(".tar.gz")) return "application/gzip";
  if (uploadName.endsWith(".tar.zst")) return "application/zstd";
  if (uploadName.endsWith(".patch")) return "application/octet-stream";
  return "application/octet-stream";
}

async function uploadFile(args: {
  config: DesktopPublishConfig;
  sourcePath: string;
  uploadName: string;
}) {
  if (args.config.storage === "s3") {
    await uploadS3Object({
      config: args.config,
      uploadName: args.uploadName,
      body: Bun.file(args.sourcePath),
      payloadHash: await hashFileSha256(args.sourcePath),
      contentType: guessContentType(args.uploadName),
    });
    return;
  }

  const remotePath = `${args.config.remoteDir}/${args.uploadName}`;
  await runProcess(
    [
      "ssh",
      `${args.config.remoteUser}@${args.config.remoteHost}`,
      `cat > ${shellQuote(remotePath)}`,
    ],
    { stdin: Bun.file(args.sourcePath).stream() },
  );
}

async function uploadText(args: {
  config: DesktopPublishConfig;
  text: string;
  uploadName: string;
}) {
  if (args.config.storage === "s3") {
    await uploadS3Object({
      config: args.config,
      uploadName: args.uploadName,
      body: new Blob([args.text]),
      payloadHash: sha256Hex(args.text),
      contentType: "application/json",
    });
    return;
  }

  const remotePath = `${args.config.remoteDir}/${args.uploadName}`;
  await runProcess(
    [
      "ssh",
      `${args.config.remoteUser}@${args.config.remoteHost}`,
      `cat > ${shellQuote(remotePath)}`,
    ],
    { stdin: new Blob([args.text]).stream() },
  );
}

async function readRemoteManifest(
  config: DesktopPublishConfig,
): Promise<DesktopReleaseManifest | null> {
  const channelManifestName = desktopReleaseManifestFileName(config.channel);
  if (config.storage === "s3") {
    const response = await fetch(`${config.publicBase}/${channelManifestName}`, {
      cache: "no-store",
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(
        `Failed to read desktop release manifest: ${response.status} ${await response.text()}`
      );
    }
    return normalizeDesktopReleaseManifest(await response.json());
  }

  const remotePath = `${config.remoteDir}/${channelManifestName}`;
  const output = await runSsh(
    config,
    `if test -f ${shellQuote(remotePath)}; then cat ${shellQuote(remotePath)}; fi`,
  );
  if (!output.trim()) return null;
  return normalizeDesktopReleaseManifest(JSON.parse(output));
}

if (readFlag("-h") || readFlag("--help")) {
  usage();
  process.exit(0);
}

const channel = normalizeDesktopPublishChannel(
  readArg("--channel") ?? readArg("--branch") ?? args[0] ?? "alpha",
);
const config = resolveDesktopPublishConfig({ channel });
const artifactDir = readArg("--artifact-dir") ?? "packages/desktop/artifacts";
const explicitPaths: Partial<Record<DesktopReleasePlatform, string>> = {
  ...(readArg("--windows") ? { windows: readArg("--windows") } : {}),
  ...(readArg("--macos") ? { macos: readArg("--macos") } : {}),
  ...(readArg("--linux") ? { linux: readArg("--linux") } : {}),
};
const platforms = readRepeatedArg("--platform")
  .flatMap((value) => value.split(","))
  .map((value) => value.trim())
  .filter(Boolean) as DesktopPublishPlatformInput[];
const minWindowsBytes = Number(
  process.env.MIN_WIN_INSTALLER_BYTES ?? readArg("--min-win-installer-bytes") ?? 50000000,
);
const buildSha = readArg("--build-sha") ?? process.env.GITHUB_SHA;
const version = resolveDesktopAppVersion(readArg("--version"));
const dryRun = readFlag("--dry-run");
const jsonOutput = readFlag("--json");

const requireLinuxPackages = process.env.NOLO_DESKTOP_REQUIRE_LINUX_PACKAGES === "1";

const plan = await resolveDesktopReleaseUploadPlan({
  channel,
  artifactDir,
  platforms,
  explicitPaths,
  minWindowsBytes,
  version,
  requireLinuxPackages,
});

for (const target of plan.primary) {
  const size = Bun.file(target.sourcePath).size;
  if (size < target.minBytes) {
    fail(
      `${target.platform} artifact is too small: ${target.sourcePath} (${size} bytes < ${target.minBytes} bytes)`,
    );
  }
}

const summary = {
  channel,
  remote: formatDesktopPublishDestination(config),
  publicBase: config.publicBase,
  primary: plan.primary.map((target) => ({
    platform: target.platform,
    sourcePath: target.sourcePath,
    uploadName: target.uploadName,
    aliasUploadName: target.aliasUploadName,
  })),
  optional: plan.optional.map((target) => ({
    sourcePath: target.sourcePath,
    uploadName: target.uploadName,
  })),
  channelManifest: plan.channelManifestUploadName,
  legacyManifest: plan.legacyManifestUploadName,
  preManifestUploadNames: plan.preManifestUploadNames,
  postManifestUploadNames: plan.postManifestUploadNames,
  dryRun,
};

if (dryRun) {
  console.log(jsonOutput ? JSON.stringify(summary, null, 2) : summary);
  process.exit(0);
}

console.log(`[publish-desktop] Channel    : ${channel}`);
console.log(`[publish-desktop] Remote     : ${summary.remote}`);
console.log(`[publish-desktop] Public base: ${config.publicBase}`);

const existingManifest = await readRemoteManifest(config);

for (const target of plan.primary) {
  const updateJsonTarget = plan.updateMetadata[target.platform];
  if (!updateJsonTarget) fail(`Missing ${target.platform} desktop update metadata`);

  const updateJson = (await Bun.file(updateJsonTarget.sourcePath).json()) as DesktopBuiltUpdateMetadata;
  validateDesktopUpdateMetadata({
    channel,
    platform: target.platform,
    expectedVersion: version,
    buildSha,
    updateJson,
    existingManifest,
  });
}

if (config.storage === "ssh") {
  await runSsh(config, `mkdir -p ${shellQuote(config.remoteDir)}`);
}

const publishedAt = new Date().toISOString();
const updates: Partial<Record<DesktopReleasePlatform, Awaited<ReturnType<typeof createDesktopReleaseArtifact>>>> = {};

for (const target of plan.primary) {
  console.log(`[publish-desktop] Uploading ${target.uploadName}`);
  await uploadFile({
    config,
    sourcePath: target.sourcePath,
    uploadName: target.uploadName,
  });
  const updateJsonTarget = plan.updateMetadata[target.platform];
  updates[target.platform] = await createDesktopReleaseArtifact({
    sourcePath: target.sourcePath,
    uploadName: target.uploadName,
    publicBase: config.publicBase,
    version,
    buildSha,
    publishedAt,
    updateJsonSourcePath: updateJsonTarget?.sourcePath,
    updateJsonUploadName: updateJsonTarget?.uploadName,
  });
}

for (const target of plan.optional) {
  console.log(`[publish-desktop] Uploading optional ${target.uploadName}`);
  await uploadFile({
    config,
    sourcePath: target.sourcePath,
    uploadName: target.uploadName,
  });
}

const nextManifest = mergeDesktopReleaseManifest({
  channel,
  existing: existingManifest,
  updates,
  updatedAt: publishedAt,
});
const manifestText = `${JSON.stringify(nextManifest, null, 2)}\n`;
console.log(`[publish-desktop] Uploading ${plan.channelManifestUploadName}`);
await uploadText({
  config,
  text: manifestText,
  uploadName: plan.channelManifestUploadName,
});

for (const target of plan.primary) {
  const url = `${config.publicBase}/${encodeURIComponent(target.uploadName)}`;
  console.log(`[publish-desktop] Verifying primary ${url}`);
  await verifyPublishedUrl(url, target.minBytes);
}
await verifyPublishedUrl(`${config.publicBase}/${plan.channelManifestUploadName}`, 1);

// Triple consistency: verify update.json matches what we intended to publish
for (const target of plan.primary) {
  const updateJsonTarget = plan.updateMetadata[target.platform];
  if (!updateJsonTarget) continue;

  const result = await verifyPublishedTripleConsistency({
    platform: target.platform,
    publicBase: config.publicBase,
    updateJsonUploadName: updateJsonTarget.uploadName,
    updateJsonSourcePath: updateJsonTarget.sourcePath,
    manifestArtifactVersion: nextManifest.artifacts[target.platform]?.version,
  });
  console.log(`[publish-desktop] Verifying update metadata ${result.updateJsonUrl}`);
  assertTripleConsistency(result);
}

for (const target of [...plan.primary, ...plan.optional]) {
  if (!target.aliasUploadName) continue;
  console.log(`[publish-desktop] Updating legacy alias ${target.aliasUploadName}`);
  await uploadFile({
    config,
    sourcePath: target.sourcePath,
    uploadName: target.aliasUploadName,
  });
  const aliasUrl = `${config.publicBase}/${encodeURIComponent(target.aliasUploadName)}`;
  console.log(`[publish-desktop] Verifying legacy alias ${aliasUrl}`);
  await verifyPublishedUrl(aliasUrl, target.minBytes);
}

console.log(`[publish-desktop] Uploading legacy alias ${plan.legacyManifestUploadName}`);
await uploadText({
  config,
  text: manifestText,
  uploadName: plan.legacyManifestUploadName,
});
await verifyPublishedUrl(`${config.publicBase}/${plan.legacyManifestUploadName}`, 1);

const done = {
  ...summary,
  manifest: nextManifest,
};
console.log(jsonOutput ? JSON.stringify(done, null, 2) : "[publish-desktop] Done");
