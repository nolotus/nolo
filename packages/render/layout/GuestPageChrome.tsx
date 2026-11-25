import React, { Suspense, lazy, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "app/routing";
import { LuLogIn, LuBadgeDollarSign, LuDownload } from "react-icons/lu";

import { AppRoutePaths } from "app/constants/routePaths";
import NoloHeadMark from "render/web/ui/NoloHeadMark";
import ThemeToggleButton from "app/theme/web/ThemeToggleButton";
import { useIsLoggedIn } from "identity";
import { useHasMounted } from "app/hooks/useHasMounted";
import { getRouteDescriptor } from "./mainLayoutViewMode";
import {
  isContentObjectPath,
  shouldShowGuestBrandHome,
} from "./guestNaturePages";

// 语言切换器带 StyleX 样式（需编译产物），懒加载避免把 StyleX 运行时拖进
// 布局单测等无编译产物的环境。
const LanguageSwitcher = lazy(() => import("render/web/ui/LanguageSwitcher"));

/**
 * 游客右侧用户簇：主题 · 语言 · 登录；非内容路由额外保留「价格 / 下载客户端」。
 *
 * 这里刻意不引创建入口（CreateMenuButtonContainer）：游客永远看不到它，而访客
 * 首页会加载本模块。登录态的用户簇（创建入口，保持 eager）在 PageTopChrome.tsx，
 * 两条路径分开正是为了让访客不为登录态的菜单依赖付费；契约由
 * topbarGlobalActions.source.test.ts 分别守护。
 */
export const GuestUserChrome: React.FC<{ floating?: boolean }> = ({
  floating = false,
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const isLoggedIn = useIsLoggedIn();
  const hasMounted = useHasMounted();
  const isDesktopShell = useMemo(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.dataset.noloDesktop === "1",
    [],
  );
  const descriptor = useMemo(
    () => getRouteDescriptor(location.pathname),
    [location.pathname],
  );
  const showGuestNavLinks =
    hasMounted &&
    descriptor.topbarMode !== "content" &&
    !isDesktopShell &&
    !isLoggedIn;

  return (
    <div
      className={`page-top-chrome__user page-top-chrome__user--guest${floating ? " is-floating" : ""}`.trim()}
    >
      {showGuestNavLinks && (
        <div
          className="topbar__nav-group"
          aria-label={t("common.actions", "常用入口")}
        >
          <NavLink
            to="/pricing"
            className={({ isActive }) =>
              `topbar__nav-link ${isActive ? "is-active" : ""}`
            }
          >
            <LuBadgeDollarSign
              className="topbar__nav-icon"
              size={16}
              aria-hidden="true"
            />
            {t("topbar.pricing", "价格")}
          </NavLink>
          <NavLink
            to={AppRoutePaths.CLIENT_DOWNLOADS}
            className={({ isActive }) =>
              `topbar__nav-link topbar__nav-link--download-cta ${isActive ? "is-active" : ""}`
            }
          >
            <LuDownload
              className="topbar__nav-icon"
              size={16}
              aria-hidden="true"
            />
            {t("downloadClient", "下载客户端")}
          </NavLink>
        </div>
      )}
      <ThemeToggleButton className="topbar__theme-toggle" />
      <Suspense fallback={null}>
        <LanguageSwitcher iconOnly />
      </Suspense>
      {/* display:contents hook so guest nature pages can quiet the
          NavListItem's primary-blue active state (it is active on /login). */}
      <span
        className={`topbar__guest-login ${location.pathname === AppRoutePaths.LOGIN ? "is-current" : ""}`.trim()}
      >
        <NavLink
          to={AppRoutePaths.LOGIN}
          className="topbar__nav-link"
          aria-label={t("login")}
        >
          <LuLogIn size={16} aria-hidden="true" />
          {t("login")}
        </NavLink>
      </span>
    </div>
  );
};

/**
 * 游客页左上角的品牌入口：登录 / 定价 / 下载 / 法务等游客页没有页头，也没有
 * 侧栏，不给这个入口就只能靠浏览器后退回首页。首页自身和内容对象页不渲染
 * （后者页头自带 Home），桌面壳有原生导航也不叠加。
 */
export const GuestBrandHome: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isLoggedIn = useIsLoggedIn();
  const isDesktopShell =
    typeof document !== "undefined" &&
    document.documentElement.dataset.noloDesktop === "1";

  if (
    !shouldShowGuestBrandHome(location.pathname, {
      isLoggedIn,
      isDesktop: isDesktopShell,
    })
  ) {
    return null;
  }

  return (
    <NavLink
      to="/"
      end
      className={({ isActive }) =>
        `page-top-chrome__guest-home ${isActive ? "is-active" : ""}`.trim()
      }
      title={t("home", "首页")}
      aria-label={t("home", "首页")}
    >
      <NoloHeadMark size={26} />
      <span className="page-top-chrome__guest-home-brand">Nolo</span>
    </NavLink>
  );
};

/**
 * 非内容对象页（首页 / 登录 / 定价 / 下载 / 法务页等）没有页面头部，
 * 游客的品牌入口与主题·语言·登录入口由这里补上；内容对象页不重复渲染。
 *
 * 本模块是访客首页的顶部 chrome 入口，禁止引入创建入口 / 登录态用户簇，
 * 否则访客要为登录态的菜单依赖付费。
 */
export const GuestPageChrome: React.FC = () => {
  const isLoggedIn = useIsLoggedIn();
  const location = useLocation();

  if (isLoggedIn) return null;
  if (isContentObjectPath(location.pathname)) return null;

  return (
    <>
      <GuestBrandHome />
      <GuestUserChrome floating />
    </>
  );
};
