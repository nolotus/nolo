/**
 * Browser-specific manifest variants for the Nolo Browser Connector.
 *
 * The checked-in `extension/manifest.json` is the Chrome variant. Firefox needs three changes:
 * a `browser_specific_settings.gecko` block with a fixed extension id, no `key` (AMO rejects a
 * manifest `key`), and a classic scripts background (Firefox does not run MV3 service workers).
 * Everything else — permissions, host_permissions, locales, action, icons — ships as-is.
 *
 * This module is imported by `scripts/buildStorePackage.mjs` and by tests; it must stay free of
 * `chrome.*` and Node-specific globals beyond plain JSON manipulation.
 */

import { FIREFOX_EXTENSION_ID } from "./nativeHostInstall.mjs";

/**
 * The "debugger" permission is Chrome-only: Firefox implements no `chrome.debugger` API, and
 * `web-ext lint` flags unknown manifest permissions as errors. The runtime guards every debugger
 * call site with `typeof chrome.debugger`, so the permission is dropped instead of emulated.
 */
export const FIREFOX_DROPPED_PERMISSIONS = Object.freeze(["debugger"]);

/**
 * Firefox scopes `tabs.captureVisibleTab` differently from Chrome: host grants for http and
 * https patterns are not enough — the call fails with "Missing activeTab permission" unless
 * the manifest requests `<all_urls>` (or `activeTab` was granted by a fresh user gesture, which
 * an unattended screenshot never has). Measured on Firefox 156 during the BiDi E2E run.
 * The Chrome build keeps the narrower http/https pair.
 */
export const FIREFOX_EXTRA_HOST_PERMISSIONS = Object.freeze(["<all_urls>"]);

export function buildFirefoxManifest(manifest) {
  const firefox = JSON.parse(JSON.stringify(manifest));
  delete firefox.key;
  // The checked-in manifest already declares the gecko block (Chrome ignores the whole key);
  // re-assert the id here so the packaged variant can never drift from FIREFOX_EXTENSION_ID.
  firefox.browser_specific_settings = {
    ...(firefox.browser_specific_settings ?? {}),
    gecko: {
      id: FIREFOX_EXTENSION_ID,
      strict_min_version: "140.0",
      ...(firefox.browser_specific_settings?.gecko ?? {}),
    },
  };
  firefox.permissions = (Array.isArray(firefox.permissions) ? firefox.permissions : []).filter(
    (permission) => !FIREFOX_DROPPED_PERMISSIONS.includes(permission),
  );
  const hostPermissions = Array.isArray(firefox.host_permissions) ? firefox.host_permissions : [];
  for (const extra of FIREFOX_EXTRA_HOST_PERMISSIONS) {
    if (!hostPermissions.includes(extra)) hostPermissions.push(extra);
  }
  firefox.host_permissions = hostPermissions;
  const serviceWorker = firefox.background?.service_worker;
  if (serviceWorker) {
    // Firefox MV3 runs a persistent-less background *page* (event page), not a service worker.
    // `type: "module"` is supported so the worker's `import` graph ships unchanged.
    firefox.background = { scripts: [serviceWorker], type: "module" };
  }
  return firefox;
}
