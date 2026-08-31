// SidebarItemRow.tsx
// Lightweight visual row for use inside RAC ListBoxItem (virtualized sidebar).
// SidebarItem__content-icon--spinning is represented by styles.spinning.
// No NavLink, no self-managed keyboard/focus — RAC handles navigation via onAction.
// Context menu and action buttons retained.

import * as stylex from "@stylexjs/stylex";
import { sidebarItemStyles as styles } from "./sidebarItemStyles";
import "./SidebarItemStylexEscapeHatch.css";

import React, {
  useRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { NavLink } from "app/routing";
import { useAppDispatch, useAppSelector } from "app/store";
import { useTranslation } from "react-i18next";
import { toast } from "app/utils/toast"
import { nanoid } from "nanoid";
import {
  getSnapshot as getRecentlyCreatedSnapshot,
  isRecentlyCreated,
  subscribe as subscribeRecentlyCreated,
} from "chat/web/sidebar/recentlyCreatedStore";
import {
  ICON_SIZE,
  ITEM_ICONS,
  resolvePendingAttachmentType,
  type ItemType,
} from "./sidebarItemShared";

import {
  LuLoaderCircle,
  LuFile,
  LuGripVertical,
  LuEllipsis,
  LuSquare,
  LuSquareCheck,
  LuPlus,
  LuPin,
  LuChevronRight,
  LuChevronDown,
} from "react-icons/lu";

import { useUserId } from "identity";
import {
  selectCurrentSpaceId,
  selectDialogStatusFromEntity,
  selectIsDialogUnreadFromEntity,
  markDialogRead,
  updateContentTitle,
} from "create/space/spaceSlice";
// Wave B: dialog 实时状态已剥至 module store。
import {
  useDialogStatus,
  useIsDialogUnread,
} from "create/space/spaceDialogStore";
import {
  buildRoutableContentPath,
  normalizeAppRouteId,
  resolveRoutableContentKey,
} from "create/space/contentKeyUtils";
import { buildAppDetailPath } from "app/constants/appEditor";
import { recordRecentVisit } from "app/hooks/useRecentlyOpened";
import {
  addPendingFile,
  useCurrentDialogKey,
  useActiveControllers,
} from "chat/dialog/dialogSlice";
import { extractCustomId } from "core/prefix";
import InlineEditInput from "render/web/ui/InlineEditInput";
import { selectEntities, read } from "database/dbSlice";
import AgentAvatar from "ai/agent/web/AgentAvatar";
import ContentIcon from "render/contentIcon/ContentIcon";

import DeleteContentButton from "./components/DeleteContentButton";
import { IconButton } from "./SidebarItemActions";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

/** Props shared with SidebarItem — enough for visual rendering without NavLink/kb. */
export interface SidebarItemRowProps {
  contentKey: string;
  type: string;
  title: string;
  fileCategory?: string | null;
  categoryId?: string;
  spaceIdOverride?: string | null;
  sourceServerOrigin?: string;
  isActive: boolean;
  isMenuOpen: boolean;
  onToggleMenu: (key: string | null) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onSelectItem?: (contentKey: string) => void;
  disableDrag?: boolean;
  /** style prop for outer div (e.g. height from ListLayout) */
  style?: React.CSSProperties;
  /** Report the more-button element so parent can host RAC Menu outside ListBox. */
  onMenuAnchorChange?: (contentKey: string, el: HTMLElement | null) => void;
  /**
   * External edit trigger: when this value changes and equals contentKey,
   * the row enters inline-edit mode. Use a counter (e.g. Date.now()) so the
   * same value can re-trigger after the user cancels and clicks edit again.
   */
  editSignal?: number;

  /** When true, shows a small pin indicator next to the title. */
  pinned?: boolean;

  /** 子对话数：父对话折叠的子对话数量。非空时显示折叠箭头 + 数量。 */
  childCount?: number;
  /** 父对话的子列表是否折叠。默认 true（折叠）。 */
  isChildCollapsed?: boolean;
  /** 点击折叠箭头时触发（切换展开/折叠）。 */
  onToggleChildCollapse?: () => void;
  /** 当为 true 时，此行作为子对话渲染（缩进 + 子样式）。 */
  isChildRow?: boolean;
}

function SidebarItemRow({
  contentKey,
  type,
  title,
  fileCategory,
  categoryId,
  spaceIdOverride,
  sourceServerOrigin,
  isActive,
  isMenuOpen,
  onToggleMenu,
  isSelectionMode,
  isSelected,
  onSelectItem,
  disableDrag,
  style,
  onMenuAnchorChange,
  editSignal,
  pinned,
  childCount,
  isChildCollapsed = true,
  onToggleChildCollapse,
  isChildRow,
}: SidebarItemRowProps) {
  const { t } = useTranslation("space");
  const dispatch = useAppDispatch();
  const currentUserId = useUserId();
  const currentSpaceId = useCurrentSpaceId();
  const dialogKey = useCurrentDialogKey();

  useSyncExternalStore(
    subscribeRecentlyCreated,
    getRecentlyCreatedSnapshot,
    getRecentlyCreatedSnapshot
  );
  const isFlash = isRecentlyCreated(contentKey);

  // rename state (externalized for virtualized rows — survives as long as component mounted)
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Floating controls (drag handle / inline actions / 92px link padding) reveal
  // on .SidebarItem:hover / [data-open] / :focus-within in the original CSS.
  // StyleX has no descendant + pseudo-class selectors, so we track the
  // equivalent states on the row container (onMouseEnter/Leave + onFocus/Blur
  // capture = focus-within) and drive visibility from props.
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusWithin, setIsFocusWithin] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  // Row root element ref — used as the RAC Menu anchor for right-click /
  // Shift+F10 context-menu entry, reusing the same anchor+activeMenuKey
  // channel the "…" button uses (menu is hosted outside the ListBox by parent).
  const rowRef = useRef<HTMLDivElement>(null);

  const routeContentKey = resolveRoutableContentKey(contentKey, type, currentUserId ?? undefined);
  const effectiveSpaceId = spaceIdOverride ?? currentSpaceId;

  // entity for avatar/icon
  const entity = useAppSelector((state) => {
    return selectEntities(state)[routeContentKey];
  });

  // lazy-load entity data on first render
  // dialog 也需加载，用于读取持久化 status/unreadAt 驱动侧边栏未读点。
  useEffect(() => {
    if (
      (type === "agent" || type === "page" ||
       type === "table" || type === "app" || type === "dialog") &&
      routeContentKey &&
      !entity
    ) {
      dispatch(read({ dbKey: routeContentKey, preferredServerOrigin: sourceServerOrigin }));
    }
  }, [type, routeContentKey, entity, sourceServerOrigin, dispatch]);

  // dialog status for unread dot / status badge
  const dialogId = type === "dialog" ? extractCustomId(routeContentKey) : null;
  // Wave B: SSE 实时状态从 module store 读。
  const sseDialogStatus = useDialogStatus(dialogId);
  const sseIsUnread = useIsDialogUnread(dialogId);
  // 持久化来源：dialog 记录实体的 status / unreadAt。覆盖跨 space 与刷新后场景。
  const entityStatusSelector = useMemo(
    () => type === "dialog" ? selectDialogStatusFromEntity(routeContentKey) : null,
    [type, routeContentKey]
  );
  const entityUnreadSelector = useMemo(
    () => type === "dialog" ? selectIsDialogUnreadFromEntity(routeContentKey) : null,
    [type, routeContentKey]
  );
  const entityDialogStatus = useAppSelector((state) =>
    entityStatusSelector ? entityStatusSelector(state) : undefined
  );
  const entityIsUnread = useAppSelector((state) =>
    entityUnreadSelector ? entityUnreadSelector(state) : false
  );
  // SSE 实时优先（当前 space 立即反馈），实体兜底（跨 space / 刷新后持久）。
  const dialogStatus = sseDialogStatus ?? entityDialogStatus;
  const isUnread = sseIsUnread || entityIsUnread;

  // space event status (background/automation) OR live local generation loop.
  // Wave9: controllers live in dialogRuntimeStore — must use the hook to subscribe.
  const liveControllers = useActiveControllers(
    type === "dialog" && routeContentKey ? routeContentKey : "__sidebar_non_dialog__",
  );
  const isLiveGenerating =
    type === "dialog" &&
    !!routeContentKey &&
    Object.keys(liveControllers).length > 0;
  const isRunningDialog =
    type === "dialog" && (dialogStatus === "running" || isLiveGenerating);
  const isDoneDialog =
    type === "dialog" && dialogStatus === "done" && !isLiveGenerating;
  const isFailedDialog =
    type === "dialog" && dialogStatus === "failed" && !isLiveGenerating;
  const showUnreadDot = type === "dialog" && isUnread && !isActive;
  // 终态未读时，用居中状态点替换原数据类型 icon（running 用 spinner，done=蓝点，failed=红点）。
  // 已读恢复原 icon——不渲染此标记。
  const showStatusMark =
    type === "dialog" && isUnread && (isDoneDialog || isFailedDialog);
  const dialogStatusTone = isRunningDialog
    ? "running"
    : isFailedDialog
      ? "failed"
      : isDoneDialog
        ? "done"
        : undefined;

  const Icon = ITEM_ICONS[type as ItemType] ?? LuFile;
  const displayTitle = title;

  // Route target for content Link (enables middle-click new-tab)
  const appRouteKey = type === "app" ? normalizeAppRouteId(contentKey) : null;
  const navLinkTarget = useMemo(() => {
    if (appRouteKey) {
      return buildAppDetailPath(appRouteKey, effectiveSpaceId);
    }
    return buildRoutableContentPath({
      contentKey,
      type,
      userId: currentUserId ?? undefined,
      spaceId: effectiveSpaceId,
    });
  }, [appRouteKey, contentKey, currentUserId, effectiveSpaceId, type]);

  const handleNavLinkClick = useCallback(
    (e: React.MouseEvent) => {
      // In selection mode the row is a selection target, not a navigation
      // link. Prevent the default NavLink navigation and skip the normal
      // recent-visit/mark-read side effects so both pinned and unpinned
      // batch rows behave consistently. Checkbox toggling stays owned by the
      // dedicated checkbox wrapper above.
      if (isSelectionMode) {
        e.preventDefault();
        return;
      }
      if (dialogId) dispatch(markDialogRead({ dialogId, dialogKey: routeContentKey }));
      recordRecentVisit({ key: contentKey, type, title: displayTitle });
    },
    [isSelectionMode, dialogId, dispatch, contentKey, type, displayTitle, routeContentKey]
  );


  const showContextMenu = type !== "app";
  const showMoreMenu = showContextMenu || type === "app";
  const canJoinConversation =
    type === "page" || type === "dialog" || type === "table" ||
    type === "agent" || type === "image" || type === "file";
  const canEditInSpace = Boolean(effectiveSpaceId);
  const canMoveToSpace = type !== "app";
  const showInlineActions = canJoinConversation || showContextMenu || type === "app";
  const isFileOrImage = type === "file" || type === "image";
  const showDownloadAction = isFileOrImage;
  const showSeparatorBeforeDelete = canEditInSpace || canMoveToSpace || isFileOrImage;

  // handlers

  const handleAddToConversation = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const isDialog = type === "dialog";
      const sourceDialogKey = isDialog ? routeContentKey : undefined;
      dispatch(addPendingFile({
        id: nanoid(),
        name: title || contentKey,
        pageKey: routeContentKey,
        dialogKey: sourceDialogKey,
        sourceDialogKey,
        targetDialogKey: dialogKey ?? undefined,
        type: resolvePendingAttachmentType(type as ItemType, fileCategory),
      }));
      toast.success(t("addedToConversation"));
    },
    [dispatch, contentKey, title, type, routeContentKey, dialogKey, fileCategory, t]
  );

  const startEditing = useCallback(() => {
    setIsEditing(true);
    setEditTitle(displayTitle);
  }, [displayTitle]);

  const handleEditSubmit = useCallback(() => {
    setIsEditing(false);
    if (editTitle.trim() && editTitle !== displayTitle) {
      (dispatch as any)((updateContentTitle as any)({
        spaceId: effectiveSpaceId,
        // Space content is keyed by the raw contentKey, not the resolved db/route key.
        contentKey,
        title: editTitle.trim(),
      }));
    }
  }, [editTitle, displayTitle, dispatch, contentKey, effectiveSpaceId]);


  // drag-and-drop handlers
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (disableDrag) {
        e.preventDefault();
        return;
      }
      setIsDragging(true);
      onToggleMenu(null);
      e.dataTransfer.setData("itemId", contentKey);
      e.dataTransfer.setData("sourceContainer", categoryId || "default");
      e.dataTransfer.setData("dragType", "item");
      e.dataTransfer.effectAllowed = "move";
    },
    [disableDrag, contentKey, categoryId, onToggleMenu]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Mouse right-click entry. Keyboard (Shift+F10 / ContextMenu key) does NOT
  // arrive here: focus sits on the ancestor ListBoxItem and its contextmenu
  // event never propagates down into this row, so SidebarVirtualizedList wires
  // that case at the ListBoxItem layer instead.
  // Reuses the same anchor + activeMenuKey channel as the "…" button: parent
  // hosts the RAC Menu outside the ListBox, so we only report the row root as
  // anchor and ask it to open this row's menu. We must NOT mount a MenuTrigger
  // inside the row (would push the submenu tree into the virtualizer collection
  // and crash with "Unsupported node type: submenutrigger" — see
  // SidebarItemMoreMenu.tsx top comment).
  const handleRowContextMenu = useCallback(
    (event: React.MouseEvent) => {
      // While inline-renaming, let the text input keep its native context menu
      // (cut/copy/paste) — don't hijack it.
      if (isEditing) return;
      event.preventDefault();
      event.stopPropagation();
      onMenuAnchorChange?.(contentKey, rowRef.current);
      onToggleMenu(contentKey);
    },
    [isEditing, contentKey, onMenuAnchorChange, onToggleMenu]
  );

  // Clear menu anchor when closed
  React.useEffect(() => {
    if (!isMenuOpen) {
      onMenuAnchorChange?.(contentKey, null);
    }
  }, [isMenuOpen, contentKey, onMenuAnchorChange]);

  // External edit trigger from parent-hosted RAC Menu
  React.useEffect(() => {
    if (editSignal && editSignal > 0) {
      startEditing();
    }
  }, [editSignal, startEditing]);

  // outer div data attributes for CSS styling
  const dataAttrs = {
    "data-active": isActive || undefined,
    "data-editing": isEditing || undefined,
    "data-selection": isSelectionMode || undefined,
    "data-selected": isSelected || undefined,
    "data-dragging": isDragging || undefined,
    "data-open": isMenuOpen || undefined,
    // 供 .SidebarItem:not([data-unread]) 选择已读行，淡化 status-dot。
    "data-unread": showUnreadDot || undefined,
  } as const;

  // Floating controls reveal (union of original CSS conditions):
  //   .SidebarItem:hover / [data-open] / :focus-within  →  hover || isMenuOpen || isFocusWithin
  //   [data-dragging] overrides to hidden                →  !isDragging
  const controlsRevealed = (isHovered || isMenuOpen || isFocusWithin) && !isDragging;

  return (
    <>
      <div
        ref={rowRef}
        {...stylex.props(styles.item, isFlash && styles.flash, isActive && styles.active, isSelected && styles.selected, isDragging && styles.dragging, isMenuOpen && styles.open)}
        {...dataAttrs}
        style={style}
        data-hook="create-space-sidebar-row"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onFocusCapture={() => setIsFocusWithin(true)}
        onBlurCapture={(e) => {
          // focus-within：焦点在行内兄弟元素间转移时保持 true，完全离开行才 false
          // （否则 blur→focus 顺序会让控件闪现隐藏）。
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsFocusWithin(false);
          }
        }}
        onContextMenu={handleRowContextMenu}
      >
        {isSelectionMode ? (
          <button
            type="button"
            {...stylex.props(styles.selection)}
            onClick={() => onSelectItem?.(contentKey)}
            aria-label={isSelected ? "deselect" : "select"}
            aria-pressed={isSelected}
          >
            {isSelected ? (
              <LuSquareCheck
                size={ICON_SIZE}
                {...stylex.props(styles.selectionIcon)}
                aria-hidden="true"
              />
            ) : (
              <LuSquare
                size={ICON_SIZE}
                {...stylex.props(styles.selectionIcon)}
                aria-hidden="true"
              />
            )}
          </button>
        ) : (
          <div
            {...stylex.props(styles.iconWrapper, disableDrag && styles.dragDisabled)}
            data-running={isRunningDialog || undefined}
            data-status={dialogStatusTone}
            data-unread={showUnreadDot || undefined}
            data-drag-disabled={disableDrag || undefined}
            draggable={!disableDrag}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {isRunningDialog ? (
              <LuLoaderCircle
                size={ICON_SIZE}
                {...stylex.props(styles.icon, styles.spinning)}
                aria-hidden="true"
              />
            ) : showStatusMark ? (
              <span
                {...stylex.props(styles.statusMark, dialogStatusTone === "failed" && styles.statusFailed)}
                data-status={dialogStatusTone}
                aria-hidden="true"
              />
            ) : pinned ? (
              <LuPin size={ICON_SIZE} {...stylex.props(styles.icon, isActive && styles.iconActive)} aria-hidden="true" />
            ) : type === "agent" && entity ? (
              <AgentAvatar
                agent={entity}
                size={ICON_SIZE}
                avatarSize="small"
                {...stylex.props(styles.avatar)}
              />
            ) : entity?.icon ? (
              <ContentIcon
                icon={entity.icon}
                fallback={Icon}
                size={ICON_SIZE}
                {...stylex.props(styles.icon, isActive && styles.iconActive)}
              />
            ) : (
              <Icon size={ICON_SIZE} {...stylex.props(styles.icon, isActive && styles.iconActive)} aria-hidden="true" />
            )}
            {showUnreadDot && !showStatusMark && <span {...stylex.props(styles.unreadDot)} aria-hidden="true" />}
            <div {...stylex.props(styles.dragHandle, controlsRevealed && !disableDrag ? styles.dragVisible : styles.dragHidden)} aria-hidden="true">
              <LuGripVertical size={14} aria-hidden="true" />
            </div>
          </div>
        )}

        {isEditing ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <InlineEditInput
              inputRef={inputRef}
              className="create-space-sidebar-inline-edit-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={(e) => {
                // Inline-edit keyboard events belong to the editor, not the
                // enclosing RAC ListBoxItem. Without stopping propagation, F2
                // bubbles up and re-triggers onItemRename → editSignal →
                // startEditing, which resets editTitle to displayTitle and
                // discards unsaved edits; Enter/Space/arrows also leak into
                // RAC collection activation/navigation. Enter submit and
                // Escape cancel still run below before the event continues.
                e.stopPropagation();
                if (e.key === "Enter") { e.preventDefault(); handleEditSubmit(); }
                else if (e.key === "Escape") { e.preventDefault(); setIsEditing(false); }
              }}
            />
          </div>
        ) : (
          <NavLink
            to={navLinkTarget}
            {...stylex.props(styles.link, controlsRevealed && styles.linkActions)}
            draggable={false}
            onClick={handleNavLinkClick}
          >
            {childCount ? (
              <button
                type="button"
                {...stylex.props(styles.childToggle)}
                aria-label={isChildCollapsed ? "展开子对话" : "折叠子对话"}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleChildCollapse?.();
                }}
                aria-expanded={!isChildCollapsed}
              >
                {isChildCollapsed ? (
                  <LuChevronRight size={12} aria-hidden="true" />
                ) : (
                  <LuChevronDown size={12} aria-hidden="true" />
                )}
                <span {...stylex.props(styles.childCount)}>{childCount}</span>
              </button>
            ) : null}
            <span
              {...stylex.props(styles.title, isActive && styles.titleActive)}
              data-status={dialogStatusTone}
              title={displayTitle}
              style={isChildRow ? { paddingLeft: 8 } : undefined}
            >
              {displayTitle}
            </span>
          </NavLink>
        )}

        {!isEditing && !isSelectionMode && showInlineActions && (
          <div
            {...stylex.props(styles.actions, controlsRevealed && styles.actionsVisible, isDragging && styles.actionsDragging)}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {canJoinConversation && (
              <IconButton
                onClick={handleAddToConversation}
                icon={LuPlus}
                label={t("joinConversation")}
                title={t("joinConversation")}
              />
            )}
            {showContextMenu && (
              <DeleteContentButton
                contentKey={contentKey}
                title={displayTitle}
                spaceIdOverride={effectiveSpaceId}
                sourceServerOrigin={sourceServerOrigin}
                className={stylex.props(styles.actionButton).className}
                aria-label={t("common:delete")}
                htmlTitle={t("common:delete")}
              />
            )}
            {showMoreMenu && (
              <IconButton
                buttonRef={(el) => {
                  menuButtonRef.current = el;
                  if (isMenuOpen) {
                    onMenuAnchorChange?.(contentKey, el);
                  }
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  const nextOpen = !isMenuOpen;
                  if (nextOpen) {
                    onMenuAnchorChange?.(contentKey, menuButtonRef.current);
                  } else {
                    onMenuAnchorChange?.(contentKey, null);
                  }
                  onToggleMenu(nextOpen ? contentKey : null);
                }}
                icon={LuEllipsis}
                label={t("moreActions")}
                title={t("moreActions")}
                aria-expanded={isMenuOpen}
                aria-haspopup="menu"
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default React.memo(SidebarItemRow);
