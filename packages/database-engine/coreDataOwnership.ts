const CORE_PREFIXES = [
  "user:",
  "space-",
  "space-member-",
  "user-pref-",
];

export function classifyCoreDataKey(dbKey: string): { owner: "core" | "overlay" } {
  return CORE_PREFIXES.some((prefix) => dbKey.startsWith(prefix))
    ? { owner: "core" }
    : { owner: "overlay" };
}
