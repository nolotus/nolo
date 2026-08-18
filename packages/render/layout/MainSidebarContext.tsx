import React, { createContext, useContext } from "react";

export interface MainSidebarOptions {
  id?: string;
}

export interface MainSidebarApi {
  setContent: (content: React.ReactNode, options?: MainSidebarOptions) => void;
  clearContent: (id?: string) => void;
  currentId?: string;
}

const MainSidebarContext = createContext<MainSidebarApi | null>(null);

export const useMainSidebar = (): MainSidebarApi => {
  const ctx = useContext(MainSidebarContext);
  if (!ctx) {
    throw new Error(
      "useMainSidebar 必须在 <MainSidebarContext.Provider> 内部使用（即 MainLayout 内部）。"
    );
  }
  return ctx;
};

export default MainSidebarContext;
