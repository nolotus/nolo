import type { AccessAction } from "./resourceAccess";
import * as dbModule from "./db";
import { getAuthorityStoreCompat } from "./dbCompat";

export type AgentDelegation = {
  principalUserId: string;
  agentId: string;
  scopes?: string[];
  spaceIds?: string[];
  resourcePrefixes?: string[];
  expiresAt?: string | number | null;
  revokedAt?: string | number | null;
};

export const agentDelegationKey = (
  principalUserId: string,
  agentId: string
) => `agent-delegation-${principalUserId}-${agentId}`;

export const scopeForAction = (
  action: AccessAction,
  resource?: { dbKey?: string; record?: any }
): string => {
  const dbKey = resource?.dbKey || resource?.record?.dbKey || "";
  if (dbKey.startsWith("email-") || resource?.record?.type === "email") {
    switch (action) {
      case "read":
        return "email:read";
      case "write":
        return "email:send";
      case "delete":
        return "email:delete";
      case "manage":
        return "email:manage";
    }
  }

  switch (action) {
    case "read":
      return "db:read";
    case "write":
      return "db:write";
    case "delete":
      return "db:delete";
    case "manage":
      return "db:write";
  }
};

const normalizeSpaceId = (spaceId?: unknown): string | null => {
  if (typeof spaceId !== "string") return null;
  const trimmed = spaceId.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("space-") ? trimmed.slice("space-".length) : trimmed;
};

const isPast = (value?: string | number | null): boolean => {
  if (value == null) return false;
  const timestamp =
    typeof value === "number" ? value : new Date(value).getTime();
  return Number.isFinite(timestamp) && Date.now() > timestamp;
};

export async function loadAgentDelegation(
  principalUserId: string,
  agentId: string
): Promise<AgentDelegation | null> {
  const store = getAuthorityStoreCompat(dbModule);
  if (!principalUserId || !agentId) return null;
  try {
    const delegation = await store.get(
      agentDelegationKey(principalUserId, agentId)
    );
    return delegation || null;
  } catch {
    return null;
  }
}

export function validateAgentDelegation({
  delegation,
  action,
  dbKey,
  record,
  spaceId,
}: {
  delegation: AgentDelegation | null;
  action: AccessAction;
  dbKey: string;
  record?: any;
  spaceId?: string | null;
}): { allowed: boolean; reason?: string } {
  if (!delegation) return { allowed: false, reason: "missing_delegation" };
  if (delegation.revokedAt != null) {
    return { allowed: false, reason: "delegation_revoked" };
  }
  if (isPast(delegation.expiresAt)) {
    return { allowed: false, reason: "delegation_expired" };
  }

  const scopes = Array.isArray(delegation.scopes) ? delegation.scopes : [];
  if (!scopes.includes(scopeForAction(action, { dbKey, record }))) {
    return { allowed: false, reason: "delegation_scope_denied" };
  }

  const prefixes = Array.isArray(delegation.resourcePrefixes)
    ? delegation.resourcePrefixes
    : [];
  const hasPrefixAccess = prefixes.some(
    (prefix) => typeof prefix === "string" && dbKey.startsWith(prefix)
  );

  const normalizedSpaceId = normalizeSpaceId(spaceId);
  const spaceIds = Array.isArray(delegation.spaceIds)
    ? delegation.spaceIds.map(normalizeSpaceId).filter(Boolean)
    : [];
  const hasSpaceAccess = Boolean(
    normalizedSpaceId && spaceIds.includes(normalizedSpaceId)
  );

  if (!hasPrefixAccess && !hasSpaceAccess) {
    return { allowed: false, reason: "delegation_resource_denied" };
  }

  return { allowed: true };
}
