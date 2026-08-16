import React, { Suspense, lazy, memo, useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { NavLink, useLocation, useNavigate, useNavigationType } from "app/routing";
import {
  LuChevronLeft,
  LuChevronRight,
  LuLogIn,
  LuHouse,
  LuMessageCircle,
  LuPanelLeftOpen,
  LuPanelLeftClose,
  LuInfo,
  LuStar,
  LuLink,
  LuUsers,
  LuEllipsis,
  LuHistory,
  LuTrash2,
  LuBadgeDollarSign,
  LuDownload,
} from "react-icons/lu";

import { AppRoutePaths } from "app/constants/routePaths";
import { zIndex } from "render/styles/zIndex";
import { Tooltip } from "render/web/ui/Tooltip";
import Button from "render/web/ui/Button";
import ModeToggle from "render/web/ui/ModeToggle";
import Kbd from "render/web/ui/Kbd";
import { VersionHistoryPanel } from "create/version/VersionHistoryPanel";
import { TopBarProps } from "./topbarUtils";
import { useTopBarState } from "./useTopBarState.tsx";
import { getRouteDescriptor } from "./mainLayoutViewMode";
import TopbarAppSlot from "./TopbarAppSlot";
import { TableTopbarOverflowContent } from "./TableTopbarOverflowContent";
import LanguageSwitcher from "render/web/ui/LanguageSwitcher";
import NavListItem from "render/layout/blocks/NavListItem";
import TopbarNotificationBell from "./TopbarNotificationBell";
import TopbarUserMenu from "./TopbarUserMenu";
import { DevReloadBadge } from "./DevReloadBadge";
import CreateMenuButton from "./CreateMenuButtonContainer";
import TopbarLocalPreviewToggle from "./TopbarLocalPreviewToggle";
import "./layout.css";

// Heavy / route-conditional chrome stays lazy. Auth-right chrome is eager so
// post-deploy pages do not sit on an empty Suspense + second chunk round-trip
// after the main bundle finally hydrates (that was the long top-right wait).
const DialogMenu = lazy(() => import("./DialogMenu"));
const TopbarSpaceSwitcher = lazy(() => import("./TopbarSpaceSwitcher"));

const getCurrentBrowserHistoryIndex = () => {
  if (typeof window === "undefined") return null;
  const state = window.history.state as { idx?: unknown } | null;
  return typeof state?.idx === "number" ? state.idx : null;
};

const TopBar: React.FC<TopBarProps> = ({ toggleSidebar, isSidebarOpen }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const s = useTopBarState(toggleSidebar);
  const isLeftSidebarOpen = isSidebarOpen ?? s.isSidebarOpen;
  const sidebarToggleLabel = isLeftSidebarOpen
    ? t("collapseSidebar", "收起侧边栏")
    : t("expandSidebar", "展开侧边栏");
  // Space switcher is rendered in the left sidebar for space-bound pages.
  // Global/discovery pages (like /explore, /share/community, /profile, /recharge)
  // are not space-bound, so they don't need a space switcher.
  // Under the folded-sidebar state on space-bound pages, we also hide it from the topbar
  // per the user request ("折叠之后不需要显示选择空间切换器"), so we disable it entirely in the TopBar.
  const showTopbarSpaceSwitcher = false;
  const isDesktopShell = useMemo(
    () =>
      typeof document !== "undefined" &&
      document.documentElement.dataset.noloDesktop === "1",
    []
  );
  const desktopTitlebarMode = useMemo(
    () =>
      typeof document !== "undefined"
        ? document.documentElement.dataset.noloDesktopTitlebar
        : undefined,
    []
  );
  const showTopbarHistoryControls =
    isDesktopShell && desktopTitlebarMode === "native";
  const showDesktopTitlebarNavigation = !isDesktopShell;
  // Always fixed in the topbar so every route (life, recharge, no-sidebar) can go home.
  const showTopbarHome = true;
  const currentHistoryIndex = useMemo(
    () => getCurrentBrowserHistoryIndex(),
    [location.key]
  );
  const [maxHistoryIndex, setMaxHistoryIndex] = useState(
    () => currentHistoryIndex ?? 0
  );
  const descriptor = useMemo(
    () => getRouteDescriptor(location.pathname),
    [location.pathname]
  );
  const canGoBack = currentHistoryIndex !== null && currentHistoryIndex > 0;
  const canGoForward =
    currentHistoryIndex !== null && currentHistoryIndex < maxHistoryIndex;

  useEffect(() => {
    const nextIndex = getCurrentBrowserHistoryIndex();
    if (nextIndex === null) {
      setMaxHistoryIndex(0);
      return;
    }
    setMaxHistoryIndex((previousIndex) =>
      navigationType === "PUSH"
        ? nextIndex
        : Math.max(previousIndex, nextIndex)
    );
  }, [location.key, navigationType]);

  const handleNavigateBack = useCallback(() => {
    if (canGoBack) {
      navigate(-1);
    }
  }, [canGoBack, navigate]);

  const handleNavigateForward = useCallback(() => {
    if (canGoForward) {
      navigate(1);
    }
  }, [canGoForward, navigate]);

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
              <>
                <button
                  type="button"
                  className="topbar__more-item"
                  onClick={() => {
                    s.setIsMobileOverflowOpen(false);
                    void s.handleShare("community");
                  }}
                  role="menuitem"
                >
                  <LuUsers size={16} aria-hidden="true" />
                  <span>{t("publishCommunity", "社区分享")}</span>
                </button>

                <button
                  type="button"
                  className="topbar__more-item"
                  onClick={() => {
                    s.setIsMobileOverflowOpen(false);
                    void s.handleShare("private");
                  }}
                  role="menuitem"
                >
                  <LuLink size={16} aria-hidden="true" />
                  <span>{t("shareCurrent", "私人分享")}</span>
                </button>
              </>
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

  return (
    <>
      <div className={`topbar ${s.isScrolled ? "topbar--scrolled" : ""}`}>
        {/* 左侧：侧边栏开关 + Home */}
        <div className="topbar__section topbar__section--left">
          {toggleSidebar && (
            <Tooltip
              content={
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span>{sidebarToggleLabel}</span>
                  <Kbd shortcut="mod+b" />
                </div>
              }
              placement="bottom"
            >
              <button
                className="topbar__button topbar__button--sidebar"
                onClick={s.handleToggleSidebar}
                aria-label={sidebarToggleLabel}
                aria-pressed={isLeftSidebarOpen}
                type="button"
              >
                {isLeftSidebarOpen ? (
                  <LuPanelLeftClose size={16} aria-hidden="true" />
                ) : (
                  <LuPanelLeftOpen size={16} aria-hidden="true" />
                )}
              </button>
            </Tooltip>
          )}

          {showTopbarHistoryControls && (
            <div
              className="topbar__history-group topbar__history-group--desktop-chrome"
              aria-label={t("navigation", "导航")}
            >
              <Tooltip content={t("back", "后退")} placement="bottom">
                <button
                  type="button"
                  className="topbar__history-btn"
                  onClick={handleNavigateBack}
                  disabled={!canGoBack}
                  aria-label={t("back", "后退")}
                >
                  <LuChevronLeft size={28} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </Tooltip>
              <Tooltip content={t("forward", "前进")} placement="bottom">
                <button
                  type="button"
                  className="topbar__history-btn"
                  onClick={handleNavigateForward}
                  disabled={!canGoForward}
                  aria-label={t("forward", "前进")}
                >
                  <LuChevronRight size={28} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          )}

          {showTopbarHome && (
            <span className="TopBar__home-slot">
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `TopBar__home ${isActive ? "is-active" : ""}`
                }
                title={t("home", "首页")}
                aria-label={t("home", "首页")}
              >
                <LuHouse size={17} strokeWidth={2.35} aria-hidden="true" />
              </NavLink>
              <DevReloadBadge />
            </span>
          )}

          {showDesktopTitlebarNavigation && showTopbarSpaceSwitcher && (
            <Suspense fallback={null}>
              <TopbarSpaceSwitcher />
            </Suspense>
          )}
        </div>

        {/* 中间 */}
        <div className="topbar__center">
          {s.hasMounted &&
            descriptor.topbarMode !== "content" &&
            !s.showPageEditActions &&
            s.contentKeyType !== "dialog" &&
            s.contentKeyType !== "app" &&
            !isDesktopShell &&
            !s.isLoggedIn && (
              <div className="topbar__nav-group" aria-label={t("common.actions", "常用入口")}>
                <NavLink
                  to="/pricing"
                  className={({ isActive }) =>
                    `topbar__nav-link ${isActive ? "is-active" : ""}`
                  }
                >
                  <LuBadgeDollarSign className="topbar__nav-icon" size={15} aria-hidden="true" />
                  {t("topbar.pricing", "价格")}
                </NavLink>
                <NavLink
                  to={AppRoutePaths.CLIENT_DOWNLOADS}
                  className={({ isActive }) =>
                    `topbar__nav-link topbar__nav-link--download-cta ${isActive ? "is-active" : ""}`
                  }
                >
                  <LuDownload className="topbar__nav-icon" size={15} aria-hidden="true" />
                  {t("downloadClient", "下载客户端")}
                </NavLink>
              </div>
            )}
          <Suspense fallback={null}>
            {/* page 类型：编辑 + 保存 */}
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

            {/* dialog 顶部信息 — skeleton holds height while config arrives */}
            {s.contentKeyType === "dialog" && (
              <div className="topbar__dialog-slot">
                {s.currentDialog ? (
                  <DialogMenu
                    currentDialog={s.currentDialog}
                    showShareButton={s.showShareButton}
                    canDelete={!!(s.deleteContext && s.deleteKey)}
                    showFavorite={s.showContentFavoriteButton}
                    onShareCommunity={() => {
                      void s.handleShare("community");
                    }}
                    onSharePrivate={() => {
                      void s.handleShare("private");
                    }}
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
          </Suspense>
        </div>

        {/* 右侧 */}
        <div className="topbar__section topbar__section--right">
          {s.showSideChatButton && (
            <div className="topbar__action-slot">
              <Tooltip
                content={
                  s.isRightChatOpen
                    ? s.sideChatLabels.hide
                    : s.sideChatLabels.open
                }
                placement="bottom"
              >
                <button
                  type="button"
                  className={`topbar__button topbar__button--sidechat ${s.isRightChatOpen ? "is-active" : ""}`}
                  onClick={s.handleTogglePageAssistant}
                  aria-label={
                    s.isRightChatOpen
                      ? s.sideChatLabels.hide
                      : s.sideChatLabels.open
                  }
                >
                  <LuMessageCircle size={16} aria-hidden="true" />
                </button>
              </Tooltip>
            </div>
          )}

          {!isAgentTopbarContent && topbarOverflowMenu}

          {/*
            Guest login is available immediately (no hasMounted gate).
            Logged-in chrome still needs client mount for menu state, but is
            no longer behind lazy chunks — only a short mount placeholder.
          */}
          {!s.hasMounted && s.isLoggedIn ? (
            <div
              className="topbar__auth-placeholder topbar__auth-placeholder--compact"
              aria-hidden="true"
              data-testid="topbar-auth-placeholder"
            >
              <span className="topbar__auth-placeholder-dot" />
            </div>
          ) : s.isLoggedIn ? (
            <div
              className="topbar__user-area topbar__user-area--compact"
            >
              <TopbarLocalPreviewToggle contentKeyType={s.contentKeyType} />
              <CreateMenuButton variant="topbar" />
            </div>
          ) : (
            <>
              <LanguageSwitcher iconOnly />
              <NavListItem
                label={t("login")}
                icon={<LuLogIn size={16} aria-hidden="true" />}
                path={AppRoutePaths.LOGIN}
              />
            </>
          )}
        </div>
      </div>

      {s.showVersionPanel && s.contentKeyType === "app" && s.appDetail?.appId && (
        <VersionHistoryPanel
          type="app"
          entityId={s.appDetail.appId}
          sourceServerOrigin={s.appDetail.versionServerOrigin ?? s.appDetail.serverOrigin}
          onClose={() => s.setShowVersionPanel(false)}
          onRestore={() => {
            void s.refetchApp();
            window.dispatchEvent(new CustomEvent("app-editor-refresh"));
          }}
        />
      )}
      {s.showVersionPanel && s.contentKeyType !== "app" && s.pageKey && (
        <VersionHistoryPanel
          type="doc"
          entityId={s.pageKey}
          onClose={() => s.setShowVersionPanel(false)}
        />
      )}
    </>
  );
};

TopBar.displayName = "TopBar";

export default memo(TopBar);
