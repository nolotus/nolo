import {
  resolveDesktopManifestChannelFromOrigin,
  type DesktopReleaseManifest,
} from "./desktopReleaseManifest";

const STABLE_CLIENT_DOWNLOAD_URLS = {
  android: "/public/downloads/nolo-latest.apk",
  windows: "/public/downloads/stable-win-x64-NoloDesktop-Setup.exe",
  linux: "/public/downloads/stable-linux-x64-NoloDesktop.tar.zst",
  linuxInstaller: "/public/downloads/nolo-desktop-linux-installer.tar.gz",
  linuxDeb: "/public/downloads/nolo-desktop_amd64.deb",
  linuxRpm: "/public/downloads/nolo-desktop_x86_64.rpm",
  macos: "/public/downloads/stable-macos-arm64-NoloDesktop.dmg",
} as const;

const ALPHA_CLIENT_DOWNLOAD_URLS = {
  android: "/public/downloads/nolo-latest.apk",
  windows: "/public/downloads/canary-win-x64-NoloDesktop-Setup-canary.exe",
  linux: "/public/downloads/canary-linux-x64-NoloDesktop-canary.tar.zst",
  linuxInstaller: "/public/downloads/nolo-desktop-canary-linux-installer.tar.gz",
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
    linuxInstaller: fallback.linuxInstaller,
    linuxDeb: fallback.linuxDeb,
    linuxRpm: fallback.linuxRpm,
    macos: manifestArtifacts?.macos?.url ?? fallback.macos,
  };
};

export type ClientDownloadPlatform = keyof typeof STABLE_CLIENT_DOWNLOAD_URLS;

/**
 * Stable URL for the signed Firefox add-on. The file lives in public/downloads/ and is
 * uploaded by the release pipeline (same mechanism as install-nolo.sh and the CLI
 * tarballs). Keeping a version-stable name means this link never goes stale across
 * connector releases — the file on the server is always the latest signed build.
 */
export const CONNECTOR_DOWNLOAD_URL =
  "/public/downloads/nolo-browser-connector.xpi";

export const CLIENT_DOWNLOAD_META: Record<ClientDownloadPlatform, string> = {
  android: "APK · Android 8+",
  windows: "EXE · x64 · Win 10+",
  linux: "TAR.GZ / TAR.ZST / DEB / RPM · x64",
  linuxInstaller: "TAR.GZ · 自解压安装器 · 支持应用内自动更新",
  linuxDeb: "DEB · Debian/Ubuntu · 由包管理器更新",
  linuxRpm: "RPM · Fedora/RHEL · 由包管理器更新",
  macos: "DMG · Apple Silicon",
};

export const CONNECTOR_DOWNLOAD_META = "XPI · Firefox 140+";
