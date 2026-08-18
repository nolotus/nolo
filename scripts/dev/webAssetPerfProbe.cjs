const { chromium } = require("playwright");
const fs = require("node:fs/promises");
const path = require("node:path");

const targetUrl = process.argv[2] || "https://us.nolo.chat/";
const runs = Number.parseInt(process.env.NOLO_PERF_RUNS || "5", 10) || 5;
const settleMs = Number.parseInt(process.env.NOLO_PERF_SETTLE_MS || "2500", 10) || 2500;
const waitUntil = process.env.NOLO_PERF_WAIT_UNTIL || "load";
const metaSource = process.env.NOLO_PERF_META || "auto";
const probeMode = process.env.NOLO_PERF_MODE || "anonymous";
const authToken = process.env.NOLO_PERF_AUTH_TOKEN || "";
const authTokens = process.env.NOLO_PERF_AUTH_TOKENS || (authToken ? JSON.stringify([authToken]) : "");
const authCookieName = process.env.NOLO_PERF_AUTH_COOKIE || "nolo_auth_token";
const topInputCount = Number.parseInt(process.env.NOLO_PERF_TOP_INPUTS || "8", 10) || 8;
const summaryOnly = process.env.NOLO_PERF_SUMMARY_ONLY === "1";
const summaryTopResources = Number.parseInt(process.env.NOLO_PERF_SUMMARY_TOP || "20", 10) || 20;
const outFile = process.env.NOLO_PERF_OUT || "";
const budgets = {
  entryCssBytes: Number.parseInt(process.env.NOLO_PERF_BUDGET_ENTRY_CSS || "428780", 10),
  maxImageBytes: Number.parseInt(process.env.NOLO_PERF_BUDGET_IMAGE || "120000", 10),
  requireImmutableHashedAssets: process.env.NOLO_PERF_BUDGET_HASHED_IMMUTABLE !== "0",
};
const trackedTypes = new Set(["document", "script", "stylesheet", "font", "image", "fetch", "xhr"]);
const hashedAssetRe =
  /^\/public\/assets\/(?:entry-[A-Z0-9]{8,}\.(?:js|css)|chunks\/.+-[A-Z0-9]{8,}\.js|assets\/.+-[A-Z0-9]{8,}\.[a-z0-9]+)$/i;

const summarizeNumber = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, value) => acc + value, 0);
  return {
    min: sorted[0] ?? 0,
    median: sorted[Math.floor(sorted.length / 2)] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    avg: sorted.length ? Math.round(sum / sorted.length) : 0,
  };
};

const stripOrigin = (url) => url.replace(/^https?:\/\/[^/]+/, "");

const readJsonFile = async (filePath) => {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return null;
  }
};

const fetchJson = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
};

const resolveMeta = async (url) => {
  if (metaSource === "none") return null;

  if (/^https?:\/\//i.test(metaSource)) {
    return fetchJson(metaSource);
  }

  if (metaSource !== "auto" && metaSource !== "local") {
    return readJsonFile(path.resolve(metaSource));
  }

  if (metaSource === "auto") {
    const origin = new URL(url).origin;
    const remote = await fetchJson(`${origin}/public/meta.json`);
    if (remote) return remote;
  }

  return readJsonFile(path.resolve("public/meta.json"));
};

const summarizeInputs = (output, count) =>
  Object.entries(output?.inputs || {})
    .map(([input, detail]) => ({
      input,
      bytes: Number(detail?.bytesInOutput) || 0,
    }))
    .filter((input) => input.bytes > 0)
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, count);

const buildMetaIndex = (meta) => {
  const index = new Map();
  for (const [outputPath, output] of Object.entries(meta?.outputs || {})) {
    index.set(`/${outputPath.replace(/\\/g, "/")}`, {
      bytes: Number(output.bytes) || 0,
      entryPoint: output.entryPoint || "",
      inputs: summarizeInputs(output, topInputCount),
    });
  }
  return index;
};

const parseAuthTokens = () => {
  if (!authTokens) return [];
  try {
    const parsed = JSON.parse(authTokens);
    return Array.isArray(parsed) ? parsed.filter((token) => typeof token === "string" && token) : [];
  } catch {
    return authTokens
      .split(",")
      .map((token) => token.trim())
      .filter(Boolean);
  }
};

const probeOnce = async (browser, url) => {
  const context = await browser.newContext();
  const tokens = probeMode === "authenticated" ? parseAuthTokens() : [];
  if (tokens.length) {
    const origin = new URL(url);
    await context.addInitScript((storedTokens) => {
      window.localStorage.setItem("tokens", JSON.stringify(storedTokens));

      const parseUserFromToken = (token) => {
        try {
          const payload = token.split(".")[0];
          const json = atob(payload);
          const user = JSON.parse(json);
          return user && typeof user.userId === "string" ? user : null;
        } catch {
          return null;
        }
      };

      const currentToken = storedTokens[0];
      const currentUser = parseUserFromToken(currentToken);
      if (!currentUser || !currentToken) return;

      const mergeAuth = (state) => ({
        ...(state || {}),
        auth: {
          ...((state && state.auth) || {}),
          currentUser,
          users: [currentUser],
          isLoggedIn: true,
          currentToken,
          isLoading: false,
        },
      });

      let preloadedState = mergeAuth(window.__PRELOADED_STATE__);
      Object.defineProperty(window, "__PRELOADED_STATE__", {
        configurable: true,
        get() {
          return preloadedState;
        },
        set(nextState) {
          preloadedState = mergeAuth(nextState);
        },
      });
    }, tokens);
    await context.addCookies([
      {
        name: authCookieName,
        value: tokens[0],
        url: origin.origin,
        sameSite: "Lax",
      },
    ]);
  }
  const page = await context.newPage();
  const records = [];
  const consoleMessages = [];
  const pageErrors = [];

  await page.addInitScript(() => {
    window.__noloPerf = {
      lcp: null,
      cls: 0,
    };
    try {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        window.__noloPerf.lcp = entries[entries.length - 1] || window.__noloPerf.lcp;
      }).observe({ type: "largest-contentful-paint", buffered: true });
    } catch {}
    try {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__noloPerf.cls += entry.value || 0;
          }
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
  });

  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type())) {
      consoleMessages.push({
        type: message.type(),
        text: message.text(),
      });
    }
  });

  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });

  page.on("response", async (response) => {
    const request = response.request();
    const type = request.resourceType();
    if (!trackedTypes.has(type)) return;

    const timing = request.timing();
    const headers = response.headers();

    records.push({
      url: response.url(),
      status: response.status(),
      type,
      cacheControl: headers["cache-control"] || "",
      contentEncoding: headers["content-encoding"] || "",
      contentLength: Number(headers["content-length"]) || 0,
      ttfbMs: Math.max(0, Math.round(timing.responseStart - timing.requestStart)),
      totalMs: Math.max(0, Math.round(timing.responseEnd - timing.requestStart)),
    });
  });

  const startedAt = Date.now();
  const response = await page.goto(url, { waitUntil, timeout: 60_000 });
  await page.waitForTimeout(settleMs);
  const perf = await page.evaluate(() => {
    const entry = performance.getEntriesByType("navigation")[0];
    const paintEntries = performance.getEntriesByType("paint");
    const captured = window.__noloPerf || {};
    const nav = entry
      ? {
          transferSize: entry.transferSize,
          encodedBodySize: entry.encodedBodySize,
          decodedBodySize: entry.decodedBodySize,
          nextHopProtocol: entry.nextHopProtocol || "",
          domContentLoadedMs: Math.round(entry.domContentLoadedEventEnd),
          loadMs: Math.round(entry.loadEventEnd),
          durationMs: Math.round(entry.duration),
        }
      : null;
    const paint = Object.fromEntries(
      paintEntries.map((paintEntry) => [
        paintEntry.name,
        Math.round(paintEntry.startTime),
      ])
    );
    const lcpEntry = captured.lcp;
    const cls = Number(captured.cls) || 0;
    return {
      nav,
      paint,
      lcp: lcpEntry
        ? {
            startTimeMs: Math.round(lcpEntry.startTime),
            renderTimeMs: Math.round(lcpEntry.renderTime || 0),
            loadTimeMs: Math.round(lcpEntry.loadTime || 0),
            size: Math.round(lcpEntry.size || 0),
            element: lcpEntry.element
              ? {
                  tagName: lcpEntry.element.tagName,
                  id: lcpEntry.element.id || "",
                  className:
                    typeof lcpEntry.element.className === "string"
                      ? lcpEntry.element.className
                      : "",
                }
              : null,
          }
        : null,
      cls: Math.round(cls * 1000) / 1000,
    };
  });
  const heroVariant = await page
    .locator(".home-hero-shell")
    .first()
    .getAttribute("data-mode")
    .catch(() => null);
  const resourceTimings = await page.evaluate(() =>
    Object.fromEntries(
      performance.getEntriesByType("resource").map((entry) => [
        entry.name,
        {
          nextHopProtocol: entry.nextHopProtocol || "",
          transferSize: Math.round(entry.transferSize || 0),
          encodedBodySize: Math.round(entry.encodedBodySize || 0),
          decodedBodySize: Math.round(entry.decodedBodySize || 0),
          ttfbMs: Math.max(0, Math.round(entry.responseStart - entry.requestStart)),
          totalMs: Math.max(0, Math.round(entry.responseEnd - entry.requestStart)),
        },
      ])
    )
  );
  for (const record of records) {
    const timing = resourceTimings[record.url];
    record.nextHopProtocol = timing?.nextHopProtocol || "";
    record.contentLength =
      timing?.transferSize || timing?.encodedBodySize || record.contentLength || 0;
    record.encodedBodySize = timing?.encodedBodySize || 0;
    record.decodedBodySize = timing?.decodedBodySize || 0;
    record.ttfbMs = timing?.ttfbMs ?? record.ttfbMs;
    record.totalMs = timing?.totalMs ?? record.totalMs;
  }

  const elapsedMs = Date.now() - startedAt;
  await context.close();

  return {
    status: response?.status() ?? 0,
    elapsedMs,
    nav: perf.nav,
    paint: perf.paint,
    lcp: perf.lcp,
    cls: perf.cls,
    heroVariant,
    records,
    consoleMessages,
    pageErrors,
  };
};

(async () => {
  const meta = await resolveMeta(targetUrl);
  const metaIndex = buildMetaIndex(meta);
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const results = [];

  for (let index = 0; index < runs; index += 1) {
    results.push(await probeOnce(browser, targetUrl));
  }

  await browser.close();

  const important = results.flatMap((result) => result.records);

  const byUrl = new Map();
  for (const record of important) {
    const key = stripOrigin(record.url);
    const bucket = byUrl.get(key) || {
      url: key,
      type: record.type,
      cacheControl: record.cacheControl,
      contentEncoding: record.contentEncoding,
      protocols: [],
      sizes: [],
      ttfb: [],
      totals: [],
    };
    if (record.nextHopProtocol) bucket.protocols.push(record.nextHopProtocol);
    bucket.sizes.push(record.contentLength);
    bucket.ttfb.push(record.ttfbMs);
    bucket.totals.push(record.totalMs);
    byUrl.set(key, bucket);
  }

  const resources = [...byUrl.values()]
    .map((bucket) => ({
      url: bucket.url,
      type: bucket.type,
      cacheControl: bucket.cacheControl,
      contentEncoding: bucket.contentEncoding,
      protocols: [...new Set(bucket.protocols || [])].filter(Boolean),
      size: summarizeNumber(bucket.sizes),
      ttfbMs: summarizeNumber(bucket.ttfb),
      totalMs: summarizeNumber(bucket.totals),
      meta: metaIndex.get(bucket.url) || null,
    }))
    .sort((a, b) => b.size.median - a.size.median);

  const entryCss = resources.find(
    (resource) => resource.type === "stylesheet" && /^\/public\/assets\/entry-.*\.css$/i.test(resource.url)
  );
  const entryJs = resources.find(
    (resource) => resource.type === "script" && /^\/public\/assets\/entry-.*\.js$/i.test(resource.url)
  );
  const scriptBytes = resources
    .filter((resource) => resource.type === "script")
    .reduce((sum, resource) => sum + resource.size.median, 0);
  const stylesheetBytes = resources
    .filter((resource) => resource.type === "stylesheet")
    .reduce((sum, resource) => sum + resource.size.median, 0);
  const imageBytes = resources
    .filter((resource) => resource.type === "image")
    .reduce((sum, resource) => sum + resource.size.median, 0);
  const fetchBytes = resources
    .filter((resource) => resource.type === "fetch" || resource.type === "xhr")
    .reduce((sum, resource) => sum + resource.size.median, 0);
  const topBlockingResources = resources
    .filter((resource) => ["script", "stylesheet", "fetch", "xhr"].includes(resource.type))
    .sort((a, b) => b.totalMs.median - a.totalMs.median)
    .slice(0, 10)
    .map((resource) => ({
      url: resource.url,
      type: resource.type,
      bytes: resource.size.median,
      totalMs: resource.totalMs.median,
    }));

  const budgetViolations = [];
  if (entryCss && entryCss.size.median > budgets.entryCssBytes) {
    budgetViolations.push({
      budget: "entryCssBytes",
      limit: budgets.entryCssBytes,
      actual: entryCss.size.median,
      url: entryCss.url,
    });
  }

  for (const image of resources.filter((resource) => resource.type === "image")) {
    if (image.size.median > budgets.maxImageBytes) {
      budgetViolations.push({
        budget: "maxImageBytes",
        limit: budgets.maxImageBytes,
        actual: image.size.median,
        url: image.url,
      });
    }
  }

  if (budgets.requireImmutableHashedAssets) {
    for (const resource of resources) {
      if (
        hashedAssetRe.test(resource.url) &&
        !/public,\s*max-age=31536000,\s*immutable/i.test(resource.cacheControl)
      ) {
        budgetViolations.push({
          budget: "requireImmutableHashedAssets",
          expected: "public, max-age=31536000, immutable",
          actual: resource.cacheControl,
          url: resource.url,
        });
      }
    }
  }

  const payload = {
    targetUrl,
    mode: probeMode,
    runs,
    settleMs,
    waitUntil,
    meta: {
      loaded: Boolean(meta),
      source: metaSource,
    },
    page: {
      elapsedMs: summarizeNumber(results.map((result) => result.elapsedMs)),
      status: results.map((result) => result.status),
      heroVariant: results.map((result) => result.heroVariant),
      nav: results.map((result) => result.nav),
      paint: results.map((result) => result.paint),
      lcp: results.map((result) => result.lcp),
      cls: results.map((result) => result.cls),
      consoleMessages: results.flatMap((result) => result.consoleMessages),
      pageErrors: results.flatMap((result) => result.pageErrors),
    },
    summary: {
      entryCss: entryCss
        ? { url: entryCss.url, bytes: entryCss.size.median, metaBytes: entryCss.meta?.bytes ?? null }
        : null,
      entryJs: entryJs
        ? { url: entryJs.url, bytes: entryJs.size.median, metaBytes: entryJs.meta?.bytes ?? null }
        : null,
      scriptBytes,
      stylesheetBytes,
      imageBytes,
      fetchBytes,
      topBlockingResources,
      protocols: [...new Set(resources.flatMap((resource) => resource.protocols || []))].filter(Boolean),
      budgetViolations,
    },
    resources,
  };

  const output = JSON.stringify(
    summaryOnly
      ? {
          ...payload,
          resources: resources.slice(0, summaryTopResources),
        }
      : payload,
    null,
    2
  );
  if (outFile) {
    await fs.mkdir(path.dirname(path.resolve(outFile)), { recursive: true });
    await fs.writeFile(outFile, output);
  }
  console.log(output);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
