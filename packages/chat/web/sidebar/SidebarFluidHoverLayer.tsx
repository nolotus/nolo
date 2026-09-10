// SidebarFluidHoverLayer: mounts the fluid-hover capability for one
// SidebarVirtualizedList instance.
//
// 渲染为 <Virtualizer> 的兄弟叶子组件：hover state 更新只重渲染这个叶子
// （highlight 通过 portal 挂进列表内容层），永远不会带动 Virtualizer / 行
// 重渲染。
//
// 为什么不用 per-row :hover？:hover 在 4px 行间 gap 上会闪烁：指针在 gap 里
// 时不属于任何 row，离开 A 尚未进入 B，高亮消失。fluid hover 把整个列表当
// 一块连续 hover surface：gap 里也始终指向"最近的 row"（O(1) 数学见
// sidebarFluidHover.ts）。为什么不用 DOM rect registry / per-item
// ResizeObserver？Virtualizer 只 mount 可见行且行距固定，固定 pitch 已经给出
// 全部几何信息，无需遍历 items/DOM。
//
// 为什么 portal 到 RAC 的内容层 div？RAC Virtualizer 把行槽 absolute 定位在
// 一个 position:relative、高度=contentSize 的内容 div 里（ListBox 滚动容器
// 的唯一元素子节点）。highlight 必须处在同一 content 坐标系才能随内容滚动、
// 且与行槽逐像素对齐。若 RAC 未来改变该 DOM 结构，下方 guard 会让整个能力
// 静默退回旧 :hover（不会出现错位高亮）。
//
// V1 范围：仅普通内容 row。header / type filter / space switcher / pinned
// 块仍走各自 CSS :hover。gap click 有意不做：视觉邻近 ≠ 点击语义（行内有
// NavLink、拖拽把手、行内操作、重命名输入框），V1 fluid highlight only。

import React from "react";
import { createPortal } from "react-dom";
import {
  resolveSidebarFluidHoverIndex,
  type SidebarFluidHoverIndex,
} from "./sidebarFluidHover";
import { SidebarFluidHoverHighlight } from "./SidebarFluidHoverHighlight";

export interface UseSidebarFluidHoverOptions {
  /** Ref of the ListBox scroller element (the sole scroll container). */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Fixed virtual row pitch in px (ListBoxItem slot height, e.g. 36). */
  rowSize: number;
  /** Visual row height inside the slot in px (defaults to rowSize). */
  rowHeight?: number;
  /** Logical item count (the virtualized data length, not mounted rows). */
  itemCount: number;
  /** Disable entirely (renders nothing, keeps row :hover legacy intact). */
  enabled?: boolean;
}

export interface SidebarFluidHoverResult {
  /** Logical row currently under/near the pointer, or null when idle. */
  activeIndex: SidebarFluidHoverIndex;
  /** Portal node mounting the shared highlight into the list content layer. */
  highlight: React.ReactNode;
}

/**
 * List-level continuous hover for the virtualized sidebar. One instance per
 * list — never per-row. Pointer data lives in refs; a shared rAF resolves
 * (pointerY, scrollTop) → index and setState runs only when the index
 * changed, so mousemove count ≠ React render count.
 */
export function useSidebarFluidHover({
  containerRef,
  rowSize,
  rowHeight,
  itemCount,
  enabled = true,
}: UseSidebarFluidHoverOptions): SidebarFluidHoverResult {
  const [activeIndex, setActiveIndex] =
    React.useState<SidebarFluidHoverIndex>(null);
  // Hover session counter: bumps on every (re)enter. The highlight uses it
  // as its key so a re-enter remounts fresh (fade in at the current row)
  // instead of sliding over from the previous session's row.
  const [session, setSession] = React.useState(0);
  const [hasHovered, setHasHovered] = React.useState(false);
  const [dragging, setDragging] = React.useState(false);
  const [mountEl, setMountEl] = React.useState<HTMLElement | null>(null);

  const pointerLocalYRef = React.useRef<number | null>(null);
  const activeIndexRef = React.useRef<SidebarFluidHoverIndex>(null);
  // Keep the last known position so the bar fades out in place after
  // pointerleave instead of jumping to row 0.
  const lastTopRef = React.useRef(0);
  const sessionRef = React.useRef(0);
  const rafRef = React.useRef<number | null>(null);
  const geometryRef = React.useRef({ rowSize, rowHeight, itemCount });
  React.useEffect(() => {
    geometryRef.current = { rowSize, rowHeight, itemCount };
  });

  const resolveNow = React.useCallback(() => {
    const el = containerRef.current;
    const localY = pointerLocalYRef.current;
    if (!el || localY === null) return;
    const next = resolveSidebarFluidHoverIndex({
      rowSize: geometryRef.current.rowSize,
      rowHeight: geometryRef.current.rowHeight,
      scrollTop: el.scrollTop,
      localY,
      itemCount: geometryRef.current.itemCount,
    });
    const prev = activeIndexRef.current;
    if (prev === next) return;
    activeIndexRef.current = next;
    if (next !== null) lastTopRef.current = next * geometryRef.current.rowSize;
    if (prev === null && next !== null) {
      // Fresh hover session (first enter or re-enter): remount the highlight
      // so it fades in at the current row, never sliding across the list.
      sessionRef.current += 1;
      setSession(sessionRef.current);
      setHasHovered(true);
    }
    setActiveIndex(next);
  }, [containerRef]);

  const scheduleResolve = React.useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      resolveNow();
    });
  }, [resolveNow]);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || !enabled) return;
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const rect = el.getBoundingClientRect();
      // Not event.offsetY: the event target may be a row child or an
      // absolute Virtualizer slot, where offsetX/Y are relative to the
      // wrong element.
      pointerLocalYRef.current = event.clientY - rect.top;
      scheduleResolve();
    };
    const onPointerLeave = () => {
      pointerLocalYRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (activeIndexRef.current !== null) {
        activeIndexRef.current = null;
        setActiveIndex(null); // → visible=false → fades out in place
      }
    };
    // Scroll (wheel / scrollbar / keyboard / programmatic scrollToIndex)
    // moves content under a still pointer: re-resolve with the last known
    // pointer Y. O(1) per event, rAF-coalesced. No per-scroll DOM loop.
    const onScroll = () => {
      if (pointerLocalYRef.current !== null) scheduleResolve();
    };
    // Row drags start on draggable children inside rows; the native events
    // bubble to the list container. Suspend the highlight during drags so
    // drag / fluid-hover / drop-target visuals never stack up.
    const onDragStart = () => setDragging(true);
    const onDragFinish = () => {
      setDragging(false);
      // Post-drag pointer position is unknown (no pointermove fires during
      // native drags): clear so the next real pointer move re-acquires the
      // nearest row with a fresh fade-in.
      pointerLocalYRef.current = null;
      if (activeIndexRef.current !== null) {
        activeIndexRef.current = null;
        setActiveIndex(null);
      }
    };
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerleave", onPointerLeave);
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("dragstart", onDragStart, true);
    el.addEventListener("dragend", onDragFinish, true);
    el.addEventListener("drop", onDragFinish, true);
    return () => {
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerleave", onPointerLeave);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("dragstart", onDragStart, true);
      el.removeEventListener("dragend", onDragFinish, true);
      el.removeEventListener("drop", onDragFinish, true);
    };
  }, [containerRef, enabled, scheduleResolve]);

  // Aborted drags (Esc) still fire dragend on the source element, which the
  // window-level listener below catches. No timer: a long legitimate drag
  // must not be cut short by a fallback timeout.
  React.useEffect(() => {
    if (!dragging) return;
    const finish = () => setDragging(false);
    window.addEventListener("dragend", finish, true);
    return () => window.removeEventListener("dragend", finish, true);
  }, [dragging]);

  // Item mutations (filter / delete / collapse / prepend / remount) can leave
  // the current index out of range → drop the highlight; the next pointer
  // move re-acquires the nearest row. Least surprising, no snap.
  React.useEffect(() => {
    if (
      activeIndexRef.current !== null &&
      activeIndexRef.current >= itemCount
    ) {
      activeIndexRef.current = null;
      setActiveIndex(null);
    }
  }, [itemCount]);

  React.useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  // Locate RAC's content layer once the ListBox has mounted (refs are set
  // before effects run). The content div is the scroller's only element
  // child; see file header for why the highlight must live there. If the
  // DOM shape ever changes, skip activation entirely → legacy :hover stays.
  // The layer mounts as a Virtualizer sibling, so on the very first render
  // pass the ListBox may not be in the DOM yet — retry a few frames before
  // giving up (bounded; giving up keeps legacy :hover intact).
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let attempts = 0;
    let timer: number | null = null;
    const attach = () => {
      const content = el.firstElementChild;
      if (content instanceof HTMLDivElement) {
        el.setAttribute("data-fluid-hover", "on");
        setMountEl(content);
        return;
      }
      if (attempts++ < 10) {
        timer = window.setTimeout(attach, 50);
      }
    };
    attach();
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      el.removeAttribute("data-fluid-hover");
    };
  }, [containerRef]);

  const visible = !dragging && activeIndex !== null;
  const top = activeIndex !== null ? activeIndex * rowSize : lastTopRef.current;

  const highlight =
    enabled && mountEl && hasHovered
      ? createPortal(
          <SidebarFluidHoverHighlight
            key={session}
            top={top}
            height={rowHeight ?? rowSize}
            visible={visible}
          />,
          mountEl
        )
      : null;

  return { activeIndex, highlight };
}

/**
 * Leaf overlay for one SidebarVirtualizedList: renders nothing itself (the
 * highlight is portaled into the list content layer). Kept as a separate
 * component so hover-state updates never re-render the Virtualizer or rows.
 */
export const SidebarFluidHoverLayer: React.FC<{
  containerRef: React.RefObject<HTMLElement | null>;
  rowSize: number;
  rowHeight?: number;
  itemCount: number;
  enabled?: boolean;
}> = ({ containerRef, rowSize, rowHeight, itemCount, enabled }) => {
  const { highlight } = useSidebarFluidHover({
    containerRef,
    rowSize,
    rowHeight,
    itemCount,
    enabled,
  });
  return <>{highlight}</>;
};