// app/layout/rightSidebarPreference.ts — Companion / RightSidebar 宽度偏好（local-first & SSR-safe）。
import { useSyncExternalStore } from "react";

export const DEFAULT_RIGHT_SIDEBAR_WIDTH = 360;
export const RIGHT_SIDEBAR_MIN_WIDTH = 280;
export const RIGHT_SIDEBAR_MAX_WIDTH = 1200;

const STORAGE_KEY = "nolo.rightSidebarPreferredWidth.v1";

const listeners = new Set<() => void>();
let version = 0;
let cachedWidth: number = DEFAULT_RIGHT_SIDEBAR_WIDTH;
let hydrated = false;

export const clampPreferredWidth = (width: number): number => {
  if (!Number.isFinite(width)) return DEFAULT_RIGHT_SIDEBAR_WIDTH;
  return Math.min(RIGHT_SIDEBAR_MAX_WIDTH, Math.max(RIGHT_SIDEBAR_MIN_WIDTH, Math.round(width)));
};

/** 只在浏览器环境读一次 localStorage；读写失败静默退回默认值。 */
const hydrate = (): void => {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      cachedWidth = clampPreferredWidth(parsed);
    }
  } catch {
    /* ignore storage read error */
  }
};

const commit = (): void => {
  version += 1;
  for (const listener of listeners) {
    try {
      listener();
    } catch {
      /* subscriber errors must not break mutators */
    }
  }
};

export function setRightSidebarPreferredWidth(width: number): void {
  if (!Number.isFinite(width)) return;
  const clamped = clampPreferredWidth(width);
  if (cachedWidth === clamped) return;
  cachedWidth = clamped;
  persist();
  commit();
}

function persist(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, String(cachedWidth));
  } catch {
    /* storage full / blocked — keep in-memory only */
  }
}

export function getRightSidebarPreferenceSnapshot(): number {
  hydrate();
  return version;
}

export function getRightSidebarPreferredWidth(): number {
  hydrate();
  return cachedWidth;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useRightSidebarPreferredWidth(): number {
  useSyncExternalStore(
    subscribe,
    getRightSidebarPreferredWidth,
    () => DEFAULT_RIGHT_SIDEBAR_WIDTH // SSR fallback
  );
  return getRightSidebarPreferredWidth();
}

export function resetRightSidebarPreferenceForTests(): void {
  cachedWidth = DEFAULT_RIGHT_SIDEBAR_WIDTH;
  hydrated = true;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  commit();
}
