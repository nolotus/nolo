// render/layout/WorkbenchSplit.tsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import "./workbenchSplit.css";

/** primary 在分隔符的哪一侧；交换只影响视觉位置，不改变 React 树结构。 */
export type WorkbenchPlacement = "primary-start" | "primary-end";

const DEFAULT_SECONDARY_FRACTION = 0.4;
const DEFAULT_MIN_SIZE = 320;
export const WORKBENCH_SEPARATOR_SIZE = 8;
/** 首次测量前的可用宽度兜底（SSR / 无布局环境），只影响首帧，量测后立即修正。 */
const FALLBACK_AVAILABLE_WIDTH = 1280;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export interface WorkbenchSplitProps {
  /** 主工作面（如 Chat）。开关、resize、placement 交换都不会让它 remount。 */
  primary: ReactNode;
  /** 第二工作面（如 Preview）。槽位常驻；内容由消费方决定是否条件渲染。 */
  secondary: ReactNode;
  secondaryOpen: boolean;
  /** 视觉主次：primary 靠 start（默认）或 end。 */
  placement?: WorkbenchPlacement;
  /** 第二工作面占比（0~1）。拖动内部用 px，只有 commit 才换算 fraction。 */
  secondaryFraction?: number;
  /** 两侧最小可用宽度（px）。超出可用空间时主工作面优先保底。 */
  primaryMinSize?: number;
  secondaryMinSize?: number;
  /** 拖动 / 双击分隔符结束时回调一次，消费方负责持久化。 */
  onSecondaryFractionChange?: (fraction: number) => void;
}

/**
 * WorkbenchSplit — 双工作面水平分栏 primitive。
 *
 * 只负责一件事：两个 stateful surface 如何共享水平空间。它不知道 Chat、
 * Preview、Navigation 是什么，也不负责持久化。
 *
 * 关键约束：
 * - 稳定槽位：primary/secondary 永远渲染在同一个 React 位置，placement 交换
 *   只换 grid track 模板与 gridColumn，child identity 不变，不会 remount。
 * - 拖动轻量：pointermove 同步计算 px 并只写 CSS 变量（DOM preview），
 *   pointerup 基于最后一个指针位置同步 commit 一次 fraction，不逐帧写任何
 *   store / storage，也不依赖未执行的 RAF。
 * - 严格 clamp：secondary ∈ [min(secondaryMin, 上限), 上限]，上限 =
 *   可用宽度 - primaryMin - 分隔符；不会把页面拖出 viewport，也不会把任一
 *   surface 压到不可用宽度。
 *
 * 显式不做：垂直分栏、嵌套 split、三个以上 surface、面板数组、dock、拖拽
 * 重排、tabs。删掉本文件 + 调用方改回普通并排即可整体移除。
 */
export default function WorkbenchSplit({
  primary,
  secondary,
  secondaryOpen,
  placement = "primary-start",
  secondaryFraction = DEFAULT_SECONDARY_FRACTION,
  primaryMinSize = DEFAULT_MIN_SIZE,
  secondaryMinSize = DEFAULT_MIN_SIZE,
  onSecondaryFractionChange,
}: WorkbenchSplitProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  /** 拖动期间最近一次指针位置；commit 时同步换算，不依赖未执行的 RAF。 */
  const lastPointerXRef = useRef<number | null>(null);
  const dragStateRef = useRef({
    active: false,
    previousUserSelect: "",
    previousCursor: "",
    pointerId: 0,
  });
  const [availableWidth, setAvailableWidth] = useState(FALLBACK_AVAILABLE_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

  // 第二工作面最大可占宽度：主工作面保底 primaryMin，再留出分隔符。
  const maxSecondaryPx = Math.max(
    0,
    availableWidth - primaryMinSize - WORKBENCH_SEPARATOR_SIZE
  );
  const minEffectivePx = Math.min(secondaryMinSize, maxSecondaryPx);
  const secondaryPx = secondaryOpen
    ? clamp(
        Math.round(availableWidth * secondaryFraction),
        minEffectivePx,
        maxSecondaryPx
      )
    : 0;

  // 跟随容器实际宽度：窗口 resize、侧栏开关等都会触发重新 clamp。
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const width = el.getBoundingClientRect().width || window.innerWidth;
      if (width > 0) setAvailableWidth(width);
    };
    measure();
    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const pointerToSecondaryPx = useCallback(
    (clientX: number): number => {
      const rect = containerRef.current?.getBoundingClientRect();
      const width = rect?.width || window.innerWidth;
      // primary-start：secondary 在右，宽度 = 右边界 - 指针；primary-end 相反。
      const raw =
        placement === "primary-end"
          ? clientX - (rect?.left ?? 0)
          : (rect?.left ?? 0) + width - clientX;
      return clamp(Math.round(raw), minEffectivePx, maxSecondaryPx);
    },
    [placement, minEffectivePx, maxSecondaryPx]
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragStateRef.current.active) return;
      if (event.pointerId !== dragStateRef.current.pointerId) return;
      const px = pointerToSecondaryPx(event.clientX);
      lastPointerXRef.current = event.clientX;
      // 同步计算、直接写 DOM：不经过 RAF，pointerup 永远读到最新值。
      containerRef.current?.style.setProperty(
        "--workbench-secondary-px",
        `${px}px`
      );
    },
    [pointerToSecondaryPx]
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      drag.active = false;
      document.body.style.userSelect = drag.previousUserSelect;
      document.body.style.cursor = drag.previousCursor;
      const target = event.currentTarget as (EventTarget & {
        releasePointerCapture?: (pointerId: number) => void;
      }) | null;
      try {
        target?.releasePointerCapture?.(drag.pointerId);
      } catch {
        /* capture already released */
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);

      // 同步 commit：基于最后一个指针位置（若 move 未发过，pointerdown 已记录）。
      if (availableWidth > 0 && secondaryOpen && lastPointerXRef.current != null) {
        const px = pointerToSecondaryPx(lastPointerXRef.current);
        onSecondaryFractionChange?.(Math.round((px / availableWidth) * 100) / 100);
      }
      lastPointerXRef.current = null;
      setIsResizing(false);
    },
    [
      handlePointerMove,
      availableWidth,
      secondaryOpen,
      pointerToSecondaryPx,
      onSecondaryFractionChange,
    ]
  );

  const handleSeparatorPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      const drag = dragStateRef.current;
      drag.active = true;
      drag.pointerId = event.pointerId;
      drag.previousUserSelect = document.body.style.userSelect;
      drag.previousCursor = document.body.style.cursor;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      lastPointerXRef.current = event.clientX;
      setIsResizing(true);
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp);
      window.addEventListener("pointercancel", handlePointerUp);
    },
    [handlePointerMove, handlePointerUp]
  );

  // 卸载时兜底恢复全局样式（拖动中途 unmount）。
  useEffect(() => {
    return () => {
      if (dragStateRef.current.active) {
        document.body.style.userSelect = dragStateRef.current.previousUserSelect;
        document.body.style.cursor = dragStateRef.current.previousCursor;
        dragStateRef.current.active = false;
      }
    };
  }, []);

  // 双击分隔符恢复 50/50。
  const handleSeparatorDoubleClick = useCallback(() => {
    if (!secondaryOpen) return;
    onSecondaryFractionChange?.(0.5);
  }, [secondaryOpen, onSecondaryFractionChange]);

  // 稳定槽位：track 模板与 gridColumn 随 placement/open 切换，React 树里
  // 三个槽位的位置、key、child identity 都不变。
  const secondaryTrack = `${Math.max(secondaryPx, 0)}px`;
  const separatorTrack = `${WORKBENCH_SEPARATOR_SIZE}px`;
  const gridTemplateColumns = !secondaryOpen
    ? `minmax(0, 1fr) 0px 0px`
    : placement === "primary-start"
      ? `minmax(0, 1fr) ${separatorTrack} ${secondaryTrack}`
      : `${secondaryTrack} ${separatorTrack} minmax(0, 1fr)`;
  const primaryColumn = secondaryOpen && placement === "primary-end" ? "3" : "1";
  const secondaryColumn = secondaryOpen && placement === "primary-end" ? "1" : "3";

  return (
    <div
      ref={containerRef}
      className={`WorkbenchSplit${isResizing ? " WorkbenchSplit--resizing" : ""}`}
      style={
        {
          "--workbench-secondary-px": `${secondaryPx}px`,
          gridTemplateColumns,
        } as CSSProperties
      }
    >
      <div
        className="WorkbenchSplit__surface"
        style={{ gridColumn: primaryColumn }}
      >
        {primary}
      </div>
      <div
        className="WorkbenchSplit__separator"
        style={{ gridColumn: "2" }}
        role="separator"
        aria-orientation="vertical"
        onPointerDown={handleSeparatorPointerDown}
        onDoubleClick={handleSeparatorDoubleClick}
      />
      <div
        className="WorkbenchSplit__surface"
        style={{ gridColumn: secondaryColumn }}
        aria-hidden={!secondaryOpen}
      >
        {secondary}
      </div>
    </div>
  );
}