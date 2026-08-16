/**
 * Agent 管理操作 helpers
 * 提供登录、写入记录、删除记录、运行 agent 等可复用操作
 */

import { toErrorMessage } from "core/errorMessage";
import { asOptionalTrimmedString } from "core/optionalString";
import {
  generateKeyPairFromSeed,
  generateUserIdV1,
  signToken,
} from "../testHelpers/authHelper";
import { apiPost, apiDelete } from "./apiHelpers";
import {
  buildScriptServerCandidates,
  normalizeBaseUrl,
  resolveDeleteServerCandidates,
} from "./serverBases";
import { NOLO_CLUSTER_SERVERS, normalizeKnownServerOrigin } from "../../packages/database/config";
import type { AgentRuntimeOptions } from "ai/agent/types";

export interface DemoCredentials {
  userId: string;
  authToken: string;
}

export interface ServerDemoCredentials extends DemoCredentials {
  baseUrl: string;
}

/** 固定 seed 登录演示账号（幂等） */
export async function loginDemoUser(
  baseUrl: string,
  seed: string,
  username: string,
  locale = "zh-CN"
): Promise<DemoCredentials> {
  const { publicKey, secretKey } = generateKeyPairFromSeed(seed);
  const userId = generateUserIdV1(publicKey, username, locale);
  const exp = Math.floor(Date.now() / 1000) + 3600 * 24 * 30;
  const token = signToken({ userId, username, exp }, secretKey);

  const loginRes = await apiPost(baseUrl + "/api/v1/users/login", { userId, token });
  if (!loginRes.ok) {
    throw new Error(`登录失败 (${loginRes.status}): ${JSON.stringify(loginRes.data)}`);
  }
  const authToken: string = loginRes.data?.token ?? token;
  return { userId, authToken };
}

/**
 * 生产集群禁止 seed 演示账号自动注册：demo 账号已正式弃用（见 scripts/README.md），
 * 但 userId 由 seed 确定性派生，任何指向生产的 registerDemoUser 都会把已删除的
 * 账号重建出来——2026-07-20 因此造成 main 集群 ledger 与 user.balance 漂移，
 * 卡死 main-web-release 审计。确需覆盖时显式设 NOLO_ALLOW_PROD_DEMO_SEED=1。
 */
export const assertDemoSeedNotOnProduction = (baseUrl: string) => {
  if (process.env.NOLO_ALLOW_PROD_DEMO_SEED === "1") return;
  const normalized =
    normalizeKnownServerOrigin(baseUrl) ?? normalizeBaseUrl(baseUrl);
  if ((NOLO_CLUSTER_SERVERS as readonly string[]).includes(normalized)) {
    throw new Error(
      `registerDemoUser refused: ${normalized} 是生产集群，seed 演示账号已弃用，禁止自动重建。` +
        `如确认需要，设 NOLO_ALLOW_PROD_DEMO_SEED=1 重试。`
    );
  }
};

/** 注册演示账号（409 视为已存在，不报错） */
export async function registerDemoUser(
  baseUrl: string,
  seed: string,
  username: string,
  locale = "zh-CN"
): Promise<{ userId: string; secretKey: string }> {
  assertDemoSeedNotOnProduction(baseUrl);
  const { publicKey, secretKey } = generateKeyPairFromSeed(seed);
  const userId = generateUserIdV1(publicKey, username, locale);

  const r = await apiPost(baseUrl + "/api/v1/users/signup", { username, publicKey, locale });
  if (r.status !== 201 && r.status !== 200 && r.status !== 409) {
    throw new Error(`注册失败 (${r.status}): ${JSON.stringify(r.data)}`);
  }
  return { userId, secretKey };
}

export async function ensureDemoUsersOnBases(args: {
  preferredBase: string;
  seed: string;
  username: string;
  locale?: string;
  bases?: string[];
}): Promise<ServerDemoCredentials[]> {
  const {
    preferredBase,
    seed,
    username,
    locale = "zh-CN",
    bases: explicitBases,
  } = args;
  const bases = explicitBases?.length ? explicitBases : buildScriptServerCandidates(preferredBase);
  const results: ServerDemoCredentials[] = [];

  for (const baseUrl of bases) {
    await registerDemoUser(baseUrl, seed, username, locale).catch(() => null);
    const creds = await loginDemoUser(baseUrl, seed, username, locale);
    results.push({ baseUrl, ...creds });
  }

  return results;
}

/** 写入一条 DB 记录 */
export async function writeRecord(
  baseUrl: string,
  userId: string,
  authToken: string,
  customKey: string,
  data: Record<string, any>,
  options?: { indexKeys?: string[] }
): Promise<void> {
  const r = await apiPost(
    baseUrl + "/api/v1/db/write/",
    {
      data: { ...data, dbKey: customKey },
      customKey,
      userId,
      ...(options?.indexKeys ? { indexKeys: options.indexKeys } : {}),
    },
    authToken
  );
  if (r.status !== 200 && r.status !== 201) {
    throw new Error(`写入 ${customKey} 失败 (${r.status}): ${JSON.stringify(r.data)}`);
  }
}

export type DeleteRecordOptions = {
  /** Override fan-out targets. Pass [] to delete only `baseUrl`. */
  servers?: string[];
};

export type DeleteRecordServerResult = {
  serverUrl: string;
  status: "deleted" | "missing" | "failed";
  error?: string;
};

async function deleteRecordOnServer(
  serverUrl: string,
  userId: string,
  authToken: string,
  customKey: string
): Promise<DeleteRecordServerResult> {
  const url = `${serverUrl}/api/v1/db/delete/${encodeURIComponent(customKey)}?userId=${userId}`;
  try {
    const response = await apiDelete(url, authToken);
    if (response.status === 200 || response.status === 204) {
      return { serverUrl, status: "deleted" };
    }
    if (response.status === 404) {
      return { serverUrl, status: "missing" };
    }
    return {
      serverUrl,
      status: "failed",
      error: `HTTP ${response.status}: ${JSON.stringify(response.data)}`,
    };
  } catch (error) {
    return {
      serverUrl,
      status: "failed",
      error: toErrorMessage(error),
    };
  }
}

export async function deleteRecordOnServers(
  baseUrl: string,
  userId: string,
  authToken: string,
  customKey: string,
  options?: DeleteRecordOptions
): Promise<{
  status: "deleted" | "missing";
  servers: DeleteRecordServerResult[];
}> {
  const serverUrls =
    options?.servers !== undefined
      ? [...new Set(options.servers.map((value) => normalizeBaseUrl(value)))]
      : resolveDeleteServerCandidates(baseUrl);

  if (serverUrls.length === 0) {
    const single = await deleteRecordOnServer(baseUrl, userId, authToken, customKey);
    if (single.status === "failed") {
      throw new Error(`删除 ${customKey} 失败 (${single.serverUrl}): ${single.error}`);
    }
    return {
      status: single.status,
      servers: [single],
    };
  }

  const servers: DeleteRecordServerResult[] = [];
  for (const serverUrl of serverUrls) {
    servers.push(await deleteRecordOnServer(serverUrl, userId, authToken, customKey));
  }

  const deletedServers = servers.filter((result) => result.status === "deleted");
  const failedServers = servers.filter((result) => result.status === "failed");
  if (deletedServers.length > 0) {
    for (const result of failedServers) {
      console.warn(
        `  ⚠️  删除 ${customKey} 在 ${result.serverUrl} 失败`,
        result.error ?? "unknown error"
      );
    }
    return { status: "deleted", servers };
  }

  if (failedServers.length > 0) {
    throw new Error(
      `删除 ${customKey} 失败: ${failedServers
        .map((result) => `${result.serverUrl}: ${result.error}`)
        .join("; ")}`
    );
  }

  return { status: "missing", servers };
}

export async function deleteRecord(
  baseUrl: string,
  userId: string,
  authToken: string,
  customKey: string,
  options?: DeleteRecordOptions
): Promise<"deleted" | "missing"> {
  const result = await deleteRecordOnServers(baseUrl, userId, authToken, customKey, options);
  return result.status;
}
export async function deleteRecordsBatchOnServers(
  baseUrl: string,
  userId: string,
  authToken: string,
  customKeys: string[],
  options?: DeleteRecordOptions
): Promise<{
  processedCount: number;
  failedCount: number;
}> {
  if (customKeys.length === 0) {
    return { processedCount: 0, failedCount: 0 };
  }
  const serverUrls =
    options?.servers !== undefined
      ? [...new Set(options.servers.map((value) => normalizeBaseUrl(value)))]
      : resolveDeleteServerCandidates(baseUrl);

  const targetServers = serverUrls.length > 0 ? serverUrls : [baseUrl];

  let totalProcessed = 0;
  let totalFailed = 0;

  for (const serverUrl of targetServers) {
    const res = await apiPost(
      `${serverUrl}/api/v1/db/delete-batch`,
      { keys: customKeys },
      authToken
    );
    if (res.status === 200 && (res.data as any)?.processedCount !== undefined) {
      totalProcessed += (res.data as any).processedCount as number;
      totalFailed += ((res.data as any).failedCount as number) ?? 0;
    } else {
      const chunkSize = 20;
      for (let i = 0; i < customKeys.length; i += chunkSize) {
        const chunk = customKeys.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (key) => {
            const single = await deleteRecordOnServer(serverUrl, userId, authToken, key);
            if (single.status === "failed") {
              totalFailed += 1;
            } else {
              totalProcessed += 1;
            }
          })
        );
      }
    }
  }

  return { processedCount: totalProcessed, failedCount: totalFailed };
}

/** 删除一批 agent 记录（私有 key + 公开 key），默认联动所有候选服务器 */
export async function deleteAgentRecords(
  baseUrl: string,
  userId: string,
  authToken: string,
  agentIds: string[],
  options?: DeleteRecordOptions
): Promise<void> {
  const targetServers =
    options?.servers !== undefined
      ? options.servers
      : resolveDeleteServerCandidates(baseUrl);
  const resolvedOptions: DeleteRecordOptions = {
    ...options,
    servers: targetServers,
  };
  if (targetServers.length > 0) {
    console.log(`  删除目标服务器: ${targetServers.join(", ")}`);
  }

  for (const id of agentIds) {
    const privKey = `agent-${userId}-${id}`;
    const pubKey = `agent-pub-${id}`;
    for (const key of [privKey, pubKey]) {
      try {
        const result = await deleteRecord(
          baseUrl,
          userId,
          authToken,
          key,
          resolvedOptions
        );
        if (result === "deleted") {
          console.log("  已删除:", key);
        } else {
          console.log("  已不存在:", key);
        }
      } catch (error) {
        console.warn(
          `  ⚠️  删除 ${key} 失败`,
          error instanceof Error ? error.message : error
        );
      }
    }
  }
}

/** 调用 /api/agent/run，返回 { dialogId, content }。 */
export interface RunAgentOptions {
  spaceId?: string;
  category?: string;
  inheritedFromDialogKey?: string;
  parentDialogId?: string;
  background?: boolean;
  runtimeOptions?: AgentRuntimeOptions;
}

export class AgentRunError extends Error {
  readonly status: number;
  readonly dialogId?: string;
  readonly responseText: string;

  constructor(args: { status: number; responseText: string; dialogId?: string }) {
    const dialogHint = args.dialogId ? ` dialogId=${args.dialogId}` : "";
    super(`agent run 失败 (${args.status})${dialogHint}: ${args.responseText.slice(0, 200)}`);
    this.name = "AgentRunError";
    this.status = args.status;
    this.dialogId = args.dialogId;
    this.responseText = args.responseText;
  }
}

const parseDialogIdFromAgentRunError = (text: string): string | undefined => {
  try {
    const data = JSON.parse(text) as { dialogId?: unknown };
    return asOptionalTrimmedString(data.dialogId);
  } catch {
    // Fall back to a regex below for non-JSON proxy errors.
  }

  const match = text.match(/"dialogId"\s*:\s*"([^"]+)"/);
  return match?.[1];
};

export async function runAgent(
  baseUrl: string,
  authToken: string,
  agentKey: string,
  userInput: string,
  continueDialogIdOrLegacy?: string | number,
  optionsOrContinueDialogId?: RunAgentOptions | string,
  maybeOptions?: RunAgentOptions,
): Promise<{ dialogId: string; content: string; serverBase?: string }> {
  const continueDialogId =
    typeof continueDialogIdOrLegacy === "string"
      ? continueDialogIdOrLegacy
      : typeof optionsOrContinueDialogId === "string"
        ? optionsOrContinueDialogId
        : undefined;
  const options =
    typeof continueDialogIdOrLegacy === "string"
      ? typeof optionsOrContinueDialogId === "object"
        ? optionsOrContinueDialogId
        : undefined
      : typeof optionsOrContinueDialogId === "object"
        ? optionsOrContinueDialogId
        : maybeOptions;
  const inheritedFromDialogKey = options?.inheritedFromDialogKey;
  const parentDialogId = options?.parentDialogId;
  const spaceId = options?.spaceId;
  const category = options?.category;

  const res = await fetch(`${baseUrl}/api/agent/run`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + authToken,
    },
    body: JSON.stringify({
      agentKey,
      userInput,
      runtimeContext: {
        surface: "server-script",
        host: "script",
        runtime: "bun",
        entrypoint: "scripts/helpers/agentHelpers.ts",
        capabilities: ["non-interactive"],
      },
      stream: false,
      ...(options?.background ? { background: true } : {}),
      ...(continueDialogId ? { continueDialogId } : {}),
      ...(spaceId ? { spaceId } : {}),
      ...(category ? { category } : {}),
      ...(inheritedFromDialogKey ? { inheritedFromDialogKey } : {}),
      ...(parentDialogId ? { parentDialogId } : {}),
      ...(options?.runtimeOptions ? { runtimeOptions: options.runtimeOptions } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new AgentRunError({
      status: res.status,
      responseText: text,
      dialogId: parseDialogIdFromAgentRunError(text),
    });
  }

  const json = await res.json() as any;
  const serverBase = asOptionalTrimmedString(json.serverBase);
  return {
    dialogId: json.dialogId ?? "",
    content: json.content ?? "",
    ...(serverBase ? { serverBase } : {}),
  };
}

/**
 * FNV-1a hash → 固定 26 位 ULID 风格 ID
 * 保证同 seed 每次生成相同 ID（幂等）
 */
export function deterministicId(prefix: string, seed: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  const suffix = h.toString(36).toUpperCase().padStart(14, "0");
  return (prefix + suffix).slice(0, 26);
}
