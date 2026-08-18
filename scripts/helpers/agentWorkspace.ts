import { deleteRecord } from "./agentHelpers";
import { apiGet, apiPost } from "./apiHelpers";
import { parseUserIdFromAuthToken, resolveAuthToken } from "./authContext";
import { parseAgentIdFromKey } from "./agentDataHelpers";
import {
  isLocalBaseUrl as isScriptLocalBaseUrl,
  resolveDefaultScriptBaseUrl,
} from "./serverBases";

export type AgentRecord = {
  id?: string;
  dbKey?: string;
  name?: string;
  model?: string;
  userId?: string;
  isPublic?: boolean;
  updatedAt?: string | number;
  createdAt?: string | number;
  created?: string | number;
  type?: string;
  tools?: string[];
  [key: string]: unknown;
};

export type ListedAgent = {
  id: string;
  privateKey: string;
  publicKey: string;
  name: string;
  model: string;
  updatedAt: string | number | null;
  isPublicFlag: boolean;
  publicRecordExists: boolean;
  type: string | null;
  tools: string[];
};

export type AgentWorkspaceContext = {
  baseUrl: string;
  authToken: string;
  userId: string;
};
let preferLocalDb = false;

export function defaultBaseUrl() {
  return resolveDefaultScriptBaseUrl();
}

export const isLocalBaseUrl = isScriptLocalBaseUrl;

export function resolveAgentWorkspaceContext(): AgentWorkspaceContext {
  const authToken = resolveAuthToken();
  const userId = parseUserIdFromAuthToken(authToken);
  if (!userId) {
    throw new Error("无法从 AUTH_TOKEN 解析 userId。请先设置有效 AUTH_TOKEN。");
  }
  return {
    baseUrl: defaultBaseUrl(),
    authToken,
    userId,
  };
}

export function formatTs(value: string | number | null): string {
  if (value == null) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

function buildCompanionKeys(rawId: string, userId: string) {
  return {
    privateKey: `agent-${userId}-${rawId}`,
    publicKey: `agent-pub-${rawId}`,
  };
}

function parseRecordId(privateKey: string, explicitId?: string) {
  if (explicitId) return explicitId;
  return parseAgentIdFromKey(privateKey);
}

async function queryUserRecordsFromLocalDb(
  userId: string,
  type: "agent"
): Promise<AgentRecord[]> {
  const [{ ensureServerDbOpen, default: serverDb }, { createAgentKey }] =
    await Promise.all([
      import("../../packages/database-engine/db"),
      import("../../packages/database/keys"),
    ]);

  await ensureServerDbOpen();

  const range = createAgentKey.rangeOfUser(userId);

  const records: AgentRecord[] = [];
  for await (const [key, value] of serverDb.iterator({ gte: range.start, lte: range.end })) {
    if (value && typeof value === "object") {
      records.push({
        ...(value as AgentRecord),
        dbKey: typeof (value as AgentRecord).dbKey === "string"
          ? (value as AgentRecord).dbKey
          : String(key),
      });
    }
  }
  return records;
}

async function hasRecordInLocalDb(dbKey: string): Promise<boolean> {
  const [{ ensureServerDbOpen, default: serverDb }] = await Promise.all([
    import("../../packages/database-engine/db"),
  ]);
  await ensureServerDbOpen();
  try {
    const record = await serverDb.get(dbKey);
    return !!record;
  } catch {
    return false;
  }
}

async function readRecordFromLocalDb<T = Record<string, unknown>>(dbKey: string): Promise<T | null> {
  const [{ ensureServerDbOpen, default: serverDb }] = await Promise.all([
    import("../../packages/database-engine/db"),
  ]);
  await ensureServerDbOpen();
  try {
    return await serverDb.get(dbKey) as T;
  } catch {
    return null;
  }
}

async function putRecordToLocalDb(dbKey: string, data: Record<string, unknown>): Promise<void> {
  const [{ ensureServerDbOpen, default: serverDb }] = await Promise.all([
    import("../../packages/database-engine/db"),
  ]);
  await ensureServerDbOpen();
  await serverDb.put(dbKey, { ...data, dbKey });
}

async function deleteRecordFromLocalDb(dbKey: string): Promise<void> {
  const [{ ensureServerDbOpen, default: serverDb }] = await Promise.all([
    import("../../packages/database-engine/db"),
  ]);
  await ensureServerDbOpen();
  await serverDb.del(dbKey);
}

async function queryUserRecords(
  context: AgentWorkspaceContext,
  type: "agent"
) {
  if (preferLocalDb && isLocalBaseUrl(context.baseUrl)) {
    return queryUserRecordsFromLocalDb(context.userId, type);
  }
  try {
    const res = await apiPost<{ data?: { data?: AgentRecord[] } }>(
      `${context.baseUrl}/api/v1/db/query/${encodeURIComponent(context.userId)}`,
      { type },
      context.authToken
    );
    if (!res.ok) {
      throw new Error(`query ${type} failed (${res.status}): ${JSON.stringify(res.data)}`);
    }
    return res.data?.data?.data ?? [];
  } catch (error) {
    if (isLocalBaseUrl(context.baseUrl)) {
      preferLocalDb = true;
      return queryUserRecordsFromLocalDb(context.userId, type);
    }
    throw error;
  }
}

export async function readDbRecord<T = Record<string, unknown>>(
  context: AgentWorkspaceContext,
  dbKey: string
): Promise<T | null> {
  if (preferLocalDb && isLocalBaseUrl(context.baseUrl)) {
    return readRecordFromLocalDb<T>(dbKey);
  }
  try {
    const res = await apiGet<T>(
      `${context.baseUrl}/api/v1/db/read/${encodeURIComponent(dbKey)}`,
      context.authToken
    );
    if (!res.ok) return null;
    return ((res.data as any)?.data ?? res.data) as T;
  } catch (error) {
    if (isLocalBaseUrl(context.baseUrl)) {
      preferLocalDb = true;
      return readRecordFromLocalDb<T>(dbKey);
    }
    throw error;
  }
}

export async function writeDbRecord(
  context: AgentWorkspaceContext,
  dbKey: string,
  data: Record<string, unknown>
): Promise<void> {
  if (preferLocalDb && isLocalBaseUrl(context.baseUrl)) {
    await putRecordToLocalDb(dbKey, data);
    return;
  }
  try {
    const res = await apiPost(
      `${context.baseUrl}/api/v1/db/write/`,
      { data: { ...data, dbKey }, customKey: dbKey, userId: context.userId },
      context.authToken
    );
    if (res.status !== 200 && res.status !== 201) {
      throw new Error(`写入 ${dbKey} 失败 (${res.status}): ${JSON.stringify(res.data)}`);
    }
  } catch (error) {
    if (isLocalBaseUrl(context.baseUrl)) {
      preferLocalDb = true;
      await putRecordToLocalDb(dbKey, data);
      return;
    }
    throw error;
  }
}

export async function deleteDbRecord(
  context: AgentWorkspaceContext,
  dbKey: string
): Promise<"deleted" | "missing"> {
  let localStatus: "deleted" | "missing" = "missing";
  if (isLocalBaseUrl(context.baseUrl)) {
    try {
      if (await hasRecordInLocalDb(dbKey)) {
        await deleteRecordFromLocalDb(dbKey);
        localStatus = "deleted";
      }
    } catch {
      preferLocalDb = true;
    }
  }

  const remoteStatus = await deleteRecord(
    context.baseUrl,
    context.userId,
    context.authToken,
    dbKey
  );
  return remoteStatus === "deleted" || localStatus === "deleted" ? "deleted" : "missing";
}

async function hasReadablePublicRecord(context: AgentWorkspaceContext, publicKey: string) {
  if (preferLocalDb && isLocalBaseUrl(context.baseUrl)) {
    return hasRecordInLocalDb(publicKey);
  }
  try {
    const res = await apiGet<any>(
      `${context.baseUrl}/api/v1/db/read/${encodeURIComponent(publicKey)}`,
      context.authToken
    );
    return res.ok && !!((res.data as any)?.data ?? res.data);
  } catch (error) {
    if (isLocalBaseUrl(context.baseUrl)) {
      preferLocalDb = true;
      return hasRecordInLocalDb(publicKey);
    }
    throw error;
  }
}

function normalizeListedAgent(record: AgentRecord): ListedAgent | null {
  const privateKey = typeof record.dbKey === "string" ? record.dbKey : "";
  const rawId = parseRecordId(
    privateKey,
    typeof record.id === "string" && record.id ? record.id : undefined
  );
  if (!rawId || !privateKey) return null;

  const ownerUserId = typeof record.userId === "string" && record.userId
    ? record.userId
    : "";
  const keys = buildCompanionKeys(rawId, ownerUserId);

  return {
    id: rawId,
    privateKey,
    publicKey: keys.publicKey,
    name: typeof record.name === "string" && record.name ? record.name : "(unnamed)",
    model: typeof record.model === "string" && record.model ? record.model : "-",
    updatedAt:
      typeof record.updatedAt === "string" || typeof record.updatedAt === "number"
        ? record.updatedAt
        : typeof record.createdAt === "string" || typeof record.createdAt === "number"
          ? record.createdAt
          : typeof record.created === "string" || typeof record.created === "number"
            ? record.created
            : null,
    isPublicFlag: !!record.isPublic,
    publicRecordExists: false,
    type: typeof record.type === "string" ? record.type : null,
    tools: Array.isArray(record.tools)
      ? record.tools.filter((tool): tool is string => typeof tool === "string")
      : [],
  };
}

export async function listOwnedAgents(
  context: AgentWorkspaceContext,
  options?: { publicOnly?: boolean }
): Promise<ListedAgent[]> {
  const recordGroups = [await queryUserRecords(context, "agent")];

  const agents = recordGroups
    .flat()
    .map(normalizeListedAgent)
    .filter((item): item is ListedAgent => item != null);

  agents.sort((a, b) => {
    const ta = a.updatedAt == null ? 0 : new Date(a.updatedAt).getTime();
    const tb = b.updatedAt == null ? 0 : new Date(b.updatedAt).getTime();
    return tb - ta;
  });

  await Promise.all(
    agents.map(async (agent) => {
      agent.publicRecordExists = await hasReadablePublicRecord(context, agent.publicKey);
    })
  );

  return options?.publicOnly
    ? agents.filter((agent) => agent.publicRecordExists)
    : agents;
}
