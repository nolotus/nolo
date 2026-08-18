import { memo, type ReactNode } from "react";
import "./AgentGrid.css";

interface AgentGridProps {
  children: ReactNode;
  masonry?: boolean;
}

const AgentGrid = memo(({ children, masonry = false }: AgentGridProps) => (
  <div className={masonry ? "agents-grid agents-grid--masonry" : "agents-grid"}>
    {children}
  </div>
));

AgentGrid.displayName = "AgentGrid";

export default AgentGrid;
