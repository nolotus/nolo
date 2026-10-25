import {
  adhocCodesignAppBundle,
  describeEffectiveMacSigningMode,
  findAppBundleInDir,
  resolveEffectiveMacSigningMode,
  resolveMissingResourcesAction,
  rewriteTarballFromDir,
  shouldRunLocalAdhocCodesign,
  withTempDir,
} from "./codesign-local";
import { existsSync } from "node:fs";
import { cp, readdir, rm } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const wrapperBundlePath = process.env.ELECTROBUN_WRAPPER_BUNDLE_PATH;
if (!wrapperBundlePath) {
  throw new Error(
    "ELECTROBUN_WRAPPER_BUNDLE_PATH is required for desktop postWrap"
  );
}

// 模式横幅：CI 日志里必须一眼看出本次走的是正式签名还是 ad-hoc 回退。
// 第一次真跑就在 CI 的 macos-latest runner 上，这一行是 owner 判断
// 「脚本坏了」还是「凭据缺失」的第一现场。
const effectiveSigningMode = resolveEffectiveMacSigningMode();
console.log(
  `[desktop] mac-signing mode=${effectiveSigningMode} — ${describeEffectiveMacSigningMode(effectiveSigningMode)}`
);

const appIconIcnsPath = resolve(import.meta.dir, "../assets/AppIcon.icns");
const wrapperResourcesPath = join(wrapperBundlePath, "Contents", "Resources");
if (!existsSync(wrapperResourcesPath)) {
  // 既有分支：Resources 目录不存在时直接退出（v2 迁移引入，处理某些形态）。
  // 但在 ad-hoc 模式下它会**静默跳过全部签名**——产出一个装不上的 .app 却
  // 报「构建成功」。所以这里只在非 ad-hoc 路径保留原行为，ad-hoc 下必须
  // 明确失败（fail-closed）。
  if (resolveMissingResourcesAction(shouldRunLocalAdhocCodesign) === "fail") {
    throw new Error(
      `ad-hoc 签名模式：wrapper bundle 的 Resources 目录不存在（${wrapperResourcesPath}），` +
        `无法定位待签名的 app bundle。构建中止，不产出未签名的 macOS 产物。`
    );
  }
  process.exit(0);
}

// Static trees the embedded server must be able to address physically inside the
// installed wrapper (settings.css, locales, integrations) before/without first-run
// self-extraction. Staged here, before electrobun's release codesign/notarization,
// so the wrapper signature seals them.
const WRAPPER_PHYSICAL_RESOURCE_DIRS = [
  "app",
  "integrations",
];

const innerArchivePath = (await readdir(wrapperResourcesPath))
  .filter((name) => name.endsWith(".tar.zst"))
  .map((name) => join(wrapperResourcesPath, name));

if (innerArchivePath.length !== 1) {
  throw new Error(
    `Expected exactly one inner archive in ${wrapperResourcesPath}, found ${innerArchivePath.length}`
  );
}

await withTempDir("nolo-desktop-inner-", async (tempDir) => {
  const extractProc = Bun.spawn(
    ["tar", "--zstd", "-xf", innerArchivePath[0], "-C", tempDir],
    {
      stdout: "inherit",
      stderr: "inherit",
    }
  );

  const extractExitCode = await extractProc.exited;
  if (extractExitCode !== 0) {
    throw new Error(`failed to extract ${innerArchivePath[0]} with exit code ${extractExitCode}`);
  }

  const innerAppBundlePath = findAppBundleInDir(tempDir);
  const innerAppBundleName = basename(innerAppBundlePath);
  const innerResourcesPath = join(innerAppBundlePath, "Contents", "Resources");
  await cp(appIconIcnsPath, join(wrapperResourcesPath, "AppIcon.icns"));
  await cp(appIconIcnsPath, join(innerResourcesPath, "AppIcon.icns"));

  // electrobun 2: build.copy destinations must stay inside the project root
  // (UnsafeOutputPath), so the workspace source packages that v1 copied to
  // Resources/integrations ("../x" destinations) now land at
  // Resources/app/<dest>. Relocate them to the
  // v1-parity location (sibling of app/) before the inner archive is
  // repacked — both the wrapper and the standalone .app.tar.zst artifact
  // derive from this archive.
  const innerAppPath = join(innerResourcesPath, "app");
  for (const dirName of ["integrations", "desktop-chrome-connector"]) {
    const stagedPath = join(innerAppPath, dirName);
    if (!existsSync(stagedPath)) continue;
    const targetPath = join(innerResourcesPath, dirName);
    await rm(targetPath, { recursive: true, force: true });
    await cp(stagedPath, targetPath, { recursive: true });
    await rm(stagedPath, { recursive: true, force: true });
  }

  if (shouldRunLocalAdhocCodesign) {
    await adhocCodesignAppBundle(innerAppBundlePath);
  }

  // The rewritten inner archive is the single source of truth for the published
  // standalone `.app.tar.zst` artifact: postPackage copies it over the artifact
  // instead of re-running its own extract → mutate → repack cycle.
  await rewriteTarballFromDir(innerArchivePath[0], tempDir, innerAppBundleName);

  for (const dirName of WRAPPER_PHYSICAL_RESOURCE_DIRS) {
    const sourcePath = join(innerResourcesPath, dirName);
    if (!existsSync(sourcePath)) continue;
    const targetPath = join(wrapperResourcesPath, dirName);
    await rm(targetPath, { recursive: true, force: true });
    await cp(sourcePath, targetPath, { recursive: true });
  }
});

if (shouldRunLocalAdhocCodesign) {
  await adhocCodesignAppBundle(wrapperBundlePath);
}
