// 文件路径: packages/app/pages/Home.tsx

import { Suspense, lazy, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";

import { useHasMounted } from "app/hooks/useHasMounted";
import { usePageMeta, useStaticPageMeta } from "app/hooks/usePageMeta";
import { useCurrentUser, useIsLoggedIn, useToken } from "identity";
import { useMyContentItems } from "app/hooks/useMyContentItems";

import HomeLanding from "./HomeLanding";
import DesktopAgentOnboarding from "./DesktopAgentOnboarding";
import HomePaneSkeleton from "./HomePaneSkeleton";
import QuickChat from "./QuickChat";
import { getIsDesktopApp } from "app/utils/env";
import { readStorageFlag, writeStorageFlag } from "app/utils/localStorageState";
import {
  readLocalFirstOnboardingDismissed,
  writeLocalFirstOnboardingDismissed,
} from "app/localFirst/onboardingDismissed";

import * as stylex from "@stylexjs/stylex";
import { homeStyles } from "./HomeStyles";
import { withLiteralClass } from "./share/withLiteralClass";
import "./home-motion.css";
import "./Home.css";

const WidgetsSection = lazy(() => import("./widgets/WidgetsSection"));

const WIDGETS_TIP_KEY = "home-widgets-customize-tip-v1";

const Home = () => {
  const { t } = useTranslation();
  const hasMounted = useHasMounted();
  const isLoggedIn = useIsLoggedIn();
  const currentUser = useCurrentUser();
  const token = useToken();
  // Local User remains the authenticated home owner for local data/widgets.
  // Desktop edition: the session hooks report real isLoggedIn (anonymous=false)
  // but the local home must stay the anonymous entry — currentUser carries the
  // Local User fallback, a token only distinguishes a real cloud account when
  // deciding whether the Desktop first-run guide still needs to be shown.
  const showAuthedHome = hasMounted && !!currentUser;
  const pageMeta = useStaticPageMeta(showAuthedHome ? "default" : "home");
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
  const hasCloudAccount = Boolean(token);
  const showDesktopOnboarding =
    isDesktopApp && !hasCloudAccount && !onboardingDismissed;

  const handleDismissOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
    if (typeof window !== "undefined") {
      writeLocalFirstOnboardingDismissed(window.localStorage, true);
    }
  }, []);

  usePageMeta(pageMeta);


  return (
    <>
      <div
        {...withLiteralClass(
          `home-layout ${showAuthedHome ? "home-layout--authed" : "home-layout--guest"}`,
          showAuthedHome ? homeStyles.homeLayoutAuthed : homeStyles.homeLayout
        )}
      >
        <main
          {...withLiteralClass(
            "home-main",
            homeStyles.homeMain,
            showAuthedHome && homeStyles.homeMainAuthed,
            !showDesktopOnboarding && !showAuthedHome && !isDesktopApp && homeStyles.homeMainGuestLanding
          )}
        >
          {showDesktopOnboarding ? (
            <DesktopAgentOnboarding onDismiss={handleDismissOnboarding} />
          ) : showAuthedHome ? (
            <>
              {/* 核心主交互：输入框在宽屏下垂直居中展示，敲回车发送时平滑过渡 */}
              <section {...stylex.props(homeStyles.homeBottomChatShell)}>
                <div
                  {...withLiteralClass(
                    "home-primary-chat",
                    homeStyles.homePrimaryChat,
                    homeStyles.homePrimaryChatInShell
                  )}
                >
                  <QuickChat surface="home-primary" isEmptyState={isEmptyState} />
                </div>
              </section>

              {/* 辅助区域：自定义看板/Widget卡片（排列在输入框下方，向下滑动可见） */}
              <section {...stylex.props(homeStyles.homeAuthedWidgetsSection)}>
                <div {...stylex.props(homeStyles.homeAuthedWidgetsHeader)}>
                  <button
                    type="button"
                    {...stylex.props(
                      homeStyles.homeEditBtn,
                      isEditingWidgets && homeStyles.homeEditBtnActive
                    )}
                    onClick={() => { dismissWidgetsTip(); setIsEditingWidgets((v) => !v); }}
                  >
                    {isEditingWidgets
                      ? t("homeTabs.editDone", "完成")
                      : t("homeTabs.editCustom", "修改")}
                  </button>
                  {!widgetsTipSeen && !isEditingWidgets && (
                    <div
                      {...withLiteralClass(
                        "home-widgets-tip",
                        homeStyles.homeWidgetsTip,
                        homeStyles.homeWidgetsTipBefore
                      )}
                    >
                      <p {...stylex.props(homeStyles.homeWidgetsTipText)} role="status">
                        {t("homeWidgets.customizeTip", "Customize your home: click Customize to reorder, resize, or hide cards.")}
                      </p>
                      <button type="button" {...stylex.props(homeStyles.homeWidgetsTipDone)} onClick={dismissWidgetsTip}>
                        {t("homeWidgets.customizeTipDone", "知道了")}
                      </button>
                    </div>
                  )}
                </div>
                <Suspense fallback={<HomePaneSkeleton />}>
                  <WidgetsSection isEditing={isEditingWidgets} />
                </Suspense>
              </section>
            </>
          ) : (
            <>
              {!isDesktopApp && <HomeLanding />}

            </>
          )}

        </main>
      </div>
    </>
  );
};

export default Home;