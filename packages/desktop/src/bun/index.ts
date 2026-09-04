import { homedir } from "node:os";
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { resolve, join, dirname } from "node:path";
import { createServer } from "node:net";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dlopen } from "bun:ffi";
import { readXPostWithBridge } from "../../../../packages/integrations/x-reader/bridge/readXPostWithBridge";
import {
  readXhsProfileWithBridge,
  sanitizeXhsBridgeOptions,
} from "../../../../packages/integrations/xhs-reader/bridge/readXhsProfileWithBridge";
import { isRecord } from "core/isRecord";
import {
  registerBrowseCapability,
  getBrowseContext,
  getCapability,
  setBrowseContext,
  clearBrowseContext,
  getAlwaysOnCapabilities,
  resolveCapabilitiesByIntent,
  mergeBrowseContext,
  type BrowseContext,
} from "./browseContextStore";
import { BROWSER_CHROME_SCRIPT } from "./browserChromeTemplates";
import {
  resolveDesktopChannelDir,
  resolveDesktopDataRoot,
  resolveDesktopPublicDir,
  findMonorepoRoot,
} from "./runtimePaths";
import { ensureLinuxDesktopEntry } from "./linuxDesktopEntry";
import {
  acquireDesktopInstanceLock,
  DESKTOP_SECOND_INSTANCE_EXIT_CODE,
} from "./singleInstanceLock";

const desktopEntrypointArgs = process.argv.slice(2);
const EXTERNAL_READER_CHILD_REQUEST_ENV = "NOLO_EXTERNAL_READER_CHILD_REQUEST";

const DESKTOP_CLI_COMMAND_ROOTS = new Set([
  "agent",
  "auth",
  "dialog",
  "doc",
  "doctor",
  "skill-doc",
  "space",
  "table",
  "whoami",
]);

if (DESKTOP_CLI_COMMAND_ROOTS.has(desktopEntrypointArgs[0] ?? "")) {
  const [
    { createCliRuntimeContext, resolveCommand, runResolvedCommand },
    { buildCliRuntimeEnv, loadProfileConfig },
  ] = await Promise.all([
    import("../../../../packages/cli/commandRegistry"),
    import("../../../../packages/cli/client/profileConfig"),
  ]);
  const command = resolveCommand(desktopEntrypointArgs);
  if (!command) {
    console.error(`Unknown desktop CLI command: ${desktopEntrypointArgs.join(" ")}`);
    process.exit(1);
  }
  const runtimeEnv = buildCliRuntimeEnv(process.env, loadProfileConfig());
  const runtimeContext = createCliRuntimeContext({
    env: runtimeEnv,
    scriptDir: join(dirname(fileURLToPath(import.meta.url)), "../../../../scripts"),
    entrypointPath: fileURLToPath(import.meta.url),
    packageInfo: {
      name: "nolo-desktop",
      version: process.env.NOLO_DESKTOP_VERSION || "0.0.0",
    },
  });
  const exitCode = await runResolvedCommand(command, desktopEntrypointArgs, runtimeContext, {
    runScript: async (script, forwardedArgs, env) => {
      const scriptPath = join(runtimeContext.scriptDir, script);
      const proc = Bun.spawn({
        cmd: [process.execPath, scriptPath, ...forwardedArgs],
        stdin: "ignore",
        stdout: "inherit",
        stderr: "inherit",
        env,
      });
      return proc.exited;
    },
  });
  process.exit(exitCode);
}

if (desktopEntrypointArgs[0] === "connect") {
  const { runMachineConnectCommand } = await import("../../../../packages/cli/machineCommands");
  const exitCode = await runMachineConnectCommand(desktopEntrypointArgs.slice(1));
  process.exit(exitCode);
}

// Phase 3 note:
// Desktop still boots the shared Bun server entry as a transition strategy.
// Long term this should narrow into a smaller desktop runtime entry that keeps:
// - page/static entry
// - desktop updater bridge
// - local file / native tool bridges
// while leaving remote business authority outside the embedded runtime.

const SERVER_PORT_BASE = Number(process.env.NOLO_DESKTOP_SERVER_PORT ?? 3233);
const EXECUTABLE_DIR = dirname(process.execPath);
const PACKAGED_RESOURCES_DIR = resolve(EXECUTABLE_DIR, "../Resources");

/** Point local agent codeSearch/globFiles at packaged ripgrep (pre-build ensures vendor binary). */
const resolveAndApplyBundledRipgrepEnv = () => {
  if (process.env.NOLO_BUNDLED_RG?.trim()) return;
  const binaryName = process.platform === "win32" ? "rg.exe" : "rg";
  const candidates = [
    join(PACKAGED_RESOURCES_DIR, "app", "bin", binaryName),
    join(PACKAGED_RESOURCES_DIR, "bin", binaryName),
    // Electrobun may nest under Contents/Resources differently in some channels.
    join(EXECUTABLE_DIR, "bin", binaryName),
    join(EXECUTABLE_DIR, "../bin", binaryName),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      process.env.NOLO_BUNDLED_RG = candidate;
      console.log(`[desktop] bundled ripgrep: ${candidate}`);
      return;
    }
  }
};
resolveAndApplyBundledRipgrepEnv();

const formatConsoleArg = (arg: unknown) => {
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return arg.stack ?? `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
};

const resolveDesktopDiagnosticLogPath = () =>
  process.env.NOLO_DESKTOP_LOG_PATH?.trim() ||
  join(resolveDesktopDataRoot(), "chat.nolo.desktop", "desktop.log");

const installDesktopFileLogger = () => {
  if (process.env.NOLO_DESKTOP_FILE_LOG === "0") return;

  try {
    const logPath = resolveDesktopDiagnosticLogPath();
    mkdirSync(dirname(logPath), { recursive: true });
    const writeLine = (level: string, args: unknown[]) => {
      try {
        appendFileSync(
          logPath,
          `${new Date().toISOString()} ${level} ${args.map(formatConsoleArg).join(" ")}\n`
        );
      } catch {
        // Keep logging best-effort; file-system failures must not break desktop startup.
      }
    };
    const originalLog = console.log.bind(console);
    const originalWarn = console.warn.bind(console);
    const originalError = console.error.bind(console);

    console.log = (...args: unknown[]) => {
      writeLine("INFO", args);
      originalLog(...args);
    };
    console.warn = (...args: unknown[]) => {
      writeLine("WARN", args);
      originalWarn(...args);
    };
    console.error = (...args: unknown[]) => {
      writeLine("ERROR", args);
      originalError(...args);
    };

    console.log(`[desktop] diagnostic file log ${logPath}`);
  } catch (error) {
    console.error("[desktop] failed to install file logger", error);
  }
};

const formatDiagnosticError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
  return {
    name: typeof error,
    message: String(error),
  };
};

/** Phase error shape for desktopDiag: name/message only (no stack, no secrets). */
const formatPhaseError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }
  return {
    name: typeof error,
    message: String(error),
  };
};

const DESKTOP_DIAG_SENSITIVE_KEY =
  /token|cookie|password|secret|authorization|api[_-]?key|session|credential/i;

const sanitizeDesktopDiagValue = (key: string, value: unknown): unknown => {
  if (DESKTOP_DIAG_SENSITIVE_KEY.test(key)) return undefined;
  if (value instanceof Error) return formatPhaseError(value);
  if (typeof value === "string" && /^https?:\/\//i.test(value)) {
    try {
      return new URL(value).origin;
    } catch {
      return value;
    }
  }
  if (isRecord(value)) {
    const nested: Record<string, unknown> = {};
    for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
      if (DESKTOP_DIAG_SENSITIVE_KEY.test(nestedKey)) continue;
      if (
        typeof nestedValue === "string" ||
        typeof nestedValue === "number" ||
        typeof nestedValue === "boolean" ||
        nestedValue == null
      ) {
        if (typeof nestedValue === "string" && /^https?:\/\//i.test(nestedValue)) {
          try {
            nested[nestedKey] = new URL(nestedValue).origin;
          } catch {
            nested[nestedKey] = nestedValue;
          }
        } else {
          nested[nestedKey] = nestedValue;
        }
      } else if (nestedValue instanceof Error) {
        nested[nestedKey] = formatPhaseError(nestedValue);
      } else {
        nested[nestedKey] = String(nestedValue);
      }
    }
    return nested;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value == null
  ) {
    return value;
  }
  return String(value);
};

const sanitizeDesktopDiagExtra = (
  extra?: Record<string, unknown>,
): Record<string, unknown> | undefined => {
  if (!extra) return undefined;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(extra)) {
    if (key === "level") continue;
    const sanitized = sanitizeDesktopDiagValue(key, value);
    if (sanitized !== undefined) out[key] = sanitized;
  }
  return Object.keys(out).length > 0 ? out : undefined;
};

/** Boot-relative clock for structured phase logs (`ms=`). */
let desktopBootStartedAt = Date.now();
/** Last phase entered; attached to fatal handlers for failure localization. */
let desktopCurrentPhase = "boot:start";
/**
 * Flips to true once the desktop runtime has finished booting and is serving.
 * Deliberately a plain boolean, NOT derived from desktopCurrentPhase: the
 * uncaughtException/unhandledRejection handlers call desktopDiag("boot:error")
 * BEFORE deciding fate, and desktopDiag overwrites desktopCurrentPhase — so a
 * phase-string comparison inside those handlers would always see "boot:error"
 * and never fire (dead guard). This flag is only ever set to true, never
 * mutated by desktopDiag.
 */
let isDesktopBootReady = false;

type DesktopDiagLevel = "info" | "warn" | "error";

/**
 * Structured desktop startup diagnostic.
 * Format (console → file logger): `[desktop:phase] phase=<name> ms=<bootElapsed> <message> {optional json}`
 * Always best-effort; never throws. Prefer this over ad-hoc console lines for stage boundaries.
 */
const desktopDiag = (
  phase: string,
  message: string,
  extra?: Record<string, unknown> & { level?: DesktopDiagLevel },
) => {
  try {
    desktopCurrentPhase = phase;
    const level: DesktopDiagLevel =
      extra?.level === "error" || extra?.level === "warn" || extra?.level === "info"
        ? extra.level
        : "info";
    const ms = Date.now() - desktopBootStartedAt;
    const safeExtra = sanitizeDesktopDiagExtra(extra);
    const parts = [`[desktop:phase] phase=${phase}`, `ms=${ms}`, message];
    if (safeExtra) {
      try {
        parts.push(JSON.stringify(safeExtra));
      } catch {
        // ignore JSON failures
      }
    }
    const line = parts.join(" ");
    if (level === "error") console.error(line);
    else if (level === "warn") console.warn(line);
    else console.log(line);
  } catch {
    // Keep diagnostics best-effort; never break startup because logging failed.
  }
};

const registerDesktopFatalDiagnostics = () => {
  process.on("uncaughtException", (error) => {
    // Snapshot BEFORE desktopDiag overwrites desktopCurrentPhase.
    const phaseAtFailure = desktopCurrentPhase;
    // Post-boot: a stray background error (e.g. a TypeError inside Bun's
    // internal postgres query resolution during a failed sync) must not kill
    // the whole desktop client — the window and its LevelDB state are fine,
    // and quitting on a background sync error just reads as "the client
    // crashed" to the user. Boot-time failures stay fatal (unknown startup
    // state is unsafe to serve).
    if (isDesktopBootReady) {
      desktopDiag("runtime:error", "uncaughtException after boot; continuing", {
        level: "warn",
        phaseAtFailure,
        error: formatPhaseError(error),
      });
      console.error(
        "[desktop non-fatal] uncaughtException after boot",
        formatDiagnosticError(error),
      );
      return;
    }
    desktopDiag("boot:error", "uncaughtException", {
      level: "error",
      phaseAtFailure,
      error: formatPhaseError(error),
    });
    console.error("[desktop fatal] uncaughtException", formatDiagnosticError(error));
    // Boot-time failures stay fatal (unknown startup state is unsafe to serve).
    // After boot:ready, a stray background error (e.g. a TypeError inside Bun's
    // internal postgres query resolution) must not kill the whole desktop
    // client — the window and its LevelDB state are fine, and quitting on a
    // background sync error just reads as "the client crashed" to the user.
    const postBoot = desktopCurrentPhase === "boot:ready";
    if (postBoot) {
      desktopDiag("runtime:error", "uncaughtException after boot; continuing", {
        level: "warn",
        phaseAtFailure: desktopCurrentPhase,
        error: formatPhaseError(error),
      });
      return;
    }
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    // Snapshot BEFORE desktopDiag overwrites desktopCurrentPhase.
    const phaseAtFailure = desktopCurrentPhase;
    // Same post-boot policy as uncaughtException: background async failures
    // (tool subprocess errors, remote-sync fetch failures) must not tear down
    // the desktop window. The tool/spawn allowlist below remains as extra
    // armor for the pre-boot window.
    if (isDesktopBootReady) {
      desktopDiag("runtime:error", "unhandledRejection after boot; continuing", {
        level: "warn",
        phaseAtFailure,
        error: formatPhaseError(reason),
      });
      console.error(
        "[desktop non-fatal] unhandledRejection after boot",
        formatDiagnosticError(reason),
      );
      return;
    }
    desktopDiag("boot:error", "unhandledRejection", {
      level: "error",
      phaseAtFailure,
      error: formatPhaseError(reason),
    });
    console.error("[desktop fatal] unhandledRejection", formatDiagnosticError(reason));
    // Tool/subprocess failures (e.g. missing `rg` on packaged PATH) must not
    // tear down the whole desktop window. Only hard-exit on uncaughtException.
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "";
    if (
      message.includes("Executable not found") ||
      message.includes("ENOENT") ||
      message.includes("spawn")
    ) {
      console.error(
        "[desktop] non-fatal unhandledRejection from tool/spawn — app continues",
      );
      return;
    }
    process.exit(1);
  });

  process.on("exit", (code) => {
    if (
      process.env.NOLO_X_READER_CHILD_REQUEST ||
      process.env.NOLO_XHS_READER_CHILD_REQUEST ||
      process.env[EXTERNAL_READER_CHILD_REQUEST_ENV]
    ) {
      return;
    }
    console.log(`[desktop] process exit code=${code}`);
  });
};

installDesktopFileLogger();
registerDesktopFatalDiagnostics();

if (process.env.NOLO_X_READER_CHILD_REQUEST) {
  const request = JSON.parse(
    Buffer.from(process.env.NOLO_X_READER_CHILD_REQUEST, "base64").toString("utf8"),
  );
  const result = await readXPostWithBridge(request.url, {
    keepOpen: request.keepOpen,
    profileDir: request.profileDir,
    headless: request.headless,
  });
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 2);
}

if (process.env.NOLO_XHS_READER_CHILD_REQUEST) {
  const request = JSON.parse(
    Buffer.from(process.env.NOLO_XHS_READER_CHILD_REQUEST, "base64").toString("utf8"),
  );
  const result = await readXhsProfileWithBridge(
    sanitizeXhsBridgeOptions({
      url: request.url,
      maxScrollPages: request.maxScrollPages,
      includeComments: request.includeComments,
      maxCommentPagesPerNote: request.maxCommentPagesPerNote,
      minLikesForDetail: request.minLikesForDetail,
      minCommentsForCollect: request.minCommentsForCollect,
      extendedCollectionConsent: request.extendedCollectionConsent,
      headless: request.headless,
      timeoutMs: request.timeoutMs,
      collectionMode: request.collectionMode,
      assistedAction: request.assistedAction,
      maxAssistedSteps: request.maxAssistedSteps,
    }),
  );
  console.log(JSON.stringify(result));
  process.exit(result.ok ? 0 : 2);
}

// Future external reader providers should use EXTERNAL_READER_CHILD_REQUEST_ENV
// once there is more than one concrete provider bridge to dispatch.

import { resolveDesktopRuntimeEntrypoint, DESKTOP_ENTRYPOINT_ENV_VAR } from "../../../../packages/agent-runtime/desktopRuntimeEntrypoint";
import {
  DESKTOP_NAVIGATION_CHROME_CSS,
  DESKTOP_WINDOW_CONTROLS_HTML,
  DESKTOP_NAVIGATION_CHROME_HTML,
  DESKTOP_NAVIGATION_CHROME_SCRIPT,
} from "./desktopNavigationChromeTemplates";

// Set the desktop entrypoint for tool executors that need to spawn CLI subcommands.
// This must be set before any server/runtime code runs.
process.env[DESKTOP_ENTRYPOINT_ENV_VAR] = join(import.meta.dir, "index.js");

// Resolve desktop process cwd before any server/runtime code runs.
// Priority: NOLO_DESKTOP_CWD env > user home dir (version.json present)
// > dev-mode monorepo root (walk-up) > leave cwd as electrobun default.
// In dev, version.json is absent so without this branch cwd stays at
// `.app/Contents/MacOS` — ugly to display and semantically wrong as the agent
// runtime workspace. Walking up to the monorepo root gives a short, correct
// cwd that is injected into `window.__NOLO_DESKTOP_CWD__` for the webview.
// Packaged builds used to chdir to EXECUTABLE_DIR, which made every execShell
// inherit the install dir (`...\Nolo Desktop\bin\` on Windows) and broke all
// relative paths; the user's home dir is the safer default workspace root.
const desktopCwdOverride = process.env.NOLO_DESKTOP_CWD?.trim();
if (desktopCwdOverride) {
    process.chdir(desktopCwdOverride);
} else if (existsSync(join(PACKAGED_RESOURCES_DIR, "version.json"))) {
    process.chdir(homedir());
} else {
    const monorepoRoot = findMonorepoRoot([
        process.cwd(),
        EXECUTABLE_DIR,
        PACKAGED_RESOURCES_DIR,
    ]);
    if (monorepoRoot) {
        process.chdir(monorepoRoot);
    }
}

if (process.env.NOLO_DESKTOP_SERVER_CHILD === "1") {
  const { bootstrapServer } = await import("desktop-runtime/entry");
  await bootstrapServer();
  await new Promise(() => {});
}

if (process.platform === "win32") {
  try {
    const shcore = dlopen("shcore.dll", {
      SetProcessDpiAwareness: {
        args: ["i32"],
        returns: "i32",
      },
    });
    const PROCESS_PER_MONITOR_DPI_AWARE = 2;
    const result = shcore.symbols.SetProcessDpiAwareness(PROCESS_PER_MONITOR_DPI_AWARE);
    console.log(`[desktop] SetProcessDpiAwareness result ${result}`);
  } catch (error) {
    console.error("[desktop] failed to set process DPI awareness", error);
  }
}

const {
  default: Electrobun,
  ApplicationMenu,
  BrowserWindow,
  PATHS,
  Screen,
  Updater,
} = await import("electrobun/bun");

type DesktopBrowserWindow = {
  webview: {
    executeJavascript: (js: string) => void;
    on: (
      name: "dom-ready" | "did-navigate" | "did-navigate-in-page" | "host-message",
      handler: (event: unknown) => void,
    ) => void;
  };
  close: () => void;
  show: () => void;
  minimize: () => void;
  unminimize: () => void;
  maximize: () => void;
  unmaximize: () => void;
  isMaximized: () => boolean;
  getFrame: () => { x: number; y: number; width: number; height: number };
  setFrame: (x: number, y: number, width: number, height: number) => void;
  setAlwaysOnTop: (alwaysOnTop: boolean) => void;
  isAlwaysOnTop: () => boolean;
  setVisibleOnAllWorkspaces: (visibleOnAllWorkspaces: boolean) => void;
  isVisibleOnAllWorkspaces: () => boolean;
};

type DesktopMenuEvent = {
  data?: {
    action?: string;
  };
};

type BrowserWindowLike = {
  close: () => void;
  show: () => void;
  on: (name: string, handler: (event: unknown) => void) => void;
  webview: {
    executeJavascript: (js: string) => void;
    on: (
      name: "did-navigate" | "did-navigate-in-page" | "host-message" | "dom-ready",
      handler: (event: unknown) => void,
    ) => void;
    loadURL?: (url: string) => void;
  };
  setTitle?: (title: string) => void;
};

let browserWindow: BrowserWindowLike | undefined;
let openDesktopBrowser: (url?: string) => void = () => {};

// Bridge used by server-side handlers (e.g. /api/desktop/preview/open) that
// need to trigger a native desktop capability. The desktop host assigns this
// after mainWindow exists; server handlers call it with a host-message payload.
function installDesktopApiRequestBridge(mainWindow: { webview: { executeJavascript: (js: string) => unknown } }) {
  (globalThis as any).__noloDesktopApiRequest = async (payload: {
    type?: string;
    action?: string;
    url?: string;
  }) => {
    if (payload?.type === "nolo-preview-open") {
      const url = typeof payload.url === "string" ? payload.url : "";
      if (!url) throw new Error("nolo-preview-open requires url");
      const escaped = JSON.stringify(url);
      // Call the webview's global appInspectorStore setter; the web entry
      // exposes this as a global for the desktop bridge to reach.
      mainWindow.webview.executeJavascript(
        `globalThis.__noloSetDesktopPreview?.(true, ${escaped});`,
      );
      return;
    }
    if (
      payload?.type === "nolo-desktop-browser-action" &&
      payload?.action === "open"
    ) {
      openDesktopBrowser(
        typeof payload.url === "string" && payload.url ? payload.url : undefined,
      );
      return;
    }
    throw new Error(`unsupported desktopApiRequest type: ${payload?.type ?? "<none>"}`);
  };
}

const DESKTOP_NAVIGATION_ACTIONS = {
  back: "desktop:navigate-back",
  forward: "desktop:navigate-forward",
  reload: "desktop:reload",
  toggleAlwaysOnTop: "desktop:toggle-always-on-top",
  toggleVisibleOnAllWorkspaces: "desktop:toggle-visible-on-all-workspaces",
} as const;

const DESKTOP_NAVIGATION_ACCELERATORS = {
  back: process.platform === "darwin" ? "CommandOrControl+[" : "Alt+Left",
  forward: process.platform === "darwin" ? "CommandOrControl+]" : "Alt+Right",
  reload: "CommandOrControl+R",
} as const;

const navigateDesktopHistory = (
  mainWindow: DesktopBrowserWindow,
  direction: "back" | "forward" | "reload",
) => {
  const scriptByDirection = {
    back: "globalThis.history?.back?.();",
    forward: "globalThis.history?.forward?.();",
    reload: "globalThis.location?.reload?.();",
  } satisfies Record<typeof direction, string>;

  mainWindow.webview.executeJavascript(scriptByDirection[direction]);
};

const installDesktopNavigationChrome = (mainWindow: DesktopBrowserWindow) => {
  mainWindow.webview.executeJavascript(DESKTOP_NAVIGATION_CHROME_SCRIPT);
};

const syncDesktopWindowState = (mainWindow: DesktopBrowserWindow) => {
  const state = JSON.stringify({
    alwaysOnTop: mainWindow.isAlwaysOnTop(),
    visibleOnAllWorkspaces: mainWindow.isVisibleOnAllWorkspaces(),
  });
  mainWindow.webview.executeJavascript(
    `globalThis.__noloDesktopApplyWindowState?.(${state});`
  );
};

const setupDesktopNavigationMenu = (mainWindow: DesktopBrowserWindow) => {
  if (process.platform === "win32") {
    ApplicationMenu.setApplicationMenu([]);
    return;
  }

  ApplicationMenu.setApplicationMenu([
    {
      label: "File",
      submenu: [{ role: "quit" }],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "divider" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { type: "divider" },
        { role: "selectAll" },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          label: "Back",
          action: "desktop:navigate-back",
          accelerator: DESKTOP_NAVIGATION_ACCELERATORS.back,
        },
        {
          label: "Forward",
          action: "desktop:navigate-forward",
          accelerator: DESKTOP_NAVIGATION_ACCELERATORS.forward,
        },
        {
          label: "Reload",
          action: "desktop:reload",
          accelerator: DESKTOP_NAVIGATION_ACCELERATORS.reload,
        },
        {
          label: "Toggle Always on Top",
          action: DESKTOP_NAVIGATION_ACTIONS.toggleAlwaysOnTop,
          accelerator: "CommandOrControl+Shift+P",
        },
        {
          label: "Toggle Show on All Workspaces",
          action: DESKTOP_NAVIGATION_ACTIONS.toggleVisibleOnAllWorkspaces,
          accelerator: "CommandOrControl+Shift+O",
        },
      ],
    },
  ]);

  ApplicationMenu.on("application-menu-clicked", (event) => {
    const action = (event as DesktopMenuEvent).data?.action;
    if (action === DESKTOP_NAVIGATION_ACTIONS.back) {
      navigateDesktopHistory(mainWindow, "back");
      return;
    }
    if (action === DESKTOP_NAVIGATION_ACTIONS.forward) {
      navigateDesktopHistory(mainWindow, "forward");
      return;
    }
    if (action === DESKTOP_NAVIGATION_ACTIONS.reload) {
      navigateDesktopHistory(mainWindow, "reload");
      return;
    }
    if (action === DESKTOP_NAVIGATION_ACTIONS.toggleAlwaysOnTop) {
      mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
      syncDesktopWindowState(mainWindow);
      return;
    }
    if (action === DESKTOP_NAVIGATION_ACTIONS.toggleVisibleOnAllWorkspaces) {
      mainWindow.setVisibleOnAllWorkspaces(!mainWindow.isVisibleOnAllWorkspaces());
      syncDesktopWindowState(mainWindow);
    }
  });
};

type DesktopWindowFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const framesEqual = (left: DesktopWindowFrame, right: DesktopWindowFrame) =>
  left.x === right.x &&
  left.y === right.y &&
  left.width === right.width &&
  left.height === right.height;

const isValidWorkArea = (workArea: DesktopWindowFrame) =>
  Number.isFinite(workArea.x) &&
  Number.isFinite(workArea.y) &&
  Number.isFinite(workArea.width) &&
  Number.isFinite(workArea.height) &&
  workArea.width > 0 &&
  workArea.height > 0;

const setupDesktopWindowControls = (mainWindow: DesktopBrowserWindow) => {
  let restoredFrame: DesktopWindowFrame | null = null;
  let appliedMaximizedFrame: DesktopWindowFrame | null = null;

  const maximizeDesktopWindow = () => {
    if (mainWindow.isMaximized()) return;
    if (process.platform === "win32") {
      const currentFrame = mainWindow.getFrame();
      const displays = Screen.getAllDisplays();
      const centerX = currentFrame.x + currentFrame.width / 2;
      const centerY = currentFrame.y + currentFrame.height / 2;
      const display =
        displays.find(
          (candidate) =>
            centerX >= candidate.bounds.x &&
            centerX < candidate.bounds.x + candidate.bounds.width &&
            centerY >= candidate.bounds.y &&
            centerY < candidate.bounds.y + candidate.bounds.height,
        ) ?? Screen.getPrimaryDisplay();
      const workArea = display.workArea;
      if (!isValidWorkArea(workArea)) {
        console.warn("[desktop] cannot maximize: display work area is invalid", workArea);
        return;
      }
      restoredFrame = currentFrame;
      appliedMaximizedFrame = { ...workArea };
      mainWindow.setFrame(workArea.x, workArea.y, workArea.width, workArea.height);
      return;
    }
    mainWindow.maximize();
  };

  const restoreDesktopWindow = () => {
    if (process.platform === "win32") {
      const currentFrame = mainWindow.getFrame();
      if (!restoredFrame || !appliedMaximizedFrame) {
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        }
        return;
      }
      if (!framesEqual(currentFrame, appliedMaximizedFrame)) {
        restoredFrame = null;
        appliedMaximizedFrame = null;
        maximizeDesktopWindow();
        return;
      }
      const frame = restoredFrame;
      restoredFrame = null;
      appliedMaximizedFrame = null;
      mainWindow.setFrame(frame.x, frame.y, frame.width, frame.height);
      return;
    }
    if (!mainWindow.isMaximized()) return;
    mainWindow.unmaximize();
  };

  mainWindow.webview.on("host-message", async (event) => {
    const detail = (event as { data?: { detail?: unknown } }).data?.detail;
    if (!detail || typeof detail !== "object") {
      console.log("[host-message] rejected: no detail object");
      return;
    }

    const __msgType = (detail as any).type ?? "<unknown>";
    const __msgAction = (detail as any).action ?? "";
    const __msgSize = (() => {
      try {
        return JSON.stringify(detail).length;
      } catch {
        return -1;
      }
    })();
    const __stamp = `[host-message] type=${__msgType} action=${__msgAction} size=${__msgSize} ts=${Date.now()}`;
    console.log(__stamp);
    // Keep last message in a global so a post-crash inspector can recover it.
    (globalThis as any).__noloLastHostMessage = __stamp;

    if ((detail as any).type === "nolo-desktop-browser-action" && (detail as any).action === "open") {
      const targetUrl = (detail as any).url;
      openDesktopBrowser(typeof targetUrl === "string" && targetUrl ? targetUrl : undefined);
      return;
    }

    if ((detail as any).type === "nolo-desktop-console") {
      const { level, args } = detail as any;
      console.log(`[webview ${level}]`, ...(Array.isArray(args) ? args : [args]));
      return;
    }

    if ((detail as any).type === "nolo-desktop-console-batch") {
      const messages = (detail as any).messages;
      if (Array.isArray(messages)) {
        for (const m of messages) {
          if (m && typeof m.level === "string") {
            console.log(`[webview ${m.level}]`, ...(Array.isArray(m.args) ? m.args : [m.args]));
          }
        }
      }
      return;
    }

    if ((detail as any).type === "nolo-desktop-diagnostic") {
      const { event, payload } = detail as any;
      console.log(`[webview diagnostic] ${event}`, payload ?? {});
      return;
    }

    if ((detail as any).type === "nolo-desktop-process-control") {
      const { action, pid } = detail as any;
      try {
        const { getProcessRegistry } = await import(
          "../../../../packages/agent-runtime/processRegistry"
        );
        const registry = getProcessRegistry();
        if (action === "stop-process" && typeof pid === "number") {
          registry.kill(pid);
        } else if (action === "stop-all") {
          // Mirrors /stop all: user-initiated bulk stop targets background
          // tasks only. Transient foreground envelopes stay owned by their
          // foreground runner; the process-exit fallback (plain stopAll())
          // still kills everything.
          registry.stopAll(undefined, { includePersist: true, backgroundOnly: true });
        }
      } catch (err) {
        console.error("[nolo-desktop-process-control] failed:", err);
      }
      return;
    }

    if (
      (detail as { type?: unknown }).type !== "nolo-desktop-window-action"
    ) {
      return;
    }

    const action = (detail as { action?: unknown }).action;
    if (action === "window-minimize") {
      mainWindow.minimize();
      return;
    }
    if (action === "window-maximize") {
      if (mainWindow.isMaximized() || restoredFrame) {
        restoreDesktopWindow();
      } else {
        maximizeDesktopWindow();
      }
      return;
    }
    if (action === "window-close") {
      mainWindow.close();
      return;
    }
    if (action === "window-toggle-always-on-top") {
      mainWindow.setAlwaysOnTop(!mainWindow.isAlwaysOnTop());
      syncDesktopWindowState(mainWindow);
      return;
    }
    if (action === "window-toggle-visible-on-all-workspaces") {
      mainWindow.setVisibleOnAllWorkspaces(!mainWindow.isVisibleOnAllWorkspaces());
      syncDesktopWindowState(mainWindow);
    }
  });
};

const setupDesktopNavigationChrome = (mainWindow: DesktopBrowserWindow) => {
  setupDesktopWindowControls(mainWindow);
  installDesktopNavigationChrome(mainWindow);
  mainWindow.webview.on("dom-ready", () => {
    installDesktopNavigationChrome(mainWindow);
    syncDesktopWindowState(mainWindow);
  });
  mainWindow.webview.on("did-navigate", () => {
    installDesktopNavigationChrome(mainWindow);
    syncDesktopWindowState(mainWindow);
  });
  mainWindow.webview.on("did-navigate-in-page", () => {
    installDesktopNavigationChrome(mainWindow);
    syncDesktopWindowState(mainWindow);
  });
};

const findOpenPort = async (startPort: number, attempts = 20): Promise<number> => {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset;
    const available = await new Promise<boolean>((resolvePort) => {
      const tester = createServer();
      tester.once("error", () => resolvePort(false));
      tester.once("listening", () => {
        tester.close(() => resolvePort(true));
      });
      tester.listen(port, "127.0.0.1");
    });

    if (available) return port;
  }

  throw new Error(`No available desktop server port found starting from ${startPort}`);
};

const waitForServer = async (url: string, retries = 80, intervalMs = 250) => {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) return;
    } catch {
      // wait for next attempt
    }
    await Bun.sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for embedded Nolo server at ${url}`);
};

const channel = await Updater.localInfo.channel();
process.env.NOLO_DESKTOP_CHANNEL = channel;
const isDev = channel === "dev";
if (!isDev) ensureLinuxDesktopEntry({ resourcesDir: PACKAGED_RESOURCES_DIR });
const isHeadlessProbe = process.env.NOLO_DESKTOP_HEADLESS === "1";
const isSmokeProbe = process.env.NOLO_DESKTOP_SMOKE_PROBE === "1";
const smokeProbeExitDelayMs = Math.max(
  0,
  Number(process.env.NOLO_DESKTOP_SMOKE_PROBE_EXIT_DELAY_MS ?? 1500),
);
const installedPublicDir = join(PACKAGED_RESOURCES_DIR, "app", "public");
const packagedPublicDir = join(PATHS.VIEWS_FOLDER, "..", "public");
// Dev channel serves monorepo public/ (live esDev/esBuild) so UI changes do not
// require rsync into the .app bundle. Production keeps Resources/app/public.
// Override: NOLO_PUBLIC_DIR, or NOLO_DESKTOP_USE_PACKAGED_PUBLIC=1 to force bundle assets.
const { publicDir: bundledPublicDir, source: publicDirSource } =
  resolveDesktopPublicDir({
    isDev,
    installedPublicDir,
    packagedPublicDir,
    env: process.env,
    searchFrom: [
      process.cwd(),
      EXECUTABLE_DIR,
      PACKAGED_RESOURCES_DIR,
      packagedPublicDir,
      installedPublicDir,
    ],
  });
const desktopChannelDir = resolveDesktopChannelDir(channel);
desktopDiag("boot:start", "desktop runtime boot starting", {
  channel,
  isDev,
  pid: process.pid,
});
desktopDiag("cwd:resolved", "working directory and channel data dir resolved", {
  channelDir: desktopChannelDir,
});
const serverPort = await findOpenPort(SERVER_PORT_BASE);
const desktopInstanceLock = acquireDesktopInstanceLock({
  channelDir: desktopChannelDir,
  port: serverPort,
});
if (!desktopInstanceLock.acquired) {
  // Electrobun focus API limit: `activateWindow` / `showWindow` only target
  // windows owned by *this* process. There is no safe cross-process "focus the
  // already-running Nolo Desktop instance" API, so we degrade to a clear
  // user-visible log and exit without starting a second embedded server.
  //
  // Exit code policy: DESKTOP_SECOND_INSTANCE_EXIT_CODE (0) — intentional no-op,
  // not a crash. See singleInstanceLock.ts.
  const pidLabel = desktopInstanceLock.existingPid ?? "unknown";
  const portLabel =
    desktopInstanceLock.existingPort != null
      ? String(desktopInstanceLock.existingPort)
      : "unknown";
  desktopDiag("instance-lock", "blocked by existing instance", {
    level: "error",
    existingPid: desktopInstanceLock.existingPid,
    existingPort: desktopInstanceLock.existingPort,
    reason: desktopInstanceLock.reason,
    lockPath: desktopInstanceLock.lockPath,
    exitCode: DESKTOP_SECOND_INSTANCE_EXIT_CODE,
  });
  console.error(
    `[desktop:instance-lock] phase=instance-lock another Nolo Desktop instance is already running ` +
      `pid=${pidLabel} port=${portLabel} reason=${desktopInstanceLock.reason} ` +
      `lock=${desktopInstanceLock.lockPath}; exiting duplicate launch with code ${DESKTOP_SECOND_INSTANCE_EXIT_CODE}`
  );
  process.exit(DESKTOP_SECOND_INSTANCE_EXIT_CODE);
}
// Release lock on any process exit. release() is idempotent with shutdownDesktop.
process.on("exit", () => desktopInstanceLock.release());
desktopDiag("instance-lock", "single-instance lock acquired", {
  pid: process.pid,
  port: serverPort,
  lockPath: desktopInstanceLock.lockPath,
});
console.log(
  `[desktop:instance-lock] phase=instance-lock acquired pid=${process.pid} port=${serverPort} lock=${desktopInstanceLock.lockPath}`
);
const serverUrl = `http://127.0.0.1:${serverPort}`;
console.log(`[desktop] using embedded server port ${serverPort}`);
console.log(`[desktop] using desktop data dir ${desktopChannelDir}`);
console.log(
  `[desktop] using public dir ${bundledPublicDir} (source=${publicDirSource})`
);
try {
  const latestAssetsPath = join(bundledPublicDir, "latest-assets.json");
  if (existsSync(latestAssetsPath)) {
    const latestAssets = JSON.parse(readFileSync(latestAssetsPath, "utf8")) as {
      buildTime?: string;
      js?: string;
      css?: string;
    };
    console.log(
      `[desktop] public assets buildTime=${latestAssets.buildTime ?? "unknown"} ` +
        `js=${latestAssets.js ?? "unknown"} css=${latestAssets.css ?? "unknown"}`
    );
  } else {
    console.warn(
      `[desktop] public assets missing latest-assets.json under ${bundledPublicDir}`
    );
  }
} catch (error) {
  console.warn("[desktop] failed to read public latest-assets.json", error);
}

const resolveInitialWindowFrame = () => {
  if (process.platform !== "win32") {
    return {
      width: 1440,
      height: 920,
      x: 120,
      y: 80,
    };
  }

  const primaryDisplay = Screen.getPrimaryDisplay();
  const workArea = primaryDisplay.workArea;
  const targetWidth = Math.max(1280, Math.min(Math.round(workArea.width * 0.75), workArea.width));
  const targetHeight = Math.max(800, Math.min(Math.round(workArea.height * 0.8), workArea.height));
  const targetX = workArea.x + Math.max(0, Math.floor((workArea.width - targetWidth) / 2));
  const targetY = workArea.y + Math.max(0, Math.floor((workArea.height - targetHeight) / 2));

  console.log(`[desktop] primary display scale factor ${primaryDisplay.scaleFactor}`);
  console.log(
    `[desktop] target logical frame ${targetWidth}x${targetHeight} at ${targetX},${targetY}`
  );

  return {
    width: targetWidth,
    height: targetHeight,
    x: targetX,
    y: targetY,
  };
};

process.env.NODE_ENV = isDev ? "development" : "production";
if (!isDev) {
  process.env.NOLO_FORCE_PRODUCTION = "1";
}
process.env.HTTP_PORT = String(serverPort);
process.env.NOLO_PUBLIC_DIR = bundledPublicDir;
process.env.NOLO_SERVER_AUTOSTART = "0";
process.env.NOLO_SERVER_REGISTER_PROCESS_HANDLERS = "0";
process.env.PLATFORM_SERVER_HOST = "127.0.0.1";
process.env.NOLO_DESKTOP = "1";
process.env.NOLO_SERVER_DB_PATH = join(desktopChannelDir, "data", "leveldb");

let serverChild: ChildProcess | undefined;
let shutdownEmbeddedServer: ((reason?: string) => Promise<void>) | undefined;

if (process.platform === "win32" && !isDev) {
  serverChild = spawn(process.execPath, [process.env.NOLO_DESKTOP_APP_ENTRY], {
    env: {
      ...process.env,
      NOLO_DESKTOP_SERVER_CHILD: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  serverChild.stdout?.on("data", (chunk) => {
    console.log(`[desktop server] ${chunk.toString("utf8").trimEnd()}`);
  });
  serverChild.stderr?.on("data", (chunk) => {
    console.error(`[desktop server] ${chunk.toString("utf8").trimEnd()}`);
  });
  serverChild.once("exit", (code, signal) => {
    console.error(`[desktop] embedded server child exited code=${code} signal=${signal}`);
  });
} else {
  const { bootstrapServer, shutdownServer } = await import("desktop-runtime/entry");
  await bootstrapServer();
  shutdownEmbeddedServer = shutdownServer;
}

await waitForServer(serverUrl);
desktopDiag("server:listening", "embedded server ready", { serverUrl });

if (isHeadlessProbe) {
  console.log("[desktop] headless probe mode enabled; BrowserWindow startup skipped");
  isDesktopBootReady = true;
  desktopDiag("boot:ready", "headless probe ready; BrowserWindow skipped");
  await new Promise(() => {});
}

const { startDesktopLocalConnector } = await import("./localConnector");
const desktopLocalConnector = await startDesktopLocalConnector({ channel });
let shutdownDesktopPromise: Promise<void> | null = null;

// Keep shutdown idempotent so normal window close, app quit, and smoke probes
// all reuse the same cleanup path instead of racing bespoke process teardown.
const shutdownDesktop = (reason: string) => {
  if (!shutdownDesktopPromise) {
    shutdownDesktopPromise = (async () => {
      console.log(`[desktop:instance-lock] phase=instance-lock shutdown reason=${reason}`);
      desktopLocalConnector.stop?.(reason);
      serverChild?.kill();
      await shutdownEmbeddedServer?.(reason);
      desktopInstanceLock.release();
    })();
  }
  return shutdownDesktopPromise;
};

// Ensure lock release on terminal signals (in addition to process "exit" and
// Electrobun before-quit / window close). Handlers run once; release is idempotent.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => {
    void shutdownDesktop(`signal-${signal}`).finally(() => {
      process.exit(signal === "SIGINT" ? 130 : 143);
    });
  });
}

const initialFrame = resolveInitialWindowFrame();
const shouldInstallInjectedDesktopChrome = true;

// Generic probe hook: optional initial path for Desktop E2E (production-off; unset in normal use).
// Example: NOLO_DESKTOP_E2E_INITIAL_PATH=/create/local-agent
const e2eInitialPathRaw = process.env.NOLO_DESKTOP_E2E_INITIAL_PATH?.trim() || "/";
const e2eInitialPath = e2eInitialPathRaw.startsWith("/")
  ? e2eInitialPathRaw
  : `/${e2eInitialPathRaw}`;
const desktopShellQuery = `noloDesktop=1&noloDesktopTitlebar=${
  shouldInstallInjectedDesktopChrome ? "shell" : "native"
}`;
const initialWindowUrl = `${serverUrl}${e2eInitialPath}${
  e2eInitialPath.includes("?") ? "&" : "?"
}${desktopShellQuery}`;

const windowPhaseStartedAt = Date.now();
desktopDiag("window:create", "creating BrowserWindow", {
  origin: serverUrl,
});
console.log("[desktop] creating BrowserWindow");
if (e2eInitialPath !== "/") {
  console.log(`[desktop e2e] initial path ${e2eInitialPath}`);
}
const mainWindow = (() => {
  try {
    const created = new BrowserWindow({
      title: "Nolo Desktop",
      url: initialWindowUrl,
      frame: initialFrame,
      titleBarStyle: "hiddenInset",
    });
    console.log("[desktop] BrowserWindow created");
    desktopDiag("window:create", "BrowserWindow created", {
      origin: serverUrl,
      durationMs: Date.now() - windowPhaseStartedAt,
    });
    return created;
  } catch (error) {
    desktopDiag("window:create", "BrowserWindow creation failed", {
      level: "error",
      origin: serverUrl,
      durationMs: Date.now() - windowPhaseStartedAt,
      error: formatPhaseError(error),
    });
    throw error;
  }
})();
if (isSmokeProbe) {
  console.log("[desktop] smoke probe mode enabled");
}
setupDesktopNavigationMenu(mainWindow as any);
if (shouldInstallInjectedDesktopChrome) {
  setupDesktopNavigationChrome(mainWindow as any);
}
installDesktopApiRequestBridge(mainWindow as any);

openDesktopBrowser = (targetUrl?: string) => {
  if (browserWindow) {
    browserWindow.show();
    if (targetUrl && browserWindow.webview.loadURL) {
      browserWindow.webview.loadURL(targetUrl);
    }
    return;
  }
  const initialUrl = targetUrl || "https://www.douyin.com/";
  console.log("[desktop] opening browser window", { url: initialUrl });
  try {
    const created = new BrowserWindow({
      title: "Nolo Browser",
      url: initialUrl,
      frame: { x: 120, y: 80, width: 1180, height: 820 },
      titleBarStyle: "default",
      sandbox: false,
      navigationRules: JSON.stringify(["*"]),
    }) as BrowserWindowLike;
    console.log("[desktop] browser BrowserWindow created");
    console.log("[desktop] browser webview check", { hasWebview: !!created.webview, hasExec: typeof created.webview?.executeJavascript });
    browserWindow = created;

    // 浏览器窗口导航时尽早注入地址栏 chrome：不等 dom-ready，
    // 在 did-navigate 就注入一个轮询脚本，document.body 一出现就插入。
    const injectBrowserChromeEarly = () => {
      const js = `
        (() => {
          const input = document.getElementById("nolo-browser-address");
          if (input) {
            input.value = location.href;
            return;
          }
          if (globalThis.__noloBrowserChromePending) return;
          globalThis.__noloBrowserChromePending = true;
          const tryInject = () => {
            if (document.documentElement && !document.getElementById("nolo-browser-shellbar")) {
              globalThis.__noloBrowserChromePending = false;
              ${BROWSER_CHROME_SCRIPT}
              return true;
            }
            return false;
          };
          if (tryInject()) return;
          const timer = setInterval(() => { if (tryInject()) clearInterval(timer); }, 16);
          setTimeout(() => clearInterval(timer), 10000);
        })();
      `;
      try { created.webview.executeJavascript(js); } catch {}
    };

    // url-tracker 能力包：did-navigate 时更新 BrowseContextStore
    created.webview.on("did-navigate", (event: unknown) => {
      const url = (event as { url?: string })?.url ?? "";
      injectTitleAndStoreContext(url);
      maybeInjectVideoPlayurlScript(url);
      injectBrowserChromeEarly();
    });
    created.webview.on("did-navigate-in-page", (event: unknown) => {
      const url = (event as { url?: string })?.url ?? "";
      injectTitleAndStoreContext(url);
      maybeInjectVideoPlayurlScript(url);
      injectBrowserChromeEarly();
    });
    created.webview.on("dom-ready", () => {
      console.log("[desktop] browser dom-ready");
      injectBrowserChromeEarly();
      // 首页类 SPA 不会触发 did-navigate，dom-ready 时也注入一次 playurl 提取
      maybeInjectVideoPlayurlScript(typeof location !== "undefined" ? location.href : "");
      try {
        created.webview.executeJavascript('document.title && globalThis.__electrobunSendToHost ? globalThis.__electrobunSendToHost({type:"nolo-browser-context",url:location.href,title:document.title}) : console.log("[browser] no host bridge")');
        console.log("[desktop] browser context probe injected");
      } catch (e) {
        console.error("[desktop] browser context probe failed", e);
      }
      try {
        created.webview.executeJavascript(BROWSER_CHROME_SCRIPT);
        console.log("[desktop] browser chrome injected");
      } catch (e) {
        console.error("[desktop] browser chrome inject failed", e);
      }
    });

    // 注入 JS 读取 title 并通过 host-message 回传（executeJavascript 无返回值）
    const injectTitleAndStoreContext = (url: string) => {
      const js = `
        try {
          const __noloTitle = document.title || "";
          globalThis.__electrobunSendToHost?.({
            type: "nolo-browser-context",
            url: "${url.replace(/"/g, '\\"')}",
            title: __noloTitle,
          });
        } catch (e) {}
      `;
      created.webview.executeJavascript(js);
    };

    // video-playurl 能力包：B 站 / 抖音视频页注入播放地址提取 JS（sendToHost 回传）
    const maybeInjectVideoPlayurlScript = (url: string) => {
      if (!/bilibili\.com|b23\.tv|douyin\.com|iesdouyin\.com/i.test(url)) return;
      console.log("[desktop] maybe inject video-playurl for", url);
      const pack = getCapability("video-playurl");
      const js = pack?.onNavigate?.(url);
      if (js) {
        console.log("[desktop] injecting video-playurl script, length:", js.length);
        try {
          created.webview.executeJavascript(js);
          console.log("[desktop] video-playurl script injected");
        } catch (e) {
          console.error("[desktop] video-playurl inject failed", e);
        }
      }
    };

    // 接收浏览器窗口回传的上下文
    created.webview.on("host-message", (event: unknown) => {
      const detail = (event as { data?: { detail?: unknown } })?.data?.detail;
      if (!detail || typeof detail !== "object") return;
      const msg = detail as {
        type?: string;
        url?: string;
        title?: string;
        textSnippet?: string;
        playurl?: string | null;
        source?: string;
        error?: string;
      };
      if (msg.type === "nolo-browser-context") {
        // 合并而非整表重写：保留 video-playurl 刚写入的 playurl/source 等字段
        // （reviewer P1：两条 host-message 先后到达时互覆盖导致提取结果不可靠）
        const context = mergeBrowseContext(getBrowseContext("browser"), {
          url: msg.url || "",
          title: msg.title || "",
          textSnippet: msg.textSnippet,
          capability: "url-tracker",
        });
        setBrowseContext("browser", context);
        console.log("[desktop] browse context updated", { url: context.url, title: context.title });
        // 收到页面 URL 后触发 playurl 提取（覆盖首页 SPA 不触发 did-navigate 的场景）
        maybeInjectVideoPlayurlScript(msg.url || "");
      }
      if (msg.type === "nolo-browser-playurl") {
        // video-playurl 能力包回传：播放地址 + 标题（cookie 不出 webview）
        const context = mergeBrowseContext(getBrowseContext("browser"), {
          url: msg.url || "",
          title: msg.title || "",
          capability: "video-playurl",
          playurl: msg.playurl || undefined,
          videoTitle: msg.title || undefined,
          source: msg.source,
          playurlError: msg.error,
        });
        setBrowseContext("browser", context);
        console.log("[desktop] playurl extracted", {
          url: context.url,
          source: context.source,
          hasPlayurl: Boolean(context.playurl),
          error: context.playurlError,
        });
      }
      if (msg.type === "nolo-browser-navigate" && msg.url) {
        created.webview.loadURL?.(msg.url);
      }
    });

    created.on("close", () => {
      console.log("[desktop] browser window closed");
      clearBrowseContext("browser");
      if (browserWindow === created) browserWindow = undefined;
    });
  } catch (error) {
    console.error("[desktop] failed to open browser window", error);
    browserWindow = undefined;
  }
};

if (isSmokeProbe) {
  // Stable-release smoke only needs to prove a real BrowserWindow can boot the
  // installed app once. Let the runtime exit itself after dom-ready instead of
  // forcing the external PowerShell harness to kill a GUI process tree.
  let smokeProbeFinished = false;
  const finishSmokeProbe = (outcome: "dom-ready" | "timeout", exitCode: number) => {
    if (smokeProbeFinished) return;
    smokeProbeFinished = true;
    void (async () => {
      if (outcome === "dom-ready" && smokeProbeExitDelayMs > 0) {
        await Bun.sleep(smokeProbeExitDelayMs);
      }
      console.log(`[desktop] smoke probe completed: ${outcome}`);
      await shutdownDesktop(`desktop-smoke-probe-${outcome}`);
      try {
        mainWindow.close();
      } catch {}
      setTimeout(() => process.exit(exitCode), 250);
    })();
  };

  const smokeProbeTimeoutMs = Math.max(
    1000,
    Number(process.env.NOLO_DESKTOP_SMOKE_PROBE_TIMEOUT_MS ?? 20000),
  );
  setTimeout(() => finishSmokeProbe("timeout", 2), smokeProbeTimeoutMs);
  mainWindow.webview.on("dom-ready", () => {
    console.log("[desktop] smoke probe dom-ready");
    finishSmokeProbe("dom-ready", 0);
  });
}

const desktopE2eScriptPath = process.env.NOLO_DESKTOP_E2E_SCRIPT_PATH?.trim();
if (desktopE2eScriptPath) {
  // Brief delay so entry.tsx can install the desktop console/host bridge before probe JS runs.
  const e2eInjectDelayMs = Math.max(
    0,
    Number(process.env.NOLO_DESKTOP_E2E_INJECT_DELAY_MS ?? 400),
  );
  mainWindow.webview.on("dom-ready", () => {
    setTimeout(() => {
      try {
        const script = readFileSync(desktopE2eScriptPath, "utf8");
        console.log(`[desktop e2e] executing script ${desktopE2eScriptPath}`);
        mainWindow.webview.executeJavascript(
          `globalThis.__NOLO_DESKTOP_E2E__ = true;\n${script}`
        );
      } catch (error) {
        console.error("[desktop e2e] failed to execute script", formatDiagnosticError(error));
      }
    }, e2eInjectDelayMs);
  });
}

const notifyDesktopUpdateChrome = () => {
  try {
    mainWindow.webview.executeJavascript("globalThis.__noloDesktopRefreshUpdateButton?.();");
  } catch {}
};

const scheduleInitialUpdateCheck = () => {
  const delayMs = Number(process.env.NOLO_DESKTOP_UPDATE_CHECK_DELAY_MS ?? 12000);
  setTimeout(async () => {
    try {
      Updater.clearStatusHistory();
      await Updater.checkForUpdate();
    } catch (error) {
      console.error("[desktop] initial update check failed", error);
    } finally {
      notifyDesktopUpdateChrome();
    }
  }, Math.max(0, delayMs));
};

scheduleInitialUpdateCheck();

isDesktopBootReady = true;
desktopDiag("boot:ready", "desktop boot ready", {
  origin: serverUrl,
  smoke: isSmokeProbe,
});

mainWindow.on("close", async () => {
  await shutdownDesktop("desktop-window-close");
});

Electrobun.events.on("before-quit", async () => {
  await shutdownDesktop("desktop-before-quit");
});
