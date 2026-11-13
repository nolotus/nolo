import "./MyContentPage.css";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "app/routing";
import { LuPlus } from "react-icons/lu";

import RequireSignedIn from "identity/RequireSignedIn";
import {
  type MyRouteSectionId,
  getMyRoutePathForTab,
  getMyRouteSection,
} from "app/constants/mySections";
import { useAgentDialog } from "ai/agent/hooks/useAgentDialog";
import { APP_BUILDER_PUBLIC_AGENT_KEY } from "app/constants/appEditor";
import Button from "render/web/ui/Button";
import SearchInput from "render/web/ui/SearchInput";

import MyContentCollection from "./MyContentCollection";

interface MyContentPageProps {
  sectionId?: MyRouteSectionId;
}

const MyContentPage: React.FC<MyContentPageProps> = ({ sectionId = "all" }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const section = getMyRouteSection(sectionId);
  const activeTab = section.tab ?? "all";
  const { startDialog: startAppBuilder } = useAgentDialog(APP_BUILDER_PUBLIC_AGENT_KEY);
  // /apps 是作品库：搜索与创建收在同一行（紧凑），不再另起一整行工具条。
  const isAppsSection = sectionId === "apps";
  const [appSearch, setAppSearch] = useState("");

  return (
    <RequireSignedIn>
      <div className={`MyContentPage${isAppsSection ? " MyContentPage--apps" : ""}`}>
        <div className="MyContentPage__header">
          <div className="MyContentPage__header-row">
            <div>
              <h1>{t(section.titleKey, section.defaultTitle)}</h1>
              <p>
                {section.subtitleKey && section.defaultSubtitle
                  ? t(section.subtitleKey, section.defaultSubtitle)
                  : t(
                      "homeTabs.myContentPageSubtitle",
                      "跨 space 查看最近更新的文档、表格、应用、图片、附件、AI 与对话。"
                    )}
              </p>
            </div>
            {isAppsSection && (
              <div className="MyContentPage__tools">
                <SearchInput
                  value={appSearch}
                  onChange={setAppSearch}
                  onSearch={() => {}}
                  onClear={() => setAppSearch("")}
                  placeholder={t("myApps_search_placeholder", "搜索应用…")}
                  className="MyContentPage__search"
                  size="small"
                />
                <Button
                  onClick={() => startAppBuilder()}
                  icon={<LuPlus size={15} />}
                  size="medium"
                >
                  {t("myApps_create", "创建应用")}
                </Button>
              </div>
            )}
          </div>
        </div>

        <MyContentCollection
          showSearch={!isAppsSection}
          searchQuery={isAppsSection ? appSearch : undefined}
          onSearchQueryChange={isAppsSection ? setAppSearch : undefined}
          activeTab={activeTab}
          onTabChange={(tab) => navigate(getMyRoutePathForTab(tab))}
        />
      </div>
    </RequireSignedIn>
  );
};

export default MyContentPage;
