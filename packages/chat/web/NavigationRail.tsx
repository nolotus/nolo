import React, { useEffect, useRef, Suspense, lazy } from "react";
import { useIsLoggedIn } from "identity";
const SidebarUserSection = lazy(() => import("./sidebar/SidebarUserSection"));
import { NavLink, useLocation } from "app/routing";
import { useTranslation } from "react-i18next";
import { LuHouse, LuStar, LuCompass, LuSearch, LuBot, LuFileText, LuTable2, LuLayoutGrid, LuMessageSquare, LuLink } from "react-icons/lu";
import { setViewMode } from "create/space/spaceCurrentStore";
import { useUserId } from "identity";
import { useFavoriteAgentIds, useFavoriteContentIds, useFavoritesError, useFavoritesInitialized } from "app/favorite/favoriteStore";
import { pruneQuickFavorites, useQuickFavorites } from "./quickFavoriteStore";
import {
  type RailView,
  RAIL_VIEW_PATHS,
  needsDeferredScopeReset,
  resolveRailView,
} from "./navigationRailView";
import "./navigationRail.css";

/**
 * Path part of a Rail target. App shortcuts are built with `buildAppDetailPath`
 * / `withAppQuery` and therefore carry a `?serverOrigin=...` query string,
 * while `location.pathname` never does — comparing the raw strings made those
 * entries impossible to highlight.
 */
const pathOf = (to: string): string => to.split(/[?#]/)[0];

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
  const userId = useUserId() ?? "";
  const promoted = useQuickFavorites(userId);
  const favoriteAgents = useFavoriteAgentIds();
  const favoriteContent = useFavoriteContentIds();
  const favoritesInitialized = useFavoritesInitialized();
  // 收藏拉取失败（离线 / 服务端报错）时 favoritesInitialized 仍会置 true，但列表是空的；
  // 此时不能拿空列表去回收本地快捷，否则一次网络抖动就会把用户的快捷全抹掉。
  const favoritesError = useFavoritesError();
  const favoriteKeys = new Set([...favoriteAgents, ...favoriteContent]);
  // promoted / favoriteKeys 每次 render 都是新实例，把它们直接放进依赖数组会让
  // 回收 effect 每轮都执行；下面两个「内容签名」是原始值，只有集合真正变化时才变。
  const favoriteSignature = [...favoriteKeys].sort().join("\u0001");
  const quickIcons = { agent: LuBot, page: LuFileText, table: LuTable2, app: LuLayoutGrid, dialog: LuMessageSquare } as const;
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

  // 回收「已取消收藏 / 对象已删除」的失效快捷项（不回收的话 storage 里的旧指针会
  // 一直累积）。收藏列表首帧还是空的、要异步初始化，此时回收会把整份快捷列表误删，
  // 所以等 initialized 之后才开始。依赖用收藏 key 的内容签名：prune 的唯一输入就是
  // 「哪些 key 还有效」，promoted 的内容变化不会改变这个判断。
  useEffect(() => {
    if (!userId || !favoritesInitialized || favoritesError) return;
    pruneQuickFavorites(userId, favoriteSignature ? favoriteSignature.split("\u0001") : []);
  }, [userId, favoritesInitialized, favoritesError, favoriteSignature]);

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
      {promoted.filter(item => favoriteKeys.has(item.key)).map(item => {
        const Icon = quickIcons[item.type as keyof typeof quickIcons] ?? LuLink;
        return <NavLink key={item.key} to={item.path} className="navigation-v2-rail__item"
          title={item.title} aria-label={item.title} aria-current={pathOf(item.path) === location.pathname ? "page" : undefined}>
          <Icon size={16} aria-hidden="true" />
        </NavLink>;
      })}
      {isLoggedIn && <div className="navigation-v2-rail__footer">
        <Suspense fallback={null}><SidebarUserSection railCompact /></Suspense>
      </div>}
    </nav>
  );
}
