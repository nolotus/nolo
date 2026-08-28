// 文件路径: ai/agent/web/AgentListView.tsx

import React from "react";
import type { Agent } from "app/types";
import AgentBlock from "ai/agent/web/AgentBlock";
import AgentGrid from "ai/agent/web/AgentGrid";

interface AgentListViewProps {
  items: Agent[];
  onReload?: (excludedAgentIds?: string[]) => void | Promise<void>;
}

/**
 * 仅负责展示网格列表，不处理空状态。
 * 网格布局统一由 AgentGrid 控制。
 */
const AgentListView: React.FC<AgentListViewProps> = ({ items, onReload }) => {
  return (
    <AgentGrid>
      {items.map((item) => (
        <AgentBlock key={item.id} item={item} reload={onReload} />
      ))}
    </AgentGrid>
  );
};

export default AgentListView;