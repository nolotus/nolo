import { join, resolve, win32 } from "node:path";

export type DesktopReleaseChannel = "alpha" | "stable";
export type DesktopArtifactKind =
  | "installer"
  | "payload"
  | "archive"
  | "updateJson"
  | `explicit-${number}`;

export interface DesktopArtifactSource {
  kind: DesktopArtifactKind;
  sourcePath: string;
  uploadName: string;
}

type ChannelArtifactConfig = {
  buildDir: string;
  artifactsDir: string;
  artifacts: Array<{
    kind: DesktopArtifactKind;
    sourceRelativePath: string;
    uploadName: string;
  }>;
};

const CHANNEL_ARTIFACTS: Record<DesktopReleaseChannel, ChannelArtifactConfig> = {
  alpha: {
    buildDir: join("packages", "desktop", "build", "canary-win-x64"),
    artifactsDir: join("packages", "desktop", "artifacts"),
    artifacts: [
      {
        kind: "installer",
        sourceRelativePath: join(
          "packages",
          "desktop",
          "build",
          "canary-win-x64",
          "Nolo Desktop-Setup-canary.exe",
        ),
        uploadName: "canary-win-x64-NoloDesktop-Setup-canary.exe",
      },
      {
        kind: "payload",
        sourceRelativePath: join(
          "packages",
          "desktop",
          "build",
          "canary-win-x64",
          "Nolo Desktop-Setup-canary.tar.zst",
        ),
        uploadName: "canary-win-x64-NoloDesktop-canary.tar.zst",
      },
      {
        kind: "archive",
        sourceRelativePath: join(
          "packages",
          "desktop",
          "artifacts",
          "canary-win-x64-NoloDesktop-Setup-canary.zip",
        ),
        uploadName: "canary-win-x64-NoloDesktop-Setup-canary.zip",
      },
      {
        kind: "updateJson",
        sourceRelativePath: join(
          "packages",
          "desktop",
          "artifacts",
          "canary-win-x64-update.json",
        ),
        uploadName: "canary-win-x64-update.json",
      },
    ],
  },
  stable: {
    buildDir: join("packages", "desktop", "build", "stable-win-x64"),
    artifactsDir: join("packages", "desktop", "artifacts"),
    artifacts: [
      {
        kind: "installer",
        sourceRelativePath: join(
          "packages",
          "desktop",
          "build",
          "stable-win-x64",
          "Nolo Desktop-Setup.exe",
        ),
        uploadName: "stable-win-x64-NoloDesktop-Setup.exe",
      },
      {
        kind: "archive",
        sourceRelativePath: join(
          "packages",
          "desktop",
          "artifacts",
          "stable-win-x64-NoloDesktop-Setup.zip",
        ),
        uploadName: "stable-win-x64-NoloDesktop-Setup.zip",
      },
      {
        kind: "updateJson",
        sourceRelativePath: join(
          "packages",
          "desktop",
          "artifacts",
          "stable-win-x64-update.json",
        ),
        uploadName: "stable-win-x64-update.json",
      },
    ],
  },
};

export function isDesktopReleaseChannel(
  value: string | undefined,
): value is DesktopReleaseChannel {
  return value === "alpha" || value === "stable";
}

export function getDefaultDesktopArtifactSources(args: {
  repoRoot: string;
  channel: DesktopReleaseChannel;
}): DesktopArtifactSource[] {
  const { repoRoot, channel } = args;
  const config = CHANNEL_ARTIFACTS[channel];
  const resolvePath = /^[A-Za-z]:[\\/]/.test(repoRoot)
    ? (...parts: string[]) => win32.resolve(...parts)
    : (...parts: string[]) => resolve(...parts);
  return config.artifacts.map((artifact) => ({
    kind: artifact.kind,
    sourcePath: resolvePath(repoRoot, artifact.sourceRelativePath),
    uploadName: artifact.uploadName,
  }));
}

export function getDefaultDesktopSpaceName(args: {
  channel: DesktopReleaseChannel;
  buildSha?: string;
  spaceId?: string;
}) {
  const prefix = args.channel === "alpha" ? "Alpha Desktop" : "Stable Desktop";
  const parts = [prefix];
  if (args.buildSha) parts.push(args.buildSha);
  if (args.spaceId) parts.push(args.spaceId);
  return parts.join(" ");
}

export function guessDesktopArtifactMimeType(fileName: string) {
  const normalized = fileName.trim().toLowerCase();
  if (normalized.endsWith(".exe")) {
    return "application/vnd.microsoft.portable-executable";
  }
  if (normalized.endsWith(".zip")) return "application/zip";
  if (normalized.endsWith(".json")) return "application/json";
  if (normalized.endsWith(".tar.zst")) return "application/zstd";
  return "application/octet-stream";
}

export function extractCompoundExtension(fileName: string) {
  const normalized = fileName.trim();
  const firstDot = normalized.indexOf(".");
  if (firstDot === -1) return "";
  return normalized.slice(firstDot);
}
