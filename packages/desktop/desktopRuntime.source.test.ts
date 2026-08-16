import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "bun:test";

const source = readFileSync(join(import.meta.dir, "src/bun/index.ts"), "utf8");

describe("desktop runtime entry", () => {
  it("dispatches packaged connect commands before starting the desktop runtime", () => {
    expect(source).toContain('desktopEntrypointArgs[0] === "connect"');
    expect(source).toContain("runMachineConnectCommand");
    expect(source).toContain("process.exit(exitCode)");
    expect(source.indexOf('desktopEntrypointArgs[0] === "connect"')).toBeLessThan(
      source.indexOf("NOLO_X_READER_CHILD_REQUEST")
    );
    expect(source.indexOf('desktopEntrypointArgs[0] === "connect"')).toBeLessThan(
      source.indexOf("NOLO_DESKTOP_SERVER_CHILD")
    );
    expect(source.indexOf('desktopEntrypointArgs[0] === "connect"')).toBeLessThan(
      source.indexOf("new BrowserWindow")
    );
  });

  it("dispatches packaged workspace CLI commands through the app entrypoint", () => {
    expect(source).toContain("DESKTOP_CLI_COMMAND_ROOTS");
    expect(source).toContain('"agent"');
    expect(source).toContain('"dialog"');
    expect(source).toContain('"table"');
    expect(source).toContain("resolveCommand(desktopEntrypointArgs)");
    expect(source).toContain("runResolvedCommand(command, desktopEntrypointArgs, runtimeContext");
    expect(source).toContain('packageInfo: {');
    expect(source).toContain('name: "nolo-desktop"');
    expect(source.indexOf("DESKTOP_CLI_COMMAND_ROOTS")).toBeLessThan(
      source.indexOf('desktopEntrypointArgs[0] === "connect"')
    );
    expect(source.indexOf("DESKTOP_CLI_COMMAND_ROOTS")).toBeLessThan(
      source.indexOf("NOLO_DESKTOP_SERVER_CHILD")
    );
  });

  it("supports optional E2E initial path and delayed script inject hooks", () => {
    expect(source).toContain("NOLO_DESKTOP_E2E_INITIAL_PATH");
    expect(source).toContain("NOLO_DESKTOP_E2E_INJECT_DELAY_MS");
    expect(source).toContain("[desktop e2e] initial path");
  });

  it("keeps Desktop E2E hooks production-off when env vars are unset (zero inject)", () => {
    // Script inject only runs when NOLO_DESKTOP_E2E_SCRIPT_PATH is truthy after trim.
    expect(source).toContain(
      'const desktopE2eScriptPath = process.env.NOLO_DESKTOP_E2E_SCRIPT_PATH?.trim()',
    );
    expect(source).toContain("if (desktopE2eScriptPath)");
    // Initial path defaults to "/" — no special path unless env is set.
    expect(source).toContain(
      'const e2eInitialPathRaw = process.env.NOLO_DESKTOP_E2E_INITIAL_PATH?.trim() || "/"',
    );
    // Must not hard-code a create/test path as the production default URL.
    expect(source).not.toMatch(
      /url:\s*`\$\{serverUrl\}\/create\/local-agent/,
    );
    // Inject delay is only evaluated inside the script-path branch.
    const injectBlockStart = source.indexOf(
      "const desktopE2eScriptPath = process.env.NOLO_DESKTOP_E2E_SCRIPT_PATH",
    );
    expect(injectBlockStart).toBeGreaterThan(-1);
    const injectBlock = source.slice(injectBlockStart, injectBlockStart + 900);
    expect(injectBlock).toContain("NOLO_DESKTOP_E2E_INJECT_DELAY_MS");
    expect(injectBlock).toContain("executeJavascript");
  });

  it("supports a headless packaged probe mode before creating BrowserWindow", () => {
    expect(source).toContain('process.env.NOLO_DESKTOP_HEADLESS === "1"');
    expect(source).toContain("headless probe mode enabled");
    expect(source.indexOf("headless probe mode enabled")).toBeLessThan(
      source.indexOf("new BrowserWindow")
    );
  });

  it("acquires a desktop single-instance lock before opening the embedded database", () => {
    const shutdownBlock = source.slice(source.indexOf("const shutdownDesktop ="));
    expect(source).toContain("acquireDesktopInstanceLock");
    expect(source).toContain("DESKTOP_SECOND_INSTANCE_EXIT_CODE");
    expect(source).toContain("another Nolo Desktop instance is already running");
    expect(source).toContain("[desktop:instance-lock]");
    expect(source).toContain("phase=instance-lock");
    expect(source).toContain('process.once(signal');
    expect(source).toContain('"SIGINT"');
    expect(source).toContain('"SIGTERM"');
    expect(source.indexOf("acquireDesktopInstanceLock")).toBeLessThan(
      source.indexOf("NOLO_SERVER_DB_PATH")
    );
    expect(source.indexOf("acquireDesktopInstanceLock")).toBeLessThan(
      source.indexOf("bootstrapServer")
    );
    expect(shutdownBlock).toContain("desktopInstanceLock.release()");
  });

  it("logs successful BrowserWindow creation for installed Windows smoke tests", () => {
    expect(source).toContain('[desktop] BrowserWindow created');
    expect(source.indexOf("new BrowserWindow")).toBeLessThan(
      source.indexOf("[desktop] BrowserWindow created")
    );
  });

  it("registers desktop fatal diagnostics before runtime startup can crash", () => {
    expect(source).toContain("registerDesktopFatalDiagnostics");
    expect(source).toContain('process.on("uncaughtException"');
    expect(source).toContain('process.on("unhandledRejection"');
    expect(source).toContain('process.on("exit"');
    expect(source).toContain("[desktop fatal] uncaughtException");
    expect(source).toContain("[desktop fatal] unhandledRejection");
    expect(source.indexOf("registerDesktopFatalDiagnostics();")).toBeLessThan(
      source.indexOf("const request = JSON.parse")
    );
    expect(source.indexOf("registerDesktopFatalDiagnostics();")).toBeLessThan(
      source.indexOf('await import("electrobun/bun")')
    );
  });

  it("installs a cross-platform desktop file logger before runtime startup", () => {
    expect(source).toContain("installDesktopFileLogger();");
    expect(source).toContain("NOLO_DESKTOP_LOG_PATH");
    expect(source).toContain("desktop.log");
    expect(source).toContain('process.env.NOLO_DESKTOP_FILE_LOG === "0"');
    expect(source.indexOf("installDesktopFileLogger();")).toBeLessThan(
      source.indexOf('await import("electrobun/bun")')
    );
  });

  it("emits structured desktop phase diagnostics with boot timing", () => {
    expect(source).toContain("const desktopDiag =");
    expect(source).toContain("[desktop:phase]");
    expect(source).toContain("phase=");
    expect(source).toContain("ms=");
    expect(source).toContain('desktopDiag("boot:start"');
    expect(source).toContain('desktopDiag("cwd:resolved"');
    expect(source).toContain('desktopDiag("instance-lock"');
    expect(source).toContain('desktopDiag("server:listening"');
    expect(source).toContain('desktopDiag("window:create"');
    expect(source).toContain('desktopDiag("boot:ready"');
    expect(source).toContain('desktopDiag("boot:error"');
    expect(source).toContain("durationMs");
    expect(source).toContain("formatPhaseError");
    expect(source).toContain("sanitizeDesktopDiagExtra");
    // Phase order: boot → cwd → lock → server → window → ready
    expect(source.indexOf('desktopDiag("boot:start"')).toBeLessThan(
      source.indexOf('desktopDiag("cwd:resolved"'),
    );
    expect(source.indexOf('desktopDiag("cwd:resolved"')).toBeLessThan(
      source.indexOf('desktopDiag("instance-lock"'),
    );
    expect(source.indexOf('desktopDiag("instance-lock"')).toBeLessThan(
      source.indexOf('desktopDiag("server:listening"'),
    );
    expect(source.indexOf('desktopDiag("server:listening"')).toBeLessThan(
      source.indexOf('desktopDiag("window:create"'),
    );
    // Headless path logs boot:ready before window:create; full UI path logs it after.
    expect(source.indexOf('desktopDiag("window:create"')).toBeLessThan(
      source.lastIndexOf('desktopDiag("boot:ready"'),
    );
    expect(source.indexOf('desktopDiag("server:listening"')).toBeLessThan(
      source.indexOf('desktopDiag("boot:ready"'),
    );
    // Secrets must not be logged: sensitive keys stripped, URLs reduced to origin.
    expect(source).toContain("DESKTOP_DIAG_SENSITIVE_KEY");
    expect(source).toContain("new URL(value).origin");
    expect(source).not.toMatch(/desktopDiag\([^)]*token/i);
  });

  it("dispatches XHS reader child requests before BrowserWindow startup", () => {
    expect(source).toContain("NOLO_XHS_READER_CHILD_REQUEST");
    expect(source).toContain("NOLO_EXTERNAL_READER_CHILD_REQUEST");
    expect(source).toContain("readXhsProfileWithBridge");
    expect(source.indexOf("NOLO_XHS_READER_CHILD_REQUEST")).toBeLessThan(
      source.indexOf("NOLO_DESKTOP_SERVER_CHILD")
    );
    expect(source.indexOf("NOLO_XHS_READER_CHILD_REQUEST")).toBeLessThan(
      source.indexOf("new BrowserWindow")
    );
  });

  it("logs the BrowserWindow creation boundary before entering native window code", () => {
    expect(source).toContain("[desktop] creating BrowserWindow");
    expect(source.indexOf("[desktop] creating BrowserWindow")).toBeLessThan(
      source.indexOf("new BrowserWindow")
    );
  });

  it("keeps Windows maximize inside the active monitor work area and handles stale restore state", () => {
    expect(source).toContain("const displays = Screen.getAllDisplays();");
    expect(source).toContain("const display =");
    expect(source).toContain("const workArea = display.workArea;");
    expect(source).toContain("const isValidWorkArea =");
    expect(source).toContain("appliedMaximizedFrame = { ...workArea };");
    expect(source).toContain("if (!framesEqual(currentFrame, appliedMaximizedFrame))");
    expect(source).toContain("if (mainWindow.isMaximized()) {");
    expect(source).toContain("mainWindow.unmaximize();");
    expect(source).toContain("maximizeDesktopWindow();");
    expect(source).toContain("mainWindow.setFrame(frame.x, frame.y, frame.width, frame.height);");
  });

  it("supports a bounded Windows smoke probe mode that exits after dom-ready", () => {
    expect(source).toContain('process.env.NOLO_DESKTOP_SMOKE_PROBE === "1"');
    expect(source).toContain("[desktop] smoke probe mode enabled");
    expect(source).toContain("[desktop] smoke probe dom-ready");
    expect(source).toContain("[desktop] smoke probe completed:");
    expect(source).toContain('mainWindow.webview.on("dom-ready"');
    expect(source).toContain("NOLO_DESKTOP_SMOKE_PROBE_TIMEOUT_MS");
  });

  it("logs renderer diagnostics and input breadcrumbs without user text", () => {
    expect(source).toContain("nolo-desktop-diagnostic");
    expect(source).toContain("[webview diagnostic]");
    expect(source).toContain("payload ?? {}");
    expect(source).not.toContain("inputValue:");
    expect(source).not.toContain("textContent:");
  });

  it("serves packaged production assets from the installed Resources directory", () => {
    expect(source).toContain('const installedPublicDir = join(PACKAGED_RESOURCES_DIR, "app", "public")');
    expect(source).toContain('const packagedPublicDir = join(PATHS.VIEWS_FOLDER, "..", "public")');
    expect(source).toContain("resolveDesktopPublicDir({");
    expect(source).toContain("source: publicDirSource");
    expect(source).toContain("[desktop] using public dir");
    expect(source).toContain("public assets buildTime=");
    expect(source.indexOf("process.env.NOLO_PUBLIC_DIR =")).toBeGreaterThan(
      source.indexOf("resolveDesktopPublicDir")
    );
  });

  it("prefers monorepo public for dev channel via resolveDesktopPublicDir", () => {
    expect(source).toContain('from "./runtimePaths"');
    expect(source).toContain("resolveDesktopPublicDir");
    expect(source).toContain("NOLO_DESKTOP_USE_PACKAGED_PUBLIC");
    expect(source).toContain("source=${publicDirSource}");
  });

  it("stops the desktop local connector when the window closes or the app quits", () => {
    expect(source).toContain("const desktopLocalConnector = await startDesktopLocalConnector({ channel })");
    expect(source).toContain("const shutdownDesktop = (reason: string) =>");
    expect(source).toContain('await shutdownDesktop("desktop-window-close")');
    expect(source).toContain('await shutdownDesktop("desktop-before-quit")');
  });
});
