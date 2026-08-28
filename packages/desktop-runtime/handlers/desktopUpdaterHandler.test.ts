import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";

type DesktopUpdaterHandlerModule = typeof import("./desktopUpdaterHandler");

let moduleVersion = 0;

const loadHandler = async (options: {
  localVersion: string;
  localHash: string;
  updateInfo: {
    version?: string;
    hash?: string;
    updateAvailable?: boolean;
    updateReady?: boolean;
    error?: string;
  } | null;
  latestStatus?: { status: string; message: string; timestamp: number } | null;
}) => {
  mock.module("electrobun/bun", () => ({
    BuildConfig: {
      get: async () => null,
    },
    Updater: {
      localInfo: {
        version: async () => options.localVersion,
        hash: async () => options.localHash,
        channel: async () => "stable",
        baseUrl: async () => "https://pub.example.test",
      },
      updateInfo: () => options.updateInfo,
      getStatusHistory: () => (options.latestStatus ? [options.latestStatus] : []),
      clearStatusHistory: () => {},
      checkForUpdate: async () => {},
      downloadUpdate: async () => {},
      applyUpdate: async () => {},
    },
  }));

  const module = (await import(
    `./desktopUpdaterHandler.ts?test=${moduleVersion++}`
  )) as DesktopUpdaterHandlerModule;
  mock.restore();
  return module;
};

describe("desktopUpdaterHandler", () => {
  const previousDesktop = process.env.NOLO_DESKTOP;
  const previousFetch = globalThis.fetch;

  beforeEach(() => {
    process.env.NOLO_DESKTOP = "1";
  });

  afterEach(() => {
    mock.restore();
    if (previousDesktop === undefined) {
      delete process.env.NOLO_DESKTOP;
    } else {
      process.env.NOLO_DESKTOP = previousDesktop;
    }
    if (previousFetch === undefined) {
      // Restore default fetch by deleting the test override when possible.
      Reflect.deleteProperty(globalThis, "fetch");
    } else {
      globalThis.fetch = previousFetch;
    }
  });

  it("returns invalid_remote when a raw update candidate is older than the installed desktop", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          schemaVersion: 1,
          channel: "stable",
          updatedAt: "2026-05-26T00:00:00.000Z",
          artifacts: {
            macos: {
              url: "https://pub.example.test/stable-macos-arm64-NoloDesktop.dmg",
              size: 123,
              version: "0.1.6",
              buildSha: "buildsha",
              publishedAt: "2026-05-26T00:00:00.000Z",
            },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )) as unknown as typeof fetch;

    const handler = await loadHandler({
      localVersion: "0.1.2",
      localHash: "localhash",
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

    const response = await handler.handleDesktopUpdaterGet();
    const snapshot = (await response.json()) as {
      summary: { phase: string; primaryAction: string | null };
      assessment: { code: string };
    };
    expect(response.status).toBe(200);
    expect(snapshot.summary.phase).toBe("invalid_remote");
    expect(snapshot.summary.primaryAction).toBeNull();
    expect(snapshot.assessment.code).toBe("remote_downgrade");
  });

  it("rejects download actions when the shared policy blocks the candidate", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          schemaVersion: 1,
          channel: "stable",
          updatedAt: "2026-05-26T00:00:00.000Z",
          artifacts: {
            macos: {
              url: "https://pub.example.test/stable-macos-arm64-NoloDesktop.dmg",
              size: 123,
              version: "0.1.6",
              buildSha: "buildsha",
              publishedAt: "2026-05-26T00:00:00.000Z",
            },
          },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        }
      )) as unknown as typeof fetch;

    const handler = await loadHandler({
      localVersion: "0.1.2",
      localHash: "localhash",
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

    const response = await handler.handleDesktopUpdaterPost(
      new Request("http://desktop.test/api/desktop-updater", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "download" }),
      })
    );
    const payload = (await response.json()) as { error?: string };
    expect(response.status).toBe(409);
    expect(payload.error).toContain("older than installed version");
  });
});
