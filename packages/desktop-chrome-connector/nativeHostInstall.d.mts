export const FIREFOX_EXTENSION_ID: string;

/** Browsers this installer can register a native messaging host for. */
export const NATIVE_HOST_BROWSERS: string[];

/** Platforms where a user-level native messaging manifest actually works (no Windows yet). */
export const NATIVE_HOST_SUPPORTED_PLATFORMS: string[];

/** Browsers that look installed on this machine (profile-directory check only, no profile is read). */
export function detectInstalledBrowsers(options?: { home?: string; platform?: string }): string[];

/**
 * Which browsers to register for: an explicit `browser` wins ("all" = every supported browser),
 * otherwise Chrome plus every other detected browser.
 */
export function resolveNativeHostInstallTargets(options?: {
  home?: string;
  platform?: string;
  browser?: string;
}): string[];

/** Registers several browsers at once, collecting per-browser failures instead of throwing. */
export function installNativeHostManifests(options?: {
  home?: string;
  connectorRoot?: string;
  platform?: string;
  extensionId?: string;
  nodePath?: string;
  browser?: string;
}): {
  installs: Array<{ browser: string } & Record<string, unknown>>;
  errors: Array<{ browser: string; message: string }>;
};

/**
 * Returns the throwaway-checkout root wrapping this path (a linked git worktree, or a path inside
 * `<checkout>/.worktrees/<name>`), or null when the path is stable enough to embed absolute paths in
 * a native messaging wrapper.
 */
export function isThrowawayCheckout(root: string): string | null;

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
