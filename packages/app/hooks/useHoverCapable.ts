// 文件路径: app/hooks/useHoverCapable.ts
//
// 判定当前环境是否适合 hover 交互（桌面鼠标 / 触控板）。
// 触屏设备 (pointer: coarse / 无 hover) 返回 false，保持点击触发。
// 与 useIsMobile 不同：这里按交互能力判定，而非视口宽度，
// 因此大屏触屏笔记本 / 平板仍会落在点击分支，避免 hover 卡死。

import { useMediaQuery } from "app/hooks/useMediaQuery";

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

export function useHoverCapable(): boolean {
  return useMediaQuery(HOVER_QUERY);
}