// ── Sidebar performance timing ──
const __debugPerfEnabled = (() => {
  try {
    return (
      typeof window !== "undefined" &&
      window.localStorage?.getItem("debugPerf") === "1"
    );
  } catch {
    return false;
  }
})();
const __sidPerf = __debugPerfEnabled
  ? ((window as any).__sidebarPerfTiming ??= {
      marks: {} as Record<string, number>,
      measure(label: string) {
        this.marks[label] = performance.now();
      },
      log(label: string) {
        const t = this.marks[label];
        if (t !== undefined) console.debug(`[SIDEBAR-PERF] ${label}: ${(performance.now() - t).toFixed(1)}ms`);
      },
      flush() {
        console.group("[SIDEBAR-PERF] Sidebar Load Report");
        const entries = Object.entries(this.marks) as Array<[string, number]>;
        let prev: [string, number] | null = null;
        for (const [k, v] of entries) {
          const sincePrev = prev ? ` (+${(v - prev[1]).toFixed(1)}ms)` : "";
          console.debug(`  ${k}: ${(v - entries[0][1]).toFixed(1)}ms${sincePrev}`);
          prev = [k, v];
        }
        console.groupEnd();
      },
    })
  : null;
// ── end perf timing ──

import * as stylex from "@stylexjs/stylex";
import { sidebarStyles } from "../sidebarStyles";
import "../chatStylexEscapeHatch.css";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { NavLink, useLocation, useNavigate, useParams } from "app/routing";
import { useTranslation } from "react-i18next";
import { asTrimmedLowercaseString } from "core/trimmedLowercaseString";
import { useMyContentItems } from "app/hooks/useMyContentItems";
import { useAppDispatch } from "app/store";
import { LuInbox } from "react-icons/lu";
import {
  resolveMyContentTab,
  type MyContentListItem,
} from "app/utils/myContentItems";
import { useUserId } from "identity";
import SidebarItemRow from "create/space/SidebarItemRow";
import {
  SidebarAppDeleteDialog,
  type SidebarAppDeleteRequest,
} from "create/space/SidebarAppDeleteDialog";
import { MenuPopover } from "render/web/ui/MenuPopover";
import { SidebarItemMoreMenu } from "create/space/SidebarItemMoreMenu";
import {
  updateContentPinned,
} from "create/space/content/contentThunks";
import { useFavoriteSidebarItems } from "app/favorite/useFavoriteSidebarItems";
import { SidebarPinnedBlock } from "./SidebarPinnedBlock";
import { SidebarVirtualizedList } from "./SidebarVirtualizedList";
import { isRoutableContentActive, buildRoutableContentPath } from "create/space/contentKeyUtils";
import {
  filterAllViewRecentItems,
  isAllViewDialogImageAttachment,
} from "./allViewSearch";
import {
  isSidebarTypeFilterId,
  matchesTypeFilter,
  type SidebarTypeFilterId,
} from "./SidebarTypeFilter";

const RECENT_FILTER_STORAGE_KEY = "allview-recent-type-filter";

const readStoredRecentFilter = (): SidebarTypeFilterId => {
  try {
    if (typeof window === "undefined") return "all";
    const stored = window.localStorage.getItem(RECENT_FILTER_STORAGE_KEY);
    if (stored === "image") return "attachment";
    return isSidebarTypeFilterId(stored) ? stored : "all";
  } catch {
    return "all";
  }
};

const SidebarSkeleton: React.FC<{ itemsCount?: number }> = ({ itemsCount = 4 }) => {
  return (
    <div
      className="SidebarSkeleton"
      aria-busy="true"
      aria-label="Loading..."
      {...stylex.props(sidebarStyles.sidebarSkeleton)}
    >
      {Array.from({ length: itemsCount }).map((_, idx) => (
        <div
          key={idx}
          className="SidebarSkeleton__item"
          {...stylex.props(sidebarStyles.sidebarSkeletonItem)}
        >
          <div
            className="SidebarSkeleton__icon"
            {...stylex.props(sidebarStyles.sidebarSkeletonIcon)}
          />
          <div
            className="SidebarSkeleton__text"
            {...stylex.props(sidebarStyles.sidebarSkeletonText)}
          />
        </div>
      ))}
    </div>
  );
};


const SIDEBAR_CONTENT_TYPES = [
  "dialog",
  "page",
  "image",
  "doc",
  "file",
  "table",
  "agent",
  "app",
] as const;

type SidebarContentType = (typeof SIDEBAR_CONTENT_TYPES)[number];

const isSidebarContentType = (value: string): value is SidebarContentType =>
  SIDEBAR_CONTENT_TYPES.includes(value as SidebarContentType);

const normalizeSidebarItemType = (type?: string): SidebarContentType => {
  const normalizedType = String(type || "").toLowerCase();
  // Residual persisted type label from the pre-agent rename; treat as agent for row UI.
  if (normalizedType === "cybot") {
    return "agent";
  }
  if (isSidebarContentType(normalizedType)) {
    return normalizedType;
  }
  return "file";
};



// Shared recent-item virtualized list. Used by both the default recent view and
// the search results view so the row rendering stays in one place. Always goes
// through SidebarVirtualizedList — never map the full filtered array into DOM.
const RecentVirtualList: React.FC<{
  items: MyContentListItem[];
  onAction: (key: React.Key) => void;
  activeMenuKey: string | null;
  onToggleMenu: (key: string | null) => void;
  currentUserId?: string | null;
  activePageKey?: string;
  currentPath: string;
}> = ({
  items,
  onAction,
  activeMenuKey,
  onToggleMenu,
  currentUserId,
  activePageKey,
  currentPath,
}) => {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const menuAnchorKeyRef = useRef<string | null>(null);
  const [editSignal, setEditSignal] = useState<{ key: string; nonce: number } | null>(null);
  const [appDeleteRequest, setAppDeleteRequest] = useState<SidebarAppDeleteRequest | null>(null);

  const handleMenuAnchorChange = useCallback((key: string, el: HTMLElement | null) => {
    if (el) {
      menuAnchorKeyRef.current = key;
      setMenuAnchorEl(el);
      return;
    }
    if (menuAnchorKeyRef.current === key) {
      menuAnchorKeyRef.current = null;
      setMenuAnchorEl(null);
    }
  }, []);

  const closeMenu = useCallback(() => {
    onToggleMenu(null);
    menuAnchorKeyRef.current = null;
    setMenuAnchorEl(null);
  }, [onToggleMenu]);

  const activeItem =
    activeMenuKey && menuAnchorEl
      ? items.find((item) => item.contentKey === activeMenuKey) ?? null
      : null;
  const activeIndex = React.useMemo(
    () =>
      items.findIndex((item) =>
        isRoutableContentActive({
          contentKey: item.contentKey,
          type: item.type,
          userId: currentUserId,
          spaceId: item.spaceId,
          activePageKey,
          currentPath,
        })
      ),
    [items, currentUserId, activePageKey, currentPath]
  );
  return (
    <div
      className="AllViewSidebar__recent-list"
      {...stylex.props(sidebarStyles.allViewRecentList)}
    >
      <SidebarVirtualizedList
        items={items}
        onAction={onAction}
        dependencies={[
          activePageKey,
          currentPath,
          activeMenuKey,
        ]}
        scrollToIndex={activeIndex}
        onItemContextMenu={(item, anchor) => {
          handleMenuAnchorChange(item.contentKey, anchor);
          onToggleMenu(item.contentKey);
        }}
        onItemRename={(item) => setEditSignal({ key: item.contentKey, nonce: Date.now() })}
      >
        {(item) => {
          const normalizedType = normalizeSidebarItemType(item.type);
          return (
            <SidebarItemRow
              key={item.contentKey}
              contentKey={item.contentKey}
              type={normalizedType}
              title={item.title || t("unnamed")}
              fileCategory={"fileCategory" in item ? item.fileCategory ?? null : null}
              spaceIdOverride={item.spaceId}
              sourceServerOrigin={item.serverOrigin}
              disableDrag
              isActive={isRoutableContentActive({
                contentKey: item.contentKey,
                type: item.type,
                userId: currentUserId,
                spaceId: item.spaceId,
                activePageKey,
                currentPath,
              })}
              isMenuOpen={activeMenuKey === item.contentKey}
              onToggleMenu={onToggleMenu}
              onMenuAnchorChange={handleMenuAnchorChange}
              editSignal={editSignal?.key === item.contentKey ? editSignal.nonce : undefined}
              pinned={Boolean(item.pinned)}
            />
          );
        }}
      </SidebarVirtualizedList>

      {activeItem && menuAnchorEl && (
        <MenuPopover
          triggerRef={{ current: menuAnchorEl }}
          isOpen
          onOpenChange={(open) => {
            if (!open) closeMenu();
          }}
          placement="bottom end"
        >
          <SidebarItemMoreMenu
            contentKey={activeItem.contentKey}
            title={activeItem.title || t("unnamed")}
            type={normalizeSidebarItemType(activeItem.type)}
            spaceId={activeItem.spaceId}
            canEditInSpace={Boolean(activeItem.spaceId)}
            canMoveToSpace={normalizeSidebarItemType(activeItem.type) !== "app"}
            showDownloadAction={
              normalizeSidebarItemType(activeItem.type) === "file" ||
              normalizeSidebarItemType(activeItem.type) === "image"
            }
            pinAction={{
              pinned: Boolean(activeItem.pinned),
              onToggle: () =>
                (dispatch as any)(
                  (updateContentPinned as any)({
                    spaceId: activeItem.spaceId ?? null,
                    contentKey: activeItem.contentKey,
                    pinned: !activeItem.pinned,
                    sourceServerOrigin: activeItem.serverOrigin,
                  })
                ),
            }}
            menuAnchorEl={menuAnchorEl}
            onEditTitle={() => {
              setEditSignal({ key: activeItem.contentKey, nonce: Date.now() });
              closeMenu();
            }}
            onDeleteApp={() =>
              setAppDeleteRequest({
                contentKey: activeItem.contentKey,
                spaceId: activeItem.spaceId,
                sourceServerOrigin: activeItem.serverOrigin,
              })
            }
            onClose={closeMenu}
          />
        </MenuPopover>
      )}
      <SidebarAppDeleteDialog
        request={appDeleteRequest}
        onClose={() => setAppDeleteRequest(null)}
      />
    </div>
  );
};

const AllViewSidebar: React.FC<{
  searchQuery?: string;
  header?: React.ReactNode;
  navHeader?: React.ReactNode;
  /**
   * Active type filter owned by the parent sidebar (ChatSidebar renders the
   * shared `SidebarTypeFilter`). Drives the recent list query + client filter.
   * Falls back to the locally stored preference when not provided.
   */
  typeFilter?: SidebarTypeFilterId;
}> = ({ searchQuery = "", header, navHeader, typeFilter }) => {
  const { t } = useTranslation("space");
  const location = useLocation();
  // Agent sub-routes (e.g. `:agentPageKey/inbox`) name the route param
  // differently, so fall back to it to keep the sidebar item highlighted there.
  const { pageKey, agentPageKey } = useParams<"pageKey" | "agentPageKey">();
  const activePageKey = pageKey ?? agentPageKey;
  const navigate = useNavigate();

  const currentUserId = useUserId();
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [activeMenuKey, setActiveMenuKey] = useState<string | null>(null);
  // Filter is owned by the parent sidebar; fall back to the stored preference
  // only when no prop is passed (e.g. standalone/test rendering).
  const recentFilter: SidebarTypeFilterId = typeFilter ?? readStoredRecentFilter();

  // 单查询 + 纯客户端过滤：始终拉全类型，切 filter 只是 useMemo 重算，零网络、零 loading。
  // useMyContentItems 不传 filterTypes 时按类型并行拉取（每类型独立 limit 200），
  // 各类型远端到达时间不同，先到先注入——天然的流水式渐进显示。
  const { items: recentItems, loading: recentLoading } = useMyContentItems();
  const normalizedSearchQuery = asTrimmedLowercaseString(searchQuery);
  const currentPath = `${location.pathname}${location.search}`;
  // Unscoped dialog image attachments are hidden from the default "all" view
  // (they live inside a dialog, not the All View sidebar), but must remain
  // visible when the user explicitly switches to the "attachment" filter so
  // they can manage those attachments there.
  const sidebarRecentItems = useMemo(
    () =>
      recentFilter === "attachment"
        ? recentItems
        : recentItems.filter((item) => !isAllViewDialogImageAttachment(item)),
    [recentItems, recentFilter]
  );
  const filteredRecentItems = useMemo(
    () => sidebarRecentItems.filter((item) => matchesTypeFilter(item, recentFilter)),
    [recentFilter, sidebarRecentItems]
  );

  // ── US5: stable ordering during background sync ──
  // With single-query + client-side filtering, switching filter no longer
  // refetches data. The remaining reorder source is localFirst's progressive
  // merge: local partial data arrives first, account full sync arrives later,
  // and dedup may shift an item's updatedAt, causing visible jumps.
  // Fix: freeze the relative order of already-seen contentKeys for the current
  // filter; new keys (from background sync) append to the end. Reset on filter
  // switch (the dataset changes entirely). No new store/subscription — just a
  // ref + useMemo.
  const orderRef = React.useRef<Map<string, number>>(new Map());
  const orderFilterRef = React.useRef<SidebarTypeFilterId>(recentFilter);
  const stableRecentItems = useMemo(() => {
    // Filter changed → discard old order, rebuild from current snapshot.
    if (orderFilterRef.current !== recentFilter) {
      orderRef.current = new Map();
      orderFilterRef.current = recentFilter;
    }
    const order = orderRef.current;
    // New keys always get a position higher than any existing position,
    // even after pruning deleted keys (prune removes entries but the
    // remaining positions are never re-numbered, so order.size alone
    // would collide — use max position + 1 instead).
    let nextIndex =
      order.size > 0 ? Math.max(...order.values()) + 1 : 0;
    for (const item of filteredRecentItems) {
      if (!order.has(item.contentKey)) {
        order.set(item.contentKey, nextIndex++);
      }
    }
    // Prune keys that disappeared (deleted/cleared) to prevent unbounded growth.
    if (order.size > filteredRecentItems.length * 2) {
      const liveKeys = new Set(filteredRecentItems.map((i) => i.contentKey));
      for (const key of [...order.keys()]) {
        if (!liveKeys.has(key)) order.delete(key);
      }
    }
    // Sort by stable position: already-seen keys keep their frozen relative
    // order; new keys appear at the end in their first-seen order.
    return [...filteredRecentItems].sort(
      (a, b) => order.get(a.contentKey)! - order.get(b.contentKey)!
    );
  }, [filteredRecentItems, recentFilter]);

  const favoriteItems = useFavoriteSidebarItems(recentItems);

  const favoriteKeysSet = useMemo(
    () => new Set(favoriteItems.map((item) => item.contentKey)),
    [favoriteItems],
  );

  const filteredFavoriteItems = useMemo(
    () => favoriteItems.filter((item) => matchesTypeFilter(item, recentFilter)),
    [favoriteItems, recentFilter]
  );

  // ── perf: mark mount ──
  React.useEffect(() => {
    __sidPerf?.measure("mount");
  }, []);

  // ── perf: recent items ready ──
  const prevRecentLoading = React.useRef(recentLoading);
  React.useEffect(() => {
    if (prevRecentLoading.current && !recentLoading) {
      __sidPerf?.measure("recent_items_ready");
      __sidPerf?.log("recent_items_ready");
    }
    prevRecentLoading.current = recentLoading;
  }, [recentLoading]);

  const searchedRecentItems = useMemo(
    () => filterAllViewRecentItems(sidebarRecentItems, normalizedSearchQuery),
    [normalizedSearchQuery, sidebarRecentItems]
  );
  const totalSearchResults = searchedRecentItems.length;



  // All View navigation stays intentionally unscoped: opening a recent item must
  // not push the layout onto `/space/...` (which flips MainLayout out of All View).
  const handleRecentItemAction = useCallback((key: React.Key) => {
    const item = stableRecentItems.find((i) => i.contentKey === key);
    if (!item) return;
    navigate(buildRoutableContentPath({
      contentKey: item.contentKey,
      type: item.type,
      userId: currentUserId ?? undefined,
    }));
  }, [stableRecentItems, navigate, currentUserId]);

  const handleSearchRecentItemAction = useCallback((key: React.Key) => {
    const item = searchedRecentItems.find((i) => i.contentKey === key);
    if (!item) return;
    navigate(buildRoutableContentPath({
      contentKey: item.contentKey,
      type: item.type,
      userId: currentUserId ?? undefined,
    }));
  }, [searchedRecentItems, navigate, currentUserId]);

  if (normalizedSearchQuery) {
    // Search reuses RecentVirtualList (RAC Virtualizer). The section must be a
    // column flex fill so the ListBox gets a finite clientHeight — otherwise
    // height:100% collapses to content size and every match mounts.
    return (
      <div
        className={`AllViewSidebar ${stylex.props(sidebarStyles.allViewSidebar).className ?? ""}`}
      >
        <div
          className={`AllViewSidebar__scroll-area ${stylex.props(sidebarStyles.scrollArea).className ?? ""}`}
          ref={scrollAreaRef}
        >
          <section
            className={`AllViewSidebar__section AllViewSidebar__section--fill ${
              stylex.props(
                sidebarStyles.allViewSection,
                sidebarStyles.allViewSectionFill
              ).className ?? ""
            }`}
          >
            <div className="AllViewSidebar__section-header-row">
              <div
                className={`AllViewSidebar__section-header AllViewSidebar__section-header--static ${
                  stylex.props(sidebarStyles.allViewSectionHeader).className ?? ""
                }`}
              >
                <span
                  className={`AllViewSidebar__menu-label ${
                    stylex.props(sidebarStyles.allViewMenuLabel).className ?? ""
                  }`}
                >
                  {t("search")}
                </span>
                <span
                  className={`AllViewSidebar__section-state ${
                    stylex.props(sidebarStyles.allViewSectionState).className ?? ""
                  }`}
                >
                  {totalSearchResults}
                </span>
              </div>
            </div>

            <div
              className={`AllViewSidebar__section-preview ${
                stylex.props(sidebarStyles.allViewSectionPreview).className ?? ""
              }`}
            >
              {totalSearchResults === 0 ? (
                <div
                  className={`AllViewSidebar__preview-empty ${
                    stylex.props(sidebarStyles.allViewPreviewEmpty).className ?? ""
                  }`}
                >
                  {t("search_no_results")}
                </div>
              ) : (
                <>
                  {searchedRecentItems.length > 0 ? (
                    <div
                      className={`AllViewSidebar__search-group ${
                        stylex.props(sidebarStyles.allViewSearchGroup).className ?? ""
                      }`}
                      data-hook="chat-esc-allview-search-group"
                    >
                      <div
                        className={`AllViewSidebar__search-group-title ${
                          stylex.props(sidebarStyles.allViewSearchGroupTitle).className ?? ""
                        }`}
                      >
                        {t("allView.recent")}
                      </div>
                      <RecentVirtualList
                        items={searchedRecentItems}
                        onAction={handleSearchRecentItemAction}
                        activeMenuKey={activeMenuKey}
                        onToggleMenu={setActiveMenuKey}
                        currentUserId={currentUserId}
                        activePageKey={activePageKey}
                        currentPath={currentPath}
                      />
                    </div>
                  ) : null}

                </>
              )}
            </div>
          </section>
        </div>

      <AllViewStyles />
      </div>
    );
  }

  return (
    <div
      className={`AllViewSidebar ${stylex.props(sidebarStyles.allViewSidebar).className ?? ""}`}
    >
      {navHeader}
      {header}

      {stableRecentItems.some((i) => i.pinned) && (
        <SidebarPinnedBlock
          items={stableRecentItems.filter((i) => i.pinned)}
          activeMenuKey={activeMenuKey}
          onToggleMenu={setActiveMenuKey}
          blockId="pinned"
          className="AllViewSidebar__pinned-block"
        />
      )}

      <div
        className={`AllViewSidebar__scroll-area ${stylex.props(sidebarStyles.scrollArea).className ?? ""}`}
        ref={scrollAreaRef}
      >
        <div
          className={`AllViewSidebar__recent-content ${
            stylex.props(sidebarStyles.allViewRecentContent).className ?? ""
          }`}
        >
          {recentLoading && sidebarRecentItems.length === 0 ? (
            <SidebarSkeleton itemsCount={4} />
          ) : stableRecentItems.length === 0 ? (
            <div
              className={`AllViewSidebar__empty-state ${
                stylex.props(sidebarStyles.allViewEmptyState).className ?? ""
              }`}
            >
              <div
                className={`AllViewSidebar__empty-icon ${
                  stylex.props(sidebarStyles.allViewEmptyIcon).className ?? ""
                }`}
                aria-hidden="true"
              >
                <LuInbox size={24} aria-hidden="true" />
              </div>
              <div
                className={`AllViewSidebar__empty-text ${
                  stylex.props(sidebarStyles.allViewEmptyText).className ?? ""
                }`}
              >
                {recentFilter === "all"
                  ? t("emptyTitle")
                  : t("space:no_items_found", "没有找到该类型的内容")}
              </div>
            </div>
          ) : (
            <RecentVirtualList
              items={stableRecentItems.filter((i) => !i.pinned && !favoriteKeysSet.has(i.contentKey))}
              onAction={handleRecentItemAction}
              activeMenuKey={activeMenuKey}
              onToggleMenu={setActiveMenuKey}
              currentUserId={currentUserId}
              activePageKey={activePageKey}
              currentPath={currentPath}
            />
          )}
        </div>
      </div>

      <AllViewStyles />
    </div>
  );
};

const AllViewStyles: React.FC = () => null;

export default AllViewSidebar;
