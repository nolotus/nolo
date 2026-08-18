import { memo } from "react";

import type { Agent } from "app/types";
import { usePublicAgents } from "ai/agent/hooks/usePublicAgents";
import AgentCard from "ai/agent/web/AgentCard";
import AgentGrid from "ai/agent/web/AgentGrid";
import "./PublicAgentsList.css";

interface PublicAgentsPreviewProps {
  data?: Agent[];
}

const SKELETON_COUNT = 6;

const PublicAgentsPreviewSkeleton = memo(() => (
  <AgentGrid>
    {Array.from({ length: SKELETON_COUNT }).map((_, index) => (
      <div key={index} className="public-agents__skeleton-card">
        <div className="public-agents__skeleton-header">
          <div className="public-agents__skeleton-avatar public-agents__shimmer" />
          <div className="public-agents__skeleton-header-text">
            <div className="public-agents__skeleton-line public-agents__skeleton-line--title public-agents__shimmer" />
            <div className="public-agents__skeleton-line public-agents__skeleton-line--subtitle public-agents__shimmer" />
          </div>
        </div>
        <div className="public-agents__skeleton-body">
          <div className="public-agents__skeleton-line public-agents__shimmer" />
          <div className="public-agents__skeleton-line public-agents__shimmer" />
          <div className="public-agents__skeleton-line public-agents__skeleton-line--short public-agents__shimmer" />
        </div>
        <div className="public-agents__skeleton-footer">
          <div className="public-agents__skeleton-pill public-agents__shimmer" />
          <div className="public-agents__skeleton-pill public-agents__skeleton-pill--small public-agents__shimmer" />
        </div>
      </div>
    ))}
  </AgentGrid>
));

PublicAgentsPreviewSkeleton.displayName = "PublicAgentsPreviewSkeleton";

const PublicAgentsPreview = memo(({ data = [] }: PublicAgentsPreviewProps) => {
  const { data: refreshedData, error: refreshError } = usePublicAgents({
    limit: 6,
    sortBy: "recommended",
    initialData: data,
    reloadMode: "catalog",
    summary: true,
  });
  const previewData = refreshedData.length > 0 ? refreshedData : data;
  const hasData = previewData.length > 0;

  if (!hasData) {
    if (refreshError) {
      // 远程失败且无预览数据：渲染空容器（不无限骨架，避免「永远加载中」误导）
      return (
        <div
          className="public-agents__list-wrapper"
          data-preview-error="true"
          aria-label="加载失败"
        />
      );
    }
    return (
      <div className="public-agents__list-wrapper">
        <PublicAgentsPreviewSkeleton />
      </div>
    );
  }

  return (
    <div className="public-agents__list-wrapper" data-preview-only="true">
      <AgentGrid>
        {previewData.slice(0, 6).map((item) => (
          <AgentCard key={item.id} item={item} />
        ))}
      </AgentGrid>
    </div>
  );
});

PublicAgentsPreview.displayName = "PublicAgentsPreview";

export default PublicAgentsPreview;
