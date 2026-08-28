import "./MySharesPage.css";
import React, { useCallback, useEffect, useState } from "react";
import { NavLink } from "app/routing";
import {
  LuBot,
  LuFileText,
  LuImage,
  LuLayoutDashboard,
  LuMessageSquare,
  LuTable,
  LuTrash2,
} from "react-icons/lu";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "app/store";
import { useToken, useUserId } from "identity";
import {
  selectRemoteServers,
} from "app/settings/settingSlice";
import { remove } from "database/dbSlice";
import type { ShareSummary } from "share/types";
import { createWebSharePath } from "share/link";
import { formatShareTime } from "share/helpers";
import { loadOwnerSharesAcrossServers } from "share/loadOwnerShares";
import { getShareTypeLabel } from "share/types";
import { toast } from "app/utils/toast"
import { DataType } from "create/types";

const PAGE_SIZE = 30;

const getShareTypeIcon = (type: ShareSummary["type"]) => {
  if (type === DataType.DOC) return LuFileText;
  if (type === DataType.DIALOG) return LuMessageSquare;
  if (type === "cybot") return LuBot;
  if (type === DataType.IMAGE) return LuImage;
  if (type === DataType.APP) return LuLayoutDashboard;
  if (type === DataType.TABLE) return LuTable;
  return LuFileText;
};

const MySharesPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const userId = useUserId();
  const currentToken = useToken();
  const servers = useAppSelector(selectRemoteServers);
  const [shares, setShares] = useState<ShareSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [deletingTokens, setDeletingTokens] = useState<Set<string>>(new Set());

  const fetchShares = useCallback(
    async () => {
      if (!userId || !currentToken) return;
      setLoading(true);
      setError(null);

      try {
        const items = await loadOwnerSharesAcrossServers({
          servers,
          userId,
          token: currentToken,
          pageSize: 200,
        });
        setShares(items);
        setVisibleCount(PAGE_SIZE);
      } catch (err: any) {
        setError(err?.message || t("myShares.loadError", "加载分享列表失败"));
      } finally {
        setLoading(false);
      }
    },
    [currentToken, servers, t, userId]
  );

  useEffect(() => {
    void fetchShares();
  }, [fetchShares]);

  const handleDelete = useCallback(
    async (token: string) => {
      const dbKey = `share-${token}`;
      setDeletingTokens((prev) => new Set(prev).add(token));
      try {
        await (dispatch as any)(remove({ dbKey })).unwrap();
        setShares((prev) => prev.filter((s) => s.token !== token));
        setVisibleCount((prev) => Math.max(PAGE_SIZE, prev - 1));
        toast.success(t("myShares.deleted", "分享已删除"));
      } catch (err: any) {
        toast.error(t("myShares.deleteFailed", "删除失败：{{error}}", { error: err?.message || t("unknown") }));
      } finally {
        setDeletingTokens((prev) => {
          const next = new Set(prev);
          next.delete(token);
          return next;
        });
      }
    },
    [dispatch, t]
  );

  if (!userId) {
    return (
      <div className="MySharesPage">
        <div className="MySharesPage__empty">
          {t("myShares.requireLogin", "请先登录后查看你的分享。")}
        </div>
      </div>
    );
  }

  return (
    <div className="MySharesPage">
      <header className="MySharesPage__header">
        <div>
          <h1>{t("myShares.title", "我的分享")}</h1>
          <p>{t("myShares.subtitle", "你发布和分享出去的页面、对话、表格与应用。")}</p>
        </div>
        <NavLink to="/share/community" className="MySharesPage__communityLink">
          {t("myShares.browseCommunity", "浏览社区")}
        </NavLink>
      </header>

      {loading && (
        <div className="MySharesPage__status">
          {t("myShares.loading", "正在加载...")}
        </div>
      )}
      {error && !loading && (
        <div className="MySharesPage__status">{error}</div>
      )}
      {!loading && !error && shares.length === 0 && (
        <div className="MySharesPage__empty">
          <p>{t("myShares.empty", "还没有任何分享。")}</p>
          <p>{t("myShares.emptyHint", "在文章、对话或表格页面点击分享按钮即可创建。")}</p>
        </div>
      )}

      {!loading && shares.length > 0 && (
        <div className="MySharesPage__list">
          {shares.slice(0, visibleCount).map((share) => (
            <article key={share.token} className="MySharesPage__item">
              {share.coverImage ? (
                <NavLink
                  to={createWebSharePath(share.token)}
                  className="MySharesPage__cover"
                  aria-label={share.title || t("unknown", "未命名")}
                >
                  <img src={share.coverImage} alt="" />
                </NavLink>
              ) : (
                <NavLink
                  to={createWebSharePath(share.token)}
                  className={`MySharesPage__cover MySharesPage__cover--${share.type}`}
                  aria-label={share.title || t("unknown", "未命名")}
                >
                  {React.createElement(getShareTypeIcon(share.type), {
                    size: 26,
                    "aria-hidden": true,
                  })}
                </NavLink>
              )}
              <button
                type="button"
                className="MySharesPage__deleteBtn"
                disabled={deletingTokens.has(share.token)}
                onClick={() => void handleDelete(share.token)}
                aria-label={t("delete", "删除")}
                title={t("delete", "删除")}
              >
                <LuTrash2 size={16} aria-hidden="true" />
              </button>
              <div className="MySharesPage__itemMain">
                <NavLink
                  to={createWebSharePath(share.token)}
                  className="MySharesPage__itemTitle"
                >
                  {share.title || t("unknown", "未命名")}
                </NavLink>
                <div className="MySharesPage__itemMeta">
                  <span className="MySharesPage__badge">
                    {getShareTypeLabel(share.type)}
                  </span>
                  <span className="MySharesPage__visibility">
                    {share.visibility === "community"
                      ? t("share_visibility_public", "公开")
                      : t("share_visibility_private", "私人")}
                  </span>
                  <span className="MySharesPage__time">
                    {formatShareTime(
                      share.updatedAt && share.updatedAt > share.createdAt
                        ? share.updatedAt
                        : share.createdAt
                    )}
                  </span>
                </div>
                {(share.agentName || share.description) && (
                  <p className="MySharesPage__itemDescription">
                    {share.agentName || share.description}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {visibleCount < shares.length && !loading && (
        <div className="MySharesPage__loadMore">
          <button
            type="button"
            className="MySharesPage__loadMoreBtn"
            onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
          >
            {t("myShares.loadMore", "加载更多")}
          </button>
        </div>
      )}
    </div>
  );
};

export default MySharesPage;
