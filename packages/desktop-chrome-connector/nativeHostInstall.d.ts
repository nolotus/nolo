export function extensionIdFromPublicKey(publicKeyBase64: string): string;

export function resolveNativeHostInstallPaths(options?: {
  home?: string;
  connectorRoot?: string;
}): {
  connectorRoot: string;
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
  extensionId?: string;
  nodePath?: string;
}): {
  extensionId: string;
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
