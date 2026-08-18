import { useState, useEffect } from "react";

const STORAGE_KEY = "nolo-recently-opened-v1";
const MAX_STORED = 20;

export type RecentItem = {
  key: string;
  type: string;
  title: string;
  spaceId?: string;
  accessedAt: number;
};

function readItems(): RecentItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentItem[];
  } catch {
    return [];
  }
}

export function recordRecentVisit(
  item: Omit<RecentItem, "accessedAt">
): void {
  try {
    const existing = readItems();
    const filtered = existing.filter((i) => i.key !== item.key);
    const updated = [
      { ...item, accessedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX_STORED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // 通知同 tab 的其他 hook 实例刷新
    window.dispatchEvent(new Event("nolo-recent-updated"));
  } catch {
    // localStorage 不可用时静默忽略
  }
}

export function updateRecentVisitTitle(key: string, title: string): void {
  try {
    const nextTitle = title.trim();
    if (!key || !nextTitle) return;

    const existing = readItems();
    let changed = false;
    const updated = existing.map((item) => {
      if (item.key !== key || item.title === nextTitle) return item;
      changed = true;
      return {
        ...item,
        title: nextTitle,
      };
    });

    if (!changed) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("nolo-recent-updated"));
  } catch {
    // localStorage 不可用时静默忽略
  }
}

export function useRecentlyOpened(limit = 12): RecentItem[] {
  const [items, setItems] = useState<RecentItem[]>(() =>
    readItems().slice(0, limit)
  );

  useEffect(() => {
    const refresh = () => setItems(readItems().slice(0, limit));
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener("nolo-recent-updated", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener("nolo-recent-updated", refresh);
    };
  }, [limit]);

  return items;
}
