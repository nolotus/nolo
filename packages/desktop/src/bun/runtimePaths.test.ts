import { describe, expect, it } from "bun:test";
import {
  findMonorepoPublicDir,
  findMonorepoRoot,
  isMonorepoPublicRoot,
  resolveDesktopChannelDir,
  resolveDesktopDataRoot,
  resolveDesktopLlamaSupervisorLogDir,
  resolveDesktopPublicDir,
} from "./runtimePaths";

describe("desktop runtime paths", () => {
  it("uses the macOS Application Support root on darwin", () => {
    expect(
      resolveDesktopChannelDir("stable", {
        platform: "darwin",
        homeDir: "/Users/tester",
      })
    ).toBe("/Users/tester/Library/Application Support/chat.nolo.desktop/stable");
  });

  it("uses LOCALAPPDATA on Windows", () => {
    expect(
      resolveDesktopChannelDir("stable", {
        platform: "win32",
        env: {
          LOCALAPPDATA: "C:\\Users\\tester\\AppData\\Local",
        },
        homeDir: "C:\\Users\\tester",
      })
    ).toBe("C:\\Users\\tester\\AppData\\Local\\chat.nolo.desktop\\stable");
  });

  it("falls back to AppData\\Local when LOCALAPPDATA is missing", () => {
    expect(
      resolveDesktopDataRoot({
        platform: "win32",
        env: {},
        homeDir: "C:\\Users\\tester",
      })
    ).toBe("C:\\Users\\tester\\AppData\\Local");
  });

  it("uses XDG_DATA_HOME on Linux when provided", () => {
    expect(
      resolveDesktopChannelDir("canary", {
        platform: "linux",
        env: {
          XDG_DATA_HOME: "/tmp/xdg-data",
        },
        homeDir: "/home/tester",
      })
    ).toBe("/tmp/xdg-data/chat.nolo.desktop/canary");
  });

  it("roots llama supervisor files under the stable desktop user-data channel dir on Windows", () => {
    expect(
      resolveDesktopLlamaSupervisorLogDir("stable", {
        platform: "win32",
        env: {
          LOCALAPPDATA: "D:\\Users\\tester\\AppData\\Local",
        },
        homeDir: "D:\\Users\\tester",
      })
    ).toBe(
      "D:\\Users\\tester\\AppData\\Local\\chat.nolo.desktop\\stable\\logs\\llama-supervisor"
    );
  });
});

describe("resolveDesktopPublicDir", () => {
  const monorepoRoot = "/Users/dev/bun-nolo";
  const monorepoPublic = `${monorepoRoot}/public`;
  const installed = "/Apps/Nolo.app/Contents/Resources/app/public";
  const packaged =
    "/Users/dev/bun-nolo/packages/desktop/build/dev-macos-arm64/Nolo Desktop-dev.app/Contents/Resources/app/public";
  const nestedMacOs =
    "/Users/dev/bun-nolo/packages/desktop/build/dev-macos-arm64/Nolo Desktop-dev.app/Contents/MacOS";

  const pathExists = (path: string) => {
    const known = new Set([
      monorepoPublic,
      `${monorepoRoot}/public/latest-assets.json`,
      `${monorepoRoot}/packages/desktop/package.json`,
      installed,
      packaged,
      nestedMacOs,
    ]);
    return known.has(path);
  };

  it("detects monorepo public roots", () => {
    expect(isMonorepoPublicRoot(monorepoRoot, pathExists)).toBe(true);
    expect(isMonorepoPublicRoot("/tmp/other", pathExists)).toBe(false);
  });

  it("walks up from nested .app MacOS cwd to monorepo public", () => {
    expect(findMonorepoPublicDir([nestedMacOs], pathExists)).toBe(monorepoPublic);
  });

  it("walks up from nested .app MacOS cwd to monorepo root via findMonorepoRoot", () => {
    expect(findMonorepoRoot([nestedMacOs], pathExists)).toBe(monorepoRoot);
    expect(findMonorepoRoot(["/tmp/unknown"], pathExists)).toBeNull();
  });

  it("prefers NOLO_PUBLIC_DIR when it exists", () => {
    const resolved = resolveDesktopPublicDir({
      isDev: true,
      installedPublicDir: installed,
      packagedPublicDir: packaged,
      env: { NOLO_PUBLIC_DIR: monorepoPublic },
      searchFrom: [nestedMacOs],
      pathExists,
    });
    expect(resolved).toEqual({ publicDir: monorepoPublic, source: "env" });
  });

  it("uses monorepo public in dev so live web builds are served", () => {
    const resolved = resolveDesktopPublicDir({
      isDev: true,
      installedPublicDir: installed,
      packagedPublicDir: packaged,
      env: {},
      searchFrom: [nestedMacOs],
      pathExists,
    });
    expect(resolved).toEqual({ publicDir: monorepoPublic, source: "monorepo-dev" });
  });

  it("can force packaged public in dev for bundle smoke tests", () => {
    const resolved = resolveDesktopPublicDir({
      isDev: true,
      installedPublicDir: installed,
      packagedPublicDir: packaged,
      env: { NOLO_DESKTOP_USE_PACKAGED_PUBLIC: "1" },
      searchFrom: [nestedMacOs],
      pathExists,
    });
    expect(resolved).toEqual({ publicDir: packaged, source: "packaged" });
  });

  it("uses installed Resources public in non-dev when present", () => {
    const resolved = resolveDesktopPublicDir({
      isDev: false,
      installedPublicDir: installed,
      packagedPublicDir: packaged,
      env: {},
      searchFrom: [],
      pathExists,
    });
    expect(resolved).toEqual({ publicDir: installed, source: "installed" });
  });

  it("falls back to packaged public when monorepo is not found in dev", () => {
    const resolved = resolveDesktopPublicDir({
      isDev: true,
      installedPublicDir: installed,
      packagedPublicDir: packaged,
      env: {},
      searchFrom: ["/tmp/orphan-app/Contents/MacOS"],
      pathExists: (path) => path === packaged || path === installed,
    });
    expect(resolved).toEqual({ publicDir: packaged, source: "packaged" });
  });
});
