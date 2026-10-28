// Host-only platform renderer. Never execute code/scripts from the user workspace.
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { realpath, stat, readFile } from "node:fs/promises";
import { isAbsolute, relative, win32 } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// Both separators must be recognized even when tests run on POSIX.
export function isVisualPathOutside(rel: string): boolean {
  return rel === ".." || /^\.\.[\\/]/.test(rel) || isAbsolute(rel) || win32.isAbsolute(rel);
}

export async function validateVisualUrl(input: string, workspaceRoot: string): Promise<URL> {
  const url = new URL(input);
  if (url.protocol === "file:") {
    const [root, path] = await Promise.all([realpath(workspaceRoot), realpath(fileURLToPath(url))]);
    const rel = relative(root, path);
    if (isVisualPathOutside(rel)) throw new Error("Renderer file URL is outside workspaceRoot.");
    if (!(await stat(path)).isFile()) throw new Error("Renderer file URL must point to a file, not a directory.");
    return pathToFileURL(path);
  }
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("Renderer URL must use http:, https:, or file:.");
  await assertVisualNetworkHost(url.hostname);
  return url;
}

export async function assertVisualNetworkHost(host: string) {
  const hostname = host.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname) ? [{ address: hostname }] : await lookup(hostname, { all: true });
  for (const { address } of addresses) {
    // Loopback is intentionally retained for local development previews. This
    // also exposes host-local HTTP services; do not render untrusted URLs there.
    // LAN access is opt-in: NOLO_VISUAL_RENDERER_ALLOW_PRIVATE=1 exposes internal
    // services to page-controlled requests. Metadata/link-local never opt in.
    const normalized = new URL(`http://${address.includes(":") ? `[${address}]` : address}`).hostname.replace(/^\[|\]$/g, "").toLowerCase();
    const mapped = normalized.match(/^::ffff:([a-f0-9]+):([a-f0-9]+)$/);
    const ipv4 = mapped ? `${parseInt(mapped[1], 16) >> 8}.${parseInt(mapped[1], 16) & 255}.${parseInt(mapped[2], 16) >> 8}.${parseInt(mapped[2], 16) & 255}` : normalized;
    const octets = ipv4.split(".").map(Number);
    if (ipv4.startsWith("169.254.") || normalized === "fd00:ec2::254" || /^fe[89ab][0-9a-f]:/.test(normalized) || ipv4 === "100.100.100.200") {
      throw new Error(`Renderer denies metadata/link-local address: ${hostname}`);
    }
    const privateV4 = octets.length === 4 && (octets[0] === 10 || octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31 || octets[0] === 192 && octets[1] === 168 || octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127);
    const privateV6 = /^(fc|fd)[a-f0-9]{2}:/.test(normalized);
    if ((privateV4 || privateV6) && process.env.NOLO_VISUAL_RENDERER_ALLOW_PRIVATE !== "1") {
      throw new Error(`Renderer denies private address (LAN access requires NOLO_VISUAL_RENDERER_ALLOW_PRIVATE=1): ${hostname}`);
    }
    // Unspecified, multicast and reserved destinations are not preview servers.
    if (ipv4 === "0.0.0.0" || normalized === "::" || octets.length === 4 && octets[0] >= 224 || normalized.startsWith("ff")) {
      throw new Error(`Renderer denies non-unicast address: ${hostname}`);
    }
  }
}

export class VisualResourceError extends Error {
  readonly detectedAt = performance.now();
}

export class VisualRenderSemaphore {
  private active = 0;
  private queue: Array<() => void> = [];
  constructor(private readonly limit: number) {}
  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>(resolve => this.queue.push(resolve));
    else this.active++;
    try { return await task(); }
    finally {
      const next = this.queue.shift();
      if (next) next(); // Hand the occupied slot directly to the next waiter.
      else this.active--;
    }
  }
}
const configuredConcurrency = Number(process.env.NOLO_VISUAL_RENDERER_CONCURRENCY ?? 2);
const renderSlots = new VisualRenderSemaphore(Number.isFinite(configuredConcurrency) ? Math.max(1, Math.min(2, Math.floor(configuredConcurrency))) : 2);
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { resolveExecutableOnPath } from "./runtimeCompat";

const require = createRequire(import.meta.url);
export function visualRendererCapability() {
  if (process.env.NOLO_VISUAL_RENDERER_DISABLED === "1") return { available: false as const, reason: "Platform renderer disabled by NOLO_VISUAL_RENDERER_DISABLED=1 on this runtime host." };
  try {
    const { chromium } = require("playwright") as typeof import("playwright");
    const executablePath = [chromium.executablePath(), resolveExecutableOnPath("google-chrome"), resolveExecutableOnPath("chromium"), resolveExecutableOnPath("chromium-browser")]
      .find((path): path is string => !!path && existsSync(path));
    if (!executablePath) return { available: false as const, reason: "No Chromium renderer installed. Install Playwright Chromium (playwright install chromium) or system Chromium/Google Chrome on the runtime host." };
    return { available: true as const, chromium, executablePath };
  } catch {
    return { available: false as const, reason: "Platform renderer unavailable: install the platform Playwright dependency and Chromium on the runtime host (not a workspace npm script)." };
  }
}

export async function renderVisualPage(args: {
  url: string; workspaceRoot: string; screenshotPath: string; waitSelector: string;
  scrollSelector?: string; focusSelector?: string; expectText?: string; timeoutMs?: number;
  /**
   * Sink for the PNG bytes. The renderer deliberately does NOT write the file
   * itself: the bytes only exist after a whole browser startup + navigation
   * (seconds), and any containment check taken before that render is stale by
   * the time it completes — an agent with `execShell` can swap the output
   * directory for a symlink during it. Persisting through the caller's
   * fd-verified writer is what keeps the child-side check and the write in the
   * same short window.
   */
  persistScreenshot: (bytes: Uint8Array) => Promise<void>;
}) {
  // Validate caller input before capability discovery, DNS, queueing or browser startup.
  for (const field of ["workspaceRoot", "url", "screenshotPath", "waitSelector"] as const) {
    if (typeof args?.[field] !== "string" || !args[field].trim()) {
      throw new Error(`renderVisualPage: ${field} is required (expected a non-empty string)`);
    }
  }
  if (typeof args.persistScreenshot !== "function") {
    throw new Error("renderVisualPage: persistScreenshot is required (expected a function that stores the PNG bytes)");
  }
  if (!isAbsolute(args.workspaceRoot)) {
    throw new Error("renderVisualPage: workspaceRoot must be an absolute path");
  }
  if (!isAbsolute(args.screenshotPath) || !relative(args.workspaceRoot, args.screenshotPath) || isVisualPathOutside(relative(args.workspaceRoot, args.screenshotPath))) {
    throw new Error("renderVisualPage: screenshotPath must be a file path inside workspaceRoot");
  }
  if (args.timeoutMs !== undefined && (typeof args.timeoutMs !== "number" || !Number.isFinite(args.timeoutMs) || args.timeoutMs <= 0)) {
    throw new Error("renderVisualPage: timeoutMs must be a finite number greater than 0");
  }
  let parsedUrl: URL;
  try { parsedUrl = new URL(args.url); } catch {
    throw new Error("renderVisualPage: url must be an absolute http:, https:, or file: URL");
  }
  if (!["http:", "https:", "file:"].includes(parsedUrl.protocol)) {
    throw new Error("renderVisualPage: url must use http:, https:, or file:");
  }
  const url = await validateVisualUrl(args.url, args.workspaceRoot).catch((error) => {
    throw new Error(`renderVisualPage: url is invalid: ${error instanceof Error ? error.message : String(error)}`);
  });
  const capability = visualRendererCapability();
  if (!capability.available) throw new Error(capability.reason);
  return renderSlots.run(async () => {
  const timeout = Math.max(1, Math.min(args.timeoutMs ?? 20_000, 20_000));
  const deadline = Date.now() + timeout;
  const browser = await capability.chromium.launch({ executablePath: capability.executablePath, headless: true, timeout });
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
    // Never navigate Chromium to file:. Serve validated bytes from an isolated
    // synthetic origin instead, so scripts cannot read arbitrary host files.
    const localOrigin = "https://nolo-workspace.invalid";
    const localFile = url.protocol === "file:";
    let routeError: Error | undefined;
    let rejectRoute!: (error: Error) => void;
    const routeFailure = new Promise<never>((_, reject) => { rejectRoute = reject; });
    await page.route("**/*", async route => {
      try {
        const requestUrl = new URL(route.request().url());
        if (localFile && requestUrl.origin === localOrigin) {
          const file = await validateVisualUrl(`file://${requestUrl.pathname}`, args.workspaceRoot);
          const path = fileURLToPath(file);
          const type = path.endsWith(".html") ? "text/html; charset=utf-8" : path.endsWith(".css") ? "text/css; charset=utf-8" : path.endsWith(".js") ? "application/javascript; charset=utf-8" : undefined;
          await route.fulfill({ body: await readFile(path), ...(type ? { contentType: type } : {}) });
        } else {
          await validateVisualUrl(requestUrl.href, args.workspaceRoot);
          if (requestUrl.protocol === "file:") throw new Error("Direct file requests are forbidden.");
          // Fetch one hop at a time: Chromium routing does not reliably re-run
          // handlers for redirect hops. Validate every Location before following.
          let next = requestUrl;
          for (let hop = 0; ; hop++) {
            // DNS rebinding window remains: route.fetch resolves independently.
            // Mitigation: revalidate every request and every redirect hop, not
            // only the initial navigation. This is NOT connected-peer pinning.
            await validateVisualUrl(next.href, args.workspaceRoot);
            const response = await route.fetch({ url: next.href, maxRedirects: 0, timeout: Math.max(1, deadline - Date.now()) });
            const location = response.headers()["location"];
            if ([301, 302, 303, 307, 308].includes(response.status()) && location) {
              if (hop >= 10) throw new Error("Renderer redirect limit exceeded.");
              next = new URL(location, next);
              if (!["http:", "https:"].includes(next.protocol)) throw new Error("Renderer redirects must use http(s).");
              continue;
            }
            await route.fulfill({ response });
            break;
          }
        }
      } catch (error) {
        routeError = new VisualResourceError(error instanceof Error ? error.message : String(error));
        // Close the page before rejecting: a blocked child frame can otherwise
        // keep Chromium shutdown waiting even after the render race rejects.
        const closing = page.close({ runBeforeUnload: false }).catch(() => {});
        rejectRoute(routeError);
        await Promise.all([closing, route.abort().catch(() => {})]);
      }
    });
    const work = async () => {
    page.setDefaultTimeout(timeout);
    await page.goto(localFile ? `${localOrigin}${url.pathname}` : url.href, { waitUntil: "load", timeout });
    await page.locator(args.waitSelector).first().waitFor({ state: "visible" });
    if (args.scrollSelector) await page.locator(args.scrollSelector).first().scrollIntoViewIfNeeded();
    const targetSelector = args.focusSelector ?? args.waitSelector;
    await page.locator(targetSelector).first().scrollIntoViewIfNeeded();
    if (args.expectText) await page.getByText(args.expectText, { exact: false }).first().waitFor({ state: "visible" });
    // Keep the screenshot in memory until every render step succeeds: no temporary
    // screenshot file can survive navigation, selector, evaluation or timeout failure.
    const screenshot = await page.screenshot({ type: "png", timeout });
    const metrics = await page.evaluate(({ waitSelector, scrollSelector, targetSelector }) => {
      const target = document.querySelector(targetSelector)!;
      const rect = target.getBoundingClientRect();
      const style = getComputedStyle(target);
      return {
        waitCount: document.querySelectorAll(waitSelector).length,
        scrollCount: scrollSelector ? document.querySelectorAll(scrollSelector).length : null,
        focusCount: document.querySelectorAll(targetSelector).length,
        targetText: target.textContent?.trim().slice(0, 240) ?? "",
        targetRect: Object.fromEntries(["width", "height", "left", "right", "top", "bottom"].map(key => [key, Math.round(rect[key as keyof DOMRect] as number)])),
        targetComputed: Object.fromEntries(["display", "visibility", "opacity", "position", "width", "height", "pointerEvents"].map(key => [key, style[key as keyof CSSStyleDeclaration]])),
        bodyTextSample: document.body.innerText.slice(0, 500),
      };
    }, { waitSelector: args.waitSelector, scrollSelector: args.scrollSelector, targetSelector });
    if (routeError) throw routeError;
    const result = { ...metrics, pageUrl: localFile ? url.href : page.url(), title: await page.title(), viewport: page.viewportSize(), renderer: "platform-playwright", capturedAt: new Date().toISOString() };
    if (Date.now() >= deadline) throw new Error("Renderer timed out before screenshot persistence.");
    if (timer) clearTimeout(timer);
    // No mkdir/writeFile here: persistence is the caller's guarded write, so the
    // path cannot be redirected between the check and the bytes hitting disk.
    await args.persistScreenshot(screenshot);
    return result;
    };
    return await Promise.race([routeFailure, work(), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Renderer timed out after ${timeout}ms.`)), Math.max(1, deadline - Date.now()));
    })]);
  } finally {
    if (timer) clearTimeout(timer);
    await browser.close();
  }
  });
}
