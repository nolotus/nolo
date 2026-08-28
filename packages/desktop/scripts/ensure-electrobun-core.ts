/**
 * Ensure Electrobun's platform core binaries are present in
 * node_modules/electrobun/dist-<platform>-<arch>/.
 *
 * The Electrobun npm package (1.18.4-beta.6 on Windows) ships without
 * ElectrobunCore.dll in dist-win-x64/.  The CLI launcher (bin/electrobun.cjs)
 * only auto-downloads the CLI tarball, not the core tarball, so dev/build
 * fails with ENOENT for ElectrobunCore.dll.
 *
 * This script detects the gap and downloads the matching core tarball from
 * the Electrobun GitHub release, extracting it into the expected dist
 * directory so electrobun dev / build can proceed.
 *
 * Usage:
 *   bun packages/desktop/scripts/ensure-electrobun-core.ts
 *   bun packages/desktop/scripts/ensure-electrobun-core.ts --force
 *   NOLO_DESKTOP_SKIP_ELECTROBUN_CORE=1 → no-op success
 */

import { existsSync } from "node:fs";
import { mkdir, rm, readdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";

const repoRoot = resolve(import.meta.dir, "../../..");
const electrobunDir = join(repoRoot, "node_modules", "electrobun");

type PlatformArch = {
  key: string;
  distDir: string;
  sentinel: string;
};

function resolveTarget(platform: NodeJS.Platform = process.platform): PlatformArch | null {
  if (platform === "win32") {
    return {
      key: "win-x64",
      distDir: join(electrobunDir, "dist-win-x64"),
      sentinel: "ElectrobunCore.dll",
    };
  }
  // macOS and Linux npm packages include core binaries; only Windows is known
  // to be incomplete in 1.18.4-beta.6.  Return null to skip on other platforms.
  return null;
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }
  await mkdir(dirname(destPath), { recursive: true });
  const buffer = Buffer.from(await response.arrayBuffer());
  await Bun.write(destPath, buffer);
}

async function extractTarGz(archivePath: string, destDir: string): Promise<void> {
  await mkdir(destDir, { recursive: true });
  // Use Windows built-in tar (System32\tar.exe) to avoid Git Bash path issues.
  const systemTar =
    process.platform === "win32"
      ? join(process.env.SystemRoot || "C:\\Windows", "System32", "tar.exe")
      : "tar";
  const tarBin = existsSync(systemTar) ? systemTar : "tar";
  const proc = Bun.spawn([tarBin, "-xzf", archivePath, "-C", destDir], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`tar extract failed for ${archivePath} (exit ${code})`);
  }
}

/**
 * Recursively verify that the sentinel file exists in the dist directory
 * (it may be nested after extraction).
 */
async function findFile(rootDir: string, name: string): Promise<string | null> {
  const stack = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.name === name) return full;
    }
  }
  return null;
}

export async function ensureElectrobunCore(options?: {
  platform?: NodeJS.Platform;
  force?: boolean;
}): Promise<{ skipped?: boolean; patched?: boolean; distDir: string }> {
  if (process.env.NOLO_DESKTOP_SKIP_ELECTROBUN_CORE === "1") {
    return { skipped: true, distDir: "" };
  }

  const platform = options?.platform ?? process.platform;
  const target = resolveTarget(platform);
  if (!target) {
    return { skipped: true, distDir: "" };
  }

  const force = options?.force === true || process.argv.includes("--force");

  if (!force && existsSync(join(target.distDir, target.sentinel))) {
    return { skipped: true, distDir: target.distDir };
  }

  // Read the installed electrobun version to download the matching release.
  const pkgPath = join(electrobunDir, "package.json");
  if (!existsSync(pkgPath)) {
    throw new Error(`Cannot find electrobun package.json at ${pkgPath}`);
  }
  const pkg = JSON.parse(await Bun.file(pkgPath).text()) as { version: string };
  const tag = `v${pkg.version}`;
  const tarballName = `electrobun-core-${target.key}.tar.gz`;
  const url = `https://github.com/blackboardsh/electrobun/releases/download/${tag}/${tarballName}`;

  const cacheDir = join(electrobunDir, ".cache");
  const archivePath = join(cacheDir, tarballName);

  console.log(`[ensure-electrobun-core] downloading ${tarballName} for ${tag}...`);
  await downloadToFile(url, archivePath);

  // Extract into a temp dir, then copy missing files into distDir.
  const extractDir = join(cacheDir, `extract-core-${target.key}`);
  await rm(extractDir, { recursive: true, force: true });
  await extractTarGz(archivePath, extractDir);

  // The tarball may extract with a top-level directory; find the sentinel.
  const extractedSentinel = await findFile(extractDir, target.sentinel);
  if (!extractedSentinel) {
    throw new Error(
      `${target.sentinel} not found in extracted ${tarballName}. The release artifact may be corrupted or its layout may have changed.`,
    );
  }

  // Copy the extracted directory contents into distDir.
  const extractedRoot = dirname(extractedSentinel);
  const entries = await readdir(extractedRoot, { withFileTypes: true });
  for (const entry of entries) {
    const src = join(extractedRoot, entry.name);
    const dest = join(target.distDir, entry.name);
    if (entry.isDirectory()) {
      // Copy recursively using Bun's cp via spawn fallback
      const proc = Bun.spawn(
        process.platform === "win32"
          ? ["cmd", "/c", "xcopy", src, dest, "\\E", "\\I", "\\Y", "\\Q"]
          : ["cp", "-R", src, dest],
        { stdout: "inherit", stderr: "inherit" },
      );
      const code = await proc.exited;
      if (code !== 0) {
        throw new Error(`Failed to copy directory ${src} → ${dest} (exit ${code})`);
      }
    } else {
      await Bun.write(dest, await Bun.file(src).arrayBuffer());
    }
  }

  // Verify the sentinel is now in place.
  if (!existsSync(join(target.distDir, target.sentinel))) {
    throw new Error(
      `${target.sentinel} still missing in ${target.distDir} after extraction. Manual intervention required.`,
    );
  }

  // Cleanup.
  await rm(extractDir, { recursive: true, force: true });
  await rm(archivePath, { force: true });

  console.log(`[ensure-electrobun-core] ${target.sentinel} ensured in ${target.distDir}`);
  return { patched: true, distDir: target.distDir };
}