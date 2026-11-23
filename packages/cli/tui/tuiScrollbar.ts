/**
 * TUI 滚动条与键盘/鼠标滚动动作解析。
 *
 * renderScrollbarRow 是纯渲染函数（无依赖）；parseScrollAction 将终端
 * 按键/鼠标序列转换为语义化的 ScrollAction。
 */
import {
  consumeSgrMouseSequence,
  parseSgrMouseEvent,
  SGR_MOUSE_REGEX,
} from "./tuiMouse";

export { consumeSgrMouseSequence, SGR_MOUSE_REGEX };

export type ScrollAction =
  | "page-up"
  | "page-down"
  | "half-page-up"
  | "half-page-down"
  | "top"
  | "bottom"
  | "wheel-up"
  | "wheel-down";

export function isSgrWheelEvent(sequence: string): boolean {
  const event = parseSgrMouseEvent(sequence);
  return event !== null && event.kind === "wheel";
}

export function parseScrollAction(sequence: string): ScrollAction | null {
  const mouseEvent = parseSgrMouseEvent(sequence);
  if (mouseEvent && mouseEvent.kind === "wheel") {
    return mouseEvent.wheelDirection === "down" ? "wheel-down" : "wheel-up";
  }

  switch (sequence) {
    case "\x1b[5~":
      return "page-up";
    case "\x1b[6~":
      return "page-down";
    case "\x1b[5;2~":
    case "\x1b[5;5~":
      return "half-page-up";
    case "\x1b[6;2~":
    case "\x1b[6;5~":
      return "half-page-down";
    case "\x1b[H":
    case "\x1b[1~":
    case "\x1b[7~":
      return "top";
    case "\x1b[F":
    case "\x1b[4~":
    case "\x1b[8~":
      return "bottom";
    default:
      return null;
  }
}

/**
 * 每条滚轮报告折算的行数。
 * - 转录区滚轮由 tuiScrollAnimation 的推进器消费，作为默认步长
 *   （环境变量 NOLO_TUI_WHEEL_LINES 可覆盖）；推进器再把距离逐帧限速发出。
 * - applyScrollAction 的 wheel 分支（非动画路径）也用它做瞬时步长。
 */
export const WHEEL_SCROLL_LINES = 5;

/**
 * 边缘拖拽动态加速：根据累计 tick 数返回单次滚动步长（行数）。
 * 阶梯加速 1 → 3 → 6（封顶），鼠标移开（stopAutoScroll）时 tick 归零重置。
 * 每个 tick 约 60ms。
 * @param ticks 已累计的 tick 数（调用前自增）
 */
export function autoScrollStepForTicks(ticks: number): number {
  if (ticks >= 16) return 6;
  if (ticks >= 8) return 3;
  return 1;
}

export type ScrollbarGeometry = {
  trackHeight: number;
  thumbSize: number;
  thumbTop: number;
  thumbBottom: number;
  maxScrollTop: number;
};

/**
 * 计算垂直滚动条轨道与滑块的几何尺寸（单源真值，供渲染与鼠标点击/拖动共用）。
 * 当 totalLines <= visibleHeight（无需滚动条）时返回 null。
 */
export function computeScrollbarGeometry(
  visibleHeight: number,
  totalLines: number,
  scrollTop: number,
): ScrollbarGeometry | null {
  if (visibleHeight <= 0 || totalLines <= visibleHeight) return null;
  const trackHeight = visibleHeight;
  const thumbSize = Math.max(
    1,
    Math.floor((visibleHeight * visibleHeight) / totalLines),
  );
  const maxScrollTop = totalLines - visibleHeight;
  const clampedScrollTop = Math.max(0, Math.min(maxScrollTop, scrollTop));
  const thumbTop = Math.floor(
    (clampedScrollTop / maxScrollTop) * (trackHeight - thumbSize),
  );
  return {
    trackHeight,
    thumbSize,
    thumbTop,
    thumbBottom: thumbTop + thumbSize,
    maxScrollTop,
  };
}

/**
 * 判定 0-based 屏幕列 screenCol 是否落在右侧滚动条交互热区内。
 * 视觉滚动条绘制在第 columns - 1 列；当右侧留有 marginRight 空白边距时，
 * 空白边距列（无任何正文字符）一并纳入热区，解决终端 1 列过细难点击的问题。
 */
export function isScrollbarColumnHit(
  screenCol: number,
  columns: number,
  marginRight = 0,
): boolean {
  if (columns <= 0) return false;
  const firstHitCol = Math.max(0, columns - 1 - Math.max(0, marginRight));
  return screenCol >= firstHitCol && screenCol < columns;
}

/**
 * 根据鼠标当前视口行 rowIndex 与按下时的滑块内偏移 grabOffset，反推对应的 scrollTop。
 */
export function scrollTopFromScrollbarDrag(
  rowIndex: number,
  grabOffset: number,
  visibleHeight: number,
  totalLines: number,
): number {
  const geom = computeScrollbarGeometry(visibleHeight, totalLines, 0);
  if (!geom) return 0;
  const movableTrack = geom.trackHeight - geom.thumbSize;
  if (movableTrack <= 0) {
    return rowIndex <= 0 ? 0 : geom.maxScrollTop;
  }
  const desiredThumbTop = Math.max(
    0,
    Math.min(movableTrack, rowIndex - grabOffset),
  );
  return Math.round((desiredThumbTop / movableTrack) * geom.maxScrollTop);
}

/**
 * 渲染滚动条的单行缩略字符。totalLines <= visibleHeight 时返回空格（无滚动条）。
 */
export function renderScrollbarRow(
  rowIndex: number,
  visibleHeight: number,
  totalLines: number,
  scrollTop: number
): string {
  const geom = computeScrollbarGeometry(visibleHeight, totalLines, scrollTop);
  if (!geom) return " ";
  if (rowIndex >= geom.thumbTop && rowIndex < geom.thumbBottom) {
    return "█";
  }
  return "│";
}
