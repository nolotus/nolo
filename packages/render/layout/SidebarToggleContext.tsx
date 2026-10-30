import React, { createContext, useContext } from "react";

export interface SidebarToggleContextValue {
  toggleSidebar: () => void;
  isOpen: boolean;
  isDesktop: boolean;
  hasRail: boolean;
}

export const SidebarToggleContext = createContext<SidebarToggleContextValue | null>(null);

export const useSidebarToggleContext = (): SidebarToggleContextValue | null => {
  return useContext(SidebarToggleContext);
};
