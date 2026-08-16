import { spawn, spawnSync } from "node:child_process";
import { existsSync, openSync, readFileSync, readdirSync, statSync } from "node:fs";
import { appendFile, mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  getDevControlLogDir,
  getPidCommandFilePath,
  getLogFilePath,
  getPidFilePath,
  isPidRunning,
  readPidFile,
  resolveManagedPid as resolveManagedPidFromGuardHelper,
} from "@nolo/llama-runtime";
import { DEFAULT_LOCAL_API_PORT } from "../../packages/core/localOrigins";
import { checkHttpReady } from "./httpReady";
import { isPidListeningOnPort } from "./listeningPort";
import { readWorktreeRootEnvFallback } from "./worktreeEnv";

// Single-instance local dev constants (formerly resolved via worktreeSlot).
const LOCAL_DEV_DB_PATH = "data/leveldb";
const LOCAL_DEV_SLOT_LABEL = "[local-dev api:38123]";
const LOCAL_DEV_PREVIEW_SLUG = "main";

export type ProcessKey = "web" | "api";

type ProcessConfig = {
  key: ProcessKey;
  label: string;
  command: string[];
  env: Record<string, string>;
};

type DevControlRuntimeOptions = {
  repoRoot?: string;
  env?: Record<string, string | undefined>;
};

const BUN_BIN = process.execPath || "bun";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const API_SOURCE_ROOTS = [
  "packages/server",
  "packages/ai",
  "packages/app",
  "packages/create",
  "packages/database",
];

function shouldIncludeSourceFile(filePath: string) {
  if (!/\.(ts|tsx|js|jsx|json)$/.test(filePath)) return false;
  if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath)) return false;
  return true;
}

function computeApiSourceStamp(repoRoot: string): string {
  let maxMtimeMs = 0;
  const visit = (target: string) => {
    let stat;
    try {
      stat = statSync(target);
    } catch {
      return;
    }
    if (stat.isDirectory()) {
      let entries;
      try {
        entries = readdirSync(target, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "build") continue;
        visit(path.join(target, entry.name));
      }
      return;
    }
    if (stat.isFile() && shouldIncludeSourceFile(target)) {
      maxMtimeMs = Math.max(maxMtimeMs, Math.floor(stat.mtimeMs));
    }
  };

  for (const sourceRoot of API_SOURCE_ROOTS) {
    visit(path.join(repoRoot, sourceRoot));
  }
  return String(maxMtimeMs);
}

export function resolveKeys(rawTarget?: string): ProcessKey[] {
  if (!rawTarget || rawTarget === "all") return ["web", "api"];
  if (rawTarget === "backend") return ["api"];
  if (rawTarget === "web" || rawTarget === "api") {
    return [rawTarget];
  }
  throw new Error(`Unknown target: ${rawTarget}`);
}

function redactEnvValue(key: string, value: string): string {
  if (key === "NOLO_OAUTH_DEV_PLAINTEXT") {
    return value;
  }
  if (/TOKEN|KEY|SECRET|AUTH|PASSWORD/i.test(key)) {
    return value ? "<redacted>" : "";
  }
  return value;
}

export function createDevControlRuntime(options: DevControlRuntimeOptions = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const inheritedRepoEnv = readWorktreeRootEnvFallback(repoRoot);
  const runtimeEnv = {
    ...inheritedRepoEnv,
    ...process.env,
    ...options.env,
  };
  const logDir = getDevControlLogDir(repoRoot);
  const httpPort = runtimeEnv.HTTP_PORT ?? DEFAULT_LOCAL_API_PORT;
  const httpPortNumber = Number(httpPort);
  const serverDbPath = runtimeEnv.NOLO_SERVER_DB_PATH ?? LOCAL_DEV_DB_PATH;
  const slotLabel = runtimeEnv.NOLO_SLOT_LABEL ?? LOCAL_DEV_SLOT_LABEL;
  const previewSlug = runtimeEnv.PREVIEW_SLUG ?? LOCAL_DEV_PREVIEW_SLUG;
  const appQueryDebug = runtimeEnv.APP_QUERY_DEBUG ?? "1";
  const hostedExecRuntime = runtimeEnv.NOLO_WEB_HOSTED_EXEC_RUNTIME;
  const apiOrigin = `http://127.0.0.1:${httpPort}`;
  const readyTimeoutMs = Math.max(
    1000,
    Number(runtimeEnv.DEV_READY_TIMEOUT_MS ?? "10000") || 10000
  );
  const stabilityMs = Math.max(
    0,
    Number(runtimeEnv.DEV_STABILITY_MS ?? "30000") || 30000
  );

  const processConfigs: Record<ProcessKey, ProcessConfig> = {
    web: {
      key: "web",
      label: "web",
      command: [BUN_BIN, "./scripts/dev/esDev.js"],
      env: {},
    },
    api: {
      key: "api",
      label: "api",
      command: [BUN_BIN, "./packages/server/entry.ts"],
      env: {
        HTTP_PORT: httpPort,
        NOLO_SERVER_DB_PATH: serverDbPath,
        NOLO_SLOT_LABEL: slotLabel,
        NOLO_OAUTH_DEV_PLAINTEXT: "1",
        PREVIEW_SLUG: previewSlug,
        APP_QUERY_DEBUG: appQueryDebug,
        ...(hostedExecRuntime ? { NOLO_WEB_HOSTED_EXEC_RUNTIME: hostedExecRuntime } : {}),
      },
    },
  };

  function pidFile(key: ProcessKey): string {
    return getPidFilePath(key, repoRoot);
  }

  function logFile(key: ProcessKey): string {
    return getLogFilePath(key, repoRoot);
  }

  async function ensureLogDir(): Promise<void> {
    await mkdir(logDir, { recursive: true });
  }

  function describeProcessDetails(config: ProcessConfig) {
    return {
      command: config.command,
      cwd: repoRoot,
      env: Object.fromEntries(
        Object.entries(config.env).map(([key, value]) => [
          key,
          redactEnvValue(key, value),
        ])
      ),
    };
  }

  function describeProcessConfig(config: ProcessConfig): string {
    return JSON.stringify(describeProcessDetails(config));
  }

  async function appendDevLog(key: ProcessKey, message: string): Promise<void> {
    await ensureLogDir();
    await appendFile(logFile(key), `${message}\n`, "utf8").catch(() => undefined);
  }

  async function readPid(key: ProcessKey): Promise<number | null> {
    return readPidFile(key, repoRoot);
  }

  async function removePidFile(key: ProcessKey): Promise<void> {
    await rm(pidFile(key), { force: true }).catch(() => undefined);
    await rm(getPidCommandFilePath(key, repoRoot), { force: true }).catch(() => undefined);
    await rm(getPidFilePath(key, repoRoot).replace(/\.pid$/, ".commit"), { force: true }).catch(() => undefined);
    await rm(getPidFilePath(key, repoRoot).replace(/\.pid$/, ".source-stamp"), { force: true }).catch(() => undefined);
  }

  async function resolveManagedPid(key: ProcessKey): Promise<number | null> {
    const discoveredPid = resolveManagedPidFromGuardHelper(processConfigs[key], {
      repoRoot,
    });
    if (discoveredPid && isPidRunning(discoveredPid)) {
      await ensureLogDir();
      await writeFile(pidFile(key), `${discoveredPid}\n`, "utf8");
      await writeFile(
        getPidCommandFilePath(key, repoRoot),
        `${processConfigs[key].command.slice(1).join(" ")}\n`,
        "utf8"
      );
      return discoveredPid;
    }
    const pidFromFile = await readPid(key);
    if (pidFromFile && !isPidRunning(pidFromFile)) {
      await removePidFile(key);
    }
    return null;
  }

  function tailLines(filePath: string, lines: number): string {
    if (!existsSync(filePath)) return "";
    const content = readFileSync(filePath, "utf8");
    const allLines = content.split(/\r?\n/);
    return allLines.slice(Math.max(0, allLines.length - lines)).join("\n");
  }

  async function startProcess(key: ProcessKey): Promise<void> {
    const config = processConfigs[key];
    await ensureLogDir();

    const existingPid = await resolveManagedPid(key);
    if (existingPid) {
      if (
        key === "api" &&
        !(await checkHttpReady(apiOrigin)) &&
        !(
          Number.isFinite(httpPortNumber) &&
          (await isPidListeningOnPort(existingPid, httpPortNumber))
        )
      ) {
        console.log(`[dev:${config.label}] unhealthy pid ${existingPid}, restarting`);
        await stopProcess(key);
      } else {
        console.log(`[dev:${config.label}] already running on pid ${existingPid}`);
        return;
      }
    }
    await removePidFile(key);

    const outputFd = openSync(logFile(key), "a");
    await appendDevLog(
      key,
      `[dev:${config.label}] launch ${new Date().toISOString()} ${describeProcessConfig(config)}`
    );
    const proc = spawn(config.command[0], config.command.slice(1), {
      cwd: repoRoot,
      env: {
        ...runtimeEnv,
        ...config.env,
      },
      detached: true,
      stdio: ["ignore", outputFd, outputFd],
    });

    if (!proc.pid) {
      throw new Error(`Failed to start ${config.label}`);
    }

    let exitInfo: { code: number | null; signal: NodeJS.Signals | null } | null = null;
    proc.once("exit", (code, signal) => {
      exitInfo = { code, signal };
      void appendDevLog(
        key,
        `[dev:${config.label}] exited pid=${proc.pid ?? "unknown"} code=${code ?? "null"} signal=${signal ?? "null"}`
      );
    });
    proc.unref();
    await writeFile(pidFile(key), `${proc.pid}\n`, "utf8");
    await writeFile(
      getPidCommandFilePath(key, repoRoot),
      `${config.command.slice(1).join(" ")}\n`,
      "utf8"
    );
    try {
      const commitProc = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
      const commit = commitProc.stdout.trim();
      if (commit) {
        await writeFile(getPidFilePath(key, repoRoot).replace(/\.pid$/, ".commit"), `${commit}\n`, "utf8");
      }
    } catch {}
    if (key === "api") {
      await writeFile(
        getPidFilePath(key, repoRoot).replace(/\.pid$/, ".source-stamp"),
        `${computeApiSourceStamp(repoRoot)}\n`,
        "utf8",
      ).catch(() => undefined);
    }
    await sleep(800);
    if (!isPidRunning(proc.pid)) {
      await removePidFile(key);
      const logTail = tailLines(logFile(key), 60);
      console.log(`[dev:${config.label}] exited immediately, inspect ${logFile(key)}`);
      throw new Error(
        [
          `[dev:${config.label}] exited immediately`,
          `pid=${proc.pid}`,
          `exit=${JSON.stringify(exitInfo)}`,
          `launch=${describeProcessConfig(config)}`,
          logTail ? `--- recent log tail ---\n${logTail}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      );
    }
    console.log(`[dev:${config.label}] started pid=${proc.pid} log=${logFile(key)}`);
  }

  async function stopProcess(key: ProcessKey): Promise<void> {
    const config = processConfigs[key];
    const pid = await resolveManagedPid(key);
    if (!pid) {
      console.log(`[dev:${config.label}] not running`);
      await removePidFile(key);
      return;
    }

    if (!isPidRunning(pid)) {
      console.log(`[dev:${config.label}] stale pid ${pid}, cleaning up`);
      await removePidFile(key);
      return;
    }

    process.kill(pid, "SIGTERM");
    for (let i = 0; i < 50; i += 1) {
      if (!isPidRunning(pid)) {
        await removePidFile(key);
        console.log(`[dev:${config.label}] stopped pid=${pid}`);
        return;
      }
      await sleep(100);
    }

    process.kill(pid, "SIGKILL");
    for (let i = 0; i < 20; i += 1) {
      if (!isPidRunning(pid)) {
        await removePidFile(key);
        console.log(`[dev:${config.label}] killed pid=${pid}`);
        return;
      }
      await sleep(100);
    }

    throw new Error(`Failed to stop ${config.label} pid=${pid}`);
  }

  async function waitForReady(
    key: ProcessKey,
    timeoutMs = readyTimeoutMs
  ): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const pid = await resolveManagedPid(key);
      const running = !!pid && isPidRunning(pid);
      if (!running) {
        await sleep(250);
        continue;
      }

      if (key === "api") {
        if (
          (await checkHttpReady(apiOrigin)) ||
          (pid && Number.isFinite(httpPortNumber) && (await isPidListeningOnPort(pid, httpPortNumber)))
        ) return;
        await sleep(250);
        continue;
      }

      return;
    }

    const origin = key === "api" ? apiOrigin : undefined;
    const logTail = tailLines(logFile(key), 40);
    throw new Error(
      [
        `Timed out waiting for ${key} to become ready (${timeoutMs}ms).`,
        origin ? `origin: ${origin}` : "",
        `log: ${logFile(key)}`,
        logTail ? `--- recent log tail ---\n${logTail}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  async function verifyStable(
    key: ProcessKey,
    windowMs = stabilityMs
  ): Promise<void> {
    if (windowMs <= 0 || key === "web") return;
    const pid = await resolveManagedPid(key);
    if (!pid || !isPidRunning(pid)) {
      throw new Error(`[dev:${key}] cannot verify stability because process is not running`);
    }

    const deadline = Date.now() + windowMs;
    while (Date.now() < deadline) {
      if (!isPidRunning(pid)) {
        await removePidFile(key);
        const config = processConfigs[key];
        const logTail = tailLines(logFile(key), 80);
        throw new Error(
          [
            `[dev:${key}] exited during stability window (${windowMs}ms)`,
            `pid=${pid}`,
            `launch=${describeProcessConfig(config)}`,
            `log=${logFile(key)}`,
            logTail ? `--- recent log tail ---\n${logTail}` : "",
          ]
            .filter(Boolean)
            .join("\n")
        );
      }
      if (
        key === "api" &&
        !(await checkHttpReady(apiOrigin)) &&
        !(Number.isFinite(httpPortNumber) && (await isPidListeningOnPort(pid, httpPortNumber)))
      ) {
        await sleep(500);
        continue;
      }
      await sleep(500);
    }
    console.log(`[dev:${key}] stable pid=${pid} windowMs=${windowMs}`);
  }

  async function startTargets(keys: ProcessKey[]): Promise<void> {
    const ordered = [...new Set(keys)];
    for (const key of ordered) {
      await startProcess(key);
    }
    for (const key of ordered) {
      await waitForReady(key);
    }
    for (const key of ordered) {
      await verifyStable(key);
    }
  }

  async function stopTargets(keys: ProcessKey[]): Promise<void> {
    const ordered = [...new Set(keys)].reverse();
    for (const key of ordered) {
      await stopProcess(key);
    }
  }

  async function collectStatus() {
    await ensureLogDir();
    type ProcessStatusItem = {
      key: ProcessKey;
      pid: number | null;
      running: boolean;
      log: string;
      origin?: string;
      ready?: boolean;
      startedCommit?: string;
      currentCommit?: string;
      startedSourceStamp?: string;
      currentSourceStamp?: string;
      isOldCode?: boolean;
    };
    const items: ProcessStatusItem[] = [];

    for (const key of ["web", "api"] as ProcessKey[]) {
      const pid = await resolveManagedPid(key);
      const running = !!pid && isPidRunning(pid);
      const item: ProcessStatusItem = {
        key,
        pid,
        running,
        log: logFile(key),
      };
      if (key === "api") {
        item.origin = apiOrigin;
        item.ready =
          running && pid
            ? (await checkHttpReady(apiOrigin)) ||
              (Number.isFinite(httpPortNumber) && (await isPidListeningOnPort(pid, httpPortNumber)))
            : false;

        try {
          const currentCommitProc = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
          const currentCommit = currentCommitProc.stdout.trim();
          const commitFile = getPidFilePath(key, repoRoot).replace(/\.pid$/, ".commit");
          const startedCommit = existsSync(commitFile) ? readFileSync(commitFile, "utf8").trim() : undefined;
          const sourceStampFile = getPidFilePath(key, repoRoot).replace(/\.pid$/, ".source-stamp");
          const startedSourceStamp = existsSync(sourceStampFile)
            ? readFileSync(sourceStampFile, "utf8").trim()
            : undefined;
          const currentSourceStamp = computeApiSourceStamp(repoRoot);
          item.currentCommit = currentCommit;
          item.startedCommit = startedCommit;
          item.currentSourceStamp = currentSourceStamp;
          item.startedSourceStamp = startedSourceStamp;
          item.isOldCode = Boolean(
            (startedCommit && currentCommit && startedCommit !== currentCommit) ||
              (running && currentSourceStamp && !startedSourceStamp) ||
              (startedSourceStamp && currentSourceStamp && startedSourceStamp !== currentSourceStamp)
          );
        } catch {}
      }
      items.push(item);
    }

    return items;
  }

  async function printStatus(): Promise<void> {
    await ensureLogDir();
    for (const key of ["web", "api"] as ProcessKey[]) {
      const pid = await resolveManagedPid(key);
      const running = !!pid && isPidRunning(pid);
      const extra: string[] = [];
      if (key === "api") {
        extra.push(`origin=${apiOrigin}`);
        extra.push(
          `ready=${
            running && pid
              ? String(
                  (await checkHttpReady(apiOrigin)) ||
                    (Number.isFinite(httpPortNumber) &&
                      (await isPidListeningOnPort(pid, httpPortNumber)))
                )
              : "false"
          }`
        );
      }
      console.log(
        [
          `[dev:${key}]`,
          running ? `running pid=${pid}` : "stopped",
          ...extra,
          `log=${logFile(key)}`,
        ].join(" ")
      );
    }
    const webPid = await resolveManagedPid("web");
    const apiPid = await resolveManagedPid("api");
    const webUp = !!webPid && isPidRunning(webPid);
    const apiUp = !!apiPid && isPidRunning(apiPid);
    if (apiUp && !webUp) {
      console.warn(
        "[dev] api is running but web (esbuild watch) is not — UI edits will NOT rebuild until: bun ./scripts/dev/devControl.ts start web",
      );
    }
    if (webUp && apiUp) {
      console.log(
        `[dev] SSR+UI loop OK on ${apiOrigin} (web rebuild → public/latest-assets.json). Restart api: dev:ctl restart api`,
      );
    }
  }

  async function printLogs(target?: string, linesArg?: string): Promise<void> {
    const keys = resolveKeys(target ?? "all");
    const lineCount = Math.max(20, Number(linesArg || "120") || 120);
    for (const key of keys) {
      console.log(`--- logs:${key} (${logFile(key)}) ---`);
      const output = tailLines(logFile(key), lineCount);
      console.log(output || "[empty]");
    }
  }

  async function waitForTarget(
    waitTarget: ProcessKey,
    timeoutMs = readyTimeoutMs
  ): Promise<void> {
    const startedAt = Date.now();
    while (Date.now() - startedAt < timeoutMs) {
      const pid = await resolveManagedPid(waitTarget);
      const running = !!pid && isPidRunning(pid);
      if (!running) {
        await sleep(250);
        continue;
      }
      if (waitTarget !== "api") {
        console.log(`[dev:${waitTarget}] ready pid=${pid}`);
        return;
      }
      const ready = await checkHttpReady(apiOrigin);
      const listening =
        Number.isFinite(httpPortNumber) && (await isPidListeningOnPort(pid, httpPortNumber));
      if (ready || listening) {
        console.log(`[dev:${waitTarget}] ready pid=${pid} origin=${apiOrigin}`);
        return;
      }
      await sleep(250);
    }
    throw new Error(`Timed out waiting for ${waitTarget} (${timeoutMs}ms)`);
  }

  return {
    describe() {
      return {
        repoRoot,
        logDir,
        apiOrigin,
        serverDbPath,
      };
    },
    describeProcess(key: ProcessKey) {
      return describeProcessDetails(processConfigs[key]);
    },
    startTargets,
    stopTargets,
    collectStatus,
    printStatus,
    printLogs,
    waitForTarget,
  };
}
