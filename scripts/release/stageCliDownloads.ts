import { chmodSync, cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { prepareCliNativePackage, type CliNativePlatform } from "./prepareCliNativePackage";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "../..");
const PUBLIC_DOWNLOADS_DIR = join(REPO_ROOT, "public/downloads");
const TMP_DIR = join(REPO_ROOT, ".tmp/cli-downloads-staging");

export async function stageCliDownloads(repoRoot: string): Promise<void> {
  const publicDownloadsDir = join(repoRoot, "public/downloads");
  mkdirSync(publicDownloadsDir, { recursive: true });

  if (existsSync(TMP_DIR)) {
    rmSync(TMP_DIR, { recursive: true, force: true });
  }
  mkdirSync(TMP_DIR, { recursive: true });

  const darwinPlatform: CliNativePlatform = { os: "darwin", cpu: "arm64", binaryName: "nolo" };
  const { packageDir } = await prepareCliNativePackage({
    repoRoot,
    outDir: TMP_DIR,
    platform: darwinPlatform,
  });

  const tarballName = "nolo-darwin-arm64.tar.gz";
  const tarballPath = join(publicDownloadsDir, tarballName);

  const tarResult = spawnSync(
    "tar",
    ["-czf", tarballPath, "-C", packageDir, "nolo", "package.json", "node_modules"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (tarResult.status !== 0) {
    throw new Error(
      `tar failed (status ${tarResult.status}): ${tarResult.stderr || tarResult.stdout || "unknown error"}`,
    );
  }

  // Keep a standalone binary copy as well for direct downloads.
  const destBinaryPath = join(publicDownloadsDir, "nolo-darwin-arm64");
  cpSync(join(packageDir, "nolo"), destBinaryPath, { force: true });
  chmodSync(destBinaryPath, 0o755);

  // Cross-compile linux-x64 binary.
  const linuxPlatform: CliNativePlatform = { os: "linux", cpu: "x64", binaryName: "nolo" };
  const { packageDir: linuxPackageDir } = await prepareCliNativePackage({
    repoRoot,
    outDir: TMP_DIR,
    platform: linuxPlatform,
  });

  const linuxTarballName = "nolo-linux-x64.tar.gz";
  const linuxTarballPath = join(publicDownloadsDir, linuxTarballName);

  const linuxTarResult = spawnSync(
    "tar",
    ["-czf", linuxTarballPath, "-C", linuxPackageDir, "nolo", "package.json", "node_modules"],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (linuxTarResult.status !== 0) {
    throw new Error(
      `tar failed for linux (status ${linuxTarResult.status}): ${linuxTarResult.stderr || linuxTarResult.stdout || "unknown error"}`,
    );
  }

  const linuxDestBinaryPath = join(publicDownloadsDir, "nolo-linux-x64");
  cpSync(join(linuxPackageDir, "nolo"), linuxDestBinaryPath, { force: true });
  chmodSync(linuxDestBinaryPath, 0o755);

  console.log(`Staged Linux CLI tarball at ${linuxTarballPath}`);
  console.log(`Staged Linux CLI binary at ${linuxDestBinaryPath}`);

  const installScriptSource = join(repoRoot, "public/downloads/install-nolo.sh");
  if (existsSync(installScriptSource)) {
    chmodSync(installScriptSource, 0o755);
  }

  console.log(`Staged CLI tarball at ${tarballPath}`);
  console.log(`Staged CLI binary at ${destBinaryPath}`);
}

// CLI entry point
if (import.meta.main) {
  await stageCliDownloads(REPO_ROOT);
}
