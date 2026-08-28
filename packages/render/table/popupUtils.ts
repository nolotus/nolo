// 文件: render/table/popupUtils.ts
//
// 表格弹层（select 选项弹层 / 行右键菜单）共享的视口定位数学，纯函数可单测：
// - below 模式（SelectCellEditor）：锚点下方优先，装不下翻到上方，左右 clamp；
// - point 模式（RowContextMenu）：点锚点（width/height 传 0）右下优先，越界往左/上收。

/** 弹层与视口边缘的最小间距。 */
export const VIEWPORT_MARGIN = 8;

/** below 模式下弹层与锚点之间的垂直间隙。 */
export const POPUP_ANCHOR_GAP = 4;

export type PopupAnchorRect = {
  top: number;
  left: number;
  /** 点锚点（右键菜单的鼠标坐标）传 0。 */
  width: number;
  height: number;
};

export type ComputePopupPositionArgs = {
  anchor: PopupAnchorRect;
  /** 弹层估算尺寸（允许大于实际渲染尺寸，仅用于防溢出估算）。 */
  popup: { width: number; height: number };
  viewport: { width: number; height: number };
  mode: "below" | "point";
  /** below 模式锚点与弹层的垂直间隙，默认 POPUP_ANCHOR_GAP。 */
  gap?: number;
  /** 弹层与视口边缘的最小间距，默认 VIEWPORT_MARGIN。 */
  margin?: number;
};

/** 把起始坐标 clamp 进 [margin, viewport - size - margin]；弹层比视口大时贴 margin。 */
const clampToViewport = (
  value: number,
  size: number,
  viewport: number,
  margin: number
): number =>
  Math.min(Math.max(margin, value), Math.max(margin, viewport - size - margin));

export const computePopupPosition = ({
  anchor,
  popup,
  viewport,
  mode,
  gap = POPUP_ANCHOR_GAP,
  margin = VIEWPORT_MARGIN,
}: ComputePopupPositionArgs): { top: number; left: number } => {
  const left = clampToViewport(anchor.left, popup.width, viewport.width, margin);

  if (mode === "point") {
    // 点锚点：锚点即弹层左上角，右/下越界时往左/上收。
    return {
      top: clampToViewport(anchor.top, popup.height, viewport.height, margin),
      left,
    };
  }

  // below：默认落在锚点下方，视口装不下则翻到上方（上方也装不下时贴顶）。
  const belowTop = anchor.top + anchor.height + gap;
  const flipUp = belowTop + popup.height > viewport.height;
  const top = flipUp
    ? Math.max(margin, anchor.top - gap - popup.height)
    : belowTop;
  return { top, left };
};
