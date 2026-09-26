import { flushSync } from "react-dom";
import {
  prefersReducedMotion,
  sanitizeViewTransitionKey,
} from "app/viewTransitions";

const SIDEBAR_VT_DATA_ATTRIBUTE = "data-nolo-sidebar-list-transition";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition | undefined;
};

/** Stable row name. Virtualized rows are the only callers, so mounted rows are visible/overscanned. */
export const sidebarRowViewTransitionName = (contentKey: string): string => {
  const safeKey = sanitizeViewTransitionKey(contentKey);
  return safeKey ? `sidebar-row-${safeKey}` : "";
};

export function runSidebarViewTransition(update: () => void): void {
  if (typeof document === "undefined" || prefersReducedMotion()) {
    update();
    return;
  }
  const doc = document as ViewTransitionDocument;
  if (typeof doc.startViewTransition !== "function") {
    update();
    return;
  }
  doc.documentElement.setAttribute(SIDEBAR_VT_DATA_ATTRIBUTE, "1");
  const transition = doc.startViewTransition(() => flushSync(update));
  Promise.resolve(transition?.finished)
    .catch(() => undefined)
    .finally(() => doc.documentElement.removeAttribute(SIDEBAR_VT_DATA_ATTRIBUTE));
}

export const SIDEBAR_VIEW_TRANSITION_DATA_ATTRIBUTE = SIDEBAR_VT_DATA_ATTRIBUTE;
