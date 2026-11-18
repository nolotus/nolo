// 文件: packages/render/layout/DialogMenu.tsx
//
// 对话顶栏菜单：标题 + 标准 Popover「更多」动作菜单。
// 弹层统一走全站标准的 render/web/ui/Popover + Menu（react-aria-components），
// 不再使用自建 portal / 手动定位 / 独立的 MobileMenu 组件；定位、点击外部关闭、
// Escape、滚动重定位都由标准 Popover 接管。

import { useStore } from "react-redux";
import { selectAllMsgs } from "../../chat/messages/messageSlice";
import { extractCustomId } from "core/prefix";
import React, { useState, useCallback } from "react";
import {
  MenuTrigger as AriaMenuTrigger,
  Button as RacButton,
  type Key,
} from "react-aria-components";
import { useTranslation } from "react-i18next";
import {
  LuClipboard,
  LuEllipsis,
  LuLink,
  LuShare2,
  LuStar,
  LuTrash2,
  LuUsers,
} from "react-icons/lu";
import { Popover } from "render/web/ui/Popover";
import { Menu, MenuItem, Separator } from "render/web/ui/Menu";
import { toast } from "app/utils/toast";
import copyToClipboard from "app/utils/clipboard";
import { useAppSelector } from "app/store";
import { useContentFavorite } from "app/favorite/useContentFavorite";
import {
  buildCurrentRouteDiagnostics,
  latestDialogFailure,
  buildDialogDiagnosticsText,
} from "../../chat/dialog/dialogDiagnostics";
import {
  selectCopyDiagnosticsEnabled,
  selectCurrentServer,
} from "app/settings/settingSlice";
import { useCurrentSpaceId } from "create/space/spaceCurrentStore";

const ICON_SIZE = 16 as const;

// --- Main Component ---
// variant 实际只有 "actions"（对话页右上角悬浮菜单）在跑：对象头部的
// dialog 分支已改由 DialogPage 直接渲染，ContentActionBar 对 dialog/page
// 提前 return。保留 "full" 是因为它仍是这个组件的完整形态实现，删掉会把
// 标题行/动作菜单的耦合重新拆散；将来若要复用，直接传 variant="full"。
const DialogMenu = ({
  currentDialog,
  variant = "full",
  showShareButton = false,
  canDelete = false,
  showFavorite = false,
  onShare,
  onDelete,
}: {
  currentDialog: any;
  /** "actions"：只渲染「⋯」动作菜单（对话页右上角悬浮用），不渲染标题行。 */
  variant?: "full" | "actions";
  showShareButton?: boolean;
  canDelete?: boolean;
  showFavorite?: boolean;
  onShare?: () => void;
  onDelete?: () => void;
}) => {
  const { t } = useTranslation(["common", "chat"]);
  const store = useStore();
  const currentServer = useAppSelector(selectCurrentServer);
  const currentSpaceId = useCurrentSpaceId();
  const showCopyDiagnostics = useAppSelector(selectCopyDiagnosticsEnabled);
  const [isActionMenuOpen, setIsActionMenuOpen] = useState(false);
  const { isFavorited, toggleFavorite } = useContentFavorite(
    currentDialog?.dbKey || "",
  );

  const rawTitle = currentDialog.title || "";
  const dateMatch = rawTitle.match(/(.*?)\s+(\d{2}-\d{2}\s\d{2}:\d{2})$/);
  const titleWithSymbol: React.ReactNode = dateMatch ? (
    <>
      <span style={{ fontWeight: 600, color: "var(--text)" }}>{dateMatch[1]}</span>
      <span style={{ fontWeight: 400, color: "var(--textTertiary)", marginLeft: "6px" }}>{dateMatch[2]}</span>
    </>
  ) : (
    rawTitle
  );
  const participantCount = Array.isArray(currentDialog?.cybots)
    ? currentDialog.cybots.length
    : 0;
  const subtitle = participantCount > 1
    ? t("chat:collaborativeConversation", "协作会话")
    : null;

  const handleCopyDiagnostics = useCallback(() => {
    const dialogId = currentDialog?.id || (currentDialog?.dbKey ? extractCustomId(currentDialog.dbKey) : undefined);
    const latestError = dialogId
      ? latestDialogFailure(selectAllMsgs(store.getState(), dialogId), dialogId)
      : undefined;
    const diagnostics = buildDialogDiagnosticsText({
      latestError,
      dialog: currentDialog,
      currentServer,
      currentSpaceId,
      route: buildCurrentRouteDiagnostics(),
    });

    copyToClipboard(diagnostics, {
      onSuccess: () => toast.success(t("chat:copySuccess", "复制成功")),
      onError: () => toast.error(t("chat:copyFailed", "复制失败")),
    });
  }, [currentDialog, currentServer, currentSpaceId, store, t]);

  const handleMenuAction = useCallback(
    (key: Key) => {
      if (key === "favorite") {
        toggleFavorite();
      } else if (key === "share") {
        onShare?.();
      } else if (key === "copy-diagnostics") {
        handleCopyDiagnostics();
      } else if (key === "delete") {
        onDelete?.();
      }
    },
    [
      onShare,
      onDelete,
      handleCopyDiagnostics,
      toggleFavorite,
    ],
  );

  const actionMenu = (
<AriaMenuTrigger
    isOpen={isActionMenuOpen}
    onOpenChange={setIsActionMenuOpen}
  >
    <RacButton
      className={`topbar__button topbar__button--dialog-actions ${isActionMenuOpen ? "is-active" : ""}`}
      aria-label={t("more", "更多")}
    >
      <LuEllipsis size={ICON_SIZE} aria-hidden="true" />
    </RacButton>
    <Popover
      className="app-menu-popover dialog-menu-popover"
      placement="bottom end"
      hideArrow
      offset={8}
    >
      <Menu onAction={handleMenuAction} aria-label={t("more", "更多")}>
        {showFavorite && (
          <MenuItem
            id="favorite"
            textValue={
              isFavorited
                ? t("unfavoriteContent", "取消收藏")
                : t("favoriteContent", "收藏")
            }
          >
            <LuStar
              size={ICON_SIZE}
              style={{ fill: isFavorited ? "currentColor" : "none" }}
              aria-hidden="true"
            />
            <span slot="label">
              {isFavorited
                ? t("unfavoriteContent", "取消收藏")
                : t("favoriteContent", "收藏")}
            </span>
          </MenuItem>
        )}
        {showShareButton && (
          <MenuItem
            id="share"
            textValue={t("share", "分享")}
          >
            <LuShare2 size={ICON_SIZE} aria-hidden="true" />
            <span slot="label">{t("share", "分享")}</span>
          </MenuItem>
        )}
        {showCopyDiagnostics && (
          <MenuItem
            id="copy-diagnostics"
            textValue={t("chat:copyDiagnostics", "复制诊断信息")}
          >
            <LuClipboard size={ICON_SIZE} aria-hidden="true" />
            <span slot="label">
              {t("chat:copyDiagnostics", "复制诊断信息")}
            </span>
          </MenuItem>
        )}
        {canDelete && (
          <>
            {(showShareButton || showCopyDiagnostics) && <Separator />}
            <MenuItem
              id="delete"
              className="dialog-menu__action-item--danger"
              textValue={t("delete", "删除")}
            >
              <LuTrash2 size={ICON_SIZE} aria-hidden="true" />
              <span slot="label">{t("delete", "删除")}</span>
            </MenuItem>
          </>
        )}
      </Menu>
    </Popover>
  </AriaMenuTrigger>
  );

  if (variant === "actions") {
    return <div className="dialog-menu__actions-only">{actionMenu}</div>;
  }

  return (
    <div className="dialog-menu">
      <div className="dialog-menu__header">
        <div className="dialog-menu__title-row">
          <h1 className="dialog-menu__title" title={currentDialog.title}>
            {titleWithSymbol}
          </h1>
          {actionMenu}
        </div>
        {subtitle && (
          <div className="dialog-menu__subtitle" title={subtitle}>
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

export default DialogMenu;
