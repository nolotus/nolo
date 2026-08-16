/**
 * useDragResize — 统一的拖拽调整大小 Hook
 *
 * 使用 Pointer Events API（而非 Mouse Events），兼容 Windows 精准触控板、
 * 触屏设备及普通鼠标。核心优化：
 * - setPointerCapture：快速拖动时事件不会因鼠标离开元素而丢失
 * - pointercancel：处理系统打断（Alt+Tab、弹窗等）的清理
 * - 拖拽期间全局禁止文本选中，防止 Windows 下拖动触发文字高亮
 */

import { useCallback, useEffect, useRef } from "react";

interface UseDragResizeOptions {
  /** 拖拽开始时的回调 */
  onStart?: () => void;
  /** 指针移动时的回调，接收当前 clientX / clientY */
  onMove: (clientX: number, clientY: number) => void;
  /** 拖拽结束时的回调（pointerup / pointercancel） */
  onStop: () => void;
  /** 拖拽期间的鼠标光标样式，默认不修改 */
  cursor?: string;
}

export function useDragResize({ onStart, onMove, onStop, cursor }: UseDragResizeOptions) {
  const isActiveRef = useRef(false);
  const previousUserSelectRef = useRef("");
  const previousCursorRef = useRef("");
  // 用 ref 保存回调，避免 useEffect 重复注册
  const onStartRef = useRef(onStart);
  const onMoveRef = useRef(onMove);
  const onStopRef = useRef(onStop);

  useEffect(() => {
    onStartRef.current = onStart;
  });
  useEffect(() => {
    onMoveRef.current = onMove;
  });
  useEffect(() => {
    onStopRef.current = onStop;
  });

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
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
  }, [cursor]); // 只注册一次，回调通过 ref 保持最新；cursor 仅影响样式恢复

  /** 绑定到拖拽触发元素的 onPointerDown */
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
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
