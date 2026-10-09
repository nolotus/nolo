import { flushSync } from "react-dom";
import {
  cardIconViewTransitionName,
  cardTitleViewTransitionName,
  prefersReducedMotion,
  sanitizeViewTransitionKey,
} from "app/viewTransitions";

export const SPACE_CONTENT_KEY_ATTRIBUTE = "data-space-content-key";
const SPACE_CONTENT_VT_ATTRIBUTE = "data-space-content-transition";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => ViewTransition | undefined;
};

export const spaceContentViewTransitionName = (key: string): string => {
  const safe = sanitizeViewTransitionKey(key);
  return safe ? `space-content-${safe}` : "";
};

const tagSpaceContent = (): HTMLElement[] => {
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(`[${SPACE_CONTENT_KEY_ATTRIBUTE}]`),
  );
  for (const node of nodes) {
    const key = node.getAttribute(SPACE_CONTENT_KEY_ATTRIBUTE);
    const name = key ? spaceContentViewTransitionName(key) : "";
    if (name) node.style.viewTransitionName = name;
  }
  return nodes;
};

const clearSpaceContentNames = (nodes: HTMLElement[]): void => {
  for (const node of nodes) {
    if (node.style.viewTransitionName.startsWith("space-content-")) {
      node.style.viewTransitionName = "";
    }
  }
  // A newly mounted node may not be in the original list (e.g. an upload).
  document
    .querySelectorAll<HTMLElement>(`[${SPACE_CONTENT_KEY_ATTRIBUTE}]`)
    .forEach((node) => {
      if (node.style.viewTransitionName.startsWith("space-content-")) {
        node.style.viewTransitionName = "";
      }
    });
};

/**
 * Stamps a specific mounted node with its own collection name for one
 * transition. Unlike tagSpaceContent (which re-derives names for all nodes),
 * this is used inside a transition update to pin the old snapshot of a node
 * whose removal is pending on an async task.
 */
export const captureSpaceContentNode = (node: HTMLElement | null): void => {
  if (!node) return;
  const key = node.getAttribute(SPACE_CONTENT_KEY_ATTRIBUTE);
  if (!key) return;
  const name = spaceContentViewTransitionName(key);
  if (name) node.style.viewTransitionName = name;
};

/* ── Card morph names (icon/title shared-element) ──────────────────────────
 * Regression fix: wave-1 content cards morphed into the detail page via the
 * shared `card-icon-*`/`card-title-*` names. Wave-2 removed them entirely
 * (idle-zero rule), which broke the morph. Restore them but only for the
 * duration of a real route transition — stamped inside handleOpen right
 * before `enableNextRouteViewTransition`, cleared when the route VT finishes.
 * Direct DOM stamping avoids relying on a React render before the snapshot.
 */

const findSpaceContentCard = (contentKey: string): HTMLElement | null => {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(
    `[${SPACE_CONTENT_KEY_ATTRIBUTE}="${cssEscapeKey(contentKey)}"]`
  );
};

/** CSS.escape with a fallback for test DOMs that omit it (JSDOM). */
export const cssEscapeKey = (key: string): string => {
  const css = (globalThis as { CSS?: typeof CSS }).CSS;
  return typeof css?.escape === "function" ? css.escape(key) : key.replace(/"/g, '\\"');
};

const CARD_MORPH_ICON_SELECTOR =
  ".content-block__icon-wrapper, .content-block__img, .item-icon";
const CARD_MORPH_TITLE_SELECTOR =
  ".content-block__title, .item-title";

const CARD_MORPH_MAX_MS = 2000;

/**
 * Stamp `card-icon-*` / `card-title-*` on the card for `contentKey`.
 * Names are self-clearing: a MutationObserver watches for the router clearing
 * `data-nolo-route-view-transition` (route VT finished), with a 2s timer as
 * backstop when navigation is not VT'd or the API is missing. Returned
 * cleanup forces immediate removal (e.g. caller aborts before navigate).
 */
export const stampSpaceContentCardMorphNames = (
  contentKey: string
): (() => void) => {
  const card = findSpaceContentCard(contentKey);
  if (!card) return () => undefined;
  const iconName = cardIconViewTransitionName(contentKey);
  const titleName = cardTitleViewTransitionName(contentKey);
  const iconEl = card.querySelector<HTMLElement>(CARD_MORPH_ICON_SELECTOR);
  const titleEl = card.querySelector<HTMLElement>(CARD_MORPH_TITLE_SELECTOR);
  if (iconEl && iconName) iconEl.style.viewTransitionName = iconName;
  if (titleEl && titleName) titleEl.style.viewTransitionName = titleName;

  let cleaned = false;
  const clearNames = () => {
    if (iconEl && iconEl.style.viewTransitionName === iconName) {
      iconEl.style.viewTransitionName = "";
    }
    if (titleEl && titleEl.style.viewTransitionName === titleName) {
      titleEl.style.viewTransitionName = "";
    }
  };
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    observer?.disconnect();
    if (timer) clearTimeout(timer);
    clearNames();
  };

  const rootEl = card.ownerDocument?.documentElement;
  let observer: MutationObserver | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  if (rootEl && typeof MutationObserver !== "undefined") {
    observer = new MutationObserver(() => {
      if (!rootEl.hasAttribute("data-nolo-route-view-transition")) cleanup();
    });
    observer.observe(rootEl, {
      attributes: true,
      attributeFilter: ["data-nolo-route-view-transition"],
    });
  }
  timer = setTimeout(cleanup, CARD_MORPH_MAX_MS);
  if (typeof timer === "object" && typeof timer.unref === "function") {
    timer.unref();
  }
  return cleanup;
};

/**
 * Runs a synchronous content collection update as a document VT. Names are
 * deliberately stamped only for this lifecycle, never left on idle cards.
 */
export function runSpaceContentViewTransition(update: () => void): void {
  if (
    typeof document === "undefined" ||
    prefersReducedMotion() ||
    typeof (document as ViewTransitionDocument).startViewTransition !== "function"
  ) {
    update();
    return;
  }

  const doc = document as ViewTransitionDocument;
  doc.documentElement.setAttribute(SPACE_CONTENT_VT_ATTRIBUTE, "1");
  const oldNodes = tagSpaceContent();
  const transition = doc.startViewTransition(() => {
    flushSync(() => {
      update();
      // This captures additions in the new snapshot while removed nodes are
      // represented by the old snapshot automatically.
      tagSpaceContent();
    });
  });
  Promise.resolve(transition?.finished)
    .catch(() => undefined)
    .finally(() => {
      doc.documentElement.removeAttribute(SPACE_CONTENT_VT_ATTRIBUTE);
      clearSpaceContentNames(oldNodes);
    });
}
