import { existsSync, readFileSync } from "node:fs";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { dirname, join, posix, win32 } from "node:path";

import { isPidRunning } from "@nolo/llama-runtime";
import {
  createLlamaRuntimeController,
  parseLocalLlamaConfigFile,
  probeLlamaHealth,
  resolveLlamaLaunchConfig,
  resolveLlamaSupervisorPaths,
  startLlamaRuntime,
  startManagedLlamaServer,
  stopManagedLlamaServer,
  waitForHealthy,
  type DesktopLlamaRuntimeSnapshot,
  type LlamaLaunchConfig,
  type StoredLlamaLaunchState,
} from "@nolo/llama-runtime";
import { toErrorMessage } from "core/errorMessage";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

type DesktopLlamaRuntimeResponse = Omit<DesktopLlamaRuntimeSnapshot, "state"> & {
  state: DesktopLlamaRuntimeSnapshot["state"] | "starting";
  accepted?: boolean;
};

export type DesktopProviderRuntimeSnapshot = DesktopLlamaRuntimeResponse;

type DesktopLlamaRuntimeHandlerController = {
  status: () => Promise<DesktopLlamaRuntimeSnapshot>;
  stop: () => Promise<{ managedPid: number | null }>;
  start: () => Promise<{
    status: DesktopLlamaRuntimeSnapshot;
    startupTask: Promise<void> | null;
  }>;
};

type DesktopLlamaRuntimeHandlerDeps = {
  isDesktopMode?: () => boolean;
  controller?: DesktopLlamaRuntimeHandlerController;
  logger?: Pick<Console, "error">;
  repoRoot?: string;
  env?: NodeJS.ProcessEnv;
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: JSON_HEADERS,
  });

const defaultIsDesktopMode = () => process.env.NOLO_DESKTOP === "1";

const notDesktopResponse = () =>
  json({ error: "Desktop llama runtime is only available inside Nolo Desktop." }, 404);

function resolveLocalOpenAiBaseUrl(config: Pick<LlamaLaunchConfig, "host" | "port">) {
  return `http://${config.host}:${config.port}/v1`;
}

export function configureDesktopLocalProviderEnv(config: Pick<LlamaLaunchConfig, "host" | "port">) {
  process.env.NOLO_LOCAL_OPENAI_BASE_URL ||= resolveLocalOpenAiBaseUrl(config);
  process.env.NOLO_LOCAL_LLM ||= "direct";
}

export function resolveDesktopLlamaSupervisorLogDir(env: NodeJS.ProcessEnv): string | null {
  const dbPath = env.NOLO_SERVER_DB_PATH?.trim();
  if (!dbPath) return null;
  const pathApi = dbPath.includes("\\") ? win32 : posix;
  const channelDir = pathApi.dirname(pathApi.dirname(dbPath));
  return pathApi.join(channelDir, "logs", "llama-supervisor");
}

function createDesktopLlamaRuntimeController(
  repoRoot = process.cwd(),
  env: NodeJS.ProcessEnv = process.env,
): DesktopLlamaRuntimeHandlerController {
  const desktopLogDir = resolveDesktopLlamaSupervisorLogDir(env);
  const paths = resolveLlamaSupervisorPaths(desktopLogDir ? { logDir: desktopLogDir } : repoRoot);

  const ensureLogDir = async () => {
    await mkdir(paths.logDir, { recursive: true });
  };

  const readStoredState = async (): Promise<StoredLlamaLaunchState | null> => {
    try {
      const raw = await Bun.file(paths.stateFile).text();
      const parsed = JSON.parse(raw) as StoredLlamaLaunchState;
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  };

  const readLocalConfigFile = async (): Promise<Partial<LlamaLaunchConfig> | null> => {
    try {
      return parseLocalLlamaConfigFile(await Bun.file(paths.localConfigFile).text());
    } catch (error) {
      if (existsSync(paths.localConfigFile)) {
        throw new Error(
          `Failed to parse local llama config at ${paths.localConfigFile}: ${toErrorMessage(
            error,
          )}`,
        );
      }
      return null;
    }
  };

  const writeStoredState = async (config: LlamaLaunchConfig): Promise<void> => {
    await ensureLogDir();
    const payload: StoredLlamaLaunchState = {
      launchConfig: config,
      updatedAt: new Date().toISOString(),
    };
    await writeFile(paths.stateFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  };

  const readManagedPid = (): number | null => {
    try {
      const raw = readFileSync(paths.pidFile, "utf8").trim();
      const pid = Number(raw);
      return Number.isInteger(pid) && pid > 0 ? pid : null;
    } catch {
      return null;
    }
  };

  const removeManagedPidFile = async (): Promise<void> => {
    await rm(paths.pidFile, { force: true }).catch(() => undefined);
  };

  const readWatchPid = (): number | null => {
    try {
      const raw = readFileSync(paths.watchPidFile, "utf8").trim();
      const pid = Number(raw);
      return Number.isInteger(pid) && pid > 0 ? pid : null;
    } catch {
      return null;
    }
  };

  const readLogTail = async (maxLines: number): Promise<string[]> => {
    try {
      const raw = await Bun.file(paths.logFile).text();
      return raw
        .split(/\r?\n/)
        .map((line) => line.trimEnd())
        .filter((line) => line.length > 0)
        .slice(-maxLines);
    } catch {
      return [];
    }
  };

  const resolveLaunchConfigOrThrow = async (): Promise<LlamaLaunchConfig> => {
    const storedState = await readStoredState();
    const localConfig = await readLocalConfigFile();
    const config = resolveLlamaLaunchConfig({
      storedConfig: {
        ...(storedState?.launchConfig ?? {}),
        ...(localConfig ?? {}),
      },
    });

    if (!config) {
      throw new Error(
        `Missing llama launch config. Populate ${paths.localConfigFile} or configure the desktop runtime first.`,
      );
    }

    configureDesktopLocalProviderEnv(config);
    return config;
  };

  const probeHealth = (
    config: Pick<LlamaLaunchConfig, "host" | "port" | "healthPath" | "modelsPath">,
  ) => probeLlamaHealth(config);

  const resolveConfiguredLaunchConfig = async (): Promise<LlamaLaunchConfig | null> => {
    const storedState = await readStoredState();
    const localConfig = await readLocalConfigFile();
    const config = resolveLlamaLaunchConfig({
      storedConfig: {
        ...(storedState?.launchConfig ?? {}),
        ...(localConfig ?? {}),
      },
    });
    if (config) {
      configureDesktopLocalProviderEnv(config);
    }
    return config;
  };

  const stopManagedServer = () =>
    stopManagedLlamaServer({
      readManagedPid,
      isPidRunning,
      removeManagedPidFile,
    });

  const startManagedServer = (config: LlamaLaunchConfig) =>
    startManagedLlamaServer(config, {
      ensureLogDir,
      readManagedPid,
      isPidRunning,
      removeManagedPidFile,
      writePidFile: (pid) => writeFile(paths.pidFile, `${pid}\n`, "utf8"),
      logFilePath: paths.logFile,
    });

  const runtimeController = createLlamaRuntimeController({
    readStoredState,
    readLocalConfigFile,
    readManagedPid,
    readWatchPid,
    isPidRunning,
    stopPid: stopManagedServer,
    probeHealth,
    readLogTail: () => readLogTail(40),
  });

  return {
    status: async () => {
      await resolveConfiguredLaunchConfig();
      return runtimeController.status();
    },
    stop: () => runtimeController.stop(),
    start: () =>
      startLlamaRuntime({
        resolveLaunchConfigOrThrow,
        writeStoredState,
        probeHealth,
        readManagedPid,
        isPidRunning,
        stopManagedServer,
        startManagedServer,
        readStatus: () => runtimeController.status(),
        waitForHealthy: async (config) => {
          await waitForHealthy(config, {
            probeHealth,
            readManagedPid,
            isPidRunning,
            sleep: Bun.sleep,
            logFilePath: paths.logFile,
          });
        },
      }),
  };
}

function buildResponseSnapshot(
  snapshot: DesktopLlamaRuntimeSnapshot,
  activeStartTask: Promise<void> | null,
  lastStartError: string | null,
): DesktopLlamaRuntimeResponse {
  if (snapshot.state !== "running" && activeStartTask) {
    const { error: _error, ...startingSnapshot } = snapshot;
    return {
      ...startingSnapshot,
      state: "starting",
    };
  }

  if (snapshot.state !== "running" && lastStartError) {
    return {
      ...snapshot,
      state: "error",
      error: lastStartError,
    };
  }

  return snapshot;
}

export function createDesktopLlamaRuntimeHandlers(
  deps: DesktopLlamaRuntimeHandlerDeps = {},
) {
  const isDesktopMode = deps.isDesktopMode ?? defaultIsDesktopMode;
  const runtimeController =
    deps.controller ?? createDesktopLlamaRuntimeController(deps.repoRoot, deps.env);
  const logger = deps.logger ?? console;

  let activeStartTask: Promise<void> | null = null;
  let activeStartToken = 0;
  let lastStartError: string | null = null;

  const clearStartState = () => {
    activeStartToken += 1;
    activeStartTask = null;
    lastStartError = null;
  };

  const readSnapshot = async () =>
    buildResponseSnapshot(await runtimeController.status(), activeStartTask, lastStartError);

  const trackStartTask = (task: Promise<void>) => {
    const taskToken = ++activeStartToken;
    lastStartError = null;
    activeStartTask = task
      .catch((error) => {
        if (activeStartToken === taskToken) {
          lastStartError = toErrorMessage(error);
        }
        logger.error("[desktop-provider-runtime] start failed", error);
      })
      .finally(() => {
        if (activeStartToken === taskToken) {
          activeStartTask = null;
        }
      });
  };

  const handleGet = async () => {
    if (!isDesktopMode()) {
      return notDesktopResponse();
    }

    try {
      return json(await readSnapshot());
    } catch (error) {
      return json(
        {
          error: toErrorMessage(error),
        },
        500,
      );
    }
  };

  const handlePost = async (req: Request) => {
    if (!isDesktopMode()) {
      return notDesktopResponse();
    }

    const body = await req.json().catch(() => ({} as { action?: string }));

    try {
      if (body.action === "start") {
        if (activeStartTask) {
          return json({ ...(await readSnapshot()), accepted: true }, 202);
        }

        const result = await runtimeController.start();
        if (result.startupTask) {
          trackStartTask(result.startupTask);
          return json(
            {
              ...buildResponseSnapshot(result.status, activeStartTask, lastStartError),
              accepted: true,
            },
            202,
          );
        }

        return json(buildResponseSnapshot(result.status, activeStartTask, lastStartError));
      }

      if (body.action === "stop") {
        clearStartState();
        return json(await runtimeController.stop());
      }
    } catch (error) {
      return json(
        {
          error: toErrorMessage(error),
        },
        500,
      );
    }

    return json({ error: "Unsupported action" }, 400);
  };

  return {
    readSnapshot,
    handleGet,
    handlePost,
  };
}

const defaultHandlers = createDesktopLlamaRuntimeHandlers();

export const readDesktopProviderRuntimeSnapshot = defaultHandlers.readSnapshot;
export const handleDesktopLlamaRuntimeGet = defaultHandlers.handleGet;
export const handleDesktopLlamaRuntimePost = defaultHandlers.handlePost;
