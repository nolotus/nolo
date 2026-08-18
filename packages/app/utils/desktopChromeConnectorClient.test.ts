import { afterEach, describe, expect, test } from "bun:test";

import {
  fetchDesktopChromeConnectorStatus,
  installDesktopChromeNativeHost,
  runDesktopChromeConnectorSmokeTest,
} from "./desktopChromeConnectorClient";

describe("desktop Chrome connector client", () => {
  const previousFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = previousFetch;
  });

  test("fetches Chrome connector status", async () => {
    const requests: Array<{ method: string; url: string }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ method: init?.method ?? "GET", url: String(input) });
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
    }) as unknown as typeof fetch;

    await expect(fetchDesktopChromeConnectorStatus()).resolves.toMatchObject({
      ok: true,
      extensionId: "ahpdoopadkamnglhlacfjdfnonpjdplg",
      rpc: { online: true, tabCount: 3 },
    });
    expect(requests).toEqual([
      { method: "GET", url: "/api/desktop/chrome-connector/status" },
    ]);
  });

  test("normalizes failed status responses", async () => {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: "Desktop runtime only" }), { status: 404 })) as unknown as typeof fetch;

    await expect(fetchDesktopChromeConnectorStatus()).resolves.toEqual({
      ok: false,
      error: "Desktop runtime only",
    });
  });

  test("posts install and smoke actions", async () => {
    const requests: Array<{ method: string; url: string }> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push({ method: init?.method ?? "GET", url: String(input) });
      return new Response(JSON.stringify({ ok: true }));
    }) as unknown as typeof fetch;

    await expect(installDesktopChromeNativeHost()).resolves.toEqual({ ok: true });
    await expect(runDesktopChromeConnectorSmokeTest()).resolves.toEqual({ ok: true });
    expect(requests).toEqual([
      { method: "POST", url: "/api/desktop/chrome-connector/install-native-host" },
      { method: "POST", url: "/api/desktop/chrome-connector/smoke-test" },
    ]);
  });
});
