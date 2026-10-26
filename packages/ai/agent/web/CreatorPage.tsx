// ai/agent/web/CreatorPage.tsx
import "./CreatorPage.css";
import React from "react";
import { Link, useParams } from "app/routing";
import { useTranslation } from "react-i18next";
import { usePublicAgents } from "ai/agent/hooks/usePublicAgents";
import PublicAgentsList from "./PublicAgentsList";
import Avatar from "render/web/ui/Avatar";
import { createUserKey } from "database/keys";
import { useFetchData } from "app/hooks";
import { useAppDispatch, useAppSelector } from "app/store";
import { useUserId } from "identity";
import { selectCurrentServer } from "app/settings/settingSlice";
import { remove } from "database/dbSlice";
import { createWebSharePath, shareApi } from "share/link";
import { formatShareTime } from "share/helpers";
import { getShareTypeLabel } from "share/types";
import type { ShareSummary } from "share/types";
import { DataType } from "create/types";
import { toast } from "app/utils/toast"
import { isSystemAdmin } from "core/init";
import { normalizeUserId } from "core/userId";
import { LuGlobe, LuTrash2, LuShare2 } from "react-icons/lu";
import EmptyState from "ai/agent/web/EmptyState";

const formatCount = (value: number) => value.toLocaleString();

const CreatorPage: React.FC = () => {
    const { userId = "" } = useParams<"userId">();
    const { t } = useTranslation(["ai", "common", "space"]);
    const dispatch = useAppDispatch();
    const currentUserId = useUserId();
    const server = useAppSelector(selectCurrentServer);
    const [shares, setShares] = React.useState<ShareSummary[]>([]);
    const [sharesLoading, setSharesLoading] = React.useState(false);
    const [sharesError, setSharesError] = React.useState<string | null>(null);
    const [activeTab, setActiveTab] = React.useState<"agents" | "shares">("agents");

    // 规范化 userId (抽离前缀)
    const cleanUserId = React.useMemo(() => {
        return normalizeUserId(userId);
    }, [userId]);

    const normalizedCurrentUserId = React.useMemo(
        () => normalizeUserId(currentUserId),
        [currentUserId]
    );
    const canManageAnyShare = isSystemAdmin(currentUserId);

    React.useEffect(() => {
        if (!cleanUserId) {
            setShares([]);
            return;
        }

        let cancelled = false;

        const loadCreatorShares = async () => {
            setSharesLoading(true);
            setSharesError(null);

            try {
                const params = new URLSearchParams({ limit: "100" });
                const response = await fetch(
                    shareApi.creatorCommunity(server, cleanUserId, params)
                );
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                const payload = await response.json();
                const list = Array.isArray(payload?.data)
                    ? (payload.data as ShareSummary[])
                    : [];
                if (!cancelled) setShares(list);
            } catch {
                if (!cancelled) {
                    setShares([]);
                    setSharesError(t("loadError", "无法加载创作者内容"));
                }
            } finally {
                if (!cancelled) setSharesLoading(false);
            }
        };

        void loadCreatorShares();

        return () => {
            cancelled = true;
        };
    }, [cleanUserId, t, server]);

    // 获取用户资料
    const profileKey = React.useMemo(() => createUserKey.profile(cleanUserId), [cleanUserId]);
    const { data: profile, isLoading: isProfileLoading } = useFetchData<any>(profileKey);

    const { loading: agentsLoading, error, data: agents, retry } = usePublicAgents({
        userId: cleanUserId,
        limit: 100,
        sortBy: "newest",
        reloadMode: "catalog",
    });

    // 确定展示名称：优先从用户资料中提取，再从智能体元数据中提取，最后用 ID 兜底
    const creatorIdentity = React.useMemo(() => {
        if (!isProfileLoading) {
            if (profile?.nickname) return { name: profile.nickname as string, fromProfile: true };
            if (profile?.username) return { name: profile.username as string, fromProfile: true };
            if (profile?.name) return { name: profile.name as string, fromProfile: true };
        }

        const firstAgent = agents?.[0];
        if (firstAgent?.userName) return { name: firstAgent.userName as string, fromProfile: true };
        if (firstAgent?.creatorName) return { name: firstAgent.creatorName as string, fromProfile: true };
        if (firstAgent?.creator?.name) return { name: firstAgent.creator.name as string, fromProfile: true };

        // 如果个人资料还在加载且没有数据，先不展示以避免文字长度剧烈抖动
        if (isProfileLoading) return { name: " ", fromProfile: true };

        return {
            name: cleanUserId.slice(0, 8) || t("unknownUser"),
            fromProfile: false,
        };
    }, [profile, agents, cleanUserId, t, isProfileLoading]);

    const creatorName = creatorIdentity.name.trim();
    const isIdFallback = Boolean(creatorName) && !creatorIdentity.fromProfile;

    // 计算汇总数据
    const stats = React.useMemo(() => {
        if (!agents) return { count: 0, totalUse: 0 };
        return {
            count: agents.length,
            totalUse: agents.reduce((sum: number, agent: any) => sum + (agent.metrics?.useCount || 0), 0)
        };
    }, [agents]);

    const canDeleteShare = React.useCallback(
        (share: ShareSummary) => {
            if (!normalizedCurrentUserId) return false;
            const isOwner = normalizeUserId(share.authorId) === normalizedCurrentUserId;
            return isOwner || canManageAnyShare;
        },
        [normalizedCurrentUserId, canManageAnyShare]
    );

    const handleDeleteShare = React.useCallback(
        async (share: ShareSummary) => {
            if (!canDeleteShare(share)) {
                toast.error(t("noPermission", "你没有权限删除该分享"));
                return;
            }

            const confirmed = window.confirm(
                canManageAnyShare
                    ? "确认删除该分享？管理员删除后，该社区分享将不可访问。"
                    : "确认删除该分享？删除后该社区分享将不可访问。"
            );
            if (!confirmed) return;

            try {
                const dbKey = `share-${share.token}`;
                await dispatch(remove(dbKey)).unwrap();
                setShares((prev) => prev.filter((item) => item.token !== share.token));
                toast.success(t("deleteSuccess", "分享已删除"));
            } catch {
                toast.error(t("deleteError", "删除失败，请稍后重试"));
            }
        },
        [canDeleteShare, canManageAnyShare, dispatch, t]
    );

    // 尝试获取头像 URL
    const avatarSrc = profile?.avatar || profile?.avatarUrl || profile?.avatarFileId;

    const hasAnyPublishedContent =
        stats.count > 0 || stats.totalUse > 0 || shares.length > 0;

    return (
        <div className="creator-page">
            <header className="creator-page__header">
                <div className="creator-page__header-bg" aria-hidden="true" />
                <div className="creator-page__header-content">
                    {isProfileLoading && !profile ? (
                        <div className="creator-page__identity" aria-hidden="true">
                            <span className="creator-page__skeleton creator-page__skeleton--avatar" />
                            <div className="creator-page__main-info">
                                <span className="creator-page__skeleton creator-page__skeleton--title" />
                                <span className="creator-page__skeleton creator-page__skeleton--line" />
                                <span className="creator-page__skeleton creator-page__skeleton--value" />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="creator-page__identity">
                                <div className="creator-page__avatar-wrapper">
                                    <Avatar
                                        name={creatorName}
                                        size="xxlarge"
                                        type="user"
                                        shape="full"
                                        className="creator-page__avatar"
                                        src={avatarSrc}
                                    />
                                </div>
                                <div className="creator-page__main-info">
                                    <h1
                                        className={
                                            isIdFallback
                                                ? "creator-page__title creator-page__title--fallback"
                                                : "creator-page__title"
                                        }
                                        title={creatorName || undefined}
                                    >
                                        {creatorName}
                                    </h1>
                                    {(profile?.bio || profile?.signature) && (
                                        <p className="creator-page__bio">{profile.bio || profile.signature}</p>
                                    )}
                                    {profile?.website && (
                                        <div className="creator-page__website">
                                            <LuGlobe
                                                size={14}
                                                className="creator-page__website-icon"
                                                aria-hidden="true"
                                            />
                                            <a
                                                href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                {profile.website.replace(/^https?:\/\//, '')}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {agentsLoading ? (
                                <div className="creator-page__meta" aria-hidden="true">
                                    <span className="creator-page__skeleton creator-page__skeleton--value" />
                                </div>
                            ) : hasAnyPublishedContent ? (
                                <div className="creator-page__meta">
                                    <span
                                        className={
                                            stats.totalUse > 0
                                                ? "creator-page__meta-item"
                                                : "creator-page__meta-item creator-page__meta-item--zero"
                                        }
                                    >
                                        <span className="creator-page__meta-value">
                                            {formatCount(stats.totalUse)}
                                        </span>
                                        <span className="creator-page__meta-label">
                                            {t("totalUse", "总使用")}
                                        </span>
                                    </span>
                                </div>
                            ) : null}
                        </>
                    )}
                </div>
            </header>

            <div className="creator-page__content">
                <div className="creator-page__tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "agents"}
                        className={`creator-page__tab-btn ${activeTab === "agents" ? "active" : ""}`}
                        onClick={() => setActiveTab("agents")}
                    >
                        {t("publicAgents", "展示橱窗")}
                        {!agentsLoading && (
                            <span
                                className={
                                    stats.count > 0
                                        ? "creator-page__tab-badge"
                                        : "creator-page__tab-badge creator-page__tab-badge--zero"
                                }
                            >
                                {formatCount(stats.count)}
                            </span>
                        )}
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === "shares"}
                        className={`creator-page__tab-btn ${activeTab === "shares" ? "active" : ""}`}
                        onClick={() => setActiveTab("shares")}
                    >
                        {t("communityShares", "社区分享")}
                        {!sharesLoading && (
                            <span
                                className={
                                    shares.length > 0
                                        ? "creator-page__tab-badge"
                                        : "creator-page__tab-badge creator-page__tab-badge--zero"
                                }
                            >
                                {formatCount(shares.length)}
                            </span>
                        )}
                    </button>
                </div>

                {activeTab === "agents" && (
                    <div className="creator-page__tab-pane">
                        <PublicAgentsList
                            loading={agentsLoading}
                            error={error}
                            data={agents}
                            reload={retry}
                            keepGridHeight
                        />
                    </div>
                )}

                {activeTab === "shares" && (
                    <div className="creator-page__tab-pane">
                        {sharesLoading && (
                            <div className="creator-page__share-grid" aria-hidden="true">
                                {[0, 1, 2].map((index) => (
                                    <div
                                        key={index}
                                        className="creator-page__share-card creator-page__share-card--skeleton"
                                    >
                                        <span className="creator-page__skeleton creator-page__skeleton--title" />
                                        <span className="creator-page__skeleton creator-page__skeleton--line" />
                                        <span className="creator-page__skeleton creator-page__skeleton--line" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {!sharesLoading && sharesError && (
                            <div className="creator-page__share-state" role="status">
                                {sharesError}
                            </div>
                        )}

                        {!sharesLoading && !sharesError && shares.length === 0 && (
                            <EmptyState
                                icon={<LuShare2 size={32} />}
                                title={t("noCommunityShares", "暂无公开的分享内容")}
                                subtitle={t(
                                    "noCommunitySharesHint",
                                    "该用户还没有在社区公开分享内容"
                                )}
                            />
                        )}

                        {!sharesLoading && shares.length > 0 && (
                            <div className="creator-page__share-grid">
                                {shares.map((share) => (
                                    <article key={share.token} className="creator-page__share-card">
                                        <div className="creator-page__share-meta">
                                            <span className="creator-page__share-type">
                                                {getShareTypeLabel(share.type)}
                                            </span>
                                            <span className="creator-page__share-time">
                                                {formatShareTime(share.createdAt)}
                                            </span>
                                        </div>
                                        {canDeleteShare(share) && (
                                            <button
                                                type="button"
                                                className="creator-page__share-delete-btn"
                                                onClick={() => void handleDeleteShare(share)}
                                                aria-label={t("deleteShare", "删除该分享")}
                                                title={t("delete", "删除")}
                                            >
                                                <LuTrash2 size={16} aria-hidden="true" />
                                            </button>
                                        )}
                                        <h3 className="creator-page__share-title">{share.title}</h3>
                                        {share.description && (
                                            <p className="creator-page__share-description">{share.description}</p>
                                        )}
                                        <div className="creator-page__share-actions">
                                            {share.type === DataType.APP && share.url ? (
                                                <a
                                                    href={share.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="creator-page__share-link"
                                                >
                                                    {t("openApp", "打开应用")}
                                                </a>
                                            ) : (
                                                <Link
                                                    to={createWebSharePath(share.token)}
                                                    className="creator-page__share-link"
                                                >
                                                    {t("viewDetails", "查看详情")}
                                                </Link>
                                            )}
                                        </div>
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CreatorPage;
