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
import { LuGlobe, LuPencil, LuTrash2, LuShare2 } from "react-icons/lu";
import EmptyState from "ai/agent/web/EmptyState";

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

    const loading = agentsLoading || isProfileLoading;

    // 确定展示名称：优先从用户资料中提取，再从智能体元数据中提取，最后用 ID 兜底
    const creatorName = React.useMemo(() => {
        if (!isProfileLoading) {
            if (profile?.nickname) return profile.nickname;
            if (profile?.username) return profile.username;
            if (profile?.name) return profile.name;
        }

        const firstAgent = agents?.[0];
        if (firstAgent?.userName) return firstAgent.userName;
        if (firstAgent?.creatorName) return firstAgent.creatorName;
        if (firstAgent?.creator?.name) return firstAgent.creator.name;

        // 如果个人资料还在加载且没有数据，先不展示以避免文字长度剧烈抖动
        if (isProfileLoading) return " ";

        return cleanUserId.slice(0, 8) || t("unknownUser");
    }, [profile, agents, cleanUserId, t, isProfileLoading]);

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

    return (
        <div className="creator-page">
            <header className="creator-page__header">
                <div className="creator-page__header-bg" />
                <div className="creator-page__header-content">
                    {isProfileLoading && !profile ? (
                        <>
                            <div className="creator-page__avatar-wrapper creator-page__avatar-wrapper--skeleton">
                                <div className="creator-page__avatar-skeleton creator-page__shimmer" />
                            </div>
                            <div className="creator-page__main-info">
                                <div className="creator-page__title-row">
                                    <div className="creator-page__title-skeleton creator-page__shimmer" />
                                </div>
                                <div className="creator-page__bio-skeleton creator-page__shimmer" />
                            </div>
                            <div className="creator-page__stats-grid">
                                <div className="creator-page__stat-card-skeleton creator-page__shimmer" />
                                <div className="creator-page__stat-card-skeleton creator-page__shimmer" />
                            </div>
                        </>
                    ) : (
                        <>
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
                                <div className="creator-page__title-row">
                                    <h1 className="creator-page__title">{creatorName}</h1>
                                    <span className="creator-page__badge">Verified Creator</span>
                                </div>
                                {(profile?.bio || profile?.signature) && (
                                    <div className="creator-page__bio">
                                        <LuPencil size={14} className="creator-page__bio-icon" aria-hidden="true" />
                                        <span>{profile.bio || profile.signature}</span>
                                    </div>
                                )}
                                {profile?.website && (
                                    <div className="creator-page__website">
                                        <LuGlobe size={14} className="creator-page__website-icon" aria-hidden="true" />
                                        <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer">
                                            {profile.website.replace(/^https?:\/\//, '')}
                                        </a>
                                    </div>
                                )}
                            </div>
                            <div className="creator-page__stats-grid">
                                <div className="creator-page__stat-card">
                                    <span className="creator-page__stat-value">
                                        {agentsLoading && !agents ? (
                                            <span className="creator-page__stat-value-skeleton creator-page__shimmer" />
                                        ) : (
                                            stats.count
                                        )}
                                    </span>
                                    <span className="creator-page__stat-label">{t("published", "已发布")}</span>
                                </div>
                                <div className="creator-page__stat-card">
                                    <span className="creator-page__stat-value">
                                        {agentsLoading && !agents ? (
                                            <span className="creator-page__stat-value-skeleton creator-page__shimmer" />
                                        ) : (
                                            stats.totalUse
                                        )}
                                    </span>
                                    <span className="creator-page__stat-label">{t("totalUse", "总使用")}</span>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </header>

            <div className="creator-page__content">
                <div className="creator-page__tabs">
                    <button
                        type="button"
                        className={`creator-page__tab-btn ${activeTab === "agents" ? "active" : ""}`}
                        onClick={() => setActiveTab("agents")}
                    >
                        {t("publicAgents", "展示橱窗")}
                        {!loading && <span className="creator-page__tab-badge">{stats.count}</span>}
                    </button>
                    <button
                        type="button"
                        className={`creator-page__tab-btn ${activeTab === "shares" ? "active" : ""}`}
                        onClick={() => setActiveTab("shares")}
                    >
                        {t("communityShares", "社区分享")}
                        {!sharesLoading && <span className="creator-page__tab-badge">{shares.length}</span>}
                    </button>
                </div>

                {activeTab === "agents" && (
                    <div className="creator-page__tab-pane">
                        <PublicAgentsList
                            loading={agentsLoading}
                            data={agents}
                            reload={retry}
                            keepGridHeight
                        />
                        {error && (
                            <div className="creator-page__error">
                                <p>{t("loadError", "无法加载创作者内容")}</p>
                                <button type="button" className="creator-page__retry-btn" onClick={() => void retry()}>
                                    {t("retry", "重新加载")}
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === "shares" && (
                    <div className="creator-page__tab-pane">
                        {sharesLoading && (
                            <div className="creator-page__share-state">
                                {t("loading", "加载中...")}
                            </div>
                        )}

                        {!sharesLoading && sharesError && (
                            <div className="creator-page__share-state">{sharesError}</div>
                        )}

                        {!sharesLoading && !sharesError && shares.length === 0 && (
                            <EmptyState
                                icon={<LuShare2 size={32} />}
                                title={t("noCommunityShares", "暂无公开的分享内容")}
                                subtitle="该用户暂未在社区公开分享任何内容"
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
                                            {canDeleteShare(share) && (
                                                <button
                                                    type="button"
                                                    className="creator-page__share-delete-btn"
                                                    onClick={() => void handleDeleteShare(share)}
                                                >
                                                    <LuTrash2 size={14} aria-hidden="true" />
                                                    {t("delete", "删除")}
                                                </button>
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
