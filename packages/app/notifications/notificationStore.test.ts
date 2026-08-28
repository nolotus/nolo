import { afterEach, beforeEach, describe, expect, it } from "bun:test";

import type { NotificationRecord } from "app/notifications/model";
import { DataType } from "create/types";

import {
  type AppNotification,
  addNotification,
  getNotifications,
  getNotificationsHydrated,
  getUnreadNotificationCount,
  getUnreadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  replaceNotifications,
  subscribe,
} from "./notificationStore";

const makeRecord = (
  overrides: Partial<NotificationRecord> = {}
): NotificationRecord => ({
  dbKey: `NOTIFICATION-user-a-${overrides.notificationId ?? "n"}`,
  type: DataType.NOTIFICATION,
  userId: "user-a",
  notificationId: "n",
  kind: "agent_notice",
  createdAt: 1,
  updatedAt: 1,
  ...overrides,
} as NotificationRecord);

const makeItem = (overrides: Partial<AppNotification> = {}): AppNotification => ({
  id: "n",
  kind: "agent_notice",
  title: "title",
  createdAt: 1,
  updatedAt: 1,
  read: false,
  record: makeRecord({ notificationId: overrides.id ?? "n" }),
  ...overrides,
});

describe("notificationStore", () => {
  beforeEach(() => {
    // Each test starts from a clean module store.
    replaceNotifications([]);
    // replaceNotifications flips hydrated true; reset to the initial
    // pristine state so hydrated assertions are meaningful.
    // (resetNotificationStoreForTests is exercised in its own test below.)
  });

  afterEach(() => {
    replaceNotifications([]);
  });

  it("replaceNotifications sorts by createdAt desc then updatedAt desc", () => {
    const a = makeItem({
      id: "a",
      createdAt: 100,
      updatedAt: 100,
    });
    const b = makeItem({
      id: "b",
      createdAt: 300,
      updatedAt: 300,
    });
    const c = makeItem({
      id: "c",
      createdAt: 300,
      updatedAt: 500,
    });
    replaceNotifications([a, b, c]);
    expect(getNotifications().map((item) => item.id)).toEqual(["c", "b", "a"]);
    expect(getNotificationsHydrated()).toBe(true);
  });

  it("replaceNotifications dedupes by id keeping the highest updatedAt", () => {
    const old = makeItem({ id: "x", updatedAt: 100, title: "old" });
    const recent = makeItem({ id: "x", updatedAt: 200, title: "recent" });
    const stale = makeItem({ id: "x", updatedAt: 50, title: "stale" });
    replaceNotifications([old, recent, stale]);
    const items = getNotifications();
    expect(items.length).toBe(1);
    expect(items[0]?.title).toBe("recent");
  });

  it("replaceNotifications caps at MAX_NOTIFICATION_ITEMS = 100", () => {
    const seed: AppNotification[] = [];
    for (let i = 0; i < 150; i++) {
      seed.push(
        makeItem({
          id: `n${i}`,
          createdAt: i,
          updatedAt: i,
        })
      );
    }
    replaceNotifications(seed);
    expect(getNotifications().length).toBe(100);
    // The most recent (highest createdAt) survive after sort + slice.
    expect(getNotifications()[0]?.id).toBe("n149");
  });

  it("addNotification inserts a new item at the sorted front", () => {
    const a = makeItem({ id: "a", createdAt: 100, updatedAt: 100 });
    replaceNotifications([a]);
    addNotification(
      makeItem({ id: "b", createdAt: 300, updatedAt: 300 })
    );
    expect(getNotifications().map((item) => item.id)).toEqual(["b", "a"]);
  });

  it("addNotification merges an existing id preserving read=true and prev.record.readAt", () => {
    const prev = makeItem({
      id: "x",
      createdAt: 100,
      updatedAt: 100,
      read: true,
      record: makeRecord({
        notificationId: "x",
        readAt: 50,
        updatedAt: 100,
      }),
    });
    replaceNotifications([prev]);
    // incoming: unread (read=false), but no readAt on record.
    const next = makeItem({
      id: "x",
      createdAt: 100,
      updatedAt: 200,
      read: false,
      record: makeRecord({
        notificationId: "x",
        updatedAt: 200,
      }),
    });
    addNotification(next);
    const merged = getNotifications()[0];
    expect(merged?.read).toBe(true); // prev.read || next.read
    expect(merged?.record.readAt).toBe(50); // prev.record.readAt preserved
  });

  it("addNotification merges keeping next.read=true and falls back to next.record.readAt when prev had none", () => {
    const prev = makeItem({
      id: "y",
      createdAt: 100,
      updatedAt: 100,
      read: false,
      record: makeRecord({
        notificationId: "y",
        updatedAt: 100,
      }),
    });
    replaceNotifications([prev]);
    const next = makeItem({
      id: "y",
      createdAt: 100,
      updatedAt: 200,
      read: true,
      record: makeRecord({
        notificationId: "y",
        readAt: 77,
        updatedAt: 200,
      }),
    });
    addNotification(next);
    const merged = getNotifications()[0];
    expect(merged?.read).toBe(true);
    expect(merged?.record.readAt).toBe(77);
  });

  it("markNotificationRead sets read and readAt and bumps updatedAt", () => {
    const a = makeItem({
      id: "a",
      createdAt: 100,
      updatedAt: 100,
      read: false,
      record: makeRecord({
        notificationId: "a",
        updatedAt: 100,
      }),
    });
    replaceNotifications([a]);
    markNotificationRead({ id: "a", readAt: 999 });
    const item = getNotifications()[0];
    expect(item?.read).toBe(true);
    expect(item?.updatedAt).toBe(999);
    expect(item?.record.readAt).toBe(999);
    expect(item?.record.updatedAt).toBe(999);
  });

  it("markNotificationRead is a no-op for unknown id", () => {
    const a = makeItem({ id: "a", createdAt: 100, updatedAt: 100 });
    replaceNotifications([a]);
    markNotificationRead({ id: "missing", readAt: 999 });
    const item = getNotifications()[0];
    expect(item?.read).toBe(false);
    expect(item?.record.readAt).toBeUndefined();
  });

  it("markAllNotificationsRead marks every unread item read", () => {
    const a = makeItem({
      id: "a",
      createdAt: 100,
      updatedAt: 100,
      read: false,
    });
    const b = makeItem({
      id: "b",
      createdAt: 200,
      updatedAt: 200,
      read: true,
      record: makeRecord({
        notificationId: "b",
        readAt: 10,
        updatedAt: 200,
      }),
    });
    replaceNotifications([a, b]);
    expect(getUnreadNotificationCount()).toBe(1);
    markAllNotificationsRead({ readAt: 1000 });
    expect(getUnreadNotificationCount()).toBe(0);
    const [first, second] = getNotifications();
    expect(first?.read).toBe(true);
    expect(first?.record.readAt).toBe(1000);
    // already-read item keeps updatedAt bumped to readAt when readAt > prev
    expect(second?.read).toBe(true);
    expect(second?.updatedAt).toBe(1000);
    expect(second?.record.readAt).toBe(1000);
  });

  it("getUnreadNotifications filters only read=false items sorted", () => {
    const a = makeItem({ id: "a", createdAt: 100, updatedAt: 100, read: false });
    const b = makeItem({ id: "b", createdAt: 200, updatedAt: 200, read: true });
    const c = makeItem({ id: "c", createdAt: 300, updatedAt: 300, read: false });
    replaceNotifications([a, b, c]);
    expect(getUnreadNotifications().map((item) => item.id)).toEqual(["c", "a"]);
    expect(getUnreadNotificationCount()).toBe(2);
  });

  it("subscribe is notified on mutations and unsubscribe stops them", () => {
    let calls = 0;
    const unsubscribe = subscribe(() => {
      calls += 1;
    });
    addNotification(makeItem({ id: "a", createdAt: 1, updatedAt: 1 }));
    expect(calls).toBeGreaterThan(0);
    const callsBefore = calls;
    unsubscribe();
    addNotification(makeItem({ id: "b", createdAt: 2, updatedAt: 2 }));
    expect(calls).toBe(callsBefore);
  });

  it("resetNotificationStoreForTests restores initial empty + hydrated=false", async () => {
    const { resetNotificationStoreForTests } = await import("./notificationStore");
    replaceNotifications([makeItem({ id: "a", createdAt: 1, updatedAt: 1 })]);
    expect(getNotifications().length).toBe(1);
    expect(getNotificationsHydrated()).toBe(true);
    resetNotificationStoreForTests();
    expect(getNotifications().length).toBe(0);
    expect(getNotificationsHydrated()).toBe(false);
    // re-seed for afterEach cleanup
    replaceNotifications([]);
  });
});