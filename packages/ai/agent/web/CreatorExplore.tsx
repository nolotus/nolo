// packages/ai/agent/web/CreatorExplore.tsx
//
// Explore「用户」栏目：公开 agent 按创作者归并后的目录。只展示作品数与被使用数
// （不展示 token 用量/计费数据——产品边界）。

import "./CreatorExplore.css";
import React, { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LuUsers, LuRefreshCw, LuBoxes, LuLayers } from "react-icons/lu";
import { Link } from "app/routing";
import Avatar from "render/web/ui/Avatar";
import { usePublicAgents } from "ai/agent/hooks/usePublicAgents";
import AgentGrid from "./AgentGrid";
import EmptyState from "./EmptyState";
import { buildCreatorDirectory, type CreatorDirectoryEntry } from "./creatorDirectory";

/** 创作者目录一次拉取的公开 agent 上限（与 PublicAgents 同量级）。 */
const CREATOR_DIRECTORY_LIMIT = 200;
const SKELETON_CARD_COUNT = 6;

const CreatorCard = memo(({ entry }: { entry: CreatorDirectoryEntry }) => {
  const { t } = useTranslation();
  return (
    <Link className="creator-card" to={`/profile/${entry.userId}`}>
      <Avatar
        className="creator-card__avatar"
        name={entry.displayName}
        size="large"
        type="user"
        shape="full"
      />
      <div className="creator-card__body">
        <span className="creator-card__name" title={entry.displayName}>
          {entry.displayName}
        </span>
        <div className="creator-card__stats">
          <span className="creator-card__stat">
            <LuBoxes size={13} aria-hidden="true" />
            {t("explorePage.creatorDirectory.agentCount", {
              count: entry.agentCount,
              defaultValue: "{{count}} 个作品",
            })}
          </span>
          <span className="creator-card__stat">
            <LuLayers size={13} aria-hidden="true" />
            {t("explorePage.creatorDirectory.totalUse", {
              count: entry.totalUse,
              defaultValue: "被使用 {{count}} 次",
            })}
          </span>
        </div>
      </div>
    </Link>
  );
});
CreatorCard.displayName = "CreatorCard";

const CreatorCardSkeleton = () => (
  <div className="creator-card creator-card--skeleton" aria-hidden="true">
    <div className="creator-card__avatar-skeleton creator-explore__shimmer" />
    <div className="creator-card__body">
      <div className="creator-card__line-skeleton creator-card__line-skeleton--name creator-explore__shimmer" />
      <div className="creator-card__line-skeleton creator-card__line-skeleton--stats creator-explore__shimmer" />
    </div>
  </div>
);

const CreatorExplore: React.FC = () => {
  const { t } = useTranslation();
  const { loading, error, data, retry } = usePublicAgents({
    limit: CREATOR_DIRECTORY_LIMIT,
    summary: true,
    reloadMode: "catalog",
  });

  const entries = useMemo(() => buildCreatorDirectory(data), [data]);
  const showSkeleton = loading && entries.length === 0;
  const showError = Boolean(error) && entries.length === 0;

  return (
    <div className="creator-explore">
      <div className="creator-explore__header">
        <h2 className="creator-explore__title">
          {t("explorePage.creatorDirectory.title", "创作者")}
        </h2>
        <p className="creator-explore__subtitle">
          {t(
            "explorePage.creatorDirectory.subtitle",
            "按发布者归并的公开 AI，点进去看这位创作者的全部作品。",
          )}
        </p>
      </div>

      {showError ? (
        <div className="creator-explore__error" role="alert">
          <span>
            {t("explorePage.creatorDirectory.error", "创作者列表加载失败，请稍后重试。")}
          </span>
          <button type="button" className="creator-explore__retry" onClick={() => retry()}>
            <LuRefreshCw size={14} aria-hidden="true" />
            {t("explorePage.creatorDirectory.retry", "重试")}
          </button>
        </div>
      ) : showSkeleton ? (
        <AgentGrid>
          {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
            <CreatorCardSkeleton key={index} />
          ))}
        </AgentGrid>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<LuUsers size={32} />}
          title={t("explorePage.creatorDirectory.empty", "暂无公开的创作者。")}
        />
      ) : (
        <AgentGrid>
          {entries.map((entry) => (
            <CreatorCard key={entry.userId} entry={entry} />
          ))}
        </AgentGrid>
      )}
    </div>
  );
};

export default CreatorExplore;
