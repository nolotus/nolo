import { readdir } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { createHash } from "node:crypto";
import {
  DESKTOP_RELEASE_MANIFEST_PUBLIC_PATH,
  desktopReleaseManifestPublicPath,
  type DesktopReleaseArtifact,
  type DesktopReleaseChannel,
  type DesktopReleaseManifest,
  type DesktopReleasePlatform,
} from "../../packages/app/constants/desktopReleaseManifest";
import { compareDesktopVersions } from "../../packages/core/desktop/desktopUpdatePolicy";
import { DESKTOP_APP_VERSION } from "../../packages/desktop/desktopVersion";

export type DesktopPublishChannelInput = DesktopReleaseChannel | "main";
export type DesktopPublishPlatformInput = DesktopReleasePlatform | "all" | "auto";

export type DesktopPublishTarget = {
  platform: DesktopReleasePlatform;
  sourcePath: string;
  uploadName: string;
  aliasUploadName?: string;
  required: boolean;
  minBytes: number;
};

export type DesktopReleaseUploadPlan = {
  primary: DesktopPublishTarget[];
  optional: DesktopPublishTarget[];
  updateMetadata: Partial<Record<DesktopReleasePlatform, DesktopPublishTarget>>;
  requiredUploadNames: string[];
  preManifestUploadNames: string[];
  postManifestUploadNames: string[];
  channelManifestUploadName: string;
  legacyManifestUploadName: string;
};

export type DesktopPublishSshConfig = {
  storage: "ssh";
  channel: DesktopReleaseChannel;
  remoteHost: string;
  remoteUser: string;
  remoteDir: string;
  publicBase: string;
};

export type DesktopPublishS3Config = {
  storage: "s3";
  channel: DesktopReleaseChannel;
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  pathPrefix: string;
  publicBase: string;
};

export type DesktopPublishConfig = DesktopPublishSshConfig | DesktopPublishS3Config;

export type PublishedUrlVerificationOptions = {
  fetchFn?: typeof fetch;
  sleepFn?: (ms: number) => Promise<unknown>;
  maxAttempts?: number;
  baseDelayMs?: number;
};

const LEGACY_MANIFEST_NAME = basename(DESKTOP_RELEASE_MANIFEST_PUBLIC_PATH);
const DEFAULT_MIN_WIN_INSTALLER_BYTES = 50000000;
const ALPHA_MACOS_APP_TARBALL_NAME = "canary-macos-arm64-NoloDesktop-canary.app.tar.zst";

export async function verifyPublishedUrl(
  url: string,
  minBytes: number,
  options: PublishedUrlVerificationOptions = {},
) {
  // Some CDN responses are compressed dynamically. Bun then removes the
  // encoded Content-Length from HEAD responses, so use a one-byte range probe
  // to recover the object total from Content-Range before declaring it empty.
  const fetchFn = options.fetchFn ?? fetch;
  const sleepFn = options.sleepFn ?? Bun.sleep;
  const maxAttempts = options.maxAttempts ?? 5;
  const baseDelayMs = options.baseDelayMs ?? 1500;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const headResponse = await fetchFn(url, {
        method: "HEAD",
        cache: "no-store",
      });
      if (!headResponse.ok) {
        lastError = new Error(`HEAD ${url} failed with ${headResponse.status}`);
      } else {
        const headLengthHeader = headResponse.headers.get("content-length");
        const headLength = headLengthHeader === null ? Number.NaN : Number(headLengthHeader);
        if (Number.isFinite(headLength) && headLength >= minBytes) return;

        const rangeResponse = await fetchFn(url, {
          method: "GET",
          cache: "no-store",
          headers: { Range: "bytes=0-0" },
        });
        const contentRange = rangeResponse.headers.get("content-range") ?? "";
        const rangeTotalMatch = contentRange.match(/\/(\d+)$/);
        const rangeTotal = rangeTotalMatch ? Number(rangeTotalMatch[1]) : Number.NaN;
        const fullGetLength =
          rangeResponse.status === 200
            ? Number(rangeResponse.headers.get("content-length") ?? Number.NaN)
            : Number.NaN;
        const confirmedLength = Number.isFinite(rangeTotal) ? rangeTotal : fullGetLength;
        if (rangeResponse.body) {
          await rangeResponse.body.cancel().catch(() => undefined);
        }

        if (rangeResponse.ok && Number.isFinite(confirmedLength) && confirmedLength >= minBytes) {
          return;
        }
        lastError = new Error(
          `Published artifact is too small or its size is unavailable: ${url} ` +
            `(HEAD ${headLengthHeader ?? "missing"}, range ${contentRange || "missing"}, minimum ${minBytes} bytes)`,
        );
      }
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxAttempts) await sleepFn(baseDelayMs * attempt);
  }
  throw lastError;
}

export function desktopReleaseManifestFileName(channel?: DesktopReleaseChannel) {
  return basename(desktopReleaseManifestPublicPath(channel));
}

const PLATFORM_PRIMARY_NAMES: Record<
  DesktopReleaseChannel,
  Record<DesktopReleasePlatform, string>
> = {
  alpha: {
    windows: "canary-win-x64-NoloDesktop-Setup-canary.exe",
    linux: "canary-linux-x64-NoloDesktop-canary.tar.zst",
    macos: "canary-macos-arm64-NoloDesktop-canary.dmg",
  },
  stable: {
    windows: "stable-win-x64-NoloDesktop-Setup.exe",
    linux: "stable-linux-x64-NoloDesktop.tar.zst",
    macos: "stable-macos-arm64-NoloDesktop.dmg",
  },
};

const PLATFORM_UPDATE_JSON_NAMES: Record<
  DesktopReleaseChannel,
  Record<DesktopReleasePlatform, string>
> = {
  alpha: {
    windows: "canary-win-x64-update.json",
    linux: "canary-linux-x64-update.json",
    macos: "canary-macos-arm64-update.json",
  },
  stable: {
    windows: "stable-win-x64-update.json",
    linux: "stable-linux-x64-update.json",
    macos: "stable-macos-arm64-update.json",
  },
};

const OPTIONAL_PATTERNS: Record<DesktopReleaseChannel, RegExp[]> = {
  alpha: [
    /^canary-win-x64-NoloDesktop-Setup-canary-[0-9][^/]*\.exe$/i,
    /^canary-.*\.(zip|json|tar\.zst|patch)$/i,
    /^canary-macos-arm64-NoloDesktop-canary\.app\.tar\.zst$/i,
    /^nolo-desktop[_-].*\.deb$/i,
    /^nolo-desktop[_-].*\.rpm$/i,
  ],
  stable: [
    /^stable-win-x64-NoloDesktop-Setup-[0-9][^/]*\.exe$/i,
    /^stable-.*\.(zip|json|tar\.zst|patch)$/i,
    /^stable-macos-arm64-NoloDesktop\.app\.tar\.zst$/i,
    /^nolo-desktop[_-].*\.deb$/i,
    /^nolo-desktop[_-].*\.rpm$/i,
  ],
};

const DEB_OPTIONAL_PATTERN = /^nolo-desktop[_-].*\.deb$/i;
const RPM_OPTIONAL_PATTERN = /^nolo-desktop[_-].*\.rpm$/i;

function resolveDesktopPackageAliasUploadName(args: {
  channel: DesktopReleaseChannel;
  fileName: string;
}): string | undefined {
  const name = basename(args.fileName);
  if (DEB_OPTIONAL_PATTERN.test(name)) {
    return args.channel === "alpha"
      ? "nolo-desktop-canary_amd64.deb"
      : "nolo-desktop_amd64.deb";
  }
  if (RPM_OPTIONAL_PATTERN.test(name)) {
    return args.channel === "alpha"
      ? "nolo-desktop-canary_x86_64.rpm"
      : "nolo-desktop_x86_64.rpm";
  }
  return undefined;
}

function isAlphaMacosAppTarball(args: {
  channel: DesktopReleaseChannel;
  platform: DesktopReleasePlatform;
  name: string;
}) {
  return (
    args.channel === "alpha" &&
    args.platform === "macos" &&
    args.name === ALPHA_MACOS_APP_TARBALL_NAME
  );
}

function findDesktopPrimarySource(args: {
  channel: DesktopReleaseChannel;
  platform: DesktopReleasePlatform;
  files: string[];
  uploadName: string;
  explicitPath?: string;
}) {
  if (args.explicitPath) return args.explicitPath;

  const exactMatch = args.files.find((file) => basename(file) === args.uploadName);
  if (exactMatch) return exactMatch;

  if (args.platform === "windows") {
    return args.files.find((file) => {
      const name = basename(file);
      return args.channel === "alpha"
        ? /^canary-win-x64-NoloDesktop-Setup-canary(?:-[0-9][^/]*)?\.exe$/i.test(name)
        : /^stable-win-x64-NoloDesktop-Setup(?:-[0-9][^/]*)?\.exe$/i.test(name);
    });
  }

  if (args.channel === "alpha" && args.platform === "macos") {
    const dmgName = PLATFORM_PRIMARY_NAMES.alpha.macos;
    const dmg = args.files.find((file) => basename(file) === dmgName);
    if (dmg) return dmg;
    return args.files.find((file) => basename(file) === ALPHA_MACOS_APP_TARBALL_NAME);
  }

  return undefined;
}

function resolveDesktopPrimaryUploadName(args: {
  channel: DesktopReleaseChannel;
  platform: DesktopReleasePlatform;
  sourcePath: string;
  defaultUploadName: string;
}) {
  const sourceName = basename(args.sourcePath);
  return isAlphaMacosAppTarball({
    channel: args.channel,
    platform: args.platform,
    name: sourceName,
  })
    ? sourceName
    : args.defaultUploadName;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitDesktopArtifactExtension(name: string) {
  for (const extension of [".app.tar.zst", ".tar.zst", ".tar.gz"] as const) {
    if (name.endsWith(extension)) {
      return {
        stem: name.slice(0, -extension.length),
        extension,
      };
    }
  }

  const dot = name.lastIndexOf(".");
  if (dot <= 0) {
    return { stem: name, extension: "" };
  }

  return {
    stem: name.slice(0, dot),
    extension: name.slice(dot),
  };
}

export function resolveImmutableDesktopPrimaryUploadName(args: {
  uploadName: string;
  sourcePath: string;
  version: string;
}) {
  const sourceName = basename(args.sourcePath);
  const versionPattern = new RegExp(`-${escapeRegExp(args.version)}(?=[.-]|$)`);
  if (versionPattern.test(sourceName)) {
    return sourceName;
  }

  const { stem, extension } = splitDesktopArtifactExtension(args.uploadName);
  return `${stem}-${args.version}${extension}`;
}

export function normalizeDesktopPublishChannel(
  value: string | undefined,
): DesktopReleaseChannel {
  if (value === "alpha") return "alpha";
  if (value === "stable" || value === "main") return "stable";
  throw new Error(`Unsupported desktop publish channel: ${value ?? ""}`);
}

export function resolveDesktopAppVersion(override?: string) {
  return override?.trim() || DESKTOP_APP_VERSION;
}

export function resolveDesktopUpdateJsonUploadName(args: {
  channel: DesktopReleaseChannel;
  platform: DesktopReleasePlatform;
}) {
  return PLATFORM_UPDATE_JSON_NAMES[args.channel][args.platform];
}

export type DesktopBuiltUpdateMetadata = {
  version?: string;
  hash?: string;
};

export function validateDesktopUpdateMetadata(args: {
  channel: DesktopReleaseChannel;
  platform: DesktopReleasePlatform;
  expectedVersion: string;
  buildSha?: string;
  updateJson: DesktopBuiltUpdateMetadata;
  existingManifest: DesktopReleaseManifest | null;
}) {
  const actualVersion = args.updateJson.version?.trim();
  const actualHash = args.updateJson.hash?.trim();

  if (!actualVersion) {
    throw new Error(
      `${args.channel} ${args.platform} update.json is missing a version field`
    );
  }
  if (!actualHash) {
    throw new Error(
      `${args.channel} ${args.platform} update.json is missing a hash field`
    );
  }
  if (actualVersion !== args.expectedVersion) {
    throw new Error(
      `${args.channel} ${args.platform} update.json version ${actualVersion} does not match expected desktop version ${args.expectedVersion}`
    );
  }

  const previousVersion =
    args.existingManifest?.channel === args.channel
      ? args.existingManifest.artifacts[args.platform]?.version?.trim()
      : undefined;
  if (!previousVersion) {
    return;
  }

  const delta = compareDesktopVersions(actualVersion, previousVersion);
  if (delta === null) {
    throw new Error(
      `${args.channel} ${args.platform} update.json version ${actualVersion} cannot be compared against currently published version ${previousVersion}`
    );
  }
  const previousBuildSha =
    args.existingManifest?.artifacts[args.platform]?.buildSha?.trim();
  if (delta === 0 && args.buildSha && previousBuildSha === args.buildSha) {
    return;
  }
  if (delta <= 0) {
    // A prerelease version recorded in a stable-channel manifest means the
    // channel was polluted (e.g. an alpha build published to stable by
    // mistake). A genuine stable release is always the correct repair for
    // that state, so allow the overwrite instead of blocking the release
    // behind manual R2 surgery. Every other non-advancing publish still
    // fails loudly.
    //
    // Invariant assumption: a prerelease version in the stable channel is
    // ALWAYS pollution — stable never ships legitimate RC/prerelease builds.
    // If stable ever introduces sanctioned RC rollout, replace this implicit
    // repair with an explicit --repair-polluted-stable opt-in flag.
    const previousIsPrerelease = previousVersion.includes("-");
    const actualIsStableRelease = !actualVersion.includes("-");
    if (
      args.channel !== "stable" ||
      !previousIsPrerelease ||
      !actualIsStableRelease
    ) {
      throw new Error(
        `${args.channel} ${args.platform} desktop version ${actualVersion} must be newer than the currently published version ${previousVersion}`
      );
    }
    console.warn(
      `[publish-desktop] repairing polluted ${args.channel} ${args.platform} channel: published prerelease ${previousVersion} will be replaced by stable ${actualVersion}`
    );
  }
}

export function resolveDesktopPublishConfig(args: {
  channel: DesktopPublishChannelInput;
  env?: NodeJS.ProcessEnv;
}): DesktopPublishConfig {
  const env = args.env ?? process.env;
  const channel = normalizeDesktopPublishChannel(args.channel);
  const s3Endpoint = env.DESKTOP_DOWNLOAD_S3_ENDPOINT?.trim() ?? "";
  const s3Bucket = env.DESKTOP_DOWNLOAD_S3_BUCKET?.trim() ?? "";
  const s3AccessKeyId = env.DESKTOP_DOWNLOAD_S3_ACCESS_KEY_ID?.trim() ?? "";
  const s3SecretAccessKey = env.DESKTOP_DOWNLOAD_S3_SECRET_ACCESS_KEY?.trim() ?? "";
  const hasS3Config = Boolean(
    s3Endpoint || s3Bucket || s3AccessKeyId || s3SecretAccessKey
  );
  if (hasS3Config) {
    const publicBase = env.DESKTOP_DOWNLOAD_PUBLIC_BASE?.trim() ?? "";
    const missing = [
      ["DESKTOP_DOWNLOAD_S3_ENDPOINT", s3Endpoint],
      ["DESKTOP_DOWNLOAD_S3_BUCKET", s3Bucket],
      ["DESKTOP_DOWNLOAD_S3_ACCESS_KEY_ID", s3AccessKeyId],
      ["DESKTOP_DOWNLOAD_S3_SECRET_ACCESS_KEY", s3SecretAccessKey],
      ["DESKTOP_DOWNLOAD_PUBLIC_BASE", publicBase],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);
    if (missing.length > 0) {
      throw new Error(
        `Missing S3 desktop download config: ${missing.join(", ")}`
      );
    }

    return {
      storage: "s3",
      channel,
      endpoint: s3Endpoint.replace(/\/+$/, ""),
      bucket: s3Bucket,
      region: env.DESKTOP_DOWNLOAD_S3_REGION?.trim() || "auto",
      accessKeyId: s3AccessKeyId,
      secretAccessKey: s3SecretAccessKey,
      pathPrefix: (env.DESKTOP_DOWNLOAD_S3_PREFIX?.trim() ?? "").replace(
        /^\/+|\/+$/g,
        ""
      ),
      publicBase: publicBase.replace(/\/+$/, ""),
    };
  }

  if (channel === "alpha") {
    const remoteHost = env.REMOTE_HOST ?? env.ALPHA_SSH_HOST;
    if (!remoteHost) {
      throw new Error("Missing alpha SSH host. Set REMOTE_HOST or ALPHA_SSH_HOST to the real VM host/IP, not us.nolo.chat.");
    }
    return {
      storage: "ssh",
      channel,
      remoteHost,
      remoteUser: env.REMOTE_USER ?? env.SERVER_USERNAME ?? "root",
      remoteDir: env.REMOTE_DIR ?? "/root/bun-nolo/public/downloads",
      publicBase: (env.PUBLIC_BASE ?? "https://us.nolo.chat/public/downloads").replace(
        /\/+$/,
        "",
      ),
    };
  }
  const remoteHost = env.REMOTE_HOST ?? env.MAIN_SSH_HOST;
  if (!remoteHost) {
    throw new Error("Missing stable SSH host. Set REMOTE_HOST or MAIN_SSH_HOST to the real VM host/IP, not nolo.chat.");
  }
  return {
    storage: "ssh",
    channel,
    remoteHost,
    remoteUser: env.REMOTE_USER ?? "nolotus",
    remoteDir: env.REMOTE_DIR ?? "/home/nolotus/bun-nolo/public/downloads",
    publicBase: (env.PUBLIC_BASE ?? "https://nolo.chat/public/downloads").replace(
      /\/+$/,
      "",
    ),
  };
}

export function formatDesktopPublishDestination(config: DesktopPublishConfig) {
  if (config.storage === "s3") {
    return `s3://${config.bucket}${config.pathPrefix ? `/${config.pathPrefix}` : ""}`;
  }
  return `${config.remoteUser}@${config.remoteHost}:${config.remoteDir}`;
}

export function mergeDesktopReleaseManifest(args: {
  channel: DesktopReleaseChannel;
  existing?: DesktopReleaseManifest | null;
  updates: Partial<Record<DesktopReleasePlatform, DesktopReleaseArtifact>>;
  updatedAt: string;
}): DesktopReleaseManifest {
  const baseArtifacts =
    args.existing?.channel === args.channel ? args.existing.artifacts : {};
  return {
    schemaVersion: 1,
    channel: args.channel,
    updatedAt: args.updatedAt,
    artifacts: {
      ...baseArtifacts,
      ...args.updates,
    },
  };
}

export async function hashFileSha256(path: string): Promise<string> {
  const hash = createHash("sha256");
  const bytes = await Bun.file(path).arrayBuffer();
  hash.update(new Uint8Array(bytes));
  return hash.digest("hex");
}

export async function createDesktopReleaseArtifact(args: {
  sourcePath: string;
  uploadName: string;
  publicBase: string;
  version?: string;
  buildSha?: string;
  publishedAt: string;
  updateJsonSourcePath?: string;
  updateJsonUploadName?: string;
}): Promise<DesktopReleaseArtifact> {
  const file = Bun.file(args.sourcePath);
  const artifact: DesktopReleaseArtifact = {
    url: `${args.publicBase}/${encodeURIComponent(args.uploadName).replace(/%2F/g, "/")}`,
    size: file.size,
    sha256: await hashFileSha256(args.sourcePath),
    ...(args.version ? { version: args.version } : {}),
    ...(args.buildSha ? { buildSha: args.buildSha } : {}),
    publishedAt: args.publishedAt,
  };

  if (args.updateJsonSourcePath && args.updateJsonUploadName) {
    const updateFile = Bun.file(args.updateJsonSourcePath);
    const updateJson = (await updateFile.json()) as { version?: string; hash?: string };
    artifact.updateMeta = {
      url: `${args.publicBase}/${encodeURIComponent(args.updateJsonUploadName).replace(/%2F/g, "/")}`,
      sha256: await hashFileSha256(args.updateJsonSourcePath),
      size: updateFile.size,
      version: updateJson.version ?? "",
      hash: updateJson.hash ?? "",
    };
  }

  return artifact;
}

export async function listDesktopArtifactFiles(artifactDir: string): Promise<string[]> {
  const entries = await readdir(artifactDir, { withFileTypes: true }).catch(() => []);
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(artifactDir, entry.name);
      if (entry.isFile()) return [path];
      if (entry.isDirectory()) return listDesktopArtifactFiles(path);
      return [];
    }),
  );
  return files.flat();
}

export async function resolveDesktopPublishTargets(args: {
  channel: DesktopReleaseChannel;
  artifactDir: string;
  platforms: DesktopPublishPlatformInput[];
  explicitPaths?: Partial<Record<DesktopReleasePlatform, string>>;
  minWindowsBytes?: number;
  requireLinuxPackages?: boolean;
}): Promise<{ primary: DesktopPublishTarget[]; optional: DesktopPublishTarget[] }> {
  const artifactDir = resolve(args.artifactDir);
  const files = await listDesktopArtifactFiles(artifactDir);
  const platformInputs = args.platforms.length ? args.platforms : ["auto"];
  const auto = platformInputs.includes("auto");
  const selectedPlatforms: DesktopReleasePlatform[] = platformInputs.includes("all")
    ? ["windows", "linux", "macos"]
    : (platformInputs.filter((item) => item !== "auto") as DesktopReleasePlatform[]);

  const primary: DesktopPublishTarget[] = [];
  for (const platform of ["windows", "linux", "macos"] as const) {
    const defaultUploadName = PLATFORM_PRIMARY_NAMES[args.channel][platform];
    const explicitPath = args.explicitPaths?.[platform];
    const sourcePath = findDesktopPrimarySource({
      channel: args.channel,
      platform,
      files,
      uploadName: defaultUploadName,
      explicitPath,
    });
    const isSelected = auto ? Boolean(sourcePath) : selectedPlatforms.includes(platform);
    if (!isSelected) continue;
    if (!sourcePath) {
      throw new Error(`Missing required ${platform} desktop artifact: ${defaultUploadName}`);
    }
    const uploadName = resolveDesktopPrimaryUploadName({
      channel: args.channel,
      platform,
      sourcePath,
      defaultUploadName,
    });
    primary.push({
      platform,
      sourcePath,
      uploadName,
      required: true,
      minBytes: platform === "windows" ? args.minWindowsBytes ?? DEFAULT_MIN_WIN_INSTALLER_BYTES : 1,
    });
  }

  if (primary.length === 0) {
    throw new Error(`No desktop artifacts found in ${artifactDir}`);
  }

  const primarySources = new Set(primary.map((target) => resolve(target.sourcePath)));
  const optional = files
    .filter((file) => !primarySources.has(resolve(file)))
    .filter((file) => OPTIONAL_PATTERNS[args.channel].some((pattern) => pattern.test(basename(file))))
    .map((file) => {
      const uploadName = basename(file);
      const aliasUploadName = resolveDesktopPackageAliasUploadName({
        channel: args.channel,
        fileName: file,
      });
      return {
        platform: "linux" as DesktopReleasePlatform,
        sourcePath: file,
        uploadName,
        required: false,
        minBytes: 1,
        ...(aliasUploadName ? { aliasUploadName } : {}),
      };
    });

  if (args.requireLinuxPackages && primary.some((target) => target.platform === "linux")) {
    const hasRpm = optional.some((target) => RPM_OPTIONAL_PATTERN.test(basename(target.sourcePath)));
    const hasDeb = optional.some((target) => DEB_OPTIONAL_PATTERN.test(basename(target.sourcePath)));
    if (!hasRpm) {
      throw new Error(
        `Missing required Linux RPM artifact in ${artifactDir} (NOLO_DESKTOP_REQUIRE_LINUX_PACKAGES=1). Check the desktop build step logs for rpmbuild failures.`
      );
    }
    if (!hasDeb) {
      throw new Error(
        `Missing required Linux DEB artifact in ${artifactDir} (NOLO_DESKTOP_REQUIRE_LINUX_PACKAGES=1). Check the desktop build step logs for deb package failures.`
      );
    }
  }

  return { primary, optional };
}

export async function resolveDesktopReleaseUploadPlan(args: {
  channel: DesktopReleaseChannel;
  artifactDir: string;
  platforms: DesktopPublishPlatformInput[];
  explicitPaths?: Partial<Record<DesktopReleasePlatform, string>>;
  minWindowsBytes?: number;
  version?: string;
  requireLinuxPackages?: boolean;
}): Promise<DesktopReleaseUploadPlan> {
  const targets = await resolveDesktopPublishTargets(args);
  const updateMetadata: DesktopReleaseUploadPlan["updateMetadata"] = {};
  const requiredUploadNames: string[] = [];
  const preManifestUploadNames: string[] = [];
  const postManifestUploadNames: string[] = [];
  const version = resolveDesktopAppVersion(args.version);
  const primary = targets.primary.map((target) => {
    const immutableUploadName = resolveImmutableDesktopPrimaryUploadName({
      uploadName: target.uploadName,
      sourcePath: target.sourcePath,
      version,
    });
    const aliasUploadName =
      immutableUploadName === target.uploadName ? undefined : target.uploadName;
    if (aliasUploadName) {
      postManifestUploadNames.push(aliasUploadName);
    }
    return {
      ...target,
      uploadName: immutableUploadName,
      aliasUploadName,
    };
  });
  const primaryUploadNames = new Set(primary.map((target) => target.uploadName));
  const primaryAliasUploadNames = new Set(
    primary.map((target) => target.aliasUploadName).filter(Boolean) as string[],
  );

  for (const target of primary) {
    requiredUploadNames.push(target.uploadName);
    preManifestUploadNames.push(target.uploadName);
    const updateJsonName = resolveDesktopUpdateJsonUploadName({
      channel: args.channel,
      platform: target.platform,
    });
    const updateJsonTarget = targets.optional.find(
      (entry) => entry.uploadName === updateJsonName,
    );
    if (!updateJsonTarget) {
      throw new Error(
        `Missing ${target.platform} desktop update metadata: ${updateJsonName}`,
      );
    }

    updateMetadata[target.platform] = {
      ...updateJsonTarget,
      platform: target.platform,
    };
    requiredUploadNames.push(updateJsonName);
    preManifestUploadNames.push(updateJsonName);
  }

  const optionalUploadPlan = targets.optional
    .filter(
      (target) =>
        !primaryUploadNames.has(target.uploadName) &&
        !primaryAliasUploadNames.has(target.uploadName),
    )
    .map((target) => {
      if (target.aliasUploadName) {
        postManifestUploadNames.push(target.aliasUploadName);
      }
      return target;
    });

  const channelManifestUploadName = desktopReleaseManifestFileName(args.channel);
  const legacyManifestUploadName = LEGACY_MANIFEST_NAME;
  preManifestUploadNames.push(channelManifestUploadName);
  postManifestUploadNames.push(legacyManifestUploadName);
  requiredUploadNames.push(channelManifestUploadName, legacyManifestUploadName);

  return {
    ...targets,
    primary,
    optional: optionalUploadPlan,
    updateMetadata,
    requiredUploadNames,
    preManifestUploadNames,
    postManifestUploadNames,
    channelManifestUploadName,
    legacyManifestUploadName,
  };
}

export type DesktopTripleConsistencyResult = {
  platform: DesktopReleasePlatform;
  updateJsonUrl: string;
  publishedVersion: string | undefined;
  publishedHash: string | undefined;
  localVersion: string;
  localHash: string;
  manifestVersion: string | undefined;
  versionMatch: boolean;
  hashMatch: boolean;
  manifestVersionMatch: boolean;
};

export async function verifyPublishedTripleConsistency(args: {
  platform: DesktopReleasePlatform;
  publicBase: string;
  updateJsonUploadName: string;
  updateJsonSourcePath: string;
  manifestArtifactVersion?: string;
  fetchFn?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}): Promise<DesktopTripleConsistencyResult> {
  const updateJsonUrl = `${args.publicBase}/${encodeURIComponent(args.updateJsonUploadName)}`;
  const fetcher = args.fetchFn ?? fetch;
  const response = await fetcher(updateJsonUrl, { cache: "no-store" } as RequestInit);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${updateJsonUrl}: ${response.status}`);
  }
  const publishedUpdateJson = (await response.json()) as {
    version?: string;
    hash?: string;
  };
  const localUpdateJson = (await Bun.file(args.updateJsonSourcePath).json()) as {
    version?: string;
    hash?: string;
  };

  const publishedVersion = publishedUpdateJson.version?.trim();
  const publishedHash = publishedUpdateJson.hash?.trim();
  const localVersion = localUpdateJson.version?.trim() ?? "";
  const localHash = localUpdateJson.hash?.trim() ?? "";

  return {
    platform: args.platform,
    updateJsonUrl,
    publishedVersion,
    publishedHash,
    localVersion,
    localHash,
    manifestVersion: args.manifestArtifactVersion?.trim(),
    versionMatch: publishedVersion === localVersion,
    hashMatch: publishedHash === localHash,
    manifestVersionMatch:
      !args.manifestArtifactVersion?.trim() ||
      args.manifestArtifactVersion.trim() === publishedVersion,
  };
}

export function assertTripleConsistency(result: DesktopTripleConsistencyResult) {
  if (!result.localVersion || !result.publishedVersion) {
    throw new Error(
      `${result.platform} update.json version is missing: published ${result.publishedVersion} vs local ${result.localVersion}`,
    );
  }
  if (!result.localHash || !result.publishedHash) {
    throw new Error(
      `${result.platform} update.json hash is missing: published ${result.publishedHash} vs local ${result.localHash}`,
    );
  }
  if (!result.manifestVersion) {
    throw new Error(`${result.platform} manifest version is missing`);
  }
  if (!result.versionMatch) {
    throw new Error(
      `${result.platform} update.json version mismatch: published ${result.publishedVersion} vs local ${result.localVersion}`,
    );
  }
  if (!result.hashMatch) {
    throw new Error(
      `${result.platform} update.json hash mismatch: published ${result.publishedHash} vs local ${result.localHash}`,
    );
  }
  if (!result.manifestVersionMatch) {
    throw new Error(
      `${result.platform} manifest version ${result.manifestVersion} does not match update.json version ${result.publishedVersion}`,
    );
  }
}
