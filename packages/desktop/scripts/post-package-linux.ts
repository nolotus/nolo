import { withTempDir } from "./codesign-local";
import { readPayloadVersionInfo } from "./payload-version";
import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { asOptionalTrimmedString } from "core/optionalString";
import { buildLinuxDesktopEntry } from "../src/bun/linuxDesktopEntry";

export const createLinuxRpmArtifact = async ({
  artifactDir,
  buildEnv,
}: {
  artifactDir: string;
  buildEnv?: string;
}) => {
  if (process.platform !== "linux") {
    return;
  }

  // RPM is experimental/opt-in. Official Linux tar.zst + update metadata must not
  // depend on rpmbuild success or the presence of rpm tooling on the runner.
  if (process.env.NOLO_DESKTOP_BUILD_RPM !== "1") {
    console.log("[desktop] RPM generation is opt-in; publishing Linux tar artifacts");
    return;
  }

  if (buildEnv === "dev") {
    return;
  }

  const artifactNames = await readdir(artifactDir);
  const linuxTarballName = artifactNames.find(
    (name) => name.includes("linux") && name.endsWith(".tar.zst")
  );

  if (!linuxTarballName) {
    return;
  }

  const rpmbuildProc = Bun.spawnSync(["which", "rpmbuild"], { stdout: "ignore", stderr: "ignore" });
  if (rpmbuildProc.exitCode !== 0) {
    console.warn("[desktop] rpmbuild not found, skipping RPM artifact generation");
    return;
  }

  await withTempDir("nolo-desktop-linux-rpm-", async (tempDir) => {
    const tarballPath = join(artifactDir, linuxTarballName);
    const sourcesDir = join(tempDir, "SOURCES");
    const appSourceDir = join(sourcesDir, "nolo-desktop-linux");
    await mkdir(appSourceDir, { recursive: true });

    const extractProc = Bun.spawn(
      ["tar", "--zstd", "-xf", tarballPath, "-C", appSourceDir],
      { stdout: "inherit", stderr: "inherit" }
    );
    if ((await extractProc.exited) !== 0) {
      throw new Error("Linux tarball extraction failed for RPM build");
    }

    const extractedItems = await readdir(appSourceDir);
    const innerFolder = (extractedItems.length === 1 && existsSync(join(appSourceDir, extractedItems[0], "bin")))
      ? extractedItems[0] + "/"
      : "";

    const rpmIconSrc = join(appSourceDir, innerFolder, "Resources", "appIcon.png");
    const hasRpmIcon = existsSync(rpmIconSrc);

    writeFileSync(
      join(sourcesDir, "nolo-desktop.desktop"),
      buildLinuxDesktopEntry({ launcherPath: "/opt/nolo-desktop/bin/launcher" }),
      "utf8"
    );

    const specPath = join(tempDir, "SPECS", "nolo-desktop.spec");
    await mkdir(join(tempDir, "SPECS"), { recursive: true });

    const versionInfo = readPayloadVersionInfo(join(appSourceDir, innerFolder));
    const version = (asOptionalTrimmedString(versionInfo?.version) ?? "0.1.0").replace(/-/g, '_');

    const rpmIconInstallBlock = hasRpmIcon
      ? `mkdir -p $RPM_BUILD_ROOT/usr/share/icons/hicolor/512x512/apps\ncp $RPM_BUILD_ROOT/opt/nolo-desktop/Resources/appIcon.png $RPM_BUILD_ROOT/usr/share/icons/hicolor/512x512/apps/nolo-desktop.png\n\n`
      : "";
    const rpmIconFilesLine = hasRpmIcon ? "/usr/share/icons/hicolor/512x512/apps/nolo-desktop.png" : "";

    const specContent = `
Name:           nolo-desktop
Version:        ${version}
Release:        1%{?dist}
Summary:        Nolo Desktop Application
License:        Proprietary
Group:          Applications/Internet
AutoReqProv:    no
Requires:       gtk3, desktop-file-utils

%description
Nolo Desktop client.

%prep

%build

%install
mkdir -p $RPM_BUILD_ROOT/opt/nolo-desktop
cp -aL "%{_sourcedir}/nolo-desktop-linux/${innerFolder}"* $RPM_BUILD_ROOT/opt/nolo-desktop/

mkdir -p $RPM_BUILD_ROOT/usr/share/applications
cp "%{_sourcedir}/nolo-desktop.desktop" $RPM_BUILD_ROOT/usr/share/applications/

${rpmIconInstallBlock}mkdir -p $RPM_BUILD_ROOT/usr/bin
ln -s /opt/nolo-desktop/bin/launcher $RPM_BUILD_ROOT/usr/bin/nolo-desktop

%post
/usr/bin/update-desktop-database -q /usr/share/applications || true
/usr/bin/gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true

%postun
/usr/bin/update-desktop-database -q /usr/share/applications || true
/usr/bin/gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true

%files
/opt/nolo-desktop
/usr/bin/nolo-desktop
/usr/share/applications/nolo-desktop.desktop
${rpmIconFilesLine}
`;
    writeFileSync(specPath, specContent, "utf8");

    const rpmbuildRun = Bun.spawn(
      ["rpmbuild", "-bb", "--define", "_topdir " + tempDir, specPath],
      { stdout: "inherit", stderr: "inherit" }
    );
    const rpmCode = await rpmbuildRun.exited;
    if (rpmCode !== 0) {
      throw new Error("rpmbuild failed with exit code " + rpmCode);
    }

    const rpmsDir = join(tempDir, "RPMS");
    if (existsSync(rpmsDir)) {
      const archDirs = await readdir(rpmsDir);
      for (const arch of archDirs) {
        const archDir = join(rpmsDir, arch);
        const rpms = await readdir(archDir);
        for (const rpm of rpms) {
          if (rpm.endsWith(".rpm")) {
            await cp(join(archDir, rpm), join(artifactDir, rpm));
            console.log("[desktop] Generated RPM artifact: " + rpm);
          }
        }
      }
    }
  });
};

export const createLinuxDebArtifact = async ({
  artifactDir,
  buildEnv,
}: {
  artifactDir: string;
  buildEnv?: string;
}) => {
  if (process.platform !== "linux") return;
  if (process.env.NOLO_DESKTOP_BUILD_DEB !== "1") {
    console.log("[desktop] DEB generation is opt-in; skipping");
    return;
  }
  if (buildEnv === "dev") return;

  const artifactNames = await readdir(artifactDir);
  const linuxTarballName = artifactNames.find(
    (name) => name.includes("linux") && name.endsWith(".tar.zst"),
  );
  if (!linuxTarballName) return;

  const dpkgProc = Bun.spawnSync(["which", "dpkg-deb"], { stdout: "ignore", stderr: "ignore" });
  if (dpkgProc.exitCode !== 0) {
    console.warn("[desktop] dpkg-deb not found, skipping DEB artifact generation");
    return;
  }

  await withTempDir("nolo-desktop-linux-deb-", async (tempDir) => {
    const tarballPath = join(artifactDir, linuxTarballName);
    const pkgDir = join(tempDir, "nolo-desktop");
    const optDir = join(pkgDir, "opt", "nolo-desktop");
    const debianDir = join(pkgDir, "DEBIAN");
    const appsDir = join(pkgDir, "usr", "share", "applications");
    const iconsDir = join(pkgDir, "usr", "share", "icons", "hicolor", "512x512", "apps");
    const binDir = join(pkgDir, "usr", "bin");

    await mkdir(optDir, { recursive: true });
    await mkdir(debianDir, { recursive: true });
    await mkdir(appsDir, { recursive: true });
    await mkdir(iconsDir, { recursive: true });
    await mkdir(binDir, { recursive: true });

    const extractProc = Bun.spawn(
      ["tar", "--zstd", "-xf", tarballPath, "-C", optDir, "--strip-components=1"],
      { stdout: "inherit", stderr: "inherit" },
    );
    if ((await extractProc.exited) !== 0) {
      throw new Error("Linux tarball extraction failed for DEB build");
    }

    const versionInfo = readPayloadVersionInfo(optDir);
    const version = asOptionalTrimmedString(versionInfo?.version) ?? "0.1.0";

    writeFileSync(
      join(appsDir, "nolo-desktop.desktop"),
      buildLinuxDesktopEntry({ launcherPath: "/opt/nolo-desktop/bin/launcher" }),
      "utf8"
    );

    const iconSrc = join(optDir, "Resources", "appIcon.png");
    if (existsSync(iconSrc)) {
      await cp(iconSrc, join(iconsDir, "nolo-desktop.png"));
    }

    const symlinkProc = Bun.spawn(
      ["ln", "-s", "/opt/nolo-desktop/bin/launcher", join(binDir, "nolo-desktop")],
      { stdout: "inherit", stderr: "inherit" },
    );
    await symlinkProc.exited;

    const controlContent = `Package: nolo-desktop
Version: ${version}
Section: net
Priority: optional
Architecture: amd64
Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils, libatspi2.0-0, libdrm2, libgbm1
Maintainer: Nolo <noreply@nolo.chat>
Description: Nolo Desktop Application
 Nolo Desktop client for Linux.
`;
    writeFileSync(join(debianDir, "control"), controlContent, "utf8");

    // Post-install: refresh desktop database and icon cache so the app
    // appears in application launchers immediately.
    const postinstContent = `#!/bin/sh
set -e
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi
`;
    writeFileSync(join(debianDir, "postinst"), postinstContent, "utf8");
    const { chmodSync } = await import("node:fs");
    chmodSync(join(debianDir, "postinst"), 0o755);

    // Post-uninstall: refresh caches after removal.
    const postrmContent = `#!/bin/sh
set -e
if command -v update-desktop-database >/dev/null 2>&1; then
  update-desktop-database -q /usr/share/applications || true
fi
if command -v gtk-update-icon-cache >/dev/null 2>&1; then
  gtk-update-icon-cache -q -t -f /usr/share/icons/hicolor || true
fi
`;
    writeFileSync(join(debianDir, "postrm"), postrmContent, "utf8");
    chmodSync(join(debianDir, "postrm"), 0o755);

    const debName = `nolo-desktop_${version}_amd64.deb`;
    const debPath = join(artifactDir, debName);
    const dpkgRun = Bun.spawn(
      ["dpkg-deb", "--build", "--root-owner-group", pkgDir, debPath],
      { stdout: "inherit", stderr: "inherit" },
    );
    const debCode = await dpkgRun.exited;
    if (debCode !== 0) {
      throw new Error("dpkg-deb failed with exit code " + debCode);
    }
    console.log("[desktop] Generated DEB artifact: " + debName);
  });
};
