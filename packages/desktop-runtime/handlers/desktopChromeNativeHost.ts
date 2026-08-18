// @ts-nocheck
// Re-export native host helpers so the strict server graph can import without TS6307 on the .mjs source.
export {
  extensionIdFromPublicKey,
  installNativeHostManifest,
  resolveNativeHostInstallPaths,
} from "desktop-chrome-connector/nativeHostInstall.mjs";
