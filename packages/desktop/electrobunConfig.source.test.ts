import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import config, {
  resolveDesktopBunVersion,
  resolveDesktopDevWatchIgnores,
  resolveGeneratePatch,
  resolveRepoRootRuntimeWatchIgnores,
} from "./electrobun.config";
import { DESKTOP_APP_VERSION } from "./desktopVersion";

const preBuildSource = readFileSync(new URL("./scripts/pre-build.ts", import.meta.url), "utf8");
const macosFfiPatchSource = readFileSync(
  new URL("./scripts/patch-electrobun-macos-ffi.ts", import.meta.url),
  "utf8"
);

describe("desktop electrobun config", () => {
  it("uses the desktop package version as the single app version source", () => {
    expect(config.app.version).toBe(DESKTOP_APP_VERSION);
  });

  it("uses the current Bun runtime for macOS desktop startup by default on macOS", () => {
    expect(resolveDesktopBunVersion("darwin", {})).toBe("1.3.14");
  });

  it("uses the current Bun runtime for Windows desktop startup", () => {
    expect(resolveDesktopBunVersion("win32", {})).toBe("1.3.14");
  });

  it("allows desktop Bun runtime overrides for local packaging probes", () => {
    expect(resolveDesktopBunVersion("darwin", { NOLO_DESKTOP_BUN_VERSION: "1.2.23" })).toBe("1.2.23");
  });

  it("uses the platform-resolved Bun runtime in the Electrobun build config", () => {
    expect(config.build.bunVersion).toBe(resolveDesktopBunVersion());
  });

  it("patches Electrobun macOS FFI declarations before packaging", () => {
    expect(preBuildSource).toContain("patchElectrobunMacosFfi()");
    expect(macosFfiPatchSource).toContain('process.platform !== "darwin"');
    expect(macosFfiPatchSource).toContain("activateWindow");
    expect(macosFfiPatchSource).toContain("native_.symbols.showWindow(windowPtr, true)");
    expect(macosFfiPatchSource).toContain("setWindowButtonPosition is unavailable");
  });

  it("keeps RN-only blob util out of the desktop Bun bundle", () => {
    expect(config.build.bun.external).toContain("react-native-blob-util");
  });

  it("keeps optional browser automation packages out of the desktop Bun bundle", () => {
    expect(config.build.bun.external).toContain("playwright");
    expect(config.build.bun.external).toContain("playwright-core/*");
    expect(config.build.bun.external).toContain("chromium-bidi/*");
  });

  it("keeps LevelDB native bindings outside the bundled JS path", () => {
    expect(config.build.bun.external).toContain("classic-level");
    expect(config.build.copy).toMatchObject({
      "../../node_modules/abstract-level": "node_modules/abstract-level",
      "../../node_modules/classic-level": "node_modules/classic-level",
      "../../node_modules/module-error": "node_modules/module-error",
      "../../node_modules/node-gyp-build": "node_modules/node-gyp-build",
      "../../packages/desktop-chrome-connector": "../desktop-chrome-connector",
      "../../packages/integrations/x-reader": "../integrations/x-reader",
      "../../packages/integrations/xhs-reader": "../integrations/xhs-reader",
      "vendor/ripgrep/staged": "bin",
    });
  });

  it("stages bundled ripgrep during pre-build for local agent codeSearch/globFiles", () => {
    expect(preBuildSource).toContain("ensureBundledRipgrep");
    expect(preBuildSource).toContain("NOLO_DESKTOP_SKIP_BUNDLED_RG");
  });

  it("ships the Chrome connector source package with packaged desktop builds", () => {
    expect(config.build.copy).toMatchObject({
      "../../packages/desktop-chrome-connector": "../desktop-chrome-connector",
    });
  });

  it("preserves the validated macOS packaging baseline", () => {
    expect(config.build.mac.bundleCEF).toBe(false);
    expect(config.build.mac.defaultRenderer).toBe("native");
  });

  it("uses the native Windows renderer because the installer provisions WebView2", () => {
    expect(config.build.win.bundleCEF).toBe(false);
    expect(config.build.win.defaultRenderer).toBe("native");
  });

  it("defaults Linux delta patches off with an explicit force override", () => {
    const electrobunConfigSource = readFileSync(
      new URL("./electrobun.config.ts", import.meta.url),
      "utf8"
    );
    expect(electrobunConfigSource).toContain('env.NOLO_DESKTOP_SKIP_PATCH === "1"');
    expect(electrobunConfigSource).toContain('platform === "linux"');
    expect(electrobunConfigSource).toContain('env.NOLO_DESKTOP_FORCE_PATCH === "1"');
    expect(resolveGeneratePatch("linux", {})).toBe(false);
    expect(resolveGeneratePatch("linux", { NOLO_DESKTOP_FORCE_PATCH: "1" })).toBe(true);
    expect(resolveGeneratePatch("linux", { NOLO_DESKTOP_SKIP_PATCH: "1" })).toBe(false);
    expect(
      resolveGeneratePatch("linux", {
        NOLO_DESKTOP_FORCE_PATCH: "1",
        NOLO_DESKTOP_SKIP_PATCH: "1",
      })
    ).toBe(false);
    expect(resolveGeneratePatch("darwin", {})).toBe(true);
    expect(resolveGeneratePatch("win32", {})).toBe(true);
    expect(resolveGeneratePatch("darwin", { NOLO_DESKTOP_SKIP_PATCH: "1" })).toBe(false);
    expect(config.release.generatePatch).toBe(resolveGeneratePatch());
  });

  it("ignores repo-root .git, node_modules, and runtime dirs while watching source parents", () => {
    const repoRoot = resolve(import.meta.dir, "../..");
    const normalizedRepoRoot = repoRoot.replace(/\\/g, "/");
    const runtimeIgnores = resolveRepoRootRuntimeWatchIgnores(repoRoot);
    const devIgnores = resolveDesktopDevWatchIgnores(repoRoot);

    expect(config.build.watchIgnore).toEqual([
      "**/.git/**",
      "**/node_modules/**",
      "**/*.test.ts",
      "**/*.test.tsx",
      "**/*.tsbuildinfo",
      "**/*.log",
      ...runtimeIgnores,
      ...devIgnores,
    ]);
    expect(runtimeIgnores).toEqual([
      `${normalizedRepoRoot}/data/**`,
      `${normalizedRepoRoot}/logs/**`,
      `${normalizedRepoRoot}/temp/**`,
      `${normalizedRepoRoot}/tmp/**`,
      `${normalizedRepoRoot}/nolo/**`,
    ]);
    expect(config.build.watch).toContain("../../App.tsx");
    expect(config.build.watch).toContain("../../index.js");
    expect(devIgnores).toContain(`${normalizedRepoRoot}/docs/**`);
    expect(devIgnores).toContain(`${normalizedRepoRoot}/public/**`);
    expect(devIgnores).toContain(`${normalizedRepoRoot}/packages/render/**`);
    expect(devIgnores).toContain(`${normalizedRepoRoot}/packages/ai/agent/web/**`);

    const gitIgnore = new Bun.Glob("**/.git/**");
    const nodeModulesIgnore = new Bun.Glob("**/node_modules/**");
    const runtimeGlobs = runtimeIgnores.map((pattern) => new Bun.Glob(pattern));

    const gitPath = `${repoRoot}/.git/objects/pack/pack-abc.pack`;
    const nodeModulesPath = `${repoRoot}/node_modules/some-pkg/index.js`;
    const rootDataPath = `${repoRoot}/data/sampler.out.log`;
    const rootLogsPath = `${repoRoot}/logs/app.log`;
    const rootTempPath = `${repoRoot}/temp/cache.bin`;
    const rootTmpPath = `${repoRoot}/tmp/scratch.txt`;
    const packageDataPath = `${repoRoot}/packages/chat/data/schema.ts`;
    const sourcePath = `${repoRoot}/packages/app/pages/QuickChat.tsx`;

    expect(gitIgnore.match(gitPath)).toBe(true);
    expect(nodeModulesIgnore.match(nodeModulesPath)).toBe(true);
    expect(runtimeGlobs.some((g) => g.match(rootDataPath))).toBe(true);
    expect(runtimeGlobs.some((g) => g.match(rootLogsPath))).toBe(true);
    expect(runtimeGlobs.some((g) => g.match(rootTempPath))).toBe(true);
    expect(runtimeGlobs.some((g) => g.match(rootTmpPath))).toBe(true);

    expect(gitIgnore.match(sourcePath)).toBe(false);
    expect(nodeModulesIgnore.match(sourcePath)).toBe(false);
    expect(runtimeGlobs.some((g) => g.match(packageDataPath))).toBe(false);
    expect(runtimeGlobs.some((g) => g.match(sourcePath))).toBe(false);
  });
});
