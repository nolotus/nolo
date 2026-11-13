import { existsSync, statSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { ProcessRegistry } from "../../agent-runtime/processRegistry";
import { runTaskStop, isProcessGroupAlive } from "../../agent-runtime/processTaskTools";
import { isTrustedDesktopSameOriginRequest } from "../desktopRequestTrust";

import { toErrorMessage } from "core/errorMessage";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });

async function spawnAndRead(args: string[]): Promise<string> {
  const proc = Bun.spawn(args, { stdio: ["ignore", "pipe", "pipe"] });
  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `Folder picker exited with code ${exitCode}`);
  }
  return stdout.trim();
}

export type FolderPickerCapability = {
  available: boolean;
  channels: string[];
  reason?: string;
  retryable?: boolean;
};

/** Native protocol handshake in an isolated process: no surfaces/windows are created.
 * XOpenDisplay authenticates X11; wl_display_roundtrip verifies the compositor.
 * Merely connecting a Unix socket would also accept stale or unrelated listeners.
 */
async function connectNativeDisplay(env: Record<string, string | undefined>, signal: AbortSignal): Promise<boolean> {
  const script = `
    import { dlopen, FFIType as T } from "bun:ffi";
    let connected = false;
    if (process.env.WAYLAND_DISPLAY) {
      try {
        const w = dlopen("libwayland-client.so.0", {
          wl_display_connect: { args: [T.ptr], returns: T.ptr },
          wl_display_roundtrip: { args: [T.ptr], returns: T.i32 },
          wl_display_disconnect: { args: [T.ptr], returns: T.void },
        });
        const d = w.symbols.wl_display_connect(null);
        if (d) { connected = w.symbols.wl_display_roundtrip(d) >= 0; w.symbols.wl_display_disconnect(d); }
        w.close();
      } catch {}
    }
    if (!connected && process.env.DISPLAY) {
      try {
        const x = dlopen("libX11.so.6", {
          XOpenDisplay: { args: [T.ptr], returns: T.ptr },
          XCloseDisplay: { args: [T.ptr], returns: T.i32 },
        });
        const d = x.symbols.XOpenDisplay(null);
        if (d) { connected = true; x.symbols.XCloseDisplay(d); }
        x.close();
      } catch {}
    }
    process.exit(connected ? 0 : 1);
  `;
  return await runFolderCapabilityCommand([process.execPath, "-e", script], signal, env) === 0;
}

/** POSIX probes have their own process group. Abort returns only after cleanup. */
export async function runFolderCapabilityCommand(args: string[], signal: AbortSignal, env: Record<string, string | undefined> = process.env): Promise<number> {
  if (signal.aborted) throw new Error("Capability probe aborted before spawn");
  const proc = Bun.spawn(args, { env, detached: true, stdio: ["ignore", "ignore", "ignore"] });
  const registry = new ProcessRegistry();
  const record = registry.add({ pid: proc.pid, pgid: proc.pid, command: args[0], label: "folder capability probe" });
  let cleanup: Promise<void> | undefined;
  const abort = () => {
    cleanup = (async () => {
      await runTaskStop({ registry, taskId: record.taskId, graceMs: 100 });
      await proc.exited;
      // taskStop signals the tree; independently confirm disappearance after escalation.
      const deadline = Date.now() + 1000;
      while (isProcessGroupAlive(proc.pid) && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 10));
      if (isProcessGroupAlive(proc.pid)) throw new Error("Capability probe process group exit unconfirmed");
    })();
    void cleanup.catch((error) => console.error("[desktop] capability cleanup failed:", error));
  };
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  try { const code = await proc.exited; await cleanup; return code; }
  finally { signal.removeEventListener("abort", abort); }
}

type WindowsProbeProcess = { pid: number; exited: Promise<number>; kill: (signal: "SIGKILL") => unknown };
type WindowsProbeOptions = {
  spawn?: (args: string[], env: Record<string, string | undefined>) => WindowsProbeProcess;
  cleanupTimeoutMs?: number;
};
class ProbeCleanupError extends Error {}

/** Bound every cleanup wait, including a broken or hung taskkill executable. */
async function runWindowsCapabilityCommand(args: string[], signal: AbortSignal, env: Record<string, string | undefined>, options: WindowsProbeOptions = {}): Promise<number> {
  if (signal.aborted) throw new Error("Capability probe aborted before spawn");
  const spawn = options.spawn ?? ((args, env) => Bun.spawn(args, { env, stdio: ["ignore", "ignore", "ignore"] }));
  const proc = spawn(args, env);
  const timeoutMs = options.cleanupTimeoutMs ?? 1000;
  const bounded = async <T>(promise: Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([promise, new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new ProbeCleanupError("Capability probe cleanup timed out")), timeoutMs);
      })]);
    } finally { clearTimeout(timer); }
  };
  let cleanup: Promise<void> | undefined;
  let cleanupStarted!: (cleanup: Promise<void>) => void;
  const aborted = new Promise<void>((resolve, reject) => {
    cleanupStarted = (promise) => { promise.then(resolve, reject); };
  });
  const abort = () => {
    cleanup = (async () => {
      let killer: WindowsProbeProcess | undefined;
      try {
        const taskkill = resolve(env.SystemRoot || "C:\\Windows", "System32/taskkill.exe");
        killer = spawn([taskkill, "/PID", String(proc.pid), "/T", "/F"], env);
        const code = await bounded(killer.exited);
        if (code !== 0) throw new ProbeCleanupError(`Capability probe taskkill exited with code ${code}`);
        await bounded(proc.exited);
      } catch (error) {
        // Best effort direct fallback is not evidence that the descendants exited.
        try { killer?.kill("SIGKILL"); } catch { /* Report cleanup failure below. */ }
        try { proc.kill("SIGKILL"); } catch { /* Still attempt bounded exit confirmation. */ }
        try { await bounded(proc.exited); } catch { /* Never wait indefinitely. */ }
        throw new ProbeCleanupError(`Capability probe cleanup failed: ${toErrorMessage(error)}`);
      }
    })();
    cleanupStarted(cleanup);
  };
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  try {
    // Observe cleanup failure even when the target's exited promise never settles.
    const result = await Promise.race([proc.exited, aborted]);
    if (cleanup) await cleanup;
    return typeof result === "number" ? result : await bounded(proc.exited);
  } finally { signal.removeEventListener("abort", abort); }
}

/** Allocate native picker types and inspect the interactive session, without showing UI. */
async function detectOtherNativePicker(platform: string, env: Record<string, string | undefined>, which: (name: string) => string | null,
  run: ((args: string[], signal: AbortSignal) => Promise<number>) | undefined, timeoutMs: number, windowsProbe?: WindowsProbeOptions): Promise<FolderPickerCapability> {
  let args: string[];
  let channel: string;
  if (platform === "darwin") {
    const executable = which("osascript");
    if (!executable) return { available: false, channels: [], reason: "missing-native-picker" };
    channel = "osascript";
    args = [executable, "-l", "JavaScript", "-e", `
      ObjC.import('AppKit'); ObjC.import('CoreGraphics');
      if (!ObjC.unwrap($.CGSessionCopyCurrentDictionary())) throw Error('No interactive graphical session');
      const panel = $.NSOpenPanel.openPanel;
      if (!panel) throw Error('NSOpenPanel unavailable');
      // Do not call runModal, beginWithCompletionHandler or choose folder.
    `];
  } else {
    const systemPowerShell = resolve(env.SystemRoot || "C:\\Windows", "System32/WindowsPowerShell/v1.0/powershell.exe");
    const executable = existsSync(systemPowerShell) ? systemPowerShell : which("powershell") || which("pwsh");
    if (!executable) return { available: false, channels: [], reason: "missing-native-picker" };
    channel = "powershell";
    args = [executable, "-NoProfile", "-STA", "-NonInteractive", "-Command", `
      $ErrorActionPreference = 'Stop'
      Add-Type -AssemblyName System.Windows.Forms
      Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public static class NoloDesktopProbe { [DllImport("user32.dll", SetLastError=true)] public static extern IntPtr OpenInputDesktop(uint flags, bool inherit, uint access); [DllImport("user32.dll")] public static extern bool CloseDesktop(IntPtr desktop); }'
      if (-not [System.Windows.Forms.SystemInformation]::UserInteractive) { throw 'No interactive desktop' }
      $desktop = [NoloDesktopProbe]::OpenInputDesktop(0, $false, 0x0001)
      if ($desktop -eq [IntPtr]::Zero) { throw 'Input desktop inaccessible' }
      try { $browser = New-Object System.Windows.Forms.FolderBrowserDialog; $browser.Dispose() }
      finally { [void][NoloDesktopProbe]::CloseDesktop($desktop) }
    `];
  }
  const controller = new AbortController();
  let expired = false;
  const timer = setTimeout(() => { expired = true; controller.abort(); }, timeoutMs);
  try {
    const code = await (run ?? (platform === "win32" ? (args, signal) => runWindowsCapabilityCommand(args, signal, env, windowsProbe) : (args, signal) => runFolderCapabilityCommand(args, signal, env)))(args, controller.signal);
    return code === 0 && !expired ? { available: true, channels: [channel] } :
      { available: false, channels: [], reason: expired ? "probe-timeout" : "native-session-probe-failed", retryable: true };
  } catch (error) {
    return { available: false, channels: [], reason: error instanceof ProbeCleanupError ? "probe-cleanup-failed" : expired ? "probe-timeout" : "native-session-probe-failed", retryable: true };
  } finally { clearTimeout(timer); }
}

/** Non-interactive checks only; never invoke choose folder / ShowDialog. */
export async function detectFolderPickerCapability(deps: {
  platform?: string;
  env?: Record<string, string | undefined>;
  which?: (name: string) => string | null;
  run?: (args: string[], signal: AbortSignal) => Promise<number>;
  connectDisplay?: (env: Record<string, string | undefined>, signal: AbortSignal) => Promise<boolean>;
  timeoutMs?: number;
  windowsProbe?: WindowsProbeOptions;
} = {}): Promise<FolderPickerCapability> {
  const platform = deps.platform ?? process.platform;
  const env = deps.env ?? process.env;
  const which = deps.which ?? Bun.which;
  const unavailable = (reason: string, retryable = false): FolderPickerCapability =>
    ({ available: false, channels: [], reason, ...(retryable ? { retryable } : {}) });
  if (platform === "darwin" || platform === "win32") return detectOtherNativePicker(platform, env, which, deps.run, deps.timeoutMs ?? 2000, deps.windowsProbe);
  if (platform !== "linux") return unavailable("unsupported-platform");
  if (!env.DISPLAY && !env.WAYLAND_DISPLAY) return unavailable("no-graphical-session");
  const channel = ["zenity", "kdialog"].find((name) => which(name));
  if (!channel) return unavailable("missing-native-picker");
  const executable = which(channel)!;
  const controller = new AbortController();
  let expired = false;
  const timer = setTimeout(() => { expired = true; controller.abort(); }, deps.timeoutMs ?? 2000);
  try {
    if (!await (deps.connectDisplay ?? connectNativeDisplay)(env, controller.signal)) {
      return unavailable(expired ? "probe-timeout" : "display-unreachable", true);
    }
    const code = await (deps.run ?? ((args, signal) => runFolderCapabilityCommand(args, signal, env)))([executable, "--version"], controller.signal);
    if (expired) return unavailable("probe-timeout", true);
    return code === 0 ? { available: true, channels: [channel] } : unavailable("probe-failed", true);
  } catch (error) {
    console.warn("[desktop] capability probe failed:", toErrorMessage(error));
    return unavailable(expired ? "probe-timeout" : "probe-failed", true);
  } finally { clearTimeout(timer); }
}

/**
 * Open the native OS folder picker and return the selected directory path.
 * Supports macOS (osascript), Windows (pwsh/powershell), and Linux (zenity/kdialog).
 */
async function pickFolderNative(): Promise<string | null> {
  if (process.platform === "darwin") {
    const script = `
      set chosenFolder to choose folder with prompt "选择要绑定的文件夹"
      return POSIX path of chosenFolder
    `;
    const result = await spawnAndRead(["osascript", "-e", script]);
    const path = result.trim().replace(/\n$/, "");
    return path || null;
  }

  if (process.platform === "win32") {
    const psScript = `
      [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
      $OutputEncoding = [Console]::OutputEncoding
      Add-Type -AssemblyName System.Windows.Forms
      $browser = New-Object System.Windows.Forms.FolderBrowserDialog
      $browser.Description = "选择要绑定的文件夹"
      $browser.ShowNewFolderButton = $true
      $result = $browser.ShowDialog()
      if ($result -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-Output $browser.SelectedPath
      }
    `;
    const psArgs = ["-NoProfile", "-STA", "-NonInteractive", "-Command", psScript];
    // Prefer the OS executable: WindowsApps pwsh aliases can exit before opening any UI.
    const systemPowerShell = resolve(process.env.SystemRoot || "C:\\Windows", "System32/WindowsPowerShell/v1.0/powershell.exe");
    const executable = existsSync(systemPowerShell) ? systemPowerShell : Bun.which("powershell") || Bun.which("pwsh");
    if (!executable) throw new Error("No PowerShell executable available for the folder picker.");
    const result = await spawnAndRead([executable, ...psArgs]);
    return result || null;
  }

  // Linux: try zenity first, then kdialog
  const zenity = Bun.which("zenity");
  if (zenity) {
    const result = await spawnAndRead([zenity, "--file-selection", "--directory",
      "--title", "选择要绑定的文件夹"]);
    return result || null;
  }

  const kdialog = Bun.which("kdialog");
  if (kdialog) {
    const result = await spawnAndRead([kdialog, "--getexistingdirectory",
      "--title", "选择要绑定的文件夹"]);
    return result || null;
  }

  throw new Error("No native folder picker available on this platform.");
}

export async function handleDesktopPickFolder(
  req: Request,
  deps: {
    env?: Record<string, string | undefined>;
    pickFolder?: () => Promise<string | null>;
    createFolder?: (path: string) => Promise<unknown>;
    capability?: () => Promise<FolderPickerCapability>;
  } = {}
): Promise<Response> {
  const env = deps.env ?? process.env;
  if (env.NOLO_DESKTOP !== "1") {
    return json({ error: "Desktop runtime only" }, 404);
  }

  let name: string | null = null;
  if (req.headers.get("content-type")?.includes("application/json")) {
    let body: unknown;
    try { body = await req.json(); }
    catch { return json({ ok: false, error: "Invalid JSON body" }, 400); }
    if (body && typeof body === "object" && "action" in body && body.action === "capability") {
      return json({ ok: true, ...await (deps.capability ?? (() => detectFolderPickerCapability({ env })))() });
    }
    if (!body || typeof body !== "object" || !("action" in body) || body.action !== "create") {
      return json({ ok: false, error: "Unknown folder action" }, 400);
    }
    if (!isTrustedDesktopSameOriginRequest(req, env)) {
      return json({ ok: false, error: "Trusted Desktop request required" }, 403);
    }
    name = "name" in body && typeof body.name === "string" ? body.name.trim() : "";
    // One portable child name only. Never accept a path or overwrite an existing directory.
    if (!name || name === "." || name === ".." || name.length > 120 ||
        /[\\/<>:"|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name) ||
        /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) {
      return json({ ok: false, error: "请输入有效的项目名称（不能包含路径分隔符）" }, 400);
    }
  }

  try {
    const folderPath = await (deps.pickFolder ?? pickFolderNative)();
    if (!folderPath) {
      return json({ ok: true, path: null });
    }

    const normalizedPath = resolve(folderPath);

    // Validate: path must exist and be a directory
    if (!existsSync(normalizedPath)) {
      return json({ ok: false, error: "Selected path does not exist" }, 400);
    }
    if (!statSync(normalizedPath).isDirectory()) {
      return json({ ok: false, error: "Selected path is not a directory" }, 400);
    }

    if (name !== null) {
      const projectPath = resolve(normalizedPath, name);
      // recursive:false is deliberate: EEXIST must not silently open or modify a directory.
      await (deps.createFolder ?? ((path: string) => mkdir(path, { recursive: false })))(projectPath);
      return json({ ok: true, path: projectPath });
    }
    return json({ ok: true, path: normalizedPath });
  } catch (error) {
    const message = toErrorMessage(error);
    console.warn("[desktop] pick-folder failed:", message);
    return json({ ok: false, error: message }, 500);
  }
}
