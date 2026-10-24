import "./AgentExplore.css";
import React from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "app/routing";
import { usePageMeta, useStaticPageMeta } from "app/hooks/usePageMeta";
import PublicAgents from "ai/agent/web/PublicAgents";
import { useSSRPublicAgents } from "ai/agent/publicAgentsSSRStore";
import ShareCommunityPreview from "app/pages/ShareCommunityPreview";
import MySharesPage from "app/pages/MySharesPage";
import { resolveExploreCategory } from "app/navigation/exploreCategory";
import PluginExplore from "./PluginExplore";

/**
 * One Explore destination, driven by `?category=`.
 * Categories live in the Navigation V2 Context column, not in a second tab bar.
 */
const AgentExplore: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const category = resolveExploreCategory(location.search);
  const pageMeta = useStaticPageMeta("explore");
  usePageMeta(pageMeta);
  // SSR 预载的公开 agents（explore 数据公开）：hydration 后首屏即渲染，无需等 RPC
  const ssrAgents = useSSRPublicAgents();

  return (
    <div className="agent-explore">
      <div className="agent-explore__inner">
        <div className="agent-explore-header">
          <h1 className="agent-explore-title">{t("explorePage.title", "探索")}</h1>
          <p className="agent-explore-subtitle">{t("explorePage.subtitle", "发现并探索更多 AI")}</p>
        </div>

        <div className="agent-explore-content">
          {category === "agent" ? (
            <PublicAgents limit={200} reloadMode="catalog" summary initialData={ssrAgents} />
          ) : category === "my-shares" ? (
            <MySharesPage />
          ) : category === "dialog" || category === "article" ? (
            <ShareCommunityPreview key={category} contentCategory={category} />
          ) : category === "user" ? (
            <p role="status">{t("explorePage.categoryEmpty.user", "暂无公开的用户。")}</p>
          ) : category === "plugin" ? (
            <PluginExplore />
          ) : (
            <p role="status">{t("explorePage.categoryEmpty.skill", "暂无公开的 Skill。")}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentExplore;
