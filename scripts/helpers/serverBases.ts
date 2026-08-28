import { NOLO_CLUSTER_SERVERS } from "../../packages/database/config";
import { DEFAULT_LOCAL_API_ORIGIN } from "../../packages/core/localOrigins";
import { normalizeServerOrigin } from "core/serverOrigin";
import {
  getCurrentProfile,
  getDefaultProfileConfigPath,
  loadProfileConfig,
} from "../../packages/cli/client/profileConfig";

export type ScriptSyncTarget = "local" | "main" | "us";

function resolveWorktreeLocalOrigin() {
  if (process.env.SCRIPT_LOCAL_BASE_URL) {
    return normalizeBaseUrl(process.env.SCRIPT_LOCAL_BASE_URL);
  }
  return DEFAULT_LOCAL_API_ORIGIN;
}

export const LOCAL_SERVER_ORIGIN = resolveWorktreeLocalOrigin();

function parseExtraBasesFromEnv() {
  return (process.env.SCRIPT_SYNC_SERVERS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function normalizeBaseUrl(base: string) {
  return normalizeServerOrigin(base);
}

function serverForTarget(target: string): string {
  const normalized = target.trim().toLowerCase();
  if (normalized === "local") return LOCAL_SERVER_ORIGIN;
  if (normalized === "main") return NOLO_CLUSTER_SERVERS[0];
  if (normalized === "us") return NOLO_CLUSTER_SERVERS[1];
  return target;
}

export function parseScriptSyncTargets(raw: string | undefined): string[] | undefined {
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value) => value !== "none")
    .map(serverForTarget)
    .map(normalizeBaseUrl);
}

export function resolveScriptSyncTargets(args: {
  explicitSync?: string;
  envSyncTargets?: string;
  localOnly?: boolean;
}): string[] | undefined {
  if (args.localOnly) return parseScriptSyncTargets("local") ?? [];
  return parseScriptSyncTargets(args.explicitSync ?? args.envSyncTargets);
}

export function buildScriptServerCandidates(
  preferredBase?: string,
  options?: { syncTargets?: string[] }
): string[] {
  const raw =
    options && options.syncTargets !== undefined
      ? options.syncTargets
      : [
          preferredBase,
          process.env.BASE_URL,
          process.env.READ_DIALOG_BASE,
          LOCAL_SERVER_ORIGIN,
          ...NOLO_CLUSTER_SERVERS,
          ...parseExtraBasesFromEnv(),
        ];

  const normalized = Array.from(
    new Set(
      raw
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
        .map(normalizeBaseUrl)
    )
  );

  const normalizedPreferredBase =
    typeof preferredBase === "string" && preferredBase.trim().length > 0
      ? normalizeBaseUrl(preferredBase)
      : "";

  if (normalizedPreferredBase && !isLocalBaseUrl(normalizedPreferredBase)) {
    const remoteCandidates = normalized.filter((baseUrl) => !isLocalBaseUrl(baseUrl));
    const localCandidates = normalized.filter((baseUrl) => isLocalBaseUrl(baseUrl));
    return [...remoteCandidates, ...localCandidates];
  }

  return normalized;
}

/** Default delete fan-out targets: preferred base + cluster peers + local dev origin. */
export function resolveDeleteServerCandidates(preferredBase?: string): string[] {
  return buildScriptServerCandidates(preferredBase);
}

export function isLocalBaseUrl(baseUrl: string) {
  try {
    const hostname = new URL(baseUrl).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export type ResolveDefaultScriptBaseUrlOptions = {
  /** Override the env read (used by tests). Defaults to `process.env`. */
  env?: NodeJS.ProcessEnv;
  /** Override the profile config path (used by tests). Defaults to `~/.nolo/config.json`. */
  profileConfigPath?: string;
};

/**
 * Resolve the base URL a user-data script should target when no `BASE_URL` is set.
 *
 * Chain (highest priority first):
 *   1. `BASE_URL` env
 *   2. `NOLO_SERVER` env
 *   3. current CLI profile's `serverUrl` (from `loadProfileConfig`)
 *   4. `LOCAL_SERVER_ORIGIN` (worktree dev slot)
 *
 * All paths are normalized to drop trailing slashes.
 */
export function resolveDefaultScriptBaseUrl(
  options: ResolveDefaultScriptBaseUrlOptions = {}
): string {
  const env = options.env ?? process.env;
  const explicit =
    env.BASE_URL?.trim() || env.NOLO_SERVER?.trim() || env.NOLO_SERVER_URL?.trim();
  if (explicit) return normalizeBaseUrl(explicit);

  try {
    const profile = getCurrentProfile(
      loadProfileConfig(
        options.profileConfigPath ?? getDefaultProfileConfigPath()
      )
    );
    const serverUrl = profile?.serverUrl?.trim();
    if (serverUrl) return normalizeBaseUrl(serverUrl);
  } catch {
    // Profile file missing or malformed: fall through to local origin.
  }

  return normalizeBaseUrl(LOCAL_SERVER_ORIGIN);
}

type DevApiStatusResolver = () => Promise<string | undefined>;

function buildStaleLocalApiError(api: {
  currentCommit?: string;
  currentSourceStamp?: string;
  startedCommit?: string;
  startedSourceStamp?: string;
}) {
  const commitText =
    api.startedCommit && api.currentCommit
      ? ` commit ${api.startedCommit.slice(0, 7)} -> ${api.currentCommit.slice(0, 7)}`
      : "";
  const sourceText =
    api.startedSourceStamp && api.currentSourceStamp
      ? ` source ${api.startedSourceStamp} -> ${api.currentSourceStamp}`
      : "";
  return new Error(
    `[Verifier] Local dev API process is running old code.${commitText}${sourceText} Run \`bun ./scripts/dev/devControl.ts restart api\` before running this smoke.`,
  );
}

function isStaleLocalApiError(error: unknown) {
  return error instanceof Error && error.message.includes("[Verifier] Local dev API process is running old code");
}

function parseJsonObjectFromOutput(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    if (start < 0) return undefined;
    try {
      return JSON.parse(trimmed.slice(start));
    } catch {
      return undefined;
    }
  }
}

async function resolveDevCtlReadyApiOrigin(): Promise<string | undefined> {
  const proc = Bun.spawn(["bun", "./scripts/dev/devControl.ts", "status", "--json"], {
    cwd: process.cwd(),
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, status] = await Promise.all([
    new Response(proc.stdout).text(),
    proc.exited,
  ]);
  if (status !== 0) return undefined;
  const payload = parseJsonObjectFromOutput(stdout) as
    | {
        processes?: Array<{
          currentCommit?: string;
          currentSourceStamp?: string;
          isOldCode?: boolean;
          key?: string;
          origin?: string;
          ready?: boolean;
          startedCommit?: string;
          startedSourceStamp?: string;
        }>;
      }
    | undefined;
  const api = payload?.processes?.find((item) => item.key === "api");

  if (api?.isOldCode) {
    throw buildStaleLocalApiError(api);
  }

  return api?.ready && api.origin ? api.origin : undefined;
}

async function resolveReadyDevApiOrigin(): Promise<string | undefined> {
  const devCtlOrigin = await resolveDevCtlReadyApiOrigin();
  if (devCtlOrigin) return devCtlOrigin;

  const { createDevControlRuntime } = await import("../dev/devControlRuntime");
  const runtime = createDevControlRuntime();
  const status = await runtime.collectStatus();
  const apiStatus = status.find((item) => item.key === "api");

  if (apiStatus?.isOldCode) {
    throw buildStaleLocalApiError(apiStatus);
  }

  if (apiStatus?.ready) {
    return runtime.describe().apiOrigin;
  }
  return undefined;
}

export async function resolveTargetServerBase(
  explicitServer?: string,
  fallback?: string,
  options?: {
    env?: Record<string, string | undefined>;
    resolveReadyDevApiOrigin?: DevApiStatusResolver;
  }
): Promise<string> {
  if (explicitServer) {
    return normalizeBaseUrl(explicitServer);
  }

  const env = options?.env ?? process.env;
  const envServer = env.NOLO_SERVER ?? env.BASE_URL;
  if (envServer) {
    return normalizeBaseUrl(envServer);
  }

  try {
    const devOrigin = await (options?.resolveReadyDevApiOrigin ?? resolveReadyDevApiOrigin)();
    if (devOrigin) return normalizeBaseUrl(devOrigin);
  } catch (error) {
    if (isStaleLocalApiError(error)) {
      throw error;
    }
    // Dev controller is best-effort; explicit/env/fallback remain authoritative.
  }

  if (fallback) {
    return normalizeBaseUrl(fallback);
  }

  return LOCAL_SERVER_ORIGIN;
}

export async function resolveLocalDialogReadBase(options?: {
  targetServer?: string;
  env?: Record<string, string | undefined>;
  resolveReadyDevApiOrigin?: DevApiStatusResolver;
}): Promise<string> {
  const targetServer = options?.targetServer?.trim();
  if (targetServer && isLocalBaseUrl(targetServer)) {
    return normalizeBaseUrl(targetServer);
  }

  const env = options?.env ?? process.env;
  const readDialogBase = env.READ_DIALOG_BASE?.trim();
  if (readDialogBase && isLocalBaseUrl(readDialogBase)) {
    return normalizeBaseUrl(readDialogBase);
  }

  try {
    const devOrigin = await (options?.resolveReadyDevApiOrigin ?? resolveReadyDevApiOrigin)();
    if (devOrigin) return normalizeBaseUrl(devOrigin);
  } catch (error) {
    if (isStaleLocalApiError(error)) {
      throw error;
    }
  }

  return LOCAL_SERVER_ORIGIN;
}
