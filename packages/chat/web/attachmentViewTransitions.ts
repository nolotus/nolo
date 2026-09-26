import { flushSync } from "react-dom";
import {
  prefersReducedMotion,
  sanitizeViewTransitionKey,
} from "app/viewTransitions";

export const ATTACHMENT_ITEM_KEY_ATTRIBUTE = "data-attachment-key";
export const ATTACHMENT_VT_DATA_ATTRIBUTE = "data-nolo-attachment-transition";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => {
    finished?: Promise<void>;
  } | undefined;
};

/**
 * Stable custom-ident for an attachment thumbnail in the composer.
 */
export const attachmentThumbViewTransitionName = (key: string): string => {
  const safe = sanitizeViewTransitionKey(key);
  return safe ? `attachment-thumb-${safe}` : "";
};

export interface AttachmentViewTransitionOptions {
  /**
   * Invoked once after the transition finishes (or synchronous fallback).
   */
  onSettled?: () => void;
}

/**
 * Tag every mounted attachment thumbnail with its per-item view-transition-name.
 * Enforces per-frame uniqueness: duplicate keys will not receive duplicate names.
 */
export const tagAttachmentViewTransitionNames = (): HTMLElement[] => {
  if (typeof document === "undefined") return [];
  const nodes = Array.from(
    document.querySelectorAll<HTMLElement>(`[${ATTACHMENT_ITEM_KEY_ATTRIBUTE}]`),
  );
  const seenNames = new Set<string>();
  const tagged: HTMLElement[] = [];

  for (const node of nodes) {
    const key = node.getAttribute(ATTACHMENT_ITEM_KEY_ATTRIBUTE);
    if (!key) continue;
    const name = attachmentThumbViewTransitionName(key);
    if (!name) continue;
    if (seenNames.has(name)) continue;
    seenNames.add(name);
    node.style.viewTransitionName = name;
    tagged.push(node);
  }

  return tagged;
};

/**
 * Strip view-transition-name from tagged nodes and any remaining DOM nodes.
 * Guarantees zero lingering names at resting state.
 */
export const clearAttachmentViewTransitionNames = (nodes?: HTMLElement[]): void => {
  if (typeof document === "undefined") return;
  if (nodes) {
    for (const node of nodes) {
      if (node.style.viewTransitionName.startsWith("attachment-thumb-")) {
        node.style.viewTransitionName = "";
      }
    }
  }
  const remaining = document.querySelectorAll<HTMLElement>(`[${ATTACHMENT_ITEM_KEY_ATTRIBUTE}]`);
  for (const node of remaining) {
    if (node.style.viewTransitionName.startsWith("attachment-thumb-")) {
      node.style.viewTransitionName = "";
    }
  }
};

/**
 * Runs a state update affecting composer attachment thumbnails with View Transitions.
 * Lifecycle:
 * 1. Stamp names on current thumbnail elements before snapshot.
 * 2. startViewTransition captures old state.
 * 3. flushSync applies state update and stamps names on new/retained nodes.
 * 4. Browser captures new state and plays pop in / shrink away / FLIP.
 * 5. On finish, strip all names and cleanup scope attribute.
 */
export function runAttachmentViewTransition(
  update: () => void,
  options?: AttachmentViewTransitionOptions,
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

  doc.documentElement.setAttribute(ATTACHMENT_VT_DATA_ATTRIBUTE, "1");
  const oldNodes = tagAttachmentViewTransitionNames();

  try {
    const transition = doc.startViewTransition(() => {
      flushSync(() => {
        update();
      });
      // Capture additions in the new snapshot while removed nodes are captured from old
      tagAttachmentViewTransitionNames();
    });

    Promise.resolve(transition?.finished)
      .catch(() => undefined)
      .finally(() => {
        try {
          doc.documentElement.removeAttribute(ATTACHMENT_VT_DATA_ATTRIBUTE);
          clearAttachmentViewTransitionNames(oldNodes);
        } finally {
          onSettled?.();
        }
      });
  } catch {
    doc.documentElement.removeAttribute(ATTACHMENT_VT_DATA_ATTRIBUTE);
    clearAttachmentViewTransitionNames(oldNodes);
    onSettled?.();
  }
}
