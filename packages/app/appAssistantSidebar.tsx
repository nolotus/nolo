import type { RightSidebarApi } from "render/layout/RightSidebarContext";
import { openObjectAssistantSidebar } from "chat/dialog/objectAssistantSidebar";
import { buildAppAssistantSidebarId } from "./constants/appEditor";

export const openAppAssistantSidebar = (
  open: RightSidebarApi["open"],
  appKey: string
) => {
  openObjectAssistantSidebar(open, {
    kind: "app",
    contentKey: appKey,
    sidebarId: buildAppAssistantSidebarId(appKey),
  });
};
