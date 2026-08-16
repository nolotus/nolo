/**
 * Lightweight in-memory store for "just created" sidebar rows.
 * Pure JS — no DOM / localStorage — safe for non-web importers.
 *
 * Used with useSyncExternalStore: subscribe + getSnapshot (version).
 */

import { asTrimmedString } from "core/trimmedString";

const FLASH_TTL_MS = 2500;

const keys = new Set<string>();
const clearTimers = new Map<string, ReturnType<typeof setTimeout>>();
const listeners = new Set<() => void>();
/** Monotonic version for useSyncExternalStore getSnapshot. */
let version = 0;

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

export function markRecentlyCreated(contentKey: string): void {
  const key = asTrimmedString(contentKey);
  if (!key) return;

  const existingTimer = clearTimers.get(key);
  if (existingTimer !== undefined) {
    clearTimeout(existingTimer);
    clearTimers.delete(key);
  }

  const wasPresent = keys.has(key);
  keys.add(key);
  if (!wasPresent) {
    bump();
  }

  const timer = setTimeout(() => {
    clearTimers.delete(key);
    clearRecentlyCreated(key);
  }, FLASH_TTL_MS);
  clearTimers.set(key, timer);
}

export function clearRecentlyCreated(contentKey: string): void {
  const key = asTrimmedString(contentKey);
  if (!key) return;

  const existingTimer = clearTimers.get(key);
  if (existingTimer !== undefined) {
    clearTimeout(existingTimer);
    clearTimers.delete(key);
  }

  if (!keys.has(key)) return;
  keys.delete(key);
  bump();
}

export function isRecentlyCreated(contentKey: string): boolean {
  const key = asTrimmedString(contentKey);
  if (!key) return false;
  return keys.has(key);
}

export function hasRecentlyCreated(): boolean {
  return keys.size > 0;
}

/** useSyncExternalStore getSnapshot — changes when membership changes. */
export function getSnapshot(): number {
  return version;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Test helper: drop all keys/timers without relying on TTL. */
export function resetRecentlyCreatedStoreForTests(): void {
  for (const timer of clearTimers.values()) {
    clearTimeout(timer);
  }
  clearTimers.clear();
  keys.clear();
  version += 1;
  notify();
}

export const RECENTLY_CREATED_FLASH_TTL_MS = FLASH_TTL_MS;
