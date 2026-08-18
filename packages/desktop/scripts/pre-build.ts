import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { validateWorkspacePackageLinks } from "../../../scripts/dev/workspaceLinkGuard";
import { patchElectrobunMacosFfi } from "./patch-electrobun-macos-ffi";
import { ensureBundledRipgrep } from "./ensure-bundled-ripgrep";
import { ensureElectrobunCore } from "./ensure-electrobun-core";

const repoRoot = resolve(import.meta.dir, "../../..");
const sourcePublicDir = join(repoRoot, "public");
const sourceAssetsDir = join(sourcePublicDir, "assets");
const sourceAssetBuildManifestDir = join(sourcePublicDir, ".asset-builds");
const desktopPublicDir = resolve(import.meta.dir, "../.generated/public");
const latestAssetsPath = join(sourcePublicDir, "latest-assets.json");
function resolveDefaultWebBuildBun(): string {
  if (process.platform !== "win32") {
    return "bun";
  }
  if (process.env.BUN_INSTALL) {
    return join(process.env.BUN_INSTALL, "bun-windows-x64", "bun.exe");
  }
  if (process.env.USERPROFILE) {
    return join(process.env.USERPROFILE, ".bun", "bin", "bun.exe");
  }
  return "bun";
}
const defaultUserBun = resolveDefaultWebBuildBun();
const webBuildBun = process.env.NOLO_DESKTOP_WEB_BUILD_BUN || defaultUserBun;

const workspaceLinkErrors = await validateWorkspacePackageLinks(repoRoot);
if (workspaceLinkErrors.length > 0) {
  throw new Error(`Unsafe workspace package links:\n${workspaceLinkErrors.join("\n")}`);
}

patchElectrobunMacosFfi();

// Electrobun 1.18.4-beta.6 on Windows ships without ElectrobunCore.dll in
// dist-win-x64/. The CLI launcher only auto-downloads the CLI tarball, not
// the core tarball, so dev/build fails with ENOENT. This detects the gap and
// downloads the matching core tarball from the GitHub release.
try {
  const core = await ensureElectrobunCore();
  if (core.patched) {
    console.log(`[pre-build] electrobun core binaries ensured in ${core.distDir}`);
  }
} catch (error) {
  if (process.env.NOLO_DESKTOP_SKIP_ELECTROBUN_CORE === "1") {
    console.warn("[pre-build] electrobun core ensure skipped:", error);
  } else {
    throw new Error(
      `Failed to ensure electrobun core binaries. Set NOLO_DESKTOP_SKIP_ELECTROBUN_CORE=1 to bypass.\n${error}`,
    );
  }
}

// Stage platform ripgrep for Desktop local searchFiles (does not require user brew install).
try {
  const rg = await ensureBundledRipgrep();
  if (!rg.skipped) {
    console.log(`[pre-build] bundled ripgrep ready: ${rg.stagedPath}`);
  }
} catch (error) {
  if (process.env.NOLO_DESKTOP_REQUIRE_BUNDLED_RG === "0") {
    console.warn("[pre-build] bundled ripgrep unavailable; continuing without it:", error);
  } else {
    throw new Error(
      `Failed to stage bundled ripgrep for Desktop. Fix network/tooling or set NOLO_DESKTOP_SKIP_BUNDLED_RG=1 / NOLO_DESKTOP_REQUIRE_BUNDLED_RG=0.\n${error}`,
    );
  }
}

if (process.env.NOLO_DESKTOP_SKIP_WEB_BUILD !== "1") {
  await rm(sourceAssetsDir, { recursive: true, force: true });
  await rm(sourceAssetBuildManifestDir, { recursive: true, force: true });
  await rm(latestAssetsPath, { force: true });

  const proc = Bun.spawn([webBuildBun, "./scripts/dev/esBuild.js"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      NODE_ENV: "production",
      NOLO_WEB_SKIP_META: "1",
      NOLO_WEB_SKIP_METAFILE: "1",
    },
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Web asset build failed with exit code ${exitCode}`);
  }
}

/**
 * Copy a directory the web build is required to have produced. A miss here means
 * the app would ship without its locales or route CSS, so it fails loudly rather
 * than packaging a silently broken bundle — the likely cause is
 * NOLO_DESKTOP_SKIP_WEB_BUILD=1 on a tree that was never built.
 */
const copyRequiredDir = async (sourcePath: string, targetPath: string) => {
  if (!existsSync(sourcePath)) {
    throw new Error(
      `Missing web build output: ${sourcePath}. Run the web build first, or unset NOLO_DESKTOP_SKIP_WEB_BUILD.`,
    );
  }
  await cp(sourcePath, targetPath, { recursive: true });
};

const getBundledAssetDirName = async () => {
  const buildInfo = JSON.parse(await Bun.file(latestAssetsPath).text()) as {
    basePath?: string;
  };
  const match = buildInfo.basePath?.match(/^\/public\/([^/]+)\/$/);
  if (!match?.[1]) {
    throw new Error(`Unable to resolve bundled asset directory from ${latestAssetsPath}`);
  }
  return match[1];
};

const copyBundledAssets = async () => {
  const bundledAssetDirName = await getBundledAssetDirName();
  const sourceAssetsDir = join(sourcePublicDir, bundledAssetDirName);
  const targetAssetsDir = join(desktopPublicDir, bundledAssetDirName);
  await mkdir(targetAssetsDir, { recursive: true });

  const entries = await readdir(sourceAssetsDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.endsWith(".map")) continue;

    const sourcePath = join(sourceAssetsDir, entry.name);
    const targetPath = join(targetAssetsDir, entry.name);

    if (entry.isDirectory()) {
      try {
        await cp(sourcePath, targetPath, {
          recursive: true,
          filter: (path) => !path.endsWith(".map"),
        });
      } catch (e: any) {
        if (e.code !== "ENOENT") throw e;
      }
      continue;
    }

    try {
      await cp(sourcePath, targetPath);
    } catch (e: any) {
      if (e.code !== "ENOENT") throw e;
    }
  }
};

const copyTopLevelPublicFiles = async () => {
  const entries = await readdir(sourcePublicDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name === "meta.json") continue;
    if (entry.name.endsWith(".map")) continue;

    const sourcePath = join(sourcePublicDir, entry.name);
    const targetPath = join(desktopPublicDir, entry.name);
    await cp(sourcePath, targetPath);
  }
};

const copyPublicRuntimeDirectories = async () => {
  for (const dirName of ["locales", "route-styles"]) {
    await copyRequiredDir(join(sourcePublicDir, dirName), join(desktopPublicDir, dirName));
  }
};

await rm(desktopPublicDir, { recursive: true, force: true });
await mkdir(desktopPublicDir, { recursive: true });
await copyBundledAssets();
await copyTopLevelPublicFiles();
await copyPublicRuntimeDirectories();
