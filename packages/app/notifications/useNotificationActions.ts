import { useCallback } from "react";
import { toast } from "app/utils/toast";
import { useAppDispatch } from "app/store";
import { write } from "database/dbSlice";
import {
  type AppNotification,
  markAllNotificationsRead,
  markNotificationRead,
  useNotifications,
} from "./notificationStore";

const buildReadRecord = (item: AppNotification, readAt: number) => ({
  ...item.record,
  readAt,
  updatedAt: Math.max(item.record.updatedAt, readAt),
});

export function useNotificationActions() {
  const dispatch = useAppDispatch();
  const notifications = useNotifications();

  const markAsRead = useCallback(
    async (item: AppNotification) => {
      if (item.read) return;
      const readAt = Date.now();
      markNotificationRead({ id: item.id, readAt });
      try {
        await dispatch(
          write({
            customKey: item.record.dbKey,
            userId: item.record.userId,
            data: buildReadRecord(item, readAt),
          })
        ).unwrap();
      } catch (error) {
        toast.error("Failed to update notification state.");
      }
    },
    [dispatch]
  );

  const markAllAsRead = useCallback(async () => {
    const unreadItems = notifications.filter((item) => !item.read);
    if (unreadItems.length === 0) return;
    const readAt = Date.now();
    markAllNotificationsRead({ readAt });
    const results = await Promise.allSettled(
      unreadItems.map((item) =>
        dispatch(
          write({
            customKey: item.record.dbKey,
            userId: item.record.userId,
            data: buildReadRecord(item, readAt),
          })
        ).unwrap()
      )
    );
    if (results.some((result) => result.status === "rejected")) {
      toast.error("Failed to mark some notifications as read.");
    }
  }, [dispatch, notifications]);

  return {
    markAsRead,
    markAllAsRead,
  };
}
