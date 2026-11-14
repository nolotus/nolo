// 我的内容页（MY_ROUTE_SECTIONS 体系的渲染实现：13 个路由中 12 个走这里，
// /favorites 走 MyFavoritesPage）。
//
// ⚠️ 已进入**弃用状态**（2026-11-14），但**不能删**——原因不是感情，是测试覆盖：
//   `e2e/attachments.spec.ts` 共 41 处 page.goto，其中 **11 处**访问本体系的路由
//   （/attachments/documents、/images、/videos、/audios、/tables），并依赖
//   `.MyContentPage` / `.MyContentCollection` 类名断言；其余 30 处是空间侧路由。
//   附件/图片/视频/音频/表格这几类内容的 E2E 覆盖里，**这 11 处是唯一走本页面的部分**；
//   空间侧（/space/:id/contents 的 SpaceContent）虽有能力但没有对等覆盖。
//   在没有对等替代之前删它 = 拿「代码干净」换「关键能力失去测试覆盖」。
//
// 产品入口已经迁走（2026-11-14）：
//   - app 的域名 / 可见性管理 → AppDetailPage 的「管理」弹窗
//   - 内容浏览 / 附件 → 空间侧 /space/:id/contents
//   站内已没有任何导航指向本页的路由（只能地址栏直达）。
//
// 删除前置条件（满足后再连 e2e/attachments.spec.ts 一起删）：
//   1. 空间侧补齐 attachments/images/videos/audios/tables 的 E2E 覆盖；
//   2. 或确认这批 E2E 要随页面一并废弃（届时是「放弃能力覆盖」的明确决定，需 owner 批）。
//
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
