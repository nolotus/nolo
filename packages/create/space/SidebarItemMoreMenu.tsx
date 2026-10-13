import { useTranslation } from "react-i18next";
import {
  LuDownload,
  LuPencil,
  LuPin,
  LuPinOff,
  LuStar,
  LuTrash2,
} from "react-icons/lu";
import SidebarMoveToSubmenu from "./SidebarMoveToSubmenu";
import { Menu, MenuItem } from "render/web/ui/Menu";
import { useContentFavorite } from "app/favorite/useContentFavorite";
import { toast } from "app/utils/toast";

const ICON_SIZE = 16 as const;

export type SidebarItemMoreMenuProps = {
  contentKey: string;
  title: string;
  type: string;
  spaceId?: string | null;
  canEditInSpace: boolean;
  canMoveToSpace: boolean;
  showDownloadAction: boolean;
  pinAction?: { pinned: boolean; onToggle: () => void };
  menuAnchorEl?: HTMLElement | null;
  sourceServerOrigin?: string;
  onEditTitle: () => void;
  onClose: () => void;
  onDeleteApp?: () => void;
};

/**
 * RAC Menu tree for sidebar item "more" actions.
 * Must be mounted outside ListBox/Virtualizer collection trees.
 * Nested SubmenuTrigger under ListBoxItem throws:
 * "Unsupported node type: submenutrigger".
 */
export function SidebarItemMoreMenu({
  contentKey,
  title,
  type,
  spaceId,
  canEditInSpace,
  canMoveToSpace,
  showDownloadAction,
  pinAction,
  menuAnchorEl,
  onEditTitle,
  onClose,
  onDeleteApp,
}: SidebarItemMoreMenuProps) {
  const { t } = useTranslation("space");
  const { isFavorited, toggleFavorite } = useContentFavorite(contentKey);

  return (
    <Menu
      onAction={(key) => {
        if (key === "pin" && pinAction) {
          pinAction.onToggle();
        } else if (key === "favorite" && type === "dialog") {
          toggleFavorite();
        } else if (key === "edit" && canEditInSpace) {
          onEditTitle();
        } else if (key === "download" && showDownloadAction) {
          toast("Download coming soon");
        } else if (key === "delete-app" && type === "app") {
          onDeleteApp?.();
        }
        onClose();
      }}
    >
      {pinAction && (
        <MenuItem id="pin" textValue={pinAction.pinned ? t("unpin") : t("pin")}>
          {pinAction.pinned ? (
            <LuPinOff size={ICON_SIZE} aria-hidden="true" />
          ) : (
            <LuPin size={ICON_SIZE} aria-hidden="true" />
          )}
          <span slot="label">{pinAction.pinned ? t("unpin") : t("pin")}</span>
        </MenuItem>
      )}
      {type === "dialog" && (
        <MenuItem id="favorite" textValue={isFavorited ? t("unfavorite") : t("favorite")}>
          <LuStar size={ICON_SIZE} aria-hidden="true" />
          <span slot="label">{isFavorited ? t("unfavorite") : t("favorite")}</span>
        </MenuItem>
      )}
      {canEditInSpace && (
        <MenuItem id="edit" textValue={t("editTitle")}>
          <LuPencil size={ICON_SIZE} aria-hidden="true" />
          <span slot="label">{t("editTitle")}</span>
        </MenuItem>
      )}
      {canMoveToSpace && (
        <SidebarMoveToSubmenu
          contentKey={contentKey}
          title={title}
          contentType={type}
          sourceSpaceIdOverride={spaceId}
          menuAnchorEl={menuAnchorEl}
          onMove={onClose}
        />
      )}
      {type === "app" && (
        <MenuItem id="delete-app" textValue={t("interface:app_delete", "删除应用")}>
          <LuTrash2 size={ICON_SIZE} aria-hidden="true" />
          <span slot="label">{t("interface:app_delete", "删除应用")}</span>
        </MenuItem>
      )}
      {showDownloadAction && (
        <MenuItem id="download" textValue={t("download")}>
          <LuDownload size={ICON_SIZE} aria-hidden="true" />
          <span slot="label">{t("download")}</span>
        </MenuItem>
      )}
    </Menu>
  );
}

export default SidebarItemMoreMenu;
