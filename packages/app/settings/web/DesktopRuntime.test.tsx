import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { JSDOM } from "jsdom";
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";

type DesktopRuntimeModule = typeof import("./DesktopRuntime");

let moduleVersion = 0;
let mockedChromeConnectorEnabled = false;
let dispatchedSettingsChanges: unknown[] = [];

const loadDesktopRuntime = async () => {
  const actualReactI18Next = await import("react-i18next");
  mock.module("react-i18next", () => ({
    ...actualReactI18Next,
    useTranslation: () => ({
      t: (_key: string, fallback?: string) => fallback ?? _key,
    }),
  }));
  mock.module("app/store", () => ({
    useAppDispatch: () => (action: unknown) => {
      dispatchedSettingsChanges.push(action);
      return action;
    },
    useAppSelector: (selector: (state: any) => unknown) =>
      selector({ settings: { desktopChromeConnectorEnabled: mockedChromeConnectorEnabled } }),
  }));
  mock.module("../settingSlice", () => ({
    selectDesktopChromeConnectorEnabled: (state: any) =>
      state.settings.desktopChromeConnectorEnabled === true,
    setSettings: (changes: unknown) => ({
      type: "settings/setSettings",
      payload: changes,
    }),
  }));
  mock.module("app/utils/env", () => ({
    getIsDesktopApp: () => true,
  }));
  const module = await import(`./DesktopRuntime.tsx?test=${moduleVersion++}`) as DesktopRuntimeModule;
  mock.restore();
  return module.default;
};

describe("DesktopRuntime", () => {
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
    mockedChromeConnectorEnabled = false;
    dispatchedSettingsChanges = [];
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
      delete (globalThis as any).fetch;
    } else {
      globalThis.fetch = previousFetch;
    }
  });

  it("renders running status and recent log lines", async () => {
    globalThis.fetch = (async (input: string | URL | Request) => {
      if (String(input) === "/api/desktop/agent-runtime/status") {
        return new Response(
          JSON.stringify({
            ok: true,
            host: "desktop",
            providerRuntimeState: "running",
            localCapabilities: ["agent-config", "provider", "persistence"],
            decision: {
              mode: "local",
              runnable: true,
              reason: "local runtime capabilities are available",
              missingLocalCapabilities: [],
              syncAfterRun: false,
            },
            missingLocalCapabilities: [],
          }),
        );
      }
      return new Response(
        JSON.stringify({
          state: "running",
          baseUrl: "http://127.0.0.1:8080",
          managedPid: 4242,
          watchPid: null,
          modelNames: ["Qwen3.6-27B"],
          logTail: ["boot ok"],
        }),
      );
    }) as unknown as typeof globalThis.fetch;

    const DesktopRuntime = await loadDesktopRuntime();
    await act(async () => {
      root!.render(<DesktopRuntime />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Qwen3.6-27B");
    expect(container.textContent).toContain("boot ok");
    expect(container.textContent).toContain("4242");
    expect(container.textContent).toContain("Agent runtime");
    expect(container.textContent).toContain("local");
    expect(container.textContent).toContain("agent-config");
  });

  it("renders missing local agent runtime capabilities", async () => {
    globalThis.fetch = (async (input: string | URL | Request) => {
      if (String(input) === "/api/desktop/agent-runtime/status") {
        return new Response(
          JSON.stringify({
            ok: true,
            host: "desktop",
            providerRuntimeState: "stopped",
            localCapabilities: ["agent-config", "persistence"],
            decision: {
              mode: "server",
              runnable: true,
              reason: "local runtime capabilities are missing; using server fallback",
              missingLocalCapabilities: ["provider"],
              syncAfterRun: false,
            },
            missingLocalCapabilities: ["provider"],
          }),
        );
      }
      return new Response(
        JSON.stringify({
          state: "stopped",
          baseUrl: "http://127.0.0.1:8080",
          managedPid: null,
          watchPid: null,
          modelNames: [],
          logTail: [],
        }),
      );
    }) as unknown as typeof globalThis.fetch;

    const DesktopRuntime = await loadDesktopRuntime();
    await act(async () => {
      root!.render(<DesktopRuntime />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Agent runtime");
    expect(container.textContent).toContain("server");
    expect(container.textContent).toContain("provider");
  });

  it("renders startup errors from the runtime snapshot", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          state: "error",
          baseUrl: "http://127.0.0.1:8080",
          managedPid: null,
          watchPid: null,
          modelNames: [],
          logTail: [],
          error: "startup exploded",
        }),
      )) as unknown as typeof globalThis.fetch;

    const DesktopRuntime = await loadDesktopRuntime();
    await act(async () => {
      root!.render(<DesktopRuntime />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("startup exploded");
  });

  it("renders the unconfigured state when no launch config exists", async () => {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          state: "unconfigured",
          baseUrl: "http://127.0.0.1:8080",
          managedPid: null,
          watchPid: null,
          modelNames: [],
          logTail: [],
        }),
      )) as unknown as typeof globalThis.fetch;

    const DesktopRuntime = await loadDesktopRuntime();
    await act(async () => {
      root!.render(<DesktopRuntime />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("unconfigured");
    expect(container.textContent).toContain("http://127.0.0.1:8080");
  });

  it("submits start and refresh actions against the desktop runtime endpoint", async () => {
    const requests: Array<{ method: string; url: string; body: string | null }> = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
      const request = {
        method: init?.method ?? "GET",
        url: String(input),
        body: typeof init?.body === "string" ? init.body : null,
      };
      requests.push(request);

      if (request.url === "/api/desktop/agent-runtime/status") {
        return new Response(JSON.stringify({
          ok: true,
          host: "desktop",
          providerRuntimeState: "stopped",
          localCapabilities: ["agent-config", "persistence"],
          decision: {
            mode: "server",
            runnable: true,
            reason: "local runtime capabilities are missing; using server fallback",
            missingLocalCapabilities: ["provider"],
            syncAfterRun: false,
          },
          missingLocalCapabilities: ["provider"],
        }));
      }

      if (request.method === "POST") {
        return new Response(
          JSON.stringify({
            state: "starting",
            baseUrl: "http://127.0.0.1:8080",
            managedPid: null,
            watchPid: null,
            modelNames: [],
            logTail: [],
            accepted: true,
          }),
        );
      }

      return new Response(
        JSON.stringify({
          state: "stopped",
          baseUrl: "http://127.0.0.1:8080",
          managedPid: null,
          watchPid: null,
          modelNames: [],
          logTail: [],
        }),
      );
    }) as unknown as typeof globalThis.fetch;

    const DesktopRuntime = await loadDesktopRuntime();
    await act(async () => {
      root!.render(<DesktopRuntime />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const buttons = Array.from(container.querySelectorAll("button"));
    const startButton = buttons.find((button) => button.textContent === "Start");
    const refreshButton = buttons.find((button) => button.textContent === "Refresh");

    expect(startButton).toBeTruthy();
    expect(refreshButton).toBeTruthy();

    await act(async () => {
      startButton!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    await act(async () => {
      refreshButton!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(requests).toEqual([
      { method: "GET", url: "/api/desktop/provider-runtime", body: null },
      { method: "GET", url: "/api/desktop/agent-runtime/status", body: null },
      { method: "GET", url: "/api/desktop/chrome-connector/status", body: null },
      { method: "POST", url: "/api/desktop/provider-runtime", body: JSON.stringify({ action: "start" }) },
      { method: "GET", url: "/api/desktop/provider-runtime", body: null },
      { method: "GET", url: "/api/desktop/agent-runtime/status", body: null },
      { method: "GET", url: "/api/desktop/chrome-connector/status", body: null },
      { method: "GET", url: "/api/desktop/provider-runtime", body: null },
      { method: "GET", url: "/api/desktop/agent-runtime/status", body: null },
      { method: "GET", url: "/api/desktop/chrome-connector/status", body: null },
    ]);
  });

  it("submits stop actions against the desktop runtime endpoint", async () => {
    const requests: Array<{ method: string; url: string; body: string | null }> = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
      const request = {
        method: init?.method ?? "GET",
        url: String(input),
        body: typeof init?.body === "string" ? init.body : null,
      };
      requests.push(request);

      if (request.url === "/api/desktop/agent-runtime/status") {
        return new Response(JSON.stringify({
          ok: true,
          host: "desktop",
          providerRuntimeState: "running",
          localCapabilities: ["agent-config", "provider", "persistence"],
          decision: {
            mode: "local",
            runnable: true,
            reason: "local runtime capabilities are available",
            missingLocalCapabilities: [],
            syncAfterRun: false,
          },
          missingLocalCapabilities: [],
        }));
      }

      if (request.method === "POST") {
        return new Response(JSON.stringify({ managedPid: 4242 }));
      }

      return new Response(
        JSON.stringify({
          state: "running",
          baseUrl: "http://127.0.0.1:8080",
          managedPid: 4242,
          watchPid: null,
          modelNames: ["Qwen3.6-27B"],
          logTail: ["boot ok"],
        }),
      );
    }) as unknown as typeof globalThis.fetch;

    const DesktopRuntime = await loadDesktopRuntime();
    await act(async () => {
      root!.render(<DesktopRuntime />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const stopButton = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent === "Stop",
    );

    expect(stopButton).toBeTruthy();

    await act(async () => {
      stopButton!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(requests).toEqual([
      { method: "GET", url: "/api/desktop/provider-runtime", body: null },
      { method: "GET", url: "/api/desktop/agent-runtime/status", body: null },
      { method: "GET", url: "/api/desktop/chrome-connector/status", body: null },
      { method: "POST", url: "/api/desktop/provider-runtime", body: JSON.stringify({ action: "stop" }) },
      { method: "GET", url: "/api/desktop/provider-runtime", body: null },
      { method: "GET", url: "/api/desktop/agent-runtime/status", body: null },
      { method: "GET", url: "/api/desktop/chrome-connector/status", body: null },
    ]);
  });

  it("renders Chrome Connector status and tab count", async () => {
    mockedChromeConnectorEnabled = true;
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      if (url === "/api/desktop/agent-runtime/status") {
        return new Response(JSON.stringify({
          ok: true,
          host: "desktop",
          providerRuntimeState: "running",
          localCapabilities: ["agent-config", "provider", "persistence"],
          decision: {
            mode: "local",
            runnable: true,
            reason: "local runtime capabilities are available",
            missingLocalCapabilities: [],
            syncAfterRun: false,
          },
          missingLocalCapabilities: [],
        }));
      }
      if (url === "/api/desktop/chrome-connector/status") {
        return new Response(JSON.stringify({
          ok: true,
          extensionId: "ahpdoopadkamnglhlacfjdfnonpjdplg",
          extensionPath: "/repo/packages/desktop-chrome-connector/extension",
          nativeHost: {
            installed: true,
            manifestPath: "/manifest.json",
            wrapperPath: "/wrapper",
            allowedOriginMatches: true,
            wrapperPathMatches: true,
          },
          rpc: { online: true, tabCount: 3 },
        }));
      }
      return new Response(JSON.stringify({
        state: "running",
        baseUrl: "http://127.0.0.1:8080",
        managedPid: 4242,
        watchPid: null,
        modelNames: ["Qwen3.6-27B"],
        logTail: [],
      }));
    }) as unknown as typeof globalThis.fetch;

    const DesktopRuntime = await loadDesktopRuntime();
    await act(async () => {
      root!.render(<DesktopRuntime />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Chrome Connector");
    expect(container.textContent).toContain("ahpdoopadkamnglhlacfjdfnonpjdplg");
    expect(container.textContent).toContain("RPC: online");
    expect(container.textContent).toContain("Tabs: 3");
    expect(container.textContent).toContain("Available to desktop agents.");
  });

  it("renders and persists the Chrome Connector agent capability switch", async () => {
    const requests: string[] = [];
    globalThis.fetch = (async (input: string | URL | Request) => {
      const url = String(input);
      requests.push(url);
      if (url === "/api/desktop/agent-runtime/status") {
        return new Response(JSON.stringify({
          ok: true,
          host: "desktop",
          providerRuntimeState: "running",
          localCapabilities: ["agent-config", "provider", "persistence"],
          decision: {
            mode: "local",
            runnable: true,
            reason: "local runtime capabilities are available",
            missingLocalCapabilities: [],
            syncAfterRun: false,
          },
          missingLocalCapabilities: [],
        }));
      }
      if (url === "/api/desktop/chrome-connector/status") {
        return new Response(JSON.stringify({
          ok: true,
          extensionId: "ahpdoopadkamnglhlacfjdfnonpjdplg",
          extensionPath: "/repo/packages/desktop-chrome-connector/extension",
          nativeHost: {
            installed: true,
            manifestPath: "/manifest.json",
            wrapperPath: "/wrapper",
            allowedOriginMatches: true,
            wrapperPathMatches: true,
          },
          rpc: { online: true, tabCount: 1 },
        }));
      }
      return new Response(JSON.stringify({
        state: "running",
        baseUrl: "http://127.0.0.1:8080",
        managedPid: 4242,
        watchPid: null,
        modelNames: ["Qwen3.6-27B"],
        logTail: [],
      }));
    }) as unknown as typeof globalThis.fetch;

    const DesktopRuntime = await loadDesktopRuntime();
    await act(async () => {
      root!.render(<DesktopRuntime />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const checkbox = container.querySelector("input[type='checkbox']") as HTMLInputElement | null;

    expect(container.textContent).toContain("Enable Chrome Connector for agents");
    expect(container.textContent).toContain("Agents cannot use Chrome until enabled.");
    expect(checkbox).toBeTruthy();
    expect(checkbox!.checked).toBe(false);

    await act(async () => {
      checkbox!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(dispatchedSettingsChanges).toContainEqual({
      type: "settings/setSettings",
      payload: { desktopChromeConnectorEnabled: true },
    });
    expect(requests).toContain("/api/desktop/chrome-connector/status");
  });

  it("installs native host and runs Chrome Connector smoke test from the settings card", async () => {
    const requests: Array<{ method: string; url: string }> = [];
    globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit | BunFetchRequestInit) => {
      const request = { method: init?.method ?? "GET", url: String(input) };
      requests.push(request);
      if (request.url === "/api/desktop/agent-runtime/status") {
        return new Response(JSON.stringify({
          ok: true,
          host: "desktop",
          providerRuntimeState: "running",
          localCapabilities: ["agent-config", "provider", "persistence"],
          decision: {
            mode: "local",
            runnable: true,
            reason: "local runtime capabilities are available",
            missingLocalCapabilities: [],
            syncAfterRun: false,
          },
          missingLocalCapabilities: [],
        }));
      }
      if (request.url === "/api/desktop/chrome-connector/status") {
        return new Response(JSON.stringify({
          ok: true,
          extensionId: "ahpdoopadkamnglhlacfjdfnonpjdplg",
          extensionPath: "/repo/packages/desktop-chrome-connector/extension",
          nativeHost: {
            installed: false,
            manifestPath: "/manifest.json",
            wrapperPath: "/wrapper",
            allowedOriginMatches: false,
            wrapperPathMatches: false,
          },
          rpc: { online: false, tabCount: null },
          lastError: "Chrome connector RPC endpoint is unavailable",
        }));
      }
      if (request.url === "/api/desktop/chrome-connector/install-native-host") {
        return new Response(JSON.stringify({ ok: true }));
      }
      if (request.url === "/api/desktop/chrome-connector/smoke-test") {
        return new Response(JSON.stringify({
          ok: true,
          smoke: {
            passed: true,
            readBeforeHasTitle: true,
            readAfterText: "clicked:nolo",
            screenshotCaptured: true,
            consoleMatched: true,
            networkMatched: true,
          },
        }));
      }
      return new Response(JSON.stringify({
        state: "running",
        baseUrl: "http://127.0.0.1:8080",
        managedPid: 4242,
        watchPid: null,
        modelNames: ["Qwen3.6-27B"],
        logTail: [],
      }));
    }) as unknown as typeof globalThis.fetch;

    const DesktopRuntime = await loadDesktopRuntime();
    await act(async () => {
      root!.render(<DesktopRuntime />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const buttons = Array.from(container.querySelectorAll("button"));
    const installButton = buttons.find((button) => button.textContent === "Install/Reinstall native host");
    const smokeButton = buttons.find((button) => button.textContent === "Run smoke test");

    expect(container.textContent).toContain("Native host: missing");
    expect(container.textContent).toContain("Chrome connector RPC endpoint is unavailable");
    expect(installButton).toBeTruthy();
    expect(smokeButton).toBeTruthy();

    await act(async () => {
      installButton!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });
    await act(async () => {
      smokeButton!.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Smoke test: passed");
    expect(requests.map((request) => `${request.method} ${request.url}`)).toContain(
      "POST /api/desktop/chrome-connector/install-native-host",
    );
    expect(requests.map((request) => `${request.method} ${request.url}`)).toContain(
      "POST /api/desktop/chrome-connector/smoke-test",
    );
  });
});
