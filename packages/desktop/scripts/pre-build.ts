import { existsSync } from "node:fs";
import { cp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { validateWorkspacePackageLinks } from "../../../scripts/dev/workspaceLinkGuard";
import { ensureBundledRipgrep } from "./ensure-bundled-ripgrep";

const repoRoot = resolve(import.meta.dir, "../../..");
const desktopRoot = resolve(import.meta.dir, "..");
const generatedDir = join(desktopRoot, ".generated");
const vendorDir = join(generatedDir, "vendor");
// electrobun 2 copy keys may not escape the project root (UnsafeOutputPath),
// so every runtime tree that lives outside packages/desktop is physically
// staged here and the copy map references the in-root path only.
const chromiumBidiStubDir = join(vendorDir, "chromium-bidi");
// Cottontail's bundler resolves bare specifiers from the repo root's
// node_modules (it ignores packages/desktop's own tree), so the generated
// stub must be written there to be resolvable at bundle time.
const chromiumBidiStubInstallDir = join(repoRoot, "node_modules", "chromium-bidi");
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

// --- electrobun 2 staging -------------------------------------------------
//
// 1) Runtime node_modules trees (LevelDB stack). electrobun v1 copied these
//    via build.copy entries pointing at the repo-root node_modules; v2
//    rejects copy keys that escape the project root (UnsafeOutputPath), so
//    stage them into .generated/vendor/<pkg> and copy from there. classic-
//    level resolves its native .node prebuild via node-gyp-build at runtime,
//    so the whole tree (not just JS) must be physically present inside the
//    packaged app at Resources/app/node_modules/<name>.
// 2) chromium-bidi stub. hutch 0.24.3 drops build.bun.external from the
//    cottontail build spec (upstream bug — external/minify/sourcemap/define
//    never reach Bun.build), so playwright-core gets bundled and its
//    coreBundle eagerly requires "chromium-bidi/lib/cjs/..." paths that no
//    longer exist upstream. Provide a resolvable inert stub package so the
//    bundler resolves it; this must not depend on hand-patched node_modules.
const stagedNodeModuleNames = [
  "abstract-level",
  "classic-level",
  "is-buffer",
  "level-supports",
  "level-transcoder",
  "maybe-combine-errors",
  "module-error",
  "node-gyp-build",
] as const;
const stagedWorkspacePackages = [
  { name: "desktop-chrome-connector", destName: "desktop-chrome-connector" },
  { name: "integrations/x-reader", destName: "x-reader" },
  { name: "integrations/xhs-reader", destName: "xhs-reader" },
] as const;

const stageRuntimeTrees = async () => {
  if (process.env.NOLO_DESKTOP_SKIP_VENDOR_STAGE === "1") {
    console.warn("[pre-build] skipping vendor staging (NOLO_DESKTOP_SKIP_VENDOR_STAGE=1)");
    return;
  }
  await rm(vendorDir, { recursive: true, force: true });
  for (const name of stagedNodeModuleNames) {
    const source = join(repoRoot, "node_modules", name);
    if (!existsSync(source)) {
      throw new Error(
        `Missing runtime dependency to stage: ${source}. Run "bun install" at the repo root first.`
      );
    }
    const target = join(vendorDir, "node_modules", name);
    await cp(source, target, { recursive: true });
  }
  for (const { name, destName } of stagedWorkspacePackages) {
    const source = join(repoRoot, "packages", name);
    const target = join(vendorDir, "packages", destName);
    await cp(source, target, { recursive: true });
  }
};

/**
 * Write an inert chromium-bidi stub package so the cottontail bundler can
 * resolve playwright-core's eager
 * require("chromium-bidi/lib/cjs/{bidiMapper/BidiMapper,cdp/CdpConnection}")
 * without hand-patching node_modules. The canonical copy lives in
 * .generated/vendor/chromium-bidi; it is mirrored into the repo-root
 * node_modules because that is where Cottontail resolves bare specifiers.
 * See electrobun.config.ts build.bun external note for the upstream hutch
 * bug (spec drops `external`) this works around.
 */
const writeChromiumBidiStub = async () => {
  await mkdir(chromiumBidiStubDir, { recursive: true });
  const files: Array<[string, string]> = [
    [
      "package.json",
      JSON.stringify(
        {
          name: "chromium-bidi",
          version: "0.0.0-nolo-desktop-stub",
          main: "./lib/cjs/stub.js",
        },
        null,
        2
      ) + "\n",
    ],
    ["lib/cjs/bidiMapper/BidiMapper.js", "// chromium-bidi stub (see packages/desktop/scripts/pre-build.ts): playwright-core's bundled coreBundle eagerly requires this path; the project never uses the bidi channel.\nmodule.exports = {};\n"],
    ["lib/cjs/cdp/CdpConnection.js", "// chromium-bidi stub (see packages/desktop/scripts/pre-build.ts): playwright-core's bundled coreBundle eagerly requires this path; the project never uses the bidi channel.\nmodule.exports = {};\n"],
  ];
  for (const [relPath, content] of files) {
    const target = join(chromiumBidiStubDir, relPath);
    await mkdir(resolve(target, ".."), { recursive: true });
    await writeFile(target, content);
  }
  // Mirror into the location Cottontail actually resolves from (idempotent).
  // NOTE: 与把 chromium-bidi 加入 devDependencies 互斥——此处每次无条件
  // rm+覆盖 repo 根 node_modules/chromium-bidi；若未来改用真实包（上游
  // hutch 修复 external 丢弃后），必须连同本 stub 生成逻辑一起删除。
  await rm(chromiumBidiStubInstallDir, { recursive: true, force: true });
  await cp(chromiumBidiStubDir, chromiumBidiStubInstallDir, { recursive: true });
};

// Stage platform ripgrep for Desktop local codeSearch/globFiles (does not require user brew install).
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
      // 注意：不要设 NOLO_WEB_SKIP_METAFILE=1——StyleX 启用后构建必须带 metafile
      //（插件定位 CSS asset + keepRecentAssetBuilds 靠它清理历史产物）；
      // desktop 打包前已清空 public/assets，keepRecent 无历史可删，行为安全。
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

/**
 * 复制期间的一致性协议：esbuild 只在构建成功结束时重写 latest-assets.json
 * 并清理旧 chunk（见 scripts/dev/esDev.js 的 devBuildSignalPlugin），所以
 * 复制前后信号文件内容一致 = 复制窗口内没有构建完成 = 快照自洽。
 * 不一致（信号变化或 ENOENT）则整体重试；重试耗尽响亮报错——
 * 宁可构建失败，也不能打包出 entry.js 引用了缺失 chunk 的黑屏应用。
 */
const ASSET_COPY_MAX_ATTEMPTS = 10;
const ASSET_COPY_RETRY_DELAY_MS = 500;

const readAssetBuildSignal = () =>
  Bun.file(latestAssetsPath)
    .text()
    .catch(() => null);

const copyBundledAssetsOnce = async () => {
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
      await cp(sourcePath, targetPath, {
        recursive: true,
        filter: (path) => !path.endsWith(".map"),
      });
      continue;
    }

    await cp(sourcePath, targetPath);
  }
};

const copyBundledAssets = async () => {
  for (let attempt = 1; attempt <= ASSET_COPY_MAX_ATTEMPTS; attempt++) {
    const signalBefore = await readAssetBuildSignal();
    let copyComplete = true;
    try {
      await copyBundledAssetsOnce();
    } catch (e: any) {
      if (e?.code !== "ENOENT" || attempt === ASSET_COPY_MAX_ATTEMPTS) throw e;
      copyComplete = false;
    }
    const signalAfter = await readAssetBuildSignal();
    if (copyComplete && signalBefore === signalAfter) return;
    if (attempt < ASSET_COPY_MAX_ATTEMPTS) {
      await Bun.sleep(ASSET_COPY_RETRY_DELAY_MS);
    }
  }
  throw new Error(
    `Web assets kept changing during desktop asset copy (${ASSET_COPY_MAX_ATTEMPTS} attempts). ` +
      `Wait for the running web build to settle, then retry.`,
  );
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

await stageRuntimeTrees();
await writeChromiumBidiStub();

await rm(desktopPublicDir, { recursive: true, force: true });
await mkdir(desktopPublicDir, { recursive: true });
await copyBundledAssets();
await copyTopLevelPublicFiles();
await copyPublicRuntimeDirectories();
