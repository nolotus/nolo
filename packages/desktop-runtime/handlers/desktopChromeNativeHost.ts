// @ts-nocheck
// Re-export native host helpers so the strict server graph can import without TS6307 on the .mjs source.
export {
  FIREFOX_EXTENSION_ID,
  NATIVE_HOST_BROWSERS,
  NATIVE_HOST_SUPPORTED_PLATFORMS,
  detectInstalledBrowsers,
  extensionIdFromPublicKey,
  installNativeHostManifest,
  installNativeHostManifests,
  isThrowawayCheckout,
  resolveNativeHostInstallPaths,
  resolveNativeHostInstallTargets,
} from "../../desktop-chrome-connector/nativeHostInstall.mjs";
