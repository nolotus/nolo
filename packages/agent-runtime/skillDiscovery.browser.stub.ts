/**
 * Browser stub for skillDiscovery.ts.
 *
 * The real module uses node:fs / node:path for filesystem scanning and must
 * never enter a browser bundle. This stub preserves the named export contract
 * with safe no-op behavior so dynamic `import("./skillDiscovery")` in
 * noloWorkspaceTools.ts resolves cleanly under platform: "browser".
 */

export function parseSkillFrontmatter(_filePath: string): { name?: string; description?: string } {
  return {};
}

export function discoverSkills(_cwd: string): never[] {
  return [];
}

export function resolveSkillByName(_cwd: string, _name: string): null {
  return null;
}

export function buildSkillDiscoveryContextLayer(_cwd: string): null {
  return null;
}

export function buildSkillDiscoveryContextBlock(_cwd: string): null {
  return null;
}
