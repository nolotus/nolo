import { useCreateProjectNavigation } from "render/layout/createProjectNavigation";
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate, useSearchParams } from "app/routing";
import { getIsDesktopApp } from "app/utils/env";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  selectCurrentSpace,
} from "create/space/spaceCurrentSelectors";
// Wave A: favoritesCollapsed 已剥至 module store。
import {
  useFavoritesCollapsed,
  toggleFavoritesCollapse as toggleFavoritesCollapseUi,
} from "create/space/spaceUiStore";
import { useSpaceEvents } from "create/space/hooks/useSpaceEvents";
import { useTranslation } from "react-i18next";
import * as stylex from "@stylexjs/stylex";
import { sidebarStyles } from "./sidebarStyles";
import { withLiteralClass } from "./withLiteralClass";
import "./chatStylexEscapeHatch.css";


import { SidebarCoachmark } from "./sidebar/SidebarCoachmark";
import { LuStar, LuChevronDown, LuSearch, LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";
import { SidebarTypeFilter, matchesTypeFilter, DEFAULT_SIDEBAR_TYPE_FILTER, type SidebarTypeFilterId } from "./sidebar/SidebarTypeFilter";
import { resolveEffectiveSidebarType, applySidebarTypeToParams, readStoredSidebarType, writeStoredSidebarType } from "./sidebar/sidebarTypeQuery";
import { selectIdentityUserId } from "identity/selectors";
import { RemoteTasksGlobalEntry } from "./RemoteTasksGlobalEntry";
import { WorkDialogHistory } from "./WorkDialogHistory";
import { NavigationRail } from "./NavigationRail";
import { useSidebarToggleContext } from "render/layout/SidebarToggleContext";
import "render/layout/sidebarContextToggle.css";
import { ExploreCategoryNav } from "./ExploreCategoryNav";
import { type HomeView, resolveHomeView, resolveRailView } from "./navigationRailView";
import NoloHeadMark from "render/web/ui/NoloHeadMark";
import { DesktopFolderProjects } from "./DesktopFolderProjectsSection";
import { projectHomeItems, type HomeScope } from "./homeScopeProjection";
import { parseLocalDialogProjectBindings } from "./homeLocalProjectDialogs";
import { selectDesktopProject, readDesktopFolderProjects, DESKTOP_DIALOG_PROJECTS_KEY, DESKTOP_FOLDER_PROJECTS_KEY } from "./desktopFolderProjects";
import { buildDialogUrl } from "chat/dialog/dialogUrl";
import { SidebarPinnedBlock } from "./sidebar/SidebarPinnedBlock";
import { useMyContentItems } from "app/hooks/useMyContentItems";
import { useFavoriteSidebarItems } from "app/favorite/useFavoriteSidebarItems";
import { SidebarCommandPalette } from "./sidebar/SidebarCommandPalette";
import { useCurrentSpaceFromEntity } from "create/space/useCurrentSpaceFromEntity";
import { useAgentUnreadSummaryLifecycle } from "./sidebar/useAgentUnreadSummary";
import { selectRuntimeSnapshot } from "app/stateViews/runtime";
import { selectRemoteServer } from "app/settings/settingSlice";

// 侧栏类型筛选的本地偏好读取/写入真源在 sidebarTypeQuery（列表回落到同一份），
// 这里只负责「首次默认真源」：没有偏好时用 DEFAULT_SIDEBAR_TYPE_FILTER。
const readPreferredSidebarType = (): SidebarTypeFilterId =>
  readStoredSidebarType() ?? DEFAULT_SIDEBAR_TYPE_FILTER;

// --- 主侧边栏组件 ---
/**
 * Navigation V2 shell：Rail + 列高查询槽。
 * 槽只包着 Context 列，是矮列降级（控件 position: static / 内容按内容定高 / --fixed 列可滚）
 * 的**唯一**查询容器 —— 槽在 shell 里是 flex:1、列在槽里是 flex:1（StyleX 的 chatSidebar 给
 * 列声明了 height: 100%），所以槽高恒等于列高。不能把 shell 本身当判据：移动端 shell 顶上还有
 * 一条横向 Rail，shell 比列高，于是存在「列 ≤460px < shell 高」的区间 —— 按 shell 判时控件已
 * 降级成 static、内容已退出有限高度链，--fixed 列却仍 overflow: hidden，超出列底的内容滚轮
 * 滚不到。三条降级规则因此写进同一个 @container（见 navigationRail.css）。
 */
const ShellWithRail: React.FC<{ children: React.ReactNode; projectScopeId?: string | null }> = ({
  children,
  projectScopeId,
}) => {
  const { t } = useTranslation("space");
  const sidebarToggle = useSidebarToggleContext();
  const isDesktop = sidebarToggle?.isDesktop ?? false;
  const isOpen = sidebarToggle?.isOpen ?? true;
  const toggle = sidebarToggle?.toggleSidebar;

  const showToggle = isDesktop && !!toggle;

  return (
    <div
      data-hook="navigation-v2-shell"
      className={`navigation-v2-shell ${isOpen ? "is-expanded" : "is-collapsed"}`}
    >
      <NavigationRail
        projectScopeId={projectScopeId}
        headerSlot={
          showToggle ? (
            <button
              type="button"
              className="sidebar-context-toggle sidebar-context-toggle--rail"
              onClick={toggle}
              title={isOpen ? t("common:collapseSidebar", "收起侧边栏") : t("common:expandSidebar", "展开侧边栏")}
              aria-label={isOpen ? t("common:collapseSidebar", "收起侧边栏") : t("common:expandSidebar", "展开侧边栏")}
              aria-expanded={isOpen}
              data-hook="sidebar-context-toggle-button"
            >
              {/* 默认显示品牌 logo；hover/focus 时交叉淡出为收起/展开箭头
                  （ChatGPT 式形态：静置是标识，移动上去才暴露成按钮）。 */}
              <span className="sidebar-context-toggle__logo" aria-hidden="true">
                <NoloHeadMark size={18} />
              </span>
              <span className="sidebar-context-toggle__glyph" aria-hidden="true">
                {isOpen ? (
                  <LuPanelLeftClose size={16} aria-hidden="true" />
                ) : (
                  <LuPanelLeftOpen size={16} aria-hidden="true" />
                )}
              </span>
            </button>
          ) : null
        }
      />
      <div className="navigation-v2-context-slot">
        {children}
      </div>
    </div>
  );
};

const ChatSidebar: React.FC = () => {
  const { t } = useTranslation("space");
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);
  // Work / Projects 是 Home 下的两种视图，不是 Rail 一级入口；归一化统一走 resolveHomeView。
  const [homeViewState, setHomeViewState] = useState<HomeView>("work");
  const [homeScope, setHomeScope] = useState<HomeScope>({ kind: "all" });
  const [scopeBindings, setScopeBindings] = useState<Record<string, unknown>>({});
  // 类型筛选真源优先级：有效 URL query > 本地偏好 > 首次默认（agent）。
  // URL 是可分享、可前进后退/刷新恢复的真源，所以 typeFilter 直接从 URL 派生，
  // 不做「URL -> state」的 effect 回写（避免把显式 URL 覆盖掉）。
  // 该值是**唯一**的有效筛选：chip 显隐与下方列表（typeFilter prop）都用它，
  // 列表不再自己从 URL 重新推导（详情页 URL 归一化会丢掉 sidebarType，重推会与 chip 不一致）。
  const [searchParams, setSearchParams] = useSearchParams();
  const [preferredTypeFilter, setPreferredTypeFilter] = useState<SidebarTypeFilterId>(readPreferredSidebarType);
  const typeFilter = resolveEffectiveSidebarType(searchParams.toString(), preferredTypeFilter);

  const handleTypeFilterChange = useCallback((filter: SidebarTypeFilterId) => {
    setPreferredTypeFilter(filter);
    writeStoredSidebarType(filter);
    setSearchParams((prev) => applySidebarTypeToParams(prev, filter));
  }, [setSearchParams]);

  const selectProjectScope = useCallback((projectId: string | null, projectName?: string) => {
    if (!projectId) { setHomeScope({ kind: "all" }); return; }
    try {
      setScopeBindings(parseLocalDialogProjectBindings(window.localStorage.getItem(DESKTOP_DIALOG_PROJECTS_KEY)));
      setHomeScope({ kind: "project", projectId, projectName });
      setHomeViewState("work");
      // 进入项目筛选时清掉残留的类型筛选，否则只剩「仅含关联对话」的状态提示。
      // 走统一的类型筛选入口：同时写本地偏好与 sidebarType URL 参数。
      handleTypeFilterChange("all");
    } catch { setHomeScope({ kind: "all" }); }
  }, [handleTypeFilterChange]);

  const isDesktop = getIsDesktopApp();
  const navigate = useNavigate();
  const showProjects = useCallback(() => setHomeViewState("projects"), []);
  const createProjectRequest = useCreateProjectNavigation(isDesktop, showProjects);
  const homeView = isDesktop ? resolveHomeView(homeViewState) : "work";
  const selectHomeView = (view: HomeView) => {
    const nextView = resolveHomeView(view);
    setHomeViewState(nextView);
    if (nextView === "work") {
      selectDesktopProject(window.localStorage, null);
      navigate("/");
    } else if (nextView === "projects") {
      try {
        const storage = window.localStorage;
        const projects = readDesktopFolderProjects(storage.getItem(DESKTOP_FOLDER_PROJECTS_KEY));
        if (projects.length > 0) {
          const first = projects[0];
          selectDesktopProject(storage, first.id);
          navigate(`/?project=${encodeURIComponent(first.id)}`);
        }
      } catch {
        // 如果没有项目则不报错
      }
    }
  };
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  useEffect(() => {
    const openPalette = () => setCommandPaletteOpen(true);
    window.addEventListener("nolo:navigation-search", openPalette);
    return () => window.removeEventListener("nolo:navigation-search", openPalette);
  }, []);




  const dispatch = useAppDispatch();
  const space = useCurrentSpaceFromEntity();
  const location = useLocation();
  // Rail 目的地由路由推导：Context 只渲染当前目的地的内容，
  // 避免在 /favorites、/explore 下继续渲染上一个 Space 作用域的内容。
  const railView = resolveRailView(location.pathname);

  // NOTE: Do NOT force setViewMode("all") when space is temporarily null.
  // changeSpace.pending clears currentSpace while navigating to /space/:id;
  // MainLayout forces categories on space routes — the two fight and hit
  // "Maximum update depth exceeded" → 侧栏加载出错.

  useSpaceEvents();


  const { items: allContentItems } = useMyContentItems();
  const identityUserId = useAppSelector(selectIdentityUserId);
  const runtimeSnapshot = useAppSelector(selectRuntimeSnapshot);
  const currentServer = useAppSelector(selectRemoteServer);
  const { unreadAgentKeys, unreadSummaryState } = useAgentUnreadSummaryLifecycle({
    userId: identityUserId,
    authToken: runtimeSnapshot.currentToken,
    serverOrigin: currentServer,
    items: allContentItems,
  });

  const favoritesCollapsed = useFavoritesCollapsed();

  const favoriteItems = useFavoriteSidebarItems(allContentItems);



  const filteredFavoriteItems = useMemo(
    () => favoriteItems.filter((item) => matchesTypeFilter(item, typeFilter)),
    [favoriteItems, typeFilter]
  );

  // 选中态画在整行上（而不是 NavLink 上），星标槽位才会被一起框进去。
  const isFavoritesRouteActive = location.pathname === "/favorites";

  const handleToggleMenu = useCallback((key: string | null) => {
    setActiveMenuKey(key);
  }, []);


  const typeFilterShell = (
    <div
      {...stylex.props(sidebarStyles.sidebarTypeFilterShell)}
    >
      <SidebarTypeFilter
        activeFilter={typeFilter}
        onChange={handleTypeFilterChange}
        ariaLabel={t("space:filter_by_type", "按类型过滤")}
      />
    </div>
  );

  const commandPalette = (
    <SidebarCommandPalette
      isOpen={isCommandPaletteOpen}
      onOpenChange={setCommandPaletteOpen}
    />
  );

  // §10.1 跨对话任务全局入口：user 级 scope（不带 dialogId）⇒ 切换对话不消失；
  // 零任务时组件自身返回 null（attention-first，默认不占位不打断）。
  const lastScopeOwner = useRef(identityUserId);
  useEffect(() => {
    if (lastScopeOwner.current === identityUserId) return;
    lastScopeOwner.current = identityUserId;
    setHomeScope({ kind: "all" });
    setScopeBindings({});
  }, [identityUserId]);

  const remoteTasksGlobalEntry = useMemo(
    () =>
      identityUserId ? (
        <RemoteTasksGlobalEntry
          scope={{ userId: identityUserId }}
          dialogHref={(dialogId) => buildDialogUrl(dialogId, space?.id)}
        />
      ) : null,
    [identityUserId, space?.id],
  );

  // 全局收藏专区（受 typeFilter 控制；可折叠）
  const favoritesSection = (
    <div
      {...stylex.props(sidebarStyles.navGroupFavorites)}
    >
      <div
        data-hook="chat-esc-fav-header"
        {...withLiteralClass(
          `AllViewSidebar__nav-row--favorites-header${isFavoritesRouteActive ? " is-active" : ""}`,
          sidebarStyles.navRowFavoritesHeader
        )}
      >
        {/* 星标与折叠箭头共用一个前导槽位：标题因此和分类标题、列表条目同轨。 */}
        <button
          type="button"
          data-hook="chat-esc-fav-toggle"
          onClick={() => toggleFavoritesCollapseUi()}
          title={favoritesCollapsed ? t("expand", "展开") : t("collapse", "折叠")}
          aria-label={favoritesCollapsed ? t("expand", "展开") : t("collapse", "折叠")}
          aria-expanded={!favoritesCollapsed}
          disabled={filteredFavoriteItems.length === 0}
          {...withLiteralClass(
            `AllViewSidebar__favorites-toggle${favoritesCollapsed ? " is-collapsed" : ""}`,
            sidebarStyles.favoritesToggle
          )}
        >
          <LuStar
            size={15}
            aria-hidden="true"
            {...stylex.props(sidebarStyles.favoritesToggleStar)}
          />
          <LuChevronDown
            size={15}
            aria-hidden="true"
            {...stylex.props(
              sidebarStyles.favoritesToggleChevron,
              favoritesCollapsed && sidebarStyles.favoritesToggleChevronCollapsed
            )}
          />
        </button>
        <NavLink
          to="/favorites"
          end
          {...stylex.props(sidebarStyles.favoritesLink)}
        >
          <span
            {...stylex.props(sidebarStyles.allViewMenuLabel)}
          >
            {t("allView.favorites", "我的收藏")}
          </span>
        </NavLink>
        {favoritesCollapsed && filteredFavoriteItems.length > 0 && (
          <span
            {...stylex.props(sidebarStyles.favoritesCount)}
          >
            {filteredFavoriteItems.length}
          </span>
        )}
      </div>
      {!favoritesCollapsed && filteredFavoriteItems.length > 0 && (
        <SidebarPinnedBlock
          items={filteredFavoriteItems.slice(0, 5)}
          activeMenuKey={activeMenuKey}
          onToggleMenu={handleToggleMenu}
          blockId="favorites"
          className="AllViewSidebar__favorites-block"
        />
      )}
    </div>
  );

  // Stable identity: the Work preview memoizes on `items`; a fresh array on every
  // render would invalidate its run-state projection on each keystroke/tick.
  const scopedWorkItems = useMemo(
    () => projectHomeItems(allContentItems, identityUserId ?? "", homeScope, scopeBindings),
    [allContentItems, identityUserId, homeScope, scopeBindings],
  );
  useEffect(() => {
    if (homeScope.kind !== "project") return;
    const refresh = () => {
      try {
        const storage = window.localStorage;
        const projects = JSON.parse(storage.getItem("nolo:desktop-folder-projects:v1") || "[]") as unknown;
        if (!Array.isArray(projects) || !projects.some((project) =>
          project && typeof project === "object" && "id" in project && project.id === homeScope.projectId)) {
          setHomeScope({ kind: "all" });
          return;
        }
        setScopeBindings(parseLocalDialogProjectBindings(storage.getItem(DESKTOP_DIALOG_PROJECTS_KEY)));
      } catch { setHomeScope({ kind: "all" }); }
    };
    window.addEventListener("nolo:desktop-folder-selection", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("nolo:desktop-folder-selection", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [homeScope]);
  const homeScopeIndicator = homeScope.kind === "project" ? (
    <button type="button" className="navigation-v2-home-scope" onClick={() => selectProjectScope(null)}
      title={t("allView.showAllProjects", "清除项目筛选，显示全部工作")}
      aria-label={t("allView.showAllProjects", "清除项目筛选，显示全部工作")}>
      <span>{homeScope.projectName || t("allView.projectFilterActive", "当前项目")}</span>
      <span aria-hidden="true">×</span>
    </button>
  ) : null;
  const homeViewSwitcher = isDesktop ? (
    <div
      role="group"
      aria-label={t("common:homeViews", "主页视图")}
      className="navigation-v2-home-views"
    >
      <button
        type="button"
        className="navigation-v2-home-views__item"
        aria-pressed={homeView === "work"}
        onClick={() => selectHomeView("work")}
      >
        {t("allView.work", "工作")}
      </button>
      <button
        type="button"
        className="navigation-v2-home-views__item"
        aria-pressed={homeView === "projects"}
        onClick={() => selectHomeView("projects")}
      >
        {t("allView.projects", "项目")}
      </button>
    </div>
  ) : null;

  // Work content uses the space-group scroll container for every type.
  const contextContentClassName = homeView === "work"
    ? "navigation-v2-context-content ChatSidebar__work-content"
    : "navigation-v2-context-content";

  // Navigation V2 pilot: the Rail is route-driven, and the Context column
  // follows it. Favorites / Explore are not Home, so they must not keep
  // rendering Home's Work/Projects content — and above all must not keep
  // rendering a stale Space scope under a non-Space destination.
  // Nothing here mutates Space, cwd or a running Agent.
  const currentProjectScopeId = homeScope.kind === "project" ? homeScope.projectId : null;

  if (railView !== "home") {
    return (
      <ShellWithRail projectScopeId={currentProjectScopeId}>
        <div data-hook="chat-esc-sidebar"
          data-unread-summary-status={unreadSummaryState.status}
          data-unread-summary-error={unreadSummaryState.error ?? undefined}
          {...withLiteralClass("ChatSidebar navigation-v2-context", sidebarStyles.chatSidebar)}>
          {railView === "favorites" && (
            <>
              {favoriteItems.length > 0 ? (
                <SidebarPinnedBlock items={favoriteItems} activeMenuKey={activeMenuKey}
                  onToggleMenu={handleToggleMenu} blockId="favorites" className="AllViewSidebar__favorites-block"
                  unreadAgentKeys={unreadAgentKeys} />
              ) : <p>{t("allView.noFavorites", "暂无收藏")}</p>}
            </>
          )}
          {railView === "explore" && <ExploreCategoryNav />}
          {commandPalette}
        </div>
      </ShellWithRail>
    );
  }

  return (
    <ShellWithRail projectScopeId={currentProjectScopeId}>
      <div data-hook="chat-esc-sidebar"
        data-unread-summary-status={unreadSummaryState.status}
        data-unread-summary-error={unreadSummaryState.error ?? undefined}
        {...withLiteralClass("ChatSidebar navigation-v2-context navigation-v2-context--fixed", sidebarStyles.chatSidebar)}>
        <div className="navigation-v2-context-controls">
              {homeViewSwitcher}
          {homeView === "work" && typeFilterShell}
          {homeView === "work" && homeScopeIndicator}
        </div>
        <div className={contextContentClassName}>
          <div style={{ display: homeView === "work" ? "contents" : "none" }}>
            {homeScope.kind === "all" && remoteTasksGlobalEntry}
            <WorkDialogHistory homeScope={homeScope} items={scopedWorkItems} userId={identityUserId ?? ""} enabled={homeScope.kind === "all"} includeNonDialogs={typeFilter !== "dialog"} typeFilter={typeFilter} unreadAgentKeys={unreadAgentKeys} />
          </div>
          <div style={{ display: homeView === "projects" ? "contents" : "none" }}>
            <DesktopFolderProjects createRequest={createProjectRequest} items={allContentItems} userId={identityUserId ?? ""} onSelectProjectScope={selectProjectScope} spaceId={space?.id || null} onOpenProject={(project) => navigate("/?project=" + encodeURIComponent(project.id))} />
          </div>
        </div>
        {commandPalette}
      </div>
    </ShellWithRail>

  );
};

export default ChatSidebar;
