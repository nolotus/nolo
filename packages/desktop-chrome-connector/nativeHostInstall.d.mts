export function extensionIdFromPublicKey(publicKeyBase64: string): string;

export type NativeHostBrowser = "chrome" | "firefox";

export function nativeMessagingHostsDir(options?: {
  home?: string;
  platform?: string;
  browser?: NativeHostBrowser;
}): string;

export function resolveNativeHostInstallPaths(options?: {
  home?: string;
  connectorRoot?: string;
  platform?: string;
  browser?: NativeHostBrowser;
}): {
  connectorRoot: string;
  browser: NativeHostBrowser;
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
  browser?: NativeHostBrowser;
}): {
  extensionId: string;
  nodePath: string;
  tokenPath: string;
  connectorRoot: string;
  browser: NativeHostBrowser;
  extensionManifestPath: string;
  hostPath: string;
  templatePath: string;
  nativeManifestPath: string;
  supportDir: string;
  wrapperPath: string;
};
