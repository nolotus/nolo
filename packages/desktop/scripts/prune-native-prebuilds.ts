import { existsSync } from "node:fs";
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

const CLASSIC_LEVEL_PACKAGE = "classic-level";

/**
 * 打包前的载荷合规剪枝（2026-09-16 事故，见 docs/incidents 同名记录）。
 *
 * electrobun 自解压器（Setup 安装器与 in-app 更新 apply 共用）不支持 GNU
 * longname（'L'）tar 记录：任何超过 100 字符的路径都会让 GNU tar 写出 'L' 记录，
 * 解包随即以 TarUnsupportedFileType 中止（实测：alpha.3 Linux 载荷含 110 个 'L'
 * 记录，官方 Setup 安装器解到第 770 个条目即停；PAX、符号链接可正常解出，硬链接
 * 同样不支持）。classic-level 里与运行时无关的 C 源码/头文件（deps/）与非本平台
 * prebuilds 会把路径推到 103–116 字符，必须在打包前从 staged 副本剪掉。
 *
 * musl 变体一并删除：桌面端 Linux 产物要求 glibc（CEF 亦不支持 musl），
 * node-gyp-build 在 glibc 上只会加载 classic-level.node；保留它会让路径达到
 * 103 字符并重新触发上面的问题。
 *
 * 只动 `.generated/vendor` 的 staged 副本，不碰仓库 node_modules；闸门见
 * scripts/verify/desktop/verifyElectrobunPayloadCompat.ts。
 */
export async function pruneStagedClassicLevelForPackaging(
  stagedNodeModulesDir: string,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): Promise<{ removed: string[] }> {
  const classicLevelDir = join(stagedNodeModulesDir, CLASSIC_LEVEL_PACKAGE);
  if (!existsSync(classicLevelDir)) return { removed: [] };

  const normalizedPlatform = resolveNormalizedPlatform(platform);
  const removed: string[] = [];

  const depsDir = join(classicLevelDir, "deps");
  if (existsSync(depsDir)) {
    await rm(depsDir, { recursive: true, force: true });
    removed.push("deps");
  }

  const prebuildsDir = join(classicLevelDir, "prebuilds");
  if (existsSync(prebuildsDir)) {
    const entries = await readdir(prebuildsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!prebuildDirMatchesTarget(entry.name, normalizedPlatform, arch)) {
        await rm(join(prebuildsDir, entry.name), { recursive: true, force: true });
        removed.push(`prebuilds/${entry.name}`);
        continue;
      }
      if (!entry.isDirectory()) continue;
      for (const file of await readdir(join(prebuildsDir, entry.name))) {
        if (!file.endsWith(".musl.node")) continue;
        await rm(join(prebuildsDir, entry.name, file), { force: true });
        removed.push(`prebuilds/${entry.name}/${file}`);
      }
    }
  }

  return { removed };
}
