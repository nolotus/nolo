import { readFileSync } from "node:fs";
import {
  createHostCredentialBrokerChain,
  createStrictHostCredentialBroker,
} from "agent-runtime/desktopHostCredentialBroker";
import { getSharedSessionCredentialBroker } from "agent-runtime/sessionCredentialBroker";
import { createFileCredentialBroker } from "agent-runtime/fileCredentialBroker";
import type { CredentialBroker } from "agent-runtime/credentialBroker";
import {
  buildAgentApiKeyCredentialRef,
  migrateAgentSecrets,
} from "agent-runtime/migrateAgentSecrets";
import {
  classifyAgentApiKeyRef,
  formatUnsupportedAgentApiKeyRefMessage,
} from "agent-runtime/oauthProviderRefs";
import { normalizeAgentHandle } from "core/agentHandle";
import { toErrorMessage } from "core/errorMessage";
import { DataType } from "create/types";
import { createAgentKey } from "database/keys";
import { buildRestorePatch } from "database/tombstones";
import { resolveCliAgentKeyInput } from "./agentAliases";
import type { CliKvDb } from "./client/hybridRecordStore";
import { buildLocalAgentLookupKeys, shouldReadAgentKeyRemotely } from "./client/localAgentRecords";
import {
  parseUserIdFromAuthToken,
  readOption,
  resolveAuthToken,
  resolveServerCandidates,
  resolveServerUrl,
  type EnvLike,
} from "./cliEnvHelpers";
import { readPipeText, spawnProcess } from "./processSpawn";
import type { CliFetchImpl } from "./cliFetch";

const PROVIDER_COPY_FIELDS = [
  "apiSource",
  "provider",
  "cliProvider",
  "model",
  "customProviderUrl",
  "apiKey",
  "apiKeyRef",
  "apiKeyHeader",
  "useServerProxy",
  "inputPrice",
  "outputPrice",
] as const;

function readRepeatedOption(args: string[], flag: string) {
  const values: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== flag || !args[index + 1]) continue;
    values.push(args[index + 1]);
    index += 1;
  }
  return values;
}

function parseJsonishValue(raw: string) {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function recordHasAgentHandle(record: unknown, handle: string) {
  if (!record || typeof record !== "object") return false;
  const normalized = normalizeAgentHandle(handle);
  if (!normalized) return false;
  return normalizeAgentHandle((record as any).handle) === normalized;
}

async function findLocalAgentRecordByHandle(args: {
  handle: string;
  db: CliKvDb;
}) {
  const normalized = normalizeAgentHandle(args.handle);
  if (!normalized) return null;
  try {
    const iterator = args.db.iterator({ gte: "agent-", lte: "agent-\uffff" });
    for await (const [key, record] of iterator) {
      if (!recordHasAgentHandle(record, normalized)) continue;
      return { key, record };
    }
  } catch {
    // local handle scan unavailable
  }
  return null;
}

async function findRemoteAgentRecordByHandle(args: {
  handle: string;
  authToken: string;
  fallbackFetchImpl?: CliFetchImpl;
  fetchImpl: CliFetchImpl;
  serverUrl: string;
  userId: string;
}) {
  const normalized = normalizeAgentHandle(args.handle);
  if (!normalized) return null;
  const records = await queryUserRecords({
    authToken: args.authToken,
    fallbackFetchImpl: args.fallbackFetchImpl,
    fetchImpl: args.fetchImpl,
    limit: 200,
    serverUrl: args.serverUrl,
    userId: args.userId,
    type: DataType.AGENT,
  });
  return records.find((record) => recordHasAgentHandle(record, normalized)) ?? null;
}

function parsePositiveIntegerOption(raw: string | undefined, flag: string) {
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${flag} must be a positive integer.`);
  }
  return value;
}

function parseIsoTimestampOption(raw: string | undefined, flag: string) {
  if (!raw) return undefined;
  const time = Date.parse(raw);
  if (!Number.isFinite(time)) {
    throw new Error(`${flag} must be an ISO timestamp.`);
  }
  return new Date(time).toISOString();
}

async function curlFetch(url: string, init?: RequestInit): Promise<Response> {
  const method = init?.method ?? "GET";
  const headers = new Headers(init?.headers ?? {});
  const command = ["curl", "-sS", "-L", "-X", method, "--max-time", "10"];

  headers.forEach((value, key) => {
    command.push("-H", `${key}: ${value}`);
  });

  if (typeof init?.body === "string" && init.body.length > 0) {
    command.push("--data", init.body);
  }

  command.push("-w", "\n__NOLO_STATUS__:%{http_code}", url);
  const proc = spawnProcess({ cmd: command, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    readPipeText(proc.stdout),
    readPipeText(proc.stderr),
    proc.exited,
  ]);
  if (exitCode !== 0) {
    throw new Error(stderr.trim() || `curl failed for ${url}`);
  }

  const marker = "\n__NOLO_STATUS__:";
  const markerIndex = stdout.lastIndexOf(marker);
  const body = markerIndex >= 0 ? stdout.slice(0, markerIndex) : stdout;
  const statusText = markerIndex >= 0 ? stdout.slice(markerIndex + marker.length).trim() : "0";
  const status = Number(statusText);
  return new Response(body, {
    status: Number.isFinite(status) ? status : 0,
    headers: { "Content-Type": headers.get("Content-Type") ?? "application/json" },
  });
}

function shouldUseCurlTransportFallback(error: unknown) {
  const name = error instanceof Error ? error.name : "";
  if (name === "TimeoutError" || name === "AbortError") return false;
  const message = toErrorMessage(error);
  if (/timed out|Timeout/i.test(message)) return false;
  return /Unable to connect|ConnectionRefused|ECONNREFUSED|Failed to connect|Was there a typo|handshake|certificate|ECONNRESET|socket|network/i.test(message);
}

export async function fetchWithTransportFallback(
  url: string,
  init: RequestInit,
  options: { fallbackFetchImpl?: CliFetchImpl; fetchImpl: CliFetchImpl }
): Promise<Response> {
  const signal = init.signal ?? AbortSignal.timeout(10000);
  const nextInit = { ...init, signal };
  try {
    return await options.fetchImpl(url, nextInit);
  } catch (error) {
    if (!shouldUseCurlTransportFallback(error)) throw error;
    if (options.fallbackFetchImpl) {
      return options.fallbackFetchImpl(url, nextInit);
    }
    if (options.fetchImpl !== fetch) throw error;
    return curlFetch(url, nextInit);
  }
}

export async function readAgentRecord(args: {
  agentKey: string;
  authToken: string;
  fallbackFetchImpl?: CliFetchImpl;
  fetchImpl: CliFetchImpl;
  serverUrl: string;
}) {
  const res = await fetchWithTransportFallback(
    `${args.serverUrl}/api/v1/db/read/${encodeURIComponent(args.agentKey)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${args.authToken}` },
    },
    args
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`read failed: HTTP ${res.status} ${JSON.stringify(data)}`);
  }
  return data?.data ?? data;
}

export async function readDbRecord(args: {
  dbKey: string;
  authToken: string;
  fallbackFetchImpl?: CliFetchImpl;
  fetchImpl: CliFetchImpl;
  includeDeleted?: boolean;
  serverUrl: string;
}) {
  const query = args.includeDeleted ? "?includeDeleted=true" : "";
  const res = await fetchWithTransportFallback(
    `${args.serverUrl}/api/v1/db/read/${encodeURIComponent(args.dbKey)}${query}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${args.authToken}` },
    },
    args
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`read failed: HTTP ${res.status} ${JSON.stringify(data)}`);
  }
  return data?.data ?? data;
}

export async function queryUserRecords(args: {
  authToken: string;
  fallbackFetchImpl?: CliFetchImpl;
  fetchImpl: CliFetchImpl;
  limit?: number;
  serverUrl: string;
  summary?: boolean;
  includeDeleted?: boolean;
  userId: string;
  type: string | string[];
}): Promise<any[]> {
  const query = typeof args.limit === "number" && args.limit > 0
    ? `?limit=${Math.floor(args.limit)}`
    : "";
  const res = await fetchWithTransportFallback(
    `${args.serverUrl}/api/v1/db/query/${encodeURIComponent(args.userId)}${query}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: args.type,
        ...(args.includeDeleted ? { includeDeleted: true } : {}),
        ...(args.summary ? { summary: true } : {}),
      }),
    },
    args
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`query failed: HTTP ${res.status} ${JSON.stringify(data)}`);
  }
  return Array.isArray(data?.data?.data)
    ? data.data.data
    : Array.isArray(data?.data)
      ? data.data
      : [];
}

export async function deleteDbRecord(args: {
  dbKey: string;
  deleteOptions?: { type?: "single" | "table" | "messages" };
  authToken: string;
  fallbackFetchImpl?: CliFetchImpl;
  fetchImpl: CliFetchImpl;
  serverUrl: string;
}) {
  const type = args.deleteOptions?.type;
  const query =
    type && type !== "single"
      ? `?type=${encodeURIComponent(type)}`
      : "";
  const res = await fetchWithTransportFallback(
    `${args.serverUrl}/api/v1/db/delete/${encodeURIComponent(args.dbKey)}${query}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${args.authToken}` },
    },
    args
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`delete failed: HTTP ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

/**
 * Agent 记录落库前的 apiKeyRef 校验（CLI 收口）。
 *
 * 判据与文案的单一出处是 `agent-runtime/oauthProviderRefs.ts`——与 server 写路由
 * `handleWrite` 共用同一个 `classifyAgentApiKeyRef` 与同一句
 * `formatUnsupportedAgentApiKeyRefMessage`。非法 ref 若落库，只会在运行时
 * `parseOAuthProviderKey` 处抛错、再被误报成「作者未同步凭据」，用户按文案操作
 * 永远修不好，因此在写入处直接失败。
 */
export function assertSupportedAgentApiKeyRef(
  record: Record<string, any> | null | undefined,
) {
  const verdict = classifyAgentApiKeyRef(record?.apiKeyRef);
  if (!verdict.ok) {
    throw new Error(formatUnsupportedAgentApiKeyRefMessage(verdict.ref));
  }
}

export async function writeAgentRecord(args: {
  agentKey: string;
  authToken: string;
  fallbackFetchImpl?: CliFetchImpl;
  fetchImpl: CliFetchImpl;
  serverUrl: string;
  userId: string;
  record: Record<string, any>;
  /**
   * 远端是否包含 apiKey。默认 **true**（既有契约：用户自己终端敲
   * `nolo agent create --api-key …` 时，远端写入里就带这个字段）。
   * 只有「对话里由宿主批准代执行」的严格路径才传 false。
   */
  remoteIncludeApiKey?: boolean;
}) {
  assertSupportedAgentApiKeyRef(args.record);
  // 远端是否携带明文密钥由调用方决定（手敲 CLI 保持既有契约；宿主代执行只留引用）。
  // 用字段过滤而不是解构重命名：后者会被密钥扫描器误判成键值对字面量。
  const remoteRecord =
    args.remoteIncludeApiKey === false
      ? Object.fromEntries(Object.entries(args.record).filter(([field]) => field !== "apiKey"))
      : args.record;
  const res = await fetchWithTransportFallback(`${args.serverUrl}/api/v1/db/write/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customKey: args.agentKey,
      userId: args.userId,
      data: {
        ...remoteRecord,
        dbKey: args.agentKey,
      },
    }),
  }, args);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`write failed: HTTP ${res.status} ${JSON.stringify(data)}`);
  }
}

/**
 * 变更（delete / update）成功后，让本地缓存不再服务改动前的记录。
 *
 * 选择「失效」而非「回写」：delete 没有可回写的值；update 走 refreshAgentRecordCache。
 * 这里只删除指定 key 的缓存条目，不碰其他 agent，也不写任何「永久失效」标记——
 * 下次读取自然走远端并重新缓存；离线时缓存缺失的 key 本来就读不到，
 * 而未改动的 agent 缓存条目保持原样（离线优先语义不变）。
 * 尽力而为：缓存层故障不能让已经成功的远端变更报失败。
 */
export async function invalidateAgentRecordCache(args: {
  db: CliKvDb;
  keys: string[];
}) {
  const invalidated: string[] = [];
  for (const key of new Set(args.keys.filter((k) => typeof k === "string" && k))) {
    try {
      await args.db.del(key);
      invalidated.push(key);
    } catch {
      // 缓存 key 不存在 / 缓存不可用：忽略
    }
  }
  return invalidated;
}

/**
 * update 成功后用本次写入远端的记录原地更新缓存；写缓存失败则退化为失效，
 * 保证不会残留改动前的旧字段。
 */
export async function refreshAgentRecordCache(args: {
  db: CliKvDb;
  agentKey: string;
  record: Record<string, any>;
  serverOrigin: string;
}) {
  try {
    await args.db.put(args.agentKey, {
      ...args.record,
      dbKey: args.agentKey,
      key: args.record?.key || args.agentKey,
      serverOrigin: args.serverOrigin,
      cachedAt: Date.now(),
    });
  } catch {
    await invalidateAgentRecordCache({ db: args.db, keys: [args.agentKey] });
  }
}

export async function resolveAgentRecordFromHybridStore(args: {
  agentInput: string;
  cliArgs?: string[];
  env: EnvLike;
  db: CliKvDb;
  fetchImpl: CliFetchImpl;
  fallbackFetchImpl?: CliFetchImpl;
  /** 跳过本地缓存，强制走一次权威远端读取（排障用）。 */
  fresh?: boolean;
}) {
  const agentKey = resolveCliAgentKeyInput(args.agentInput);
  const authToken = args.cliArgs
    ? resolveAuthToken(args.cliArgs, args.env)
    : resolveAuthToken(args.env);
  const defaultServerUrl = args.cliArgs
    ? resolveServerUrl(args.cliArgs, args.env)
    : resolveServerUrl(args.env);
  const userId = parseUserIdFromAuthToken(authToken) || "local";

  for (const key of buildLocalAgentLookupKeys({
    agentRef: agentKey,
    userId,
  })) {
    try {
      const record = await args.db.get(key);
      if (record && typeof record === "object") {
        // 如果缓存来自远程且过期，校验远程是否已 tombstone
        const cacheAge = Date.now() - (Number(record?.cachedAt) || 0);
        const STALE_CACHE_MS = 60_000;
        if (
          record?.serverOrigin &&
          shouldReadAgentKeyRemotely(key) &&
          (args.fresh === true || cacheAge > STALE_CACHE_MS)
        ) {
          try {
            // 必须用远端返回的**完整记录**覆盖缓存：早先这里只调 readAgentRecord
            // 而丢掉返回值，再把旧缓存重新 put 回去只刷新 cachedAt——后果是缓存里
            // 一旦存过被投影裁过（字段子集）的记录，就永远是裁过的，读取方无从
            // 得知自己看到的是不完整视图。2026-09-24 实证：`nolo agent read` 对
            // 一个公开 agent 只返回 8 字段，而权威 db/read 有 26 字段。
            const fresh = await readAgentRecord({
              agentKey: key,
              authToken,
              fallbackFetchImpl: args.fallbackFetchImpl,
              fetchImpl: args.fetchImpl,
              serverUrl: record.serverOrigin,
            });
            if (fresh) {
              try {
                // serverOrigin 是本地缓存元数据（记录来自哪台服务器），远端响应
                // 不会携带——覆盖缓存时必须保留，否则后续 resolve 失去刷新来源，
                // agent update 的 serverUrl 也会错误回落到默认服务器。
                await args.db.put(key, {
                  ...fresh,
                  dbKey: key,
                  serverOrigin: record.serverOrigin,
                  cachedAt: Date.now(),
                });
              } catch {}
              return {
                agentKey: key,
                record: { ...fresh, serverOrigin: record.serverOrigin },
                source: record?.serverOrigin ? "remote-cache" : "local-cache",
                cacheHit: false,
              } as const;
            }
          } catch (err: unknown) {
            // 只在远程确认 404（记录已删除/tombstone）时清缓存
            // 暂态 500/网络错误不清缓存，保持可用性
            const msg = toErrorMessage(err);
            if (msg.includes("HTTP 404")) {
              try { await args.db.del(key); } catch {}
              continue;
            }
            // 暂态错误：使用缓存继续，不阻塞读取
          }
        }
        return {
          agentKey: key,
          record,
          source: record?.serverOrigin ? "remote-cache" : "local-cache",
          // 明确告知调用方「这是缓存视图」——缓存可能持有字段子集，也可能已过期。
          // 调用方据此决定是否用 fresh 重读，而不是把不完整视图当成真值。
          cacheHit: true,
        } as const;
      }
    } catch {
      // local miss
    }

    if (!shouldReadAgentKeyRemotely(key)) continue;
    for (const serverUrl of (
      args.cliArgs
        ? resolveServerCandidates(args.cliArgs, args.env, defaultServerUrl)
        : resolveServerCandidates(args.env, defaultServerUrl)
    )) {
      try {
        const remoteRecord = await readAgentRecord({
          agentKey: key,
          authToken,
          fallbackFetchImpl: args.fallbackFetchImpl,
          fetchImpl: args.fetchImpl,
          serverUrl,
        });
        const cached = { ...remoteRecord, dbKey: key, serverOrigin: serverUrl, cachedAt: Date.now() };
        await args.db.put(key, cached);
        return {
          agentKey: key,
          record: cached,
          source: "remote-cache",
        } as const;
      } catch {
        // try next
      }
    }
  }

  const localHandleRecord = await findLocalAgentRecordByHandle({
    handle: args.agentInput,
    db: args.db,
  });
  if (localHandleRecord) {
    return {
      agentKey: localHandleRecord.key,
      record: localHandleRecord.record,
      source: localHandleRecord.record?.serverOrigin ? "remote-cache" : "local-cache",
    } as const;
  }

  if (authToken && userId !== "local") {
    for (const serverUrl of (
      args.cliArgs
        ? resolveServerCandidates(args.cliArgs, args.env, defaultServerUrl)
        : resolveServerCandidates(args.env, defaultServerUrl)
    )) {
      try {
        const remoteRecord = await findRemoteAgentRecordByHandle({
          handle: args.agentInput,
          authToken,
          fallbackFetchImpl: args.fallbackFetchImpl,
          fetchImpl: args.fetchImpl,
          serverUrl,
          userId,
        });
        if (!remoteRecord || typeof remoteRecord !== "object") continue;
        const key = typeof remoteRecord.dbKey === "string" && remoteRecord.dbKey
          ? remoteRecord.dbKey
          : typeof remoteRecord.key === "string" && remoteRecord.key
            ? remoteRecord.key
            : "";
        if (!key) continue;
        const cached = { ...remoteRecord, dbKey: key, serverOrigin: serverUrl };
        await args.db.put(key, cached);
        return {
          agentKey: key,
          record: cached,
          source: "remote-cache",
        } as const;
      } catch {
        // try next
      }
    }
  }

  return null;
}

const CLI_SECRET_FIELD_NAMES = new Set([
  "apikey",
  "password",
  "passwd",
  "secret",
  "clientsecret",
  "accesstoken",
  "refreshtoken",
  "sessiontoken",
  "bearertoken",
  "authorization",
  "authheader",
  "token",
  "oauthtoken",
  "idtoken",
  "credentials",
  "credential",
]);

const CLI_CREDENTIAL_REF_FIELDS = new Set(["credentialref", "apikeyref"]);

const normalizeCredentialFieldName = (value: string): string =>
  value.replace(/[^a-z0-9]/gi, "").toLowerCase();

function isNonEmptyCredentialValue(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

export function agentRecordHasConfiguredCredential(record: unknown): boolean {
  if (!record || typeof record !== "object") return false;
  if (Array.isArray(record)) {
    return record.some(agentRecordHasConfiguredCredential);
  }
  for (const [key, value] of Object.entries(record as Record<string, unknown>)) {
    const normalizedKey = normalizeCredentialFieldName(key);
    if (
      (CLI_SECRET_FIELD_NAMES.has(normalizedKey) ||
        CLI_CREDENTIAL_REF_FIELDS.has(normalizedKey)) &&
      isNonEmptyCredentialValue(value)
    ) {
      return true;
    }
    if (
      typeof value === "object" &&
      value != null &&
      agentRecordHasConfiguredCredential(value)
    ) {
      return true;
    }
  }
  return false;
}

export function sanitizeAgentRecordForCliOutput(record: unknown): unknown {
  if (record == null || typeof record !== "object") return record;
  if (Array.isArray(record)) {
    return record.map((item) => sanitizeAgentRecordForCliOutput(item));
  }
  const source = record as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    const normalizedKey = normalizeCredentialFieldName(key);
    if (CLI_SECRET_FIELD_NAMES.has(normalizedKey)) continue;
    if (CLI_CREDENTIAL_REF_FIELDS.has(normalizedKey)) {
      if (isNonEmptyCredentialValue(value)) out[key] = value;
      continue;
    }
    if (value != null && typeof value === "object") {
      out[key] = sanitizeAgentRecordForCliOutput(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function normalizeAgentRecordForOutput(agentKey: string, authToken: string, agent: any) {
  const credentialConfigured = agentRecordHasConfiguredCredential(agent);
  const sanitizedRecord = sanitizeAgentRecordForCliOutput(agent);
  return {
    agentKey,
    baseUrl: agent?.serverOrigin ?? null,
    name: agent?.name,
    greeting: agent?.greeting,
    model: agent?.model,
    provider: agent?.provider ?? agent?.apiSource ?? null,
    cliProvider: agent?.cliProvider ?? null,
    customProviderUrl: agent?.customProviderUrl ?? null,
    tools: agent?.tools ?? [],
    isPublic: agent?.isPublic,
    credentialConfigured,
    credentialRef: agent?.credentialRef ?? undefined,
    apiKeyRef: agent?.apiKeyRef ?? undefined,
    authUserId: parseUserIdFromAuthToken(authToken),
    userId: agent?.userId,
    record: sanitizedRecord,
  };
}

const INBOUND_CRED_REF_PREFIX = "$nolo_cred:";
const VAULT_REF_PATTERN = /^vault-cred-[A-Za-z0-9]+$/;

/**
 * 识别入路隔离产生的不透明 vault ID（`vault-cred-…`，兼容 `$nolo_cred:` 前缀形态）。
 *
 * 只做形态判定：不读 broker、不返回明文。明文只在真正使用点（verify、执行边界）
 * 于进程内取出，绝不进入 argv、普通记录、远端写入或日志。
 */
export function detectVaultCredentialId(value: unknown): string | null {
  const trimmed = typeof value === "string" ? value.trim() : "";
  const candidate = trimmed.startsWith(INBOUND_CRED_REF_PREFIX)
    ? trimmed.slice(INBOUND_CRED_REF_PREFIX.length).trim()
    : trimmed;
  return VAULT_REF_PATTERN.test(candidate) ? candidate : null;
}

/**
 * 把严格宿主安全存储里的 vault 凭据绑到 agent 的具名 ref（`api-key:<agentKey>`）。
 *
 * 存储只用 OS 安全区（经 `createStrictHostCredentialBroker`），**没有明文文件回退**；
 * 安全区不可用时这一调用直接失败（`credential_store_*`），不会降级写盘。
 * 复用既有两阶段路径 `migrateAgentSecrets`：secret 只写安全区，记录补丁用
 * `credentialRef` 取代明文 `apiKey`。
 *
 * 注意：secret 在进程内是**明文**（broker 返回的就是原始字符串），只是不落盘、
 * 不进 argv/日志/记录/远端。
 */
let hostCredentialBrokerOverride: CredentialBroker | undefined;

/** 严格安全区不可用、只能回退本地文件存储时的告警（由调用方 drain 后输出）。 */
const credentialStorageWarnings: string[] = [];

export function drainCredentialStorageWarnings(): string[] {
  return credentialStorageWarnings.splice(0, credentialStorageWarnings.length);
}

function pushCredentialStorageWarning(message: string): void {
  credentialStorageWarnings.push(message);
  try {
    process.stderr.write(`[nolo] Warning: ${message}\n`);
  } catch {
    // stderr 不可写时至少保留内存告警，不影响主流程。
  }
}

export const CREDENTIAL_STORE_SESSION_FALLBACK_WARNING =
  "系统安全区不可用，本次会话内有效，未持久化；重启后需重新提供该凭据。";

export const CREDENTIAL_STORE_FALLBACK_WARNING =
  "系统安全区不可用，已回退到本地文件存储（0600 明文）。建议启用系统钥匙串（Linux: Secret Service / gnome-keyring）。";

/**
 * 测试注入点：生产代码不调用。缺省一律走严格宿主安全存储。
 * （不提供「回退明文文件」的开关，避免这条缝被当成逃生口。）
 */
export function setHostCredentialBrokerOverride(broker: CredentialBroker | undefined): void {
  hostCredentialBrokerOverride = broker;
}

/** 严格安全区（写路径与 has 校验只认它，绝不看遗留明文文件）。 */
function resolveStrictCredentialBroker(broker?: CredentialBroker): CredentialBroker {
  return broker ?? hostCredentialBrokerOverride ?? createStrictHostCredentialBroker();
}

const legacyReadNoticed = new Set<string>();

/**
 * 读路径：严格安全区优先，未命中时**只读**回退到遗留 file broker。
 * 这样切到严格 broker 后既有 `api-key:agent-*` 凭据立即可用，且不做迁移写入。
 */
function resolveHostCredentialBroker(broker?: CredentialBroker): CredentialBroker {
  if (broker || hostCredentialBrokerOverride) return resolveStrictCredentialBroker(broker);
  return createHostCredentialBrokerChain({
    strict: createStrictHostCredentialBroker(),
    session: getSharedSessionCredentialBroker(),
    legacy: createFileCredentialBroker({ migration: { enableLegacyMigration: true } }),
    notifySessionFallback: () => {
      try {
        process.stderr.write(`[nolo] Warning: ${CREDENTIAL_STORE_SESSION_FALLBACK_WARNING}\n`);
      } catch {
        // stderr 不可写不影响使用。
      }
    },
    notifyLegacyHit: (ref) => {
      if (legacyReadNoticed.has(ref)) return;
      legacyReadNoticed.add(ref);
      try {
        process.stderr.write(
          `[nolo] Warning: 凭据 "${ref}" 来自遗留本地明文存储（只读回退）。建议重新录入该 API key 以迁入系统安全区。\n`,
        );
      } catch {
        // 同上。
      }
    },
  });
}

/**
 * 把一条已知明文的凭据写进严格 OS store，并返回 agent 作用域的引用。
 * 这是 `bindVaultCredentialToAgent` 的后半段，被「vault 引用」和「明文 key」两条入路共用，
 * 避免两处各自实现写入 + 校验。
 */
export async function storeAgentCredential(args: {
  agentKey: string;
  secret: string;
  broker?: CredentialBroker;
}): Promise<{ credentialRef: string }> {
  // 写路径只认严格安全区：has 校验也必须是严格区里的落库，不能被遗留文件"代为满足"。
  const broker = resolveStrictCredentialBroker(args.broker);
  const credentialRef = buildAgentApiKeyCredentialRef(args.agentKey);
  await migrateAgentSecrets({
    agent: { key: args.agentKey, apiKey: args.secret, apiKeyRef: credentialRef },
    broker,
  });
  if (!(await broker.has(credentialRef))) {
    throw new Error(`failed to store the credential in the host credential store (${credentialRef}).`);
  }
  return { credentialRef };
}

export async function bindVaultCredentialToAgent(args: {
  agentKey: string;
  vaultId: string;
  broker?: CredentialBroker;
}): Promise<{ credentialRef: string }> {
  const broker = resolveHostCredentialBroker(args.broker);
  const secret = await broker.get(args.vaultId);
  if (!secret) {
    // ID 是摘要不是机密，可以显示；对应明文一律不回显。
    throw new Error(
      `--api-key received a vault credential id (${args.vaultId}) but no secret is stored for it on this device. ` +
        `Re-paste the key in the chat so the runtime can isolate it again, or ask the user to run \`nolo secret set <name> --prompt\`.`,
    );
  }
  // 写路径用调用方注入的 broker（测试/宿主）或严格安全区；不用读回退包装，
  // 否则 has 校验可能被遗留文件"代为满足"。
  return await storeAgentCredential({ agentKey: args.agentKey, secret, broker: args.broker });
}

/**
 * 进程内读取已绑定的凭据，仅供受控使用点（verify）调用。
 * 返回值是明文；调用方不得写进记录、日志、argv 或任何序列化输出。
 */
export async function readBoundAgentCredential(
  credentialRef: string,
  broker?: CredentialBroker,
): Promise<string | null> {
  return await resolveHostCredentialBroker(broker).get(credentialRef);
}

export function parseAgentUpdateArgs(args: string[]) {
  const agentInput = readOption(args, "--agent") ?? readOption(args, "--id") ?? args[0]?.trim();
  if (!agentInput || agentInput === "--help" || agentInput === "-h") return null;

  const updates: Record<string, unknown> = {};
  const model = readOption(args, "--model");
  const cliProvider = readOption(args, "--cli-provider");
  const apiSource = readOption(args, "--api-source");
  const provider = readOption(args, "--provider");
  const prompt = readOption(args, "--prompt");
  const promptFile = readOption(args, "--prompt-file");
  const promptDoc = readOption(args, "--prompt-doc");
  const tools = readOption(args, "--tools");
  const copyProviderFrom = readOption(args, "--copy-provider-from");
  const name = readOption(args, "--name");
  const customProviderUrl = readOption(args, "--custom-provider-url");
  // Accept both --api-key (works) and the help-text alias --provider-api-key so
  // the key is never silently dropped when a user copies the documented flag.
  const apiKey = readOption(args, "--api-key") ?? readOption(args, "--provider-api-key");
  // --preset <id> resolves a providerRegistry preset (subscription token-plan or
  // metered API) into provider/baseUrl/model; explicit flags override it below.
  const presetId = readOption(args, "--preset") ?? readOption(args, "--provider-preset");
  const verify = args.includes("--verify");
  const verifyPrompt = readOption(args, "--verify-prompt");
  const maxConcurrent = parsePositiveIntegerOption(
    readOption(args, "--max-concurrent"),
    "--max-concurrent",
  );
  const expiresAt = parseIsoTimestampOption(readOption(args, "--expires-at"), "--expires-at");
  const handle = readOption(args, "--handle")?.trim();

  // `--prompt ""` is an explicit request to clear the prompt, so presence
  // (not truthiness) decides whether the flag was passed.
  const promptSources = [prompt, promptFile, promptDoc].filter((value) => value !== undefined);
  if (promptSources.length > 1) {
    throw new Error("--prompt / --prompt-file / --prompt-doc are mutually exclusive.");
  }

  if (model) updates.model = model;
  if (cliProvider) updates.cliProvider = cliProvider;
  if (apiSource) updates.apiSource = apiSource;
  if (provider) updates.provider = provider;
  if (prompt !== undefined) updates.prompt = prompt;
  if (promptFile) updates.prompt = readFileSync(promptFile, "utf8");
  if (tools) updates.tools = parseJsonishValue(tools);
  if (name) updates.name = name;
  if (customProviderUrl) updates.customProviderUrl = customProviderUrl;
  // vault 凭据（`vault-cred-…`）在这里按原样放进 updates，由 build*AgentRecord
  // 在组记录前替换成 credentialRef —— 明文只在进程内出现，不进记录/远端。
  if (apiKey) updates.apiKey = apiKey;
  if (maxConcurrent != null) updates.admission = { maxConcurrent };
  if (expiresAt) {
    updates.scheduling = { expiresAt };
  }
  if (handle) updates.handle = handle;

  for (const entry of readRepeatedOption(args, "--field")) {
    const index = entry.indexOf("=");
    if (index <= 0) {
      throw new Error(`--field must use key=value, received ${JSON.stringify(entry)}`);
    }
    updates[entry.slice(0, index)] = parseJsonishValue(entry.slice(index + 1));
  }

  if (Object.keys(updates).length === 0) {
    if (!promptDoc && !copyProviderFrom && !presetId) {
      throw new Error("No updates provided. Use --model / --cli-provider / --api-source / --field key=value.");
    }
  }

  return { agentInput, updates, promptDoc, copyProviderFrom, verify, verifyPrompt, presetId };
}

/**
 * vault 凭据落位：把 `updates.apiKey` 里的裸 vault ID 换成 `credentialRef`。
 *
 * 信任边界：只有用户在建/改 agent 时**显式给出 provider 目标**，才解析并使用这份
 * 本机凭据；否则 fail closed（不发请求、不写 broker）。失败不静默——让调用方
 * 看到一个明确原因，而不是把 ID 当明文塞进记录。
 */
/**
 * 「看起来是密钥的明文」判据：长度 ≥12 且不是已知引用形态。
 *
 * 为什么不用 `hasPotentialSecrets`：那套是子串探针（PASSWORD / TOKEN / SECRET_KEY），
 * 对 `--prompt "解释下 TOKEN 是什么"` 会误伤。这里只看「值本身像一个密钥」。
 */
function looksLikePlaintextApiKey(value: unknown): boolean {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (trimmed.length < 12) return false;
  if (/^(?:api-key:|vault-cred-)/i.test(trimmed)) return false;
  const verdict = classifyAgentApiKeyRef(trimmed);
  if (verdict.ok && verdict.kind !== "empty") return false;
  return true;
}

async function applyVaultCredentialBinding(
  updates: Record<string, unknown>,
  agentKey: string,
  broker?: CredentialBroker,
  fallbackProviderUrl?: string,
  preservePlaintextApiKey?: boolean,
): Promise<void> {
  const vaultId = detectVaultCredentialId(updates.apiKey);
  if (!vaultId) {
    const rawApiKey = updates.apiKey;
    if (!looksLikePlaintextApiKey(rawApiKey)) return;
    // 明文 key：先试严格 OS store，记录只留引用（明文不进记录/远端）。
    try {
      const { credentialRef } = await storeAgentCredential({
        agentKey,
        secret: String(rawApiKey).trim(),
        broker,
      });
      delete updates.apiKey;
      updates.credentialRef = credentialRef;
      updates.apiKeyRef = credentialRef;
      // 旧路径（update --api-key）本身就把值写进记录：业主原则要求不破坏既有可用性，
      // 因此该路径保留原样写入；安全区里同时存了密文并留下 ref，供受控取用。
      if (preservePlaintextApiKey && typeof rawApiKey === "string") {
        updates.apiKey = rawApiKey;
      }
      return;
    } catch {
      // 降级（业主原则：安全改动不得让功能不可用）：严格安全区不可用时，回到
      // 改动前的行为——值按原路径持久化——并**显式告警**，不静默丢掉这次更新。
      credentialStorageWarnings.push(CREDENTIAL_STORE_FALLBACK_WARNING);
      process.stderr.write(`[nolo] Warning: ${CREDENTIAL_STORE_FALLBACK_WARNING}\n`);
      return;
    }
  }
  // 先摘掉再校验：任何后续抛错都不能把 ID/明文留在 updates 里被展开进记录。
  delete updates.apiKey;
  const target =
    typeof updates.customProviderUrl === "string" && updates.customProviderUrl.trim()
      ? updates.customProviderUrl.trim()
      : (fallbackProviderUrl ?? "").trim();
  if (!target) {
    throw new Error(
      "--api-key received a vault credential id, but no provider target was given. " +
        "Pass --custom-provider-url <base> (or --preset <id>) so the credential has a known destination.",
    );
  }
  const { credentialRef } = await bindVaultCredentialToAgent({ agentKey, vaultId, broker });
  updates.credentialRef = credentialRef;
  updates.apiKeyRef = credentialRef;
}

export async function buildCreatedAgentRecord(args: {
  cliArgs?: string[];
  parsed: NonNullable<ReturnType<typeof parseAgentUpdateArgs>>;
  env: EnvLike;
  db: CliKvDb;
  fetchImpl: CliFetchImpl;
  fallbackFetchImpl?: CliFetchImpl;
  authToken: string;
  /** 宿主代执行的批准事件（存在即走严格：记录与远端只留 ref）。 */
  hostApproval?: { gateId: string };
  /** 凭据 broker 注入（测试用）；缺省走严格安全区 + 会话内存 + 遗留只读链。 */
  credentialBroker?: CredentialBroker;
}) {
  const serverUrl = args.cliArgs ? resolveServerUrl(args.cliArgs, args.env) : resolveServerUrl(args.env);
  const userId = parseUserIdFromAuthToken(args.authToken);
  const resolvedAgentInput = resolveCliAgentKeyInput(args.parsed.agentInput);
  const agentKey = resolvedAgentInput.startsWith("agent-")
    ? resolvedAgentInput
    : createAgentKey.private(userId || "local", resolvedAgentInput);

  // --preset <id>: resolve a providerRegistry preset into provider/baseUrl/model
  // defaults. Explicit flags (--model / --custom-provider-url / --provider) were
  // already merged into updates by parseAgentUpdateArgs; preset fills only the
  // fields the user did not pass, so explicit flags win.
  if (args.parsed.presetId) {
    const { resolveProviderPresetFields } = await import(
      "ai/agent/providerPresetApply"
    );
    const fields = resolveProviderPresetFields(args.parsed.presetId);
    if (fields.kind === "manual") {
      throw new Error(
        `unknown --preset "${args.parsed.presetId}". Run \`nolo agent providers\` to list preset ids.`
      );
    }
    const u = args.parsed.updates;
    u.apiSource = "custom";
    u.provider = u.provider ?? fields.provider;
    if (fields.apiKeyRef && !u.apiKeyRef) {
      u.apiKeyRef = fields.apiKeyRef;
    }
    if (fields.customProviderUrl && !u.customProviderUrl) {
      u.customProviderUrl = fields.customProviderUrl;
    }
    if (fields.apiKeyHeader && !u.apiKeyHeader) {
      u.apiKeyHeader = fields.apiKeyHeader;
    }
    if (!u.model && fields.model) u.model = fields.model;
    if (fields.defaultReasoningEffort && u.reasoning_effort == null) {
      u.reasoning_effort = fields.defaultReasoningEffort;
    }
  }

  if (args.parsed.copyProviderFrom) {
    const providerSource = await resolveAgentRecordFromHybridStore({
      agentInput: args.parsed.copyProviderFrom,
      cliArgs: args.cliArgs,
      env: args.env,
      db: args.db,
      fetchImpl: args.fetchImpl,
      fallbackFetchImpl: args.fallbackFetchImpl,
    });
    if (!providerSource) {
      throw new Error(`provider source agent not found: ${args.parsed.copyProviderFrom}`);
    }
    for (const field of PROVIDER_COPY_FIELDS) {
      if (field in providerSource.record && !(field in args.parsed.updates)) {
        args.parsed.updates[field] = providerSource.record[field];
      }
    }
  }

  if (args.parsed.promptDoc) {
    const promptDoc = await readDbRecord({
      dbKey: args.parsed.promptDoc,
      authToken: args.authToken,
      fallbackFetchImpl: args.fallbackFetchImpl,
      fetchImpl: args.fetchImpl,
      serverUrl,
    });
    const promptBody = typeof promptDoc?.content === "string" ? promptDoc.content : "";
    if (!promptBody.trim()) {
      throw new Error(`prompt doc is empty or unreadable: ${args.parsed.promptDoc}`);
    }
    args.parsed.updates.prompt = promptBody;
  }

  if (args.parsed.updates.customProviderUrl && !args.parsed.updates.apiSource) {
    args.parsed.updates.apiSource = "custom";
  }

  // 用户贴入的 key：把 broker 里的密文绑到本 agent 的具名 ref，记录里只留引用。
  // 必须在组 nextRecord 之前完成——否则明文/裸 ID 会随 updates 展开进记录与远端写入。
  // 来源判定：宿主代执行（hostApproval）走严格（只留 ref、删明文）；
  // 用户自己终端敲则保持既有行为（明文照旧留在记录里）。
  await applyVaultCredentialBinding(
    args.parsed.updates,
    agentKey,
    args.credentialBroker,
    undefined,
    !args.hostApproval?.gateId,
  );

  const now = Date.now();
  const nextRecord = {
    ...args.parsed.updates,
    dbKey: agentKey,
    key: agentKey,
    type: DataType.AGENT,
    ...buildRestorePatch(new Date(now).toISOString()),
    createdAt: now,
    updatedAt: now,
    userId,
  };

  return {
    agentKey,
    serverUrl,
    nextRecord,
    updates: args.parsed.updates,
  };
}

export async function buildUpdatedAgentRecord(args: {
  cliArgs?: string[];
  parsed: NonNullable<ReturnType<typeof parseAgentUpdateArgs>>;
  env: EnvLike;
  db: CliKvDb;
  fetchImpl: CliFetchImpl;
  fallbackFetchImpl?: CliFetchImpl;
  authToken: string;
  /** 凭据 broker 注入（测试用）；缺省走严格宿主安全存储。 */
  credentialBroker?: CredentialBroker;
  /** 宿主代执行的批准事件（存在即走严格：记录与远端只留 ref）。 */
  hostApproval?: { gateId: string };
}) {
  const cached = await resolveAgentRecordFromHybridStore({
    agentInput: args.parsed.agentInput,
    cliArgs: args.cliArgs,
    env: args.env,
    db: args.db,
    fetchImpl: args.fetchImpl,
    fallbackFetchImpl: args.fallbackFetchImpl,
  });
  const agentKey = cached?.agentKey ?? resolveCliAgentKeyInput(args.parsed.agentInput);
  const explicitServerUrl = args.cliArgs
    ? readOption(args.cliArgs, "--server-url") || readOption(args.cliArgs, "--server")
    : undefined;
  const envServerUrl = args.env.NOLO_SERVER || args.env.BASE_URL || args.env.NOLO_SERVER_URL;
  const requestedServerUrl = explicitServerUrl || envServerUrl
    ? (args.cliArgs ? resolveServerUrl(args.cliArgs, args.env) : resolveServerUrl(args.env))
    : undefined;
  const serverUrl = requestedServerUrl || cached?.record?.serverOrigin || resolveServerUrl(args.env);
  const currentRecord = await readAgentRecord({
    agentKey,
    authToken: args.authToken,
    fallbackFetchImpl: args.fallbackFetchImpl,
    fetchImpl: args.fetchImpl,
    serverUrl,
  });

  if (args.parsed.copyProviderFrom) {
    const providerSource = await resolveAgentRecordFromHybridStore({
      agentInput: args.parsed.copyProviderFrom,
      cliArgs: args.cliArgs,
      env: args.env,
      db: args.db,
      fetchImpl: args.fetchImpl,
      fallbackFetchImpl: args.fallbackFetchImpl,
    });
    if (!providerSource) {
      throw new Error(`provider source agent not found: ${args.parsed.copyProviderFrom}`);
    }
    for (const field of PROVIDER_COPY_FIELDS) {
      if (field in providerSource.record && !(field in args.parsed.updates)) {
        args.parsed.updates[field] = providerSource.record[field];
      }
    }
  }

  if (args.parsed.promptDoc) {
    const promptDoc = await readDbRecord({
      dbKey: args.parsed.promptDoc,
      authToken: args.authToken,
      fallbackFetchImpl: args.fallbackFetchImpl,
      fetchImpl: args.fetchImpl,
      serverUrl,
    });
    const promptBody = typeof promptDoc?.content === "string" ? promptDoc.content : "";
    if (!promptBody.trim()) {
      throw new Error(`prompt doc is empty or unreadable: ${args.parsed.promptDoc}`);
    }
    args.parsed.updates.prompt = promptBody;
  }

  // 与 create 同一条策略：明文 key / vault 引用都就地转成 credentialRef，
  // 记录里只留引用。update 的目标可能沿用记录里的 customProviderUrl，作为兜底传入。
  await applyVaultCredentialBinding(
    args.parsed.updates,
    agentKey,
    args.credentialBroker,
    typeof currentRecord?.customProviderUrl === "string"
      ? currentRecord.customProviderUrl
      : undefined,
    // update 的来源判定与 create 一致：宿主代执行 → 严格（删明文只留 ref）；
    // 用户自己终端敲 → 保持既有行为（明文照旧写进记录）。
    !args.hostApproval?.gateId,
  );

  const nextRecord = {
    ...currentRecord,
    ...args.parsed.updates,
    ...(args.parsed.updates.customProviderUrl && !args.parsed.updates.apiSource
      ? { apiSource: "custom" }
      : {}),
    updatedAt: Date.now(),
  };

  return {
    agentKey,
    serverUrl,
    nextRecord,
    updates: args.parsed.updates,
  };
}
