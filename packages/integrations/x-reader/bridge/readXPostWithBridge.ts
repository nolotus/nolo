import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import type { XPost, XReadResult } from "../types";
import {
  createLocalBrowserBackend,
  type LocalBrowserReader,
} from "../backends/localBrowser";
import { createRawCdpXReader } from "../backends/rawCdp";
import {
  createChromeBridgeManager,
  type ChromeBridgeManager,
} from "./chromeBridgeManager";

export type ReadXPostWithBridgeOptions = {
  bridge?: ChromeBridgeManager;
  readerFactory?: (endpoint: string) => LocalBrowserReader;
  keepOpen?: boolean;
  chromePath?: string;
  profileDir?: string;
  profileRoot?: string;
  headless?: boolean;
};

function envFlagEnabled(value: string | undefined) {
  if (value == null) return undefined;
  return !["0", "false", "no", "off"].includes(asTrimmedLowercaseString(value));
}

async function resolveDefaultChromePath() {
  const envPath = process.env.NOLO_X_READER_CHROME_PATH?.trim();
  if (envPath) {
    return envPath;
  }

  if (process.platform !== "win32") {
    try {
      const { chromium } = await import("playwright");
      return chromium.executablePath();
    } catch {
      // Fall back to PATH-based Chrome lookup below.
    }
  }

  return process.platform === "win32"
    ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
    : process.platform === "darwin"
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : "google-chrome";
}

export async function readXPostWithBridge(
  url: string,
  options: ReadXPostWithBridgeOptions = {},
): Promise<XReadResult<XPost>> {
  const bridge =
    options.bridge ??
    createChromeBridgeManager({
      chromePath: options.chromePath ?? resolveDefaultChromePath,
      profileDir: options.profileDir ?? process.env.NOLO_X_READER_PROFILE_DIR,
      profileRoot: options.profileRoot ?? process.env.NOLO_X_READER_PROFILE_ROOT,
      headless:
        options.headless ??
        envFlagEnabled(process.env.NOLO_X_READER_HEADLESS) ??
        true,
    });
  const session = await bridge.start();
  try {
    const reader =
      options.readerFactory?.(session.endpoint) ??
      createRawCdpXReader({ endpoint: session.endpoint });
    return await createLocalBrowserBackend(reader).readPost(url);
  } finally {
    if (!options.keepOpen) {
      await bridge.stop();
    }
  }
}
