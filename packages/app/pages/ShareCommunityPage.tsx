import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { ShareSummary } from "share/types";
import { DataType } from "create/types";
import { createWebSharePath, shareApi } from "share/link";
import { usePageMeta } from "app/hooks/usePageMeta";
import { buildStaticPageMeta } from "app/seo/pageMeta";
import { useAppSelector } from "app/store";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import { useSSRCommunityShares } from "share/shareStore";
import { ShareCard, type ShareCardItem } from "./ShareCard";
import "./ShareCommunityPage.css";

const SHARE_COMMUNITY_FILTER_CATALOG = {
  all: { labelKey: "community_filter_all" },
  app: { labelKey: "community_filter_app" },
  doc: { labelKey: "community_filter_doc" },
  table: { labelKey: "community_filter_table" },
  chat: { labelKey: "community_filter_chat" },
} as const;

type FilterType = keyof typeof SHARE_COMMUNITY_FILTER_CATALOG;

const FILTERS = Object.entries(SHARE_COMMUNITY_FILTER_CATALOG).map(
  ([key, value]) => ({
    key: key as FilterType,
    labelKey: value.labelKey,
  })
);

const isFilterType = (value: string): value is FilterType =>
  value in SHARE_COMMUNITY_FILTER_CATALOG;

const matchesFilter = (share: ShareSummary, filter: FilterType): boolean => {
  if (filter === "all") return true;
  if (filter === "app") return share.type === DataType.APP;
  if (filter === "doc") return share.type === DataType.DOC;
  if (filter === "table") return share.type === DataType.TABLE;
  if (filter === "chat") return share.type === DataType.DIALOG || share.type === "cybot";
  return true;
};

const buildCommunityServerCandidates = (
  localRuntimeOrigin?: string,
  currentServer?: string,
  syncServers?: string[]
): string[] => {
  const configured = [currentServer, ...(Array.isArray(syncServers) ? syncServers : [])]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.replace(/\/+$/, ""));

  return Array.from(
    new Set([
      ...(localRuntimeOrigin ? [localRuntimeOrigin] : []),
      ...configured,
    ])
  );
};

const mapSummaryToItem = (s: ShareSummary): ShareCardItem => ({
  ...s,
  dbKey: `share-${s.token}`,
  path: createWebSharePath(s.token),
  ...(s.authorId ? { authorPath: `/profile/${encodeURIComponent(s.authorId)}` } : {}),
  ...(s.agentKey ? { agentPath: `/${encodeURIComponent(s.agentKey)}` } : {}),
});

const ShareCommunityPage: React.FC = () => {
  const { t } = useTranslation();
  const pageMeta = useMemo(() => buildStaticPageMeta(t, "shareCommunity"), [t]);
  usePageMeta(pageMeta);
  const ssrData = useSSRCommunityShares();
  const hasSSRData = ssrData.data.length > 0;

  const [allShares, setAllShares] = useState<ShareCardItem[]>(() =>
    hasSSRData ? ssrData.data.map(mapSummaryToItem) : []
  );
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [loading, setLoading] = useState(!hasSSRData);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>(ssrData.nextCursor);
  const { currentServer, syncServers, localRuntimeOrigin } =
    useAppSelector(selectRuntimeSnapshot);
  const serverCandidates = useMemo(
    () => buildCommunityServerCandidates(localRuntimeOrigin, currentServer, syncServers),
    [localRuntimeOrigin, currentServer, syncServers]
  );

  // Client-side filter applied AFTER merge — per local-first multi-source principle
  const filteredShares = useMemo(
    () => allShares.filter((s) => matchesFilter(s, activeFilter)),
    [allShares, activeFilter]
  );

  const fetchShares = useCallback(async (cursor?: string) => {
    const isInitial = !cursor;
    if (isInitial) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const params = new URLSearchParams({ limit: "30" });
      if (cursor) params.set("cursor", cursor);

      let res: Response | null = null;
      let lastError: unknown = null;
      for (const candidate of serverCandidates) {
        try {
          const nextRes = await fetch(shareApi.community(candidate, params));
          if (nextRes.ok) {
            res = nextRes;
            break;
          }
          lastError = new Error(`Server responded ${nextRes.status}`);
        } catch (err) {
          lastError = err;
        }
      }
      if (!res) throw lastError instanceof Error ? lastError : new Error("Failed to load shares");

      const json = await res.json();
      const items: ShareCardItem[] = (json.data || []).map(mapSummaryToItem);

      setAllShares((prev) => (isInitial ? items : [...prev, ...items]));
      setNextCursor(json.nextCursor || undefined);
    } catch (err: any) {
      setError(err?.message || t("community_load_error"));
    } finally {
      if (isInitial) setLoading(false);
      else setLoadingMore(false);
    }
  }, [serverCandidates, t]);

  useEffect(() => {
    if (hasSSRData) return;
    void fetchShares();
  }, [fetchShares, hasSSRData]);

  const handleFilterClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const nextFilter = event.currentTarget.dataset.filter;
      if (nextFilter && isFilterType(nextFilter)) {
        setActiveFilter(nextFilter);
      }
    },
    []
  );

  const filterCounts = useMemo(() => {
    const counts: Record<FilterType, number> = {
      all: allShares.length,
      app: 0,
      doc: 0,
      table: 0,
      chat: 0,
    };
    for (const s of allShares) {
      if (s.type === DataType.APP) counts.app++;
      else if (s.type === DataType.DOC) counts.doc++;
      else if (s.type === DataType.TABLE) counts.table++;
      else if (s.type === DataType.DIALOG || s.type === "cybot") counts.chat++;
    }
    return counts;
  }, [allShares]);

  const handleLoadMore = useCallback(() => {
    if (nextCursor) {
      void fetchShares(nextCursor);
    }
  }, [fetchShares, nextCursor]);

  return (
    <div className="ShareCommunityPage">
      <header className="ShareCommunityPage__header">
        <h1 className="ShareCommunityPage__title">{t("community_title")}</h1>
        <p className="ShareCommunityPage__subtitle">{t("community_subtitle")}</p>
      </header>

      <nav className="ShareCommunityPage__tabs">
        {FILTERS.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            className={`ShareCommunityPage__tab ${activeFilter === key ? "is-active" : ""}`}
            data-filter={key}
            onClick={handleFilterClick}
          >
            {t(labelKey)}
            {!loading && filterCounts[key] > 0 ? (
              <span className="ShareCommunityPage__tab-count">{filterCounts[key]}</span>
            ) : null}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="ShareCommunityPage__status">{t("community_loading")}</div>
      ) : null}
      {error && !loading ? (
        <div className="ShareCommunityPage__status is-error">{error}</div>
      ) : null}
      {!loading && !error && filteredShares.length === 0 ? (
        <div className="ShareCommunityPage__empty">{t("community_empty")}</div>
      ) : null}

      {filteredShares.length > 0 ? (
        <section className="ShareCommunityPage__masonry">
          {filteredShares.map((share) => (
            <ShareCard key={share.dbKey} share={share} />
          ))}
        </section>
      ) : null}

      {nextCursor && !loading ? (
        <div className="ShareCommunityPage__loadMore">
          <button
            type="button"
            className="ShareCommunityPage__loadMoreBtn"
            disabled={loadingMore}
            onClick={handleLoadMore}
          >
            {loadingMore ? t("community_loading_more") : t("community_load_more")}
          </button>
        </div>
      ) : null}

    </div>
  );
};

export default ShareCommunityPage;
