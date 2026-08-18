import React, { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "app/routing";
import {
  LuArrowRight,
  LuBell,
  LuCheck,
  LuCircleX,
  LuLoaderCircle,
  LuUsers,
} from "react-icons/lu";
import { AppRoutePaths } from "app/constants/routePaths";
import { useClickOutside } from "app/hooks/useClickOutside";
import { useUserNotifications } from "app/hooks/useUserNotifications";
import {
  type AppNotification,
  useNotifications,
  useUnreadNotificationCount,
} from "app/notifications/notificationStore";
import { useNotificationActions } from "app/notifications/useNotificationActions";
import { useAppDispatch } from "app/store";
import { markDialogRead } from "create/space/spaceSlice";
import "./layout.css";

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

const TopbarNotificationBell: React.FC = () => {
  useUserNotifications();

  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { markAsRead, markAllAsRead } = useNotificationActions();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const notifications = useNotifications();
  const unreadCount = useUnreadNotificationCount();

  useClickOutside(rootRef as React.RefObject<HTMLElement>, () => setOpen(false));

  const visibleItems = useMemo(() => notifications.slice(0, 8), [notifications]);

  const handleOpenItem = (item: AppNotification) => {
    setOpen(false);
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

  return (
    <div className="TopbarNotification" ref={rootRef}>
      <button
        type="button"
        className={`topbar__button topbar-notification__button ${open ? "is-active" : ""}`}
        aria-label={t("notifications.open", "Open notifications")}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
      >
        <LuBell size={20} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="topbar-notification__badge" aria-hidden="true">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <div
        className={`topbar-dropdown topbar-notification__popup ${open ? "topbar-dropdown--open" : ""}`}
        role="menu"
      >
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

        {visibleItems.length === 0 ? (
          <div className="topbar-notification__empty">
            {t("notifications.empty", "No notifications yet")}
          </div>
        ) : (
          <div className="topbar-notification__list">
            {visibleItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`topbar-notification__item ${item.read ? "" : "is-unread"}`}
                onClick={() => handleOpenItem(item)}
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
            setOpen(false);
            navigate(AppRoutePaths.NOTIFICATIONS);
          }}
        >
          <span>{t("notifications.viewAll", "View all notifications")}</span>
          <LuArrowRight size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default TopbarNotificationBell;
