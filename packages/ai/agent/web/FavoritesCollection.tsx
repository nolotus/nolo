// 文件路径: ai/agent/web/FavoritesCollection.tsx

import "./FavoritesCollection.css";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "app/routing";
import {
  LuBot,
  LuFile,
  LuFileText,
  LuImage,
  LuMessageSquare,
  LuTable,
  LuClock3,
  LuArrowRight,
} from "react-icons/lu";
import { toast } from "app/utils/toast";
import { useTranslation } from "react-i18next";
import {
  GridList,
  GridListItem,
} from "react-aria-components";

import AgentBlock from "ai/agent/web/AgentBlock";

import { useFetchData } from "app/hooks";
import { useAppDispatch, useAppSelector } from "app/store";
import { Tabs, TabList, Tab } from "render/web/ui/Tabs";
import { CONTENT_TYPE_META } from "create/space/contentTypeMeta";
import { buildRoutableContentPath } from "create/space/contentKeyUtils";
import { useIsLoggedIn } from "identity";
import {
  useFavoriteAgentIds,
  useFavoriteFavoritedAtById,
  useFavoriteContentIds,
  useFavoritesError,
  useFavoritesInitialized,
  useFavoritesLoading,
} from "app/favorite/favoriteStore";
import { read, selectById } from "database/dbSlice";
import type { Agent } from "app/types";
import { useAgentCardNavigation } from "ai/agent/web/useAgentCardNavigation";
import { isInteractiveAgentCardTarget } from "ai/agent/web/agentCardUtils";
import "./PublicAgentsList.css";

// --- Styles ---

type EmptyStateProps = {
  message: string;
  actionText?: string;
  onAction?: () => void;
};

const EmptyState = memo(({ message, actionText, onAction }: EmptyStateProps) => (
  <div className="empty-state">
    <div className="empty-state__icon" aria-hidden="true">
      <LuBot size={40} aria-hidden="true" />
    </div>
    <p className="empty-state__text">{message}</p>
    {actionText && onAction && (
      <button type="button" className="empty-state__btn" onClick={onAction}>
        <LuBot size={16} aria-hidden="true" />
        <span>{actionText}</span>
      </button>
    )}
  </div>
));

const FavoriteAgentItem = memo(
  ({
    agentKey,
    openAgent,
    prefetchAgent,
  }: {
    agentKey: string;
    openAgent: (agent: Agent, opts?: { newTab?: boolean }) => void;
    prefetchAgent: (agent: Agent) => void;
  }) => {
    const { data: fetchedAgent, isLoading, error, reload } = useFetchData<Agent>(agentKey);
    // Local-first: render from redux db entities immediately when local
    // cache exists, instead of waiting for readAndWait's remote round-trip.
    // readAndWait.fulfilled upserts into entities, so this stays in sync.
    const localAgent = useAppSelector((s) => selectById(s, agentKey)) as Agent | undefined;
    const agent = fetchedAgent || localAgent;

    if (!agent && isLoading) {
      return (
        <GridListItem id={agentKey} textValue={agentKey} isDisabled>
          <div className="public-agents__skeleton-card" aria-hidden="true">
            <div className="public-agents__skeleton-header">
              <div className="public-agents__skeleton-avatar public-agents__shimmer" />
              <div className="public-agents__skeleton-header-text">
                <div className="public-agents__skeleton-line public-agents__skeleton-line--title public-agents__shimmer" />
                <div className="public-agents__skeleton-line public-agents__skeleton-line--subtitle public-agents__shimmer" />
              </div>
            </div>
            <div className="public-agents__skeleton-body">
              <div className="public-agents__skeleton-line public-agents__shimmer" />
              <div className="public-agents__skeleton-line public-agents__shimmer" />
              <div className="public-agents__skeleton-line public-agents__skeleton-line--short public-agents__shimmer" />
            </div>
            <div className="public-agents__skeleton-footer">
              <div className="public-agents__skeleton-pill public-agents__shimmer" />
              <div className="public-agents__skeleton-pill public-agents__skeleton-pill--small public-agents__shimmer" />
            </div>
          </div>
        </GridListItem>
      );
    }
    if (error || !agent) return null;

    const agentPath = `/${agent.dbKey || agent.id}`;

    return (
      <GridListItem
        id={agentKey}
        textValue={agent.name || ""}
        onAction={() => openAgent(agent)}
        onHoverStart={() => prefetchAgent(agent)}
      >
        <div
          onPointerEnter={() => prefetchAgent(agent)}
          data-agent-path={agentPath}
          onAuxClick={(e) => {
            // Middle-click → new tab (parity with plaza GridListItem)
            if (e.button !== 1) return;
            if (isInteractiveAgentCardTarget(e.target)) return;
            e.preventDefault();
            openAgent(agent, { newTab: true });
          }}
          onClickCapture={(e) => {
            // Cmd/Ctrl+click → new tab (GridListItem omits native href)
            if (!(e.metaKey || e.ctrlKey)) return;
            if (isInteractiveAgentCardTarget(e.target)) return;
            e.preventDefault();
            e.stopPropagation();
            openAgent(agent, { newTab: true });
          }}
          onKeyDownCapture={(e) => {
            // Cmd/Ctrl+Enter → new tab (keyboard parity with links)
            if (!(e.metaKey || e.ctrlKey)) return;
            if (e.key !== "Enter") return;
            if (isInteractiveAgentCardTarget(e.target)) return;
            e.preventDefault();
            e.stopPropagation();
            openAgent(agent, { newTab: true });
          }}
        >
          <AgentBlock item={agent} reload={reload} preferCurrentSpaceLaunch />
        </div>
      </GridListItem>
    );
  }
);

type FavoriteContentData = {
  title?: string;
  type?: string;
  updatedAt?: string | number;
  updated_at?: string | number;
  createdAt?: string | number;
  created?: string | number;
};

type ContentKind = "page" | "table" | "image" | "file" | "dialog";

function formatContentDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
}

function getContentKind(contentKey: string): ContentKind {
  if (contentKey.startsWith("dialog-")) return "dialog";
  if (contentKey.startsWith("meta-")) return "table";
  if (contentKey.startsWith("image-")) return "image";
  if (contentKey.startsWith("file-")) return "file";
  return "page";
}

function getContentKindLabel(kind: ContentKind) {
  if (kind === "table") return "表格";
  if (kind === "image") return "图片";
  if (kind === "file") return "文件";
  if (kind === "dialog") return "对话";
  return "页面";
}

const FavoriteContentItem = memo(
  ({
    contentKey,
    openContent,
  }: {
    contentKey: string;
    openContent: (contentKey: string, opts?: { newTab?: boolean }) => void;
  }) => {
  const { data: fetchedContent, isLoading, error } =
    useFetchData<FavoriteContentData>(contentKey);
  // Local-first: render from redux db entities immediately when local
  // cache exists, instead of waiting for readAndWait's remote round-trip.
  const localContent = useAppSelector((s) => selectById(s, contentKey)) as FavoriteContentData | undefined;
  const content = fetchedContent || localContent;

  if (!content && isLoading) {
    return (
      <GridListItem id={contentKey} textValue={contentKey} isDisabled>
        <div className="favorite-content-card favorite-content-card--skeleton" aria-hidden="true">
          <div className="favorite-content-card__header">
            <span className="favorite-content-card__icon public-agents__shimmer" />
          </div>
          <div className="favorite-content-card__content">
            <span className="public-agents__skeleton-line public-agents__skeleton-line--title public-agents__shimmer" />
          </div>
          <div className="favorite-content-card__meta">
            <span className="public-agents__skeleton-line public-agents__skeleton-line--short public-agents__shimmer" />
          </div>
        </div>
      </GridListItem>
    );
  }
  if (error || !content) {
    return (
      <GridListItem id={contentKey} textValue={contentKey}>
        <div className="favorite-content-card favorite-content-card--dead-link" role="status">
          <div className="favorite-content-card__content">
            <span className="favorite-content-card__title">收藏项暂时不可用</span>
            <span className="favorite-content-card__dead-link-desc">
              可能已删除或你失去了读取权限。收藏不等于授权。
            </span>
            <code className="favorite-content-card__dead-link-key">{contentKey}</code>
          </div>
        </div>
      </GridListItem>
    );
  }

  const title = content.title || contentKey;
  const kind = getContentKind(contentKey);
  const kindLabel = getContentKindLabel(kind);
  const updatedAt =
    formatContentDate(content.updatedAt) ||
    formatContentDate(content.updated_at) ||
    formatContentDate(content.createdAt) ||
    formatContentDate(content.created);

  const ContentIcon =
    kind === "table"
      ? LuTable
      : kind === "image"
        ? LuImage
        : kind === "file"
          ? LuFile
          : kind === "dialog"
            ? LuMessageSquare
            : LuFileText;

  return (
    <GridListItem
      id={contentKey}
      textValue={title}
      onAction={() => openContent(contentKey)}
    >
      <div
        className="favorite-content-card"
        title={title}
        onAuxClick={(e) => {
          // Middle-click → new tab (parity with plaza GridListItem)
          if (e.button !== 1) return;
          e.preventDefault();
          openContent(contentKey, { newTab: true });
        }}
        onClickCapture={(e) => {
          // Cmd/Ctrl+click → new tab (GridListItem omits native href)
          if (!(e.metaKey || e.ctrlKey)) return;
          e.preventDefault();
          e.stopPropagation();
          openContent(contentKey, { newTab: true });
        }}
        onKeyDownCapture={(e) => {
          if (!(e.metaKey || e.ctrlKey)) return;
          if (e.key !== "Enter") return;
          e.preventDefault();
          e.stopPropagation();
          openContent(contentKey, { newTab: true });
        }}
      >
        <div className="favorite-content-card__header">
          <span className="favorite-content-card__icon" aria-hidden="true">
            <ContentIcon size={20} aria-hidden="true" />
          </span>
        </div>

        <div className="favorite-content-card__content">
          <span className="favorite-content-card__title">{title}</span>
        </div>

        <div className="favorite-content-card__meta">
          <LuClock3 size={12} aria-hidden="true" />
          {updatedAt || kindLabel}
        </div>

        <span className="favorite-content-card__open" aria-hidden="true">
          <LuArrowRight size={16} aria-hidden="true" />
        </span>
      </div>
    </GridListItem>
  );
  }
);

type FavoriteFilter = "all" | "agent" | ContentKind;

type FavoriteEntry = {
  id: string;
  type: "agent" | "content";
  kind: "agent" | ContentKind;
  favoritedAt: number;
};

function matchesFavoriteFilter(entry: FavoriteEntry, filter: FavoriteFilter) {
  if (filter === "all") return true;
  if (filter === "agent") return entry.type === "agent";
  return entry.type === "content" && entry.kind === filter;
}

// Empty-state card rendered inside the same GridList so the grid system
// (grid columns, focus ring, RAC semantics) stays unified across all tabs.
// CTA + guide link depend on the active filter.
const FAVORITE_EMPTY_COPY: Record<
  FavoriteFilter,
  { title: string; hint: string; cta: string; ctaTarget: string }
> = {
  all: {
    title: "还没有收藏任何内容",
    hint: "在 AI 广场或任意内容详情页点星标，即可加入收藏。",
    cta: "去 AI 广场逛逛",
    ctaTarget: "/explore",
  },
  agent: {
    title: "还没有收藏 AI",
    hint: "在 AI 广场或 AI 详情页点星标，即可加入收藏。",
    cta: "去 AI 广场逛逛",
    ctaTarget: "/explore",
  },
  page: {
    title: "还没有收藏页面",
    hint: "在任意页面点星标，即可加入收藏。",
    cta: "去我的内容",
    ctaTarget: "/my/content",
  },
  table: {
    title: "还没有收藏表格",
    hint: "在任意表格点星标，即可加入收藏。",
    cta: "去我的内容",
    ctaTarget: "/my/content",
  },
  image: {
    title: "还没有收藏图片",
    hint: "在任意图片点星标，即可加入收藏。",
    cta: "去我的内容",
    ctaTarget: "/my/content",
  },
  file: {
    title: "还没有收藏文件",
    hint: "在任意文件点星标，即可加入收藏。",
    cta: "去我的内容",
    ctaTarget: "/my/content",
  },
  dialog: {
    title: "还没有收藏对话",
    hint: "在对话行的更多菜单里点收藏，即可加入收藏。",
    cta: "去我的内容",
    ctaTarget: "/my/content",
  },
};

const FavoriteEmptyCard = memo(
  ({
    filter,
    onNavigate,
  }: {
    filter: FavoriteFilter;
    onNavigate: (path: string) => void;
  }) => {
    const { t } = useTranslation();
    const copy = FAVORITE_EMPTY_COPY[filter] ?? FAVORITE_EMPTY_COPY.all;
    return (
      <GridListItem
        id="favorite-empty"
        textValue={copy.title}
        className="favorites-empty-item"
      >
        <div className="favorites-empty-card">
          <div className="favorites-empty-card__icon" aria-hidden="true">
            <LuBot size={32} aria-hidden="true" />
          </div>
          <p className="favorites-empty-card__title">
            {copy.title}
          </p>
          <p className="favorites-empty-card__hint">{copy.hint}</p>
          <div className="favorites-empty-card__actions">
            <button
              type="button"
              className="favorites-empty-card__cta"
              onClick={() => onNavigate(copy.ctaTarget)}
            >
              {copy.cta}
            </button>
            <button
              type="button"
              className="favorites-empty-card__link"
              onClick={() => onNavigate("/guide")}
            >
              {t("homeActions.guideTitle", "使用指南")}
            </button>
          </div>
        </div>
      </GridListItem>
    );
  }
);

// Loading skeleton shown in the grid while favorites list is initializing.
// Renders placeholder cards reusing public-agents__skeleton-* styles.
const SKELETON_CARD_COUNT = 6;
const FavoriteLoadingSkeleton = memo(() => {
  const cards = useMemo(
    () => Array.from({ length: SKELETON_CARD_COUNT }, (_, i) => i),
    [],
  );
  return (
    <>
      {cards.map((i) => (
        <GridListItem
          key={`skeleton-${i}`}
          id={`favorite-skeleton-${i}`}
          textValue=""
          isDisabled
        >
          <div className="public-agents__skeleton-card" aria-hidden="true">
            <div className="public-agents__skeleton-header">
              <div className="public-agents__skeleton-avatar public-agents__shimmer" />
              <div className="public-agents__skeleton-header-text">
                <div className="public-agents__skeleton-line public-agents__skeleton-line--title public-agents__shimmer" />
                <div className="public-agents__skeleton-line public-agents__skeleton-line--subtitle public-agents__shimmer" />
              </div>
            </div>
            <div className="public-agents__skeleton-body">
              <div className="public-agents__skeleton-line public-agents__shimmer" />
              <div className="public-agents__skeleton-line public-agents__shimmer" />
              <div className="public-agents__skeleton-line public-agents__skeleton-line--short public-agents__shimmer" />
            </div>
            <div className="public-agents__skeleton-footer">
              <div className="public-agents__skeleton-pill public-agents__shimmer" />
              <div className="public-agents__skeleton-pill public-agents__skeleton-pill--small public-agents__shimmer" />
            </div>
          </div>
        </GridListItem>
      ))}
    </>
  );
});

const FavoritesCollection = memo(() => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = (searchParams.get("tab") || "all") as FavoriteFilter;
  const prewarmedFiltersRef = useRef<Set<FavoriteFilter>>(new Set(["all"]));

  const isLoggedIn = useIsLoggedIn();
  const agentKeys = useFavoriteAgentIds();
  const contentKeys = useFavoriteContentIds();
  const favoritedAtById = useFavoriteFavoritedAtById();
  const loading = useFavoritesLoading();
  const initialized = useFavoritesInitialized();
  const error = useFavoritesError();

  useEffect(() => {
    if (isLoggedIn && error) {
      toast.error(t("loadFavoriteError", "加载收藏失败，请稍后重试"));
    }
  }, [isLoggedIn, error, t]);

  const isLoading = isLoggedIn && (!initialized || loading);
  const totalFavorites = agentKeys.length + contentKeys.length;

  const contentKindCounts = useMemo(
    () =>
      (contentKeys as string[]).reduce<Record<ContentKind, number>>(
        (acc: Record<ContentKind, number>, id: string) => {
          acc[getContentKind(id)] += 1;
          return acc;
        },
        { page: 0, table: 0, image: 0, file: 0, dialog: 0 }
      ),
    [contentKeys]
  );


  const allEntries = useMemo<FavoriteEntry[]>(
    () =>
      [
        ...agentKeys.map((id: string) => ({
          id,
          type: "agent" as const,
          kind: "agent" as const,
          favoritedAt: favoritedAtById[id] || 0,
        })),
        ...contentKeys.map((id: string) => ({
          id,
          type: "content" as const,
          kind: getContentKind(id),
          favoritedAt: favoritedAtById[id] || 0,
        })),
      ].sort((a, b) => b.favoritedAt - a.favoritedAt),
    [agentKeys, contentKeys, favoritedAtById]
  );

  const visibleEntries = useMemo(
    () => allEntries.filter((entry) => matchesFavoriteFilter(entry, activeFilter)),
    [allEntries, activeFilter]
  );

  // Prefetch every favorited record in parallel on first paint so
  // network requests fire before each FavoriteAgentItem /
  // FavoriteContentItem mounts its own useFetchData effect.
  // readRequestManager dedupes overlapping reads, so this is free.
  // Local-first cache hits resolve instantly; this only helps the
  // cold-cache cards populate faster.
  useEffect(() => {
    if (!initialized || allEntries.length === 0) return;
    allEntries.forEach((entry) => {
      void dispatch(read({ dbKey: entry.id }));
    });
    // Fire once after favorites init; per-tab hover is handled by
    // prewarmFilter, so we don't need to refetch on activeFilter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  const prewarmFilter = useCallback(
    (filter: FavoriteFilter) => {
      if (filter === "all" || prewarmedFiltersRef.current.has(filter)) {
        return;
      }
      prewarmedFiltersRef.current.add(filter);

      const warmKeys = allEntries.flatMap((entry) =>
        matchesFavoriteFilter(entry, filter) ? [entry.id] : [],
      );

      warmKeys.forEach((dbKey) => {
        void dispatch(read({ dbKey }));
      });
    },
    [allEntries, dispatch]
  );

  const handleFilterChange = useCallback(
    (filter: FavoriteFilter) => {
      prewarmFilter(filter);
      if (filter === "all") {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab: filter }, { replace: true });
      }
    },
    [prewarmFilter, setSearchParams]
  );

  const filterOptions = useMemo(
    () =>
      [
        {
          id: "all" as FavoriteFilter,
          label: t("favoriteFilterAll", "全部"),
          count: totalFavorites,
          icon: CONTENT_TYPE_META.all.icon,
        },
        {
          id: "agent" as FavoriteFilter,
          label: t("favoriteFilterAgents", "AI"),
          count: agentKeys.length,
          icon: CONTENT_TYPE_META.agent.icon,
        },
        {
          id: "page" as FavoriteFilter,
          label: t("favoriteFilterPages", "页面"),
          count: contentKindCounts.page,
          icon: CONTENT_TYPE_META.page.icon,
        },
        {
          id: "table" as FavoriteFilter,
          label: t("favoriteFilterTables", "表格"),
          count: contentKindCounts.table,
          icon: CONTENT_TYPE_META.table.icon,
        },
        {
          id: "image" as FavoriteFilter,
          label: t("favoriteFilterImages", "图片"),
          count: contentKindCounts.image,
          icon: CONTENT_TYPE_META.image.icon,
        },
        {
          id: "file" as FavoriteFilter,
          label: t("favoriteFilterFiles", "文件"),
          count: contentKindCounts.file,
          icon: CONTENT_TYPE_META.file.icon,
        },
        {
          id: "dialog" as FavoriteFilter,
          label: t("favoriteFilterDialogs", "对话"),
          count: contentKindCounts.dialog,
          icon: LuMessageSquare,
        },
      ],
    [t, totalFavorites, agentKeys.length, contentKindCounts]
  );

  const { openAgent, prefetchAgent } = useAgentCardNavigation();

  const openContent = useCallback(
    (contentKey: string, opts?: { newTab?: boolean }) => {
      const kind = getContentKind(contentKey);
      const path =
        kind === "dialog"
          ? buildRoutableContentPath({ contentKey, type: "dialog" })
          : `/${contentKey}`;
      if (opts?.newTab) {
        window.open(path, "_blank", "noopener,noreferrer");
        return;
      }
      navigate(path);
    },
    [navigate]
  );

  const renderContent = () => {
    if (!isLoggedIn) {
      return <EmptyState message="登录后可以收藏你常用的 AI 和内容" />;
    }
    const showEmptyCard = !isLoading && visibleEntries.length === 0;
    return (
      <div className="favorites-sections">
        <Tabs
          selectedKey={activeFilter}
          onSelectionChange={(key) => handleFilterChange(key as FavoriteFilter)}
        >
          <TabList
            aria-label={t("favoriteFilter", "收藏筛选")}
            className="react-aria-TabList favorites-filter__tabs"
          >
            {filterOptions.map((option) => {
              const TabIcon = option.icon;
              return (
                <Tab
                  key={option.id}
                  id={option.id}
                  className={`react-aria-Tab favorites-filter__tab${activeFilter === option.id ? " is-active" : ""}`}
                  onHoverStart={() => prewarmFilter(option.id)}
                  onFocus={() => prewarmFilter(option.id)}
                >
                  <TabIcon size={14} aria-hidden="true" />
                  {option.label}
                </Tab>
              );
            })}
          </TabList>
        </Tabs>

        <GridList
          className="agents-grid public-agents__grid"
          aria-label={t("favoriteFilter", "收藏筛选")}
          layout="grid"
          selectionMode="none"
        >
          {isLoading ? (
            <FavoriteLoadingSkeleton />
          ) : showEmptyCard ? (
            <FavoriteEmptyCard filter={activeFilter} onNavigate={navigate} />
          ) : (
            visibleEntries.map((entry) =>
              entry.type === "agent" ? (
                <FavoriteAgentItem
                  key={`agent-${entry.id}`}
                  agentKey={entry.id}
                  openAgent={openAgent}
                  prefetchAgent={prefetchAgent}
                />
              ) : (
                <FavoriteContentItem
                  key={`content-${entry.id}`}
                  contentKey={entry.id}
                  openContent={openContent}
                />
              )
            )
          )}
        </GridList>
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      
    </>
  );
});

export default FavoritesCollection;
