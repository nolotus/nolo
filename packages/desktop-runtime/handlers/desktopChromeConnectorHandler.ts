import { createServer, type Server } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { toErrorMessage } from "core/errorMessage";
import {
  createChromeConnectorClient,
  NOLO_CHROME_CONNECTOR_PROTOCOL_VERSION,
  type ChromeConnectorClient,
} from "../../desktop-chrome-connector/chromeConnector";
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

/**
 * Connector 树在不同布局下的相对位置（相对 bundler 产物的 `import.meta.dir`）：
 * - dev / 单仓：`packages/desktop-runtime/handlers` → `../../desktop-chrome-connector`
 *   即 `packages/desktop-chrome-connector`；
 * - 打包（v1 parity）：`Resources/app/bun` → `../../desktop-chrome-connector`
 *   即 `Resources/desktop-chrome-connector`；
 * - 打包（flat Linux）：`Resources/app/bun` 下的 `../integrations/connector`
 *   即 `Resources/app/integrations/connector`；mac 经 post-wrap 后为
 *   `Resources/integrations/connector`。
 * 逐项探测并选取第一个含 `extension/manifest.json` 的目录；全部落空时抛出带完整
 * 候选列表的错误（2026-09-16 修复：此前只探测第一项，flat Linux 安装下连接器
 * 功能因 ENOENT 直接不可用）。
 */
export const CONNECTOR_ROOT_CANDIDATES = [
  "../../desktop-chrome-connector",
  "../integrations/connector",
  "../../integrations/connector",
  "../integrations/desktop-chrome-connector",
  "../../integrations/desktop-chrome-connector",
] as const;

/** 选取第一个含连接器清单的候选目录；用于测试与诊断。 */
export function pickConnectorRoot(candidates: readonly string[]): string | null {
  for (const dir of candidates) {
    if (existsSync(join(dir, "extension", "manifest.json"))) return dir;
  }
  return null;
}

function connectorRootFromHere() {
  const candidates = CONNECTOR_ROOT_CANDIDATES.map((rel) => resolve(import.meta.dir, rel));
  const found = pickConnectorRoot(candidates);
  if (!found) {
    throw new Error(
      `desktop chrome connector root not found; probed: ${candidates.join(", ")}`,
    );
  }
  return found;
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
