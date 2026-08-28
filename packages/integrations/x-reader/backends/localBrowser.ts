import {
  createXReadFailure,
  type XPost,
  type XReaderBackend,
  type XReadResult,
  type XThread,
} from "../types";
import { parseVisibleXPostText } from "../visibleTextParser";

export type LocalBrowserReader = {
  readVisiblePost(url: string): Promise<XReadResult<XPost>>;
  readVisibleThread(url: string): Promise<XReadResult<XThread>>;
};

export function createLocalBrowserBackend(
  reader?: LocalBrowserReader,
): XReaderBackend {
  return {
    name: "desktop_local_browser",
    async readPost(url: string): Promise<XReadResult<XPost>> {
      if (!reader) {
        return createXReadFailure({
          code: "not_connected",
          message: "Local browser reader is not connected.",
          nextStep:
            "Start the desktop browser bridge or inject a LocalBrowserReader.",
          backend: "desktop_local_browser",
        });
      }
      return reader.readVisiblePost(url);
    },
    async readThread(url: string): Promise<XReadResult<XThread>> {
      if (!reader) {
        return createXReadFailure({
          code: "not_connected",
          message: "Local browser reader is not connected.",
          nextStep:
            "Start the desktop browser bridge or inject a LocalBrowserReader.",
          backend: "desktop_local_browser",
        });
      }
      return reader.readVisibleThread(url);
    },
  };
}

export type PlaywrightXReaderOptions = {
  headless?: boolean;
  timeoutMs?: number;
  channel?: "chrome" | "msedge";
};

export type CdpXReaderOptions = {
  endpoint: string;
  timeoutMs?: number;
};

export function createPlaywrightXReader(
  options: PlaywrightXReaderOptions = {},
): LocalBrowserReader {
  const timeoutMs = options.timeoutMs ?? 20000;

  async function closeBrowser(browser: { close(): Promise<void> } | undefined) {
    if (!browser) {
      return;
    }

    await Promise.race([
      browser.close(),
      new Promise<void>((resolve) => setTimeout(resolve, 3000)),
    ]);
  }

  return {
    async readVisiblePost(url: string): Promise<XReadResult<XPost>> {
      const fetchedAt = new Date().toISOString();
      let browser: {
        close(): Promise<void>;
        newPage(options?: { viewport?: { width: number; height: number } }): Promise<any>;
      } | undefined;

      try {
        const { chromium } = await import("playwright");
        browser = await chromium.launch({
          headless: options.headless ?? true,
          timeout: timeoutMs,
          channel: options.channel,
        });
        const page = await browser.newPage({
          viewport: { width: 1280, height: 900 },
        });
        page.setDefaultTimeout(timeoutMs);
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });
        await page.waitForTimeout(2500);
        const visibleText = await page.locator("body").innerText({
          timeout: timeoutMs,
        });

        return parseVisibleXPostText(visibleText, {
          url,
          fetchedAt,
        });
      } catch (error) {
        return createXReadFailure({
          code: "network_error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown local browser read failure.",
          nextStep:
            "Check network access, Playwright browser installation, and X login/challenge state.",
          backend: "desktop_local_browser",
          fetchedAt,
        });
      } finally {
        await closeBrowser(browser);
      }
    },
    async readVisibleThread(url: string): Promise<XReadResult<XThread>> {
      const postResult = await this.readVisiblePost(url);
      if (!postResult.ok) {
        return postResult;
      }

      return {
        ok: true,
        backend: "desktop_local_browser",
        fetchedAt: postResult.fetchedAt,
        data: {
          root: postResult.data,
          posts: [postResult.data],
          completeness: "single_post",
          missingReason: "unsupported_content",
        },
      };
    },
  };
}

export function createCdpXReader(options: CdpXReaderOptions): LocalBrowserReader {
  const timeoutMs = options.timeoutMs ?? 20000;

  return {
    async readVisiblePost(url: string): Promise<XReadResult<XPost>> {
      const fetchedAt = new Date().toISOString();
      let browser: { close(): Promise<void>; newPage(): Promise<any> } | undefined;

      try {
        const { chromium } = await import("playwright");
        browser = await chromium.connectOverCDP(options.endpoint, {
          timeout: timeoutMs,
        });
        const page = await browser.newPage();
        page.setDefaultTimeout(timeoutMs);
        await page.setViewportSize({ width: 1280, height: 900 });
        await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: timeoutMs,
        });
        await page.waitForTimeout(2500);
        const visibleText = await page.locator("body").innerText({
          timeout: timeoutMs,
        });

        return parseVisibleXPostText(visibleText, {
          url,
          fetchedAt,
        });
      } catch (error) {
        return createXReadFailure({
          code: "network_error",
          message:
            error instanceof Error
              ? error.message
              : "Unknown CDP browser read failure.",
          nextStep:
            "Start Chrome with --remote-debugging-port or check the CDP endpoint.",
          backend: "desktop_local_browser",
          fetchedAt,
        });
      } finally {
        await closeCdp(browser);
      }
    },
    async readVisibleThread(url: string): Promise<XReadResult<XThread>> {
      const postResult = await this.readVisiblePost(url);
      if (!postResult.ok) {
        return postResult;
      }

      return {
        ok: true,
        backend: "desktop_local_browser",
        fetchedAt: postResult.fetchedAt,
        data: {
          root: postResult.data,
          posts: [postResult.data],
          completeness: "single_post",
          missingReason: "unsupported_content",
        },
      };
    },
  };
}

async function closeCdp(browser: { close(): Promise<void> } | undefined) {
  if (!browser) {
    return;
  }

  await Promise.race([
    browser.close(),
    new Promise<void>((resolve) => setTimeout(resolve, 3000)),
  ]);
}
