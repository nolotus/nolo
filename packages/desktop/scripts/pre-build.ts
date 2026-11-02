import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { validateWorkspacePackageLinks } from "../../../scripts/dev/workspaceLinkGuard";
import { ensureBundledRipgrep } from "./ensure-bundled-ripgrep";
import { pruneStagedClassicLevelForPackaging } from "./prune-native-prebuilds";

const repoRoot = resolve(import.meta.dir, "../../..");
const desktopRoot = resolve(import.meta.dir, "..");
const generatedDir = join(desktopRoot, ".generated");
const vendorDir = join(generatedDir, "vendor");
// electrobun 2 copy keys may not escape the project root (UnsafeOutputPath),
// so every runtime tree that lives outside packages/desktop is physically
// staged here and the copy map references the in-root path only.
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
// 2) External dependency trees (playwright / playwright-core / chromium-bidi)
//    are kept out of the desktop bundle by build.bun.external, which hutch
//    passes straight through to Bun.build — the main-process bundle keeps
//    them as runtime imports, so no stub package is needed and pre-build
//    never writes into the repo-root node_modules.
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
  {
    name: "desktop-chrome-connector",
    destName: "desktop-chrome-connector",
    // Chrome Web Store 上架素材（store/listing.md、store/screenshots/*.png、
    // promo/）只用于人工提审，不属于运行时载荷，剪掉还能明显减小发布载荷。
    // 打包前缀 `NoloDesktop-canary/Resources/app/integrations/connector/` 下
    // `store/screenshots/02-bounded-output-1280x800.png` 会让条目路径达到 104
    // 字符——USTAR 能表示（prefix+name 拆分），但没必要把提审素材带进运行时。
    // 在 staged 副本里剪掉 store/**，仓库源目录不动。
    exclude: ["store"],
  },
  { name: "integrations/x-reader", destName: "x-reader" },
  { name: "integrations/xhs-reader", destName: "xhs-reader" },
] as const;

/**
 * 打包前从 staged node_modules 里剪掉的测试目录。`abstract-level/test/` 下
 * `iterator-explicit-snapshot-test.js` 这类文件名很长，会把 canary 前缀下的
 * 条目路径顶到 100 字符上下；依赖一升级就可能继续变长。
 * 测试代码本就不该进运行时载荷。
 */
const STAGED_NODE_MODULES_PRUNE_DIRS = ["test", "tests"] as const;
const STAGED_NODE_MODULES_PRUNE_PACKAGES = ["abstract-level"] as const;

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
  // electrobun 自解压器不支持 GNU longname（'L'）tar 记录：>100 字符路径会在解包
  // 时报 TarUnsupportedFileType（2026-09-16 实测，官方 Setup 安装器解到第 770 个
  // 条目中止）。classic-level 的 C 源码/头文件与非本平台/musl prebuilds 会把路径
  // 推到 103–116 字符，必须在打包前从 staged 副本剪掉（仓库 node_modules 不动）。
  // 闸门：packages/desktop/scripts/verifyElectrobunPayloadCompat.ts（须与打包链同在
  // desktop 包内，公开投影不含 scripts/verify/**）。
  const pruned = await pruneStagedClassicLevelForPackaging(join(vendorDir, "node_modules"));
  if (pruned.removed.length > 0) {
    console.log(`[pre-build] pruned classic-level payload entries: ${pruned.removed.join(", ")}`);
  }
  // 剪掉 node_modules 里打包后会越界的测试目录（见 STAGED_NODE_MODULES_PRUNE_DIRS）。
  for (const pkg of STAGED_NODE_MODULES_PRUNE_PACKAGES) {
    for (const dir of STAGED_NODE_MODULES_PRUNE_DIRS) {
      const target = join(vendorDir, "node_modules", pkg, dir);
      if (existsSync(target)) {
        await rm(target, { recursive: true, force: true });
        console.log(`[pre-build] pruned staged node_modules: ${pkg}/${dir}`);
      }
    }
  }
  for (const workspacePackage of stagedWorkspacePackages) {
    const { name, destName } = workspacePackage;
    const exclude = "exclude" in workspacePackage ? workspacePackage.exclude : undefined;
    const source = join(repoRoot, "packages", name);
    const target = join(vendorDir, "packages", destName);
    await cp(source, target, { recursive: true });
    for (const excludedDir of exclude ?? []) {
      const excludedTarget = join(target, excludedDir);
      if (existsSync(excludedTarget)) {
        await rm(excludedTarget, { recursive: true, force: true });
        console.log(`[pre-build] excluded staged payload: ${destName}/${excludedDir}`);
      }
    }
  }
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

// --- Desktop edition fail-closed 校验 ---------------------------------------
// 公开桌面只允许打包 nolo-desktop edition 的 web 产物。esBuild 把 `edition`
// 写进 public/latest-assets.json；这里据此校验，避免把旧的 cloud/local 构建
// 静默塞进安装包（隐私边界不允许悄悄退化成匿名-only Local edition）。
type WebAssetManifest = { edition?: string };

const readLatestAssetsManifest = (): WebAssetManifest | null => {
  try {
    return JSON.parse(readFileSync(latestAssetsPath, "utf8")) as WebAssetManifest;
  } catch {
    return null;
  }
};

const desktopEditionMismatchError = (edition: string | undefined): Error =>
  new Error(
    `[desktop-edition-mismatch] packaged web bundle is not the desktop edition (latest-assets.json edition=${edition ?? "missing"}). Rebuild web assets with NOLO_WEB_EDITION=desktop.`
  );

const assertDesktopEditionManifest = (): void => {
  const manifest = readLatestAssetsManifest();
  if (manifest?.edition !== "desktop") {
    throw desktopEditionMismatchError(manifest?.edition);
  }
};

// Skip-web-build 路径（dev 流程）复用既有产物：声明了非 desktop edition 就
// 硬失败；早期产物没有 edition 字段时仅告警（过渡容忍），随后重新构建补齐。
const assertReusableDesktopEditionManifest = (): void => {
  if (!existsSync(latestAssetsPath)) return;
  const manifest = readLatestAssetsManifest();
  if (manifest?.edition === undefined) {
    console.warn(
      "[desktop-pre-build] latest-assets.json has no edition field (pre-edition build); rebuild with NOLO_WEB_EDITION=desktop before shipping."
    );
    return;
  }
  if (manifest.edition !== "desktop") {
    throw desktopEditionMismatchError(manifest.edition);
  }
};

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
      // 公开桌面构建显式选择 nolo-desktop edition（见 esbuild.config.js）。
      NOLO_WEB_EDITION: "desktop",
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
  // 刚构建的产物必须声明 desktop edition，否则打包失败（fail closed）。
  assertDesktopEditionManifest();
} else {
  assertReusableDesktopEditionManifest();
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

await rm(desktopPublicDir, { recursive: true, force: true });
await mkdir(desktopPublicDir, { recursive: true });
await copyBundledAssets();
await copyTopLevelPublicFiles();
await copyPublicRuntimeDirectories();
