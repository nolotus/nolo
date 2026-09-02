import React from "react";
import * as stylex from "@stylexjs/stylex";
import { sidebarStyles } from "../sidebarStyles";
import { withLiteralClass } from "../withLiteralClass";
import "../chatStylexEscapeHatch.css";
import { useLocation, useParams } from "app/routing";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "app/store";
import {
  updateContentPinned,
} from "create/space/content/contentThunks";
import { useUserId } from "identity";
import { isRoutableContentActive } from "create/space/contentKeyUtils";
import SidebarItemRow from "create/space/SidebarItemRow";
import { SidebarAppDeleteDialog } from "create/space/SidebarAppDeleteDialog";
import { MenuPopover } from "render/web/ui/MenuPopover";
import { SidebarItemMoreMenu } from "create/space/SidebarItemMoreMenu";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

/**
 * Minimal item shape shared by SpaceContent (space view) and
 * MyContentListItem (all view). spaceId/serverOrigin are per-item in the
 * all view; in the space view they are absent and the current space applies.
 */
export interface SidebarPinnedItem {
  contentKey: string;
  type: string;
  title?: string;
  pinned?: boolean;
  fileCategory?: string | null;
  categoryId?: string | null;
  spaceId?: string | null;
  serverOrigin?: string;
}

interface SidebarPinnedBlockProps {
  items: SidebarPinnedItem[];
  activeMenuKey: string | null;
  onToggleMenu: (key: string | null) => void;
  className?: string;
  blockId?: string;
  /**
   * Selection plumbing for the All View recent batch mode. Omit to keep the
   * space-view (ChatSidebar) behavior unchanged. When `isSelectionMode` is
   * true, each pinned row renders its built-in checkbox overlay and toggles
   * selection through `onToggleSelectKey`, matching the contract used by
   * `SidebarItemRow` in the non-pinned `RecentVirtualList`.
   */
  isSelectionMode?: boolean;
  selectedKeys?: Set<string>;
  onToggleSelectKey?: (key: string) => void;
}

export const SidebarPinnedBlock: React.FC<SidebarPinnedBlockProps> = ({
  items,
  activeMenuKey,
  onToggleMenu,
  className = "",
  blockId = "pinned",
  isSelectionMode = false,
  selectedKeys,
  onToggleSelectKey,
}) => {
  const { t } = useTranslation("space");
  const location = useLocation();
  const { pageKey, agentPageKey } = useParams<"pageKey" | "agentPageKey">();
  const activePageKey = pageKey ?? agentPageKey;
  const dispatch = useAppDispatch();
  const currentSpaceId = useCurrentSpaceId();
  const currentUserId = useUserId();
  const currentPath = `${location.pathname}${location.search}`;

  const [menuAnchorEl, setMenuAnchorEl] = React.useState<HTMLElement | null>(null);
  const [editSignal, setEditSignal] = React.useState<{ key: string; nonce: number } | null>(null);
  const [appDeleteRequest, setAppDeleteRequest] = React.useState<{ contentKey: string; spaceId?: string | null; sourceServerOrigin?: string } | null>(null);
  const menuAnchorKeyRef = React.useRef<string | null>(null);

  const getItemMenuKey = React.useCallback(
    (contentKey: string) => (blockId ? `${blockId}:${contentKey}` : contentKey),
    [blockId]
  );

  const handleMenuAnchorChange = React.useCallback(
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

  const closeMenu = React.useCallback(() => {
    onToggleMenu(null);
    menuAnchorKeyRef.current = null;
    setMenuAnchorEl(null);
  }, [onToggleMenu]);

  const activeItem =
    activeMenuKey && menuAnchorEl
      ? items.find((item) => getItemMenuKey(item.contentKey) === activeMenuKey) ?? null
      : null;
  // Per-item space wins (all view); fall back to the current space (space view).
  const activeItemSpaceId = activeItem
    ? activeItem.spaceId ?? currentSpaceId ?? null
    : null;

  if (items.length === 0) return null;

  return (
    <>
      <div
        {...withLiteralClass(`SidebarPinnedBlock ${className}`, sidebarStyles.pinnedBlockWrapper)}
      >
        {items.map((item) => {
          const itemSpaceId = item.spaceId ?? currentSpaceId ?? null;
          const itemMenuKey = getItemMenuKey(item.contentKey);
          return (
            <SidebarItemRow
              key={itemMenuKey}
              contentKey={item.contentKey}
              type={item.type}
              title={item.title || t("unnamed")}
              fileCategory={item.fileCategory ?? null}
              categoryId={item.categoryId ?? undefined}
              spaceIdOverride={itemSpaceId}
              sourceServerOrigin={item.serverOrigin}
              disableDrag
              isActive={isRoutableContentActive({
                contentKey: item.contentKey,
                type: item.type,
                userId: currentUserId,
                spaceId: itemSpaceId,
                activePageKey,
                currentPath,
              })}
              isMenuOpen={activeMenuKey === itemMenuKey}
              onToggleMenu={(key) => {
                if (!key) {
                  onToggleMenu(null);
                } else {
                  onToggleMenu(itemMenuKey);
                }
              }}
              onMenuAnchorChange={(key, el) => {
                handleMenuAnchorChange(itemMenuKey, el);
              }}
              isSelectionMode={isSelectionMode}
              isSelected={
                isSelectionMode
                  ? selectedKeys?.has(item.contentKey) ?? false
                  : false
              }
              onSelectItem={isSelectionMode ? onToggleSelectKey : undefined}
              editSignal={editSignal?.key === item.contentKey ? editSignal.nonce : undefined}
              pinned={blockId === "favorites" ? false : Boolean(item.pinned)}
            />
          );
        })}
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
            title={activeItem.title || t("unnamed")}
            type={activeItem.type}
            spaceId={activeItemSpaceId}
            canEditInSpace={Boolean(activeItemSpaceId)}
            canMoveToSpace={activeItem.type !== "app"}
            showDownloadAction={
              activeItem.type === "file" || activeItem.type === "image"
            }
            pinAction={{
              pinned: Boolean(activeItem.pinned),
              onToggle: () =>
                (dispatch as any)(
                  (updateContentPinned as any)({
                    spaceId: activeItemSpaceId,
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
                spaceId: activeItemSpaceId,
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
    </>
  );
};
