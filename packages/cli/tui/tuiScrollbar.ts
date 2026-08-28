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

/**
 * 渲染滚动条的单行缩略字符。totalLines <= visibleHeight 时返回空格（无滚动条）。
 */
export function renderScrollbarRow(
  rowIndex: number,
  visibleHeight: number,
  totalLines: number,
  scrollTop: number
): string {
  if (totalLines <= visibleHeight) return " ";
  const trackHeight = visibleHeight;
  const thumbSize = Math.max(
    1,
    Math.floor((visibleHeight * visibleHeight) / totalLines)
  );
  const maxScrollTop = totalLines - visibleHeight;
  const thumbTop = Math.floor(
    (scrollTop / maxScrollTop) * (trackHeight - thumbSize)
  );
  const thumbBottom = thumbTop + thumbSize;
  if (rowIndex >= thumbTop && rowIndex < thumbBottom) {
    return "█";
  }
  return "│";
}
