// Sidebar fluid hover: O(1) nearest-row resolution for the fixed-pitch
// virtualized sidebar list.
//
// 为什么不用 per-row :hover？:hover 在 4px 行间 gap 上会闪烁（指针在 gap 里时
// 不属于任何 row，离开 A 尚未进入 B，高亮消失）。fluid hover 把整个列表当一块
// 连续 hover surface：指针在 gap 里也始终指向"最近的 row"。
//
// 为什么不用 DOM rect registry / per-item ResizeObserver？Virtualizer 只 mount
// 可见行且行距固定（rowSize=36px），contentY → index 是 O(1) 数学，无需遍历
// items/DOM（Fluid Functionalism 的 registerItem + itemRects + pickNearest
// 架构是为不定行高设计的，对固定行距列表是过度设计）。
//
// 为什么固定行距可以 O(1)？Virtualizer 给每个 item 一个整数倍 rowSize 的
// absolute 槽位（top = i * rowSize），32px 视觉行顶对齐、4px gap 在槽底，
// 所以 row 中心在 rowSize*i + rh/2。指针换行发生在相邻 row 中心的中点，
// 即槽边界下移 (rowSize - rh)/2 —— 不能直接 floor(contentY / rowSize)。

export interface SidebarFluidHoverGeometry {
  /** Fixed virtual row pitch in px (ListBoxItem slot height, e.g. 36). */
  rowSize: number;
  /** Visual row height inside the slot in px (e.g. 32; row is top-aligned). */
  rowHeight?: number;
  /** Current scrollTop of the ListBox scroller. */
  scrollTop?: number;
  /** Pointer Y in ListBox-local coordinates (clientY - rect.top). */
  localY: number;
  /** Total logical item count. */
  itemCount: number;
}

export type SidebarFluidHoverIndex = number | null;

/**
 * Resolve which logical row the pointer is "at", treating the list as a
 * continuous hover surface. Rows win inside their visual bounds; the nearest
 * row wins in the gap between rows (midpoint of adjacent row centers) and
 * beyond either edge of the list. O(1), no DOM. Invalid inputs → null.
 */
export function resolveSidebarFluidHoverIndex({
  rowSize,
  rowHeight,
  scrollTop = 0,
  localY,
  itemCount,
}: SidebarFluidHoverGeometry): SidebarFluidHoverIndex {
  if (!Number.isFinite(rowSize) || rowSize <= 0) return null;
  if (!Number.isInteger(itemCount) || itemCount < 1) return null;
  if (!Number.isFinite(localY)) return null;
  if (!Number.isFinite(scrollTop)) return null;
  const rh =
    rowHeight !== undefined && Number.isFinite(rowHeight) && rowHeight > 0
      ? Math.min(rowHeight, rowSize)
      : rowSize;
  const contentY = localY + scrollTop;
  // Center of row i is rowSize*i + rh/2; centers are rowSize apart, so the
  // pointer's row is (contentY - rh/2) / rowSize, rounded to nearest. Rounding
  // (not flooring) is what makes the gap split at the midpoint between
  // adjacent row centers instead of the slot edge.
  const index = Math.round((contentY - rh / 2) / rowSize);
  return Math.min(Math.max(index, 0), itemCount - 1);
}