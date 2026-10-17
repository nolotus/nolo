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

import {
  canWorkbenchSplit,
  WORKBENCH_DEFAULT_MIN_SIZE,
  WORKBENCH_DEFAULT_SEPARATOR_SIZE,
} from "./workbenchGeometry";
import "./workbenchSplit.css";

/** primary 在分隔符的哪一侧；交换只影响视觉位置，不改变 React 树结构。 */
export type WorkbenchPlacement = "primary-start" | "primary-end";
export type WorkbenchActiveSurface = "primary" | "secondary";

const DEFAULT_SECONDARY_FRACTION = 0.4;
const DEFAULT_MIN_SIZE = WORKBENCH_DEFAULT_MIN_SIZE;
export const WORKBENCH_SEPARATOR_SIZE = WORKBENCH_DEFAULT_SEPARATOR_SIZE;
/** 键盘 resize 每次移动的 px 步长。 */
export const WORKBENCH_KEYBOARD_STEP_PX = 32;
/**
 * 拖动死区（px）：pointerdown 后水平位移绝对值小于它，视为点击/手抖——
 * 既不写 preview 也不 commit（否则 1% 舍入会把单击变成真实比例变更）。
 */
export const WORKBENCH_DRAG_DEADZONE_PX = 4;
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

  /** narrow 模式下 switcher 按钮文案 */
  primaryLabel?: string;
  secondaryLabel?: string;

  /** 当前活跃 surface（受控/初始） */
  activeSurface?: WorkbenchActiveSurface;
  defaultActiveSurface?: WorkbenchActiveSurface;
  onActiveSurfaceChange?: (surface: WorkbenchActiveSurface) => void;
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
 * - 响应式退化：当可用宽度不足以支撑两边最小宽度时，自动退化为 narrow 单 surface 模式，
 *   并提供顶部轻量 switcher，两块 surface 仍保持 mounted，不丢失状态与 DOM identity。
 * - 拖动轻量：pointermove 同步计算 px 并只写 CSS 变量（DOM preview），
 *   pointerup 基于最后一个指针位置同步 commit 一次 fraction，不逐帧写任何
 *   store / storage，也不依赖未执行的 RAF。
 * - 严格 clamp：secondary ∈ [min(secondaryMin, 上限), 上限]，上限 =
 *   可用宽度 - primaryMin - 分隔符；不会把页面拖出 viewport，也不会把任一
 *   surface 压到不可用宽度。
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
  primaryLabel = "主工作面",
  secondaryLabel = "第二工作面",
  activeSurface,
  defaultActiveSurface = "primary",
  onActiveSurfaceChange,
}: WorkbenchSplitProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  /** 拖动期间最近一次指针位置；commit 时同步换算，不依赖未执行的 RAF。 */
  const lastPointerXRef = useRef<number | null>(null);
  const dragStateRef = useRef({
    active: false,
    previousUserSelect: "",
    previousCursor: "",
    pointerId: 0,
    /** 拖动前的 preview 宽度（px）：Escape 取消时回到它，比例不变。 */
    startPx: 0,
    /** pointerdown 时的客户端 X：用于死区判定。 */
    startX: 0,
    /** 是否已越过死区（一旦越阈就 latch，拖回原位仍算拖动）。 */
    hasMoved: false,
    /** 持有 pointer capture 的元素（release 也走它，不依赖事件 target）。 */
    captureTarget: null as
      | (EventTarget & { releasePointerCapture?: (pointerId: number) => void })
      | null,
    /** 本次 drag 实际注册到 window 的处理器；按引用移除，避免 stale 闭包漏删。 */
    moveHandler: null as ((event: PointerEvent) => void) | null,
    upHandler: null as ((event: PointerEvent) => void) | null,
    escapeHandler: null as ((event: KeyboardEvent) => void) | null,
  });
  const [availableWidth, setAvailableWidth] = useState(FALLBACK_AVAILABLE_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const isControlled = activeSurface !== undefined;
  const [internalActiveSurface, setInternalActiveSurface] =
    useState<WorkbenchActiveSurface>(defaultActiveSurface);

  const currentActive = isControlled ? activeSurface : internalActiveSurface;
  // 当 secondary 未打开时，可见 active 恒为 primary，避免受控传 secondary 时出现空面板。
  const visibleActive: WorkbenchActiveSurface = !secondaryOpen
    ? "primary"
    : currentActive;

  const handleSelectActive = useCallback(
    (surface: WorkbenchActiveSurface) => {
      if (!isControlled) {
        setInternalActiveSurface(surface);
      }
      onActiveSurfaceChange?.(surface);
    },
    [isControlled, onActiveSurfaceChange]
  );

  const isSplitAllowed = canWorkbenchSplit({
    containerWidth: availableWidth,
    primaryMinSize,
    secondaryMinSize,
    separatorSize: WORKBENCH_SEPARATOR_SIZE,
  });

  const isNarrow = secondaryOpen && !isSplitAllowed;

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
      const drag = dragStateRef.current;
      if (!drag.active) return;
      if (event.pointerId !== drag.pointerId) return;
      // 死区：|Δx| < 4px 视为点击/手抖，不写 preview、也不记游标位置。
      // 越过阈值即 latch hasMoved，之后即使拖回原位仍按拖动处理。
      if (!drag.hasMoved) {
        if (Math.abs(event.clientX - drag.startX) < WORKBENCH_DRAG_DEADZONE_PX) {
          return;
        }
        drag.hasMoved = true;
      }
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

  /** 结束一次 drag 的机械清理：全局样式、listeners、pointer capture。 */
  // commit 由调用方决定（pointerup commit、Escape 不 commit）。
  const releaseDrag = useCallback(() => {
    const drag = dragStateRef.current;
    drag.active = false;
    if (drag.moveHandler) {
      window.removeEventListener("pointermove", drag.moveHandler);
    }
    if (drag.upHandler) {
      window.removeEventListener("pointerup", drag.upHandler);
      window.removeEventListener("pointercancel", drag.upHandler);
    }
    if (drag.escapeHandler) {
      window.removeEventListener("keydown", drag.escapeHandler);
    }
    drag.moveHandler = null;
    drag.upHandler = null;
    drag.escapeHandler = null;
    document.body.style.userSelect = drag.previousUserSelect;
    document.body.style.cursor = drag.previousCursor;
    try {
      drag.captureTarget?.releasePointerCapture?.(drag.pointerId);
    } catch {
      /* capture already released */
    }
    drag.captureTarget = null;
    drag.hasMoved = false;
    lastPointerXRef.current = null;
  }, []);

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag.active || event.pointerId !== drag.pointerId) return;
      // 未越过死区：这是点击而非 resize——无 preview、无 commit。
      if (!drag.hasMoved) {
        releaseDrag();
        setIsResizing(false);
        return;
      }
      // commit 依赖的值先取：releaseDrag 会清空 lastPointerXRef。
      const pointerX = lastPointerXRef.current;
      releaseDrag();

      // 同步 commit：基于最后一个指针位置（若 move 未发过，pointerdown 已记录）。
      if (availableWidth > 0 && secondaryOpen && pointerX != null) {
        const px = pointerToSecondaryPx(pointerX);
        onSecondaryFractionChange?.(Math.round((px / availableWidth) * 100) / 100);
      }
      setIsResizing(false);
    },
    [
      releaseDrag,
      availableWidth,
      secondaryOpen,
      pointerToSecondaryPx,
      onSecondaryFractionChange,
    ]
  );

  /**
   * 拖动中按 Escape = 取消本次 resize：preview 回到拖动前宽度，不 commit。
   * 该监听只在 drag 期间注册，非拖动态不存在，不会吞掉外部 Escape。
   */
  const handleDragEscape = useCallback(
    (event: KeyboardEvent) => {
      const drag = dragStateRef.current;
      if (!drag.active) return;
      if (event.key !== "Escape" && event.key !== "Esc") return;
      event.preventDefault();
      const restorePx = drag.startPx;
      releaseDrag();
      setIsResizing(false);
      containerRef.current?.style.setProperty(
        "--workbench-secondary-px",
        `${restorePx}px`
      );
    },
    [releaseDrag]
  );

  const handleSeparatorPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      // closed 态分隔符 disabled：不进 drag state，不产生任何交互。
      if (!secondaryOpen) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      const drag = dragStateRef.current;
      drag.active = true;
      drag.pointerId = event.pointerId;
      drag.captureTarget = event.currentTarget;
      drag.startPx = secondaryPx;
      drag.startX = event.clientX;
      drag.hasMoved = false;
      drag.previousUserSelect = document.body.style.userSelect;
      drag.previousCursor = document.body.style.cursor;
      drag.moveHandler = handlePointerMove;
      drag.upHandler = handlePointerUp;
      drag.escapeHandler = handleDragEscape;
      document.body.style.userSelect = "none";
      document.body.style.cursor = "col-resize";
      lastPointerXRef.current = event.clientX;
      setIsResizing(true);
      window.addEventListener("pointermove", drag.moveHandler);
      window.addEventListener("pointerup", drag.upHandler);
      window.addEventListener("pointercancel", drag.upHandler);
      window.addEventListener("keydown", drag.escapeHandler);
    },
    [
      handlePointerMove,
      handlePointerUp,
      handleDragEscape,
      secondaryOpen,
      secondaryPx,
    ]
  );

  // 卸载时兜底（拖动中途 unmount）：恢复全局样式、卸掉 listeners / capture。
  useEffect(() => {
    return () => {
      if (dragStateRef.current.active) releaseDrag();
    };
  }, [releaseDrag]);

  // 双击分隔符恢复 50/50。
  const handleSeparatorDoubleClick = useCallback(() => {
    if (!secondaryOpen) return;
    onSecondaryFractionChange?.(0.5);
  }, [secondaryOpen, onSecondaryFractionChange]);

  // 键盘 resize：与 pointer 拖拽共用同一套 clamp + fraction 换算。
  // 方向语义跟随 placement——指针朝 secondary 方向移动 = Arrow 同侧增大：
  //   primary-start（secondary 在右）：ArrowLeft → secondary 变大
  //   primary-end   （secondary 在左）：ArrowRight → secondary 变大
  const moveSecondaryBy = useCallback(
    (deltaPx: 1 | -1) => {
      if (!secondaryOpen || availableWidth <= 0) return;
      const directed = placement === "primary-end" ? -deltaPx : deltaPx;
      const currentPx = clamp(
        Math.round(availableWidth * secondaryFraction),
        minEffectivePx,
        maxSecondaryPx
      );
      const px = clamp(currentPx + directed * WORKBENCH_KEYBOARD_STEP_PX, minEffectivePx, maxSecondaryPx);
      onSecondaryFractionChange?.(Math.round((px / availableWidth) * 100) / 100);
    },
    [secondaryOpen, availableWidth, placement, secondaryFraction, minEffectivePx, maxSecondaryPx, onSecondaryFractionChange]
  );

  const handleSeparatorKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveSecondaryBy(1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        moveSecondaryBy(-1);
      }
    },
    [moveSecondaryBy]
  );

  // 稳定槽位：track 模板与 gridColumn 随 placement/open 切换，React 树里
  // 三个槽位的位置、key、child identity 都不变。
  // secondary track 引用 var(--workbench-secondary-px)：pointermove 只写
  // 该变量即可实时驱动 track 宽度（浏览器解析 var，无 React 重渲染）；
  // 若烤死字面 px，拖动期间视觉不动、松手才跳变（不顺滑的根因）。
  const secondaryTrack = "var(--workbench-secondary-px)";
  const separatorTrack = `${WORKBENCH_SEPARATOR_SIZE}px`;
  const gridTemplateColumns = isNarrow
    ? "1fr"
    : !secondaryOpen
      ? `minmax(0, 1fr) 0px 0px`
      : placement === "primary-start"
        ? `minmax(0, 1fr) ${separatorTrack} ${secondaryTrack}`
        : `${secondaryTrack} ${separatorTrack} minmax(0, 1fr)`;
  const primaryColumn = isNarrow
    ? "1"
    : secondaryOpen && placement === "primary-end"
      ? "3"
      : "1";
  const secondaryColumn = isNarrow
    ? "1"
    : secondaryOpen && placement === "primary-end"
      ? "1"
      : "3";

  return (
    <div
      ref={containerRef}
      className={`WorkbenchSplit${isResizing ? " WorkbenchSplit--resizing" : ""}${isNarrow ? " WorkbenchSplit--narrow" : ""}`}
      style={
        {
          "--workbench-secondary-px": `${secondaryPx}px`,
          gridTemplateColumns,
        } as CSSProperties
      }
    >
      {isNarrow && (
        <div className="WorkbenchSplit__switcher" role="group" aria-label="切换工作面">
          <button
            type="button"
            className={`WorkbenchSplit__switch-btn ${visibleActive === "primary" ? "is-active" : ""}`}
            onClick={() => handleSelectActive("primary")}
            aria-pressed={visibleActive === "primary"}
          >
            {primaryLabel}
          </button>
          <button
            type="button"
            className={`WorkbenchSplit__switch-btn ${visibleActive === "secondary" ? "is-active" : ""}`}
            onClick={() => handleSelectActive("secondary")}
            aria-pressed={visibleActive === "secondary"}
          >
            {secondaryLabel}
          </button>
        </div>
      )}
      <div
        className={`WorkbenchSplit__surface${isNarrow && visibleActive !== "primary" ? " is-hidden" : ""}`}
        style={{ gridColumn: primaryColumn }}
        aria-hidden={isNarrow && visibleActive !== "primary" ? true : undefined}
      >
        {primary}
      </div>
      {!isNarrow && (
        <div
          className="WorkbenchSplit__separator"
          style={{ gridColumn: "2" }}
          role="separator"
          aria-orientation="vertical"
          aria-disabled={!secondaryOpen}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round((secondaryPx / Math.max(availableWidth, 1)) * 100)}
          aria-label="调整两个工作面的宽度"
          tabIndex={secondaryOpen ? 0 : -1}
          onPointerDown={handleSeparatorPointerDown}
          onDoubleClick={handleSeparatorDoubleClick}
          onKeyDown={handleSeparatorKeyDown}
        />
      )}
      <div
        className={`WorkbenchSplit__surface${isNarrow && visibleActive !== "secondary" ? " is-hidden" : ""}`}
        style={{ gridColumn: secondaryColumn }}
        aria-hidden={!secondaryOpen || (isNarrow && visibleActive !== "secondary") ? true : undefined}
      >
        {secondary}
      </div>
    </div>
  );
}