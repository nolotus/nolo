import {
  cacheMergedUserDataThunk
} from "/public/assets/chunks/chunk-GYU2TA6X.js";
import {
  getPublicAgentId,
  getPublicAgentIdentifiers,
  getPublicAgentPruneDbKey,
  matchesPublicAgentIdentifiers
} from "/public/assets/chunks/chunk-4JMBIZX5.js";
import {
  require_browser
} from "/public/assets/chunks/chunk-2CATDSNY.js";
import {
  supportsImageGeneration
} from "/public/assets/chunks/chunk-M5DXP5RW.js";
import {
  getModelPricing
} from "/public/assets/chunks/chunk-5IJJ57JD.js";
import {
  getDb
} from "/public/assets/chunks/chunk-IHMA4QTO.js";
import {
  useUserId
} from "/public/assets/chunks/chunk-4C6PJRJA.js";
import {
  useAppDispatch,
  useAppSelector
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  asRecordOrEmpty,
  getAllServers,
  getRecordTimestamp,
  isAbortError,
  isTombstoneRecord,
  pubAgentKeys,
  remove,
  selectCurrentServer,
  selectSyncServers
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  asTrimmedString
} from "/public/assets/chunks/chunk-PN3BZAFX.js";
import {
  asOptionalTrimmedString
} from "/public/assets/chunks/chunk-SM3EH4JD.js";
import {
  getModelConfig
} from "/public/assets/chunks/chunk-LPS7IE46.js";
import {
  asOptionalFiniteNumber
} from "/public/assets/chunks/chunk-RUG5F6GD.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/ai/agent/hooks/usePublicAgents.ts
var import_react = __toESM(require_react());

// packages/ai/agent/hooks/fetchPublicAgents.ts
var import_pino = __toESM(require_browser());

// packages/ai/agent/utils/sortUtils.ts
var RECOMMENDED_COMPLETENESS_WEIGHTS = {
  name: 0.1,
  introduction: 0.45,
  cover: 0.2,
  tags: 0.15,
  tools: 0.1,
  greeting: 0.1
};
var RECOMMENDED_FRESHNESS_BUCKETS = [
  { maxAgeDays: 3, score: 1 },
  { maxAgeDays: 7, score: 0.7 },
  { maxAgeDays: 21, score: 0.35 },
  { maxAgeDays: 45, score: 0.15 }
];
var RECOMMENDED_COLD_START_BUCKETS = [
  { maxFavoriteCount: 0, maxAgeDays: 7, score: 0.75 },
  { maxFavoriteCount: 2, maxAgeDays: 14, score: 0.35 }
];
var RECOMMENDED_SCORE_WEIGHTS = {
  favoriteLogWeight: 4,
  freshnessWeight: 2,
  completenessWeight: 1.5
};
function toTimeMs(t) {
  if (typeof t === "number") return t;
  const n = Date.parse(String(t ?? 0));
  return Number.isFinite(n) ? n : 0;
}
function firstFiniteNumber(...values) {
  for (const value of values) {
    const parsed = typeof value === "number" ? value : parseFloat(String(value));
    if (Number.isFinite(parsed)) return parsed;
  }
  return void 0;
}
function hasNonEmptyText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function getCompletenessScore(agent) {
  if (!agent) return 0;
  let score = 0;
  if (hasNonEmptyText(agent.name)) score += RECOMMENDED_COMPLETENESS_WEIGHTS.name;
  if (hasNonEmptyText(agent.introduction)) {
    score += RECOMMENDED_COMPLETENESS_WEIGHTS.introduction;
  }
  if (hasNonEmptyText(agent.cover)) score += RECOMMENDED_COMPLETENESS_WEIGHTS.cover;
  if (Array.isArray(agent.tags) && agent.tags.length > 0) {
    score += RECOMMENDED_COMPLETENESS_WEIGHTS.tags;
  }
  if (Array.isArray(agent.tools) && agent.tools.length > 0) {
    score += RECOMMENDED_COMPLETENESS_WEIGHTS.tools;
  }
  if (hasNonEmptyText(agent.greeting) || agent.greeting && typeof agent.greeting === "object" && hasNonEmptyText(agent.greeting.text)) {
    score += RECOMMENDED_COMPLETENESS_WEIGHTS.greeting;
  }
  return score;
}
function getFreshnessScore(ageDays) {
  for (const bucket of RECOMMENDED_FRESHNESS_BUCKETS) {
    if (ageDays <= bucket.maxAgeDays) return bucket.score;
  }
  return 0;
}
function getColdStartBoost(ageDays, favoriteCount) {
  for (const bucket of RECOMMENDED_COLD_START_BUCKETS) {
    if (favoriteCount <= bucket.maxFavoriteCount && ageDays <= bucket.maxAgeDays) {
      return bucket.score;
    }
  }
  return 0;
}
function getRecommendedScore({
  favoriteCount,
  publishedAtMs,
  completenessScore
}) {
  const ageMs = Math.max(0, Date.now() - publishedAtMs);
  const ageDays = ageMs / (24 * 60 * 60 * 1e3);
  const freshnessScore = getFreshnessScore(ageDays);
  const coldStartBoost = getColdStartBoost(ageDays, favoriteCount);
  return Math.log1p(Math.max(0, favoriteCount)) * RECOMMENDED_SCORE_WEIGHTS.favoriteLogWeight + freshnessScore * RECOMMENDED_SCORE_WEIGHTS.freshnessWeight + completenessScore * RECOMMENDED_SCORE_WEIGHTS.completenessWeight + coldStartBoost;
}
function buildSortMeta(local, remote) {
  const createdAtMs = Math.max(
    toTimeMs(remote?.updatedAt ?? remote?.createdAt),
    toTimeMs(local?.updatedAt ?? local?.createdAt)
  );
  const publishedAtMs = Math.max(
    toTimeMs(remote?.createdAt),
    toTimeMs(local?.createdAt)
  );
  const outputPriceNum = firstFiniteNumber(
    remote?.outputPrice,
    local?.outputPrice
  );
  const useCount = firstFiniteNumber(
    remote?.metrics?.useCount,
    local?.metrics?.useCount,
    remote?.dialogCount,
    local?.dialogCount
  );
  const rating = firstFiniteNumber(
    remote?.metrics?.rating,
    local?.metrics?.rating,
    remote?.messageCount,
    local?.messageCount
  );
  const favoriteCount = firstFiniteNumber(
    remote?.metrics?.favoriteCount,
    local?.metrics?.favoriteCount
  );
  const completenessScore = Math.max(
    getCompletenessScore(local),
    getCompletenessScore(remote)
  );
  const normalizedFavoriteCount = asOptionalFiniteNumber(favoriteCount) ?? 0;
  const normalizedPublishedAtMs = publishedAtMs || createdAtMs;
  const recommendedScore = getRecommendedScore({
    favoriteCount: normalizedFavoriteCount,
    publishedAtMs: normalizedPublishedAtMs,
    completenessScore
  });
  return {
    createdAtMs,
    publishedAtMs: normalizedPublishedAtMs,
    outputPriceNum: asOptionalFiniteNumber(outputPriceNum) ?? Number.POSITIVE_INFINITY,
    useCount: asOptionalFiniteNumber(useCount) ?? 0,
    rating: asOptionalFiniteNumber(rating) ?? 0,
    favoriteCount: normalizedFavoriteCount,
    completenessScore,
    recommendedScore
  };
}
var sortAgents = (agents, sortBy) => {
  const arr = agents.map((agent) => {
    const typed = agent;
    return typed.__sort ? typed : { ...typed, __sort: buildSortMeta(agent) };
  });
  arr.sort((a, b) => {
    const sa = a.__sort;
    const sb = b.__sort;
    let diff = 0;
    switch (sortBy) {
      case "recommended":
        diff = sb.recommendedScore - sa.recommendedScore;
        break;
      case "popular":
        diff = sb.useCount - sa.useCount;
        break;
      case "rating":
        diff = sb.rating - sa.rating;
        break;
      case "favorite":
        diff = sb.favoriteCount - sa.favoriteCount;
        break;
      case "outputPriceAsc":
        diff = sa.outputPriceNum - sb.outputPriceNum;
        break;
      case "outputPriceDesc":
        diff = sb.outputPriceNum - sa.outputPriceNum;
        break;
      case "newest":
      default:
        diff = sb.createdAtMs - sa.createdAtMs;
        break;
    }
    if (diff !== 0) return diff;
    return String(a.id).localeCompare(String(b.id));
  });
  return arr;
};
function sortAgentsFavoriteOwnedPublic(items) {
  const map = /* @__PURE__ */ new Map();
  for (const item of items) {
    const existing = map.get(item.key);
    if (!existing) {
      map.set(item.key, { ...item });
      continue;
    }
    map.set(item.key, {
      ...existing,
      ...item,
      key: existing.key,
      favoritedAt: Math.max(existing.favoritedAt ?? 0, item.favoritedAt ?? 0) || void 0,
      isOwned: Boolean(existing.isOwned || item.isOwned),
      isPublic: Boolean(existing.isPublic || item.isPublic),
      updatedAt: Math.max(existing.updatedAt ?? 0, item.updatedAt ?? 0),
      order: existing.order ?? item.order
    });
  }
  const arr = Array.from(map.values());
  arr.sort((a, b) => {
    const aFav = a.favoritedAt != null && a.favoritedAt > 0;
    const bFav = b.favoritedAt != null && b.favoritedAt > 0;
    if (aFav !== bFav) return aFav ? -1 : 1;
    if (aFav && bFav) {
      const diff = (b.favoritedAt ?? 0) - (a.favoritedAt ?? 0);
      if (diff !== 0) return diff;
    }
    const aOwned = Boolean(a.isOwned);
    const bOwned = Boolean(b.isOwned);
    if (aOwned !== bOwned) return aOwned ? -1 : 1;
    const aPublic = Boolean(a.isPublic);
    const bPublic = Boolean(b.isPublic);
    if (aPublic !== bPublic) return aPublic ? -1 : 1;
    const tsDiff = (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
    if (tsDiff !== 0) return tsDiff;
    const aOrder = a.order ?? Number.POSITIVE_INFINITY;
    const bOrder = b.order ?? Number.POSITIVE_INFINITY;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return a.key.localeCompare(b.key);
  });
  return arr;
}

// packages/ai/agent/publicAgentCatalog.ts
var GPT_IMAGE_TOOL_NAMES = /* @__PURE__ */ new Set([
  "openAIGptImage",
  "openAIGptImageGenerate",
  "openAIGptImageEdit"
]);
var shouldUsePlatformPricing = (agent) => {
  const provider = asTrimmedString(agent.provider);
  if (!provider || provider === "custom") return false;
  const customProviderUrl = asTrimmedString(agent.customProviderUrl);
  if (customProviderUrl) return false;
  const apiSource = asTrimmedString(agent.apiSource);
  return !apiSource || apiSource === "platform";
};
var shouldApplyPlatformPriceFloor = (agent) => {
  const provider = asTrimmedString(agent.provider);
  if (!provider || provider === "custom") return false;
  const apiSource = asTrimmedString(agent.apiSource);
  const customProviderUrl = asTrimmedString(agent.customProviderUrl);
  return apiSource === "custom" || !!customProviderUrl;
};
var maxNumber = (value, floor) => {
  const finite = asOptionalFiniteNumber(value);
  return finite !== void 0 ? Math.max(finite, floor) : floor;
};
function normalizePublicAgentPlatformPricing(agent) {
  const provider = asTrimmedString(agent.provider);
  const model = asTrimmedString(agent.model);
  if (!provider || !model) return agent;
  const usePlatformPricing = shouldUsePlatformPricing(agent);
  const applyPlatformPriceFloor = shouldApplyPlatformPriceFloor(agent);
  if (!usePlatformPricing && !applyPlatformPriceFloor) return agent;
  let next = agent;
  try {
    const pricing = getModelPricing(provider, model);
    const modelConfig = getModelConfig(provider, model);
    if (pricing && usePlatformPricing) {
      next = {
        ...next,
        inputPrice: pricing.inputPrice,
        outputPrice: pricing.outputPrice,
        hasVision: agent.hasVision ?? !!modelConfig.hasVision
      };
    } else if (pricing && applyPlatformPriceFloor) {
      next = {
        ...next,
        inputPrice: maxNumber(agent.inputPrice, pricing.inputPrice),
        outputPrice: maxNumber(agent.outputPrice, pricing.outputPrice)
      };
    }
  } catch {
  }
  const tools = Array.isArray(agent.tools) ? agent.tools : [];
  const usesOpenAIImageTool = tools.some(
    (tool) => typeof tool === "string" && GPT_IMAGE_TOOL_NAMES.has(tool)
  );
  const imageModel = asOptionalTrimmedString(agent.imageModel) ?? (usesOpenAIImageTool ? "gpt-image-2" : "");
  if (usePlatformPricing && provider === "openai" && imageModel === "gpt-image-2") {
    next = {
      ...next,
      imageModel,
      imageConfig: {
        ...asRecordOrEmpty(agent.imageConfig),
        enabled: true
      },
      hasImageOutput: agent.hasImageOutput ?? true
    };
  }
  return next;
}
function preparePublicAgentCatalogRecords(agents) {
  return agents.map((agent) => normalizePublicAgentPlatformPricing(agent));
}
var CATALOG_SUMMARY_FIELDS = /* @__PURE__ */ new Set([
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
  "__sort"
]);
function toPublicAgentCatalogSummary(agent) {
  const summary = {};
  for (const [key, value] of Object.entries(agent)) {
    if (CATALOG_SUMMARY_FIELDS.has(key)) summary[key] = value;
  }
  return summary;
}
function shouldPruneStalePublicAgentCache({
  searchName
}) {
  return !searchName;
}
function dedupeRemotePublicAgents(remoteAgents) {
  const remoteMap = /* @__PURE__ */ new Map();
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
function maskRemoteAgentsByLocalTombstones(remoteAgents, tombstones, options = {}) {
  const tombstoneMap = /* @__PURE__ */ new Map();
  for (const tombstone of tombstones) {
    for (const identifier of getPublicAgentIdentifiers(tombstone)) {
      const existing = tombstoneMap.get(identifier);
      if (!existing || getRecordTimestamp(tombstone) > getRecordTimestamp(existing)) {
        tombstoneMap.set(identifier, tombstone);
      }
    }
  }
  return remoteAgents.filter((agent) => {
    const matchingTombstones = getPublicAgentIdentifiers(agent).map((identifier) => tombstoneMap.get(identifier)).filter((tombstone) => {
      if (!tombstone) return false;
      if (!options.currentUserId) return true;
      return tombstone.userId === options.currentUserId && agent.userId === options.currentUserId;
    });
    if (matchingTombstones.length === 0) return true;
    const newestLocalTombstone = matchingTombstones.reduce(
      (latest, current) => getRecordTimestamp(current) > getRecordTimestamp(latest) ? current : latest
    );
    return getRecordTimestamp(agent) > getRecordTimestamp(newestLocalTombstone);
  });
}
function mergePublicAgentSources(localData, remoteData) {
  const remoteById = /* @__PURE__ */ new Map();
  for (const remote of remoteData) {
    const logicalId = getPublicAgentId(remote);
    if (logicalId) {
      remoteById.set(logicalId, remote);
    }
  }
  const merged = [];
  const toDeleteIds = [];
  for (const local of localData) {
    const logicalId = getPublicAgentId(local) ?? String(local.id ?? "");
    if (!logicalId) continue;
    const remote = remoteById.get(logicalId);
    if (remote) {
      const localTimestamp = getRecordTimestamp(local);
      const remoteTimestamp = getRecordTimestamp(remote);
      const newest = remoteTimestamp >= localTimestamp ? { ...local, ...remote } : { ...remote, ...local };
      merged.push({
        ...newest,
        __sort: buildSortMeta(local, remote)
      });
      continue;
    }
    toDeleteIds.push(logicalId);
    merged.push({
      ...local,
      __sort: buildSortMeta(local, void 0)
    });
  }
  for (const remote of remoteData) {
    const logicalId = getPublicAgentId(remote);
    if (!logicalId) continue;
    const exists = merged.some((agent) => getPublicAgentId(agent) === logicalId);
    if (!exists) {
      merged.push({ ...remote, __sort: buildSortMeta(void 0, remote) });
    }
  }
  return { merged, toDeleteIds };
}
function planStalePublicAgentPrunes({
  localAgents,
  toDeleteIds,
  currentUserId,
  nowMs = Date.now()
}) {
  return toDeleteIds.filter((id) => {
    const localItem = localAgents.find((agent) => getPublicAgentId(agent) === id);
    if (currentUserId && localItem?.userId === currentUserId) return false;
    const isRecentlyCreated = nowMs - toTimeMs(localItem?.createdAt) < 5 * 60 * 1e3;
    if (isRecentlyCreated) return false;
    return localItem?.meta?.origin !== "local";
  });
}
function planPublicAgentCatalogView({
  localAgents,
  remoteAgents,
  hasAuthoritativeRemoteResult,
  currentUserId,
  options = {}
}) {
  const localFallbackAgents = buildPublicAgentCatalogList({
    ...options,
    agents: localAgents
  });
  const { merged, toDeleteIds } = mergePublicAgentSources(localAgents, remoteAgents);
  const staleIdsToHide = hasAuthoritativeRemoteResult ? toDeleteIds : [];
  const staleIdsToHideSet = new Set(staleIdsToHide);
  const visibleAgents = buildPublicAgentCatalogList({
    ...options,
    agents: merged.filter(
      (agent) => !staleIdsToHideSet.has(getPublicAgentId(agent) ?? "")
    )
  });
  const pruneIds = planStalePublicAgentPrunes({
    localAgents,
    toDeleteIds,
    currentUserId
  });
  return {
    visibleAgents,
    localFallbackAgents,
    staleIdsToHide,
    pruneIds
  };
}
function filterPublicAgentRecords(agents, {
  searchName,
  userId,
  imageOutputOnly = false,
  toolName
} = {}) {
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
    results = results.filter(
      (agent) => agent.tools?.some((tool) => tool.toLowerCase().includes(kw))
    );
  }
  return results;
}
function buildPublicAgentCatalogList({
  agents,
  sortBy = "recommended",
  limit,
  summary = false,
  searchName,
  userId,
  imageOutputOnly = false,
  toolName
}) {
  const filtered = filterPublicAgentRecords(preparePublicAgentCatalogRecords(agents), {
    searchName,
    userId,
    imageOutputOnly,
    toolName
  });
  const sorted = sortAgents(filtered, sortBy);
  const limited = typeof limit === "number" ? sorted.slice(0, limit) : sorted;
  return summary ? limited.map((agent) => toPublicAgentCatalogSummary(agent)) : limited;
}

// packages/ai/agent/hooks/fetchPublicAgents.ts
var logger = (0, import_pino.pino)({ name: "fetchPublicAgents" });
async function fetchPublicAgents(options = {}) {
  const {
    limit = 20,
    sortBy = "recommended",
    searchName,
    userId,
    imageOutputOnly = false,
    toolName
  } = options;
  try {
    const ranges = pubAgentKeys.allPublicRanges();
    let results = [];
    let tombstones = [];
    const db = getDb();
    if (!db) return { data: [], total: 0, hasMore: false, tombstones: [] };
    const iterators = await Promise.all(
      ranges.map(
        ({ start, end }) => db.iterator({
          gte: start,
          lte: end
        })
      )
    );
    for (const iterator of iterators) {
      for await (const [, value] of iterator) {
        if (!value?.isPublic) continue;
        if (isTombstoneRecord(value)) {
          tombstones.push(value);
          continue;
        }
        results.push(value);
      }
    }
    results = filterPublicAgentRecords(preparePublicAgentCatalogRecords(results), {
      searchName,
      userId,
      imageOutputOnly,
      toolName
    });
    results = sortAgents(
      results.map((agent) => ({
        ...agent,
        __sort: buildSortMeta(agent)
      })),
      sortBy
    );
    const paginatedResults = results.slice(0, limit);
    logger.debug(
      {
        total: results.length,
        returned: paginatedResults.length,
        sortBy,
        limit,
        imageOutputOnly,
        firstItemCreatedAt: paginatedResults[0]?.createdAt
      },
      "Fetched public agents (local)"
    );
    return {
      data: paginatedResults,
      total: results.length,
      hasMore: limit < results.length,
      tombstones: tombstones.sort(
        (left, right) => getRecordTimestamp(right) - getRecordTimestamp(left)
      )
    };
  } catch (error) {
    logger.error({ error }, "Failed to fetch public agents (local)");
    throw error;
  }
}

// packages/ai/agent/hooks/usePublicAgents.ts
var PRUNE_LIMIT_MULTIPLIER = 5;
var PRUNE_LIMIT_CAP = 500;
function shouldPruneStalePublicAgentCache2({
  searchName
}) {
  return shouldPruneStalePublicAgentCache({ searchName });
}
async function fetchRemoteAgents(serverUrl, options, signal) {
  const response = await fetch(`${serverUrl}/rpc/getPublicAgents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
    signal
  });
  if (!response.ok) {
    throw new Error(`Remote fetch failed with status ${response.status}`);
  }
  const data = await response.json();
  return data;
}
function usePublicAgents({
  limit = 20,
  sortBy = "recommended",
  searchName = "",
  userId,
  imageOutputOnly = false,
  toolName,
  summary = false,
  initialData = [],
  reloadMode = "catalog"
} = {}) {
  const currentServer = useAppSelector(selectCurrentServer);
  const syncServers = useAppSelector(selectSyncServers);
  const currentUserId = useUserId();
  const dispatch = useAppDispatch();
  const [state, setState] = (0, import_react.useState)({
    loading: initialData.length === 0,
    error: null,
    data: initialData
  });
  const requestIdRef = (0, import_react.useRef)(0);
  const abortRef = (0, import_react.useRef)(null);
  const pendingExcludedIdsRef = (0, import_react.useRef)(/* @__PURE__ */ new Set());
  const fetchData = (0, import_react.useCallback)(async () => {
    const uiOptions = {
      limit,
      sortBy,
      searchName,
      userId,
      imageOutputOnly,
      toolName,
      summary
    };
    const myReqId = ++requestIdRef.current;
    setState((prev) => ({
      ...prev,
      loading: prev.data.length === 0,
      error: null
    }));
    const excludedIds = pendingExcludedIdsRef.current;
    const servers = getAllServers(currentServer, syncServers);
    const hasRemoteServers = servers.length > 0;
    let localResult = {
      data: [],
      tombstones: []
    };
    let localDataForUi = [];
    let localSortedForFallback = [];
    try {
      localResult = await fetchPublicAgents(uiOptions);
      localDataForUi = excludedIds.size > 0 ? localResult.data.filter(
        (agent) => !matchesPublicAgentIdentifiers(agent, excludedIds)
      ) : localResult.data;
      if (myReqId !== requestIdRef.current) return;
      localSortedForFallback = planPublicAgentCatalogView({
        localAgents: localDataForUi,
        remoteAgents: [],
        hasAuthoritativeRemoteResult: false,
        currentUserId,
        options: uiOptions
      }).localFallbackAgents;
      if (!hasRemoteServers) {
        setState((prev) => ({ ...prev, data: localSortedForFallback }));
      }
    } catch {
    }
    if (servers.length === 0) {
      if (excludedIds.size > 0) {
        const stillPending = new Set(
          Array.from(excludedIds).filter(
            (identifier) => localResult.data.some(
              (agent) => matchesPublicAgentIdentifiers(agent, /* @__PURE__ */ new Set([identifier]))
            )
          )
        );
        pendingExcludedIdsRef.current = stillPending;
      }
      setState((prev) => ({ ...prev, loading: false }));
      return;
    }
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const pruneLimit = Math.min(
        PRUNE_LIMIT_CAP,
        Math.max(limit, limit * PRUNE_LIMIT_MULTIPLIER)
      );
      const remoteOptions = {
        ...uiOptions,
        limit: pruneLimit,
        summary: summary && !currentUserId
      };
      const remoteResults = await Promise.allSettled(
        servers.map(
          (server) => fetchRemoteAgents(server, remoteOptions, abortRef.current.signal)
        )
      );
      if (myReqId !== requestIdRef.current) return;
      const hasAuthoritativeRemoteResult = remoteResults.some(
        (res) => res.status === "fulfilled"
      );
      const remoteData = maskRemoteAgentsByLocalTombstones(
        dedupeRemotePublicAgents(
          remoteResults.flatMap((res, index) => {
            if (res.status !== "fulfilled") return [];
            const originServer = servers[index];
            return (res.value?.data ?? []).filter((agent) => !isTombstoneRecord(agent)).map((agent) => ({
              ...agent,
              originServer
            }));
          })
        ),
        localResult.tombstones ?? [],
        { currentUserId }
      );
      const remoteDataForUi = excludedIds.size > 0 ? remoteData.filter(
        (agent) => !matchesPublicAgentIdentifiers(agent, excludedIds)
      ) : remoteData;
      if (remoteData.length > 0) {
        if (!summary) {
          dispatch(cacheMergedUserDataThunk({ records: remoteData }));
        }
      }
      const viewPlan = planPublicAgentCatalogView({
        localAgents: localDataForUi ?? [],
        remoteAgents: remoteDataForUi,
        hasAuthoritativeRemoteResult,
        currentUserId,
        options: uiOptions
      });
      const canPruneScene = shouldPruneStalePublicAgentCache2({
        searchName
      });
      if (canPruneScene && viewPlan.pruneIds.length > 0 && myReqId === requestIdRef.current) {
        viewPlan.pruneIds.forEach((id) => {
          const localItem = localResult.data.find(
            (agent) => getPublicAgentId(agent) === id
          );
          const dbKey = getPublicAgentPruneDbKey(localItem);
          if (dbKey) {
            dispatch(remove(dbKey));
          }
        });
      }
      if (myReqId !== requestIdRef.current) return;
      if (excludedIds.size > 0) {
        const stillPending = new Set(
          Array.from(excludedIds).filter((identifier) => {
            const identifierSet = /* @__PURE__ */ new Set([identifier]);
            return localResult.data.some(
              (agent) => matchesPublicAgentIdentifiers(agent, identifierSet)
            ) || remoteData.some(
              (agent) => matchesPublicAgentIdentifiers(agent, identifierSet)
            );
          })
        );
        pendingExcludedIdsRef.current = stillPending;
      }
      setState({ loading: false, error: null, data: viewPlan.visibleAgents });
    } catch (err) {
      if (isAbortError(err)) return;
      if (myReqId !== requestIdRef.current) return;
      setState((prev) => ({
        ...prev,
        data: prev.data.length > 0 ? prev.data : localSortedForFallback,
        loading: false,
        error: null
      }));
    }
  }, [
    limit,
    sortBy,
    searchName,
    userId,
    imageOutputOnly,
    toolName,
    summary,
    currentServer,
    syncServers,
    currentUserId,
    dispatch
  ]);
  (0, import_react.useEffect)(() => {
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [
    fetchData,
    imageOutputOnly,
    initialData.length,
    reloadMode,
    searchName,
    sortBy,
    toolName,
    summary,
    userId
  ]);
  const retry = (0, import_react.useCallback)((excludedAgentIds = []) => {
    if (excludedAgentIds.length > 0) {
      pendingExcludedIdsRef.current = /* @__PURE__ */ new Set([
        ...pendingExcludedIdsRef.current,
        ...excludedAgentIds.map((value) => String(value))
      ]);
    }
    setState((prev) => {
      const nextData = excludedAgentIds.length > 0 ? prev.data.filter(
        (agent) => !matchesPublicAgentIdentifiers(
          agent,
          new Set(excludedAgentIds.map((value) => String(value)))
        )
      ) : prev.data;
      return {
        ...prev,
        data: nextData,
        loading: reloadMode === "catalog" && excludedAgentIds.length === 0 && nextData.length === 0,
        error: null
      };
    });
    if (reloadMode === "catalog") {
      fetchData();
    }
  }, [fetchData]);
  return { ...state, retry };
}

export {
  sortAgentsFavoriteOwnedPublic,
  usePublicAgents
};
