import React from "react";
import type { RightSidebarApi } from "render/layout/RightSidebarContext";
import ObjectAssistantPanel from "./ObjectAssistantPanel";
import {
  buildObjectAssistantSidebarId,
  type ObjectAssistantKind,
} from "./objectAssistantRegistry";

type OpenObjectAssistantSidebarArgs = {
  kind: ObjectAssistantKind;
  contentKey?: string;
  sidebarId?: string;
  width?: number;
  closeOnRouteChange?: boolean;
};

export const openObjectAssistantSidebar = (
  open: RightSidebarApi["open"],
  {
    kind,
    contentKey,
    sidebarId,
    width = 360,
    closeOnRouteChange = true,
  }: OpenObjectAssistantSidebarArgs,
) => {
  open(<ObjectAssistantPanel kind={kind} contentKey={contentKey} />, {
    width,
    closeOnRouteChange,
    id: sidebarId ?? buildObjectAssistantSidebarId(kind, contentKey),
  });
};

