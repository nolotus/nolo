import * as stylex from "@stylexjs/stylex";
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
import { coverStyles, mySharesPageStyles as styles } from "./MySharesPageStyles";

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
      <div {...stylex.props(styles.root)}>
        <div {...stylex.props(styles.empty)}>
          {t("myShares.requireLogin", "请先登录后查看你的分享。")}
        </div>
      </div>
    );
  }

  return (
    <div {...stylex.props(styles.root)}>
      <header {...stylex.props(styles.header)}>
        <div>
          <h1 {...stylex.props(styles.headerTitle)}>{t("myShares.title", "我的分享")}</h1>
          <p {...stylex.props(styles.headerText)}>{t("myShares.subtitle", "你发布和分享出去的页面、对话、表格与应用。")}</p>
        </div>
        <NavLink to="/share/community" {...stylex.props(styles.communityLink)}>
          {t("myShares.browseCommunity", "浏览社区")}
        </NavLink>
      </header>

      {loading && (
        <div {...stylex.props(styles.status)}>
          {t("myShares.loading", "正在加载...")}
        </div>
      )}
      {error && !loading && (
        <div {...stylex.props(styles.status)}>{error}</div>
      )}
      {!loading && !error && shares.length === 0 && (
        <div {...stylex.props(styles.empty)}>
          <p>{t("myShares.empty", "还没有任何分享。")}</p>
          <p>{t("myShares.emptyHint", "在文章、对话或表格页面点击分享按钮即可创建。")}</p>
        </div>
      )}

      {!loading && shares.length > 0 && (
        <div {...stylex.props(styles.list)}>
          {shares.slice(0, visibleCount).map((share) => (
            <article key={share.token} {...stylex.props(styles.item)}>
              {share.coverImage ? (
                <NavLink
                  to={createWebSharePath(share.token)}
                  {...stylex.props(styles.cover)}
                  aria-label={share.title || t("unknown", "未命名")}
                >
                  <img {...stylex.props(styles.coverImage)} src={share.coverImage} alt="" />
                </NavLink>
              ) : (
                <NavLink
                  to={createWebSharePath(share.token)}
                  {...stylex.props(styles.cover, coverStyles[share.type as keyof typeof coverStyles])}
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
                {...stylex.props(styles.deleteBtn)}
                disabled={deletingTokens.has(share.token)}
                onClick={() => void handleDelete(share.token)}
                aria-label={t("delete", "删除")}
                title={t("delete", "删除")}
              >
                <LuTrash2 size={16} aria-hidden="true" />
              </button>
              <div {...stylex.props(styles.itemMain)}>
                <NavLink
                  to={createWebSharePath(share.token)}
                  {...stylex.props(styles.itemTitle)}
                >
                  {share.title || t("unknown", "未命名")}
                </NavLink>
                <div {...stylex.props(styles.itemMeta)}>
                  <span {...stylex.props(styles.badge)}>
                    {getShareTypeLabel(share.type)}
                  </span>
                  <span {...stylex.props(styles.visibility)}>
                    {share.visibility === "community"
                      ? t("share_visibility_public", "公开")
                      : t("share_visibility_private", "私人")}
                  </span>
                  <span {...stylex.props(styles.time)}>
                    {formatShareTime(
                      share.updatedAt && share.updatedAt > share.createdAt
                        ? share.updatedAt
                        : share.createdAt
                    )}
                  </span>
                </div>
                {(share.agentName || share.description) && (
                  <p {...stylex.props(styles.itemDescription)}>
                    {share.agentName || share.description}
                  </p>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {visibleCount < shares.length && !loading && (
        <div {...stylex.props(styles.loadMore)}>
          <button
            type="button"
            {...stylex.props(styles.loadMoreBtn)}
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
