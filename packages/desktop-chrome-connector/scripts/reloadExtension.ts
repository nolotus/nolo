#!/usr/bin/env bun
/**
 * Reloads the running (unpacked) Nolo Browser Connector extension through the connector itself.
 *
 * Chrome only re-reads an unpacked extension's files when its service worker restarts, and the native
 * messaging port keeps that worker alive — so after changing extension code you need a reload. This
 * script asks the extension to do it: no clicking in chrome://extensions.
 *
 * Usage: bun packages/desktop-chrome-connector/scripts/reloadExtension.ts
 */
import { createChromeConnectorClient } from "../chromeConnector";

const client = createChromeConnectorClient();

try {
  const result = await client.request("reload_extension", {});
  console.log(`[reload-extension] requested: ${JSON.stringify(result)}`);
  console.log("[reload-extension] the worker restarts within ~1s; verify with a connector_info call");
} catch (error) {
  const typed = error as Error & { code?: string };
  console.error(`[reload-extension] failed: ${typed.code ?? ""} ${typed.message}`);
  process.exit(1);
}
