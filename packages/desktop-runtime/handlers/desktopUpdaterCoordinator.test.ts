import { describe, expect, it } from "bun:test";
import {
  createDesktopUpdaterCoordinator,
  mapElectrobunChannelToManifestChannel,
  resolveDesktopManifestUrl,
  type DesktopUpdaterRuntime,
} from "./desktopUpdaterCoordinator";

const makeRuntime = (overrides?: {
  updateInfo?: Record<string, unknown> | null;
  statusHistory?: Array<{ status: string; message: string; timestamp: number }>;
  downloadUpdate?: () => Promise<void>;
  channel?: string;
  baseUrl?: string;
}): DesktopUpdaterRuntime => ({
  BuildConfig: {
    get: async () => null,
  },
  Updater: {
    localInfo: {
      version: async () => "0.1.11",
      hash: async () => "local-hash",
      channel: async () => overrides?.channel ?? "stable",
      baseUrl: async () =>
        overrides?.baseUrl ?? "https://pub.example.test/downloads",
    },
    updateInfo: () =>
      overrides?.updateInfo ?? {
        version: "0.1.12",
        hash: "remote-hash",
        updateAvailable: true,
      },
    getStatusHistory: () =>
      overrides?.statusHistory ?? [
        {
          status: "update-available",
          message: "Update available",
          timestamp: 1,
        },
      ],
    clearStatusHistory: () => {},
    checkForUpdate: async () => {},
    downloadUpdate: overrides?.downloadUpdate ?? (async () => {}),
    applyUpdate: async () => {},
  },
});

describe("desktopUpdaterCoordinator", () => {
  it("maps electrobun canary channel onto the alpha manifest channel", () => {
    expect(mapElectrobunChannelToManifestChannel("canary")).toBe("alpha");
    expect(mapElectrobunChannelToManifestChannel("stable")).toBe("stable");
    expect(resolveDesktopManifestUrl("https://us.nolo.chat/public/downloads")).toBe(
      "https://us.nolo.chat/public/downloads/desktop-release-manifest.alpha.json",
    );
    expect(resolveDesktopManifestUrl("https://nolo.chat/public/downloads", "stable")).toBe(
      "https://nolo.chat/public/downloads/desktop-release-manifest.stable.json",
    );
  });

  it("builds manifest-backed snapshots without depending on the HTTP handler", async () => {
    const requestedUrls: string[] = [];
    const coordinator = createDesktopUpdaterCoordinator({
      loadDesktopRuntime: async () => makeRuntime(),
      resolvePlatform: () => "macos",
      fetchFn: async (input) => {
        requestedUrls.push(String(input));
        return Response.json({
          schemaVersion: 1,
          channel: "stable",
          updatedAt: "2026-06-04T00:00:00.000Z",
          artifacts: {
            macos: {
              url: "https://pub.example.test/downloads/stable-macos-arm64-NoloDesktop.dmg",
              size: 123,
              version: "0.1.12",
              buildSha: "build-sha",
              publishedAt: "2026-06-04T00:00:00.000Z",
            },
          },
        });
      },
    });

    const snapshot = await coordinator.getSnapshot();

    expect(snapshot.localInfo.version).toBe("0.1.11");
    expect(snapshot.releaseArtifact?.version).toBe("0.1.12");
    expect(snapshot.summary.phase).toBe("update_available");
    expect(snapshot.summary.primaryAction).toBe("download");
    expect(requestedUrls[0]).toContain("desktop-release-manifest.stable.json");
  });

  it("falls back to the legacy manifest when the per-channel file is missing", async () => {
    const requestedUrls: string[] = [];
    const coordinator = createDesktopUpdaterCoordinator({
      loadDesktopRuntime: async () =>
        makeRuntime({
          channel: "canary",
          baseUrl: "https://us.nolo.chat/public/downloads",
        }),
      resolvePlatform: () => "windows",
      fetchFn: async (input) => {
        const url = String(input);
        requestedUrls.push(url);
        if (url.includes("desktop-release-manifest.alpha.json")) {
          return new Response("missing", { status: 404 });
        }
        return Response.json({
          schemaVersion: 1,
          channel: "alpha",
          updatedAt: "2026-06-04T00:00:00.000Z",
          artifacts: {
            windows: {
              url: "https://us.nolo.chat/public/downloads/canary-win-x64-NoloDesktop-Setup-canary.exe",
              size: 123,
              version: "0.1.12",
              publishedAt: "2026-06-04T00:00:00.000Z",
            },
          },
        });
      },
    });

    const snapshot = await coordinator.getSnapshot();

    expect(requestedUrls).toEqual([
      "https://us.nolo.chat/public/downloads/desktop-release-manifest.alpha.json",
      "https://us.nolo.chat/public/downloads/desktop-release-manifest.json",
    ]);
    expect(snapshot.releaseArtifact?.version).toBe("0.1.12");
  });

  it("rejects a legacy manifest whose channel does not match the expected channel", async () => {
    const requestedUrls: string[] = [];
    const coordinator = createDesktopUpdaterCoordinator({
      loadDesktopRuntime: async () =>
        makeRuntime({
          channel: "canary",
          baseUrl: "https://us.nolo.chat/public/downloads",
        }),
      resolvePlatform: () => "windows",
      fetchFn: async (input) => {
        const url = String(input);
        requestedUrls.push(url);
        if (url.includes("desktop-release-manifest.alpha.json")) {
          return new Response("missing", { status: 404 });
        }
        return Response.json({
          schemaVersion: 1,
          channel: "stable",
          updatedAt: "2026-06-04T00:00:00.000Z",
          artifacts: {
            windows: {
              url: "https://nolo.chat/public/downloads/stable-win-x64-NoloDesktop-Setup.exe",
              size: 123,
              version: "0.9.9",
              publishedAt: "2026-06-04T00:00:00.000Z",
            },
          },
        });
      },
    });

    const snapshot = await coordinator.getSnapshot();

    expect(requestedUrls).toEqual([
      "https://us.nolo.chat/public/downloads/desktop-release-manifest.alpha.json",
      "https://us.nolo.chat/public/downloads/desktop-release-manifest.json",
    ]);
    expect(snapshot.releaseArtifact).toBeNull();
    expect(snapshot.manifestError).toContain(
      "manifest channel stable !== expected alpha",
    );
  });

  it("rejects concurrent updater operations while a previous operation is active", async () => {
    let finishDownload!: () => void;
    const downloadStarted = Promise.withResolvers<void>();
    const downloadFinished = new Promise<void>((resolve) => {
      finishDownload = resolve;
    });
    const coordinator = createDesktopUpdaterCoordinator({
      loadDesktopRuntime: async () =>
        makeRuntime({
          downloadUpdate: async () => {
            downloadStarted.resolve();
            await downloadFinished;
          },
        }),
      resolvePlatform: () => "macos",
      fetchFn: async () =>
        Response.json({
          schemaVersion: 1,
          channel: "stable",
          updatedAt: "2026-06-04T00:00:00.000Z",
          artifacts: {
            macos: {
              url: "https://pub.example.test/downloads/stable-macos-arm64-NoloDesktop.dmg",
              size: 123,
              version: "0.1.12",
              publishedAt: "2026-06-04T00:00:00.000Z",
            },
          },
        }),
      onOperationError: () => {},
    });

    const first = await coordinator.runAction("download");
    await downloadStarted.promise;
    const second = await coordinator.runAction("check");
    finishDownload();

    expect(first.status).toBe(202);
    expect(second.status).toBe(409);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.error).toBe("Desktop updater is already busy with download.");
    }
  });
});
