// packages/app/pages/widgets/RuntimeResourcesWidget.tsx
import React from "react";
import type { CloudflareContainersQuotaSnapshot } from "../../../agent-runtime/cloudflareContainersQuota";
import { useRuntimeResources } from "./useRuntimeResources";

export interface RuntimeResourcesWidgetProps {
  isEditing?: boolean;
  quotaSnapshot?: CloudflareContainersQuotaSnapshot | null;
}

export const RuntimeResourcesWidget: React.FC<RuntimeResourcesWidgetProps> = ({
  quotaSnapshot,
}) => {
  const { resources, loading, error } = useRuntimeResources(
    "cloudflare",
    quotaSnapshot,
  );

  if (loading) {
    return (
      <div
        className="runtime-resources-widget runtime-resources-widget--loading"
        data-testid="runtime-resources-widget"
      >
        <span>加载运行时资源中…</span>
      </div>
    );
  }

  if (error || !resources) {
    return (
      <div
        className="runtime-resources-widget runtime-resources-widget--error"
        data-testid="runtime-resources-widget"
      >
        <span>未配置</span>
      </div>
    );
  }

  const { cpu, memory, disk } = resources.metrics;

  return (
    <div
      className="runtime-resources-widget runtime-resources-widget--cloudflare"
      data-testid="runtime-resources-widget"
      data-kind="cloudflare"
    >
      <div className="runtime-resources-widget__header">
        <span className="runtime-resources-widget__title">
          Cloudflare Containers 额度
        </span>
        <span className="runtime-resources-widget__badge">预估</span>
      </div>
      <div className="runtime-resources-widget__metrics">
        <div
          className="runtime-resources-widget__metric"
          data-testid="metric-cpu"
        >
          <span className="runtime-resources-widget__metric-name">
            {cpu.name}
          </span>
          <span className="runtime-resources-widget__metric-limit">
            {cpu.formattedLimit}
          </span>
          <span className="runtime-resources-widget__metric-remaining">
            {cpu.overage > 0
              ? `超额 ${cpu.overage} ${cpu.unit}`
              : `剩余 ${cpu.percentageRemaining}%`}
          </span>
        </div>
        <div
          className="runtime-resources-widget__metric"
          data-testid="metric-memory"
        >
          <span className="runtime-resources-widget__metric-name">
            {memory.name}
          </span>
          <span className="runtime-resources-widget__metric-limit">
            {memory.formattedLimit}
          </span>
          <span className="runtime-resources-widget__metric-remaining">
            {memory.overage > 0
              ? `超额 ${memory.overage} ${memory.unit}`
              : `剩余 ${memory.percentageRemaining}%`}
          </span>
        </div>
        <div
          className="runtime-resources-widget__metric"
          data-testid="metric-disk"
        >
          <span className="runtime-resources-widget__metric-name">
            {disk.name}
          </span>
          <span className="runtime-resources-widget__metric-limit">
            {disk.formattedLimit}
          </span>
          <span className="runtime-resources-widget__metric-remaining">
            {disk.overage > 0
              ? `超额 ${disk.overage} ${disk.unit}`
              : `剩余 ${disk.percentageRemaining}%`}
          </span>
        </div>
      </div>
    </div>
  );
};

export default RuntimeResourcesWidget;
