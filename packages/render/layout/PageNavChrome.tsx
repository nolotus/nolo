import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation } from "app/routing";
import { LuHouse } from "react-icons/lu";

import NoloHeadMark from "render/web/ui/NoloHeadMark";
import { useIsLoggedIn } from "identity";
import { useSidebarToggleContext } from "./SidebarToggleContext";
import { DevReloadBadge } from "./DevReloadBadge";
import { getGuestNaturePage } from "./guestNaturePages";

// Space switcher 在左侧边栏里渲染（space 页），全局条删除后这里保留引用，
// 避免误以为空间切换入口随全局条一起消失。

/**
 * 内容对象页头部的左侧导航簇：侧边栏开关 / Home。
 *
 * 本模块刻意不依赖创建入口（CreateMenuButtonContainer）：游客在内容对象页
 * 也会渲染这簇导航，把它和登录态用户簇放同一个模块会让游客连带下载整套
 * 新建菜单依赖。登录态用户簇（创建入口保持 eager）在 PageTopChrome.tsx。
 */
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
    [],
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
        <span
          className="page-top-chrome__shell-toggle-gap"
          aria-hidden="true"
        />
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
