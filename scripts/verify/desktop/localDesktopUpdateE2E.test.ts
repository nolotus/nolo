import { describe, expect, it } from "bun:test";
import {
  parseLocalDesktopUpdateE2EArgs,
  resolveDesktopUpdateE2EOutcome,
  resolveDesktopAppProcessPatterns,
  resolveOldAppLauncherPath,
} from "./localDesktopUpdateE2E";

describe("localDesktopUpdateE2E", () => {
  it("parses required paths and defaults to the local feed/updater ports", () => {
    const args = parseLocalDesktopUpdateE2EArgs([
      "--old-app",
      "/tmp/Nolo Desktop.app",
      "--feed-dir",
      "/tmp/feed",
      "--expected-version",
      "0.1.12",
    ]);

    expect(args).toEqual({
      oldApp: "/tmp/Nolo Desktop.app",
      feedDir: "/tmp/feed",
      expectedVersion: "0.1.12",
      feedPort: 49275,
      desktopPortBase: 3233,
      timeoutMs: 180000,
      skipApply: false,
      keepCache: false,
    });
  });

  it("requires an old app, feed directory, and expected version", () => {
    expect(() => parseLocalDesktopUpdateE2EArgs([])).toThrow("--old-app is required");
    expect(() =>
      parseLocalDesktopUpdateE2EArgs(["--old-app", "/tmp/Nolo Desktop.app"]),
    ).toThrow("--feed-dir is required");
    expect(() =>
      parseLocalDesktopUpdateE2EArgs([
        "--old-app",
        "/tmp/Nolo Desktop.app",
        "--feed-dir",
        "/tmp/feed",
      ]),
    ).toThrow("--expected-version is required");
  });

  it("resolves the real Electrobun launcher inside an app bundle", () => {
    expect(resolveOldAppLauncherPath("/tmp/Nolo Desktop.app")).toBe(
      "/tmp/Nolo Desktop.app/Contents/MacOS/launcher",
    );
    expect(resolveOldAppLauncherPath("/tmp/Nolo Desktop.app/Contents/MacOS/launcher")).toBe(
      "/tmp/Nolo Desktop.app/Contents/MacOS/launcher",
    );
  });

  it("builds process cleanup patterns for the original and real app bundle paths", () => {
    expect(
      resolveDesktopAppProcessPatterns({
        oldApp: "/tmp/nolo-desktop-old-build-fresh/Nolo Desktop.app",
        realApp: "/private/tmp/nolo-desktop-old-build-fresh/Nolo Desktop.app",
      }),
    ).toEqual([
      "/tmp/nolo-desktop-old-build-fresh/Nolo Desktop\\.app",
      "/private/tmp/nolo-desktop-old-build-fresh/Nolo Desktop\\.app",
    ]);
  });

  it("maps updater snapshots to the next E2E action", () => {
    expect(
      resolveDesktopUpdateE2EOutcome({
        expectedVersion: "0.1.12",
        snapshot: {
          localInfo: { version: "0.1.11" },
          summary: { phase: "update_available", primaryAction: "download" },
        },
      }),
    ).toBe("download");

    expect(
      resolveDesktopUpdateE2EOutcome({
        expectedVersion: "0.1.12",
        snapshot: {
          localInfo: { version: "0.1.11" },
          summary: { phase: "ready_to_install", primaryAction: "apply" },
        },
      }),
    ).toBe("apply");

    expect(
      resolveDesktopUpdateE2EOutcome({
        expectedVersion: "0.1.12",
        snapshot: {
          localInfo: { version: "0.1.12" },
          summary: { phase: "up_to_date", primaryAction: null },
        },
      }),
    ).toBe("updated");
  });

  it("treats invalid remote and updater errors as failed states", () => {
    expect(
      resolveDesktopUpdateE2EOutcome({
        expectedVersion: "0.1.12",
        snapshot: {
          localInfo: { version: "0.1.11" },
          summary: { phase: "invalid_remote", primaryAction: null },
        },
      }),
    ).toBe("failed");
    expect(
      resolveDesktopUpdateE2EOutcome({
        expectedVersion: "0.1.12",
        snapshot: {
          localInfo: { version: "0.1.11" },
          summary: { phase: "error", primaryAction: null },
        },
      }),
    ).toBe("failed");
  });
});
