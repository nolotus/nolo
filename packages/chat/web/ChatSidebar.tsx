import { useCreateProjectNavigation } from "render/layout/createProjectNavigation";
import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { NavLink, useLocation, useNavigate } from "app/routing";
import { getIsDesktopApp } from "app/utils/env";
import { useAppDispatch, useAppSelector } from "app/store";
import {
  selectCurrentSpace,
} from "create/space/spaceCurrentSelectors";
import {
  addCategory,
} from "create/space/category/categoryActions";
// Wave A: favoritesCollapsed 已剥至 module store。
import {
  useFavoritesCollapsed,
  toggleFavoritesCollapse as toggleFavoritesCollapseUi,
} from "create/space/spaceUiStore";
import { DEFAULT_SIDEBAR_VISIBLE_TYPES, SPACE_HOME_TOPBAR_VISIBLE_TYPES } from "create/space/sidebarVisibleTypes";
import { useSpaceEvents } from "create/space/hooks/useSpaceEvents";
import { useGroupedContent } from "create/space/hooks/useGroupedContent";
import { UNCATEGORIZED_ID } from "create/space/constants";
import { useTranslation } from "react-i18next";
import * as stylex from "@stylexjs/stylex";
import { sidebarStyles } from "./sidebarStyles";
import { withLiteralClass } from "./withLiteralClass";
import "./chatStylexEscapeHatch.css";

import { DraggableContainer } from "./DraggableContainer";
import TopbarSpaceSwitcher from "render/layout/TopbarSpaceSwitcher";
import { getSpaceRouteContext } from "render/layout/mainLayoutViewMode";
import CategorySection from "./sidebar/CategorySection";
import AllViewSidebar from "./sidebar/AllViewSidebar";
import { SidebarCoachmark } from "./sidebar/SidebarCoachmark";
import { applyEdgeScroll, resolveEdgeScroll } from "./contextColumnEdgeScroll";
import { useChatSidebarFilteredData } from "./sidebar/useChatSidebarFilteredData";
import {
  useCategoryDragAndDrop,
  useItemDragAndDrop,
} from "./sidebar/useSidebarDragAndDrop";
import { LuFolderPlus, LuStar, LuChevronDown, LuSearch, LuPanelLeftClose, LuPanelLeftOpen } from "react-icons/lu";
import { AddCategoryModal } from "create/space/category/AddCategoryModal";
import { SidebarTypeFilter, mapFilterToVisibleTypes, isSidebarTypeFilterId, matchesTypeFilter, type SidebarTypeFilterId } from "./sidebar/SidebarTypeFilter";
import { selectIdentityUserId } from "identity/selectors";
import { RemoteTasksGlobalEntry } from "./RemoteTasksGlobalEntry";
import { WorkDialogHistory } from "./WorkDialogHistory";
import { NavigationRail } from "./NavigationRail";
import { useSidebarToggleContext } from "render/layout/SidebarToggleContext";
import "render/layout/sidebarContextToggle.css";
import { ExploreCategoryNav } from "./ExploreCategoryNav";
import { type HomeView, resolveHomeView, resolveRailView } from "./navigationRailView";
import { DesktopFolderProjects } from "./DesktopFolderProjectsSection";
import { projectHomeItems, type HomeScope } from "./homeScopeProjection";
import { parseLocalDialogProjectBindings } from "./homeLocalProjectDialogs";
import { DESKTOP_DIALOG_PROJECTS_KEY } from "./desktopFolderProjects";
import { buildDialogUrl } from "chat/dialog/dialogUrl";
import { SidebarPinnedBlock } from "./sidebar/SidebarPinnedBlock";
import { useMyContentItems } from "app/hooks/useMyContentItems";
import { useFavoriteSidebarItems } from "app/favorite/useFavoriteSidebarItems";
import { SidebarCommandPalette } from "./sidebar/SidebarCommandPalette";
import { useCurrentSpaceFromEntity } from "create/space/useCurrentSpaceFromEntity";
import { useViewMode } from "create/space/spaceCurrentStore";

const SIDEBAR_FILTER_STORAGE_KEY = "space-sidebar-type-filter";

const readStoredSidebarFilter = (): SidebarTypeFilterId => {
  try {
    if (typeof window === "undefined") return "all";
    const stored = window.localStorage.getItem(SIDEBAR_FILTER_STORAGE_KEY);
    return isSidebarTypeFilterId(stored) ? stored : "all";
  } catch {
    return "all";
  }
};

const writeStoredSidebarFilter = (filter: SidebarTypeFilterId) => {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SIDEBAR_FILTER_STORAGE_KEY, filter);
  } catch {}
};

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
const ShellWithRail: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
              {isOpen ? (
                <LuPanelLeftClose size={16} aria-hidden="true" />
              ) : (
                <LuPanelLeftOpen size={16} aria-hidden="true" />
              )}
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
  const selectProjectScope = useCallback((projectId: string | null, projectName?: string) => {
    if (!projectId) { setHomeScope({ kind: "all" }); return; }
    try {
      setScopeBindings(parseLocalDialogProjectBindings(window.localStorage.getItem(DESKTOP_DIALOG_PROJECTS_KEY)));
      setHomeScope({ kind: "project", projectId, projectName });
      setHomeViewState("work");
      // 进入项目筛选时清掉残留的类型筛选，否则只剩「仅含关联对话」的状态提示。
      setTypeFilter("all");
    } catch { setHomeScope({ kind: "all" }); }
  }, []);

  const isDesktop = getIsDesktopApp();
  const navigate = useNavigate();
  const showProjects = useCallback(() => setHomeViewState("projects"), []);
  const createProjectRequest = useCreateProjectNavigation(isDesktop, showProjects);
  const homeView = isDesktop ? resolveHomeView(homeViewState) : "work";
  const selectHomeView = (view: HomeView) => setHomeViewState(resolveHomeView(view));
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  useEffect(() => {
    const openPalette = () => setCommandPaletteOpen(true);
    window.addEventListener("nolo:navigation-search", openPalette);
    return () => window.removeEventListener("nolo:navigation-search", openPalette);
  }, []);

  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<SidebarTypeFilterId>(readStoredSidebarFilter);

  const handleTypeFilterChange = useCallback((filter: SidebarTypeFilterId) => {
    setTypeFilter(filter);
    writeStoredSidebarFilter(filter);
  }, []);



  const scrollAreaRef = useRef<HTMLDivElement>(null);
  // Space 分支的 Context 列与 sticky 控件区：拖拽边缘自动滚动要用它们量「列表的实际可视
  // 顶部」（控件吸顶时盖住列顶那一条带，见 handleDragOverEdgeScroll）。
  const columnRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const space = useCurrentSpaceFromEntity();
  const viewMode = useViewMode();
  const location = useLocation();
  // Rail 目的地由路由推导：Context 只渲染当前目的地的内容，
  // 避免在 /favorites、/explore 下继续渲染上一个 Space 作用域的内容。
  const railView = resolveRailView(location.pathname);

  // NOTE: Do NOT force setViewMode("all") when space is temporarily null.
  // changeSpace.pending clears currentSpace while navigating to /space/:id;
  // MainLayout forces categories on space routes — the two fight and hit
  // "Maximum update depth exceeded" → 侧栏加载出错.

  const { groupedData, sortedCategories } = useGroupedContent(space);
  useSpaceEvents();

  const spaceRoute = useMemo(
    () => getSpaceRouteContext(location.pathname),
    [location.pathname]
  );
  const visibleTypes = useMemo(() => {
    const baseVisibleTypes =
      spaceRoute.routeSection === "root"
        ? [...SPACE_HOME_TOPBAR_VISIBLE_TYPES]
        : DEFAULT_SIDEBAR_VISIBLE_TYPES;
    return mapFilterToVisibleTypes(typeFilter, baseVisibleTypes);
  }, [spaceRoute.routeSection, typeFilter]);

  const totalItemsCount = useMemo(() => {
    return groupedData.uncategorized.length +
      Object.values(groupedData.categorized).reduce((acc, arr) => acc + arr.length, 0);
  }, [groupedData]);

  const { items: allContentItems } = useMyContentItems();

  const favoritesCollapsed = useFavoritesCollapsed();

  const favoriteItems = useFavoriteSidebarItems(allContentItems);

  const favoriteKeysSet = useMemo(
    () => new Set(favoriteItems.map((item) => item.contentKey)),
    [favoriteItems],
  );

  const { filteredGroupedData, pinnedItems, allVisibleCategoryIds, isEmpty } =
    useChatSidebarFilteredData({
      groupedData,
      sortedCategories,
      visibleTypes,
      isShowingAllTypes: false,
      displayCount: totalItemsCount,
      isFullyLoaded: true,
      searchQuery: "",
      favoriteKeys: favoriteKeysSet,
    });

  const filteredFavoriteItems = useMemo(
    () => favoriteItems.filter((item) => matchesTypeFilter(item, typeFilter)),
    [favoriteItems, typeFilter]
  );

  // 选中态画在整行上（而不是 NavLink 上），星标槽位才会被一起框进去。
  const isFavoritesRouteActive = location.pathname === "/favorites";

  const handleCategoryDragEnd = useCategoryDragAndDrop(
    sortedCategories,
    space?.id,
    dispatch
  );

  const handleItemDragEnd = useItemDragAndDrop(space?.id, dispatch);

  const handleToggleMenu = useCallback((key: string | null) => {
    setActiveMenuKey(key);
  }, []);


  // 拖拽到滚动区边缘时自动滚动。
  //
  // 触发带必须覆盖「sticky 控件所在的那条带」：Space 的控件区是列表区的**兄弟节点**
  // （z-index: 2），吸顶时盖住列顶约 130px。handler 只绑在列表上时，指针落在控件上
  // dragover 根本不会冒泡到列表（Chromium hit-test 实测：400px 列 / 130px sticky 控件 /
  // 已滚 500px 的长列表，列内 y=10…129 全部命中控件，y=131 才命中列表），向顶部拖动分类
  // 就永远触发不了自动滚动。所以 handler 绑在 **Context 列**上（控件与列表的共同祖先）。
  //
  // 触发带的几何与优先级抽在 contextColumnEdgeScroll.ts 的 resolveEdgeScroll() 里（单测断言
  // scrollTop 方向），顺序即语义：
  // 1. 真实滚动视口（本列）底边 60px → 向下滚，**优先级最高**。列表顶部还没滚走时会和列底
  //    带重叠（列底附近时「y - 列表顶」也小于 60px）；旧写法取「列顶带 / 列表顶带」两个上带
  //    距离的最小值，重叠区里上带获胜 —— 在列底拖拽反而向上滚（复审 Chromium 实测：列 500px
  //    / 控件 130px / 前置内容 400px / scrollTop=100 / clientY=470 → scrollTop 100 → 95）。
  //    真实视口底部必须永远可达，不能被内部列表顶部抢占。
  // 2. 列顶 60px → 向上滚：控件吸顶时盖住的正是这条带。
  // 3. 控件下沿 / 列表可视顶部 60px → 向上滚：非重叠时控件下沿仍提供向上触发带，
  //    基准 = max(列顶, 控件底边, 列表顶)，控件底边在拖拽时用 controlsRef 实测。
  // 列高 < 2×60px 时 1 与 2 重叠，底带胜出（保证底部可达）。列表区仍保留自己的放置/排序
  // 事件，本 handler 不调用 preventDefault、不 stopPropagation，只做滚动这一件副作用。
  const lastDragScrollTime = useRef(0);
  const handleDragOverEdgeScroll = useCallback((e: React.DragEvent) => {
    const scrollArea = scrollAreaRef.current;
    // Home 分支 / Space 的「项目」子分支没有列表区（scrollAreaRef 未挂载）→ 不接管，
    // Home 的分类拖拽行为与改动前完全一致。
    if (!scrollArea) return;
    const now = Date.now();
    if (now - lastDragScrollTime.current < 16) return;
    lastDragScrollTime.current = now;
    // Space 分支按「单一滚动区」设计：列表区的样式由 `sidebarStyles.scrollAreaFlow`（叠加在
    // scrollArea 上）落地为 overflow: visible，自身不是滚动容器，唯一在滚的是 Context 列。
    // 所以边缘判定与滚动都必须落在真正在滚的容器上：从列表区的父元素起向上找最近的
    // overflow-y 可滚祖先，并且**跳过列表区自身** —— 它是拖拽排序的放置目标，`onDragOver`
    // 的矩形不代表可视区域，把它当滚动宿主会在指针位于列底部附近时误判成「靠近列表顶部」
    // 而反向滚。找不到可滚祖先时退回列表区只是为了让下方 rect 判定有个几何参照，写
    // scrollTop 是空操作（没东西可滚）。
    let scroller: HTMLElement = scrollArea;
    for (
      let node: HTMLElement | null = scrollArea.parentElement;
      node && node !== document.body;
      node = node.parentElement
    ) {
      const { overflowY } = getComputedStyle(node);
      const scrollable = overflowY === "auto" || overflowY === "scroll";
      if (scrollable && node.scrollHeight - node.clientHeight > 1) {
        scroller = node;
        break;
      }
    }
    const columnRect = (columnRef.current ?? scroller).getBoundingClientRect();
    const controlsRect = controlsRef.current?.getBoundingClientRect() ?? null;
    const listRect = scrollArea.getBoundingClientRect();
    // 触发带优先级（列底 > 列顶 > 控件下沿/列表顶）在纯函数里，见 contextColumnEdgeScroll.ts。
    const decision = resolveEdgeScroll({
      pointerY: e.clientY,
      viewportTop: columnRect.top,
      viewportBottom: columnRect.bottom,
      controlsBottom: controlsRect ? controlsRect.bottom : null,
      listTop: listRect.top,
    });
    if (decision.delta !== 0) {
      scroller.scrollTop = applyEdgeScroll(scroller.scrollTop, decision);
    }
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
  const identityUserId = useAppSelector(selectIdentityUserId);
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

  // 空间选择器 Header (下接该空间资源)
  const spaceSwitcherHeader = (
    <div
      {...stylex.props(sidebarStyles.headerWrapperSpace)}
    >
      <div
        {...stylex.props(sidebarStyles.createRow)}
      >
        <div
          data-hook="chat-esc-sidebar-scope-wrapper"
          style={{ flex: 1, minWidth: 0 }}
          {...withLiteralClass("ChatSidebar__scope-wrapper", sidebarStyles.scopeWrapper)}
        >
          <TopbarSpaceSwitcher placement="sidebar" />
        </div>
      </div>
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

  // AllViewSidebar 自带 display:flex / flex:1 / min-height:0 的内部滚动区，虚拟列表
  // 靠父级给出的「有限高度」只挂载视口内的行。它被包进 .navigation-v2-context-content
  // 之后不再是 Context 列 column-flex 的直接子元素，flex:1 会失效、height 退化为内容
  // 定高（全部匹配项都被挂载、内部滚动区失去边界）。因此这里把「是否渲染 AllViewSidebar」
  // 收成一处可读的布尔量：既用来渲染该分支，也用来给内容容器加 --fill 修饰类，恢复
  // 有限高度的 column-flex 链（见 navigationRail.css）。
  const rendersAllViewSidebar =
    homeView === "work" &&
    typeFilter !== "all" &&
    typeFilter !== "dialog" &&
    homeScope.kind === "all";
  // 只有上面这条撑满分支才改布局；其余 Home 内容继续用普通块级滚动容器。
  const contextContentClassName = rendersAllViewSidebar
    ? "navigation-v2-context-content navigation-v2-context-content--fill"
    : "navigation-v2-context-content";

  // Navigation V2 pilot: the Rail is route-driven, and the Context column
  // follows it. Favorites / Explore are not Home, so they must not keep
  // rendering Home's Work/Projects content — and above all must not keep
  // rendering a stale Space scope under a non-Space destination.
  // Nothing here mutates Space, cwd or a running Agent.
  if (railView !== "home") {
    return (
      <ShellWithRail>
        <div data-hook="chat-esc-sidebar"
          {...withLiteralClass("ChatSidebar navigation-v2-context", sidebarStyles.chatSidebar)}>
          {railView === "favorites" && (
            <>
              {favoriteItems.length > 0 ? (
                <SidebarPinnedBlock items={favoriteItems} activeMenuKey={activeMenuKey}
                  onToggleMenu={handleToggleMenu} blockId="favorites" className="AllViewSidebar__favorites-block" />
              ) : <p>{t("allView.noFavorites", "暂无收藏")}</p>}
            </>
          )}
          {railView === "explore" && <ExploreCategoryNav />}
          {commandPalette}
        </div>
      </ShellWithRail>
    );
  }

  if (viewMode === "all" || !space || (isDesktop && homeView === "projects")) {
    return (
      <ShellWithRail>
        <div data-hook="chat-esc-sidebar"
          {...withLiteralClass("ChatSidebar navigation-v2-context navigation-v2-context--fixed", sidebarStyles.chatSidebar)}>
          <div className="navigation-v2-context-controls">
            {spaceSwitcherHeader}
            {homeViewSwitcher}
            {homeView === "work" && typeFilterShell}
            {homeView === "work" && homeScopeIndicator}
          </div>
          <div className={contextContentClassName}>
            <div style={{ display: homeView === "work" ? "contents" : "none" }}>
              {typeFilter === "all" || typeFilter === "dialog" ? (
                <>
                  {homeScope.kind === "all" && remoteTasksGlobalEntry}
                  <WorkDialogHistory homeScope={homeScope} items={scopedWorkItems} userId={identityUserId ?? ""} enabled={homeScope.kind === "all"} includeNonDialogs={typeFilter === "all"} />
                </>
              ) : rendersAllViewSidebar ? (
                <AllViewSidebar typeFilter={typeFilter} />
              ) : (
                <p role="status">{t("allView.projectDialogOnly", "当前项目仅包含已关联的对话")}</p>
              )}
            </div>
            <div style={{ display: homeView === "projects" ? "contents" : "none" }}>
              <DesktopFolderProjects createRequest={createProjectRequest} items={allContentItems} userId={identityUserId ?? ""} onSelectProjectScope={selectProjectScope} />
            </div>
          </div>
          {commandPalette}
        </div>
      </ShellWithRail>
    );
  }

  // 分类/空间视图
  const isSingleSection =
    sortedCategories.length +
      (filteredGroupedData.uncategorized.length > 0 ? 1 : 0) ===
    1;

  return (
    <ShellWithRail>
      <div
      data-hook="chat-esc-sidebar"
      ref={columnRef}
      onDragOver={handleDragOverEdgeScroll}
      {...withLiteralClass("ChatSidebar navigation-v2-context", sidebarStyles.chatSidebar)}
    >
      <div className="navigation-v2-context-controls" ref={controlsRef}>
        {spaceSwitcherHeader}
        {homeViewSwitcher}
        {homeView === "work" && typeFilterShell}
      </div>
      {homeView === "projects" ? (
        // Space 不是 Project 的作用域维度：这里不渲染全局项目列表，
        // 避免用户把全局桌面项目误读为当前空间的筛选结果。
        <p className="navigation-v2-context-note" role="note">
          {t("space:projectScopeUnavailable", "项目按全局维度组织，暂不支持在空间内筛选。切回「主页」可查看全局项目。")}
        </p>
      ) : <>
      {/* 控件之下的一切（引导条 / 跨对话任务入口 / 置顶块 / 列表）都是普通文档流里的
          兄弟节点：本分支的 Context 列不带 --fixed，列本身是唯一滚动容器（overflow-y:
          auto），所以无论控件 + 置顶内容多高，都能靠列滚动到达，永远不会被裁切；控件区用
          sticky 吸顶（navigationRail.css 的 .navigation-v2-context-controls），列滚动
          时空间选择器 / 工作-项目切换 / 数据类型筛选始终可见。列表区退出滚动角色
          （flex: 0 0 auto / min-height: 0 / overflow: visible），按内容自然高度参与列的
          文档流 —— 列内只有一条滚动区，滚轮不会在列表里被 overscroll-behavior 拦住。
          取舍：置顶块不再在列表滚动时固定不动，它随列一起滚动。
          拖拽边缘自动滚动（handleDragOverEdgeScroll）绑在本列上而不是列表上：控件区是
          列表的兄弟节点、z-index: 2 盖住列顶，绑在列表上时指针落在控件上事件根本到不了
          列表，向顶部拖动分类就触发不了自动滚动。本列与列表同属一条冒泡链，分类的放置/
          排序事件语义不变。 */}
      <SidebarCoachmark />
      {remoteTasksGlobalEntry}

      <SidebarPinnedBlock
        items={pinnedItems}
        activeMenuKey={activeMenuKey}
        onToggleMenu={handleToggleMenu}
        blockId="pinned"
        className="ChatSidebar__pinned-block"
      />

      <div
        data-hook="chat-esc-sidebar-scroll-area"
        ref={scrollAreaRef}
        {...withLiteralClass(
          "ChatSidebar__scroll-area",
          sidebarStyles.scrollArea,
          sidebarStyles.scrollAreaFlow
        )}
      >
        {isEmpty && typeFilter !== "all" ? (
          <div
            {...stylex.props(sidebarStyles.allViewEmptyState)}
          >
            <div
              aria-hidden="true"
              {...stylex.props(sidebarStyles.allViewEmptyIcon)}
            >
              <LuSearch size={24} aria-hidden="true" />
            </div>
            <div
              {...stylex.props(sidebarStyles.allViewEmptyText)}
            >
              {t("space:no_items_found", "没有找到该类型的内容")}
            </div>
          </div>
        ) : !isEmpty ? (
          <div
            data-hook={isSingleSection ? "chat-esc-sidebar-single-section" : undefined}
            {...withLiteralClass(
              [
                "ChatSidebar__content",
                isSingleSection ? "ChatSidebar__content--single-section" : "",
              ].filter(Boolean).join(" "),
              sidebarStyles.content,
              isSingleSection && sidebarStyles.contentSingleSection
            )}
          >
            {/* 未分类区域 */}
            {filteredGroupedData.uncategorized.length > 0 && (
              <div
                style={{ "--section-index": 0 } as React.CSSProperties}
                {...withLiteralClass(
                  `ChatSidebar__section ${filteredGroupedData.uncategorized.length === 0 ? "ChatSidebar__section--empty" : ""}`,
                  sidebarStyles.section,
                  filteredGroupedData.uncategorized.length === 0 && sidebarStyles.sectionEmpty
                )}
              >
                <DraggableContainer
                  id={UNCATEGORIZED_ID}
                  onDropCategory={handleCategoryDragEnd}
                  onDropItem={handleItemDragEnd}
                >
                  {() => (
                    <CategorySection
                      categoryId={UNCATEGORIZED_ID}
                      categoryName={t("uncategorized")}
                      items={filteredGroupedData.uncategorized}
                      childrenByParent={filteredGroupedData.childrenByParent}
                      activeMenuKey={activeMenuKey}
                      onToggleMenu={handleToggleMenu}
                      hideHeader={sortedCategories.length === 0}
                    />
                  )}
                </DraggableContainer>
              </div>
            )}

            {/* 已分类区域 */}
            <>
              {sortedCategories.map((category, index) => (
                <div
                  key={category.id}
                  style={
                    {
                      "--section-index":
                        filteredGroupedData.uncategorized.length > 0
                          ? index + 1
                          : index,
                    } as React.CSSProperties
                  }
                  {...withLiteralClass(
                    `ChatSidebar__section ${filteredGroupedData.categorized[category.id]?.length === 0 ? "ChatSidebar__section--empty" : ""}`,
                    sidebarStyles.section,
                    filteredGroupedData.categorized[category.id]?.length === 0 && sidebarStyles.sectionEmpty
                  )}
                >
                  <DraggableContainer
                    id={category.id}
                    onDropCategory={handleCategoryDragEnd}
                    onDropItem={handleItemDragEnd}
                  >
                    {(handleProps) => (
                      <CategorySection
                        categoryId={category.id}
                        categoryName={category.name}
                        items={
                          filteredGroupedData.categorized[category.id] || []
                        }
                        childrenByParent={filteredGroupedData.childrenByParent}
                        handleProps={handleProps}
                        activeMenuKey={activeMenuKey}
                        onToggleMenu={handleToggleMenu}
                      />
                    )}
                  </DraggableContainer>
                </div>
              ))}
            </>
            
            {space && (
              <button
                type="button"
                data-hook="chat-esc-add-category-row"
                onClick={() => setIsAddCategoryOpen(true)}
                aria-label={t("space:create_new_category", "新建分类")}
                {...withLiteralClass("ChatSidebar__add-category-row", sidebarStyles.addCategoryRow)}
              >
                <LuFolderPlus
                  size={15}
                  aria-hidden="true"
                  {...stylex.props(sidebarStyles.addCategoryRowIcon)}
                />
                <span>{t("space:create_new_category", "新建分类")}</span>
              </button>
            )}
          </div>
        ) : space ? (
          <div
            {...withLiteralClass("ChatSidebar__content", sidebarStyles.content)}
          >
            <button
              type="button"
              data-hook="chat-esc-add-category-row"
              onClick={() => setIsAddCategoryOpen(true)}
              aria-label={t("space:create_new_category", "新建分类")}
              {...withLiteralClass("ChatSidebar__add-category-row", sidebarStyles.addCategoryRow)}
            >
              <LuFolderPlus
                size={15}
                aria-hidden="true"
                {...stylex.props(sidebarStyles.addCategoryRowIcon)}
              />
              <span>{t("space:create_new_category", "新建分类")}</span>
            </button>
          </div>
        ) : null}
        
        {space && (
          <AddCategoryModal
            isOpen={isAddCategoryOpen}
            onClose={() => setIsAddCategoryOpen(false)}
            onAddCategory={async (name) => {
              if (!space) return;
              try {
                await (dispatch as any)(
                  (addCategory as any)({
                    spaceId: space.id,
                    name,
                  })
                ).unwrap();
                setIsAddCategoryOpen(false);
              } catch (e) {
                // handle error if needed
              }
            }}
          />
        )}
      </div>
      </>}
      {commandPalette}
      </div>
    </ShellWithRail>
  );
};

export default ChatSidebar;
