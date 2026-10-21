import { useSyncExternalStore } from "react";

export type QuickFavorite = { key: string; type: string; title: string; path: string };
const storageKey = (owner: string) => `nolo:navigation-quick-favorites:v1:${encodeURIComponent(owner)}`;
const listeners = new Set<() => void>();
let version = 0;
const notify = () => { version++; for (const listener of listeners) listener(); };
export const QUICK_FAVORITE_CHANGED = "nolo:navigation-quick-favorites-changed";
export function readQuickFavorites(owner: string): QuickFavorite[] {
  if (!owner || typeof window === "undefined") return [];
  try {
    const value: unknown = JSON.parse(localStorage.getItem(storageKey(owner)) || "[]");
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.filter((entry): entry is QuickFavorite =>
      !!entry && typeof entry.key === "string" && typeof entry.path === "string" &&
      typeof entry.title === "string" && typeof entry.type === "string" &&
      entry.key.length > 0 && entry.path.startsWith("/") && !entry.path.startsWith("//")
    ).filter(entry => !seen.has(entry.key) && Boolean(seen.add(entry.key))).slice(0, 12);
  } catch { return []; }
}
export function setQuickFavorite(owner: string, item: QuickFavorite, active: boolean) {
  if (!owner || typeof window === "undefined") return;
  const items = readQuickFavorites(owner).filter(entry => entry.key !== item.key);
  if (active) {
    items.push(item);
    // readQuickFavorites 已把列表截断到 12 条，若这里再取前 12 条会丢掉刚加入的
    // 新条目（用户点了「加入快捷」却毫无变化）；满额时挤掉最早的一条。
    while (items.length > 12) items.shift();
  }
  localStorage.setItem(storageKey(owner), JSON.stringify(items.slice(0, 12)));
  notify();
  window.dispatchEvent(new Event(QUICK_FAVORITE_CHANGED));
}
export function moveQuickFavorite(owner: string, key: string, direction: -1 | 1): void {
  if (!owner || typeof window === "undefined") return;
  const items = readQuickFavorites(owner);
  const index = items.findIndex(item => item.key === key);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return;
  [items[index], items[target]] = [items[target], items[index]];
  localStorage.setItem(storageKey(owner), JSON.stringify(items));
  notify();
  window.dispatchEvent(new Event(QUICK_FAVORITE_CHANGED));
}

/** Drops quick-rail pointers whose key is no longer in `validKeys` (object
 *  unfavourited or deleted) and returns how many entries were removed.
 *  Nothing is written when the stored list is already clean — every write
 *  notifies subscribers and re-renders the Rail. */
export function pruneQuickFavorites(owner: string, validKeys: Iterable<string>): number {
  if (!owner || typeof window === "undefined") return 0;
  const items = readQuickFavorites(owner);
  if (items.length === 0) return 0;
  const valid = new Set(validKeys);
  const kept = items.filter(entry => valid.has(entry.key));
  const removed = items.length - kept.length;
  if (removed === 0) return 0;
  localStorage.setItem(storageKey(owner), JSON.stringify(kept));
  notify();
  window.dispatchEvent(new Event(QUICK_FAVORITE_CHANGED));
  return removed;
}

export function useQuickFavorites(owner: string): QuickFavorite[] {
  useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => version, () => 0,
  );
  return readQuickFavorites(owner);
}
