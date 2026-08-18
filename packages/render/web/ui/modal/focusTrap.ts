// 文件路径: render/web/ui/modal/focusTrap.ts
// Pure helpers for modal focus trap / restore. No React dependency.

/** Tab-order candidates inside a modal content root. */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

/**
 * Stack of open BaseModal layers. Only the topmost layer handles
 * Tab trap and Escape so nested modals do not fight.
 */
const modalLayerStack: number[] = [];
let nextLayerId = 0;

export function pushModalLayer(): number {
  const id = ++nextLayerId;
  modalLayerStack.push(id);
  return id;
}

export function popModalLayer(id: number): void {
  const idx = modalLayerStack.lastIndexOf(id);
  if (idx !== -1) modalLayerStack.splice(idx, 1);
}

export function isTopModalLayer(id: number): boolean {
  return modalLayerStack.length > 0 && modalLayerStack[modalLayerStack.length - 1] === id;
}

/** Test / reset helper — not used by production UI. */
export function resetModalLayerStack(): void {
  modalLayerStack.length = 0;
  nextLayerId = 0;
}

export function isElementVisible(el: HTMLElement): boolean {
  if (el.hidden) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.closest("[hidden],[aria-hidden='true']")) return false;

  // Prefer CSS when available. Skip layout geometry checks — JSDOM and
  // some headless envs report offsetParent=null / empty client rects for
  // otherwise tabbable controls, which would empty the trap set.
  if (typeof window !== "undefined") {
    try {
      const style = window.getComputedStyle(el);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse"
      ) {
        return false;
      }
    } catch {
      // getComputedStyle can throw on detached nodes in some envs
    }
  }

  return true;
}

/**
 * Collect tabbable elements inside `container` in document order.
 * Excludes disabled / hidden / aria-hidden nodes and negative tabindex.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const nodes = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
  const result: HTMLElement[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    if (el.tabIndex < 0) continue;
    if ((el as HTMLButtonElement).disabled) continue;
    if (!isElementVisible(el)) continue;
    result.push(el);
  }
  return result;
}

/** Safe focus restore after modal close. */
export function restoreFocus(el: HTMLElement | null | undefined): void {
  if (!el) return;
  try {
    // Use the element's own document so multi-realm (JSDOM) checks work.
    const doc = el.ownerDocument ?? document;
    if (typeof el.focus === "function" && doc.contains(el)) {
      el.focus({ preventScroll: true });
    }
  } catch {
    // Element may be detached or not focusable; ignore.
  }
}

/**
 * Initial focus when nothing inside the modal is focused yet.
 * Prefer first tabbable control; fall back to container (tabIndex=-1).
 */
export function focusInitial(container: HTMLElement): void {
  const active = container.ownerDocument?.activeElement ?? document.activeElement;
  if (active && container.contains(active)) return;

  const focusable = getFocusableElements(container);
  const target = focusable[0] ?? container;
  try {
    if (target === container && container.tabIndex < 0) {
      container.tabIndex = -1;
    }
    target.focus({ preventScroll: true });
  } catch {
    // ignore
  }
}

/**
 * Handle Tab / Shift+Tab inside a trap root. Returns true if the event
 * was handled (caller should preventDefault).
 */
export function handleTabKey(
  event: Pick<KeyboardEvent, "key" | "shiftKey" | "preventDefault">,
  container: HTMLElement
): boolean {
  if (event.key !== "Tab") return false;

  const focusable = getFocusableElements(container);

  if (focusable.length === 0) {
    event.preventDefault();
    try {
      container.focus({ preventScroll: true });
    } catch {
      // ignore
    }
    return true;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  // Avoid `instanceof Node` — fails across JSDOM / multi-realm documents.
  const activeInside = !!active && container.contains(active);

  if (event.shiftKey) {
    if (!activeInside || active === first) {
      event.preventDefault();
      last.focus();
      return true;
    }
  } else if (!activeInside || active === last) {
    event.preventDefault();
    first.focus();
    return true;
  }

  return false;
}
