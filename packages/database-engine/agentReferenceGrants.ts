import { isRecord } from "core/isRecord";

export type AgentReferenceGrantDecision = {
  allowed: boolean;
  reason:
    | "missing_agent"
    | "non_public_agent"
    | "unsupported_record"
    | "explicit_agent_grant"
    | "denied";
};

type ReadableStore = {
  get: (key: string) => Promise<any>;
};

const isPublicAgentKey = (agentKey: string): boolean =>
  agentKey.startsWith("agent-pub-");

const isPageRecord = (dbKey: string, record: any): boolean =>
  dbKey.startsWith("page-") || record?.type === "page";

const hasAgentKey = (value: unknown, agentKey: string): boolean => {
  if (Array.isArray(value)) {
    return value.includes(agentKey);
  }
  if (isRecord(value)) {
    const grant = value[agentKey];
    if (grant === true) return true;
    if (isRecord(grant) && grant.read === true) {
      return true;
    }
    return false;
  }
  return false;
};

export const hasExplicitAgentReferenceGrant = (
  record: any,
  agentKey: string,
): boolean =>
  hasAgentKey(record?.agentGrants, agentKey) ||
  hasAgentKey(record?.referenceGrants?.agents, agentKey) ||
  hasAgentKey(record?.grantedAgentKeys, agentKey) ||
  hasAgentKey(record?.readAgentKeys, agentKey);

export async function canReadRecordViaPublicAgentGrant(input: {
  store: ReadableStore;
  dbKey: string;
  record: any;
  agentKey?: string | null;
}): Promise<AgentReferenceGrantDecision> {
  const agentKey = input.agentKey?.trim();
  if (!agentKey) return { allowed: false, reason: "missing_agent" };
  if (!isPublicAgentKey(agentKey)) {
    return { allowed: false, reason: "non_public_agent" };
  }
  if (!isPageRecord(input.dbKey, input.record)) {
    return { allowed: false, reason: "unsupported_record" };
  }
  if (!hasExplicitAgentReferenceGrant(input.record, agentKey)) {
    return { allowed: false, reason: "denied" };
  }

  const agent = await input.store.get(agentKey).catch(() => null);
  if (agent?.isPublic !== true) {
    return { allowed: false, reason: "non_public_agent" };
  }

  return { allowed: true, reason: "explicit_agent_grant" };
}
