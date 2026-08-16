import type { Agent } from "app/types";
import { asOptionalTrimmedString } from "core/optionalString";

const PUBLIC_AGENT_PREFIX = "agent-pub-";

type PublicAgentRecord = Partial<Agent> & Record<string, any>;

const toNonEmptyString = (value: unknown): string | undefined =>
  asOptionalTrimmedString(value);

const parsePublicDbKey = (value: unknown) => {
  const text = toNonEmptyString(value);
  if (!text) return null;
  if (text.startsWith(PUBLIC_AGENT_PREFIX)) {
    return {
      dbKey: text,
      id: text.slice(PUBLIC_AGENT_PREFIX.length),
      type: "agent",
    } as const;
  }
  return null;
};

const buildPublicDbKey = (type: unknown, id: string): string => {
  if (type === "cybot") return "";
  return `${PUBLIC_AGENT_PREFIX}${id}`;
};

export function getPublicAgentId(agent?: PublicAgentRecord | null): string | undefined {
  const directId = toNonEmptyString(agent?.id);
  if (directId) {
    return parsePublicDbKey(directId)?.id ?? directId;
  }
  return parsePublicDbKey(agent?.dbKey)?.id;
}

export function getPublicAgentDbKey(agent?: PublicAgentRecord | null): string | undefined {
  const directDbKey = toNonEmptyString(agent?.dbKey);
  if (directDbKey) {
    // Reject legacy cybot-pub keys
    if (directDbKey.startsWith("cybot-")) return undefined;
    return directDbKey;
  }

  const idAsDbKey = parsePublicDbKey(agent?.id)?.dbKey;
  if (idAsDbKey) return idAsDbKey;

  const id = getPublicAgentId(agent);
  if (!id) return undefined;
  if (toNonEmptyString(agent?.type) === "cybot") return undefined;
  return buildPublicDbKey(agent?.type, id) || undefined;
}

export function getPublicAgentIdentifiers(agent?: PublicAgentRecord | null): string[] {
  const identifiers = [getPublicAgentDbKey(agent), getPublicAgentId(agent)].filter(Boolean);
  return Array.from(new Set(identifiers as string[]));
}

export function matchesPublicAgentIdentifiers(
  agent: PublicAgentRecord | null | undefined,
  identifiers: Set<string>
): boolean {
  return getPublicAgentIdentifiers(agent).some((identifier) => identifiers.has(identifier));
}

export function getPublicAgentPruneDbKey(
  agent?: PublicAgentRecord | null
): string | undefined {
  return getPublicAgentDbKey(agent) ?? getPublicAgentId(agent);
}
