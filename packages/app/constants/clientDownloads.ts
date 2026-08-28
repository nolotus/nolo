import {
  resolveDesktopManifestChannelFromOrigin,
  type DesktopReleaseManifest,
} from "./desktopReleaseManifest";

const STABLE_CLIENT_DOWNLOAD_URLS = {
  android: "/public/downloads/nolo-latest.apk",
  windows: "/public/downloads/stable-win-x64-NoloDesktop-Setup.exe",
  linux: "/public/downloads/stable-linux-x64-NoloDesktop.tar.zst",
  linuxDeb: "/public/downloads/nolo-desktop_amd64.deb",
  linuxRpm: "/public/downloads/nolo-desktop_x86_64.rpm",
  macos: "/public/downloads/stable-macos-arm64-NoloDesktop.dmg",
} as const;

const ALPHA_CLIENT_DOWNLOAD_URLS = {
  android: "/public/downloads/nolo-latest.apk",
  windows: "/public/downloads/canary-win-x64-NoloDesktop-Setup-canary.exe",
  linux: "/public/downloads/canary-linux-x64-NoloDesktop-canary.tar.zst",
  linuxDeb: "/public/downloads/nolo-desktop-canary_amd64.deb",
  linuxRpm: "/public/downloads/nolo-desktop-canary_x86_64.rpm",
  macos: "/public/downloads/canary-macos-arm64-NoloDesktop-canary.dmg",
} as const;

const hasHttpOrigin = (value?: string | null): boolean => {
  if (typeof value !== "string") return false;
  return /^https?:\/\//.test(value.trim());
};

export const getClientDownloadChannel = (origin?: string | null) => {
  return resolveDesktopManifestChannelFromOrigin(origin);
};

export const getClientDownloadUrls = (
  origin?: string | null,
  manifest?: DesktopReleaseManifest | null,
) => {
  const channel =
    !hasHttpOrigin(origin) && manifest
      ? manifest.channel
      : getClientDownloadChannel(origin);
  const fallback =
    channel === "alpha" ? ALPHA_CLIENT_DOWNLOAD_URLS : STABLE_CLIENT_DOWNLOAD_URLS;
  const manifestArtifacts = manifest?.channel === channel ? manifest.artifacts : undefined;
  return {
    android: fallback.android,
    windows: manifestArtifacts?.windows?.url ?? fallback.windows,
    linux: manifestArtifacts?.linux?.url ?? fallback.linux,
    linuxDeb: fallback.linuxDeb,
    linuxRpm: fallback.linuxRpm,
    macos: manifestArtifacts?.macos?.url ?? fallback.macos,
  };
};

export type ClientDownloadPlatform = keyof typeof STABLE_CLIENT_DOWNLOAD_URLS;

export const CLIENT_DOWNLOAD_META: Record<ClientDownloadPlatform, string> = {
  android: "APK · Android 8+",
  windows: "EXE · x64 · Win 10+",
  linux: "TAR.ZST / DEB / RPM · x64",
  linuxDeb: "DEB · Debian/Ubuntu",
  linuxRpm: "RPM · Fedora/RHEL",
  macos: "DMG · Apple Silicon",
};
