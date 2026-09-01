import { normalizeServerOrigin } from "core/serverOrigin";
import { DEFAULT_NOLO_SERVER_URL } from "../defaultServer";
import { NOLO_CLUSTER_SERVERS } from "../../database/config";
import { resolvePlatformAuthToken } from "../../agent-runtime/providerResolution";
import {
  createHybridRecordStore,
  parseSyncServersEnv,
  shouldCacheHybridRemoteRecord,
  DEFAULT_HYBRID_READ_TIMEOUT_MS,
  type HybridRecordKvDb,
  type HybridRecordStore,
} from "../agentRuntimeLocal";
import type { CliFetchImpl } from "../cliFetch";

type EnvLike = Record<string, string | undefined>;

export type CliKvDb = HybridRecordKvDb;
export type { HybridRecordStore };

type CliHybridRecordStoreDeps = {
  db: CliKvDb;
  env: EnvLike;
  fetchImpl?: CliFetchImpl;
};

function resolveFallbackServers(env: EnvLike) {
  const values = [
    env.NOLO_SERVER_URL,
    env.BASE_URL,
    ...parseSyncServersEnv(env),
    ...NOLO_CLUSTER_SERVERS,
  ].filter((value): value is string => typeof value === "string" && value.trim().length > 0);
  return [...new Set(values.map(normalizeServerOrigin))];
}

function resolveAuthToken(env: EnvLike) {
  // Single source of truth: delegate to resolvePlatformAuthToken so the
  // machine key (NOLO_MACHINE_API_KEY) counts as a valid bearer here too.
  return resolvePlatformAuthToken(env);
}

export function shouldCacheRemoteRecord(remoteRecord: any, localRecord: any) {
  return shouldCacheHybridRemoteRecord(remoteRecord, localRecord);
}

/**
 * PERF(H2): read 路径远端 fallback 超时的 env 覆盖（毫秒）。
 * 默认 DEFAULT_HYBRID_READ_TIMEOUT_MS（250ms，整体预算跨 server 共享）；
 * 0=关闭超时；负数/非法值回退默认（不会关闭超时）。
 */
export function resolveHybridReadTimeoutMs(
  env: EnvLike = process.env
): number {
  const raw = env.NOLO_HYBRID_READ_TIMEOUT_MS?.trim();
  if (!raw) return DEFAULT_HYBRID_READ_TIMEOUT_MS;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return DEFAULT_HYBRID_READ_TIMEOUT_MS;
  }
  return parsed;
}

export function createCliHybridRecordStore(
  deps: CliHybridRecordStoreDeps
): HybridRecordStore {
  return createHybridRecordStore({
    db: deps.db,
    defaultServer: normalizeServerOrigin(
      deps.env.NOLO_SERVER || deps.env.BASE_URL || DEFAULT_NOLO_SERVER_URL
    ),
    fallbackServers: resolveFallbackServers(deps.env),
    authToken: resolveAuthToken(deps.env),
    fetchImpl: deps.fetchImpl,
    requestTimeoutMs: resolveHybridReadTimeoutMs(deps.env),
  });
}
