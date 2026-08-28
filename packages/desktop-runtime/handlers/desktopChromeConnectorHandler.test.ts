import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildDesktopChromeConnectorStatus,
  handleDesktopChromeConnectorInstallNativeHostPost,
  handleDesktopChromeConnectorSmokeTestPost,
  handleDesktopChromeConnectorStatusGet,
} from "./desktopChromeConnectorHandler";

const extensionId = "ahpdoopadkamnglhlacfjdfnonpjdplg";

function makeHome() {
  return mkdtempSync(join(tmpdir(), "nolo-desktop-chrome-home-"));
}

function nativeManifestPath(home: string) {
  return join(
    home,
    "Library/Application Support/Google/Chrome/NativeMessagingHosts/com.nolo.chrome_connector.json",
  );
}

describe("desktop Chrome connector handler", () => {
  test("reports missing native host manifest and offline RPC", async () => {
    const home = makeHome();
    try {
      const status = await buildDesktopChromeConnectorStatus({
        env: { HOME: home },
        requestChrome: async () => {
          throw new Error("connection refused");
        },
      });

      expect(status).toMatchObject({
        ok: true,
        extensionId,
        nativeHost: {
          installed: false,
          allowedOriginMatches: false,
          wrapperPathMatches: false,
        },
        rpc: {
          online: false,
          tabCount: null,
        },
      });
      expect(status.lastError).toContain("connection refused");
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("reports manifest mismatch separately from online RPC", async () => {
    const home = makeHome();
    try {
      const manifestPath = nativeManifestPath(home);
      mkdirSync(join(manifestPath, ".."), { recursive: true });
      writeFileSync(manifestPath, JSON.stringify({
        name: "com.nolo.chrome_connector",
        description: "wrong",
        path: "/tmp/wrong-host",
        type: "stdio",
        allowed_origins: ["chrome-extension://wrong/"],
      }));

      const status = await buildDesktopChromeConnectorStatus({
        env: { HOME: home },
        requestChrome: async (action) => action === "connector_info"
          ? { extensionId }
          : { tabs: [{ id: "1" }, { id: "2" }] },
      });

      expect(status.nativeHost.installed).toBe(true);
      expect(status.nativeHost.allowedOriginMatches).toBe(false);
      expect(status.nativeHost.wrapperPathMatches).toBe(false);
      expect(status.rpc).toEqual({ online: true, tabCount: 2 });
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("installs native host through the desktop-only route", async () => {
    const home = makeHome();
    try {
      const rejected = await handleDesktopChromeConnectorInstallNativeHostPost(
        new Request("http://local/install"),
        { env: { HOME: home } },
      );
      expect(rejected.status).toBe(404);

      const accepted = await handleDesktopChromeConnectorInstallNativeHostPost(
        new Request("http://local/install", { method: "POST" }),
        { env: { HOME: home, NOLO_DESKTOP: "1" } },
      );
      expect(accepted.status).toBe(200);
      const body = await accepted.json();
      expect(body.ok).toBe(true);
      expect(body.install.extensionId).toBe(extensionId);
      expect(readFileSync(nativeManifestPath(home), "utf8")).toContain(extensionId);
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });

  test("serves status only in desktop mode", async () => {
    const rejected = await handleDesktopChromeConnectorStatusGet(
      new Request("http://local/status"),
      { env: {} },
    );
    expect(rejected.status).toBe(404);

    const accepted = await handleDesktopChromeConnectorStatusGet(
      new Request("http://local/status"),
      {
        env: { NOLO_DESKTOP: "1", HOME: makeHome() },
        requestChrome: async (action) => action === "connector_info"
          ? { extensionId }
          : { tabs: [] },
      },
    );
    expect(accepted.status).toBe(200);
    expect(await accepted.json()).toMatchObject({
      ok: true,
      extensionId,
      rpc: { online: true, tabCount: 0 },
    });
  });

  test("runs smoke test through injected local page server and Chrome RPC", async () => {
    const actions: string[] = [];
    let readCount = 0;
    const response = await handleDesktopChromeConnectorSmokeTestPost(
      new Request("http://local/smoke", { method: "POST" }),
      {
        env: { NOLO_DESKTOP: "1" },
        createSmokePageServer: async () => ({
          url: "http://127.0.0.1:38948/",
          close: async () => {
            actions.push("close_server");
          },
        }),
        requestChrome: async (action) => {
          actions.push(action);
          if (action === "open_tab") return { tab: { id: "tab-1" } };
          if (action === "read_page") {
            readCount += 1;
            return readCount === 1
              ? { title: "Smoke", text: "Nolo Connector Live Smoke" }
              : { title: "Smoke", text: "clicked:nolo" };
          }
          if (action === "scroll") return { scrollX: 0, scrollY: 400 };
          if (action === "screenshot") return { dataUrl: "data:image/png;base64,abc" };
          if (action === "read_console") return { entries: [{ text: "nolo-live-smoke-click nolo" }] };
          if (action === "read_network") return { entries: [{ url: "http://127.0.0.1:38948/ping" }] };
          return {};
        },
      },
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      smoke: {
        passed: true,
        readBeforeHasTitle: true,
        readAfterText: "clicked:nolo",
        screenshotCaptured: true,
        consoleMatched: true,
        networkMatched: true,
      },
    });
    expect(actions).toContain("close_server");
  });

  test("serves smoke test only in desktop mode", async () => {
    const rejected = await handleDesktopChromeConnectorSmokeTestPost(
      new Request("http://local/smoke", { method: "POST" }),
      { env: {} },
    );

    expect(rejected.status).toBe(404);
  });

  test("marks RPC offline when connector_info reports a different extension id", async () => {
    const home = makeHome();
    try {
      const status = await buildDesktopChromeConnectorStatus({
        env: { HOME: home },
        requestChrome: async () => ({ extensionId: "wrong-extension" }),
      });

      expect(status.rpc.online).toBe(false);
      expect(status.rpc.tabCount).toBeNull();
      expect(status.lastError).toContain("Chrome connector extension id mismatch");
    } finally {
      rmSync(home, { recursive: true, force: true });
    }
  });
});
