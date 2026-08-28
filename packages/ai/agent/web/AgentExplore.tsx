import "./AgentExplore.css";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { LuChevronRight } from "react-icons/lu";
import { NavLink } from "app/routing";
import { usePageMeta } from "app/hooks/usePageMeta";
import { buildStaticPageMeta } from "app/seo/pageMeta";
import PublicAgents from "ai/agent/web/PublicAgents";
import { useSSRPublicAgents } from "ai/agent/publicAgentsSSRStore";
import ShareCommunityPreview from "app/pages/ShareCommunityPreview";
import { Tabs, TabList, Tab } from "render/web/ui/Tabs";

type ExploreTab = "aiPlaza" | "shareCommunity";

const AgentExplore: React.FC = () => {
  const { t } = useTranslation();
  const pageMeta = useMemo(() => buildStaticPageMeta(t, "explore"), [t]);
  usePageMeta(pageMeta);
  // SSR 预载的公开 agents（explore 数据公开）：hydration 后首屏即渲染，无需等 RPC
  const ssrAgents = useSSRPublicAgents();

  const [activeTab, setActiveTab] = useState<ExploreTab>("aiPlaza");

  return (
    <div className="agent-explore">
      <div className="agent-explore__inner">
        <div className="agent-explore-header">
          <h1 className="agent-explore-title">{t("explorePage.title", "探索")}</h1>
          <p className="agent-explore-subtitle">{t("explorePage.subtitle", "发现并探索更多 AI")}</p>
        </div>

        <Tabs
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key as ExploreTab)}
          className="agent-explore-tabs"
        >
          <TabList aria-label={t("explorePage.title", "探索")} className="agent-explore-tablist">
            <Tab id="aiPlaza" className="agent-explore-tab">
              {t("homeTabs.aiPlaza", "AI 广场")}
            </Tab>
            <Tab id="shareCommunity" className="agent-explore-tab">
              {t("homeTabs.shareCommunity", "社区分享")}
            </Tab>
          </TabList>
        </Tabs>

        <div className="agent-explore-content">
          {activeTab === "aiPlaza" ? (
            <PublicAgents
              limit={200}
              reloadMode="catalog"
              summary
              initialData={ssrAgents}
            />
          ) : (
            <div className="agent-explore-community">
              <ShareCommunityPreview active={activeTab === "shareCommunity"} />
              <div className="agent-explore-community-footer">
                <NavLink to="/share/community" className="agent-explore-community-link">
                  <span>{t("homeTabs.enterCommunity", "进入社区")}</span>
                  <LuChevronRight size={16} aria-hidden="true" />
                </NavLink>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentExplore;
