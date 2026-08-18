import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { posix } from "node:path";
import { spawn } from "node:child_process";
import { resolveDesktopDataRoot } from "./runtimePaths";

export const LINUX_DESKTOP_ENTRY_ID = "nolo-desktop";
const entryFileName = `${LINUX_DESKTOP_ENTRY_ID}.desktop`;

export const buildLinuxDesktopEntry = ({ launcherPath }: { launcherPath: string }): string =>
  `[Desktop Entry]\nName=Nolo Desktop\nExec="${launcherPath.replace(/"/g, "")}" %U\nTerminal=false\nType=Application\nIcon=nolo-desktop\nStartupWMClass=Nolo Desktop\nComment=Nolo Desktop Application\nCategories=Utility;\n`;

export const ensureLinuxDesktopEntry = (options?: {
  platform?: NodeJS.Platform;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
  execPath?: string;
  resourcesDir?: string;
  pathExists?: (p: string) => boolean;
  readText?: (p: string) => string | null;
  writeText?: (p: string, content: string) => void;
  ensureDir?: (p: string) => void;
  copyFile?: (src: string, dest: string) => void;
  refreshDesktopDatabase?: (appsDir: string) => void;
  log?: (msg: string) => void;
}): { registered: boolean; reason: string } => {
  const log = options?.log ?? console.warn;
  try {
    const platform = options?.platform ?? process.platform;
    if (platform !== "linux") {
      return { registered: false, reason: "not-linux" };
    }

    const env = options?.env ?? process.env;
    const homeDir = options?.homeDir ?? homedir();
    const execPath = options?.execPath ?? process.execPath;
    const pathExists = options?.pathExists ?? existsSync;

    const launcherPath = posix.join(posix.dirname(execPath), "launcher");
    if (!pathExists(launcherPath)) {
      return { registered: false, reason: "no-launcher-sibling" };
    }

    if (pathExists(posix.join("/usr/share/applications", entryFileName))) {
      return { registered: false, reason: "system-entry-exists" };
    }

    const dataRoot = resolveDesktopDataRoot({ platform: "linux", env, homeDir });
    const appsDir = posix.join(dataRoot, "applications");
    const desktopPath = posix.join(appsDir, entryFileName);

    const desired = buildLinuxDesktopEntry({ launcherPath });

    const readText =
      options?.readText ??
      ((p: string) => {
        try {
          return readFileSync(p, "utf-8");
        } catch {
          return null;
        }
      });
    const writeText =
      options?.writeText ?? ((p: string, content: string) => writeFileSync(p, content, "utf-8"));
    const ensureDir =
      options?.ensureDir ?? ((p: string) => mkdirSync(p, { recursive: true }));
    const copyFile =
      options?.copyFile ?? ((p: string, dest: string) => copyFileSync(p, dest));
    const refreshDesktopDatabase =
      options?.refreshDesktopDatabase ??
      ((dir: string) => {
        try {
          const child = spawn("update-desktop-database", [dir], { stdio: "ignore", detached: true });
          child.on("error", () => {});
          child.unref();
        } catch {
          // ignore
        }
      });

    let didWrite = false;
    const existingContent = pathExists(desktopPath) ? readText(desktopPath) : null;
    if (existingContent !== desired) {
      ensureDir(appsDir);
      writeText(desktopPath, desired);
      didWrite = true;
    }

    const resourcesDir = options?.resourcesDir;
    if (resourcesDir) {
      const iconSrc = posix.join(resourcesDir, "appIcon.png");
      const iconDest = posix.join(dataRoot, "icons/hicolor/512x512/apps/nolo-desktop.png");
      if (pathExists(iconSrc) && !pathExists(iconDest)) {
        ensureDir(posix.dirname(iconDest));
        copyFile(iconSrc, iconDest);
        didWrite = true;
      }
    }

    if (didWrite) {
      try {
        refreshDesktopDatabase(appsDir);
      } catch {
        // ignore
      }
    }

    return { registered: true, reason: didWrite ? "registered" : "already-up-to-date" };
  } catch (err: any) {
    const msg = err?.message ?? String(err);
    log(`[linuxDesktopEntry] registration failed: ${msg}`);
    return { registered: false, reason: `error: ${msg}` };
  }
};
