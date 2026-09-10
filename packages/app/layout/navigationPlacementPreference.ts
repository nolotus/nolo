// app/layout/navigationPlacementPreference.ts — Navigation 左右布局偏好（local-first & SSR-safe）。
import { useSyncExternalStore } from "react";

export type NavigationPlacement = "start" | "end";

export const DEFAULT_NAVIGATION_PLACEMENT: NavigationPlacement = "start";

const STORAGE_KEY = "nolo.navigationPlacement.v1";

const listeners = new Set<() => void>();
let version = 0;
let cachedPlacement: NavigationPlacement = DEFAULT_NAVIGATION_PLACEMENT;
let hydrated = false;

export const normalizeNavigationPlacement = (
  raw: unknown
): NavigationPlacement => {
  if (raw === "end") return "end";
  return DEFAULT_NAVIGATION_PLACEMENT;
};

/** 只在浏览器环境读一次 localStorage；读写失败静默退回默认值。 */
const hydrate = (): void => {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    cachedPlacement = normalizeNavigationPlacement(raw);
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

export function setNavigationPlacement(placement: NavigationPlacement): void {
  const normalized = normalizeNavigationPlacement(placement);
  if (cachedPlacement === normalized) return;
  cachedPlacement = normalized;
  persist();
  commit();
}

function persist(): void {
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, cachedPlacement);
  } catch {
    /* storage full / blocked — keep in-memory only */
  }
}

export function getNavigationPlacementSnapshot(): number {
  hydrate();
  return version;
}

export function getNavigationPlacement(): NavigationPlacement {
  hydrate();
  return cachedPlacement;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useNavigationPlacement(): NavigationPlacement {
  useSyncExternalStore(
    subscribe,
    getNavigationPlacement,
    () => DEFAULT_NAVIGATION_PLACEMENT // SSR fallback
  );
  return getNavigationPlacement();
}

export function resetNavigationPlacementForTests(): void {
  cachedPlacement = DEFAULT_NAVIGATION_PLACEMENT;
  hydrated = true;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  commit();
}
