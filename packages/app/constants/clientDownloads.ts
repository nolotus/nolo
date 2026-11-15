import {
  resolveDesktopManifestChannelFromOrigin,
  type DesktopReleaseManifest,
} from "./desktopReleaseManifest";

/**
 * 无 manifest 时的兜底下载地址。
 *
 * 关键约束（改这里前先读）：这些地址**必须指向内容正确的位置**，因为 manifest
 * 读取失败时用户会直接下到这里的包。历史上它们指向主站 `/public/downloads/*`，
 * 而主站磁盘副本没有任何写入者维护（发布器只写 R2），实测已腐烂成 2026-10-31 的
 * 53MB 旧包（R2 同名文件是 43MB 的 0.236.0），用户会静默拿到旧版本且无从察觉。
 *
 * 但**不能一律改到 R2**：R2 是海外 CDN，国内直连实测约 11 KB/s（见
 * scripts/release/syncOriginDownloads.sh 与 CLI tarball 反向代理的取舍说明）。
 * 所以只有「内容会腐烂、且 manifest 无法覆盖」的项才指向 R2；
 * deb/rpm 在 manifest 里没有对应平台（DesktopReleasePlatform 只有
 * windows/linux/macos），它们**每次请求都走 fallback**，改到 R2 会让所有
 * Linux 用户必然吃到 11 KB/s，因此保持主站地址。
 */
const STABLE_CLIENT_DOWNLOAD_URLS = {
  android: "/public/downloads/nolo-latest.apk",
  windows: "https://downloads.nolo.chat/stable-win-x64-NoloDesktop-Setup.exe",
  linux: "https://downloads.nolo.chat/stable-linux-x64-NoloDesktop.tar.zst",
  // installer 在 R2 上没有对象（实测 404），只能留在主站；主站对它是 302。
  linuxInstaller: "/public/downloads/nolo-desktop-linux-installer.tar.gz",
  // deb/rpm 不在 manifest 覆盖范围内（每次都走本常量），必须走主站以保证国内速度。
  linuxDeb: "/public/downloads/nolo-desktop_amd64.deb",
  linuxRpm: "/public/downloads/nolo-desktop_x86_64.rpm",
  macos: "https://downloads.nolo.chat/stable-macos-arm64-NoloDesktop.dmg",
} as const;

const ALPHA_CLIENT_DOWNLOAD_URLS = {
  android: "/public/downloads/nolo-latest.apk",
  windows: "https://downloads.nolo.chat/canary-win-x64-NoloDesktop-Setup-canary.exe",
  linux: "https://downloads.nolo.chat/canary-linux-x64-NoloDesktop-canary.tar.zst",
  linuxInstaller: "/public/downloads/nolo-desktop-canary-linux-installer.tar.gz",
  linuxDeb: "/public/downloads/nolo-desktop-canary_amd64.deb",
  linuxRpm: "/public/downloads/nolo-desktop-canary_x86_64.rpm",
  macos: "https://downloads.nolo.chat/canary-macos-arm64-NoloDesktop-canary.dmg",
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
