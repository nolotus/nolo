import { describe, expect, it } from "bun:test";
import {
  CLIENT_DOWNLOAD_META,
  getClientDownloadChannel,
  getClientDownloadUrls,
} from "./clientDownloads";
import type { DesktopReleaseManifest } from "./desktopReleaseManifest";

describe("clientDownloads", () => {
  it("returns stable desktop download urls by default", () => {
    expect(getClientDownloadUrls()).toEqual({
      android: "/public/downloads/nolo-latest.apk",
      windows: "/public/downloads/stable-win-x64-NoloDesktop-Setup.exe",
      linux: "/public/downloads/stable-linux-x64-NoloDesktop.tar.zst",
      linuxDeb: "/public/downloads/nolo-desktop_amd64.deb",
      linuxRpm: "/public/downloads/nolo-desktop_x86_64.rpm",
      macos: "/public/downloads/stable-macos-arm64-NoloDesktop.dmg",
    });
  });

  it("resolves download channel from origin host", () => {
    expect(getClientDownloadChannel("https://us.nolo.chat")).toBe("alpha");
    expect(getClientDownloadChannel("https://us.nolo.chat/")).toBe("alpha");
    expect(getClientDownloadChannel("https://nolo.chat")).toBe("stable");
    expect(getClientDownloadChannel(undefined)).toBe("stable");
  });

  it("keeps stable Windows fallback pointed at the canonical installer name", () => {
    const urls = getClientDownloadUrls();
    expect(urls.windows).toBe("/public/downloads/stable-win-x64-NoloDesktop-Setup.exe");
    expect(urls.windows).not.toContain("0.1.1");
    expect(CLIENT_DOWNLOAD_META.windows).not.toContain("v0.1.1");
  });
  it("switches the desktop downloads page to canary artifacts on alpha", () => {
    expect(getClientDownloadUrls("https://us.nolo.chat/")).toEqual({
      android: "/public/downloads/nolo-latest.apk",
      windows: "/public/downloads/canary-win-x64-NoloDesktop-Setup-canary.exe",
      linux: "/public/downloads/canary-linux-x64-NoloDesktop-canary.tar.zst",
      linuxDeb: "/public/downloads/nolo-desktop-canary_amd64.deb",
      linuxRpm: "/public/downloads/nolo-desktop-canary_x86_64.rpm",
      macos: "/public/downloads/canary-macos-arm64-NoloDesktop-canary.dmg",
    });
  });

  it("uses a channel-matched desktop release manifest before fallback urls", () => {
    const manifest: DesktopReleaseManifest = {
      schemaVersion: 1,
      channel: "alpha",
      updatedAt: "2026-05-15T00:00:00.000Z",
      artifacts: {
        windows: {
          url: "/public/downloads/manifest-win.exe",
          size: 60000000,
          sha256: "abc",
        },
        macos: {
          url: "/public/downloads/manifest-mac.dmg",
          size: 100000000,
        },
      },
    };

    expect(getClientDownloadUrls("https://us.nolo.chat", manifest)).toMatchObject({
      windows: "/public/downloads/manifest-win.exe",
      macos: "/public/downloads/manifest-mac.dmg",
      linux: "/public/downloads/canary-linux-x64-NoloDesktop-canary.tar.zst",
    });
  });

  it("lets the manifest choose the channel during SSR when origin is unavailable", () => {
    const manifest: DesktopReleaseManifest = {
      schemaVersion: 1,
      channel: "alpha",
      updatedAt: "2026-05-15T00:00:00.000Z",
      artifacts: {
        windows: {
          url: "/public/downloads/ssr-alpha-win.exe",
          size: 60000000,
        },
      },
    };

    expect(getClientDownloadUrls(undefined, manifest).windows).toBe(
      "/public/downloads/ssr-alpha-win.exe",
    );
  });

  it("still lets the browser origin reject a wrong-channel manifest after hydrate", () => {
    const manifest: DesktopReleaseManifest = {
      schemaVersion: 1,
      channel: "stable",
      updatedAt: "2026-05-15T00:00:00.000Z",
      artifacts: {
        windows: {
          url: "/public/downloads/stable-from-manifest.exe",
          size: 60000000,
        },
      },
    };

    expect(getClientDownloadUrls("https://us.nolo.chat", manifest).windows).toBe(
      "/public/downloads/canary-win-x64-NoloDesktop-Setup-canary.exe",
    );
  });

  it("ignores a manifest for a different channel", () => {
    const manifest: DesktopReleaseManifest = {
      schemaVersion: 1,
      channel: "stable",
      updatedAt: "2026-05-15T00:00:00.000Z",
      artifacts: {
        windows: {
          url: "/public/downloads/stable-from-manifest.exe",
          size: 60000000,
        },
      },
    };

    expect(getClientDownloadUrls("https://us.nolo.chat", manifest).windows).toBe(
      "/public/downloads/canary-win-x64-NoloDesktop-Setup-canary.exe",
    );
  });
});
