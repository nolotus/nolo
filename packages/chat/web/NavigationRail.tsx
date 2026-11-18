import React, { useEffect, useRef, Suspense, lazy } from "react";
import CreateMenuButton from "render/layout/CreateMenuButtonContainer";
import { useIsLoggedIn } from "identity";
const SidebarUserSection = lazy(() => import("./sidebar/SidebarUserSection"));
import { NavLink, useLocation } from "app/routing";
import { useTranslation } from "react-i18next";
import { LuMusic, LuCalendar, LuHouse, LuStar, LuCompass, LuSearch, LuBot, LuFileText, LuTable2, LuLayoutGrid, LuMessageSquare, LuLink } from "react-icons/lu";
import { setViewMode } from "create/space/spaceCurrentStore";
import { useUserId } from "identity";
import { useFavoriteAgentIds, useFavoriteContentIds, useFavoritesInitialized, useFavoritesLoading, useFavoritesSnapshotComplete } from "app/favorite/favoriteStore";
import { pruneQuickFavorites, useQuickFavorites } from "./quickFavoriteStore";
import {
  type RailView,
  RAIL_VIEW_PATHS,
  needsDeferredScopeReset,
  resolveRailSelection,
  resolveRailView,
} from "./navigationRailView";
import "./navigationRail.css";
import { useUiPlugins } from "app/hooks/index";
import { UI_PLUGIN_SPECS, isUiPluginEnabled } from "app/plugins/uiPlugins";

/**
 * Rail 导航组的渲染顺序真值（只含顺序，不含 i18n / Icon）。
 * 动作组（新建、搜索）在上、位置稳定；导航组从「主页」出发：
 * 探索（发现公共内容）排在收藏（个人库）之前，符合「发现→沉淀」的
 * 使用方向；快捷收藏紧贴收藏，两者同属「我的内容」。
 */
export const RAIL_NAV_ORDER = ["home", "explore", "favorites"] as const;

/**
 * Navigation V2 primary Rail.
 *
 * Every entry is a real route, so the highlighted item always matches the URL
 * (including /explore and /favorites, which are reachable from elsewhere in
 * the app). Home additionally resets the scope back to "all", mirroring the
 * space switcher's "全部" action, so leaving a Space never leaves the
 * sidebar rendering a stale Space scope.
 */
export function NavigationRail({
  headerSlot,
  projectScopeId,
}: {
  headerSlot?: React.ReactNode;
  projectScopeId?: string | null;
} = {}): React.JSX.Element {
  const { t } = useTranslation("space");
  const isLoggedIn = useIsLoggedIn();
  const uiPlugins = useUiPlugins();
  const location = useLocation();
  const userId = useUserId() ?? "";
  const promoted = useQuickFavorites(userId);
  const favoriteAgents = useFavoriteAgentIds();
  const favoriteContent = useFavoriteContentIds();
  const favoritesInitialized = useFavoritesInitialized();
  // 只有完整快照才可用于回收本地快捷；部分服务器失败及重试加载期间都不安全。
  const favoritesSnapshotComplete = useFavoritesSnapshotComplete();
  const favoritesLoading = useFavoritesLoading();
  const favoriteKeys = new Set([...favoriteAgents, ...favoriteContent]);
  // promoted / favoriteKeys 每次 render 都是新实例，把它们直接放进依赖数组会让
  // 回收 effect 每轮都执行；下面两个「内容签名」是原始值，只有集合真正变化时才变。
  const favoriteSignature = [...favoriteKeys].sort().join("\u0001");
  const quickIcons = { agent: LuBot, page: LuFileText, table: LuTable2, app: LuLayoutGrid, dialog: LuMessageSquare } as const;
  const railDestination: RailView = resolveRailView(location.pathname);
  const { activeView: active, activeQuickKey } = resolveRailSelection({
    pathname: location.pathname,
    railView: railDestination,
    promoted,
    favoriteKeys,
    userId,
  });
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
    if (!userId || !favoritesInitialized || favoritesLoading || !favoritesSnapshotComplete) return;
    pruneQuickFavorites(userId, favoriteSignature ? favoriteSignature.split("\u0001") : []);
  }, [userId, favoritesInitialized, favoritesLoading, favoritesSnapshotComplete, favoriteSignature]);

  const handleHomeClick = () => {
    if (needsDeferredScopeReset(location.pathname)) {
      pendingScopeReset.current = true;
      return;
    }
    setViewMode("all");
  };

  // 每个 view 的文案 / 图标 / 目标：i18n 在渲染期调用，顺序真值来自 RAIL_NAV_ORDER。
  const itemMeta: Record<
    (typeof RAIL_NAV_ORDER)[number],
    {
      to: string;
      label: string;
      Icon: React.ComponentType<{
        size?: number;
        "aria-hidden"?: React.AriaAttributes["aria-hidden"];
      }>;
    }
  > = {
    home: {
      to: RAIL_VIEW_PATHS.home,
      label: t("common:home", "主页"),
      Icon: LuHouse,
    },
    explore: {
      to: RAIL_VIEW_PATHS.explore,
      label: t("common:explorePlaza", "探索"),
      Icon: LuCompass,
    },
    favorites: {
      // Rail 文案用 common 命名空间的既有「收藏」key（不再用 allView.favorites「我的收藏」），
      // 避免改动侧栏其它位置共享的 allView.favorites。
      to: RAIL_VIEW_PATHS.favorites,
      label: t("common:favorite", "收藏"),
      Icon: LuStar,
    },
  };
  const items = RAIL_NAV_ORDER.map((view) => ({ view, ...itemMeta[view] }));

  return (
    <nav
      aria-label={t("common:mainNavigation", "主导航")}
      data-hook="navigation-v2-rail"
      className="navigation-v2-rail"
    >
      {headerSlot}
      {isLoggedIn && (
        <div className="navigation-v2-rail__create">
          <CreateMenuButton variant="sidebar" showLabel={false} projectScopeId={projectScopeId} />
        </div>
      )}
      <button type="button" className="navigation-v2-rail__item" title={t("common:search", "搜索")}
        aria-label={t("common:search", "搜索")} onClick={() => window.dispatchEvent(new Event("nolo:navigation-search"))}>
        <span className="navigation-v2-rail__icon"><LuSearch size={17} aria-hidden="true" /></span>
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
            className={`navigation-v2-rail__item${view === RAIL_NAV_ORDER[0] ? " navigation-v2-rail__item--group-start" : ""}`}
            onClick={view === "home" ? handleHomeClick : undefined}
          >
            <span className="navigation-v2-rail__icon"><Icon size={17} aria-hidden="true" /></span>
            <span className="navigation-v2-rail__label">{label}</span>
          </NavLink>
        );
      })}
      {UI_PLUGIN_SPECS.filter(spec => isUiPluginEnabled(uiPlugins, spec.id)).map(spec => {
        const Icon = spec.id === "music" ? LuMusic : LuCalendar;
        return <NavLink key={spec.id} to={spec.path} end title={spec.title} aria-label={spec.title}
          aria-current={location.pathname === spec.path ? "page" : undefined}
          data-active={location.pathname === spec.path ? "true" : undefined}
          className="navigation-v2-rail__item">
          <span className="navigation-v2-rail__icon"><Icon size={17} aria-hidden="true" /></span>
          <span className="navigation-v2-rail__label">{spec.title}</span>
        </NavLink>;
      })}
      {promoted.filter(item => favoriteKeys.has(item.key)).map(item => {
        const Icon = quickIcons[item.type as keyof typeof quickIcons] ?? LuLink;
        const isQuickActive = activeQuickKey === item.key;
        return <NavLink key={item.key} to={item.path} className="navigation-v2-rail__item"
          title={item.title} aria-label={item.title}
          aria-current={isQuickActive ? "page" : undefined}
          data-active={isQuickActive ? "true" : undefined}>
          <span className="navigation-v2-rail__icon"><Icon size={16} aria-hidden="true" /></span>
        </NavLink>;
      })}
      {isLoggedIn && <div className="navigation-v2-rail__footer">
        <Suspense fallback={null}><SidebarUserSection railCompact /></Suspense>
      </div>}
    </nav>
  );
}
