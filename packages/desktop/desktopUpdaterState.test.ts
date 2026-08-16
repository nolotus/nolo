import { describe, expect, it } from "bun:test";
import { createDesktopUpdaterSnapshot, deriveDesktopUpdaterSummary } from "core/desktop/desktopUpdaterState";

const baseInput = {
  desktop: true as const,
  platform: "macos" as const,
  activeOperation: null,
  localInfo: {
    version: "0.1.4",
    hash: "localhash",
    channel: "stable",
    baseUrl: "https://pub.example.test",
  },
  buildConfig: null,
  updateInfo: null,
  latestStatus: null,
  statusHistory: [] as [],
  releaseArtifact: null,
  manifestError: null,
};

describe("desktopUpdaterState", () => {
  it("defaults to not_checked before any updater result exists", () => {
    const summary = deriveDesktopUpdaterSummary(baseInput);
    expect(summary.phase).toBe("not_checked");
    expect(summary.hasChecked).toBe(false);
    expect(summary.primaryAction).toBeNull();
    expect(summary.showToolbarButton).toBe(false);
  });

  it("reports checking while a check is active", () => {
    const summary = deriveDesktopUpdaterSummary({
      ...baseInput,
      activeOperation: "check",
      latestStatus: {
        status: "checking",
        message: "Checking for updates...",
        timestamp: Date.now(),
      },
    });
    expect(summary.phase).toBe("checking");
    expect(summary.tone).toBe("info");
    expect(summary.isBusy).toBe(true);
  });

  it("reports update_available when the remote hash differs", () => {
    const summary = deriveDesktopUpdaterSummary({
      ...baseInput,
      releaseArtifact: {
        platform: "macos",
        url: "https://pub.example.test/stable-macos-arm64-NoloDesktop.dmg",
        size: 123,
        version: "0.1.5",
        buildSha: "buildsha",
        publishedAt: "2026-05-26T00:00:00.000Z",
      },
      updateInfo: {
        version: "0.1.5",
        hash: "remotehash",
        updateAvailable: true,
        updateReady: false,
        error: "",
      },
      latestStatus: {
        status: "update-available",
        message: "Update available",
        timestamp: Date.now(),
      },
    });
    expect(summary.phase).toBe("update_available");
    expect(summary.primaryAction).toBe("download");
    expect(summary.showToolbarButton).toBe(true);
    expect(summary.toolbarTitle).toBe("Download update");
  });

  it("reports ready_to_install when an update is downloaded", () => {
    const summary = deriveDesktopUpdaterSummary({
      ...baseInput,
      releaseArtifact: {
        platform: "macos",
        url: "https://pub.example.test/stable-macos-arm64-NoloDesktop.dmg",
        size: 123,
        version: "0.1.5",
        buildSha: "buildsha",
        publishedAt: "2026-05-26T00:00:00.000Z",
      },
      updateInfo: {
        version: "0.1.5",
        hash: "remotehash",
        updateAvailable: true,
        updateReady: true,
        error: "",
      },
      latestStatus: {
        status: "download-complete",
        message: "Update ready",
        timestamp: Date.now(),
      },
    });
    expect(summary.phase).toBe("ready_to_install");
    expect(summary.primaryAction).toBe("apply");
    expect(summary.toolbarTitle).toBe("Install update");
    expect(summary.tone).toBe("success");
  });

  it("reports up_to_date only after a confirmed no-update result", () => {
    const summary = deriveDesktopUpdaterSummary({
      ...baseInput,
      updateInfo: {
        version: "0.1.4",
        hash: "localhash",
        updateAvailable: false,
        updateReady: false,
        error: "",
      },
      latestStatus: {
        status: "no-update",
        message: "Already on latest version",
        timestamp: Date.now(),
      },
    });
    expect(summary.phase).toBe("up_to_date");
    expect(summary.hasChecked).toBe(true);
    expect(summary.showToolbarButton).toBe(false);
  });

  it("reports invalid_remote when the raw updater offers an older version", () => {
    const summary = deriveDesktopUpdaterSummary({
      ...baseInput,
      localInfo: {
        ...baseInput.localInfo,
        version: "0.1.2",
      },
      updateInfo: {
        version: "0.1.0",
        hash: "remotehash",
        updateAvailable: true,
        updateReady: false,
        error: "",
      },
      latestStatus: {
        status: "update-available",
        message: "Update available",
        timestamp: Date.now(),
      },
    });

    expect(summary.phase).toBe("invalid_remote");
    expect(summary.primaryAction).toBeNull();
    expect(summary.statusMessage).toContain("older than installed version");
  });

  it("includes the derived summary in normalized snapshots", () => {
    const snapshot = createDesktopUpdaterSnapshot({ ...baseInput });
    expect(snapshot.summary.phase).toBe("not_checked");
    expect(snapshot.summary.statusMessage).toBeNull();
  });
});
