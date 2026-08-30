import * as stylex from "@stylexjs/stylex";
import { sidebarStyles } from "../sidebarStyles";
import "../chatStylexEscapeHatch.css";
import React, { useRef, useCallback, useState } from "react";
import { useLocation, useParams, useNavigate } from "app/routing";

import { useAppSelector, useAppDispatch } from "app/store";
import {
  selectCurrentSpaceId,
  toggleCategoryCollapse,
  updateContentPinned,
} from "create/space/spaceSlice";
// Wave A: collapsedCategories 已剥至 module store。
import { useIsCategoryCollapsed } from "create/space/spaceUiStore";
import { UNCATEGORIZED_ID } from "create/space/constants";
import { useUserId } from "identity";
import CategoryHeader from "create/space/category/CategoryHeader";
import {
  isRoutableContentActive,
  buildRoutableContentPath,
} from "create/space/contentKeyUtils";
import { extractCustomId } from "core/prefix";
import type { SpaceContent } from "app/types";
import {
  SidebarVirtualizedList,
  SIDEBAR_VIRTUAL_ROW_SIZE,
} from "./SidebarVirtualizedList";
import SidebarItemRow from "create/space/SidebarItemRow";
import { MenuPopover } from "render/web/ui/MenuPopover";
import { SidebarItemMoreMenu } from "create/space/SidebarItemMoreMenu";
import { SidebarAppDeleteDialog } from "create/space/SidebarAppDeleteDialog";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

const CreateMenuButton = React.lazy(
  () => import("render/layout/CreateMenuButtonContainer")
);

// buildCreateSlice action creators are typed with void; restore callable signature.
const toggleCategoryCollapseAction = toggleCategoryCollapse as unknown as (payload: {
  categoryId: string;
}) => unknown;

interface CategorySectionProps {
  categoryId: string;
  categoryName: string;
  items: SpaceContent[];
  /**
   * 子对话按 parentDialogId 分组的 map（key = parentDialogId，即父对话的 id）。
   * 侧边栏用它把子对话折叠到父对话下。父对话通过 extractCustomId(contentKey)
   * 提取 id 后在此 map 里查子对话。
   */
  childrenByParent?: Record<string, SpaceContent[]>;
  handleProps?: {
    onDragStart?: (e: React.DragEvent) => void;
    onDragEnd?: (e: React.DragEvent) => void;
  };
  activeMenuKey: string | null;
  onToggleMenu: (key: string | null) => void;
  hideHeader?: boolean;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  categoryId,
  categoryName,
  items = [],
  childrenByParent,
  handleProps,
  activeMenuKey,
  onToggleMenu,
  hideHeader,
}) => {
  const location = useLocation();
  // Agent sub-routes (e.g. `:agentPageKey/inbox`) name the route param
  // differently, so fall back to it to keep the sidebar item highlighted there.
  const { pageKey, agentPageKey } = useParams<"pageKey" | "agentPageKey">();
  const activePageKey = pageKey ?? agentPageKey;
  const dispatch = useAppDispatch();
  const currentSpaceId = useCurrentSpaceId();
  const currentUserId = useUserId();
  const isUncategorized = categoryId === UNCATEGORIZED_ID;
  // Single source of truth — must match CategoryHeader / addCategory seed.
  // Do NOT re-inline `?? !isUncategorized` here (that diverged from the selector
  // and made new-category expand seeds easy to miss).
  const isCollapsed = useIsCategoryCollapsed(categoryId);
  const currentPath = `${location.pathname}${location.search}`;
  const navigate = useNavigate();

  // Host RAC Menu outside ListBox so SubmenuTrigger is not parsed as a ListBox node.
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null);
  const [editSignal, setEditSignal] = useState<{ key: string; nonce: number } | null>(null);
  const [appDeleteRequest, setAppDeleteRequest] = React.useState<{ contentKey: string; spaceId?: string | null; sourceServerOrigin?: string } | null>(null);
  const menuAnchorKeyRef = useRef<string | null>(null);

  const handleMenuAnchorChange = useCallback(
    (key: string, el: HTMLElement | null) => {
      if (el) {
        menuAnchorKeyRef.current = key;
        setMenuAnchorEl(el);
        return;
      }
      if (menuAnchorKeyRef.current === key) {
        menuAnchorKeyRef.current = null;
        setMenuAnchorEl(null);
      }
    },
    []
  );

  const closeMenu = useCallback(() => {
    onToggleMenu(null);
    menuAnchorKeyRef.current = null;
    setMenuAnchorEl(null);
  }, [onToggleMenu]);

  const handleItemAction = useCallback(
    (key: React.Key) => {
      const item = items.find((i) => i.contentKey === key);
      if (!item) return;
      navigate(
        buildRoutableContentPath({
          contentKey: item.contentKey,
          type: item.type,
          userId: currentUserId ?? undefined,
          spaceId: currentSpaceId ?? undefined,
        })
      );
    },
    [items, navigate, currentUserId, currentSpaceId]
  );

  // 拖拽悬停 800ms 后自动展开折叠的分类
  const expandTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSectionDragOver = useCallback(
    (_e: React.DragEvent) => {
      if (!isCollapsed) return;
      if (!expandTimeoutRef.current) {
        expandTimeoutRef.current = setTimeout(() => {
          dispatch(toggleCategoryCollapseAction({ categoryId }) as any);
          expandTimeoutRef.current = null;
        }, 800);
      }
    },
    [isCollapsed, dispatch, categoryId]
  );

  const handleSectionDragLeave = useCallback((e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }
  }, []);

  const sectionClasses = [
    "CategorySection",
    categoryId === UNCATEGORIZED_ID && "CategorySection--uncategorized",
    items.length === 0 && "CategorySection--empty",
  ]
    .filter(Boolean)
    .join(" ");

  // 子对话折叠状态：collapsedParents 存"已展开"的父 contentKey 集合。
  // 默认空集 = 全部折叠（子对话默认隐藏）。
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());
  const toggleParentExpand = useCallback((parentKey: string) => {
    setExpandedParents((prev) => {
      const next = new Set(prev);
      if (next.has(parentKey)) next.delete(parentKey);
      else next.add(parentKey);
      return next;
    });
  }, []);

  // 扁平化 items：父行 + 展开时的子行。子行带 __isChildRow 标记。
  type FlatRow = SpaceContent & {
    __childCount?: number;
    __isChildRow?: boolean;
    __parentKey?: string;
  };
  const flatRows = React.useMemo<FlatRow[]>(() => {
    if (!childrenByParent) return items as FlatRow[];
    const rows: FlatRow[] = [];
    for (const item of items) {
      const parentId = extractCustomId(item.contentKey);
      const children = parentId ? childrenByParent[parentId] : undefined;
      const childCount = children?.length ?? 0;
      const row: FlatRow = { ...item, __childCount: childCount };
      rows.push(row);
      if (childCount > 0 && expandedParents.has(item.contentKey)) {
        for (const child of children!) {
          rows.push({ ...child, __isChildRow: true, __parentKey: item.contentKey });
        }
      }
    }
    return rows;
  }, [items, childrenByParent, expandedParents]);

  const activeItem =
    activeMenuKey && menuAnchorEl
      ? flatRows.find((item) => item.contentKey === activeMenuKey) ?? null
      : null;

  const activeIndex = React.useMemo(
    () =>
      flatRows.findIndex((item) =>
        isRoutableContentActive({
          contentKey: item.contentKey,
          type: item.type,
          userId: currentUserId,
          spaceId: currentSpaceId,
          activePageKey,
          currentPath,
        })
      ),
    [flatRows, currentUserId, currentSpaceId, activePageKey, currentPath]
  );
  return (
    <>
      <div
        className={sectionClasses}
        data-hook="chat-esc-category-section"
        onDragOver={handleSectionDragOver}
        onDragLeave={handleSectionDragLeave}
        {...stylex.props(sidebarStyles.categorySection)}
      >
        {!hideHeader && (
          <CategoryHeader
            categoryId={categoryId}
            categoryName={categoryName}
            itemCount={items.length}
            handleProps={handleProps}
          />
        )}

        <div
          className={`CategorySection__content-wrapper ${
            isCollapsed ? "CategorySection__content-wrapper--collapsed" : ""
          }`}
          data-hook={`chat-esc-category-wrapper ${
            isCollapsed ? "chat-esc-category-collapsed" : ""
          }`}
          style={{ overflow: items.length === 0 ? "visible" : undefined }}
          {...stylex.props(
            sidebarStyles.categoryContentWrapper,
            isCollapsed && sidebarStyles.categoryContentWrapperCollapsed
          )}
        >
          {items.length > 0 ? (
            <div
              className="CategorySection__content-inner"
              data-hook="chat-esc-category-inner"
              style={{ overflow: "hidden" }}
              {...stylex.props(sidebarStyles.categoryContentInner)}
            >
              <SidebarVirtualizedList
                items={flatRows}
                rowSize={SIDEBAR_VIRTUAL_ROW_SIZE}
                onAction={handleItemAction}
                dependencies={[activePageKey, currentPath, activeMenuKey, expandedParents]}
                scrollToIndex={activeIndex}
                onItemContextMenu={(item, anchor) => {
                  handleMenuAnchorChange(item.contentKey, anchor);
                  onToggleMenu(item.contentKey);
                }}
                onItemRename={(item) => setEditSignal({ key: item.contentKey, nonce: Date.now() })}
              >
                {(item) => (
                  <SidebarItemRow
                    key={item.contentKey}
                    contentKey={item.contentKey}
                    type={item.type}
                    title={item.title}
                    fileCategory={item.fileCategory ?? null}
                    categoryId={item.categoryId ?? undefined}
                    isActive={isRoutableContentActive({
                      contentKey: item.contentKey,
                      type: item.type,
                      userId: currentUserId,
                      spaceId: currentSpaceId,
                      activePageKey,
                      currentPath,
                    })}
                    isMenuOpen={activeMenuKey === item.contentKey}
                    onToggleMenu={onToggleMenu}
                    onMenuAnchorChange={handleMenuAnchorChange}
                    editSignal={editSignal?.key === item.contentKey ? editSignal.nonce : undefined}
                    pinned={Boolean(item.pinned)}
                    childCount={(item as FlatRow).__childCount}
                    isChildCollapsed={!expandedParents.has(item.contentKey)}
                    onToggleChildCollapse={
                      (item as FlatRow).__childCount
                        ? () => toggleParentExpand(item.contentKey)
                        : undefined
                    }
                    isChildRow={(item as FlatRow).__isChildRow}
                  />
                )}
              </SidebarVirtualizedList>
            </div>
          ) : !isCollapsed && categoryId === UNCATEGORIZED_ID ? (
            <div className="CategorySection__empty-create">
              <React.Suspense fallback={null}>
                <CreateMenuButton
                  categoryId={categoryId}
                  variant="inline"
                  showLabel={true}
                />
              </React.Suspense>
            </div>
          ) : null}
        </div>
      </div>

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
            title={activeItem.title}
            type={activeItem.type}
            spaceId={currentSpaceId}
            canEditInSpace={Boolean(currentSpaceId)}
            canMoveToSpace={activeItem.type !== "app"}
            showDownloadAction={
              activeItem.type === "file" || activeItem.type === "image"
            }
            pinAction={
              currentSpaceId
                ? {
                    pinned: Boolean(activeItem.pinned),
                    onToggle: () =>
                      (dispatch as any)(
                        (updateContentPinned as any)({
                          spaceId: currentSpaceId,
                          contentKey: activeItem.contentKey,
                          pinned: !activeItem.pinned,
                        })
                      ),
                  }
                : undefined
            }
            menuAnchorEl={menuAnchorEl}
            onEditTitle={() => {
              setEditSignal({ key: activeItem.contentKey, nonce: Date.now() });
              closeMenu();
            }}
            onDeleteApp={() =>
              setAppDeleteRequest({
                contentKey: activeItem.contentKey,
                spaceId: currentSpaceId,
                sourceServerOrigin: undefined,
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
    </>
  );
};

export default CategorySection;
