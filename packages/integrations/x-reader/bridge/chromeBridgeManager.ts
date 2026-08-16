import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { toErrorMessage } from "core/errorMessage";

export type ChromeBridgeSession = {
  endpoint: string;
  port: number;
  profileDir: string;
  webSocketDebuggerUrl: string;
};

type ChromeBridgeProcess = Pick<ChildProcess, "kill" | "killed" | "exitCode" | "once">;

export type ChromeBridgeManagerOptions = {
  chromePath?: string | (() => string | Promise<string>);
  profileDir?: string;
  profileRoot?: string;
  host?: string;
  headless?: boolean;
  disableSandbox?: boolean;
  startupTimeoutMs?: number;
  pollIntervalMs?: number;
  portAllocator?: () => Promise<number>;
  spawnProcess?: (
    command: string,
    args: string[],
    options: { stdio: "ignore"; windowsHide: boolean },
  ) => ChromeBridgeProcess;
  ensureDir?: (path: string) => Promise<void>;
  fetchVersion?: (
    versionEndpoint: string,
  ) => Promise<{ webSocketDebuggerUrl?: string }>;
};

export type ChromeBridgeManager = {
  start(): Promise<ChromeBridgeSession>;
  stop(): Promise<void>;
  getSession(): ChromeBridgeSession | null;
};

const DEFAULT_HOST = "127.0.0.1";

function defaultChromePath() {
  if (process.platform === "win32") {
    return "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  }
  if (process.platform === "darwin") {
    return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  }
  return "google-chrome";
}

async function resolveChromePath(
  chromePath: NonNullable<ChromeBridgeManagerOptions["chromePath"]>,
) {
  return typeof chromePath === "function" ? await chromePath() : chromePath;
}

function defaultProfileRoot() {
  return join(tmpdir(), "nolo-x-reader-bridge");
}

async function defaultFetchVersion(versionEndpoint: string) {
  const response = await fetch(versionEndpoint);
  if (!response.ok) {
    throw new Error(`CDP version endpoint returned ${response.status}`);
  }

  return (await response.json()) as { webSocketDebuggerUrl?: string };
}

async function defaultPortAllocator() {
  return 9222 + Math.floor(Math.random() * 1000);
}

function buildChromeArgs(args: {
  host: string;
  port: number;
  profileDir: string;
  headless: boolean;
  disableSandbox: boolean;
}) {
  const chromeArgs = [
    "--disable-gpu",
    `--remote-debugging-address=${args.host}`,
    `--remote-debugging-port=${args.port}`,
    `--user-data-dir=${args.profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "about:blank",
  ];

  if (args.headless) {
    chromeArgs.unshift("--headless=new");
  }

  if (args.disableSandbox) {
    chromeArgs.unshift("--disable-dev-shm-usage");
    chromeArgs.unshift("--no-sandbox");
  }

  return chromeArgs;
}

async function waitForVersion(args: {
  endpoint: string;
  fetchVersion: NonNullable<ChromeBridgeManagerOptions["fetchVersion"]>;
  startupTimeoutMs: number;
  pollIntervalMs: number;
}) {
  const deadline = Date.now() + args.startupTimeoutMs;
  let lastError: unknown;

  while (Date.now() <= deadline) {
    try {
      const version = await args.fetchVersion(`${args.endpoint}/json/version`);
      if (version.webSocketDebuggerUrl) {
        return version.webSocketDebuggerUrl;
      }
      lastError = new Error("CDP version response did not include webSocketDebuggerUrl");
    } catch (error) {
      lastError = error;
    }
    await Bun.sleep(args.pollIntervalMs);
  }

  const message = toErrorMessage(lastError);
  throw new Error(`Chrome bridge did not become ready: ${message}`);
}

export function createChromeBridgeManager(
  options: ChromeBridgeManagerOptions = {},
): ChromeBridgeManager {
  const host = options.host ?? DEFAULT_HOST;
  const chromePath = options.chromePath ?? defaultChromePath;
  const fixedProfileDir = options.profileDir;
  const profileRoot = options.profileRoot ?? defaultProfileRoot();
  const headless = options.headless ?? true;
  const disableSandbox = options.disableSandbox ?? process.platform !== "win32";
  const startupTimeoutMs = options.startupTimeoutMs ?? 15000;
  const pollIntervalMs = options.pollIntervalMs ?? 250;
  const portAllocator = options.portAllocator ?? defaultPortAllocator;
  const spawnProcess =
    options.spawnProcess ??
    ((command, args, spawnOptions) =>
      spawn(command, args, {
        stdio: spawnOptions.stdio,
        windowsHide: spawnOptions.windowsHide,
      }));
  const ensureDir = options.ensureDir ?? ((path: string) => mkdir(path, { recursive: true }));
  const fetchVersion = options.fetchVersion ?? defaultFetchVersion;

  let activeSession: ChromeBridgeSession | null = null;
  let activeProcess: ChromeBridgeProcess | null = null;
  let startupPromise: Promise<ChromeBridgeSession> | null = null;

  async function start() {
    if (activeSession && activeProcess && !activeProcess.killed && activeProcess.exitCode === null) {
      return activeSession;
    }

    if (startupPromise) {
      return startupPromise;
    }

    startupPromise = (async () => {
      const port = await portAllocator();
      const endpoint = `http://${host}:${port}`;
      const profileDir = fixedProfileDir ?? join(profileRoot, `profile-${randomUUID()}`);
      await ensureDir(profileDir);
      const executablePath = await resolveChromePath(chromePath);

      let child: ChromeBridgeProcess;
      try {
        child = spawnProcess(
          executablePath,
          buildChromeArgs({ host, port, profileDir, headless, disableSandbox }),
          {
            stdio: "ignore",
            windowsHide: true,
          },
        );
      } catch (error: any) {
        throw Object.assign(
          new Error(
            `Chrome bridge browser is unavailable at ${executablePath}: ${toErrorMessage(error)}`,
          ),
          { code: "READ_X_POST_BROWSER_UNAVAILABLE" },
        );
      }
      activeProcess = child;
      child.once("exit", () => {
        if (activeProcess === child) {
          activeProcess = null;
          activeSession = null;
        }
      });

      const webSocketDebuggerUrl = await waitForVersion({
        endpoint,
        fetchVersion,
        startupTimeoutMs,
        pollIntervalMs,
      });

      activeSession = {
        endpoint,
        port,
        profileDir,
        webSocketDebuggerUrl,
      };
      return activeSession;
    })().finally(() => {
      startupPromise = null;
    });

    return startupPromise;
  }

  async function stop() {
    const child = activeProcess;
    activeProcess = null;
    activeSession = null;

    if (child && !child.killed && child.exitCode === null) {
      child.kill();
    }
  }

  return {
    start,
    stop,
    getSession() {
      return activeSession;
    },
  };
}
