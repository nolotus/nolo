import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "app/routing";
import { LuBell, LuCheck, LuCircleX, LuLoaderCircle, LuUsers } from "react-icons/lu";
import { useNotificationActions } from "app/notifications/useNotificationActions";
import {
  type AppNotification,
  useNotifications,
  useUnreadNotificationCount,
} from "app/notifications/notificationStore";
import { useAppDispatch } from "app/store";
import {
  markDialogRead,
} from "create/space/markDialogReadThunk";
import "./NotificationsPage.css";

const getNotificationIcon = (item: AppNotification) => {
  if (item.kind === "agent_notice") return <LuBell size={16} aria-hidden="true" />;
  if (item.kind === "space_member_added") return <LuUsers size={16} aria-hidden="true" />;
  if (item.kind === "dialog_failed") return <LuCircleX size={16} aria-hidden="true" />;
  return <LuLoaderCircle size={16} aria-hidden="true" />;
};

const formatNotificationTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const notifications = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const { markAsRead, markAllAsRead } = useNotificationActions();

  return (
    <div className="NotificationsPage">
      <div className="NotificationsPage__header">
        <div>
          <div className="NotificationsPage__eyebrow">
            {t("notifications.title", "Notifications")}
          </div>
          <h1 className="NotificationsPage__title">
            {t("notifications.centerTitle", "Your updates")}
          </h1>
          <p className="NotificationsPage__subtitle">
            {t(
              "notifications.centerSubtitle",
              "Persistent space and agent updates across devices."
            )}
          </p>
        </div>
        <button
          type="button"
          className="NotificationsPage__mark-all"
          onClick={() => void markAllAsRead()}
          disabled={unreadCount === 0}
        >
          <LuCheck size={14} aria-hidden="true" />
          <span>{t("notifications.markAllRead", "Mark all read")}</span>
        </button>
      </div>

      {notifications.length === 0 ? (
        <div className="NotificationsPage__empty">
          <LuBell size={18} aria-hidden="true" />
          <span>{t("notifications.empty", "No notifications yet")}</span>
        </div>
      ) : (
        <div className="NotificationsPage__list">
          {notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`NotificationsPage__item ${item.read ? "" : "is-unread"}`}
              onClick={() => {
                if (item.href) navigate(item.href);
                void markAsRead(item);
                if (item.dialogId) {
                  dispatch(markDialogRead({ dialogId: item.dialogId }));
                }
              }}
            >
              <div className="NotificationsPage__itemIcon" aria-hidden="true">
                {getNotificationIcon(item)}
              </div>
              <div className="NotificationsPage__itemMain">
                <div className="NotificationsPage__itemTitleRow">
                  <span className="NotificationsPage__itemTitle">{item.title}</span>
                  {!item.read && (
                    <span className="NotificationsPage__itemDot" aria-hidden="true" />
                  )}
                </div>
                {item.message && (
                  <div className="NotificationsPage__itemMessage">{item.message}</div>
                )}
              </div>
              <div className="NotificationsPage__itemTime">
                {formatNotificationTime(item.createdAt)}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
