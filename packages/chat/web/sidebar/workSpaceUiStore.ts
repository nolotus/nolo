import { useSyncExternalStore } from "react";

type Preferences = Record<string, boolean>;
type UserPreferences = { spaces: Preferences; categories: Preferences };
// Each browser context owns its cache; server renders never share account preferences.
const browserUsers = new WeakMap<Window, Map<string, UserPreferences>>();
const listeners = new Set<() => void>();
let version = 0;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => version;
const storageKey = (userId: string, kind: keyof UserPreferences) =>
  `nolo:work-dialog-space-${kind === "spaces" ? "groups" : "categories"}:${userId}`;

function read(userId: string, kind: keyof UserPreferences): Preferences {
  try {
    const value: unknown = JSON.parse(
      window.localStorage.getItem(storageKey(userId, kind)) ?? "{}",
    );
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return Object.fromEntries(
        Object.entries(value).filter(([, flag]) => typeof flag === "boolean"),
      );
    }
  } catch {
    /* Storage is optional; retain the in-memory preference. */
  }
  return {};
}
function getUser(userId: string): UserPreferences {
  let users: Map<string, UserPreferences> | undefined;
  if (typeof window !== "undefined") {
    users = browserUsers.get(window);
    if (!users) {
      users = new Map();
      browserUsers.set(window, users);
    }
  }
  let state = users?.get(userId);
  if (!state) {
    state = {
      spaces: read(userId, "spaces"),
      categories: read(userId, "categories"),
    };
    // Do not cache server defaults before browser storage is available.
    users?.set(userId, state);
  }
  return state;
}
export function setWorkSpacePreference(
  userId: string,
  kind: keyof UserPreferences,
  key: string,
  value: boolean,
): void {
  const state = getUser(userId);
  state[kind] = { ...state[kind], [key]: value };
  try {
    window.localStorage.setItem(
      storageKey(userId, kind),
      JSON.stringify(state[kind]),
    );
  } catch {
    /* Storage is optional. */
  }
  version++;
  listeners.forEach((listener) => listener());
}
export function useWorkSpacePreferences(
  userId: string,
  kind: keyof UserPreferences,
): Preferences {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getUser(userId)[kind];
}
