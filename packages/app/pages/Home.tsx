// 文件路径: packages/app/pages/Home.tsx

import { lazy, Suspense, useCallback, useState } from "react";

import { useHasMounted } from "app/hooks/useHasMounted";
import { usePageMeta, useStaticPageMeta } from "app/hooks/usePageMeta";
import { useCurrentUser, useIsLoggedIn, useToken } from "identity";

import { ClientLocalePending, useHomeLocaleGate } from "app/i18n/clientLocaleGate";

import HomeLanding from "./HomeLanding";
import HomePaneSkeleton from "./HomePaneSkeleton";

// 登录态聊天面板（含 `useMyContentItems` 的 IndexedDB 依赖链）与桌面引导只在
// 登录态 / 桌面 UI 分支渲染，访客首页用不到它们；静态 import 会把它们一并塞进
// 访客首屏，改成按需加载。
const AuthedHomeChat = lazy(() => import("./AuthedHomeChat"));
const DesktopAgentOnboarding = lazy(() => import("./DesktopAgentOnboarding"));
import { getIsDesktopApp } from "app/utils/env";
import { getIsDesktopPreview } from "app/utils/env";
import { getIsDesktopUiPreview } from "app/utils/env";
import {
  readLocalFirstOnboardingDismissed,
  writeLocalFirstOnboardingDismissed,
} from "app/localFirst/onboardingDismissed";

import { homeStyles } from "./HomeStyles";
import { withLiteralClass } from "./share/withLiteralClass";
import "./home-motion.css";
import "./Home.css";

const Home = () => {
  const hasMounted = useHasMounted();
  const isLoggedIn = useIsLoggedIn();
  const currentUser = useCurrentUser();
  const token = useToken();
  // Local User remains the authenticated home owner for local data/widgets.
  // Desktop edition: the session hooks report real isLoggedIn (anonymous=false)
  // but the local home must stay the anonymous entry — currentUser carries the
  // Local User fallback, a token only distinguishes a real cloud account when
  // deciding whether the Desktop first-run guide still needs to be shown.
  const isDesktopApp = getIsDesktopApp();
  // 渲染面判据：真桌面壳，或 loopback 开发下的 `?desktop=1` 外观预览。
  // 只决定「渲染哪套布局」；项目绑定、cwd、工具挂载等能力面仍看 isDesktopApp。
  const isDesktopUi = getIsDesktopUiPreview();
  const showAuthedHome = hasMounted && (!!currentUser || isDesktopUi);

  // Desktop Agent-first onboarding. Device-local durable dismiss (shared local-first key),
  // matching RN: login/signup/local paths/skip all complete onboarding. Not account-scoped
  // and not synced; logout must not bring the guide back. Public web never shows it.
  // Lazy-init from localStorage avoids a post-mount flash of onboarding when already dismissed.
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    if (getIsDesktopPreview()) return true;
    return readLocalFirstOnboardingDismissed(window.localStorage);
  });
  const hasCloudAccount = Boolean(token);
  const showDesktopOnboarding =
    isDesktopApp && !hasCloudAccount && !onboardingDismissed;

  const handleDismissOnboarding = useCallback(() => {
    setOnboardingDismissed(true);
    if (typeof window !== "undefined") {
      writeLocalFirstOnboardingDismissed(window.localStorage, true);
    }
  }, []);

  const locale = useHomeLocaleGate(showAuthedHome || showDesktopOnboarding || isLoggedIn);
  const pageMeta = useStaticPageMeta(locale.ready && showAuthedHome ? "default" : "home");
  usePageMeta(pageMeta);
  if (!locale.ready) return <ClientLocalePending {...locale} />;


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
            !showDesktopOnboarding && !showAuthedHome && !isDesktopUi && homeStyles.homeMainGuestLanding
          )}
        >
          {showDesktopOnboarding ? (
            <Suspense fallback={<HomePaneSkeleton />}>
              <DesktopAgentOnboarding onDismiss={handleDismissOnboarding} />
            </Suspense>
          ) : showAuthedHome ? (
            <Suspense fallback={<HomePaneSkeleton />}>
              <AuthedHomeChat />
            </Suspense>
          ) : (
            <>
              {!isDesktopUi && <HomeLanding />}

            </>
          )}

        </main>
      </div>
    </>
  );
};

export default Home;
