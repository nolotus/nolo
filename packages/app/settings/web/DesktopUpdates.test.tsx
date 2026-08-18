import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { DesktopUpdaterSnapshot } from "core/desktop/desktopUpdaterState";

type DesktopUpdatesModule = typeof import("./DesktopUpdates");

let moduleVersion = 0;

const loadDesktopUpdates = async () => {
  const actualReactI18Next = await import("react-i18next");
  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (_key: string, fallback?: string) => fallback ?? _key,
    }),
  }));
  mock.module("app/utils/env", () => ({
    getIsDesktopApp: () => true,
    isDesktopApp: true,
  }));
  const module = await import(`./DesktopUpdates.tsx?test=${moduleVersion++}`) as DesktopUpdatesModule;
  mock.restore();
  return module.default;
};

const baseSnapshot: DesktopUpdaterSnapshot = {
  desktop: true,
  platform: "macos",
  activeOperation: null,
  localInfo: {
    version: "0.1.4",
    hash: "localhash123456",
    channel: "stable",
    baseUrl: "https://pub.example.test",
  },
  buildConfig: null,
  updateInfo: null,
  latestStatus: null,
  statusHistory: [],
  releaseArtifact: null,
  manifestError: null,
  assessment: {
    phase: "not_checked",
    code: "not_checked",
    message: null,
    primaryAction: null,
  },
  summary: {
    phase: "not_checked",
    tone: "neutral",
    isBusy: false,
    hasChecked: false,
    primaryAction: null,
    showToolbarButton: false,
    toolbarTitle: null,
    statusMessage: null,
  },
};

describe("DesktopUpdates", () => {
  let dom: JSDOM;
  let root: Root | null;
  let container: HTMLDivElement;
  let previousWindow: typeof globalThis.window | undefined;
  let previousDocument: typeof globalThis.document | undefined;
  let previousNavigator: typeof globalThis.navigator | undefined;
  let previousDesktop: string | undefined;
  let previousFetch: typeof globalThis.fetch | undefined;

  beforeEach(() => {
    dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", {
      url: "http://localhost",
    });
    previousWindow = globalThis.window;
    previousDocument = globalThis.document;
    previousNavigator = globalThis.navigator;
    previousDesktop = process.env.NOLO_DESKTOP;
    previousFetch = globalThis.fetch;
    process.env.NOLO_DESKTOP = "1";
    Object.assign(globalThis, {
      window: dom.window,
      document: dom.window.document,
      navigator: dom.window.navigator,
    });
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    container = dom.window.document.getElementById("root") as HTMLDivElement;
    root = createRoot(container);
  });

  afterEach(() => {
    mock.restore();
    if (root) {
      act(() => {
        root!.unmount();
      });
    }
    Object.assign(globalThis, {
      window: previousWindow,
      document: previousDocument,
      navigator: previousNavigator,
    });
    if (previousDesktop === undefined) {
      delete process.env.NOLO_DESKTOP;
    } else {
      process.env.NOLO_DESKTOP = previousDesktop;
    }
    if (previousFetch === undefined) {
      (globalThis as any).fetch = undefined;
    } else {
      globalThis.fetch = previousFetch;
    }
  });

  async function renderWithSnapshot(snapshot: DesktopUpdaterSnapshot) {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(snapshot), {
        status: 200,
        headers: { "content-type": "application/json" },
      })) as unknown as typeof fetch;

    const DesktopUpdates = await loadDesktopUpdates();
    await act(async () => {
      root!.render(<DesktopUpdates />);
    });
    await act(async () => {
      await Promise.resolve();
    });
  }

  it("shows a failure badge instead of latest when updater metadata fetch failed", async () => {
    await renderWithSnapshot({
      ...baseSnapshot,
      updateInfo: {
        updateAvailable: false,
        updateReady: false,
        error:
          "Failed to fetch update info from https://nolo.chat/public/downloads/stable-win-x64-update.json",
      },
      latestStatus: {
        status: "error",
        message: "Failed to fetch update info (HTTP 502)",
        timestamp: Date.now(),
      },
      summary: {
        ...baseSnapshot.summary,
        phase: "error",
        tone: "error",
        hasChecked: true,
        statusMessage:
          "Failed to fetch update info from https://nolo.chat/public/downloads/stable-win-x64-update.json",
      },
    });

    expect(container.textContent).toContain("Check failed");
    expect(container.textContent).toContain(
      "Failed to fetch update info from https://nolo.chat/public/downloads/stable-win-x64-update.json"
    );
    expect(container.textContent).not.toContain("Up to date");
  });

  it("renders not-checked instead of latest before any updater result exists", async () => {
    await renderWithSnapshot(baseSnapshot);

    expect(container.textContent).toContain("Not checked yet");
    expect(container.textContent).toContain("No update available right now");
    expect(container.textContent).not.toContain("Up to date");
  });

  it("renders checking while the updater summary is in checking state", async () => {
    await renderWithSnapshot({
      ...baseSnapshot,
      activeOperation: "check",
      latestStatus: {
        status: "checking",
        message: "Checking for updates...",
        timestamp: Date.now(),
      },
      statusHistory: [
        {
          status: "checking",
          message: "Checking for updates...",
          timestamp: Date.now(),
        },
      ],
      summary: {
        ...baseSnapshot.summary,
        phase: "checking",
        tone: "info",
        isBusy: true,
        hasChecked: true,
        statusMessage: "Checking for updates...",
      },
    });

    expect(container.textContent).toContain("Checking");
    expect(container.textContent).toContain("Checking for updates...");
    expect(container.textContent).not.toContain("Up to date");
  });

  it("renders latest only after a confirmed up-to-date summary", async () => {
    await renderWithSnapshot({
      ...baseSnapshot,
      updateInfo: {
        version: "0.1.4",
        hash: "localhash123456",
        updateAvailable: false,
        updateReady: false,
        error: "",
      },
      latestStatus: {
        status: "no-update",
        message: "Already on latest version",
        timestamp: Date.now(),
      },
      statusHistory: [
        {
          status: "no-update",
          message: "Already on latest version",
          timestamp: Date.now(),
        },
      ],
      summary: {
        ...baseSnapshot.summary,
        phase: "up_to_date",
        hasChecked: true,
        statusMessage: "Already on latest version",
      },
    });

    expect(container.textContent).toContain("Up to date");
    expect(container.textContent).toContain("Already on latest version");
  });

  it("renders invalid remote metadata as a blocked state with no primary action", async () => {
    await renderWithSnapshot({
      ...baseSnapshot,
      localInfo: {
        ...baseSnapshot.localInfo,
        version: "0.1.2",
      },
      updateInfo: {
        version: "0.1.0",
        hash: "remotehash123456",
        updateAvailable: true,
        updateReady: false,
        error: "",
      },
      latestStatus: {
        status: "update-available",
        message: "Update available",
        timestamp: Date.now(),
      },
      statusHistory: [
        {
          status: "update-available",
          message: "Update available",
          timestamp: Date.now(),
        },
      ],
      assessment: {
        phase: "invalid_remote",
        code: "remote_downgrade",
        message:
          "Blocked remote desktop update for macos: remote version 0.1.0 is older than installed version 0.1.2.",
        primaryAction: null,
      },
      summary: {
        ...baseSnapshot.summary,
        phase: "invalid_remote",
        tone: "error",
        hasChecked: true,
        statusMessage:
          "Blocked remote desktop update for macos: remote version 0.1.0 is older than installed version 0.1.2.",
      },
    });

    expect(container.textContent).toContain("Remote metadata is invalid");
    expect(container.textContent).toContain("older than installed version");
    expect(container.textContent).toContain("No update available right now");
  });
});
