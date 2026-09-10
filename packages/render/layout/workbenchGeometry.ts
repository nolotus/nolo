// render/layout/workbenchGeometry.ts — Workbench responsive 几何纯计算。
export const WORKBENCH_DEFAULT_MIN_SIZE = 320;
export const WORKBENCH_DEFAULT_SEPARATOR_SIZE = 8;

export interface CanWorkbenchSplitInput {
  containerWidth: number;
  primaryMinSize?: number;
  secondaryMinSize?: number;
  separatorSize?: number;
}

/**
 * 纯函数：根据容器宽度与两边最小尺寸约束，判定当前是否具备双栏水平分栏条件。
 * 核心原则：
 * 1. 只有 containerWidth >= primaryMin + secondaryMin + separator 时才允许 split。
 * 2. 空间不足时自动返回 false，退化为 narrow 单 surface 模式。
 */
export const canWorkbenchSplit = ({
  containerWidth,
  primaryMinSize = WORKBENCH_DEFAULT_MIN_SIZE,
  secondaryMinSize = WORKBENCH_DEFAULT_MIN_SIZE,
  separatorSize = WORKBENCH_DEFAULT_SEPARATOR_SIZE,
}: CanWorkbenchSplitInput): boolean => {
  const minRequired = Math.max(0, primaryMinSize) + Math.max(0, secondaryMinSize) + Math.max(0, separatorSize);
  return containerWidth >= minRequired;
};
