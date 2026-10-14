export const FIREFOX_EXTENSION_ID: string;

export function extensionIdFromPublicKey(publicKeyBase64: string): string;

/**
 * `browser` is typed as `string` on purpose: the implementation validates it at
 * runtime (only "chrome" and "firefox" are supported, anything else throws), so
 * narrowing to a union here would make callers that assert the throw stop
 * type-checking. See nativeHostInstall.mjs nativeMessagingHostsDir().
 */
export function nativeMessagingHostsDir(options?: {
  home?: string;
  platform?: string;
  browser?: string;
}): string;

/** The resolved `browser` is echoed back in the returned paths. */
export function resolveNativeHostInstallPaths(options?: {
  home?: string;
  connectorRoot?: string;
  platform?: string;
  browser?: string;
}): {
  connectorRoot: string;
  browser: string;
  extensionManifestPath: string;
  hostPath: string;
  templatePath: string;
  nativeManifestPath: string;
  supportDir: string;
  tokenPath: string;
  wrapperPath: string;
};

export function installNativeHostManifest(options?: {
  home?: string;
  connectorRoot?: string;
  platform?: string;
  extensionId?: string;
  nodePath?: string;
  browser?: string;
}): {
  extensionId: string;
  browser: string;
  nodePath: string;
  tokenPath: string;
  connectorRoot: string;
  extensionManifestPath: string;
  hostPath: string;
  templatePath: string;
  nativeManifestPath: string;
  supportDir: string;
  wrapperPath: string;
};
