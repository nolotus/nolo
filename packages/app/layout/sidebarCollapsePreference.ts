/** Device UI preference. No Redux and no user/account data migration. */
const KEY = "nolo:sidebar-collapse-hint:v1";
const SEEN = "nolo:sidebar-collapse-hint-seen:v1";
export function isSidebarCollapseHintEnabled(storage: Pick<Storage, "getItem">): boolean {
  return storage.getItem(KEY) !== "off";
}
export function setSidebarCollapseHintEnabled(storage: Pick<Storage, "setItem">, enabled: boolean) {
  storage.setItem(KEY, enabled ? "on" : "off");
}
export function shouldShowFirstSidebarCollapseHint(storage: Pick<Storage, "getItem" | "setItem">): boolean {
  if (storage.getItem(SEEN) === "yes") return false;
  storage.setItem(SEEN, "yes");
  return isSidebarCollapseHintEnabled(storage);
}
