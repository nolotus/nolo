import { readdir, rm } from "node:fs/promises";
import { join } from "node:path";

export function resolveNormalizedPlatform(
  platform: NodeJS.Platform = process.platform
): string {
  if (platform === "win32") return "win32";
  if (platform === "darwin") return "darwin";
  if (platform === "linux") return "linux";
  if (platform === "android") return "android";
  throw new Error(`Unsupported platform for native prebuild pruning: ${platform}`);
}

function prebuildDirMatchesTarget(dirName: string, platform: string, arch: string): boolean {
  const [osPart, archPartRaw] = dirName.split("-");
  if (osPart !== platform) return false;
  if (!archPartRaw) return false;
  const archParts = archPartRaw.split("+");
  if (arch === "x64") return archParts.includes("x64");
  if (arch === "arm64") return archParts.includes("arm64");
  if (arch === "ia32") return archParts.includes("ia32");
  if (arch === "arm") return archParts.includes("arm");
  return false;
}

/**
 * Remove classic-level prebuild binaries for platforms other than the current
 * build target. The packaged app only needs the native .node for the platform it
 * is being installed on; shipping all seven platform trees wastes ~4MB and is a
 * potential AV/security surface for unsigned foreign binaries.
 */
export async function pruneClassicLevelPrebuilds(
  payloadDir: string,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): Promise<void> {
  const normalizedPlatform = resolveNormalizedPlatform(platform);
  const prebuildsDir = join(
    payloadDir,
    "Resources",
    "app",
    "node_modules",
    "classic-level",
    "prebuilds"
  );

  let entries: string[];
  try {
    entries = await readdir(prebuildsDir);
  } catch (error: any) {
    if (error?.code === "ENOENT") return;
    throw error;
  }

  for (const entry of entries) {
    if (prebuildDirMatchesTarget(entry, normalizedPlatform, arch)) continue;
    await rm(join(prebuildsDir, entry), { recursive: true, force: true });
  }
}
