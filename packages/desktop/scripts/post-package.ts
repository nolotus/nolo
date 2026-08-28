import { cp, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { createBrandedMacosDmg } from "./macos-dmg-installer";
import { createWindowsInstallerArtifact } from "./post-package-windows";
import { createLinuxRpmArtifact, createLinuxDebArtifact } from "./post-package-linux";

const artifactDir = process.env.ELECTROBUN_ARTIFACT_DIR;
if (!artifactDir) {
  throw new Error("ELECTROBUN_ARTIFACT_DIR is required for desktop postPackage");
}

const buildEnv = process.env.ELECTROBUN_BUILD_ENV;

// Dev launches from build/dev-* and reads the monorepo public tree directly.
// Never rewrite release artifacts (or copy a stale canary tarball) during watch mode.
if (buildEnv === "dev") {
  process.exit(0);
}

if (!existsSync(artifactDir)) {
  process.exit(0);
}

const buildRootDir = resolve(import.meta.dir, "../build");

const findWrapperInnerArchive = async (channelDir: string) => {
  if (!existsSync(channelDir)) {
    return null;
  }
  const appBundleName = (await readdir(channelDir)).find((name) => name.endsWith(".app"));
  if (!appBundleName) {
    return null;
  }
  const resourcesPath = join(channelDir, appBundleName, "Contents", "Resources");
  if (!existsSync(resourcesPath)) {
    return null;
  }
  const archiveName = (await readdir(resourcesPath)).find((name) => name.endsWith(".tar.zst"));
  return archiveName ? join(resourcesPath, archiveName) : null;
};

// postWrap already rewrote the wrapper's embedded inner archive with the branded
// AppIcon and (for local builds) the ad-hoc inner signature. The published
// standalone macOS artifact must carry exactly that content — as a flat launchable
// app, not a wrapper self-extractor — so copy the embedded archive over the
// artifact instead of re-running an extract → mutate → repack cycle on the payload.
const syncMacArtifactTarballsFromWrapper = async () => {
  const standaloneArtifactTarballs = (await readdir(artifactDir)).filter((name) =>
    name.endsWith(".app.tar.zst")
  );
  if (standaloneArtifactTarballs.length === 0) {
    return;
  }

  const channelDirNames = existsSync(buildRootDir) ? await readdir(buildRootDir) : [];
  for (const tarballName of standaloneArtifactTarballs) {
    const channelDirName = channelDirNames.find((dir) => tarballName.startsWith(`${dir}-`));
    const innerArchivePath = channelDirName
      ? await findWrapperInnerArchive(join(buildRootDir, channelDirName))
      : null;
    if (!innerArchivePath) {
      throw new Error(
        `No wrapper inner archive found in ${buildRootDir} for artifact ${tarballName}; postWrap must run before postPackage`
      );
    }
    console.log(`[desktop] syncing ${tarballName} from ${innerArchivePath}`);
    await cp(innerArchivePath, join(artifactDir, tarballName));
  }
};

const createBrandedMacosDmgArtifacts = async () => {
  if (buildEnv === "dev" || process.env.NOLO_DESKTOP_SKIP_DMG === "1") {
    return;
  }
  if (process.env.NOLO_DESKTOP_BRANDED_DMG === "0") {
    return;
  }
  if (process.platform !== "darwin") {
    return;
  }

  // Only the channel this build actually produced. A stale sibling channel dir in
  // build/ (e.g. an old stable build during a canary run) must never be repackaged
  // into a fresh DMG artifact.
  const channelDirName = process.env.ELECTROBUN_BUILD_DIR
    ? basename(process.env.ELECTROBUN_BUILD_DIR)
    : `${buildEnv}-macos-arm64`;
  const channelDir = join(buildRootDir, channelDirName);
  if (!existsSync(channelDir)) {
    return;
  }

  await createBrandedMacosDmg({
    channelDir,
    artifactDir,
    platformPrefix: channelDirName,
    buildEnv,
    appDisplayName: channelDirName.startsWith("canary-")
      ? "Nolo Desktop-canary"
      : "Nolo Desktop",
  });
};

await syncMacArtifactTarballsFromWrapper();
await createWindowsInstallerArtifact({ artifactDir, buildEnv });
await createBrandedMacosDmgArtifacts();
try {
  await createLinuxRpmArtifact({ artifactDir, buildEnv });
} catch (error) {
  // RPM is an optional convenience artifact. A broken rpmbuild toolchain must not
  // turn an otherwise valid Linux tar/update release into a failed release.
  console.warn("[desktop] Optional RPM generation failed; continuing with Linux tar artifacts:", error);
}
try {
  await createLinuxDebArtifact({ artifactDir, buildEnv });
} catch (error) {
  console.warn("[desktop] Optional DEB generation failed; continuing with Linux tar artifacts:", error);
}
