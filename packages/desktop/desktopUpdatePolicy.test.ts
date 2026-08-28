import { describe, expect, it } from "bun:test";
import type { DesktopReleasePlatform } from "../app/constants/desktopReleaseManifest";
import {
  assessDesktopUpdateCandidate,
  compareDesktopVersions,
  type DesktopUpdaterReleaseArtifact,
} from "../core/desktop/desktopUpdatePolicy";

const localInfo = {
  version: "0.1.2",
  hash: "localhash",
  channel: "stable",
  baseUrl: "https://pub.example.test",
};

const macArtifact = (
  overrides: Partial<DesktopUpdaterReleaseArtifact> = {},
): DesktopUpdaterReleaseArtifact => ({
  platform: "macos",
  url: "https://pub.example.test/stable-macos-arm64-NoloDesktop.dmg",
  size: 123,
  version: "0.1.6",
  buildSha: "buildsha",
  publishedAt: "2026-05-26T00:00:00.000Z",
  ...overrides,
});

describe("compareDesktopVersions", () => {
  it("orders dot-delimited desktop versions numerically", () => {
    expect(compareDesktopVersions("0.1.6", "0.1.5")).toBeGreaterThan(0);
    expect(compareDesktopVersions("0.1.5", "0.1.5")).toBe(0);
    expect(compareDesktopVersions("0.1.4", "0.1.5")).toBeLessThan(0);
    expect(compareDesktopVersions("0.10.0", "0.2.9")).toBeGreaterThan(0);
  });

  it("handles alpha and pre-release semver tags correctly", () => {
    expect(compareDesktopVersions("0.9.0-alpha.6", "0.1.10")).toBeGreaterThan(0);
    expect(compareDesktopVersions("0.9.0-alpha.6", "0.9.0-alpha.7")).toBeLessThan(0);
    expect(compareDesktopVersions("0.9.0-alpha.6", "0.9.0-alpha.6")).toBe(0);
    expect(compareDesktopVersions("0.9.0", "0.9.0-alpha.6")).toBeGreaterThan(0);
    expect(compareDesktopVersions("0.9.0-alpha.6", "0.9.0")).toBeLessThan(0);
  });

  it("returns null for malformed versions instead of guessing", () => {
    expect(compareDesktopVersions("stable", "0.1.5")).toBeNull();
    expect(compareDesktopVersions("0.1", "0.1.5")).toBeNull();
  });
});

describe("assessDesktopUpdateCandidate", () => {
  it("blocks downgrade candidates even when the raw updater reports an update", () => {
    const result = assessDesktopUpdateCandidate({
      platform: "macos",
      localInfo,
      updateInfo: {
        version: "0.1.0",
        hash: "remotehash",
        updateAvailable: true,
        updateReady: false,
        error: "",
      },
      releaseArtifact: null,
      manifestError: null,
    });

    expect(result.phase).toBe("invalid_remote");
    expect(result.code).toBe("remote_downgrade");
    expect(result.primaryAction).toBeNull();
  });

  it("blocks same-version different-hash republishes and requires a version bump", () => {
    const result = assessDesktopUpdateCandidate({
      platform: "windows",
      localInfo: { ...localInfo, version: "0.1.5" },
      updateInfo: {
        version: "0.1.5",
        hash: "newhash",
        updateAvailable: true,
        updateReady: false,
        error: "",
      },
      releaseArtifact: {
        ...macArtifact({
          platform: "windows" as DesktopReleasePlatform,
          version: "0.1.5",
        }),
      },
      manifestError: null,
    });

    expect(result.phase).toBe("invalid_remote");
    expect(result.code).toBe("same_version_republish");
    expect(result.message).toContain("Bump the desktop version");
  });

  it("blocks downloads when the manifest is unavailable for a newer candidate", () => {
    const result = assessDesktopUpdateCandidate({
      platform: "macos",
      localInfo,
      updateInfo: {
        version: "0.1.6",
        hash: "remotehash",
        updateAvailable: true,
        updateReady: false,
        error: "",
      },
      releaseArtifact: null,
      manifestError: "network timeout",
    });

    expect(result.phase).toBe("invalid_remote");
    expect(result.code).toBe("manifest_unavailable");
    expect(result.primaryAction).toBeNull();
  });

  it("blocks downloads when manifest and update metadata disagree on version", () => {
    const result = assessDesktopUpdateCandidate({
      platform: "macos",
      localInfo,
      updateInfo: {
        version: "0.1.6",
        hash: "remotehash",
        updateAvailable: true,
        updateReady: false,
        error: "",
      },
      releaseArtifact: macArtifact({ version: "0.1.5" }),
      manifestError: null,
    });

    expect(result.phase).toBe("invalid_remote");
    expect(result.code).toBe("manifest_version_mismatch");
  });

  it("allows downloading only when the manifest confirms the newer version", () => {
    const result = assessDesktopUpdateCandidate({
      platform: "macos",
      localInfo,
      updateInfo: {
        version: "0.1.6",
        hash: "remotehash",
        updateAvailable: true,
        updateReady: false,
        error: "",
      },
      releaseArtifact: macArtifact({ version: "0.1.6" }),
      manifestError: null,
    });

    expect(result.phase).toBe("update_available");
    expect(result.code).toBe("update_available");
    expect(result.primaryAction).toBe("download");
  });

  it("allows applying an already-downloaded newer version without live manifest access", () => {
    const result = assessDesktopUpdateCandidate({
      platform: "macos",
      localInfo,
      updateInfo: {
        version: "0.1.6",
        hash: "remotehash",
        updateAvailable: true,
        updateReady: true,
        error: "",
      },
      releaseArtifact: null,
      manifestError: "offline",
    });

    expect(result.phase).toBe("ready_to_install");
    expect(result.code).toBe("ready_to_install");
    expect(result.primaryAction).toBe("apply");
  });
});
