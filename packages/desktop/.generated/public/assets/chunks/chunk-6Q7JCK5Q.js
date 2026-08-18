import {
  require_react
} from "/public/assets/chunks/chunk-JXB3DLZU.js";
import {
  __toESM
} from "/public/assets/chunks/chunk-PKRG6ODM.js";

// packages/app/hooks/useDragResize.ts
var import_react = __toESM(require_react());
function useDragResize({ onStart, onMove, onStop, cursor }) {
  const isActiveRef = (0, import_react.useRef)(false);
  const previousUserSelectRef = (0, import_react.useRef)("");
  const previousCursorRef = (0, import_react.useRef)("");
  const onStartRef = (0, import_react.useRef)(onStart);
  const onMoveRef = (0, import_react.useRef)(onMove);
  const onStopRef = (0, import_react.useRef)(onStop);
  (0, import_react.useEffect)(() => {
    onStartRef.current = onStart;
  });
  (0, import_react.useEffect)(() => {
    onMoveRef.current = onMove;
  });
  (0, import_react.useEffect)(() => {
    onStopRef.current = onStop;
  });
  (0, import_react.useEffect)(() => {
    const handleMove = (e) => {
      if (!isActiveRef.current) return;
      onMoveRef.current(e.clientX, e.clientY);
    };
    const handleUp = () => {
      if (!isActiveRef.current) return;
      isActiveRef.current = false;
      document.body.style.userSelect = previousUserSelectRef.current;
      if (cursor) document.body.style.cursor = previousCursorRef.current;
      onStopRef.current();
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("pointercancel", handleUp);
    return () => {
      if (isActiveRef.current) {
        isActiveRef.current = false;
        document.body.style.userSelect = previousUserSelectRef.current;
        if (cursor) document.body.style.cursor = previousCursorRef.current;
        onStopRef.current();
      }
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleUp);
    };
  }, [cursor]);
  const handlePointerDown = (0, import_react.useCallback)(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.currentTarget.setPointerCapture(e.pointerId);
      isActiveRef.current = true;
      previousUserSelectRef.current = document.body.style.userSelect;
      previousCursorRef.current = document.body.style.cursor;
      document.body.style.userSelect = "none";
      if (cursor) document.body.style.cursor = cursor;
      onStartRef.current?.();
    },
    [cursor]
  );
  return { handlePointerDown };
}

export {
  useDragResize
};
