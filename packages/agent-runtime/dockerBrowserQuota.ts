/**
 * Docker Browser Quota Bridge
 *
 * Minimal read-only bridge that retrieves Docker Agentic Platform quota / rate
 * by querying an already open official usage tab (https://agentic-platform.docker.com/usage)
 * via a verified Chrome/Firefox Desktop Connector client.
 *
 * Security & Isolation:
 * - Does not access tokens, cookies, keyring, or credentials.
 * - Does not create sandboxes or dispatch model requests.
 * - Reuses existing verified ChromeConnector client resolver (no raw unverified RPC).
 * - Production enforces identity-pinned verified connector client; client injection is test-only.
 * - Strictly validates tab URL (no userinfo, no non-default ports), truncation, and auth state.
 * - Disallows ambiguous multi-tab selection: refuses if multiple matching tabs exist.
 * - Reuses open tab only (does not automatically open tabs; returns tab-unavailable if absent).
 * - Balance parses ONLY "Available to spend" (no fallback to settled balance or other credits).
 * - Rate parsing strictly extracts unit price from line items (not quantity or total).
 * - Nano parsing strictly rejects >9 decimal places without silent truncation, and rejects numbers.
 * - Rejects ambiguous multi-pool pages; never guesses account identity.
 * - Sanitized output: only balance, rate, observedAt, source, browser, and usageLag warning.
 *   Never leaks full page text, user names, or raw errors.
 */

import {
  createChromeConnectorClientResolver,
  type ChromeConnectorClient,
  type ConnectorBrowserTarget,
} from "../desktop-chrome-connector/chromeConnector";

export const DOCKER_USAGE_PAGE_URL = "https://agentic-platform.docker.com/usage";
export const DOCKER_USAGE_HOST = "agentic-platform.docker.com";
export const DOCKER_USAGE_PATH = "/usage";

export type DockerBrowserTarget = ConnectorBrowserTarget;

export interface DockerBrowserQuotaConfig {
  /** Trusted browser to query (chrome | firefox) */
  browser: DockerBrowserTarget;
  /**
   * Test-only override for dependency injection.
   * In production, omit so createChromeConnectorClientResolver builds a verified,
   * protocol-checked, identity-pinned client.
   */
  testOverrideClient?: ChromeConnectorClient;
  /** Test-only resolver override */
  testOverrideResolver?: ReturnType<typeof createChromeConnectorClientResolver>;
}

export type DockerBrowserQuotaErrorCode =
  | "CONNECTOR_UNAVAILABLE"
  | "USAGE_TAB_NOT_FOUND"
  | "AMBIGUOUS_TAB"
  | "UNAUTHENTICATED"
  | "PAGE_TRUNCATED"
  | "URL_MISMATCH"
  | "AMBIGUOUS_POOL"
  | "PARSE_FAILED";

export interface DockerBrowserQuotaError {
  ok: false;
  code: DockerBrowserQuotaErrorCode;
  message: string;
}

export interface DockerBrowserRateInfo {
  /** Rate per unit as exact decimal string (e.g. "0.00007778") */
  rateUsd: string;
  /** Exact nano-USD (1 USD = 1,000,000,000 nano-USD) */
  rateNanoUsd: bigint;
  /** Unit of measure (e.g. "second"), strictly verified from line item description */
  unit: string;
}

export interface DockerBrowserQuotaSnapshot {
  ok: true;
  source: "docker-agentic-platform-browser";
  browser: DockerBrowserTarget;
  /** Timestamp when the page was read by connector (NOT the billing data real-time timestamp) */
  observedAt: number;
  /**
   * Warning: Confirmed compute usage has billing lag (up to 24-48h).
   * observedAt represents when the browser tab was read, NOT real-time billing state.
   */
  usageLagWarning: string;
  /**
   * Available balance to spend (parsed strictly from "Available to spend").
   * Exact decimal string (e.g. "98.50").
   */
  availableToSpendUsd: string;
  /** Exact nano-USD (1 USD = 1,000,000,000 nano-USD) */
  availableToSpendNanoUsd: bigint;
  /** Medium runtime rate info if present and unambiguously verified */
  mediumRuntimeRate?: DockerBrowserRateInfo;
}

export type DockerBrowserQuotaResult =
  | DockerBrowserQuotaSnapshot
  | DockerBrowserQuotaError;

/**
 * Safely parse an exact decimal string to nano-USD (1 USD = 1,000,000,000 nano-USD).
 * Enforces strict precision guards:
 * - Rejects number inputs to prevent JS floating-point inaccuracies.
 * - Rejects >9 decimal digits (no silent truncation allowed).
 * - Bounds string and integer lengths to prevent overflow/DoS.
 */
export function parseExactDecimalToNanoUsd(val: unknown): bigint | null {
  if (typeof val !== "string") return null;
  const str = val.trim().replace(/^\$/, "");
  if (!str || str.length > 30) return null;
  if (!/^-?\d+(\.\d+)?$/.test(str)) return null;

  const negative = str.startsWith("-");
  const abs = negative ? str.slice(1) : str;
  const [wholeStr, fracStr = ""] = abs.split(".");

  // Guard against unrealistic numbers
  if (wholeStr.length > 15) return null;

  // Strict precision guard: >9 decimals must NOT be silently truncated
  if (fracStr.length > 9) return null;

  const paddedFrac = fracStr.padEnd(9, "0");
  try {
    const whole = BigInt(wholeStr);
    const frac = BigInt(paddedFrac);
    const nano = whole * 1_000_000_000n + frac;
    return negative ? -nano : nano;
  } catch {
    return null;
  }
}

/**
 * Validates that a tab URL strictly matches the official Docker usage endpoint.
 * Disallows userinfo (e.g. user:pass@) and non-default ports.
 */
export function isMatchingDockerUsageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    // Disallow userinfo
    if (parsed.username || parsed.password) return false;
    // Protocol must be https
    if (parsed.protocol !== "https:") return false;
    // Hostname must match exactly
    if (parsed.hostname.toLowerCase() !== DOCKER_USAGE_HOST) return false;
    // Port must be default (empty) or standard 443
    if (parsed.port !== "" && parsed.port !== "443") return false;
    // Path must match /usage
    if (parsed.pathname.replace(/\/+$/, "") !== DOCKER_USAGE_PATH) return false;
    return true;
  } catch {
    return false;
  }
}

export interface ExtractedPageContent {
  text: string;
  url: string;
  truncated: boolean;
}

/**
 * Parses the rate column from Medium Runtime Seconds line item.
 * Example real line:
 * Columns: Description, Quantity, Rate, Total
 */
function extractMediumRuntimeRate(text: string): DockerBrowserRateInfo | undefined {
  // Find lines or segments mentioning Compute - Medium and Runtime Seconds
  const lines = text.split(/\r?\n/);
  const matchedRates: DockerBrowserRateInfo[] = [];

  for (const line of lines) {
    if (!/Compute\s*-\s*Medium/i.test(line) || !/Runtime\s+Seconds/i.test(line)) {
      continue;
    }

    // Split on tab or 2+ consecutive whitespace/columns
    const parts = line.split(/\t+|\s{2,}/).map((p) => p.trim()).filter(Boolean);

    // If split by tab/multi-space yields at least Description, Quantity, Rate
    if (parts.length >= 3) {
      // Find the rate column: should contain dollar or decimal rate, NOT quantity
      const rawRate = parts[2].replace(/^\$/, "").trim();
      const nano = parseExactDecimalToNanoUsd(rawRate);
      if (nano !== null) {
        matchedRates.push({
          rateUsd: rawRate,
          rateNanoUsd: nano,
          unit: "second",
        });
        continue;
      }
    }

    // Regex fallback on the line: Description ... Quantity ... Rate ... Total
    // Quantity: [0-9,]+(?:\.[0-9]+)?
    // Rate: \$?([0-9]+(?:\.[0-9]+)?)
    const colMatch = line.match(
      /Compute\s*-\s*Medium\s*\|\s*Runtime\s+Seconds[^\d]*[0-9,]+(?:\.[0-9]+)?\s+\$?([0-9]+(?:\.[0-9]+)?)/i,
    );
    if (colMatch) {
      const rawRate = colMatch[1];
      const nano = parseExactDecimalToNanoUsd(rawRate);
      if (nano !== null) {
        matchedRates.push({
          rateUsd: rawRate,
          rateNanoUsd: nano,
          unit: "second",
        });
      }
    }
  }

  // If no rate found or multiple conflicting rates found, return undefined (do not guess)
  if (matchedRates.length === 0) return undefined;
  if (matchedRates.length > 1) {
    const firstRate = matchedRates[0].rateNanoUsd;
    const allSame = matchedRates.every((r) => r.rateNanoUsd === firstRate);
    if (!allSame) return undefined;
  }

  return matchedRates[0];
}

export function parseDockerUsageContent(content: ExtractedPageContent): {
  availableUsd: string;
  availableNanoUsd: bigint;
  mediumRate?: DockerBrowserRateInfo;
} | { error: DockerBrowserQuotaErrorCode; message: string } {
  if (!isMatchingDockerUsageUrl(content.url)) {
    return {
      error: "URL_MISMATCH",
      message: "Tab URL does not match official Docker usage endpoint.",
    };
  }

  if (content.truncated) {
    return {
      error: "PAGE_TRUNCATED",
      message: "Page observation was truncated; refusal to parse partial billing text.",
    };
  }

  const text = content.text;

  // Check login / auth status
  if (
    /sign\s*in|log\s*in|welcome to docker|create account|docker id to continue/i.test(text) &&
    !/available to spend/i.test(text)
  ) {
    return {
      error: "UNAUTHENTICATED",
      message: "Docker usage page is not authenticated or prompts for login.",
    };
  }

  // Balance MUST ONLY come from "Available to spend". No fallback to settled balance or other credits.
  const poolMatches = [...text.matchAll(/available\s+to\s+spend/gi)];
  if (poolMatches.length === 0) {
    return {
      error: "PARSE_FAILED",
      message: "Missing 'Available to spend' label on usage page.",
    };
  }
  if (poolMatches.length > 1) {
    return {
      error: "AMBIGUOUS_POOL",
      message: "Multiple 'Available to spend' sections detected; refusing ambiguous pool parsing.",
    };
  }

  // Find Available to spend amount
  const availMatch = text.match(/Available\s+to\s+spend[^\d$]*\$?\s*([0-9]+\.[0-9]+)/i);
  if (!availMatch) {
    return {
      error: "PARSE_FAILED",
      message: "Could not extract valid currency amount from 'Available to spend'.",
    };
  }

  const availableUsd = availMatch[1];
  const availableNanoUsd = parseExactDecimalToNanoUsd(availableUsd);
  if (availableNanoUsd === null) {
    return {
      error: "PARSE_FAILED",
      message: "Failed to parse available balance decimal or precision exceeds bounds (>9 decimals).",
    };
  }

  // Extract rate strictly from Compute - Medium | Runtime Seconds line item
  const mediumRate = extractMediumRuntimeRate(text);

  return {
    availableUsd,
    availableNanoUsd,
    mediumRate,
  };
}

/**
 * Reads quota snapshot from a verified browser connector.
 * Reuses existing tab only; does not open new tabs.
 * Refuses ambiguous multiple matching tabs.
 */
export async function getDockerBrowserQuota(
  config: DockerBrowserQuotaConfig,
): Promise<DockerBrowserQuotaResult> {
  const browser = config.browser;
  const resolver =
    config.testOverrideResolver ?? createChromeConnectorClientResolver();
  const client = config.testOverrideClient ?? resolver(browser);

  // 1. List tabs
  let tabsResult: unknown;
  try {
    tabsResult = await client.request("list_tabs", {});
  } catch {
    return {
      ok: false,
      code: "CONNECTOR_UNAVAILABLE",
      message: `Failed to communicate with ${browser} connector RPC.`,
    };
  }

  const tabs = Array.isArray((tabsResult as { tabs?: unknown[] })?.tabs)
    ? (tabsResult as { tabs: Array<{ id: string | number; url?: string }> }).tabs
    : [];

  // 2. Find exact host/path tabs
  const matchingTabs = tabs.filter((t) => t.url && isMatchingDockerUsageUrl(t.url));
  if (matchingTabs.length === 0) {
    return {
      ok: false,
      code: "USAGE_TAB_NOT_FOUND",
      message: `No open tab found matching ${DOCKER_USAGE_PAGE_URL}. Automatic tab opening is disabled in this phase.`,
    };
  }

  // Ambiguity guard: If multiple tabs match, do not arbitrarily pick the first one
  if (matchingTabs.length > 1) {
    return {
      ok: false,
      code: "AMBIGUOUS_TAB",
      message: `Multiple (${matchingTabs.length}) Docker usage tabs open; cannot disambiguate account. Please keep only one usage tab open.`,
    };
  }

  const matchingTab = matchingTabs[0];

  // 3. Read page
  let readResult: unknown;
  const tabId = String(matchingTab.id);
  try {
    readResult = await client.request("read_page", { tabId, detail: "compact" });
  } catch {
    return {
      ok: false,
      code: "CONNECTOR_UNAVAILABLE",
      message: `Failed to read page from ${browser} connector tab ${tabId}.`,
    };
  }

  const observation = readResult as {
    ok?: boolean;
    url?: string;
    text?: string;
    truncated?: boolean;
  };

  if (!observation || observation.ok === false) {
    return {
      ok: false,
      code: "PARSE_FAILED",
      message: "Failed to obtain compact page observation.",
    };
  }

  // 4. Parse content
  const parsed = parseDockerUsageContent({
    url: String(observation.url || ""),
    text: String(observation.text || ""),
    truncated: Boolean(observation.truncated),
  });

  if ("error" in parsed) {
    return {
      ok: false,
      code: parsed.error,
      message: parsed.message,
    };
  }

  return {
    ok: true,
    source: "docker-agentic-platform-browser",
    browser,
    observedAt: Date.now(),
    usageLagWarning:
      "Docker confirmed compute usage may have up to 24-48h billing lag. observedAt is browser read timestamp, not real-time billing ledger time.",
    availableToSpendUsd: parsed.availableUsd,
    availableToSpendNanoUsd: parsed.availableNanoUsd,
    mediumRuntimeRate: parsed.mediumRate,
  };
}
