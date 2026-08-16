import type { Agent } from "app/types";
import { getModelPricing } from "ai/llm/getPricing";
import { getModelConfig } from "ai/llm/providers";
import { supportsImageGeneration } from "ai/agent/utils/imageOutput";
import { buildSortMeta, sortAgents, toTimeMs, type MAgent } from "ai/agent/utils/sortUtils";
import {
  getPublicAgentId,
  getPublicAgentIdentifiers,
} from "ai/agent/publicAgentIdentity";
import { asOptionalFiniteNumber } from "core/optionalNumber";
import { asOptionalTrimmedString } from "core/optionalString";
import { asRecordOrEmpty } from "core/recordOrEmpty";
import { asTrimmedString } from "core/trimmedString";
import { getRecordTimestamp } from "database/tombstones";

export type PublicAgentSortBy =
  | "recommended"
  | "newest"
  | "popular"
  | "rating"
  | "outputPriceAsc"
  | "outputPriceDesc"
  | "favorite";

export interface PublicAgentFilterOptions {
  searchName?: string;
  userId?: string;
  imageOutputOnly?: boolean;
  toolName?: string;
}

export interface PublicAgentListOptions {
  limit?: number;
  sortBy?: PublicAgentSortBy;
  summary?: boolean;
}

export type PublicAgentQueryOptions = PublicAgentFilterOptions & PublicAgentListOptions;

type PublicAgentRecord = Partial<Agent> & Record<string, any>;

const GPT_IMAGE_TOOL_NAMES = new Set([
  "openAIGptImage",
  "openAIGptImageGenerate",
  "openAIGptImageEdit",
]);

const shouldUsePlatformPricing = (agent: PublicAgentRecord): boolean => {
  const provider = asTrimmedString(agent.provider);
  if (!provider || provider === "custom") return false;
  const customProviderUrl = asTrimmedString(agent.customProviderUrl);
  if (customProviderUrl) return false;
  const apiSource = asTrimmedString(agent.apiSource);
  return !apiSource || apiSource === "platform";
};

const shouldApplyPlatformPriceFloor = (agent: PublicAgentRecord): boolean => {
  const provider = asTrimmedString(agent.provider);
  if (!provider || provider === "custom") return false;
  const apiSource = asTrimmedString(agent.apiSource);
  const customProviderUrl = asTrimmedString(agent.customProviderUrl);
  return apiSource === "custom" || !!customProviderUrl;
};

const maxNumber = (value: unknown, floor: number) => {
  const finite = asOptionalFiniteNumber(value);
  return finite !== undefined ? Math.max(finite, floor) : floor;
};

export function normalizePublicAgentPlatformPricing<T extends PublicAgentRecord>(
  agent: T
): T {
  const provider = asTrimmedString(agent.provider);
  const model = asTrimmedString(agent.model);
  if (!provider || !model) return agent;

  const usePlatformPricing = shouldUsePlatformPricing(agent);
  const applyPlatformPriceFloor = shouldApplyPlatformPriceFloor(agent);
  if (!usePlatformPricing && !applyPlatformPriceFloor) return agent;

  let next: PublicAgentRecord = agent;
  try {
    const pricing = getModelPricing(provider, model);
    const modelConfig = getModelConfig(provider as any, model);
    if (pricing && usePlatformPricing) {
      next = {
        ...next,
        inputPrice: pricing.inputPrice,
        outputPrice: pricing.outputPrice,
        hasVision: agent.hasVision ?? !!modelConfig.hasVision,
      };
    } else if (pricing && applyPlatformPriceFloor) {
      next = {
        ...next,
        inputPrice: maxNumber(agent.inputPrice, pricing.inputPrice),
        outputPrice: maxNumber(agent.outputPrice, pricing.outputPrice),
      };
    }
  } catch {
    // Keep persisted pricing when the provider/model is unknown to the current registry.
  }

  const tools = Array.isArray(agent.tools) ? agent.tools : [];
  const usesOpenAIImageTool = tools.some(
    (tool) => typeof tool === "string" && GPT_IMAGE_TOOL_NAMES.has(tool)
  );
  const imageModel =
    asOptionalTrimmedString(agent.imageModel) ??
    (usesOpenAIImageTool ? "gpt-image-2" : "");

  if (usePlatformPricing && provider === "openai" && imageModel === "gpt-image-2") {
    next = {
      ...next,
      imageModel,
      imageConfig: {
        ...asRecordOrEmpty(agent.imageConfig),
        enabled: true,
      },
      hasImageOutput: agent.hasImageOutput ?? true,
    };
  }

  return next as T;
}

export function preparePublicAgentCatalogRecords(agents: Agent[]): Agent[] {
  return agents
    .map((agent) => normalizePublicAgentPlatformPricing(agent));
}

const CATALOG_SUMMARY_FIELDS = new Set([
  "dbKey",
  "id",
  "type",
  "userId",
  "name",
  "title",
  "displayName",
  "introduction",
  "tags",
  "tools",
  "provider",
  "model",
  "cliProvider",
  "apiSource",
  "hasVision",
  "hasImageOutput",
  "cover",
  "avatarFileId",
  "inputPrice",
  "outputPrice",
  "imageModel",
  "imageConfig",
  "imageWorkflow",
  "pricing",
  "metrics",
  "runtimeBinding",
  "runtimeServerBase",
  "spaceId",
  "isPublic",
  "allowFork",
  "createdAt",
  "updatedAt",
  "created",
  "updated_at",
  "deletedAt",
  "originServer",
  "__sort",
]);

function toPublicAgentCatalogSummary(agent: Agent): Agent {
  const summary: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(agent as Record<string, unknown>)) {
    if (CATALOG_SUMMARY_FIELDS.has(key)) summary[key] = value;
  }
  return summary as Agent;
}

export function shouldPruneStalePublicAgentCache({
  searchName,
}: {
  searchName?: string;
}) {
  return !searchName;
}

export function dedupeRemotePublicAgents(remoteAgents: Agent[]): Agent[] {
  const remoteMap = new Map<string, Agent>();
  for (const agent of remoteAgents) {
    const logicalId = getPublicAgentId(agent) ?? String(agent.id ?? "");
    if (!logicalId) continue;
    const existing = remoteMap.get(logicalId);
    if (!existing || getRecordTimestamp(agent) > getRecordTimestamp(existing)) {
      remoteMap.set(logicalId, agent);
    }
  }
  return Array.from(remoteMap.values());
}

export function maskRemoteAgentsByLocalTombstones(
  remoteAgents: Agent[],
  tombstones: Array<Record<string, any>>,
  options: { currentUserId?: string | null } = {}
): Agent[] {
  const tombstoneMap = new Map<string, Record<string, any>>();
  for (const tombstone of tombstones) {
    for (const identifier of getPublicAgentIdentifiers(tombstone)) {
      const existing = tombstoneMap.get(identifier);
      if (!existing || getRecordTimestamp(tombstone) > getRecordTimestamp(existing)) {
        tombstoneMap.set(identifier, tombstone);
      }
    }
  }

  return remoteAgents.filter((agent) => {
    const matchingTombstones = getPublicAgentIdentifiers(agent)
      .map((identifier) => tombstoneMap.get(identifier))
      .filter((tombstone): tombstone is Record<string, any> => {
        if (!tombstone) return false;
        if (!options.currentUserId) return true;
        return (
          tombstone.userId === options.currentUserId &&
          agent.userId === options.currentUserId
        );
      });
    if (matchingTombstones.length === 0) return true;
    const newestLocalTombstone = matchingTombstones.reduce((latest, current) =>
      getRecordTimestamp(current) > getRecordTimestamp(latest) ? current : latest
    );
    return getRecordTimestamp(agent) > getRecordTimestamp(newestLocalTombstone);
  });
}

export function mergePublicAgentSources(localData: Agent[], remoteData: Agent[]) {
  const remoteById = new Map<string, Agent>();
  for (const remote of remoteData) {
    const logicalId = getPublicAgentId(remote);
    if (logicalId) {
      remoteById.set(logicalId, remote);
    }
  }

  const merged: MAgent[] = [];
  const toDeleteIds: string[] = [];

  for (const local of localData) {
    const logicalId = getPublicAgentId(local) ?? String(local.id ?? "");
    if (!logicalId) continue;
    const remote = remoteById.get(logicalId);

    if (remote) {
      const localTimestamp = getRecordTimestamp(local);
      const remoteTimestamp = getRecordTimestamp(remote);
      const newest =
        remoteTimestamp >= localTimestamp
          ? { ...(local as any), ...(remote as any) }
          : { ...(remote as any), ...(local as any) };
      merged.push({
        ...newest,
        __sort: buildSortMeta(local, remote),
      });
      continue;
    }

    toDeleteIds.push(logicalId);
    merged.push({
      ...(local as any),
      __sort: buildSortMeta(local, undefined),
    });
  }

  for (const remote of remoteData) {
    const logicalId = getPublicAgentId(remote);
    if (!logicalId) continue;
    const exists = merged.some((agent) => getPublicAgentId(agent) === logicalId);
    if (!exists) {
      merged.push({ ...(remote as any), __sort: buildSortMeta(undefined, remote) });
    }
  }

  return { merged, toDeleteIds };
}

export function planStalePublicAgentPrunes({
  localAgents,
  toDeleteIds,
  currentUserId,
  nowMs = Date.now(),
}: {
  localAgents: Agent[];
  toDeleteIds: string[];
  currentUserId?: string | null;
  nowMs?: number;
}) {
  return toDeleteIds.filter((id) => {
    const localItem = localAgents.find((agent) => getPublicAgentId(agent) === id) as
      | PublicAgentRecord
      | undefined;

    if (currentUserId && localItem?.userId === currentUserId) return false;

    const isRecentlyCreated = nowMs - toTimeMs(localItem?.createdAt) < 5 * 60 * 1000;
    if (isRecentlyCreated) return false;

    return localItem?.meta?.origin !== "local";
  });
}

export function planPublicAgentCatalogView({
  localAgents,
  remoteAgents,
  hasAuthoritativeRemoteResult,
  currentUserId,
  options = {},
}: {
  localAgents: Agent[];
  remoteAgents: Agent[];
  hasAuthoritativeRemoteResult: boolean;
  currentUserId?: string | null;
  options?: PublicAgentQueryOptions;
}) {
  const localFallbackAgents = buildPublicAgentCatalogList({
    ...options,
    agents: localAgents,
  });
  const { merged, toDeleteIds } = mergePublicAgentSources(localAgents, remoteAgents);
  const staleIdsToHide = hasAuthoritativeRemoteResult ? toDeleteIds : [];
  const staleIdsToHideSet = new Set(staleIdsToHide);
  const visibleAgents = buildPublicAgentCatalogList({
    ...options,
    agents: (merged as Agent[]).filter(
      (agent) => !staleIdsToHideSet.has(getPublicAgentId(agent) ?? "")
    ),
  });
  const pruneIds = planStalePublicAgentPrunes({
    localAgents,
    toDeleteIds,
    currentUserId,
  });

  return {
    visibleAgents,
    localFallbackAgents,
    staleIdsToHide,
    pruneIds,
  };
}

export function filterPublicAgentRecords(
  agents: Agent[],
  {
    searchName,
    userId,
    imageOutputOnly = false,
    toolName,
  }: PublicAgentFilterOptions = {}
): Agent[] {
  let results = [...agents];

  if (searchName) {
    const kw = searchName.toLowerCase();
    results = results.filter((agent) => {
      const nameMatch = agent.name?.toLowerCase().includes(kw);
      const introMatch = agent.introduction?.toLowerCase().includes(kw);
      const tagMatch = agent.tags?.some((tag) => tag.toLowerCase().includes(kw));
      return nameMatch || introMatch || tagMatch;
    });
  }

  if (userId) {
    results = results.filter((agent) => agent.userId === userId);
  }

  if (imageOutputOnly) {
    results = results.filter((agent) => supportsImageGeneration(agent));
  }

  if (toolName) {
    const kw = toolName.toLowerCase();
    results = results.filter((agent) =>
      agent.tools?.some((tool) => tool.toLowerCase().includes(kw))
    );
  }

  return results;
}

export function buildPublicAgentCatalogList({
  agents,
  sortBy = "recommended",
  limit,
  summary = false,
  searchName,
  userId,
  imageOutputOnly = false,
  toolName,
}: {
  agents: Agent[];
} & PublicAgentFilterOptions &
  PublicAgentListOptions) {
  const filtered = filterPublicAgentRecords(preparePublicAgentCatalogRecords(agents), {
    searchName,
    userId,
    imageOutputOnly,
    toolName,
  });
  const sorted = sortAgents(filtered, sortBy);
  const limited = typeof limit === "number" ? sorted.slice(0, limit) : sorted;
  return summary ? limited.map((agent) => toPublicAgentCatalogSummary(agent)) : limited;
}
