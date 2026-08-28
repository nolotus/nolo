import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import {
  buildLinuxDesktopEntry,
  ensureLinuxDesktopEntry,
} from "./linuxDesktopEntry";

describe("linuxDesktopEntry", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "nolo-desktop-entry-test-"));
  });

  afterEach(() => {
    if (tempDir && existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it("builds expected desktop entry string", () => {
    const entry = buildLinuxDesktopEntry({ launcherPath: "/opt/nolo/bin/launcher" });
    expect(entry).toContain('[Desktop Entry]\n');
    expect(entry).toContain('Name=Nolo Desktop\n');
    expect(entry).toContain('Exec="/opt/nolo/bin/launcher" %U\n');
    expect(entry).toContain('Terminal=false\n');
    expect(entry).toContain('Type=Application\n');
    expect(entry).toContain('Icon=nolo-desktop\n');
    expect(entry).toContain('StartupWMClass=Nolo Desktop\n');
    expect(entry).toContain('Comment=Nolo Desktop Application\n');
    expect(entry).toContain('Categories=Utility;\n');
  });

  it("skips registration when platform is not linux", () => {
    const res = ensureLinuxDesktopEntry({ platform: "darwin" });
    expect(res).toEqual({ registered: false, reason: "not-linux" });
  });

  it("skips registration when sibling launcher binary is missing", () => {
    const res = ensureLinuxDesktopEntry({
      platform: "linux",
      execPath: "/opt/nolo/bin/bun",
      pathExists: () => false,
    });
    expect(res).toEqual({ registered: false, reason: "no-launcher-sibling" });
  });

  it("skips registration when system desktop entry already exists", () => {
    const execPath = "/opt/nolo/bin/bun";
    const launcherPath = "/opt/nolo/bin/launcher";
    const systemPath = "/usr/share/applications/nolo-desktop.desktop";

    const res = ensureLinuxDesktopEntry({
      platform: "linux",
      execPath,
      pathExists: (p) => p === launcherPath || p === systemPath,
    });

    expect(res).toEqual({ registered: false, reason: "system-entry-exists" });
  });

  it("performs first-time registration: writes desktop file, copies icon, and calls refresh", () => {
    const homeDir = posix.join(tempDir, "home");
    const execDir = posix.join(tempDir, "bundle/bin");
    const execPath = posix.join(execDir, "bun");
    const launcherPath = posix.join(execDir, "launcher");
    const resourcesDir = posix.join(tempDir, "bundle/Resources");
    const iconSrc = posix.join(resourcesDir, "appIcon.png");

    mkdirSync(execDir, { recursive: true });
    mkdirSync(resourcesDir, { recursive: true });
    writeFileSync(launcherPath, "fake launcher binary");
    writeFileSync(iconSrc, "fake icon data");

    const refreshCalls: string[] = [];

    const res = ensureLinuxDesktopEntry({
      platform: "linux",
      homeDir,
      execPath,
      resourcesDir,
      refreshDesktopDatabase: (appsDir) => {
        refreshCalls.push(appsDir);
      },
    });

    expect(res).toEqual({ registered: true, reason: "registered" });

    const targetDesktop = posix.join(homeDir, ".local/share/applications/nolo-desktop.desktop");
    expect(existsSync(targetDesktop)).toBe(true);

    const desktopContent = readFileSync(targetDesktop, "utf-8");
    expect(desktopContent).toContain(`Exec="${launcherPath}" %U\n`);
    expect(desktopContent).toContain("Icon=nolo-desktop\n");
    expect(desktopContent).toContain("Categories=Utility;\n");

    const targetIcon = posix.join(homeDir, ".local/share/icons/hicolor/512x512/apps/nolo-desktop.png");
    expect(existsSync(targetIcon)).toBe(true);
    expect(readFileSync(targetIcon, "utf-8")).toBe("fake icon data");

    expect(refreshCalls).toHaveLength(1);
    expect(refreshCalls[0]).toBe(posix.join(homeDir, ".local/share/applications"));
  });

  it("is idempotent: second invocation does not rewrite file or call refresh", () => {
    const homeDir = posix.join(tempDir, "home");
    const execDir = posix.join(tempDir, "bundle/bin");
    const execPath = posix.join(execDir, "bun");
    const launcherPath = posix.join(execDir, "launcher");
    const resourcesDir = posix.join(tempDir, "bundle/Resources");
    const iconSrc = posix.join(resourcesDir, "appIcon.png");

    mkdirSync(execDir, { recursive: true });
    mkdirSync(resourcesDir, { recursive: true });
    writeFileSync(launcherPath, "fake launcher binary");
    writeFileSync(iconSrc, "fake icon data");

    let refreshCount = 0;
    const refreshSpy = () => {
      refreshCount++;
    };

    const firstRes = ensureLinuxDesktopEntry({
      platform: "linux",
      homeDir,
      execPath,
      resourcesDir,
      refreshDesktopDatabase: refreshSpy,
    });

    expect(firstRes).toEqual({ registered: true, reason: "registered" });
    expect(refreshCount).toBe(1);

    refreshCount = 0;

    const secondRes = ensureLinuxDesktopEntry({
      platform: "linux",
      homeDir,
      execPath,
      resourcesDir,
      refreshDesktopDatabase: refreshSpy,
    });

    expect(secondRes).toEqual({ registered: true, reason: "already-up-to-date" });
    expect(refreshCount).toBe(0);
  });

  it("updates desktop entry when launcher path changes (app directory moved)", () => {
    const homeDir = posix.join(tempDir, "home");
    const execDir1 = posix.join(tempDir, "bundle1/bin");
    const execPath1 = posix.join(execDir1, "bun");
    const launcherPath1 = posix.join(execDir1, "launcher");

    mkdirSync(execDir1, { recursive: true });
    writeFileSync(launcherPath1, "fake launcher 1");

    let refreshCount = 0;
    const refreshSpy = () => {
      refreshCount++;
    };

    ensureLinuxDesktopEntry({
      platform: "linux",
      homeDir,
      execPath: execPath1,
      refreshDesktopDatabase: refreshSpy,
    });
    expect(refreshCount).toBe(1);

    const execDir2 = posix.join(tempDir, "bundle2/bin");
    const execPath2 = posix.join(execDir2, "bun");
    const launcherPath2 = posix.join(execDir2, "launcher");

    mkdirSync(execDir2, { recursive: true });
    writeFileSync(launcherPath2, "fake launcher 2");

    refreshCount = 0;
    const res2 = ensureLinuxDesktopEntry({
      platform: "linux",
      homeDir,
      execPath: execPath2,
      refreshDesktopDatabase: refreshSpy,
    });

    expect(res2).toEqual({ registered: true, reason: "registered" });
    expect(refreshCount).toBe(1);

    const targetDesktop = posix.join(homeDir, ".local/share/applications/nolo-desktop.desktop");
    const desktopContent = readFileSync(targetDesktop, "utf-8");
    expect(desktopContent).toContain(`Exec="${launcherPath2}" %U\n`);
  });

  it("suppresses exception thrown by refreshDesktopDatabase and returns registered true", () => {
    const homeDir = posix.join(tempDir, "home");
    const execDir = posix.join(tempDir, "bundle/bin");
    const execPath = posix.join(execDir, "bun");
    const launcherPath = posix.join(execDir, "launcher");

    mkdirSync(execDir, { recursive: true });
    writeFileSync(launcherPath, "fake launcher");

    const res = ensureLinuxDesktopEntry({
      platform: "linux",
      homeDir,
      execPath,
      refreshDesktopDatabase: () => {
        throw new Error("update-desktop-database failed");
      },
    });

    expect(res).toEqual({ registered: true, reason: "registered" });
  });

  it("catches internal exceptions and returns registered false with error reason", () => {
    const logs: string[] = [];
    const res = ensureLinuxDesktopEntry({
      platform: "linux",
      execPath: "/tmp/fake/bin/bun",
      pathExists: (p) => {
        if (p === "/tmp/fake/bin/launcher") return true;
        throw new Error("Disk error");
      },
      log: (msg) => logs.push(msg),
    });

    expect(res.registered).toBe(false);
    expect(res.reason).toBe("error: Disk error");
    expect(logs.length).toBe(1);
    expect(logs[0]).toContain("Disk error");
  });

  it("handles missing update-desktop-database binary safely using default refreshDesktopDatabase", async () => {
    const homeDir = posix.join(tempDir, "home");
    const execDir = posix.join(tempDir, "bundle/bin");
    const execPath = posix.join(execDir, "bun");
    const launcherPath = posix.join(execDir, "launcher");

    mkdirSync(execDir, { recursive: true });
    writeFileSync(launcherPath, "fake launcher");

    const res = ensureLinuxDesktopEntry({
      platform: "linux",
      homeDir,
      execPath,
    });

    expect(res).toEqual({ registered: true, reason: "registered" });
    await Bun.sleep(100);
  });
});
