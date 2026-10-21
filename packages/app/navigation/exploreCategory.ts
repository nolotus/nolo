/** Explore destination categories. Stable URLs support deep links/back navigation. */
export const EXPLORE_CATEGORIES = [
  "agent",
  "dialog",
  "article",
  "user",
  "plugin",
  "skill",
  "my-shares",
] as const;

export type ExploreCategory = (typeof EXPLORE_CATEGORIES)[number];

const DEFAULT_CATEGORY: ExploreCategory = "agent";

/** Read `?category=` from a location search string; unknown values fall back to Agent. */
export function resolveExploreCategory(search: string): ExploreCategory {
  const raw = new URLSearchParams(search).get("category");
  return EXPLORE_CATEGORIES.find((item) => item === raw) ?? DEFAULT_CATEGORY;
}

/** Canonical Explore URL for a category (deep-linkable, back/forward safe). */
export function exploreCategoryPath(category: ExploreCategory): string {
  return `/explore?category=${category}`;
}
