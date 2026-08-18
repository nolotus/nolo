import {
  require_react_dom
} from "/public/assets/chunks/chunk-AHAP23JL.js";
import {
  require_jsx_runtime
} from "/public/assets/chunks/chunk-VU4ZNPEP.js";
import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/render/web/ui/modal/BaseModal.tsx
var import_react2 = __toESM(require_react(), 1);
var import_react_dom = __toESM(require_react_dom(), 1);

// packages/render/web/ui/modal/useFocusTrap.ts
var import_react = __toESM(require_react(), 1);

// packages/render/web/ui/modal/focusTrap.ts
var FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(", ");
var modalLayerStack = [];
var nextLayerId = 0;
function pushModalLayer() {
  const id = ++nextLayerId;
  modalLayerStack.push(id);
  return id;
}
function popModalLayer(id) {
  const idx = modalLayerStack.lastIndexOf(id);
  if (idx !== -1) modalLayerStack.splice(idx, 1);
}
function isTopModalLayer(id) {
  return modalLayerStack.length > 0 && modalLayerStack[modalLayerStack.length - 1] === id;
}
function isElementVisible(el) {
  if (el.hidden) return false;
  if (el.getAttribute("aria-hidden") === "true") return false;
  if (el.closest("[hidden],[aria-hidden='true']")) return false;
  if (typeof window !== "undefined") {
    try {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden" || style.visibility === "collapse") {
        return false;
      }
    } catch {
    }
  }
  return true;
}
function getFocusableElements(container) {
  const nodes = container.querySelectorAll(FOCUSABLE_SELECTOR);
  const result = [];
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes[i];
    if (el.tabIndex < 0) continue;
    if (el.disabled) continue;
    if (!isElementVisible(el)) continue;
    result.push(el);
  }
  return result;
}
function restoreFocus(el) {
  if (!el) return;
  try {
    const doc = el.ownerDocument ?? document;
    if (typeof el.focus === "function" && doc.contains(el)) {
      el.focus({ preventScroll: true });
    }
  } catch {
  }
}
function focusInitial(container) {
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
  }
}
function handleTabKey(event, container) {
  if (event.key !== "Tab") return false;
  const focusable = getFocusableElements(container);
  if (focusable.length === 0) {
    event.preventDefault();
    try {
      container.focus({ preventScroll: true });
    } catch {
    }
    return true;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
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

// packages/render/web/ui/modal/useFocusTrap.ts
function useFocusTrap(active, contentRef, onEscape) {
  const previouslyFocusedRef = (0, import_react.useRef)(null);
  const layerIdRef = (0, import_react.useRef)(null);
  const onEscapeRef = (0, import_react.useRef)(onEscape);
  (0, import_react.useEffect)(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);
  (0, import_react.useEffect)(() => {
    if (!active) return;
    const prev = document.activeElement;
    previouslyFocusedRef.current = prev && typeof prev.focus === "function" ? prev : null;
    const layerId = pushModalLayer();
    layerIdRef.current = layerId;
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
  (0, import_react.useEffect)(() => {
    if (!active) return;
    const handleKeyDown = (event) => {
      const layerId = layerIdRef.current;
      if (layerId === null || !isTopModalLayer(layerId)) return;
      if (event.key === "Escape") {
        event.stopPropagation();
        onEscapeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const content = contentRef.current;
      if (!content) return;
      handleTabKey(event, content);
    };
    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [active, contentRef]);
}

// packages/render/web/ui/modal/BaseModal.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var MODAL_TRANSITION_DURATION = 300;
var BaseModal = ({
  isOpen,
  onClose,
  children,
  className = ""
}) => {
  const [shouldRender, setShouldRender] = (0, import_react2.useState)(false);
  const [isVisible, setIsVisible] = (0, import_react2.useState)(false);
  const contentRef = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(() => {
    let timeoutId;
    let rafId;
    if (isOpen) {
      setShouldRender(true);
      rafId = window.requestAnimationFrame(() => {
        rafId = window.requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      timeoutId = window.setTimeout(() => {
        setShouldRender(false);
      }, MODAL_TRANSITION_DURATION);
    }
    return () => {
      if (timeoutId !== void 0) window.clearTimeout(timeoutId);
      if (rafId !== void 0) window.cancelAnimationFrame(rafId);
    };
  }, [isOpen]);
  (0, import_react2.useEffect)(() => {
    if (!shouldRender) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [shouldRender]);
  useFocusTrap(Boolean(isOpen && shouldRender), contentRef, onClose);
  if (!shouldRender) return null;
  const handleBackdropClick = (e) => {
    if (!isOpen) return;
    if (e.target !== e.currentTarget) return;
    onClose();
  };
  const rootClassName = ["modal", isVisible ? "modal--open" : ""].join(" ").trim();
  const contentClassName = ["modal__content", className].join(" ").trim();
  return import_react_dom.default.createPortal(
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: rootClassName, onClick: handleBackdropClick, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "div",
      {
        ref: contentRef,
        className: contentClassName,
        tabIndex: -1,
        children
      }
    ) }),
    document.body
  );
};

export {
  BaseModal
};
