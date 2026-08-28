import {
  adhocCodesignAppBundle,
  findAppBundleInDir,
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

const appIconIcnsPath = resolve(import.meta.dir, "../assets/AppIcon.icns");
const wrapperResourcesPath = join(wrapperBundlePath, "Contents", "Resources");
if (!existsSync(wrapperResourcesPath)) {
  process.exit(0);
}

// Static trees the embedded server must be able to address physically inside the
// installed wrapper (settings.css, locales, integrations) before/without first-run
// self-extraction. Staged here, before electrobun's release codesign/notarization,
// so the wrapper signature seals them.
const WRAPPER_PHYSICAL_RESOURCE_DIRS = [
  "app",
  "integrations",
  "desktop-chrome-connector",
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
