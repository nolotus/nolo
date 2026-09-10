// render/layout/rightSidebarGeometry.ts — Companion / RightSidebar 几何计算纯函数。
import {
  DEFAULT_RIGHT_SIDEBAR_WIDTH,
  RIGHT_SIDEBAR_MIN_WIDTH,
} from "app/layout/rightSidebarPreference";
import type { CompanionPlacement } from "app/layout/companionPlacementPreference";

export const MAIN_CONTENT_MIN_WIDTH = 320;

export interface CompanionGeometryInput {
  preferredWidth: number;
  containerWidth: number;
  minWidth?: number;
  mainMinWidth?: number;
  separatorSize?: number;
}

export interface CompanionGeometryResult {
  effectiveWidth: number;
  minWidth: number;
  maxWidth: number;
}

/**
 * 纯几何解析函数：根据用户偏好宽度和当前可用容器宽度，动态计算 effectiveWidth 和允许的 maxWidth。
 * 核心原则：
 * 1. 空间受限时：Main content minimum 优先于 Companion preferred minimum。
 * 2. 空间不足时：Companion 允许临时低于 preferred minimum (280)，最低可至 0。
 * 3. 任何情况下：绝不让容器出现负值，优先保障主内容区的最小可用空间。
 * 4. 容器收窄只临时压缩 effectiveWidth，不污染用户持久化的 preferredWidth。
 */
export const resolveCompanionEffectiveWidth = (
  input: CompanionGeometryInput
): CompanionGeometryResult => {
  const minWidth = Math.max(0, input.minWidth ?? RIGHT_SIDEBAR_MIN_WIDTH);
  const mainMinWidth = Math.max(0, input.mainMinWidth ?? MAIN_CONTENT_MIN_WIDTH);
  const separatorSize = Math.max(0, input.separatorSize ?? 0);
  const containerWidth = Math.max(0, input.containerWidth);

  const maxWidth = Math.max(
    0,
    containerWidth - mainMinWidth - separatorSize
  );

  const effectiveMinWidth = Math.min(minWidth, maxWidth);

  const effectiveWidth = Math.min(
    maxWidth,
    Math.max(effectiveMinWidth, input.preferredWidth)
  );

  return {
    effectiveWidth,
    minWidth: effectiveMinWidth,
    maxWidth,
  };
};

export interface PointerXToCompanionWidthInput {
  clientX: number;
  containerRect: { left: number; right: number };
  placement?: CompanionPlacement;
}

/**
 * 纯坐标解析函数：根据 PointerEvent clientX 和容器 bounding rect 计算 Companion 宽度。
 * - placement === "end": right - clientX (右边缘向左测距)
 * - placement === "start": clientX - left (左边缘向右测距)
 * 不依赖 window.innerWidth，确保在 Navigation 折叠/不同容器内坐标计算准确。
 */
export const pointerXToCompanionWidth = (
  input: PointerXToCompanionWidthInput
): number => {
  const { clientX, containerRect, placement = "end" } = input;
  if (placement === "start") {
    return Math.round(clientX - containerRect.left);
  }
  return Math.round(containerRect.right - clientX);
};

export interface CompanionKeyboardDeltaInput {
  key: string;
  placement?: CompanionPlacement;
}

export const COMPANION_KEYBOARD_RESIZE_STEP = 20;

/**
 * 键盘方向调整增量计算纯函数：
 * - end placement (面板在右): ArrowLeft 变宽 (+step), ArrowRight 变窄 (-step)
 * - start placement (面板在左): ArrowLeft 变窄 (-step), ArrowRight 变宽 (+step)
 * 返回 null 表示非方向键。
 */
export const resolveCompanionKeyboardDelta = (
  input: CompanionKeyboardDeltaInput
): number | null => {
  const { key, placement = "end" } = input;
  const step = COMPANION_KEYBOARD_RESIZE_STEP;
  if (key === "ArrowLeft") {
    return placement === "start" ? -step : step;
  }
  if (key === "ArrowRight") {
    return placement === "start" ? step : -step;
  }
  return null;
};
