// render/layout/RightSidebarContext.tsx
import React, { createContext, useContext } from "react";

export interface RightSidebarOptions {
  /** 桌面端宽度（px），默认 360 */
  width?: number;
  /** 路由切换时是否自动关闭，默认 true */
  closeOnRouteChange?: boolean;
  /**
   * 标识当前右侧栏的来源，例如:
   * 'pageAssistant' | 'dialogSettings' | 'tableChat'
   * 方便调用方判断自己是不是当前打开的面板
   */
  id?: string;
}

export interface RightSidebarApi {
  open: (content: React.ReactNode, options?: RightSidebarOptions) => void;
  close: () => void;
  isOpen: boolean;
  currentId?: string;
}

const RightSidebarContext = createContext<RightSidebarApi | null>(null);

export const useRightSidebar = (): RightSidebarApi => {
  const ctx = useContext(RightSidebarContext);
  if (!ctx) {
    throw new Error(
      "useRightSidebar 必须在 <RightSidebarContext.Provider> 内部使用（即 MainLayout 内部）。"
    );
  }
  return ctx;
};

export default RightSidebarContext;
