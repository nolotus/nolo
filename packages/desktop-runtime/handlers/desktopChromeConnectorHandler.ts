import { createServer, type Server } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { toErrorMessage } from "core/errorMessage";
import {
  createChromeConnectorClient,
  NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION,
  NOLO_CONNECTOR_EXTENSION_IDS,
  type ChromeConnectorClient,
} from "../../desktop-chrome-connector/chromeConnector";
import {
  FIREFOX_EXTENSION_ID,
  NATIVE_HOST_BROWSERS,
  detectInstalledBrowsers,
  extensionIdFromPublicKey,
  installNativeHostManifests,
  resolveNativeHostInstallPaths,
} from "./desktopChromeNativeHost";
import { connectorRootFromHere } from "./desktopConnectorRoot";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

type ChromeRequest = ChromeConnectorClient["request"];

export type DesktopChromeConnectorStatus = {
  ok: true;
  extensionId: string;
  extensionPath: string;
  /**
   * Capabilities the installed extension advertised. Empty means it predates capability negotiation
   * (or reported nothing), which is why single tools may answer CAPABILITY_UNSUPPORTED.
   */
  connectorFeatures: string[];
  nativeHost: {
    installed: boolean;
    manifestPath: string;
    wrapperPath: string;
    allowedOriginMatches: boolean;
    wrapperPathMatches: boolean;
  };
  /**
   * Per-browser registration state. `nativeHost` above stays Chrome-shaped for existing callers, but
   * the question a Firefox user has ("is the host registered for the browser I use?") can only be
   * answered per browser: the two manifests live in different directories and validate differently.
   */
  browsers: Record<string, DesktopChromeConnectorBrowserStatus>;
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

// 候选目录与 root 探测搬到了 ./desktopConnectorRoot：桌面启动时的自动安装必须用同一份探测，
// 否则打包版会退化成 dirname(import.meta.url)（那是 bundle 目录，不含 connector）；留 re-export
// 是为了既有读取方与测试不用改。
export {
  CONNECTOR_ROOT_CANDIDATES,
  connectorRootFromHere,
  pickConnectorRoot,
} from "./desktopConnectorRoot";

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

export type DesktopChromeConnectorBrowserStatus = {
  /** The browser looks installed on this machine (its profile directory exists). */
  detected: boolean;
  /** A native messaging host manifest exists for this browser. */
  installed: boolean;
  /** Manifest exists, authorizes the right extension id and points at Nolo's wrapper. */
  registered: boolean;
  manifestPath: string;
  matchesExtension: boolean;
  lastError?: string;
};

function describeNativeHostForBrowser({
  browser,
  home,
  connectorRoot,
  platform,
}: {
  browser: string;
  home: string;
  connectorRoot: string;
  platform?: string;
}): Omit<DesktopChromeConnectorBrowserStatus, "detected"> {
  try {
    const paths = resolveNativeHostInstallPaths({ home, connectorRoot, platform, browser });
    const manifest = readNativeManifest(paths.nativeManifestPath);
    const extensionId =
      browser === "firefox"
        ? FIREFOX_EXTENSION_ID
        : extensionIdFromPublicKey(
            String(
              (JSON.parse(readFileSync(paths.extensionManifestPath, "utf8")) as { key?: string }).key ?? "",
            ),
          );
    const expectedEntry = browser === "firefox" ? extensionId : `chrome-extension://${extensionId}/`;
    const allowedEntries = browser === "firefox" ? manifest?.allowed_extensions : manifest?.allowed_origins;
    const matchesExtension = Array.isArray(allowedEntries) && allowedEntries.includes(expectedEntry);
    return {
      installed: Boolean(manifest),
      registered: Boolean(manifest) && matchesExtension && manifest?.path === paths.wrapperPath,
      manifestPath: paths.nativeManifestPath,
      matchesExtension,
    };
  } catch (error) {
    // Unsupported platform (Windows today) or an unreadable manifest: report it, never fail status.
    return {
      installed: false,
      registered: false,
      manifestPath: "",
      matchesExtension: false,
      lastError: toErrorMessage(error),
    };
  }
}

function describeNativeHostBrowsers({
  env,
  connectorRoot,
  platform,
}: {
  env: Record<string, string | undefined>;
  connectorRoot: string;
  platform?: string;
}): Record<string, DesktopChromeConnectorBrowserStatus> {
  const home = env.HOME || process.env.HOME || "";
  const detected = detectInstalledBrowsers({ home, platform });
  return Object.fromEntries(
    NATIVE_HOST_BROWSERS.map((browser) => [
      browser,
      {
        detected: detected.includes(browser),
        ...describeNativeHostForBrowser({ browser, home, connectorRoot, platform }),
      },
    ]),
  );
}

export async function buildDesktopChromeConnectorStatus(args: {
  env?: Record<string, string | undefined>;
  connectorRoot?: string;
  platform?: string;
  requestChrome?: ChromeRequest;
} = {}): Promise<DesktopChromeConnectorStatus> {
  const env = args.env ?? process.env;
  const connectorRoot = args.connectorRoot ?? connectorRootFromHere();
  const home = env.HOME || process.env.HOME || "";
  const browsers = describeNativeHostBrowsers({ env, connectorRoot, platform: args.platform });
  let paths: ReturnType<typeof resolveNativeHostInstallPaths>;
  try {
    paths = resolveNativeHostInstallPaths({ home, connectorRoot, platform: args.platform });
  } catch (error) {
    // An unsupported platform must produce a status answer, not a 500: the UI needs to render it.
    return {
      ok: true,
      extensionId: readExtensionId(connectorRoot),
      extensionPath: resolve(connectorRoot, "extension"),
      connectorFeatures: [],
      nativeHost: {
        installed: false,
        manifestPath: "",
        wrapperPath: "",
        allowedOriginMatches: false,
        wrapperPathMatches: false,
      },
      rpc: { online: false, tabCount: null },
      browsers,
      lastError: toErrorMessage(error),
    };
  }
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
  let connectorFeatures: string[] = [];
  try {
    const requestChrome = args.requestChrome ?? createChromeConnectorClient().request;
    const connectorInfo = await requestChrome("connector_info", {});
    if (!NOLO_CONNECTOR_EXTENSION_IDS.includes((connectorInfo as { extensionId?: string })?.extensionId ?? "")) {
      throw new Error(
        `Chrome connector extension id mismatch: expected one of ${NOLO_CONNECTOR_EXTENSION_IDS.join(", ")}, received ${
          (connectorInfo as { extensionId?: string })?.extensionId ?? "unknown"
        }.`,
      );
    }
    const receivedProtocolVersion = (connectorInfo as { protocolVersion?: string })?.protocolVersion;
    if (receivedProtocolVersion !== NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION) {
      throw new Error(
        `Chrome connector protocol mismatch: expected ${NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION}, received ${
          receivedProtocolVersion ?? "unknown"
        }. Reload the Nolo Desktop Chrome Connector extension.`,
      );
    }
    const tabsResult = await requestChrome("list_tabs", {});
    const tabs = Array.isArray((tabsResult as { tabs?: unknown[] })?.tabs)
      ? (tabsResult as { tabs: unknown[] }).tabs
      : [];
    rpc = { online: true, tabCount: tabs.length };
    const rawFeatures = (connectorInfo as { features?: unknown })?.features;
    connectorFeatures = Array.isArray(rawFeatures)
      ? rawFeatures.filter((entry): entry is string => typeof entry === "string")
      : [];
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
    connectorFeatures,
    nativeHost: {
      installed: Boolean(nativeManifest),
      manifestPath: paths.nativeManifestPath,
      wrapperPath: paths.wrapperPath,
      allowedOriginMatches,
      wrapperPathMatches,
    },
    browsers,
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

/**
 * Optional request body `{ "browser": "chrome" | "firefox" | "all" }`. Absent (or unparseable) means
 * "Chrome plus whatever else is detected here", which is what the desktop start-up path asks for.
 */
async function readRequestedBrowser(req: Request): Promise<string | undefined> {
  if (!(req.headers.get("content-type") || "").toLowerCase().includes("application/json")) return undefined;
  try {
    const body = (await req.json()) as { browser?: unknown };
    const browser = typeof body?.browser === "string" ? body.browser.trim() : "";
    return browser || undefined;
  } catch {
    return undefined;
  }
}

export async function handleDesktopChromeConnectorInstallNativeHostPost(
  req: Request,
  deps: {
    env?: Record<string, string | undefined>;
    connectorRoot?: string;
  } = {},
) {
  const env = deps.env ?? process.env;
  if (!desktopOnly(env)) return jsonResponse({ error: "Desktop runtime only" }, 404);
  try {
    const requested = await readRequestedBrowser(req);
    const { installs, errors } = installNativeHostManifests({
      home: env.HOME || process.env.HOME || "",
      connectorRoot: deps.connectorRoot ?? connectorRootFromHere(),
      browser: requested,
    });
    if (installs.length === 0) {
      return jsonResponse(
        {
          ok: false,
          error:
            errors.map((failure) => `${failure.browser}: ${failure.message}`).join("; ") ||
            "No native host target could be installed.",
          install: null,
          installs,
          errors,
        },
        500,
      );
    }
    // `install` keeps the single-result shape existing callers read; `installs` is the full list.
    const install = installs.find((entry) => entry.browser === "chrome") ?? installs[0];
    return jsonResponse({ ok: true, install, installs, errors });
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

/**
 * Cleanup is best effort by contract: a tab that is already gone, or a connector without the
 * lifecycle actions, must not turn a passed smoke test into a failure.
 */
async function bestEffortChromeAction(
  requestChrome: ChromeRequest,
  action: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  if (typeof payload.tabId !== "string" || !payload.tabId) return false;
  try {
    await requestChrome(action, payload);
    return true;
  } catch {
    return false;
  }
}

export async function runDesktopChromeConnectorSmokeTest(args: {
  createSmokePageServer?: () => Promise<SmokePageServer>;
  requestChrome?: ChromeRequest;
} = {}) {
  const smokeServer = await (args.createSmokePageServer ?? createDefaultSmokePageServer)();
  const requestChrome = args.requestChrome ?? createChromeConnectorClient().request;
  let tabId = "";
  // The finally block below mutates this object after the report is built, so the smoke report
  // carries the real cleanup outcome instead of a snapshot taken before the cleanup ran. The flags
  // say whether the connector accepted each release action, not that it proved an effect.
  const cleanup = { detachAccepted: false, closeAccepted: false };
  try {
    const opened = await requestChrome("open_tab", { url: smokeServer.url, active: true });
    tabId = String((opened as { tab?: { id?: string } })?.tab?.id ?? "");
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
      cleanup,
    };
  } finally {
    // Leak fix: this smoke test must not leave the tab or the debugger attachment behind.
    cleanup.detachAccepted = await bestEffortChromeAction(requestChrome, "detach", { tabId });
    cleanup.closeAccepted = await bestEffortChromeAction(requestChrome, "close_tab", { tabId });
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
