import "./ShareCommunityPreview.css";
import React, { useEffect, useRef, useState } from "react";
import type { ShareSummary } from "share/types";
import { DataType } from "create/types";
import { createWebSharePath, shareApi } from "share/link";
import { useSSRCommunityShares } from "share/shareStore";
import { useAppSelector } from "app/store";
import { selectRemoteServer } from "app/settings/settingSlice";
import { ShareCard, type ShareCardItem } from "./ShareCard";

type ContentCategory = "dialog" | "article";

type ShareCommunityPreviewProps = {
  active?: boolean;
  /** Optional filter: only show public shares of this content category. */
  contentCategory?: ContentCategory;
};

/** How many community shares to pull when a category filter is applied. */
const CATEGORY_FETCH_LIMIT = 60;
/** How many cards the preview grid shows at most. */
const PREVIEW_LIMIT = 6;
/** Hard cap on client-side paging rounds in category mode. */
const MAX_CATEGORY_PAGES = 3;

const mapSummary = (s: ShareSummary): ShareCardItem => ({
  ...s,
  dbKey: `share-${s.token}`,
  path: createWebSharePath(s.token),
  ...(s.authorId ? { authorPath: `/profile/${encodeURIComponent(s.authorId)}` } : {}),
  ...(s.agentKey ? { agentPath: `/${encodeURIComponent(s.agentKey)}` } : {}),
});

/**
 * Single source of truth for "does this share belong to the category?".
 * Used both for counting (paging stop condition) and for the final filter,
 * so the two can never drift apart.
 */
const matchesCategory = (
  share: ShareCardItem,
  category: ContentCategory
): boolean =>
  category === "article" ? share.type === DataType.DOC : share.type === DataType.DIALOG;

const countMatching = (items: ShareCardItem[], category: ContentCategory): number =>
  items.reduce((acc, item) => acc + (matchesCategory(item, category) ? 1 : 0), 0);

const ShareCommunityPreview: React.FC<ShareCommunityPreviewProps> = ({
  active = true,
  contentCategory,
}) => {
  const ssrCommunityShares = useSSRCommunityShares();
  // Category mode filters client-side, so SSR data (unfiltered) would show the
  // wrong cards for a moment — start empty there instead.
  const [shares, setShares] = useState<ShareCardItem[]>(() =>
    contentCategory
      ? []
      : Array.isArray(ssrCommunityShares.data)
        ? ssrCommunityShares.data.map(mapSummary)
        : []
  );
  const [loading, setLoading] = useState(() => shares.length === 0);
  const [error, setError] = useState<string | null>(null);
  const server = useAppSelector(selectRemoteServer);
  // Whether the very first render already had cards to show; kept in a ref so
  // the effect can decide "show spinner" without depending on `shares`.
  const hadInitialCards = useRef(shares.length > 0);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const load = async () => {
      if (!hadInitialCards.current) {
        setLoading(true);
      }
      setError(null);
      const collected: ShareCardItem[] = [];
      try {
        let cursor: string | undefined;
        let pages = 0;
        do {
          const params = new URLSearchParams({
            limit: String(contentCategory ? CATEGORY_FETCH_LIMIT : PREVIEW_LIMIT),
            coverImage: "url",
          });
          if (cursor) params.set("cursor", cursor);
          const res = await fetch(shareApi.community(server, params));
          if (!res.ok) throw new Error(`Server responded ${res.status}`);
          const json = await res.json();
          if (cancelled) return;
          collected.push(...((json.data as ShareSummary[]) || []).map(mapSummary));
          cursor = typeof json.nextCursor === "string" ? json.nextCursor : undefined;
          pages += 1;
          // The backend cannot filter by type, so keep paging until we have
          // enough rows of the requested category (bounded by MAX_CATEGORY_PAGES).
        } while (
          contentCategory &&
          cursor &&
          pages < MAX_CATEGORY_PAGES &&
          countMatching(collected, contentCategory) < PREVIEW_LIMIT
        );
        if (!cancelled) setShares(collected);
      } catch (err: any) {
        if (!cancelled) {
          if (collected.length > 0) setShares(collected);
          setError(err?.message || "加载社区分享失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [active, server, contentCategory]);

  const filteredShares = contentCategory
    ? shares.filter((share) => matchesCategory(share, contentCategory))
    : shares;
  // Category mode fetched a larger page, so cap the grid again after filtering.
  const visibleShares = contentCategory
    ? filteredShares.slice(0, PREVIEW_LIMIT)
    : filteredShares;

  return (
    <div className="ShareCommunityPreview">
      {loading ? (
        <div className="ShareCommunityPreview__loading">正在加载最新分享...</div>
      ) : error ? (
        <div className="ShareCommunityPreview__empty">{error}</div>
      ) : visibleShares.length > 0 ? (
        <div className="ShareCommunityPreview__grid">
          {visibleShares.map((share) => (
            <ShareCard key={share.dbKey} share={share} />
          ))}
        </div>
      ) : (
        <div className="ShareCommunityPreview__empty">
          {contentCategory ? "暂无该分类的公开分享。" : "暂无社区分享，先去文章或对话页点击\"社区分享\"。"}
        </div>
      )}

      
    </div>
  );
};

export default ShareCommunityPreview;
