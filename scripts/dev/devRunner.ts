import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable } from "node:stream";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { collectRunningManagedProcesses } from "@nolo/llama-runtime";
import { DEFAULT_LOCAL_API_PORT } from "../../packages/core/localOrigins";
import { publishDevWebBuildSignal } from "./devAssetManifest.js";

type ProcessKey = "web" | "api";
type ManagedChildProcess = ChildProcessByStdio<null, Readable, Readable>;

type ProcessConfig = {
  key: ProcessKey;
  label: string;
  colorCode: string;
  command: string[];
  env: Record<string, string>;
};

const HTTP_PORT = process.env.HTTP_PORT ?? DEFAULT_LOCAL_API_PORT;
const BUN_BIN = process.execPath || "bun";
const REPO_ROOT = process.cwd();

const PROCESS_CONFIGS: Record<ProcessKey, ProcessConfig> = {
  web: {
    key: "web",
    label: "web",
    colorCode: "35",
    command: [BUN_BIN, "./scripts/dev/esDev.js"],
    env: {},
  },
  api: {
    key: "api",
    label: "api",
    colorCode: "36",
    command: [BUN_BIN, "./packages/server/entry.ts"],
    env: {
      HTTP_PORT,
      // Match `dev:api` (package.json) and devControlRuntime: enable the
      // dev-only plaintext OAuth credential store so `bun dev` can sync/read
      // OAuth credentials (e.g. antigravity) without manual env wiring.
      NOLO_OAUTH_DEV_PLAINTEXT: "1",
    },
  },
};

const managedProcesses = new Map<ProcessKey, ManagedChildProcess>();
const quietExitPids = new Set<number>();
let isShuttingDown = false;
let commandQueue: Promise<void> = Promise.resolve();

function printHelp(): void {
  console.log(
    [
        "",
        `Local: http://127.0.0.1:${HTTP_PORT} — SSR (api) + UI bundle (web esbuild watch).`,
        "",
        "bun dev commands:",
        "  rr   restart api",
        "  rw   restart web",
        "  ra   restart api only",
        "  ?    show this help",
        "  Ctrl+C stop all processes",
        "",
    ].join("\n")
  );
}

function formatPrefix(config: ProcessConfig): string {
  return `\x1b[${config.colorCode}m[${config.label}]\x1b[0m`;
}

function pipeOutput(
  stream: NodeJS.ReadableStream,
  config: ProcessConfig,
  writer: (line?: string) => void
): void {
  const lines = createInterface({ input: stream });
  lines.on("line", (line) => writer(`${formatPrefix(config)} ${line}`));
}

function startProcess(key: ProcessKey): ManagedChildProcess {
  const config = PROCESS_CONFIGS[key];
  const proc = spawn(config.command[0], config.command.slice(1), {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ...config.env,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  managedProcesses.set(key, proc);
  pipeOutput(proc.stdout, config, console.log);
  pipeOutput(proc.stderr, config, console.error);

  proc.once("error", (error) => {
    console.error(`${formatPrefix(config)} failed to start:`, error);
  });

  proc.once("exit", (code, signal) => {
    const shouldStayQuiet = proc.pid ? quietExitPids.delete(proc.pid) : false;
    if (managedProcesses.get(key)?.pid === proc.pid) {
      managedProcesses.delete(key);
    }
    if (isShuttingDown || shouldStayQuiet) return;
    console.log(
      `${formatPrefix(config)} exited (${signal ?? code ?? "unknown"}). Type rr to restart backend.`
    );
  });

  return proc;
}

async function stopProcess(key: ProcessKey): Promise<void> {
  const proc = managedProcesses.get(key);
  if (!proc || proc.exitCode !== null) return;

  if (proc.pid) {
    quietExitPids.add(proc.pid);
  }
  proc.kill("SIGTERM");

  const forceKillTimer = setTimeout(() => {
    if (proc.exitCode === null) {
      proc.kill("SIGKILL");
    }
  }, 5_000);

  try {
    await once(proc, "exit");
  } finally {
    clearTimeout(forceKillTimer);
    if (managedProcesses.get(key)?.pid === proc.pid) {
      managedProcesses.delete(key);
    }
  }
}

async function restartProcesses(keys: ProcessKey[]): Promise<void> {
  const uniqueKeys = [...new Set(keys)];
  const stopOrder: ProcessKey[] = uniqueKeys.includes("api")
    ? [...uniqueKeys.filter((key) => key !== "api"), "api"]
    : uniqueKeys;
  const startOrder = stopOrder;

  console.log(`[dev] Restarting ${uniqueKeys.join(", ")}...`);

  for (const key of stopOrder.reverse()) {
    await stopProcess(key);
  }

  for (const key of startOrder) {
    startProcess(key);
  }

  if (uniqueKeys.includes("api")) {
    await publishDevWebBuildSignal({ buildMs: 0 }).catch(() => undefined);
  }
}

async function shutdownAll(): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log("[dev] Shutting down...");

  await stopProcess("api");
  await stopProcess("web");
}

function queueCommand(task: () => Promise<void>): void {
  commandQueue = commandQueue
    .then(task)
    .catch((error) => {
      console.error("[dev] Command failed:", error);
    });
}

async function main(): Promise<void> {
  if (process.argv.includes("--help")) {
    printHelp();
    return;
  }

  const runningDevCtlProcesses = collectRunningManagedProcesses(PROCESS_CONFIGS, {
    repoRoot: REPO_ROOT,
  });
  if (runningDevCtlProcesses.length > 0) {
    console.error(
      [
        "[dev] Refusing to start because dev:ctl is already managing:",
        ...runningDevCtlProcesses.map(
          ({ key, pid }) => `  - ${key} pid=${pid}`
        ),
        "",
        "Stop them first with:",
        "  bun run dev:ctl stop web api",
      ].join("\n")
    );
    process.exitCode = 1;
    return;
  }

  printHelp();

  startProcess("web");
  startProcess("api");

  console.log(`[dev] Preview http://127.0.0.1:${HTTP_PORT} — keep [web] for UI rebuilds.`);

  const input = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  input.on("line", (line) => {
    const command = line.trim();
    if (!command) return;

    if (command === "rr") {
      queueCommand(() => restartProcesses(["api"]));
      return;
    }

    if (command === "rw") {
      queueCommand(() => restartProcesses(["web"]));
      return;
    }

    if (command === "ra") {
      queueCommand(() => restartProcesses(["api"]));
      return;
    }

    if (command === "?" || command === "help") {
      printHelp();
      return;
    }

    console.log(`[dev] Unknown command: ${command}`);
    printHelp();
  });

  process.on("SIGINT", async () => {
    input.close();
    await shutdownAll();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    input.close();
    await shutdownAll();
    process.exit(0);
  });
}

if (import.meta.main) {
  await main();
}
