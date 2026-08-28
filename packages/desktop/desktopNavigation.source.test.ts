import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

const source = readFileSync(join(import.meta.dir, "src/bun/index.ts"), "utf8");
const templateSource = readFileSync(join(import.meta.dir, "src/bun/desktopNavigationChromeTemplates.ts"), "utf8");
// Assertions check across both files after the template extraction.
const allSource = source + "\n" + templateSource;

describe("desktop navigation shell", () => {
  it("owns browser history navigation in the desktop runtime instead of page UI", () => {
    expect(source).toContain("ApplicationMenu");
    expect(source).toContain("setupDesktopNavigationMenu");
    expect(source).toContain("navigateDesktopHistory");
    expect(source).toContain('process.platform === "win32"');
    expect(source).toContain("ApplicationMenu.setApplicationMenu([])");
    expect(source).toContain('label: "File"');
    expect(source).toContain('label: "Edit"');
    expect(source).toContain('label: "View"');
    expect(source).toContain('label: "Back"');
    expect(source).toContain('label: "Forward"');
    expect(source).toContain('label: "Reload"');
    expect(source).toContain('label: "Toggle Always on Top"');
    expect(source).toContain('label: "Toggle Show on All Workspaces"');
    expect(source).not.toContain('label: "文件"');
    expect(source).not.toContain('label: "编辑"');
    expect(source).not.toContain('label: "查看"');
    expect(source).not.toContain('label: "后退"');
    expect(source).not.toContain('label: "前进"');
    expect(source).not.toContain('label: "重新加载"');
    expect(source).toContain('action: "desktop:navigate-back"');
    expect(source).toContain('action: "desktop:navigate-forward"');
    expect(source).toContain('action: "desktop:reload"');
    expect(source).toContain('toggleAlwaysOnTop: "desktop:toggle-always-on-top"');
    expect(source).toContain('toggleVisibleOnAllWorkspaces: "desktop:toggle-visible-on-all-workspaces"');
    expect(source).toContain("DESKTOP_NAVIGATION_ACCELERATORS");
    expect(source).toContain('back: process.platform === "darwin" ? "CommandOrControl+[" : "Alt+Left"');
    expect(source).toContain('forward: process.platform === "darwin" ? "CommandOrControl+]" : "Alt+Right"');
    expect(source).toContain('reload: "CommandOrControl+R"');
    expect(source).toContain("mainWindow.webview.executeJavascript");
  });

  it("injects visible desktop-only navigation controls into the main webview", () => {
    expect(source).toContain("installDesktopNavigationChrome");
    expect(source).toContain("DESKTOP_NAVIGATION_CHROME_SCRIPT");
    expect(allSource).toContain("nolo-desktop-shellbar");
    expect(source).toContain('titleBarStyle: "hiddenInset"');
    expect(allSource).toContain('aria-label="Back"');
    expect(allSource).toContain('aria-label="Forward"');
    expect(source).not.toContain('aria-label="Always on Top"');
    expect(source).not.toContain('aria-label="Show on All Workspaces"');
    expect(allSource).toContain('aria-label="Updates"');
    expect(allSource).toContain('aria-label="Minimize"');
    expect(allSource).toContain('aria-label="Maximize"');
    expect(allSource).toContain('aria-label="Close"');
    expect(allSource).toContain('data-action="window-minimize"');
    expect(allSource).toContain('data-action="window-maximize"');
    expect(allSource).toContain('data-action="window-close"');
    expect(source).not.toContain('type="button" data-action="toggle-always-on-top"');
    expect(source).not.toContain('type="button" data-action="toggle-visible-on-all-workspaces"');
    expect(allSource).toContain('aria-label", "Desktop shell"');
    expect(allSource).toContain('chrome.className = "electrobun-webkit-app-region-drag"');
    expect(allSource).toContain("electrobun-webkit-app-region-no-drag");
    expect(allSource).toContain("refreshDesktopUpdateButton");
    expect(source).toContain("__noloDesktopRefreshUpdateButton");
    expect(source).toContain("__noloDesktopApplyWindowState");
    expect(allSource).toContain("waitForDesktopUpdateReady");
    expect(allSource).toContain('body: JSON.stringify({ action: nextAction })');
    expect(allSource).toContain('body: JSON.stringify({ action: "apply" })');
    expect(allSource).toContain('updateButton.hidden = !summary?.showToolbarButton');
    expect(allSource).toContain('const nextAction = snapshot?.summary?.primaryAction ?? null;');
    expect(source).not.toContain('globalThis.location.assign("/setting/updates")');
    expect(allSource).toContain("height: 34px");
    expect(allSource).toContain("margin-top: 34px");
    expect(allSource).toContain("padding-right: 14px");
    expect(allSource).toContain('#nolo-desktop-shellbar[data-platform="darwin"]');
    expect(allSource).toContain("padding-left: 88px");
    expect(allSource).toContain('chrome.dataset.platform = ${JSON.stringify(process.platform)}');
    expect(allSource).toContain('process.platform === "darwin" ? "" : DESKTOP_WINDOW_CONTROLS_HTML');
    expect(allSource).toContain("width: 28px");
    expect(allSource).toContain("height: 28px");
    expect(allSource).toContain('event.key === "ArrowLeft"');
    expect(allSource).toContain('event.key === "ArrowRight"');
    expect(allSource).toContain("<svg viewBox=");
    expect(allSource).toContain("__electrobunSendToHost");
    expect(source).toContain('mainWindow.webview.on("host-message"');
    expect(source).toContain("mainWindow.setAlwaysOnTop(");
    expect(source).toContain("mainWindow.isAlwaysOnTop()");
    expect(source).toContain("mainWindow.setVisibleOnAllWorkspaces(");
    expect(source).toContain("mainWindow.isVisibleOnAllWorkspaces()");
    expect(source).toContain("mainWindow.minimize()");
    expect(source).toContain("mainWindow.maximize()");
    expect(source).toContain("mainWindow.unmaximize()");
    expect(source).toContain("mainWindow.close()");
    expect(source).not.toContain("window-hide-3s");
    expect(source).not.toContain("Magic Hide for 3s");
    expect(allSource).toContain('document.getElementById("nolo-desktop-navigation")');
    expect(source).not.toContain('aria-label="Home"');
    expect(source).not.toContain('data-action="home"');
    expect(source).not.toContain(".desktop-shellbar__menu-item");
    expect(source).not.toContain("&#25991;&#20214;");
    expect(source).not.toContain("&#32534;&#36753;");
    expect(source).not.toContain("&#26597;&#30475;");
    expect(source).not.toContain("&#31383;&#21475;");
    expect(source).not.toContain("&#24110;&#21161;");
    expect(source).not.toContain('aria-label="后退"');
    expect(source).not.toContain('aria-label="前进"');
    expect(source).not.toContain('aria-label="重新加载"');
    expect(source).not.toContain('"桌面导航"');
    expect(source).not.toContain("‹");
    expect(source).not.toContain("›");
    expect(source).not.toContain("↻");
    expect(source).toContain('mainWindow.webview.on("dom-ready"');
    expect(source).toContain('mainWindow.webview.on("did-navigate"');
    expect(source).toContain('mainWindow.webview.on("did-navigate-in-page"');
  });

  it("refreshes the shell update button after the startup updater check completes", () => {
    expect(source).toContain("const notifyDesktopUpdateChrome = () => {");
    expect(source).toContain('mainWindow.webview.executeJavascript("globalThis.__noloDesktopRefreshUpdateButton?.();")');
    expect(source).toContain("await Updater.checkForUpdate()");
    expect(source).toContain("notifyDesktopUpdateChrome()");
  });

  it("keeps the injected desktop shell script syntactically valid", () => {
    const match = templateSource.match(
      /export const DESKTOP_NAVIGATION_CHROME_SCRIPT = `([\s\S]*?)`;\r?\n$/
    );
    expect(match?.[1]).toBeTruthy();

    const script = match![1].replace(/\$\{JSON\.stringify\([^}]+\)\}/g, '""');
    expect(() => new Function(script)).not.toThrow();
  });
});
