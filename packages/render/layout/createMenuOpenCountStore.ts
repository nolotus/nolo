import { useSyncExternalStore } from "react";

// Create-menu onboarding is a device preference, not account/cloud settings.
const STORAGE_KEY = "nolo:create-menu-open-count";
const MAX_COUNT = 4; // The label disappears after the fourth counted opening.
const listeners = new Set<() => void>();
const clampCount = (value: unknown): number => {
  const count = typeof value === "number" ? value : Number(value);
  return Number.isFinite(count) && count > 0
    ? Math.min(MAX_COUNT, Math.floor(count))
    : 0;
};
const readInitialCount = (): number => {
  try {
    return typeof window !== "undefined"
      ? clampCount(window.localStorage.getItem(STORAGE_KEY))
      : 0;
  } catch {
    return 0;
  }
};

let count = readInitialCount();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
export const getCreateMenuOpenCount = (): number => count;
export const incrementCreateMenuOpenCount = (): void => {
  if (count >= MAX_COUNT) return;
  count++;
  try {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, String(count));
    }
  } catch {
    // Storage can be blocked in embedded or private contexts; keep session state.
  }
  listeners.forEach((listener) => listener());
};
export const useCreateMenuOpenCount = (): number =>
  useSyncExternalStore(subscribe, getCreateMenuOpenCount, () => 0);
