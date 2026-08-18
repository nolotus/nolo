import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const themeSource = readFileSync(new URL("./scripts/macos-dmg-theme.ts", import.meta.url), "utf8");
const backgroundSource = readFileSync(new URL("./scripts/macos-dmg-background.ts", import.meta.url), "utf8");
const installerSource = readFileSync(new URL("./scripts/macos-dmg-installer.ts", import.meta.url), "utf8");
const postPackageSource = readFileSync(new URL("./scripts/post-package.ts", import.meta.url), "utf8");
const electrobunConfigSource = readFileSync(new URL("./electrobun.config.ts", import.meta.url), "utf8");

describe("macOS branded dmg installer", () => {
  it("loads dmg installer copy from clientDownloads.macosDmgInstaller i18n", () => {
    expect(themeSource).toContain("buildMacosDmgInstallerTheme");
    const i18nSource = readFileSync(
      new URL("../app/i18n/translations/interface.locale.ts", import.meta.url),
      "utf8",
    );
    expect(i18nSource).toContain("macosDmgInstaller");
    expect(i18nSource).toContain("拖到「应用程序」");
  });

  it("uses a flat minimal installer palette", () => {
    expect(themeSource).toContain("#F5F5F7");
    expect(themeSource).toContain("buildMacosDmgInstallerTheme");
  });

  it("renders only flat fill, title, subtitle, and arrow", () => {
    expect(backgroundSource).toContain('fill="${background}"');
    expect(backgroundSource).not.toContain("linearGradient");
    expect(backgroundSource).not.toContain("primaryGhost");
  });

  it("builds a Finder-layout dmg from the packaged app bundle", () => {
    expect(installerSource).toContain("hdiutil");
    expect(installerSource).toContain("osascript");
    expect(installerSource).toContain(".background");
    expect(installerSource).toContain("symlink");
  });

  it("wires branded dmg creation into desktop post-package on macOS release builds", () => {
    expect(postPackageSource).toContain("createBrandedMacosDmgArtifacts");
    expect(postPackageSource).toContain("NOLO_DESKTOP_BRANDED_DMG");
    expect(electrobunConfigSource).toContain("NOLO_DESKTOP_BRANDED_DMG");
  });
});