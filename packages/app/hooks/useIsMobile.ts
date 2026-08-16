// 文件路径: app/hooks/useIsMobile.ts

import { useMediaQuery } from "app/hooks/useMediaQuery";

export function useIsMobile(breakpoint = 768): boolean {
    return useMediaQuery(`(max-width: ${breakpoint}px)`);
}