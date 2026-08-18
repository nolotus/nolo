// packages/chat/hooks/useAgentPickerCandidates.ts
// 为 composer 的 agent 切换器（AgentPickerControl）聚合可选 agent 列表。
// 三层数据源，按优先级：收藏 → 自己创建 → AI 广场，复用 sortAgentsFavoriteOwnedPublic 排序。
// 与 AddAgentDialog 同源数据，但只产出有序 agentKey 列表（轻量、无 UI），供小下拉消费。
import { useMemo } from "react";
import { useUserId } from "identity";
import {
  useFavoriteAgentIds,
  useFavoriteFavoritedAtById,
} from "app/favorite/favoriteStore";
import { usePublicAgents } from "ai/agent/hooks/usePublicAgents";
import { useUserData } from "database/hooks/useUserData";
import { DataType } from "create/types";
import { sortAgentsFavoriteOwnedPublic } from "ai/agent/utils/sortUtils";
import {
  getAgentRecordKey,
  getAgentRecordIdentifiers,
  getAgentRecordTimestamp,
  isAgentRecordOwned,
} from "ai/agent/utils/agentRecordIdentity";

const OWNED_AGENT_DATA_TYPES = [DataType.AGENT];

export interface UseAgentPickerCandidatesOptions {
  /** 当前对话的 active agent key；强制置顶（即便不在任何来源里也显示）。 */
  activeAgentId?: string | null;
  /** 三层聚合后的最大候选数（active agent 不占配额，额外加在首位）。 */
  limit?: number;
}

export interface AgentPickerCandidate {
  key: string;
  /** 是否收藏（来自 favoriteStore 命中）。 */
  isFavorite: boolean;
  /** 是否当前用户创建。 */
  isOwned: boolean;
  /** 是否来自公开广场。 */
  isPublic: boolean;
}

/**
 * 纯函数：把 owned + public agent 记录按 收藏 → 自建 → 广场 排序并截断，
 * 再把 active agent 强制置顶（已在列表内则移到首位；不在则额外插入首位，不占 limit 配额）。
 * 抽成纯函数便于单测（不依赖 React hooks / 远程数据）。
 */
export function buildAgentPickerCandidates(input: {
  ownedAgents: ReadonlyArray<unknown>;
  publicAgents: ReadonlyArray<unknown>;
  favoriteAgentIds: ReadonlyArray<string>;
  favoritedAtById: Record<string, number>;
  activeAgentId?: string | null;
  currentUserId?: string | null;
  limit: number;
}): AgentPickerCandidate[] {
  const {
    ownedAgents,
    publicAgents,
    favoriteAgentIds,
    favoritedAtById,
    activeAgentId,
    currentUserId,
    limit,
  } = input;
  const favoriteSet = new Set(favoriteAgentIds.map(String));

  const seen = new Set<string>();
  const sortableItems: Array<{
    key: string;
    favoritedAt?: number;
    isOwned: boolean;
    isPublic: boolean;
    updatedAt: number;
    order: number;
  }> = [];

  let order = 0;
  const add = (key: string | null, source: "owned" | "public", raw: unknown) => {
    if (!key || seen.has(key)) return;
    // 多候选标识匹配收藏，避免 dbKey 与 favoriteStore id 格式不一致漏匹配
    const identifiers = getAgentRecordIdentifiers(raw);
    // 任一备选 id 已见过则去重，避免 favorite 短 id / dbKey 各推一条
    if (identifiers.some((id) => seen.has(id))) return;
    seen.add(key);
    for (const id of identifiers) {
      if (id) seen.add(id);
    }
    const isFavorite = identifiers.some((id) => favoriteSet.has(id));
    const favoritedAtFor = identifiers.reduce(
      (latest, id) => Math.max(latest, Number(favoritedAtById[id]) || 0),
      0
    );
    const isOwned = isAgentRecordOwned(raw, source, currentUserId);
    // isFavorite=true 但无时间戳时给正数兜底，避免排序后 isFavorite 判定跌落为 false
    // （丢失收藏组优先级与 ★ badge）。
    sortableItems.push({
      key,
      favoritedAt: isFavorite ? favoritedAtFor || 1 : undefined,
      isOwned,
      isPublic: source === "public" || !isOwned,
      updatedAt: getAgentRecordTimestamp(raw),
      order: order++,
    });
  };

  for (const item of ownedAgents) {
    add(getAgentRecordKey(item), "owned", item);
  }
  for (const item of publicAgents) {
    add(getAgentRecordKey(item), "public", item);
  }
  // 收藏里有、但 owned/public 尚未加载到的边缘 id：仍进候选，避免首页/对话页漏项。
  for (const favId of favoriteAgentIds) {
    const key = String(favId || "").trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    sortableItems.push({
      key,
      favoritedAt: Number(favoritedAtById[key]) || 1,
      isOwned: false,
      isPublic: false,
      updatedAt: 0,
      order: order++,
    });
  }

  const sorted = sortAgentsFavoriteOwnedPublic(sortableItems).slice(0, limit);

  const result: AgentPickerCandidate[] = sorted.map((item) => ({
    key: item.key,
    isFavorite: item.favoritedAt != null && item.favoritedAt > 0,
    isOwned: Boolean(item.isOwned),
    isPublic: Boolean(item.isPublic),
  }));

  if (activeAgentId) {
    const idx = result.findIndex((c) => c.key === activeAgentId);
    if (idx > 0) {
      const [active] = result.splice(idx, 1);
      result.unshift(active);
    } else if (idx === -1) {
      result.unshift({
        key: activeAgentId,
        isFavorite: favoriteSet.has(activeAgentId),
        isOwned: false,
        isPublic: false,
      });
    }
  }

  return result;
}

/**
 * 聚合 composer agent picker 的候选列表。
 * 排序：收藏组(favoritedAt 有值) → 自建(isOwned) → 公开(isPublic)，组内按时间倒序。
 * active agent 强制置顶且不占 limit 配额；active 已在来源内则去重，否则额外插入首位。
 */
export function useAgentPickerCandidates({
  activeAgentId,
  limit = 30,
}: UseAgentPickerCandidatesOptions = {}): {
  candidates: AgentPickerCandidate[];
  loading: boolean;
} {
  const currentUserId = useUserId();
  const favoriteAgentIds = useFavoriteAgentIds();
  const favoritedAtById = useFavoriteFavoritedAtById();

  // 拉取上限给足，让排序后再截断（小下拉本身只展示 limit 个）。
  const fetchLimit = Math.max(limit * 4, 120);

  const { data: publicAgents = [], loading: publicLoading } = usePublicAgents({
    limit: fetchLimit,
    sortBy: "recommended",
    reloadMode: "catalog",
    summary: true,
  });

  const { data: ownedAgents = [], loading: ownedLoading } = useUserData(
    OWNED_AGENT_DATA_TYPES,
    currentUserId || "",
    fetchLimit,
    { partialDataStrategy: "hydrated-cache" }
  );

  const candidates = useMemo<AgentPickerCandidate[]>(
    () =>
      buildAgentPickerCandidates({
        ownedAgents,
        publicAgents,
        favoriteAgentIds,
        favoritedAtById,
        activeAgentId,
        currentUserId,
        limit,
      }),
    [
      activeAgentId,
      currentUserId,
      favoriteAgentIds,
      favoritedAtById,
      limit,
      ownedAgents,
      publicAgents,
    ]
  );

  return {
    candidates,
    loading: publicLoading || ownedLoading,
  };
}