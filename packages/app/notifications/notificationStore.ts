import { useSyncExternalStore } from "react";

import type {
  NotificationKind,
  NotificationRecord,
} from "app/notifications/model";

// Module store for notifications — peeled out of Redux.
// Mirrors packages/app/appInspector/appInspectorStore.ts:
//   - listeners Set + version counter
//   - notify/bump with try/catch around each listener
//   - hooks call useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
//     (third arg required for SSR; App/layout consumers render on server)
//
// Reducer semantics below are copied verbatim from the deleted
// notificationSlice.ts (sortItems / dedupeItems / MAX=100 / add merge readAt).
export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  message?: string;
  createdAt: number;
  updatedAt: number;
  read: boolean;
  href?: string;
  dialogId?: string;
  spaceId?: string;
  record: NotificationRecord;
};

const MAX_NOTIFICATION_ITEMS = 100;

interface NotificationStoreState {
  items: AppNotification[];
  /** true after the first successful hydrate; prevents duplicate remote fetches
   *  when multiple components mount useUserNotifications. */
  hydrated: boolean;
}

const createInitialState = (): NotificationStoreState => ({
  items: [],
  hydrated: false,
});

const sortItems = (items: AppNotification[]): AppNotification[] =>
  [...items].sort((left, right) => {
    if (right.createdAt !== left.createdAt) {
      return right.createdAt - left.createdAt;
    }
    return right.updatedAt - left.updatedAt;
  });

const dedupeItems = (items: AppNotification[]): AppNotification[] => {
  const nextMap = new Map<string, AppNotification>();
  for (const item of items) {
    const existing = nextMap.get(item.id);
    if (!existing || item.updatedAt >= existing.updatedAt) {
      nextMap.set(item.id, item);
    }
  }
  return Array.from(nextMap.values());
};

const listeners = new Set<() => void>();
let version = 0;

let state: NotificationStoreState = createInitialState();

const notify = (): void => {
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* subscriber errors must not break mutators */
    }
  }
};

const bump = (): void => {
  version += 1;
  notify();
};

// --- Mutators (plain functions — NOT Redux actions) ---

export function replaceNotifications(items: AppNotification[]): void {
  state = {
    items: sortItems(dedupeItems(items)).slice(0, MAX_NOTIFICATION_ITEMS),
    hydrated: true,
  };
  bump();
}

export function addNotification(item: AppNotification): void {
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
        readAt:
          typeof prev.record.readAt === "number"
            ? prev.record.readAt
            : next.record.readAt,
      },
    };
  } else {
    nextItems.unshift(next);
  }
  state = {
    items: sortItems(nextItems).slice(0, MAX_NOTIFICATION_ITEMS),
    hydrated: state.hydrated,
  };
  bump();
}

export function markNotificationRead(args: { id: string; readAt: number }): void {
  const item = state.items.find((entry) => entry.id === args.id);
  if (!item) return;
  item.read = true;
  item.updatedAt = Math.max(item.updatedAt, args.readAt);
  item.record = {
    ...item.record,
    readAt: args.readAt,
    updatedAt: Math.max(item.record.updatedAt, args.readAt),
  };
  bump();
}

export function markAllNotificationsRead(args: { readAt: number }): void {
  state.items.forEach((item) => {
    item.read = true;
    item.updatedAt = Math.max(item.updatedAt, args.readAt);
    item.record = {
      ...item.record,
      readAt: args.readAt,
      updatedAt: Math.max(item.record.updatedAt, args.readAt),
    };
  });
  bump();
}

// --- Sync reads (return live arrays/refs — same as reading Redux state) ---

export function getNotifications(): AppNotification[] {
  return sortItems(state.items);
}

export function getUnreadNotifications(): AppNotification[] {
  return getNotifications().filter((item) => item.read === false);
}

export function getUnreadNotificationCount(): number {
  return getUnreadNotifications().length;
}

export function getNotificationsHydrated(): boolean {
  return state.hydrated;
}

// --- useSyncExternalStore ---

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): number {
  return version;
}

export function useNotifications(): AppNotification[] {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getNotifications();
}

export function useUnreadNotificationCount(): number {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getUnreadNotificationCount();
}

export function useNotificationsHydrated(): boolean {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getNotificationsHydrated();
}

export function resetNotificationStoreForTests(): void {
  state = createInitialState();
  bump();
}