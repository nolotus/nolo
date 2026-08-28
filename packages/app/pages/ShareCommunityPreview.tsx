import "./ShareCommunityPreview.css";
import React, { useEffect, useState } from "react";
import type { ShareSummary } from "share/types";
import { createWebSharePath, shareApi } from "share/link";
import { useSSRCommunityShares } from "share/shareStore";
import { useAppSelector } from "app/store";
import { selectRemoteServer } from "app/settings/settingSlice";
import { ShareCard, type ShareCardItem } from "./ShareCard";

type ShareCommunityPreviewProps = {
  active?: boolean;
};

const mapSummary = (s: ShareSummary): ShareCardItem => ({
  ...s,
  dbKey: `share-${s.token}`,
  path: createWebSharePath(s.token),
  ...(s.authorId ? { authorPath: `/profile/${encodeURIComponent(s.authorId)}` } : {}),
  ...(s.agentKey ? { agentPath: `/${encodeURIComponent(s.agentKey)}` } : {}),
});

const ShareCommunityPreview: React.FC<ShareCommunityPreviewProps> = ({ active = true }) => {
  const ssrCommunityShares = useSSRCommunityShares();
  const [shares, setShares] = useState<ShareCardItem[]>(() =>
    Array.isArray(ssrCommunityShares.data)
      ? ssrCommunityShares.data.map(mapSummary)
      : []
  );
  const [loading, setLoading] = useState(() => shares.length === 0);
  const [error, setError] = useState<string | null>(null);
  const server = useAppSelector(selectRemoteServer);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    const load = async () => {
      if (shares.length === 0) {
        setLoading(true);
      }
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "6", coverImage: "url" });
        const res = await fetch(shareApi.community(server, params));
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        const json = await res.json();
        if (!cancelled) setShares((json.data || []).map(mapSummary));
      } catch (err: any) {
        if (!cancelled) {
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
  }, [active, server, shares.length]);

  return (
    <div className="ShareCommunityPreview">
      {loading ? (
        <div className="ShareCommunityPreview__loading">正在加载最新分享...</div>
      ) : error ? (
        <div className="ShareCommunityPreview__empty">{error}</div>
      ) : shares.length > 0 ? (
        <div className="ShareCommunityPreview__grid">
          {shares.map((share) => (
            <ShareCard key={share.dbKey} share={share} />
          ))}
        </div>
      ) : (
        <div className="ShareCommunityPreview__empty">
          暂无社区分享，先去文章或对话页点击"社区分享"。
        </div>
      )}

      
    </div>
  );
};

export default ShareCommunityPreview;
