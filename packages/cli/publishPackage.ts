/**
 * Build a publish-safe package.json manifest by removing workspace dependencies.
 * 
 * Workspace dependencies (e.g., "workspace:*") should not be published to npm
 * as they only resolve within the monorepo workspace.
 * 
 * @param manifest - The input package.json manifest object
 * @returns A new manifest with workspace dependencies removed
 */
export function buildPublishManifest(manifest: Record<string, any>): Record<string, any> {
  const result = { ...manifest };

  // Strip workspace deps from all dependency fields
  const depFields = ["dependencies", "devDependencies", "peerDependencies"] as const;
  
  for (const field of depFields) {
    if (result[field]) {
      const filtered: Record<string, string> = {};
      for (const [name, version] of Object.entries(result[field])) {
        // Skip workspace: protocol dependencies
        if (typeof version === "string" && !version.startsWith("workspace:")) {
          filtered[name] = version;
        }
      }
      
      // Only set the field if there are non-workspace deps
      if (Object.keys(filtered).length > 0) {
        result[field] = filtered;
      } else {
        delete result[field];
      }
    }
  }

  return result;
}
