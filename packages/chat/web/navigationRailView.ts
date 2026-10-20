import { isSpaceRoutePath } from "render/layout/mainLayoutViewMode";

/**
 * Navigation V2 — primary Rail destinations and Home sub-views.
 *
 * Product contract (Navigation V2 first batch):
 *   Rail    = Home / Favorites / Explore   (global, one level)
 *   Context = the current destination's content and filters
 *   Work and Projects are two *views of Home*, never two Rail entries.
 *
 * The Rail is route-driven on purpose: a local `useState` copy of the active
 * destination drifts from the URL as soon as the user navigates (e.g. the
 * Explore page, or /favorites), which leaves the highlighted item pointing at
 * a screen the user is no longer on.
 */

/** Primary Rail destinations. */
export type RailView = "home" | "favorites" | "explore";

/** Home content views (a filter of Home, never Rail destinations). */
export type HomeView = "work" | "projects";

/** Route of each Rail destination. */
export const RAIL_VIEW_PATHS: Record<RailView, string> = {
  home: "/",
  favorites: "/favorites",
  explore: "/explore",
};

/**
 * Derive the active Rail destination from the current pathname.
 *
 * Space/Project scoped routes stay on Home: the Rail is global and keeps the
 * same level-1 navigation in every scope.
 */
export function resolveRailView(pathname: string | undefined | null): RailView {
  if (!pathname) return "home";
  if (pathname === RAIL_VIEW_PATHS.favorites) return "favorites";
  if (
    pathname === RAIL_VIEW_PATHS.explore ||
    pathname.startsWith(`${RAIL_VIEW_PATHS.explore}/`)
  ) {
    return "explore";
  }
  return "home";
}

/** Normalise a Home view value coming from state or storage. */
export function resolveHomeView(value: unknown): HomeView {
  return value === "projects" ? "projects" : "work";
}

/**
 * Home 点击时是否需要**延后**把作用域切回 all。
 *
 * MainLayout 在 Space 路由上会强制 viewMode=categories；若同一次事件里既
 * 改 store 又换路由，两边会在同一轮渲染互相覆盖，可能残留 categories 状态。
 * 只有当前仍在 Space 路由上时才需要延后到路由离开之后再切。
 */
export function needsDeferredScopeReset(pathname: string | undefined | null): boolean {
  if (!pathname) return false;
  return isSpaceRoutePath(pathname);
}
