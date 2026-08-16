import type { Agent } from "app/types";

/**
 * SPA navigation state for AgentCard/AgentBlock → AgentPage.
 *
 * Public plaza lists often load with `summary: true` and do not seed Redux.
 * Without a handoff, AgentPage paints a loading shell that has no matching
 * view-transition names — shared-element morph dies and the user only sees
 * a skeleton flash.
 */
export const AGENT_NAV_PREVIEW_STATE_KEY = "agentPreview" as const;

/** Lightweight card snapshot carried in location.state for first paint + VT. */
export type AgentNavPreview = Partial<Agent> & {
  id?: string;
  dbKey?: string;
  name?: string;
};

export const buildAgentNavPreview = (item: Agent): AgentNavPreview => {
  const key = item.dbKey || item.id;
  return {
    id: item.id,
    dbKey: typeof key === "string" ? key : undefined,
    name: item.name,
    introduction: item.introduction,
    hasVision: item.hasVision,
    model: item.model,
    provider: item.provider,
    cliProvider: item.cliProvider,
    apiSource: item.apiSource,
    outputPrice: item.outputPrice,
    inputPrice: item.inputPrice,
    userId: item.userId,
    spaceId: item.spaceId,
    avatarFileId: item.avatarFileId,
    authorityServer: item.authorityServer,
    originServer: item.originServer,
    customProviderUrl: item.customProviderUrl,
    runtimeBinding: item.runtimeBinding,
    isPublic: item.isPublic,
    useServerProxy: item.useServerProxy,
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
  };
};

export const buildAgentNavLocationState = (
  item: Agent
): { [AGENT_NAV_PREVIEW_STATE_KEY]: AgentNavPreview } => ({
  [AGENT_NAV_PREVIEW_STATE_KEY]: buildAgentNavPreview(item),
});

/** Resolve a matching preview from router location.state, or undefined. */
export const resolveAgentNavPreview = (
  state: unknown,
  agentKey: string
): Agent | undefined => {
  if (!state || typeof state !== "object") return undefined;
  const preview = (state as Record<string, unknown>)[AGENT_NAV_PREVIEW_STATE_KEY];
  if (!preview || typeof preview !== "object") return undefined;

  const record = preview as AgentNavPreview;
  const key =
    (typeof record.dbKey === "string" && record.dbKey) ||
    (typeof record.id === "string" && record.id) ||
    "";
  if (!key) return undefined;
  if (key !== agentKey) return undefined;

  return record as Agent;
};
