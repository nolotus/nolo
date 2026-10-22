/** Navigation V2 query focus. Not a Space membership or execution authority. */
export type NavigationScope =
  | { kind: "all" }
  | { kind: "space"; spaceId: string }
  | { kind: "project"; projectId: string };

export type NavigationView = "status" | "project" | "recent" | "category";
export type NavigationContentType =
  | "all" | "dialog" | "agent" | "app" | "page" | "table" | "attachment";

export interface NavigationCategoryRef {
  spaceId: string;
  categoryId: string;
}

export interface NavigationQuery {
  scope: NavigationScope;
  view: NavigationView;
  contentType: NavigationContentType;
  /** Only meaningful for category navigation; IDs are namespaced by Space. */
  category: NavigationCategoryRef | null;
}

export const DEFAULT_NAVIGATION_QUERY: NavigationQuery = {
  scope: { kind: "all" },
  view: "status",
  contentType: "all",
  category: null,
};

/** Never interpret empty or unknown query state as a selected Space. */
export function normalizeNavigationScope(scope: NavigationScope): NavigationScope {
  if (scope.kind === "all") return { kind: "all" };
  if (scope.kind === "space") {
    const spaceId = scope.spaceId.trim();
    return spaceId ? { kind: "space", spaceId } : { kind: "all" };
  }
  const projectId = scope.projectId.trim();
  return projectId ? { kind: "project", projectId } : { kind: "all" };
}

/**
 * Categories are namespaced by Space, so a category may only exist while its own
 * Space is the scope. Enforcing that here keeps "category view without a
 * category" from ever being a reachable state.
 */
function withCategory(
  state: NavigationQuery,
  category: NavigationCategoryRef | null,
): NavigationQuery {
  return {
    ...state,
    category,
    view: state.view === "category" && !category ? "status" : state.view,
  };
}

function categoryWithinScope(
  scope: NavigationScope,
  category: NavigationCategoryRef | null,
): NavigationCategoryRef | null {
  if (scope.kind !== "space" || !category) return null;
  return category.spaceId === scope.spaceId ? category : null;
}

/** Category is not global and does not transfer across Space/project scope changes. */
export function transitionNavigationQuery(
  previous: NavigationQuery,
  change:
    | { type: "scope"; scope: NavigationScope }
    | { type: "view"; view: NavigationView }
    | { type: "contentType"; contentType: NavigationContentType }
    | { type: "category"; category: NavigationCategoryRef | null },
): NavigationQuery {
  switch (change.type) {
    case "scope": {
      const scope = normalizeNavigationScope(change.scope);
      return withCategory(
        { ...previous, scope },
        categoryWithinScope(scope, previous.category),
      );
    }
    case "view": {
      const category = change.view === "category"
        ? categoryWithinScope(previous.scope, previous.category)
        : null;
      return withCategory({ ...previous, view: change.view }, category);
    }
    case "contentType":
      return { ...previous, contentType: change.contentType };
    case "category": {
      const category = change.category;
      if (
        !category ||
        previous.scope.kind !== "space" ||
        previous.scope.spaceId !== category.spaceId ||
        !category.categoryId.trim()
      ) {
        return withCategory(previous, null);
      }
      return withCategory(
        { ...previous, view: "category" },
        { spaceId: category.spaceId, categoryId: category.categoryId.trim() },
      );
    }
  }
}

/** A record is visible within the selected filter only; this is not an authorization check. */
export function matchesNavigationScope(
  scope: NavigationScope,
  target: { spaceId?: string | null; projectId?: string | null },
): boolean {
  if (scope.kind === "all") return true;
  if (scope.kind === "space") return target.spaceId === scope.spaceId;
  return target.projectId === scope.projectId;
}

/** Explicit all-scope ignores ownership labels; callers must pre-filter by permissions. */
export function filterNavigationItems<T extends { spaceId?: string | null; projectId?: string | null }>(
  items: readonly T[], scope: NavigationScope,
): T[] {
  return items.filter((item) => matchesNavigationScope(scope, item));
}
