import React, { Suspense, lazy } from "react";
import { createPortal } from "react-dom";
import {
  LuMessageCircle,
  LuEllipsis,
  LuHistory,
  LuStar,
  LuShare2,
  LuTrash2,
  LuInfo,
} from "react-icons/lu";

import { zIndex } from "render/styles/zIndex";
import { Tooltip } from "render/web/ui/Tooltip";
import Button from "render/web/ui/Button";
import ModeToggle from "render/web/ui/ModeToggle";
import type { useTopBarState } from "./useTopBarState.tsx";
import TopbarAppSlot from "./TopbarAppSlot";
import TopbarTableSlot from "./TopbarTableSlot";
import { TableTopbarOverflowContent } from "./TableTopbarOverflowContent";
import TopbarLocalPreviewToggle from "./TopbarLocalPreviewToggle";

// Route-conditional chrome stays lazy.
const DialogMenu = lazy(() => import("./DialogMenu"));
const ShareModal = lazy(() => import("render/web/ui/modal/ShareModal"));

/** useTopBarState 返回的完整状态：对象动作的唯一状态真值。 */
export type TopBarState = ReturnType<typeof useTopBarState>;

export type ContentActionBarProps = {
  /** useTopBarState 的返回值；本组件不复制任何状态逻辑，只做渲染。 */
  state: TopBarState;
};

const ContentActionBar: React.FC<ContentActionBarProps> = ({
  state: s,
}) => {
  const t = s.t;
  const isAgentTopbarContent = s.contentKeyType === "agent";
  // Content routes that may gain overflow actions after entity load — reserve
  // a 32px slot so the right section does not shift when the button appears.
  const reserveOverflowSlot =
    s.isLoggedIn &&
    ["page", "meta", "image", "file", "agent", "dialog"].includes(
      s.contentKeyType,
    ) &&
    !(s.contentKeyType === "dialog" && s.currentDialog);
  const showTopbarOverflowMenu =
    s.hasMobileOverflowActions && reserveOverflowSlot;

  const topbarOverflowMenu = showTopbarOverflowMenu ? (
    <div className="topbar__action-slot topbar__mobile-more" ref={s.mobileOverflowRef}>
      <button
        ref={s.mobileOverflowButtonRef}
        type="button"
        className={`topbar__button topbar__button--more ${s.isMobileOverflowOpen ? "is-active" : ""}`}
        onClick={() => {
          if (!s.isMobileOverflowOpen && s.mobileOverflowButtonRef.current) {
            const rect = s.mobileOverflowButtonRef.current.getBoundingClientRect();
            // Keep the overflow menu on a fixed body-level layer. This menu
            // used to render inside the topbar and got clipped by ancestor
            // overflow, which made "more" look broken even though state opened.
            s.setMobileOverflowPanelStyle({
              position: "fixed",
              top: rect.bottom + 8,
              right: Math.max(8, window.innerWidth - rect.right),
              zIndex: zIndex.dropdown ?? 1000,
            });
          }
          s.setIsMobileOverflowOpen(!s.isMobileOverflowOpen);
        }}
        aria-label={t("more", "更多")}
        aria-expanded={s.isMobileOverflowOpen}
        aria-haspopup="menu"
      >
        <LuEllipsis size={16} aria-hidden="true" />
      </button>

      {s.isMobileOverflowOpen &&
        typeof document !== "undefined" &&
        // Intentionally portaled: do not move back into the topbar subtree
        // without re-auditing all ancestor overflow/stacking behavior.
        createPortal(
          <div
            ref={s.mobileOverflowPanelRef}
            className="topbar__more-panel"
            style={s.mobileOverflowPanelStyle}
            role="menu"
            aria-label={t("more", "更多")}
          >
            {s.canEditPageContent && s.pageKey && (
              <button
                type="button"
                className="topbar__more-item"
                onClick={() => {
                  s.setIsMobileOverflowOpen(false);
                  s.setShowVersionPanel(true);
                }}
                role="menuitem"
              >
                <LuHistory size={16} aria-hidden="true" />
                <span>{t("version.history", { defaultValue: "版本历史" })}</span>
              </button>
            )}

            {s.showFavoriteButton && (
              <button
                type="button"
                className={`topbar__more-item ${s.isFavorited ? "is-active" : ""}`}
                onClick={(event) => {
                  s.setIsMobileOverflowOpen(false);
                  void s.toggleFavoriteOnPage(event);
                }}
                role="menuitem"
              >
                <LuStar
                  size={16}
                  style={{
                    fill: s.isFavorited ? "currentColor" : "none",
                  }}
                  aria-hidden="true"
                />
                <span>
                  {s.isFavorited
                    ? t("unfavoriteContent", "取消收藏")
                    : t("favoriteContent", "收藏")}
                </span>
              </button>
            )}

            {s.showTableShareInOverflow ? (
              <TableTopbarOverflowContent
                shareStatusText={s.tableShareActions.shareStatusText}
                shareWarningText={s.tableShareActions.shareWarningText}
                isPublishingShare={s.tableShareActions.isPublishingShare}
                canPublishCommunityShare={s.tableShareActions.canPublishCommunityShare}
                isCommunityShared={!!s.tableShareActions.tableShareState?.isCommunityShared}
                onPublishCommunity={() => {
                  s.setIsMobileOverflowOpen(false);
                  void s.tableShareActions.handleCommunityShare();
                }}
              />
            ) : null}

            {s.showShareButton && (
              <button
                type="button"
                className="topbar__more-item"
                onClick={() => {
                  s.setIsMobileOverflowOpen(false);
                  void s.handleOpenShare();
                }}
                role="menuitem"
              >
                <LuShare2 size={16} aria-hidden="true" />
                <span>{t("share", "分享")}</span>
              </button>
            )}

            {s.deleteContext && s.deleteKey && (
              <>
                {(s.canEditPageContent || s.showFavoriteButton || s.showTableShareInOverflow || s.showShareButton) && (
                  <div className="topbar__more-divider" />
                )}
                <button
                  type="button"
                  className="topbar__more-item topbar__more-item--danger"
                  onClick={s.handleOpenDeleteConfirm}
                  role="menuitem"
                  aria-label={t("delete")}
                >
                  <LuTrash2 size={16} aria-hidden="true" />
                  <span>{t("delete")}</span>
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </div>
  ) : reserveOverflowSlot ? (
    <div
      className="topbar__action-slot topbar__action-slot--empty"
      aria-hidden="true"
    />
  ) : null;

  const editActions = (
    <>
      {s.showPageEditActions && (
        <div className="topbar__actions">
          <ModeToggle
            isEdit={!s.readOnly}
            onChange={s.handleToggleEdit}
          />
          <Button
            className="topbar__save-button"
            variant="primary"
            onClick={s.handleSave}
            size="small"
            disabled={s.readOnly || s.saving || !s.pending}
            loading={s.saving}
          >
            {s.saving ? t("saving") : t("save")}
          </Button>
        </div>
      )}
    </>
  );

  const centerContent = (
    <>
    {/* page 类型：编辑 + 保存 */}
    {editActions}

    {/* dialog 顶部信息 — skeleton holds height while config arrives */}
    {s.contentKeyType === "dialog" && (
      <div className="topbar__dialog-slot">
        {s.currentDialog ? (
          <DialogMenu
            currentDialog={s.currentDialog}
            showShareButton={s.showShareButton}
            canDelete={!!(s.deleteContext && s.deleteKey)}
            showFavorite={s.showContentFavoriteButton}
            onShare={s.handleOpenShare}
            onDelete={s.handleOpenDeleteConfirm}
          />
        ) : (
          <div
            className="topbar__dialog-skeleton"
            aria-hidden="true"
            data-testid="topbar-dialog-skeleton"
          >
            <span className="topbar__dialog-skeleton-line topbar__dialog-skeleton-line--title" />
            <span className="topbar__dialog-skeleton-line topbar__dialog-skeleton-line--sub" />
          </div>
        )}
      </div>
    )}

    {/* app 工作台信息槽 */}
    {s.contentKeyType === "app" && (
      <TopbarAppSlot
        app={s.appDetail}
        refetchApp={s.refetchApp}
        isAppEditMode={s.isAppEditMode}
        appEditorUrl={s.appEditorUrl}
        appPrimaryUrl={s.appPrimaryUrl}
        onShowVersionPanel={() => s.setShowVersionPanel(true)}
        onDelete={s.handleDeleteApp}
        onShare={s.handleOpenShare}
      />
    )}

    {/* 表格专属工作台标题槽 */}
    {s.contentKeyType === "meta" && s.tableMeta && (
      <TopbarTableSlot
        tableMeta={s.tableMeta}
        canEdit={s.canEditCurrentContent ?? true}
      />
    )}


    {s.isFileContent && s.pageKey && (
      <Tooltip
        content={
          s.isFileDetailsOpen
            ? t("hideFileDetails", "隐藏文件详情")
            : t("showFileDetails", "查看文件详情")
        }
        placement="bottom"
      >
        <button
          type="button"
          className={`topbar__button topbar__button--fileinfo ${s.isFileDetailsOpen ? "is-active" : ""}`}
          onClick={s.handleToggleFileDetails}
          aria-label={
            s.isFileDetailsOpen
              ? t("hideFileDetails", "隐藏文件详情")
              : t("showFileDetails", "查看文件详情")
          }
        >
          <LuInfo size={16} aria-hidden="true" />
        </button>
      </Tooltip>
    )}
    </>
  );

  const objectActions = (
    <>
  {s.showObjectAssistantAction && (
    <div className="topbar__action-slot">
      <Tooltip
        content={
          s.isObjectAssistantOpen
            ? s.objectAssistantLabels.hide
            : s.objectAssistantLabels.open
        }
        placement="bottom"
      >
        <button
          type="button"
          className={`topbar__button topbar__button--sidechat ${s.isObjectAssistantOpen ? "is-active" : ""}`}
          onClick={s.handleToggleObjectAssistant}
          aria-label={
            s.isObjectAssistantOpen
              ? s.objectAssistantLabels.hide
              : s.objectAssistantLabels.open
          }
        >
          <LuMessageCircle size={16} aria-hidden="true" />
        </button>
      </Tooltip>
    </div>
  )}

  {!isAgentTopbarContent && topbarOverflowMenu}
    </>
  );

  const shareModal = (
    <>
      {s.isShareModalOpen && (
      <Suspense fallback={null}>
        <ShareModal
          isOpen={s.isShareModalOpen}
          onClose={() => s.setIsShareModalOpen(false)}
          webLink={s.shareModalLink}
          isLoading={s.isShareModalLoading}
          isCommunity={s.shareModalVisibility === "community"}
          initialCopied={s.shareModalCopied}
          onPublishCommunity={s.handlePublishCommunity}
          errorMessage={s.shareError}
          onRetry={s.handleOpenShare}
          itemType={s.contentKeyType === "dialog" ? "dialog" : "page"}
        />
      </Suspense>
    )}
    </>
  );

  // 内容区页面头部没有对象动作时不渲染空条。
  const showsCenterContent =
    s.showPageEditActions ||
    s.contentKeyType === "dialog" ||
    s.contentKeyType === "app" ||
    (s.contentKeyType === "meta" && !!s.tableMeta) ||
    (s.isFileContent && !!s.pageKey);
  const showsObjectActions =
    s.showObjectAssistantAction || reserveOverflowSlot;

  if (!showsCenterContent && !showsObjectActions) return null;



  return (
    <>
      <Suspense fallback={null}>{centerContent}</Suspense>
      {objectActions}
      <TopbarLocalPreviewToggle contentKeyType={s.contentKeyType} />
      {shareModal}
    </>
  );
};

ContentActionBar.displayName = "ContentActionBar";

export default ContentActionBar;
