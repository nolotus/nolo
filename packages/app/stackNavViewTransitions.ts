import { enableNextRouteViewTransition, prefersReducedMotion } from "./viewTransitions";

/**
 * Stack-Navigator style route View Transitions (Morph UI pattern).
 *
 * Direction semantics:
 *   "push" — navigating deeper (content list → dialog detail). New page
 *            slides in from the right over the old one.
 *   "pop"  — going back (dialog detail → content list). Old page slides
 *            out to the right, revealing the list underneath.
 *
 * The router (routing/index.tsx) auto-arms these on PUSH/POP navigations
 * whose path pair satisfies `stackNavDirectionForPaths` — mirroring the
 * plaza↔detail `shouldAutoRouteViewTransition` precedent. Callers that
 * navigate programmatically may also opt in explicitly via
 * `enableNextStackNavViewTransition`.
 *
 * Direction is published on <html> as `data-nolo-stack-nav="push|pop"` so
 * the CSS in chat/web/stackNavViewTransition.css can pick the animation
 * pair. The router clears both attributes on transition.finished.
 *
 * Degradation: reduced motion, missing document, or no startViewTransition
 * all no-op here (the underlying flag setter already guards), and browsers
 * without VT simply ignore the data attributes / CSS.
 */

export type StackNavDirection = "push" | "pop";

const STACK_NAV_ATTR = "noloStackNav";

/** True when the pathname is a dialog detail route (`/dialog-*`, incl. /space/<id>/dialog-*). */
export const isDialogDetailPath = (pathname: string): boolean => {
  if (!pathname) return false;
  const clean = pathname.split("?")[0].split("#")[0];
  const segments = clean.split("/").filter(Boolean);
  if (segments.length === 0) return false;
  let last = segments[segments.length - 1];
  try {
    last = decodeURIComponent(last);
  } catch {
    // keep raw segment
  }
  // Match PageLoader's dispatch rule (pageKey.startsWith("dialog")), but
  // exclude the literal list routes "dialog"/"dialogs" — those are the
  // collection pages, not a detail view.
  if (last === "dialog" || last === "dialogs") return false;
  return last.startsWith("dialog");
};

/**
 * Classify a route pair for the stack-nav transition.
 *   push: non-detail → dialog-detail
 *   pop : dialog-detail → non-detail
 * Returns null when the pair is not a stack-nav edge (same path, detail→detail,
 * list→list), so unrelated route changes keep their existing behavior.
 */
export const stackNavDirectionForPaths = (
  fromPathname: string,
  toPathname: string,
): StackNavDirection | null => {
  if (!fromPathname || !toPathname) return null;
  const from = fromPathname.split("?")[0];
  const to = toPathname.split("?")[0];
  if (from === to) return null;
  const fromDetail = isDialogDetailPath(from);
  const toDetail = isDialogDetailPath(to);
  if (!fromDetail && toDetail) return "push";
  if (fromDetail && !toDetail) return "pop";
  return null;
};

/**
 * Read + clear the pending direction flag set by the router/auto-detector.
 * Kept minimal: direction is always derived fresh per navigation, so there is
 * no persistent module state to keep in sync.
 */
export const setStackNavDirection = (dir: StackNavDirection | null): void => {
  if (typeof document === "undefined") return;
  try {
    if (dir) {
      document.documentElement.dataset[STACK_NAV_ATTR] = dir;
    } else {
      delete document.documentElement.dataset[STACK_NAV_ATTR];
    }
  } catch {
    // ignore — dataset may be unavailable in exotic environments
  }
};

export const clearStackNavDirection = (): void => setStackNavDirection(null);

/**
 * Explicit opt-in for the next navigation: arms the route-VT flag AND stamps
 * the direction. Equivalent to the router's auto-detect, use it for
 * programmatic navigate() calls when you already know the intent.
 * Safe no-op under SSR / reduced motion / missing VT API.
 */
export const enableNextStackNavViewTransition = (
  dir: StackNavDirection,
): void => {
  if (typeof document === "undefined") return;
  if (prefersReducedMotion()) return;
  enableNextRouteViewTransition();
  if (document.documentElement.dataset.noloRouteViewTransition === "1") {
    setStackNavDirection(dir);
  }
};
