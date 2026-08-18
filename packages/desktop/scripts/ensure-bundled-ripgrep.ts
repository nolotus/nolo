/**
 * Download and stage a platform-specific ripgrep binary for Desktop packaging.
 *
 * Usage:
 *   bun packages/desktop/scripts/ensure-bundled-ripgrep.ts
 *   bun packages/desktop/scripts/ensure-bundled-ripgrep.ts --force
 *   NOLO_DESKTOP_SKIP_BUNDLED_RG=1  → no-op success
 *
 * Output layout:
 *   packages/desktop/vendor/ripgrep/<platform-arch>/rg[.exe]
 *   packages/desktop/vendor/ripgrep/staged/rg[.exe]   (current host, for electrobun copy)
 */
import { existsSync, chmodSync } from "node:fs";
import { mkdir, cp, rm, readdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";

export const RIPGREP_VERSION = "14.1.1";

type RipgrepTarget = {
  key: string;
  asset: string;
  binaryName: string;
  format: "tar.gz" | "zip";
};

export const RIPGREP_TARGETS: Record<string, RipgrepTarget> = {
  "darwin-arm64": {
    key: "darwin-arm64",
    asset: `ripgrep-${RIPGREP_VERSION}-aarch64-apple-darwin.tar.gz`,
    binaryName: "rg",
    format: "tar.gz",
  },
  "darwin-x64": {
    key: "darwin-x64",
    asset: `ripgrep-${RIPGREP_VERSION}-x86_64-apple-darwin.tar.gz`,
    binaryName: "rg",
    format: "tar.gz",
  },
  "linux-x64": {
    key: "linux-x64",
    asset: `ripgrep-${RIPGREP_VERSION}-x86_64-unknown-linux-musl.tar.gz`,
    binaryName: "rg",
    format: "tar.gz",
  },
  "linux-arm64": {
    key: "linux-arm64",
    asset: `ripgrep-${RIPGREP_VERSION}-aarch64-unknown-linux-gnu.tar.gz`,
    binaryName: "rg",
    format: "tar.gz",
  },
  "win32-x64": {
    key: "win32-x64",
    asset: `ripgrep-${RIPGREP_VERSION}-x86_64-pc-windows-msvc.zip`,
    binaryName: "rg.exe",
    format: "zip",
  },
};

export function resolveRipgrepTargetKey(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): string {
  if (platform === "darwin" && arch === "arm64") return "darwin-arm64";
  if (platform === "darwin" && (arch === "x64" || arch === "x86_64")) return "darwin-x64";
  if (platform === "linux" && arch === "arm64") return "linux-arm64";
  if (platform === "linux" && (arch === "x64" || arch === "x86_64")) return "linux-x64";
  if (platform === "win32" && (arch === "x64" || arch === "x86_64")) return "win32-x64";
  throw new Error(`Unsupported platform for bundled ripgrep: ${platform}-${arch}`);
}

export function getDesktopVendorRipgrepRoot(desktopPackageDir = resolve(import.meta.dir, "..")) {
  return join(desktopPackageDir, "vendor", "ripgrep");
}

async function downloadToFile(url: string, destPath: string) {
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok || !response.body) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`);
  }
  await mkdir(dirname(destPath), { recursive: true });
  // Bun's response.body is a web stream — use arrayBuffer for simplicity
  const buffer = Buffer.from(await response.arrayBuffer());
  await Bun.write(destPath, buffer);
}

async function extractTarGz(archivePath: string, destDir: string) {
  await mkdir(destDir, { recursive: true });
  // Prefer system tar for reliability across environments
  const proc = Bun.spawn(["tar", "-xzf", archivePath, "-C", destDir], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`tar extract failed for ${archivePath} (exit ${code})`);
  }
}

async function extractZip(archivePath: string, destDir: string) {
  await mkdir(destDir, { recursive: true });
  if (process.platform === "win32") {
    const proc = Bun.spawn(
      [
        "powershell",
        "-NoProfile",
        "-Command",
        `Expand-Archive -Path "${archivePath}" -DestinationPath "${destDir}" -Force`,
      ],
      { stdout: "inherit", stderr: "inherit" },
    );
    const code = await proc.exited;
    if (code !== 0) throw new Error(`Expand-Archive failed for ${archivePath}`);
    return;
  }
  const proc = Bun.spawn(["unzip", "-o", archivePath, "-d", destDir], {
    stdout: "inherit",
    stderr: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`unzip failed for ${archivePath}`);
}

async function findExtractedBinary(
  rootDir: string,
  binaryName: string,
): Promise<string | null> {
  const stack = [rootDir];
  while (stack.length > 0) {
    const dir = stack.pop()!;
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
        continue;
      }
      if (entry.name === binaryName) return full;
    }
  }
  return null;
}

export async function ensureBundledRipgrep(options?: {
  platform?: NodeJS.Platform;
  arch?: string;
  force?: boolean;
  desktopPackageDir?: string;
}): Promise<{ binaryPath: string; stagedPath: string; skipped?: boolean }> {
  if (process.env.NOLO_DESKTOP_SKIP_BUNDLED_RG === "1") {
    return {
      binaryPath: "",
      stagedPath: "",
      skipped: true,
    };
  }

  const platform = options?.platform ?? process.platform;
  const arch = options?.arch ?? process.arch;
  const force = options?.force === true || process.argv.includes("--force");
  const desktopPackageDir =
    options?.desktopPackageDir ?? resolve(import.meta.dir, "..");
  const vendorRoot = getDesktopVendorRipgrepRoot(desktopPackageDir);
  const targetKey = resolveRipgrepTargetKey(platform, arch);
  const target = RIPGREP_TARGETS[targetKey];
  if (!target) {
    throw new Error(`No ripgrep target for ${targetKey}`);
  }

  const platformDir = join(vendorRoot, targetKey);
  const binaryPath = join(platformDir, target.binaryName);
  const stagedDir = join(vendorRoot, "staged");
  const stagedPath = join(stagedDir, target.binaryName);

  if (!force && existsSync(binaryPath)) {
    await mkdir(stagedDir, { recursive: true });
    await cp(binaryPath, stagedPath, { force: true });
    if (platform !== "win32") {
      try {
        chmodSync(stagedPath, 0o755);
        chmodSync(binaryPath, 0o755);
      } catch {
        // ignore chmod failures
      }
    }
    return { binaryPath, stagedPath };
  }

  const url = `https://github.com/BurntSushi/ripgrep/releases/download/${RIPGREP_VERSION}/${target.asset}`;
  const cacheDir = join(vendorRoot, ".cache");
  const archivePath = join(cacheDir, target.asset);
  const extractDir = join(cacheDir, `extract-${targetKey}`);

  console.log(`[bundled-rg] fetching ${url}`);
  await downloadToFile(url, archivePath);

  await rm(extractDir, { recursive: true, force: true });
  await mkdir(extractDir, { recursive: true });
  if (target.format === "tar.gz") {
    await extractTarGz(archivePath, extractDir);
  } else {
    await extractZip(archivePath, extractDir);
  }

  const extracted = await findExtractedBinary(extractDir, target.binaryName);
  if (!extracted) {
    throw new Error(`Could not find ${target.binaryName} inside ${target.asset}`);
  }

  await mkdir(platformDir, { recursive: true });
  await cp(extracted, binaryPath, { force: true });
  if (platform !== "win32") {
    chmodSync(binaryPath, 0o755);
  }

  await mkdir(stagedDir, { recursive: true });
  // Clean staged dir of other platform binaries
  for (const name of await readdir(stagedDir)) {
    if (name !== target.binaryName) {
      await rm(join(stagedDir, name), { force: true });
    }
  }
  await cp(binaryPath, stagedPath, { force: true });
  if (platform !== "win32") {
    chmodSync(stagedPath, 0o755);
  }

  console.log(`[bundled-rg] staged ${stagedPath}`);
  return { binaryPath, stagedPath };
}

const isMain =
  typeof Bun !== "undefined" &&
  Bun.main &&
  (Bun.main === import.meta.path ||
    Bun.main.endsWith("ensure-bundled-ripgrep.ts"));

if (isMain) {
  try {
    const result = await ensureBundledRipgrep();
    if (result.skipped) {
      console.log("[bundled-rg] skipped (NOLO_DESKTOP_SKIP_BUNDLED_RG=1)");
    } else {
      console.log(`[bundled-rg] ready: ${result.stagedPath}`);
    }
  } catch (error) {
    console.error("[bundled-rg] failed:", error);
    process.exit(1);
  }
}
