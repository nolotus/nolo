import {
  normalizeSidebarVisibleTypes,
  type SidebarVisibleType,
} from "./sidebarVisibleTypes";

export const PUBLIC_CATALOG_SPACE_ID = "01KKY77TT0DA9NY7TNW3R7255N";

export function isPublicCatalogSpace(spaceId?: string | null): boolean {
  return typeof spaceId === "string" && spaceId.trim() === PUBLIC_CATALOG_SPACE_ID;
}

export function ensurePublicCatalogVisibleTypes(
  spaceId: string | null | undefined,
  visibleTypes: readonly SidebarVisibleType[],
): SidebarVisibleType[] {
  const normalized = normalizeSidebarVisibleTypes(visibleTypes);
  if (!isPublicCatalogSpace(spaceId) || normalized.includes("agent")) {
    return normalized;
  }
  return normalizeSidebarVisibleTypes([...normalized, "agent"]);
}

export function resolvePersistedCatalogVisibleTypes(
  spaceId: string | null | undefined,
  nextVisibleTypes: readonly SidebarVisibleType[],
  persistedVisibleTypes: readonly SidebarVisibleType[],
): SidebarVisibleType[] {
  const normalizedNext = normalizeSidebarVisibleTypes(nextVisibleTypes);
  if (!isPublicCatalogSpace(spaceId)) {
    return normalizedNext;
  }

  const normalizedPersisted = normalizeSidebarVisibleTypes(persistedVisibleTypes);
  if (normalizedPersisted.includes("agent")) {
    return normalizedNext;
  }

  return normalizedNext.filter((type) => type !== "agent");
}
