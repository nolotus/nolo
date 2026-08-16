import { createAgentGrantKey } from "database/keys";
import { asOptionalTrimmedString } from "core/optionalString";

export type AgentGrantRecord = {
  type: "agent-grant";
  ownerUserId: string;
  agentId: string;
  agentKey: string;
  granteeUserId: string;
  createdAt: number;
  revokedAt?: number;
};

export type AgentGrantStore = {
  get: (key: string) => Promise<unknown>;
  put: (key: string, value: unknown) => Promise<unknown>;
  iterator?: (options: { gte: string; lte: string }) => AsyncIterable<[string, unknown]>;
};

/**
 * 判断 AgentGrantRecord 是否处于有效（未撤销）状态。
 * 纯函数：记录存在、type 为 "agent-grant"、revokedAt 为空/0 才算有效。
 */
export function isAgentGrantActive(record: unknown): record is AgentGrantRecord {
  if (!record || typeof record !== "object") return false;
  const r = record as Partial<AgentGrantRecord>;
  if (r.type !== "agent-grant") return false;
  if (typeof r.ownerUserId !== "string" || !r.ownerUserId) return false;
  if (typeof r.agentId !== "string" || !r.agentId) return false;
  if (typeof r.granteeUserId !== "string" || !r.granteeUserId) return false;
  if (r.revokedAt && r.revokedAt > 0) return false;
  return true;
}

/**
 * 从 store 读取生效中的 Agent Grant (点查)
 * Best-effort 保护：读不到、已撤销或 store 抛错统一返回 null，决不把请求打挂。
 */
export async function readActiveAgentGrant(
  store: { get: (key: string) => Promise<unknown> } | null | undefined,
  params: { ownerUserId: string; agentId: string; granteeUserId: string }
): Promise<AgentGrantRecord | null> {
  if (!store || typeof store.get !== "function") return null;
  const { ownerUserId, agentId, granteeUserId } = params;
  if (!ownerUserId || !agentId || !granteeUserId) return null;

  try {
    const key = createAgentGrantKey.single(ownerUserId, agentId, granteeUserId);
    const record = await store.get(key);
    if (isAgentGrantActive(record)) {
      return record;
    }
    return null;
  } catch (_err) {
    // Best-effort 保护
    return null;
  }
}

export async function upsertAgentGrant(
  store: AgentGrantStore,
  params: {
    ownerUserId: string;
    agentId: string;
    agentKey: string;
    granteeUserId: string;
    now?: number;
  }
): Promise<AgentGrantRecord> {
  const ownerUserId = asOptionalTrimmedString(params.ownerUserId);
  const agentId = asOptionalTrimmedString(params.agentId);
  const agentKey = asOptionalTrimmedString(params.agentKey);
  const granteeUserId = asOptionalTrimmedString(params.granteeUserId);
  if (!ownerUserId || !agentId || !agentKey || !granteeUserId) {
    throw new Error("upsertAgentGrant requires ownerUserId, agentId, agentKey, granteeUserId");
  }
  if (ownerUserId === granteeUserId) {
    throw new Error("Cannot grant an agent to its owner");
  }

  const now = params.now ?? Date.now();
  const key = createAgentGrantKey.single(ownerUserId, agentId, granteeUserId);
  let createdAt = now;
  try {
    const existing = await store.get(key);
    if (
      existing &&
      typeof existing === "object" &&
      typeof (existing as AgentGrantRecord).createdAt === "number" &&
      Number.isFinite((existing as AgentGrantRecord).createdAt)
    ) {
      createdAt = (existing as AgentGrantRecord).createdAt;
    }
  } catch {
    // missing is fine
  }

  const record: AgentGrantRecord = {
    type: "agent-grant",
    ownerUserId,
    agentId,
    agentKey,
    granteeUserId,
    createdAt,
  };
  await store.put(key, record);
  return record;
}

export async function revokeAgentGrant(
  store: AgentGrantStore,
  params: {
    ownerUserId: string;
    agentId: string;
    granteeUserId: string;
    now?: number;
  }
): Promise<AgentGrantRecord | null> {
  const ownerUserId = asOptionalTrimmedString(params.ownerUserId);
  const agentId = asOptionalTrimmedString(params.agentId);
  const granteeUserId = asOptionalTrimmedString(params.granteeUserId);
  if (!ownerUserId || !agentId || !granteeUserId) return null;

  const key = createAgentGrantKey.single(ownerUserId, agentId, granteeUserId);
  let existing: unknown = null;
  try {
    existing = await store.get(key);
  } catch {
    return null;
  }
  if (!existing || typeof existing !== "object") return null;

  const now = params.now ?? Date.now();
  const record = {
    ...(existing as AgentGrantRecord),
    revokedAt: now,
  } as AgentGrantRecord;
  await store.put(key, record);
  return record;
}

export async function listAgentGrants(
  store: AgentGrantStore,
  params: {
    ownerUserId: string;
    agentId: string;
    includeRevoked?: boolean;
  }
): Promise<AgentGrantRecord[]> {
  const ownerUserId = asOptionalTrimmedString(params.ownerUserId);
  const agentId = asOptionalTrimmedString(params.agentId);
  if (!ownerUserId || !agentId) return [];
  if (typeof store.iterator !== "function") return [];

  const range = createAgentGrantKey.rangeOfAgent(ownerUserId, agentId);
  const out: AgentGrantRecord[] = [];
  try {
    for await (const [, value] of store.iterator({
      gte: range.start,
      lte: range.end,
    })) {
      if (!value || typeof value !== "object") continue;
      const record = value as AgentGrantRecord;
      if (record.type !== "agent-grant") continue;
      if (!params.includeRevoked && !isAgentGrantActive(record)) continue;
      out.push(record);
    }
  } catch {
    return out;
  }
  out.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return out;
}
