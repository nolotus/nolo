import { describe, expect, it } from "bun:test";
import {
  extractCompoundExtension,
  getDefaultDesktopArtifactSources,
  getDefaultDesktopSpaceName,
  guessDesktopArtifactMimeType,
} from "./desktopArtifactUpload";

describe("desktopArtifactUpload", () => {
  it("resolves default alpha artifact sources and upload names", () => {
    const artifacts = getDefaultDesktopArtifactSources({
      repoRoot: "C:\\repo",
      channel: "alpha",
    });

    expect(artifacts.map((artifact) => artifact.uploadName)).toEqual([
      "canary-win-x64-NoloDesktop-Setup-canary.exe",
      "canary-win-x64-NoloDesktop-canary.tar.zst",
      "canary-win-x64-NoloDesktop-Setup-canary.zip",
      "canary-win-x64-update.json",
    ]);
    expect(artifacts[0]?.sourcePath).toContain(
      "packages\\desktop\\build\\canary-win-x64\\Nolo Desktop-Setup-canary.exe",
    );
  });

  it("resolves default stable artifact sources and upload names", () => {
    const artifacts = getDefaultDesktopArtifactSources({
      repoRoot: "C:\\repo",
      channel: "stable",
    });

    expect(artifacts.map((artifact) => artifact.uploadName)).toEqual([
      "stable-win-x64-NoloDesktop-Setup.exe",
      "stable-win-x64-NoloDesktop-Setup.zip",
      "stable-win-x64-update.json",
    ]);
    expect(artifacts[0]?.sourcePath).toContain(
      "packages\\desktop\\build\\stable-win-x64\\Nolo Desktop-Setup.exe",
    );
  });

  it("preserves compound extensions and known mime types", () => {
    expect(extractCompoundExtension("canary-win-x64-NoloDesktop-canary.tar.zst")).toBe(
      ".tar.zst",
    );
    expect(extractCompoundExtension("stable-win-x64-update.json")).toBe(".json");
    expect(guessDesktopArtifactMimeType("foo.exe")).toBe(
      "application/vnd.microsoft.portable-executable",
    );
    expect(guessDesktopArtifactMimeType("foo.tar.zst")).toBe("application/zstd");
  });

  it("builds readable default space names", () => {
    expect(
      getDefaultDesktopSpaceName({
        channel: "alpha",
        buildSha: "03b6a2ed",
        spaceId: "01ABC",
      }),
    ).toBe("Alpha Desktop 03b6a2ed 01ABC");
  });
});
