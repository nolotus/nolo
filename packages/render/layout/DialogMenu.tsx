// 文件: packages/render/layout/DialogMenu.tsx
//
// 对话顶栏菜单：标题 + 标准 Popover「更多」动作菜单。
// 弹层统一走全站标准的 render/web/ui/Popover + Menu（react-aria-components），
// 不再使用自建 portal / 手动定位 / 独立的 MobileMenu 组件；定位、点击外部关闭、
// Escape、滚动重定位都由标准 Popover 接管。

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
  buildDialogDiagnosticsText,
} from "chat/dialog/dialogDiagnostics";
import {
  selectCopyDiagnosticsEnabled,
  selectCurrentServer,
} from "app/settings/settingSlice";
import { selectCurrentSpaceId } from "create/space/spaceSlice";

const ICON_SIZE = 16 as const;

// --- Main Component ---
const DialogMenu = ({
  currentDialog,
  showShareButton = false,
  canDelete = false,
  showFavorite = false,
  onShareCommunity,
  onSharePrivate,
  onDelete,
}: {
  currentDialog: any;
  showShareButton?: boolean;
  canDelete?: boolean;
  showFavorite?: boolean;
  onShareCommunity?: () => void;
  onSharePrivate?: () => void;
  onDelete?: () => void;
}) => {
  const { t } = useTranslation(["common", "chat"]);
  const currentServer = useAppSelector(selectCurrentServer);
  const currentSpaceId = useAppSelector(selectCurrentSpaceId);
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
    const diagnostics = buildDialogDiagnosticsText({
      dialog: currentDialog,
      currentServer,
      currentSpaceId,
      route: buildCurrentRouteDiagnostics(),
    });

    copyToClipboard(diagnostics, {
      onSuccess: () => toast.success(t("chat:copySuccess", "复制成功")),
      onError: () => toast.error(t("chat:copyFailed", "复制失败")),
    });
  }, [currentDialog, currentServer, currentSpaceId, t]);

  const handleMenuAction = useCallback(
    (key: Key) => {
      if (key === "favorite") {
        toggleFavorite();
      } else if (key === "share-community") {
        onShareCommunity?.();
      } else if (key === "share-private") {
        onSharePrivate?.();
      } else if (key === "copy-diagnostics") {
        handleCopyDiagnostics();
      } else if (key === "delete") {
        onDelete?.();
      }
    },
    [
      onShareCommunity,
      onSharePrivate,
      onDelete,
      handleCopyDiagnostics,
      toggleFavorite,
    ],
  );

  return (
    <div className="dialog-menu">
      <div className="dialog-menu__header">
        <div className="dialog-menu__title-row">
          <h1 className="dialog-menu__title" title={currentDialog.title}>
            {titleWithSymbol}
          </h1>
          <AriaMenuTrigger
            isOpen={isActionMenuOpen}
            onOpenChange={setIsActionMenuOpen}
          >
            <RacButton
              className={`topbar__button ${isActionMenuOpen ? "is-active" : ""}`}
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
                  <>
                    <MenuItem
                      id="share-community"
                      textValue={t("publishCommunity", "社区分享")}
                    >
                      <LuUsers size={ICON_SIZE} aria-hidden="true" />
                      <span slot="label">{t("publishCommunity", "社区分享")}</span>
                    </MenuItem>
                    <MenuItem
                      id="share-private"
                      textValue={t("shareCurrent", "私人分享")}
                    >
                      <LuLink size={ICON_SIZE} aria-hidden="true" />
                      <span slot="label">{t("shareCurrent", "私人分享")}</span>
                    </MenuItem>
                  </>
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
