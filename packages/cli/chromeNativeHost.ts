// @ts-nocheck
// Re-export native host helpers so the CLI graph can import the installer without TS6307 on the
// .mjs source (same wrapper the desktop runtime uses:
// packages/desktop-runtime/handlers/desktopChromeNativeHost.ts).
export {
  extensionIdFromPublicKey,
  installNativeHostManifest,
  resolveNativeHostInstallPaths,
} from "../desktop-chrome-connector/nativeHostInstall.mjs";
