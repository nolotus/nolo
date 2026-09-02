import React, { useState, useCallback, useMemo, useRef } from "react";
import { NavLink, useLocation } from "app/routing";
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
import { useChatSidebarFilteredData } from "./sidebar/useChatSidebarFilteredData";
import {
  useCategoryDragAndDrop,
  useItemDragAndDrop,
} from "./sidebar/useSidebarDragAndDrop";
import { LuSparkles, LuSearch, LuFolderPlus, LuStar, LuChevronDown } from "react-icons/lu";
import { Tooltip } from "render/web/ui/Tooltip";
import Kbd from "render/web/ui/Kbd";
import { AddCategoryModal } from "create/space/category/AddCategoryModal";
import { SidebarTypeFilter, mapFilterToVisibleTypes, isSidebarTypeFilterId, matchesTypeFilter, type SidebarTypeFilterId } from "./sidebar/SidebarTypeFilter";
import { SidebarPinnedBlock } from "./sidebar/SidebarPinnedBlock";
import { useMyContentItems } from "app/hooks/useMyContentItems";
import { useFavoriteSidebarItems } from "app/favorite/useFavoriteSidebarItems";
import {
  COMMAND_PALETTE_SHORTCUT,
} from "./sidebar/CommandPalette";
import { SidebarCommandPalette } from "./sidebar/SidebarCommandPalette";
import { useCurrentSpaceFromEntity } from "create/space/spaceCurrentSelectors";
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
const ChatSidebar: React.FC = () => {
  const { t } = useTranslation("space");
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<SidebarTypeFilterId>(readStoredSidebarFilter);

  const handleTypeFilterChange = useCallback((filter: SidebarTypeFilterId) => {
    setTypeFilter(filter);
    writeStoredSidebarFilter(filter);
  }, []);



  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const dispatch = useAppDispatch();
  const space = useCurrentSpaceFromEntity();
  const viewMode = useViewMode();
  const location = useLocation();

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


  // 拖拽到滚动区边缘时自动滚动
  const lastDragScrollTime = useRef(0);
  const handleDragOverScrollArea = useCallback((e: React.DragEvent) => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;
    const now = Date.now();
    if (now - lastDragScrollTime.current < 16) return;
    lastDragScrollTime.current = now;
    const rect = scrollArea.getBoundingClientRect();
    const edgeSize = 60;
    const y = e.clientY;
    const distFromTop = y - rect.top;
    const distFromBottom = rect.bottom - y;
    if (distFromTop < edgeSize && distFromTop > 0) {
      scrollArea.scrollTop -= Math.max(2, (edgeSize - distFromTop) / 4);
    } else if (distFromBottom < edgeSize && distFromBottom > 0) {
      scrollArea.scrollTop += Math.max(2, (edgeSize - distFromBottom) / 4);
    }
  }, []);

  const searchTooltip = (
    <span
      {...stylex.props(sidebarStyles.searchTooltip)}
    >
      {t("common:search", "搜索...")}
      <Kbd shortcut={COMMAND_PALETTE_SHORTCUT} />
    </span>
  );

  const topHeaderSection = (
    <div
      {...stylex.props(sidebarStyles.topBar)}
    >
      <NavLink
        to="/explore"
        end
        className={({ isActive }) =>
          withLiteralClass(`AllViewSidebar__nav-row ChatSidebar__top-explore${isActive ? " active" : ""}`, sidebarStyles.navRow, sidebarStyles.topExplore).className
        }
      >
        <span
          aria-hidden="true"
          {...stylex.props(sidebarStyles.topExploreMenuIcon)}
        >
          <LuSparkles size={15} aria-hidden="true" />
        </span>
        <span
          {...stylex.props(sidebarStyles.allViewMenuLabel)}
        >
          {t("common:explorePlaza", "探索")}
        </span>
      </NavLink>
      <div className="ChatSidebar__search-slot">
        <Tooltip content={searchTooltip} placement="bottom">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            aria-label={t("common:search", "搜索...")}
            aria-haspopup="dialog"
            aria-expanded={isCommandPaletteOpen}
            {...withLiteralClass("ChatSidebar__search-btn", sidebarStyles.searchBtn)}
          >
            <LuSearch size={16} aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    </div>
  );

  // 全局类型筛选 Shell (放在 favoritesSection 上方，自上而下控制我的收藏和内容列表)
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

  // "全部" 或未选择具体空间：全量侧边栏
  if (viewMode === "all" || !space) {
    return (
      <div
        data-hook="chat-esc-sidebar"
        {...withLiteralClass("ChatSidebar", sidebarStyles.chatSidebar)}
      >
        {topHeaderSection}
        {typeFilterShell}
        {favoritesSection}
        {spaceSwitcherHeader}
        <SidebarCoachmark />
        <AllViewSidebar typeFilter={typeFilter} />
        {commandPalette}
      </div>
    );
  }

  // 分类/空间视图
  const isSingleSection =
    sortedCategories.length +
      (filteredGroupedData.uncategorized.length > 0 ? 1 : 0) ===
    1;

  return (
    <div
      data-hook="chat-esc-sidebar"
      {...withLiteralClass("ChatSidebar", sidebarStyles.chatSidebar)}
    >
      {topHeaderSection}
      {typeFilterShell}
      {favoritesSection}
      {spaceSwitcherHeader}
      <SidebarCoachmark />

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
        onDragOver={handleDragOverScrollArea}
        {...withLiteralClass("ChatSidebar__scroll-area", sidebarStyles.scrollArea)}
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
      {commandPalette}
    </div>
  );
};

export default ChatSidebar;
