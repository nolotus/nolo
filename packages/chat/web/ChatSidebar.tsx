import React, {
  lazy,
  Suspense,
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import { Dialog } from "render/web/ui/modal/Dialog";
const CreateSpaceForm = lazy(() =>
  import("create/space/CreateSpaceForm").then((module) => ({
    default: module.CreateSpaceForm,
  })),
);
import { NavLink, useLocation, useSearchParams } from "app/routing";
import { useAppDispatch, useAppSelector } from "app/store";
import { selectCurrentSpace } from "create/space/spaceCurrentSelectors";
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
import {
  LuPlus,
  LuStar,
  LuChevronDown,
  LuSearch,
  LuPanelLeftClose,
  LuPanelLeftOpen,
} from "react-icons/lu";
import {
  SidebarTypeFilter,
  matchesTypeFilter,
  DEFAULT_SIDEBAR_TYPE_FILTER,
  type SidebarTypeFilterId,
} from "./sidebar/SidebarTypeFilter";
import {
  resolveEffectiveSidebarType,
  applySidebarTypeToParams,
  readStoredSidebarType,
  writeStoredSidebarType,
} from "./sidebar/sidebarTypeQuery";
import { selectIdentityUserId } from "identity/selectors";
import { RemoteTasksGlobalEntry } from "./RemoteTasksGlobalEntry";
import { WorkDialogHistory } from "./WorkDialogHistory";
import { NavigationRail } from "./NavigationRail";
import { useSidebarToggleContext } from "render/layout/SidebarToggleContext";
import "render/layout/sidebarContextToggle.css";
import { ExploreCategoryNav } from "./ExploreCategoryNav";
import { resolveRailView } from "./navigationRailView";
import NoloHeadMark from "render/web/ui/NoloHeadMark";
import { projectHomeItems, type HomeScope } from "./homeScopeProjection";
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
const readPreferredSidebarType = (
  userId: string | undefined,
): SidebarTypeFilterId =>
  readStoredSidebarType(userId) ?? DEFAULT_SIDEBAR_TYPE_FILTER;

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
const ShellWithRail: React.FC<{ children: React.ReactNode }> = ({
  children,
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
        headerSlot={
          showToggle ? (
            <button
              type="button"
              className="sidebar-context-toggle sidebar-context-toggle--rail"
              onClick={toggle}
              title={
                isOpen
                  ? t("common:collapseSidebar", "收起侧边栏")
                  : t("common:expandSidebar", "展开侧边栏")
              }
              aria-label={
                isOpen
                  ? t("common:collapseSidebar", "收起侧边栏")
                  : t("common:expandSidebar", "展开侧边栏")
              }
              aria-expanded={isOpen}
              data-hook="sidebar-context-toggle-button"
            >
              {/* 默认显示品牌 logo；hover/focus 时交叉淡出为收起/展开箭头
                  （ChatGPT 式形态：静置是标识，移动上去才暴露成按钮）。 */}
              <span className="sidebar-context-toggle__logo" aria-hidden="true">
                <NoloHeadMark size={18} />
              </span>
              <span
                className="sidebar-context-toggle__glyph"
                aria-hidden="true"
              >
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
      <div className="navigation-v2-context-slot">{children}</div>
    </div>
  );
};

const ChatSidebar: React.FC = () => {
  const { t } = useTranslation("space");
  const [isCreateSpaceOpen, setCreateSpaceOpen] = useState(false);
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);
  const [homeScope, setHomeScope] = useState<HomeScope>({ kind: "all" });
  // 类型筛选真源优先级：有效 URL query > 本地偏好 > 首次默认（agent）。
  // URL 是可分享、可前进后退/刷新恢复的真源，所以 typeFilter 直接从 URL 派生，
  // 不做「URL -> state」的 effect 回写（避免把显式 URL 覆盖掉）。
  // 该值是**唯一**的有效筛选：chip 显隐与下方列表（typeFilter prop）都用它，
  // 列表不再自己从 URL 重新推导（详情页 URL 归一化会丢掉 sidebarType，重推会与 chip 不一致）。
  const [searchParams, setSearchParams] = useSearchParams();
  const identityUserId = useAppSelector(selectIdentityUserId);
  const [preference, setPreference] = useState(() => ({
    userId: identityUserId,
    filter: readPreferredSidebarType(identityUserId),
  }));
  const preferredTypeFilter =
    preference.userId === identityUserId
      ? preference.filter
      : readPreferredSidebarType(identityUserId);
  const typeFilter = resolveEffectiveSidebarType(
    searchParams.toString(),
    preferredTypeFilter,
  );

  const handleTypeFilterChange = useCallback(
    (filter: SidebarTypeFilterId) => {
      setPreference({ userId: identityUserId, filter });
      writeStoredSidebarType(filter, identityUserId);
      setSearchParams((prev) => applySidebarTypeToParams(prev, filter));
    },
    [identityUserId, setSearchParams],
  );

  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  useEffect(() => {
    const openPalette = () => setCommandPaletteOpen(true);
    window.addEventListener("nolo:navigation-search", openPalette);
    return () =>
      window.removeEventListener("nolo:navigation-search", openPalette);
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
  const runtimeSnapshot = useAppSelector(selectRuntimeSnapshot);
  const currentServer = useAppSelector(selectRemoteServer);
  const { unreadAgentKeys, unreadSummaryState } =
    useAgentUnreadSummaryLifecycle({
      userId: identityUserId,
      authToken: runtimeSnapshot.currentToken,
      serverOrigin: currentServer,
      items: allContentItems,
    });

  const favoritesCollapsed = useFavoritesCollapsed();

  const favoriteItems = useFavoriteSidebarItems(allContentItems);

  const filteredFavoriteItems = useMemo(
    () => favoriteItems.filter((item) => matchesTypeFilter(item, typeFilter)),
    [favoriteItems, typeFilter],
  );

  // 选中态画在整行上（而不是 NavLink 上），星标槽位才会被一起框进去。
  const isFavoritesRouteActive = location.pathname === "/favorites";

  const handleToggleMenu = useCallback((key: string | null) => {
    setActiveMenuKey(key);
  }, []);

  const typeFilterShell = (
    <div {...stylex.props(sidebarStyles.sidebarTypeFilterShell)}>
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
    <div {...stylex.props(sidebarStyles.navGroupFavorites)}>
      <div
        data-hook="chat-esc-fav-header"
        {...withLiteralClass(
          `AllViewSidebar__nav-row--favorites-header${isFavoritesRouteActive ? " is-active" : ""}`,
          sidebarStyles.navRowFavoritesHeader,
        )}
      >
        {/* 星标与折叠箭头共用一个前导槽位：标题因此和分类标题、列表条目同轨。 */}
        <button
          type="button"
          data-hook="chat-esc-fav-toggle"
          onClick={() => toggleFavoritesCollapseUi()}
          title={
            favoritesCollapsed ? t("expand", "展开") : t("collapse", "折叠")
          }
          aria-label={
            favoritesCollapsed ? t("expand", "展开") : t("collapse", "折叠")
          }
          aria-expanded={!favoritesCollapsed}
          disabled={filteredFavoriteItems.length === 0}
          {...withLiteralClass(
            `AllViewSidebar__favorites-toggle${favoritesCollapsed ? " is-collapsed" : ""}`,
            sidebarStyles.favoritesToggle,
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
              favoritesCollapsed &&
                sidebarStyles.favoritesToggleChevronCollapsed,
            )}
          />
        </button>
        <NavLink
          to="/favorites"
          end
          {...stylex.props(sidebarStyles.favoritesLink)}
        >
          <span {...stylex.props(sidebarStyles.allViewMenuLabel)}>
            {t("allView.favorites", "我的收藏")}
          </span>
        </NavLink>
        {favoritesCollapsed && filteredFavoriteItems.length > 0 && (
          <span {...stylex.props(sidebarStyles.favoritesCount)}>
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
    () =>
      projectHomeItems(allContentItems, identityUserId ?? "", homeScope, {}),
    [allContentItems, identityUserId, homeScope],
  );
  const isSpaceRoute = Boolean(
    space?.id ||
    searchParams.get("spaceId") ||
    location.pathname.startsWith("/space"),
  );
  useEffect(() => {
    if (homeScope.kind !== "noSpace") return;
    if (railView !== "home" || isSpaceRoute) {
      setHomeScope({ kind: "all" });
    }
  }, [homeScope.kind, railView, isSpaceRoute]);

  const homeScopeIndicator =
    homeScope.kind === "noSpace" ? (
      <button
        type="button"
        className="navigation-v2-home-scope"
        onClick={() => setHomeScope({ kind: "all" })}
        title={t("workspace_show_all", "清除空间外筛选，显示全部工作")}
        aria-label={t("workspace_show_all", "清除空间外筛选，显示全部工作")}
        data-hook="sidebar-no-space-clear"
      >
        <span>{t("workspace_unassociated", "空间外")}</span>
        <span aria-hidden="true">×</span>
      </button>
    ) : null;
  // Work content uses the space-group scroll container for every type.
  const contextContentClassName =
    "navigation-v2-context-content ChatSidebar__work-content";

  // Navigation V2 pilot: the Rail is route-driven, and the Context column
  // follows it. Favorites / Explore are not Home, so they must not keep
  // rendering Home's space content — and above all must not keep
  // rendering a stale Space scope under a non-Space destination.
  // Nothing here mutates Space, cwd or a running Agent.

  if (railView !== "home") {
    return (
      <ShellWithRail>
        <div
          data-hook="chat-esc-sidebar"
          data-unread-summary-status={unreadSummaryState.status}
          data-unread-summary-error={unreadSummaryState.error ?? undefined}
          {...withLiteralClass("ChatSidebar navigation-v2-context", sidebarStyles.chatSidebar)}
        >
          {railView === "favorites" && (
            <>
              {favoriteItems.length > 0 ? (
                <SidebarPinnedBlock
                  items={favoriteItems}
                  activeMenuKey={activeMenuKey}
                  onToggleMenu={handleToggleMenu}
                  blockId="favorites"
                  className="AllViewSidebar__favorites-block"
                  unreadAgentKeys={unreadAgentKeys}
                />
              ) : (
                <p>{t("allView.noFavorites", "暂无收藏")}</p>
              )}
            </>
          )}
          {railView === "explore" && <ExploreCategoryNav />}
          {commandPalette}
        </div>
      </ShellWithRail>
    );
  }

  return (
    <ShellWithRail>
      <div
        data-hook="chat-esc-sidebar"
        data-unread-summary-status={unreadSummaryState.status}
        data-unread-summary-error={unreadSummaryState.error ?? undefined}
        {...withLiteralClass(
          "ChatSidebar navigation-v2-context navigation-v2-context--fixed",
          sidebarStyles.chatSidebar,
        )}
      >
        <div className="navigation-v2-context-controls">
          {typeFilterShell}
          <button
            type="button"
            {...withLiteralClass(
              "ChatSidebar__create-space",
              sidebarStyles.createSpaceShortcut,
            )}
            onClick={() => setCreateSpaceOpen(true)}
          >
            <LuPlus size={16} aria-hidden="true" />
            {t("space:workspace_create_space", "新建空间")}
          </button>
          {isCreateSpaceOpen && (
            <Dialog
              isOpen={isCreateSpaceOpen}
              onClose={() => setCreateSpaceOpen(false)}
            >
              <Suspense fallback={null}>
                <CreateSpaceForm onClose={() => setCreateSpaceOpen(false)} />
              </Suspense>
            </Dialog>
          )}
          {homeScopeIndicator}
        </div>
        <div className={contextContentClassName}>
          <div style={{ display: "contents" }}>
            {homeScope.kind === "all" && remoteTasksGlobalEntry}
            <WorkDialogHistory
              homeScope={homeScope}
              onSelectHomeScope={setHomeScope}
              items={scopedWorkItems}
              userId={identityUserId ?? ""}
              enabled={homeScope.kind !== "project"}
              includeNonDialogs={typeFilter !== "dialog"}
              typeFilter={typeFilter}
              unreadAgentKeys={unreadAgentKeys}
            />
          </div>
        </div>
        {commandPalette}
      </div>
    </ShellWithRail>
  );
};

export default ChatSidebar;
