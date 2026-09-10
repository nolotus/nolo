// app/layout/companionPlacementPreference.ts — Companion / RightSidebar 左右布局偏好（local-first & SSR-safe）。
import { useSyncExternalStore } from "react";

export type CompanionPlacement = "start" | "end";

export const DEFAULT_COMPANION_PLACEMENT: CompanionPlacement = "end";

const STORAGE_KEY = "nolo.companionPlacement.v1";

const listeners = new Set<() => void>();
let version = 0;
let cachedPlacement: CompanionPlacement = DEFAULT_COMPANION_PLACEMENT;
let hydrated = false;

export const normalizeCompanionPlacement = (
  raw: unknown
): CompanionPlacement => {
  if (raw === "start") return "start";
  return DEFAULT_COMPANION_PLACEMENT;
};

/** 只在浏览器环境读一次 localStorage；读写失败静默退回默认值。 */
const hydrate = (): void => {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined" || typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    cachedPlacement = normalizeCompanionPlacement(raw);
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

export function setCompanionPlacement(placement: CompanionPlacement): void {
  const normalized = normalizeCompanionPlacement(placement);
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

export function getCompanionPlacementSnapshot(): number {
  hydrate();
  return version;
}

export function getCompanionPlacement(): CompanionPlacement {
  hydrate();
  return cachedPlacement;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useCompanionPlacement(): CompanionPlacement {
  useSyncExternalStore(
    subscribe,
    getCompanionPlacement,
    () => DEFAULT_COMPANION_PLACEMENT // SSR fallback
  );
  return getCompanionPlacement();
}

export function resetCompanionPlacementForTests(): void {
  cachedPlacement = DEFAULT_COMPANION_PLACEMENT;
  hydrated = true;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }
  commit();
}
