// app/hooks/useClickOutside.ts
import { RefObject, useEffect } from "react";

type OutsideEvent = MouseEvent | TouchEvent | PointerEvent;

export const useClickOutside = <T extends HTMLElement = HTMLElement>(
  ref: RefObject<T> | RefObject<T>[],
  handler: (event: OutsideEvent) => void
) => {
  useEffect(() => {
    const listener = (event: OutsideEvent) => {
      const refs = Array.isArray(ref) ? ref : [ref];
      
      const isInside = refs.some(r => {
        const el = r.current;
        return el && el.contains(event.target as Node);
      });

      if (isInside) {
        return;
      }
      handler(event);
    };

    // 优先用 pointerdown，统一鼠标/触摸/触控笔
    if ("onpointerdown" in window) {
      document.addEventListener("pointerdown", listener as any, {
        passive: true,
      });

      return () => {
        document.removeEventListener("pointerdown", listener as any);
      };
    }

    // 兜底：老浏览器用 mousedown + touchstart
    document.addEventListener("mousedown", listener as any, {
      passive: true,
    });
    document.addEventListener("touchstart", listener as any, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", listener as any);
      document.removeEventListener("touchstart", listener as any);
    };
  }, [ref, handler]);
};
