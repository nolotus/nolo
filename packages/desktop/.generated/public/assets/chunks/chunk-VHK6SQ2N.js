import {
  useAppDispatch
} from "/public/assets/chunks/chunk-U73LCHVO.js";
import {
  toast,
  write
} from "/public/assets/chunks/chunk-RWWUEPWY.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/notifications/notificationStore.ts
var import_react = __toESM(require_react());
var MAX_NOTIFICATION_ITEMS = 100;
var createInitialState = () => ({
  items: [],
  hydrated: false
});
var sortItems = (items) => [...items].sort((left, right) => {
  if (right.createdAt !== left.createdAt) {
    return right.createdAt - left.createdAt;
  }
  return right.updatedAt - left.updatedAt;
});
var dedupeItems = (items) => {
  const nextMap = /* @__PURE__ */ new Map();
  for (const item of items) {
    const existing = nextMap.get(item.id);
    if (!existing || item.updatedAt >= existing.updatedAt) {
      nextMap.set(item.id, item);
    }
  }
  return Array.from(nextMap.values());
};
var listeners = /* @__PURE__ */ new Set();
var version = 0;
var state = createInitialState();
var notify = () => {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
    }
  }
};
var bump = () => {
  version += 1;
  notify();
};
function replaceNotifications(items) {
  state = {
    items: sortItems(dedupeItems(items)).slice(0, MAX_NOTIFICATION_ITEMS),
    hydrated: true
  };
  bump();
}
function addNotification(item) {
  const nextItems = [...state.items];
  const next = item;
  const existingIndex = nextItems.findIndex((entry) => entry.id === next.id);
  if (existingIndex >= 0) {
    const prev = nextItems[existingIndex];
    nextItems[existingIndex] = {
      ...next,
      read: prev.read || next.read,
      record: {
        ...next.record,
        readAt: typeof prev.record.readAt === "number" ? prev.record.readAt : next.record.readAt
      }
    };
  } else {
    nextItems.unshift(next);
  }
  state = {
    items: sortItems(nextItems).slice(0, MAX_NOTIFICATION_ITEMS),
    hydrated: state.hydrated
  };
  bump();
}
function markNotificationRead(args) {
  const item = state.items.find((entry) => entry.id === args.id);
  if (!item) return;
  item.read = true;
  item.updatedAt = Math.max(item.updatedAt, args.readAt);
  item.record = {
    ...item.record,
    readAt: args.readAt,
    updatedAt: Math.max(item.record.updatedAt, args.readAt)
  };
  bump();
}
function markAllNotificationsRead(args) {
  state.items.forEach((item) => {
    item.read = true;
    item.updatedAt = Math.max(item.updatedAt, args.readAt);
    item.record = {
      ...item.record,
      readAt: args.readAt,
      updatedAt: Math.max(item.record.updatedAt, args.readAt)
    };
  });
  bump();
}
function getNotifications() {
  return sortItems(state.items);
}
function getUnreadNotifications() {
  return getNotifications().filter((item) => item.read === false);
}
function getUnreadNotificationCount() {
  return getUnreadNotifications().length;
}
function getNotificationsHydrated() {
  return state.hydrated;
}
function subscribe(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function getSnapshot() {
  return version;
}
function useNotifications() {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getNotifications();
}
function useUnreadNotificationCount() {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getUnreadNotificationCount();
}
function useNotificationsHydrated() {
  (0, import_react.useSyncExternalStore)(subscribe, getSnapshot, getSnapshot);
  return getNotificationsHydrated();
}

// packages/app/notifications/useNotificationActions.ts
var import_react2 = __toESM(require_react());
var buildReadRecord = (item, readAt) => ({
  ...item.record,
  readAt,
  updatedAt: Math.max(item.record.updatedAt, readAt)
});
function useNotificationActions() {
  const dispatch = useAppDispatch();
  const notifications = useNotifications();
  const markAsRead = (0, import_react2.useCallback)(
    async (item) => {
      if (item.read) return;
      const readAt = Date.now();
      markNotificationRead({ id: item.id, readAt });
      try {
        await dispatch(
          write({
            customKey: item.record.dbKey,
            userId: item.record.userId,
            data: buildReadRecord(item, readAt)
          })
        ).unwrap();
      } catch (error) {
        toast.error("Failed to update notification state.");
      }
    },
    [dispatch]
  );
  const markAllAsRead = (0, import_react2.useCallback)(async () => {
    const unreadItems = notifications.filter((item) => !item.read);
    if (unreadItems.length === 0) return;
    const readAt = Date.now();
    markAllNotificationsRead({ readAt });
    const results = await Promise.allSettled(
      unreadItems.map(
        (item) => dispatch(
          write({
            customKey: item.record.dbKey,
            userId: item.record.userId,
            data: buildReadRecord(item, readAt)
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
    markAllAsRead
  };
}

export {
  replaceNotifications,
  addNotification,
  useNotifications,
  useUnreadNotificationCount,
  useNotificationsHydrated,
  useNotificationActions
};
