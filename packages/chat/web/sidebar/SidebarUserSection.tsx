import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "app/routing";
import { LEGAL_LINKS } from "app/constants/legalLinks";
import {
  LuBell,
  LuSettings,
  LuPlus,
  LuUser,
  LuLogIn,
  LuLogOut,
  LuDownload,
  LuCheck,
  LuArrowRight,
  LuCircleX,
  LuLoaderCircle,
  LuUsers,
  LuChevronDown,
  LuChartColumnBig,
  LuUserPlus,
  LuShare2,
  LuFlag,
  LuScale,
} from "react-icons/lu";

import { useAppDispatch, useAppSelector } from "app/store";
import { SettingRoutePaths } from "app/settings/config";
import {
  AppRoutePaths,
  QUICK_CHAT_FEEDBACK_LAUNCH_PATH,
} from "app/constants/routePaths";
import {
  selectUsers,
  signOut,
  changeUser,
  fetchUserProfile,
} from "identity/actions";
import { useCurrentUser, useUserId } from "identity";
import { cloudLazy } from "identity/cloudLazy";
import { selectIdentityUserBalance } from "identity/selectors";
import { read, selectById } from "database/dbSlice";
import { createUserKey } from "database/keys";
import { selectRuntimeCurrentServer } from "app/stateViews/runtime";
import { resolveAvatarUrl } from "ai/agent/avatarUtils";
import { Tooltip } from "render/web/ui/Tooltip";
import Avatar from "render/web/ui/Avatar";
import { DarkModeSwitch } from "app/theme/web/DarkModeSwitch";
import { useClickOutside } from "app/hooks/useClickOutside";
import { useIsMobile } from "app/hooks/useIsMobile";

import { useUserNotifications } from "app/hooks/useUserNotifications";
import { useNotificationActions } from "app/notifications/useNotificationActions";
import {
  type AppNotification,
  useNotifications,
  useUnreadNotificationCount,
} from "app/notifications/notificationStore";
import {
  markDialogRead,
} from "create/space/markDialogReadThunk";
import { Dialog } from "render/web/ui/modal/Dialog";
import Button from "render/web/ui/Button";
// InviteRewards 在公开集不存在（life 包 cloud-only）；cloudLazy 用变量路径绕过 esbuild。
const InviteRewards = cloudLazy<{ isOpen: boolean; onClose: () => void }>(
  "life/web/InviteRewards",
  () => null,
);
import * as stylex from "@stylexjs/stylex";
import { sidebarStyles } from "../sidebarStyles";
import { withLiteralClass } from "../withLiteralClass";
import "../chatStylexEscapeHatch.css";

const getNotificationIcon = (item: AppNotification) => {
  if (item.kind === "agent_notice") return <LuBell size={15} aria-hidden="true" />;
  if (item.kind === "space_member_added") return <LuUsers size={15} aria-hidden="true" />;
  if (item.kind === "dialog_failed") return <LuCircleX size={15} aria-hidden="true" />;
  return <LuLoaderCircle size={15} aria-hidden="true" />;
};

const formatNotificationTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const PortalDropdown: React.FC<{
  isOpen: boolean;
  anchorRef: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  className?: string;
  role?: string;
}> = ({ isOpen, anchorRef, children, className, role }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      setRect(anchorRef.current.getBoundingClientRect());
    }
  }, [isOpen, anchorRef]);

  if (!isOpen || !rect) return null;

  return createPortal(
    <div
      data-hook="chat-esc-user-dropdown"
      role={role}
      onPointerDown={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left + 8,
        width: rect.width - 16,
      }}
      {...withLiteralClass(
        `SidebarUserSection__dropdown is-open ${className || ""}`,
        sidebarStyles.sidebarUserSectionDropdown,
        sidebarStyles.sidebarUserSectionDropdownOpen,
        className?.includes("SidebarUserSection__dropdown--menu") &&
          sidebarStyles.sidebarUserSectionDropdownMenu
      )}
    >
      {children}
    </div>,
    document.body
  );
};

export const SidebarUserSection: React.FC = () => {
  const { t } = useTranslation(["common", "chat", "space"]);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const authUser = useCurrentUser();
  const isMobile = useIsMobile(768);

  const users = useAppSelector(selectUsers);
  const currentUserId = useUserId();
  const balance = useAppSelector(selectIdentityUserBalance);
  const currentServer = useAppSelector(selectRuntimeCurrentServer);

  // --- 通知逻辑 ---
  useUserNotifications();
  const { markAsRead, markAllAsRead } = useNotificationActions();
  const notifications = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const visibleNotifications = useMemo(() => notifications.slice(0, 8), [notifications]);

  // --- 状态控制 ---
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // MessageInputCore.tsx:981 惯例：spread 在前，className 显式合并字面类（防 clobber）。
  const menuToggleStyleProps = stylex.props(
    sidebarStyles.sidebarUserSectionMenuToggle,
    menuOpen && sidebarStyles.sidebarUserSectionMenuToggleOpen,
  );
  const menuToggleIconStyleProps = stylex.props(
    sidebarStyles.sidebarUserSectionMenuToggleIcon,
    menuOpen && sidebarStyles.sidebarUserSectionMenuToggleIconOpen,
  );
  const [inviteOpen, setInviteOpen] = useState(false);

  const sectionRef = useRef<HTMLDivElement>(null);
  const bellContainerRef = useRef<HTMLDivElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // --- 外部点击关闭 ---
  useClickOutside(bellContainerRef as React.RefObject<HTMLElement>, () => setBellOpen(false));
  useClickOutside(menuContainerRef as React.RefObject<HTMLElement>, () => setMenuOpen(false));

  // ESC 按键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setBellOpen(false);
        setMenuOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // --- 用户数据加载 ---
  useEffect(() => {
    if (currentUserId) {
      dispatch(fetchUserProfile());
    }
  }, [currentUserId, dispatch]);

  const profileKey = useMemo(
    () => (currentUserId ? createUserKey.profile(currentUserId) : null),
    [currentUserId]
  );

  useEffect(() => {
    if (!profileKey) return;
    dispatch(read({ dbKey: profileKey }) as any);
  }, [profileKey, dispatch]);

  const profile = useAppSelector((state) =>
    profileKey ? (selectById(state as any, profileKey) as any) : null
  );

  const avatarUrl = useMemo(() => {
    if (!profile) return null;
    const anyProfile = profile as any;
    const avatarFromFile = resolveAvatarUrl(anyProfile.avatarFileId, currentServer);
    if (avatarFromFile) return avatarFromFile;
    if (typeof anyProfile.avatar === "string" && anyProfile.avatar.trim()) {
      return anyProfile.avatar as string;
    }
    return null;
  }, [profile, currentServer]);

  // --- 用户菜单操作 ---
  const balanceValue = typeof balance === "number" ? balance : 0;
  const isLoadingBalance = typeof balance !== "number";
  const creditsValue = isLoadingBalance ? "..." : balanceValue.toFixed(2);
  const creditsUnit = t("chat:creditsUnit", "积分");

  const otherUsers = useMemo(
    () => users.filter((u: any) => u?.userId && u.userId !== currentUserId),
    [users, currentUserId]
  );

  const handleLoginOther = useCallback(() => navigate("/login"), [navigate]);
  const handleInvite = useCallback(() => setInviteOpen(true), []);
  const handleOpenLifeProfile = useCallback(() => {
    setMenuOpen(false);
    setBellOpen(false);
    navigate("/life");
  }, [navigate]);

  const handleOpenLifeUsage = useCallback(() => {
    setMenuOpen(false);
    setBellOpen(false);
    navigate("/life/usage");
  }, [navigate]);

  // 反馈入口从首页 quick-chat 芯片挪到这里：走 /chat?launch=feedback 直达反馈 agent。
  const handleFeedback = useCallback(() => {
    setMenuOpen(false);
    setBellOpen(false);
    navigate(QUICK_CHAT_FEEDBACK_LAUNCH_PATH);
  }, [navigate]);

  const handleOpenSettings = useCallback(() => {
    setMenuOpen(false);
    setBellOpen(false);
    navigate(SettingRoutePaths.SETTING, { state: { backgroundLocation: location } });
  }, [navigate, location]);


  const handleLogout = useCallback(() => {
    dispatch(signOut() as any)
      .unwrap()
      .then(() => navigate("/"));
  }, [dispatch, navigate]);

  const handleOpenNotificationItem = (item: AppNotification) => {
    setBellOpen(false);
    void markAsRead(item);
    if (item.dialogId) {
      dispatch(markDialogRead({ dialogId: item.dialogId }));
    }
    if (item.href) {
      navigate(item.href);
      return;
    }
    navigate(AppRoutePaths.NOTIFICATIONS);
  };

  if (!authUser) return null;

  return (
    <div
      ref={sectionRef}
      {...withLiteralClass("SidebarUserSection", sidebarStyles.sidebarUserSection)}
    >
      <div
        {...stylex.props(sidebarStyles.sidebarUserSectionRow)}
      >
        {/* 左侧：头像进 Life，chevron 打开账号菜单 */}
        <div
          ref={menuContainerRef}
          {...stylex.props(sidebarStyles.sidebarUserSectionCardWrap)}
          style={{ flex: 1, minWidth: 0 }}
        >
          <Tooltip
            content={t("goToProfile", "个人主页")}
            placement="top"
            disabled={isMobile}
          >
            <button
              type="button"
              onClick={handleOpenLifeProfile}
              aria-label={t("goToProfile", "个人主页")}
              {...stylex.props(sidebarStyles.sidebarUserSectionProfile)}
            >
              <Avatar
                name={authUser.username}
                type="user"
                size="small"
                shape="full"
                src={avatarUrl || undefined}
              />
              <span
                title={authUser.email || authUser.username}
                {...stylex.props(sidebarStyles.sidebarUserSectionUsername)}
              >
                {authUser.email || authUser.username}
              </span>
            </button>
          </Tooltip>
          <button
            type="button"
            {...menuToggleStyleProps}
            className={[menuToggleStyleProps.className, "SidebarUserSection__menu-toggle", menuOpen ? "is-open" : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={() => {
              setMenuOpen((prev) => !prev);
              setBellOpen(false);
            }}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t("accountMenu", "账号菜单")}
          >
            <LuChevronDown
              size={14}
              aria-hidden="true"
              {...menuToggleIconStyleProps}
              className={[menuToggleIconStyleProps.className, "SidebarUserSection__menu-toggle-icon"]
                .filter(Boolean)
                .join(" ")}
            />
          </button>
          {/* 用户菜单弹窗 - 向上展开 */}
        <PortalDropdown
          isOpen={menuOpen}
          anchorRef={sectionRef as React.RefObject<HTMLElement>}
          className="SidebarUserSection__dropdown--menu"
          role="menu"
        >
          {/* 身份余额 */}
          <div className="topbar-user-menu__header">
            <div className="topbar-user-menu__username">{authUser.username}</div>
            {authUser.email && authUser.email !== authUser.username ? (
              <div className="topbar-user-menu__email" title={authUser.email}>
                {authUser.email}
              </div>
            ) : null}
            <div className="topbar-user-menu__balance-row">
              <div className="topbar-user-menu__balance-copy">
                <span className="topbar-user-menu__balance-label">{creditsUnit}</span>
                <span
                  className={`topbar-user-menu__balance-value ${
                    !isLoadingBalance && balanceValue < 10 ? "is-low" : ""
                  }`}
                >
                  {creditsValue}
                </span>
              </div>
              <button
                type="button"
                className="topbar-user-menu__btn-add"
                onClick={() => {
                  navigate("/recharge");
                  setMenuOpen(false);
                }}
              >
                <LuPlus size={10} strokeWidth={3} aria-hidden="true" />
                <span>{t("recharge", "充值")}</span>
              </button>
            </div>
          </div>

          <div className="topbar-user-menu__divider" />

          <div className="topbar-user-menu__list">
            <button
              type="button"
              className="topbar-user-menu__item"
              onClick={handleOpenLifeUsage}
            >
              <LuChartColumnBig size={14} aria-hidden="true" />
              <span>{t("usage_dashboard", "使用统计")}</span>
            </button>
            <button
              type="button"
              className="topbar-user-menu__item"
              onClick={() => {
                setMenuOpen(false);
                setBellOpen(false);
                navigate("/life/shares");
              }}
            >
              <LuShare2 size={14} aria-hidden="true" />
              <span>{t("space:myShares.title", "我的分享")}</span>
            </button>
            <button
              type="button"
              className="topbar-user-menu__item"
              onClick={handleOpenSettings}
            >
              <LuSettings size={14} aria-hidden="true" />
              <span>{t("settings.title", "设置")}</span>
            </button>
          </div>

          {/* 切换账号 */}
          {otherUsers.length > 0 && (
            <>
              <div className="topbar-user-menu__divider" />
              <div className="topbar-user-menu__list">
                {otherUsers.map(
                  (u: any) =>
                    u && (
                      <button
                        key={u.userId}
                        type="button"
                        className="topbar-user-menu__item"
                        onClick={() => {
                          dispatch(changeUser(u));
                          setMenuOpen(false);
                        }}
                      >
                        <LuUser size={14} aria-hidden="true" />
                        <span>{u.username}</span>
                      </button>
                    )
                )}
              </div>
            </>
          )}

          <div className="topbar-user-menu__divider" />

          <div className="topbar-user-menu__preferences">
            <div className="topbar-user-menu__theme-row">
              <span className="topbar-user-menu__theme-label">
                {t("settings.appearance.mode.title", "深色模式")}
              </span>
              <DarkModeSwitch compact />
            </div>
          </div>

          <div className="topbar-user-menu__divider" />

          {/* 功能菜单 */}
          <div className="topbar-user-menu__list">
            <button
              type="button"
              className="topbar-user-menu__item"
              onClick={() => { handleLoginOther(); setMenuOpen(false); }}
            >
              <LuLogIn size={14} aria-hidden="true" />
              <span>{t("loginOtherUser", "登录其他用户")}</span>
            </button>
            <button
              type="button"
              className="topbar-user-menu__item topbar-user-menu__item--invite"
              onClick={() => { handleInvite(); setMenuOpen(false); }}
            >
              <LuUserPlus size={14} aria-hidden="true" />
              <span>{t("inviteFriend", "邀请朋友")}</span>
            </button>
            <button
              type="button"
              className="topbar-user-menu__item"
              onClick={() => { navigate("/downloads"); setMenuOpen(false); }}
            >
              <LuDownload size={14} aria-hidden="true" />
              <span>{t("downloadClient", "下载客户端")}</span>
            </button>
            <button
              type="button"
              className="topbar-user-menu__item"
              onClick={handleFeedback}
            >
              <LuFlag size={14} aria-hidden="true" />
              <span>{t("quickChat.chipFeedbackAgent", "我想反馈")}</span>
            </button>

            <div className="topbar-user-menu__divider" />
            {/* 法务入口：工作区没有站点页脚，合规导航由这里承载 */}
            {LEGAL_LINKS.map((link) => (
              <button
                key={link.to}
                type="button"
                className="topbar-user-menu__item"
                onClick={() => {
                  navigate(link.to);
                  setMenuOpen(false);
                }}
              >
                <LuScale size={14} aria-hidden="true" />
                <span>{t(link.i18nKey, link.fallback)}</span>
              </button>
            ))}

            <div className="topbar-user-menu__divider" />
            <button
              type="button"
              className="topbar-user-menu__item topbar-user-menu__item--logout"
              onClick={handleLogout}
            >
              <LuLogOut size={14} aria-hidden="true" />
              <span>{t("logout", "登出")}</span>
            </button>
          </div>
        </PortalDropdown>
      </div>

      {/* 右侧：操作按钮 */}
      <div
        {...stylex.props(sidebarStyles.sidebarUserSectionActions)}
      >
        {/* 设置 */}
        <Tooltip content={t("settings.title", "设置")} placement="top" disabled={isMobile}>
          <button
            type="button"
            onClick={handleOpenSettings}
            aria-label={t("settings.title", "设置")}
            {...stylex.props(sidebarStyles.sidebarUserSectionToolBtn)}
          >
            <LuSettings size={17} aria-hidden="true" />
          </button>
        </Tooltip>
        {/* 通知 */}
        <div
          ref={bellContainerRef}
          {...stylex.props(sidebarStyles.sidebarUserSectionToolWrap)}
        >
          <Tooltip content={t("notifications.title", "通知")} placement="top" disabled={isMobile}>
            <button
              type="button"
              onClick={() => { setBellOpen((prev) => !prev); setMenuOpen(false); }}
              aria-label={
                unreadCount > 0
                  ? t("notifications.titleWithCount", {
                      count: unreadCount,
                      defaultValue: `通知，${unreadCount} 条未读`,
                    })
                  : t("notifications.title", "通知")
              }
              aria-expanded={bellOpen}
              aria-haspopup="menu"
              {...stylex.props(
                sidebarStyles.sidebarUserSectionToolBtn,
                bellOpen && sidebarStyles.sidebarUserSectionToolBtnActive
              )}
            >
              <LuBell size={17} aria-hidden="true" />
              {unreadCount > 0 && (
                <span
                  aria-hidden="true"
                  {...stylex.props(sidebarStyles.sidebarUserSectionBadge)}
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </Tooltip>

          {/* 通知弹窗 - 向上展开 */}
          <PortalDropdown isOpen={bellOpen} anchorRef={sectionRef as React.RefObject<HTMLElement>} role="menu">
            <div className="topbar-notification__header">
              <div>
                <div className="topbar-notification__title">
                  {t("notifications.title", "Notifications")}
                </div>
                <div className="topbar-notification__subtitle">
                  {t("notifications.subtitle", "Recent updates relevant to you")}
                </div>
              </div>
              <button
                type="button"
                className="topbar-notification__mark-all"
                onClick={() => void markAllAsRead()}
                disabled={unreadCount === 0}
              >
                <LuCheck size={13} aria-hidden="true" />
                <span>{t("notifications.markAllRead", "Mark all read")}</span>
              </button>
            </div>

            {visibleNotifications.length === 0 ? (
              <div className="topbar-notification__empty">
                {t("notifications.empty", "No notifications yet")}
              </div>
            ) : (
              <div className="topbar-notification__list" style={{ maxHeight: "280px" }}>
                {visibleNotifications.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`topbar-notification__item ${item.read ? "" : "is-unread"}`}
                    onClick={() => handleOpenNotificationItem(item)}
                  >
                    <div className="topbar-notification__item-icon">
                      {getNotificationIcon(item)}
                    </div>
                    <div className="topbar-notification__item-body">
                      <div className="topbar-notification__item-title-row">
                        <span className="topbar-notification__item-title">{item.title}</span>
                        {!item.read && (
                          <span className="topbar-notification__item-dot" aria-hidden="true" />
                        )}
                      </div>
                      {item.message && (
                        <div className="topbar-notification__item-message">{item.message}</div>
                      )}
                      <div className="topbar-notification__item-time">
                        {formatNotificationTime(item.createdAt)}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              className="topbar-notification__footer-link"
              onClick={() => {
                setBellOpen(false);
                navigate(AppRoutePaths.NOTIFICATIONS);
              }}
            >
              <span>{t("notifications.viewAll", "View all notifications")}</span>
              <LuArrowRight size={14} aria-hidden="true" />
            </button>
          </PortalDropdown>
        </div>
      </div>
      </div>

      <InviteRewards isOpen={inviteOpen} onClose={() => setInviteOpen(false)} />
    </div>
  );
};

export default SidebarUserSection;
