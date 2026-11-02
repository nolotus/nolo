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
import { ExploreCategoryNav } from "chat/web/ExploreCategoryNav";
import PluginExplore from "./PluginExplore";
import CreatorExplore from "./CreatorExplore";
import SkillExplore from "./SkillExplore";

/**
 * One Explore destination, driven by `?category=`.
 * 宽视口下分类入口在 Navigation V2 Context 列里。视口窄到放不下这一列时
 * （MainLayout 把列折叠成 Rail），同一个分类器改渲染成内容区顶部的横向条，
 * 保证入口不消失 — 它是替代品，不是并存的第二个 tab bar。
 * 注意「互斥」只对默认状态成立：窄视口里用户手动展开 Context 列时，顶部横条
 * 仍然保留（宁可多一个入口，也不要出现「展开了却是空列」）。
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

        {/* 窄视口下 Context 列被折叠成 Rail，这条横向分类条就是唯一入口；
            宽视口由 CSS 隐藏它，分类仍只出现在左侧 Context 列。 */}
        <div className="agent-explore-category-bar">
          <ExploreCategoryNav variant="bar" />
        </div>

        <div className="agent-explore-content">
          {category === "agent" ? (
            <PublicAgents limit={200} reloadMode="catalog" summary initialData={ssrAgents} />
          ) : category === "my-shares" ? (
            <MySharesPage />
          ) : category === "dialog" || category === "article" ? (
            <ShareCommunityPreview key={category} contentCategory={category} />
          ) : category === "user" ? (
            <CreatorExplore />
          ) : category === "plugin" ? (
            <PluginExplore />
          ) : category === "skill" ? (
            <SkillExplore />
          ) : (
            <p role="status">{t("explorePage.categoryEmpty.skill", "暂无公开的 Skill。")}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentExplore;
