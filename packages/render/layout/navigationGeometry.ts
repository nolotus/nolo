// render/layout/navigationGeometry.ts — Navigation 几何计算纯函数。
import type { NavigationPlacement } from "app/layout/navigationPlacementPreference";

export interface NavigationGeometryInput {
  clientX: number;
  containerRect: {
    left: number;
    right: number;
    width?: number;
  };
  placement: NavigationPlacement;
}

/**
 * 纯坐标解析函数：根据 PointerEvent clientX 和容器 bounding rect 计算 Navigation 侧边栏宽度。
 * - placement === "start" 时，侧边栏在容器左侧：width = clientX - containerRect.left
 * - placement === "end" 时，侧边栏在容器右侧：width = containerRect.right - clientX
 * 不依赖 window.innerWidth，确保在不同容器/内边距/布局下坐标计算准确。
 */
export const pointerXToNavigationWidth = ({
  clientX,
  containerRect,
  placement,
}: NavigationGeometryInput): number => {
  if (placement === "end") {
    return Math.round(containerRect.right - clientX);
  }
  return Math.round(clientX - containerRect.left);
};
