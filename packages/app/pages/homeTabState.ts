import { normalizeHomeTabId, type HomeTabId } from "../constants/homeTabs";
export type { HomeTabId } from "../constants/homeTabs";

export const HOME_GUEST_DEFAULT_TAB: HomeTabId = "communityAI";
export const HOME_AUTH_DEFAULT_TAB: HomeTabId = "communityAI";
export const HOME_TAB_STORAGE_KEY = "home-last-tab";

type HomeTabStorage = Pick<Storage, "getItem" | "setItem">;

export function normalizeHomeTabForAccess(
  activeTab: HomeTabId,
  showAuthedHome: boolean
): HomeTabId {
  if (
    !showAuthedHome &&
    (activeTab === "myContent" || activeTab === "myFav" || activeTab === "usage")
  ) {
    return HOME_GUEST_DEFAULT_TAB;
  }

  return activeTab;
}

export function resolveHomeTabForDisplay(
  rememberedTab: unknown,
  showAuthedHome: boolean
): HomeTabId {
  const normalizedRememberedTab = normalizeHomeTabId(rememberedTab);
  if (normalizedRememberedTab) {
    return normalizeHomeTabForAccess(normalizedRememberedTab, showAuthedHome);
  }

  return showAuthedHome ? HOME_AUTH_DEFAULT_TAB : HOME_GUEST_DEFAULT_TAB;
}

export function readStoredHomeTab(
  storage: HomeTabStorage | null | undefined
): HomeTabId | undefined {
  if (!storage) return undefined;

  try {
    return normalizeHomeTabId(storage.getItem(HOME_TAB_STORAGE_KEY));
  } catch (error) {
    console.warn("[Home] 读取首页标签缓存失败:", error);
    return undefined;
  }
}

export function writeStoredHomeTab(
  tabId: HomeTabId,
  storage: HomeTabStorage | null | undefined
) {
  if (!storage) return;

  try {
    storage.setItem(HOME_TAB_STORAGE_KEY, tabId);
  } catch (error) {
    console.warn("[Home] 保存首页标签缓存失败:", error);
  }
}
