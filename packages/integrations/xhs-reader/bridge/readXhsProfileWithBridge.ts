/**
 * XHS Profile Reader Bridge
 *
 * Uses an anonymous desktop Playwright context to collect only the profile +
 * notes that XHS exposes to logged-out public visitors. By default the bridge
 * keeps a tool-owned anonymous visitor profile so the browser does not look
 * brand new on every run, while refusing pages that visibly look logged in.
 *
 * Does NOT store or output cookies/xsecToken in results.
 */

import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { collectXhsProfile } from "../orchestrator";
import type { CollectXhsProfileOptions } from "../orchestrator";
import type { XhsReadResult, XhsProfileCollection } from "../types";
import { createXhsFailure } from "../types";
import { redactXhsSensitiveValue } from "../redaction";
import { join } from "node:path";

export type ReadXhsProfileWithBridgeOptions = {
  /** Canonical field name. */
  profileUrl?: string;
  /** Alias accepted from tool args (tool schema uses `url`). */
  url?: string;
  maxScrollPages?: number;
  enrichDetails?: boolean;
  includeComments?: boolean;
  maxCommentPagesPerNote?: number;
  minLikesForDetail?: number;
  minCommentsForCollect?: number;
  extendedCollectionConsent?: boolean;
  headless?: boolean;
  timeoutMs?: number;
  collectionMode?: "conservative" | "assisted";
  assistedAction?: "snapshot" | "read_more_notes" | "read_visible_details" | "discover_indexed_notes";
  maxAssistedSteps?: number;
  indexedNoteUrls?: string[];
  /**
   * `persistent` uses a tool-owned anonymous visitor profile directory.
   * Caller-supplied browser profiles are intentionally ignored.
   */
  anonymousSessionMode?: "persistent" | "ephemeral";
  /**
   * `homepage_warmup_then_profile` better matches a logged-out real-user route:
   * open /explore first, close visible login prompts, then visit the profile.
   */
  accessPattern?: "homepage_warmup_then_profile" | "direct_profile";
};

/**
 * Pure helper: resolve the profile URL from options, supporting both
 * `profileUrl` (canonical) and `url` (tool schema alias).
 * Returns undefined if neither is provided.
 */
export function resolveXhsBridgeProfileUrl(
  options: Pick<ReadXhsProfileWithBridgeOptions, "profileUrl" | "url">,
): string | undefined {
  return options.profileUrl ?? options.url;
}

export function resolveXhsAnonymousUserDataDir(baseDir?: string): string {
  const root =
    baseDir ??
    process.env.NOLO_XHS_READER_ANONYMOUS_PROFILE_ROOT ??
    process.env.XDG_STATE_HOME ??
    (process.env.HOME ? join(process.env.HOME, ".nolo") : join(process.cwd(), ".nolo"));
  return join(root, "xhs-anonymous-visitor");
}

export function sanitizeXhsBridgeOptions(
  options: ReadXhsProfileWithBridgeOptions,
): ReadXhsProfileWithBridgeOptions {
  const wantsMoreNotes =
    options.extendedCollectionConsent === true &&
    options.collectionMode === "assisted" &&
    options.assistedAction === "read_more_notes";
  const wantsVisibleDetails =
    options.extendedCollectionConsent === true &&
    options.collectionMode === "assisted" &&
    options.assistedAction === "read_visible_details";
  const wantsIndexedNotes =
    options.extendedCollectionConsent === true &&
    options.collectionMode === "assisted" &&
    options.assistedAction === "discover_indexed_notes";

  return {
    profileUrl: options.profileUrl,
    url: options.url,
    anonymousSessionMode:
      options.anonymousSessionMode === "ephemeral" ? "ephemeral" : "persistent",
    accessPattern:
      options.accessPattern === "direct_profile"
        ? "direct_profile"
        : "homepage_warmup_then_profile",
    maxScrollPages: wantsMoreNotes ? 1 : 0,
    enrichDetails: wantsVisibleDetails || wantsIndexedNotes,
    includeComments: wantsVisibleDetails || wantsIndexedNotes,
    maxCommentPagesPerNote: wantsVisibleDetails || wantsIndexedNotes ? 3 : 1,
    minLikesForDetail: undefined,
    minCommentsForCollect: undefined,
    extendedCollectionConsent: wantsMoreNotes || wantsVisibleDetails || wantsIndexedNotes,
    collectionMode: wantsMoreNotes || wantsVisibleDetails || wantsIndexedNotes ? "assisted" : "conservative",
    assistedAction: wantsMoreNotes
      ? "read_more_notes"
      : wantsVisibleDetails
        ? "read_visible_details"
        : wantsIndexedNotes
          ? "discover_indexed_notes"
          : "snapshot",
    maxAssistedSteps: 1,
    headless: false,
    timeoutMs: options.timeoutMs,
    indexedNoteUrls: wantsIndexedNotes
      ? (options.indexedNoteUrls ?? []).slice(0, 3)
      : undefined,
  };
}

export function resolveXhsDesktopBrowserChannel(value: string | undefined): string | undefined {
  const normalized = asTrimmedLowercaseString(value ?? "stable");
  if (!normalized || normalized === "chromium" || normalized === "bundled" || normalized === "none") {
    return undefined;
  }
  if (normalized === "stable" || normalized === "chrome" || normalized === "google-chrome") {
    return "chrome";
  }
  if (normalized === "beta" || normalized === "chrome-beta") return "chrome-beta";
  if (normalized === "dev" || normalized === "chrome-dev") return "chrome-dev";
  if (normalized === "canary" || normalized === "chrome-canary") return "chrome-canary";
  if (normalized === "msedge" || normalized === "edge") return "msedge";
  return normalized;
}

function envFlagEnabled(value: string | undefined): boolean | undefined {
  if (value == null) return undefined;
  return !["0", "false", "no", "off"].includes(asTrimmedLowercaseString(value));
}

async function contextHasXhsLoginCookies(context: any): Promise<boolean> {
  try {
    if (typeof context?.cookies !== "function") return false;
    const cookies = await context.cookies("https://www.xiaohongshu.com");
    return (cookies ?? []).some((cookie: { name?: string; value?: string }) =>
      isXhsLoginCookieName(String(cookie.name ?? "")) &&
      String(cookie.value ?? "").length > 0
    );
  } catch {
    return false;
  }
}

export function isXhsLoginCookieName(name: string): boolean {
  return /^(web_session|access-token|access_token)$/i.test(name.trim());
}

async function pageLooksLoggedIn(page: any): Promise<boolean> {
  try {
    return Boolean(await page.evaluate(() => {
      const body = document.body?.innerText ?? "";
      return /退出登录|编辑资料/.test(body);
    }));
  } catch {
    return false;
  }
}

async function humanPacedExploreWarmup(page: any) {
  await page.goto("https://www.xiaohongshu.com/explore", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout?.(800);
  await page.mouse?.move?.(360, 260, { steps: 12 });
  await page.mouse?.wheel?.(0, 420);
  await page.waitForTimeout?.(1200);
  await page.mouse?.move?.(760, 520, { steps: 10 });
  await page.waitForTimeout?.(700);
}

/**
 * Read an XHS profile using an anonymous desktop Playwright context.
 * No caller-supplied profile, XHS account, or login-state reuse is allowed.
 */
export async function readXhsProfileWithBridge(
  optionsRaw: ReadXhsProfileWithBridgeOptions,
): Promise<XhsReadResult<XhsProfileCollection>> {
  const options = sanitizeXhsBridgeOptions(optionsRaw);
  const {
    profileUrl: profileUrlRaw,
    url: urlAlias,
    maxScrollPages = 0,
    maxCommentPagesPerNote = 1,
    enrichDetails = false,
    includeComments = false,
    extendedCollectionConsent = false,
    indexedNoteUrls,
    anonymousSessionMode = "persistent",
    accessPattern = "homepage_warmup_then_profile",
    headless = envFlagEnabled(process.env.NOLO_XHS_READER_HEADLESS) ?? false,
    timeoutMs = 120_000,
  } = options;

  // Support both `profileUrl` (canonical) and `url` (tool schema alias)
  const profileUrl = resolveXhsBridgeProfileUrl({ profileUrl: profileUrlRaw, url: urlAlias });
  if (!profileUrl) {
    return createXhsFailure({
      code: "parse_error",
      message: "readXhsProfileWithBridge requires a profile URL (profileUrl or url).",
    });
  }

  let playwright: any;
  try {
    playwright = await import("playwright");
  } catch {
    return createXhsFailure({
      code: "unknown",
      message:
        "Playwright is not installed. Run `bun add playwright` or `npx playwright install chromium` first.",
    });
  }

  // Wrap the entire Playwright + orchestrator operation in a timeout
  // so that browser launch time is also bounded.
  const timeoutPromise = new Promise<XhsReadResult<XhsProfileCollection>>(
    (_, reject) => {
      const timer = setTimeout(() => {
        reject(
          Object.assign(
            new Error(`read_xhs_profile timed out after ${timeoutMs}ms`),
            { code: "READ_XHS_PROFILE_TIMEOUT" },
          ),
        );
      }, timeoutMs);
      if (typeof timer === "object" && "unref" in timer) timer.unref();
    },
  );

  const workPromise = (async () => {
    let browser: any = null;
    let context: any = null;
    try {
      const launchOptions = {
        headless,
        args: [
          ...(headless ? [] : ["--start-maximized"]),
          "--disable-dev-shm-usage",
        ],
      };
      const desktopChannel = resolveXhsDesktopBrowserChannel(
        process.env.NOLO_XHS_READER_DESKTOP_CHANNEL,
      );
      if (anonymousSessionMode === "persistent") {
        const userDataDir = resolveXhsAnonymousUserDataDir();
        if (desktopChannel) {
          try {
            context = await playwright.chromium.launchPersistentContext(userDataDir, {
              ...launchOptions,
              channel: desktopChannel,
              viewport: headless ? { width: 1440, height: 900 } : null,
              locale: "zh-CN",
            });
          } catch {
            // Fall back to bundled Chromium if the requested desktop browser is not installed.
          }
        }
        if (!context) {
          context = await playwright.chromium.launchPersistentContext(userDataDir, {
            ...launchOptions,
            viewport: headless ? { width: 1440, height: 900 } : null,
            locale: "zh-CN",
          });
        }
      }

      if (!context && desktopChannel) {
        try {
          browser = await playwright.chromium.launch({
            ...launchOptions,
            channel: desktopChannel,
          });
        } catch {
          // Fall back to bundled Chromium if the requested desktop browser is not installed.
        }
      }
      if (!context && !browser) {
        browser = await playwright.chromium.launch(launchOptions);
      }
      if (!context) {
        context = await browser.newContext({
          viewport: headless ? { width: 1440, height: 900 } : null,
          locale: "zh-CN",
        });
      }

      const page = await context.newPage();

      if (accessPattern === "homepage_warmup_then_profile") {
        await humanPacedExploreWarmup(page);
        const hasAuthCookie = await contextHasXhsLoginCookies(context);
        const looksLoggedIn = await pageLooksLoggedIn(page);
        if (hasAuthCookie && looksLoggedIn) {
          return createXhsFailure({
            code: "blocked",
            message:
              "Tool-owned XHS anonymous visitor profile appears logged in after homepage warmup; refusing to read.",
          });
        }
      }

      const orchestratorOptions: CollectXhsProfileOptions = {
        profileUrl,
        maxScrollPages: extendedCollectionConsent ? maxScrollPages : 0,
        enrichDetails,
        includeComments,
        maxCommentPagesPerNote: extendedCollectionConsent
          ? maxCommentPagesPerNote
          : 1,
        indexedNoteUrls: extendedCollectionConsent ? indexedNoteUrls : undefined,
        page,
      };

      const result = await collectXhsProfile(orchestratorOptions);

      // Final redaction pass (cookies should already be stripped by orchestrator)
      return redactXhsSensitiveValue(result) as XhsReadResult<XhsProfileCollection>;
    } finally {
      if (context) {
        try {
          await context.close();
        } catch {
          // ignore close errors
        }
      }
      if (browser) {
        try {
          await browser.close();
        } catch {
          // ignore close errors
        }
      }
    }
  })();

  try {
    return await Promise.race([workPromise, timeoutPromise]);
  } catch (err: any) {
    if (err?.code === "READ_XHS_PROFILE_TIMEOUT") {
      return createXhsFailure({
        code: "network_error",
        message: err.message,
      });
    }
    return createXhsFailure({
      code: "network_error",
      message: `XHS profile read failed: ${String(err?.message ?? err)}`,
    });
  }
}
