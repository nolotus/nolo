import { createServer, type Server } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { toErrorMessage } from "core/errorMessage";
import {
  createChromeConnectorClient,
  type ChromeConnectorClient,
} from "desktop-chrome-connector/chromeConnector";
import {
  extensionIdFromPublicKey,
  installNativeHostManifest,
  resolveNativeHostInstallPaths,
} from "./desktopChromeNativeHost";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

type ChromeRequest = ChromeConnectorClient["request"];

export type DesktopChromeConnectorStatus = {
  ok: true;
  extensionId: string;
  extensionPath: string;
  nativeHost: {
    installed: boolean;
    manifestPath: string;
    wrapperPath: string;
    allowedOriginMatches: boolean;
    wrapperPathMatches: boolean;
  };
  rpc: {
    online: boolean;
    tabCount: number | null;
  };
  lastError?: string;
};

type SmokePageServer = {
  url: string;
  close(): Promise<void> | void;
};

function connectorRootFromHere() {
  return resolve(import.meta.dir, "../../desktop-chrome-connector");
}

function desktopOnly(env: Record<string, string | undefined>) {
  return env.NOLO_DESKTOP === "1";
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

function readExtensionId(connectorRoot: string) {
  const manifest = JSON.parse(
    readFileSync(resolve(connectorRoot, "extension", "manifest.json"), "utf8"),
  );
  return extensionIdFromPublicKey(manifest.key);
}

function readNativeManifest(path: string) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export async function buildDesktopChromeConnectorStatus(args: {
  env?: Record<string, string | undefined>;
  connectorRoot?: string;
  requestChrome?: ChromeRequest;
} = {}): Promise<DesktopChromeConnectorStatus> {
  const env = args.env ?? process.env;
  const connectorRoot = args.connectorRoot ?? connectorRootFromHere();
  const home = env.HOME || process.env.HOME || "";
  const paths = resolveNativeHostInstallPaths({ home, connectorRoot });
  const extensionId = readExtensionId(connectorRoot);
  const nativeManifest = readNativeManifest(paths.nativeManifestPath);
  const expectedOrigin = `chrome-extension://${extensionId}/`;
  const lastErrors: string[] = [];

  const allowedOriginMatches = Array.isArray(nativeManifest?.allowed_origins)
    && nativeManifest.allowed_origins.includes(expectedOrigin);
  const wrapperPathMatches = nativeManifest?.path === paths.wrapperPath;

  let rpc: DesktopChromeConnectorStatus["rpc"] = {
    online: false,
    tabCount: null,
  };
  try {
    const requestChrome = args.requestChrome ?? createChromeConnectorClient().request;
    const connectorInfo = await requestChrome("connector_info", {});
    if ((connectorInfo as { extensionId?: string })?.extensionId !== extensionId) {
      throw new Error(
        `Chrome connector extension id mismatch: expected ${extensionId}, received ${
          (connectorInfo as { extensionId?: string })?.extensionId ?? "unknown"
        }.`,
      );
    }
    const tabsResult = await requestChrome("list_tabs", {});
    const tabs = Array.isArray((tabsResult as { tabs?: unknown[] })?.tabs)
      ? (tabsResult as { tabs: unknown[] }).tabs
      : [];
    rpc = { online: true, tabCount: tabs.length };
  } catch (error) {
    lastErrors.push(toErrorMessage(error));
  }

  if (nativeManifest && !allowedOriginMatches) {
    lastErrors.push(`Native host allowed_origins does not include ${expectedOrigin}.`);
  }
  if (nativeManifest && !wrapperPathMatches) {
    lastErrors.push(`Native host path does not match ${paths.wrapperPath}.`);
  }

  return {
    ok: true,
    extensionId,
    extensionPath: resolve(connectorRoot, "extension"),
    nativeHost: {
      installed: Boolean(nativeManifest),
      manifestPath: paths.nativeManifestPath,
      wrapperPath: paths.wrapperPath,
      allowedOriginMatches,
      wrapperPathMatches,
    },
    rpc,
    ...(lastErrors.length ? { lastError: lastErrors.join(" ") } : {}),
  };
}

export async function handleDesktopChromeConnectorStatusGet(
  _req: Request,
  deps: {
    env?: Record<string, string | undefined>;
    connectorRoot?: string;
    requestChrome?: ChromeRequest;
  } = {},
) {
  const env = deps.env ?? process.env;
  if (!desktopOnly(env)) return jsonResponse({ error: "Desktop runtime only" }, 404);
  try {
    return jsonResponse(await buildDesktopChromeConnectorStatus(deps));
  } catch (error) {
    return jsonResponse({ error: toErrorMessage(error) }, 500);
  }
}

export async function handleDesktopChromeConnectorInstallNativeHostPost(
  _req: Request,
  deps: {
    env?: Record<string, string | undefined>;
    connectorRoot?: string;
  } = {},
) {
  const env = deps.env ?? process.env;
  if (!desktopOnly(env)) return jsonResponse({ error: "Desktop runtime only" }, 404);
  try {
    const install = installNativeHostManifest({
      home: env.HOME || process.env.HOME || "",
      connectorRoot: deps.connectorRoot ?? connectorRootFromHere(),
    });
    return jsonResponse({ ok: true, install });
  } catch (error) {
    return jsonResponse({ ok: false, error: toErrorMessage(error) }, 500);
  }
}

async function createDefaultSmokePageServer(): Promise<SmokePageServer> {
  const html = `<!doctype html>
<html>
  <head><title>Nolo Chrome Connector Live Smoke</title></head>
  <body>
    <h1 id="title">Nolo Connector Live Smoke</h1>
    <input id="name" placeholder="name" />
    <button type="button" id="go" onclick="document.querySelector('#result').textContent = 'clicked:' + document.querySelector('#name').value; console.log('nolo-live-smoke-click', document.querySelector('#name').value); fetch('/ping').catch(() => {});">Go</button>
    <p id="result">idle</p>
    <div style="height:2000px">scroll-space</div>
  </body>
</html>`;
  const server = createServer((req, res) => {
    if (req.url === "/ping") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end("{\"pong\":true}");
      return;
    }
    res.writeHead(200, { "content-type": "text/html" });
    res.end(html);
  });
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", () => resolveListen());
  });
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `http://127.0.0.1:${port}/`,
    close: () => new Promise<void>((resolveClose) => {
      server.close(() => resolveClose());
    }),
  };
}

function entriesContain(entries: unknown, pattern: string) {
  return Array.isArray((entries as { entries?: unknown[] })?.entries)
    && (entries as { entries: Array<{ text?: string; url?: string }> }).entries.some((entry) =>
      String(entry.text ?? entry.url ?? "").includes(pattern)
    );
}

export async function runDesktopChromeConnectorSmokeTest(args: {
  createSmokePageServer?: () => Promise<SmokePageServer>;
  requestChrome?: ChromeRequest;
} = {}) {
  const smokeServer = await (args.createSmokePageServer ?? createDefaultSmokePageServer)();
  const requestChrome = args.requestChrome ?? createChromeConnectorClient().request;
  try {
    const opened = await requestChrome("open_tab", { url: smokeServer.url, active: true });
    const tabId = String((opened as { tab?: { id?: string } })?.tab?.id ?? "");
    if (!tabId) throw new Error("Chrome connector smoke test did not receive an opened tab id.");

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    const before = await requestChrome("read_page", { tabId, selector: "body" });
    await requestChrome("read_console", { tabId, limit: 20 });
    await requestChrome("read_network", { tabId, limit: 20 });
    await requestChrome("type", { tabId, selector: "#name", text: "nolo", clearFirst: true });
    await requestChrome("click", { tabId, selector: "#go" });
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
    const after = await requestChrome("read_page", { tabId, selector: "#result" });
    const scroll = await requestChrome("scroll", { tabId, deltaY: 400 });
    const screenshot = await requestChrome("screenshot", { tabId });
    const consoleEntries = await requestChrome("read_console", { tabId, limit: 20 });
    const networkEntries = await requestChrome("read_network", { tabId, limit: 20 });

    const readBeforeHasTitle = String((before as { text?: string; title?: string })?.text ?? "")
      .includes("Nolo Connector Live Smoke")
      || String((before as { title?: string })?.title ?? "").includes("Nolo Chrome Connector Live Smoke");
    const readAfterText = String((after as { text?: string })?.text ?? "");
    const screenshotCaptured = String((screenshot as { dataUrl?: string })?.dataUrl ?? "")
      .startsWith("data:image/png;base64,");
    const consoleMatched = entriesContain(consoleEntries, "nolo-live-smoke-click");
    const networkMatched = entriesContain(networkEntries, "/ping");
    const passed = readBeforeHasTitle
      && readAfterText.includes("clicked:nolo")
      && Number((scroll as { scrollY?: number })?.scrollY ?? 0) >= 0
      && screenshotCaptured
      && consoleMatched
      && networkMatched;

    return {
      passed,
      tabId,
      readBeforeHasTitle,
      readAfterText,
      scroll,
      screenshotCaptured,
      consoleMatched,
      networkMatched,
    };
  } finally {
    await smokeServer.close();
  }
}

export async function handleDesktopChromeConnectorSmokeTestPost(
  _req: Request,
  deps: {
    env?: Record<string, string | undefined>;
    createSmokePageServer?: () => Promise<SmokePageServer>;
    requestChrome?: ChromeRequest;
  } = {},
) {
  const env = deps.env ?? process.env;
  if (!desktopOnly(env)) return jsonResponse({ error: "Desktop runtime only" }, 404);
  try {
    const smoke = await runDesktopChromeConnectorSmokeTest(deps);
    return jsonResponse({ ok: smoke.passed, smoke }, smoke.passed ? 200 : 502);
  } catch (error) {
    return jsonResponse({ ok: false, error: toErrorMessage(error) }, 500);
  }
}
