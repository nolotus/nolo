import React, { memo } from "react";
import ObjectAssistantPanel from "./ObjectAssistantPanel";

interface AppAssistantPanelProps {
  appKey: string;
}

const AppAssistantPanelBase: React.FC<AppAssistantPanelProps> = ({ appKey }) => (
  <ObjectAssistantPanel kind="app" contentKey={appKey} />
);

const AppAssistantPanel = memo(AppAssistantPanelBase);

export default AppAssistantPanel;

