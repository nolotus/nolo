import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/hooks/useClickOutside.tsx
var import_react = __toESM(require_react());
var useClickOutside = (ref, handler) => {
  (0, import_react.useEffect)(() => {
    const listener = (event) => {
      const refs = Array.isArray(ref) ? ref : [ref];
      const isInside = refs.some((r) => {
        const el = r.current;
        return el && el.contains(event.target);
      });
      if (isInside) {
        return;
      }
      handler(event);
    };
    if ("onpointerdown" in window) {
      document.addEventListener("pointerdown", listener, {
        passive: true
      });
      return () => {
        document.removeEventListener("pointerdown", listener);
      };
    }
    document.addEventListener("mousedown", listener, {
      passive: true
    });
    document.addEventListener("touchstart", listener, {
      passive: true
    });
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
};

export {
  useClickOutside
};
