// 文件路径: render/web/ui/modal/useFocusTrap.ts

import { useEffect, useRef, type RefObject } from "react";
import {
  focusInitial,
  handleTabKey,
  isTopModalLayer,
  popModalLayer,
  pushModalLayer,
  restoreFocus,
} from "./focusTrap";

/**
 * Focus trap for BaseModal:
 * - Records document.activeElement when the layer becomes active
 * - Traps Tab / Shift+Tab inside `contentRef`
 * - Escape calls `onEscape` only for the topmost open modal
 * - Restores previous focus when the layer deactivates (isOpen → false)
 *
 * Dialog / BaseActionModal own their preferred initial focus (last action
 * button, autofocus inputs). This hook only focuses the container when
 * nothing inside has taken focus yet, so those effects can still win.
 */
export function useFocusTrap(
  active: boolean,
  contentRef: RefObject<HTMLElement | null>,
  onEscape: () => void
): void {
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const layerIdRef = useRef<number | null>(null);
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  // Activate / deactivate layer: capture + restore focus, register stack.
  useEffect(() => {
    if (!active) return;

    const prev = document.activeElement;
    // Prefer duck-typing over instanceof HTMLElement (JSDOM multi-realm).
    previouslyFocusedRef.current =
      prev && typeof (prev as HTMLElement).focus === "function"
        ? (prev as HTMLElement)
        : null;

    const layerId = pushModalLayer();
    layerIdRef.current = layerId;

    // Give Dialog / BaseActionModal (50ms timers) and autofocus a chance
    // first; only claim focus if nothing inside the content is focused.
    const timer = window.setTimeout(() => {
      const content = contentRef.current;
      if (!content) return;
      if (!isTopModalLayer(layerId)) return;
      focusInitial(content);
    }, 60);

    return () => {
      window.clearTimeout(timer);
      popModalLayer(layerId);
      if (layerIdRef.current === layerId) {
        layerIdRef.current = null;
      }
      const toRestore = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      restoreFocus(toRestore);
    };
  }, [active, contentRef]);

  // Keydown: Tab trap + Escape for topmost layer only.
  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const layerId = layerIdRef.current;
      if (layerId === null || !isTopModalLayer(layerId)) return;

      if (event.key === "Escape") {
        // Stop other open layers / document handlers from also closing.
        event.stopPropagation();
        onEscapeRef.current();
        return;
      }

      if (event.key !== "Tab") return;

      const content = contentRef.current;
      if (!content) return;
      handleTabKey(event, content);
    };

    // Capture phase so we can stop Escape from bubbling to outer modals
    // that also listen on document.
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [active, contentRef]);
}
