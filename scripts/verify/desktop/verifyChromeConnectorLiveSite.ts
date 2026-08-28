import {
  createChromeConnectorClient,
  createVerifiedChromeConnectorClient,
} from "../../../packages/desktop-chrome-connector/chromeConnector";
import { compactWhitespace } from "core/compactWhitespace";
import { toErrorMessage } from "core/errorMessage";

type CliOptions = {
  url: string;
  timeoutMs: number;
  json: boolean;
};

type TabResult = {
  id: string;
  title?: string;
  url?: string;
};

type ReadPageResult = {
  title?: string;
  url?: string;
  text?: string;
  html?: string;
};

const usage = () => `Usage: bun scripts/verify/desktop/verifyChromeConnectorLiveSite.ts [--url https://nolo.chat/] [--timeout-ms 15000] [--json]

Verifies that the Nolo Desktop Chrome connector can use the user's Chrome to
open and read a real public website. The script is read-only: it does not log in,
submit forms, click buttons, read cookies/storage, or mutate user data.`;

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    url: "https://nolo.chat/",
    timeoutMs: 15_000,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      console.log(usage());
      process.exit(0);
    }
    if (arg === "--json") {
      options.json = true;
      continue;
    }
    if (arg === "--url") {
      const value = argv[index + 1];
      if (!value) throw new Error("--url requires a value");
      options.url = value;
      index += 1;
      continue;
    }
    if (arg === "--timeout-ms") {
      const value = Number(argv[index + 1]);
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error("--timeout-ms requires a positive number");
      }
      options.timeoutMs = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}\n${usage()}`);
  }

  const parsedUrl = new URL(options.url);
  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error(`Only http/https URLs are supported: ${options.url}`);
  }
  options.url = parsedUrl.toString();
  return options;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForReadablePage(args: {
  request: ReturnType<typeof createVerifiedChromeConnectorClient>["request"];
  tabId: string;
  expectedHost: string;
  timeoutMs: number;
}) {
  const deadline = Date.now() + args.timeoutMs;
  let lastRead: ReadPageResult | null = null;
  let lastError: unknown = null;

  while (Date.now() < deadline) {
    try {
      const read = await args.request("read_page", { tabId: args.tabId }) as ReadPageResult;
      lastRead = read;
      const pageUrl = read.url ? new URL(read.url) : null;
      const hasExpectedHost = pageUrl?.hostname === args.expectedHost ||
        pageUrl?.hostname.endsWith(`.${args.expectedHost}`);
      if (hasExpectedHost && (read.text?.trim() || read.html?.trim())) {
        return read;
      }
    } catch (error) {
      lastError = error;
    }
    await sleep(500);
  }

  const suffix = lastError instanceof Error
    ? ` Last error: ${lastError.message}`
    : lastRead
      ? ` Last read URL: ${lastRead.url ?? "unknown"}`
      : "";
  throw new Error(`Timed out waiting for readable page on ${args.expectedHost}.${suffix}`);
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const target = new URL(options.url);
  const client = createVerifiedChromeConnectorClient({
    client: createChromeConnectorClient(),
  });

  const connectorInfo = await client.request("connector_info", {});
  const openResult = await client.request("open_tab", {
    url: options.url,
    active: false,
  }) as { tab?: TabResult };
  const tab = openResult.tab;
  if (!tab?.id) {
    throw new Error("Chrome connector did not return a tab id from open_tab.");
  }

  const read = await waitForReadablePage({
    request: client.request,
    tabId: tab.id,
    expectedHost: target.hostname,
    timeoutMs: options.timeoutMs,
  });
  const screenshot = await client.request("screenshot", {
    tabId: tab.id,
    fullPage: false,
  }) as { dataUrl?: string };
  const screenshotCaptured = typeof screenshot.dataUrl === "string" &&
    screenshot.dataUrl.startsWith("data:image/png;base64,") &&
    screenshot.dataUrl.length > "data:image/png;base64,".length;

  if (!screenshotCaptured) {
    throw new Error("Chrome connector screenshot did not return a PNG data URL.");
  }

  const result = {
    ok: true,
    targetUrl: options.url,
    connectorInfo,
    tab: {
      id: tab.id,
      initialTitle: tab.title ?? "",
      initialUrl: tab.url ?? "",
    },
    page: {
      title: read.title ?? "",
      url: read.url ?? "",
      textLength: read.text?.length ?? 0,
      htmlLength: read.html?.length ?? 0,
      textPreview: compactWhitespace(read.text ?? "").slice(0, 240),
    },
    screenshotCaptured,
  };

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log("[verify-chrome-live-site] ok");
    console.log(`target: ${result.targetUrl}`);
    console.log(`page: ${result.page.title || "(untitled)"} ${result.page.url}`);
    console.log(`textLength: ${result.page.textLength}`);
    console.log(`screenshotCaptured: ${result.screenshotCaptured}`);
  }
}

main().catch((error) => {
  const message = toErrorMessage(error);
  console.error(`[verify-chrome-live-site] failed: ${message}`);
  process.exit(1);
});
