import React, { Suspense, lazy, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "app/routing";
import {
  LuHouse,
  LuLogIn,
  LuBadgeDollarSign,
  LuDownload,
} from "react-icons/lu";

import { AppRoutePaths } from "app/constants/routePaths";
import NoloHeadMark from "render/web/ui/NoloHeadMark";
import ThemeToggleButton from "app/theme/web/ThemeToggleButton";
import { useIsLoggedIn } from "identity";
import { useHasMounted } from "app/hooks/useHasMounted";
import CreateMenuButton from "./CreateMenuButtonContainer";
import { DevReloadBadge } from "./DevReloadBadge";
import { useSidebarToggleContext } from "./SidebarToggleContext";
import { getRouteDescriptor } from "./mainLayoutViewMode";
import { getGuestNaturePage } from "./guestNaturePages";

// Space switcher 在左侧边栏里渲染（space 页），全局条删除后这里保留引用，
// 避免误以为空间切换入口随全局条一起消失。
// 语言切换器带 StyleX 样式（需编译产物），懒加载避免把 StyleX 运行时拖进
// 布局单测等无编译产物的环境。
const LanguageSwitcher = lazy(() => import("render/web/ui/LanguageSwitcher"));

/** 内容对象页头部的左侧导航簇：侧边栏开关 / Home。 */
export const PageNavChrome: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const sidebarToggle = useSidebarToggleContext();
  const isLoggedIn = useIsLoggedIn();

  const toggleSidebar = sidebarToggle?.toggleSidebar;
  const hasRail = sidebarToggle?.hasRail ?? false;

  // 侧边栏开关已归位到 MainLayout（shell 级）；这里只判断是否需要让位。
  const showShellSidebarToggle = !!toggleSidebar && !hasRail;
  // 真壳判据：只认宿主注入的 data-nolo-desktop（entry.tsx 在 `__NOLO_DESKTOP__`
  // 或 `?noloDesktop=1` 时写入），不跟随 `?desktop=1` 外观预览。
  const isDesktopShell = useMemo(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.dataset.noloDesktop === "1",
    []
  );
  // Rail 常驻时 Rail 拥有首页入口，页面头部不再重复一个 Home。
  const showTopbarHome = !hasRail || !isLoggedIn || !toggleSidebar;
  const guestNaturePage = getGuestNaturePage(location.pathname, {
    isLoggedIn,
    isDesktop: isDesktopShell,
  });
  const isGuestNature = guestNaturePage !== null;

  return (
    <div className="page-top-chrome__nav">
      {/* shell 级侧边栏开关由 MainLayout 渲染在内容区左上角，这里留出等宽空位 */}
      {showShellSidebarToggle && (
        <span className="page-top-chrome__shell-toggle-gap" aria-hidden="true" />
      )}

      {showTopbarHome && (
        <span className="TopBar__home-slot">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `TopBar__home ${isActive ? "is-active" : ""}`
            }
            title={t("home", "首页")}
            aria-label={t("home", "首页")}
          >
            {isGuestNature ? (
              <>
                <NoloHeadMark size={26} />
                <span className="TopBar__brand-name">Nolo</span>
              </>
            ) : (
              <LuHouse size={16} aria-hidden="true" />
            )}
          </NavLink>
        </span>
      )}

      {/* Dev 热更标记与 Home 入口无关：Rail+登录态下 Home 不渲染，
          但开发时仍需要看到重载标记。 */}
      <DevReloadBadge />
    </div>
  );
};

/**
 * 右侧用户簇：登录态占位 / user area（创建入口）/ 游客的主题·语言·登录，
 * 游客额外保留「价格 / 下载客户端」入口。
 */
export const PageUserChrome: React.FC<{ floating?: boolean }> = ({
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
    []
  );
  const descriptor = useMemo(
    () => getRouteDescriptor(location.pathname),
    [location.pathname]
  );
  const showGuestNavLinks =
    hasMounted &&
    descriptor.topbarMode !== "content" &&
    !isDesktopShell &&
    !isLoggedIn;

  if (!isLoggedIn) {
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
              <LuBadgeDollarSign className="topbar__nav-icon" size={16} aria-hidden="true" />
              {t("topbar.pricing", "价格")}
            </NavLink>
            <NavLink
              to={AppRoutePaths.CLIENT_DOWNLOADS}
              className={({ isActive }) =>
                `topbar__nav-link topbar__nav-link--download-cta ${isActive ? "is-active" : ""}`
              }
            >
              <LuDownload className="topbar__nav-icon" size={16} aria-hidden="true" />
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
  }

  if (!hasMounted) {
    return (
      <div
        className="topbar__auth-placeholder topbar__auth-placeholder--compact"
        aria-hidden="true"
        data-testid="topbar-auth-placeholder"
      >
        <span className="topbar__auth-placeholder-dot" />
      </div>
    );
  }

  return (
    <div className="topbar__user-area topbar__user-area--compact">
      <CreateMenuButton variant="topbar" className="topbar__create-entry" />
    </div>
  );
};

/** 内容对象页（PageLoader 分派的 pageKey 类型）由页面头部承载右侧用户簇。 */
const CONTENT_OBJECT_SEGMENT = /^(page|app-|agent|meta-|file|image|task|dialog)/;

const isContentObjectPath = (pathname: string) => {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "";
  return CONTENT_OBJECT_SEGMENT.test(last);
};

/**
 * 非内容对象页（首页 / 登录 / 定价 / 下载 / 法务页等）没有页面头部，
 * 游客的主题·语言·登录入口由这里补上；内容对象页不重复渲染。
 */
export const GuestPageChrome: React.FC = () => {
  const isLoggedIn = useIsLoggedIn();
  const location = useLocation();

  if (isLoggedIn) return null;
  if (isContentObjectPath(location.pathname)) return null;

  return <PageUserChrome floating />;
};
