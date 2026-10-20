import React, { useEffect, useRef, Suspense, lazy } from "react";
import { useIsLoggedIn } from "identity";
const SidebarUserSection = lazy(() => import("./sidebar/SidebarUserSection"));
import { NavLink, useLocation } from "app/routing";
import { useTranslation } from "react-i18next";
import { LuHouse, LuStar, LuCompass, LuSearch } from "react-icons/lu";
import { setViewMode } from "create/space/spaceCurrentStore";
import {
  type RailView,
  RAIL_VIEW_PATHS,
  needsDeferredScopeReset,
  resolveRailView,
} from "./navigationRailView";
import "./navigationRail.css";

/**
 * Navigation V2 primary Rail.
 *
 * Every entry is a real route, so the highlighted item always matches the URL
 * (including /explore and /favorites, which are reachable from elsewhere in
 * the app). Home additionally resets the scope back to "all", mirroring the
 * space switcher's "全部" action, so leaving a Space never leaves the
 * sidebar rendering a stale Space scope.
 */
export function NavigationRail(): React.JSX.Element {
  const { t } = useTranslation("space");
  const isLoggedIn = useIsLoggedIn();
  const location = useLocation();
  const active: RailView = resolveRailView(location.pathname);
  // 从 Space 回到 Home：先让路由离开 Space，再把作用域切回 all，避免与
  // MainLayout 的 shouldForceCategoriesViewMode 在同一轮渲染里互相覆盖。
  const pendingScopeReset = useRef(false);

  useEffect(() => {
    if (!pendingScopeReset.current) return;
    if (needsDeferredScopeReset(location.pathname)) return;
    pendingScopeReset.current = false;
    setViewMode("all");
  }, [location.pathname]);

  const handleHomeClick = () => {
    if (needsDeferredScopeReset(location.pathname)) {
      pendingScopeReset.current = true;
      return;
    }
    setViewMode("all");
  };

  const items: Array<{
    view: RailView;
    to: string;
    label: string;
    Icon: React.ComponentType<{
      size?: number;
      "aria-hidden"?: React.AriaAttributes["aria-hidden"];
    }>;
  }> = [
    {
      view: "home",
      to: RAIL_VIEW_PATHS.home,
      label: t("common:home", "主页"),
      Icon: LuHouse,
    },
    {
      view: "favorites",
      to: RAIL_VIEW_PATHS.favorites,
      label: t("allView.favorites", "我的收藏"),
      Icon: LuStar,
    },
    {
      view: "explore",
      to: RAIL_VIEW_PATHS.explore,
      label: t("common:explorePlaza", "探索"),
      Icon: LuCompass,
    },
  ];

  return (
    <nav
      aria-label={t("common:mainNavigation", "主导航")}
      data-hook="navigation-v2-rail"
      className="navigation-v2-rail"
    >
      <button type="button" className="navigation-v2-rail__item" title={t("common:search", "搜索")}
        aria-label={t("common:search", "搜索")} onClick={() => window.dispatchEvent(new Event("nolo:navigation-search"))}>
        <LuSearch size={17} aria-hidden="true" />
      </button>
      {items.map(({ view, to, label, Icon }) => {
        const isActive = active === view;
        return (
          <NavLink
            key={view}
            to={to}
            end
            title={label}
            aria-label={label}
            aria-current={isActive ? "page" : undefined}
            data-active={isActive ? "true" : undefined}
            className="navigation-v2-rail__item"
            onClick={view === "home" ? handleHomeClick : undefined}
          >
            <Icon size={17} aria-hidden="true" />
          </NavLink>
        );
      })}
      {isLoggedIn && <div className="navigation-v2-rail__footer">
        <Suspense fallback={null}><SidebarUserSection railCompact /></Suspense>
      </div>}
    </nav>
  );
}
