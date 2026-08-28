// 文件路径: ai/agent/web/MyFavoriteAgentsPage.tsx

import "./MyFavoriteAgentsPage.css";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import type { Agent } from "app/types";
import { useFetchData } from "app/hooks";
import AgentBlock from "ai/agent/web/AgentBlock";
import Button from "render/web/ui/Button";
import {
  useFavoriteAgentIds,
  useFavoritesError,
  useFavoritesInitialized,
  useFavoritesLoading,
} from "app/favorite/favoriteStore";

/** 单个收藏项：根据 agentKey 拉取 Agent 数据，再复用 AgentBlock */
const FavoriteAgentItem = ({ agentKey }: { agentKey: string }) => {
  const { t } = useTranslation("ai");
  const { data, isLoading, error, reload } = useFetchData<Agent>(agentKey);

  if (isLoading) {
    return (
      <div className="fav-agent__skeleton">
        <div className="fav-agent__skeleton-avatar" />
        <div className="fav-agent__skeleton-lines">
          <div className="fav-agent__skeleton-line" />
          <div className="fav-agent__skeleton-line fav-agent__skeleton-line--short" />
        </div>
      </div>
    );
  }

  // Agent 可能已被删除、离开空间后读不到，或无授权可读 —— 显示死链提示，而不是静默消失。
  if (error || !data) {
    return (
      <div className="fav-agent__dead-link" role="status">
        <div className="fav-agent__dead-link-body">
          <strong className="fav-agent__dead-link-title">
            {t("favoriteDeadLinkTitle", "收藏项暂时不可用")}
          </strong>
          <p className="fav-agent__dead-link-desc">
            {t(
              "favoriteDeadLinkDesc",
              "可能已删除、离开了所在空间，或你只有收藏没有额度授权。收藏 ≠ 授权。",
            )}
          </p>
          <code className="fav-agent__dead-link-key">{agentKey}</code>
        </div>
        <Button size="small" variant="secondary" onClick={() => void reload()}>
          {t("retry", "重试")}
        </Button>
      </div>
    );
  }

  return <AgentBlock item={data} reload={reload} />;
};

const MyFavoriteAgentsPage = () => {
  const { t } = useTranslation("ai");

  const agentIds = useFavoriteAgentIds();
  const loading = useFavoritesLoading();
  const initialized = useFavoritesInitialized();
  const error = useFavoritesError();

  const isLoading = !initialized || loading;
  const hasFavorites = initialized && agentIds.length > 0;

  return (
    <div className="my-fav-agents">
      <div className="my-fav-agents__header">
        <h1 className="my-fav-agents__title">{t("myFavorites", "我的收藏")}</h1>
        <p className="my-fav-agents__subtitle">
          {t(
            "myFavoritesDesc",
            "你收藏的 AI 会出现在这里，方便快速找到并开始对话。"
          )}
        </p>
      </div>

      {isLoading && (
        <div className="my-fav-agents__loading">
          <div className="my-fav-agents__spinner" />
          <span className="my-fav-agents__loading-text">
            {t("loading", "加载中...")}
          </span>
        </div>
      )}

      {!isLoading && error && (
        <div className="my-fav-agents__error">
          <p>{t("loadFavoritesError", "加载收藏失败，请稍后重试。")}</p>
          <p className="my-fav-agents__error-detail">{error}</p>
        </div>
      )}

      {!isLoading && !error && !hasFavorites && (
        <div className="my-fav-agents__empty">
          <h2 className="my-fav-agents__empty-title">
            {t("noFavoritesTitle", "还没有收藏任何 AI")}
          </h2>
          <p className="my-fav-agents__empty-desc">
            {t(
              "noFavoritesDesc",
              "在公共 AI 列表或详情页，点击右上角的星标即可收藏。"
            )}
          </p>
          <Button
            size="medium"
            onClick={() => {
              // TODO: 跳转到公共助手广场，例如 /agents/public
              // navigate("/agents/public");
            }}
          >
            {t("goExplore", "去发现 AI")}
          </Button>
        </div>
      )}

      {!isLoading && !error && hasFavorites && (
        <div className="my-fav-agents__grid">
          {agentIds.map((agentKey: string) => (
            <FavoriteAgentItem key={agentKey} agentKey={agentKey} />
          ))}
        </div>
      )}

      
    </div>
  );
};

export default MyFavoriteAgentsPage;
