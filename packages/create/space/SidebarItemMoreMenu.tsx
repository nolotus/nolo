import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  LuArrowDown,
  LuArrowUp,
  LuDownload,
  LuFolderMinus,
  LuPencil,
  LuPlus,
  LuStar,
  LuTrash2,
  LuZap,
} from "react-icons/lu";
import { nanoid } from "nanoid";
import { useAppDispatch } from "app/store";
import { useUserId } from "identity";
import { addPendingFile, useCurrentDialogKey } from "chat/dialog/dialogSlice";
import SidebarMoveToSubmenu from "./SidebarMoveToSubmenu";
import { Menu, MenuItem } from "render/web/ui/Menu";
import { useContentFavorite } from "app/favorite/useContentFavorite";
import { toast } from "app/utils/toast";
import { resolveRoutableContentKey } from "./contentKeyUtils";
import {
  resolvePendingAttachmentType,
  type ItemType,
} from "./sidebarItemShared";

const ICON_SIZE = 16 as const;

/**
 * Item types that can be attached to the current conversation ("加入对话").
 * Mirrors the visibility of the inline button this action replaced: app rows
 * are excluded.
 */
const JOIN_CONVERSATION_TYPES = [
  "page",
  "dialog",
  "table",
  "agent",
  "image",
  "file",
] as const;

const canJoinConversation = (type: string): boolean =>
  (JOIN_CONVERSATION_TYPES as readonly string[]).includes(type);

export type SidebarItemMoreMenuProps = {
  contentKey: string;
  title: string;
  type: string;
  spaceId?: string | null;
  /** Needed to resolve file → image pending attachments for "加入对话". */
  fileCategory?: string | null;
  canEditInSpace: boolean;
  canMoveToSpace: boolean;
  /** 是否可删除内容本体（自有内容）。他人内容不给该入口。 */
  canDeleteContent?: boolean;
  /** 是否可从当前空间移除引用（空间 owner/admin；不删除本体）。 */
  canRemoveFromSpace?: boolean;
  /** 触发「从空间移除」确认流程（由宿主渲染确认框）。 */
  onRemoveFromSpace?: () => void;
  showDownloadAction: boolean;
  menuAnchorEl?: HTMLElement | null;
  sourceServerOrigin?: string;
  onEditTitle: () => void;
  onClose: () => void;
  onDeleteApp?: () => void;
  quickAction?: { active: boolean; onToggle: () => void; canMoveUp?: boolean; canMoveDown?: boolean; onMove?: (direction: -1 | 1) => void };
};

/**
 * RAC Menu tree for sidebar item "more" actions.
 * Must be mounted outside ListBox/Virtualizer collection trees.
 * Nested SubmenuTrigger under ListBoxItem throws:
 * "Unsupported node type: submenutrigger".
 *
 * Note: 「置顶 / 取消置顶」lives inline on the row (see SidebarItemRow),
 * while 「加入对话」lives here.
 */
export function SidebarItemMoreMenu({
  contentKey,
  title,
  type,
  spaceId,
  fileCategory,
  canEditInSpace,
  canMoveToSpace,
  canDeleteContent = true,
  canRemoveFromSpace = false,
  onRemoveFromSpace,
  showDownloadAction,
  menuAnchorEl,
  onEditTitle,
  onClose,
  onDeleteApp,
  quickAction,
}: SidebarItemMoreMenuProps) {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  const currentUserId = useUserId();
  const currentDialogKey = useCurrentDialogKey();
  const { isFavorited, toggleFavorite } = useContentFavorite(contentKey);
  const showJoinConversation = canJoinConversation(type);

  // Same pending-attachment contract as the inline button this replaced:
  // dialog items keep the source/target dialog semantics, files resolve by
  // fileCategory (file + "image" → image attachment).
  const handleAddToConversation = useCallback(() => {
    const routeContentKey = resolveRoutableContentKey(
      contentKey,
      type,
      currentUserId ?? undefined
    );
    const sourceDialogKey = type === "dialog" ? routeContentKey : undefined;
    dispatch(addPendingFile({
      id: nanoid(),
      name: title || contentKey,
      pageKey: routeContentKey,
      dialogKey: sourceDialogKey,
      sourceDialogKey,
      targetDialogKey: currentDialogKey ?? undefined,
      type: resolvePendingAttachmentType(type as ItemType, fileCategory),
    }));
    toast.success(t("addedToConversation"));
  }, [
    dispatch,
    contentKey,
    title,
    type,
    fileCategory,
    currentUserId,
    currentDialogKey,
    t,
  ]);

  return (
    <Menu
      onAction={(key) => {
        if (key === "join-conversation" && showJoinConversation) {
          handleAddToConversation();
        } else if (key === "favorite" && type === "dialog") {
          toggleFavorite();
        } else if (key === "quick-toggle" && quickAction) {
          quickAction.onToggle();
        } else if (key === "quick-up" && quickAction?.canMoveUp) {
          quickAction.onMove?.(-1);
        } else if (key === "quick-down" && quickAction?.canMoveDown) {
          quickAction.onMove?.(1);
        } else if (key === "edit" && canEditInSpace) {
          onEditTitle();
        } else if (key === "download" && showDownloadAction) {
          toast("Download coming soon");
        } else if (key === "remove-from-space" && canRemoveFromSpace) {
          onRemoveFromSpace?.();
        } else if (key === "delete-app" && type === "app") {
          onDeleteApp?.();
        }
        onClose();
      }}
    >
      {showJoinConversation && (
        <MenuItem id="join-conversation" textValue={t("joinConversation")}>
          <LuPlus size={ICON_SIZE} aria-hidden="true" />
          <span slot="label">{t("joinConversation")}</span>
        </MenuItem>
      )}
      {type === "dialog" && (
        <MenuItem id="favorite" textValue={isFavorited ? t("unfavorite") : t("favorite")}>
          <LuStar size={ICON_SIZE} aria-hidden="true" />
          <span slot="label">{isFavorited ? t("unfavorite") : t("favorite")}</span>
        </MenuItem>
      )}
      {quickAction && (
        <MenuItem id="quick-toggle" textValue={quickAction.active ? t("quickRemoveFromRail") : t("quickAddToRail")}>
          {/* “加入/移出快捷”曾与上面的“收藏”共用星形图标，两个不同动作看起来像同一件事；
              换成语义独立的闪电，收藏仍独占星形。 */}
          <LuZap size={ICON_SIZE} aria-hidden="true" />
          <span slot="label">{quickAction.active ? t("quickRemoveFromRail") : t("quickAddToRail")}</span>
        </MenuItem>
      )}
      {quickAction?.active && quickAction.canMoveUp && (
        <MenuItem id="quick-up" textValue={t("quickMoveRailUp")}>
          <LuArrowUp size={ICON_SIZE} aria-hidden="true" />
          <span slot="label">{t("quickMoveRailUp")}</span>
        </MenuItem>
      )}
      {quickAction?.active && quickAction.canMoveDown && (
        <MenuItem id="quick-down" textValue={t("quickMoveRailDown")}>
          <LuArrowDown size={ICON_SIZE} aria-hidden="true" />
          <span slot="label">{t("quickMoveRailDown")}</span>
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
      {canRemoveFromSpace && (
        <MenuItem id="remove-from-space" textValue={t("removeFromSpace", "从空间移除")}>
          <LuFolderMinus size={ICON_SIZE} aria-hidden="true" />
          <span slot="label">{t("removeFromSpace", "从空间移除")}</span>
        </MenuItem>
      )}
      {type === "app" && canDeleteContent && (
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
