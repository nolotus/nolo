#!/usr/bin/env bun

import { assertWindowsInstallerLooksRunnable } from "./windowsInstallerIntegrity";
import {
  createDesktopReleaseArtifact,
  buildDesktopUploadKindIndex,
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
  verifyPublishedS3Object,
  verifyPublishedS3TripleConsistency,
  type DesktopPublishConfig,
  type DesktopBuiltUpdateMetadata,
  type DesktopPublishPlatformInput,
} from "./desktopReleasePublisher";
import {
  readS3Object,
  sha256Hex,
  uploadS3Object,
} from "./s3Upload";
import {
  normalizeDesktopReleaseManifest,
  type DesktopReleaseManifest,
  type DesktopReleasePlatform,
} from "../../packages/app/constants/desktopReleaseManifest";
import {
  assertChecksumSidecarsMatchArtifacts,
  isDesktopChecksumSidecarUploadName,
  isDesktopUpdateManifestUploadName,
} from "../../packages/desktop/scripts/checksumSidecar";

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
    const raw = await readS3Object({
      config,
      uploadName: channelManifestName,
    });
    if (raw === null) return null;
    return normalizeDesktopReleaseManifest(JSON.parse(raw));
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
  if (size < 1) {
    fail(`${target.platform} artifact is empty: ${target.sourcePath}`);
  }
  if (target.platform === "windows") {
    // 硬判据：是不是一个合法的 PE 镜像。体积只是参考——包可以合法地瘦身，
    // 也可以被截断而体积仍大于阈值，字节下限两头都会误判（见
    // scripts/helpers/windowsInstallerIntegrity.ts 的历史说明）。
    await assertWindowsInstallerLooksRunnable(target.sourcePath);
  }
  if (size < target.minBytes) {
    console.warn(
      `[publish-desktop] ${target.platform} artifact smaller than the advisory floor: ` +
        `${target.sourcePath} (${size} bytes < ${target.minBytes} bytes) — ` +
        `structural validation passed, continuing.`,
    );
  }
}

// 发布前 fail closed（Electrobun 2.0.7）：`*-checksum.json` 边车必须与**同目录** manifest
// 的 hash 以及 manifest 指向的最终 tar 摘要/大小一致。必须按 sourcePath 定位——发布计划
// 会递归发现子目录里的产物（CI 按平台分目录下载），拿 uploadName 拼 artifactDir 根目录
// 会 ENOENT 或校验到同名旧文件。不一致就中止发布。
await assertChecksumSidecarsMatchArtifacts({
  sidecars: plan.optional
    .filter((target) => isDesktopChecksumSidecarUploadName(target.uploadName))
    .map((target) => ({ uploadName: target.uploadName, sourcePath: target.sourcePath })),
});

// 清单引用对象与上传顺序的预解析（dry-run 也要看到真实顺序，不能只报计划表）
const referencedPayloadByPlatform = new Map<DesktopReleasePlatform, string>();
for (const target of plan.primary) {
  const updateJsonTarget = plan.updateMetadata[target.platform];
  if (!updateJsonTarget) fail(`Missing ${target.platform} desktop update metadata`);
  const updateJson = (await Bun.file(updateJsonTarget.sourcePath).json()) as DesktopBuiltUpdateMetadata;
  const referenced = (updateJson as { artifact?: { file?: string } }).artifact?.file?.trim();
  if (!referenced) fail(`${target.platform} update.json has no artifact.file`);
  referencedPayloadByPlatform.set(target.platform, referenced);
}

// Electrobun 2.0.7：清单里的 artifact.file 必须在清单公开之前已经上传到那个名字。
// 它可能是版本化主件名、主件的固定名 alias，也可能是 optional 里的更新包
// （Windows 主件是 .exe，更新包是 stable-*-stable.tar.zst）。解析不出来就 fail closed。
const uploadableKinds = buildDesktopUploadKindIndex({
  primary: plan.primary,
  optional: plan.optional,
});
for (const [platform, referenced] of referencedPayloadByPlatform) {
  if (!uploadableKinds.has(referenced)) {
    fail(`${platform} update.json references ${referenced}, which this publish plan never uploads`);
  }
}
const referencedNames = new Set(referencedPayloadByPlatform.values());
// 所有固定名 alias（主件与 optional 都可能有），供「清单引用的名字」提前上传使用。
const aliasSources = new Map<string, string>();
for (const target of [...plan.primary, ...plan.optional]) {
  if (target.aliasUploadName && !aliasSources.has(target.aliasUploadName)) {
    aliasSources.set(target.aliasUploadName, target.sourcePath);
  }
}
const allAliasNames = [...plan.primary, ...plan.optional]
  .map((target) => target.aliasUploadName)
  .filter((name): name is string => Boolean(name));
const earlyAliasNames = allAliasNames.filter((name) => referencedNames.has(name));
const postManifestAliasNames = allAliasNames.filter((name) => !referencedNames.has(name));
// 被清单引用的更新包排在前面，`*-update.json` 永远最后上传（上游发布顺序要求）。
const orderedOptional = [
  ...plan.optional.filter((target) => !isDesktopUpdateManifestUploadName(target.uploadName)),
  ...plan.optional.filter((target) => isDesktopUpdateManifestUploadName(target.uploadName)),
];
// 真实上传顺序：主件 → 被清单引用的 alias → 其余可选件（含边车，早于 update.json）
// → 渠道清单 → 其余 alias（主件与 optional 都算）→ legacy manifest。
const uploadOrder: string[] = [
  ...plan.primary.map((target) => target.uploadName),
  ...earlyAliasNames,
  ...orderedOptional.map((target) => target.uploadName),
  plan.channelManifestUploadName,
  ...postManifestAliasNames,
  plan.legacyManifestUploadName,
];

const summary = {
  channel,
  remote: formatDesktopPublishDestination(config),
  publicBase: config.publicBase,
  primary: plan.primary.map((target) => ({
    platform: target.platform,
    sourcePath: target.sourcePath,
    uploadName: target.uploadName,
    aliasUploadName: target.aliasUploadName,
    referencedPayload: referencedPayloadByPlatform.get(target.platform) ?? null,
  })),
  optional: plan.optional.map((target) => ({
    sourcePath: target.sourcePath,
    uploadName: target.uploadName,
  })),
  channelManifest: plan.channelManifestUploadName,
  legacyManifest: plan.legacyManifestUploadName,
  preManifestUploadNames: uploadOrder.slice(
    0,
    uploadOrder.indexOf(plan.channelManifestUploadName) + 1,
  ),
  postManifestUploadNames: uploadOrder.slice(uploadOrder.indexOf(plan.channelManifestUploadName) + 1),
  uploadOrder,
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
// 已在 update.json 之前提前上传的对象名（清单引用名 ⇒ 不能留到清单之后）。
const uploadedAliasNames = new Set<string>();

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

for (const aliasName of earlyAliasNames) {
  const sourcePath = aliasSources.get(aliasName);
  if (!sourcePath) continue;
  console.log(
    `[publish-desktop] Uploading referenced payload ${aliasName} before its update manifest`,
  );
  await uploadFile({ config, sourcePath, uploadName: aliasName });
  uploadedAliasNames.add(aliasName);
}

for (const target of orderedOptional) {
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

for (const target of plan.primary) {
  if (config.storage === "s3") {
    console.log(`[publish-desktop] Verifying primary S3 object ${target.uploadName}`);
    await verifyPublishedS3Object({
      config,
      uploadName: target.uploadName,
      minBytes: target.minBytes,
      advisorySizeFloor: target.platform === "windows",
      // S3 侧只验「非空 + 与本地等长」。注意等长**不等于**内容相同：它抓的是
      // 截断与尺寸不符，不是"远端就是同一份合法安装包"的证明；内容一致性由
      // 签名上传链路 + payload SHA-256 提供保障，合法 PE 由发布前的本地校验提供。
      // 远端不复刻 PE 探针：S3 需要 SigV4 签名，未签名探针对私有 bucket 会 403，
      // 把正常产物误报成坏包（误拦比不验更糟）。
      ...(target.platform === "windows"
        ? { expectExactBytes: Bun.file(target.sourcePath).size }
        : {}),
    });
  } else {
    const url = `${config.publicBase}/${encodeURIComponent(target.uploadName)}`;
    console.log(`[publish-desktop] Verifying primary ${url}`);
    await verifyPublishedUrl(url, target.minBytes, {
      advisorySizeFloor: target.platform === "windows",
      expectPeHeader: target.platform === "windows",
      // 本地这份就是构建期跑过安装冒烟的产物，远端必须与它等长。
      expectExactBytes: target.platform === "windows" ? Bun.file(target.sourcePath).size : undefined,
    });
  }
}

// Triple consistency: verify update.json matches what we intended to publish
for (const target of plan.primary) {
  const updateJsonTarget = plan.updateMetadata[target.platform];
  if (!updateJsonTarget) continue;

  const result =
    config.storage === "s3"
      ? await verifyPublishedS3TripleConsistency({
          platform: target.platform,
          config,
          updateJsonUploadName: updateJsonTarget.uploadName,
          updateJsonSourcePath: updateJsonTarget.sourcePath,
          manifestArtifactVersion: nextManifest.artifacts[target.platform]?.version,
        })
      : await verifyPublishedTripleConsistency({
          platform: target.platform,
          publicBase: config.publicBase,
          updateJsonUploadName: updateJsonTarget.uploadName,
          updateJsonSourcePath: updateJsonTarget.sourcePath,
          manifestArtifactVersion: nextManifest.artifacts[target.platform]?.version,
        });
  console.log(`[publish-desktop] Verifying update metadata ${result.updateJsonUrl}`);
  assertTripleConsistency(result);
}

console.log(`[publish-desktop] Uploading ${plan.channelManifestUploadName}`);
await uploadText({
  config,
  text: manifestText,
  uploadName: plan.channelManifestUploadName,
});
if (config.storage === "s3") {
  console.log(`[publish-desktop] Verifying S3 manifest ${plan.channelManifestUploadName}`);
  await verifyPublishedS3Object({
    config,
    uploadName: plan.channelManifestUploadName,
    minBytes: 1,
  });
} else {
  await verifyPublishedUrl(`${config.publicBase}/${plan.channelManifestUploadName}`, 1);
}

for (const target of [...plan.primary, ...plan.optional]) {
  if (!target.aliasUploadName) continue;
  if (uploadedAliasNames.has(target.aliasUploadName)) {
    console.log(
      `[publish-desktop] Alias ${target.aliasUploadName} already uploaded before its update manifest`,
    );
  } else {
    console.log(`[publish-desktop] Updating legacy alias ${target.aliasUploadName}`);
    await uploadFile({
      config,
      sourcePath: target.sourcePath,
      uploadName: target.aliasUploadName,
    });
  }
  if (config.storage === "s3") {
    console.log(`[publish-desktop] Verifying legacy alias S3 object ${target.aliasUploadName}`);
    await verifyPublishedS3Object({
      config,
      uploadName: target.aliasUploadName,
      minBytes: target.minBytes,
      advisorySizeFloor: target.platform === "windows",
      ...(target.platform === "windows"
        ? { expectExactBytes: Bun.file(target.sourcePath).size }
        : {}),
    });
  } else {
    const aliasUrl = `${config.publicBase}/${encodeURIComponent(target.aliasUploadName)}`;
    console.log(`[publish-desktop] Verifying legacy alias ${aliasUrl}`);
    await verifyPublishedUrl(aliasUrl, target.minBytes, {
      advisorySizeFloor: target.platform === "windows",
      // Windows alias 是同一份安装包的另一种命名：同样要验 MZ 与等长。
      expectPeHeader: target.platform === "windows",
      ...(target.platform === "windows"
        ? { expectExactBytes: Bun.file(target.sourcePath).size }
        : {}),
    });
  }
}

console.log(`[publish-desktop] Uploading legacy alias ${plan.legacyManifestUploadName}`);
await uploadText({
  config,
  text: manifestText,
  uploadName: plan.legacyManifestUploadName,
});
if (config.storage === "s3") {
  console.log(`[publish-desktop] Verifying legacy alias S3 manifest ${plan.legacyManifestUploadName}`);
  await verifyPublishedS3Object({
    config,
    uploadName: plan.legacyManifestUploadName,
    minBytes: 1,
  });
} else {
  await verifyPublishedUrl(`${config.publicBase}/${plan.legacyManifestUploadName}`, 1);
}

const done = {
  ...summary,
  manifest: nextManifest,
};
console.log(jsonOutput ? JSON.stringify(done, null, 2) : "[publish-desktop] Done");
