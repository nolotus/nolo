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

// --- Desktop capability gate (Phase 3) --------------------------------------
// 打包完成后立即 fail-closed 验证公开 desktop capability（edition/匿名本地/
// session bridge/隐私拒绝），把证据 JSON + capability web tree 快照写进 artifacts，
// 供 release job 在 publishDesktopDownloads.ts 之前对真实 bytes 重新推导。
// login/account action 属于 release gate（构建后路由接线），此处在证据中记录
// 但不阻塞单平台构建 —— build hard gate 与 installed smoke 的边界见 verifier 头注释。
// 证据必须派生自真实打包内容，绝不接受 `.generated/public` 复制品：
// - Linux：扫描实际发布的 tar.zst / deb 归档里的 public tree；
// - macOS：扫描实际发布的 .app.tar.zst 归档里的 public tree；
// - Windows：Inno Setup 安装器无法在 release runner 上解包，证据由 Windows
//   构建机上的 installed smoke 写入（见 smokeInstalledWindowsDesktop.ps1）。
const CAPABILITY_PAYLOAD_EXTENSIONS = [".tar.zst", ".deb"] as const;

const verifyDesktopCapability = async () => {
  const repoRootFromScripts = resolve(import.meta.dir, "../../..");
  const verifierCandidates = [
    join(repoRootFromScripts, "scripts", "verify", "desktop", "verifyDesktopPackageCapability.ts"),
    join(repoRootFromScripts, "scripts", "public-audit", "desktop", "verifyDesktopPackageCapability.ts"),
  ];
  const verifierPath = verifierCandidates.find((candidate) => existsSync(candidate));
  if (!verifierPath) {
    throw new Error(
      `Desktop capability verifier not found (looked in:\n${verifierCandidates.join("\n")})`,
    );
  }

  // Windows 的发布物是 Inno Setup 安装器：既无法在构建机上解包比对，也不是
  // verifier 的 payload 契约里的归档。其能力证据**必须**由 installed smoke 在
  // 真实安装后写入（见 smokeInstalledWindowsDesktop.ps1 的 installed 模式）。
  //
  // 这里必须无条件跳过：此前只在「没有可解包归档」时才早退，于是当 artifacts 里
  // 恰好存在 .tar.zst（更新包/中间产物）时会写出 extracted-payload 证据，而它与
  // smoke 写的 installed 证据**共用同一个文件名** desktop-capability-evidence.json
  // —— 变成「谁后写谁生效」的脆弱依赖（2026-09-14 stable 日志实测出现过
  // "extracted-payload capability evidence written for windows"）。
  if (process.platform === "win32") {
    console.log(
      "[desktop-capability] Windows capability evidence is written by the installed smoke step; skipping build-time payload evidence",
    );
    return;
  }

  const payloadArchives = (await readdir(artifactDir))
    .filter((name) => CAPABILITY_PAYLOAD_EXTENSIONS.some((ext) => name.endsWith(ext)))
    .sort();

  if (payloadArchives.length === 0) {
    throw new Error(
      `[desktop-capability] no extractable payload archive (${CAPABILITY_PAYLOAD_EXTENSIONS.join(
        ", ",
      )}) found in ${artifactDir}; capability evidence cannot be derived from real packaged bytes`,
    );
  }

  const args = [
    process.execPath,
    verifierPath,
    "payload",
    "--artifacts-dir",
    artifactDir,
    "--identity-root",
    join(repoRootFromScripts, "packages", "identity"),
  ];
  for (const name of payloadArchives) {
    args.push("--installer", join(artifactDir, name));
  }

  // macOS 的主发布物是 .dmg，而 dmg 无法在构建机上稳定解包比对：被扫描的是
  // .app.tar.zst。若二者分叉，gate 发现不了，因此必须把这条边界写进证据，
  // 不能让 extracted-payload 证据看起来像「扫过了渠道主下载物」。
  const hasDmg = (await readdir(artifactDir)).some((name) => name.endsWith(".dmg"));
  if (hasDmg) {
    args.push(
      "--limitation",
      "The scanned tree comes from the .app.tar.zst payload. The channel's primary macOS download is the .dmg, whose embedded app bundle is bound by sha256 only and is not unpacked or compared on the build runner.",
    );
  }

  const proc = Bun.spawnSync(args, { stdio: ["ignore", "inherit", "inherit"] });
  if (!proc.success) {
    throw new Error(
      `[desktop-capability] packaged capability gate failed with exit code ${proc.exitCode}; refusing to publish artifacts`,
    );
  }
};

await verifyDesktopCapability();
