import type React from "react";

/**
 * Card shared-element View Transition helpers.
 *
 * Name rule (stable, shared by Space cards + Agent list/detail):
 *   icon    → `card-icon-${sanitize(key)}`
 *   title   → `card-title-${sanitize(key)}`
 *   surface → `card-surface-${sanitize(key)}` (optional card shell zoom)
 *
 * Callers must use the same content/db key on list and detail ends so names
 * match. Prefer omitting names (enabled:false / selection mode / reduced
 * motion) over inventing a second naming scheme.
 *
 * Safe without View Transition API support: browsers ignore the CSS property.
 */

export type ViewTransitionStyleOptions = {
  /**
   * When false, omit the style so the element does not participate.
   * Use this for non-active rows, selection mode, or to avoid dual-mount
   * name collisions (e.g. sidebar + detail both mounted for the same key).
   */
  enabled?: boolean;
};

/** CSS <custom-ident> safe fragment for view-transition-name. */
export const sanitizeViewTransitionKey = (key: string): string => {
  if (!key) return "";
  return key
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
};

export const cardIconViewTransitionName = (key: string): string => {
  const safe = sanitizeViewTransitionKey(key);
  return safe ? `card-icon-${safe}` : "";
};

export const cardTitleViewTransitionName = (key: string): string => {
  const safe = sanitizeViewTransitionKey(key);
  return safe ? `card-title-${safe}` : "";
};

export const cardSurfaceViewTransitionName = (key: string): string => {
  const safe = sanitizeViewTransitionKey(key);
  return safe ? `card-surface-${safe}` : "";
};

let reducedMotionCached: boolean | null = null;
let reducedMotionSubscribed = false;

const resolveMatchMedia = ():
  | ((query: string) => MediaQueryList)
  | null => {
  const g = globalThis as typeof globalThis & {
    matchMedia?: (query: string) => MediaQueryList;
    window?: { matchMedia?: (query: string) => MediaQueryList };
  };
  if (typeof g.matchMedia === "function") return g.matchMedia.bind(g);
  if (g.window && typeof g.window.matchMedia === "function") {
    return g.window.matchMedia.bind(g.window);
  }
  return null;
};

/** SSR-safe prefers-reduced-motion probe (module-cached + live updates). */
export const prefersReducedMotion = (): boolean => {
  if (reducedMotionCached !== null) {
    return reducedMotionCached;
  }
  const matchMedia = resolveMatchMedia();
  if (!matchMedia) return false;
  try {
    const mql = matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionCached = mql.matches;
    if (!reducedMotionSubscribed && typeof mql.addEventListener === "function") {
      reducedMotionSubscribed = true;
      mql.addEventListener("change", (event) => {
        reducedMotionCached = event.matches;
      });
    }
    return reducedMotionCached;
  } catch {
    return false;
  }
};

/** Test-only: reset reduced-motion cache between cases. */
export const resetPrefersReducedMotionCacheForTests = (): void => {
  reducedMotionCached = null;
  reducedMotionSubscribed = false;
};

/**
 * Build a React style with `viewTransitionName` when a name is present and
 * enabled. Returns undefined under reduced motion so elements do not join
 * shared-element captures.
 */
export const viewTransitionStyle = (
  name: string | null | undefined,
  options?: ViewTransitionStyleOptions
): React.CSSProperties | undefined => {
  if (!name || options?.enabled === false) return undefined;
  if (prefersReducedMotion()) return undefined;
  return { viewTransitionName: name };
};

/**
 * Icon + title styles for one content key. Empty object when the key is
 * missing, disabled, or reduced-motion is preferred.
 */
export const cardViewTransitionStyles = (
  key: string | null | undefined,
  options?: ViewTransitionStyleOptions
): {
  icon?: React.CSSProperties;
  title?: React.CSSProperties;
  surface?: React.CSSProperties;
} => {
  if (!key || options?.enabled === false || prefersReducedMotion()) {
    return {};
  }
  const iconName = cardIconViewTransitionName(key);
  const titleName = cardTitleViewTransitionName(key);
  const surfaceName = cardSurfaceViewTransitionName(key);
  return {
    icon: viewTransitionStyle(iconName),
    title: viewTransitionStyle(titleName),
    surface: viewTransitionStyle(surfaceName),
  };
};

/** Path pairs that should auto-enable route VT on browser Back/Forward. */
export const isAgentDetailPath = (pathname: string): boolean => {
  if (!pathname || pathname === "/") return false;
  const first = pathname.split("/").filter(Boolean)[0] || "";
  return (
    first.startsWith("agent-") || first.startsWith("agent-pub-")
  );
};

export const isAgentPlazaPath = (pathname: string): boolean => {
  if (!pathname) return false;
  if (pathname === "/" || pathname === "") return true;
  return pathname === "/explore" || pathname.startsWith("/explore/");
};

export const shouldAutoRouteViewTransition = (
  fromPathname: string,
  toPathname: string
): boolean => {
  if (fromPathname === toPathname) return false;
  const fromDetail = isAgentDetailPath(fromPathname);
  const toDetail = isAgentDetailPath(toPathname);
  const fromPlaza = isAgentPlazaPath(fromPathname);
  const toPlaza = isAgentPlazaPath(toPathname);
  return (fromDetail && toPlaza) || (fromPlaza && toDetail);
};

/** Shared view-transition-name for home quick chat -> dialog composer morph */
export const QUICK_CHAT_COMPOSER_VT_NAME = "quick-chat-composer";

/**
 * Opt in to the next SPA route update's `document.startViewTransition`.
 *
 * Route-level VT is off by default (see routing + performance plan). Card →
 * detail shared-element morphs set this flag immediately before `navigate` /
 * `<Link>` left-click. The router clears the flag when the transition
 * `finished` (not on microtask) so scoped VT CSS still applies during the
 * ~300ms morph window.
 *
 * Safe no-op under SSR, reduced motion, or missing View Transition API.
 */
export const enableNextRouteViewTransition = (): void => {
  if (typeof document === "undefined") return;
  if (prefersReducedMotion()) return;
  const doc = document as Document & {
    startViewTransition?: (callback: () => void) => unknown;
  };
  if (typeof doc.startViewTransition !== "function") return;

  doc.documentElement.dataset.noloRouteViewTransition = "1";
};
