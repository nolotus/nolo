// 文件路径: packages/app/pages/Home.tsx

import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink } from "app/routing";
import { LuChevronRight, LuGlobe, LuUsers } from "react-icons/lu";

import { useHasMounted } from "app/hooks/useHasMounted";
import { usePageMeta } from "app/hooks/usePageMeta";
import { buildStaticPageMeta } from "app/seo/pageMeta";
import { useCurrentUser, useIsLoggedIn } from "identity";
import { useMyContentItems } from "app/hooks/useMyContentItems";

import WelcomeSection from "./WelcomeSection";
import DesktopAgentOnboarding from "./DesktopAgentOnboarding";
import HomePaneSkeleton from "./HomePaneSkeleton";
import { Tabs, TabList, Tab } from "render/web/ui/Tabs";
import QuickChat from "./QuickChat";
import {
  type HomeTabId,
  readStoredHomeTab,
  resolveHomeTabForDisplay,
  writeStoredHomeTab,
} from "./homeTabState";
import { getIsDesktopApp } from "app/utils/env";
import { readStorageFlag, writeStorageFlag } from "app/utils/localStorageState";
import {
  readLocalFirstOnboardingDismissed,
  writeLocalFirstOnboardingDismissed,
} from "app/localFirst/onboardingDismissed";

import { useSSRPublicAgents } from "ai/agent/publicAgentsSSRStore";
import "./home-motion.css";
import "./Home.css";

const PublicAgentsPreview = lazy(() => import("ai/agent/web/PublicAgentsPreview"));
const ShareCommunityPreview = lazy(() => import("./ShareCommunityPreview"));
const WidgetsSection = lazy(() => import("./widgets/WidgetsSection"));

// 首页内容面板最小高度（px）；CSS 对应物是 Home.css 里 .home-main 上的
// --home-pane-min-height，改值需两边同步。
const HOME_PANE_MIN_HEIGHT = 340;
const WIDGETS_TIP_KEY = "home-widgets-customize-tip-v1";

const Home = () => {
  const { t } = useTranslation();
  const hasMounted = useHasMounted();
  const isLoggedIn = useIsLoggedIn();
  const currentUser = useCurrentUser();
  const homePublicAgents = useSSRPublicAgents();
  const showAuthedHome = hasMounted && isLoggedIn && !!currentUser;
  const pageMeta = useMemo(
    () => buildStaticPageMeta(t, showAuthedHome ? "default" : "home"),
    [showAuthedHome, t]
  );
  const { items: myContentItems, loading: myContentLoading } = useMyContentItems();
  const isEmptyState = showAuthedHome && !myContentLoading && myContentItems.length === 0;
  const [isEditingWidgets, setIsEditingWidgets] = useState(false);
  // SSR 或存储不可用（异常）时默认视为已看（不渲染提示气泡）；浏览器端读持久化 flag。
  const [widgetsTipSeen, setWidgetsTipSeen] = useState(
    () => typeof window === "undefined" || readStorageFlag(WIDGETS_TIP_KEY, true)
  );
  const dismissWidgetsTip = useCallback(() => {
    setWidgetsTipSeen(true);
    writeStorageFlag(WIDGETS_TIP_KEY);
  }, []);

  // Desktop Agent-first onboarding. Device-local durable dismiss (shared local-first key),
  // matching RN: login/signup/local paths/skip all complete onboarding. Not account-scoped
  // and not synced; logout must not bring the guide back. Public web never shows it.
  // Lazy-init from localStorage avoids a post-mount flash of onboarding when already dismissed.
  const [onboardingDismissed, setOnboardingDismissed] = useState(() =>
    typeof window === "undefined"
      ? false
      : readLocalFirstOnboardingDismissed(window.localStorage)
  );
  // Runtime check (not module-load const) so ?noloDesktop=1 / injected flag works in preview.
  const isDesktopApp = getIsDesktopApp();
  const showDesktopOnboarding =
    isDesktopApp && !showAuthedHome && !onboardingDismissed;

  const handleDismissOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
    if (typeof window !== "undefined") {
      writeLocalFirstOnboardingDismissed(window.localStorage, true);
    }
  }, []);

  usePageMeta(pageMeta);

  const [activeTab, setActiveTab] = useState<HomeTabId>(() =>
    resolveHomeTabForDisplay(
      typeof window === "undefined" ? undefined : readStoredHomeTab(window.localStorage),
      false
    )
  );
  const [paneHeights, setPaneHeights] = useState<Partial<Record<HomeTabId, number>>>({});
  const activityPaneRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showAuthedHome) {
      setActiveTab(
        resolveHomeTabForDisplay(
          typeof window === "undefined"
            ? undefined
            : readStoredHomeTab(window.localStorage),
          false
        )
      );
    }
  }, [showAuthedHome]);

  const handleTabChange = useCallback((nextTab: HomeTabId) => {
    setActiveTab(nextTab);
    if (typeof window !== "undefined") {
      writeStoredHomeTab(nextTab, window.localStorage);
    }
  }, []);

  const tabsConfig = useMemo(
    () => [
      {
        id: "communityAI" as const,
        label: t("homeTabs.aiPlaza", "AI 广场"),
        icon: <LuGlobe size={20} aria-hidden="true" />,
      },
      {
        id: "shareCommunity" as const,
        label: t("homeTabs.shareCommunity", "社区分享"),
        icon: <LuUsers size={20} aria-hidden="true" />,
      },
    ],
    [t]
  );

  const tabs = useMemo(
    () =>
      tabsConfig.map(({ id, label, icon }) => ({
        id,
        label: (
          <span className="tab-label-with-icon">
            {icon}
            <span>{label}</span>
          </span>
        ),
      })),
    [tabsConfig]
  );

  useEffect(() => {
    if (showAuthedHome) return;
    const availableTabIds = tabsConfig.map((tab) => tab.id);
    if (!availableTabIds.includes(activeTab as (typeof availableTabIds)[number])) {
      handleTabChange(availableTabIds[0]);
    }
  }, [showAuthedHome, activeTab, tabsConfig, handleTabChange]);

  const viewAllConfig = useMemo(() => {
    if (activeTab === "shareCommunity") {
      return {
        path: "/share/community",
        label: t("homeTabs.enterCommunity", "进入社区"),
      };
    }
    return {
      path: "/explore",
      label: t("homeTabs.viewMore", "查看更多"),
    };
  }, [activeTab, t]);

  const activePane = useMemo(
    () => tabsConfig.find((tab) => tab.id === activeTab) ?? tabsConfig[0],
    [activeTab, tabsConfig]
  );

  useEffect(() => {
    if (showAuthedHome) return;
    const paneEl = activityPaneRef.current;
    if (!paneEl) return;

    const updateHeight = () => {
      const nextHeight = Math.ceil(paneEl.getBoundingClientRect().height);
      if (nextHeight <= 0) return;
      setPaneHeights((prev) => ({
        ...prev,
        [activeTab]: Math.max(prev[activeTab] ?? 0, nextHeight),
      }));
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(paneEl);
    return () => observer.disconnect();
  }, [showAuthedHome, activeTab]);

  const contentMinHeight = Math.max(
    HOME_PANE_MIN_HEIGHT,
    paneHeights.communityAI ?? 0,
    paneHeights.shareCommunity ?? 0,
    paneHeights[activeTab] ?? 0
  );

  const handleTabsNavChange = useCallback(
    (id: string | number) => {
      handleTabChange(id as HomeTabId);
    },
    [handleTabChange]
  );

  const homePlazaTabsId = "home-plaza-tabs";
  const homePlazaPanelId = "home-plaza-panel";

  return (
    <>
      <div className={`home-layout ${showAuthedHome ? "home-layout--authed" : "home-layout--guest"}`}>
        <main className="home-main">
          {showAuthedHome ? (
            <>
              <section className="home-authed-widgets-section">
                <div className="home-authed-widgets-header">
                  <button
                    type="button"
                    className={`home-edit-btn${
                      isEditingWidgets ? " home-edit-btn--active" : ""
                    }`}
                    onClick={() => { dismissWidgetsTip(); setIsEditingWidgets((v) => !v); }}
                  >
                    {isEditingWidgets
                      ? t("homeTabs.editDone", "完成")
                      : t("homeTabs.editCustom", "修改")}
                  </button>
                  {!widgetsTipSeen && !isEditingWidgets && (
                    <div className="home-widgets-tip">
                      <p className="home-widgets-tip__text" role="status">
                        {t("homeWidgets.customizeTip", "这里可以自定义首页：点「修改」后，可拖动卡片排序、拖卡片右下角调整大小、或隐藏不需要的模块。")}
                      </p>
                      <button type="button" className="home-widgets-tip__done" onClick={dismissWidgetsTip}>
                        {t("homeWidgets.customizeTipDone", "知道了")}
                      </button>
                    </div>
                  )}
                </div>
                <Suspense fallback={<HomePaneSkeleton />}>
                  <WidgetsSection isEditing={isEditingWidgets} />
                </Suspense>
              </section>

              <section className="home-bottom-chat-shell">
                <div className="home-primary-chat">
                  <QuickChat surface="home-primary" isEmptyState={isEmptyState} />
                </div>
              </section>
            </>
          ) : (
            <>
              {showDesktopOnboarding ? (
                <DesktopAgentOnboarding onDismiss={handleDismissOnboarding} />
              ) : isDesktopApp ? null : (
                <WelcomeSection />
              )}

              <section id="ai-plaza-section" className="home-content-section">
                <div className="home-plaza-bridge">
                  <span className="home-plaza-bridge__kicker">{t("homeTabs.aiPlaza", "AI 广场")}</span>
                  <span className="home-plaza-bridge__line" aria-hidden="true" />
                </div>
                <header className="home-content-header">
                  <Tabs
                    selectedKey={activeTab}
                    onSelectionChange={(key) => handleTabsNavChange(key as string)}
                    className="home-content-tabs"
                  >
                    <TabList aria-label="Home Tabs">
                      {tabs.map((tab) => (
                        <Tab key={tab.id} id={tab.id}>
                          {tab.label}
                        </Tab>
                      ))}
                    </TabList>
                  </Tabs>

                  <NavLink to={viewAllConfig.path} className="home-view-all-link">
                    <span>{viewAllConfig.label}</span>
                    <LuChevronRight size={16} aria-hidden="true" />
                  </NavLink>
                </header>

                <div
                  className="home-content-body"
                  style={{ minHeight: contentMinHeight }}
                >
                  <div
                    key={activePane.id}
                    ref={activityPaneRef}
                    id={homePlazaPanelId}
                    className="activity-pane"
                    data-active="true"
                    role="tabpanel"
                    aria-labelledby={homePlazaTabsId}
                  >
                    <Suspense fallback={<HomePaneSkeleton />}>
                      {activePane.id === "communityAI" ? (
                        <PublicAgentsPreview data={homePublicAgents} />
                      ) : null}
                      {activePane.id === "shareCommunity" ? (
                        <ShareCommunityPreview active />
                      ) : null}
                    </Suspense>
                  </div>
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default Home;
