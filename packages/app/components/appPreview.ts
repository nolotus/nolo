// 真实预览的几何与状态真值（AppPreviewFrame 与其测试共用）。
// 单独成文件：这两块是纯计算，能被单测直接锁住，不依赖 DOM 环境。

/** 预览按「桌面宽度」渲染再整体缩放进卡片，避免小尺寸下布局塌成移动版。 */
export const PREVIEW_DESIGN_WIDTH = 1200;
export const PREVIEW_DESIGN_HEIGHT = 800;

export type AppPreviewState =
  | "unavailable"
  | "idle"
  | "loading"
  | "ready"
  | "failed";

/**
 * 计算真实预览的缩放比。
 *
 * 卡片盒子尺寸未知（0 / NaN / Infinity）时返回 0：调用方据此不渲染 iframe，
 * 而不是渲染一个比例错误的画面。
 */
export const computePreviewScale = (params: {
  containerWidth: number;
  containerHeight: number;
}): number => {
  const { containerWidth, containerHeight } = params;
  if (!Number.isFinite(containerWidth) || !Number.isFinite(containerHeight)) {
    return 0;
  }
  if (containerWidth <= 0 || containerHeight <= 0) return 0;
  const scale = Math.min(
    containerWidth / PREVIEW_DESIGN_WIDTH,
    containerHeight / PREVIEW_DESIGN_HEIGHT,
  );
  if (!Number.isFinite(scale) || scale <= 0) return 0;
  return Math.min(scale, 1);
};

/**
 * 预览状态机。
 *
 * 「加载事件」只说明文档被取回，不代表内容真的渲染成功；因此超时未被 load
 * 事件打断时必须落到 failed（显式失败），而不是无限 loading。
 */
export const resolvePreviewState = (params: {
  hasUrl: boolean;
  activated: boolean;
  loaded: boolean;
  timedOut: boolean;
}): AppPreviewState => {
  if (!params.hasUrl) return "unavailable";
  if (!params.activated) return "idle";
  if (params.loaded) return "ready";
  if (params.timedOut) return "failed";
  return "loading";
};
