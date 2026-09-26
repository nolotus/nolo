import { flushSync } from "react-dom";
import {
  prefersReducedMotion,
  sanitizeViewTransitionKey,
} from "app/viewTransitions";

const SIDEBAR_VT_DATA_ATTRIBUTE = "data-nolo-sidebar-list-transition";
/**
 * Marker on every virtualized sidebar row (<ListBoxItem>) so the transition
 * runner can find mounted rows without knowing the collection. Value = the
 * item's contentKey (RAC ListBoxItem id).
 */
export const SIDEBAR_ROW_CONTENT_KEY_ATTRIBUTE = "data-content-key";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition | undefined;
};

/** Stable row name. Virtualized rows are the only callers, so mounted rows are visible/overscanned. */
export const sidebarRowViewTransitionName = (contentKey: string): string => {
  const safeKey = sanitizeViewTransitionKey(contentKey);
  return safeKey ? `sidebar-row-${safeKey}` : "";
};

export interface SidebarViewTransitionOptions {
  /**
   * Runs once when the transition lifecycle ends (finished or skip/abort —
   * i.e. the `finished` promise's finally), after the scope attribute and row
   * names have been cleaned up. Also invoked synchronously right after the
   * update when no native transition runs (SSR / reduced motion / missing
   * API). Use it for work that must happen strictly after the DOM update but
   * should not be part of the snapshot — e.g. remote sync.
   */
  onSettled?: () => void;
}

/**
 * Tag every mounted sidebar row with its per-item view-transition-name.
 * Called immediately before startViewTransition so the names only exist for
 * the duration of this transition — a permanently-named row set would force
 * every document-level VT (theme switch, route morph) to snapshot dozens of
 * sidebar rows and desync the theme reveal.
 */
const tagSidebarRowViewTransitionNames = (): HTMLElement[] => {
  const rows = Array.from(
    document.querySelectorAll<HTMLElement>(`[${SIDEBAR_ROW_CONTENT_KEY_ATTRIBUTE}]`),
  );
  for (const row of rows) {
    const key = row.getAttribute(SIDEBAR_ROW_CONTENT_KEY_ATTRIBUTE);
    const name = key ? sidebarRowViewTransitionName(key) : "";
    if (name) row.style.viewTransitionName = name;
  }
  return rows;
};

const clearSidebarRowViewTransitionNames = (rows: HTMLElement[]): void => {
  for (const row of rows) {
    // Only clear names we stamped — a row re-rendered mid-transition may
    // legitimately carry a different value.
    if (row.style.viewTransitionName.startsWith("sidebar-row-")) {
      row.style.viewTransitionName = "";
    }
  }
};

export function runSidebarViewTransition(
  update: () => void,
  options?: SidebarViewTransitionOptions,
): void {
  const onSettled = options?.onSettled;
  if (typeof document === "undefined" || prefersReducedMotion()) {
    update();
    onSettled?.();
    return;
  }
  const doc = document as ViewTransitionDocument;
  if (typeof doc.startViewTransition !== "function") {
    update();
    onSettled?.();
    return;
  }
  doc.documentElement.setAttribute(SIDEBAR_VT_DATA_ATTRIBUTE, "1");
  const taggedRows = tagSidebarRowViewTransitionNames();
  const transition = doc.startViewTransition(() => flushSync(update));
  Promise.resolve(transition?.finished)
    .catch(() => undefined)
    .finally(() => {
      doc.documentElement.removeAttribute(SIDEBAR_VT_DATA_ATTRIBUTE);
      clearSidebarRowViewTransitionNames(taggedRows);
      onSettled?.();
    });
}

export const SIDEBAR_VIEW_TRANSITION_DATA_ATTRIBUTE = SIDEBAR_VT_DATA_ATTRIBUTE;
