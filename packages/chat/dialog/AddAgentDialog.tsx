import React, {
  useCallback,
  useState,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { useTheme } from "app/theme";
import { Dialog } from "render/web/ui/modal/Dialog";
import {
  LuCheck,
  LuPlus,
  LuRefreshCw,
  LuSearch,
  LuX,
} from "react-icons/lu";
import Button from "render/web/ui/Button";
import { useUserId } from "identity";
import {
  initFavorites,
  useFavoriteAgentIds,
  useFavoriteFavoritedAtById,
  useFavoritesInitialized,
  useFavoriteDeps,
} from "app/favorite/favoriteStore";
import { usePublicAgents } from "ai/agent/hooks/usePublicAgents";
import { useUserData } from "database/hooks/useUserData";
import { DataType } from "create/types";
import { getAgentRecordIdentifiers, getAgentRecordTimestamp } from "ai/agent/utils/agentRecordIdentity";
import {
  getModelConfig,
  getProviderByModelName,
  type Provider,
} from "ai/llm/providers";
import { formatCredits } from "app/utils/credits";
import { sortAgentsFavoriteOwnedPublic, type SortableAgentItem } from "ai/agent/utils/sortUtils";

interface ModelCapabilities {
  hasImageOutput?: boolean;
  hasVision?: boolean;
}

interface ResolvedModelInfo {
  provider: string;
  config: ReturnType<typeof getModelConfig> | null;
}

type AddAgentListItem = Record<string, any> & {
  __isFavorite?: boolean;
  __isOwned?: boolean;
};

const OWNED_AGENT_DATA_TYPES = [DataType.AGENT];
const SEARCH_DEBOUNCE_MS = 150;

/** Local search fields used by filter — exported for source/unit tests. */
export function matchesAgentSearch(
  item: Record<string, any>,
  query: string
): boolean {
  const q = asTrimmedLowercaseString(query);
  if (!q) return true;
  const haystack = [
    item?.name,
    item?.introduction,
    item?.model,
    item?.provider,
    item?.description,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}

interface AddAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddAgent: (agentIds: string | string[]) => void;
  limit?: number;
  title?: string;
  actionLabel?: string;
  selectionMode?: "single" | "multiple";
  excludeAgentIds?: string[];
  emptyLabel?: string;
  preferredCapabilities?: ModelCapabilities;
  preferredProvider?: string;
}

const AddAgentDialog: React.FC<AddAgentDialogProps> = ({
  isOpen,
  onClose,
  onAddAgent,
  limit = 50,
  title,
  actionLabel,
  selectionMode = "multiple",
  excludeAgentIds = [],
  emptyLabel,
  preferredCapabilities,
  preferredProvider,
}) => {
  const { t } = useTranslation(["chat", "translation"]);
  const theme = useTheme();
  const currentUserId = useUserId();
  const favoriteAgentIds = useFavoriteAgentIds();
  const favoritedAtById = useFavoriteFavoritedAtById();
  const favoritesInitialized = useFavoritesInitialized();
  const favoriteDeps = useFavoriteDeps();
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [limitNotice, setLimitNotice] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const isSingleSelect = selectionMode === "single";
  const publicAgentFetchLimit = Math.max(limit, 200);

  useEffect(() => {
    if (isOpen && !favoritesInitialized && favoriteDeps?.token) {
      void initFavorites(favoriteDeps);
    }
  }, [favoriteDeps, favoritesInitialized, isOpen]);

  // 关闭时清空选中、搜索与高亮
  useEffect(() => {
    if (!isOpen) {
      setSelectedAgents(new Set());
      setSearchTerm("");
      setDebouncedSearch("");
      setHighlightedIndex(-1);
      setLimitNotice(false);
    }
  }, [isOpen]);

  // 轻量 debounce（大列表本地 filter 仍即时；输入态可显示等待感）
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchTerm, isOpen]);

  // 打开后聚焦搜索框，便于键盘主路径
  useEffect(() => {
    if (!isOpen) return;
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus();
    }, 80);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

  const {
    loading: publicLoading,
    data: publicAgents = [],
    error: publicError,
    retry: retryPublicAgents,
  } = usePublicAgents({
    limit: publicAgentFetchLimit,
    sortBy: "recommended",
    reloadMode: "catalog",
    summary: true,
  });

  const {
    loading: ownedLoading,
    data: ownedAgents = [],
    reload: reloadOwnedAgents,
    clearCache: clearOwnedAgentsCache,
  } = useUserData(
    OWNED_AGENT_DATA_TYPES,
    currentUserId || "",
    publicAgentFetchLimit,
    { partialDataStrategy: "hydrated-cache" }
  );

  const handleReload = useCallback(async () => {
    retryPublicAgents();
    clearOwnedAgentsCache();
    await reloadOwnedAgents();
  }, [clearOwnedAgentsCache, reloadOwnedAgents, retryPublicAgents]);

  const getAgentId = useCallback(
    (item: any): string => String(item?.dbKey || item?.id || ""),
    []
  );

  const getAgentMergeId = useCallback(
    (item: any): string => String(item?.id || item?.dbKey || ""),
    []
  );

  const getAgentIdentifiers = useCallback(
    (item: any): string[] => getAgentRecordIdentifiers(item),
    []
  );

  const getAgentTimestamp = useCallback(
    (item: any): number => getAgentRecordTimestamp(item),
    []
  );

  const resolveModelInfo = useCallback((item: any): ResolvedModelInfo => {
    let providerStr = String(item.provider ?? "").toLowerCase();
    let modelStr = String(item.model ?? "");

    if (modelStr.includes("/")) {
      const slash = modelStr.indexOf("/");
      if (!providerStr) {
        providerStr = modelStr.slice(0, slash).toLowerCase();
      }
      modelStr = modelStr.slice(slash + 1);
    }

    try {
      return {
        provider: providerStr,
        config: getModelConfig(providerStr as Provider, modelStr),
      };
    } catch {
      const detectedProvider = getProviderByModelName(modelStr);
      if (!detectedProvider) {
        return {
          provider: providerStr,
          config: null,
        };
      }
      return {
        provider: detectedProvider,
        config: getModelConfig(detectedProvider, modelStr),
      };
    }
  }, []);

  const matchesPreferredCapabilities = useCallback(
    (item: any): boolean => {
      if (!preferredCapabilities) return true;

      const { config } = resolveModelInfo(item);
      if (!config) return false;

      const itemHasImageOutput = !!(
        config.hasImageOutput ?? (config as any).supportsImageOutput
      );

      // Only enforce image-output filtering when the current model is actually an image-output model.
      if (preferredCapabilities.hasImageOutput) {
        return itemHasImageOutput;
      }

      // For vision-capable non-image-output models, recommend other vision-capable models.
      if (preferredCapabilities.hasVision) {
        return config.hasVision;
      }

      return true;
    },
    [preferredCapabilities, resolveModelInfo]
  );

  const getProviderPriority = useCallback(
    (item: any): number => {
      if (!preferredProvider) return 0;
      const normalizedPreferredProvider = preferredProvider.toLowerCase();
      const { provider } = resolveModelInfo(item);
      return provider === normalizedPreferredProvider ? 1 : 0;
    },
    [preferredProvider, resolveModelInfo]
  );

  // Stable set from exclude ids; serialized key avoids parent inline-array identity churn
  const excludeAgentIdKey = JSON.stringify(excludeAgentIds.map(String));
  const excludeAgentIdSet = useMemo(
    () => new Set(JSON.parse(excludeAgentIdKey) as string[]),
    [excludeAgentIdKey]
  );

  // 基础列表：exclude → preferredCapabilities/provider 排序 → slice
  // 搜索在其后单独 filter，避免改坏能力优先链路
  const baseAgents = useMemo<AddAgentListItem[]>(() => {
    const favoriteSet = new Set(favoriteAgentIds.map(String));
    const mergedById = new Map<string, AddAgentListItem>();
    const originalOrder = new Map<string, number>();

    const mergeItem = (
      item: any,
      source: "owned" | "public",
      index: number
    ) => {
      const agentId = getAgentId(item);
      const mergeId = getAgentMergeId(item);
      if (!agentId || !mergeId) return;

      const identifiers = getAgentIdentifiers(item);
      const isFavorite = identifiers.some((identifier) =>
        favoriteSet.has(identifier)
      );
      const isOwned =
        source === "owned" ||
        (!!currentUserId && item?.userId === currentUserId);
      const existing = mergedById.get(mergeId);

      if (!existing) {
        mergedById.set(mergeId, {
          ...item,
          __isFavorite: isFavorite,
          __isOwned: isOwned,
        });
        originalOrder.set(mergeId, index);
        return;
      }

      const shouldPreferNext =
        (isOwned && !existing.__isOwned) ||
        (getAgentTimestamp(item) > getAgentTimestamp(existing) &&
          source === "owned");

      mergedById.set(mergeId, {
        ...(shouldPreferNext ? existing : item),
        ...(shouldPreferNext ? item : existing),
        __isFavorite: Boolean(existing.__isFavorite || isFavorite),
        __isOwned: Boolean(existing.__isOwned || isOwned),
      });

    };

    ownedAgents.forEach((item, index) => {
      mergeItem(item, "owned", index);
    });
    publicAgents.forEach((item, index) => {
      mergeItem(item, "public", ownedAgents.length + index);
    });

    const filtered = Array.from(mergedById.values()).filter((item) => {
      const identifiers = getAgentIdentifiers(item);
      return !identifiers.some((identifier) =>
        excludeAgentIdSet.has(identifier)
      );
    });

    const shouldPreferSimilarModels = !!(
      preferredCapabilities || preferredProvider
    );
    const capabilityMatched = shouldPreferSimilarModels
      ? filtered.filter(matchesPreferredCapabilities)
      : filtered;
    const baseList =
      shouldPreferSimilarModels && capabilityMatched.length > 0
        ? capabilityMatched
        : filtered;

    // provider priority 是 surface 特有的第一级排序
    const providerGroups = new Map<number, AddAgentListItem[]>();
    for (const item of baseList) {
      const p = getProviderPriority(item);
      const group = providerGroups.get(p) ?? [];
      group.push(item);
      providerGroups.set(p, group);
    }
    const sortedProviderKeys = Array.from(providerGroups.keys()).sort((a, b) => b - a);
    const result: AddAgentListItem[] = [];
    for (const pKey of sortedProviderKeys) {
      const group = providerGroups.get(pKey)!;
      const sortable: SortableAgentItem[] = group.map((item) => {
        const identifiers = getAgentIdentifiers(item);
        const favAt = identifiers.reduce(
          (latest, identifier) => Math.max(latest, Number(favoritedAtById[identifier]) || 0),
          0
        );
        return {
          key: getAgentMergeId(item) || getAgentId(item),
          favoritedAt: favAt || undefined,
          isOwned: Boolean(item.__isOwned),
          isPublic: !item.__isOwned,
          updatedAt: getAgentTimestamp(item),
          order: originalOrder.get(getAgentMergeId(item) || getAgentId(item)) ?? undefined,
        };
      });
      const sortedItems = sortAgentsFavoriteOwnedPublic(sortable);
      const orderMap = new Map(sortedItems.map((s, i) => [s.key, i]));
      const sortedGroup = [...group].sort(
        (a, b) =>
          (orderMap.get(getAgentMergeId(a) || getAgentId(a)) ?? 0) -
          (orderMap.get(getAgentMergeId(b) || getAgentId(b)) ?? 0)
      );
      result.push(...sortedGroup);
    }
    return result.slice(0, limit);
  }, [
    currentUserId,
    excludeAgentIdSet,
    favoriteAgentIds,
    favoritedAtById,
    getAgentId,
    getAgentIdentifiers,
    getAgentMergeId,
    getAgentTimestamp,
    limit,
    ownedAgents,
    preferredCapabilities,
    preferredProvider,
    publicAgents,
    matchesPreferredCapabilities,
    getProviderPriority,
  ]);

  const visibleAgents = useMemo(() => {
    const q = debouncedSearch.trim();
    if (!q) return baseAgents;
    return baseAgents.filter((item) => matchesAgentSearch(item, q));
  }, [baseAgents, debouncedSearch]);

  const loading = publicLoading || ownedLoading;
  const error = publicError;
  const isSearchPending =
    asTrimmedLowercaseString(searchTerm) !==
    asTrimmedLowercaseString(debouncedSearch);
  const hasActiveSearch = debouncedSearch.trim().length > 0;
  const selectionAtLimit =
    !isSingleSelect && selectedAgents.size >= limit;

  // 列表变化时在渲染期夹紧高亮，避免 effect 链式 setState
  const safeHighlightedIndex =
    visibleAgents.length === 0
      ? -1
      : highlightedIndex < 0
        ? highlightedIndex
        : Math.min(highlightedIndex, visibleAgents.length - 1);
  const highlightedIndexRef = useRef(safeHighlightedIndex);
  useEffect(() => {
    highlightedIndexRef.current = safeHighlightedIndex;
  }, [safeHighlightedIndex]);

  const scrollHighlightIntoView = useCallback((index: number) => {
    if (index < 0) return;
    requestAnimationFrame(() => {
      cardRefs.current.get(index)?.scrollIntoView({ block: "nearest" });
    });
  }, []);

  const handleAddAgent = useCallback(
    (agentId: string) => {
      if (!agentId) return;
      onAddAgent(agentId);
      onClose();
    },
    [onAddAgent, onClose]
  );

  const toggleSelection = useCallback(
    (agentId: string) => {
      if (!agentId) return;
      if (selectedAgents.has(agentId)) {
        setSelectedAgents((prev) => {
          const next = new Set(prev);
          next.delete(agentId);
          return next;
        });
        setLimitNotice(false);
        return;
      }
      if (selectedAgents.size >= limit) {
        setLimitNotice(true);
        return;
      }
      setSelectedAgents((prev) => {
        const next = new Set(prev);
        next.add(agentId);
        return next;
      });
      setLimitNotice(false);
    },
    [limit, selectedAgents]
  );

  const addSelected = useCallback(() => {
    if (selectedAgents.size > 0) {
      const ids = Array.from(selectedAgents);
      onAddAgent(ids.length === 1 ? ids[0] : ids);
      onClose();
    }
  }, [selectedAgents, onAddAgent, onClose]);

  const clearSearch = useCallback(() => {
    setSearchTerm("");
    setDebouncedSearch("");
    highlightedIndexRef.current = -1;
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
  }, []);

  const moveHighlight = useCallback(
    (delta: number) => {
      if (visibleAgents.length === 0) return;
      const prev = highlightedIndexRef.current;
      let next: number;
      if (prev < 0) {
        next = delta > 0 ? 0 : visibleAgents.length - 1;
      } else {
        next = prev + delta;
        if (next < 0) next = 0;
        if (next >= visibleAgents.length) next = visibleAgents.length - 1;
      }
      highlightedIndexRef.current = next;
      setHighlightedIndex(next);
      scrollHighlightIntoView(next);
    },
    [scrollHighlightIntoView, visibleAgents.length]
  );

  const activateHighlighted = useCallback(() => {
    if (
      safeHighlightedIndex < 0 ||
      safeHighlightedIndex >= visibleAgents.length
    ) {
      return;
    }
    const item = visibleAgents[safeHighlightedIndex];
    const agentId = getAgentId(item);
    if (!agentId) return;
    if (isSingleSelect) {
      handleAddAgent(agentId);
      return;
    }
    if (!selectedAgents.has(agentId) && selectionAtLimit) {
      setLimitNotice(true);
      return;
    }
    toggleSelection(agentId);
  }, [
    getAgentId,
    handleAddAgent,
    isSingleSelect,
    safeHighlightedIndex,
    selectedAgents,
    selectionAtLimit,
    toggleSelection,
    visibleAgents,
  ]);

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveHighlight(1);
        listRef.current?.focus();
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveHighlight(-1);
        listRef.current?.focus();
        return;
      }
      if (event.key === "Escape" && searchTerm) {
        event.preventDefault();
        event.stopPropagation();
        clearSearch();
        return;
      }
      if (
        (event.key === "Enter" || event.key === " ") &&
        safeHighlightedIndex >= 0 &&
        !event.nativeEvent.isComposing
      ) {
        // Space in search box should type; only Enter activates from search
        if (event.key === " ") return;
        event.preventDefault();
        activateHighlighted();
      }
    },
    [
      activateHighlighted,
      clearSearch,
      moveHighlight,
      safeHighlightedIndex,
      searchTerm,
    ]
  );

  const handleListKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveHighlight(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveHighlight(-1);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        if (visibleAgents.length > 0) {
          highlightedIndexRef.current = 0;
          setHighlightedIndex(0);
          scrollHighlightIntoView(0);
        }
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        if (visibleAgents.length > 0) {
          const last = visibleAgents.length - 1;
          highlightedIndexRef.current = last;
          setHighlightedIndex(last);
          scrollHighlightIntoView(last);
        }
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateHighlighted();
        return;
      }
      if (event.key === "Escape" && searchTerm) {
        event.preventDefault();
        event.stopPropagation();
        clearSearch();
      }
    },
    [
      activateHighlighted,
      clearSearch,
      moveHighlight,
      scrollHighlightIntoView,
      searchTerm,
      visibleAgents.length,
    ]
  );

  const renderLoading = () => (
    <div className="state-container loading" role="status" aria-live="polite">
      <LuRefreshCw className="spin-icon" size={24} aria-hidden="true" />
      <span>{t("LoadingAgents")}</span>
    </div>
  );

  const renderError = () => (
    <div className="state-container error" role="alert">
      <p>{t("FailedToLoadAgents")}</p>
      <Button onClick={handleReload} size="small">
        {t("Retry")}
      </Button>
    </div>
  );

  const renderEmptyCatalog = () => (
    <div className="state-container empty" role="status">
      <LuSearch size={24} aria-hidden="true" />
      <span>{emptyLabel ?? t("NoAgents")}</span>
      {!favoritesInitialized && (
        <span className="state-hint">
          {t("loadingFavoritesHint", "正在同步收藏…")}
        </span>
      )}
    </div>
  );

  const renderNoMatch = () => (
    <div className="state-container empty" role="status">
      <LuSearch size={24} aria-hidden="true" />
      <span>
        {t("NoMatchingAgents", '没有匹配「{{query}}」的智能体', {
          query: debouncedSearch.trim(),
        })}
      </span>
      <Button onClick={clearSearch} size="small" variant="ghost">
        {t("clearSearch", "清空搜索")}
      </Button>
    </div>
  );

  const renderAgents = () => (
    <div className="agent-container">
      {!isSingleSelect && (
        <div className="batch-bar" aria-live="polite">
          <span>
            {t("selectedAgentsCount", "Selected {{count}} Agents", {
              count: selectedAgents.size,
            })}
            {selectionAtLimit
              ? ` · ${t("selectionLimitReached", "已达上限 {{limit}}", {
                  limit,
                })}`
              : ""}
          </span>
          <div className="batch-actions">
            <Button
              onClick={addSelected}
              size="small"
              variant="primary"
              disabled={selectedAgents.size === 0}
              aria-disabled={selectedAgents.size === 0}
            >
              {actionLabel ?? t("addSelectedAgents", "Add selected")}
            </Button>
            <Button
              onClick={() => {
                setSelectedAgents(new Set());
                setLimitNotice(false);
              }}
              size="small"
              variant="ghost"
              disabled={selectedAgents.size === 0}
            >
              {t("clearSelection", "Clear")}
            </Button>
          </div>
        </div>
      )}

      {limitNotice && (
        <div className="limit-notice" role="status">
          {t(
            "selectionLimitNotice",
            "最多选择 {{limit}} 个智能体，请先取消部分已选",
            { limit }
          )}
        </div>
      )}

      <div
        className="agent-grid"
        ref={listRef}
        role="listbox"
        aria-label={t("SelectAgentToAdd", "Select an Agent to add to the dialog")}
        aria-multiselectable={!isSingleSelect}
        aria-activedescendant={
          safeHighlightedIndex >= 0
            ? `add-agent-option-${safeHighlightedIndex}`
            : undefined
        }
        tabIndex={0}
        onKeyDown={handleListKeyDown}
      >
        {visibleAgents.map((item, index) => {
          const agentId = getAgentId(item);
          const agentKey = getAgentMergeId(item) || agentId;
          const isSelected = selectedAgents.has(agentId);
          const isHighlighted = index === safeHighlightedIndex;
          const isDisabledUnselected =
            !isSingleSelect && selectionAtLimit && !isSelected;
          const isRecommended =
            !!preferredCapabilities && matchesPreferredCapabilities(item);

          return (
            <div
              key={agentKey}
              id={`add-agent-option-${index}`}
              role="option"
              aria-selected={isSingleSelect ? isHighlighted : isSelected}
              aria-disabled={isDisabledUnselected || undefined}
              ref={(el) => {
                cardRefs.current.set(index, el);
              }}
              className={[
                "agent-card",
                !isSingleSelect && isSelected ? "selected" : "",
                isHighlighted ? "highlighted" : "",
                isDisabledUnselected ? "disabled" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onMouseEnter={() => {
                highlightedIndexRef.current = index;
                setHighlightedIndex(index);
                scrollHighlightIntoView(index);
              }}
              onClick={() => {
                if (isSingleSelect) {
                  handleAddAgent(agentId);
                  return;
                }
                if (isDisabledUnselected) {
                  setLimitNotice(true);
                  return;
                }
                toggleSelection(agentId);
              }}
            >
              <div className="card-header">
                {!isSingleSelect && (
                  <button
                    type="button"
                    className="select-btn"
                    tabIndex={-1}
                    disabled={isDisabledUnselected}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDisabledUnselected) {
                        setLimitNotice(true);
                        return;
                      }
                      toggleSelection(agentId);
                    }}
                    aria-label={
                      isSelected
                        ? t("clearSelection", "Clear")
                        : t("SelectAgentToAdd")
                    }
                  >
                    <div className={`checkbox ${isSelected ? "checked" : ""}`}>
                      {isSelected && <LuCheck size={12} aria-hidden="true" />}
                    </div>
                  </button>
                )}

                <div className="card-info">
                  <div className="avatar">
                    {item.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="info">
                    <h3 className="title">{item.name || t("Unnamed")}</h3>
                    <div className="tags">
                      {item.model && (
                        <span className="tag">{item.model}</span>
                      )}
                      {item.__isFavorite && (
                        <span className="tag tag-highlight">
                          {t("favoriteAgent", "Favorite")}
                        </span>
                      )}
                      {item.__isOwned && (
                        <span className="tag tag-highlight">
                          {t("myAgent", "Mine")}
                        </span>
                      )}
                      {isRecommended && (
                        <span className="tag tag-recommended">
                          {t("capabilityMatch", "能力匹配")}
                        </span>
                      )}
                      {!item.__isFavorite &&
                        !item.__isOwned &&
                        !isRecommended && (
                          <span className="tag">
                            {t("recommended", "推荐")}
                          </span>
                        )}
                    </div>
                  </div>
                </div>

                <div className="card-actions">
                  {item.outputPrice && (
                    <span className="price">
                      {formatCredits(
                        item.outputPrice,
                        t("creditsUnit", "credits"),
                        2
                      )}
                    </span>
                  )}
                  <button
                    type="button"
                    className="add-btn"
                    tabIndex={-1}
                    disabled={isDisabledUnselected}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddAgent(agentId);
                    }}
                    aria-label={actionLabel ?? t("AddAgent", "添加智能体")}
                    title={actionLabel ?? t("AddAgent", "添加智能体")}
                  >
                    {isSingleSelect ? (
                      <LuCheck size={14} aria-hidden="true" />
                    ) : (
                      <LuPlus size={14} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="description">
                {item.introduction || t("NoDescription")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderBody = () => {
    if (error && baseAgents.length === 0) return renderError();
    if (loading && baseAgents.length === 0) return renderLoading();
    if (!loading && baseAgents.length === 0) return renderEmptyCatalog();
    if (baseAgents.length > 0 && visibleAgents.length === 0) {
      return renderNoMatch();
    }
    return renderAgents();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={title ?? t("AddAgent")}
      size="large"
    >
      <div className="add-agent-content">
        <search className="search-bar">
          <LuSearch className="search-icon" size={16} aria-hidden />
          <input
            ref={searchInputRef}
            type="search"
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder={t("searchAgentsPlaceholder", "搜索名称、模型或简介…")}
            aria-label={t("searchAgentsPlaceholder", "搜索名称、模型或简介…")}
            autoComplete="off"
            spellCheck={false}
          />
          {isSearchPending && (
            <span className="search-pending" aria-hidden="true">
              <LuRefreshCw className="spin-icon" size={14} aria-hidden="true" />
            </span>
          )}
          {searchTerm.length > 0 && !isSearchPending && (
            <button
              type="button"
              className="search-clear"
              onClick={clearSearch}
              aria-label={t("clearSearch", "清空搜索")}
            >
              <LuX size={14} aria-hidden="true" />
            </button>
          )}
        </search>

        {error && baseAgents.length > 0 && (
          <div className="agent-sync-warning" role="status">
            <span>
              {t(
                "plazaSyncFailedShowingLocal",
                "广场智能体同步失败，当前展示本地与缓存智能体"
              )}
            </span>
            <Button onClick={handleReload} size="small" variant="ghost">
              {t("Retry", "重试")}
            </Button>
          </div>
        )}

        {renderBody()}
      </div>

      <style>{`
        .add-agent-content {
          padding: ${theme.space[4]};
          display: flex;
          flex-direction: column;
          gap: ${theme.space[4]};
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: ${theme.space[2]};
          padding: ${theme.space[2]} ${theme.space[3]};
          border: 1px solid ${theme.border};
          border-radius: var(--radius-xs);
          background: ${theme.backgroundSecondary};
          transition: border-color 0.15s ease, box-shadow 0.15s ease;
        }

        .search-bar:focus-within {
          border-color: ${theme.primary};
          box-shadow: 0 0 0 3px ${theme.primary}22;
        }

        .agent-sync-warning {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: ${theme.space[2]} ${theme.space[3]};
          border-radius: var(--radius-xs);
          background: var(--color-danger-subtle, rgba(239, 68, 68, 0.08));
          color: var(--color-danger, #ef4444);
          font-size: 13px;
        }

        .search-icon {
          color: ${theme.textSecondary};
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          min-width: 0;
          border: none;
          outline: none;
          background: transparent;
          color: ${theme.text};
          font-size: 14px;
          line-height: 1.4;
          padding: ${theme.space[1]} 0;
        }

        .search-input::placeholder {
          color: ${theme.textSecondary};
        }

        .search-clear,
        .search-pending {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          color: ${theme.textSecondary};
          border-radius: var(--radius-xs);
          cursor: pointer;
          flex-shrink: 0;
        }

        .search-clear:hover {
          background: ${theme.backgroundHover};
          color: ${theme.text};
        }

        .search-pending {
          cursor: default;
          color: ${theme.primary};
        }

        .state-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: ${theme.space[4]};
          padding: ${theme.space[12]} ${theme.space[4]};
          text-align: center;
          min-height: 300px;
          color: ${theme.textSecondary};
        }

        .state-container.loading { color: ${theme.primary}; }
        .state-container.error { color: ${theme.error}; }

        .state-hint {
          font-size: 12px;
          color: ${theme.textTertiary || theme.textSecondary};
        }

        .spin-icon {
          animation: spin 1.2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .agent-container {
          display: flex;
          flex-direction: column;
          gap: ${theme.space[4]};
        }

        .batch-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: ${theme.space[3]} ${theme.space[4]};
          background: ${theme.primaryGhost};
          border-radius: ${theme.space[3]};
          border: 1px solid ${theme.primary}30;
          font-size: 14px;
          font-weight: 500;
          color: ${theme.primary};
        }

        .batch-actions {
          display: flex;
          gap: ${theme.space[2]};
        }

        .limit-notice {
          padding: ${theme.space[2]} ${theme.space[3]};
          border-radius: var(--radius-xs);
          background: ${theme.warning ? `${theme.warning}18` : `${theme.primary}12`};
          color: ${theme.warning || theme.primary};
          font-size: 13px;
        }

        .agent-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: ${theme.space[4]};
          outline: none;
        }

        .agent-grid:focus-visible {
          box-shadow: 0 0 0 2px ${theme.primary}40;
          border-radius: var(--radius-xs);
        }

        .agent-card {
          background: ${theme.backgroundSecondary};
          border: 1px solid ${theme.border};
          border-radius: var(--radius-xs);
          padding: ${theme.space[4]};
          transition: all 0.2s ease;
          display: flex;
          flex-direction: column;
          gap: ${theme.space[3]};
          cursor: pointer;
        }

        .agent-card:hover {
          transform: translateY(-2px);
          border-color: ${theme.primary}40;
          box-shadow: 0 8px 32px -8px ${theme.shadowLight};
        }

        .agent-card.selected {
          border-color: ${theme.primary};
          background: ${theme.primaryGhost}20;
        }

        .agent-card.highlighted {
          border-color: ${theme.primary};
          box-shadow: 0 0 0 2px ${theme.primary}35;
        }

        .agent-card.disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .agent-card.disabled:hover {
          transform: none;
          box-shadow: none;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: ${theme.space[3]};
        }

        .select-btn {
          background: none;
          border: none;
          padding: ${theme.space[1]};
          cursor: pointer;
          border-radius: var(--radius-xs);
        }

        .select-btn:hover:not(:disabled) {
          background: ${theme.backgroundHover};
        }

        .select-btn:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .checkbox {
          width: 18px;
          height: 18px;
          border: 2px solid ${theme.border};
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: ${theme.background};
          transition: all 0.2s ease;
        }

        .checkbox.checked {
          background: ${theme.primary};
          border-color: ${theme.primary};
          color: white;
        }

        .card-info {
          display: flex;
          align-items: center;
          gap: ${theme.space[3]};
          flex: 1;
          min-width: 0;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          background: ${theme.primaryGhost}40;
          color: ${theme.primary};
          flex-shrink: 0;
        }

        .info {
          min-width: 0;
        }

        .title {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 ${theme.space[1]} 0;
          color: ${theme.text};
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tags {
          display: flex;
          gap: ${theme.space[1]};
          flex-wrap: wrap;
        }

        .tag {
          font-size: 12px;
          color: ${theme.textSecondary};
          background: ${theme.backgroundTertiary};
          padding: 2px ${theme.space[2]};
          border-radius: var(--radius-xs);
          border: 1px solid ${theme.border};
        }

        .tag-recommended {
          color: ${theme.primary};
          background: ${theme.primary}18;
          border-color: ${theme.primary}40;
          font-weight: 500;
        }

        .tag-highlight {
          color: ${theme.primary};
          background: ${theme.primaryGhost};
          border-color: ${theme.primary}30;
          font-weight: 500;
        }

        .card-actions {
          display: flex;
          align-items: center;
          gap: ${theme.space[2]};
          flex-shrink: 0;
        }

        .price {
          font-size: 12px;
          font-weight: 600;
          color: ${theme.primary};
          background: ${theme.primaryGhost};
          padding: ${theme.space[1]} ${theme.space[2]};
          border-radius: var(--radius-xs);
          font-family: var(--font-mono, monospace);
        }

        .add-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          background: ${theme.primary};
          color: white;
          border: none;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .add-btn:hover:not(:disabled) {
          transform: scale(1.1);
          box-shadow: 0 4px 12px -2px ${theme.primary}40;
        }

        .add-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .description {
          font-size: 14px;
          line-height: 1.6;
          color: ${theme.textSecondary};
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        @media (max-width: 768px) {
          .agent-grid {
            grid-template-columns: 1fr;
            gap: ${theme.space[3]};
          }

          .batch-bar {
            flex-direction: column;
            gap: ${theme.space[3]};
            text-align: center;
          }

          .batch-actions {
            justify-content: center;
          }
        }
      `}</style>
    </Dialog>
  );
};

export default AddAgentDialog;
