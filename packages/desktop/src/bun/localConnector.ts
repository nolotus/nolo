import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { toErrorMessage } from "core/errorMessage";
import { isLocalServerUrl } from "core/localOrigins";
import { normalizeServerOrigin } from "core/serverOrigin";
import { resolvePlatformAuthToken } from "../../../agent-runtime/providerResolution";

type EnvLike = Record<string, string | undefined>;
type OutputLike = { write(chunk: string): unknown };

type ProfileConfig = {
  currentProfile?: string;
  profiles?: Record<string, {
    serverUrl?: string;
    authToken?: string;
  }>;
};

type StartDesktopConnectorDeps = {
  channel?: string;
  configPath?: string;
  defaultServerUrl?: string;
  desktopAuthEnv?: EnvLike;
  output?: OutputLike;
  runConnect?: (
    args: string[],
    deps: { env: EnvLike; output: OutputLike; signal?: AbortSignal }
  ) => Promise<number>;
};

type StartDesktopConnectorResult =
  | {
      started: false;
      reason: "missing-profile";
      stop: (reason?: string) => void;
    }
  | {
      started: true;
      stop: (reason?: string) => void;
    };

export function resolveDesktopConnectorServerUrl(options: {
  channel?: string;
  env?: EnvLike;
  profileServerUrl?: string;
  defaultServerUrl?: string;
} = {}) {
  const env = options.env ?? process.env;
  const envServer = normalizeServerOrigin(
    env.NOLO_DESKTOP_CONNECTOR_SERVER || env.NOLO_SERVER,
  );
  if (envServer) return envServer;

  const profileServer = normalizeServerOrigin(options.profileServerUrl);
  if (profileServer && !isLocalServerUrl(profileServer)) {
    return profileServer;
  }

  const defaultServer = normalizeServerOrigin(options.defaultServerUrl);
  if (defaultServer) return defaultServer;

  const channel = (options.channel || "").toLowerCase();
  return channel === "canary" || channel === "alpha"
    ? "https://us.nolo.chat"
    : "https://nolo.chat";
}

export function resolveDesktopProfileEnv(
  configPath = join(homedir(), ".nolo", "config.json"),
  options: {
    channel?: string;
    defaultServerUrl?: string;
    env?: EnvLike;
  } = {}
): EnvLike | null {
  if (!existsSync(configPath)) return null;

  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as ProfileConfig;
  const currentProfile = parsed.currentProfile;
  const profile = currentProfile ? parsed.profiles?.[currentProfile] : null;
  if (!profile?.authToken) return null;

  return {
    NOLO_PROFILE: currentProfile,
    NOLO_SERVER: resolveDesktopConnectorServerUrl({
      channel: options.channel,
      defaultServerUrl: options.defaultServerUrl,
      env: options.env,
      profileServerUrl: profile.serverUrl,
    }),
    AUTH_TOKEN: profile.authToken,
  };
}

function resolveDesktopOwnedAuthEnv(
  env: EnvLike | undefined,
  options: {
    channel?: string;
    defaultServerUrl?: string;
  } = {}
): EnvLike | null {
  const authToken = resolvePlatformAuthToken(env ?? {}).trim();
  if (!authToken) return null;

  return {
    NOLO_SERVER: resolveDesktopConnectorServerUrl({
      channel: options.channel,
      defaultServerUrl: options.defaultServerUrl,
      env,
    }),
    AUTH_TOKEN: authToken,
  };
}

export async function startDesktopLocalConnector(
  deps: StartDesktopConnectorDeps = {}
): Promise<StartDesktopConnectorResult> {
  const output = deps.output ?? {
    write(chunk: string) {
      console.log(chunk.trimEnd());
    },
  };
  const abortController = new AbortController();
  let stopLogged = false;
  const stop = (reason = "desktop-shutdown") => {
    if (abortController.signal.aborted) return;
    abortController.abort(reason);
    if (!stopLogged) {
      stopLogged = true;
      output.write(`[desktop connector] stop requested: ${reason}\n`);
    }
  };
  const env =
    resolveDesktopOwnedAuthEnv(deps.desktopAuthEnv, {
      channel: deps.channel,
      defaultServerUrl: deps.defaultServerUrl,
    }) ??
    resolveDesktopProfileEnv(deps.configPath, {
      channel: deps.channel,
      defaultServerUrl: deps.defaultServerUrl,
    });
  if (!env) {
    output.write("[desktop connector] no desktop session or CLI profile found; connector autostart skipped\n");
    return { started: false, reason: "missing-profile" as const, stop };
  }

  const runConnect = deps.runConnect ?? (await import("../../../cli/machineCommands")).runMachineConnectCommand;
  void runConnect(["--ws"], {
    env: {
      ...process.env,
      ...env,
    },
    signal: abortController.signal,
    output: {
      write(chunk: string) {
        output.write(`[desktop connector] ${chunk}`);
      },
    },
  }).then((exitCode) => {
    if (exitCode !== 0) {
      output.write(`[desktop connector] exited with code ${exitCode}\n`);
    }
  }).catch((error) => {
    output.write(`[desktop connector] failed: ${toErrorMessage(error)}\n`);
  });

  output.write("[desktop connector] autostarted\n");
  return { started: true as const, stop };
}
